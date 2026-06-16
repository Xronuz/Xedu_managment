import { apiClient } from './client';

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  category: string;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationsResponse {
  data: AppNotification[];
  meta: { total: number; page: number; limit: number; unreadCount: number };
}

export const notificationsApi = {
  list: (page = 1) =>
    apiClient
      .get<NotificationsResponse>('/notifications', { params: { page, limit: 30 } })
      .then((r) => r.data),

  markRead: (id: string) => apiClient.put(`/notifications/${id}/read`).then((r) => r.data),

  markAllRead: () => apiClient.put('/notifications/read-all').then((r) => r.data),

  registerDeviceToken: (token: string, platform: string) =>
    apiClient.post('/notifications/device-token', { token, platform }).then((r) => r.data),

  unregisterDeviceToken: (token: string) =>
    apiClient.delete('/notifications/device-token', { data: { token } }).then((r) => r.data),
};
