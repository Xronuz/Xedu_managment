import { describe, it, expect, vi, beforeEach } from 'vitest';
import { invitationsApi } from './invitations';

// Mock the apiClient so we can assert on the paths without network calls
vi.mock('./client', () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
  },
}));

import { apiClient } from './client';

describe('invitationsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockResponse = { data: {} };

  it('create calls /invitations without double /v1', async () => {
    (apiClient.post as any).mockResolvedValue(mockResponse);
    await invitationsApi.create({ email: 'a@b.com', role: 'teacher' });
    expect(apiClient.post).toHaveBeenCalledWith('/invitations', { email: 'a@b.com', role: 'teacher' });
    expect(apiClient.post).not.toHaveBeenCalledWith(expect.stringContaining('/v1/invitations'), expect.anything());
  });

  it('getAll calls /invitations without double /v1', async () => {
    (apiClient.get as any).mockResolvedValue(mockResponse);
    await invitationsApi.getAll();
    expect(apiClient.get).toHaveBeenCalledWith('/invitations', { params: undefined });
  });

  it('getOne calls /invitations/:id without double /v1', async () => {
    (apiClient.get as any).mockResolvedValue(mockResponse);
    await invitationsApi.getOne('id-123');
    expect(apiClient.get).toHaveBeenCalledWith('/invitations/id-123');
  });

  it('resend calls /invitations/:id/resend without double /v1', async () => {
    (apiClient.post as any).mockResolvedValue(mockResponse);
    await invitationsApi.resend('id-123');
    expect(apiClient.post).toHaveBeenCalledWith('/invitations/id-123/resend');
  });

  it('revoke calls /invitations/:id without double /v1', async () => {
    (apiClient.delete as any).mockResolvedValue(mockResponse);
    await invitationsApi.revoke('id-123');
    expect(apiClient.delete).toHaveBeenCalledWith('/invitations/id-123');
  });

  it('validateToken calls /invitations/validate without double /v1', async () => {
    (apiClient.get as any).mockResolvedValue(mockResponse);
    await invitationsApi.validateToken('token-abc');
    expect(apiClient.get).toHaveBeenCalledWith('/invitations/validate', { params: { token: 'token-abc' } });
  });

  it('accept calls /invitations/accept without double /v1', async () => {
    (apiClient.post as any).mockResolvedValue(mockResponse);
    await invitationsApi.accept({ token: 'token-abc', password: 'secret' });
    expect(apiClient.post).toHaveBeenCalledWith('/invitations/accept', { token: 'token-abc', password: 'secret' });
  });

  it('no method ever calls a path containing /v1/invitations (regression guard)', async () => {
    (apiClient.post as any).mockResolvedValue(mockResponse);
    (apiClient.get as any).mockResolvedValue(mockResponse);
    (apiClient.delete as any).mockResolvedValue(mockResponse);

    await invitationsApi.create({ email: 'a@b.com', role: 'teacher' });
    await invitationsApi.getAll();
    await invitationsApi.getOne('x');
    await invitationsApi.resend('x');
    await invitationsApi.revoke('x');
    await invitationsApi.validateToken('x');
    await invitationsApi.accept({ token: 'x', password: 'y' });

    const allCalls = [
      ...(apiClient.post as any).mock.calls,
      ...(apiClient.get as any).mock.calls,
      ...(apiClient.delete as any).mock.calls,
    ];
    for (const [path] of allCalls) {
      if (typeof path === 'string') {
        expect(path).not.toContain('/v1/invitations');
      }
    }
  });
});
