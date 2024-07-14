import { PrismaClient } from '@prisma/client';
import { ulid } from 'ulid';

const prisma = new PrismaClient();

async function main() {
  await prisma.role.upsert({
    where: {
      name: 'admin',
    },
    create: { name: 'admin', id: ulid() },
    update: {},
  });

  await prisma.role.upsert({
    where: { name: 'chicken' },
    update: {},
    create: { name: 'chicken', id: ulid() },
  });
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
