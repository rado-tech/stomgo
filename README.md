# StomGo

Toshkentdagi stomatologiya klinikalari va bemorlarni bog'laydigan platforma:
**sayt + Android ilova + Telegram bot**.

Bemor yaqin klinikani xaritadan topadi, narxlarni solishtiradi, onlayn yoziladi va
klinika bilan ilova ichida yozishadi. AI maslahatchi shoshilinchlikni baholab,
qaysi mutaxassis kerakligini aytadi.

---

## Tarkibi

| Qism | Texnologiya | Joyi |
|---|---|---|
| Sayt va API | Next.js 16 (App Router), TypeScript, Tailwind v4 | `app/`, `components/`, `lib/` |
| Baza | PostgreSQL 17 + Prisma 6 | `prisma/` |
| Android ilova | React Native + Expo SDK 57 | `mobile/` |
| Telegram bot | grammY | `scripts/bot.ts` |
| Xarita | MapLibre + o'z plitka proksimiz | `components/MapView.tsx`, `app/api/map/` |

## Rollar

- **Bemor** — sayt yoki ilova. Kirish faqat Telegram bot orqali kelgan kod bilan.
- **Klinika** — sayt paneli (`/clinic`): yozuvlar, xizmat narxlari, shifokorlar,
  sharhlar, suhbatlar, QR plakat, statistika.
- **Admin** — sayt paneli (`/admin`): klinikalar, foydalanuvchilar, yozuvlar,
  xizmatlar katalogi, shifokor hujjatlari, sharh moderatsiyasi, VIP e'lonlar, jurnal.

---

## Ishga tushirish (ishlab chiqish)

```bash
npm install
```

```bash
cp .env.example .env
```

`.env` ni to'ldiring, so'ng bazani ko'taring:

```bash
docker run -d --name stomgo-pg -e POSTGRES_USER=stomgo -e POSTGRES_PASSWORD=parol -e POSTGRES_DB=stomgo -p 5433:5432 postgres:17-alpine
```

```bash
npx prisma migrate deploy && npx prisma generate && npm run db:seed
```

```bash
npm run dev
```

Telegram bot alohida terminalda:

```bash
npm run bot
```

## Android ilovani yig'ish

```bash
cd mobile && npm install
```

`mobile/app.json` dagi `extra.apiUrl` ni server manzilingizga o'zgartiring, so'ng:

```bash
cd mobile/android && ./gradlew assembleRelease
```

Natija: `mobile/android/app/build/outputs/apk/release/` — ikkita APK
(`arm64-v8a` zamonaviy telefonlar uchun, `armeabi-v7a` eskilari uchun).

Push bildirishnoma kerak bo'lsa, Firebase'dan `google-services.json` olib
`mobile/android/app/` ichiga qo'ying. Fayl bo'lmasa build baribir o'tadi —
push shunchaki o'chiq turadi.

---

## Serverga qo'yish

`docker-compose.yml` va `Caddyfile` tayyor. `Caddyfile` dagi domenni o'zgartiring va:

```bash
docker compose up -d --build
```

Ko'tariladigan xizmatlar: `db`, `migrate`, `app`, `bot`, `backup`, `caddy`.
Caddy HTTPS sertifikatini avtomatik oladi.

### Zaxira nusxa

`backup` xizmati har kuni bazani (`pg_dump.gz`) va yuklangan rasmlarni
`./backups` ga saqlaydi, oxirgi 14 nusxani qoldiradi. Qo'lda:

```bash
npm run backup
```

Tiklash tartibi `scripts/backup.ts` oxirida yozilgan.

---

## Xavfsizlik

- Kirish faqat Telegram OTP (bemor) yoki login-parol + bcrypt (klinika/admin)
- Sessiya — httpOnly cookie'dagi JWT; mobil ilova `Authorization: Bearer`
- Bloklangan foydalanuvchi amaldagi tokeni bilan ham kira olmaydi
- Rasm yuklashda sharp orqali to'liq qayta kodlash — EXIF va geolokatsiya o'chadi
- CSP, HSTS, `X-Frame-Options`, `nosniff`, `Referrer-Policy` sarlavhalari
- Kirish, OTP, xabar, rasm va triaj so'rovlarida rate limit
- Har bir muhim amal `AuditLog` ga yoziladi (`/admin/loglar`)

Maxfiy fayllar hech qachon repoga tushmaydi: `.env`, `secrets/`,
`google-services.json`, keystore fayllari, `uploads/`, `backups/`.

---

## Hujjatlar

- `TESTERLAR.md` — testerlar uchun qo'llanma
- `SOZLASH.md` — server sozlash holati va to'ldirilishi kerak joylar
- `AGENTS.md` — Next.js versiyasi haqida ogohlantirish
