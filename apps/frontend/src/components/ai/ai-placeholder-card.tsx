import { Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface AiPlaceholderCardProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  className?: string;
}

export function AiPlaceholderCard({
  title,
  description,
  icon,
  className,
}: AiPlaceholderCardProps) {
  return (
    <Card className={`border-dashed border-xedu-slate-200 dark:border-xedu-slate-700 bg-xedu-slate-50/50 dark:bg-xedu-slate-800/30 ${className ?? ''}`}>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-xedu-slate-100 dark:bg-xedu-slate-800 text-xedu-slate-400">
          {icon ?? <Sparkles className="h-4 w-4" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-xedu-slate-600 dark:text-xedu-slate-300 truncate">{title}</p>
          <p className="text-xs text-xedu-slate-400 dark:text-xedu-slate-500">{description}</p>
        </div>
        <Badge variant="outline" className="text-[10px] shrink-0 border-xedu-slate-300 text-xedu-slate-500 dark:border-xedu-slate-600 dark:text-xedu-slate-400">
          Tez orada
        </Badge>
      </CardContent>
    </Card>
  );
}
