/**
 * Bir martalik tuzatish skripti — saqlangan email'larni login bilan bir xil
 * normallashtiradi (lowercase + trim).
 *
 * MUAMMO: login.dto email'ni lowercase+trim qiladi, lekin eski yaratish
 * oqimlari (direktor, foydalanuvchi, taklif, o'quvchi) email'ni shundayligicha
 * saqlagan. Shu sababli bitta katta harf bilan kiritilgan email egasi hech
 * qachon tizimga kira olmasdi ("Email yoki parol noto'g'ri"), parol tiklash
 * ham yordam bermasdi (email lookup mos kelmaydi).
 *
 * Bajarilishi (serverda):
 *   cd apps/backend && pnpm ts-node scripts/normalize-emails.ts
 *
 * Avval quruq ko'rish (hech narsa o'zgartirmaydi):
 *   cd apps/backend && pnpm ts-node scripts/normalize-emails.ts --dry-run
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true },
  });

  const toFix = users.filter((u) => u.email !== u.email.toLowerCase().trim());

  if (toFix.length === 0) {
    console.log('✅ Barcha email\'lar allaqachon normallashtirilgan. O\'zgarish kerak emas.');
    return;
  }

  console.log(`${toFix.length} ta email normallashtirilishi kerak:\n`);

  let fixed = 0;
  let conflicts = 0;
  for (const u of toFix) {
    const normalized = u.email.toLowerCase().trim();

    // Boshqa foydalanuvchida shu normallashgan email bormi (to'qnashuv)?
    const existing = await prisma.user.findUnique({
      where: { email: normalized },
      select: { id: true },
    });
    if (existing && existing.id !== u.id) {
      conflicts++;
      console.warn(`⚠️  TO'QNASHUV: "${u.email}" → "${normalized}" allaqachon boshqa foydalanuvchida band. Qo'lda hal qiling.`);
      continue;
    }

    console.log(`  ${u.email}  →  ${normalized}`);
    if (!DRY_RUN) {
      await prisma.user.update({ where: { id: u.id }, data: { email: normalized } });
    }
    fixed++;
  }

  console.log(
    `\n${DRY_RUN ? '[DRY-RUN] ' : ''}Tuzatildi: ${fixed}, To'qnashuv: ${conflicts}`,
  );
  if (DRY_RUN) console.log('Haqiqiy yozish uchun --dry-run flagsiz qayta ishga tushiring.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
