import { apiClient } from './client';

// ── Rule breakdown ─────────────────────────────────────────────────────────
export interface RuleBreakdown {
  attendance: { score: number; rate: number;         triggered: boolean };
  gpa:        { score: number; value: number;        triggered: boolean };
  gpaDrop:    { score: number; dropPct: number;      triggered: boolean; skipped: boolean };
  payment:    { score: number; overdueMonths: number; triggered: boolean };
  discipline: { score: number; incidents: number;    triggered: boolean };
  homework:     { score: number; completion: number;   triggered: boolean };
  trendPenalty: { score: number; weeks: number;        triggered: boolean };
}

export interface WeeklyTrend {
  week:           number;
  attendanceRate: number;  // -1 = ma'lumot yo'q
  avgGrade:       number;  // -1 = ma'lumot yo'q
}

export type TrendAlertType =
  | 'attendance_decline'
  | 'gpa_decline'
  | 'homework_decline'
  | 'payment_risk'
  | 'discipline_spike';

export type TrendAlertSeverity   = 'info' | 'warning' | 'critical';
export type TrendAlertConfidence = 'low' | 'medium' | 'high';

export interface TrendAlert {
  type:              TrendAlertType;
  severity:          TrendAlertSeverity;
  confidence:        TrendAlertConfidence;
  title:             string;
  description:       string;
  metric:            string;
  previousValue:     number;
  currentValue:      number;
  changePct:         number;
  weeks:             number;
  sampleCount?:      number;
  recommendedAction: string;
}

export interface StudentRiskProfile {
  studentId:                 string;
  firstName:                 string;
  lastName:                  string;
  className?:                string;
  branchName?:               string;
  riskScore:                 number;
  riskLevel:                 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  // ─── Raw metrics ──────────────────────────────────────────────────────────
  gpa:                       number;
  attendanceRate:            number;
  homeworkCompletion:        number;
  disciplineIncidents:       number;
  lastGradeTrend:            'IMPROVING' | 'STABLE' | 'DECLINING';
  consecutiveDecliningWeeks: number;
  // ─── Explainability ───────────────────────────────────────────────────────
  ruleBreakdown:             RuleBreakdown;
  weeklyTrend:               WeeklyTrend[];
  primaryReason:             string;
  trendAlerts:               TrendAlert[];
  alertCount:                number;
  criticalAlertCount:        number;
  recommendations:           string[];
}

export interface TriggeredCounts {
  attendance: number;
  gpa:        number;
  gpaDrop:    number;
  payment:    number;
  discipline: number;
  homework:   number;
}

export interface AiDashboardSummary {
  totalStudents:    number;
  riskDistribution: { critical: number; high: number; medium: number; low: number };
  averages:         { gpa: number; attendance: number };
  triggeredCounts:  TriggeredCounts;
  alertSummary: {
    totalAlerts:        number;
    totalCriticalAlerts: number;
    alertsByType: Record<TrendAlertType, number>;
  };
  topAtRisk:        StudentRiskProfile[];
}

export interface RuleEngineConfig {
  attendanceWeight:    number;
  gpaWeight:           number;
  gpaDropWeight:       number;
  paymentWeight:       number;
  disciplineWeight:    number;
  homeworkWeight:      number;
  attendanceThreshold: number;
  gpaThreshold:        number;
  gpaDropThreshold:    number;
  homeworkThreshold:   number;
  disciplineThreshold: number;
  minGpaSample:        number;
  criticalThreshold:   number;
  highThreshold:       number;
  mediumThreshold:     number;
}

export const DEFAULT_RULE_CONFIG: RuleEngineConfig = {
  attendanceWeight: 30, gpaWeight: 25, gpaDropWeight: 15, paymentWeight: 20,
  disciplineWeight: 15, homeworkWeight: 10, attendanceThreshold: 80,
  gpaThreshold: 3.0, gpaDropThreshold: 15, homeworkThreshold: 60,
  disciplineThreshold: 3, minGpaSample: 3, criticalThreshold: 70,
  highThreshold: 50, mediumThreshold: 25,
};

export const aiAnalyticsApi = {
  getStudentProfiles: () =>
    apiClient.get<StudentRiskProfile[]>('/ai-analytics/students').then(r => r.data),

  getDashboard: () =>
    apiClient.get<AiDashboardSummary>('/ai-analytics/dashboard').then(r => r.data),

  getConfig: () =>
    apiClient.get<RuleEngineConfig>('/ai-analytics/config').then(r => r.data),

  updateConfig: (cfg: Partial<RuleEngineConfig>) =>
    apiClient.put<RuleEngineConfig>('/ai-analytics/config', cfg).then(r => r.data),
};
