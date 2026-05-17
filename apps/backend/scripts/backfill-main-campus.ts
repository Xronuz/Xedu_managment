/**
 * Backfill script: rename all "Main Campus" branches to "Asosiy filial"
 * Run: npx ts-node scripts/backfill-main-campus.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.branch.updateMany({
    where: { name: 'Main Campus' },
    data: { name: 'Asosiy filial' },
  });

  console.log(`Updated ${result.count} branch(es) from "Main Campus" to "Asosiy filial"`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
