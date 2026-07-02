/**
 * Xedu · Profile — Student version
 *
 * Home ekranidan FARQLI header: yashil hero YO'Q, ring YO'Q.
 * O'rniga: compact user identity card (avatar chap, ism/daraja o'ng, XP bar).
 * Keyin: kurslar (marketing), yutuqlar, sertifikat, faollik, sozlamalar.
 */
import { useEffect, useRef, useState, memo, useCallback } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/auth.store';
import { studentApi } from '@/api/student';
import { setLanguage } from '@/i18n/language';
import type { AppLanguage } from '@/i18n';
import { useThemeStore, type ThemeMode } from '@/theme/theme-store';
import { Screen, Card } from '@/components/screen';
import { Text } from '@/components/text';
import { Avatar } from '@/components/avatar';
import { Button } from '@/components/ui';
import { IconBadge } from '@/components/row';
import { levelFromCoins } from '@/lib/gamify';
import { useStudentStreak } from '@/lib/use-student-streak';
import { radius, spacing, anim, fonts } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

const { width: W } = Dimensions.get('window');
const COURSE_W = W * 0.72;

// ── Marketing kurslar ────────────────────────────────────────────────────────
const COURSES = [
  {
    id: 'math',   emoji: '🧮', title: 'Matematika Pro',
    sub: 'Olimpiada + IELTS',        tag: 'Yangi',    tagBg: '#10B981',
    from: '#065F46' as const, to: '#047857' as const, accent: '#34D399',
  },
  {
    id: 'eng',    emoji: '🗣️', title: 'English Speaking',
    sub: 'Native bilan amaliyot',    tag: 'TOP',       tagBg: '#F59E0B',
    from: '#1E3A8A' as const, to: '#1D4ED8' as const, accent: '#93C5FD',
  },
  {
    id: 'python', emoji: '💻', title: 'Python & AI',
    sub: "Boshlang'ichdan loyihaga", tag: 'Tez orada', tagBg: '#7C3AED',
    from: '#4C1D95' as const, to: '#6D28D9' as const, accent: '#C4B5FD',
  },
  {
    id: 'robo',   emoji: '🤖', title: 'Robototexnika',
    sub: 'Arduino + 3D chop',        tag: 'Yangi',    tagBg: '#0EA5E9',
    from: '#0C4A6E' as const, to: '#0369A1' as const, accent: '#7DD3FC',
  },
] as const;

// ── Yutuqlar ─────────────────────────────────────────────────────────────────
const ACHIEVEMENTS = [
  { id: 'a1', icon: '🌟', label: 'Birinchi kun',    earned: true  },
  { id: 'a2', icon: '🔥', label: '7 kunlik streak', earned: false },
  { id: 'a3', icon: '🪙', label: '100 tanga',       earned: false },
  { id: 'a4', icon: '📚', label: 'Vazifa ustasi',   earned: false },
  { id: 'a5', icon: '🏆', label: '90% davomat',     earned: false },
  { id: 'a6', icon: '💎', label: "A'lo o'quvchi",  earned: false },
] as const;

const LANGS: { code: AppLanguage; label: string; flag: string }[] = [
  { code: 'uz', label: "O'zbekcha", flag: '🇺🇿' },
  { code: 'ru', label: 'Русский',   flag: '🇷🇺' },
];

// ────────────────────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const { t, i18n }   = useTranslation();
  const { theme, isDark, shadow } = useTheme();
  const user   = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [lang, setLang]   = useState<string>(i18n.language);
  const themeMode         = useThemeStore((s) => s.mode);
  const setThemeMode      = useThemeStore((s) => s.setMode);
  const isStudent = (user?.role ?? '').toLowerCase().trim() === 'student';

  const THEMES: { mode: ThemeMode; icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
    { mode: 'system', icon: 'phone-portrait-outline', label: t('theme.system')  },
    { mode: 'light',  icon: 'sunny-outline',          label: t('theme.light')   },
    { mode: 'dark',   icon: 'moon-outline',           label: t('theme.dark')    },
  ];

  const fullName = user ? `${user.firstName} ${user.lastName}` : '';

  const coinsQ = useQuery<{ coins: number }>({
    queryKey: ['student', 'coins', 'balance'],
    queryFn:  studentApi.coinsBalance,
    enabled:  isStudent,
    retry: false,
  });

  const coins  = coinsQ.data?.coins ?? 0;
  const { level, current, needed, progress } = levelFromCoins(coins);
  const streak = useStudentStreak();

  const xpAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(xpAnim, {
      toValue: progress, ...anim.spring.gentle, useNativeDriver: false,
    }).start();
  }, [progress]);

  const changeLang = useCallback(async (code: AppLanguage) => {
    setLang(code); await setLanguage(code);
  }, []);

  const confirmLogout = useCallback(() => {
    Alert.alert(t('profile.logoutConfirmTitle'), t('profile.logoutConfirmBody'), [
      { text: t('common.cancel'),  style: 'cancel' },
      { text: t('auth.logout'), style: 'destructive', onPress: logout },
    ]);
  }, [t, logout]);

  // ── Non-student ────────────────────────────────────────────────────────────
  if (!isStudent) {
    return (
      <Screen title={t('tabs.profile')} scroll>
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <Avatar name={fullName || '?'} uri={user?.avatarUrl} size={56} />
            <View style={{ flex: 1 }}>
              <Text variant="heading" numberOfLines={1}>{fullName}</Text>
              <Text variant="caption" color="textMuted" numberOfLines={1}>{user?.email}</Text>
            </View>
          </View>
        </Card>
        <SettingsList
          lang={lang} themeMode={themeMode} THEMES={THEMES} LANGS={LANGS}
          theme={theme} changeLang={changeLang} setThemeMode={setThemeMode}
          confirmLogout={confirmLogout} t={t}
          version={Constants.expoConfig?.version ?? '1.0.0'}
        />
      </Screen>
    );
  }

  // ── Student ────────────────────────────────────────────────────────────────
  return (
    <Screen title={t('tabs.profile')} scroll={false}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >

        {/* ── USER IDENTITY CARD ─────────────────────────────────────────────
             Compact horizontal card — FARQLI home hero dan.
             Yashil gradient EMAS: off-white card + emerald accent strip.   ── */}
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md }}>
          <View style={[styles.identityCard, { ...shadow(2) as object }]}>
            {/* Accent left strip */}
            <LinearGradient
              colors={['#0F7B53', '#34C98C']}
              start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
              style={styles.accentStrip}
            />

            <View style={styles.identityInner}>
              {/* Avatar */}
              <View style={[styles.avatarRing, { borderColor: isDark ? 'rgba(45,174,126,0.4)' : '#DDF5EA' }]}>
                <Avatar name={fullName || '?'} uri={user?.avatarUrl} size={72} />
              </View>

              {/* Info */}
              <View style={styles.identityInfo}>
                <Text style={[styles.idName, { color: theme.text }]} numberOfLines={1}>
                  {fullName}
                </Text>
                <View style={styles.idBadgeRow}>
                  {/* Level pill */}
                  <View style={[styles.idLevelPill, { backgroundColor: theme.primaryLight }]}>
                    <Ionicons name="star" size={11} color={theme.primary} />
                    <Text style={{ fontFamily: fonts.bold, fontSize: 11, color: theme.primary }}>
                      Level {level}
                    </Text>
                  </View>
                  {/* Streak */}
                  {streak > 0 && (
                    <View style={[styles.idLevelPill, { backgroundColor: '#FFF0E6' }]}>
                      <Text style={{ fontFamily: fonts.bold, fontSize: 11, color: '#F97316' }}>
                        🔥 {streak}
                      </Text>
                    </View>
                  )}
                </View>

                {/* XP bar */}
                <View style={{ marginTop: spacing.sm, gap: 4 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontFamily: fonts.medium, fontSize: 11, color: theme.textMuted }}>
                      XP
                    </Text>
                    <Text style={{ fontFamily: fonts.medium, fontSize: 11, color: theme.textMuted }}>
                      {current}/{needed}
                    </Text>
                  </View>
                  <View style={[styles.xpTrack, { backgroundColor: theme.bgSubtle }]}>
                    <Animated.View
                      style={[
                        styles.xpFill,
                        { backgroundColor: theme.primary,
                          width: xpAnim.interpolate({ inputRange: [0,1], outputRange: ['0%','100%'] }) },
                      ]}
                    />
                  </View>
                </View>
              </View>
            </View>

            {/* Tangalar count — bottom right */}
            <View style={[styles.coinsBadge, { backgroundColor: isDark ? 'rgba(245,181,61,0.15)' : '#FBEFD6' }]}>
              <Ionicons name="medal" size={14} color={theme.accent} />
              <Text style={{ fontFamily: fonts.bold, fontSize: 13, color: theme.accent }}>
                {coins}
              </Text>
              <Text style={{ fontFamily: fonts.medium, fontSize: 10, color: theme.textMuted }}>
                tanga
              </Text>
            </View>
          </View>
        </View>

        <View style={{ gap: spacing.xxxl, marginTop: spacing.xl }}>

          {/* ── Xedu Kurslar ──────────────────────────────────────────────── */}
          <View style={{ gap: spacing.md }}>
            <SectionHeader
              title="🎓 Xedu Kurslar"
              sub="Bilimingizni yangi bosqichga olib chiqing"
              actionLabel="Barchasi"
              onAction={() => {}}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              decelerationRate="fast"
              snapToInterval={COURSE_W + spacing.md}
              snapToAlignment="start"
              contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.md }}
            >
              {COURSES.map((c) => <CourseCard key={c.id} course={c} shadow={shadow} />)}
            </ScrollView>
          </View>

          {/* ── Yutuqlar ──────────────────────────────────────────────────── */}
          <View style={{ gap: spacing.md }}>
            <SectionHeader
              title="🏅 Yutuqlar"
              sub={`${ACHIEVEMENTS.filter(a => a.earned).length}/${ACHIEVEMENTS.length} qo'lga kiritildi`}
            />
            <View style={[styles.achGrid, { paddingHorizontal: spacing.lg }]}>
              {ACHIEVEMENTS.map(a => <AchBadge key={a.id} item={a} theme={theme} />)}
            </View>
          </View>

          {/* ── Sertifikatlar ─────────────────────────────────────────────── */}
          <View style={{ gap: spacing.md }}>
            <SectionHeader title="📜 Sertifikatlar" />
            <View style={{ paddingHorizontal: spacing.lg }}>
              <CertEmpty theme={theme} isDark={isDark} />
            </View>
          </View>

          {/* ── Haftalik faollik ──────────────────────────────────────────── */}
          <View style={{ gap: spacing.md }}>
            <SectionHeader title="📊 Haftalik faollik" />
            <View style={{ paddingHorizontal: spacing.lg }}>
              <ActivityBars theme={theme} isDark={isDark} />
            </View>
          </View>

          {/* Divider */}
          <View style={{ height: 1, backgroundColor: theme.border, marginHorizontal: spacing.lg }} />

          {/* ── Sozlamalar ────────────────────────────────────────────────── */}
          <View style={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>
            <Text variant="label" color="textMuted" style={{ marginLeft: spacing.xs, letterSpacing: 1 }}>
              SOZLAMALAR
            </Text>
            <SettingsList
              lang={lang} themeMode={themeMode} THEMES={THEMES} LANGS={LANGS}
              theme={theme} changeLang={changeLang} setThemeMode={setThemeMode}
              confirmLogout={confirmLogout} t={t}
              version={Constants.expoConfig?.version ?? '1.0.0'}
            />
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

// ── Section header ─────────────────────────────────────────────────────────
function SectionHeader({ title, sub, actionLabel, onAction }: {
  title: string; sub?: string; actionLabel?: string; onAction?: () => void;
}) {
  const { theme } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: spacing.lg }}>
      <View>
        <Text style={{ fontFamily: fonts.bold, fontSize: 18, color: theme.text }}>{title}</Text>
        {sub ? <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: theme.textMuted, marginTop: 2 }}>{sub}</Text> : null}
      </View>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: theme.primary }}>{actionLabel} →</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// ── Course card ────────────────────────────────────────────────────────────
const CourseCard = memo(function CourseCard({ course, shadow }: { course: typeof COURSES[number]; shadow: (l: 0|1|2|3) => object }) {
  const scale = useRef(new Animated.Value(1)).current;
  const onIn  = () => Animated.spring(scale, { toValue: 0.97, ...anim.spring.snappy, useNativeDriver: true }).start();
  const onOut = () => Animated.spring(scale, { toValue: 1,    ...anim.spring.snappy, useNativeDriver: true }).start();
  return (
    <Pressable onPressIn={onIn} onPressOut={onOut} onPress={() => {}}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <LinearGradient
          colors={[course.from, course.to]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={[styles.courseCard, shadow(2) as object]}
        >
          <View style={[styles.courseBlob, { backgroundColor: course.accent, opacity: 0.12 }]} />
          <View style={[styles.courseTag, { backgroundColor: course.tagBg + 'EE' }]}>
            <Text style={{ fontFamily: fonts.bold, fontSize: 10, color: '#fff', letterSpacing: 0.5 }}>{course.tag}</Text>
          </View>
          <Text style={{ fontSize: 36, marginTop: spacing.sm }}>{course.emoji}</Text>
          <Text style={styles.courseTitle}>{course.title}</Text>
          <Text style={styles.courseSub}>{course.sub}</Text>
          <View style={[styles.courseCta, { borderColor: course.accent + '66' }]}>
            <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: '#fff' }}>Ko'proq bilish</Text>
            <Ionicons name="arrow-forward-circle-outline" size={16} color={course.accent} />
          </View>
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
});

// ── Achievement badge ──────────────────────────────────────────────────────
const AchBadge = memo(function AchBadge({ item, theme }: { item: typeof ACHIEVEMENTS[number]; theme: any }) {
  const scale = useRef(new Animated.Value(1)).current;
  function pulse() {
    if (!item.earned) return;
    Animated.sequence([
      Animated.spring(scale, { toValue: 1.2, ...anim.spring.bouncy, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1,   ...anim.spring.gentle, useNativeDriver: true }),
    ]).start();
  }
  return (
    <Pressable onPress={pulse} style={styles.achItem}>
      <Animated.View style={[
        styles.achBadge,
        {
          backgroundColor: item.earned ? theme.primaryLight : theme.bgSubtle,
          borderColor:     item.earned ? theme.primary + '55' : theme.border,
          opacity: item.earned ? 1 : 0.5,
          transform: [{ scale }],
        },
      ]}>
        <Text style={{ fontSize: 28 }}>{item.icon}</Text>
        <View style={[styles.achCheck, item.earned
          ? { backgroundColor: theme.primary }
          : { backgroundColor: theme.bgSubtle, borderWidth: 1, borderColor: theme.border }]}>
          <Ionicons name={item.earned ? 'checkmark' : 'lock-closed'} size={item.earned ? 10 : 9} color={item.earned ? '#fff' : theme.textMuted} />
        </View>
      </Animated.View>
      <Text numberOfLines={2} style={{ fontFamily: fonts.medium, fontSize: 11, color: item.earned ? theme.text : theme.textMuted, textAlign: 'center', marginTop: spacing.sm, lineHeight: 15 }}>
        {item.label}
      </Text>
    </Pressable>
  );
});

// ── Cert empty ────────────────────────────────────────────────────────────
function CertEmpty({ theme, isDark }: { theme: any; isDark: boolean }) {
  return (
    <LinearGradient
      colors={isDark ? ['#0E3A29', '#091C15'] : ['#F0FDF8', '#E6F5EE']}
      style={[styles.certCard, { borderColor: theme.primary + '33' }]}
    >
      <View style={[styles.certIconWrap, { backgroundColor: theme.primary + '22' }]}>
        <Text style={{ fontSize: 32 }}>🎖️</Text>
      </View>
      <Text style={{ fontFamily: fonts.bold, fontSize: 17, color: theme.text, marginTop: spacing.md }}>
        Birinchi sertifikatni qozonin!
      </Text>
      <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: theme.textMuted, textAlign: 'center', marginTop: spacing.xs, lineHeight: 20, maxWidth: 260 }}>
        Xedu kurslarini tugatib rasmiy sertifikat oling va portfoliongizni boyiting.
      </Text>
      <Pressable style={[styles.certBtn, { backgroundColor: theme.primary }]} onPress={() => {}}>
        <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: '#fff' }}>Kurslarni ko'rish</Text>
        <Ionicons name="arrow-forward" size={15} color="#fff" />
      </Pressable>
    </LinearGradient>
  );
}

// ── Weekly activity ───────────────────────────────────────────────────────
function ActivityBars({ theme, isDark }: { theme: any; isDark: boolean }) {
  const DAYS = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'];
  const H    = [0.9, 1.0, 0.65, 1.0, 0.75, 0.0, 0.0];
  return (
    <View style={[styles.actCard, { backgroundColor: isDark ? '#0E1A15' : theme.card, borderColor: theme.border }]}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 56, gap: 6 }}>
        {DAYS.map((d, i) => (
          <View key={d} style={{ flex: 1, alignItems: 'center', gap: 6, height: 56, justifyContent: 'flex-end' }}>
            <View style={{ height: Math.max(4, H[i] * 56), width: '100%', borderRadius: 6, backgroundColor: H[i] > 0 ? theme.primary : theme.bgSubtle, opacity: H[i] > 0 ? 0.75 + H[i] * 0.25 : 1 }} />
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
        {DAYS.map(d => (
          <View key={d} style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontFamily: fonts.medium, fontSize: 10, color: theme.textMuted }}>{d}</Text>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.md }}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.primary }} />
        <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: theme.textMuted }}>Bu hafta — maqsad: 5 kun</Text>
      </View>
    </View>
  );
}

// ── Settings ─────────────────────────────────────────────────────────────
function SettingsList({ lang, themeMode, THEMES, LANGS, theme, changeLang, setThemeMode, confirmLogout, t, version }: any) {
  return (
    <View style={{ gap: spacing.md }}>
      <Card padded={false}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg }}>
          <IconBadge icon="shield-checkmark-outline" />
          <Text variant="bodyStrong" style={{ flex: 1 }}>{t('profile.role', 'Rol')}</Text>
          <View style={{ backgroundColor: theme.primaryLight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.sm }}>
            <Text variant="caption" color="primary">O'QUVCHI</Text>
          </View>
        </View>
      </Card>

      <Text variant="label" color="textMuted" style={{ marginLeft: spacing.xs }}>
        {t('profile.language', 'TIL').toUpperCase()}
      </Text>
      <Card padded={false}>
        {LANGS.map((l: any, i: number) => (
          <Pressable key={l.code} onPress={() => changeLang(l.code)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: theme.border }}>
            <Text style={{ fontSize: 20 }}>{l.flag}</Text>
            <Text variant="bodyStrong" style={{ flex: 1 }}>{l.label}</Text>
            {lang === l.code ? <Ionicons name="checkmark-circle" size={22} color={theme.primary} /> : null}
          </Pressable>
        ))}
      </Card>

      <Text variant="label" color="textMuted" style={{ marginLeft: spacing.xs }}>
        {t('profile.appearance', "KO'RINISH").toUpperCase()}
      </Text>
      <Card padded={false}>
        {THEMES.map((th: any, i: number) => (
          <Pressable key={th.mode} onPress={() => setThemeMode(th.mode)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: theme.border }}>
            <IconBadge icon={th.icon} />
            <Text variant="bodyStrong" style={{ flex: 1 }}>{th.label}</Text>
            {themeMode === th.mode ? <Ionicons name="checkmark-circle" size={22} color={theme.primary} /> : null}
          </Pressable>
        ))}
      </Card>

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <IconBadge icon="information-circle-outline" bg="bgSubtle" color="textMuted" />
            <Text variant="bodyStrong">{t('profile.version', 'Versiya')}</Text>
          </View>
          <Text variant="body" color="textMuted">{version}</Text>
        </View>
      </Card>

      <Button title={t('auth.logout')} variant="ghost" icon="log-out-outline" onPress={confirmLogout} />
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const ACH_W = (W - spacing.lg * 2 - spacing.md * 2) / 3;

const styles = StyleSheet.create({
  // Identity card
  identityCard: {
    borderRadius: radius.xxl,
    backgroundColor: '#fff',
    overflow: 'hidden',
    position: 'relative',
  },
  accentStrip: {
    position: 'absolute', left: 0, top: 0, bottom: 0, width: 5,
  },
  identityInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    paddingLeft: spacing.lg + 5, // clear the accent strip
  },
  avatarRing: {
    borderRadius: 40,
    borderWidth: 2.5,
    overflow: 'hidden',
  },
  identityInfo: { flex: 1, gap: 4 },
  idName: { fontFamily: fonts.bold, fontSize: 20 },
  idBadgeRow: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
  idLevelPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: radius.pill,
  },
  xpTrack: {
    height: 5, borderRadius: radius.pill, overflow: 'hidden',
  },
  xpFill: {
    height: '100%', borderRadius: radius.pill,
  },
  coinsBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    alignSelf: 'flex-end',
    marginRight: spacing.lg, marginBottom: spacing.md,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: radius.pill,
  },

  // Course card
  courseCard: {
    width: COURSE_W, borderRadius: radius.xl,
    padding: spacing.lg, minHeight: 195,
    justifyContent: 'flex-end', overflow: 'hidden',
  },
  courseBlob: {
    position: 'absolute', right: -30, top: -30,
    width: 130, height: 130, borderRadius: 65,
  },
  courseTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm, paddingVertical: 3,
    borderRadius: radius.pill,
  },
  courseTitle: { fontFamily: fonts.bold, fontSize: 17, color: '#fff', marginTop: spacing.sm },
  courseSub:   { fontFamily: fonts.medium, fontSize: 13, color: 'rgba(255,255,255,0.68)', marginTop: 3 },
  courseCta: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: spacing.md, borderWidth: 1, borderRadius: radius.pill,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },

  // Achievements
  achGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  achItem: { width: ACH_W, alignItems: 'center' },
  achBadge: {
    width: 68, height: 68, borderRadius: radius.xl,
    borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', position: 'relative',
  },
  achCheck: {
    position: 'absolute', bottom: -4, right: -4,
    width: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },

  // Cert
  certCard: {
    borderRadius: radius.xl, borderWidth: 1.5,
    borderStyle: 'dashed', padding: spacing.xl, alignItems: 'center', gap: spacing.xs,
  },
  certIconWrap: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: 'center', justifyContent: 'center',
  },
  certBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: spacing.lg, paddingHorizontal: spacing.xl, paddingVertical: 12,
    borderRadius: radius.pill,
  },

  // Activity
  actCard: { borderRadius: radius.xl, borderWidth: 1, padding: spacing.lg },
});
