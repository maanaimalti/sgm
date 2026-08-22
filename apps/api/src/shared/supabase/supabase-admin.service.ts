import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from "@nestjs/common";
// biome-ignore lint/style/useImportType: <explanation>
import { ConfigService } from "@nestjs/config";
import type { AppMetadata } from "@sgm/shared";
import {
  type AuthError,
  createClient,
  type SupabaseClient,
} from "@supabase/supabase-js";
// biome-ignore lint/style/useImportType: Nest needs the value for injection
import { PrismaService } from "../db/prisma.service";

export interface AuthUserSummary {
  id: string;
  email: string | null;
  appMetadata: Partial<AppMetadata>;
}

export interface UpdateAuthUserInput {
  email?: string;
  password?: string;
  /**
   * Marks an address as already verified. On an email change this is the
   * difference between the new address taking effect and GoTrue treating the
   * change as a *request* and mailing a confirmation link — which, for the
   * placeholder addresses this system has to fix, goes nowhere.
   */
  email_confirm?: boolean;
}

/**
 * The API's window onto Supabase Auth.
 *
 * Two clients, deliberately. `admin` holds the service-role key, which ignores
 * RLS and every role check in this codebase — it never leaves the server.
 * `anon` exists for the two things that are not admin operations: checking a
 * password the user typed, and asking for a recovery e-mail.
 */
const PER_PAGE = 200;
const CACHE_MS = 30_000;

@Injectable()
export class SupabaseAdminService {
  private readonly logger = new Logger(SupabaseAdminService.name);
  private userCache?: { at: number; users: AuthUserSummary[] };
  private readonly admin: SupabaseClient;
  private readonly anon: SupabaseClient;

  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const url = this.require(config, "SUPABASE_URL");

    // Not cosmetic: with the defaults the client starts a token refresh timer
    // that holds the event loop open and fights main.ts's enableShutdownHooks.
    const options = {
      auth: { autoRefreshToken: false, persistSession: false },
    };

    this.admin = createClient(
      url,
      this.require(config, "SUPABASE_SERVICE_ROLE_KEY"),
      options,
    );
    this.anon = createClient(
      url,
      this.require(config, "SUPABASE_ANON_KEY"),
      options,
    );
  }

  /**
   * Creates the account and mails the invite in one call. GoTrue does both
   * inside a single transaction, so a mailer failure rolls the account back
   * and leaves nothing orphaned to clean up.
   *
   * The account is created *unconfirmed and with no password at all* — no
   * `email_confirm: true` here, unlike every other write in this file. That is
   * deliberate: an unconfirmed account can be invited again, which is what
   * makes "reenviar convite" work. Once the person accepts, they are confirmed
   * and further invites fail with `email_exists` — see `resendInvite`.
   */
  async inviteUserByEmail(email: string): Promise<{ id: string }> {
    const { data, error } =
      await this.admin.auth.admin.inviteUserByEmail(email);
    if (error) throw this.translate(error, "convidar o usuário");
    if (!data.user) {
      throw new InternalServerErrorException(
        "Supabase Auth não devolveu o usuário convidado",
      );
    }
    return { id: data.user.id };
  }

  /**
   * The recovery e-mail, for someone who already accepted an invite. Goes
   * through the anon client because `/recover` is not an admin route — and
   * because that client is created with the default implicit flow, so it
   * attaches no PKCE challenge. That matters: a code verifier stored on this
   * server would be useless to the browser that opens the link.
   */
  async sendPasswordRecovery(email: string): Promise<void> {
    const { error } = await this.anon.auth.resetPasswordForEmail(email);
    if (error) throw this.translate(error, "enviar o link de redefinição");
  }

  async updateUserById(
    supabaseUserId: string,
    attributes: UpdateAuthUserInput,
  ): Promise<void> {
    const { error } = await this.admin.auth.admin.updateUserById(
      supabaseUserId,
      attributes,
    );
    if (error)
      throw this.translate(error, "atualizar o usuário no Supabase Auth");
  }

  async deleteUser(supabaseUserId: string): Promise<void> {
    const { error } = await this.admin.auth.admin.deleteUser(supabaseUserId);
    if (error)
      throw this.translate(error, "remover o usuário do Supabase Auth");
  }

  /**
   * The authorization payload for one account. Read-merge-write, because
   * `app_metadata` is a single JSON column: sending only the keys we own would
   * drop anything Supabase or a future feature put beside them.
   */
  async setAppMetadata(
    supabaseUserId: string,
    metadata: AppMetadata,
  ): Promise<void> {
    const { data, error: readError } =
      await this.admin.auth.admin.getUserById(supabaseUserId);
    if (readError) {
      throw this.translate(readError, "ler o usuário no Supabase Auth");
    }

    const { error } = await this.admin.auth.admin.updateUserById(
      supabaseUserId,
      { app_metadata: { ...(data.user?.app_metadata ?? {}), ...metadata } },
    );
    if (error) throw this.translate(error, "gravar os papéis no Supabase Auth");
  }

  /**
   * Every account, paged. This is what replaced "which users have role X?" as
   * a SQL join once roles moved out of Postgres — the token can answer that
   * question for the caller, but never for anybody else.
   *
   * Memoized for a few seconds because the notification fan-out calls it once
   * per order event, and the answer changes only when an admin edits somebody.
   * Authorization never reads this cache; it reads the token.
   */
  async listAllUsers(): Promise<AuthUserSummary[]> {
    const fresh = this.userCache && Date.now() - this.userCache.at < CACHE_MS;
    if (fresh && this.userCache) return this.userCache.users;

    const users: AuthUserSummary[] = [];
    for (let page = 1; ; page++) {
      const { data, error } = await this.admin.auth.admin.listUsers({
        page,
        perPage: PER_PAGE,
      });
      if (error) throw this.translate(error, "listar os usuários do Auth");

      users.push(
        ...data.users.map((user) => ({
          id: user.id,
          email: user.email ?? null,
          appMetadata: (user.app_metadata ?? {}) as Partial<AppMetadata>,
        })),
      );

      if (data.users.length < PER_PAGE) break;
    }

    this.userCache = { at: Date.now(), users };
    return users;
  }

  /**
   * The app-side ids of everyone holding one of `roles`, optionally narrowed
   * to a department. This is the query that used to be a SQL join over
   * `_roleTouser`; it answers "who should be notified", never "what may the
   * caller do" — that comes off the caller's own token.
   *
   * Accounts with no `app_user_id` are skipped: they exist in Auth but have no
   * row here, so there is nothing to notify.
   */
  async findUserIdsByRole(
    roles: string[],
    departmentId?: string | null,
  ): Promise<string[]> {
    const users = await this.listAllUsers();

    return users
      .filter((user) => {
        const meta = user.appMetadata;
        if (!meta.app_user_id) return false;
        if (!meta.roles?.some((role) => roles.includes(role))) return false;
        if (departmentId && !meta.department_ids?.includes(departmentId)) {
          return false;
        }
        return true;
      })
      .map((user) => user.appMetadata.app_user_id as string);
  }

  /**
   * The authorization payload for one app-side ULID. For background work —
   * report generation, mostly — which runs long after the request that
   * started it and has no token to read.
   */
  async findAppMetadata(
    appUserId: string,
  ): Promise<Partial<AppMetadata> | null> {
    const users = await this.listAllUsers();
    const match = users.find(
      (user) => user.appMetadata.app_user_id === appUserId,
    );
    return match?.appMetadata ?? null;
  }

  /** Drops the memo, so a role change is visible to the next fan-out. */
  invalidateUserCache(): void {
    this.userCache = undefined;
  }

  /**
   * Ends every session the user has, so their next refresh fails and they come
   * back with a token carrying the new roles.
   *
   * Raw SQL because there is no supported call for it: `auth.admin.signOut`
   * takes the *user's own* access token, which the server never has. Prisma
   * connects as the tables' owner, so it can reach the auth schema; deleting
   * the session cascades to its refresh tokens.
   *
   * This does not invalidate an access token that was already issued — nothing
   * can. That window is bounded by the JWT expiry configured in the dashboard,
   * which is why it is set low.
   */
  async revokeSessions(supabaseUserId: string): Promise<void> {
    await this.prisma.$executeRaw`
      DELETE FROM auth.sessions WHERE user_id = ${supabaseUserId}::uuid
    `;
  }

  /**
   * Verifies a password without ever holding on to the session it mints. Used
   * by the change-password flow, because `updateUser` does not check the
   * current password and the reauthentication flow Supabase offers mails an
   * OTP — useless for accounts on an address with no mailbox behind it.
   */
  async verifyPassword(email: string, password: string): Promise<boolean> {
    const { error } = await this.anon.auth.signInWithPassword({
      email,
      password,
    });
    if (!error) return true;
    if (error.status === 400 || error.code === "invalid_credentials") {
      return false;
    }
    throw this.translate(error, "verificar a senha atual");
  }

  /**
   * supabase-js returns errors, it does not throw them. Every call above has to
   * translate, or a failure silently reads as success.
   */
  private translate(error: AuthError, action: string): HttpException {
    // resendInvite branches on this 409 to fall back to a recovery link, so the
    // mapping is load-bearing and pinned by a test.
    if (error.code === "email_exists" || error.code === "user_already_exists") {
      return new ConflictException("Já existe uma conta com esse e-mail");
    }

    if (error.code === "user_not_found") {
      return new NotFoundException("Conta não encontrada no Supabase Auth");
    }

    if (error.code === "over_email_send_rate_limit") {
      return new HttpException(
        "Já enviamos um e-mail para esse endereço há pouco. Espere um minuto.",
        429,
      );
    }

    if (error.code === "email_address_invalid") {
      return new BadRequestException(
        "E-mail inválido ou de um domínio que o Supabase não aceita",
      );
    }

    // Without custom SMTP the project only delivers to addresses on the
    // organisation's Supabase team, and everything else comes back as this.
    // There is no error code for it, so the message is all there is to match
    // on — and the generic 500 below would send an admin hunting through logs
    // for what is really a one-checkbox configuration gap.
    if (/not authorized/i.test(error.message)) {
      return new InternalServerErrorException(
        "O Supabase recusou o envio para esse endereço: configure o SMTP próprio do projeto.",
      );
    }

    const status = error.status ?? 500;

    if (status === 429) {
      return new HttpException(
        "Muitas tentativas no Supabase Auth. Espere um minuto.",
        429,
      );
    }

    if (status === 400 || status === 422) {
      return new BadRequestException(error.message);
    }

    this.logger.error(`Falha ao ${action}: [${status}] ${error.message}`);
    return new InternalServerErrorException(`Falha ao ${action}`);
  }

  private require(config: ConfigService, key: string): string {
    const value = config.get<string>(key);
    if (!value) throw new Error(`${key} environment variable is required`);
    return value;
  }
}
