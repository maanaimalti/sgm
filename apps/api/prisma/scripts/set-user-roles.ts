import { PrismaClient } from "@prisma/client";
import { ROLES, type Role } from "@sgm/shared";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const prisma = new PrismaClient();

/**
 * Troca os papéis de um usuário pela linha de comando.
 *
 * Substitui o `set_user_roles()` que existia no SQL Editor: agora a
 * autorização é lida do `app_metadata`, e um UPDATE em `_roleTouser` não muda
 * mais nada. Isto é a válvula de escape para quando a tela `/usuarios` não
 * está no ar — em condições normais use a tela.
 *
 * Uso:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     pnpm --filter @sgm/api users:set-roles maria admin kitchen
 *
 *   # trocando também os setores (sem a flag, os atuais são preservados)
 *   ... users:set-roles maria admin --setores=dept-cozinha,dept-compras
 */

function adminClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL?.trim().replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !key) {
    throw new Error(
      "SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias.\n" +
        "  SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... pnpm --filter @sgm/api users:set-roles <username> <papel...>",
    );
  }

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function countAdmins(admin: SupabaseClient): Promise<string[]> {
  const admins: string[] = [];

  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) throw new Error(error.message);

    for (const user of data.users) {
      const metadata = user.app_metadata as {
        app_user_id?: string;
        roles?: string[];
      };
      if (metadata?.roles?.includes("admin") && metadata.app_user_id) {
        admins.push(metadata.app_user_id);
      }
    }

    if (data.users.length < 200) break;
  }

  return admins;
}

async function main() {
  const args = process.argv.slice(2);
  const setoresArg = args.find((arg) => arg.startsWith("--setores="));
  const [username, ...roles] = args.filter(
    (arg) => !arg.startsWith("--setores="),
  );

  if (!username || !roles.length) {
    throw new Error(
      `Informe o usuário e ao menos um papel.\n  Papéis válidos: ${ROLES.join(", ")}`,
    );
  }

  // Sem a FK que existia em `roles`, um papel escrito errado vira um token que
  // não casa com nenhum @Roles — o usuário entra e não enxerga nada, sem erro.
  const invalid = roles.filter((role) => !ROLES.includes(role as Role));
  if (invalid.length) {
    throw new Error(
      `Papel inexistente: ${invalid.join(", ")}\n  Papéis válidos: ${ROLES.join(", ")}`,
    );
  }

  const user = await prisma.user.findUnique({
    where: { username },
    select: { id: true, supabaseUserId: true },
  });

  if (!user) throw new Error(`Usuário "${username}" não existe`);
  if (!user.supabaseUserId) {
    throw new Error(
      `Usuário "${username}" não está vinculado ao Supabase Auth — rode auth:provision`,
    );
  }

  const admin = adminClient();

  // Mesma guarda que a API aplica: sem nenhum admin, a tela de usuários fica
  // inalcançável e a única saída é este script rodado por alguém com a
  // service role key na mão.
  if (!roles.includes("admin")) {
    const admins = await countAdmins(admin);
    if (admins.length <= 1 && admins.includes(user.id)) {
      throw new Error(
        "Este é o único administrador do sistema — promova outro antes",
      );
    }
  }

  const { data, error: readError } = await admin.auth.admin.getUserById(
    user.supabaseUserId,
  );
  if (readError) throw new Error(readError.message);

  const currentMetadata = (data.user?.app_metadata ?? {}) as {
    department_ids?: string[];
  };

  // Setores também moram no app_metadata. Sem a flag, preserva os atuais —
  // trocar papéis não deveria tirar ninguém dos seus setores.
  const departmentIds = setoresArg
    ? setoresArg
        .slice("--setores=".length)
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean)
    : (currentMetadata.department_ids ?? []);

  if (setoresArg) {
    const found = await prisma.department.count({
      where: { id: { in: departmentIds } },
    });
    if (found !== new Set(departmentIds).size) {
      throw new Error("Um dos setores informados não existe");
    }
  }

  const { error } = await admin.auth.admin.updateUserById(user.supabaseUserId, {
    app_metadata: {
      ...currentMetadata,
      app_user_id: user.id,
      roles,
      department_ids: departmentIds,
    },
  });
  if (error) throw new Error(error.message);

  // O token atual continua valendo com os papéis antigos até expirar; sem
  // derrubar a sessão, o refresh renovaria isso indefinidamente.
  await prisma.$executeRaw`
    DELETE FROM auth.sessions WHERE user_id = ${user.supabaseUserId}::uuid
  `;

  console.log(
    `${username} → papéis: ${roles.join(", ")} | setores: ${departmentIds.join(", ") || "(nenhum)"}\n` +
      "Sessões encerradas. Os papéis novos valem no próximo login.",
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
