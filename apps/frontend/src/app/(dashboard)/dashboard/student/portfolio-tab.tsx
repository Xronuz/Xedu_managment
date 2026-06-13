'use client';

import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { uz } from 'date-fns/locale';
import {
  Trophy, Medal, Languages, Award, Palette, Star, FileText, ExternalLink,
  ShieldCheck, Coins, Loader2,
} from 'lucide-react';
import { portfolioApi, type PortfolioCategory, type PortfolioLevel } from '@/lib/api/portfolio';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const CATEGORY: Record<PortfolioCategory, { label: string; icon: React.ElementType; color: string }> = {
  sport: { label: 'Sport', icon: Trophy, color: 'text-amber-600 bg-amber-100' },
  language_certificate: { label: 'Til sertifikati', icon: Languages, color: 'text-blue-600 bg-blue-100' },
  olympiad: { label: 'Olimpiada', icon: Medal, color: 'text-purple-600 bg-purple-100' },
  academic: { label: 'Akademik', icon: Award, color: 'text-green-600 bg-green-100' },
  arts: { label: "San'at", icon: Palette, color: 'text-pink-600 bg-pink-100' },
  other: { label: 'Boshqa', icon: Star, color: 'text-slate-600 bg-slate-100' },
};
const LEVEL: Record<PortfolioLevel, string> = {
  school: 'Maktab', district: 'Tuman', region: 'Viloyat', republic: 'Respublika', international: 'Xalqaro',
};

function fmt(d?: string | null) {
  if (!d) return '';
  try { return format(new Date(d), 'd MMM yyyy', { locale: uz }); } catch { return ''; }
}

export function StudentPortfolioTab({ studentId }: { studentId: string }) {
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['my-portfolio', studentId],
    queryFn: () => portfolioApi.list(studentId),
    enabled: !!studentId,
  });

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center py-10 gap-2 text-center">
        <Trophy className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">Hozircha yutuqlar kiritilmagan</p>
        <p className="text-xs text-muted-foreground/70">Sport, olimpiada yoki sertifikat yutuqlaringiz shu yerda ko'rinadi</p>
      </div>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {items.map((it) => {
        const cat = CATEGORY[it.category] ?? CATEGORY.other;
        const Icon = cat.icon;
        return (
          <div key={it.id} className={cn('rounded-lg border p-3 space-y-2', !it.verified && 'border-dashed opacity-90')}>
            <div className="flex items-start gap-3">
              <div className={cn('rounded-lg p-2 shrink-0', cat.color)}><Icon className="h-5 w-5" /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-sm">{it.title}</p>
                  {it.verified && <Badge variant="success" className="gap-1"><ShieldCheck className="h-3 w-3" /> Tasdiqlangan</Badge>}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {cat.label}
                  {it.level && ` · ${LEVEL[it.level]}`}
                  {it.result && ` · ${it.result}`}
                </p>
                {it.issuer && <p className="text-xs text-muted-foreground/70">{it.issuer}</p>}
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
              <span>{fmt(it.achievedAt)}</span>
              {it.coinReward > 0 && it.verified && (
                <span className="inline-flex items-center gap-0.5 text-amber-600"><Coins className="h-3 w-3" /> {it.coinReward}</span>
              )}
              {it.fileUrl && (
                <a href={it.fileUrl} target="_blank" rel="noopener noreferrer"
                   className="inline-flex items-center gap-0.5 text-primary hover:underline">
                  <FileText className="h-3 w-3" /> Sertifikat <ExternalLink className="h-2.5 w-2.5" />
                </a>
              )}
            </div>
            {it.description && <p className="text-xs text-muted-foreground">{it.description}</p>}
          </div>
        );
      })}
    </div>
  );
}
