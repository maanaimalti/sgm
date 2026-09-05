import { PrismaClient } from "@prisma/client";
import { ROLES, type Role } from "@sgm/shared";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const prisma = new PrismaClient();

/**
 * Copia papéis e setores de public.users para `auth.users.app_metadata`, que é
 * de onde a autorização passa a ser lida.
 *
 * É o portão da migração de autorização: enquanto um usuário não tiver
 * `app_user_id` no token, ele cai no fallback do `jwt.strategy` — e quando o
 * fallback for removido, deixa de conseguir entrar.
 *
 * Idempotente: reescreve o mesmo payload toda vez, e faz merge para não
 * derrubar o que o Supabase já guarda em app_metadata (provider, providers).
 *
 * Lê `_roleTouser` e `_departmentTouser` por SQL cru de propósito: os models
 * saem do schema.prisma no mesmo passo em que a autorização passa a ser lida
 * do token, e este script precisa continuar rodando na janela entre isso e o
 * DROP das tabelas. Depois do DROP ele para de funcionar — e deve mesmo, já
 * não há de onde copiar.
 *
 * Uso:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... pnpm --filter @sgm/api auth:sync-roles --dry-run
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... pnpm --filter @sgm/api auth:sync-roles
 */

interface LegacyUser {
  id: string;
  username: string;
  supabaseUserId: string | null;
  roles: string[];
  departmentIds: string[];
}

function adminClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL?.trim().replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !key) {
    throw new Error(
      "SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias.\n" +
        "Passe na linha de comando em vez de descomentar o .env:\n" +
        "  SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... pnpm --filter @sgm/api auth:sync-roles",
    );
  }

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const admin = adminClient();

  const users = await prisma.$queryRaw<LegacyUser[]>`
    SELECT u.id,
           u.username,
           u.supabase_user_id AS "supabaseUserId",
           coalesce(
             (SELECT array_agg(r.name ORDER BY r.name)
                FROM "_roleTouser" ru
                JOIN roles r ON r.id = ru."A"
               WHERE ru."B" = u.id),
             '{}'
           ) AS roles,
           coalesce(
             (SELECT array_agg(du."A" ORDER BY du."A")
                FROM "_departmentTouser" du
               WHERE du."B" = u.id),
             '{}'
           ) AS "departmentIds"
      FROM users u
     ORDER BY u.username ASC
  `;

  const unlinked: string[] = [];
  const unknownRoles: string[] = [];
  let written = 0;

  for (const user of users) {
    if (!user.supabaseUserId) {
      unlinked.push(user.username);
      continue;
    }

    const roles = user.roles;
    // Sem a FK, nada impede um papel escrito errado de virar um token que não
    // casa com nenhum @Roles. Melhor falhar aqui, com o nome na tela.
    const invalid = roles.filter((name) => !ROLES.includes(name as Role));
    if (invalid.length) {
      unknownRoles.push(`${user.username}: ${invalid.join(", ")}`);
      continue;
    }

    const metadata = {
      app_user_id: user.id,
      roles,
      department_ids: user.departmentIds,
    };

    console.log(
      `${dryRun ? "[dry-run] " : ""}${user.username} → ` +
        `${roles.join(", ") || "(sem papel)"} | ${metadata.department_ids.length} setor(es)`,
    );

    if (dryRun) continue;

    const { data, error: readError } = await admin.auth.admin.getUserById(
      user.supabaseUserId,
    );
    if (readError) {
      throw new Error(`${user.username}: ${readError.message}`);
    }

    const { error } = await admin.auth.admin.updateUserById(
      user.supabaseUserId,
      { app_metadata: { ...(data.user?.app_metadata ?? {}), ...metadata } },
    );
    if (error) {
      throw new Error(`${user.username}: ${error.message}`);
    }
    written++;
  }

  console.log(
    `\n${users.length} usuário(s) lidos, ` +
      `${dryRun ? "0 gravados (dry-run)" : `${written} gravados`}.`,
  );

  if (unknownRoles.length) {
    console.error(`\nPAPÉIS DESCONHECIDOS:\n  ${unknownRoles.join("\n  ")}`);
    process.exitCode = 1;
  }

  if (unlinked.length) {
    console.error(
      `\nSEM supabase_user_id (${unlinked.length}): ${unlinked.join(", ")}\n` +
        "Rode `auth:provision` antes. Sem conta no Auth não existe token, e sem\n" +
        "token não existe autorização depois que o fallback do jwt.strategy sair.",
    );
    process.exitCode = 1;
  }

  if (!unknownRoles.length && !unlinked.length) {
    console.log(
      dryRun
        ? "\nNada pendente. Rode sem --dry-run para gravar."
        : "\nTodos os usuários com papéis no token.",
    );
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
