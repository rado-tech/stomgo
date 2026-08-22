# StomGo — Toshkent stomatologiya platformasi

**Bemorlar uchun:** klinika qidiruv (xarita + narxlar), onlayn yozilish, vaqtni o'zgartirish,
AI triaj, klinika bilan ilova ichida yozishuv (tish rasmi bilan), push va Telegram eslatmalar.

**Klinikalar uchun:** yozuvlar paneli, bemor xabarlariga javob, sharhlarga javob, xizmat narxlari,
QR check-in, statistika.

**Administratsiya uchun:** klinika yaratish, moderatsiya, qo'llab-quvvatlash suhbatlari, audit jurnali.

Bitta Next.js ilova = sayt + API, plus alohida React Native (Expo) Android ilovasi va Telegram bot.

> **Muhim qoida:** barcha kelishuvlar ilova ichidagi suhbatda bo'ladi. Ilovadan tashqarida
> (Telegram, telefon) qilingan kelishuvlarga platforma javobgar emas.

---

## Arxitektura

| Qatlam | Texnologiya |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript) |
| Baza | **PostgreSQL 17** + Prisma ORM (migratsiyalar bilan) |
| Xarita | MapLibre GL + OpenFreeMap (bepul, kalitsiz) |
| AI triaj | Deterministik qoidalar mexanizmi + Google Gemini (erkin matn tahlili, ixtiyoriy) |
| Kirish | Faqat Telegram bot orqali OTP (raqam `request_contact` bilan tasdiqlanadi) |
| Telegram | grammY bot: klinikaga so'rov + tugmalar, bemorga eslatmalar (24s/2s) |
| Deploy | Docker Compose: db + migrate + app + bot + Caddy (avto-TLS) |
| Mobil | React Native + Expo SDK 57 (`mobile/`), MapLibre RN. Sayt ham PWA |
| Push | Expo Push (ilova) + Web Push/VAPID (brauzer) |
| Rasm | sharp → webp qayta kodlash (EXIF/geolokatsiya o'chadi) |
| Monitoring | Sentry (DSN berilsa yonadi), AuditLog (barcha amallar) |

## Lokal ishga tushirish

```bash
# 1. PostgreSQL (Docker kerak)
docker run -d --name stomgo-pg -e POSTGRES_USER=stomgo -e POSTGRES_PASSWORD=stomgo_dev -e POSTGRES_DB=stomgo -p 5433:5432 -v stomgo-pg-data:/var/lib/postgresql/data postgres:17-alpine

# 2. O'rnatish va baza
npm install
npx prisma migrate dev     # migratsiyalarni qo'llaydi
npm run db:seed            # 16 demo klinika

# 3. Ishga tushirish
npm run dev                # http://localhost:3000
npm run bot                # (ixtiyoriy) Telegram bot — TELEGRAM_BOT_TOKEN kerak
```

`.env` fayli lokal uchun tayyor (gitga kirmaydi). Kengaytirilgan sozlamalar: `.env.example`.

### Android ilova

```bash
cd mobile
npm install
npx expo start                 # ishlab chiqish (Expo Go emas — dev build kerak)

# Release APK (JDK 17 va Android SDK kerak):
cd android
./gradlew assembleRelease      # -> app/build/outputs/apk/release/app-release.apk
```

`mobile/android/local.properties` da SDK yo'li **oldinga qiya chiziq** bilan yozilishi shart:
`sdk.dir=C:/Users/<siz>/Android/Sdk`

Server manzili `mobile/app.json` → `extra.apiUrl` da. Ilova ichida ham almashtirsa bo'ladi:
Profil → Server sozlamasi.

### Sinov

```bash
npx tsx --env-file=.env scripts/_e2e.ts   # uchdan-uchgacha sinov (server ishlab turishi kerak)
npx eslint app components lib scripts     # lint
npx tsc --noEmit                          # tiplar
```

## Hisoblar

| Rol | Kirish | Qayerga |
|---|---|---|
| Bemor | O'z raqami → kod **Telegram botga** keladi | `/` |
| Klinika | login + parol (admin yaratganda beriladi) | `/clinic` |
| Admin | login + parol | `/admin` |

Seed parollarni **tasodifiy** yaratadi va konsolga bir marta chiqaradi — saqlab qo'ying.
Jonli tizim parollari `PAROLLAR-MAXFIY.txt` da (gitga kirmaydi); admin panelidan qayta yaratiladi.

---

# SERVERGA CHIQARISH — bosqichma-bosqich

### 1-qadam. Server va domen

1. **VPS oling** — tibbiy ma'lumotlar uchun O'zbekistondagi provayder tavsiya etiladi
   (ahost.uz, uzcloud.uz, ps.uz kabi). Minimal: 2 CPU, 4 GB RAM, 40 GB SSD, Ubuntu 22.04/24.04.
2. **Domen oling** (masalan `stomgo.uz` — cctld.uz orqali) va DNS'da **A yozuvini**
   server IP manziliga qarating (`stomgo.uz → 45.67.89.10`).

### 2-qadam. Serverni tayyorlash

Serverga SSH bilan kirib:

```bash
# Docker o'rnatish (rasmiy skript)
curl -fsSL https://get.docker.com | sh

# Loyihani yuklash (git orqali yoki scp bilan papkani ko'chiring)
git clone https://github.com/rado-tech/stomgo.git && cd stomgo
```

Git repo bo'lmasa, kompyuteringizdan nusxalash: `scp -r C:\Users\rado\Desktop\stomgo root@SERVER_IP:/root/stomgo`
(node_modules, .next, .env fayllarisiz).

### 3-qadam. Sozlash

```bash
cp .env.example .env
nano .env    # DB_PASSWORD va AUTH_SECRET ni MAJBURIY to'ldiring (SOZLASH.md ga qarang)
nano Caddyfile   # stomgo.example.com -> o'z domeningiz
```

### 4-qadam. Ishga tushirish

```bash
docker compose up -d --build
# Birinchi marta: xizmatlar katalogi va (xohlasangiz) demo ma'lumotlar
docker compose exec app node -e "1" && docker compose run --rm migrate npx tsx prisma/seed.ts
```

> ⚠️ `seed.ts` bazani TOZALAB demo ma'lumot yozadi — faqat birinchi ishga tushirishda
> ishlating. Real klinikalarni admin panel (`/admin` → "+ Yangi klinika") orqali kiritasiz.

5 daqiqada `https://SIZNING-DOMEN` ochilishi kerak (TLS sertifikatni Caddy avtomatik oladi).

### Kundalik amallar

```bash
docker compose logs -f app        # loglar
docker compose up -d --build      # yangilash (kod o'zgargach)
docker compose exec db pg_dump -U stomgo stomgo > backup_$(date +%F).sql   # backup
cat backup_2026-08-21.sql | docker compose exec -T db psql -U stomgo stomgo  # tiklash
```

Backup'ni har kuni cron bilan oling va serverdan tashqariga nusxalang.

---

# PLAY MARKETGA CHIQARISH — bosqichma-bosqich

PWA tayyor (manifest, service worker, ikonkalar). Play Market uchun TWA (Trusted Web
Activity) texnologiyasi ishlatiladi — Google'ning rasmiy yo'li, ilova to'liq native
ko'rinishda ochiladi.

### Shartlar
- Sayt HTTPS domenda ishlab turgan bo'lishi kerak (yuqoridagi deploy)
- Google Play Console hisobi — [play.google.com/console](https://play.google.com/console), bir martalik $25
- Kompyuterda Node.js (bor) va JDK 17 (Bubblewrap o'zi taklif qiladi)

### 1-qadam. Android paket yig'ish

```bash
npm i -g @bubblewrap/cli
bubblewrap init --manifest https://SIZNING-DOMEN/manifest.webmanifest
# Savollarga javob: package id -> uz.stomgo.app (yoki o'zingizniki), qolganini Enter
# Imzo kaliti (keystore) yaratiladi — PAROLNI SAQLANG, YO'QOTMANG!
bubblewrap build
# Natija: app-release-bundle.aab
```

### 2-qadam. Play Console'da ilova yaratish

1. Play Console → **Create app** → nomi "StomGo", til — o'zbek, App/Free
2. **Production → Create release** → `app-release-bundle.aab` ni yuklang
3. **Store listing** to'ldiring:
   - Qisqa tavsif (80 belgi) va to'liq tavsif
   - Skrinshotlar: telefondan kamida 2 ta (ilovani ochib skrinshot oling)
   - Ilova ikonkasi 512×512 (`public/icon-512.png` tayyor)
   - **Privacy policy URL**: `https://SIZNING-DOMEN/maxfiylik` (sahifa tayyor)
4. **Data safety** so'rovnomasi: telefon raqami va joylashuv yig'ilishini belgilang,
   maqsad — App functionality
5. **Content rating** so'rovnomasi → Health kategoriyasi

### 3-qadam. Digital Asset Links (majburiy!)

Bu qadam ilovani brauzer panelisiz, to'liq ilova sifatida ochilishini ta'minlaydi:

1. Play Console → **Setup → App signing** → **SHA-256 certificate fingerprint** ni nusxalang
2. `public/.well-known/assetlinks.json` faylida `BU_YERGA_...` o'rniga qo'ying
3. Qayta deploy: `docker compose up -d --build`
4. Tekshirish: `https://SIZNING-DOMEN/.well-known/assetlinks.json` ochilishi kerak

### 4-qadam. Review'ga yuborish

Release'ni **Send for review** qiling. Birinchi tekshiruv odatda 1–7 kun.
Rad etilsa — sababini o'qib tuzatasiz (ko'pincha data safety yoki skrinshot masalasi).

> Keyingi yangilanishlar: sayt yangilanganda ilova AVTOMATIK yangilanadi (TWA saytni
> ko'rsatadi). `.aab` ni faqat ikonka/nom o'zgarganda qayta yig'asiz.

---

# Integratsiyalarni yoqish

Har biri `.env` ga qiymat qo'shish bilan yoqiladi — kod o'zgartirish kerak emas.
Batafsil: **[SOZLASH.md](SOZLASH.md)**

| Xizmat | Nima beradi | Qayerdan olinadi |
|---|---|---|
| Eskiz.uz | OTP kodlar real SMS bilan | my.eskiz.uz — shartnoma + shablon moderatsiyasi |
| Telegram bot | Klinikaga so'rov + tugmalar, bemorga eslatma | @BotFather → /newbot |
| Claude API | AI triaj erkin matnni tushunadi | console.anthropic.com |

---

# Loyiha tuzilishi

```
app/                  sahifalar va API (App Router)
  api/                REST endpointlar (auth, clinics, appointments, triage, ...)
  clinic/             klinika paneli    admin/  admin panel
  klinika/[slug]/     klinika sahifasi  triaj/  AI triaj    profil/  bemor profili
components/           UI komponentlar (Map, ClinicCard, TelegramLink, ...)
lib/                  mantiq: auth, sms (Eskiz), telegram, booking-actions,
                      ratelimit, triage/rules (shoshilinchlik qoidalari), triage/ai
scripts/bot.ts        Telegram bot (alohida jarayon)
prisma/               sxema, migratsiyalar, seed
Dockerfile, docker-compose.yml, Caddyfile   deploy
twa-manifest.json     Play Market TWA sozlamasi
```
