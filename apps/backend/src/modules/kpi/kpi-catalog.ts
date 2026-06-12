import { KpiCategory, KpiDirection } from '@prisma/client';

/**
 * Tizim metrikalari katalogi.
 * Har bir element Xedu ichidagi operatsion ma'lumotdan avtomatik
 * hisoblanadigan KPI shablonini tavsiflaydi. Hisoblash mantiqi —
 * kpi-snapshot.service.ts dagi computeValue().
 */
export interface KpiCatalogItem {
  key: string;
  name: string;
  description: string;
  category: KpiCategory;
  unit: string;
  direction: KpiDirection;
  defaultTarget: number;
}

export const KPI_CATALOG: KpiCatalogItem[] = [
  {
    key: 'attendance_rate',
    name: 'Davomat foizi',
    description: "Davr ichida kelgan (present + late) yozuvlarning jami davomat yozuvlariga nisbati",
    category: KpiCategory.ACADEMIC,
    unit: '%',
    direction: KpiDirection.HIGHER_IS_BETTER,
    defaultTarget: 95,
  },
  {
    key: 'average_grade',
    name: "O'rtacha o'zlashtirish",
    description: "Davr ichidagi baholarning o'rtacha foizi (ball / maks ball, vaznli)",
    category: KpiCategory.ACADEMIC,
    unit: '%',
    direction: KpiDirection.HIGHER_IS_BETTER,
    defaultTarget: 80,
  },
  {
    key: 'payment_collection_rate',
    name: "To'lov yig'ilishi",
    description: "Davrda muddati kelgan to'lovlarning qancha qismi to'langani (summa bo'yicha)",
    category: KpiCategory.FINANCE,
    unit: '%',
    direction: KpiDirection.HIGHER_IS_BETTER,
    defaultTarget: 90,
  },
  {
    key: 'overdue_debt',
    name: 'Qarzdorlik',
    description: "Davr oxiriga ko'ra muddati o'tgan va to'lanmagan to'lovlar summasi",
    category: KpiCategory.FINANCE,
    unit: "so'm",
    direction: KpiDirection.LOWER_IS_BETTER,
    defaultTarget: 0,
  },
  {
    key: 'lead_conversion_rate',
    name: 'Lead konversiyasi',
    description: "Davr ichida o'quvchiga aylantirilgan leadlar / davr ichida yaratilgan leadlar",
    category: KpiCategory.MARKETING,
    unit: '%',
    direction: KpiDirection.HIGHER_IS_BETTER,
    defaultTarget: 30,
  },
  {
    key: 'new_leads',
    name: 'Yangi leadlar',
    description: 'Davr ichida CRMga tushgan yangi leadlar soni',
    category: KpiCategory.MARKETING,
    unit: 'ta',
    direction: KpiDirection.HIGHER_IS_BETTER,
    defaultTarget: 0,
  },
];

export const KPI_CATALOG_KEYS = new Set(KPI_CATALOG.map((i) => i.key));

export function getCatalogItem(key: string): KpiCatalogItem | undefined {
  return KPI_CATALOG.find((i) => i.key === key);
}
