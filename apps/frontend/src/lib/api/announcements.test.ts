import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./client', () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

import { apiClient } from './client';
import { announcementsApi } from './announcements';

describe('announcementsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockResponse = { data: {} };

  it('findAll calls /announcements without double /v1', async () => {
    (apiClient.get as any).mockResolvedValue(mockResponse);
    await announcementsApi.findAll({ page: 1, limit: 20, status: 'active' });
    expect(apiClient.get).toHaveBeenCalledWith('/announcements', {
      params: { page: 1, limit: 20, status: 'active' },
    });
    expect(apiClient.get).not.toHaveBeenCalledWith(expect.stringContaining('/v1/announcements'), expect.anything());
  });

  it('findMy calls /announcements/my without double /v1', async () => {
    (apiClient.get as any).mockResolvedValue(mockResponse);
    await announcementsApi.findMy({ page: 1, limit: 20, isRead: false });
    expect(apiClient.get).toHaveBeenCalledWith('/announcements/my', {
      params: { page: 1, limit: 20, isRead: false },
    });
  });

  it('getOne calls /announcements/:id', async () => {
    (apiClient.get as any).mockResolvedValue(mockResponse);
    await announcementsApi.getOne('ann-123');
    expect(apiClient.get).toHaveBeenCalledWith('/announcements/ann-123');
  });

  it('create calls POST /announcements with payload', async () => {
    (apiClient.post as any).mockResolvedValue(mockResponse);
    const payload = { title: 'Test', body: 'Body', priority: 'normal' as const, targetRoles: ['teacher'] };
    await announcementsApi.create(payload);
    expect(apiClient.post).toHaveBeenCalledWith('/announcements', payload);
  });

  it('update calls PATCH /announcements/:id', async () => {
    (apiClient.patch as any).mockResolvedValue(mockResponse);
    await announcementsApi.update('ann-123', { title: 'Updated' });
    expect(apiClient.patch).toHaveBeenCalledWith('/announcements/ann-123', { title: 'Updated' });
  });

  it('cancel calls DELETE /announcements/:id', async () => {
    (apiClient.delete as any).mockResolvedValue(mockResponse);
    await announcementsApi.cancel('ann-123');
    expect(apiClient.delete).toHaveBeenCalledWith('/announcements/ann-123');
  });

  it('markAsRead calls POST /announcements/:id/read', async () => {
    (apiClient.post as any).mockResolvedValue(mockResponse);
    await announcementsApi.markAsRead('ann-123');
    expect(apiClient.post).toHaveBeenCalledWith('/announcements/ann-123/read');
  });

  it('acknowledge calls POST /announcements/:id/acknowledge', async () => {
    (apiClient.post as any).mockResolvedValue(mockResponse);
    await announcementsApi.acknowledge('ann-123');
    expect(apiClient.post).toHaveBeenCalledWith('/announcements/ann-123/acknowledge');
  });

  it('no method ever calls a path containing /v1/announcements (regression guard)', async () => {
    (apiClient.post as any).mockResolvedValue(mockResponse);
    (apiClient.get as any).mockResolvedValue(mockResponse);
    (apiClient.patch as any).mockResolvedValue(mockResponse);
    (apiClient.delete as any).mockResolvedValue(mockResponse);

    await announcementsApi.findAll();
    await announcementsApi.findMy();
    await announcementsApi.getOne('x');
    await announcementsApi.create({ title: 't', body: 'b' });
    await announcementsApi.update('x', {});
    await announcementsApi.cancel('x');
    await announcementsApi.markAsRead('x');
    await announcementsApi.acknowledge('x');

    const allCalls = [
      ...(apiClient.post as any).mock.calls,
      ...(apiClient.get as any).mock.calls,
      ...(apiClient.patch as any).mock.calls,
      ...(apiClient.delete as any).mock.calls,
    ];
    for (const [path] of allCalls) {
      if (typeof path === 'string') {
        expect(path).not.toContain('/v1/announcements');
      }
    }
  });
});
