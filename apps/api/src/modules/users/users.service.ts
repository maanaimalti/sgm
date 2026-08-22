import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
// biome-ignore lint/style/useImportType: <explanation>
import { PrismaService } from "src/shared/db/prisma.service";
// biome-ignore lint/style/useImportType: <explanation>
import { HelpersService } from "src/shared/helpers/helpers.service";
// biome-ignore lint/style/useImportType: <explanation>
import { SupabaseAdminService } from "src/shared/supabase/supabase-admin.service";
import type { CreateUserDto } from "./dto/create-user.dto";
import type { UpdateUserDto } from "./dto/update-user.dto";

const USER_SELECT = {
  id: true,
  name: true,
  username: true,
  email: true,
  roles: { select: { name: true } },
  department: { select: { id: true, name: true } },
} as const;

type SelectedUser = {
  id: string;
  name: string;
  username: string;
  email: string | null;
  roles: { name: string }[];
  department: { id: string; name: string }[];
};

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly helpersService: HelpersService,
    private readonly supabase: SupabaseAdminService,
  ) {}

  async findAll() {
    const users = await this.prismaService.user.findMany({
      orderBy: { name: "asc" },
      select: USER_SELECT,
    });

    return users.map((user) => this.toListItem(user));
  }

  /**
   * Two systems, one logical write. The account has to exist in Supabase Auth
   * before the row here can point at it, and the HTTPS round-trip cannot be
   * rolled back — so this is never wrapped in a $transaction, which would also
   * pin a pooled connection across a network call.
   */
  async create(dto: CreateUserDto) {
    // Checking here first keeps a username collision — by far the likeliest
    // failure — from creating an auth account that immediately has to be
    // cleaned up again.
    const clash = await this.prismaService.user.findFirst({
      where: { OR: [{ username: dto.username }, { email: dto.email }] },
      select: { username: true },
    });
    if (clash) {
      throw new ConflictException(
        clash.username === dto.username
          ? "Já existe um usuário com esse nome de usuário"
          : "Já existe um usuário com esse e-mail",
      );
    }

    await this.assertDepartmentsExist(dto.departmentIds);

    const authUser = await this.supabase.createUser({
      email: dto.email,
      password: dto.password,
    });

    try {
      // The link column and both relations are fields of this one statement,
      // so there is exactly one edge to compensate for.
      const user = await this.prismaService.user.create({
        data: {
          id: this.helpersService.generateId(),
          name: dto.name,
          username: dto.username,
          email: dto.email,
          supabaseUserId: authUser.id,
          roles: { connect: dto.roles.map((name) => ({ name })) },
          department: { connect: dto.departmentIds.map((id) => ({ id })) },
        },
        select: USER_SELECT,
      });

      return this.toListItem(user);
    } catch (error) {
      // Without this an invisible auth account is left owning the e-mail, and
      // every retry fails with user_already_exists while GET /users shows
      // nothing that explains why.
      await this.supabase.deleteUser(authUser.id).catch((cleanupError) => {
        this.logger.error(
          `Conta de auth ${authUser.id} (${dto.email}) ficou órfã: ${cleanupError}`,
        );
      });
      throw error;
    }
  }

  async update(id: string, dto: UpdateUserDto, callerId: string) {
    const user = await this.prismaService.user.findUnique({
      where: { id },
      select: { id: true, roles: { select: { name: true } } },
    });
    if (!user) {
      throw new NotFoundException(`User with id: ${id} not found`);
    }

    if (dto.roles) {
      await this.assertAdminRemains(user, dto.roles, callerId);
    }
    if (dto.departmentIds) {
      await this.assertDepartmentsExist(dto.departmentIds);
    }

    const updated = await this.prismaService.user.update({
      where: { id },
      data: {
        name: dto.name,
        // `set`, not `connect` — the payload is the full desired list, so
        // removing a role has to be possible.
        roles: dto.roles && { set: dto.roles.map((name) => ({ name })) },
        department: dto.departmentIds && {
          set: dto.departmentIds.map((departmentId) => ({ id: departmentId })),
        },
      },
      select: USER_SELECT,
    });

    return this.toListItem(updated);
  }

  /**
   * The path a placeholder address takes to becoming a real one. auth.users is
   * written first: it is the side that can reject a duplicate, and it is what
   * the person actually signs in with.
   */
  async updateEmail(id: string, email: string) {
    const user = await this.requireLinkedUser(id);

    await this.supabase.updateUserById(user.supabaseUserId, {
      email,
      // Mandatory. Without it GoTrue treats the change as a *request* and mails
      // a confirmation link — to an address that, for exactly the placeholder
      // users this exists to fix, bounces. The change would sit pending forever
      // and the person could not sign in with the new address.
      email_confirm: true,
    });

    try {
      const updated = await this.prismaService.user.update({
        where: { id },
        data: { email },
        select: USER_SELECT,
      });

      return this.toListItem(updated);
    } catch (error) {
      await this.supabase
        .updateUserById(user.supabaseUserId, {
          email: user.email,
          email_confirm: true,
        })
        .catch((rollbackError) => {
          this.logger.error(
            `Rollback do e-mail em auth.users falhou para ${id}: ${rollbackError}`,
          );
        });
      throw error;
    }
  }

  async resetPassword(id: string, newPassword: string) {
    const user = await this.requireLinkedUser(id);

    await this.supabase.updateUserById(user.supabaseUserId, {
      password: newPassword,
    });
  }

  /**
   * The one surface where a mistake locks everybody out with no way back except
   * raw SQL against production.
   */
  private async assertAdminRemains(
    target: { id: string; roles: { name: string }[] },
    roles: string[],
    callerId: string,
  ) {
    if (roles.includes("admin")) return;

    if (target.id === callerId) {
      throw new BadRequestException(
        "Você não pode remover o seu próprio papel de administrador",
      );
    }

    const wasAdmin = target.roles.some((role) => role.name === "admin");
    if (!wasAdmin) return;

    const admins = await this.prismaService.user.count({
      where: { roles: { some: { name: "admin" } } },
    });
    if (admins <= 1) {
      throw new BadRequestException(
        "Este é o único administrador do sistema — promova outro antes",
      );
    }
  }

  /**
   * `connect` on a department that does not exist raises P2025, which the
   * Prisma filter turns into a bare "Record not found" 404 naming nothing.
   */
  private async assertDepartmentsExist(departmentIds: string[]) {
    const found = await this.prismaService.department.count({
      where: { id: { in: departmentIds } },
    });
    if (found !== new Set(departmentIds).size) {
      throw new BadRequestException("Um dos setores informados não existe");
    }
  }

  private async requireLinkedUser(id: string) {
    const user = await this.prismaService.user.findUnique({
      where: { id },
      select: { email: true, supabaseUserId: true },
    });

    if (!user) {
      throw new NotFoundException(`User with id: ${id} not found`);
    }
    if (!user.supabaseUserId || !user.email) {
      throw new BadRequestException(
        "Usuário não está vinculado ao Supabase Auth — rode auth:provision",
      );
    }

    return { email: user.email, supabaseUserId: user.supabaseUserId };
  }

  private toListItem(user: SelectedUser) {
    return {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      roles: user.roles.map((role) => role.name),
      departments: user.department,
    };
  }
}
