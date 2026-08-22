import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface HookRow {
  claims: { app_roles?: string[]; app_user_id?: string; sub?: string };
}

interface FunctionRow {
  name: string;
  security_definer: boolean;
  search_path_pinned: boolean;
}

const FIXTURE_UUID = "00000000-0000-4000-8000-00000000f00d";
const ABSENT_UUID = "00000000-0000-4000-8000-0000000dead0";

/**
 * Confere o Custom Access Token Hook.
 *
 * O hook roda dentro do Supabase Auth, com dois segundos de orçamento e sem
 * repetição: se ele levantar exceção, nenhum token é emitido e ninguém entra.
 * Não dá para exercitar isso num Postgres comum, mas dá para exercitar a parte
 * que erra — a função em si. É o que este script faz, contra dados de mentira
 * dentro de uma transação que sempre volta atrás.
 */
async function main() {
  const [fn] = await prisma.$queryRaw<FunctionRow[]>`
    select p.proname                        as name,
           p.prosecdef                      as security_definer,
           (p.proconfig is not null)        as search_path_pinned
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = 'custom_access_token_hook'
  `;

  if (!fn) {
    throw new Error(
      "public.custom_access_token_hook não existe — a migration não foi aplicada.",
    );
  }

  const problems: string[] = [];

  if (!fn.security_definer) {
    problems.push(
      "não é SECURITY DEFINER — sem isso o RLS bloqueia a leitura e as claims saem vazias",
    );
  }
  if (!fn.search_path_pinned) {
    problems.push(
      "search_path não está fixado — numa função SECURITY DEFINER isso é escalação de privilégio",
    );
  }

  console.log(
    `custom_access_token_hook: ${fn.security_definer ? "SECURITY DEFINER" : "SECURITY INVOKER"}` +
      `, search_path ${fn.search_path_pinned ? "fixado" : "SOLTO"}\n`,
  );

  await prisma
    .$transaction(async (tx) => {
      await tx.$executeRaw`
      insert into "users" ("id", "name", "username", "email", "supabase_user_id")
      values ('verify-hook-user', 'Fixture', 'verify.hook', 'verify.hook@example.test', ${FIXTURE_UUID}::uuid)
    `;
      await tx.$executeRaw`
      insert into "roles" ("id", "name", "updatedAt")
      values ('verify-hook-role-a', 'verify-hook-zeta', now()),
             ('verify-hook-role-b', 'verify-hook-alfa', now())
    `;
      await tx.$executeRaw`
      insert into "_roleTouser" ("A", "B")
      values ('verify-hook-role-a', 'verify-hook-user'),
             ('verify-hook-role-b', 'verify-hook-user')
    `;

      const [hit] = await tx.$queryRaw<HookRow[]>`
      select public.custom_access_token_hook(
        jsonb_build_object(
          'user_id', ${FIXTURE_UUID}::text,
          'claims',  jsonb_build_object('sub', 'x', 'aud', 'authenticated')
        )
      ) -> 'claims' as claims
    `;

      // Ordenado por nome: prova que o jsonb_agg é determinístico, e não a ordem
      // em que as linhas saíram do join.
      const roles = hit.claims.app_roles ?? [];
      if (roles.join(",") !== "verify-hook-alfa,verify-hook-zeta") {
        problems.push(`app_roles saiu como ${JSON.stringify(roles)}`);
      }
      if (hit.claims.app_user_id !== "verify-hook-user") {
        problems.push(
          `app_user_id saiu como ${JSON.stringify(hit.claims.app_user_id)}`,
        );
      }
      if (hit.claims.sub !== "x") {
        problems.push("o hook comeu uma claim obrigatória que já existia");
      }
      console.log(
        `  usuário vinculado   → app_roles=${JSON.stringify(roles)} app_user_id=${hit.claims.app_user_id}`,
      );

      // Ninguém com esse supabase_user_id. Tem que sair claims vazias, não erro:
      // um usuário ainda não provisionado não pode derrubar a emissão do token.
      const [miss] = await tx.$queryRaw<HookRow[]>`
      select public.custom_access_token_hook(
        jsonb_build_object(
          'user_id', ${ABSENT_UUID}::text,
          'claims',  jsonb_build_object('sub', 'y', 'aud', 'authenticated')
        )
      ) -> 'claims' as claims
    `;

      if ((miss.claims.app_roles ?? null)?.length !== 0) {
        problems.push(
          `usuário desconhecido devolveu ${JSON.stringify(miss.claims.app_roles)} em vez de []`,
        );
      }
      if (miss.claims.app_user_id !== undefined) {
        problems.push("usuário desconhecido recebeu app_user_id");
      }
      console.log(
        `  usuário desconhecido → app_roles=${JSON.stringify(miss.claims.app_roles)}`,
      );

      throw new Rollback();
    })
    .catch((error) => {
      if (!(error instanceof Rollback)) throw error;
    });

  if (problems.length) {
    console.error(`\nProblemas (${problems.length}):`);
    for (const problem of problems) console.error(`  ✘ ${problem}`);
    process.exitCode = 1;
    return;
  }

  console.log(
    "\nHook devolve as claims esperadas e não quebra com usuário sem vínculo.",
  );
}

/** Sai da transação sem gravar nada — o fixture nunca toca o banco de verdade. */
class Rollback extends Error {}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
