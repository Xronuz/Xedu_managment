import '@/i18n';
import { useEffect, useState } from 'react';
import { LogBox, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { queryClient } from '@/lib/query';
import { useAuthStore } from '@/store/auth.store';
import { tokenStore } from '@/api/token-store';
import { useBranchSync } from '@/lib/use-branch-sync';
import { useAppFonts } from '@/theme/fonts';
import { restoreLanguage } from '@/i18n/language';
import { useThemeStore } from '@/theme/theme-store';
import { useTheme } from '@/theme/use-theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

// Expo Go'да remote push qo'llab-quvvatlanmaydi (SDK 53+) — bu ogohlantirishni dev'да yashiramiz.
LogBox.ignoreLogs(['expo-notifications: Android Push notifications']);

/** Auth holatiga qarab marshrutni himoyalash (expo-router pattern). */
function useProtectedRoute() {
  const segments = useSegments();
  const router = useRouter();
  const hydrated = useAuthStore((s) => s.hydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isFirstLogin = useAuthStore((s) => s.user?.isFirstLogin);

  useEffect(() => {
    if (!hydrated) return;

    const inAuthGroup = segments[0] === '(auth)';
    const onFirstLogin = (segments as string[]).includes('first-login');
    const needsFirstLogin = isAuthenticated && isFirstLogin;

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (needsFirstLogin && !onFirstLogin) {
      router.replace('/(auth)/first-login');
    } else if (isAuthenticated && !needsFirstLogin && inAuthGroup) {
      router.replace('/(app)');
    }
  }, [hydrated, isAuthenticated, isFirstLogin, segments, router]);
}

function RootNavigator() {
  const { theme, isDark } = useTheme();
  useProtectedRoute();
  // Branch store'ni auth holati bilan sinxronlash (MOBILE_FOUNDATION_SPEC §4.3).
  useBranchSync();
  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.bg } }} />
    </View>
  );
}

export default function RootLayout() {
  const bootstrap = useAuthStore((s) => s.bootstrap);
  const hydrated = useAuthStore((s) => s.hydrated);
  const fontsReady = useAppFonts();
  // Xavfsizlik tarmog'i: shrift/hidratsiya osilib qolsa ham 5s dan keyin ochiladi
  // (shrift kech kelsa tizim shrifti bilan ko'rsatiladi — splashда tiqilib qolmaydi).
  const [safetyReady, setSafetyReady] = useState(false);
  const ready = (hydrated && fontsReady) || safetyReady;

  useEffect(() => {
    tokenStore.setOnAuthFailure(() => {
      useAuthStore.setState({ user: null, isAuthenticated: false });
    });
    bootstrap();
    restoreLanguage();
    useThemeStore.getState().hydrate();
    const safety = setTimeout(() => setSafetyReady(true), 5000);
    return () => {
      clearTimeout(safety);
      tokenStore.setOnAuthFailure(null);
    };
  }, [bootstrap]);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null; // splash ko'rinib turadi

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <RootNavigator />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
