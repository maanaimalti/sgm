import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Row {
  username: string;
  email: string;
  line: number;
}

function parseCsv(path: string): Row[] {
  const raw = readFileSync(path, "utf8");
  const rows: Row[] = [];

  raw.split(/\r?\n/).forEach((rawLine, index) => {
    const line = index + 1;
    const trimmed = rawLine.trim();
    if (!trimmed) return;

    const [username, email] = trimmed.split(",").map((cell) => cell.trim());
    if (username?.toLowerCase() === "username") return;

    if (!username || !email) {
      throw new Error(
        `Linha ${line}: esperado "username,email", recebido "${trimmed}"`,
      );
    }

    // Normalização obrigatória: o índice único do MySQL é case-insensitive,
    // o do Postgres não é, e o Supabase Auth normaliza internamente.
    rows.push({ username, email: email.toLowerCase(), line });
  });

  return rows;
}

function assertValid(rows: Row[]): void {
  const problems: string[] = [];
  const seen = new Map<string, number>();

  for (const row of rows) {
    if (!EMAIL_RE.test(row.email)) {
      problems.push(`Linha ${row.line}: e-mail inválido "${row.email}"`);
    }
    const previous = seen.get(row.email);
    if (previous) {
      problems.push(
        `Linha ${row.line}: e-mail "${row.email}" repetido (linha ${previous})`,
      );
    } else {
      seen.set(row.email, row.line);
    }
  }

  if (problems.length) {
    throw new Error(`CSV inválido:\n  ${problems.join("\n  ")}`);
  }
}

async function main() {
  const [, , csvArg, ...flags] = process.argv;
  const dryRun = flags.includes("--dry-run");

  if (!csvArg) {
    console.error(
      "Uso: ts-node --transpile-only prisma/scripts/set-user-emails.ts <arquivo.csv> [--dry-run]\n" +
        "CSV com as colunas username,email (cabeçalho opcional).",
    );
    process.exit(1);
  }

  const rows = parseCsv(resolve(csvArg));
  assertValid(rows);

  console.log(`${rows.length} linha(s) lida(s)${dryRun ? " (dry-run)" : ""}\n`);

  let updated = 0;
  const missing: string[] = [];

  for (const row of rows) {
    const user = await prisma.user.findUnique({
      where: { username: row.username },
      select: { id: true, email: true },
    });

    if (!user) {
      missing.push(row.username);
      console.warn(`  ! ${row.username} — usuário não encontrado`);
      continue;
    }

    if (user.email === row.email) {
      console.log(`  = ${row.username} — já está com ${row.email}`);
      continue;
    }

    if (!dryRun) {
      await prisma.user.update({
        where: { username: row.username },
        data: { email: row.email },
      });
    }

    updated += 1;
    console.log(`  ${dryRun ? "~" : "✔"} ${row.username} → ${row.email}`);
  }

  const pending = await prisma.user.findMany({
    where: { OR: [{ email: null }, { email: "" }] },
    select: { username: true },
    orderBy: { username: "asc" },
  });

  console.log(
    `\n${updated} usuário(s) ${dryRun ? "seriam atualizados" : "atualizados"}.`,
  );

  if (missing.length) {
    console.warn(
      `Usernames do CSV que não existem no banco: ${missing.join(", ")}`,
    );
  }

  if (pending.length) {
    console.warn(
      `\nAINDA SEM E-MAIL (${pending.length}): ${pending.map((u) => u.username).join(", ")}\n` +
        "A Etapa A não pode começar enquanto essa lista não estiver vazia.",
    );
    process.exitCode = 1;
  } else {
    console.log("\nTodos os usuários têm e-mail. Portão da Etapa A liberado.");
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
