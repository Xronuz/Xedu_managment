import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { fonts } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

export default function MoreLayout() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.card },
        headerTintColor: theme.primary,
        headerTitleStyle: { color: theme.text, fontFamily: fonts.bold, fontSize: 18 },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: theme.bg },
      }}
    >
      <Stack.Screen name="announcements" options={{ title: t('more.announcements') }} />
      <Stack.Screen name="exams" options={{ title: t('more.exams') }} />
      <Stack.Screen name="calendar" options={{ title: t('more.calendar') }} />
      <Stack.Screen name="clubs" options={{ title: t('more.clubs') }} />
      <Stack.Screen name="meetings" options={{ title: t('more.meetings') }} />
      <Stack.Screen name="portfolio" options={{ title: t('more.portfolio') }} />
      <Stack.Screen name="library" options={{ title: t('more.library') }} />
      <Stack.Screen name="transport" options={{ title: t('more.transport') }} />
      <Stack.Screen name="courses" options={{ title: t('more.courses') }} />
      <Stack.Screen name="leave" options={{ title: t('more.myLeave') }} />
      <Stack.Screen name="kpi" options={{ title: t('more.kpi') }} />
      <Stack.Screen name="approvals" options={{ title: t('more.approvals') }} />
      <Stack.Screen name="finance" options={{ title: t('more.finance') }} />
      <Stack.Screen name="loans" options={{ title: t('more.loans') }} />
      <Stack.Screen name="students" options={{ title: t('menu.students') }} />
      <Stack.Screen name="student" options={{ title: t('menu.students') }} />
      <Stack.Screen name="student-new" options={{ title: t('crud.newStudent') }} />
      <Stack.Screen name="staff" options={{ title: t('menu.staff') }} />
      <Stack.Screen name="classes" options={{ title: t('menu.classes') }} />
      <Stack.Screen name="class" options={{ title: t('menu.classes') }} />
      <Stack.Screen name="class-new" options={{ title: t('crud.newClass') }} />
      <Stack.Screen name="subjects" options={{ title: t('menu.subjects') }} />
      <Stack.Screen name="subject-new" options={{ title: t('crud.newSubject') }} />
      <Stack.Screen name="payments" options={{ title: t('fin.payments') }} />
      <Stack.Screen name="payment-new" options={{ title: t('fin.addPayment') }} />
      <Stack.Screen name="fee-structures" options={{ title: t('fin.fees') }} />
      <Stack.Screen name="crm" options={{ title: t('fin.leads') }} />
      <Stack.Screen name="payroll" options={{ title: t('fin.payroll') }} />
      <Stack.Screen name="alerts" options={{ title: t('menu.alerts') }} />
      <Stack.Screen name="discipline" options={{ title: t('menu.discipline') }} />
      <Stack.Screen name="discipline-new" options={{ title: t('edu.newIncident') }} />
      <Stack.Screen name="exam-new" options={{ title: t('edu.newExam') }} />
      <Stack.Screen name="teaching-loads" options={{ title: t('menu.teachingLoads') }} />
      <Stack.Screen name="broadcast" options={{ title: t('menu.broadcast') }} />
      <Stack.Screen name="shop" options={{ title: t('menu.shop') }} />
      <Stack.Screen name="schools" options={{ title: t('menu.schools') }} />
      <Stack.Screen name="demo-requests" options={{ title: t('menu.demoRequests') }} />
      <Stack.Screen name="system-health" options={{ title: t('menu.systemHealth') }} />
      <Stack.Screen name="insights" options={{ title: t('menu.insights') }} />
      <Stack.Screen name="kpi-admin" options={{ title: t('menu.kpiAdmin') }} />
      <Stack.Screen name="ops" options={{ title: t('menu.ops') }} />
      <Stack.Screen name="homework" options={{ title: t('menu.homework') }} />
      <Stack.Screen name="homework-new" options={{ title: t('hw.newHomework') }} />
      <Stack.Screen name="users" options={{ title: t('menu.users') }} />
      <Stack.Screen name="substitutions" options={{ title: t('menu.substitutions') }} />
      <Stack.Screen name="shop-admin" options={{ title: t('menu.shopAdmin') }} />
      <Stack.Screen name="shop-admin-new" options={{ title: t('shopA.newItem') }} />
      <Stack.Screen name="settings" options={{ title: t('menu.settings') }} />
      <Stack.Screen name="announcement-new" options={{ title: t('ann.newAnnouncement') }} />
      <Stack.Screen name="canteen" options={{ title: t('menu.canteen') }} />
      <Stack.Screen name="meeting-new" options={{ title: t('mtg.newMeeting') }} />
    </Stack>
  );
}
