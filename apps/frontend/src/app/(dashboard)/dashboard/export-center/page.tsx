'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { exportCenterApi } from '@/lib/api/export-center';
import { ExportCreateModal } from './_components/export-create-modal';
import { ExportHistoryTable } from './_components/export-history-table';

export default function ExportCenterPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['exports'],
    queryFn: () => exportCenterApi.listExports(),
  });

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Eksport markazi</h1>
          <p className="text-sm text-xedu-slate-500">
            Maktab ma&apos;lumotlarini turli formatlarda eksport qilish
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Yangilash
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-2">
            <Download className="h-4 w-4" />
            Yangi eksport
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Jami eksportlar', value: data?.total ?? 0 },
          { label: 'Tayyor', value: data?.data.filter(j => j.status === 'completed').length ?? 0 },
          { label: 'Jarayonda', value: data?.data.filter(j => j.status === 'processing').length ?? 0 },
          { label: 'Xatolik', value: data?.data.filter(j => j.status === 'failed').length ?? 0 },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <p className="text-xs text-xedu-slate-500">{stat.label}</p>
              <p className="text-2xl font-bold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Export History */}
      <Card>
        <CardHeader>
          <CardTitle>Eksport tarixi</CardTitle>
          <CardDescription>
            Barcha eksport joblari va ularning statuslari
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ExportHistoryTable
            jobs={data?.data ?? []}
            isLoading={isLoading}
            onRefresh={refetch}
          />
        </CardContent>
      </Card>

      <ExportCreateModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={refetch}
      />
    </div>
  );
}
