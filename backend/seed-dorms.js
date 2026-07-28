import { PrismaClient } from './generated/prisma/client.ts';
const prisma = new PrismaClient();

async function main() {
  const dorms = [
    { name: 'LQF1', gender: 'female', capacity: 100 },
    { name: 'LQF2', gender: 'female', capacity: 100 },
    { name: 'LQM1', gender: 'male', capacity: 100 },
    { name: 'LQM2', gender: 'male', capacity: 100 },
  ];

  for (const dorm of dorms) {
    await prisma.dorm.upsert({
      where: { name: dorm.name },
      update: {},
      create: dorm,
    });
  }
  console.log('Dorms seeded successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
