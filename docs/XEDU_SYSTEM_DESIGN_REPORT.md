# Xedu Platform — System Design Report

**Version:** v0.1.0-pilot  
**Date:** 2026-05-21  
**Repository:** Xronuz/Xedu_managment  
**Stack:** NestJS (backend) + Next.js 14 (frontend) + PostgreSQL 16 + Redis 7 + Docker  

---

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              END USERS                                      │
│  (Directors · Teachers · Students · Parents · Accountants · Branch Admins)  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │ HTTPS
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            CLOUDFLARE                                       │
│         (SSL/TLS termination · DDoS protection · CDN)                       │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │ HTTP :80
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            CADDY (host)                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐   │
│  │ /api/*      │  │ /socket.io  │  │ /_next/*    │  │ /* (catch-all)  │   │
│  │ → backend   │  │ → backend   │  │ → frontend  │  │ → frontend      │   │
│  │ :3001       │  │ :3001 WS    │  │ :3000       │  │ :3000           │   │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              ▼                     ▼                     ▼
    ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
    │   FRONTEND      │   │    BACKEND      │   │  WORKLOAD PM2   │
    │  Next.js 14     │   │   NestJS 10     │   │  (external)     │
    │  Port 3000      │   │   Port 3001     │   │  Port 3002      │
    │  Standalone     │   │   REST + WS     │   │                 │
    └─────────────────┘   └─────────────────┘   └─────────────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              ▼                     ▼                     ▼
    ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
    │   POSTGRES 16   │   │    REDIS 7      │   │    MINIO /      │
    │   (persistent)  │   │  (cache/sess)   │   │  local uploads  │
    │   Port 5432     │   │   Port 6379     │   │                 │
    └─────────────────┘   └─────────────────┘   └─────────────────┘
```

### 1.1 Frontend App Structure

**Framework:** Next.js 14 App Router, TypeScript, Tailwind CSS, shadcn/ui  
**State:** Zustand (auth, UI, branch) + TanStack Query (server state)  
**Build:** Standalone output, multi-stage Docker (`node:20-alpine`)

**Key directories:**
```
apps/frontend/src/
├── app/(dashboard)/dashboard/     # 70+ route segments
│   ├── schedule/page.tsx          # Timetable grid
│   ├── teaching-loads/page.tsx    # Tarifikatsiya
│   ├── subjects/page.tsx          # Fanlar katalogi
│   ├── users/page.tsx             # Foydalanuvchilar
│   ├── payroll/page.tsx           # Ish haqi
│   ├── finance/page.tsx           # Moliya
│   ├── ops/page.tsx               # Ops Command Center
│   ├── export-center/page.tsx     # Export markazi
│   └── setup/page.tsx             # Setup wizard (7 steps)
├── components/workspace-system/   # OpTable, WorkspaceShell, EntityPanel
├── lib/api/                       # 56 API modules (axios + interceptors)
└── store/                         # Zustand stores
```

**UI Architecture:** Split-context workspace system — 3 independent React contexts (panel, selection, ops) to prevent unnecessary rerenders. Density-aware (`compact`/`normal`/`spacious`).

### 1.2 Backend App Structure

**Framework:** NestJS 10, TypeScript, Prisma ORM  
**Architecture:** Modular monolith with clear domain boundaries  
**API Versioning:** `/api/v1/*`  
**Build:** Multi-stage Docker (`node:20-alpine`)

```
apps/backend/src/
├── modules/                       # 25+ domain modules
│   ├── auth/                      # JWT + cookie + refresh + branch switch
│   ├── users/                     # CRUD + RBAC + CSV import
│   ├── schedule/                  # CRUD + generator + solver + repair
│   ├── teaching-load/             # Tarifikatsiya
│   ├── payroll/                   # Ish haqi + tariff
│   ├── attendance/                # Davomat
│   ├── teacher-attendance/        # O'qituvchi davomati + o'rinbosarlar
│   ├── export/                    # Export markazi (14 entity)
│   ├── ops-command-center/        # Ops boshqaruv markazi
│   ├── notifications/             # SMS + email + push + WS
│   └── ...
├── common/                        # Guards, decorators, interceptors, utils
│   ├── guards/                    # JwtAuthGuard, RolesGuard, SubscriptionGuard
│   ├── decorators/                # @Roles, @Public, @CurrentUser
│   ├── utils/                     # buildTenantWhere, conflict-detector
│   └── audit/                     # AuditLog service
└── main.ts                        # Bootstrap + Swagger + CORS + static assets
```

### 1.3 API Gateway / Routing / Middleware

**Layer 1 — Cloudflare:** SSL termination, origin connects via plain HTTP on port 80  
**Layer 2 — Caddy (host-level reverse proxy):**
- `:80` listener, `auto_https off`
- `/api/*` → `backend:3001` (60s timeout)
- `/api/v1/auth/*` → `backend:3001` (30s timeout)
- `/socket.io/*` → `backend:3001` (WebSocket upgrade, no timeout)
- `/_next/static/*` → `frontend:3000` (1-year cache)
- `/uploads/*` → `backend:3001` (7-day cache)
- Catch-all → `frontend:3000` (30s timeout)
- Request body max: 50MB
- Security headers: `X-Frame-Options`, `X-Content-Type-Options`, `-Server`

**Layer 3 — NestJS Middleware:**
- Global `JwtAuthGuard` + `RolesGuard` + `ThrottlerGuard` (100 req/min)
- `QueryTimingInterceptor` — logs slow queries (>500ms)
- Request correlation ID in `x-correlation-id` header

### 1.4 Database

**PostgreSQL 16** with Prisma ORM  
**Schema:** 60+ models, 40+ enums  
**Key patterns:**
- Every tenant-scoped model has `schoolId` + `branchId`
- Soft delete via `isActive` / `deletedAt` (School, User)
- Composite indexes on `(schoolId, branchId)` and role-filtered queries
- Junction tables: `ClassStudent`, `ParentStudent`, `UserBranchAssignment`

### 1.5 Redis / Cache

**Redis 7** used for:
- JWT deny-list (`token_deny:{jti}`)
- Refresh token storage (`refresh:{uuid}`)
- Session revocation (`user_sessions:{userId}:revoked`)
- Application cache with TTL:
  - Grades: 5 min
  - GPA: 3 min
  - Classes: 10 min
  - Schedule reads: 5 min
  - Readiness score: 5 min
- BullMQ queue backend (notifications, exports, attendance alerts)

### 1.6 Background Jobs / Queues

**BullMQ** (`notification_queue`) with Redis:
- Notification delivery (email via Nodemailer, SMS via Infobip)
- Attendance alerts to parents
- Payment reminders
- Grade notifications
- Export job processing (MVP: synchronous within request)

**Concurrency:** 5 workers for notification processor

### 1.7 File / Export Storage

**Dual backend:**
- **Local filesystem:** `uploads/{folder}/{uuid}{ext}` — served via `app.useStaticAssets()`
- **MinIO (S3-compatible):** Optional, configured via env vars

**Upload limits:**
- Avatar: 5MB (JPEG/PNG/WebP)
- Documents: 10MB
- Import files: 5MB
- Online exam attachments: 10MB
- Export files: `uploads/exports/` local storage

### 1.8 Deployment / Docker / Flow

```
Developer pushes to main
        │
        ▼
GitHub Actions → self-hosted runner (production server)
        │
        ├──► git fetch + reset --hard origin/main
        ├──► docker image/builder prune (keep 5GB)
        ├──► docker compose down --remove-orphans
        ├──► docker compose up -d --build
        │       ├─► postgres:16-alpine
        │       ├─► redis:7-alpine
        │       ├─► migrate (Prisma migrate + seed, one-shot)
        │       ├─► backend (NestJS, :3001, localhost only)
        │       └─► frontend (Next.js, :3000, localhost only)
        ├──► Health check loop (up to 5 min on /api/health)
        └──► PM2 workload check (port 3002)
```

**Docker networks:**
- `internal` (172.18.0.0/16): DB, Redis, Backend — no external access
- `external` (172.19.0.0/16): Frontend + Caddy — public-facing

**Health checks:**
- Postgres: `pg_isready` every 5s
- Redis: `redis-cli ping` every 5s
- Backend: `wget localhost:3001/api/health` every 15s
- Frontend: `wget localhost:3000` every 15s

---

## 2. Core Services / Backend Modules

### 2.1 Auth

| | Detail |
|---|---|
| **Responsibility** | Authentication, JWT lifecycle, session management, branch switching, password reset |
| **Controller** | `POST /v1/auth/login` · `POST /v1/auth/refresh` · `POST /v1/auth/logout` · `POST /v1/auth/logout-all` · `POST /v1/auth/switch-branch` · `POST /v1/auth/forgot-password` · `POST /v1/auth/reset-password` · `POST /v1/auth/first-login` |
| **Service** | `AuthService` — bcrypt verify, JWT sign/verify, Redis token storage, cookie `secure`/`sameSite` dynamic |
| **Models** | `User`, `School`, `Branch`, `RefreshToken` |
| **Dependencies** | `PrismaService`, `JwtService`, `RedisService`, `ConfigService`, `NotificationQueueService` |

**Key pattern:** httpOnly cookies for tokens + `withCredentials: true` on frontend. Branch switch generates new JWT pair with updated `branchId`.

### 2.2 Users / RBAC

| | Detail |
|---|---|
| **Responsibility** | User CRUD, role hierarchy enforcement, branch assignments, CSV import, parent-student linking, avatar upload |
| **Controller** | `GET /v1/users` · `POST /v1/users` · `PUT /v1/users/:id` · `DELETE /v1/users/:id` · `POST /v1/users/:id/assign-branch` · `POST /v1/users/import/csv` · `POST /v1/users/:id/reset-password` · `PUT /v1/users/me/avatar` |
| **Service** | `UsersService` — `ROLE_CREATION_MATRIX`, `buildVisibleRoleFilter`, `assertCanManage` |
| **Models** | `User`, `Branch`, `UserBranchAssignment`, `ClassStudent`, `ParentStudent` |
| **Dependencies** | `PrismaService`, `AuditService`, `AuthService`, `UploadService` |

**Role hierarchy:** `SUPER_ADMIN(100) > DIRECTOR(80) > VICE_PRINCIPAL(60) > BRANCH_ADMIN(40) > ACCOUNTANT(20) = LIBRARIAN(20) > CLASS_TEACHER(15) > TEACHER(10) > PARENT(5) = STUDENT(5)`

### 2.3 Schools / Branches

| | Detail |
|---|---|
| **Responsibility** | School onboarding (super-admin), branch CRUD, feature flag toggling (`SchoolModule`) |
| **Controller** | `GET /v1/super-admin/schools` · `POST /v1/super-admin/schools` · `GET /v1/branches` · `POST /v1/branches` · `DELETE /v1/branches/:id` |
| **Service** | `SuperAdminService` — creates School + Subscription + Branch + SystemConfig in one transaction. `BranchesService` — soft-delete if has users/classes |
| **Models** | `School`, `Branch`, `SchoolModule`, `Subscription`, `SystemConfig` |
| **Dependencies** | `PrismaService`, `AuthService` |

### 2.4 Students / Parents

| | Detail |
|---|---|
| **Responsibility** | Student enrollment, class assignment, parent linking, whitelist-only updates |
| **Controller** | `GET /v1/students` · `POST /v1/students` · `PATCH /v1/students/:id` · `POST /v1/students/:id/parents/link` |
| **Service** | `StudentsService` — delegates user creation to `UsersService`, enrolls via `ClassStudent`, links via `ParentStudent` |
| **Models** | `User`, `ClassStudent`, `ParentStudent` |
| **Dependencies** | `PrismaService`, `AuditService`, `UsersService` |

### 2.5 Classes

| | Detail |
|---|---|
| **Responsibility** | Class CRUD, student roster, promotion between grades, Redis caching |
| **Controller** | `GET /v1/classes` · `POST /v1/classes` · `GET /v1/classes/:id/students` · `POST /v1/classes/:id/students/:studentId` · `POST /v1/classes/promote` |
| **Service** | `ClassesService` — `findMyClass` for class teachers, `promoteStudents` transactional migration, branch change backfill on related models |
| **Models** | `Class`, `ClassStudent`, `User`, `Attendance`, `Grade`, `Schedule`, `Exam`, `Homework` |
| **Dependencies** | `PrismaService`, `RedisService`, `EventsGateway` |

### 2.6 Subjects / Catalog

| | Detail |
|---|---|
| **Responsibility** | Subject assignment per class-teacher pair, deduplicated catalog view |
| **Controller** | `GET /v1/subjects` · `GET /v1/subjects/catalog` · `GET /v1/subjects/mine` · `POST /v1/subjects` · `PUT /v1/subjects/:id` |
| **Service** | `SubjectsService` — `create` iterates `classIds[]` creating one `Subject` row per class. `catalog()` groups by normalized name with class coverage |
| **Models** | `Subject`, `Class`, `User` (teacher), `TeachingLoad`, `Schedule`, `Grade`, `Exam`, `Homework` |
| **Dependencies** | `PrismaService` |

### 2.7 Teaching Loads

| | Detail |
|---|---|
| **Responsibility** | Formal teacher-subject-class assignment (tarifikatsiya), hours tracking, import/export |
| **Controller** | `GET /v1/teaching-loads` · `POST /v1/teaching-loads` · `PUT /v1/teaching-loads/:id` · `DELETE /v1/teaching-loads/:id` · `POST /v1/teaching-loads/import/preview` · `POST /v1/teaching-loads/import/commit` |
| **Service** | `TeachingLoadService` — `@@unique([teacherId, subjectId, classId, semester, status])` constraint. Hours sync with `Subject` |
| **Models** | `TeachingLoad`, `Subject`, `User`, `Class`, `Branch` |
| **Dependencies** | `PrismaService`, `AuditService` |

### 2.8 Timetable / Schedule

| | Detail |
|---|---|
| **Responsibility** | Schedule slot CRUD, conflict detection, lifecycle (draft→validated→published→archived), drag-and-drop move, availability preview |
| **Controller** | `GET /v1/schedule` · `POST /v1/schedule` · `PUT /v1/schedule/:id` · `DELETE /v1/schedule/:id` · `POST /v1/schedule/:id/move` · `POST /v1/schedule/:id/publish` · `POST /v1/schedule/:id/unpublish` · `GET /v1/schedule/availability-preview` |
| **Service** | `ScheduleService` — transactional moves, `ConflictDetectorService.assertNoClash`, Redis cache invalidation, WebSocket `schedule:updated` |
| **Models** | `Schedule`, `Subject`, `Class`, `Room`, `Period`, `School` |
| **Dependencies** | `PrismaService`, `RedisService`, `ConflictDetectorService`, `PeriodsService`, `AuditService`, `EventsGateway` |

### 2.9 Advanced Solver

| | Detail |
|---|---|
| **Responsibility** | Hybrid constraint solver for timetable generation with backtracking repair |
| **Controller** | `POST /v1/schedule/advanced-generate` · `GET /v1/schedule/solver-runs` |
| **Service** | `AdvancedSolverService` — in-memory `ConflictIndex` for O(1) clash checks, greedy stage + backtracking stage (maxDepth=2), timeout=10s, scoring with teacher load penalties |
| **Models** | `Subject`, `Period`, `Room`, `Schedule`, `SolverRun` |
| **Dependencies** | `PrismaService`, `ConflictDetectorService` |

### 2.10 Periods / Rooms

| | Detail |
|---|---|
| **Responsibility** | Bell schedule (periods) and physical room management |
| **Controller** | `GET /v1/periods` · `POST /v1/periods` · `GET /v1/rooms` · `POST /v1/rooms` |
| **Service** | `PeriodsService.resolvePeriod()` — critical helper mapping `periodNumber` → `startTime`/`endTime`. `RoomsService` — hard-delete if no schedules, else deactivate |
| **Models** | `Period`, `Room`, `Schedule` |
| **Dependencies** | `PrismaService` |

### 2.11 Attendance

| | Detail |
|---|---|
| **Responsibility** | Student daily attendance marking, reports, today summary, parent alerts |
| **Controller** | `POST /v1/attendance/mark` · `GET /v1/attendance/report` · `GET /v1/attendance/today/summary` |
| **Service** | `AttendanceService` — upserts by `(studentId, scheduleId, date)`, triggers SMS/email alerts for absent/late, WebSocket `attendance:updated` |
| **Models** | `Attendance`, `Schedule`, `Class`, `User` |
| **Dependencies** | `PrismaService`, `RedisService`, `NotificationQueueService`, `AuditService`, `EventsGateway` |

### 2.12 Teacher Attendance

| | Detail |
|---|---|
| **Responsibility** | Teacher daily status (present/absent/late/excused/substituted), legacy substitution CRUD |
| **Controller** | `POST /v1/teacher-attendance/mark` · `GET /v1/teacher-attendance/:teacherId` · `GET /v1/teacher-attendance/substitutions` |
| **Service** | `TeacherAttendanceService` — marks via `(teacherId, date, scheduleId)` composite key |
| **Models** | `TeacherAttendance`, `TeacherSubstitution`, `Schedule` |
| **Dependencies** | `PrismaService` |

### 2.13 Substitutions

| | Detail |
|---|---|
| **Responsibility** | Full substitution lifecycle: detect affected schedules → rank candidates → propose → approve → apply → cancel |
| **Controller** | `GET /v1/teacher-attendance/substitutions/affected` · `GET /v1/teacher-attendance/substitutions/candidates` · `POST /v1/teacher-attendance/substitutions/propose` · `POST /v1/teacher-attendance/substitutions/:id/apply` · `POST /v1/teacher-attendance/substitutions/:id/cancel` |
| **Service** | `SubstitutionWorkflowService` — `getCandidates` scoring: +50 same subject+class, +30 same subject, +20 same branch, load-based penalties, weekly sub count penalties, urgency -10. `applySubstitution` writes both original and substitute `TeacherAttendance` records |
| **Models** | `TeacherSubstitution`, `TeacherAttendance`, `LeaveRequest`, `Schedule`, `TeachingLoad` |
| **Dependencies** | `PrismaService`, `AuditService` |

### 2.14 Leave Requests

| | Detail |
|---|---|
| **Responsibility** | Multi-approver leave workflow (all directors/VPs must approve; any rejection = rejected) |
| **Controller** | `POST /v1/leave-requests` · `GET /v1/leave-requests` · `PUT /v1/leave-requests/:id/review` · `PUT /v1/leave-requests/:id/cancel` |
| **Service** | `LeaveRequestsService` — auto-creates `LeaveApproval` rows for all approvers. On approval for students, auto-creates `excused` attendance records |
| **Models** | `LeaveRequest`, `LeaveApproval`, `Attendance`, `User` |
| **Dependencies** | `PrismaService`, `AuditService`, `EventsGateway` |

### 2.15 Payroll

| | Detail |
|---|---|
| **Responsibility** | Uzbekistan 2026 tariff-based salary, advances (max 50%), monthly payroll generation, PDF slips, email dispatch |
| **Controller** | `GET /v1/payroll/tariff-reference` · `POST /v1/payroll/staff` · `POST /v1/payroll/monthly/generate` · `PUT /v1/payroll/monthly/:id/approve` · `GET /v1/payroll/monthly/:id/slip/:itemId` · `POST /v1/payroll/monthly/:id/send-slips` |
| **Service** | `PayrollService` — `countScheduledHoursFromSchedule()` (weekType-aware) + `countCompletedHoursFromAttendance()` → `PayrollItem`. `TariffCalculatorService` — BHM-based Uzbekistan 2026 standards |
| **Models** | `StaffSalary`, `SalaryAdvance`, `MonthlyPayroll`, `PayrollItem`, `Schedule`, `TeacherAttendance` |
| **Dependencies** | `PrismaService`, `TariffCalculatorService`, `SystemConfigService`, `MailService`, `pdfkit` |

### 2.16 Finance

| | Detail |
|---|---|
| **Responsibility** | Fee structures, student payments (cash/Payme/Click), treasury/shift management, dashboard |
| **Controller** | `GET /v1/finance/dashboard` · `GET /v1/finance/debtors` · `POST /v1/payments` · `POST /v1/payments/webhook/payme` · `POST /v1/fee-structures` · `POST /v1/fee-structures/:id/generate-payments` |
| **Service** | `FinanceService` — dashboard aggregation. `PaymentsService` — webhook handlers for Payme (JSON-RPC 2.0) and Click (MD5-signed). `TreasuryService` — balance tracking with shift guards |
| **Models** | `Payment`, `FeeStructure`, `Treasury`, `FinancialShift` |
| **Dependencies** | `PrismaService`, `TreasuryService`, `FinancialShiftsService`, `AuditService` |

### 2.17 Analytics

| | Detail |
|---|---|
| **Responsibility** | Timetable KPIs: teacher utilization, room utilization, schedule density, absence/substitution trends, solver quality, payroll variance |
| **Controller** | `GET /v1/schedule/analytics/timetable/overview` · `GET /v1/schedule/analytics/timetable/utilization` · `GET /v1/schedule/analytics/timetable/density` · `GET /v1/schedule/analytics/timetable/absence-substitution` · `GET /v1/schedule/analytics/timetable/solver-quality` |
| **Service** | `TimetableAnalyticsService` — `ALL` slots count as 1.0, `NUMERATOR`/`DENOMINATOR` as 0.5. Compares against `StaffSalary.weeklyLessonHours` (default 18) |
| **Models** | `Schedule`, `User`, `StaffSalary`, `Room`, `Period`, `TeacherAttendance`, `TeacherSubstitution`, `SolverRun`, `MonthlyPayroll` |
| **Dependencies** | `PrismaService` |

### 2.18 Ops Command Center

| | Detail |
|---|---|
| **Responsibility** | Real-time operational snapshot, actionable alerts, school readiness score |
| **Controller** | `GET /v1/ops/today-summary` · `GET /v1/ops/alerts` · `POST /v1/ops/alerts/:id/acknowledge` · `GET /v1/schools/:id/readiness` · `POST /v1/schools/:id/readiness/recalculate` |
| **Service** | `OpsCommandCenterService` — aggregates counts for all operational domains. `calculateReadiness()` scores: school(10) + branches(10) + periods(15) + rooms(10) + classes(15) + subjects(15) + teachingLoads(15) + published timetable(10) = 100 |
| **Models** | `Period`, `Room`, `Class`, `Subject`, `TeachingLoad`, `Schedule`, `TeacherAttendance`, `LeaveRequest`, `TeacherSubstitution`, `MonthlyPayroll`, `School` |
| **Dependencies** | `PrismaService`, `RedisService` |

### 2.19 Export Center

| | Detail |
|---|---|
| **Responsibility** | Async data export for 14 entities in CSV/XLSX/JSON with RBAC per entity |
| **Controller** | `POST /v1/exports` · `GET /v1/exports` · `GET /v1/exports/:id/download` · `POST /v1/exports/:id/cancel` |
| **Service** | `ExportService` — `createAndProcess()` validates RBAC, creates `ExportJob`, serializes via ExcelJS/json2csv. 14 exporters: schedules, teaching_loads, payroll, users, analytics_summary, classes, subjects, rooms, attendance, teacher_attendance, substitutions, leave_requests, workload_report, timetable_analytics |
| **Models** | `ExportJob` |
| **Dependencies** | `PrismaService`, `AuditService`, `ExcelJS`, `json2csv` |

### 2.20 Help System

| | Detail |
|---|---|
| **Responsibility** | Static JSON help articles, contextual help buttons, `Cmd+Shift+?` shortcut, HelpDrawer with search/categories/recently viewed |
| **Implementation** | Static JSON files (20 articles), `HelpProvider` context, `HelpDrawer` component, contextual `HelpButton` on 11 pages |
| **Content** | Export Center, Schedule, Teaching Loads, Users, Subjects, Attendance, Payroll, Finance, Ops, Classes, Grades |

### 2.21 Notifications

| | Detail |
|---|---|
| **Responsibility** | Multi-channel delivery: in-app, WebSocket, email (Nodemailer/SMTP), SMS (Infobip), push. Broadcast by role/group. Queue health monitoring. |
| **Controller** | `POST /v1/notifications` · `POST /v1/notifications/broadcast` · `GET /v1/notifications` · `PUT /v1/notifications/read-all` · `GET /v1/notifications/queue-stats` |
| **Service** | `NotificationsService` — preference-aware delivery. `NotificationQueueService` — BullMQ enqueue. `NotificationProcessor` — Worker with concurrency 5. `MailService` — SMTP. `SmsService` — Infobip or stub |
| **Models** | `Notification`, `NotificationDelivery`, `User` |
| **Dependencies** | `PrismaService`, `EventsGateway`, `BullMQ`, `MailService`, `SmsService`, `nodemailer` |

### 2.22 Audit Logs

| | Detail |
|---|---|
| **Responsibility** | Non-blocking operation logging, Excel export, real-time WebSocket `audit:new` to director dashboard |
| **Controller** | `GET /v1/audit-logs` · `GET /v1/audit-logs/export` · `GET /v1/audit-logs/all` |
| **Service** | `AuditService` — `log()` catches errors silently. `exportToExcel()` up to 5000 rows |
| **Models** | `AuditLog` |
| **Dependencies** | `PrismaService`, `EventsGateway`, `ExcelJS` |

---

## 3. Main User Flows

### Flow A: Login & RBAC

| Step | User Action | Frontend | API | Backend | DB Models | Side Effects |
|------|-------------|----------|-----|---------|-----------|--------------|
| 1 | Opens login page | `/login` | — | — | — | — |
| 2 | Enters email + password | Form submit | `POST /auth/login` | `AuthService.login()` | `User.findFirst()` | Checks bcrypt hash |
| 3 | Server validates | — | Returns `{user, tokens}` + sets httpOnly cookies | `generateTokens()` | `RefreshToken.create()` | Stores refresh UUID in Redis (7d) |
| 4 | Client stores auth | `authStore.setAuth()` | — | — | — | Persists user + activeBranchId to localStorage |
| 5 | Redirect to dashboard | `/dashboard` | `GET /auth/me` | `AuthService.me()` | `User.findUnique()` | Session recovery if Zustand cleared |
| 6 | Role-based sidebar | `Sidebar` renders permitted items | — | — | — | `ROUTE_PERMISSIONS` config filters nav |
| 7 | Branch switch | Branch selector | `POST /auth/switch-branch` | `AuthService.switchBranch()` | `UserBranchAssignment.findMany()` | New JWT pair, cookie update, `authStore.switchBranch()` |

### Flow B: New School Setup Wizard

| Step | User Action | Frontend | API | Backend | DB Models | Side Effects |
|------|-------------|----------|-----|---------|-----------|--------------|
| 1 | Super admin creates school | `/schools/new` | `POST /super-admin/schools` | `SuperAdminService.createSchool()` | `School.create()` + `Subscription.create()` + `Branch.create()` + `SystemConfig.create()` | Enables `CORE_MODULES` |
| 2 | Director invited via email | Invite dialog | `POST /invitations` | `InvitationsService.create()` | `Invitation.create()` | Sends email with token |
| 3 | Director sets password | `/first-login` | `POST /auth/first-login` | `AuthService.firstLoginPasswordChange()` | `User.update()` | `isFirstLogin = false` |
| 4 | Setup wizard step 1 | `/dashboard/setup` | `POST /branches` | `BranchesService.create()` | `Branch.create()` | — |
| 5 | Step 2 — Periods | Same | `POST /periods` | `PeriodsService.create()` | `Period.create()` | — |
| 6 | Step 3 — Rooms | Same | `POST /rooms` | `RoomsService.create()` | `Room.create()` | — |
| 7 | Step 4 — Classes | Same | `POST /classes` | `ClassesService.create()` | `Class.create()` | — |
| 8 | Step 5 — Teaching Loads | Same | `POST /teaching-loads` | `TeachingLoadService.create()` | `TeachingLoad.create()` | Validates `@@unique` constraint |
| 9 | Step 6 — Generate Schedule | Same | `POST /schedule/generate` | `ScheduleGeneratorService.generate()` | `Subject.findMany()` | Returns proposed slots |
| 10 | Step 6b — Commit | Same | `POST /schedule/generate/commit` | `ScheduleGeneratorService.commitProposed()` | `Schedule.createMany()` | Status = `draft` |
| 11 | Step 7 — Publish | Same | `POST /schedule/bulk-publish` | `ScheduleService.publish()` | `Schedule.updateMany()` | Status = `published`, `publishedAt` set |
| 12 | Readiness recalculated | Success screen | `POST /schools/:id/readiness/recalculate` | `OpsCommandCenterService.recalculateReadiness()` | Aggregates all counts | Cached in Redis (5 min) |

### Flow C: TeachingLoad / Tarifikatsiya Creation

| Step | User Action | Frontend | API | Backend | DB Models | Side Effects |
|------|-------------|----------|-----|---------|-----------|--------------|
| 1 | Opens Teaching Loads page | `/dashboard/teaching-loads` | `GET /teaching-loads` | `TeachingLoadService.findAll()` | `TeachingLoad.findMany()` | Filtered by tenant |
| 2 | Clicks "Yangi yuklama" | Modal opens | `GET /users?role=teacher` + `GET /classes` + `GET /subjects` | — | — | Prerequisites loaded |
| 3 | Fills form (teacher + subject + class + hours) | Form submit | `POST /teaching-loads` | `TeachingLoadService.create()` | `TeachingLoad.create()` | Validates `unique_active_teaching_load` |
| 4 | Syncs hours to Subject | — | — | — | `Subject.update()` | `hoursPerWeek` synced |
| 5 | Audit logged | — | — | `AuditService.log()` | `AuditLog.create()` | Non-blocking |

### Flow D: Timetable Generation

| Step | User Action | Frontend | API | Backend | DB Models | Side Effects |
|------|-------------|----------|-----|---------|-----------|--------------|
| 1 | Opens Schedule | `/dashboard/schedule` | `GET /schedule/week` | `ScheduleService.getWeek()` | `Schedule.findMany()` | Redis cache (5 min), weekType filter |
| 2 | Clicks "Avto-generatsiya" | Generate modal | `POST /schedule/generate` | `ScheduleGeneratorService.generate()` | `Subject.findMany()` + `Period.findMany()` + `Room.findMany()` + `Schedule.findMany()` | Greedy algorithm |
| 3 | Reviews proposed slots | Proposal table | — | — | — | Client-side preview |
| 4 | Commits generated slots | "Saqlash" | `POST /schedule/generate/commit` | `ScheduleGeneratorService.commitProposed()` | `Schedule.createMany()` | Status = `draft` |
| 5 | Or uses Advanced Solver | "Advanced generate" | `POST /schedule/advanced-generate` | `AdvancedSolverService.run()` | Same + `SolverRun.create()` | ConflictIndex + backtracking |
| 6 | Solver run persisted | — | — | — | `SolverRun.create()` | Diagnostics saved |

### Flow E: Schedule Publish Lifecycle

```
DRAFT ──validate()──► VALIDATED ──publish()──► PUBLISHED
  ▲                     │                        │
  └────unpublish()──────┘                 archive()──► ARCHIVED
```

| Transition | API | Backend | Conflict Check Against | Cache Invalidation | WS Event |
|-----------|-----|---------|----------------------|-------------------|----------|
| Create | `POST /schedule` | `ScheduleService.create()` | PUBLISHED + VALIDATED | Yes | `schedule:created` |
| Validate | `POST /schedule/:id/validate` | `validate()` | PUBLISHED + VALIDATED | Yes | — |
| Publish | `POST /schedule/:id/publish` | `publish()` | PUBLISHED only | Yes | `schedule:published` |
| Unpublish | `POST /schedule/:id/unpublish` | `unpublish()` | — | Yes | `schedule:unpublished` |
| Archive | `POST /schedule/:id/archive` | `archive()` | — | Yes | — |
| Move (drag-drop) | `POST /schedule/:id/move` | `move()` | PUBLISHED + VALIDATED (exclude self) | Yes | `schedule:updated` |

### Flow F: Teacher Absence → Substitution → Attendance

| Step | User Action | Frontend | API | Backend | DB Models | Side Effects |
|------|-------------|----------|-----|---------|-----------|--------------|
| 1 | Teacher submits leave | `/leave-requests` | `POST /leave-requests` | `LeaveRequestsService.create()` | `LeaveRequest.create()` + `LeaveApproval.createMany()` | Notifications to all approvers |
| 2 | Manager reviews | Approvals page | `PUT /leave-requests/:id/review` | `review()` | `LeaveApproval.update()` | If all approved → `LeaveRequest.status = approved` |
| 3 | Views affected schedules | Substitutions tab | `GET /substitutions/affected?leaveRequestId=` | `getAffectedSchedules()` | `Schedule.findMany()` + `WeekType` matching | Returns slots by date range |
| 4 | Gets candidate teachers | Candidate list | `GET /substitutions/candidates?scheduleId=&date=` | `getCandidates()` | `TeachingLoad.findMany()` + `Schedule.findMany()` + `TeacherAttendance.findMany()` | Scored ranking |
| 5 | Proposes substitutions | Select + "Taklif qilish" | `POST /substitutions/propose` | `proposeSubstitutions()` | `TeacherSubstitution.createMany()` | Status = `proposed` |
| 6 | Approves substitution | Approve button | `POST /substitutions/:id/approve` | `approveSubstitution()` | `TeacherSubstitution.update()` | Status = `approved` |
| 7 | Applies substitution | "Qo'llash" | `POST /substitutions/:id/apply` | `applySubstitution()` | `TeacherSubstitution.update()` + `TeacherAttendance.create()` (original: excused, substitute: present) | Status = `applied` |

### Flow G: Attendance → Payroll Completed Hours

| Step | User Action | Frontend | API | Backend | DB Models | Side Effects |
|------|-------------|----------|-----|---------|-----------|--------------|
| 1 | Teacher takes attendance | `/attendance` | `POST /attendance/mark` | `AttendanceService.markAttendance()` | `Attendance.upsert()` | Alerts to parents |
| 2 | Teacher self-marked present | `/teacher-attendance` | `POST /teacher-attendance/mark` | `TeacherAttendanceService.markAttendance()` | `TeacherAttendance.upsert()` | Source = `manual` |
| 3 | Substitution applied | See Flow F | — | `applySubstitution()` | `TeacherAttendance.create()` (substitute: present) | Source = `substitution` |
| 4 | Payroll generation | `/payroll` | `POST /payroll/monthly/generate` | `PayrollService.generatePayroll()` | `MonthlyPayroll.create()` + `PayrollItem.createMany()` | `scheduledHours` from `Schedule` (weekType-aware) |
| 5 | Recalculate completed hours | Payroll detail | `POST /payroll/monthly/:id/recalculate-completed-hours` | `recalculateCompletedHours()` | `PayrollItem.updateMany()` | Counts `TeacherAttendance` where status = `present` or `substituted` |
| 6 | Net salary computed | — | — | `updatePayrollItem()` | — | `netTotal = base + allowances + hourlyAmount + extras - deductions - advancePaid` |

### Flow H: Export Center Flow

| Step | User Action | Frontend | API | Backend | DB Models | Side Effects |
|------|-------------|----------|-----|---------|-----------|--------------|
| 1 | Opens Export Center | `/dashboard/export-center` | `GET /exports` | `ExportService.list()` | `ExportJob.findMany()` | Paginated history |
| 2 | Selects entity + format + filters | Export modal | `POST /exports` | `ExportService.createAndProcess()` | `ExportJob.create()` | Validates `ENTITY_ROLE_ACCESS` |
| 3 | Processing | Status updates | `GET /exports/:id` | `ExportService.findOne()` | `ExportJob.findUnique()` | Progress tracked |
| 4 | File generated | Download button | `GET /exports/:id/download` | `ExportService.download()` | Reads from `uploads/exports/` | File streamed to client |
| 5 | Audit logged | — | — | `AuditService.log()` | `AuditLog.create()` | Action = `export` |

### Flow I: Ops Command Center Flow

| Step | User Action | Frontend | API | Backend | DB Models | Side Effects |
|------|-------------|----------|-----|---------|-----------|--------------|
| 1 | Opens Ops | `/dashboard/ops` | `GET /ops/today-summary` | `OpsCommandCenterService.getTodaySummary()` | Aggregates 10+ models | Real-time counts |
| 2 | Views alerts | Alerts panel | `GET /ops/alerts` | `getAlerts()` | Same aggregation | Missing periods/classes = critical |
| 3 | Acknowledges alert | Click | `POST /ops/alerts/:id/acknowledge` | `acknowledgeAlert()` | Redis `ops_alert_ack:{id}` | 7-day TTL |
| 4 | Checks readiness | Readiness card | `GET /schools/:id/readiness` | `getReadinessScore()` | Counts all setup entities | Cached in Redis (5 min) |
| 5 | Recalculates | Refresh | `POST /schools/:id/readiness/recalculate` | `recalculateReadiness()` | Same | Cache invalidated + refreshed |

---

## 4. Data Model Map

### 4.1 Tenant / Core

| Model | Purpose | Key Relations | Important Fields |
|-------|---------|---------------|------------------|
| `School` | Top-level tenant | Branches, Users, Classes, Subjects, etc. | `slug`, `isActive`, `deletedAt`, `onboardingStep`, `financeType`, `timezone` |
| `Branch` | Multi-branch per school | School, Users, Classes, Schedules | `schoolId`, `name`, `code`, `isActive` |
| `User` | All users (10 roles) | School, Branch, Classes (as teacher/student), Subjects, TeachingLoads | `role`, `schoolId`, `branchId`, `isActive`, `isFirstLogin`, `coins` |
| `UserBranchAssignment` | Multi-branch staff | User, Branch | `userId`, `branchId`, `role`, `isActive` |
| `SchoolModule` | Feature flags per school | School | `schoolId`, `moduleName`, `isEnabled`, `configJson` |
| `Subscription` | Billing status | School | `schoolId`, `plan`, `billingCycle`, `status`, `trialEndsAt` |
| `SystemConfig` | Key-value settings | School | `schoolId`, `key`, `value` |
| `Invitation` | Email invitations | School, Branch, User (creator) | `tokenHash`, `status`, `role`, `expiresAt` |

### 4.2 Academic

| Model | Purpose | Key Relations | Important Fields |
|-------|---------|---------------|------------------|
| `Class` | Student group per branch | School, Branch, ClassTeacher, Students (via ClassStudent), Subjects | `gradeLevel`, `academicYear`, `classTeacherId` |
| `ClassStudent` | Junction: class ↔ student | Class, User | `classId`, `studentId`, `joinedAt` |
| `Subject` | Class-specific subject assignment | School, Branch, Class, Teacher, TeachingLoads | `classId`, `teacherId`, `hoursPerWeek` |
| `TeachingLoad` | Formal teacher-subject-class contract | School, Branch, Teacher, Subject, Class | `hoursPerWeek`, `semester`, `groupType`, `status` |
| `Grade` | Student score | School, Branch, Class, Student, Subject | `type`, `score`, `maxScore`, `date`, `createdById` |
| `Exam` | Exam schedule | School, Branch, Class, Subject | `frequency`, `isPublished`, `scheduledAt`, `duration` |
| `Homework` | Homework assignment | School, Branch, Class, Subject | `dueDate` |
| `HomeworkSubmission` | Student homework submission | Homework, User | `content`, `fileUrl`, `score` |
| `Club` | Extracurricular | School, Branch, Leader, Subject | `category`, `scheduleDays`, `maxMembers` |

### 4.3 Timetable

| Model | Purpose | Key Relations | Important Fields |
|-------|---------|---------------|------------------|
| `Schedule` | Single timetable slot | School, Branch, Class, Subject, Teacher, Room | `dayOfWeek`, `timeSlot`, `startTime`, `endTime`, `status`, `weekType`, `startDayMinUtc`, `endDayMinUtc` |
| `Period` | Bell schedule entry | School, Branch | `periodNumber`, `startTime`, `endTime`, `dayType` |
| `Room` | Physical classroom | School, Branch, Schedules | `capacity`, `floor`, `type`, `isActive` |
| `SolverRun` | Solver execution history | School | `strategy`, `status`, `placedCount`, `failureCount`, `score`, `metadata` |

### 4.4 Attendance

| Model | Purpose | Key Relations | Important Fields |
|-------|---------|---------------|------------------|
| `Attendance` | Student daily attendance | School, Branch, Class, Student, Schedule | `date`, `status`, `scheduleId`, `createdById` |
| `TeacherAttendance` | Teacher daily status | School, Branch, Teacher, Schedule, LeaveRequest, Substitution | `date`, `status`, `source` |

### 4.5 Payroll / Finance

| Model | Purpose | Key Relations | Important Fields |
|-------|---------|---------------|------------------|
| `StaffSalary` | Staff compensation config | School, Branch, User | `calculationType`, `baseSalary`, `hourlyRate`, `qualificationGrade`, `weeklyLessonHours` |
| `SalaryAdvance` | Advance request | School, StaffSalary, User | `amount`, `month`, `year`, `status` |
| `MonthlyPayroll` | Monthly payroll batch | School, Creator, Approver | `month`, `year`, `status`, `totalGross`, `totalNet` |
| `PayrollItem` | Individual salary line | MonthlyPayroll, StaffSalary, User | `scheduledHours`, `completedHours`, `hourlyAmount`, `grossTotal`, `netTotal` |
| `FeeStructure` | Tuition template | School, Branch | `amount`, `frequency`, `gradeLevel` |
| `Payment` | Student payment transaction | School, Branch, Student, Treasury | `amount`, `status`, `provider`, `providerOrderId` |
| `Treasury` | Cash/bank account | School, Branch | `type`, `balance` |
| `FinancialShift` | Cash register shift | School, Branch, Treasury, Opener, Closer | `startingBalance`, `actualBalance`, `status` |

### 4.6 Operations

| Model | Purpose | Key Relations | Important Fields |
|-------|---------|---------------|------------------|
| `LeaveRequest` | Time-off request | School, Branch, Requester, Approvals | `startDate`, `endDate`, `type`, `affectsSchedule`, `affectsPayroll` |
| `LeaveApproval` | Individual approver decision | LeaveRequest, Approver | `status`, `comment`, `decidedAt` |
| `TeacherSubstitution` | Substitute assignment | School, Branch, Schedule, OriginalTeacher, SubstituteTeacher, LeaveRequest | `date`, `status`, `reason` |
| `DisciplineIncident` | Behavioral record | School, Branch, Student, Reporter | `type`, `severity`, `action`, `resolved` |
| `Lead` | CRM prospect | School, Branch, Assignee | `source`, `status`, `nextContactDate` |

### 4.7 Analytics / Export / Audit / Notification

| Model | Purpose | Key Relations | Important Fields |
|-------|---------|---------------|------------------|
| `ExportJob` | Async export task | School, User | `entity`, `format`, `status`, `progress`, `fileUrl` |
| `AuditLog` | Operation audit trail | School, Branch, User | `action`, `entity`, `entityId`, `oldData`, `newData` |
| `Notification` | In-app notification | School, Branch, Recipient, Sender | `type`, `category`, `priority`, `isRead` |
| `NotificationDelivery` | Delivery attempt log | Notification | `channel`, `status` |
| `Message` | Direct message | School, Sender, Receiver | `content`, `isRead` |
| `Conversation` | Group chat room | School, Creator | `name` |

---

## 5. RBAC / Tenant Isolation

### 5.1 Roles

```
SUPER_ADMIN      Platform-wide admin (explicit scoping required)
DIRECTOR         School-wide owner (can see all branches)
VICE_PRINCIPAL   School-wide manager
BRANCH_ADMIN     Single/multi-branch manager
ACCOUNTANT       Finance operations
LIBRARIAN        Library operations
CLASS_TEACHER    Class-level teacher
TEACHER          Subject teacher
PARENT           Parent portal
STUDENT          Student portal
```

### 5.2 SchoolId Scope

Every non-super-admin query starts with `schoolId: currentUser.schoolId`. The `buildTenantWhere()` utility enforces this:

```ts
// For regular users
{ schoolId: 'abc123' }

// For multi-branch staff
{ schoolId: 'abc123', branchId: { in: ['branch1', 'branch2'] } }

// For super_admin without explicit schoolId
{ schoolId: '__SUPER_ADMIN_REQUIRES_EXPLICIT_SCHOOL_ID__' } // matches nothing
```

### 5.3 BranchId Scope

- **Director / Super Admin:** `branchId` may be `null` → school-wide view
- **Branch Admin / Teacher / Student:** `branchId` is required → branch-scoped view
- **Multi-branch staff:** `assignedBranchIds` array in JWT → `branchId: { in: [...] }`

### 5.4 Branch Admin Restrictions

- Can only create/edit within assigned branches
- Cannot publish/unpublish schedules (Director/VP only)
- Cannot approve payroll (Director only)
- Cannot hard-delete users (Director only)

### 5.5 Teacher / Parent / Student Visibility

| Role | Can See |
|------|---------|
| **Teacher** | Own teaching loads, own schedule slots, own classes' students, own subjects' grades |
| **Class Teacher** | All classes they teach + their homeroom class |
| **Student** | Own schedule, own grades, own attendance, own homework, own exam results |
| **Parent** | Children's schedules, grades, attendance, homework, payments, discipline |

### 5.6 Service-Layer RBAC Patterns

1. **Guard level:** `JwtAuthGuard` → `RolesGuard` → `SubscriptionGuard`
2. **Controller level:** `@Roles(UserRole.DIRECTOR, ...)` decorator
3. **Service level:** `assertCanManage()`, `buildTenantWhere()`, `buildVisibleRoleFilter()`
4. **Database level:** Every query includes `schoolId` (and usually `branchId`)
5. **Super admin hardened:** No blanket bypass — must be explicitly listed in `@Roles()`

---

## 6. Timetable Engine Deep Dive

### 6.1 TeachingLoad as Source of Truth

`TeachingLoad` is the **authoritative** record of which teacher teaches which subject to which class. It enforces:

```prisma
@@unique([teacherId, subjectId, classId, semester, status], name: "unique_active_teaching_load")
```

- Schedule **generation** uses `Subject.hoursPerWeek` as demand source
- Schedule **repair** uses `TeachingLoad` to find qualified substitute teachers
- Timetable **analytics** uses `StaffSalary.weeklyLessonHours` as contractual baseline

### 6.2 SubjectCatalog Behavior

The `catalog()` endpoint groups `Subject` rows by normalized name:

```
Input:  [Biologiya(5A), Biologiya(5B), Biologiya(6A), Matematika(5A)]
Output: [
  { name: "Biologiya", count: 3, classes: [5A, 5B, 6A], teachers: [Ali, Vali] },
  { name: "Matematika", count: 1, classes: [5A], teachers: [Ali] }
]
```

Normalization: `trim().toLowerCase().replace(/\s+/g, ' ')`

### 6.3 Periods

`Period` defines the bell schedule per branch:
- `periodNumber`: sequential (1, 2, 3...)
- `startTime` / `endTime`: `"08:30"` / `"09:15"`
- `dayType`: optional (e.g., "short day")
- Used by `ScheduleService` and `ScheduleGeneratorService` to map `timeSlot` → actual times

### 6.4 Rooms

`Room` is branch-scoped with soft-deactivation:
- Hard delete if no linked schedules
- `isActive: false` if schedules exist
- Capacity tracking for room swap suggestions in repair

### 6.5 Schedule Lifecycle

```
┌─────────┐    validate()    ┌─────────────┐    publish()    ┌────────────┐
│  DRAFT  │ ───────────────► │  VALIDATED  │ ──────────────► │ PUBLISHED  │
└────┬────┘                  └──────┬──────┘                 └─────┬──────┘
     │                              │                              │
     │◄────── unpublish() ──────────┘                              │
     │                                                              │
     │◄────────────────────── unpublish() ─────────────────────────┘
     │                                                              │
     │◄────────────────────── archive() ────────────────────────────┘
     ▼
┌──────────┐
│ ARCHIVED │
└──────────┘
```

- **DRAFT:** Mutable. Conflicts checked against PUBLISHED + VALIDATED.
- **VALIDATED:** Manager-reviewed. Conflicts checked against PUBLISHED + VALIDATED.
- **PUBLISHED:** Immutable for direct edits. Sets `publishedAt` / `publishedBy`. Conflicts checked against PUBLISHED only.
- **ARCHIVED:** Removed from active views.

### 6.6 WeekType: All / Numerator / Denominator

- **ALL:** Appears every week. Counts as 1.0 in analytics.
- **NUMERATOR:** Appears in odd ISO weeks. Counts as 0.5 in analytics.
- **DENOMINATOR:** Appears in even ISO weeks. Counts as 0.5 in analytics.

**Conflict detection:** A NUMERATOR slot conflicts with ALL and NUMERATOR slots, but NOT with DENOMINATOR slots.

**Read filtering:** `weekType: { in: [ALL, effectiveWeekType] }`

### 6.7 Greedy Generator

**Algorithm (MVP):**
1. Load subjects, periods, rooms, existing schedules
2. Expand each `Subject.hoursPerWeek` into individual lesson demands
3. Sort demands by difficulty (higher hours first, then teacher load, then class load)
4. For each demand, iterate candidate `(day, period)` slots:
   - Skip if class/teacher already occupied in this run
   - Try rooms (undefined first, then each room)
   - Check DB conflicts via `ConflictDetectorService.checkClash`
   - Place if valid
5. Return `proposedSlots` + `failures` report

**Commit:** `commitProposed()` validates ownership, checks DB conflicts again, creates `Schedule` rows as `DRAFT`.

### 6.8 Advanced Hybrid Solver

**Improvements over greedy:**
- **ConflictIndex:** In-memory hash map for O(1) clash checks (no DB hits during solving)
- **Backtracking repair:** For failed demands, unplaces blockers and re-places them elsewhere (maxDepth=2)
- **Timeout:** Hard cap 30s, default 10s
- **Scoring:** Base = (placed/demands)×100, penalized for teacher overload (>4/day) and same-subject-same-day

### 6.9 Conflict Detection

**Resource checks (3 independent):**
1. **Teacher** — school-wide (cross-branch). Cannot teach in two branches simultaneously.
2. **Room** — `schoolId + branchId` scoped.
3. **Class** — `schoolId + classId` scoped.

**Overlap formula:** `startA < endB && endA > startB`

**Time conversion:** Local time → weekly UTC minutes: `dayIndex × 1440 + HH×60 + MM - tzOffset`

### 6.10 Drag-and-Drop Move Flow

1. `POST /schedule/:id/move` with `dayOfWeek`, `timeSlot`, `roomId`
2. Fetch slot in transaction
3. No-op detection (unchanged → return immediately)
4. Resolve new period times via `PeriodsService.resolvePeriod()`
5. Validate room belongs to slot's branch
6. `ConflictDetectorService.assertNoClash` against PUBLISHED + VALIDATED (excluding self)
7. Update `dayOfWeek`, `timeSlot`, `startTime`, `endTime`, `roomId`, recompute UTC minutes
8. Commit transaction, invalidate Redis, emit `schedule:updated` WS event, audit log

### 6.11 Repair Suggestions

**Multi-strategy engine:**
1. **Substitute Teacher** — Scored by subject/class qualification (`TeachingLoad`), branch affinity, daily load, weekly sub count, urgency
2. **Room Swap** — Free rooms at same day/slot/branch, scored by capacity
3. **Reschedule** — Another day where teacher+class+room all free at same `timeSlot`
4. **Teacher Swap** — Both teachers qualified via `TeachingLoad` to teach each other's subjects

**Current limitation:** Only `substitute_teacher` can be applied via API; others are analyze-only.

### 6.12 Analytics

| Metric | Calculation |
|--------|-------------|
| **Teacher Utilization** | Published slots (ALL=1.0, NUM/DEN=0.5) / `StaffSalary.weeklyLessonHours` (default 18) |
| **Room Utilization** | Occupied slots / (`periodCount × 5 weekdays`) |
| **Schedule Density** | Unique classes + teachers per `dayOfWeek:timeSlot` |
| **Absence/Substitution** | `TeacherAttendance` + `TeacherSubstitution` counts over date range |
| **Solver Quality** | Last 50 `SolverRun` records: success rate, avg placement %, avg duration |
| **Payroll Variance** | `MonthlyPayrollItem.scheduledHours` vs `completedHours` |

### 6.13 Export

- **Excel:** `ExcelJS` with styled headers, auto-width, filters
- **CSV:** `json2csv` with UTF-8 BOM for Excel compatibility
- **JSON:** Pretty-printed `JSON.stringify`
- **Entities:** 14 export targets with per-entity RBAC

---

## 7. Infrastructure / Deployment

### 7.1 Docker Compose (Self-Host)

**File:** `docker-compose.selfhost.yml`

| Service | Image | Ports | Health Check | Depends On |
|---------|-------|-------|--------------|------------|
| postgres | `postgres:16-alpine` | 5432 | `pg_isready` every 5s | — |
| redis | `redis:7-alpine` | 6379 | `redis-cli ping` every 5s | — |
| migrate | Build from backend Dockerfile | — | — | postgres (healthy) |
| backend | Build from backend Dockerfile | 127.0.0.1:3001 | `wget localhost:3001/api/health` every 15s | postgres, redis, migrate |
| frontend | Build from frontend Dockerfile | 127.0.0.1:3000 | `wget localhost:3000` every 15s | backend (healthy) |

**Networks:**
- `internal` (172.18.0.0/16): DB, Redis, Backend — no external access
- `external` (172.19.0.0/16): Frontend + Caddy — public-facing

**Volumes:**
- `postgres_data` → `/var/lib/postgresql/data`
- `redis_data` → `/data`
- `uploads_data` → `/app/apps/backend/uploads`

### 7.2 Frontend / Backend Containers

**Backend Dockerfile:**
- Stage 1 (builder): `node:20-alpine` → install pnpm → install deps → `prisma generate` → build
- Stage 2 (runner): `node:20-alpine` → copy dist + prisma + node_modules → run as `nestjs` user (uid 1001) → `node dist/main.js`

**Frontend Dockerfile:**
- Stage 1 (builder): `node:20-alpine` → install pnpm → install deps → build Next.js standalone
- Stage 2 (runner): `node:20-alpine` → copy `.next/standalone` + `.next/static` + `public` → run as `nextjs` user (uid 1001) → `node apps/frontend/server.js`

### 7.3 Postgres

- **Version:** 16-alpine
- **Connection:** Via `DATABASE_URL` env var
- **Backup:** Daily cron at 02:00, keeps last 7 days (`pg_dump`)
- **Migrations:** Prisma `migrate deploy` runs in `migrate` one-shot container on every deploy

### 7.4 Redis

- **Version:** 7-alpine
- **Password:** Optional (configured via `REDIS_PASSWORD`)
- **Persistence:** AOF enabled via volume `redis_data`
- **Uses:** JWT deny-list, refresh tokens, session revocation, app cache, BullMQ queues

### 7.5 Nginx / Caddy

**Caddy runs OUTSIDE Docker** as a system service on the host:
- Listens on `:80` (HTTP only — Cloudflare handles TLS)
- `auto_https off`
- Routes by hostname and path to backend/frontend containers
- JSON access logs with rotation (10MB × 5 files)
- Compression: `zstd` + `gzip`
- Security headers: `X-Frame-Options`, `X-Content-Type-Options`, `-Server`

**Note:** Nginx config exists in worktrees but production uses Caddy.

### 7.6 Health Checks

| Endpoint | Type | Checks |
|----------|------|--------|
| `GET /api/health` | Liveness | Database (Prisma ping), Memory (heap < 512MB), Redis (ping), BullMQ queue stats |
| `GET /api/health/ready` | Readiness | `{ status: 'ok', timestamp }` |

### 7.7 GitHub Actions Deploy Workflow

**Trigger:** Push to `main`  
**Runner:** Self-hosted (production server)  
**Timeout:** 45 minutes

```
1. git fetch + reset --hard origin/main
2. Disk check + docker cleanup (keep 5GB)
3. docker compose down --remove-orphans
4. docker compose up -d --build
5. Health check loop (60 iterations × 5s = 5 min max)
6. PM2 workload check (port 3002)
7. Status + logs (always runs)
```

### 7.8 Cloudflare / Origin Flow

```
User ──HTTPS──► Cloudflare ──HTTP:80──► Caddy ──► Frontend (:3000) or Backend (:3001)
                                                    │
                                                    ├──► PostgreSQL (:5432, internal network)
                                                    └──► Redis (:6379, internal network)
```

**Critical:** Both backend and frontend bind to `127.0.0.1` only — never exposed directly to the internet.

---

## 8. Scalability / Availability

### 8.1 Current Scaling Approach

| Layer | Approach |
|-------|----------|
| **Frontend** | Next.js standalone, static generation for public pages, SSR for dashboard. Horizontally scalable by adding more containers. |
| **Backend** | NestJS monolith, stateless (except WebSocket sockets). Can scale horizontally with load balancer + sticky sessions for WS. |
| **Database** | Single PostgreSQL instance. Read replicas not yet implemented. |
| **Cache** | Single Redis instance. Can be upgraded to Redis Cluster or Sentinel. |
| **Files** | Local filesystem or MinIO. MinIO supports distributed mode. |

### 8.2 Redis Cache Usage

| Data | TTL | Strategy |
|------|-----|----------|
| Grades list | 5 min | `ck(schoolId, branchId, suffix)` |
| GPA | 3 min | Same pattern |
| Class list | 10 min | `classes:{schoolId}` |
| Schedule reads | 5 min | `schedule:{schoolId}:{branchId}:{weekType}` |
| Readiness score | 5 min | `readiness:{schoolId}` |
| Session/token data | 7–15 days | Redis native TTL |

**Invalidation:** Explicit `del()` on mutations + pattern-based cleanup.

### 8.3 Export Jobs

- MVP: Synchronous processing within HTTP request
- Future: Async via BullMQ worker queue
- File storage: Local filesystem (`uploads/exports/`)
- Cleanup: None automatic; manual or cron needed

### 8.4 Solver Performance

| Metric | Value |
|--------|-------|
| Greedy generator | ~1-3s for 50 subjects |
| Advanced solver (hybrid) | ~5-10s with backtracking, 10s timeout |
| Conflict detection | O(1) with ConflictIndex (in-memory) |
| Database hits during solve | Zero (after initial data load) |

### 8.5 Analytics Caching

- `TimetableAnalyticsService` queries are real-time (no cache)
- `OpsCommandCenterService` caches readiness score in Redis (5 min)
- Dashboard widgets use React Query with stale-while-revalidate

### 8.6 Bottlenecks

| Bottleneck | Impact | Mitigation |
|-----------|--------|------------|
| Single PostgreSQL instance | Read-heavy analytics slow | Add read replicas or materialized views |
| Synchronous export | Large exports block request | Move to BullMQ async workers |
| Self-hosted runner | CI/CD competes with production | Separate build runner from production |
| WebSocket on single instance | Socket state not shared | Add Redis adapter for Socket.IO |
| No CDN for uploads | Large file delivery slow | Use MinIO with Cloudflare R2 or AWS S3 |

### 8.7 Future Improvements

1. **Database:** Read replicas for analytics queries, connection pooling (PgBouncer)
2. **Cache:** Redis Cluster for higher availability
3. **Queues:** Dedicated BullMQ workers on separate containers
4. **Search:** Elasticsearch or Postgres full-text search for user/student search
5. **Monitoring:** Prometheus + Grafana for metrics, Sentry for error tracking
6. **CDN:** Cloudflare R2 or AWS S3 for file storage
7. **Scaling:** Kubernetes with HPA for backend/frontend pods

---

## 9. Infographic Blueprint

### Panel 1: High Level Architecture

**Title:** Xedu Platform Architecture

**Boxes/Nodes:**
- [Cloud] Cloudflare (SSL/CDN)
- [Server] Caddy Reverse Proxy
- [Container] Frontend (Next.js 14)
- [Container] Backend (NestJS 10)
- [Container] PostgreSQL 16
- [Container] Redis 7
- [Container] MinIO / Local Storage

**Arrows:**
- Users → Cloudflare → Caddy → Frontend/Backend
- Backend → PostgreSQL + Redis + MinIO
- Frontend → Backend (API calls)

**Icons:** Cloud, Shield, Box, Database, Layers, Hard Drive

**Labels:** "Mikroservis emas — Modular Monolith", "Docker + Self-Hosted", "Cloudflare TLS"

### Panel 2: Role & RBAC Flow

**Title:** 10 Role'li RBAC Tizimi

**Boxes/Nodes:**
- [Crown] SUPER_ADMIN
- [Building] DIRECTOR
- [User] VICE_PRINCIPAL / BRANCH_ADMIN / ACCOUNTANT
- [Chalkboard] TEACHER / CLASS_TEACHER
- [Family] PARENT / STUDENT

**Arrows:**
- Login → JwtAuthGuard → RolesGuard → @Roles() check → Tenant scope (schoolId + branchId)
- `buildTenantWhere()` → Prisma query

**Icons:** Shield, Key, Lock, Users, Building

**Labels:** "Deny-by-default", "Super Admin blanket bypass yo'q", "Multi-branch staff"

### Panel 3: School Setup Journey

**Title:** 7 Qadamli Setup Wizard

**Boxes/Nodes (horizontal flow):**
1. [School] Maktab & Filial
2. [Clock] Dars davrlari (Periods)
3. [Door] Xonalar (Rooms)
4. [Users] Sinflar (Classes)
5. [BookOpen] O'quv yuklamalari (TeachingLoads)
6. [Calendar] Jadval yaratish (Generate)
7. [Check] Chop etish (Publish)

**Arrows:** Sequential → between all steps

**Icons:** School, Clock, DoorOpen, Users, BookOpen, Calendar, CheckCircle

**Labels:** "Readiness Score: 0 → 100", "Avto-validatsiya har qadamda"

### Panel 4: TeachingLoad / Tarifikatsiya

**Title:** Tarifikatsiya — O'quv Yuklamalari

**Boxes/Nodes:**
- [User] O'qituvchi
- [BookOpen] Fan (Subject)
- [Users] Sinf (Class)
- [Link] TeachingLoad (unique constraint)
- [Clock] Soat/hafta

**Arrows:**
- Teacher + Subject + Class → TeachingLoad → Schedule generation demand
- TeachingLoad → `@@unique([teacherId, subjectId, classId, semester, status])`

**Icons:** User, BookOpen, Users, Link, Clock

**Labels:** "Bitta o'qituvchi = bir nechta fan + sinf", "Soat/hafta + Soat/yil"

### Panel 5: Timetable Generation Engine

**Title:** Jadval Generatsiya Dvigateli

**Boxes/Nodes:**
- [Input] Subject.demands (hoursPerWeek)
- [Gear] Greedy Generator
- [Brain] Advanced Hybrid Solver
  - ConflictIndex (O(1))
  - Backtracking (maxDepth=2)
  - Timeout (10s)
- [Output] Proposed Slots
- [Database] SolverRun (history)

**Arrows:**
- Demands → Greedy → Proposed (fast)
- Demands → Hybrid → Higher quality
- Both → Commit → Schedule (DRAFT)

**Icons:** Database, Cog, Brain, CheckSquare, History

**Labels:** "Greedy = tez, Hybrid = sifatli", "ConflictIndex = O(1) clash check"

### Panel 6: Schedule Lifecycle + WeekType

**Title:** Jadval Hayot Sikli + Hafta Turi

**Boxes/Nodes (lifecycle):**
- [Pencil] DRAFT → [Eye] VALIDATED → [CheckCircle] PUBLISHED → [Archive] ARCHIVED

**Boxes/Nodes (weekType):**
- [Calendar] ALL (har hafta)
- [Divide] NUMERATOR (toq haftalar)
- [Divide] DENOMINATOR (juft haftalar)

**Arrows:**
- validate() / publish() / unpublish() / archive() transitions
- WeekType filter: `weekType: { in: [ALL, effective] }`

**Icons:** Pencil, Eye, CheckCircle, Archive, Calendar

**Labels:** "Draft → Validate → Publish → Archive", "NUM/DEN = juft/toq haftalar"

### Panel 7: Attendance + Payroll Bridge

**Title:** Davomat → Ish Haqi Bog'lashi

**Boxes/Nodes:**
- [CheckSquare] Student Attendance
- [CheckSquare] Teacher Attendance
- [Users] Substitution (o'rinbosar)
- [Link] PayrollService
  - `countScheduledHoursFromSchedule()`
  - `countCompletedHoursFromAttendance()`
- [FileText] PayrollItem (netTotal)

**Arrows:**
- Attendance marked → TeacherAttendance (present/substituted)
- Substitution applied → both teachers get attendance records
- Payroll generation → scheduledHours (from Schedule) + completedHours (from TeacherAttendance)
- Net salary = base + allowances + hourly - deductions - advance

**Icons:** CheckSquare, Users, Link, FileText, Calculator

**Labels:** "ScheduledHours = jadvaldan", "CompletedHours = davomatdan"

### Panel 8: Substitution & Repair Workflow

**Title:** O'rinbosarlik & Ta'mirlash

**Boxes/Nodes:**
- [Alert] Leave Request (approved)
- [Search] Affected Schedules
- [Trophy] Candidate Scoring (+50 same subj+class, load penalties)
- [UserPlus] Propose → Approve → Apply
- [Wrench] Repair Suggestions (substitute / room swap / reschedule / teacher swap)

**Arrows:**
- Leave → Affected → Candidates → Propose → Apply → TeacherAttendance created

**Icons:** AlertTriangle, Search, Trophy, UserPlus, Wrench

**Labels:** "Scored candidate ranking", "4 ta ta'mirlash strategiyasi"

### Panel 9: Ops Command Center + Analytics

**Title:** Ops Boshqaruv Markazi + Analytics

**Boxes/Nodes:**
- [Gauge] Readiness Score (0–100)
- [Bell] Alerts (Critical / Warning / Info)
- [BarChart] Today Summary (schedules, attendance, payroll, substitutions)
- [PieChart] Timetable Analytics (utilization, density, solver quality)
- [Download] Export Center (14 entity, 3 format)

**Arrows:**
- All data → Ops aggregation → Alerts + Readiness
- All data → Analytics → KPIs
- Any data → Export → CSV/XLSX/JSON

**Icons:** Gauge, Bell, BarChart, PieChart, Download

**Labels:** "Real-time operational snapshot", "14 ta entity export"

### Panel 10: Deployment + Scalability

**Title:** Deploy + Kengaytish

**Boxes/Nodes:**
- [GitBranch] GitHub Actions (self-hosted runner)
- [Docker] docker-compose.selfhost.yml
- [Server] 5 services (Postgres, Redis, Migrate, Backend, Frontend)
- [Shield] Health checks (liveness + readiness)
- [TrendingUp] Future: Read replicas, Redis Cluster, K8s

**Arrows:**
- Push to main → GitHub Actions → Server → docker compose up → Health check

**Icons:** GitBranch, Container, Server, Shield, TrendingUp

**Labels:** "Self-hosted, single server", "Horizontal scale ready"

---

## 10. Key Features

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Xedu — Key Features                               │
├─────────────────────────────────────────────────────────────────────────────┤
│ • Multi-tenant SaaS — bir platform, cheksiz maktab (schoolId + branchId)   │
│ • 10 Role'li RBAC — Director'dan Student'gacha, deny-by-default             │
│ • 7 Qadamli Setup Wizard — maktabni 15 daqiqada ishga tushirish            │
│ • Avto Jadval Generatsiya — greedy + hybrid solver, backtracking repair    │
│ • WeekType (NUM/DEN) — juft/toq haftalar uchun alohida darslar             │
│ • Intelligent Substitution — scored candidate ranking, 4 strategiya        │
│ • Attendance → Payroll Bridge — avto hisoblagich soatlari                  │
│ • Uzbekistan 2026 Tariff — BHM asosida avto ish haqi hisoblash             │
│ • Real-time Notifications — SMS (Infobip) + Email + WebSocket + In-app     │
│ • 14 Entity Export Center — CSV/XLSX/JSON, RBAC bilan                      │
│ • Ops Command Center — readiness score, actionable alerts, today summary   │
│ • Online Exam Engine — DocX import, auto-grading for objective questions, timer enforcement │
│ • Self-hosted Deployment — Docker Compose, GitHub Actions, Cloudflare      │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

*Report generated from source code analysis of commit `d470a1f` (v0.1.0-pilot).*
