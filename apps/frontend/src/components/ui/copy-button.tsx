'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

interface CopyButtonProps {
  value: string;
  label?: string;
  size?: 'icon' | 'sm';
  className?: string;
}

export function CopyButton({ value, label, size = 'icon', className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast({
        title: 'Nusxa olindi',
        description: label ? `${label} nusxalandi` : 'Ma\'lumot nusxalandi',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: 'Xatolik',
        description: 'Nusxa olishda xatolik',
        variant: 'destructive',
      });
    }
  };

  if (size === 'sm') {
    return (
      <Button
        variant="ghost"
        size="sm"
        className={className}
        onClick={handleCopy}
      >
        {copied ? <Check className="h-3.5 w-3.5 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
        {copied ? 'Nusxa olindi' : 'Nusxa olish'}
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className={`h-7 w-7 ${className ?? ''}`}
      onClick={handleCopy}
      aria-label="Nusxa olish"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  );
}
