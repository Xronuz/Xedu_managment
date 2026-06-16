import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { connectSocket, disconnectSocket } from './socket';

/**
 * Autentifikatsiya qilingan sessiyada socket'ga ulanadi va real-time
 * bildirishnoma eventlarida React Query keshini yangilaydi (badge jonli).
 * Ilova fondan qaytsa qayta ulanadi. Socket ulanmasa (proxy WS yo'q) —
 * 60s polling fallback ishlayveradi, xato yutiladi.
 */
export function useRealtime(): void {
  const qc = useQueryClient();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) return;

    const socket = connectSocket();
    const refreshNotifications = () => qc.invalidateQueries({ queryKey: ['notifications'] });

    socket.on('notification:new', refreshNotifications);
    socket.on('notification:personal', refreshNotifications);
    socket.on('connect_error', () => {}); // jim — polling fallback bor

    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        if (!socket.connected) socket.connect();
        refreshNotifications();
      }
    });

    return () => {
      appStateSub.remove();
      disconnectSocket();
    };
  }, [isAuthenticated, qc]);
}
