import { Logger } from "@nestjs/common";

type Env = Record<string, unknown>;

const logger = new Logger("EnvValidation");

const isBlank = (value: unknown): boolean =>
  value === undefined || value === null || String(value).trim() === "";

/**
 * Fails the boot only on variables whose absence already breaks the app today,
 * so turning this on cannot take down a deployment that currently works.
 * Everything else is reported as a warning; each migration stage promotes its
 * own variables to the required set when it ships.
 */
const REQUIRED = [
  "DATABASE_URL",
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
];

/**
 * The project URL feeds both the admin client and the JWT issuer the API checks
 * every token against. A trailing slash produces an issuer that does not match
 * the `iss` claim, and the only symptom is 401 on every request with nothing
 * pointing at the cause — so normalize it here rather than let it through.
 */
export function normalizeSupabaseUrl(raw: unknown): string {
  const value = String(raw).trim();
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error(
      `SUPABASE_URL não é uma URL válida: "${value}". Esperado algo como https://<ref>.supabase.co`,
    );
  }

  const isLocal = ["localhost", "127.0.0.1"].includes(url.hostname);
  if (url.protocol !== "https:" && !(url.protocol === "http:" && isLocal)) {
    throw new Error(
      `SUPABASE_URL precisa usar https (http só é aceito em localhost): "${value}"`,
    );
  }

  if (url.pathname !== "/" || url.search || url.hash) {
    throw new Error(
      `SUPABASE_URL não pode ter caminho nem query: "${value}". Use só a origem, como https://<ref>.supabase.co`,
    );
  }

  return url.origin;
}

export function validate(config: Env): Env {
  const missing = REQUIRED.filter((key) => isBlank(config[key]));
  if (missing.length) {
    throw new Error(
      `Variáveis de ambiente obrigatórias ausentes: ${missing.join(", ")}`,
    );
  }

  config.SUPABASE_URL = normalizeSupabaseUrl(config.SUPABASE_URL);

  const driver = String(config.STORAGE_DRIVER ?? "r2").toLowerCase();

  if (!["r2", "local"].includes(driver)) {
    logger.warn(
      `STORAGE_DRIVER="${driver}" não é reconhecido; o serviço de upload vai tratá-lo como "r2". Valores aceitos: r2, local.`,
    );
  }

  if (driver !== "local") {
    const recommended = [
      "R2_ENDPOINT",
      "R2_PUBLIC_URL",
      "AWS_ACCESS_KEY_ID",
      "AWS_SECRET_ACCESS_KEY",
    ].filter((key) => isBlank(config[key]));

    if (recommended.length) {
      logger.warn(
        `Storage em modo "${driver}" sem: ${recommended.join(", ")}. ` +
          "Uploads e URLs de relatório podem falhar em runtime.",
      );
    }
  }

  return config;
}
