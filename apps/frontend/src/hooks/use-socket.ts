'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/auth.store';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') ?? 'http://localhost:3001';

type SocketEvent = string;
type EventCallback = (data: any) => void;

interface UseSocketOptions {
  /** Socket.io namespace, e.g. '/notifications' */
  namespace?: string;
  /** Only connect when enabled is true (default: true) */
  enabled?: boolean;
  /** Map of event → handler to subscribe on connect */
  handlers?: Record<SocketEvent, EventCallback>;
}

/**
 * useSocket — establishes a Socket.io connection using the current user's
 * JWT access token. Reconnects automatically when the token changes.
 *
 * Improvements for Phase 28.5 pilot readiness:
 * - isConnected is now reactive (useState) so UI can show connection status
 * - Exponential backoff for reconnection (max 10s)
 * - Force-reconnect on token change prevents stale auth sessions
 * - Graceful handling of auth errors (triggers logout suggestion)
 */
export function useSocket({ namespace = '/', enabled = true, handlers = {} }: UseSocketOptions = {}) {
  const { accessToken } = useAuthStore();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Handlers ref orqali saqlanadi: har render'da yangilanadi, lekin socket qayta
  // ulanmaydi — listener'lar doim eng so'nggi handler'ni chaqiradi (stale closure yo'q)
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const connect = useCallback(() => {
    if (!accessToken || !enabled) {
      setIsConnected(false);
      return;
    }

    // Disconnect existing socket before creating a new one
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    const socket = io(`${SOCKET_URL}${namespace}`, {
      auth: { token: accessToken },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      randomizationFactor: 0.5,
    });

    socket.on('connect', () => {
      setIsConnected(true);
      setAuthError(null);
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Socket] Connected: ${namespace} (${socket.id})`);
      }
    });

    socket.on('disconnect', (reason) => {
      setIsConnected(false);
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Socket] Disconnected: ${namespace} — ${reason}`);
      }
    });

    socket.on('connect_error', (err) => {
      setIsConnected(false);
      if (err.message?.includes('auth') || err.message?.includes('jwt') || err.message?.includes('token')) {
        setAuthError('Auth session expired. Please refresh the page.');
      }
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[Socket] Error: ${namespace} —`, err.message);
      }
    });

    // Register all provided event handlers — ref orqali, doim eng yangi callback
    Object.keys(handlersRef.current).forEach((event) => {
      socket.on(event, (data: any) => handlersRef.current[event]?.(data));
    });

    socketRef.current = socket;
  }, [accessToken, enabled, namespace]);

  useEffect(() => {
    connect();
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [connect]);

  /** Emit an event to the server */
  const emit = useCallback((event: string, data?: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    }
  }, []);

  /** Subscribe to an event; returns an unsubscribe function */
  const on = useCallback((event: string, callback: EventCallback) => {
    socketRef.current?.on(event, callback);
    return () => socketRef.current?.off(event, callback);
  }, []);

  return {
    socket: socketRef.current,
    emit,
    on,
    isConnected,
    authError,
  };
}
