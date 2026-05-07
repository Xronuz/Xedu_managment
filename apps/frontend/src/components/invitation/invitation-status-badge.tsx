import { cn } from '@/lib/utils';
import type { InvitationStatus } from '@/lib/api/invitations';

interface InvitationStatusBadgeProps {
  status: InvitationStatus;
  className?: string;
}

const styles: Record<InvitationStatus, string> = {
  PENDING:  'bg-xedu-amber/10 text-xedu-amber border-xedu-amber/20',
  ACCEPTED: 'bg-xedu-primary-light/40 text-xedu-primary border-xedu-primary/20',
  EXPIRED:  'bg-xedu-slate-100 text-xedu-slate-500 border-xedu-slate-200 dark:bg-xedu-slate-800/60 dark:text-xedu-slate-400 dark:border-xedu-slate-700',
  REVOKED:  'bg-xedu-ruby/10 text-xedu-ruby border-xedu-ruby/20',
};

const labels: Record<InvitationStatus, string> = {
  PENDING:  'Kutilmoqda',
  ACCEPTED: 'Qabul qilingan',
  EXPIRED:  'Muddati o\'tgan',
  REVOKED:  'Bekor qilingan',
};

export function InvitationStatusBadge({ status, className }: InvitationStatusBadgeProps) {
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border', styles[status], className)}>
      {labels[status]}
    </span>
  );
}
