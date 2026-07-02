import { ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { JwtPayload, UserRole } from '@eduplatform/types';

/**
 * Validates that a teacher/class_teacher is assigned to teach the given subject
 * for the given class. Throws ForbiddenException if not.
 *
 * For non-teacher roles (director, vice_principal, branch_admin, super_admin),
 * this is a no-op (returns immediately).
 */
export async function assertTeacherOfSubject(
  prisma: PrismaService,
  currentUser: JwtPayload,
  classId: string,
  subjectId: string,
): Promise<void> {
  // Only enforce for teacher and class_teacher roles
  if (
    currentUser.role !== UserRole.TEACHER &&
    currentUser.role !== UserRole.CLASS_TEACHER
  ) {
    return;
  }

  const teachingAssignment = await prisma.subject.findFirst({
    where: {
      schoolId: currentUser.schoolId!,
      teacherId: currentUser.sub,
      classId,
      id: subjectId,
      ...(currentUser.branchId ? { branchId: currentUser.branchId } : {}),
    },
    select: { id: true },
  });

  if (!teachingAssignment) {
    throw new ForbiddenException(
      'Siz ushbu sinf va fan uchun dars berishga biriktirilmagansiz',
    );
  }
}

/**
 * Validates that a teacher/class_teacher is assigned to teach any subject
 * in the given class. Throws ForbiddenException if not.
 *
 * Useful for attendance marking where a teacher doesn't need to specify
 * a subject but must be assigned to the class.
 */
export async function assertTeacherOfClass(
  prisma: PrismaService,
  currentUser: JwtPayload,
  classId: string,
): Promise<void> {
  if (
    currentUser.role !== UserRole.TEACHER &&
    currentUser.role !== UserRole.CLASS_TEACHER
  ) {
    return;
  }

  // Class teachers are always assigned to their own class
  const isClassTeacher = currentUser.role === UserRole.CLASS_TEACHER;
  if (isClassTeacher) {
    const classAssignment = await prisma.class.findFirst({
      where: {
        id: classId,
        schoolId: currentUser.schoolId!,
        classTeacherId: currentUser.sub,
        ...(currentUser.branchId ? { branchId: currentUser.branchId } : {}),
      },
      select: { id: true },
    });
    if (classAssignment) return; // Class teacher assigned to this class — OK
  }

  // Regular teacher: must have a subject assignment for this class
  const hasSubject = await prisma.subject.findFirst({
    where: {
      schoolId: currentUser.schoolId!,
      teacherId: currentUser.sub,
      classId,
      ...(currentUser.branchId ? { branchId: currentUser.branchId } : {}),
    },
    select: { id: true },
  });

  if (!hasSubject) {
    throw new ForbiddenException(
      'Siz ushbu sinfga biriktirilmagansiz',
    );
  }
}
