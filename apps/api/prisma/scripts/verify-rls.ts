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

  if (withoutRls.length || forced.length || foreignOwner.length) {
    process.exitCode = 1;
    return;
  }

  console.log(
    `\nTodas as ${tables.length} tabelas com RLS ligado, nenhuma com FORCE. Deny-by-default de pé.`,
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
