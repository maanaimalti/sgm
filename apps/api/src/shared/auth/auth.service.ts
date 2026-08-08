import { Injectable, UnauthorizedException } from "@nestjs/common";
// biome-ignore lint/style/useImportType: <explanation>
import { PrismaService } from "../db/prisma.service";
// biome-ignore lint/style/useImportType: <explanation>
import { SupabaseAdminService } from "../supabase/supabase-admin.service";

@Injectable()
export class AuthService {
  constructor(
    private prismaService: PrismaService,
    private supabase: SupabaseAdminService,
  ) {}

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
   * A user with no e-mail or no supabase_user_id has no account to act on. That
   * is the shape of a half-provisioned row, so it fails loudly rather than
   * reporting a password change that never happened.
   */
  private async requireLinkedUser(
    userId: string,
  ): Promise<{ email: string; supabaseUserId: string }> {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: { email: true, supabaseUserId: true },
    });

    if (!user?.email || !user.supabaseUserId) {
      throw new UnauthorizedException();
    }

    return { email: user.email, supabaseUserId: user.supabaseUserId };
  }
}
