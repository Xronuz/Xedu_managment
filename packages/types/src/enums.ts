export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  DIRECTOR = 'director',
  BRANCH_ADMIN = 'branch_admin',
  VICE_PRINCIPAL = 'vice_principal',
  TEACHER = 'teacher',
  CLASS_TEACHER = 'class_teacher',
  ACCOUNTANT = 'accountant',
  LIBRARIAN = 'librarian',
  STUDENT = 'student',
  PARENT = 'parent',
}

export enum SubscriptionPlan {
  FREE = 'free',
  BASIC = 'basic',
  STANDARD = 'standard',
  PREMIUM = 'premium',
}

export enum BillingCycle {
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  TRIAL = 'trial',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

export enum ModuleName {
  AUTH = 'auth',
  USERS = 'users',
  CLASSES = 'classes',
  SCHEDULE = 'schedule',
  NOTIFICATIONS = 'notifications',
  MESSAGING = 'messaging',
  REPORTS = 'reports',
  ATTENDANCE = 'attendance',
  GRADES = 'grades',
  PAYMENTS = 'payments',
  EXAMS = 'exams',
  HOMEWORK = 'homework',
  DISPLAY = 'display',
  FINANCE_DASHBOARD = 'finance_dashboard',
  LEARNING_CENTER = 'learning_center',
  CANTEEN = 'canteen',
  LIBRARY = 'library',
  TRANSPORT = 'transport',
  INVENTORY = 'inventory',
  PSYCHOLOGY = 'psychology',
  CLUBS = 'clubs',
  KPI = 'kpi',
  ENGAGEMENT = 'engagement',
}

export enum AttendanceStatus {
  PRESENT = 'present',
  ABSENT = 'absent',
  LATE = 'late',
  EXCUSED = 'excused',
}

export enum GradeType {
  HOMEWORK = 'homework',
  CLASSWORK = 'classwork',
  TEST = 'test',
  EXAM = 'exam',
  QUARTERLY = 'quarterly',
  FINAL = 'final',
}

export enum ExamFrequency {
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  FINAL = 'final',
  ON_DEMAND = 'on_demand',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  OVERDUE = 'overdue',
}

export enum PaymentProvider {
  PAYME = 'payme',
  CLICK = 'click',
  UZUM = 'uzum',
  CASH = 'cash',
}

export enum NotificationType {
  SMS = 'sms',
  EMAIL = 'email',
  PUSH = 'push',
  IN_APP = 'in_app',
}

export enum DayOfWeek {
  MONDAY = 'monday',
  TUESDAY = 'tuesday',
  WEDNESDAY = 'wednesday',
  THURSDAY = 'thursday',
  FRIDAY = 'friday',
  SATURDAY = 'saturday',
  SUNDAY = 'sunday',
}

export enum ScheduleStatus {
  DRAFT = 'draft',
  VALIDATED = 'validated',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

export enum WeekType {
  ALL = 'all',
  NUMERATOR = 'numerator',
  DENOMINATOR = 'denominator',
}

export enum AuditAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LOGIN = 'login',
  LOGOUT = 'logout',
  EXPORT = 'export',
  ASSIGN_BRANCH = 'assign_branch',
  UNASSIGN_BRANCH = 'unassign_branch',
}

export enum AchievementCategory {
  ACADEMIC_EFFORT = 'academic_effort',
  ATTENDANCE = 'attendance',
  IMPROVEMENT = 'improvement',
  PARTICIPATION = 'participation',
  RECOVERY = 'recovery',
  DISCIPLINE_RECOVERY = 'discipline_recovery',
}

export enum AiProvider {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  GEMINI = 'gemini',
  LOCAL = 'local',
}

export enum AiFeature {
  EXAM_GENERATOR = 'ai_exam_generator',
  HOMEWORK_REVIEW = 'ai_homework_review',
  PARENT_SUMMARY = 'ai_parent_summary',
  TUTOR = 'ai_tutor',
  INSIGHTS = 'ai_insights',
  CONTENT_CREATOR = 'ai_content_creator',
}

export enum ProTier {
  FREE = 'free',
  TEACHER_PRO = 'teacher_pro',
  STUDENT_PRO = 'student_pro',
  PARENT_PRO = 'parent_pro',
}

export enum Language {
  UZ = 'uz',
  RU = 'ru',
}

// ─── Phase 5A: Teaching Load enums ──────────────────────────────────────────

export enum TeachingLoadStatus {
  DRAFT = 'draft',
  APPROVED = 'approved',
  ARCHIVED = 'archived',
}

export enum GroupType {
  CLASS = 'class',
  GROUP = 'group',
  ELECTIVE = 'elective',
  CLUB = 'club',
}

export enum Semester {
  FIRST = 'first',
  SECOND = 'second',
  FULL_YEAR = 'full_year',
}

export enum LeaveType {
  SICK = 'sick',
  PERSONAL = 'personal',
  FAMILY = 'family',
  OTHER = 'other',
  PROFESSIONAL = 'professional',
  UNPAID = 'unpaid',
  PAID = 'paid',
  VACATION = 'vacation',
  TRAINING = 'training',
  BUSINESS_TRIP = 'business_trip',
  MATERNITY = 'maternity',
  EMERGENCY = 'emergency',
}

export enum TeacherAttendanceStatus {
  PRESENT = 'present',
  ABSENT = 'absent',
  LATE = 'late',
  EXCUSED = 'excused',
  SUBSTITUTED = 'substituted',
}

export enum SubstitutionStatus {
  PROPOSED = 'proposed',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  APPLIED = 'applied',
  CANCELLED = 'cancelled',
}

export enum SolverRunStatus {
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}
