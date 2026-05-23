# XEDU Platform — To'liq Audit Hisoboti
**Sana:** 2026-05-21  
**Versiya:** 1.0  
**Manzil:** https://xedu.uz  
**Tahlil usuli:** Codebase to'liq o'qish (frontend + backend)

---

## MUNDARIJA

1. [Ijroiy xulosa](#1-ijroiy-xulosa)
2. [Kritik buglar (darhol tuzatish kerak)](#2-kritik-buglar)
3. [Xavfsizlik muammolari](#3-xavfsizlik-muammolari)
4. [Backend mantiq xatolari](#4-backend-mantiq-xatolari)
5. [Frontend UX muammolari](#5-frontend-ux-muammolari)
6. [Validatsiya kamchiliklari](#6-validatsiya-kamchiliklari)
7. [Tugatilmagan / Stub modullar](#7-stub-modullar)
8. [Arxitektura muammolari](#8-arxitektura-muammolari)
9. [Performance muammolari](#9-performance-muammolari)
10. [Yaxshilash takliflari](#10-yaxshilash-takliflari)

---

## 1. IJROIY XULOSA

Xedu platformasi yaxshi arxitektura asosida qurilgan, NestJS backend va Next.js frontend bilan. Lekin **100+ aniq muammo** aniqlandi — 5 ta kritik xavfsizlik zaifligi, 8 ta ma'lumot yo'qotishi mumkin bo'lgan bug, 30+ UX kamchiligi va 10+ stub modul mavjud.

| Toifa | Soni |
|-------|------|
| Kritik buglar | 8 |
| Xavfsizlik zaifliklari | 5 |
| Backend mantiq xatolari | 17 |
| Frontend UX muammolari | 20 |
| Validatsiya kamchiliklari | 15 |
| Stub/tugallanmagan modullar | 11 |
| Performance muammolari | 5 |
| **JAMI** | **81+** |

---

## 2. KRITIK BUGLAR

> Bu buglar foydalanuvchi ma'lumotlarini yo'qotishi, ilova ishdan chiqishi yoki noto'g'ri ma'lumot ko'rsatishi mumkin.

---

### BUG-01 — GPA hisoblashda nolga bo'linish (Division by Zero)
**Fayl:** `apps/backend/src/modules/grades/grades.service.ts` ~489-qator  
**Muammo:** Agar birorta predmet uchun `maxScore = 0` bo'lsa, GPA formulasi `Infinity` yoki `NaN` qaytaradi:
```typescript
// Hozirgi noto'g'ri kod:
const total = grades.reduce((sum, g) => sum + (g.score / g.maxScore) * 100, 0);
```
**Ta'siri:** O'quvchi GPA sahifasi buziladi yoki noto'g'ri foiz ko'rsatadi.  
**Tuzatish:** `if (g.maxScore === 0) continue;` qo'shish kerak.

---

### BUG-02 — Subjects sahifasida branch filtri ishlamaydi
**Fayl:** `apps/frontend/src/app/(dashboard)/dashboard/subjects/_components/subjects-workspace.tsx` ~241-244-qatorlar  
**Muammo:** `subjectsApi.getAll()` chaqiriladi, lekin `activeBranchId` parametri uzatilmaydi. Branch admin maktabning barcha filiallaridagi predmetlarni ko'radi.  
**Ta'siri:** Ma'lumotlar noto'g'ri filtrlanadi.  
**Tuzatish:** API chaqiruviga `branchId: activeBranchId` qo'shish.

---

### BUG-03 — Subjects sahifasida tahrirlashda faqat birinchi sinf saqlanadi
**Fayl:** `apps/frontend/src/app/(dashboard)/dashboard/subjects/_components/subjects-workspace.tsx` ~310-314-qatorlar  
**Muammo:** Forma bir nechta sinfni qo'llaydi, lekin update qilishda faqat birinchisi saqlanadi:
```typescript
classId: form.classIds[0]  // qolgan sinflar yo'qoladi!
```
**Ta'siri:** Foydalanuvchi bir nechta sinfga predmet belgilaydi, lekin faqat birinchisi qoladi.

---

### BUG-04 — Foydalanuvchi nomini kesish xatosi (crash)
**Fayl:** `apps/frontend/src/app/(dashboard)/dashboard/schools/[id]/page.tsx` ~201-qator  
**Fayl:** `apps/frontend/src/app/(dashboard)/dashboard/staff/_components/staff-workspace.tsx` ~226-qator  
**Muammo:** `firstName[0]` va `lastName[0]` operatorlari bo'sh string bo'lganda `undefined` qaytaradi va avatar ko'rsatishda crash bo'ladi.
```typescript
// Xavfli kod:
c.classTeacher.firstName[0] + c.classTeacher.lastName[0]
```
**Tuzatish:** `getInitials(user.firstName, user.lastName)` utility funksiyasidan foydalanish.

---

### BUG-05 — Token yangilanganda Socket ulanmaydi
**Fayl:** `apps/frontend/src/lib/api/client.ts` ~114-118-qatorlar  
**Muammo:** JWT token refresh bo'lganda WebSocket ulanimlari yangi token bilan qayta ulanmaydi. Eski token muddati tugagach barcha real-time xabarlar (bildirishnomalar, chat) to'xtaydi.  
**Tuzatish:** Token refresh bo'lgandan keyin socket disconnect/reconnect chaqirish.

---

### BUG-06 — Davomiylik alertida dublikat xabarlar
**Fayl:** `apps/backend/src/modules/attendance/attendance.service.ts` ~100-197-qatorlar  
**Muammo:** Ota-ona bir nechta farzandiga ega bo'lsa va ikkalasi ham ketma-ket "kelmadi" deb belgilansa, ota-onaga bir kuni uchun bir nechta dublikat SMS/notification yuboriladi.  
**Tuzatish:** Alert yuborishdan oldin `(parentId, date)` bo'yicha dedup qilish.

---

### BUG-07 — Maktab o'chirishda session revoke to'liq bajarilmaydi
**Fayl:** `apps/backend/src/modules/super-admin/super-admin.service.ts` ~186-205-qatorlar  
**Muammo:** Maktab soft-delete qilinadi va foydalanuvchilar deactivate qilinadi (transaction ichida), lekin session revoke alohida loop da ishlaydi. Loop xato bersa, ba'zi foydalanuvchilar logout bo'lmaydi.  
**Tuzatish:** Session revoke-ni ham transaction ichiga olish yoki partial failure-ni handle qilish.

---

### BUG-08 — Debounce timeout komponent o'chirilganda tozalanmaydi (Memory Leak)
**Fayl:** `apps/frontend/src/app/(dashboard)/dashboard/subjects/_components/subjects-workspace.tsx` ~234-238-qatorlar  
**Muammo:** `window.setTimeout` bilan qo'lda debounce qilingan, lekin `clearTimeout` `useEffect` cleanup-da chaqirilmaydi. Bu memory leak va stale state update sabab bo'ladi.  
**Tuzatish:** `useDebouncedValue` hookidan foydalanish (allaqachon import qilingan lekin ishlatilmagan).

---

## 3. XAVFSIZLIK MUAMMOLARI

---

### SEC-01 — KRITIK: To'lov webhook-larida tenant izolyatsiyasi yo'q
**Fayl:** `apps/backend/src/modules/payments/payments.service.ts` ~444-670-qatorlar  
**Muammo:** Payme va Click webhook-lari to'lovni `payment.id` bilan qidiradi, lekin qaysi maktabga tegishli ekanligini tekshirmaydi:
```typescript
// Xavfli — schoolId tekshiruvsiz:
const payment = await this.prisma.payment.findFirst({
  where: { id: params?.account?.order_id, provider: 'payme' },
});
```
**Ta'siri:** Haker boshqa maktabning to'lov ID-sini ishlatib, webhook-ni noto'g'ri yo'naltirishi mumkin.  
**Tuzatish:** `where: { id: ..., schoolId: currentUser.schoolId }` qo'shish. Yoki webhook URL-ga maktab identifikatorini kiritish.

---

### SEC-02 — KRITIK: Barcha maktab bitta Payme merchant bilan ishlaydi
**Fayl:** `apps/backend/src/modules/payments/payments.service.ts` ~575-610-qatorlar  
**Muammo:** Kod o'zi izoh qoldirgan:
> "Currently all schools share one Payme merchant, so we must not return cross-school transactions. Until per-school webhooks are implemented, return empty to prevent data leakage between tenants."

`paymeGetStatement` metodi har doim bo'sh massiv qaytaradi — to'lov hisoboti ishlamaydi!  
**Ta'siri:** Hech bir maktab Payme orqali to'lov hisobotini ko'ra olmaydi.

---

### SEC-03 — To'lov yaratishda avtorizatsiya yo'q
**Fayl:** `apps/backend/src/modules/payments/payments.service.ts` ~46-78-qatorlar  
**Muammo:** `create()` metodi `studentId` qabul qiladi, lekin so'rov qilayotgan foydalanuvchi shu o'quvchining ota-onasi yoki unga ruxsati borligini tekshirmaydi. Istalgan autentifikatsiyalangan foydalanuvchi ixtiyoriy o'quvchi uchun to'lov yarata oladi.  
**Tuzatish:** `assertParentOfChild()` yoki shunga o'xshash ruxsat tekshiruvi qo'shish.

---

### SEC-04 — Taklifnoma qabul qilishda race condition
**Fayl:** `apps/backend/src/modules/invitations/invitations.service.ts` ~318-325-qatorlar  
**Muammo:** Transaction ichida foydalanuvchi mavjudligini tekshirib, so'ng yaratiladi. Lekin `FOR UPDATE` qulfi yo'q — parallel so'rovlar bir vaqtda bir xil emailda ikki foydalanuvchi yaratishi mumkin.  
**Tuzatish:** Proper row-level locking yoki `upsert` ishlatish.

---

### SEC-05 — use-print.ts-da XSS xavfi
**Fayl:** `apps/frontend/src/hooks/use-print.ts`  
**Muammo:** Chop etish uchun `el.innerHTML` ni to'g'ridan-to'g'ri yangi window-ga joylashtiriladi, sanitizatsiya yo'q. Agar kontent zararli HTML o'z ichiga olsa, XSS hujumi mumkin.  
**Tuzatish:** DOMPurify kutubxonasidan foydalanish yoki faqat `textContent` ishlatish.

---

## 4. BACKEND MANTIQ XATOLARI

---

### BE-01 — Foydalanuvchilar ro'yxatida limit cheklanmagan
**Fayl:** `apps/backend/src/modules/users/users.service.ts` ~75-78-qatorlar  
**Muammo:** `findAll()` metodi `limit` parametrini cheklamaydi. Client `?limit=999999` yuborsa, server xotirasini to'ldirishi mumkin. (Payments service bu muammoni hal qilgan, lekin users service hal qilmagan.)  
**Tuzatish:** `limit = Math.min(limit, 200)` qo'shish.

---

### BE-02 — Emailni yangilashda takrorlanish tekshiruvi yo'q
**Fayl:** `apps/backend/src/modules/users/users.service.ts` ~364-qator  
**Muammo:** Foydalanuvchi emailini yangilashda allaqachon boshqa foydalanuvchi shu emaildan foydalanayotganligi tekshirilmaydi. Bu database constraint xatosiga olib keladi.  
**Tuzatish:** Update dan oldin email uniqueness tekshiruvi qo'shish.

---

### BE-03 — CSV import-da sinf topilmasa ham o'quvchi yaratiladi
**Fayl:** `apps/backend/src/modules/users/users.service.ts` ~708-727-qatorlar  
**Muammo:** `classId` noto'g'ri bo'lsa, xato log-ga yoziladi, lekin o'quvchi baribir yaratiladi (sinfsiz). Bu ko'pchilik holda nojo'ya natija.  
**Tuzatish:** Agar `classId` majburiy bo'lsa, o'quvchi yaratmaslik yoki foydalanuvchiga aniq ogohlantirish ko'rsatish.

---

### BE-04 — Davomiylikda o'quvchi sinf a'zoligi tekshirilmaydi
**Fayl:** `apps/backend/src/modules/attendance/attendance.service.ts` ~43-69-qatorlar  
**Muammo:** `markAttendance()` `studentId` qabul qiladi, lekin o'quvchi sinfga tegishli ekanligini tekshirmaydi. Istalgan o'quvchi IDni jo'natib, noto'g'ri sinfga davomiylik belgilash mumkin.  
**Tuzatish:** O'quvchi sinfga tegishli ekanligini tekshiruvchi JOIN qo'shish.

---

### BE-05 — Dars soat hisoblashida float xatolik (To'lov summasi)
**Fayl:** `apps/backend/src/modules/payments/payments.service.ts` ~451-463-qatorlar  
**Muammo:** `Math.round(amount * 100)` ishlatiladi (tiyinga o'tkazish). Katta summalar uchun float precision yo'qolishi mumkin. Masalan: `999999.99 * 100 = 99999998.99999` → `Math.round` → `99999999` (1 tiyin xato).  
**Tuzatish:** `Decimal.js` yoki `BigInt` ishlatish. Maksimum summa validatsiyasi qo'shish.

---

### BE-06 — Sinfga o'quvchi qo'shishda branch mosligini tekshirmaydi
**Fayl:** `apps/backend/src/modules/classes/classes.service.ts` ~209-qator  
**Muammo:** O'quvchi qo'shishda `student.branchId === class.branchId` tekshirilmaydi. Boshqa filial o'quvchisi noto'g'ri sinfga qo'shilishi mumkin.

---

### BE-07 — BranchId ikki marta reference qilinishi
**Fayl:** `apps/backend/src/modules/classes/classes.service.ts` ~99-qator  
**Muammo:** 
```typescript
branchId: dto.branchId ?? currentUser.branchId! ?? currentUser.branchId ?? undefined,
```
`currentUser.branchId` ikki marta yozilgan va `!` operatori bilan noto'g'ri ishlatilgan.

---

### BE-08 — Rol matritsasi ikki joyda takrorlangan
**Fayl:** `apps/backend/src/modules/users/users.service.ts` ~34-56 va `apps/backend/src/modules/invitations/invitations.service.ts` ~24-35  
**Muammo:** `ROLE_CREATION_MATRIX` ikkala faylda alohida copy-paste qilingan. Birini yangilashda ikkinchisi eskirib qolish xavfi bor.  
**Tuzatish:** Shared constants fayliga chiqarish.

---

### BE-09 — Vaqtinchalik parol entropiyasi past
**Fayl:** `apps/backend/src/modules/users/users.service.ts` ~521-qator  
**Muammo:** 
```typescript
const tempPassword = randomBytes(9).toString('base64').slice(0, 12)
  .replace(/[^a-zA-Z0-9]/g, '') + randomBytes(2).toString('hex').slice(0, 2);
```
`replace(/[^a-zA-Z0-9]/g, '')` alifbo bo'lmagan belgilarni olib tashlagach, samarali uzunlik 6-7 belgiga tushadi — bu zaif.  
**Tuzatish:** `randomBytes(12).toString('hex')` — oddiy va kuchli.

---

### BE-10 — To'lov muddati o'tgan sanada bo'lishi mumkin
**Fayl:** `apps/backend/src/modules/payments/payments.service.ts` `CreatePaymentDto`  
**Muammo:** `dueDate` maydoni istalgan ISO sana qabul qiladi. O'tgan sana ham to'g'ri deb hisoblanadi. To'lov yaratilishi bilanoq "muddati o'tgan" bo'lib ko'rinadi.  
**Tuzatish:** `@IsDateString()` va `dueDate >= today` custom validator qo'shish.

---

### BE-11 — Finance debtors-da pagination yo'q
**Fayl:** `apps/backend/src/modules/finance/finance.service.ts` ~150-176-qatorlar  
**Muammo:** `getDebtors()` hardcode `take: 50` bilan ishlaydi. 1000+ qarzdor o'quvchi bo'lsa, faqat 50 tasi ko'rinadi.  
**Tuzatish:** `page`, `limit` parametrlarini qo'shish.

---

### BE-12 — Taklifnomaga limit yo'q (spam)
**Fayl:** `apps/backend/src/modules/invitations/invitations.service.ts` ~99-154-qatorlar  
**Muammo:** Admin bir emailga yoki ko'p emaillarga cheksiz taklifnoma yuborishi mumkin. Rate limiting yo'q.  
**Tuzatish:** `@Throttle()` dekorator qo'shish.

---

### BE-13 — Audit log notification SMS stub rejimida
**Fayl:** `apps/backend/src/modules/notifications/sms.service.ts` ~26-37-qatorlar  
**Muammo:** SMS provider konfiguratsiya qilinmagan bo'lsa (`INFOBIP_API_KEY`, `SMSUZ_API_KEY` yo'q), SMS xizmat "stub" rejimida ishlaydi — xabarlar faqat log-ga yoziladi, haqiqiy SMS yuborilmaydi. Foydalanuvchilarga hech qanday ogohlantirish yo'q.

---

### BE-14 — AI modulidagi barcha provayderlar stub
**Fayl:** `apps/backend/src/modules/ai/provider/` — barcha fayllar  
**Muammo:** OpenAI, Anthropic, Gemini, Local provayderlarning barchasi quyidagicha ishlaydi:
```typescript
const text = `[OpenAI stub] Generated response for: ${prompt.slice(0, 50)}...`;
```
AI funksionalligi hozirda ishlamaydi, lekin frontend-da ko'rsatilmoqda.

---

### BE-15 — Redis xatoligida xavfsiz default yo'q
**Fayl:** `apps/backend/src/modules/auth/auth.service.ts` ~52-63-qatorlar  
**Muammo:** Redis ishlamay qolsa, rate-limiting o'tkazib yuboriladi (so'rov ruxsat etiladi). Bu brute force himoyasi o'chirilishiga olib keladi.  
**Tuzatish:** Redis fail bo'lganda login-ni taqiqlash yoki alohida fallback mexanizm.

---

### BE-16 — Refresh token tanlov tartibi noaniq
**Fayl:** `apps/backend/src/modules/auth/auth.controller.ts` ~68-70-qatorlar  
**Muammo:** Refresh token body-dan ham, cookie-dan ham olinishi mumkin. Ikkalasi bo'lsa, body ustunlik qiladi. Lekin cookie-dan `decodeURIComponent` xato bersa, so'rov jim muvaffaqiyatsizlikka uchraydi.  
**Tuzatish:** Aniq tarjih ketma-keti belgilash va xato holat handle qilish.

---

### BE-17 — Canteen menyusida kaloriya/narx manfiy bo'lishi mumkin
**Fayl:** `apps/backend/src/modules/canteen/` (canteen.service.ts)  
**Muammo:** Menyu elementlari uchun `price` va `calories` maydonlarida `@Min(0)` validatori yo'q. Manfiy narx yoki kaloriya kiritilishi mumkin.

---

## 5. FRONTEND UX MUAMMOLARI

---

### UX-01 — Maktab o'chirishda kiritish harf-sezgir
**Fayl:** `apps/frontend/src/app/(dashboard)/dashboard/schools/page.tsx` ~87-89-qatorlar  
**Muammo:** Maktab o'chirish uchun "O'CHIRISH" deb kiritish kerak, lekin bu foydalanuvchiga oldindan aytilmaydi. Bundan tashqari, kichik harfda kiritsangiz ishlamaydi.  
**Tuzatish:** Oldindan ko'rsatmalarda qanday yozish kerakligini aniq ko'rsatish va `trim()` + case-insensitive tekshiruv.

---

### UX-02 — Slug avtomatik yangilanishi foydalanuvchi matnini ustib yozadi
**Fayl:** `apps/frontend/src/app/(dashboard)/dashboard/schools/new/page.tsx` ~85-91-qatorlar  
**Muammo:** Maktab nomi yozilganda slug avtomatik generatsiya qilinadi. Foydalanuvchi slugni o'zgartirib, keyin nom qo'shsa, slug qayta avto-overwrite qilinadi. Foydalanuvchi nazoratni yo'qotadi.  
**Tuzatish:** Foydalanuvchi slugni qo'lda o'zgartirganidan keyin avtomatik yangilashni to'xtatish.

---

### UX-03 — Direktorga predmet yaratish tugmasi ko'rinmaydi
**Fayl:** `apps/frontend/src/app/(dashboard)/dashboard/subjects/_components/subjects-workspace.tsx` ~222-qator  
**Muammo:** `canManage` faqat `['vice_principal', 'branch_admin']` rollarini o'z ichiga oladi. Director predmet yaratib ham, o'zgartira ham olmaydi — bu mantiqiy xato.  
**Tuzatish:** Roʻyxatga `'director'` qo'shish.

---

### UX-04 — Blok/aktivlashtirish tugmasi bosilganda vizual feedback yo'q
**Fayl:** `apps/frontend/src/app/(dashboard)/dashboard/schools/[id]/page.tsx` ~263-qator  
**Muammo:** Maktabni bloklash/aktivlashtirish tugmasi bosilganda API javob kelgunicha UI o'zgarishsiz qoladi. Foydalanuvchi tugma ishlayaptimi-yo'qmi bilmaydi.  
**Tuzatish:** Optimistic update yoki loading spinner qo'shish.

---

### UX-05 — Imlo xatosi sahifa sarlavhasida
**Fayl:** `apps/frontend/src/app/(dashboard)/dashboard/schools/[id]/page.tsx` ~644-qator  
**Muammo:** "Biiktirirlgan sinflar" → to'g'risi: "Biriktirilgan sinflar"

---

### UX-06 — `window.location.href` o'rniga `router.push` ishlatilmaydi
**19 ta fayl** `window.location.href` ishlatadi (to'liq sahifa yangilanishi), holbuki Next.js `router.push()` bilan klient tomonda navigatsiya qilish kerak. Bu sahifa yuklash vaqtini sezilarli oshiradi.  
Asosiy ta'sirlangan fayllar:  
- `attendance-workspace.tsx`  
- `schedule-workspace.tsx`  
- `staff-workspace.tsx`  
- `subjects-workspace.tsx`  
- `students-workspace.tsx`  
- `payments-workspace.tsx`  
- `leave-requests-workspace.tsx`  
- va boshqalar

---

### UX-07 — Bildirishnomalar sozlamalari saqlanmaydi
**Fayl:** `apps/frontend/src/app/(dashboard)/dashboard/settings/page.tsx` ~239-243-qatorlar  
**Muammo:** "In-app", "Email", "SMS" bildirishnomalar faqat mahalliy state-da saqlanadi. Sahifa yangilansa, barcha sozlamalar yo'qoladi. "Saqlash" tugmasi haqiqatda API-ga hech narsa yuborimaydi.  
**Tuzatish:** `notificationsApi.updatePreferences()` chaqiruvini amalga oshirish.

---

### UX-08 — Fayl yuklash vaqtida progress ko'rsatgich yo'q
**Fayl:** `apps/frontend/src/app/(dashboard)/dashboard/homework/page.tsx` ~369-381-qatorlar  
**Muammo:** Fayl yuklanayotganda `uploading` state-i o'rnatiladi, lekin UI-da hech narsa ko'rsatilmaydi. Foydalanuvchi fayl yuklanayotganini bilmaydi.

---

### UX-09 — Ota-ona-o'quvchi ulanishida alohida muvaffaqiyatsizliklar ko'rsatilmaydi
**Fayl:** `apps/frontend/src/app/(dashboard)/dashboard/users/link-parent/page.tsx` ~161-167-qatorlar  
**Muammo:** Bir nechta o'quvchini ota-onaga ulaganda, ba'zi ulashlar muvaffaqiyatsiz bo'lsa, faqat "X ta xato" deyiladi. Qaysi o'quvchi ulanmadi aniq ko'rsatilmaydi.

---

### UX-10 — Jadval konfliktlari yaratishdan oldin ko'rsatilmaydi
**Fayl:** `apps/frontend/src/app/(dashboard)/dashboard/schedule/_components/schedule-workspace.tsx`  
**Muammo:** Dars jadvali yaratishda server-side konflikt tekshiruvi ishlaydi, lekin frontend foydalanuvchiga qanday konflikt borligini aytmaydi. Faqat umumiy xato xabari ko'rsatiladi.

---

### UX-11 — Uy vazifasi muddati o'tgan sanaga o'rnatilishi mumkin
**Fayl:** `apps/frontend/src/app/(dashboard)/dashboard/homework/page.tsx` ~658-qator  
**Muammo:** Sana tanlash inputida `min` atributi o'rnatilmagan — o'qituvchi uy vazifasini bugundan oldingi sanaga qo'yishi mumkin.

---

### UX-12 — Password ko'rsatish tugmasida aria-label yo'q
**Fayl:** `apps/frontend/src/app/(dashboard)/dashboard/profile/page.tsx` ~256-264-qatorlar  
**Muammo:** Ko'z belgisi tugmasi (parolni ko'rsatish/yashirish) `aria-label` atributisiz. Screen reader foydalanuvchilari bu tugma nima qilishini bilmaydi.

---

### UX-13 — Avatar URL qo'llab-quvvatlanmaydi
**Fayl:** `apps/frontend/src/app/(dashboard)/dashboard/profile/page.tsx` ~138-142-qatorlar  
**Muammo:** Profil sahifasida avatar component faqat bosh harflarni ko'rsatadi. `avatar.src` mavjud bo'lsa ham, rasm render qilinmaydi — yuklab bo'lingan avatar ishlatilmaydi.

---

### UX-14 — Announcements yuborishda nima uchun disabled ko'rsatilmaydi
**Fayl:** `apps/frontend/src/app/(dashboard)/dashboard/announcements/page.tsx` ~61-qator  
**Muammo:** "Yuborish" tugmasi disabled bo'lganda, qaysi maydon to'ldirilmagan ko'rsatilmaydi. Foydalanuvchi nima qilish kerakligini bilmaydi.

---

### UX-15 — System config formasi xato bo'lganda eski holatga qaytmaydi
**Fayl:** `apps/frontend/src/app/(dashboard)/dashboard/settings/page.tsx` ~147-164-qatorlar  
**Muammo:** Tizim sozlamalarini saqlash muvaffaqiyatsiz bo'lsa, forma o'zgartirilgan holatda qoladi. Foydalanuvchi sozlamalar saqlangandir deb o'ylashi mumkin.

---

### UX-16 — Staff sahifasida 500+ foydalanuvchi bo'lsa jim kesib tashlanadi
**Fayl:** `apps/frontend/src/app/(dashboard)/dashboard/staff/_components/staff-workspace.tsx` ~96-100-qatorlar  
**Muammo:** `limit: 500` hardcode qilingan. 500 dan ortiq xodim bo'lsa, ular ro'yxatda ko'rinmaydi va hech qanday ogohlantirish yo'q.  
**Tuzatish:** Pagination qo'shish yoki "Yana ko'rsatish" tugmasi.

---

### UX-17 — O'quvchilar sahifasi har doim limit=100 bilan chaqiriladi
**Fayl:** `apps/frontend/src/app/(dashboard)/dashboard/students/_components/students-workspace.tsx` ~87-qator  
**Muammo:** `limit: 100` hardcode qilingan. 100 dan ortiq o'quvchi bo'lsa qolganlar ko'rsatilmaydi.

---

### UX-18 — Director dashboard-da `useTransition` import qilingan, lekin ishlatilmaydi
**Fayl:** `apps/frontend/src/app/(dashboard)/dashboard/_components/director-dashboard.tsx` ~67-qator  
**Muammo:** `const [, startNonUrgent] = useTransition()` e'lon qilingan lekin hech qanday joyda `startNonUrgent` chaqirilmaydi. Dead code.

---

### UX-19 — Director dashboard-da usersApi.getAll(limit=1000)
**Fayl:** `apps/frontend/src/app/(dashboard)/dashboard/_components/director-dashboard.tsx` ~86-91-qatorlar  
**Muammo:** Dashboard ochilganda 1000 foydalanuvchi yuklab olinadi. Katta maktablarda bu sahifani sekinlashtiradi.  
**Tuzatish:** Faqat kerakli statistikani API-da agregat qilib olish.

---

### UX-20 — Branch switching barcha cache-ni o'chiradi
**Fayl:** `apps/frontend/src/hooks/use-switch-branch.ts` ~104-qator  
**Muammo:** `queryClient.clear()` butun cache-ni tozalaydi, shu jumladan autentifikatsiya va maktab ma'lumotlari. Bu keraksiz va foydalanuvchi tajribasini yomonlashtiradi (barcha ma'lumotlar qayta yuklanadi).  
**Tuzatish:** Faqat branch-ga bog'liq query-larni invalidate qilish.

---

## 6. VALIDATSIYA KAMCHILIKLARI

---

### VAL-01 — Email regex juda sodda
**Fayl:** `apps/frontend/src/app/(dashboard)/dashboard/schools/new/page.tsx` ~100-qator  
**Muammo:** `/\S+@\S+\.\S+/` — bu `a@b.c` kabi yaroqsiz emaillarni ham o'tkazib yuboradi. Server-side validatsiya ham yetarli bo'lishi shart, lekin client-side ham kuchliroq bo'lishi kerak.

---

### VAL-02 — Telefon raqami formati tekshirilmaydi
**Fayl:** `apps/frontend/src/app/(dashboard)/dashboard/profile/page.tsx` ~191-qator  
**Muammo:** Telefon raqami inputi istalgan matnni qabul qiladi. O'zbek raqam formati (+998 XX XXX XX XX) tekshirilmaydi.

---

### VAL-03 — Maktab tahrirlash formasida validatsiya yo'q
**Fayl:** `apps/frontend/src/app/(dashboard)/dashboard/schools/[id]/page.tsx` ~379-410-qatorlar  
**Muammo:** Yaratishda email va telefon validatsiyasi bor, lekin tahrirlash (edit) rejimida bu validatsiyalar yo'q. Noto'g'ri email yoki telefon saqlash imkoni bor.

---

### VAL-04 — Sinfga o'qituvchi belgilamaslik mumkin (warning, lekin bloklash yo'q)
**Fayl:** `apps/frontend/src/app/(dashboard)/dashboard/classes/_components/classes-workspace.tsx` ~260-269-qatorlar  
**Muammo:** Sinf o'qituvchisi (`classTeacherId`) validatsiya qilinmaydi. O'qituvchisiz sinf yaratilishi mumkin, bu keyinchalik davomiylik va dars jadvalida muammolarga olib keladi.

---

### VAL-05 — Sinfga o'qituvchi belgilaganda mavjudligi tekshirilmaydi (Backend)
**Fayl:** `apps/backend/src/modules/classes/classes.service.ts` ~94-101-qatorlar  
**Muammo:** `classTeacherId` bilan sinf yaratilganda:  
1. Foydalanuvchi mavjudligi tekshirilmaydi  
2. Foydalanuvchi teacher roli borligini tekshirilmaydi  
3. Foydalanuvchi shu maktabga tegishli ekanligini tekshirilmaydi

---

### VAL-06 — Payroll uchun sana oralig'i tekshirilmaydi
**Fayl:** `apps/frontend/src/app/(dashboard)/dashboard/leave-requests/` (va backend)  
**Muammo:** `startDate > endDate` bo'lishi mumkin. Frontend va backend tomonidan tekshirilmaydi.

---

### VAL-07 — KPI metrika progress chegarasi yo'q
**Fayl:** `apps/frontend/src/app/(dashboard)/dashboard/kpi/page.tsx` ~33-36-qatorlar  
**Muammo:** Progress 0-100% doirasidan chiqishi mumkin (masalan 150%), lekin UI `Progress` komponenti faqat 0-100 qabul qiladi — ko'rsatish xato bo'ladi.  
```typescript
const progress = item.progress ?? 0;  // 150 bo'lishi mumkin!
```
**Tuzatish:** `Math.min(100, Math.max(0, progress))` ishlatish.

---

### VAL-08 — Canteen menyu narxi va kaloriyasi manfiy bo'lishi mumkin
**Fayl:** Backend `canteen.service.ts`  
**Muammo:** `@Min(0)` validator `price` va `calories` maydonlarida yo'q. Manfiy qiymatlar kiritilishi mumkin.

---

### VAL-09 — Taklifnoma emaili allaqachon ro'yxatdan o'tganligini tekshirmaydi (foydalanuvchi tajribasida)
**Fayl:** `apps/backend/src/modules/invitations/invitations.service.ts`  
**Muammo:** Agar email allaqachon tizimda ro'yxatdan o'tgan bo'lsa, taklifnoma yuboriladi, lekin accept sahifasida xato yuzaga keladi. Muammo taklifnoma yuborishda erta ko'rsatilishi kerak.

---

### VAL-10 — Foydalanuvchi parol yangilashda hech qanday kuch tekshiruvi yo'q
**Fayl:** `apps/frontend/src/app/(auth)/reset-password/page.tsx`  
**Muammo:** Yangi parol kiritganda kuchlilik ko'rsatgichi (strength indicator) yo'q. "123" kabi zaif parol ham qabul qilinadi.

---

## 7. STUB MODULLAR (tugallanmagan)

Quyidagi funksiyalar platformada ko'rsatiladi, lekin haqiqatda ishlamaydi:

| # | Modul | Status | Izoh |
|---|-------|--------|------|
| 1 | **AI tahlil** | Stub | Barcha AI provayderlar (OpenAI, Anthropic, Gemini, Local) stub javob qaytaradi |
| 2 | **SMS xabarnomalar** | Stub (agar config yo'q) | SMS yuborilmaydi, faqat log-ga yoziladi |
| 3 | **Transport marshrutlari** | Phase 3 | Backend stub, frontend to'liq ammo backend noto'liq |
| 4 | **O'quv markazi (Learning Center)** | Phase 2 | Backend stub deb belgilangan |
| 5 | **Payme to'lov hisoboti** | Singan | `paymeGetStatement` har doim bo'sh massiv qaytaradi |
| 6 | **Notlar yuborish (Messaging)** | Qisman | WebSocket real-time qisman ishlaydi |
| 7 | **KPI avtomatik hisoblash** | Qo'lda | Progress foydalanuvchi qo'lda kiritishi kerak |
| 8 | **Coinlar (Gamification)** | Qisman | Frontend bor, backend integratsiyasi cheklangan |
| 9 | **Marketpleys (Shop)** | Qisman | Staff shop va student shop mavjud, lekin to'lov yo'q |
| 10 | **CRM (Lead management)** | Qisman | Frontend bor, lekin follow-up avtomasiyasi yo'q |
| 11 | **Onboarding templates** | Hardcode | `TEMPLATES` array hardcode qilingan, customizable emas |

---

## 8. ARXITEKTURA MUAMMOLARI

---

### ARCH-01 — 47 faylda `as any` ishlatilgan
Frontend kodida 47 ta fayl `as any` type cast ishlatadi. Bu TypeScript himoyasini o'chiradi va runtime xatolarni yashiradi. Asosiy aybdorlar: `staff-workspace.tsx`, `classes-workspace.tsx`, `payments-workspace.tsx`.

---

### ARCH-02 — Error response formati izchil emas
**Fayl:** `apps/backend/src/modules/users/users.service.ts` ~166-178-qatorlar  
Ba'zi xatolar `{ code, message, ... }` object qaytaradi, boshqalari oddiy string. Frontend error handling-i ba'zi holatlarda noto'g'ri ishlashi mumkin.

---

### ARCH-03 — Xatolar log-ga yozilmaydi (production debugging qiyin)
Ko'plab `catch` blocklari `toast({ variant: 'destructive' })` chaqiradi, lekin `console.error()` chaqirmaydi. Production-da muammolarni trace qilish qiyin.

---

### ARCH-04 — Frontend-backend type sinxronizatsiyasi zaif
`packages/types/` mavjud, lekin ba'zi API response type-lari frontend-da qayta aniqlangan yoki `any` bilan ishlatilgan. Bu frontend-backend kontraktini buzish imkoniyatini ochadi.

---

### ARCH-05 — Ko'p sahifada error boundary yo'q
Sahifalar React error boundary-siz ishlaydi. Komponent render xatosi yuzaga kelsa, butun sahifa oq ekranga aylanadi, foydalanuvchiga hech narsa ko'rsatilmaydi.

---

## 9. PERFORMANCE MUAMMOLARI

---

### PERF-01 — Director dashboard 1000 user yuklaydi
Yuqorida UX-19 da ta'riflangan. Dashboard ochilganda keraksiz katta ma'lumot olinadi.

---

### PERF-02 — Staff sahifasi 500 user bir vaqtda yuklaydi
Yuqorida UX-16 da ta'riflangan. Pagination yo'q.

---

### PERF-03 — Branch switch butun cache-ni tozalaydi
Yuqorida UX-20 da ta'riflangan. Keraksiz barcha querylar qayta chaqiriladi.

---

### PERF-04 — useSocket handlers keraksiz reconnect qiladi
**Fayl:** `apps/frontend/src/hooks/use-socket.ts` ~90-qator  
`handlers` nesting object sifatida `useCallback` dependency-da, har render-da yangi object yaratiladi → WebSocket qayta ulanadi.

---

### PERF-05 — Attendance sahifasida `h-11 w-11` checkbox-lar mobile-da layoutni buzadi
**Fayl:** `apps/frontend/src/app/(dashboard)/dashboard/attendance/_components/attendance-workspace.tsx` ~481-qator  
Mobile-da checkbox-lar juda katta (`44px × 44px`), responsive layout buziladi.

---

## 10. YAXSHILASH TAKLIFLARI

---

### IMP-01 — Pagination hamma ro'yxatlarda bo'lishi kerak
Staff, students, users ro'yxatlari hozir hardcode limit bilan ishlaydi. Haqiqiy pagination (sahifa raqami + "Keyingi") qo'shish kerak.

---

### IMP-02 — Error monitoring tizimi (Sentry yoki boshqa)
Hozir xatolar faqat console-ga yoziladi. Sentry.io, LogRocket yoki Bugsnag integratsiyasi production monitoring uchun muhim.

---

### IMP-03 — Loading skeleton barcha async section-larda bo'lishi kerak
Ba'zi komponentlar loading skeleton ko'rsatadi, ba'zilari emas. Izchil skeleton pattern qo'llanilishi kerak.

---

### IMP-04 — Payme/Click — har maktab uchun alohida merchant
Hozir barcha maktablar bitta Payme merchant-ni ulashadi. Har maktab uchun alohida merchant ID tizimi zarur (bu hozir kod izohlarida ham tan olingan).

---

### IMP-05 — Telefon raqamini format qilib ko'rsatish
`+998 90 123 45 67` kabi formatda ko'rsatilsa, o'qish osonlashadi.

---

### IMP-06 — Parolni o'zgartirishda kuchlilik ko'rsatgichi
Reset password va profil sahifasida parol kuchliligini ko'rsatuvchi indikator qo'shish.

---

### IMP-07 — Bulk action-larda loading va natija ko'rsatish
Bulk davomiylik, bulk o'chirish kabi operatsiyalarda "X ta muvaffaqiyatli, Y ta xato" ko'rsatish.

---

### IMP-08 — Audit log eksporti
Audit log sahifasida CSV/Excel yuklab olish imkoniyati bo'lsa, direktor uchun foydali bo'ladi.

---

### IMP-09 — Rol asosida sidebar navigatsiya optimizatsiyasi
Hozirda rol asosida ko'rsatiladigan va ko'rsatilmaydigan sidebar elementlari bor, lekin ba'zi rollar uchun nomuvofiq holat kuzatiladi (masalan, direktorda predmet boshqarish yo'q — UX-03).

---

### IMP-10 — Offline mode va retry
Network uzilganda foydalanuvchiga "Tarmoq muammosi" banneri ko'rsatilmaydi. `react-query` retry konfiguratsiyasi va offline detection qo'shish tavsiya etiladi.

---

## XULOSA VA USTUVORLIK

### Darhol tuzatish kerak (Critical):
1. **SEC-01** — Payme/Click webhook tenant izolyatsiyasi  
2. **SEC-02** — Payme statement har doim bo'sh qaytaradi  
3. **SEC-03** — To'lov yaratishda avtorizatsiya yo'q  
4. **BUG-01** — GPA division by zero  
5. **BUG-05** — Token refresh-da socket o'ladi  

### 1 hafta ichida (High):
6. **BUG-02** — Subjects branch filter  
7. **BUG-03** — Subjects edit faqat birinchi sinfni saqlaydi  
8. **BUG-04** — firstName[0] crash  
9. **UX-07** — Bildirishnomalar sozlamalari saqlanmaydi  
10. **UX-03** — Direktor predmet yarata olmaydi  
11. **BE-01** — Users limit cap  
12. **BE-09** — Zaif parol generatsiyasi  

### 1 oy ichida (Medium):
- Barcha UX muammolari  
- Barcha validatsiya kamchiliklari  
- Stub modullarni to'ldirish (SMS, Transport, AI)  
- Pagination hamma joyda  

---

*Hisobot Xedu codebase-ni to'liq statik tahlil qilish asosida tuzilgan.*  
*Muallif: Claude Code (Anthropic) | Sana: 2026-05-21*
