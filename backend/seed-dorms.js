import { PrismaClient } from './generated/prisma/client.ts';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'dev.db');
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter });

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
