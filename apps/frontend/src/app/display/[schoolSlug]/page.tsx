'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';

// ── Types ─────────────────────────────────────────────────────────────────────
interface ScheduleItem {
  id: string;
  timeSlot: number;
  startTime: string;
  endTime: string;
  roomNumber?: string;
  room?: { id: string; name: string; capacity?: number };
  subject: {
    id: string;
    name: string;
    teacher: { id: string; firstName: string; lastName: string };
  };
  class: { id: string; name: string; gradeLevel: number };
  branch?: { id: string; name: string };
}

interface Branch { id: string; name: string; code: string }

interface DisplayData {
  school: { id: string; name: string; slug: string; phone?: string; logoUrl?: string };
  branch: Branch | null;
  branches: Branch[];
  day: string;
  date: string;
  schedule: ScheduleItem[];
}

// ── Constants ─────────────────────────────────────────────────────────────────
const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') ?? 'http://localhost:3001';
const PUBLIC_API = `${API_URL}/api`;

const DAY_UZ: Record<string, string> = {
  MONDAY: 'Dushanba', TUESDAY: 'Seshanba', WEDNESDAY: 'Chorshanba',
  THURSDAY: 'Payshanba', FRIDAY: 'Juma', SATURDAY: 'Shanba', SUNDAY: 'Yakshanba',
};

const SLOT_COLORS = [
  'bg-indigo-600','bg-violet-600','bg-blue-600','bg-sky-500',
  'bg-cyan-600','bg-teal-600','bg-emerald-600','bg-green-600',
];

function getNowMins() {
  const n = new Date();
  return n.getHours() * 60 + n.getMinutes();
}

// ── Clock ─────────────────────────────────────────────────────────────────────
function Clock() {
  const [time, setTime] = useState('');
  const [date, setDate] = useState('');
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setDate(now.toLocaleDateString('uz-UZ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="text-right">
      <div className="text-5xl font-mono font-bold text-white tabular-nums">{time}</div>
      <div className="text-base text-indigo-200 mt-1 capitalize">{date}</div>
    </div>
  );
}

// ── Lesson Card (sinf bo'yicha view) ─────────────────────────────────────────
function LessonCard({ item }: { item: ScheduleItem }) {
  const color = SLOT_COLORS[(item.timeSlot - 1) % SLOT_COLORS.length];
  const nowMins = getNowMins();
  const [sh, sm] = item.startTime.split(':').map(Number);
  const [eh, em] = item.endTime.split(':').map(Number);
  const startMins = sh * 60 + sm;
  const endMins = eh * 60 + em;
  const isNow = nowMins >= startMins && nowMins < endMins;
  const isPast = nowMins >= endMins;
  const roomLabel = item.room?.name ?? item.roomNumber;

  return (
    <div className={`rounded-xl p-3.5 border transition-all ${
      isNow ? 'border-yellow-400 bg-yellow-900/20 ring-1 ring-yellow-400/50' :
      isPast ? 'border-white/8 opacity-40' : 'border-white/10 bg-white/5'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full ${color} text-white text-xs font-bold shrink-0`}>
          {item.timeSlot}
        </span>
        <span className="text-white/60 text-xs font-mono">{item.startTime}–{item.endTime}</span>
      </div>
      <p className="text-white font-bold text-base leading-tight truncate">{item.subject.name}</p>
      <p className="text-indigo-200 text-xs mt-0.5 truncate">
        {item.subject.teacher.firstName} {item.subject.teacher.lastName}
      </p>
      {roomLabel && (
        <div className="mt-2 inline-flex items-center gap-1 bg-white/10 rounded-full px-2.5 py-0.5 text-xs text-white/70">
          🚪 {roomLabel}
        </div>
      )}
      {isNow && (
        <div className="mt-2 inline-flex items-center gap-1 bg-yellow-400 rounded-full px-2.5 py-0.5 text-xs text-yellow-900 font-bold animate-pulse">
          ▶ Hozir davom etmoqda
        </div>
      )}
    </div>
  );
}

// ── Room Card (xona bo'yicha view) ────────────────────────────────────────────
function RoomCard({ roomLabel, lessons }: { roomLabel: string; lessons: ScheduleItem[] }) {
  const nowMins = getNowMins();
  const current = lessons.find(l => {
    const [sh, sm] = l.startTime.split(':').map(Number);
    const [eh, em] = l.endTime.split(':').map(Number);
    return nowMins >= sh * 60 + sm && nowMins < eh * 60 + em;
  });
  const next = lessons.find(l => {
    const [sh, sm] = l.startTime.split(':').map(Number);
    return sh * 60 + sm > nowMins;
  });

  return (
    <div className={`rounded-2xl overflow-hidden border-2 transition-all ${
      current ? 'border-yellow-400 shadow-yellow-500/20 shadow-lg' : 'border-white/10'
    }`}>
      {/* Room header */}
      <div className={`px-5 py-3 flex items-center justify-between ${
        current ? 'bg-yellow-600/30' : 'bg-white/8'
      }`}>
        <div className="flex items-center gap-2">
          <span className="text-2xl">🚪</span>
          <h2 className="text-lg font-bold text-white">{roomLabel}</h2>
        </div>
        {current && (
          <span className="text-xs bg-yellow-400 text-yellow-900 font-bold px-2 py-0.5 rounded-full animate-pulse">
            BAND
          </span>
        )}
      </div>

      <div className="p-4 space-y-3">
        {/* Hozirgi dars */}
        {current ? (
          <div className="rounded-xl bg-yellow-900/20 border border-yellow-400/30 p-3">
            <p className="text-yellow-300 text-xs font-bold mb-1">▶ HOZIR</p>
            <p className="text-white font-bold text-lg">{current.subject.name}</p>
            <p className="text-indigo-200 text-sm">{current.class.name}-sinf</p>
            <p className="text-white/60 text-xs mt-1">
              {current.subject.teacher.firstName} {current.subject.teacher.lastName}
              {' · '}{current.startTime}–{current.endTime}
            </p>
          </div>
        ) : (
          <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-center">
            <p className="text-white/40 text-sm">Bo'sh</p>
          </div>
        )}

        {/* Keyingi dars */}
        {next && (
          <div className="rounded-xl bg-white/5 border border-white/8 p-3">
            <p className="text-indigo-300 text-xs font-bold mb-1">KEYINGI</p>
            <p className="text-white/90 font-semibold">{next.subject.name}</p>
            <p className="text-white/60 text-xs">{next.class.name}-sinf · {next.startTime}</p>
          </div>
        )}

        {/* Bugungi barcha darslar */}
        <div className="space-y-1.5">
          {lessons.sort((a, b) => a.timeSlot - b.timeSlot).map(l => {
            const [sh, sm] = l.startTime.split(':').map(Number);
            const [eh, em] = l.endTime.split(':').map(Number);
            const isNow = nowMins >= sh * 60 + sm && nowMins < eh * 60 + em;
            const isPast = nowMins >= eh * 60 + em;
            return (
              <div key={l.id} className={`flex items-center gap-2 text-xs rounded-lg px-2 py-1.5 ${
                isNow ? 'bg-yellow-500/20 text-yellow-200' :
                isPast ? 'text-white/30' : 'text-white/60 bg-white/5'
              }`}>
                <span className="font-mono w-10 shrink-0">{l.startTime}</span>
                <span className="truncate">{l.subject.name}</span>
                <span className="ml-auto shrink-0">{l.class.name}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Ticker ────────────────────────────────────────────────────────────────────
function Ticker({ items }: { items: string[] }) {
  if (!items.length) return null;
  const text = items.join('   •   ');
  return (
    <div className="overflow-hidden bg-indigo-800/60 border-t border-white/10 py-2 px-4">
      <div className="flex whitespace-nowrap animate-[ticker_30s_linear_infinite]">
        <span className="text-indigo-200 text-sm pr-20">{text}</span>
        <span className="text-indigo-200 text-sm pr-20">{text}</span>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function DisplayPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const schoolSlug = params.schoolSlug as string;
  const branchId = searchParams.get('branchId') ?? '';

  const [data, setData] = useState<DisplayData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [view, setView] = useState<'class' | 'room'>('class');
  const socketRef = useRef<Socket | null>(null);

  const fetchSchedule = useCallback(async () => {
    try {
      const url = `${PUBLIC_API}/v1/display/${schoolSlug}${branchId ? `?branchId=${branchId}` : ''}`;
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`Server xatosi: ${res.status}`);
      const json = await res.json();
      setData(json.data ?? json);
      setError(null);
    } catch (e: any) {
      setError(e.message ?? 'Ma\'lumot yuklanmadi');
    } finally {
      setLoading(false);
    }
  }, [schoolSlug, branchId]);

  // WebSocket
  useEffect(() => {
    if (!schoolSlug) return;
    const socket = io(API_URL, {
      query: { schoolSlug },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 3000,
    });
    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join:display', { schoolSlug });
    });
    socket.on('disconnect', () => setConnected(false));
    socket.on('schedule:live', (updated: any) => {
      if (updated?.schedule) {
        setData(prev => prev ? { ...prev, schedule: updated.schedule } : prev);
      } else {
        fetchSchedule();
      }
      setLastUpdate(new Date());
    });
    socketRef.current = socket;
    return () => { socket.disconnect(); socketRef.current = null; };
  }, [schoolSlug, fetchSchedule]);

  useEffect(() => {
    fetchSchedule();
    const id = setInterval(fetchSchedule, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [fetchSchedule]);

  // ── Group by class ───────────────────────────────────────────────────────────
  const byClass = (data?.schedule ?? []).reduce<Record<string, { className: string; grade: number; items: ScheduleItem[] }>>(
    (acc, item) => {
      const key = item.class.id;
      if (!acc[key]) acc[key] = { className: item.class.name, grade: item.class.gradeLevel, items: [] };
      acc[key].items.push(item);
      return acc;
    }, {},
  );
  const classes = Object.values(byClass).sort((a, b) => a.grade - b.grade || a.className.localeCompare(b.className, 'uz'));

  // ── Group by room ────────────────────────────────────────────────────────────
  const byRoom = (data?.schedule ?? []).reduce<Record<string, ScheduleItem[]>>(
    (acc, item) => {
      const key = item.room?.name ?? item.roomNumber ?? 'Xona belgilanmagan';
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {},
  );
  const rooms = Object.entries(byRoom).sort(([a], [b]) => a.localeCompare(b, 'uz'));

  // Ticker items — currently active lessons
  const nowMins = getNowMins();
  const tickerItems = (data?.schedule ?? [])
    .filter(l => {
      const [sh, sm] = l.startTime.split(':').map(Number);
      const [eh, em] = l.endTime.split(':').map(Number);
      return nowMins >= sh * 60 + sm && nowMins < eh * 60 + em;
    })
    .map(l => `${l.class.name} — ${l.subject.name} (${l.room?.name ?? l.roomNumber ?? ''})`);

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-indigo-900 to-violet-950 flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-indigo-200 text-xl">Yuklanmoqda...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-indigo-900 to-violet-950 flex items-center justify-center">
      <div className="text-center space-y-4 max-w-md">
        <div className="text-6xl">⚠️</div>
        <p className="text-white text-2xl font-bold">Xatolik</p>
        <p className="text-indigo-300">{error}</p>
        <button onClick={fetchSchedule} className="mt-4 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-colors">
          Qayta urinish
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-indigo-900 to-violet-950 text-white flex flex-col">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-white/10 bg-black/20 flex-shrink-0">
        <div className="flex items-center gap-4">
          {data?.school.logoUrl ? (
            <img src={data.school.logoUrl} alt="logo" className="w-12 h-12 rounded-xl object-cover" />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-2xl font-bold">🏫</div>
          )}
          <div>
            <h1 className="text-2xl font-bold">{data?.school.name ?? schoolSlug}</h1>
            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
              <span className="text-indigo-300 text-sm">
                {data?.branch ? `${data.branch.name} · ` : ''}{DAY_UZ[data?.day ?? ''] ?? ''} — Dars jadvali
              </span>
              <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium ${
                connected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
                {connected ? 'Live' : 'Offline'}
              </span>
              {lastUpdate && (
                <span className="text-white/40 text-xs">
                  {lastUpdate.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* Branch switcher */}
          {(data?.branches?.length ?? 0) > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => router.push(`/display/${schoolSlug}`)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  !branchId ? 'bg-white/20 text-white' : 'text-white/50 hover:text-white/80'
                }`}
              >
                Hammasi
              </button>
              {data?.branches.map(b => (
                <button
                  key={b.id}
                  onClick={() => router.push(`/display/${schoolSlug}?branchId=${b.id}`)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    branchId === b.id ? 'bg-indigo-500 text-white' : 'text-white/50 hover:text-white/80'
                  }`}
                >
                  {b.name}
                </button>
              ))}
            </div>
          )}

          {/* View toggle */}
          <div className="flex items-center bg-white/10 rounded-lg p-0.5">
            <button
              onClick={() => setView('class')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                view === 'class' ? 'bg-indigo-600 text-white' : 'text-white/60 hover:text-white'
              }`}
            >
              📚 Sinflar
            </button>
            <button
              onClick={() => setView('room')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                view === 'room' ? 'bg-indigo-600 text-white' : 'text-white/60 hover:text-white'
              }`}
            >
              🚪 Xonalar
            </button>
          </div>

          <Clock />
        </div>
      </header>

      {/* ── Main ───────────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-auto p-5">
        {view === 'class' ? (
          classes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 py-20">
              <div className="text-7xl">📅</div>
              <p className="text-2xl font-bold text-white/80">Bugun darslar yo'q</p>
              <p className="text-indigo-300">Dam olish kuni yoki jadval kiritilmagan</p>
            </div>
          ) : (
            <div className="grid gap-5 xl:grid-cols-3 lg:grid-cols-2 grid-cols-1">
              {classes.map(({ className, items }) => (
                <div key={className} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                  <div className="px-5 py-3 bg-indigo-700/40 border-b border-white/10 flex items-center justify-between">
                    <h2 className="text-lg font-bold">{className}-sinf</h2>
                    <span className="text-sm text-indigo-300">{items.length} ta dars</span>
                  </div>
                  <div className="p-4 space-y-2.5">
                    {items.sort((a, b) => a.timeSlot - b.timeSlot).map(item => (
                      <LessonCard key={item.id} item={item} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          rooms.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 py-20">
              <div className="text-7xl">🚪</div>
              <p className="text-2xl font-bold text-white/80">Xona ma'lumotlari yo'q</p>
              <p className="text-indigo-300">Jadvaldagi darslar uchun xona belgilanmagan</p>
            </div>
          ) : (
            <div className="grid gap-5 xl:grid-cols-3 lg:grid-cols-2 grid-cols-1">
              {rooms.map(([roomLabel, lessons]) => (
                <RoomCard key={roomLabel} roomLabel={roomLabel} lessons={lessons} />
              ))}
            </div>
          )
        )}
      </main>

      {/* ── Ticker ─────────────────────────────────────────────────────────── */}
      <Ticker items={tickerItems} />

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="px-6 py-2.5 border-t border-white/10 bg-black/20 flex items-center justify-between text-xs text-white/40 flex-shrink-0">
        <span>Xedu — Ta'lim boshqaruv tizimi</span>
        <span>
          {data?.school.phone && `📞 ${data.school.phone}  ·  `}
          Real-time yangilanadi
        </span>
      </footer>

      <style>{`
        @keyframes ticker {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
