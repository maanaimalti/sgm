import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { ulid } from "ulid";

const prisma = new PrismaClient();

const ROLES = ["admin", "kitchen", "buyer", "manager"] as const;

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

  for (const name of ROLES) {
    await prisma.role.upsert({
      where: { name },
      create: { id: ulid(), name },
      update: {},
    });
  }

  const adminRole = await prisma.role.findUniqueOrThrow({
    where: { name: "admin" },
  });

  const password = await bcrypt.hash("admin123", 10);
  await prisma.user.upsert({
    where: { username: "admin" },
    create: {
      id: ulid(),
      name: "Administrador",
      username: "admin",
      password,
      roles: { connect: { id: adminRole.id } },
      department: { connect: { id: department.id } },
    },
    update: {
      password,
      roles: { connect: { id: adminRole.id } },
      department: { connect: { id: department.id } },
    },
  });

  await prisma.order_counter.upsert({
    where: { id: 1 },
    create: { id: 1, value: 0 },
    update: {},
  });

  console.log("Seed complete. Login: admin / admin123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
