'use client';

import { useRouter } from 'next/navigation';
import { LogOut, User, Settings } from 'lucide-react';
import { cn, getInitials, getRoleLabel } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import { useBranchStore } from '@/store/branch.store';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetContent } from '@/components/ui/sheet';

interface ProfileSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Profile quick-access sheet — opened from the mobile bottom nav's avatar tab. */
export function ProfileSheet({ open, onOpenChange }: ProfileSheetProps) {
  const { user, logout } = useAuthStore();
  const { activeBranchMeta } = useBranchStore();
  const router = useRouter();

  if (!user) return null;

  const initials = getInitials(user.firstName, user.lastName);
  const fullName = `${user.firstName} ${user.lastName}`.trim() || user.email;
  const branchName = activeBranchMeta?.name ?? 'Barcha filiallar';

  const go = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  const handleLogout = async () => {
    onOpenChange(false);
    await logout();
    window.location.href = '/login?reason=logged_out';
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="w-full rounded-t-2xl px-5 pt-2 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-3 pt-2 pb-4">
          <Avatar className="h-12 w-12 shrink-0 ring-2 ring-xedu-slate-100 dark:ring-xedu-slate-800">
            <AvatarImage src={user.avatarUrl ?? undefined} />
            <AvatarFallback className="bg-xedu-emerald/20 text-sm font-bold text-xedu-emerald">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-xedu-slate-900 dark:text-white">{fullName}</p>
            <p className="truncate text-xs text-xedu-slate-500 dark:text-xedu-slate-400">{getRoleLabel(user.role)}</p>
            <p className="truncate text-2xs text-xedu-slate-400 dark:text-xedu-slate-500 mt-0.5">{branchName}</p>
          </div>
        </div>

        <div className="flex flex-col gap-1 pb-1">
          <SheetButton icon={User} label="Profil" onClick={() => go('/dashboard/profile')} />
          <SheetButton icon={Settings} label="Sozlamalar" onClick={() => go('/dashboard/settings')} />
          <SheetButton icon={LogOut} label="Chiqish" onClick={handleLogout} danger />
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SheetButton({
  icon: Icon, label, onClick, danger,
}: { icon: React.ElementType; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors',
        danger
          ? 'text-xedu-ruby hover:bg-xedu-ruby/10'
          : 'text-xedu-slate-700 dark:text-xedu-slate-200 hover:bg-xedu-slate-50 dark:hover:bg-xedu-slate-900',
      )}
    >
      <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.8} />
      {label}
    </button>
  );
}
