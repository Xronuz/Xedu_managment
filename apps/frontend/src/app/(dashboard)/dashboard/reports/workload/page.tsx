'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart2, BookOpen, AlertTriangle, AlertCircle, Users,
  Activity, ArrowUpRight, ArrowDownRight, Minus,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { StandardEmptyState } from '@/components/ui/standard-empty-state';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { teachingLoadApi, TeacherWorkload } from '@/lib/api/teaching-load';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

// ── Status helpers ────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  underloaded: { label: 'Kam yuk', color: 'text-blue-500', bg: 'bg-blue-500/10', bar: '#3b82f6' },
  balanced:    { label: 'Muvozanat', color: 'text-green-500', bg: 'bg-green-500/10', bar: '#22c55e' },
  overloaded:  { label: 'Oshiqcha', color: 'text-red-500', bg: 'bg-red-500/10', bar: '#ef4444' },
};

function StatusBadge({ status, percent }: { status: string; percent: number }) {
  const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.balanced;
  return (
    <Badge variant="outline" className={`${cfg.color} ${cfg.bg} border-transparent`}>
      {cfg.label} ({percent}%)
    </Badge>
  );
}

function UtilizationIcon({ status }: { status: string }) {
  if (status === 'overloaded') return <ArrowUpRight className="h-4 w-4 text-red-500" />;
  if (status === 'underloaded') return <ArrowDownRight className="h-4 w-4 text-blue-500" />;
  return <Minus className="h-4 w-4 text-green-500" />;
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function WorkloadPage() {
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['teaching-loads', 'workload', 'summary'],
    queryFn: () => teachingLoadApi.getWorkloadSummary(),
  });

  const { data: workloads, isLoading: workloadsLoading } = useQuery({
    queryKey: ['teaching-loads', 'workload', 'teachers'],
    queryFn: () => teachingLoadApi.getTeacherWorkloads(),
  });

  const isLoading = summaryLoading || workloadsLoading;
  const router = useRouter();

  if (!isLoading && (!workloads || workloads.length === 0)) {
    return (
      <div className="max-w-2xl mx-auto pt-10">
        <h1 className="text-2xl font-bold flex items-center gap-2 mb-2">
          <BarChart2 className="h-6 w-6 text-primary" /> O&apos;qituvchi ish yuklamasi
        </h1>
        <StandardEmptyState
          icon={Users}
          title="O'qituvchi yuklamalari yo'q"
          description="Ish yuklamasi hisobotini ko'rish uchun avval o'qituvchi yuklamalarini qo'shing."
          primaryAction={{
            label: "Yuklamalarni qo'shish",
            onClick: () => router.push('/dashboard/teaching-loads'),
          }}
        />
      </div>
    );
  }

  const chartData = (workloads ?? [])
    .filter(t => t.plannedWeeklyHours > 0)
    .sort((a, b) => b.plannedWeeklyHours - a.plannedWeeklyHours)
    .slice(0, 14)
    .map(t => ({
      name: `${t.firstName[0]}. ${t.lastName}`,
      planned: t.plannedWeeklyHours,
      contract: t.contractualWeeklyHours,
      status: t.status,
    }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart2 className="h-6 w-6 text-primary" /> O&apos;qituvchi ish yuklamasi
        </h1>
        <p className="text-xedu-slate-500 dark:text-xedu-slate-400">
          Rejalashtirilgan soatlar va shartnoma ma&apos;qomi bo&apos;yicha tahlil
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          [...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)
        ) : (
          <>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-violet-500/10"><Users className="h-5 w-5 text-violet-500" /></div>
                <div>
                  <p className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400">Jami o&apos;qituvchilar</p>
                  <p className="text-2xl font-bold">{summary?.totalTeachers ?? 0}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-500/10"><BookOpen className="h-5 w-5 text-blue-500" /></div>
                <div>
                  <p className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400">Rejalashtirilgan soatlar</p>
                  <p className="text-2xl font-bold">{summary?.totalPlannedHours ?? 0}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-green-500/10"><Activity className="h-5 w-5 text-green-500" /></div>
                <div>
                  <p className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400">O&apos;rtacha foydalanish</p>
                  <p className="text-2xl font-bold">{summary?.avgUtilizationPercent ?? 0}%</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-red-500/10"><AlertTriangle className="h-5 w-5 text-red-500" /></div>
                <div>
                  <p className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400">Oshiqcha yuklama</p>
                  <p className="text-2xl font-bold">{summary?.overloadedCount ?? 0}</p>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Distribution mini-cards */}
      {!isLoading && summary && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Card className="border-blue-200 dark:border-blue-800">
            <CardContent className="p-3 flex items-center justify-between">
              <span className="text-sm text-blue-600 dark:text-blue-400">Kam yuk</span>
              <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{summary.underloadedCount}</span>
            </CardContent>
          </Card>
          <Card className="border-green-200 dark:border-green-800">
            <CardContent className="p-3 flex items-center justify-between">
              <span className="text-sm text-green-600 dark:text-green-400">Muvozanatda</span>
              <span className="text-lg font-bold text-green-600 dark:text-green-400">{summary.balancedCount}</span>
            </CardContent>
          </Card>
          <Card className="border-red-200 dark:border-red-800">
            <CardContent className="p-3 flex items-center justify-between">
              <span className="text-sm text-red-600 dark:text-red-400">Oshiqcha</span>
              <span className="text-lg font-bold text-red-600 dark:text-red-400">{summary.overloadedCount}</span>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Alerts */}
      {!isLoading && summary && summary.alerts.length > 0 && (
        <div className="space-y-2">
          {summary.alerts.slice(0, 5).map((alert, i) => (
            <div
              key={i}
              className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${
                alert.severity === 'danger'
                  ? 'border-red-200 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800'
                  : 'border-yellow-200 bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800'
              }`}
            >
              {alert.severity === 'danger' ? (
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              )}
              <span>{alert.message}</span>
            </div>
          ))}
          {summary.alerts.length > 5 && (
            <p className="text-xs text-xedu-slate-400 pl-1">
              +{summary.alerts.length - 5} ta ogohlantirish ko&apos;rsatilmadi
            </p>
          )}
        </div>
      )}

      {/* Chart */}
      {!isLoading && chartData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Soatlar taqqoslash (reja vs shartnoma)</CardTitle>
            <CardDescription>Eng yuqori yuklama olayotgan 14 ta o&apos;qituvchi</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(v: number, name: string) => [
                    v,
                    name === 'planned' ? 'Reja' : 'Shartnoma',
                  ]}
                />
                <Bar dataKey="planned" radius={[3, 3, 0, 0]} name="planned" barSize={16}>
                  {chartData.map((d, i) => (
                    <Cell key={i} fill={STATUS_CONFIG[d.status as keyof typeof STATUS_CONFIG]?.bar ?? '#94a3b8'} />
                  ))}
                </Bar>
                <Bar dataKey="contract" fill="#e2e8f0" radius={[3, 3, 0, 0]} name="contract" barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Batafsil jadval</CardTitle>
          <CardDescription>Barcha o&apos;qituvchilar ish yuklamasi</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14" />)}
            </div>
          ) : !workloads || workloads.length === 0 ? (
            <StandardEmptyState
              icon={Users}
              title="O'qituvchilar topilmadi"
              description="Jadvalda ko'rsatish uchun ma'lumot mavjud emas."
              primaryAction={{
                label: "Yuklamalarni qo'shish",
                onClick: () => router.push('/dashboard/teaching-loads'),
              }}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2.5 pr-3 font-medium text-xedu-slate-500 dark:text-xedu-slate-400">O&apos;qituvchi</th>
                    <th className="text-left py-2.5 font-medium text-xedu-slate-500 dark:text-xedu-slate-400">Filial</th>
                    <th className="text-center py-2.5 font-medium text-xedu-slate-500 dark:text-xedu-slate-400">Soat/hafta</th>
                    <th className="text-center py-2.5 font-medium text-xedu-slate-500 dark:text-xedu-slate-400">Shartnoma</th>
                    <th className="text-center py-2.5 font-medium text-xedu-slate-500 dark:text-xedu-slate-400">Foydalanish</th>
                    <th className="text-center py-2.5 font-medium text-xedu-slate-500 dark:text-xedu-slate-400">Sinflar</th>
                    <th className="text-center py-2.5 font-medium text-xedu-slate-500 dark:text-xedu-slate-400">Fanlar</th>
                    <th className="text-right py-2.5 font-medium text-xedu-slate-500 dark:text-xedu-slate-400">Holat</th>
                  </tr>
                </thead>
                <tbody>
                  {workloads.map(t => (
                    <tr key={t.teacherId} className="border-b last:border-0 hover:bg-xedu-slate-50/80 dark:hover:bg-xedu-slate-700/30 transition-colors">
                      <td className="py-2.5 pr-3">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7">
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">
                              {t.firstName[0]}{t.lastName[0]}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{t.firstName} {t.lastName}</span>
                        </div>
                      </td>
                      <td className="py-2.5 text-xedu-slate-500 dark:text-xedu-slate-400 text-xs">{t.branchName}</td>
                      <td className="py-2.5 text-center font-semibold">{t.plannedWeeklyHours}</td>
                      <td className="py-2.5 text-center text-xedu-slate-500 dark:text-xedu-slate-400">
                        {t.contractualWeeklyHours > 0 ? t.contractualWeeklyHours : '—'}
                      </td>
                      <td className="py-2.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <UtilizationIcon status={t.status} />
                          <span className={`font-medium ${
                            t.utilizationPercent > 110 ? 'text-red-500' :
                            t.utilizationPercent < 80 ? 'text-blue-500' : 'text-green-500'
                          }`}>{t.utilizationPercent}%</span>
                        </div>
                      </td>
                      <td className="py-2.5 text-center text-xedu-slate-500 dark:text-xedu-slate-400">{t.classCount}</td>
                      <td className="py-2.5 text-center text-xedu-slate-500 dark:text-xedu-slate-400">{t.subjectCount}</td>
                      <td className="py-2.5 text-right">
                        <StatusBadge status={t.status} percent={t.utilizationPercent} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-xedu-slate-500 dark:text-xedu-slate-400">
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-blue-400 shrink-0" />Kam yuk (&lt;80%)</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-green-400 shrink-0" />Muvozanat (80–110%)</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-red-400 shrink-0" />Oshiqcha (&gt;110%)</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-slate-300 shrink-0" />Shartnoma soati</span>
      </div>
    </div>
  );
}
