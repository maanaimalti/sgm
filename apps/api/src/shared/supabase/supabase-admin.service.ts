import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";
// biome-ignore lint/style/useImportType: <explanation>
import { ConfigService } from "@nestjs/config";
import {
  type AuthError,
  createClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

export interface CreateAuthUserInput {
  email: string;
  password: string;
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
 * `anon` exists for one job: checking a password the user typed, by asking the
 * system that now owns it.
 */
@Injectable()
export class SupabaseAdminService {
  private readonly logger = new Logger(SupabaseAdminService.name);
  private readonly admin: SupabaseClient;
  private readonly anon: SupabaseClient;

  constructor(config: ConfigService) {
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

  async createUser(input: CreateAuthUserInput): Promise<{ id: string }> {
    const { data, error } = await this.admin.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
    });
    if (error) throw this.translate(error, "criar o usuário no Supabase Auth");
    if (!data.user) {
      throw new InternalServerErrorException(
        "Supabase Auth não devolveu o usuário criado",
      );
    }
    return { id: data.user.id };
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
    if (error.code === "email_exists" || error.code === "user_already_exists") {
      return new ConflictException("Já existe uma conta com esse e-mail");
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
