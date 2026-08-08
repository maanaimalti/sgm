/**
 * Copies the legacy MySQL database into Supabase Postgres.
 *
 *   LEGACY_DATABASE_URL=mysql://...  (source, read-only)
 *   DIRECT_URL=postgresql://...      (target, session mode — not the 6543 pooler)
 *
 *   pnpm --filter @sgm/api exec ts-node --transpile-only \
 *     prisma/migrate-mysql-to-postgres.ts [--truncate]
 *
 * Idempotent by construction: every table is copied with `skipDuplicates`, and
 * the join tables go through `connect`, which de-duplicates on its own. Re-run
 * it as many times as the rehearsal needs. `--truncate` empties the target
 * first, which is what you want between rehearsals.
 *
 * Run it against DIRECT_URL. Bulk `createMany` through the transaction-mode
 * pooler at connection_limit=1 is slow and flaky.
 */

import { PrismaClient as PgClient, Prisma } from "@prisma/client";
import { PrismaClient as MysqlClient } from "./generated/mysql-client";

const CHUNK = 1000;

const mysql = new MysqlClient();
const pg = new PgClient({
  datasources: { db: { url: process.env.DIRECT_URL } },
});

const sourceCounts: Record<string, number> = {};
const targetCounts: Record<string, () => Promise<number>> = {};

function chunk<T>(rows: T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < rows.length; i += CHUNK)
    out.push(rows.slice(i, i + CHUNK));
  return out;
}

async function copy<T>(
  table: string,
  read: () => Promise<T[]>,
  write: (rows: T[]) => Promise<{ count: number }>,
  countTarget: () => Promise<number>,
): Promise<void> {
  const rows = await read();
  let inserted = 0;
  for (const batch of chunk(rows)) {
    const { count } = await write(batch);
    inserted += count;
  }
  // The gate compares the source against what is actually in the target, not
  // against what this run inserted — `skipDuplicates` makes a re-run insert 0.
  sourceCounts[table] = rows.length;
  targetCounts[table] = countTarget;
  console.log(
    `  ${table.padEnd(20)} ${rows.length} na origem, ${inserted} nova(s)`,
  );
}

/**
 * Deleted in reverse dependency order so foreign keys never block the wipe.
 * The join tables go first — they reference users, roles and departments.
 */
async function truncateTarget(): Promise<void> {
  console.log("Limpando o destino...");
  await pg.$executeRawUnsafe(
    'TRUNCATE TABLE "_roleTouser", "_departmentTouser", "_permissionTorole", ' +
      '"push_subscriptions", "notification", "reports", "order_reports", ' +
      '"order_events", "order_items", "orders", "movements", "stocks", ' +
      '"products", "users", "roles", "permissions", "departments", ' +
      '"categories", "unities", "order_counter" CASCADE',
  );
}

async function copyTables(): Promise<void> {
  console.log("\nCopiando tabelas...");

  await copy(
    "categories",
    () => mysql.category.findMany(),
    (data) => pg.category.createMany({ data, skipDuplicates: true }),
    () => pg.category.count(),
  );
  await copy(
    "unities",
    () => mysql.unity.findMany(),
    (data) => pg.unity.createMany({ data, skipDuplicates: true }),
    () => pg.unity.count(),
  );
  await copy(
    "departments",
    () => mysql.department.findMany(),
    (data) => pg.department.createMany({ data, skipDuplicates: true }),
    () => pg.department.count(),
  );
  await copy(
    "roles",
    () => mysql.role.findMany(),
    (data) => pg.role.createMany({ data, skipDuplicates: true }),
    () => pg.role.count(),
  );
  await copy(
    "permissions",
    () => mysql.permission.findMany(),
    (data) => pg.permission.createMany({ data, skipDuplicates: true }),
    () => pg.permission.count(),
  );
  await copy(
    "users",
    () => mysql.user.findMany(),
    (data) => pg.user.createMany({ data, skipDuplicates: true }),
    () => pg.user.count(),
  );
  await copy(
    "order_counter",
    () => mysql.order_counter.findMany(),
    (data) => pg.order_counter.createMany({ data, skipDuplicates: true }),
    () => pg.order_counter.count(),
  );
  // Prisma accepts a plain number as input for a Decimal column, so the
  // Float -> Decimal(12,2) change needs no conversion here.
  await copy(
    "products",
    () => mysql.product.findMany(),
    (data) => pg.product.createMany({ data, skipDuplicates: true }),
    () => pg.product.count(),
  );
  await copy(
    "stocks",
    () => mysql.stock.findMany(),
    (data) => pg.stock.createMany({ data, skipDuplicates: true }),
    () => pg.stock.count(),
  );
  await copy(
    "movements",
    () => mysql.movement.findMany(),
    (data) => pg.movement.createMany({ data, skipDuplicates: true }),
    () => pg.movement.count(),
  );
  await copy(
    "orders",
    () => mysql.orders.findMany(),
    (data) => pg.orders.createMany({ data, skipDuplicates: true }),
    () => pg.orders.count(),
  );
  await copy(
    "order_items",
    () => mysql.orderItem.findMany(),
    (data) => pg.orderItem.createMany({ data, skipDuplicates: true }),
    () => pg.orderItem.count(),
  );
  // Prisma distinguishes SQL NULL from JSON null. Without DbNull the source's
  // NULL payloads would land as JSON `null`.
  await copy(
    "order_events",
    () => mysql.orderEvent.findMany(),
    (rows) =>
      pg.orderEvent.createMany({
        data: rows.map((row) => ({
          ...row,
          payload:
            row.payload === null
              ? Prisma.DbNull
              : (row.payload as Prisma.InputJsonValue),
        })),
        skipDuplicates: true,
      }),
    () => pg.orderEvent.count(),
  );
  await copy(
    "order_reports",
    () => mysql.orderReports.findMany(),
    (data) => pg.orderReports.createMany({ data, skipDuplicates: true }),
    () => pg.orderReports.count(),
  );
  await copy(
    "reports",
    () => mysql.report.findMany(),
    (data) => pg.report.createMany({ data, skipDuplicates: true }),
    () => pg.report.count(),
  );
  await copy(
    "notification",
    () => mysql.notification.findMany(),
    (data) => pg.notification.createMany({ data, skipDuplicates: true }),
    () => pg.notification.count(),
  );
  await copy(
    "push_subscriptions",
    () => mysql.pushSubscription.findMany(),
    (data) => pg.pushSubscription.createMany({ data, skipDuplicates: true }),
    () => pg.pushSubscription.count(),
  );
}

/**
 * The three implicit m2m join tables have no Prisma model, so they are copied
 * through the relation API. `connect` also de-duplicates, which matters because
 * Postgres gives (A,B) a primary key where MySQL only had a unique index.
 */
async function copyJoinTables(): Promise<void> {
  console.log("\nCopiando tabelas de junção...");

  const users = await mysql.user.findMany({
    select: {
      id: true,
      roles: { select: { id: true } },
      department: { select: { id: true } },
    },
  });

  let roleLinks = 0;
  let departmentLinks = 0;
  for (const user of users) {
    if (!user.roles.length && !user.department.length) continue;
    await pg.user.update({
      where: { id: user.id },
      data: {
        roles: { set: user.roles.map((role) => ({ id: role.id })) },
        department: { set: user.department.map((d) => ({ id: d.id })) },
      },
    });
    roleLinks += user.roles.length;
    departmentLinks += user.department.length;
  }
  console.log(`  _roleTouser          ${roleLinks} vínculo(s)`);
  console.log(`  _departmentTouser    ${departmentLinks} vínculo(s)`);

  const roles = await mysql.role.findMany({
    select: { id: true, permissions: { select: { id: true } } },
  });
  let permissionLinks = 0;
  for (const role of roles) {
    if (!role.permissions.length) continue;
    await pg.role.update({
      where: { id: role.id },
      data: {
        permissions: { set: role.permissions.map((p) => ({ id: p.id })) },
      },
    });
    permissionLinks += role.permissions.length;
  }
  console.log(`  _permissionTorole    ${permissionLinks} vínculo(s)`);

  // The mixed-case identifiers must be double-quoted in Postgres.
  const countJoin = (table: string) => async (): Promise<number> => {
    const [row] = await pg.$queryRawUnsafe<{ count: bigint }[]>(
      `SELECT count(*)::bigint AS count FROM "${table}"`,
    );
    return Number(row?.count ?? 0);
  };

  sourceCounts._roleTouser = roleLinks;
  targetCounts._roleTouser = countJoin("_roleTouser");
  sourceCounts._departmentTouser = departmentLinks;
  targetCounts._departmentTouser = countJoin("_departmentTouser");
  sourceCounts._permissionTorole = permissionLinks;
  targetCounts._permissionTorole = countJoin("_permissionTorole");
}

/**
 * The go/no-go gates. A mismatch here means do not reopen the system.
 */
async function verify(): Promise<boolean> {
  console.log("\nVerificação:");
  let ok = true;

  for (const [table, source] of Object.entries(sourceCounts)) {
    const target = await targetCounts[table]();
    if (source !== target) {
      console.error(`  FALHA ${table}: origem ${source} != destino ${target}`);
      ok = false;
    } else {
      console.log(`  ok  ${table.padEnd(20)} ${target}`);
    }
  }

  // The invariant is that the next friendly_code cannot collide with one that
  // already exists — not that the row is present. Production has no counter row
  // at all, and `create` upserts it, so an absent row is fine as long as there
  // are no orders to collide with.
  const counter = await pg.order_counter.findMany();
  const orderTotal = await pg.orders.count();
  const row = counter.find((c) => c.id === 1);
  if (counter.length > 1) {
    console.error(
      `  FALHA order_counter: esperado no máximo 1 linha, encontrado ${JSON.stringify(counter)}`,
    );
    ok = false;
  } else if (!row) {
    if (orderTotal > 0) {
      console.error(
        `  FALHA order_counter ausente com ${orderTotal} pedido(s) — ` +
          "o contador reiniciaria em 1 e duplicaria friendly_code",
      );
      ok = false;
    } else {
      console.log(
        "  ok  order_counter ausente, mas 0 pedidos — o upsert cria a linha no primeiro pedido",
      );
    }
  } else if (row.value < orderTotal) {
    console.error(
      `  FALHA order_counter.value=${row.value} < ${orderTotal} pedidos — ` +
        "friendly_code duplicado na próxima criação",
    );
    ok = false;
  } else {
    console.log(
      `  ok  order_counter.value=${row.value} >= ${orderTotal} pedidos`,
    );
  }

  const [source] = await mysql.$queryRawUnsafe<{ total: string | number }[]>(
    "SELECT COALESCE(SUM(cost_value), 0) AS total FROM products",
  );
  const target = await pg.product.aggregate({ _sum: { costValue: true } });
  const sourceSum = Number(source?.total ?? 0);
  const targetSum = Number(target._sum.costValue ?? 0);
  if (Math.abs(sourceSum - targetSum) > 0.005) {
    console.error(`  FALHA soma de cost_value: ${sourceSum} != ${targetSum}`);
    ok = false;
  } else {
    console.log(`  ok  soma de cost_value = ${targetSum.toFixed(2)}`);
  }

  // Production MySQL has no email column, so every user arrives without one.
  // Collection happens on the Postgres side with prisma/scripts/set-user-emails.ts.
  // Stage A does not need emails; Stage B cannot start without them — so this
  // reports, it does not block the cutover.
  const missingEmail = await pg.user.count({
    where: { OR: [{ email: null }, { email: "" }] },
  });
  if (missingEmail > 0) {
    console.warn(
      `  --  ${missingEmail} usuário(s) sem e-mail. Não bloqueia a Etapa A.\n` +
        "      Rode `pnpm --filter @sgm/api users:set-emails <csv>` antes da Etapa B —\n" +
        "      o Supabase Auth exige e-mail para criar cada usuário.",
    );
  } else {
    console.log("  ok  todos os usuários têm e-mail");
  }

  return ok;
}

/**
 * Prisma puts the headline on the first line and the actual cause on the last
 * one ("Access denied", "The column `x` does not exist"). Reporting only the
 * first line hides exactly the distinction this pre-flight exists to make.
 */
function describe(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  const code = (error as { code?: string }).code;
  const lines = error.message
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const cause = lines[lines.length - 1] ?? error.message;
  return code ? `[${code}] ${cause}` : cause;
}

/**
 * Read-only pre-flight. Run this against production BEFORE the maintenance
 * window: it proves the frozen legacy schema still matches the real database
 * and shows how much data is about to move. Writes nothing to either side.
 *
 * The per-model `findMany({ take: 1 })` is the actual schema check — Prisma
 * selects every declared column explicitly, so a column this schema declares
 * but production lacks fails here instead of halfway through the copy. Extra
 * columns in production are harmless and intentionally ignored.
 */
async function check(): Promise<boolean> {
  console.log("Pré-voo (somente leitura)\n");
  let ok = true;

  const models: [
    string,
    {
      findMany: (a: unknown) => Promise<unknown[]>;
      count: () => Promise<number>;
    },
  ][] = [
    ["categories", mysql.category],
    ["unities", mysql.unity],
    ["departments", mysql.department],
    ["roles", mysql.role],
    ["permissions", mysql.permission],
    ["users", mysql.user],
    ["order_counter", mysql.order_counter],
    ["products", mysql.product],
    ["stocks", mysql.stock],
    ["movements", mysql.movement],
    ["orders", mysql.orders],
    ["order_items", mysql.orderItem],
    ["order_events", mysql.orderEvent],
    ["order_reports", mysql.orderReports],
    ["reports", mysql.report],
    ["notification", mysql.notification],
    ["push_subscriptions", mysql.pushSubscription],
  ];

  // Probe the connection once. Without this, an unreachable host or a bad
  // password reports as 17 identical per-table failures and buries the cause.
  try {
    await mysql.$queryRawUnsafe("SELECT 1");
  } catch (error) {
    console.error(`  FALHA não foi possível conectar: ${describe(error)}`);
    console.error("\nPRÉ-VOO FALHOU — confira LEGACY_DATABASE_URL.");
    return false;
  }

  console.log("Origem (MySQL de produção):");
  let total = 0;
  for (const [table, model] of models) {
    try {
      await model.findMany({ take: 1 });
      const n = await model.count();
      total += n;
      console.log(`  ok  ${table.padEnd(20)} ${n}`);
    } catch (error) {
      console.error(`  FALHA ${table}: ${describe(error)}`);
      ok = false;
    }
  }
  console.log(`  ${"".padEnd(4)}${"TOTAL".padEnd(20)} ${total} linha(s)\n`);

  console.log("Destino (Supabase):");
  const applied = await pg.$queryRawUnsafe<{ migration_name: string }[]>(
    "SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL",
  );
  if (!applied.some((m) => m.migration_name === "0_init")) {
    console.error(
      "  FALHA baseline 0_init não aplicado — rode prisma migrate deploy",
    );
    ok = false;
  } else {
    console.log("  ok  baseline 0_init aplicado");
  }

  const existing = await pg.user.count();
  const existingOrders = await pg.orders.count();
  if (existing || existingOrders) {
    console.warn(
      `  --  destino já tem ${existing} usuário(s) e ${existingOrders} pedido(s). Use --truncate para recarregar do zero.`,
    );
  } else {
    console.log("  ok  destino vazio");
  }

  console.log(
    ok
      ? "\nPré-voo OK."
      : "\nPRÉ-VOO FALHOU — resolva antes de abrir a janela.",
  );
  return ok;
}

async function main() {
  if (!process.env.LEGACY_DATABASE_URL) {
    throw new Error("LEGACY_DATABASE_URL não está definida (MySQL de origem)");
  }
  if (!process.env.DIRECT_URL) {
    throw new Error("DIRECT_URL não está definida (Postgres de destino)");
  }

  if (process.argv.includes("--check")) {
    if (!(await check())) process.exitCode = 1;
    return;
  }

  if (process.argv.includes("--truncate")) await truncateTarget();

  await copyTables();
  await copyJoinTables();

  if (!(await verify())) {
    console.error("\nVERIFICAÇÃO FALHOU — não libere o sistema.");
    process.exitCode = 1;
    return;
  }
  console.log("\nVerificação completa. Migração consistente.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await Promise.all([mysql.$disconnect(), pg.$disconnect()]);
  });
