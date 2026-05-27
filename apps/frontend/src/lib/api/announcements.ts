import { apiClient } from './client';

export type AnnouncementPriority = 'low' | 'normal' | 'urgent';
export type AnnouncementStatus = 'draft' | 'scheduled' | 'active' | 'expired' | 'cancelled';

export interface Announcement {
  id: string;
  schoolId: string;
  branchId: string | null;
  createdById: string;
  title: string;
  body: string;
  priority: AnnouncementPriority;
  status: AnnouncementStatus;
  targetRoles: string[];
  targetClassId: string | null;
  targetBranchIds: string[];
  scheduledAt: string | null;
  expiresAt: string | null;
  requireAck: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: { id: string; firstName: string; lastName: string };
  branch?: { id: string; name: string };
  receiptCount?: number;
}

export interface AnnouncementReceipt {
  id: string;
  isRead: boolean;
  readAt: string | null;
  acknowledgedAt: string | null;
}

export interface MyAnnouncementItem {
  receipt: AnnouncementReceipt;
  announcement: Announcement;
}

export interface CreateAnnouncementPayload {
  title: string;
  body: string;
  priority?: AnnouncementPriority;
  status?: AnnouncementStatus;
  targetRoles?: string[];
  targetClassId?: string;
  targetBranchIds?: string[];
  scheduledAt?: string;
  expiresAt?: string;
  requireAck?: boolean;
}

export interface UpdateAnnouncementPayload {
  title?: string;
  body?: string;
  priority?: AnnouncementPriority;
  status?: AnnouncementStatus;
  targetRoles?: string[];
  targetClassId?: string;
  targetBranchIds?: string[];
  scheduledAt?: string;
  expiresAt?: string;
  requireAck?: boolean;
}

interface PaginatedMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AnnouncementListResponse {
  data: Announcement[];
  meta: PaginatedMeta;
}

export interface MyAnnouncementListResponse {
  data: MyAnnouncementItem[];
  meta: PaginatedMeta;
}

export const announcementsApi = {
  /** Admin view: list all announcements for the school */
  findAll: async (params?: {
    page?: number;
    limit?: number;
    status?: AnnouncementStatus;
  }): Promise<AnnouncementListResponse> => {
    const { data } = await apiClient.get('/announcements', { params });
    return data;
  },

  /** Recipient view: list announcements targeted at current user */
  findMy: async (params?: {
    page?: number;
    limit?: number;
    isRead?: boolean;
  }): Promise<MyAnnouncementListResponse> => {
    const { data } = await apiClient.get('/announcements/my', { params });
    return data;
  },

  /** Get a single announcement by ID */
  getOne: async (id: string): Promise<Announcement & { receipt?: AnnouncementReceipt | null }> => {
    const { data } = await apiClient.get(`/announcements/${id}`);
    return data;
  },

  /** Create a new announcement (director/VP/super_admin only) */
  create: async (payload: CreateAnnouncementPayload): Promise<{ announcement: Announcement; audienceSize: number }> => {
    const { data } = await apiClient.post('/announcements', payload);
    return data;
  },

  /** Update an announcement (only draft status allowed) */
  update: async (id: string, payload: UpdateAnnouncementPayload): Promise<Announcement> => {
    const { data } = await apiClient.patch(`/announcements/${id}`, payload);
    return data;
  },

  /** Cancel (soft-delete) an announcement */
  cancel: async (id: string): Promise<{ message: string }> => {
    const { data } = await apiClient.delete(`/announcements/${id}`);
    return data;
  },

  /** Mark an announcement as read */
  markAsRead: async (id: string): Promise<{ message: string }> => {
    const { data } = await apiClient.post(`/announcements/${id}/read`);
    return data;
  },

  /** Acknowledge an announcement (if requireAck is true) */
  acknowledge: async (id: string): Promise<{ message: string }> => {
    const { data } = await apiClient.post(`/announcements/${id}/acknowledge`);
    return data;
  },
};
