# SOZLASH.md — siz to'ldirishingiz kerak bo'lgan JOYLAR

Kod to'liq tayyor va testlangan. Quyidagilar sizning hisoblaringiz/hujjatlaringizga
bog'liq bo'lgani uchun men to'ldira olmayman.

## HOZIRGI TEST HOLATI (allaqachon ishlayapti)

| Nima | Holat |
|---|---|
| Sayt internetda | ✅ https://closer-dvds-survey-webcast.trycloudflare.com |
| Telegram bot | ✅ @finaybot — jonli (token .env da) |
| PostgreSQL | ✅ Docker'da (stomgo-pg), migratsiyalar qo'llangan |
| Admin kirish | PAROLLAR-MAXFIY.txt faylida (faqat sizda) |
| Klinika kirish | PAROLLAR-MAXFIY.txt faylida — har klinikaga alohida |
| Bemor kirish | istalgan raqam, kod ekranda (SMS ulanmagunicha) |

> ⚠️ Tunnel manzili kompyuter/tunnel qayta ishga tushsa O'ZGARADI. Yangi manzil olish:
> `tools\cloudflared.exe tunnel --url http://localhost:3000` — chiqqan httpsni
> testerlarga yuboring; ilovada Profil → «⚙️ Server sozlamasi» ga kiritiladi.

## Kompyuterni server sifatida ishga tushirish (har safar)

```bash
docker start stomgo-pg
npm run build && npm run start     # sayt :3000
npm run bot                        # alohida terminalda — Telegram bot
tools\cloudflared.exe tunnel --url http://localhost:3000   # alohida terminalda
```

## 1. Parollar — ✅ XAVFSIZLANDI

Barcha klinika va admin parollari **noyob tasodifiy** qilindi va faqat
kompyuteringizdagi `PAROLLAR-MAXFIY.txt` faylida (gitga kirmaydi).
Har klinikaga faqat o'z login-parolini bering. Parol unutilsa —
admin panelda «Parol» tugmasi yangisini yaratadi.

## 2. Telegram bot — ✅ TAYYOR

Token kiritilgan, bot jonli. Faqat sinab ko'ring:
- Klinika paneli → Sozlamalar → «Telegram'da ulash» → @finaybot ochiladi → Start
- Endi yangi yozuv so'rovi Telegramga tushadi, tugma bilan tasdiqlaysiz
- Bemor ham Profil'dan ulansa — tasdiqlash xabari va 24/2 soatlik eslatmalar keladi

Botni almashtirmoqchi bo'lsangiz: @BotFather → yangi token → `.env` dagi
`TELEGRAM_BOT_TOKEN` va `TELEGRAM_BOT_USERNAME` ni yangilang.

## 3. Kirish kodlari — ✅ ENDI TELEGRAM ORQALI (BEPUL)

Kirish kodi endi SMS emas, **Telegram botga** boradi:
- Botga ulangan foydalanuvchi: kod to'g'ridan-to'g'ri botiga tushadi
- Yangi foydalanuvchi: «Botda tasdiqlash» tugmasi → botda raqamini ulashadi
  (Telegram raqamni tasdiqlaydi — soxtalashtirib bo'lmaydi) → kod botda beriladi
- Xarajat: **0 so'm**, cheksiz. Ekranda kod ko'rsatiladigan demo-rejim endi faqat
  bot o'chirilgan lokal muhitda ishlaydi

Eskiz.uz SMS (ixtiyoriy zaxira, Telegram'i yo'q foydalanuvchilar uchun):
my.eskiz.uz shartnoma → shablon: `StomGo kirish kodi: {kod}. Uni hech kimga bermang.`
→ `.env` ga `ESKIZ_EMAIL`/`ESKIZ_PASSWORD`. Bot o'chirilganda SMS avtomatik asosiy bo'ladi.

## 4. Google Gemini — AI triaj kuchaytirgichi (ixtiyoriy, BEPUL tarif bor)

[aistudio.google.com](https://aistudio.google.com) → «Get API key» (karta shart emas) →
`.env` dagi `GEMINI_API_KEY`. Kalitsiz ham triaj to'liq ishlaydi
(savollar rejimi + kalit so'z tahlili).

## 5. VPS va domen (production)

1. Domen oling (`stomgo.uz` yoki boshqa — bu ilova nomi bilan bog'liq emas, keyin o'zgarishi mumkin emas lekin: TWA emas, RN ilova ishlatilgani uchun domen almashsa ham ilovadagi server sozlamasi orqali yangilanadi)
2. O'zbekistonda VPS oling (ahost.uz, ps.uz...), Ubuntu + Docker
3. Loyihani ko'chiring, `.env` da: `DB_PASSWORD` (yangi!), `AUTH_SECRET` (`openssl rand -hex 32`), bot/SMS kalitlari
4. `Caddyfile` da `stomgo.example.com` → domeningiz
5. `docker compose up -d --build`
6. Ilovaning app.json → `extra.apiUrl` ga domenni yozib APK qayta yig'ing (bir marta)

## 6. Play Market

1. [Play Console](https://play.google.com/console) hisobi ($25)
2. Ilovani imzolash kaliti: `mobile/android/app/` da keystore yaratiladi (README, Play bo'limi) — **parolini yo'qotmang**
3. `cd mobile/android && gradlew bundleRelease` → `.aab` → Play Console'ga
4. Store listing: skrinshotlar, tavsif, **Privacy policy URL**: `https://DOMEN/maxfiylik` (sahifa tayyor)
5. Data safety: telefon + joylashuv yig'iladi, App functionality maqsadida

## 6.5. Sentry monitoring (ixtiyoriy)

[sentry.io](https://sentry.io) → project (Next.js) → DSN → `.env` ga:
`SENTRY_DSN=` (server) va `NEXT_PUBLIC_SENTRY_DSN=` (brauzer). Kiritilmasa o'chiq turadi.
Telefon raqamlari xabarlardan avtomatik tozalanadi.

## 7. Huquqiy sahifalar (yurist bilan)

- `app/maxfiylik/page.tsx` — 2 ta `[TO'LDIRING]` (yuridik shaxs, aloqa)
- `app/oferta/page.tsx` — 1 ta `[TO'LDIRING]` (rekvizitlar)

## 8. Kontent

- Admin → «+ Yangi klinika» → login/parol chiqadi → klinikaga topshiring
- Klinika o'zi kiradi: rasm (majburiy), joylashuv (xaritada pin), narxlar, shifokorlar, ish vaqti, Telegram
- Demo klinikalarni o'chirish uchun meni chaqiring yoki seed'siz toza baza bilan boshlang
