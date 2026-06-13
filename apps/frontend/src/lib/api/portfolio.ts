import { apiClient } from './client';

export type PortfolioCategory =
  | 'sport' | 'language_certificate' | 'olympiad' | 'academic' | 'arts' | 'other';

export type PortfolioLevel =
  | 'school' | 'district' | 'region' | 'republic' | 'international';

export interface PortfolioItem {
  id: string;
  studentId: string;
  category: PortfolioCategory;
  title: string;
  level?: PortfolioLevel | null;
  result?: string | null;
  issuer?: string | null;
  achievedAt: string;
  expiresAt?: string | null;
  fileUrl?: string | null;
  description?: string | null;
  coinReward: number;
  verified: boolean;
  verifiedAt?: string | null;
  verifiedBy?: { id: string; firstName: string; lastName: string } | null;
  createdBy?: { id: string; firstName: string; lastName: string } | null;
  createdAt: string;
}

export interface TeacherPointsSummary {
  teacherId: string;
  total: number;
  thisMonth: number;
  count: number;
  byLevel: Record<string, number>;
  recent: any[];
}

export interface CreatePortfolioPayload {
  studentId: string;
  subjectId?: string;
  category: PortfolioCategory;
  title: string;
  level?: PortfolioLevel;
  result?: string;
  issuer?: string;
  achievedAt: string;
  expiresAt?: string;
  fileUrl?: string;
  description?: string;
  coinReward?: number;
}

export type UpdatePortfolioPayload = Partial<Omit<CreatePortfolioPayload, 'studentId'>>;

export const portfolioApi = {
  list: async (studentId: string): Promise<PortfolioItem[]> => {
    const { data } = await apiClient.get('/portfolio', { params: { studentId } });
    return data;
  },

  create: async (payload: CreatePortfolioPayload): Promise<PortfolioItem> => {
    const { data } = await apiClient.post('/portfolio', payload);
    return data;
  },

  update: async (id: string, payload: UpdatePortfolioPayload): Promise<PortfolioItem> => {
    const { data } = await apiClient.patch(`/portfolio/${id}`, payload);
    return data;
  },

  verify: async (id: string): Promise<PortfolioItem & { coinAwarded: number }> => {
    const { data } = await apiClient.post(`/portfolio/${id}/verify`);
    return data;
  },

  remove: async (id: string): Promise<{ id: string; deleted: boolean }> => {
    const { data } = await apiClient.delete(`/portfolio/${id}`);
    return data;
  },

  teacherPoints: async (teacherId?: string): Promise<TeacherPointsSummary> => {
    const { data } = await apiClient.get('/portfolio/teacher-points/me', {
      params: teacherId ? { teacherId } : undefined,
    });
    return data;
  },

  /** Upload a certificate/diploma file (PDF/image, max 10MB). Returns its URL. */
  uploadFile: async (file: File): Promise<string> => {
    const form = new FormData();
    form.append('file', file);
    const { data } = await apiClient.post('/upload/document', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.url as string;
  },
};
