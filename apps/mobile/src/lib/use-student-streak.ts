import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { studentApi } from '@/api/student';
import { streakFromAttendance } from './gamify';

interface AttRecord { date: string; status: string }

/**
 * Joriy o'quvchining HAQIQIY streak'ini hisoblaydi.
 *
 * `streakFromAttendance` backend mantiqini (davomat tarixi) ishga tushiradi.
 * Bu — ilovadagi eng muhim odat-shakllantirish signali (Duolingo butun
 * imperiyasi shu songa qurilgan). Eskirog'i hardkod `streak = 0` edi; endi
 * ilova yolg'on gapirmaydi.
 *
 * Faqat `student` roli uchun ishlaydi; boshqa rollar uchun 0 qaytaradi.
 */
export function useStudentStreak(): number {
  const user = useAuthStore((s) => s.user);
  const isStudent = (user?.role ?? '').toLowerCase().trim() === 'student';
  const studentId = user?.id;

  const q = useQuery<AttRecord[]>({
    queryKey: ['student', 'attendance', 'streak', studentId],
    queryFn: () => studentApi.attendance(studentId ?? ''),
    enabled: isStudent && !!studentId,
    staleTime: 60_000,
    retry: false,
  });

  if (!isStudent) return 0;
  const raw: any = q.data;
  const history: AttRecord[] = Array.isArray(raw) ? raw : raw?.data ?? raw?.items ?? [];
  return streakFromAttendance(history);
}
