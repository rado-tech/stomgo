# Testlar

Qo'shimcha paket ishlatilmaydi — Node 22 ning o'z `node:test` moduli, TypeScript uchun `tsx`.

## Birlik testlari (server kerak emas)

```bash
npm test
```

`tests/*.test.ts` — sof mantiqni tekshiradi:

| Fayl | Nimani tekshiradi |
|---|---|
| `price.test.ts` | Narx tekshiruvi: manfiy son, kasr, harf, juda katta son rad etiladi va **sababi aytiladi** |
| `phone.test.ts` | `+998XXXXXXXXX` ko'rinishiga keltirish |
| `date-uz.test.ts` | Sana **kun/oy/yil**, vaqt **24 soatlik**, Toshkent mintaqasi |
| `hours.test.ts` | Ish vaqti, slotlar, eng yaqin bo'sh vaqt; buzuq JSON dasturni yiqitmaydi |
| `geo.test.ts` | Masofa hisobi va saralash balli |
| `format.test.ts` | Narx, masofa va yorliqlar formati |
| `ratelimit.test.ts` | So'rov chegarasi va oyna tugagach qayta ochilishi |

## Xavfsizlik testlari (ishlab turgan server kerak)

```bash
npm run test:e2e
```

`tests/security.e2e.ts` haqiqiy serverga so'rov yuboradi. Standart manzil
`http://localhost:3000`, o'zgartirish uchun `E2E_BASE`.

Nimani kafolatlaydi:

- **Autentifikatsiya devori** — 24 ta himoyalangan yo'l tokensiz **401/403** qaytaradi.
  Bittasi 200 qaytarsa test yiqiladi. Yangi himoyalangan yo'l qo'shsangiz —
  `PROTECTED` ro'yxatiga ham qo'shing.
- **Ma'lumot sizib chiqmasligi** — javoblarda `passwordHash`, `telegramChatId`
  kabi maydonlar yo'q; xatoda stack trace ko'rinmaydi.
- **Xavfsizlik sarlavhalari** — CSP, HSTS, `X-Frame-Options: DENY`, `nosniff`;
  `X-Powered-By` yo'q.
- **Kirish yo'li** — noto'g'ri parol va SQL in'ektsiya urinishlari o'tmaydi.
- **Fayl himoyasi** — `../` bilan `uploads` dan tashqariga chiqib bo'lmaydi;
  `.env`, `secrets/`, `.git/` veb orqali ochilmaydi.

## CI

`.github/workflows/ci.yml` har push va pull request'da to'rt ishni yugurtiradi:

1. **Sayt** — tip tekshiruvi, lint, birlik testlari, Next.js yig'ilishi
2. **Mobil ilova** — tip tekshiruvi
3. **Xavfsizlik** — haqiqiy PostgreSQL 17 ko'tariladi, migratsiya va seed
   bajariladi, server ishga tushadi, keyin E2E testlar
4. **Sir qidirish** — `.env`, keystore, APK yoki maxfiy kalit git ga
   tushib qolmaganini tekshiradi
