# Xedu Mobile (React Native / Expo)

Xedu platformasining mobil ilovasi. Mavjud NestJS backendni (`apps/backend`,
`/api/v1`) **Bearer token** orqali iste'mol qiladi. To'liq reja:
[`docs/MOBILE_APP_PLAN.md`](../../docs/MOBILE_APP_PLAN.md).

## Holati

### Faza 0 (poydevor) ✅
- Expo Router (file-based) navigatsiya, `(auth)` + `(app)` guruhlari
- axios klient: Bearer + **body-refresh** + envelope unwrap (`{success,data}`)
- `expo-secure-store` da tokenlar (Keychain/Keystore)
- Zustand auth store + bootstrap (sessiyani tiklash)
- Login + birinchi-kirish (majburiy parol almashtirish) + logout
- TanStack Query, i18n (uz/ru), yengil tema (light/dark)

### Faza 1 (Ota-ona MVP) ✅
- Farzandlar ro'yxati (`GET /parent/children`) → bola tafsiloti hub
- Bola bo'yicha: **Davomat · Baholar · Dars jadvali · To'lovlar · Tangalar**
  (statusli badge'lar, pull-to-refresh, loading/empty/error holatlari)
- **Ta'til so'rovi** — ro'yxat + yangi so'rov formasi (`POST .../leave-request`,
  mutation + invalidate)
- Qayta ishlatiladigan `DataList` (TanStack Query), `Badge`, `Card`, `Field`, `Button`

## Ishga tushirish (production'ga ulangan — lokal backend kerak emas)

Mobil ilova `.env` orqali to'g'ridan **`https://xedu.uz/api/v1`** ga ulanadi.
Native ilovada CORS qo'llanmaydi, Bearer auth production'da ham ishlaydi.

```bash
# 1. Bog'liqliklar + types build (bir marta)
pnpm install
pnpm --filter @eduplatform/types build

# 2. API URL (allaqachon production'ga sozlangan)
cp apps/mobile/.env.example apps/mobile/.env   # EXPO_PUBLIC_API_URL=https://xedu.uz/api/v1

# 3. Expo'ni ishga tushirish
cd apps/mobile && pnpm start    # QR kod -> Expo Go (telefon)
# yoki simulator: pnpm ios / pnpm android
```

> Login uchun haqiqiy xedu.uz akkauntingizdan foydalaning.
> Lokal backendga ulanmoqchi bo'lsangiz, `.env` da URL'ni LAN IP'ga o'zgartiring
> (`.env.example` ichida namunalar bor).

> **Eslatma (versiyalar):** Expo **SDK 54** (React 19, RN 0.81, expo-router 6) —
> Expo Go ning joriy versiyasiga mos. Versiyalarni tekshirish: `npx expo install --fix`.

## Struktura

```
app/                      expo-router marshrutlari
  _layout.tsx             ildiz: providerlar + auth gate (useProtectedRoute)
  (auth)/login | first-login
  (app)/ index | children | notifications | profile  (tab navigatsiya)
src/
  api/      client.ts (axios), token-store.ts, auth.ts, parent.ts
  store/    auth.store.ts (zustand)
  lib/      secure-storage.ts, query.ts
  i18n/     index.ts, uz.json, ru.json
  theme/    colors.ts, use-theme.ts
  components/ ui.tsx, screen.tsx
  config/   env.ts
```

## Keyingi qadamlar (Faza 1+)

Ota-ona MVP ekranlari (davomat, baholar, jadval, to'lovlar, ta'til so'rovi),
real-time socket badge, keyin push (backendda `DeviceToken` + Expo push).
Batafsil — `docs/MOBILE_APP_PLAN.md` 8-bo'lim.

## assets/

Ikona/splash hozircha Expo standartlari ishlatiladi. Brending uchun
`assets/icon.png` (1024×1024) va `assets/splash.png` qo'shib, `app.json` ga
yo'llarni qaytaring.
