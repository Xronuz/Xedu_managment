import { apiClient } from './client';

export interface AttendanceEntry {
  studentId: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  note?: string;
}

/** O'qituvchi (teacher) API. */
export const teacherApi = {
  scheduleToday: () => apiClient.get('/schedule/today').then((r) => r.data),

  myClasses: () => apiClient.get('/classes').then((r) => r.data),

  classStudents: (classId: string) =>
    apiClient.get(`/classes/${classId}/students`).then((r) => r.data),

  markAttendance: (payload: {
    classId: string;
    date: string;
    scheduleId?: string;
    entries: AttendanceEntry[];
  }) => apiClient.post('/attendance/mark', payload).then((r) => r.data),

  createGrade: (payload: {
    studentId: string;
    classId: string;
    subjectId: string;
    type: string;
    score: number;
    maxScore?: number;
    date: string;
    comment?: string;
  }) => apiClient.post('/grades', payload).then((r) => r.data),
};
