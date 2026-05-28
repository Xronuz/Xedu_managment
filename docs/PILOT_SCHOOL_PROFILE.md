# Pilot School Profile

**Version:** 1.0  
**Date:** 2026-05-28  
**Status:** Profile complete — awaiting launch gate clearance.

---

## 1. School Identity

| Field | Value |
|-------|-------|
| **School Name** | "O'zbekiston Respublikasi Xalq Ta'limi Vazirligi Test Maktabi" |
| **Short Name** | Xedu Pilot Maktabi |
| **Slug** | `xedu-pilot-001` |
| **Location** | Toshkent shahri, Yunusobod tumani |
| **School Type** | Umumta'lim maktabi (State secondary school) |
| **Academic Model** | Kunduzgi, 5-kunlik hafta (Day school, 5-day week) |
| **Academic Year** | 2025–2026 |
| **Go-Live Date** | 2026-06-02 (Tuesday) |

---

## 2. Size & Structure

| Metric | Count | Notes |
|--------|-------|-------|
| **Branches** | 1 | Asosiy binoda joylashgan |
| **Classes** | 14 | 1A, 1B, 2A, 2B, 3A, 3B, 4A, 5A, 6A, 7A, 8A, 9A, 10A, 11A |
| **Teachers** | 18 | 14 sinf rahbarlari + 4 fan o'qituvchilari |
| **Students** | 312 | O'rtacha 22-23 nafar har bir sinfda |
| **Parents** | ~280 | Bitta o'quvchiga o'rtacha 0.9 ta faol ota-ona |
| **Total Users** | ~311 (excluding students using parent portal) | 18 ta o'qituvchi + 280 ta ota-ona + 13 ta admin/moliya |
| **Grade Levels** | 1–11 | Har bir sinf bir parallel |

---

## 3. IT Readiness

| Component | Status | Detail |
|-----------|--------|--------|
| **Internet** | ✅ Available | 50 Mbps, WiFi bor |
| **Director laptop** | ✅ Available | Windows 11, Chrome o'rnatilgan |
| **Teacher devices** | ⚠️ Partial | 12/18 ta smartfon, 6 ta noutbuk |
| **Computer lab** | ✅ Available | 15 ta kompyuter, lekin eski |
| **Projector** | ✅ Available | 1 ta multimedia xona |
| **IT xodimi** | ❌ Yo'q | Direktor o'zi mas'ul |
| **Telegram** | ✅ Universal | Barcha o'qituvchilar va ota-onalar foydalanadi |
| **Email** | ⚠️ Partial | Direktor va zavuchlarda bor, o'qituvchilarning aksariyatida yo'q |

**IT Risk:** O'qituvchilar va ota-onalar asosan smartfondan foydalanishadi. Frontend mobil optimallashtirilganligi kritik.

---

## 4. Key Stakeholders

| Role | Name | Contact | Responsibility |
|------|------|---------|----------------|
| **Direktor** | Dilnoza Yusupova | +99890XXX0001 | Umumiy mas'ul, qarorlar, onboarding |
| **Zavuch (VP)** | Sardor Rahimov | +99890XXX0002 | Jadval, o'qituvchilar nazorati, baholar |
| **Sinfbosh** | Malika Toshmatova | +99890XXX0003 | 1A sinfi, davomat nazorati |
| **Buxgalter** | Nodira Hasanova | +99890XXX0004 | Moliya, ish haqi, hisobotlar |
| **Rahbar yordamchisi** | Bekzod Karimov | +99890XXX0005 | Import/eksport, texnik yordam |
| **Texnik yordam (Xedu)** | [Engineer] | Telegram: @xedu_support | Tizim sozlamalari, hotfix |
| **Pilot lideri (Xedu)** | [Pilot Lead] | Telegram: @xedu_pilot | Umumiy pilot muvaffaqiyati |

---

## 5. Communication Channels

| Channel | Used By | Purpose |
|---------|---------|---------|
| **Telegram guruh "Xedu Pilot"** | Barcha o'qituvchilar | Kundalik savollar, e'lonlar |
| **Telegram guruh "Xedu Ota-onalar"** | Ota-onalar | Umumiy e'lonlar, yo'riqnoma |
| **Telegram shaxsiy** | Direktor ↔ Xedu | Shaxsiy murojaatlar |
| **Telefon qo'ng'iroq** | Direktor, buxgalter | Shoshilinch masalalar |
| **Google Meet** | Barcha | Onlayn trening, yordam seansi |

---

## 6. Current State (Pre-Launch)

### Accounts Created

| Role | Account | Status |
|------|---------|--------|
| Direktor | `director@xedu-pilot-001.uz` | ✅ Tayyor, parol berilgan |
| Zavuch | `vice@xedu-pilot-001.uz` | ✅ Tayyor |
| Buxgalter | `accountant@xedu-pilot-001.uz` | ✅ Tayyor |
| Sinfbosh | `classteacher@xedu-pilot-001.uz` | ✅ Tayyor |
| O'qituvchilar | `teacher01@` ... `teacher18@` | ✅ Taklifnomalar yuborilgan |
| Ota-onalar | Import CSV tayyor | ⏳ Go-live'dan keyin yuboriladi |

### Data Prepared

| Data | Status | Source |
|------|--------|--------|
| Sinflar ro'yxati | ✅ Tayyor | Direktor taqdim etdi |
| O'qituvchilar ro'yxati | ✅ Tayyor | Direktor taqdim etdi |
| O'quvchilar ro'yxati | ✅ CSV import uchun tayyor | 312 ta yozuv |
| Fanlar ro'yxati | ✅ Tayyor | Standart 10 ta fan |
| Xonalar ro'yxati | ✅ Tayyor | 8 ta dars xonasi |
| Dars jadvali vaqtlari | ✅ Tayyor | 6 ta dars (08:00–13:45) |

---

## 7. Risk Profile

### High Risk

| # | Risk | Probability | Impact | Mitigation |
|---|------|-------------|--------|------------|
| 1 | O'qituvchilar qarshilik ko'rsatadi | Yuqori | Yuqori | Trening + parallel ish (qog'oz + tizim) |
| 2 | Direktor onboardingni tugatmadi | Yuqori | Yuqori | Day 1 chaqiruv, muhandis yonida |
| 3 | Smartfon UI qiyin | Yuqori | O'rta | Mobil optimallashtirishni tekshirish |

### Medium Risk

| # | Risk | Probability | Impact | Mitigation |
|---|------|-------------|--------|------------|
| 4 | Ota-onalar faollashmaydi | Yuqori | O'rta | SMS + shaxsan uchrashuv |
| 5 | Baholash orqasida qoladi | Yuqori | O'rta | Eslatma + zavuch nazorati |
| 6 | Jadval generator chalkashadi | Mumkin | O'rta | Qo'lda tuzish varianti |

### Low Risk

| # | Risk | Probability | Impact | Mitigation |
|---|------|-------------|--------|------------|
| 7 | Server to'xtab qoladi | Kam | Kritik | Health check + backup |
| 8 | Ma'lumot yo'qolishi | Kam | Kritik | Kunlik backup |

---

## 8. Success Definition

### Go-Live Success (Day 1)

- [ ] Direktor tizimga kirdi
- [ ] Setup wizard tugallandi
- [ ] Kamida 10 ta o'qituvchi tizimga kirdi
- [ ] 1 ta sinf davomati belgilandi

### Week 1 Success

- [ ] Barcha sinflar yaratildi
- [ ] Barcha o'qituvchilar faol
- [ ] Dars jadvali nashr qilindi
- [ ] Davomat kundalik belgilanmoqda

### Week 2 Success

- [ ] Baho kiritish boshlandi
- [ ] Ota-onalar faollashdi (> 30%)
- [ ] Eksport sinovdan o'tdi
- [ ] P0/P1 yo'q

---

## 9. Escalation Contacts

| Scenario | Contact | Method |
|----------|---------|--------|
| Tizimga kira olmayman | @xedu_support | Telegram |
| Xato topdim | @xedu_support | Telegram + screenshot |
| Shoshilinch: barcha foydalanuvchilar to'xtadi | @xedu_support + qo'ng'iroq | Telegram + telefon |
| Onboardingda yordam kerak | @xedu_pilot | Telegram / Meet |
| Taklif / xohish | `docs/PILOT_FEEDBACK_BOARD.md` | GitHub / Telegram |

---

> **Profil holati:** ✅ Tayyor  
> **Keyingi qadam:** `PILOT_LAUNCH_GATE.md` checklistni tekshirish
