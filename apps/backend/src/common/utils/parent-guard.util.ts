import { ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { JwtPayload, UserRole } from '@eduplatform/types';

/**
 * Validates that a parent user is actually the parent of the specified child.
 * Throws ForbiddenException if not.
 *
 * For non-parent roles, this is a no-op (returns immediately).
 * For students, validates they are accessing their own data.
 */
export async function assertParentOfChild(
  prisma: PrismaService,
  currentUser: JwtPayload,
  childId: string,
): Promise<void> {
  // Students may only access their own data
  if (currentUser.role === UserRole.STUDENT) {
    if (currentUser.sub !== childId) {
      throw new ForbiddenException('Siz faqat o‘z ma‘lumotlaringizni ko‘rishingiz mumkin');
    }
    return;
  }

  // Parents may only access their own children's data
  if (currentUser.role === UserRole.PARENT) {
    const link = await prisma.parentStudent.findFirst({
      where: { parentId: currentUser.sub, studentId: childId },
      select: { id: true },
    });
    if (!link) {
      throw new ForbiddenException('Siz bu o‘quvchining ma‘lumotlarini ko‘rish huquqiga ega emassiz');
    }
    return;
  }

  // All other roles (teachers, admins, etc.) are handled by existing RBAC
}
