import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import type { AuthUser, Role } from "@sgm/shared";
// biome-ignore lint/style/useImportType: <explanation>
import { PrismaService } from "../db/prisma.service";
// biome-ignore lint/style/useImportType: <explanation>
import { SupabaseAdminService } from "../supabase/supabase-admin.service";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prismaService: PrismaService,
    private supabase: SupabaseAdminService,
  ) {}

  /**
   * Identity for the browser.
   *
   * Roles and department ids come off the token — they are what authorized the
   * request in the first place, and re-reading them here would let this
   * endpoint disagree with every other one. Everything else is display data
   * that no claim carries: the name, the username, the address, whether a
   * password is still owed, and the department *names*.
   *
   * One extra query per call, on the one endpoint the browser hits once per
   * session. That is the trade for taking the lookup off every other route.
   */
  async me(
    userId: string,
    roles: Role[],
    departmentIds: string[],
  ): Promise<AuthUser> {
    const [user, departments] = await Promise.all([
      this.prismaService.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          mustSetPassword: true,
        },
      }),
      this.prismaService.department.findMany({
        where: { id: { in: departmentIds } },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
    ]);

    // The token named a ULID with no row behind it: the account was deleted
    // while a session was still live.
    if (!user) throw new UnauthorizedException();

    return { ...user, roles, departments };
  }

  /**
   * Supabase owns the password now, but the current-password check stays on the
   * server. `supabase.auth.updateUser` does not verify it, and the
   * reauthentication flow Supabase offers instead mails a one-time code — which
   * is no help to accounts on a placeholder address with no mailbox behind it.
   * So the check is a sign-in against the anon client, whose session is thrown
   * away immediately.
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.requireLinkedUser(userId);

    if (!(await this.supabase.verifyPassword(user.email, currentPassword))) {
      throw new UnauthorizedException("Senha atual incorreta");
    }

    await this.supabase.updateUserById(user.supabaseUserId, {
      password: newPassword,
    });
  }

  /**
   * The first password, for someone who arrived through an invite or recovery
   * link. It cannot reuse `changePassword`: that begins by verifying the
   * current password, and an invited account has none at all — GoTrue leaves
   * `encrypted_password` empty. Adding an "unless the flag is set" branch
   * there would put a bypass of the current-password check inside the method
   * whose whole purpose is to enforce it, one bad condition away from letting
   * any session holder change a password without knowing it.
   *
   * What authorizes the call is the session plus the flag. The session alone
   * would be too weak: everyone signed in has one, so this would become a way
   * to change a password without knowing the current one — a walk-up to an
   * unlocked laptop. The flag narrows it to accounts that are genuinely
   * mid-onboarding, and every route that leads here sets it first.
   *
   * Prisma first, Supabase second — the reverse of `updateEmail`, and the
   * reverse of `UsersService.resetPassword`. If the order were flipped and the
   * flag write failed, the password would be set while the flag stayed true:
   * the person is bounced back to /definir-senha forever, retyping the same
   * password gets `same_password` from GoTrue, and the only way out is raw SQL
   * against production. This way the bad case is a cleared flag and an
   * unchanged password — the user is let in on the session they already hold,
   * and "Reenviar convite" repairs it.
   */
  async setPassword(userId: string, newPassword: string) {
    const user = await this.requireLinkedUser(userId);

    if (!user.mustSetPassword) {
      throw new BadRequestException(
        "Sua senha já está definida — use a troca de senha para alterá-la",
      );
    }

    await this.prismaService.user.update({
      where: { id: userId },
      data: { mustSetPassword: false, passwordChangedAt: new Date() },
    });

    try {
      await this.supabase.updateUserById(user.supabaseUserId, {
        password: newPassword,
      });
    } catch (error) {
      await this.prismaService.user
        .update({ where: { id: userId }, data: { mustSetPassword: true } })
        .catch((rollbackError) => {
          this.logger.error(
            `must_set_password ficou falsa para ${userId} sem senha definida: ${rollbackError}`,
          );
        });
      throw error;
    }
  }

  /**
   * A user with no e-mail or no supabase_user_id has no account to act on. That
   * is the shape of a half-provisioned row, so it fails loudly rather than
   * reporting a password change that never happened.
   */
  private async requireLinkedUser(userId: string): Promise<{
    email: string;
    supabaseUserId: string;
    mustSetPassword: boolean;
  }> {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: { email: true, supabaseUserId: true, mustSetPassword: true },
    });

    if (!user?.email || !user.supabaseUserId) {
      throw new UnauthorizedException();
    }

    return {
      email: user.email,
      supabaseUserId: user.supabaseUserId,
      mustSetPassword: user.mustSetPassword,
    };
  }
}
