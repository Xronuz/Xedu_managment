# Xedu Mobil Ilova — Batafsil Reja (React Native)

> Holati: Taklif / reja. Yaratilgan: 2026-06-15.
> Kontekst: mavjud monorepo (NestJS backend + Next.js frontend) ustiga **alohida** React Native mobil ilova.

---

## 1. Maqsad va doiralash (scope)

Mavjud tizim — bu to'liq maktab boshqaruv platformasi (10 ta rol, ~70 modul). Butun
veb-panelni mobilga ko'chirish **noto'g'ri**: direktor/buxgalter/admin ish oqimlari
katta jadvallar, eksport, ko'p ustunli formalar — bular desktopda qoladi.

Mobil ilova **yuqori chastotali, "yo'lda" foydalanuvchilar** uchun:

| Rol | Mobil qiymati | MVP |
|-----|---------------|-----|
| **Ota-ona (parent)** | Eng yuqori — kундалик: davomat, baho, to'lov, e'lon | ✅ MVP |
| **O'quvchi (student)** | Yuqori — jadval, baho, uy vazifasi, coin/portfolio | ✅ MVP |
| **O'qituvchi (teacher / class_teacher)** | Yuqori — davomat belgilash, baho qo'yish, uy vazifa | ✅ MVP (2-bosqich) |
| director / branch_admin | O'rta — faqat ko'rish (read-only dashboard, alerts) | Faza 3 (opsional) |
| accountant / librarian / boshqalar | Past — desktopda qoladi | ❌ |

**Tavsiya:** MVP = **Ota-ona + O'quvchi**, keyin **O'qituvchi**. Backend allaqachon
`parent` moduli (children, attendance, grades, schedule, payments, leave-request,
coins, homework) bilan tayyor — bu MVP'ni tezlashtiradi.

> 🔸 Tasdiqlash kerak bo'lgan qaror: MVP rollar to'plami. Quyidagi reja shu
> uch rol (parent → student → teacher) bo'yicha tuzilgan.

---

## 2. Texnik arxitektura

### 2.1 Stack tanlovi

| Soha | Tanlov | Sabab |
|------|--------|-------|
| Framework | **Expo (managed workflow) + React Native** | EAS Build/Submit, OTA update, push abstraktsiyasi, tez start. Bare RN faqat zarur native modul bo'lsa. |
| Til | TypeScript | Backend/`@eduplatform/types` bilan bir xil |
| Navigatsiya | `expo-router` (file-based) yoki React Navigation | Tab + stack |
| Server state | **TanStack Query** (`@tanstack/react-query`) | Veb bilan bir xil pattern, kesh/refetch |
| Mijoz state | **Zustand** | Veb `auth.store` patternini takrorlaymiz |
| HTTP | **axios** | Veb `client.ts` interceptor mantiqi qayta ishlatiladi |
| Realtime | `socket.io-client` | Backend gateway tayyor |
| Xavfsiz saqlash | `expo-secure-store` (token), `AsyncStorage` (kesh) | httpOnly cookie mobilda yo'q → token shifrlangan keychain'da |
| Forma | `react-hook-form` + `zod` | Veb bilan bir xil |
| i18n | `i18next` / `expo-localization` | uz + ru (mavjud `messages/*.json` qayta ishlatiladi) |
| Push | `expo-notifications` (FCM + APNs) | Backendda **yangi** infratuzilma kerak (3-bo'lim) |
| UI | NativeWind (Tailwind RN) yoki Tamagui | Veb Tailwind tokenlariga yaqin |

### 2.2 Monorepo integratsiyasi

```
apps/
  backend/      (NestJS — o'zgarmaydi, faqat qo'shimchalar)
  frontend/     (Next.js — o'zgarmaydi)
  mobile/       ← YANGI (Expo RN)
packages/
  types/        (@eduplatform/types — mobil ham ulanadi ✅)
  api-client/   ← YANGI (opsional: axios qatlami + zod sxemalari, web+mobile uchun umumiy)
```

- `pnpm-workspace.yaml` ga `apps/mobile` qo'shiladi.
- `@eduplatform/types` ni mobil `package.json` ga `workspace:*` qilib ulash —
  DTO/enum/JwtPayload turlari bir manbadan.
- Metro bundler monorepo (`watchFolders`, `nodeModulesPaths`) sozlanadi.
- Turbo `dev`/`build` pipeline'ga mobil skriptlari qo'shiladi (lekin Expo'ni
  alohida ham ishga tushirsa bo'ladi).

### 2.3 Tarmoq qatlami (eng muhim farq)

Backend `/api/v1`, javoblar **envelope** bilan: `{ success, data, timestamp, path }`.
Auth ham **Bearer header**, ham cookie qabul qiladi (`extractToken`: avval Bearer).
Mobilda cookie yo'q → **faqat Bearer + body refresh** ishlatiladi.

`apps/frontend/src/lib/api/client.ts` mantiqi mobilga ko'chiriladi, farqlar:
1. Token manbasi: `expo-secure-store` (web'da zustand+cookie edi).
2. `withCredentials` **olib tashlanadi** (cookie yo'q).
3. **Refresh body orqali**: `POST /auth/refresh { refreshToken }` (backend buni qo'llaydi —
   `dto?.refreshToken || cookie`). Web faqat cookie ishlatardi.
4. Envelope unwrap (`res.data.data`) — bir xil.
5. 401 → refresh navbati (queue) + circuit breaker — bir xil, lekin `window.location`
   o'rniga navigatsiya → Login ekraniga reset.

---

## 3. Backend o'zgarishlari (kerakli yangi ishlar)

Backend asosan tayyor, lekin mobil uchun **3 ta yangi qism** kerak:

### 3.1 Push notifications (eng katta yangi ish)
Hozir notifikatsiya kanallari: **email + SMS + websocket** (`notifications` moduli).
Push **yo'q** (schema'da `deviceToken`, FCM/APNs/Expo izlari topilmadi).

Kerak:
- **Prisma**: yangi `DeviceToken` modeli (`userId`, `token`, `platform`, `lastSeenAt`).
- **Endpoint**: `POST /notifications/device-token` (ro'yxatga olish), `DELETE` (logout'da).
- **Servis**: `PushService` — Expo Push API (`expo-server-sdk`) yoki to'g'ridan FCM.
  Mavjud `NotificationQueueService` (BullMQ) ga `push` kanali qo'shiladi.
- Notifikatsiya yaratilganda email/SMS yonida push ham yuboriladi (kategoriya bo'yicha
  filtrlanadi — `NotificationCategory` allaqachon bor).

### 3.2 Refresh token rotatsiyasi mobil uchun
- Refresh `7 kun` (cookie maxAge). Mobil sessiyalar uzoqroq kutiladi → "remember me"
  oqimi yoki refresh muddatini mobil klient uchun uzaytirish ko'rib chiqiladi.
- `auth.service.refresh` rotatsiyasini tekshirish (token reuse detection).

### 3.3 CORS / kichik moslashtirishlar
- `enableCors` dev'da hamma origin'ga ruxsat beradi — mobil (native) origin
  yubormaydi, shuning uchun muammo yo'q. Prod'da Bearer oqimi cookie talab qilmaydi.
- Fayl yuklash (`POST /upload/avatar`, `/upload/document`) — `multipart/form-data`,
  mobilda `expo-image-picker` + `FormData` bilan ishlaydi (o'zgarish shart emas).

> Bu uchta ishdan faqat **3.1 (push)** MVP uchun majburiy; 3.2/3.3 — yaxshilash.

---

## 4. Autentifikatsiya oqimi (mobil)

1. **Login** — `POST /auth/login { email, password }` →
   `{ user, tokens: { accessToken, refreshToken } }`.
   - `accessToken` xotirada (zustand) + `secure-store`.
   - `refreshToken` faqat `secure-store`.
2. **isFirstLogin** — agar `user.isFirstLogin === true` → majburiy "Parol o'zgartirish"
   ekrani (`POST /auth/first-login`), yangi tokenlar olinadi. (Web'dagi mantiq.)
3. **Avto-refresh** — 401 da `POST /auth/refresh { refreshToken }`; muvaffaqiyatsiz →
   login ekraniga reset + secure-store tozalash.
4. **Filial almashtirish** (director/admin uchun, agar 3-faza rolllari qo'shilsa) —
   `POST /auth/switch-branch`.
5. **Logout** — `POST /auth/logout` + device-token o'chirish + secure-store tozalash.
6. **Biometrik qulf** (opsional, faza 2) — `expo-local-authentication` bilan ilovaga
   kirishda Face ID / barmoq izi.

---

## 5. Ekranlar (rol bo'yicha MVP)

### 5.1 Umumiy
- Splash → Auth check → (Login | First-login | App)
- Tab navigatsiya (rol bo'yicha tablar farqli)
- Profil + sozlamalar (til uz/ru, bildirishnoma sozlamalari, chiqish)
- Bildirishnomalar markazi (`GET /notifications`, real-time badge)

### 5.2 Ota-ona (Parent) — MVP yadrosi
| Ekran | Endpoint |
|-------|----------|
| Bolalar ro'yxati / tanlash | `GET /parent/children` |
| Bola dashboard (xulosa) | `GET /parent/child/:id` |
| Davomat | `GET /parent/child/:id/attendance` |
| Baholar | `GET /parent/child/:id/grades` |
| Dars jadvali | `GET /parent/child/:id/schedule` |
| To'lovlar / qarzdorlik | `GET /parent/child/:id/payments` |
| Ta'til so'rovi yuborish | `POST /parent/child/:id/leave-request` |
| Coin / mukofotlar | `GET /parent/child/:id/coins` |
| Uy vazifasi | `GET /homework/by-child/:studentId` |
| Xabarlar (chat) | `GET/POST /messaging/...` |
| E'lonlar | `GET /announcements` |

### 5.3 O'quvchi (Student)
- Dashboard, dars jadvali (`/schedule`), baholar (`/grades`), uy vazifasi
  (`/homework`, topshirish `POST /homework/:id/submit`), imtihonlar (`/exams`,
  online-exam sessiyasi opsional), coin do'koni (`/coins`, `shop`), portfolio/yutuqlar.

### 5.4 O'qituvchi (Teacher) — Faza 2
- Bugungi darslar / jadval.
- **Davomat belgilash** — `POST /attendance/mark` (mobilda eng qulay ssenariy).
- **Baho qo'yish** — `POST /grades`, `POST /grades/bulk`.
- **Uy vazifasi berish** — `POST /homework`, topshiriqlarni baholash
  `PUT /homework/:id/submissions/:submissionId/grade`.
- Ta'til/almashtirish so'rovlari, xabarlar.

---

## 6. Realtime (WebSocket)

- Backend `events.gateway.ts`, namespace `/`, auth: `handshake.auth.token` (Bearer) ✅.
- Xonalar: `user:{id}`, `school:{id}`, `branch:{id}` + rol-filtrlangan emit.
- Mobil: ilova ochiq bo'lsa socket ulanadi (yangi xabar/e'lon/baho badge).
  Ilova fonda → push (3.1) orqali. App lifecycle (`AppState`) bilan socket
  reconnect boshqariladi.

---

## 7. Dizayn / UX

- `frontend-design` tamoyillari: toza, branding tokenlari veb bilan moslashtirilgan.
- Bottom-tab + rol-asosli ikonalar (web `navigation.ts` da `mobilePrimary` flagi bor —
  shu prioritetlardan foydalanamiz).
- Dark mode (web `next-themes` bor), uz/ru til almashtirish.
- Offline-tolerant: TanStack Query keshi + "qayta urinish" bannerlari (web
  `client.ts` dagi tarmoq xatosi UX'iga mos).
- Skeleton/loading, pull-to-refresh, empty states.

---

## 8. Bosqichlar (rejalashtirilgan ketma-ketlik)

**Faza 0 — Poydevor (1 hafta)**
- `apps/mobile` Expo skeleton, monorepo + Metro + `@eduplatform/types` ulash.
- axios klient (Bearer + body refresh + envelope unwrap), zustand auth store,
  secure-store, TanStack Query provider, i18n (uz/ru), navigatsiya skeleti.
- Login + isFirstLogin + logout to'liq ishlaydi.

**Faza 1 — Ota-ona MVP (1.5–2 hafta)**
- 5.2 dagi barcha ekranlar (read), leave-request (write), e'lon, profil.
- Real-time badge + bildirishnomalar ro'yxati.

**Faza 2 — Push + O'quvchi + O'qituvchi (2–3 hafta)**
- Backend 3.1 (DeviceToken + PushService + Expo push).
- O'quvchi ekranlari; o'qituvchi davomat/baho/uy vazifa write oqimlari.
- Biometrik qulf (opsional).

**Faza 3 — Yaxshilash & relizi (1–2 hafta)**
- OTA update (EAS Update), Sentry (`@sentry/react-native` — backend Sentry bor),
  analytics, e2e (Detox/Maestro), do'kon metadata.
- EAS Build → TestFlight / Google Play internal track.

> Taxminiy umumiy: **~6–8 hafta** (1 mobil dev). Push backend ishi parallel borishi mumkin.

---

## 9. Xavflar va qarorlar

| Mavzu | Qaror / Eslatma |
|-------|-----------------|
| **Cookie → Bearer** | Mobilda httpOnly cookie ishlamaydi. Backend Bearer + body-refresh'ni allaqachon qo'llaydi ✅ — kod o'zgarishi shart emas. |
| **Push infratuzilmasi yo'q** | Yangi backend ishi (3.1). MVP ota-ona uchun push'siz ham ishlaydi, lekin qiymatning katta qismi push'da. |
| **Payme to'lov** | Memo: Payme pilot kutilmoqda. Mobilda to'lov — faqat ko'rish (read) MVP'da; in-app to'lov keyin (Payme/Click deep-link yoki WebView). |
| **Token muddati** | Access 24s, refresh 7 kun — mobil uchun qisqa. "Remember me" / uzaytirishni ko'rib chiqish. |
| **Expo vs bare** | Expo managed tavsiya. Agar maxsus native SDK (mas. mahalliy to'lov SDK) kerak bo'lsa → EAS bilan config plugin yoki bare'ga o'tish. |
| **App Store/Play** | Apple/Google dev akkaunt, maxfiylik siyosati, yosh reytingi (bolalar ma'lumoti — COPPA/GDPR-K e'tibor). |
| **Kod ulashish** | `packages/api-client` ajratish web+mobile uchun foydali, lekin majburiy emas — MVP'da nusxa olsa ham bo'ladi. |

---

## 10. Birinchi qadamlar (aniq)

1. `apps/mobile` Expo (TypeScript) skeleton yaratish, `pnpm-workspace.yaml` ga qo'shish.
2. Metro'ni monorepo'ga sozlash, `@eduplatform/types` ni ulash va build sinab ko'rish.
3. Backend'ni mobil qurilmadan ochish: `NEXT_PUBLIC_API_URL` o'rniga mobil `.env`
   (`API_URL=http://<LAN-IP>:3001/api/v1`) + LAN/tunnel orqali test.
4. axios klient + auth store + secure-store + login ekrani → birinchi muvaffaqiyatli
   Bearer login.
5. Parent `GET /parent/children` ni ekranlashtirish — birinchi haqiqiy ma'lumot oqimi.

---

### Ilova: tasdiqlangan texnik faktlar (kodga asoslangan)

- API prefiks `/api/v1`, URI versioning, javob envelope `{success,data,timestamp,path}`.
- `JwtAuthGuard.extractToken`: 1) `Authorization: Bearer`, 2) cookie fallback.
- `POST /auth/login` → `{ user{ id,email,firstName,lastName,role,schoolId,branchId,isFirstLogin,avatarUrl }, tokens{ accessToken, refreshToken } }`.
- `POST /auth/refresh` body `{ refreshToken }` ni qo'llaydi (cookie majburiy emas).
- Rollar: super_admin, director, branch_admin, vice_principal, teacher, class_teacher, accountant, librarian, student, parent.
- WebSocket gateway auth: `handshake.auth.token`; xonalar `user:/school:/branch:`.
- Notifikatsiya kanallari hozir: email + SMS + websocket (push **yo'q**).
- Parent moduli endpointlari MVP uchun tayyor (5.2 jadvali).
- i18n: uz, ru (`apps/frontend/messages`).
