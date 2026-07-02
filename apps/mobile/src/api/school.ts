import { apiClient } from './client';

export interface AnnouncementItem {
  id: string;
  isRead?: boolean;
  announcement: {
    id: string;
    title: string;
    body: string;
    priority?: string;
    createdAt: string;
    createdBy?: { firstName?: string; lastName?: string } | null;
  };
}

export const announcementsApi = {
  my: () => apiClient.get('/announcements/my', { params: { page: 1, limit: 50 } }).then((r) => r.data),
  markRead: (announcementId: string) => apiClient.post(`/announcements/${announcementId}/read`).then((r) => r.data),
  create: (dto: { title: string; body: string; priority?: string; status?: string }) =>
    apiClient.post('/announcements', dto).then((r) => r.data),
};

export interface ExamItem {
  id: string;
  title: string;
  scheduledAt?: string | null;
  maxScore?: number;
  duration?: number | null;
  subject?: { name?: string } | null;
  class?: { name?: string } | null;
}

export const examsApi = {
  upcoming: () => apiClient.get<ExamItem[]>('/exams/upcoming').then((r) => r.data),
};

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string | null;
  type?: string;
  startDate: string;
  endDate: string;
  color?: string | null;
}

export const calendarApi = {
  events: () => apiClient.get<CalendarEvent[]>('/academic-calendar').then((r) => r.data),
};

export interface ClubItem {
  id: string;
  name: string;
  description?: string | null;
  category?: string;
  schedule?: string | null;
  maxMembers?: number | null;
  _count?: { members?: number };
}

export const clubsApi = {
  list: () => apiClient.get<ClubItem[]>('/clubs').then((r) => r.data),
  myClubs: () => apiClient.get<ClubItem[]>('/clubs/my-clubs').then((r) => r.data),
  join: (clubId: string) => apiClient.post(`/clubs/${clubId}/join`).then((r) => r.data),
};

interface MeetingUser { id?: string; firstName?: string; lastName?: string }
export interface MeetingItem {
  id: string;
  scheduledAt: string;
  medium?: string;
  status: string;
  notes?: string | null;
  teacher?: MeetingUser | null;
  parent?: MeetingUser | null;
  student?: MeetingUser | null;
}

export const meetingsApi = {
  my: () => apiClient.get<MeetingItem[]>('/meetings/my').then((r) => r.data),
  create: (dto: { teacherId: string; parentId: string; studentId: string; scheduledAt: string; duration?: number; medium?: string; agenda?: string }) =>
    apiClient.post('/meetings', dto).then((r) => r.data),
};

export interface MenuDay {
  id: string;
  date: string;
  mealType: string;
  itemsJson: unknown;
  price?: number | null;
}

export const canteenApi = {
  today: () => apiClient.get<MenuDay[]>('/canteen/today').then((r) => r.data),
};

export interface SchoolConfig {
  bhm: number;
  academic_year: string;
  school_name: string;
  school_phone: string;
  school_address: string;
  pass_threshold: number;
  work_days: number;
}

export const settingsApi = {
  get: () => apiClient.get<SchoolConfig>('/system-config').then((r) => r.data),
  update: (dto: Partial<SchoolConfig>) => apiClient.patch('/system-config', dto).then((r) => r.data),
};

export interface AchievementItem {
  id: string;
  title: string;
  category?: string;
  level?: string | null;
  issuer?: string | null;
  description?: string | null;
  createdAt: string;
}

export const portfolioApi = {
  forStudent: (studentId: string) =>
    apiClient.get<AchievementItem[]>('/portfolio', { params: { studentId } }).then((r) => r.data),
};

export interface LibraryBook {
  id: string;
  title: string;
  author?: string | null;
  isbn?: string | null;
  category?: string | null;
  copiesTotal?: number;
  copiesAvailable?: number;
}

export const libraryApi = {
  books: (search?: string) =>
    apiClient.get<LibraryBook[]>('/library/books', { params: search ? { search } : {} }).then((r) => r.data),
};

export interface TransportRoute {
  id: string;
  name: string;
  stops?: string[];
  driverName?: string | null;
  driverPhone?: string | null;
  vehicleNumber?: string | null;
}

export const transportApi = {
  myRoute: () => apiClient.get<TransportRoute | null>('/transport/my-route').then((r) => r.data),
};

export interface Course {
  id: string;
  name: string;
  description?: string | null;
  teacher?: { firstName?: string; lastName?: string } | null;
}
export interface CourseEnrollment {
  id: string;
  status?: string;
  course: Course;
}

export const learningApi = {
  myCourses: () => apiClient.get<CourseEnrollment[]>('/learning-center/my-courses').then((r) => r.data),
  courses: () => apiClient.get<Course[]>('/learning-center/courses').then((r) => r.data),
  enroll: (courseId: string) => apiClient.post(`/learning-center/courses/${courseId}/enroll`).then((r) => r.data),
};

export interface LeaveRequest {
  id: string;
  reason: string;
  startDate: string;
  endDate: string;
  status: string;
}

export const leaveApi = {
  mine: () => apiClient.get<LeaveRequest[]>('/leave-requests').then((r) => r.data),
  create: (payload: { startDate: string; endDate: string; reason: string }) =>
    apiClient.post('/leave-requests', payload).then((r) => r.data),
};

export interface KpiPoint {
  id: string;
  title: string;
  category?: string;
  level?: string | null;
  points: number;
}
export interface TeacherKpi {
  total: number;
  thisMonth: number;
  points: KpiPoint[];
}

export const kpiApi = {
  myPoints: () => apiClient.get<TeacherKpi>('/portfolio/teacher-points/me').then((r) => r.data),
};

export interface AchievementBadge {
  id: string;
  name: string;
  icon?: string | null;
  description?: string | null;
  isUnlocked?: boolean;
  progress?: { current?: number; target?: number };
}

export const achievementsApi = {
  forStudent: (studentId: string) =>
    apiClient.get<AchievementBadge[]>('/engagement/achievements', { params: { studentId } }).then((r) => r.data),
};

export interface ApprovalItem {
  id: string;
  reason: string;
  startDate: string;
  endDate: string;
  status: string;
  requester?: { firstName?: string; lastName?: string; role?: string } | null;
}

export const approvalsApi = {
  pending: () => apiClient.get<ApprovalItem[]>('/leave-requests', { params: { status: 'pending' } }).then((r) => r.data),
  review: (id: string, action: 'approve' | 'reject') =>
    apiClient.put(`/leave-requests/${id}/review`, { action }).then((r) => r.data),
};

export interface FinanceReport {
  monthly?: { paid?: number };
  pending?: number;
  overdue?: number;
  debtors?: { id: string; amount: number; dueDate?: string | null; student?: { firstName?: string; lastName?: string } | null }[];
}

export const financeApi = {
  report: () => apiClient.get<FinanceReport>('/payments/report').then((r) => r.data),
};

export interface LibraryLoan {
  id: string;
  dueDate: string;
  returnedAt?: string | null;
  book?: { id?: string; title?: string } | null;
  student?: { id?: string; firstName?: string; lastName?: string } | null;
}

export const loansApi = {
  list: () => apiClient.get<LibraryLoan[]>('/library/loans', { params: { active: 'true' } }).then((r) => r.data),
  /** Kitob berish (issue). Backend: POST /library/loans. */
  issue: (dto: { bookId: string; studentId: string; dueDate?: string }) =>
    apiClient.post('/library/loans', dto).then((r) => r.data),
  /** Kitob qaytarish (return). Backend: PUT /library/loans/:id/return. */
  returnBook: (loanId: string) =>
    apiClient.put(`/library/loans/${loanId}/return`).then((r) => r.data),
};

export interface OpsAlert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message?: string;
}

export const alertsApi = {
  list: () => apiClient.get<OpsAlert[]>('/ops/alerts').then((r) => r.data),
  acknowledge: (id: string) => apiClient.post(`/ops/alerts/${id}/acknowledge`).then((r) => r.data),
};
