import { PrismaClient } from "@prisma/client";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const prisma = new PrismaClient();

const PAGE_SIZE = 200;

/**
 * Cria em auth.users uma conta para cada linha de public.users e grava o UUID
 * de volta em supabase_user_id. É o portão da virada da Etapa B: enquanto
 * sobrar um usuário sem vínculo, ele não consegue entrar de jeito nenhum.
 *
 * Idempotente de propósito — dá para rodar quantas vezes quiser, e a ordem de
 * precedência em `decide()` é o que garante isso.
 *
 * Uso:
 *   pnpm --filter @sgm/api auth:provision --dry-run
 *   pnpm --filter @sgm/api auth:provision
 */

interface DbUser {
  id: string;
  name: string;
  username: string;
  email: string | null;
  password: string | null;
  supabaseUserId: string | null;
}

function adminClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL?.trim().replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !key) {
    throw new Error(
      "SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias.\n" +
        "Passe na linha de comando em vez de descomentar o .env:\n" +
        "  SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... pnpm --filter @sgm/api auth:provision",
    );
  }

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Indexa auth.users por e-mail. Paginado porque `listUsers` trunca em silêncio
 * — hoje sete usuários cabem numa página, mas o dia em que não couberem o
 * script passaria a recriar contas que já existem.
 */
async function indexAuthUsersByEmail(
  admin: SupabaseClient,
): Promise<Map<string, string>> {
  const byEmail = new Map<string, string>();

  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: PAGE_SIZE,
    });
    if (error) throw new Error(`Falha ao listar auth.users: ${error.message}`);

    for (const user of data.users) {
      if (user.email) byEmail.set(user.email.toLowerCase(), user.id);
    }

    if (data.users.length < PAGE_SIZE) break;
  }

  return byEmail;
}

async function authUserExists(
  admin: SupabaseClient,
  supabaseUserId: string,
): Promise<boolean> {
  const { data, error } = await admin.auth.admin.getUserById(supabaseUserId);
  if (error) return false;
  return !!data.user;
}

type Decision =
  | { kind: "skip"; reason: string }
  | { kind: "linked" }
  | { kind: "relink"; supabaseUserId: string }
  | { kind: "create" };

async function decide(
  admin: SupabaseClient,
  user: DbUser,
  byEmail: Map<string, string>,
): Promise<Decision> {
  if (!user.email?.trim()) {
    return { kind: "skip", reason: "sem e-mail — rode users:set-emails antes" };
  }

  const email = user.email.trim().toLowerCase();

  if (user.supabaseUserId) {
    if (await authUserExists(admin, user.supabaseUserId)) {
      return { kind: "linked" };
    }
    // A conta some do auth mas o vínculo fica: sem revincular, esse usuário
    // nunca mais entra e nada no banco explica por quê.
    const existing = byEmail.get(email);
    return existing
      ? { kind: "relink", supabaseUserId: existing }
      : { kind: "create" };
  }

  const existing = byEmail.get(email);
  if (existing) return { kind: "relink", supabaseUserId: existing };

  if (!user.password) {
    return {
      kind: "skip",
      reason: "sem hash de senha — crie a conta pela tela /usuarios",
    };
  }

  return { kind: "create" };
}

async function createAndLink(
  admin: SupabaseClient,
  user: DbUser,
): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email: user.email as string,
    // O hash bcrypt ($2a$/$2b$) é aceito como está, então ninguém precisa
    // trocar de senha na virada.
    password_hash: user.password as string,
    // Sem isto a conta fica "unconfirmed" e o login falha com
    // email_not_confirmed — e não há caixa postal nos e-mails provisórios
    // para receber o link de confirmação.
    email_confirm: true,
    // Único rastro dentro de auth.users apontando de volta para o ULID.
    user_metadata: {
      app_user_id: user.id,
      username: user.username,
      name: user.name,
    },
  });

  if (error) throw new Error(error.message);
  if (!data.user) throw new Error("Supabase não devolveu o usuário criado");

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: { supabaseUserId: data.user.id },
    });
  } catch (writeBackError) {
    // Sem esta limpeza sobra uma conta de auth dona do e-mail, e toda nova
    // tentativa falha com user_already_exists sem nada em public.users que
    // explique de onde ela veio.
    await admin.auth.admin.deleteUser(data.user.id).catch(() => undefined);
    throw writeBackError;
  }

  return data.user.id;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const admin = adminClient();

  const users: DbUser[] = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      password: true,
      supabaseUserId: true,
    },
    orderBy: { username: "asc" },
  });

  const byEmail = await indexAuthUsersByEmail(admin);

  console.log(
    `${users.length} usuário(s) em public.users, ${byEmail.size} conta(s) em auth.users${dryRun ? " (dry-run)" : ""}\n`,
  );

  let created = 0;
  let relinked = 0;
  const skipped: string[] = [];

  for (const user of users) {
    const decision = await decide(admin, user, byEmail);

    if (decision.kind === "skip") {
      skipped.push(user.username);
      console.warn(`  ! ${user.username} — ${decision.reason}`);
      continue;
    }

    if (decision.kind === "linked") {
      console.log(`  = ${user.username} — já vinculado`);
      continue;
    }

    if (decision.kind === "relink") {
      if (!dryRun) {
        await prisma.user.update({
          where: { id: user.id },
          data: { supabaseUserId: decision.supabaseUserId },
        });
      }
      relinked += 1;
      console.log(
        `  ${dryRun ? "~" : "↔"} ${user.username} — vinculado a conta existente (${decision.supabaseUserId})`,
      );
      continue;
    }

    if (dryRun) {
      created += 1;
      console.log(`  ~ ${user.username} — seria criado (${user.email})`);
      continue;
    }

    const supabaseUserId = await createAndLink(admin, user);
    created += 1;
    console.log(`  ✔ ${user.username} → ${supabaseUserId}`);
  }

  console.log(
    `\n${created} conta(s) ${dryRun ? "seriam criadas" : "criadas"}, ` +
      `${relinked} ${dryRun ? "seriam revinculadas" : "revinculadas"}.`,
  );

  if (skipped.length) {
    console.warn(`Pulados: ${skipped.join(", ")}`);
  }

  const pending = await prisma.user.findMany({
    where: { supabaseUserId: null },
    select: { username: true },
    orderBy: { username: "asc" },
  });

  if (pending.length) {
    console.warn(
      `\nAINDA SEM supabase_user_id (${pending.length}): ${pending.map((u) => u.username).join(", ")}\n` +
        "A virada da Etapa B não pode acontecer enquanto essa lista não estiver vazia:\n" +
        "esses usuários não conseguem entrar de jeito nenhum depois do deploy.",
    );
    process.exitCode = 1;
  } else {
    console.log(
      "\nTodos os usuários vinculados ao Supabase Auth. Portão da Etapa B liberado.",
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
