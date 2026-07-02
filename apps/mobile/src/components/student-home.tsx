/**
 * StudentHome v8 — proper inverted-corner layout
 *
 * ┌─────────────────────────────────┐  ← Hero (overflow:hidden, borderBottomRadius:40)
 * │  dark green gradient + stars    │
 * │  Greeting · Notif               │
 * └─────────────────────────────────┘
 *     ╭──── Content panel ─────────────╮   ← borderTopRadius:40, marginTop:-40
 *     │   [DayRing centered]           │
 *     │   Stat chips                   │
 *     │   Mission · Growth · Lessons   │
 *     ╰────────────────────────────────╯
 *
 * inverted corner = content panel's white rounded top
 * overlapping the green hero's rounded bottom.
 */
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Defs, RadialGradient, Stop, Circle as SvgCircle } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Dimensions } from 'react-native';
import { notificationsApi, type NotificationsResponse } from '@/api/notifications';
import { studentApi } from '@/api/student';
import { Text } from './text';
import { Avatar } from './avatar';
import { Skel } from './dashboard-kit';
import { levelFromCoins, lessonStateAt } from '@/lib/gamify';
import { useStudentStreak } from '@/lib/use-student-streak';
import { fonts, radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';
import {
  DayRing, Compass, Horizon, Ledger, LedgerEntry,
  SectionLabel, computeMission, computeRing,
} from './current';

const { width: W } = Dimensions.get('window');
const RING_SIZE   = 146;
const CURVE       = 100;  // inverted corner radius — must be same on hero bottom AND content top

function tierTitle(level: number): string {
  if (level <= 2)  return 'Explorer';
  if (level <= 5)  return 'Seeker';
  if (level <= 9)  return 'Scholar';
  if (level <= 14) return 'Sage';
  return 'Master';
}

export function StudentHome({ name, avatarUrl, coins }: {
  name: string; avatarUrl?: string | null; coins: number;
}) {
  const { theme, shadow, isDark } = useTheme();
  const router  = useRouter();
  const streak  = useStudentStreak();
  const { level, current, needed, progress } = levelFromCoins(coins);
  const xpLeft    = Math.max(0, needed - current);
  const firstName = name.split(' ')[0] || name;

  const { data: notifData } = useQuery<NotificationsResponse>({
    queryKey: ['notifications'],
    queryFn:  () => notificationsApi.list(1),
    staleTime: 30_000,
  });
  const unread = notifData?.meta?.unreadCount ?? 0;

  const scheduleQ = useQuery<any[]>({
    queryKey: ['student', 'schedule', 'today'],
    queryFn:  studentApi.scheduleToday,
    retry: false, staleTime: 60_000,
  });
  const homeworkQ = useQuery<any[]>({
    queryKey: ['student', 'homework'],
    queryFn:  studentApi.homework,
    retry: false, staleTime: 60_000,
  });

  const raw     = scheduleQ.data;
  const lessons = Array.isArray(raw) ? raw : (raw as any)?.data ?? (raw as any)?.items ?? [];
  const rawHw   = homeworkQ.data;
  const allHw   = Array.isArray(rawHw) ? rawHw : (rawHw as any)?.data ?? (rawHw as any)?.items ?? [];

  const pendingHw  = allHw.filter((h: any) => h?.status !== 'submitted' && h?.status !== 'graded');
  const overdueHw  = pendingHw.filter((h: any) => h?.dueDate && new Date(h.dueDate) < new Date());
  const activeL    = lessons.find((l: any) => lessonStateAt(l) === 'active')   ?? null;
  const upcomingL  = lessons.find((l: any) => lessonStateAt(l) === 'upcoming') ?? null;

  const mission = computeMission({
    overdue: overdueHw, pending: pendingHw,
    activeLesson: activeL, upcomingLesson: upcomingL,
    hasStreak: streak > 0,
  });
  const ring    = computeRing(lessons, lessonStateAt, allHw);
  const loading = scheduleQ.isLoading || homeworkQ.isLoading;

  const stats = [
    { icon: 'flame'  as const, value: String(streak), label: 'Streak',   color: '#F97316' },
    { icon: 'star'   as const, value: `L${level}`,    label: 'Daraja',   color: '#FBBF24' },
    { icon: 'medal'  as const, value: String(coins),  label: 'Tangalar', color: theme.accent },
  ];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 120 }}
    >

      {/* ══════════════════════════════════════════════════════════════════
          HERO  — clipped to rounded-bottom rectangle (overflow:hidden).
          This guarantees the green gradient has curved bottom corners
          on BOTH iOS and Android.
      ══════════════════════════════════════════════════════════════════ */}
      <View style={[S.hero, {
        borderBottomLeftRadius:  CURVE,
        borderBottomRightRadius: CURVE,
        overflow: 'hidden',
      }]}>

        {/* Gradient fills the whole hero */}
        <LinearGradient
          colors={['#031008', '#072418', '#0B3A28', '#0F5438']}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.85, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Constellation stars */}
        <Stars />

        {/* Greeting row — sits at the top */}
        <View style={S.greetRow}>
          <View style={S.avatarFrame}>
            <Avatar name={name} uri={avatarUrl} size={40} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={S.greetSub}>{greetingFor()}</Text>
            <Text variant="heading" numberOfLines={1} style={{ color: '#fff' }}>{firstName}</Text>
          </View>
          <Pressable
            onPress={() => router.push('/notifications')}
            hitSlop={10}
            style={({ pressed }) => [S.notifBtn, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Ionicons name="notifications-outline" size={19} color="#fff" />
            {unread > 0 && (
              <View style={[S.badge, { backgroundColor: theme.danger }]}>
                <Text style={{ fontFamily: fonts.bold, fontSize: 9, color: '#fff' }}>
                  {unread > 9 ? '9+' : unread}
                </Text>
              </View>
            )}
          </Pressable>
        </View>
      </View>

      {/* ══════════════════════════════════════════════════════════════════
          CONTENT PANEL
          marginTop: -CURVE  → slides UNDER the hero's rounded bottom,
          creating the "inverted corner" where white rounds meet green rounds.
          borderTopRadius: CURVE must equal hero's borderBottomRadius.
      ══════════════════════════════════════════════════════════════════ */}
      <View style={[S.content, {
        backgroundColor: theme.bg,
        borderTopLeftRadius:  CURVE,
        borderTopRightRadius: CURVE,
        marginTop: -CURVE,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 0.18,
        shadowRadius: 12,
        elevation: 12,
      }]}>

        {/* ── DayRing ── centered at the top of content panel */}
        <View style={{ alignItems: 'center', paddingTop: spacing.xl }}>
          {loading ? (
            <Skel w={RING_SIZE} h={RING_SIZE} />
          ) : (
            <DayRing
              done={ring.done}
              total={ring.total}
              size="md"
              surface={isDark ? 'dark' : 'light'}
              centerLabel={`${ring.done} / ${ring.total}`}
              centerCaption="BUGUNGI MAQSAD"
            />
          )}
        </View>

        {/* ── Stat chips ── */}
        <View style={[S.statsRow, {
          backgroundColor: isDark ? theme.card : '#fff',
          borderColor: theme.border,
          ...shadow(1),
        }]}>
          {stats.map((s, i) => (
            <View key={s.label} style={S.statChip}>
              {i > 0 && <View style={[S.statDiv, { backgroundColor: theme.border }]} />}
              <View style={S.statInner}>
                <Ionicons name={s.icon} size={18} color={s.color} />
                <Text style={{ fontFamily: fonts.extrabold, fontSize: 16, color: theme.text }}>
                  {s.value}
                </Text>
                <Text style={{ fontFamily: fonts.medium, fontSize: 10, color: theme.textMuted }}>
                  {s.label}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* ── Mission ── */}
        <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.xl }}>
          {loading ? <Skel w="100%" h={150} /> : (
            <Compass
              icon={mission.icon} eyebrow={mission.eyebrow}
              title={mission.title} subtitle={mission.subtitle}
              rewardLabel={mission.rewardLabel} ctaLabel={mission.ctaLabel}
              tone={mission.tone} completed={mission.completed}
              onPress={() => router.push(mission.route as any)}
            />
          )}
        </View>

        {/* ── Growth ── */}
        <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.xxxl, gap: spacing.md }}>
          <SectionLabel
            eyebrow="SIZNING O'SISHINGIZ"
            title={tierTitle(level)}
            action={{ label: `${xpLeft} XP qoldi`, onPress: () => router.push('/me/coins') }}
          />
          <Horizon level={level} progress={progress} nextMilestoneLabel={`Level ${level + 1}`} />
          <Ledger>
            {streak > 0 ? (
              <LedgerEntry
                icon="flame" tone="win" delta={`${streak}-kun`}
                label="Streak davom etmoqda" sublabel="Har kuni faol bo'ling"
                onPress={() => router.push('/me/coins')}
              />
            ) : (
              <LedgerEntry
                icon="sparkles" tone="xp"
                label="Bugun birinchi qadamni qo'ying"
                sublabel="Streak shu yerda boshlanadi"
              />
            )}
          </Ledger>
        </View>

        {/* ── Darslar ── */}
        <View style={{ marginTop: spacing.xxl, gap: spacing.lg }}>
          <View style={{ paddingHorizontal: spacing.lg }}>
            <SectionLabel
              eyebrow="BUGUN"
              title="Oldindagi darslar"
              action={lessons.length > 0
                ? { label: 'Barchasi', onPress: () => router.push('/schedule') }
                : undefined}
            />
          </View>
          {loading ? (
            <View style={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>
              <Skel w="100%" h={64} /><Skel w="100%" h={64} />
            </View>
          ) : lessons.length > 0 ? (
            <View style={{ paddingHorizontal: spacing.lg }}>
              <Ledger>
                {lessons.slice(0, 4).map((l: any, i: number) => {
                  const state  = lessonStateAt(l);
                  const active = state === 'active';
                  const done   = state === 'done';
                  return (
                    <LedgerEntry
                      key={l?.id ?? i} index={i}
                      icon={done ? 'checkmark-circle' : active ? 'radio-button-on' : 'time'}
                      tone={done ? 'xp' : active ? 'win' : 'neutral'}
                      label={l?.subject?.name ?? 'Fan'}
                      sublabel={[
                        l?.startTime,
                        done ? 'tugadi' : active ? 'davom etmoqda' : 'kutilmoqda',
                      ].filter(Boolean).join(' · ')}
                      onPress={() => router.push('/schedule')}
                    />
                  );
                })}
              </Ledger>
            </View>
          ) : (
            <View style={{ paddingHorizontal: spacing.lg }}>
              <LedgerEntry
                icon="cafe" tone="neutral"
                label="Bugun dam kuni"
                sublabel="Tinch dam oling — streak xavfsiz"
              />
            </View>
          )}
        </View>

      </View>
    </ScrollView>
  );
}

// ── Stars (constellation) ─────────────────────────────────────────────────
function Stars() {
  const pts = [
    { x: 0.12, y: 0.18, r: 1.3, o: 0.42 },
    { x: 0.30, y: 0.09, r: 1.9, o: 0.58 },
    { x: 0.60, y: 0.16, r: 1.6, o: 0.50 },
    { x: 0.87, y: 0.22, r: 1.2, o: 0.38 },
    { x: 0.50, y: 0.06, r: 1.0, o: 0.32 },
  ];
  const H = 220;
  return (
    <Svg width={W} height={H} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <RadialGradient id="sg" cx="50%" cy="38%" r="65%">
          <Stop offset="0%"  stopColor="#34C98C" stopOpacity={0.32} />
          <Stop offset="60%" stopColor="#0F9F66" stopOpacity={0.08} />
          <Stop offset="100%" stopColor="#031008" stopOpacity={0}   />
        </RadialGradient>
      </Defs>
      <Path d={`M0 0 L${W} 0 L${W} ${H} L0 ${H}Z`} fill="url(#sg)" />
      <Path
        d={`M${pts[1].x*W} ${pts[1].y*H} L${pts[2].x*W} ${pts[2].y*H}`}
        stroke="#34C98C" strokeWidth={0.6} strokeOpacity={0.18} fill="none"
      />
      {pts.map((p, i) => (
        <Svg key={i}>
          <SvgCircle cx={p.x*W} cy={p.y*H} r={p.r*4} fill="#34C98C" opacity={p.o*0.08} />
          <SvgCircle cx={p.x*W} cy={p.y*H} r={p.r}   fill="#E8FBF1" opacity={p.o*0.88} />
        </Svg>
      ))}
    </Svg>
  );
}

function greetingFor(): string {
  const h = new Date().getHours();
  if (h < 6)  return 'Tonggi soatlar,';
  if (h < 11) return 'Xayrli tong,';
  if (h < 17) return 'Xayrli kun,';
  if (h < 21) return 'Xayrli kech,';
  return 'Tonggi soatlar,';
}

// ── Styles ────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  hero: {
    height: 280,        // explicit height so rounded corners have room
  },
  greetRow: {
    flex: 1,
    paddingTop: 52,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  greetSub: {
    fontFamily: fonts.semibold,
    fontSize: 10,
    letterSpacing: 1.5,
    color: 'rgba(232,251,241,0.62)',
    textTransform: 'uppercase',
  },
  avatarFrame: {
    width: 44, height: 44, borderRadius: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.28)',
    overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
  },
  notifBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  badge: {
    position: 'absolute', top: 8, right: 9,
    minWidth: 16, height: 16, borderRadius: 8,
    borderWidth: 1.5, borderColor: '#04140E',
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
  },

  content: {
    // background + radius set inline; just spacing here
    paddingBottom: spacing.xxxl,
  },

  statsRow: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  statChip:  { flex: 1, flexDirection: 'row' },
  statDiv:   { width: 1, alignSelf: 'stretch', marginVertical: 12 },
  statInner: { flex: 1, alignItems: 'center', paddingVertical: 14, gap: 3 },
});
