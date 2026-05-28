# Ops Ownership Matrix

**Version:** 1.0  
**Date:** 2026-05-28  
**Scope:** Explicit ownership for every readiness task, alert, and ops workflow.

---

## 1. Readiness Checklist Ownership

| # | Task | Category | Primary Owner | Secondary Owner | Visibility Scope | Weight | Required |
|---|------|----------|---------------|-----------------|------------------|--------|----------|
| 1 | Maktab profili to'liq | setup | **director** | vice_principal | director, vp, branch_admin | 10 | ✅ |
| 2 | Kamida 1 ta filial | setup | **director** | vice_principal | director, vp, branch_admin | 10 | ✅ |
| 3 | Dars soatlari sozlangan | setup | **branch_admin** | vice_principal | branch_admin, vp, director | 15 | ✅ |
| 4 | Kamida 1 ta xona | setup | **branch_admin** | vice_principal | branch_admin, vp, director | 10 | ✅ |
| 5 | Kamida 1 ta sinf | setup | **branch_admin** | vice_principal | branch_admin, vp, director | 15 | ✅ |
| 6 | Kamida 1 ta fan | setup | **vice_principal** | branch_admin | vp, branch_admin, director | 15 | ✅ |
| 7 | Dars yuklari biriktirilgan | setup | **vice_principal** | branch_admin | vp, branch_admin, director | 15 | ✅ |
| 8 | Jadval nashr etilgan | schedule | **vice_principal** | branch_admin | vp, branch_admin, director, teacher, class_teacher | 10 | ❌ |

---

## 2. Role Responsibility Map

### Director (Bird's Eye View)

| Responsibility | Mode | Details |
|---------------|------|---------|
| Maktab profili | **Primary** | Name, address, phone, academic year |
| Filial yaratish | **Primary** | Asosiy filial + qo'shimcha filiallar |
| Tasdiqlash inbox | **Primary** | Ta'til so'rovlar, almashtirishlar |
| Strategik qarorlar | **Primary** | Tariflar, moliya, xodimlar siyosati |
| Dars soatlari | **Delegated** → branch_admin | Faqat nazorat, bajarish emas |
| Xonalar | **Delegated** → branch_admin | Faqat nazorat, bajarish emas |
| Sinflar | **Delegated** → branch_admin | Faqat nazorat, bajarish emas |
| Fanlar | **Delegated** → vp | Faqat nazorat, bajarish emas |
| Dars yuklari | **Delegated** → vp | Faqat nazorat, bajarish emas |
| Jadval nashri | **Delegated** → vp | Faqat nazorat, bajarish emas |

### Vice Principal (Academic Execution)

| Responsibility | Mode | Details |
|---------------|------|---------|
| Fanlar | **Primary** | Fanlar ro'yxati, o'quv dasturi |
| Dars yuklari | **Primary** | O'qituvchi-fan biriktirish |
| Jadval nashri | **Primary** | Generatsiya, tekshirish, nashr |
| Davomat nazorati | **Primary** | Kundalik davomat monitoringi |
| Baholash nazorati | **Primary** | Baho kiritish va nashr monitoringi |
| Ta'til so'rovlari | **Secondary** → director | Ko'rib chiqish, lekin direktor tasdiqlaydi |
| O'qituvchi almashtirish | **Secondary** → branch_admin | Maslahat, lekin branch_admin amalga oshiradi |
| Sinflar | **Secondary** → branch_admin | Maslahat, lekin branch_admin yaratadi |

### Branch Admin (Branch Operations)

| Responsibility | Mode | Details |
|---------------|------|---------|
| Dars soatlari | **Primary** | Period vaqtlari, kunlar |
| Xonalar | **Primary** | Xona nomlari, joylashuvi |
| Sinflar | **Primary** | Sinf yaratish, o'quvchilar biriktirish |
| O'qituvchi almashtirish | **Primary** | Kundalik o'rinbosar belgilash |
| Intizom | **Primary** | O'quvchi intizom yozuvlari |
| Foydalanuvchilar | **Primary** | O'qituvchi, ota-ona taklifnomalari |
| Fanlar | **Secondary** → vp | Agar vp band bo'lsa, yordam beradi |
| Jadval | **Secondary** → vp | Agar vp band bo'lsa, yordam beradi |

### Accountant (Finance & Compliance)

| Responsibility | Mode | Details |
|---------------|------|---------|
| Ish haqi | **Primary** | Oylik hisoblash, to'lovlar |
| To'lovlar | **Primary** | Ota-ona to'lovlari, qarzdorlik |
| Tariflar | **Primary** | O'quv to'lovi tariflari |
| Hisobotlar | **Primary** | Moliyaviy hisobotlar |
| Davomat tekshiruvi | **Secondary** | Ish haqi uchun davomat yetishmasligi |
| Shartnomalar | **Secondary** | O'qituvchi shartnomalarini nazorat |

---

## 3. Alert Ownership

| Alert ID | Title | Severity | Owner | Action CTA | Route |
|----------|-------|----------|-------|-----------|-------|
| `setup:periods` | Dars soatlari sozlanmagan | critical | **branch_admin** | Dars soatlarini sozlash | `/dashboard/periods` |
| `setup:rooms` | Xonalar ro'yxati bo'sh | warning | **branch_admin** | Xona qo'shish | `/dashboard/rooms` |
| `setup:classes` | Sinflar yaratilmagan | critical | **branch_admin** | Sinf yaratish | `/dashboard/classes` |
| `setup:subjects` | Fanlar kiritilmagan | critical | **vice_principal** | Fan qo'shish | `/dashboard/subjects` |
| `setup:teachingLoads` | Dars yuklari biriktirilmagan | warning | **vice_principal** | Dars yuklarini biriktirish | `/dashboard/teaching-loads` |
| `schedule:unpublished` | Jadval nashr etilmagan | warning | **vice_principal** | Jadvalni nashr etish | `/dashboard/schedule` |
| `staff:absentWithoutSub` | O'rinbosarsiz o'qituvchi | critical | **branch_admin** | O'rinbosar belgilash | `/dashboard/teacher-substitutions` |
| `staff:pendingLeaves` | Ko'p sondagi ta'til so'rovi | warning | **vice_principal** | So'rovlarni ko'rib chiqish | `/dashboard/leave-requests` |
| `payroll:missing` | Ish haqi hisoblanmagan | warning | **accountant** | Ish haqini hisoblash | `/dashboard/payroll` |
| `payroll:missingAttendance` | Davomat yozuvi yetishmayapti | warning | **accountant** | Davomatni to'ldirish | `/dashboard/teacher-attendance` |

---

## 4. Friction Signal Ownership

| Signal | Severity | Owner | Action CTA | Route |
|--------|----------|-------|-----------|-------|
| Failed exports | medium/high | **accountant** | Eksportlarni tekshirish | `/dashboard/export-center` |
| Failed solver runs | medium/high | **vice_principal** | Jadval generatorini tekshirish | `/dashboard/schedule` |
| Draft schedules never published | medium | **vice_principal** | Jadvalni nashr etish | `/dashboard/schedule` |
| Unpublished grades | medium | **vice_principal** | Baholarni nashr etish | `/dashboard/grades` |
| Ungraded submissions | medium | **vice_principal** | Topshiriqlarni baholash | `/dashboard/homework` |
| Homework with zero submissions | low | **vice_principal** | Uy vazifalarini ko'rish | `/dashboard/homework` |
| Unread announcements | low | **branch_admin** | E'lonlarni ko'rish | `/dashboard/comms` |

---

## 5. Visibility Rules

### Director
- **Sees everything** — all alerts, all friction signals, all readiness items
- **Owns** only strategic items (school profile, branches, approvals)
- **Delegates** all execution tasks (periods, rooms, classes, subjects, teaching loads, schedule)

### Vice Principal
- **Sees** academic-related alerts and signals
- **Owns** subjects, teaching loads, schedule publish, leave approvals
- **Does NOT see** payroll alerts (unless director delegates)

### Branch Admin
- **Sees** branch operations alerts and signals
- **Owns** periods, rooms, classes, substitutions, discipline
- **Does NOT see** payroll or high-level finance alerts

### Accountant
- **Sees** payroll and finance alerts only
- **Owns** payroll, payments, fee structures, reports
- **Does NOT see** academic or setup alerts

---

## 6. Delegation Escalation

| If Primary Owner Fails | Escalation Path | Timeframe |
|------------------------|-----------------|-----------|
| branch_admin inactive | vp → director | 48 soat |
| vp inactive | director → super_admin | 72 soat |
| accountant inactive | director → super_admin | 72 soat |
| director inactive | super_admin (platform) | 96 soat |

---

> **Last Updated:** 2026-05-28
