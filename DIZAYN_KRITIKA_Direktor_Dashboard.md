# Dizayn Kritika: Direktor Dashboard (Xedu)

> Tahlil sanasi: 2026‑05‑11 · Bosqich: ishlab chiqilgan, polish bosqichida
> Manba: `apps/frontend/src/app/(dashboard)/dashboard/_components/director-dashboard.tsx`
> Yordamchi fayllar: `workspace-system/`, `director-workspace/`, `layout/sidebar.tsx`, `layout/header.tsx`, `globals.css`, `tailwind.config.ts`
> Eslatma: lokal port (3000/3001/5173) sandbox’dan ulanmadi, shuning uchun tahlil **kod + design token darajasida** olib borildi (mahsulot kompozitsiyasi, design system, hierarchy, mikro‑etkazib berish).

---

## Umumiy taassurot

Birinchi 2 soniyada ko‘rinadi: bu **operatsion ma’lumot terminali** — Bloomberg / Linear ruhida, biroq ta’lim brendi (yumshoq emerald primary `#0F7B53`, Inter font). Direktor bir ekranda barcha filiallar, moliya, davomat, ta’til so‘rovlari, intizom va AI signallarni ko‘ra oladi. Bu kuchli pozitsiya, **ammo zichlik shu darajaga yetganki, “asosiy yo‘l” yo‘qolib qolgan** — direktor ekranni ochganda “endi nima qilay?” degan savolga darhol javob olmaydi. Eng katta imkoniyat: **shovqinni pasaytirish va bitta birlamchi tavsiyani yuqoriga ko‘tarish**.

Eng ko‘zga tashlanadigan ijobiy tomonlar: WorkspaceShell tizimi, sticky `SituationBar`, ranglar tokenlash tizimi, dark mode, empty/skeleton holatlar to‘liq ishlangan, real‑time `RealtimePulse` va Cmd+K palette mavjudligi.

---

## 1. Usability (Foydalanish qulayligi)

| Topilma | Og'irlik | Tavsiya |
|---|---|---|
| **Birlamchi CTA yo‘q** — header’dan keyin darrov 12 ta KPI (6 SituationBar + 6 ExecutiveSummary) keladi, lekin “bugun nima qilish kerak” degan bitta yo‘naltiruvchi karta yo‘q. | 🔴 Critical | Sticky zonaning tagiga **“Bugungi tavsiya”** kartasini qo‘ying: AI yoki rule‑based — masalan, *“3 ta ta’til so‘rovi 24 soatdan oshdi → ko‘rib chiqing”*. Direktor ekranni *qaror qabul qilish uchun* ochadi, faqat kuzatish uchun emas. |
| **Tezkor harakatlar ikki marta takrorlanadi** — bir xil 5 amal (E’lon, Hisobot, Tasdiqlash, Moliya, Filiallar) `QuickActionSurface` (pastdagi floating dock) va `Tezkor havolalar` (asosiy kanvasning quyi qismidagi PCard) ichida bor. | 🟡 Moderate | Bittasini olib tashlang. Floating dock kuchliroq (Cmd+K bilan birga), quyidagi PCard’ni **“So‘nggi ko‘rilgan sahifalar”** yoki **“Pinned reports”**ga aylantiring — direktor uchun shaxsiy. |
| **“Tasdiqlash / Rad” tugmalari juda kichik** (`h-7 px-3 text-xs` ≈ 28px balandlik). Direktorlar tezlik bilan kechirim so‘rovlarini ko‘radi, kichik touch target xato bosishga olib keladi. | 🟡 Moderate | Balandlikni 36px (`h-9`) ga, font‑ni `text-[13px]`ga ko‘taring. Ikkalasini chap‑o‘ng emas, **ikkilamchi (`Rad`) ko‘rinishini “muted outline” qilib**, asosiy harakat (`Tasdiqlash`) bo‘yalgan holda farqlang. Hozir ikkalasi ham deyarli teng vizual og‘irlikka ega. |
| **Filial taqqoslash rejimi yashirin** — `GitCompare` tugma faqat asosiy kanvasning yuqori‑o‘ng burchagida, kichik, ikonali. Funksiya kuchli, lekin discoverability past. | 🟡 Moderate | Filial qatori ustiga hover bo‘lganda “➕ Solishtirishga qo‘shish” chip’i chiqsin (progressive disclosure). Yoki BranchHealthMap header’ida “2 filialni belgilang →” inline hint. |
| **Comparison panel chiqsa, scroll uzayadi**, lekin “Yopish” tugmasi panelning ichida — tasodifan asosiy ro‘yxat bilan aralashib ketadi. | 🟢 Minor | Comparison panelning **sticky header**’iga ✕ tugmasini qo‘ying yoki Esc bilan yopilsin. |
| **Sticky zona vertikal joyni egallaydi** — `SituationBar` + `ExecutiveSummary` ikkalasi sticky + backdrop‑blur. ~110‑130px ni har doim band qiladi. Kichik laptopda (1280×800) bu kontent uchun 13‑15% ekran. | 🟡 Moderate | Scroll pastga tushganda **ExecutiveSummary collapse bo‘lsin** (faqat SituationBar qoladi). Yoki ikkalasini **bitta multi‑row strip**’ga birlashtiring — birinchi qator hozir bo‘lganidek, ikkinchi qator faqat trend metrikasi (kichik). |
| **Mobil dock** (`bottom-4`, 4 ta yumaloq icon) iOS swipe‑home jest zonasi bilan kesishadi. | 🟢 Minor | `bottom-6` qiling yoki `safe-area-inset-bottom` qo‘shing. |
| **Localstorage’da “welcome dismissed”** flag — yangi qurilma yoki incognito’da har safar chiqadi. | 🟢 Minor | User profil server tomonida `welcomeDismissedAt` saqlang. |

---

## 2. Visual Hierarchy (Vizual ierarxiya)

- **Birinchi nazar nimaga tushadi?** — Header sarlavhasi (“Direktor paneli”) emas, balki **SituationBar’dagi raqamlar**: ayniqsa qizil/amber rangli `Diqqat` va `Tasdiqlash` belgilari. Bu **to‘g‘ri** signalni ushlaydi, demak terminal felsafasi ishlamoqda.
- **O‘qish oqimi**: Sticky zona → Filiallar ro‘yxati → Moliya/Akademik → Xodimlar/Ta’til/E’lon → Calendar/Tezkor havolalar. **Asosiy kanvas yaxshi tartiblangan**, mantiqiy F‑shape.
- **O‘ng sidebar muammosi** — 5 blok yonma‑yon: `IntelligenceFeed`, `SmartInsights`, `ActivityStream`, 3 ta mini KPI cards, AI Placeholders. **Bularning vizual og‘irligi deyarli teng**, ko‘z qayerga qarashni bilmaydi. `IntelligenceFeed` — birlamchi, qolganlari **ikkilamchi tartibga tushishi kerak** (cardlar ichida emas, sub‑navigatsiya / tab orqali).
- **Tipografiya ierarxiyasi to‘g‘ri**, lekin **umumiy o‘lcham juda kichik**. `base = 13px`, secondary text `text-xs = 11px`, hatto `text-2xs = 10px`. Direktorlar odatda 35‑55 yosh oralig‘ida — pres-byopia (yaqinni ko‘rmaslik) muammosi keng. Hozirgi shkala professional analitik vositalar uchun yaxshi, lekin **default density “comfortable” bo‘lishi maqsadga muvofiq**.
- **Akademik kalendar va Tezkor havolalar bitta grid’da yonma‑yon** (`md:grid-cols-2`) — bularning **konseptual og‘irligi bir xil emas**: kalendar kontent, havolalar navigatsiya. Ko‘z `Tezkor havolalar`’ni ko‘rib, “bu ham ma’lumot” deb adashishi mumkin.

**Tavsiyalar:**

1. O‘ng sidebar’da **bitta birlamchi blokga vizual urg‘u bering** (border‑left primary stripe yoki yengil shadow): `IntelligenceFeed`. Qolganlari `bg-transparent`, ko‘proq vertikal spacing.
2. **Bodyning default font sizeini 14px** (Tailwind `md`) ga ko‘taring, density toggle (`compact|comfortable`) header dropdown’iga joylang. `WorkspaceShell` allaqachon `density` prop’ini qabul qiladi — buni user‑facing qiling.
3. Asosiy kanvas pastidagi `Calendar + QuickLinks` grid’ni qaytadan ko‘rib chiqing — kalendar **alohida full‑width** karta bo‘lsin, havolalar olib tashlansin (yuqoridagi dock dublikati).

---

## 3. Consistency (Izchillik)

| Element | Muammo | Tavsiya |
|---|---|---|
| **Inline style + Tailwind aralashgan** | `director-dashboard.tsx` ichida `style={{ borderColor: C.border, color: C.text }}` minglab marta ishlatilgan, lekin yonida `className="text-xedu-slate-700"` ham bor. `C` obyekti `shared-widgets.tsx`’dan import qilinadi. | Bitta yo‘l tanlang: yoki **faqat Tailwind class tokens** (`border-xedu-border`, `text-xedu-text`), yoki **CSS variables** (`var(--xedu-border)`) class’da. Hozirgi gibrid dark mode’ni qiyinlashtiradi va theme switch’da bir necha render keyin yangilanish ehtimoli bor. |
| **Hard‑coded hex** | `style={{ background: '#FEE2E2', color: '#DC2626' }}` (Rad tugma), Quick Actions ikonlari uchun `#2563EB`, `#D97706`, `#7C3AED`, `#4338CA`. | Bularni `xedu-ruby`, `xedu-sky`, `xedu-amber`, `xedu-violet` tokenlariga almashtiring. Aks holda dark mode’da bu ranglar moslashmaydi. |
| **Radius shkalasi notayinli** | Tailwind config’da `rounded-2xl = 16px`, lekin kod ichida ko‘p joyda `rounded-[14px]` (raw px) ishlatilgan — `xl` tokenidan farqli. | `rounded-xl` (14px) ishlatish kerak. Hozir `Textarea`, `input`, `Select trigger` `rounded-[14px]`, `WorkspaceBlock` `rounded-2xl`. Ikki yaqin radius ko‘zga uradi. |
| **Mini KPI card hover** | KPICard / AiRiskCard / EduCoinCard `rounded-xl`, asosiy WorkspaceBlock’lar `rounded-2xl`. Yonma‑yon turganda bir‑biriga nisbatan kichikroq ko‘rinadi (qasddanmi?). | Agar “mini sub‑KPI” iyerarxik darajasi past bo‘lsa — bu **mantiqan to‘g‘ri**. Buni stylebook’da hujjatlang: “mini card = `rounded-xl 12px`, primary card = `rounded-2xl 16px`”. |
| **Tugma o‘lchamlari uchta xil** | `h-7` (Tasdiqlash/Rad), `h-8` (X close), `h-9` (E’lon yuborish, asosiy Button). | shadcn `Button` size variantlariga qaytib bir xilla shkalada to‘plang: `sm = h-8`, `default = h-9`, `lg = h-10`. |
| **Empty state ikonkalari** | Filiallar ro‘yxati bo‘sh bo‘lganida `Building2 h-5`, ta’til so‘rovi yo‘qligida `CheckCircle2 h-6`. | Empty state ikon o‘lchamini standartlashtiring (24px = `h-6 w-6`), va matn pattern’ini (kichik bold + sub) bir xil qiling. |
| **Tarjima ohangida farq** | “Tezkor havolalar”, “Tasdiqlash”, “Kutilayotgan so‘rovlar yo‘q” — yaxshi. Lekin `ExecutiveSummary`’da “Kutilmoqda” va `SituationBar`’da “Tasdiqlash” bir narsa haqida — ikki xil nomlangan. | Glossary yarating: bir “domain so‘zi” → bir “UI so‘zi”. Masalan: `pending leaves` → har doim **“Kutilayotgan ta’til so‘rovlari”**, qisqasi **“Tasdiqlash”**. |

---

## 4. Accessibility (Foydalanish imkoniyatlari)

| Mezon | Holat | Izoh |
|---|---|---|
| **Kontrast — primary tugma** `#0F7B53` ustida oq matn | ✅ Pass | Kontrast nisbati ~5.4:1 — WCAG AA pass (normal text). |
| **Kontrast — `Rad` tugmasi** `#DC2626` matn `#FEE2E2` fonda | ⚠️ Borderline | ~4.0:1. Normal text uchun AA = 4.5:1. **Fail** small/regular’da, bold da qabul qilsa bo‘ladi, lekin xavfli. Qoshib yoki tonni quyuqroq qiling: matn `#B91C1C` (`ruby-700`) → ~5.9:1 pass. |
| **Touch target** | ⚠️ Fail | “Tasdiqlash / Rad” `h-7` = 28px. WCAG 2.5.5 AAA = 44px, AA = 24px (min). Mobil + touchpad uchun **36px (`h-9`) ga ko‘taring**. |
| **Focus ring** | ✅ Mostly | shadcn Button’da `focus-visible:ring-2` bor, lekin **inline `<button>`** elementlarida (Filial taqqoslash toggle, X close) `focus-visible` styling yo‘q — tab navigatsiyasi uchun ko‘rinmaydi. |
| **Aria labels** | ✅ Yaxshi | X close `aria-label="Yopish"`, qidiruv `aria-label="Qidiruv panelini ochish"`. Davom etishi kerak. |
| **Kalit asoslangan navigatsiya** | ⚠️ Qisman | `Cmd+K` palette bor, lekin filial qatorlari, ta’til so‘rovi qatorlari — `<div>` bilan tuzilgan va keyboard accessible emas. **Role=button** + `onKeyDown` qo‘shing yoki `<Link>` / `<button>` bilan o‘rang. |
| **Screen reader** | ⚠️ KPI cards’da raqam keladi, lekin **trend ikon** (`ArrowUpRight`) faqat vizual ma’no beradi. | `<span className="sr-only">trend: ko‘tarilmoqda</span>` qo‘shing. |
| **Color‑only signal** | ⚠️ `dotColor` (qizil/amber/yashil nuqta) faqat rang orqali tone bildiradi. | Daltonik foydalanuvchilar uchun **ikon shakli** (⚠️ / ⏱ / ✓) yoki matnli label qo‘shing. SituationBar’da matn bor (“Diqqat”, “Xavf”) — bu yaxshi, lekin nuqta + matn ikkilamchi belgi. |
| **Matn o‘lchami** | ⚠️ Default 13px, secondary 10‑11px. | Density toggle `comfortable` da default 14px, sub 12px qiling. Hech bo‘lmaganda **muhim raqamlar 18px+** bo‘lsin (hozir `text-xl = 16px`). |
| **Dark mode kontrasti** | ✅ Tekshirilgan tokenlar | `--xedu-bg-canvas` `#0B1320`, `--xedu-text` `#F1F5F9` — ~16:1 — a’lo. |

---

## Nima yaxshi ishlagan

- **Design token tizimi to‘liq, hujjatlangan** (`globals.css`’da 8 semantic scale × 11 stop = 88 ranglar). Bu darajadagi tokenlash ko‘p prod app’larda yo‘q.
- **WorkspaceShell pattern** — barcha rollar uchun bir xil “shell” va “zones”. Director, Branch admin, Teacher, Parent — hammasi bir tildan gapiradi.
- **`RealtimePulse`** header’da — “ma’lumot yangilandi” signali. Direktor ishonchli ishlashi uchun muhim.
- **Empty state’lar** — har bir blokda real empty UI (ikon + matn). Yangi maktabga ulanish kunidagi tajriba sindirilmaydi.
- **Skeleton loading** har joyda. Loading state’lar consistent.
- **Cmd+K command palette** — power user pattern. Floating dock + palette kombinatsiyasi Linear‑esque, kuchli.
- **Lokalizatsiya** — barchasi o‘zbek tilida, `toLocaleDateString('uz-UZ')` ishlatilgan, sana formati to‘g‘ri.
- **Role aware welcome** — `RoleWelcome` komponenti yangi foydalanuvchini yo‘naltiradi, dismiss qilinadi.
- **Compare mode** — kuchli funksionallik, kam app’larda topiladi.

---

## Prioritetli tavsiyalar

1. **“Bugungi tavsiya” kartasini sticky zona ostiga qo‘ying** — *Eng katta ta’sirli o‘zgarish.* Hozir direktor 12+ raqam ko‘radi, lekin “endi nima?” ga javob yo‘q. AI summary allaqachon `aiSummary` ichida bor — birinchi 1‑2 ta `topAtRisk` yoki `pendingLeaves.oldest > 24h` ni **alohida primary CTA card**’ga aylantiring. *Nima uchun:* dashboard maqsadi — ma’lumot emas, **qaror**. *Qanday:* `WorkspaceSection` variant=`recommendation`, primary border, “Ko‘rib chiqish →” tugmasi.

2. **Tezkor harakatlar dublikatini olib tashlang** va o‘ng sidebar zichligini kamaytiring. *Nima uchun:* hozir 5 ta blok yonma‑yon — decision fatigue. *Qanday:* `Tezkor havolalar` PCard’ni olib tashlang. Sidebar’da `SmartInsights` va `ActivityStream`’ni **tab** ichiga joylang (“Insights | Activity”). KPI mini cards’ni `IntelligenceFeed` ichiga “highlight” qator sifatida birlashtiring. AI placeholder’larni footer’ga ko‘chiring yoki Coming Soon banner qiling.

3. **Touch targets va kontrast** muammolarini hal qiling. *Nima uchun:* WCAG AA — production talab, ayniqsa hukumat / ta’lim sohasidagi mahsulot uchun zaruriy. *Qanday:* (a) Tasdiqlash/Rad tugmalari `h-9 text-sm`; (b) `Rad` matni `text-xedu-ruby-700`; (c) `<div>` ustiga tab + Enter handlerlar, focus ring. Bitta sprint ishi.

4. **Density toggle va default tipografiyani 1px ko‘taring**. *Nima uchun:* direktor demografiyasi 35+. Hozirgi 13px base — Apple HIG ham 17px tavsiya qiladi. *Qanday:* `base` Tailwind size’ni 14px, `text-xl` raqamlar uchun 18→20px. Header dropdown’iga “Density: Compact | Comfortable” qo‘ying.

5. **Inline `style` o‘rniga Tailwind tokens** ishlating va hard‑coded hex’lardan voz keching. *Nima uchun:* dark mode + theme update’lar consistency. *Qanday:* `find_replace` script: `style={{ borderColor: C.border }}` → `className="border-xedu-border"`. Hard‑coded `#DC2626`, `#FEE2E2` → `bg-xedu-ruby-100 text-xedu-ruby-700`. Bu vaqt oladi, lekin maintenance qarzi.

---

## Qisqa xulosa (1 jumla)

Direktor dashboard **arxitektura va token tizimi jihatidan a’lo darajada** (Bloomberg‑terminal felsafasi + Linear UX rituallari), lekin **bitta yo‘naltiruvchi tavsiya yo‘qligi, kichik touch‑targetlar va o‘ng sidebar zichligi sababli** “qaror qabul qilish” ekrani emas, “kuzatuv” ekraniga aylangan — bularni hal qilish bilan mahsulot enterprise sotuvga tayyor.
