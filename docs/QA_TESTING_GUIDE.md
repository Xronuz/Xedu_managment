# Xedu QA Test Qo'llanmasi

> **Maqsad**: Har bir role uchun to'g'ri flow, kutilgan xatti-harakat va xatolarni aniq standartlar asosida tekshirish.  
> **Versiya**: 2026-06-29  
> **Muhit**: `https://your-deploy-url` (yoki `http://localhost:3000` lokal)

---

## Tizim arxitekturasi (qisqacha)

```
Xedu = Next.js frontend + NestJS backend + PostgreSQL (Prisma) + Redis
Multi-tenant: maktab → filiallar → foydalanuvchilar
Role ierarxiyasi (rank): super_admin(100) > director(80) > vice_principal(60)
  > branch_admin(40) > accountant/librarian(20) > class_teacher(15)
  > teacher(10) > student/parent(5)
```

**Asosiy qoida**: har bir rol faqat o'zidan **past** rangli rollarni boshqara oladi.

---

## Login ma'lumotlari (demo/seed)

| Role | Email | Parol |
|------|-------|-------|
| Super Admin | `super@eduplatform.uz` | `SuperAdmin123!` |
| Direktor | `director@demo-school.uz` | `Director123!` |
| O'rinbosar (VP) | `vice@demo-school.uz` | `Vice123!` |
| O'qituvchi | `teacher@demo-school.uz` | `Teacher123!` |
| Sinf rahbari | `classteacher@demo-school.uz` | `ClassTeacher123!` |
| Moliyachi | `accountant@demo-school.uz` | `Accountant123!` |
| Kutubxonachi | `librarian@demo-school.uz` | `Librarian123!` |
| O'quvchi | `student@demo-school.uz` | `Student123!` |
| Ota-ona | `parent@demo-school.uz` | `Parent123!` |

> **Namcity pilot** uchun: `uzversale-namcity@gmail.com` (direktor), `samandar-namcity@gmail.com` (filial admin), `Azizbek-namcity@gmail.com` (VP)

---

## Global tekshiruv standartlari (har bir rolda)

Quyidagilarni har bir role testida tekshiring:

- [ ] Login ishlaydi, sessiya saqlanadi (refresh'dan keyin ham login holati saqlanadi)
- [ ] Sidebar faqat ruxsat etilgan bo'limlarni ko'rsatadi
- [ ] Ruxsat yo'q sahifaga to'g'ridan-to'g'ri URL kirib borishda redirect bo'ladi
- [ ] Browser consoleda `404`, `500`, JS xatosi yo'q
- [ ] Network tabda `403` (noto'g'ri chaqiruv) va `500` yo'q
- [ ] Toast xabarlari o'zbek tilida va aniq
- [ ] Skeleton/loading holati bor (0 yoki bo'sh emas)
- [ ] Dark/Light mode ishlaydi

---

## Role 1: Direktor (`director`)

### Kontekst
Maktab darajasida bosh boshqaruvchi. Barcha filiallarni, xodimlarni, moliyani ko'radi. Yagona **hard-delete** huquqiga ega.

### Sidebar bo'limlari
`Dashboard` · `Tasdiqlash` · `Ogohlantirishlar` · `Xodimlar` · `Akademik kalendar` · `Hisobotlar` · `Maktab ekrani` · `Sozlamalar`

### CRUD — Xodimlar (`/dashboard/users`)

| Harakat | Kutilgan natija | Tekshirish |
|---------|----------------|------------|
| **Create** | `Foydalanuvchi qo'shildi` toast, jadvalda ko'rinadi | Rol dropdown: VP, Branch Admin, Teacher, Class Teacher, Accountant, Librarian, Student, Parent |
| **Read** | Barcha filial xodimlari ko'rinadi | Rol filter ishlaydi |
| **Update** (familiya) | `Foydalanuvchi yangilandi` toast, jadval **darhol** yangilanadi (refresh kutilmaydi) | ✅ v4630f7d dan keyin tuzatilgan |
| **Block** | Modal: to'g'ri ism/familiya, success toast, modal **yopiladi** | ✅ v4630f7d dan keyin tuzatilgan |
| **Unblock** | Modal: `Faollashtirish`, success toast, modal yopiladi | |
| **Hard Delete** | Confirm dialog to'g'ri matn, success toast, modal yopiladi, jadvaldan o'chadi | Faqat direktor ko'radi |
| **Parol tiklash** | Vaqtinchalik parol modal ko'rinadi, copy ishlaydi | |

**Tekshirish nuqtalari:**
- [ ] Super admin va boshqa direktortni hard-delete qilishga urinishda xato xabari chiqadi
- [ ] O'z profilini bloklashga urinishda xato chiqadi
- [ ] Rol dropdown `super_admin` va `director` ni o'z ichiga olmaydi
- [ ] Email tekshiruvi (onBlur): mavjud email kiritilganda warning ko'rinadi
- [ ] `autocomplete="new-password"` — parol managerdan oldingi parol taklif qilinmaydi ✅
- [ ] Import (Excel): template yuklab, to'ldirib, parse → valid rows preview ko'rinadi
- [ ] Import parse: bo'sh fayl → 400 xato; noto'g'ri ustun → aniq xabar

### Dashboard KPI
- [ ] O'quvchilar, xodimlar, bugungi davomat sonlari aniq
- [ ] Grafik va wiget'lar yuklanadi (skeleton → data, 0 bo'lmaydi)
- [ ] Kelayotgan imtihonlar, ta'til so'rovlari ko'rinadi

### Qo'shimcha bo'limlar
- [ ] `/dashboard/branches` — filial qo'shish/ko'rish ishlaydi
- [ ] `/dashboard/reports` — hisobot filter va yuklab olish ishlaydi
- [ ] `/dashboard/audit-log` — amallar tarixi ko'rinadi
- [ ] `/dashboard/approvals` — tasdiqlash inbox ishlaydi

---

## Role 2: Filial Admin (`branch_admin`)

### Kontekst
Bitta filialga bog'liq. Faqat **o'z filialining** xodimlarini ko'radi va boshqaradi. Moliyaviy operatsiyalarga kirish bor, lekin `/payments/report` yo'q.

### Sidebar bo'limlari
`Dashboard` · `Operatsion markaz` · `Maktab sozlash` · `Ogohlantirishlar` · `Ta'lim` · `Operatsiyalar` · `Jamoa` · `Moliya & Sotuv` · `Hisobot & Tizim`

### Dashboard KPI (kritik)

- [ ] Login bo'lgandan keyin KPI **skeleton ko'rinadi** (0 emas) ✅ v12dab91 dan tuzatilgan
- [ ] Hydrate bo'lgandan keyin real sonlar chiqadi
- [ ] `Bugungi davomat X ta o'quvchidan` — filial o'quvchilari soni
- [ ] Profil dropdown: `Asosiy filial` (yoki filial nomi) — **`Barcha filiallar` emas** ✅ v4630f7d

### CRUD — Xodimlar

| Harakat | Kutilgan natija | Tekshirish |
|---------|----------------|------------|
| **Create** | Faqat o'z filialiga yaratadi | Rol: Teacher, Class Teacher, Accountant, Librarian, Student, Parent |
| **Read** | Faqat o'z filial xodimlari ko'rinadi | Boshqa filial xodimlari **ko'rinmaydi** |
| **Update** | ✅ Ishlashi kerak (v4630f7d) | `Foydalanuvchi yangilandi` toast, jadval darhol yangilanadi |
| **Block/Unblock** | ✅ Ishlashi kerak (v4630f7d) | Modal to'g'ri ism, success'dan modal yopiladi |
| **Delete** | Ko'rinmaydi — bu to'g'ri | Faqat direktor hard-delete qila oladi |

**Tekshirish nuqtalari:**
- [ ] Boshqa filial xodimini edit/block qilishga URL manipulation bilan urinishda 403 chiqadi
- [ ] `/dashboard/payments/report` ga to'g'ridan-to'g'ri kirishda 403 — **global toast chiqmaydi** ✅ v12dab91
- [ ] Rol yaratish dropdown: VP va Direktor **ko'rinmaydi**

### Ta'lim bo'limi
- [ ] `/dashboard/students` — faqat o'z filial o'quvchilari
- [ ] O'quvchi sinf ustunida sinf nomi ko'rinadi (**bo'sh emas**) ✅ v12dab91
- [ ] `Sinfga birikmagan` statistikasi real sonni ko'rsatadi
- [ ] `/dashboard/classes` — sinflar va o'quvchilar soni to'g'ri
- [ ] `/dashboard/schedule` — jadval ko'rish va tahrirlash ishlaydi

### Import
- [ ] Excel import: template yuklab → to'ldirish → parse → commit
- [ ] 100 ta o'quvchi commit: `created + skippedDuplicates = 100` ✅ v12dab91
- [ ] Qayta commit: `created=0, skippedDuplicates=100` — 409 xato emas

---

## Role 3: Mudir O'rinbosari (`vice_principal`)

### Kontekst
Maktab darajasida (filial emas) operatsion boshqaruv. Moliya ko'rinmaydi. Branch Admin bilan bitta dashboard komponentini ishlatadi.

### Sidebar bo'limlari
`Dashboard` · `Ogohlantirishlar` · `Ta'lim` · `Operatsiyalar` · `Jamoa` · `Hisobot & Tizim`

### Dashboard — kritik tekshiruv
- [ ] Sahifa ochilganda **hech qanday 403 toast yo'q** ✅ v12dab91 (`/payments/report` chaqirilmaydi)
- [ ] Network tabda `/payments/report` request **ko'rinmaydi**
- [ ] `Moliya` bo'limi sidebar'da ko'rinmaydi — bu to'g'ri

### CRUD — Xodimlar

| Harakat | Kutilgan natija |
|---------|----------------|
| Create | Teacher, Class Teacher, Accountant, Librarian, Student, Parent yaratishi mumkin |
| Read | Barcha maktab xodimlari ko'rinadi |
| Update | ✅ Ishlaydi, jadval darhol yangilanadi |
| Block/Unblock | ✅ Ishlaydi, modal to'g'ri yopiladi |
| Delete | Ko'rinmaydi — to'g'ri |

**Tekshirish nuqtalari:**
- [ ] VP direktor/super_admin ni edit qila olmaydi (403)
- [ ] Block modal ochilganda to'g'ri ism/familiya ko'rinadi (`undefined undefined` emas) ✅
- [ ] `/dashboard/branches` ga kirish ishlaydi
- [ ] `/dashboard/finance` ga kirishda 403 redirect yoki 404

---

## Role 4: O'qituvchi (`teacher`)

### Kontekst
Faqat o'zi o'qitadigan **fan va sinflarga** kirishi mumkin. O'zgasini ko'ra olmaydi.

### Sidebar bo'limlari
`Dashboard` · `Dars jadvali` · `Baholar` · `Davomat` · `Topshiriqlar` · `Imtihonlar` · `Ta'lim resurslari` · `Kutubxona` · `Intizom` · `Xabarlar`

### CRUD tekshiruvi

| Bo'lim | Kutilgan |
|--------|---------|
| `/dashboard/schedule` | Faqat **o'z** dars jadvali ko'rinadi |
| `/dashboard/grades` | Faqat o'z fanidan baholar qo'shadi/ko'radi |
| `/dashboard/attendance` | Faqat o'z sinfi davomat belgilaydi |
| `/dashboard/homework` | O'z faniga topshiriq yaratadi |
| `/dashboard/exams` | O'z faniga imtihon yaratadi |

**Tekshirish nuqtalari:**
- [ ] Boshqa o'qituvchi faniga baho qo'shishga urinishda 403
- [ ] `/dashboard/users` ga kirishda 403 redirect
- [ ] `/dashboard/finance` ga kirishda 403 redirect
- [ ] Davomat belgilaganda faqat o'z sinf ro'yxati chiqadi
- [ ] `teacher_guard` — o'z sinfi/fanidan tashqari `classId` bilan API chaqirishda xato

---

## Role 5: Sinf Rahbari (`class_teacher`)

### Kontekst
Teacher huquqlariga + o'z sinfi uchun kengaytirilgan kirish (davomat bulk, sinf boshqaruvi).

### Qo'shimcha tekshirish
- [ ] `/dashboard/my-class` — faqat sinf rahbari uchun, o'z sinfi ma'lumotlari
- [ ] `/dashboard/attendance/bulk` — to'toppa davomat ishlaydi
- [ ] `/dashboard/meetings` ga kirish bor
- [ ] O'z sinfi o'quvchilarining to'liq profili ko'rinadi

---

## Role 6: Moliyachi (`accountant`)

### Sidebar bo'limlari
`Dashboard` · `Moliya` · `To'lovlar` · `Ish haqi` · `Hisobotlar` · `CRM`

### Tekshirish
- [ ] `/dashboard/finance` — to'lovlar, qarzdorlar ro'yxati ko'rinadi
- [ ] `/dashboard/payments` — to'lov qo'shish/ko'rish ishlaydi
- [ ] `/dashboard/payroll` — ish haqi hisoblash ko'rinadi
- [ ] `/dashboard/users` ga kirishda 403 redirect (**foydalanuvchi CRUD yo'q**)
- [ ] `/dashboard/classes` ga kirishda 403 redirect

---

## Role 7: Kutubxonachi (`librarian`)

### Sidebar bo'limlari
`Dashboard` · `Kutubxona` · `Ta'lim resurslari` · `Xabarlar`

### Tekshirish
- [ ] `/dashboard/library` — kitob qo'shish/ko'rish/bron ishlaydi
- [ ] `/dashboard/learning-center` — resurs ko'rish ishlaydi
- [ ] `/dashboard/finance` ga kirishda 403 redirect
- [ ] `/dashboard/users` ga kirishda 403 redirect

---

## Role 8: O'quvchi (`student`)

### Kontekst
Faqat **o'z** ma'lumotlarini ko'radi. Hech narsa yaratmaydi, faqat ko'radi.

### Flow
1. Login → `/dashboard` → `/dashboard/student` redirect (yoki direkt student sahifasi)
2. Dars jadvali: faqat o'z sinfi jadvali
3. Baholar: faqat o'z baholarni ko'radi
4. Topshiriqlar: ko'radi, topshiradi
5. Davomat: faqat o'z davomat tarixi

### Tekshirish
- [ ] `/dashboard/users` ga kirishda 403 redirect
- [ ] `/dashboard/grades` — faqat o'z baholar (boshqa o'quvchi ID bilan API → 403)
- [ ] `/dashboard/attendance` — faqat o'z davomat
- [ ] Homework submit ishlaydi
- [ ] Gamification: tangalar, yutuqlar ko'rinadi (`/dashboard/coins`)
- [ ] Profil sahifasi: shaxsiy ma'lumotlar ko'rinadi, o'zgartirish ishlaydi

---

## Role 9: Ota-ona (`parent`)

### Kontekst
Faqat bog'langan bolalarining ma'lumotlarini ko'radi.

### Tekshirish
- [ ] Dashboard: bola(lar) tanlash ishlaydi
- [ ] Dars jadvali: bola sinfi jadvali ko'rinadi
- [ ] Baholar va davomat: faqat o'z bolasiga tegishli
- [ ] Xabarlar: o'qituvchilar bilan muloqot ishlaydi
- [ ] Boshqa o'quvchi ID bilan API chaqirishda 403

---

## Maxsus stsenariylar (Cross-role)

### Stsenariy A: Import → Block → Restore flow
```
1. [direktor] 10 ta yangi o'quvchi import qiladi (Excel)
2. Parse: valid rows preview ko'rinadi
3. Commit: { created: 10, skippedDuplicates: 0 }
4. Qayta commit: { created: 0, skippedDuplicates: 10 }
5. [filial admin] ulardan birini block qiladi → modal yopiladi ✅
6. [direktor] ni restore qiladi → jadval yangilanadi
7. [direktor] hard-delete qiladi → jadvaldan yo'qoladi
```

### Stsenariy B: Permission boundary
```
1. [branch_admin A] o'z filialida user yaratadi
2. URL manipulation: boshqa filial userId bilan PUT /api/v1/users/:id
   → 403 qaytishi kerak (findOne branchId scope tutadi)
3. [vice_principal] /payments/report ga GET
   → Network: 404 yoki 403 — lekin UI toastda chiqmaydi ✅
```

### Stsenariy C: Dashboard KPI stale holat
```
1. [branch_admin] login qiladi → skeleton ko'rinadi → real data keladi
2. Browser tab yopib, qayta ochadi → session saqlanadi, 0 ko'rinmaydi ✅
3. Branch switch qiladi (agar multi-branch) → KPI refetch bo'ladi
```

### Stsenariy D: Edit → Stale table yo'qligi
```
1. [direktor] user familiyasini o'zgartiradi
2. Toast chiqadi
3. Modal yopiladi
4. Jadvalda yangi familiya DARHOl ko'rinadi (sahifa refresh qilmasdan) ✅
```

---

## Ko'rinish va UX standartlari

### Har bir sahifada tekshiring
- [ ] **Loading state**: skeleton yoki spinner (0/bo'sh emas)
- [ ] **Empty state**: ma'lumot yo'qligida matn + icon (xato emas)
- [ ] **Error state**: server xatosida toast, sahifa oqmaydi
- [ ] **Mobile responsive**: 375px da asosiy funksiya ishlaydi
- [ ] **Dark mode**: barcha elementlar ko'rinadi, kontrast yetarli

### Form UX
- [ ] Required fieldlar belgilangan (`*`)
- [ ] Validation xato xabarlari o'zbek tilida
- [ ] Submit paytida tugma disabled (double-submit yo'q)
- [ ] `autocomplete="new-password"` — add-user formada eski parol taklif qilinmaydi ✅
- [ ] Modal ochilganda focus to'g'ri field'ga tushadi
- [ ] ESC bilan modal yopiladi

### Toast xabarlari
- [ ] Success: yashil, qisqa (`Foydalanuvchi qo'shildi`)
- [ ] Error: qizil, aniq sabab
- [ ] `Ruxsat yo'q` — faqat haqiqiy 403 da (false alarm bo'lmaydi) ✅

---

## Regression checklist (har deploydan keyin)

Bu testlar oldingi buglarning qaytmasligini ta'minlaydi:

| Bug ID | Test |
|--------|------|
| v12dab91 #3 | Students sahifasida `Sinf` ustuni **bo'sh emas** |
| v12dab91 #2 | Branch admin dashboardda KPI boshida 0 emas, skeleton ko'rinadi |
| v12dab91 #4 | VP dashboard ochilganda hech qanday 403 toast yo'q |
| v12dab91 #1 | Import parse: bo'sh fayl → 400; noto'g'ri ustun → 400 |
| v12dab91 #5 | 100 student import → response'da `skippedDuplicates` fieldi bor |
| v4630f7d #1 | Branch admin o'z filial xodimini edit/block qila oladi |
| v4630f7d #2 | Delete/block modal success'dan keyin **yopiladi** |
| v4630f7d #2 | Block modal'da `undefined undefined` emas, to'g'ri ism ko'rinadi |
| v4630f7d #3 | Update'dan keyin jadval refresh kutmasdan yangilanadi |
| v4630f7d #4 | Branch admin profil: `Barcha filiallar` emas, filial nomi |

---

## Xato topilganda qanday yozish kerak

```markdown
## Bug: [Qisqa tavsif]

**Role**: branch_admin
**Sahifa**: /dashboard/users
**Harakat**: "Tahrirlash" tugmasini bosdim → familiyani o'zgartirdim → "Saqlash"
**Kutilgan**: Toast chiqib, jadvalda yangi familiya ko'rinadi
**Haqiqiy**: Toast chiqdi, lekin jadvalda eski familiya qoldi
**Qadam**: Sahifani refresh qilgandan keyin yangilandi
**Muhit**: Chrome 125, prod deploy
**Console**: Xato yo'q
**Network**: PUT /api/v1/users/:id → 200 OK
```

---

## Muhim API endpointlar (manual test uchun)

```bash
# Auth
POST /api/v1/auth/login
GET  /api/v1/auth/me

# Users CRUD
GET    /api/v1/users?role=teacher&page=1&limit=20
POST   /api/v1/users
PUT    /api/v1/users/:id          # director, VP, branch_admin
DELETE /api/v1/users/:id          # director, VP, branch_admin (soft block)
PUT    /api/v1/users/:id/restore  # director, VP, branch_admin
DELETE /api/v1/users/:id/hard     # director only

# Import
GET  /api/v1/import/templates/students
GET  /api/v1/import/templates/users
POST /api/v1/import/students/parse   # multipart/form-data
POST /api/v1/import/students/commit  # { rows, branchId? }

# Dashboard
GET /api/v1/attendance/today/summary
GET /api/v1/payments/report   # accountant, branch_admin, director (NOT VP!)
GET /api/v1/finance/dashboard # director, branch_admin, VP, accountant
```

---

*Qo'llanma yangilanadi: har bir hotfix yoki feature deploydan keyin tegishli bo'limga regression test qo'shiladi.*
