import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const SALT_ROUNDS = 12;

async function hash(password: string) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function main() {
  console.log('🌱 Seeding specific demo accounts...');

  // Find or create a demo school
  let school = await prisma.school.findUnique({ where: { slug: 'demo-school' } });
  if (!school) {
    school = await prisma.school.create({
      data: {
        name: 'Demo School',
        slug: 'demo-school',
        address: 'Toshkent shahri',
        phone: '+998901234567',
        email: 'info@demo-school.uz',
        isActive: true,
      },
    });
    console.log('  ✓ Created demo school');
  } else {
    console.log('  ✓ Found existing demo school');
  }

  // Find or create a branch
  let branch = await prisma.branch.findFirst({ where: { schoolId: school.id } });
  if (!branch) {
    branch = await prisma.branch.create({
      data: {
        name: 'Asosiy filial',
        code: 'MAIN',
        address: 'Toshkent',
        phone: '+998901111111',
        email: 'main@demo-school.uz',
        schoolId: school.id,
        isActive: true,
      },
    });
    console.log('  ✓ Created main branch');
  }

  const users = [
    { email: 'super@eduplatform.uz', password: 'SuperAdmin123!', firstName: 'Super', lastName: 'Admin', role: UserRole.super_admin },
    { email: 'director@demo-school.uz', password: 'Director123!', firstName: 'Dilnoza', lastName: 'Yusupova', role: UserRole.director },
    { email: 'vice@demo-school.uz', password: 'Vice123!', firstName: 'Sardor', lastName: 'Rahimov', role: UserRole.vice_principal },
    { email: 'teacher@demo-school.uz', password: 'Teacher123!', firstName: 'Olim', lastName: 'Karimov', role: UserRole.teacher },
    { email: 'classteacher@demo-school.uz', password: 'ClassTeacher123!', firstName: 'Malika', lastName: 'Toshmatova', role: UserRole.class_teacher },
    { email: 'accountant@demo-school.uz', password: 'Accountant123!', firstName: 'Nodira', lastName: 'Hasanova', role: UserRole.accountant },
    { email: 'librarian@demo-school.uz', password: 'Librarian123!', firstName: 'Zulfiya', lastName: 'Normatova', role: UserRole.librarian },
    { email: 'student@demo-school.uz', password: 'Student123!', firstName: 'Ali', lastName: 'Yusupov', role: UserRole.student },
    { email: 'parent@demo-school.uz', password: 'Parent123!', firstName: 'Vali', lastName: 'Rahimov', role: UserRole.parent },
  ];

  for (const u of users) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (existing) {
      console.log(`  ⚠️  ${u.email} already exists — skipping`);
      continue;
    }
    await prisma.user.create({
      data: {
        email: u.email,
        passwordHash: await hash(u.password),
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
        schoolId: school.id,
        branchId: branch.id,
        isActive: true,
      },
    });
    console.log(`  ✓ Created ${u.role}: ${u.email}`);
  }

  console.log('🎉 Demo accounts ready!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
