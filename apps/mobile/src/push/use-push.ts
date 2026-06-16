import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { registerForPush } from './push';

/**
 * Autentifikatsiyadan keyin push tokenni ro'yxatdan o'tkazadi va
 * kelgan/bosilgan bildirishnomalarда badge'ni yangilaydi.
 */
export function usePushRegistration(): void {
  const qc = useQueryClient();
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) return;

    registerForPush();

    const received = Notifications.addNotificationReceivedListener(() => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    });
    const response = Notifications.addNotificationResponseReceivedListener(() => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      router.push('/notifications');
    });

    return () => {
      received.remove();
      response.remove();
    };
  }, [isAuthenticated, qc, router]);
}
