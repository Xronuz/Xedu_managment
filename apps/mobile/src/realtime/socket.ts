import { io, type Socket } from 'socket.io-client';
import { SOCKET_URL } from '@/config/env';
import { tokenStore } from '@/api/token-store';

/**
 * Socket.io singleton. Backend gateway namespace '/' va `handshake.auth.token`
 * (Bearer) bilan autentifikatsiya qiladi. `auth` funksiya shaklida — har bir
 * (re)connect'da joriy access token o'qiladi (token rotatsiyasidan keyin ham).
 */
let socket: Socket | null = null;

export function connectSocket(): Socket {
  if (socket) return socket;
  socket = io(SOCKET_URL, {
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 2000,
    auth: (cb) => cb({ token: tokenStore.getAccess() ?? '' }),
  });
  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket(): void {
  socket?.removeAllListeners();
  socket?.disconnect();
  socket = null;
}
