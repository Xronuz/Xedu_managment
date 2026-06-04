'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Monitor, Copy, Check, ExternalLink, Tv, QrCode, Globe, Info } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { useBranchStore } from '@/store/branch.store';
import { branchesApi } from '@/lib/api/branches';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import QRCodeLib from 'qrcode';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? (typeof window !== 'undefined' ? window.location.origin : 'https://xedu.uz');

function QRCodeCanvas({ url }: { url: string }) {
  const [dataUrl, setDataUrl] = useState('');
  useEffect(() => {
    QRCodeLib.toDataURL(url, { width: 200, margin: 2, color: { dark: '#1e1b4b', light: '#ffffff' } })
      .then(setDataUrl)
      .catch(() => setDataUrl(''));
  }, [url]);
  if (!dataUrl) return <div className="w-[200px] h-[200px] bg-xedu-slate-100 dark:bg-xedu-slate-800 rounded-xl animate-pulse" />;
  return <img src={dataUrl} alt="QR kod" className="w-[200px] h-[200px] rounded-xl border" />;
}

export default function DisplayPage() {
  const { user } = useAuthStore();
  const { activeBranchMeta } = useBranchStore();
  const { toast } = useToast();
  const [copied, setCopied] = useState<string | null>(null);

  const isDirector = user?.role === 'director';
  const isBranchAdmin = user?.role === 'branch_admin';

  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: branchesApi.getAll,
    enabled: isDirector,
  });

  // Slug — branchesApi response'da school.slug bor
  const slug: string = (branches as any[])[0]?.school?.slug ?? '';

  const copy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    toast({ title: 'Nusxa olindi!' });
    setTimeout(() => setCopied(null), 2000);
  };

  const displayLinks: { label: string; url: string; branchId?: string; description: string }[] = [];

  // All-school link
  if (slug) {
    displayLinks.push({
      label: 'Barcha filiallar',
      url: `${APP_URL}/display/${slug}`,
      description: 'Barcha filiallarning bugungi dars jadvali',
    });

    // Per-branch links
    if (isDirector && (branches as any[]).length > 0) {
      (branches as any[]).forEach((b: any) => {
        displayLinks.push({
          label: b.name,
          url: `${APP_URL}/display/${slug}?branchId=${b.id}`,
          branchId: b.id,
          description: `${b.name} filialing bugungi dars jadvali`,
        });
      });
    } else if (isBranchAdmin && activeBranchMeta) {
      displayLinks.push({
        label: activeBranchMeta.name,
        url: `${APP_URL}/display/${slug}?branchId=${activeBranchMeta.id}`,
        branchId: activeBranchMeta.id,
        description: `${activeBranchMeta.name} filialing bugungi dars jadvali`,
      });
    }
  }

  const noSlug = !slug;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Monitor className="h-6 w-6 text-indigo-500" />
          Maktab ekrani (Display Board)
        </h1>
        <p className="text-xedu-slate-500 dark:text-xedu-slate-400 text-sm mt-1">
          Maktab monitoriga ulash uchun URL va QR kod. Ota-onalar va tashrifchilar bugungi dars jadvalini real-time ko'radi.
        </p>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 p-4">
        <Info className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
        <div className="text-sm text-indigo-700 dark:text-indigo-300">
          <p className="font-medium mb-0.5">Qanday ulash kerak?</p>
          <ol className="list-decimal list-inside space-y-0.5 text-xs opacity-90">
            <li>Quyidagi URL ni maktab monitorida Chrome/Firefox fullscreen rejimida oching</li>
            <li>Sahifa avtomatik real-time yangilanib turadi</li>
            <li>Jadval nashr etilganda ekranda darhol ko'rinadi</li>
          </ol>
        </div>
      </div>

      {noSlug ? (
        <Card>
          <CardContent className="py-12 text-center space-y-2">
            <Globe className="h-10 w-10 text-xedu-slate-300 mx-auto" />
            <p className="font-medium text-xedu-slate-500">Maktab slug topilmadi</p>
            <p className="text-xs text-xedu-slate-400">Super Admin → Maktablar bo'limida slug belgilanishi kerak</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {displayLinks.map((link, i) => (
            <Card key={i} className={cn(
              'overflow-hidden transition-all',
              i === 0 && !link.branchId ? 'ring-1 ring-indigo-400/30' : ''
            )}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Tv className="h-4 w-4 text-indigo-500" />
                    <CardTitle className="text-base">{link.label}</CardTitle>
                    {!link.branchId && <Badge variant="secondary" className="text-xs">Umumiy</Badge>}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => window.open(link.url, '_blank')}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Ko'rish
                  </Button>
                </div>
                <CardDescription className="text-xs">{link.description}</CardDescription>
              </CardHeader>

              <CardContent className="pt-0">
                <div className="flex flex-col sm:flex-row gap-6">
                  {/* URL */}
                  <div className="flex-1 space-y-2">
                    <p className="text-xs font-medium text-xedu-slate-500 uppercase tracking-wider">Ekran URL</p>
                    <div className="flex items-center gap-2 bg-xedu-slate-50 dark:bg-xedu-slate-900 rounded-lg px-3 py-2 border">
                      <code className="text-sm text-xedu-slate-700 dark:text-xedu-slate-300 flex-1 break-all">
                        {link.url}
                      </code>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 shrink-0"
                        onClick={() => copy(link.url, `url-${i}`)}
                      >
                        {copied === `url-${i}` ? (
                          <Check className="h-3.5 w-3.5 text-green-500" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-xs"
                        onClick={() => copy(link.url, `copy-${i}`)}
                      >
                        <Copy className="h-3.5 w-3.5" />
                        URL nusxalash
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        className="gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700"
                        onClick={() => window.open(link.url, '_blank')}
                      >
                        <Monitor className="h-3.5 w-3.5" />
                        Fullscreen ochish
                      </Button>
                    </div>
                  </div>

                  {/* QR Code */}
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-xs font-medium text-xedu-slate-500 uppercase tracking-wider self-start sm:text-center sm:self-auto">QR Kod</p>
                    <QRCodeCanvas url={link.url} />
                    <p className="text-xs text-xedu-slate-400 text-center max-w-[200px]">
                      Telefondan skanerlang yoki chop eting
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
