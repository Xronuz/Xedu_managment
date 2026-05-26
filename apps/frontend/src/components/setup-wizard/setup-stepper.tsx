'use client';

import { cn } from '@/lib/utils';
import {
  School, Clock, DoorOpen, GraduationCap, BookOpen,
  Wand2, CheckCircle, Rocket,
} from 'lucide-react';

export interface WizardStep {
  id: number;
  label: string;
  shortLabel: string;
  icon: React.ElementType;
}

export const WIZARD_STEPS: WizardStep[] = [
  { id: 1, label: 'Maktab & Filial', shortLabel: 'Maktab', icon: School },
  { id: 2, label: 'Dars davrlari', shortLabel: 'Davrlar', icon: Clock },
  { id: 3, label: 'Xonalar', shortLabel: 'Xonalar', icon: DoorOpen },
  { id: 4, label: 'Sinflar', shortLabel: 'Sinflar', icon: GraduationCap },
  { id: 5, label: "Fanlar & O'qituvchi yuklamalari", shortLabel: "Yuklamalar", icon: BookOpen },
  { id: 6, label: 'Jadval generatsiya', shortLabel: 'Generatsiya', icon: Wand2 },
  { id: 7, label: 'Tekshirish & Nashr', shortLabel: 'Nashr', icon: Rocket },
];

interface SetupStepperProps {
  current: number;
  completed: number[];
  onSelect?: (step: number) => void;
  compact?: boolean;
}

export function SetupStepper({ current, completed, onSelect, compact }: SetupStepperProps) {
  return (
    <div className={cn('flex items-center', compact ? 'gap-1' : 'gap-1.5 sm:gap-2')}> 
      {WIZARD_STEPS.map((step, i) => {
        const isDone = completed.includes(step.id);
        const isActive = step.id === current;
        const Icon = step.icon;
        return (
          <div key={step.id} className="flex items-center">
            <button
              type="button"
              onClick={() => onSelect?.(step.id)}
              disabled={!onSelect}
              className={cn(
                'flex items-center gap-1 rounded-full font-medium transition-all',
                compact ? 'px-2 py-1 text-[10px]' : 'px-2 sm:px-3 py-1.5 text-xs',
                isActive
                  ? 'bg-xedu-primary text-white shadow-sm'
                  : isDone
                  ? 'bg-xedu-primary-light/60 text-xedu-primary dark:bg-xedu-primary/15 dark:text-xedu-primary'
                  : 'bg-xedu-slate-100 text-xedu-slate-500 dark:bg-xedu-slate-800/60 dark:text-xedu-slate-400',
                onSelect && !isActive && 'hover:opacity-80 cursor-pointer',
                !onSelect && 'cursor-default'
              )}
            >
              {isDone && !isActive ? (
                <CheckCircle className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
              ) : (
                <Icon className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
              )}
              <span className="hidden sm:inline">{compact ? step.shortLabel : step.label}</span>
            </button>
            {i < WIZARD_STEPS.length - 1 && (
              <div
                className={cn(
                  'mx-0.5 transition-colors',
                  compact ? 'h-0.5 w-2' : 'h-0.5 w-3 sm:w-6',
                  isDone ? 'bg-xedu-primary/40' : 'bg-xedu-slate-100 dark:bg-xedu-slate-800/60'
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
