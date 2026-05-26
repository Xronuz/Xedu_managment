'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Wrench, Loader2, AlertTriangle, CheckCircle2, UserCheck,
  ArrowRightLeft, CalendarClock, DoorOpen, Info, ChevronDown, ChevronUp,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { scheduleRepairApi, type AnalyzeRepairInput, type RepairOption } from '@/lib/api/schedule-repair';
import { useToast } from '@/components/ui/use-toast';

interface ScheduleRepairPanelProps {
  input: AnalyzeRepairInput;
  onApplied?: () => void;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  substitute_teacher: <UserCheck className="h-4 w-4" />,
  room_swap: <DoorOpen className="h-4 w-4" />,
  reschedule_lesson: <CalendarClock className="h-4 w-4" />,
  teacher_swap: <ArrowRightLeft className="h-4 w-4" />,
};

const TYPE_LABELS: Record<string, string> = {
  substitute_teacher: "O'qituvchi almashtirish",
  room_swap: 'Xona almashtirish',
  reschedule_lesson: 'Dars vaqtini o\'zgartirish',
  teacher_swap: "O'qituvchilar almashuvi",
};

const IMPACT_COLORS: Record<string, string> = {
  low: 'border-green-200 text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400',
  medium: 'border-amber-200 text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400',
  high: 'border-red-200 text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400',
};

export function ScheduleRepairPanel({ input, onApplied }: ScheduleRepairPanelProps) {
  const { toast } = useToast();
  const [expandedOption, setExpandedOption] = useState<string | null>(null);

  const { data: result, isLoading, error } = useQuery({
    queryKey: ['schedule-repair', input],
    queryFn: () => scheduleRepairApi.analyze(input),
    enabled: !!(input.scheduleId || input.leaveRequestId || input.roomId),
  });

  const applyMutation = useMutation({
    mutationFn: scheduleRepairApi.apply,
    onSuccess: (res) => {
      toast({ title: res.message });
      onApplied?.();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast({ variant: 'destructive', title: 'Xato', description: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Xatolik' });
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center gap-3 text-sm text-xedu-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Ta'mir variantlari tahlil qilinmoqda…
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardContent className="p-6 flex items-center gap-3 text-sm text-red-600">
          <AlertTriangle className="h-4 w-4" />
          Tahlil qilishda xatolik yuz berdi
        </CardContent>
      </Card>
    );
  }

  if (!result) return null;

  const safeOptions = result.options.filter(o => o.type === 'substitute_teacher');
  const analyzeOnlyOptions = result.options.filter(o => o.type !== 'substitute_teacher');

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wrench className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-medium">Jadval ta'miri tahlili</CardTitle>
          </div>
          <Badge variant="outline" className="text-[10px]">
            {result.affectedSchedules.length} ta darsga ta'sir
          </Badge>
        </div>
        <p className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400">
          {result.disruption.description}
        </p>
      </CardHeader>

      <CardContent className="space-y-3 pt-0">
        {/* Affected schedules */}
        {result.affectedSchedules.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-xedu-slate-600 dark:text-xedu-slate-300">Ta'sirlangan darslar:</p>
            <div className="flex flex-wrap gap-1.5">
              {result.affectedSchedules.map(s => (
                <span key={`${s.scheduleId}-${s.date}`} className="text-[10px] px-2 py-0.5 rounded bg-muted">
                  {s.date} · {s.subjectName} · {s.className} · {s.dayOfWeek} {s.timeSlot}-slot
                </span>
              ))}
            </div>
          </div>
        )}

        <Separator />

        {/* Safe options (substitution only) */}
        {safeOptions.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-green-600 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Qo'llash mumkin variantlar
            </p>
            {safeOptions.map(option => (
              <RepairOptionCard
                key={option.id}
                option={option}
                isExpanded={expandedOption === option.id}
                onToggle={() => setExpandedOption(expandedOption === option.id ? null : option.id)}
                onApply={() => applyMutation.mutate({
                  optionId: option.id,
                  type: option.type,
                  scheduleId: option.payload.scheduleId,
                  date: option.payload.date,
                  substituteTeacherId: option.payload.substituteTeacherId,
                })}
                isApplying={applyMutation.isPending}
              />
            ))}
          </div>
        )}

        {/* Analyze-only options */}
        {analyzeOnlyOptions.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-amber-600 flex items-center gap-1">
              <Info className="h-3 w-3" /> Faqat tahlil (hozircha qo'llanilmaydi)
            </p>
            {analyzeOnlyOptions.map(option => (
              <RepairOptionCard
                key={option.id}
                option={option}
                isExpanded={expandedOption === option.id}
                onToggle={() => setExpandedOption(expandedOption === option.id ? null : option.id)}
                readOnly
              />
            ))}
          </div>
        )}

        {result.options.length === 0 && (
          <p className="text-xs text-xedu-slate-500 text-center py-2">Variant topilmadi</p>
        )}
      </CardContent>
    </Card>
  );
}

function RepairOptionCard({
  option,
  isExpanded,
  onToggle,
  onApply,
  isApplying,
  readOnly,
}: {
  option: RepairOption;
  isExpanded: boolean;
  onToggle: () => void;
  onApply?: () => void;
  isApplying?: boolean;
  readOnly?: boolean;
}) {
  return (
    <div className="border rounded-md overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-2.5 text-left hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xedu-slate-500">{TYPE_ICONS[option.type]}</span>
          <div className="min-w-0">
            <p className="text-xs font-medium truncate">{TYPE_LABELS[option.type]}</p>
            <p className="text-[10px] text-xedu-slate-500 truncate">{option.explanation}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="outline" className={`text-[10px] h-5 ${IMPACT_COLORS[option.impact]}`}>
            {option.score} ball
          </Badge>
          {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </div>
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 space-y-2 border-t bg-muted/20">
          <div className="pt-2 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-xedu-slate-500">Ishonch</span>
              <span className="font-medium">{Math.round(option.confidence * 100)}%</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-xedu-slate-500">Ta'sir darajasi</span>
              <span className="font-medium">
                {option.impact === 'low' ? 'Past' : option.impact === 'medium' ? 'O\'rtacha' : 'Yuqori'}
              </span>
            </div>
            {option.requiredActions.length > 0 && (
              <div className="text-xs">
                <span className="text-xedu-slate-500">Kerakli harakatlar:</span>
                <ul className="mt-0.5 ml-3 list-disc text-xedu-slate-600">
                  {option.requiredActions.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {!readOnly && onApply && (
            <Button
              size="sm"
              className="h-7 text-xs w-full"
              onClick={onApply}
              disabled={isApplying}
            >
              {isApplying && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
              Qo'llash
            </Button>
          )}
          {readOnly && (
            <p className="text-[10px] text-amber-600 text-center py-1">
              Bu variant hozircha faqat tahlil uchun ko'rsatiladi
            </p>
          )}
        </div>
      )}
    </div>
  );
}
