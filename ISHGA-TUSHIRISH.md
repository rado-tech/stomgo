# Ishga tushirish qo'llanmasi

Kod ishlab chiqarishga tayyor. Qolgani — domen, server va Play Market hisobi.

---

## 1. Server (VPS)

**Minimal tavsiya:** 2 vCPU, 4 GB RAM, 60 GB SSD. Bu ~2 000 kunlik faol
foydalanuvchini ko'taradi.

```bash
# Docker va Docker Compose o'rnatilgan Ubuntu 24.04 da
git clone https://github.com/rado-tech/stomgo.git
cd stomgo
cp .env.example .env
```

### `.env` da to'ldirilishi SHART bo'lganlar

| O'zgaruvchi | Nima | Qayerdan |
|---|---|---|
| `DATABASE_URL` | PostgreSQL manzili | Docker Compose beradi |
| `AUTH_SECRET` | Sessiya imzosi, kamida 32 bayt | `openssl rand -base64 48` |
| `TELEGRAM_BOT_TOKEN` | Bot tokeni | @BotFather |
| `TELEGRAM_BOT_USERNAME` | Bot nomi (@ siz) | @BotFather |
| `NEXT_PUBLIC_SITE_URL` | `https://stomgo.uz` | Domeningiz |

**Server bu qiymatlarsiz ishga tushmaydi** — bu ataylab shunday.
`lib/config.ts` tekshiradi va sababini aytadi.

### Tavsiya qilinadiganlar

| O'zgaruvchi | Nima beradi |
|---|---|
| `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN` | Xatolar haqida xabar |
| `GEMINI_API_KEY` | AI triaj (yo'q bo'lsa qoidalar bilan ishlaydi) |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | Brauzerda push (`npx web-push generate-vapid-keys`) |
| `BACKUP_KEEP` | Nechta zaxira nusxa saqlanadi (standart 14) |

### Ishga tushirish

```bash
docker compose up -d
docker compose exec web npx prisma migrate deploy
```

**Boshlang'ich ma'lumot solmang** (`db:seed`) — u namunaviy klinikalarni
yaratadi. Haqiqiy klinikalarni admin panelidan yoki `/hamkorlik`
arizalaridan qo'shing.

Birinchi adminni yaratish:

```bash
docker compose exec web npx tsx scripts/create-admin.ts
```

---

## 2. Domen va HTTPS

DNS: `A` yozuvi serveringiz IP manziliga.

HTTPS uchun Caddy eng oson — sertifikatni o'zi oladi va yangilaydi:

```
stomgo.uz {
    reverse_proxy web:3000
}
```

**HTTPS majburiy.** Kirish kodlari va suhbatlar shu kanal orqali ketadi;
ilova ham faqat `https://` manzilni qabul qiladi.

---

## 3. Telegram bot

Bot alohida jarayon sifatida ishlaydi (`docker compose` da `bot` xizmati).

@BotFather da:
1. `/setprivacy` → **Disable** (guruhda ishlashi uchun)
2. `/setcommands` — bot o'zi `setMyCommands` bilan qo'yadi, qo'lda shart emas

---

## 4. Play Market

### Imzo kaliti

`mobile/android/app/release.keystore` va `keystore.properties`
allaqachon yaratilgan.

> **Bu ikki faylni xavfsiz joyga zaxiralang.**
> Yo'qotsangiz ilovani boshqa hech qachon yangilay olmaysiz — Play Market
> yangi kalitli faylni qabul qilmaydi va hamma foydalanuvchi ilovani
> o'chirib qaytadan o'rnatishga majbur bo'ladi.
> Ular git ga tushmaydi (`.gitignore`), ya'ni faqat shu kompyuterda.

### AAB yig'ish

Play Market APK emas, AAB qabul qiladi:

```bash
cd mobile
STOMGO_API_URL=https://stomgo.uz npx expo prebuild --platform android --clean
cd android
STOMGO_API_URL=https://stomgo.uz ./gradlew bundleRelease
```

Natija: `app/build/outputs/bundle/release/app-release.aab`

### Play Console da kerak bo'ladi

- 1024×1024 ikonka
- Kamida 2 ta ekran surati (telefon)
- Maxfiylik siyosati havolasi: `https://stomgo.uz/maxfiylik`
- **Ma'lumotlar xavfsizligi** so'rovnomasi: joylashuv, ism, telefon,
  rasmlar to'planishini belgilang; hisobni o'chirish yo'li bor deb
  ko'rsating (`/profil` va ilovadagi Sozlamalar)
- Sog'liq ilovasi ekanini bildirish: **tashxis qo'ymaydi**, faqat klinika
  topish va qabulga yozilish

---

## 5. Ishga tushirishdan oldingi tekshiruv

```bash
npm run typecheck && npm run lint && npm test
```

Server ko'tarilgach:

```bash
E2E_BASE=https://stomgo.uz npm run test:e2e
```

47 ta xavfsizlik testi haqiqiy serveringizga qarshi ishlaydi: himoyalangan
yo'llar, ma'lumot sizishi, sarlavhalar, SQL in'ektsiya, fayl yo'llari.

### Qo'lda tekshiriladiganlar

- [ ] `https://stomgo.uz/robots.txt` — sitemap manzili to'g'rimi
- [ ] Google Search Console ga sayt qo'shildimi
- [ ] Botga `/start` yozib, kirish kodi kelishini tekshiring
- [ ] Brauzerda push bildirishnomani sinang (ichki brauzerda ishlamaydi)
- [ ] Zaxira nusxa ishlayotganini tekshiring: `docker compose exec web npm run backup`

---

## 6. Zaxira nusxa

`scripts/backup.ts` bazani va yuklangan rasmlarni saqlaydi.
Kunlik ishlashi uchun cron:

```bash
0 3 * * * cd /opt/stomgo && docker compose exec -T web npm run backup
```

Zaxira nusxalarni **boshqa serverga** ham ko'chiring — bitta mashinadagi
nusxa mashina yo'qolganda yordam bermaydi.

---

## Xavfsizlik: nima qilingan

| Soha | Holat |
|---|---|
| Kirish | Faqat Telegram bot orqali kod. SMS yo'li olib tashlangan |
| Sessiya | JWT, 30 kun. Parol o'zgarganda barcha sessiyalar uziladi |
| Sessiya kaliti | Zaif yoki yo'q bo'lsa server ishga tushmaydi |
| So'rov chegarasi | 22 yo'lda, IP va foydalanuvchi bo'yicha |
| Rasm yuklash | Bayt darajasida tekshiriladi, webp'ga qayta kodlanadi (EXIF o'chadi) |
| Telegram xabarlari | HTML qochiriladi — fishing havolasi joylashtirib bo'lmaydi |
| QR check-in | Klinikadan 500 m ichida bo'lish talab qilinadi |
| Sarlavhalar | CSP, HSTS, X-Frame-Options, nosniff |
| Jurnal | Barcha muhim amallar, admin klinika nomidan kirsa ham belgilanadi |
| Sirlar | `.env`, kalitlar, parollar git ga tushmaydi; CI har push'da tekshiradi |
