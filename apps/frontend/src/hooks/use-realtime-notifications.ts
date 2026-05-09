'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSocket } from './use-socket';
import { useAuthStore } from '@/store/auth.store';

/**
 * useRealtimeNotifications
 *
 * Connects to the root '/' namespace (NestJS EventsGateway) and:
 * 1. Invalidates TanStack Query caches when server emits relevant events
 * 2. Re-exports the socket for further use
 *
 * Mount this hook once in the authenticated layout.
 *
 * DESIGN PHILOSOPHY — "Calm Realtime":
 * - We ONLY invalidate caches. We never force-refetch or flash UI.
 * - TanStack Query's staleTime guards (often 60s) prevent refetch storms.
 * - No blinking badges, no chat-app dopamine. Subtle, institutional calm.
 */
export function useRealtimeNotifications() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  // Backend EventsGateway runs on the ROOT namespace '/'
  const { emit, on } = useSocket({
    namespace: '/',
    enabled: !!user,
  });

  // Throttle rapid-fire events from the same category to 1s
  const lastInvalidateRef = useRef<Record<string, number>>({});
  const throttledInvalidate = (keyPrefix: string) => {
    const now = Date.now();
    const last = lastInvalidateRef.current[keyPrefix] ?? 0;
    if (now - last < 1000) return;
    lastInvalidateRef.current[keyPrefix] = now;
    queryClient.invalidateQueries({ queryKey: [keyPrefix] });
  };

  useEffect(() => {
    // ── Core operational events ───────────────────────────────────────────

    const offNotif = on('notification:new', () => {
      throttledInvalidate('notifications');
    });

    const offNotifBroadcast = on('notification:broadcast', () => {
      throttledInvalidate('notifications');
    });

    const offNotifPersonal = on('notification:personal', () => {
      throttledInvalidate('notifications');
    });

    const offMsg = on('message:new', () => {
      throttledInvalidate('messages');
    });

    // ── Schedule & attendance ─────────────────────────────────────────────

    const offSchedule = on('schedule:updated', () => {
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
    });

    const offScheduleLive = on('schedule:live', () => {
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
    });

    const offAttendance = on('attendance:marked', () => {
      throttledInvalidate('attendance');
    });

    const offAttendanceUpdated = on('attendance:updated', () => {
      throttledInvalidate('attendance');
    });

    // ── Academic records ──────────────────────────────────────────────────

    const offGrade = on('grade:created', () => {
      throttledInvalidate('grades');
    });

    // ── Discipline ────────────────────────────────────────────────────────

    const offDisciplineCreated = on('discipline:created', () => {
      throttledInvalidate('discipline');
    });

    const offDisciplineResolved = on('discipline:resolved', () => {
      throttledInvalidate('discipline');
    });

    // ── Classes ───────────────────────────────────────────────────────────

    const offClassCreated = on('class:created', () => {
      throttledInvalidate('classes');
    });

    const offClassUpdated = on('class:updated', () => {
      throttledInvalidate('classes');
    });

    const offClassRemoved = on('class:removed', () => {
      throttledInvalidate('classes');
    });

    // ── Leave requests ────────────────────────────────────────────────────

    const offLeaveCreated = on('leave-request:created', () => {
      throttledInvalidate('leave-requests');
    });

    const offLeaveUpdated = on('leave-request:updated', () => {
      throttledInvalidate('leave-requests');
    });

    // ── Payments & finance ────────────────────────────────────────────────

    const offPayment = on('payment:received', () => {
      throttledInvalidate('payments');
      throttledInvalidate('finance');
    });

    const offShiftClosed = on('treasury:shift_closed', () => {
      throttledInvalidate('finance');
      throttledInvalidate('treasury');
    });

    // ── Exams ─────────────────────────────────────────────────────────────

    const offExamStarted = on('exam:session:started', () => {
      throttledInvalidate('exam');
    });

    const offExamSubmitted = on('exam:session:submitted', () => {
      throttledInvalidate('exam');
    });

    // ── CRM ───────────────────────────────────────────────────────────────

    const offLeadAssigned = on('crm:lead_assigned', () => {
      throttledInvalidate('leads');
    });

    // ── Messaging / Groups ────────────────────────────────────────────────

    const offGroupCreated = on('group:created', () => {
      throttledInvalidate('groups');
    });

    const offGroupMessage = on('group:message', () => {
      throttledInvalidate('messages');
    });

    return () => {
      offNotif?.();
      offNotifBroadcast?.();
      offNotifPersonal?.();
      offMsg?.();
      offSchedule?.();
      offScheduleLive?.();
      offAttendance?.();
      offAttendanceUpdated?.();
      offGrade?.();
      offDisciplineCreated?.();
      offDisciplineResolved?.();
      offClassCreated?.();
      offClassUpdated?.();
      offClassRemoved?.();
      offLeaveCreated?.();
      offLeaveUpdated?.();
      offPayment?.();
      offShiftClosed?.();
      offExamStarted?.();
      offExamSubmitted?.();
      offLeadAssigned?.();
      offGroupCreated?.();
      offGroupMessage?.();
    };
  }, [on, queryClient]);

  return { emit };
}
