import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/auth.store';
import { useTabBarSpace } from '@/lib/tab-space';
import { useTheme } from '@/theme/use-theme';
import { homeForRole, homeOwnsScreen } from '@/components/homes';

/**
 * Home screen — role dispatch Map orqali (MOBILE_FOUNDATION_SPEC §1.1, F4).
 * Monolit if/else o'rniga `homeForRole(role)` tegishli home komponentni
 * qaytaradi. Yangi role qo'shish uchun `src/components/homes/index.ts`
 * registry'sini yangilang — bu fayl o'zgarmaydi.
 */
export default function HomeScreen() {
  const { theme } = useTheme();
  const bottomSpace = useTabBarSpace();
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? '').toLowerCase().trim();
  const fullName = user ? `${user.firstName} ${user.lastName}` : '';

  const HomeComponent = homeForRole(role);

  // Ekranni o'zi boshqaradigan home'lar (o'z ScrollView + top inset) —
  // wrapper'ga o'ralmaydi, aks holda ichma-ich ScrollView refresh'ni buzadi.
  if (homeOwnsScreen(role)) {
    return <HomeComponent name={fullName} avatarUrl={user?.avatarUrl} />;
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: bottomSpace }}>
        <HomeComponent name={fullName} avatarUrl={user?.avatarUrl} />
      </ScrollView>
    </SafeAreaView>
  );
}
