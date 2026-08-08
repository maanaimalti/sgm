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
const REQUIRED = ["DATABASE_URL", "JWT_SECRET"];

export function validate(config: Env): Env {
  const missing = REQUIRED.filter((key) => isBlank(config[key]));
  if (missing.length) {
    throw new Error(
      `Variáveis de ambiente obrigatórias ausentes: ${missing.join(", ")}`,
    );
  }

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
