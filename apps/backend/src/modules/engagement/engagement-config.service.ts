import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

// ─── Engagement Config Keys ─────────────────────────────────────────────────

export const ENGAGEMENT_CONFIG_KEYS = {
  // Master switches
  ENGAGEMENT_ENABLED: 'engagement_enabled',
  ENGAGEMENT_POSITIVE: 'engagement_positive',
  ENGAGEMENT_ACCOUNTABILITY: 'engagement_accountability',
  ENGAGEMENT_ACHIEVEMENTS: 'engagement_achievements',
  ENGAGEMENT_STREAKS: 'engagement_streaks',
  ENGAGEMENT_LEADERBOARD: 'engagement_leaderboard',
  ENGAGEMENT_SHOP: 'engagement_shop',
  ENGAGEMENT_TEACHER_AWARD: 'engagement_teacher_award',
  ENGAGEMENT_TEACHER_DEDUCT: 'engagement_teacher_deduct',
  ENGAGEMENT_RECOVERY_ENABLED: 'engagement_recovery_enabled',
  ENGAGEMENT_LEADERBOARD_VISIBLE: 'engagement_leaderboard_visible',
  ENGAGEMENT_PUBLIC_DEDUCTIONS: 'engagement_public_deductions',
  ENGAGEMENT_MONTHLY_EXAM: 'engagement_monthly_exam',
  // Rules & thresholds
  COIN_RULES_POSITIVE: 'coin_rules_positive',
  COIN_RULES_ACCOUNTABILITY: 'coin_rules_accountability',
  COIN_THRESHOLDS: 'coin_thresholds',
  ENGAGEMENT_RECOVERY_RATE: 'engagement_recovery_rate',
  // Premium entitlement flags (future-ready)
  FEATURE_AI_HOMEWORK_CHECKER: 'feature_ai_homework_checker',
  FEATURE_AI_EXAM_GENERATOR: 'feature_ai_exam_generator',
  FEATURE_AI_TUTOR: 'feature_ai_tutor',
  FEATURE_STUDENT_PRO_ANALYTICS: 'feature_student_pro_analytics',
  FEATURE_PARENT_INSIGHTS: 'feature_parent_insights',
  FEATURE_TEACHER_PRO_TOOLS: 'feature_teacher_pro_tools',
  FEATURE_NATIVE_APP: 'feature_native_app',
} as const;

export type EngagementConfigKey = typeof ENGAGEMENT_CONFIG_KEYS[keyof typeof ENGAGEMENT_CONFIG_KEYS];

// ─── Default Values ─────────────────────────────────────────────────────────

export interface CoinRulesPositive {
  grade_excellent: number;
  attendance_weekly: number;
  attendance_monthly: number;
  discipline_praise: number;
  homework_consistency: number;
  exam_high_score: number;
  improvement_milestone: number;
  participation: number;
  recovery_bonus: number;
}

export interface CoinRulesAccountability {
  repeated_absence: number;
  repeated_lateness: number;
  exam_low_score: number;
  cheating_incident: number;
  severe_discipline: number;
  discipline_warning: number;
}

export interface CoinThresholds {
  exam_high: number;
  exam_low: number;
  absence_limit: number;
  lateness_limit: number;
}

export interface EngagementConfig {
  engagement_enabled: boolean;
  engagement_positive: boolean;
  engagement_accountability: boolean;
  engagement_achievements: boolean;
  engagement_streaks: boolean;
  engagement_leaderboard: boolean;
  engagement_shop: boolean;
  engagement_teacher_award: boolean;
  engagement_teacher_deduct: boolean;
  engagement_recovery_enabled: boolean;
  engagement_leaderboard_visible: boolean;
  engagement_public_deductions: boolean;
  engagement_monthly_exam: boolean;
  coin_rules_positive: CoinRulesPositive;
  coin_rules_accountability: CoinRulesAccountability;
  coin_thresholds: CoinThresholds;
  engagement_recovery_rate: number;
  feature_ai_homework_checker: boolean;
  feature_ai_exam_generator: boolean;
  feature_ai_tutor: boolean;
  feature_student_pro_analytics: boolean;
  feature_parent_insights: boolean;
  feature_teacher_pro_tools: boolean;
  feature_native_app: boolean;
}

const DEFAULT_COIN_RULES_POSITIVE: CoinRulesPositive = {
  grade_excellent: 10,
  attendance_weekly: 20,
  attendance_monthly: 50,
  discipline_praise: 100,
  homework_consistency: 15,
  exam_high_score: 20,
  improvement_milestone: 20,
  participation: 15,
  recovery_bonus: 25,
};

const DEFAULT_COIN_RULES_ACCOUNTABILITY: CoinRulesAccountability = {
  repeated_absence: -30,
  repeated_lateness: -15,
  exam_low_score: -15,
  cheating_incident: -100,
  severe_discipline: -50,
  discipline_warning: -50,
};

const DEFAULT_COIN_THRESHOLDS: CoinThresholds = {
  exam_high: 90,
  exam_low: 50,
  absence_limit: 3,
  lateness_limit: 5,
};

const DEFAULTS: EngagementConfig = {
  engagement_enabled: false,
  engagement_positive: true,
  engagement_accountability: false,
  engagement_achievements: false,
  engagement_streaks: false,
  engagement_leaderboard: false,
  engagement_shop: false,
  engagement_teacher_award: false,
  engagement_teacher_deduct: false,
  engagement_recovery_enabled: true,
  engagement_leaderboard_visible: false,
  engagement_public_deductions: false,
  engagement_monthly_exam: false,
  coin_rules_positive: DEFAULT_COIN_RULES_POSITIVE,
  coin_rules_accountability: DEFAULT_COIN_RULES_ACCOUNTABILITY,
  coin_thresholds: DEFAULT_COIN_THRESHOLDS,
  engagement_recovery_rate: 5,
  feature_ai_homework_checker: false,
  feature_ai_exam_generator: false,
  feature_ai_tutor: false,
  feature_student_pro_analytics: false,
  feature_parent_insights: false,
  feature_teacher_pro_tools: false,
  feature_native_app: false,
};

// ─── Type helpers ───────────────────────────────────────────────────────────

function isBooleanKey(key: string): boolean {
  return key.startsWith('engagement_') || key.startsWith('feature_');
}

function isNumberKey(key: string): boolean {
  return key === 'engagement_recovery_rate';
}

function isJsonKey(key: string): boolean {
  return key === 'coin_rules_positive' || key === 'coin_rules_accountability' || key === 'coin_thresholds';
}

// ─── Service ────────────────────────────────────────────────────────────────

@Injectable()
export class EngagementConfigService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Bitta engagement konfiguratsiya qiymatini olish
   */
  async get<K extends EngagementConfigKey>(
    schoolId: string,
    key: K,
  ): Promise<EngagementConfig[K]> {
    const record = await this.prisma.systemConfig.findUnique({
      where: { schoolId_key: { schoolId, key } },
    });

    if (!record) return DEFAULTS[key] as EngagementConfig[K];

    const raw = record.value;

    if (isBooleanKey(key)) {
      return Boolean(raw) as EngagementConfig[K];
    }
    if (isNumberKey(key)) {
      return Number(raw) as EngagementConfig[K];
    }
    if (isJsonKey(key)) {
      return (typeof raw === 'object' ? raw : JSON.parse(String(raw))) as EngagementConfig[K];
    }
    return raw as EngagementConfig[K];
  }

  /**
   * Barcha engagement konfiguratsiyalarini olish
   */
  async getAll(schoolId: string): Promise<EngagementConfig> {
    const records = await this.prisma.systemConfig.findMany({
      where: { schoolId, key: { startsWith: 'engagement_' } },
    });

    const result: any = { ...DEFAULTS };
    for (const r of records) {
      const k = r.key as EngagementConfigKey;
      if (isBooleanKey(k)) {
        result[k] = Boolean(r.value);
      } else if (isNumberKey(k)) {
        result[k] = Number(r.value);
      } else if (isJsonKey(k)) {
        result[k] = typeof r.value === 'object' ? r.value : JSON.parse(String(r.value));
      } else {
        result[k] = r.value;
      }
    }
    return result as EngagementConfig;
  }

  /**
   * Qiymat o'rnatish (upsert)
   */
  async set<K extends EngagementConfigKey>(
    schoolId: string,
    key: K,
    value: EngagementConfig[K],
  ): Promise<void> {
    let storedValue: any;
    if (isJsonKey(key)) {
      storedValue = value;
    } else {
      storedValue = String(value);
    }

    await this.prisma.systemConfig.upsert({
      where: { schoolId_key: { schoolId, key } },
      create: { schoolId, key, value: storedValue },
      update: { value: storedValue },
    });
  }

  /**
   * Bir nechta qiymat birdan o'rnatish
   */
  async setBulk(
    schoolId: string,
    payload: Partial<EngagementConfig>,
  ): Promise<void> {
    const ops = Object.entries(payload).map(([key, value]) => {
      const storedValue = isJsonKey(key) ? (value as any) : String(value);
      return this.prisma.systemConfig.upsert({
        where: { schoolId_key: { schoolId, key } },
        create: { schoolId, key, value: storedValue },
        update: { value: storedValue },
      });
    });
    await this.prisma.$transaction(ops);
  }

  /**
   * Engagement tizimi yoqilganmi?
   */
  async isEnabled(schoolId: string): Promise<boolean> {
    return this.get(schoolId, 'engagement_enabled');
  }

  /**
   * Muayyan xususiyat yoqilganmi?
   */
  async isFeatureEnabled(
    schoolId: string,
    feature: keyof EngagementConfig,
  ): Promise<boolean> {
    const config = await this.getAll(schoolId);
    if (!config.engagement_enabled) return false;
    return Boolean(config[feature]);
  }

  /**
   * Musbat qoidalar
   */
  async getPositiveRules(schoolId: string): Promise<CoinRulesPositive> {
    return this.get(schoolId, 'coin_rules_positive');
  }

  /**
   * Hisobdorlik qoidalar
   */
  async getAccountabilityRules(schoolId: string): Promise<CoinRulesAccountability> {
    return this.get(schoolId, 'coin_rules_accountability');
  }

  /**
   * Chegara qiymatlar
   */
  async getThresholds(schoolId: string): Promise<CoinThresholds> {
    return this.get(schoolId, 'coin_thresholds');
  }
}
