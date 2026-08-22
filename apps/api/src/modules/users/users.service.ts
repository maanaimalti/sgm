import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import {
  type InviteChannel,
  isPlaceholderEmail,
  type Role,
  type UserListItem,
} from "@sgm/shared";
// biome-ignore lint/style/useImportType: <explanation>
import { PrismaService } from "src/shared/db/prisma.service";
// biome-ignore lint/style/useImportType: <explanation>
import { HelpersService } from "src/shared/helpers/helpers.service";
// biome-ignore lint/style/useImportType: <explanation>
import { SupabaseAdminService } from "src/shared/supabase/supabase-admin.service";
import type { CreateUserDto } from "./dto/create-user.dto";
import type { UpdateUserDto } from "./dto/update-user.dto";

/**
 * Everything public.users still knows about a person. Roles and department
 * assignments are not here any more — they live on the auth account, so every
 * method that returns a UserListItem has to fetch them separately.
 */
const USER_SELECT = {
  id: true,
  name: true,
  username: true,
  email: true,
  mustSetPassword: true,
} as const;

type SelectedUser = {
  id: string;
  name: string;
  username: string;
  email: string | null;
  mustSetPassword: boolean;
};

interface Authorization {
  roles: Role[];
  departmentIds: string[];
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly helpersService: HelpersService,
    private readonly supabase: SupabaseAdminService,
  ) {}

  /**
   * Three reads, because identity is split across two systems now: the display
   * fields are rows here, the roles and department ids are on the auth
   * accounts, and only Postgres knows what a department is called.
   *
   * The merge key is `app_metadata.app_user_id`. A row whose auth account has
   * no metadata yet shows up with no roles — visible, and fixable with
   * `auth:sync-roles`, rather than silently missing from the list.
   */
  async findAll(): Promise<UserListItem[]> {
    const [users, authUsers, departments] = await Promise.all([
      this.prismaService.user.findMany({
        orderBy: { name: "asc" },
        select: USER_SELECT,
      }),
      this.supabase.listAllUsers(),
      this.prismaService.department.findMany({
        select: { id: true, name: true },
      }),
    ]);

    const metadataByUserId = new Map(
      authUsers
        .filter((authUser) => authUser.appMetadata.app_user_id)
        .map((authUser) => [
          authUser.appMetadata.app_user_id as string,
          authUser.appMetadata,
        ]),
    );
    const departmentName = new Map(departments.map((d) => [d.id, d.name]));

    return users.map((user) => {
      const metadata = metadataByUserId.get(user.id);
      return {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        mustSetPassword: user.mustSetPassword,
        roles: metadata?.roles ?? [],
        departments: (metadata?.department_ids ?? [])
          .filter((id) => departmentName.has(id))
          .map((id) => ({ id, name: departmentName.get(id) as string })),
      };
    });
  }

  /**
   * Two systems, one logical write. The account has to exist in Supabase Auth
   * before the row here can point at it, and the HTTPS round-trip cannot be
   * rolled back — so this is never wrapped in a $transaction, which would also
   * pin a pooled connection across a network call.
   *
   * No password is set anywhere: the invite mail is what lets the person
   * choose one. `dto.password` is still accepted and ignored so the web app
   * can keep sending it until its own deploy lands.
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
    this.assertMailable(dto.email);

    const authUser = await this.supabase.inviteUserByEmail(dto.email);

    const id = this.helpersService.generateId();

    try {
      // Authorization lives on the token, so it has to be written before the
      // person can do anything — and inside this try, so a failure here takes
      // the same compensation path as a failed insert.
      await this.supabase.setAppMetadata(authUser.id, {
        app_user_id: id,
        roles: dto.roles,
        department_ids: dto.departmentIds,
      });

      const user = await this.prismaService.user.create({
        data: {
          id,
          name: dto.name,
          username: dto.username,
          email: dto.email,
          supabaseUserId: authUser.id,
          mustSetPassword: true,
        },
        select: USER_SELECT,
      });

      this.supabase.invalidateUserCache();
      return this.toListItem(user, {
        roles: dto.roles,
        departmentIds: dto.departmentIds,
      });
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

  /**
   * The name is a column; the roles and departments are claims. So this reads
   * the current authorization off the auth account, merges the fields the
   * caller actually sent, and writes it back — a partial update has to keep
   * what it did not mention, and there is no row to fall back on any more.
   */
  async update(id: string, dto: UpdateUserDto, callerId: string) {
    const user = await this.prismaService.user.findUnique({
      where: { id },
      select: { id: true, supabaseUserId: true },
    });
    if (!user) {
      throw new NotFoundException(`User with id: ${id} not found`);
    }

    const current = await this.requireAuthorization(id);

    if (dto.roles) {
      await this.assertAdminRemains(id, current.roles, dto.roles, callerId);
    }
    if (dto.departmentIds) {
      await this.assertDepartmentsExist(dto.departmentIds);
    }

    const next: Authorization = {
      roles: dto.roles ?? current.roles,
      departmentIds: dto.departmentIds ?? current.departmentIds,
    };

    const updated = await this.prismaService.user.update({
      where: { id },
      data: { name: dto.name },
      select: USER_SELECT,
    });

    await this.syncAuthorization(id, user.supabaseUserId, next);

    return this.toListItem(updated, next);
  }

  /**
   * Pushes the authorization payload onto the account and ends the sessions
   * holding the old one.
   *
   * Best effort, deliberately: the local row is already updated and returning
   * a 500 here would tell the admin the edit failed when it did not. What it
   * costs is that the person keeps their old roles until the next sign-in, so
   * the failure is logged loudly and `users:sync-roles` repairs it.
   */
  private async syncAuthorization(
    id: string,
    supabaseUserId: string | null,
    authorization: Authorization,
  ) {
    if (!supabaseUserId) return;

    try {
      await this.supabase.setAppMetadata(supabaseUserId, {
        app_user_id: id,
        roles: authorization.roles,
        department_ids: authorization.departmentIds,
      });
      await this.supabase.revokeSessions(supabaseUserId);
      this.supabase.invalidateUserCache();
    } catch (error) {
      this.logger.error(
        `Papéis de ${id} não chegaram ao token — rode users:sync-roles: ${error}`,
      );
    }
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

      return this.toListItem(updated, await this.requireAuthorization(id));
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

  /**
   * The break-glass path: an admin types a password and passes it on by hand.
   * It is the only way to onboard someone when e-mail cannot be delivered.
   *
   * Supabase first, flag second — the opposite of `AuthService.setPassword`,
   * and for the opposite reason. The flag here only *adds* friction, so
   * failing to write it must never fail the reset itself.
   */
  async resetPassword(id: string, newPassword: string, requireChange = true) {
    const user = await this.requireLinkedUser(id);

    await this.supabase.updateUserById(user.supabaseUserId, {
      password: newPassword,
    });

    if (!requireChange) return;

    await this.prismaService.user
      .update({ where: { id }, data: { mustSetPassword: true } })
      .catch((error) => {
        this.logger.error(
          `Senha de ${id} redefinida, mas must_set_password não foi marcada: ${error}`,
        );
      });
  }

  /**
   * One endpoint for two mails, because the admin cannot know which one is
   * needed. An invite can only be re-sent while the account is unconfirmed;
   * the moment the person accepts, GoTrue answers `email_exists` and the right
   * mail becomes a recovery link. Both land on the same screen.
   */
  async resendInvite(
    id: string,
  ): Promise<{ ok: true; channel: InviteChannel }> {
    const user = await this.requireLinkedUser(id);
    this.assertMailable(user.email);

    // Set before sending: if the flag write fails the mail was never sent, and
    // the alternative — mail out, flag missing — lets someone through the app
    // on a password they never chose.
    await this.prismaService.user.update({
      where: { id },
      data: { mustSetPassword: true },
    });

    try {
      await this.supabase.inviteUserByEmail(user.email);
      return { ok: true, channel: "invite" };
    } catch (error) {
      if (error instanceof ConflictException) {
        await this.supabase.sendPasswordRecovery(user.email);
        return { ok: true, channel: "recovery" };
      }

      await this.prismaService.user
        .update({ where: { id }, data: { mustSetPassword: false } })
        .catch((rollbackError) => {
          this.logger.error(
            `must_set_password ficou marcada para ${id} sem e-mail enviado: ${rollbackError}`,
          );
        });
      throw error;
    }
  }

  /**
   * The one surface where a mistake locks everybody out with no way back except
   * `users:set-roles` with the service role key in hand.
   */
  private async assertAdminRemains(
    targetId: string,
    currentRoles: Role[],
    nextRoles: Role[],
    callerId: string,
  ) {
    if (nextRoles.includes("admin")) return;

    if (targetId === callerId) {
      throw new BadRequestException(
        "Você não pode remover o seu próprio papel de administrador",
      );
    }

    if (!currentRoles.includes("admin")) return;

    // Counting admins is an Auth API call now, not a SQL count — the roles
    // that decide this only exist on the token side.
    const admins = await this.supabase.findUserIdsByRole(["admin"]);
    if (admins.length <= 1) {
      throw new BadRequestException(
        "Este é o único administrador do sistema — promova outro antes",
      );
    }
  }

  /**
   * The authorization payload of an account, from the only place that has it.
   * Absent metadata means the account was never synced, and guessing empty
   * would silently strip whatever roles the person actually has.
   */
  private async requireAuthorization(id: string): Promise<Authorization> {
    const metadata = await this.supabase.findAppMetadata(id);
    if (!metadata) {
      throw new BadRequestException(
        "Usuário sem papéis no Supabase Auth — rode auth:sync-roles",
      );
    }

    return {
      roles: metadata.roles ?? [],
      departmentIds: metadata.department_ids ?? [],
    };
  }

  /**
   * Placeholder addresses exist so migrated accounts could have one at all;
   * nothing is listening behind them. Sending there burns the project's e-mail
   * rate limit and hands the admin a silent bounce instead of an error.
   */
  private assertMailable(email: string) {
    if (isPlaceholderEmail(email)) {
      throw new BadRequestException(
        "Esse endereço é provisório e não recebe mensagens — troque pelo e-mail real antes de enviar o convite",
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

  private async toListItem(
    user: SelectedUser,
    authorization: Authorization,
  ): Promise<UserListItem> {
    const departments = await this.prismaService.department.findMany({
      where: { id: { in: authorization.departmentIds } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });

    return { ...user, roles: authorization.roles, departments };
  }
}
