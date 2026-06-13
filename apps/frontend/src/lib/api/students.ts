import { apiClient } from './client';

export interface CreateStudentPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  classId?: string;
  branchId?: string;
}

export interface UpdateStudentPayload {
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatarUrl?: string;
  // Profile
  dateOfBirth?: string | null;
  gender?: 'male' | 'female';
  address?: string;
  studentIdNumber?: string;
  enrollmentDate?: string | null;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  bloodType?: string;
  medicalNotes?: string;
  teacherNotes?: string;
}

export interface StudentProfile {
  student: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string | null;
    avatarUrl?: string | null;
    isActive: boolean;
    coins?: number;
    dateOfBirth?: string | null;
    gender?: 'male' | 'female' | null;
    address?: string | null;
    studentIdNumber?: string | null;
    enrollmentDate?: string | null;
    emergencyContactName?: string | null;
    emergencyContactPhone?: string | null;
    bloodType?: string | null;
    medicalNotes?: string | null;
    teacherNotes?: string | null;
    branch?: { id: string; name: string } | null;
    school?: { id: string; name: string } | null;
    studentClasses?: { class: { id: string; name: string; gradeLevel?: number } }[];
    childParents?: { parent: { id: string; firstName: string; lastName: string; email: string; phone?: string | null } }[];
  };
  academic: {
    gpa: number;
    gpaPct: number;
    gradeCount: number;
    recentGrades: any[];
  };
  attendance: {
    present: number; absent: number; late: number; excused: number;
    total: number; presentRate: number; recent: any[];
  };
  discipline: { total: number; unresolved: number; incidents: any[] };
  homework: { submitted: number; graded: number; avgScore: number | null };
  gamification: { coins: number; recentTransactions: any[] };
  clubs: { id: string; name: string; joinedAt: string }[];
  portfolio: {
    total: number;
    verified: number;
    byCategory: Record<string, number>;
    items: any[];
  };
}

export interface LinkParentPayload {
  parentId?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  phone?: string;
}

export const studentsApi = {
  getAll: async (params?: { page?: number; limit?: number; search?: string }) => {
    const { data } = await apiClient.get('/students', { params });
    return data;
  },

  getOne: async (id: string) => {
    const { data } = await apiClient.get(`/students/${id}`);
    return data;
  },

  getProfile: async (id: string): Promise<StudentProfile> => {
    const { data } = await apiClient.get(`/students/${id}/profile`);
    return data;
  },

  create: async (payload: CreateStudentPayload) => {
    const { data } = await apiClient.post('/students', payload);
    return data;
  },

  update: async (id: string, payload: UpdateStudentPayload) => {
    const { data } = await apiClient.patch(`/students/${id}`, payload);
    return data;
  },

  linkParent: async (studentId: string, payload: LinkParentPayload) => {
    const { data } = await apiClient.post(`/students/${studentId}/parents/link`, payload);
    return data;
  },
};
