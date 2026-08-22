# StomGo — testerlar uchun qo'llanma

## Manzillar

| Nima | Qayerda |
|---|---|
| Sayt (istalgan qurilma) | **https://closer-dvds-survey-webcast.trycloudflare.com** |
| Android ilova | `StomGo.apk` faylini o'rnatish (Telegram orqali yuboriladi) |
| Telegram bot | **@finaybot** |

> Diqqat: server hozircha ishlab chiquvchi kompyuterida — manzil vaqti-vaqti bilan
> o'zgarishi mumkin. Yangi manzil e'lon qilinsa: saytga yangi havola bilan kirasiz;
> ilovada esa Profil → «⚙️ Server sozlamasi» ga yangi manzilni kiritasiz (qayta
> o'rnatish shart emas).

## Hisoblar

| Rol | Kirish |
|---|---|
| **Bemor** | O'z raqamingiz → tasdiqlash kodi **faqat Telegram bot orqali** keladi. Kirish oynasidagi «Telegramda kod olish» tugmasini bosing → bot ochiladi → «Raqamni yuborish» → kod botga tushadi |
| **Klinika** | Kirish → «Klinika / Admin» — login-parol **loyiha egasidan alohida so'raladi** (har klinikaniki alohida) |
| **Admin** | Faqat loyiha egasida |

## APK o'rnatish

1. `StomGo.apk` faylini oching
2. «Noma'lum manbalardan o'rnatish» so'ralsa — ruxsat bering (bu test build, Play Marketdan keyin bunday so'ramaydi)
3. Ochilgach Profil bo'limida raqamingiz bilan kiring

## Nimalarni sinash kerak

**Yangi (v1.7) — yangilangan dizayn va suhbatlar:**
- [ ] Pastki menyu 5 ta bo'ldi: **Asosiy · Klinikalar · AI (o'rtadagi katta tugma) · Xabarlar · Profil**
- [ ] Asosiy oynada **VIP e'lonlar** lentasi (yon tomonga suriladi) va yaqinlik bo'yicha ro'yxat
- [ ] **Klinikalar** bo'limi: qidiruv + Tavsiya/Reyting/Yaqinlik/Narx saralash
- [ ] **Xabarlar**: klinika sahifasidagi «Xabar yozish» → suhbat ochiladi; klinika panelidan javob kelishi
- [ ] Xabarlar → yuqoridagi **«Qo'llab-quvvatlash»** banneri orqali platformaga yozish
- [ ] Klinikada endi Telegram tugmasi **yo'q** — muloqot faqat ilova ichida
- [ ] Yangi xabar kelganda bildirishnoma (qo'ng'iroqcha) va Telegramga eslatma
- [ ] Profil → 3 chiziqcha menyusi: mavzu, til, maxfiylik, qo'llab-quvvatlash, chiqish
- [ ] Rejim (tungi/kunduzgi) almashganda ekran o'zgarmasligi

**Oldingi (v1.2):**
- [ ] 🌙 Tungi rejim (saytda yuqoridagi oy tugmasi)
- [ ] QR check-in: klinika paneli → «QR kod» sahifasini oching, ekrandagi QR ni boshqa telefon kamerasi bilan skanerlang → kelganingizni tasdiqlang → sharh yozing
- [ ] Profil → «Tahrirlash»: ism, yil, jins, raqam almashtirish
- [ ] Botda /start dan keyin pastki menyu: 📅 Yozuvlarim (bemor) / ⏳ Kutilayotganlar, 📋 Bugungi yozuvlar (klinika)
- [ ] Tashrifdan keyin botda ⭐ baholash tugmalari kelishi
- [ ] Klinika panelida «+ Ro'yxatda yo'q xizmatni qo'shish»
- [ ] Xaritada klinika ustiga bosish → kartochka + Marshrut (faqat o'rnatilgan xarita ilovalari chiqadi)

**Bemor sifatida (ilova yoki sayt):**
- [ ] Klinikalar ro'yxati va xarita, «Yaqinimda» tugmasi
- [ ] Filtrlar: Ayol shifokor, Hozir ochiq, Bolalar, 24/7, xizmat turi
- [ ] «Og'riyaptimi?» shoshilinch rejimi
- [ ] Klinika sahifasi: narxlar, shifokorlar, sharhlar
- [ ] «Marshrut» → Yandex/Google tanlash
- [ ] Qabulga yozilish (kun + vaqt tanlash)
- [ ] AI maslahat: savollar rejimi va «O'zim yozaman» rejimi
- [ ] Profil → Telegram'ga ulash (@finaybot) → yozuv tasdiqlanganda xabar kelishi
- [ ] Yozuv tasdiqlangach «Keldim» (resepshn kodi bilan) → sharh yozish

**Klinika sifatida (sayt, kompyuterda qulay):**
- [ ] Login/parol bilan kirish
- [ ] **Xabarlar** bo'limi: bemor savoliga javob yozish, o'qilmaganlar hisoblagichi
- [ ] Yangi so'rovni tasdiqlash / rad etish / boshqa vaqt taklif qilish
- [ ] Sozlamalar: rasm yuklash, xaritada joylashuvni belgilash, ish vaqti
- [ ] Telegram'ga ulash → yangi so'rov Telegramga tushishi → tugma bilan tasdiqlash
- [ ] Shifokor qo'shish (rasm bilan), narxlarni o'zgartirish
- [ ] Statistika sahifasi

**Admin sifatida:**
- [ ] Yangi klinika yaratish (login/parol chiqadi)
- [ ] Sharh moderatsiyasi, promo slotlar
- [ ] **Qo'llab-quvvatlash** bo'limi: bemorlar murojaatiga javob berish
- [ ] Jurnal — barcha harakatlar ko'rinishi

## Muhim qoida

Barcha kelishuvlar **faqat ilova ichidagi suhbatda** bo'lishi kerak. Telegram yoki
telefon orqali ilovadan tashqarida qilingan kelishuvlarga platforma javobgar emas —
bu suhbat oynasida ham yozib qo'yilgan.

## Xato topsangiz

Qisqacha yozing: **qayerda** (sayt/ilova, qaysi sahifa) + **nima qildingiz** + **nima kutgan edingiz** + **nima bo'ldi**. Skrinshot bo'lsa — zo'r.
