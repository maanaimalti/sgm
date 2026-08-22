import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface TableRow {
  table: string;
  rls_enabled: boolean;
  rls_forced: boolean;
  owner: string;
}

interface ConnectionRow {
  role: string;
  bypasses_rls: boolean;
}

interface ViewRow {
  name: string;
  kind: string;
}

interface HookGrantRow {
  role: string;
  can_execute: boolean;
}

/**
 * Confere o deny-by-default da Etapa B.
 *
 * O RLS desta base não tem uma única política: toda leitura real passa pela
 * API, e o Prisma continua enxergando tudo porque conecta como dono das
 * tabelas. Isso dá dois jeitos silenciosos de quebrar tudo, e é o que este
 * script existe para pegar:
 *
 *   - tabela sem RLS  → legível por qualquer um pelo PostgREST com a anon key
 *   - FORCE ligado    → o Prisma passa a ver zero linhas, sem erro nenhum
 *
 * E mais dois que não são sobre tabela:
 *
 *   - view em public  → o RLS das tabelas de baixo não vale dentro dela, e o
 *                       privilégio padrão do Supabase pode publicá-la no
 *                       PostgREST. O catálogo de pg_class abaixo filtra por
 *                       relkind = 'r', então uma view passa despercebida.
 *   - EXECUTE solto no custom_access_token_hook → é SECURITY DEFINER, roda
 *                       como dono e ignora RLS. Só o supabase_auth_admin pode
 *                       chamá-lo.
 */
async function main() {
  const [connection] = await prisma.$queryRaw<ConnectionRow[]>`
    select current_user as role, rolbypassrls as bypasses_rls
      from pg_roles where rolname = current_user
  `;

  const tables = await prisma.$queryRaw<TableRow[]>`
    select c.relname                     as table,
           c.relrowsecurity              as rls_enabled,
           c.relforcerowsecurity         as rls_forced,
           pg_get_userbyid(c.relowner)   as owner
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'r'
     order by c.relname
  `;

  const views = await prisma.$queryRaw<ViewRow[]>`
    select c.relname as name,
           case c.relkind when 'v' then 'view' else 'materialized view' end as kind
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind in ('v', 'm')
     order by c.relname
  `;

  // has_function_privilege levanta se o role OU a função não existir, e as duas
  // ausências são normais: num Postgres comum (o do CI) não há nenhum desses
  // roles, e num Supabase que ainda não recebeu a migration do hook não há a
  // função — é o estado em que o runbook da Etapa B roda este script. Por isso
  // o role sai de pg_roles e a função de to_regprocedure, que devolve NULL em
  // vez de levantar. Sem as duas guardas, um portão da virada quebraria aqui.
  const hookGrants = await prisma.$queryRaw<HookGrantRow[]>`
    select r.rolname as role,
           has_function_privilege(r.rolname, fn.oid, 'EXECUTE') as can_execute
      from pg_roles r
      cross join lateral (
        select to_regprocedure('public.custom_access_token_hook(jsonb)')::oid as oid
      ) fn
     where r.rolname in ('supabase_auth_admin', 'anon', 'authenticated', 'service_role')
       and fn.oid is not null
     order by r.rolname
  `;

  if (!tables.length) {
    throw new Error(
      "Nenhuma tabela encontrada no schema public — a conexão está apontando para o banco certo?",
    );
  }

  console.log(
    `Conectado como "${connection.role}"${connection.bypasses_rls ? " (BYPASSRLS)" : ""}\n` +
      `${tables.length} tabela(s) no schema public\n`,
  );

  const withoutRls: string[] = [];
  const forced: string[] = [];
  const foreignOwner: string[] = [];

  for (const table of tables) {
    const problems: string[] = [];

    if (!table.rls_enabled) {
      withoutRls.push(table.table);
      problems.push("RLS DESLIGADO");
    }
    if (table.rls_forced) {
      forced.push(table.table);
      problems.push("FORCE LIGADO");
    }
    // Dono diferente só importa se o role da conexão também não tiver
    // BYPASSRLS — é a combinação que faz o Prisma parar de ver linhas.
    if (table.owner !== connection.role && !connection.bypasses_rls) {
      foreignOwner.push(table.table);
      problems.push(`dono é "${table.owner}"`);
    }

    console.log(
      problems.length
        ? `  ✘ ${table.table} — ${problems.join(", ")}`
        : `  ✔ ${table.table}`,
    );
  }

  const hookProblems: string[] = [];

  if (views.length) {
    hookProblems.push(
      `${views.length} view(s) em public: ${views.map((v) => v.name).join(", ")}`,
    );
    console.error(
      `\nVIEWS EM PUBLIC (${views.length}): ${views.map((v) => `${v.name} (${v.kind})`).join(", ")}\n` +
        "Uma view não herda o RLS das tabelas que lê, e o privilégio padrão do\n" +
        "Supabase pode concedê-la a anon/authenticated — publicando pelo\n" +
        "PostgREST exatamente o que o deny-by-default fecha.",
    );
  }

  for (const grant of hookGrants) {
    const shouldExecute = grant.role === "supabase_auth_admin";
    if (grant.can_execute === shouldExecute) continue;

    hookProblems.push(
      shouldExecute
        ? "supabase_auth_admin não pode executar o custom_access_token_hook"
        : `${grant.role} pode executar o custom_access_token_hook`,
    );
    console.error(
      shouldExecute
        ? "\nO supabase_auth_admin não tem EXECUTE no custom_access_token_hook.\n" +
            "O hook falha na emissão do token e as claims saem sem app_roles."
        : `\n"${grant.role}" tem EXECUTE no custom_access_token_hook.\n` +
            "A função é SECURITY DEFINER: roda como dono e ignora o RLS.\n" +
            `Revogue com REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) FROM ${grant.role}.`,
    );
  }

  if (forced.length) {
    console.error(
      `\nFORCE ROW LEVEL SECURITY em ${forced.length} tabela(s): ${forced.join(", ")}\n` +
        "Com FORCE nem o dono escapa das políticas, e não existe política nenhuma:\n" +
        "a aplicação inteira devolve listas vazias sem um único erro.\n" +
        'Desfaça com ALTER TABLE "<tabela>" NO FORCE ROW LEVEL SECURITY.',
    );
  }

  if (foreignOwner.length) {
    console.error(
      `\nTabelas com dono diferente de "${connection.role}" (${foreignOwner.length}): ${foreignOwner.join(", ")}\n` +
        "Sem ser dono e sem BYPASSRLS, o Prisma passa a ver zero linhas nelas.",
    );
  }

  if (withoutRls.length) {
    console.error(
      `\nSEM RLS (${withoutRls.length}): ${withoutRls.join(", ")}\n` +
        "Com a anon key no bundle do browser, essas tabelas são legíveis por\n" +
        "qualquer um que abrir o devtools. Rode as migrations pendentes.",
    );
  }

  if (
    withoutRls.length ||
    forced.length ||
    foreignOwner.length ||
    hookProblems.length
  ) {
    process.exitCode = 1;
    return;
  }

  console.log(
    `\nTodas as ${tables.length} tabelas com RLS ligado, nenhuma com FORCE, nenhuma view em public.\n` +
      `${hookGrants.length ? `EXECUTE do hook restrito ao supabase_auth_admin. ` : ""}Deny-by-default de pé.`,
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
