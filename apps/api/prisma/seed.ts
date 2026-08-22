import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { ulid } from "ulid";

const prisma = new PrismaClient();

async function main() {
  const department = await prisma.department.upsert({
    where: { id: "dept-cozinha" },
    create: {
      id: "dept-cozinha",
      name: "Cozinha",
      description: "Departamento de cozinha",
    },
    update: {},
  });

  const password = await bcrypt.hash("admin123", 10);
  // Supabase Auth keys accounts by e-mail, so the local admin needs one before
  // `auth:provision` can give it something to sign in with.
  const email = "admin@sgm.icmalagoas.org.br";
  // Papéis e setores não são mais colunas: vivem no app_metadata da conta do
  // Supabase Auth. O seed só consegue criar a linha — quem dá o papel de admin
  // é o `users:set-roles`, que precisa da service role key.
  await prisma.user.upsert({
    where: { username: "admin" },
    create: {
      id: ulid(),
      name: "Administrador",
      username: "admin",
      email,
      password,
    },
    update: { email, password },
  });

  await prisma.order_counter.upsert({
    where: { id: 1 },
    create: { id: 1, value: 0 },
    update: {},
  });

  // Sample catalog: 1 category, 1 unit of measure, 1 product (+ starting stock)
  const category = await prisma.category.upsert({
    where: { id: "cat-cereais" },
    create: {
      id: "cat-cereais",
      name: "Cereais",
      description: "Grãos e cereais",
    },
    update: {},
  });

  const unity = await prisma.unity.upsert({
    where: { id: "uni-kg" },
    create: { id: "uni-kg", name: "Quilograma", description: "kg" },
    update: {},
  });

  const product = await prisma.product.upsert({
    where: { id: "prod-arroz" },
    create: {
      id: "prod-arroz",
      name: "Arroz branco tipo 1",
      brand: "Tio João",
      description: "Pacote de 5kg",
      status: "active",
      costValue: 25.9,
      saleValue: 0,
      minStock: 10,
      categoryId: category.id,
      unityId: unity.id,
      departmentId: department.id,
    },
    update: {},
  });

  await prisma.stock.upsert({
    where: { id: "stock-arroz" },
    create: { id: "stock-arroz", productId: product.id, quantity: 50 },
    update: {},
  });

  console.log(`Seed complete. Login: ${email} / admin123`);
  console.log(
    "Ainda faltam dois passos — sem eles o admin entra sem enxergar nada:\n" +
      "  1. pnpm auth:provision            (cria a conta no Supabase Auth)\n" +
      `  2. pnpm users:set-roles admin admin --setores=${department.id}`,
  );
  console.log(
    `Catalog: categoria "${category.name}", unidade "${unity.name}", produto "${product.name}" (estoque 50).`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
