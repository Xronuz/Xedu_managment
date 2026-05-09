import {
  PrismaClient,
  UserRole,
  DayOfWeek,
  AttendanceStatus,
  GradeType,
  ExamFrequency,
  PaymentStatus,
  PaymentProvider,
  FeeFrequency,
  LeaveStatus,
  DisciplineType,
  DisciplineSeverity,
  DisciplineAction,
  AnnouncementPriority,
  AnnouncementStatus,
  QuestionType,
  SessionStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const SALT_ROUNDS = 12;

async function hash(password: string) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

// ─── Uzbek Names ───────────────────────────────────────────────────────────
const FIRST_NAMES_MALE = [
  'Ali', 'Vali', 'Sardor', 'Jasur', 'Bekzod', 'Olim', 'Shohruh', 'Dilshod',
  'Nodir', 'Rustam', 'Kamol', 'Farhod', 'Aziz', 'Umid', 'Sherzod', 'Temur',
  'Islom', 'Zafar', 'Anvar', 'Sohib',
];
const FIRST_NAMES_FEMALE = [
  'Malika', 'Dilnoza', 'Zulfiya', 'Nodira', 'Gulnora', 'Sevara', 'Madinabonu',
  'Nilufar', 'Dildora', 'Umida', 'Feruza', 'Gulchehra', 'Ziyoda', 'Munisa',
  'Oydin', 'Shahnoza', 'Lola', 'Ruxsora', 'Nigora', 'Komila',
];
const LAST_NAMES = [
  'Yusupov', 'Rahimov', 'Toshmatov', 'Karimov', 'Hasanov', 'Mirzayev',
  'Normatov', 'Ismoilov', 'Qodirov', 'Nabiyev', 'Axmedov', 'Saidov',
  'Eshonov', 'Ganiyev', 'Xasanov', 'Umarov', 'Soliyev', 'Raxmonov',
  'Vahidov', 'Jalilov',
];

// ─── Data Constants ────────────────────────────────────────────────────────
const SUBJECTS = [
  'Matematika', 'Fizika', 'Kimyo', 'Biologiya', 'Ingliz tili', 'Rus tili',
  'Ona tili', 'Tarix', 'Geografiya', 'Adabiyot', 'Informatika', 'Musiqa',
  'Tarbiya', 'Jismoniy tarbiya', "Tasviriy san'at",
];

const TEACHER_SUBJECT_ASSIGNMENTS = [
  ['Matematika', 'Fizika', 'Informatika'],
  ['Kimyo', 'Biologiya', 'Geografiya'],
  ['Ona tili', 'Adabiyot', 'Tarix'],
  ['Ingliz tili', 'Rus tili', 'Musiqa'],
  ['Tarbiya', 'Jismoniy tarbiya', "Tasviriy san'at"],
];

const DAYS: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
const TIME_SLOTS = [
  { start: '08:00', end: '08:45', startMin: 480, endMin: 525 },
  { start: '09:00', end: '09:45', startMin: 540, endMin: 585 },
  { start: '10:00', end: '10:45', startMin: 600, endMin: 645 },
  { start: '11:00', end: '11:45', startMin: 660, endMin: 705 },
  { start: '12:00', end: '12:45', startMin: 720, endMin: 765 },
  { start: '13:00', end: '13:45', startMin: 780, endMin: 825 },
];
const TZ_OFFSET = 300; // Asia/Tashkent UTC+5
const ACADEMIC_YEAR = '2025-2026';

// ─── Helpers ───────────────────────────────────────────────────────────────
function sample<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function sampleSize<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, n);
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateName(gender?: 'male' | 'female') {
  const isMale = gender ? gender === 'male' : Math.random() > 0.5;
  const firstName = sample(isMale ? FIRST_NAMES_MALE : FIRST_NAMES_FEMALE);
  const lastName = sample(LAST_NAMES);
  return { firstName, lastName, isMale };
}

function randomDate(daysBack: number, daysForward = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + randInt(-daysBack, daysForward));
  d.setHours(0, 0, 0, 0);
  return d;
}

// ─── Main Seeder ───────────────────────────────────────────────────────────
async function main() {
  console.log('🌱 Seeding Xedu Maktabi demo data...');

  // Idempotency: delete existing demo school (cascade handles relations)
  const existing = await prisma.school.findUnique({ where: { slug: 'xedu-demo' } });
  if (existing) {
    console.log('  🗑️  Existing xedu-demo school found — deleting with cascade...');
    await prisma.school.delete({ where: { id: existing.id } });
    console.log('  ✓ Deleted existing demo school');
  }

  // Pre-hash common passwords
  const [studentHash, parentHash, teacherHash, accountantHash, librarianHash] =
    await Promise.all([
      hash('Student123!'),
      hash('Parent123!'),
      hash('Teacher123!'),
      hash('Accountant123!'),
      hash('Librarian123!'),
    ]);

  // ─── 1. School + Subscription ──────────────────────────────────────────
  const school = await prisma.school.create({
    data: {
      name: 'Xedu Maktabi',
      slug: 'xedu-demo',
      address: "Toshkent sh., Yunusobod tumani, Navoiy ko'chasi 15",
      phone: '+998901111111',
      email: 'info@xedu-demo.uz',
      isActive: true,
      subscriptionTier: 'premium',
      financeType: 'CENTRALIZED',
      timezone: 'Asia/Tashkent',
      onboardingCompleted: true,
    },
  });
  console.log(`  ✓ School: ${school.name} (${school.id})`);

  await prisma.subscription.create({
    data: {
      schoolId: school.id,
      plan: 'premium',
      billingCycle: 'yearly',
      status: 'active',
      trialEndsAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      nextBilling: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
  });
  console.log('  ✓ Subscription: premium/yearly');

  // ─── 2. Branches ───────────────────────────────────────────────────────
  const branchDefs = [
    { name: 'Bosh filial', code: 'MAIN', address: "Toshkent sh., Yunusobod" },
    { name: 'Yangi filial', code: 'YANGI', address: "Toshkent sh., Chilonzor" },
    { name: 'Shahar filiali', code: 'SHAHAR', address: "Toshkent sh., Mirzo-Ulugbek" },
  ];
  const branches = await prisma.$transaction(
    branchDefs.map((b, i) =>
      prisma.branch.create({
        data: {
          schoolId: school.id,
          name: b.name,
          code: b.code,
          address: b.address,
          phone: `+99890111111${i + 2}`,
          email: `${b.code.toLowerCase()}@xedu-demo.uz`,
          isActive: true,
        },
      }),
    ),
  );
  const [branchMain, branchYangi, branchShahar] = branches;
  console.log(`  ✓ Branches: ${branches.map((b) => b.name).join(', ')}`);

  // ─── 3. Admin Users ────────────────────────────────────────────────────
  const adminDefs = [
    { email: 'director@xedu-demo.uz', password: 'Director123!', firstName: 'Dilnoza', lastName: 'Yusupova', role: 'director' as UserRole, branchId: branchMain.id },
    { email: 'vice@xedu-demo.uz', password: 'Vice123!', firstName: 'Sardor', lastName: 'Rahimov', role: 'vice_principal' as UserRole, branchId: branchMain.id },
    { email: 'admin1@xedu-demo.uz', password: 'Admin123!', firstName: 'Malika', lastName: 'Toshmatova', role: 'branch_admin' as UserRole, branchId: branchYangi.id },
    { email: 'admin2@xedu-demo.uz', password: 'Admin123!', firstName: 'Bekzod', lastName: 'Karimov', role: 'branch_admin' as UserRole, branchId: branchShahar.id },
    { email: 'accountant1@xedu-demo.uz', password: 'Accountant123!', firstName: 'Nodira', lastName: 'Hasanova', role: 'accountant' as UserRole, branchId: branchMain.id },
    { email: 'accountant2@xedu-demo.uz', password: 'Accountant123!', firstName: 'Olim', lastName: 'Mirzayev', role: 'accountant' as UserRole, branchId: branchMain.id },
    { email: 'librarian@xedu-demo.uz', password: 'Librarian123!', firstName: 'Zulfiya', lastName: 'Normatova', role: 'librarian' as UserRole, branchId: branchMain.id },
  ];

  const adminDefsWithHash = await Promise.all(
    adminDefs.map(async (u) => ({ ...u, passwordHash: await hash(u.password) })),
  );
  const adminUsers = await prisma.$transaction(
    adminDefsWithHash.map((u) =>
      prisma.user.create({
        data: {
          email: u.email,
          passwordHash: u.passwordHash,
          firstName: u.firstName,
          lastName: u.lastName,
          role: u.role,
          schoolId: school.id,
          branchId: u.branchId,
          isActive: true,
        },
      }),
    ),
  );
  const director = adminUsers.find((u) => u.role === 'director')!;
  const vicePrincipal = adminUsers.find((u) => u.role === 'vice_principal')!;
  const accountant1 = adminUsers.find((u) => u.email === 'accountant1@xedu-demo.uz')!;
  console.log(`  ✓ Admin users: ${adminUsers.length}`);

  // ─── 4. Teachers ───────────────────────────────────────────────────────
  const teacherSubjectMap: Record<string, string[]> = {};
  const teachers: typeof adminUsers = [];

  for (const branch of branches) {
    for (let i = 0; i < 5; i++) {
      const globalIdx = teachers.length;
      const { firstName, lastName } = generateName();
      const subjects = TEACHER_SUBJECT_ASSIGNMENTS[i];
      const t = await prisma.user.create({
        data: {
          email: `teacher${String(globalIdx + 1).padStart(2, '0')}@xedu-demo.uz`,
          passwordHash: teacherHash,
          firstName,
          lastName,
          role: 'teacher' as UserRole,
          schoolId: school.id,
          branchId: branch.id,
          isActive: true,
        },
      });
      teacherSubjectMap[t.id] = subjects;
      teachers.push(t);
    }
  }
  console.log(`  ✓ Teachers: ${teachers.length}`);

  // ─── 5. Classes ────────────────────────────────────────────────────────
  const classDefs: Array<{ name: string; gradeLevel: number; branchIdx: number }> = [];
  // MAIN
  ['1A', '1B', '2A', '2B', '3A', '3B', '4A', '5A', '6A', '7A', '8A', '9A', '10A', '11A'].forEach((n) =>
    classDefs.push({ name: n, gradeLevel: parseInt(n, 10), branchIdx: 0 }),
  );
  // YANGI
  ['1C', '2C', '3C', '4B', '5B', '6B'].forEach((n) =>
    classDefs.push({ name: n, gradeLevel: parseInt(n, 10), branchIdx: 1 }),
  );
  // SHAHAR
  ['1D', '2D', '3D', '4C', '5C'].forEach((n) =>
    classDefs.push({ name: n, gradeLevel: parseInt(n, 10), branchIdx: 2 }),
  );

  const classes = await prisma.$transaction(
    classDefs.map((c, i) => {
      const branch = branches[c.branchIdx];
      const teacherIdx = c.branchIdx * 5 + (i % 5);
      return prisma.class.create({
        data: {
          schoolId: school.id,
          branchId: branch.id,
          name: c.name,
          gradeLevel: c.gradeLevel,
          academicYear: ACADEMIC_YEAR,
          classTeacherId: teachers[teacherIdx]?.id ?? null,
        },
      });
    }),
  );
  console.log(`  ✓ Classes: ${classes.length}`);

  // ─── 6. Students + ClassStudent ────────────────────────────────────────
  const allStudents: typeof adminUsers = [];
  const classStudentData: Array<{ classId: string; studentId: string }> = [];
  let studentNum = 1;

  for (const cls of classes) {
    for (let i = 0; i < 8; i++) {
      const { firstName, lastName } = generateName();
      const email = `student${String(studentNum).padStart(3, '0')}@xedu-demo.uz`;
      const s = await prisma.user.create({
        data: {
          email,
          passwordHash: studentHash,
          firstName,
          lastName,
          role: 'student' as UserRole,
          schoolId: school.id,
          branchId: cls.branchId,
          isActive: true,
        },
      });
      allStudents.push(s);
      classStudentData.push({ classId: cls.id, studentId: s.id });
      studentNum++;
    }
  }
  await prisma.classStudent.createMany({ data: classStudentData });
  console.log(`  ✓ Students: ${allStudents.length}`);

  // ─── 7. Parents + ParentStudent ────────────────────────────────────────
  const parentCount = 150;
  const allParents: typeof adminUsers = [];

  for (let i = 1; i <= parentCount; i++) {
    const linkedStudent = allStudents[i - 1];
    const { firstName, lastName } = generateName();
    const p = await prisma.user.create({
      data: {
        email: `parent${String(i).padStart(3, '0')}@xedu-demo.uz`,
        passwordHash: parentHash,
        firstName,
        lastName,
        role: 'parent' as UserRole,
        schoolId: school.id,
        branchId: linkedStudent?.branchId ?? branchMain.id,
        isActive: true,
      },
    });
    allParents.push(p);
  }

  const parentStudentData = allParents.map((p, i) => ({
    parentId: p.id,
    studentId: allStudents[i].id,
  }));
  await prisma.parentStudent.createMany({ data: parentStudentData });
  console.log(`  ✓ Parents: ${allParents.length} (linked to first ${parentCount} students)`);

  // ─── 8. Subjects ───────────────────────────────────────────────────────
  const subjectRecords: Array<{ id: string; classId: string; branchId: string; teacherId: string; name: string }> = [];

  for (const cls of classes) {
    const branchTeachers = teachers.filter((t) => t.branchId === cls.branchId);
    for (const subjectName of SUBJECTS) {
      const teacher = branchTeachers.find((t) => teacherSubjectMap[t.id]?.includes(subjectName));
      if (!teacher) {
        console.warn(`    ⚠️ No teacher for ${subjectName} in ${cls.name}`);
        continue;
      }
      const subj = await prisma.subject.create({
        data: {
          schoolId: school.id,
          branchId: cls.branchId,
          classId: cls.id,
          name: subjectName,
          teacherId: teacher.id,
        },
      });
      subjectRecords.push(subj);
    }
  }
  console.log(`  ✓ Subjects: ${subjectRecords.length}`);

  // ─── 9. Schedules ──────────────────────────────────────────────────────
  const scheduleData: Array<{
    schoolId: string;
    branchId: string;
    classId: string;
    subjectId: string;
    teacherId: string;
    dayOfWeek: DayOfWeek;
    timeSlot: number;
    startTime: string;
    endTime: string;
    startDayMinUtc: number;
    endDayMinUtc: number;
    roomNumber: string;
  }> = [];

  for (const cls of classes) {
    const clsSubjects = subjectRecords.filter((s) => s.classId === cls.id);
    for (const day of DAYS) {
      const lessonCount = randInt(4, 6);
      const picked = sampleSize(clsSubjects, lessonCount);
      const dayIdx = DAYS.indexOf(day);
      for (let slot = 0; slot < lessonCount; slot++) {
        const subject = picked[slot];
        const t = TIME_SLOTS[slot];
        scheduleData.push({
          schoolId: school.id,
          branchId: cls.branchId,
          classId: cls.id,
          subjectId: subject.id,
          teacherId: subject.teacherId,
          dayOfWeek: day,
          timeSlot: slot + 1,
          startTime: t.start,
          endTime: t.end,
          startDayMinUtc: dayIdx * 1440 + t.startMin - TZ_OFFSET,
          endDayMinUtc: dayIdx * 1440 + t.endMin - TZ_OFFSET,
          roomNumber: `${cls.gradeLevel}${String.fromCharCode(65 + randInt(0, 5))}-xona`,
        });
      }
    }
  }
  await prisma.schedule.createMany({ data: scheduleData });
  console.log(`  ✓ Schedules: ${scheduleData.length}`);

  // ─── 10. Attendance ────────────────────────────────────────────────────
  const attendanceStatuses: AttendanceStatus[] = ['present', 'present', 'present', 'absent', 'late', 'excused'];
  const attendanceData: any[] = [];
  for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
    const date = randomDate(dayOffset, 0);
    for (const student of allStudents) {
      const cs = classStudentData.find((c) => c.studentId === student.id);
      attendanceData.push({
        schoolId: school.id,
        branchId: student.branchId!,
        classId: cs!.classId,
        studentId: student.id,
        date,
        status: sample(attendanceStatuses),
      });
    }
  }
  // Chunk to avoid hitting parameter limits (Postgres ~32k params)
  const chunkSize = 1000;
  for (let i = 0; i < attendanceData.length; i += chunkSize) {
    await prisma.attendance.createMany({ data: attendanceData.slice(i, i + chunkSize) });
  }
  console.log(`  ✓ Attendance: ${attendanceData.length} records`);

  // ─── 11. Grades ────────────────────────────────────────────────────────
  const gradeTypes: GradeType[] = ['classwork', 'homework', 'test', 'exam'];
  const gradeData: any[] = [];
  for (let i = 0; i < 500; i++) {
    const student = sample(allStudents);
    const cs = classStudentData.find((c) => c.studentId === student.id)!;
    const clsSubjects = subjectRecords.filter((s) => s.classId === cs.classId);
    const subject = sample(clsSubjects);
    gradeData.push({
      schoolId: school.id,
      branchId: student.branchId!,
      classId: cs.classId,
      studentId: student.id,
      subjectId: subject.id,
      type: sample(gradeTypes),
      score: randInt(50, 100),
      maxScore: 100,
      date: randomDate(60, 0),
      comment: i % 5 === 0 ? 'Yaxshi natija' : null,
      createdById: subject.teacherId,
    });
  }
  for (let i = 0; i < gradeData.length; i += chunkSize) {
    await prisma.grade.createMany({ data: gradeData.slice(i, i + chunkSize) });
  }
  console.log(`  ✓ Grades: ${gradeData.length} records`);

  // ─── 12. Fee Structures ────────────────────────────────────────────────
  const feeStructures = await prisma.$transaction([
    prisma.feeStructure.create({
      data: {
        schoolId: school.id,
        branchId: null,
        name: "Oylik to'lov (asosiy)",
        description: 'Barcha sinflar uchun oylik tolov',
        amount: 500000,
        currency: 'UZS',
        frequency: 'monthly',
        academicYear: ACADEMIC_YEAR,
        isActive: true,
      },
    }),
    prisma.feeStructure.create({
      data: {
        schoolId: school.id,
        branchId: null,
        name: "Boshlang'ich sinf to'lovi",
        description: '1-4 sinflar uchun chegirmali tolov',
        amount: 400000,
        currency: 'UZS',
        frequency: 'monthly',
        gradeLevel: 1,
        academicYear: ACADEMIC_YEAR,
        isActive: true,
      },
    }),
    prisma.feeStructure.create({
      data: {
        schoolId: school.id,
        branchId: null,
        name: "Kitob to'lovi",
        description: 'Yillik oquv materiallari',
        amount: 150000,
        currency: 'UZS',
        frequency: 'one_time',
        academicYear: ACADEMIC_YEAR,
        isActive: true,
      },
    }),
  ]);
  console.log(`  ✓ Fee structures: ${feeStructures.length}`);

  // ─── 13. Payments ──────────────────────────────────────────────────────
  const paymentStatuses: PaymentStatus[] = ['pending', 'paid', 'paid', 'paid', 'overdue', 'failed'];
  const paymentProviders: PaymentProvider[] = ['cash', 'payme', 'click'];
  const paymentData: any[] = [];
  for (let i = 0; i < 120; i++) {
    const student = sample(allStudents);
    const fee = sample(feeStructures);
    const status = sample(paymentStatuses);
    paymentData.push({
      schoolId: school.id,
      branchId: student.branchId!,
      studentId: student.id,
      amount: fee.amount,
      currency: 'UZS',
      status,
      provider: sample(paymentProviders),
      description: fee.name,
      dueDate: randomDate(30, 30),
      paidAt: status === 'paid' ? randomDate(30, 0) : null,
      createdById: accountant1.id,
    });
  }
  for (let i = 0; i < paymentData.length; i += chunkSize) {
    await prisma.payment.createMany({ data: paymentData.slice(i, i + chunkSize) });
  }
  console.log(`  ✓ Payments: ${paymentData.length} records`);

  // ─── 14. Discipline Incidents ──────────────────────────────────────────
  const disciplineTypes: DisciplineType[] = ['behavior', 'absence', 'academic', 'dress_code', 'other'];
  const disciplineSeverities: DisciplineSeverity[] = ['low', 'medium', 'high'];
  const disciplineActions: DisciplineAction[] = ['warning', 'detention', 'parent_call', 'parent_meeting', 'suspension', 'other'];
  const disciplineData: any[] = [];
  for (let i = 0; i < 12; i++) {
    const student = sample(allStudents);
    const reporter = sample(teachers);
    disciplineData.push({
      schoolId: school.id,
      branchId: student.branchId!,
      studentId: student.id,
      reportedById: reporter.id,
      type: sample(disciplineTypes),
      severity: sample(disciplineSeverities),
      action: sample(disciplineActions),
      description: 'Namoyish uchun intizomiy voqea',
      date: randomDate(60, 0),
      resolved: Math.random() > 0.5,
    });
  }
  await prisma.disciplineIncident.createMany({ data: disciplineData });
  console.log(`  ✓ Discipline incidents: ${disciplineData.length}`);

  // ─── 15. Leave Requests + Approvals ────────────────────────────────────
  const leaveStatuses: LeaveStatus[] = ['pending', 'approved', 'approved', 'rejected', 'cancelled'];
  for (let i = 0; i < 8; i++) {
    const requester = sample([...teachers, vicePrincipal]);
    const start = randomDate(30, 30);
    const end = new Date(start);
    end.setDate(end.getDate() + randInt(1, 5));
    const lr = await prisma.leaveRequest.create({
      data: {
        schoolId: school.id,
        branchId: requester.branchId!,
        requesterId: requester.id,
        reason: 'Shaxsiy sabablar',
        startDate: start,
        endDate: end,
        status: sample(leaveStatuses),
        createdById: director.id,
      },
    });
    if (lr.status === 'approved' || lr.status === 'rejected') {
      await prisma.leaveApproval.create({
        data: {
          leaveRequestId: lr.id,
          approverId: director.id,
          status: lr.status,
          comment: "Ko'rib chiqildi",
          decidedAt: new Date(),
        },
      });
    }
  }
  console.log('  ✓ Leave requests: 8');

  // ─── 16. Announcements ─────────────────────────────────────────────────
  await prisma.announcement.create({
    data: {
      schoolId: school.id,
      branchId: null,
      createdById: director.id,
      title: "Yangi o'quv yili boshlandi",
      body: "2025-2026 o'quv yili boshlandi. Barcha o'quvchilarga omad tilaymiz!",
      priority: 'normal',
      status: 'active',
      targetRoles: ['student', 'parent', 'teacher'] as UserRole[],
    },
  });
  await prisma.announcement.create({
    data: {
      schoolId: school.id,
      branchId: null,
      createdById: director.id,
      title: 'Maktab musobaqasi',
      body: "Matematika musobaqasi 15-may kuni bo'lib o'tadi.",
      priority: 'urgent',
      status: 'active',
      targetRoles: ['student', 'teacher'] as UserRole[],
    },
  });
  await prisma.announcement.create({
    data: {
      schoolId: school.id,
      branchId: branchMain.id,
      createdById: director.id,
      title: "Filial yig'ilishi",
      body: "Bosh filial xodimlari yig'ilishi juma kuni soat 16:00 da.",
      priority: 'normal',
      status: 'active',
      targetRoles: ['teacher', 'branch_admin'] as UserRole[],
    },
  });
  await prisma.announcement.create({
    data: {
      schoolId: school.id,
      branchId: null,
      createdById: vicePrincipal.id,
      title: "Ota-onalar yig'ilishi",
      body: "Ota-onalar umumiy yig'ilishi 20-may kuni.",
      priority: 'normal',
      status: 'scheduled',
      scheduledAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      targetRoles: ['parent'] as UserRole[],
    },
  });
  console.log('  ✓ Announcements: 4');

  // ─── 17. Library Books ─────────────────────────────────────────────────
  const bookTitles = [
    "O'tkan kunlar", 'Sariq devni minib', 'Cholpon', "Ulug'bek xazinasi",
    'Alkimyogar', "Qo'rqma", 'Ufq', 'Kecha va kunduz', 'Shum bola',
    'Yulduzli tunlar', 'Sarob', "Qorako'z", 'Dunyoning ishlari',
    'Ikki eshik orasi', "Navoiy hayoti", 'Boburnoma', 'Zarbdor',
    'Toshkentlik mehmon', 'Bolalik', 'Naylondagi qiz', 'Alvido bolalik',
    'Kichkina odamlar', 'Uch ota', 'Sinchalak', 'Gulyorim',
    "Qorako'zning o'limi", 'Devona', 'Otamdan qolgan dalalar',
    "Tog'lar qaynaganda", 'Kechagi orzu', "Yomg'ir", 'Suv oliy hayot manbaidir',
    'Fizika asoslari', "Matematikadan masalalar to'plami", 'Kimyo darsligi',
    "Biologiya lug'ati", 'Ingliz tili gramatikasi', 'Rus tili darsligi',
    "Ona tili qoidalari", 'Jahon tarixi', "O'zbekiston tarixi",
    'Geografiya atlas', 'Adabiyot tarixi', 'Informatika asoslari',
    'Musiqa nazariyasi', 'Jismoniy tarbiya', "Tasviriy san'at",
    'Astronomiya', 'Ekologiya', 'Psixologiya',
  ];
  const books = await prisma.$transaction(
    bookTitles.map((title) =>
      prisma.libraryBook.create({
        data: {
          schoolId: school.id,
          title,
          author: `${sample(LAST_NAMES)} ${sample(FIRST_NAMES_MALE)}`,
          copiesTotal: randInt(3, 10),
          copiesAvailable: randInt(1, 5),
        },
      }),
    ),
  );
  console.log(`  ✓ Library books: ${books.length}`);

  // ─── 18. Library Loans ─────────────────────────────────────────────────
  const loanData: any[] = [];
  for (let i = 0; i < 20; i++) {
    const book = sample(books);
    const student = sample(allStudents);
    const loanDate = randomDate(30, 0);
    const dueDate = new Date(loanDate);
    dueDate.setDate(dueDate.getDate() + 14);
    loanData.push({
      schoolId: school.id,
      bookId: book.id,
      studentId: student.id,
      loanDate,
      dueDate,
      returnDate: Math.random() > 0.5 ? randomDate(15, 0) : null,
    });
  }
  await prisma.libraryLoan.createMany({ data: loanData });
  console.log(`  ✓ Library loans: ${loanData.length}`);

  // ─── 19. Exams + Questions + Options + Sessions + Answers ──────────────
  const examClasses = sampleSize(classes, 3);
  for (let eIdx = 0; eIdx < 3; eIdx++) {
    const cls = examClasses[eIdx];
    const clsSubjects = subjectRecords.filter((s) => s.classId === cls.id);
    const subject = sample(clsSubjects);

    const exam = await prisma.exam.create({
      data: {
        schoolId: school.id,
        branchId: cls.branchId,
        classId: cls.id,
        subjectId: subject.id,
        title: `${subject.name} - ${eIdx + 1}-chorak imtihoni`,
        frequency: 'quarterly' as ExamFrequency,
        maxScore: 100,
        scheduledAt: randomDate(30, 0),
        duration: 45,
        isPublished: true,
      },
    });

    // Questions
    const questions: Array<{ id: string; correctOptionId: string }> = [];
    for (let qIdx = 0; qIdx < 5; qIdx++) {
      const question = await prisma.examQuestion.create({
        data: {
          examId: exam.id,
          type: 'multiple_choice' as QuestionType,
          text: `Savol ${qIdx + 1}: Quyidagilardan to'g'risini tanlang.`,
          points: 20,
          order: qIdx,
        },
      });

      const options: any[] = [];
      for (let oIdx = 0; oIdx < 4; oIdx++) {
        const opt = await prisma.examOption.create({
          data: {
            questionId: question.id,
            text: `Javob ${String.fromCharCode(65 + oIdx)}`,
            isCorrect: oIdx === 0,
            order: oIdx,
          },
        });
        options.push(opt);
      }
      questions.push({ id: question.id, correctOptionId: options[0].id });
    }

    // Sessions for some students
    const clsStudentIds = classStudentData
      .filter((cs) => cs.classId === cls.id)
      .map((cs) => cs.studentId);
    const examStudentIds = sampleSize(clsStudentIds, Math.min(clsStudentIds.length, 8));

    for (const studentId of examStudentIds) {
      const score = randInt(50, 100);
      const session = await prisma.examSession.create({
        data: {
          examId: exam.id,
          studentId,
          schoolId: school.id,
          status: 'graded' as SessionStatus,
          score,
          percentage: score,
        },
      });

      // Answers
      for (const q of questions) {
        const isCorrect = Math.random() > 0.3;
        await prisma.studentAnswer.create({
          data: {
            sessionId: session.id,
            questionId: q.id,
            selectedOptionId: isCorrect ? q.correctOptionId : null,
            isCorrect,
            pointsEarned: isCorrect ? 20 : 0,
          },
        });
      }
    }
  }
  console.log('  ✓ Exams: 3 with questions, sessions & answers');

  // ─── 20. KPI Metrics (bonus) ───────────────────────────────────────────
  await prisma.kpiMetric.createMany({
    data: [
      { schoolId: school.id, name: 'Oquvchilar soni', category: 'STUDENT', targetValue: 200, unit: 'count', period: 'MONTHLY' },
      { schoolId: school.id, name: 'Davomat', category: 'STUDENT', targetValue: 95, unit: '%', period: 'MONTHLY' },
      { schoolId: school.id, name: 'Ortacha ball', category: 'ACADEMIC', targetValue: 80, unit: 'score', period: 'MONTHLY' },
    ],
  });
  console.log('  ✓ KPI metrics: 3');

  // ─── Credentials Summary ───────────────────────────────────────────────
  console.log('\n✅ Demo seed complete!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  🏫 School:        Xedu Maktabi (xedu-demo)');
  console.log('  🏢 Branches:      Bosh filial, Yangi filial, Shahar filiali');
  console.log('  👨‍🎓 Students:      200  (student001@xedu-demo.uz … student200@xedu-demo.uz)');
  console.log('  👨‍👩‍👧 Parents:       150  (parent001@xedu-demo.uz … parent150@xedu-demo.uz)');
  console.log('  👩‍🏫 Teachers:      15   (teacher01@xedu-demo.uz … teacher15@xedu-demo.uz)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Director        : director@xedu-demo.uz      / Director123!');
  console.log('  Vice Principal  : vice@xedu-demo.uz          / Vice123!');
  console.log('  Branch Admin 1  : admin1@xedu-demo.uz        / Admin123!');
  console.log('  Branch Admin 2  : admin2@xedu-demo.uz        / Admin123!');
  console.log('  Accountant 1    : accountant1@xedu-demo.uz   / Accountant123!');
  console.log('  Accountant 2    : accountant2@xedu-demo.uz   / Accountant123!');
  console.log('  Librarian       : librarian@xedu-demo.uz     / Librarian123!');
  console.log('  Student         : student001@xedu-demo.uz    / Student123!');
  console.log('  Parent          : parent001@xedu-demo.uz     / Parent123!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
