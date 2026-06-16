import Constants from 'expo-constants';

/**
 * API bazaviy URL. Tartib:
 *  1. EXPO_PUBLIC_API_URL muhit o'zgaruvchisi (.env)
 *  2. app.json -> expo.extra.apiUrl
 *  3. localhost fallback (iOS simulator)
 */
const fromEnv = process.env.EXPO_PUBLIC_API_URL;
const fromExtra = (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl;

export const API_URL = fromEnv ?? fromExtra ?? 'http://localhost:3001/api/v1';

/** WebSocket gateway URL — API_URL'dan `/api/v1` qismini olib tashlaymiz. */
export const SOCKET_URL = API_URL.replace(/\/api\/v\d+\/?$/, '');
