'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Coins, ShoppingBag, ArrowLeft, Loader2, History, Award, BookOpen, Calendar, Laptop } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/components/ui/use-toast';
import { coinsApi, type ShopItem, type CoinTransaction } from '@/lib/api/coins';
import { AcademicEmptyState } from '@/components/workspace-system/academic-empty-state';

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  library: BookOpen,
  event: Calendar,
  academic: Award,
  digital: Laptop,
  default: Award,
};

function getCategory(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('kitob') || lower.includes('kutub')) return 'library';
  if (lower.includes('tadbir') || lower.includes('event')) return 'event';
  if (lower.includes('digital') || lower.includes('app') || lower.includes('online')) return 'digital';
  return 'academic';
}

export default function StudentShopPage() {
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'shop' | 'history'>('shop');

  const { data: balanceData, isLoading: balanceLoading } = useQuery({
    queryKey: ['coins', 'balance'],
    queryFn: () => coinsApi.getBalance(),
  });

  const { data: shopItems, isLoading: shopLoading } = useQuery({
    queryKey: ['coins', 'shop'],
    queryFn: () => coinsApi.getShopItems(),
  });

  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ['coins', 'history'],
    queryFn: () => coinsApi.getHistory(50),
  });

  const spendMutation = useMutation({
    mutationFn: (itemId: string) => coinsApi.spend(itemId),
    onSuccess: () => {
      toast({ title: 'Muvaffaqiyatli sotib olindi' });
      queryClient.invalidateQueries({ queryKey: ['coins'] });
    },
    onError: (err: any) => {
      toast({
        variant: 'destructive',
        title: 'Xatolik',
        description: err?.response?.data?.message ?? 'Sotib olishda xatolik',
      });
    },
  });

  const balance = balanceData?.coins ?? 0;
  const activeItems = (shopItems ?? []).filter((i: ShopItem) => i.isActive);

  const reasonLabels: Record<string, string> = {
    grade_excellent: "A'lo baho",
    attendance_weekly: 'Davomat bonusi',
    attendance_monthly: 'Oylik davomat',
    discipline_praise: 'Intizom maqtovi',
    manual_award: 'Mukofot',
    manual_deduct: 'Hisobdorlik',
    homework_consistency: "Uyga vazifa intizomi",
    exam_high_score: "Yuqori imtihon natijasi",
    improvement_milestone: "O'sish",
    participation: 'Faol ishtirok',
    recovery_bonus: 'Tiklanish',
    shop_purchase: 'Sotib olish',
    discipline_warning: 'Intizom ogohlantiruvi',
    repeated_absence: 'Takroriy dars qoldirish',
    repeated_lateness: 'Takroriy kechikish',
    exam_low_score: 'Past imtihon natijasi',
    cheating_incident: 'Nopishtonlik',
    severe_discipline: 'Jiddiy intizom buzilishi',
  };

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/student')}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Orqaga
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-xedu-primary" />
              Mukofotlar markazi
            </h1>
            <p className="text-xedu-slate-500 dark:text-xedu-slate-400 text-xs">
              Erishgan mukofotlarni tanlang
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800 px-4 py-2">
          <Coins className="h-4 w-4 text-emerald-600" />
          <span className="text-base font-bold text-emerald-700 dark:text-emerald-400">
            {balanceLoading ? <Skeleton className="h-5 w-10 inline-block" /> : balance}
          </span>
          <span className="text-xs text-emerald-600 dark:text-emerald-500 font-medium">coin</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <Button
          variant={tab === 'shop' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTab('shop')}
        >
          <Award className="h-4 w-4 mr-1.5" /> Mukofotlar
        </Button>
        <Button
          variant={tab === 'history' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTab('history')}
        >
          <History className="h-4 w-4 mr-1.5" /> Tarix
        </Button>
      </div>

      {/* Shop tab */}
      {tab === 'shop' && (
        <>
          {shopLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </div>
          ) : activeItems.length === 0 ? (
            <AcademicEmptyState
              context="general"
              title="Mukofotlar yo'q"
              description="Hozircha do'konda hech qanday mukofot yo'q"
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {activeItems.map((item: ShopItem) => {
                const canAfford = balance >= item.cost;
                const outOfStock = item.stock !== null && item.stock !== undefined && item.stock <= 0;
                const category = getCategory(item.name);
                const CategoryIcon = CATEGORY_ICONS[category] ?? CATEGORY_ICONS.default;

                return (
                  <Card
                    key={item.id}
                    className={`overflow-hidden transition-all ${
                      canAfford && !outOfStock
                        ? 'hover:shadow-sm'
                        : 'opacity-70'
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-xedu-slate-100 dark:bg-xedu-slate-800 text-xedu-slate-500">
                          <CategoryIcon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold truncate">{item.name}</h3>
                          <p className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400 line-clamp-2 mt-0.5">
                            {item.description || 'Tavsif yo‘q'}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-xs border-emerald-200 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400">
                              <Coins className="h-3 w-3 mr-1" />
                              {item.cost}
                            </Badge>
                            {item.stock !== null && item.stock !== undefined && (
                              <span className="text-xs text-xedu-slate-400">
                                Qoldi: {item.stock}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        className="w-full mt-3 h-8 text-xs"
                        disabled={!canAfford || outOfStock || spendMutation.isPending}
                        onClick={() => spendMutation.mutate(item.id)}
                      >
                        {spendMutation.isPending ? (
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        ) : outOfStock ? (
                          'Tugagan'
                        ) : !canAfford ? (
                          "Yetarli coin yo'q"
                        ) : (
                          'Sotib olish'
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* History tab */}
      {tab === 'history' && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Coin harakatlari</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {historyLoading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 rounded-lg" />
                ))}
              </div>
            ) : !history || history.length === 0 ? (
              <div className="py-8">
                <AcademicEmptyState
                  context="general"
                  title="Tarix bo'sh"
                  description="Hali hech qanday coin harakati yo'q"
                  compact
                />
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="divide-y">
                  {(history as CoinTransaction[]).map((tx) => {
                    const isEarn = tx.amount > 0;
                    return (
                      <div key={tx.id} className="flex items-center gap-3 px-4 py-3">
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isEarn ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' : 'bg-xedu-slate-100 dark:bg-xedu-slate-800 text-xedu-slate-500'}`}>
                          {isEarn ? '+' : '-'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{reasonLabels[tx.reason] ?? tx.reason}</p>
                          <p className="text-xs text-xedu-slate-500">
                            {new Date(tx.createdAt).toLocaleDateString('uz-UZ')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-semibold ${isEarn ? 'text-emerald-600' : 'text-xedu-slate-600'}`}>
                            {isEarn ? '+' : ''}{tx.amount}
                          </p>
                          <p className="text-xs text-xedu-slate-400">{tx.balance} coin</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
