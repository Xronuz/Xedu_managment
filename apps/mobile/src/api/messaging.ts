import { apiClient } from './client';

export interface ChatUser {
  id: string;
  firstName?: string;
  lastName?: string;
  role?: string;
}
export interface Message {
  id: string;
  content: string;
  senderId: string;
  receiverId: string;
  createdAt: string;
  isRead?: boolean;
}
export interface Conversation {
  user: ChatUser;
  lastMessage?: Message;
  unreadCount: number;
}

export const messagingApi = {
  conversations: () => apiClient.get<Conversation[]>('/messaging/conversations').then((r) => r.data),

  messages: (userId: string, page = 1) =>
    apiClient.get<{ data: Message[] }>(`/messaging/${userId}`, { params: { page, limit: 30 } }).then((r) => r.data),

  send: (receiverId: string, content: string) =>
    apiClient.post<Message>('/messaging', { receiverId, content }).then((r) => r.data),

  markRead: (userId: string) => apiClient.put(`/messaging/${userId}/read`).then((r) => r.data),

  /** Teacher/admin uchun — yangi suhbat boshlash uchun kontakt qidirish */
  contacts: (search?: string, role?: string) =>
    apiClient.get('/users', { params: { search, role, limit: 30 } }).then((r) => r.data),
};
