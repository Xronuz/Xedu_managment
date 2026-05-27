import { apiClient } from './client';

export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';

export interface Invitation {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  role: string;
  schoolId: string;
  branchId?: string | null;
  branchName?: string | null;
  invitedById?: string;
  invitedByName?: string;
  token?: string;
  status: InvitationStatus;
  expiresAt: string;
  createdAt: string;
  acceptedAt?: string | null;
  revokedAt?: string | null;
}

export interface CreateInvitationPayload {
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  branchId?: string;
}

export interface AcceptInvitationPayload {
  token: string;
  password: string;
}

export interface ValidateTokenResult {
  valid: boolean;
  invitation?: {
    email: string;
    role: string;
    schoolName: string;
    branchName?: string;
    invitedByName?: string;
    expiresAt: string;
  };
  reason?: 'invalid' | 'expired' | 'accepted' | 'revoked';
}

export const invitationsApi = {
  create: async (payload: CreateInvitationPayload): Promise<Invitation> => {
    const { data } = await apiClient.post<Invitation>('/invitations', payload);
    return data;
  },

  getAll: async (params?: {
    page?: number;
    limit?: number;
    status?: InvitationStatus;
    role?: string;
    search?: string;
  }): Promise<{ data: Invitation[]; meta: { total: number; page: number; limit: number; totalPages: number } }> => {
    const { data } = await apiClient.get('/invitations', { params });
    return data;
  },

  getOne: async (id: string): Promise<Invitation> => {
    const { data } = await apiClient.get<Invitation>(`/invitations/${id}`);
    return data;
  },

  resend: async (id: string): Promise<Invitation> => {
    const { data } = await apiClient.post<Invitation>(`/invitations/${id}/resend`);
    return data;
  },

  revoke: async (id: string): Promise<void> => {
    await apiClient.delete(`/invitations/${id}`);
  },

  validateToken: async (token: string): Promise<ValidateTokenResult> => {
    const { data } = await apiClient.get<ValidateTokenResult>('/invitations/validate', { params: { token } });
    return data;
  },

  accept: async (payload: AcceptInvitationPayload): Promise<{ userId: string }> => {
    const { data } = await apiClient.post<{ userId: string }>('/invitations/accept', payload);
    return data;
  },
};
