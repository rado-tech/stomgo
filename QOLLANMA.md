# StomGo — ishlatish qo'llanmasi

Uch qism: **sayt**, **Android ilova**, **Telegram bot**. Uchalasi bitta bazadan
ishlaydi — saytda qilingan ish ilovada ham, botda ham darhol ko'rinadi.

Uch xil odam uchun uch xil ko'rinish:

| Kim | Qayerdan kiradi | Nima qiladi |
|---|---|---|
| **Bemor** | Sayt yoki ilova | Klinika topadi, narx solishtiradi, qabulga yoziladi |
| **Klinika xodimi** | Sayt → Kirish → Xodim | Yozuvlarni tasdiqlaydi, narx qo'yadi, bemor bilan yozishadi |
| **Admin** | Sayt → Kirish → Xodim | Klinikalarni qo'shadi, sharhlarni tekshiradi, hammasini nazorat qiladi |

---

## 1. Bemor

### Kirish

Kirish **faqat Telegram bot orqali** — SMS yo'q, parol yo'q.

1. Saytda «Kirish» → telefon raqamni yozadi
2. «Kod olish» bosiladi → bot havolasi chiqadi
3. Botda **«Raqamni tasdiqlash»** tugmasi bosiladi
4. Bot 6 xonali kod beradi → saytga kiritiladi

> Bot Telegram raqami saytda kiritilgan raqamga mos kelishini o'zi tekshiradi.
> Mos kelmasa kod berilmaydi — boshqa odamning raqami bilan kirib bo'lmaydi.

### Klinika topish

Bosh sahifada uch xil qidiruv:

- **Qidiruv qatori** — klinika nomi yoki tuman
- **Filtrlar** — xizmat turi, hozir ochiq, ayol shifokor, bolalar, 24/7
- **Xarita** — markerni bosing, klinika oynasi ochiladi

**Saralash** to'rt xil:

| Tur | Nima bo'yicha |
|---|---|
| Aralash | Yaqinlik + reyting + javob berish tezligi (tavsiya) |
| Yaqinlik | Faqat masofa |
| Reyting | Faqat baho |
| Narx | Tanlangan xizmat narxi bo'yicha |

Har bir kartochkada: masofa, reyting, **eng yaqin bo'sh vaqt** va klinika
o'rtacha necha daqiqada javob berishi.

### Narx solishtirish

«Narxlar» bo'limi — muolaja tanlanadi, barcha klinikalar narxi bilan chiqadi.
O'rtacha emas, **median** ko'rsatiladi: bitta qimmat klinika rasmni buzmaydi.

### Qabulga yozilish

1. Klinika sahifasida «Qabulga yozilish»
2. Kun va vaqt tanlanadi (faqat klinika ishlaydigan vaqtlar chiqadi)
3. Xohlasa shifokor va izoh qo'shadi
4. So'rov klinikaga boradi

Keyin nima bo'ladi:

| Holat | Ma'nosi |
|---|---|
| Kutilmoqda | Klinika hali javob bermagan |
| Tasdiqlangan | Klinika qabul qildi |
| Boshqa vaqt taklif qilindi | Klinika boshqa vaqt taklif qilgan — qabul qilasiz yoki rad etasiz |
| Rad etilgan | Klinika qabul qila olmadi |

Yozuv tasdiqlansa va qabuldan **24 soat** va **2 soat** oldin botga eslatma keladi.

Vaqtni **ko'chirish** mumkin (eng ko'pi 3 marta), **bekor qilish** ham.

### Klinikaga kelganda

Resepshndagi QR kodni telefon bilan skanerlaysiz → «Keldim» tugmasi.

> QR faqat **klinikada turib** ishlaydi (500 metr ichida). Uydan turib bosib
> bo'lmaydi — shuning uchun sharhlar haqiqiy tashriflardan keyin yoziladi.

Yozuvsiz kelgan bo'lsangiz ham QR ishlaydi — tashrif yoziladi va sharh
yozish huquqi ochiladi.

### Sharh

Faqat **tasdiqlangan tashrifdan keyin**. Baho + matn. Klinika javob yozishi mumkin.
Sharhda to'liq ismingiz ko'rinadi.

### Suhbat

Klinika sahifasidagi «Xabar yozish» — ilova ichida yozishasiz, tish rasmini
yuborishingiz mumkin.

> Kelishuvlar **faqat shu suhbatda** amal qiladi. Telefon yoki boshqa joyda
> kelishilgan narsaga StomGo javob bermaydi.

### AI yordamchi

«AI» bo'limi — shikoyatingizni o'z so'zingiz bilan yozasiz. Yordamchi
shoshilinchlik darajasini aniqlaydi va mos klinikalarni ko'rsatadi.

> Bu **tashxis emas**. Aniq javobni faqat shifokor beradi.

### Til

O'zbekcha va ruscha. Yuqori o'ngdagi **UZ / RU** yoki Profil → Til.

### Hisobni o'chirish

Profil → «Hisobni o'chirish». Ismingiz, rasmingiz, suhbatlaringiz o'chadi.
Qabul yozuvlari **anonim** qoladi — klinikalar statistikasi buzilmasligi uchun.

---

## 2. Klinika xodimi

Kirish: sayt → «Kirish» → **Xodim** → login va parol (adminda beriladi).

Kirgach avtomatik o'z panelingizga tushasiz.

### Yozuvlar (asosiy ekran)

Yuqorida bugungi holat: qabullar, javob kutayotgan, tasdiqlangan, kelgan, kelmagan.

Har bir so'rovda uch tugma:

- **Tasdiqlash** — vaqt to'g'ri kelsa
- **Boshqa vaqt** — band bo'lsa, boshqa vaqt taklif qilasiz
- **Rad etish** — sabab bilan

> 15 daqiqadan oshgan javobsiz so'rov **qizil** rangda belgilanadi.
> Javob berish tezligingiz bemorlarga ko'rinadi va saralashga ta'sir qiladi.

Bemor kelganda: QR orqali o'zi tasdiqlaydi, yoki siz «Keldi» tugmasini bosasiz.
Kelmasa — «Kelmadi».

**Xodim o'zi ham yozib qo'yishi mumkin**: telefon orqali kelishilgan bemorni
panelga qo'shasiz, u darhol tasdiqlangan bo'ladi.

### Xizmat va narxlar

Ro'yxatdan xizmat tanlab, «dan – gacha» narx qo'yasiz. Ro'yxatda yo'q xizmatni
o'zingiz qo'shishingiz mumkin.

Narx **1 000 dan 500 000 000 gacha**, faqat butun son. Xato bo'lsa sabab
ko'rsatiladi va **hech narsa saqlanmaydi** — yarim to'ldirilgan xizmat qolmaydi.

### Shifokorlar

Ism, mutaxassislik, tajriba, jins, rasm. Ta'lim va diplom raqami ham
kiritiladi — ular **bemorga ko'rinmaydi**, faqat admin tekshiruvi uchun.
Admin tasdiqlagach klinika sahifasida «Hujjatlari tekshirilgan» belgisi chiqadi.

### Sozlamalar

Nomi, manzili, telefoni, ish vaqti, xaritadagi joylashuvi, galereya (8 tagacha
rasm), 24/7 va shoshilinch qabul belgilari.

**Telegram'ga ulanish** — shu yerdan. Ulanganingizdan keyin:

- Yangi so'rovlar botga tushadi, tugmalar bilan tasdiqlaysiz
- Parolni unutsangiz **o'zingiz tiklay olasiz** (botga kod keladi)

> Bot ulanmagan bo'lsa parolni faqat admin tiklaydi. Ulab qo'ying.

### QR plakat

«QR plakat» → chop etib resepshn stoliga qo'yasiz. Bemor skanerlab kelganini
o'zi tasdiqlaydi — navbat sekinlashmaydi.

### Sharhlar va statistika

Sharhlarga javob yozasiz. Statistikada: yozuvlar soni, kelganlar, kelmaganlar,
o'rtacha baho.

---

## 3. Admin

Kirish: sayt → «Kirish» → **Xodim** → admin login va paroli.

### Umumiy ko'rinish

Yuqorida yetti ko'rsatkich (bosiladigan): klinikalar, bemorlar, yozuvlar,
kelganlar, **kelmaganlar**, sharh navbati, triaj. Sariq rangdagilar e'tibor talab
qiladi. Ostida 14 kunlik grafik.

### Klinika qo'shishning ikki yo'li

**Klinika o'zi ariza topshiradi** — `/hamkorlik` sahifasi orqali. Arizalar
«Klinika arizalari» bo'limiga tushadi va sizga push keladi. Bog'langach
«Tasdiqlash» bosasiz → klinika yaratiladi, **login va parol bir marta chiqadi**.

**Yoki o'zingiz qo'shasiz** — «Yangi klinika» tugmasi.

> Parol faqat o'sha payt ko'rsatiladi. Nusxalab klinikaga yetkazing.
> Keyin faqat yangi parol yaratish mumkin.

### Boshqa bo'limlar

| Bo'lim | Nima qilinadi |
|---|---|
| Klinikalar | Tahrirlash, tarif, tekshiruv, parol tiklash, arxivlash |
| Shifokor hujjatlari | Diplomni tekshirib «Hujjatlari tekshirildi» belgisi berish |
| Sharhlar | Tasdiqlash yoki rad etish |
| Yozuvlar | Barcha qabullar, filtr bilan |
| Foydalanuvchilar | Bemorlar, kerak bo'lsa bloklash |
| Top joylashuv | PRO klinikalarni yuqoriga chiqarish |
| Jurnal | **Barcha amallar** — kim, nima, qachon. Qidiruv va sana filtri bilan |
| Mening hisobim | Ism, login, parol, raqam (o'zgarish botdagi kod bilan tasdiqlanadi) |

### Klinika nomidan kirish

Klinikalar ro'yxatida «Kirish» — klinika panelini o'z ko'zingiz bilan
ko'rasiz. Sessiya **2 soat** amal qiladi va jurnalda alohida belgilanadi.

### Klinikani arxivlash

Nomini aynan yozib tasdiqlaysiz. Shundan keyin:

- **O'chadi:** shifokorlar, suhbatlar, narxlar, barcha rasmlar (diskdan ham),
  xodim hisoblari
- **Qoladi:** qabul yozuvlari va sharhlar — bemorlar tarixini yo'qotmasligi uchun

---

## 4. Telegram bot

Bot: **@finaybot**

Hisob ulanmagan bo'lsa ham ishlaydi:

- **🔍 Klinika topish** — tuman bo'yicha yoki hozir ochiqlar, har biriga sayt havolasi

Bemor ulangach:

- **📅 Yozuvlarim** — faol yozuvlar, bekor qilish tugmasi bilan
- Eslatmalar: 24 soat va 2 soat oldin
- Tashrifdan keyin baholash so'rovi (yulduz bosasiz, keyin matn yozasiz)
- 6 oydan keyin profilaktik ko'rik eslatmasi

Klinika ulangach:

- Yangi so'rov darhol tushadi, **Tasdiqlash / Rad etish** tugmalari bilan
- **⏳ Kutilayotganlar**, **📋 Bugungi yozuvlar**, **📷 QR kod**

Buyruqlar: `/start` `/klinikalar` `/yozuvlarim` `/yordam` `/uzish`

---

## 5. Android ilova

Saytdagi bemor imkoniyatlarining hammasi, ustiga **push bildirishnoma**.

O'rnatish: APK faylni telefonda ochasiz. Android «noma'lum manba» haqida
so'raydi — ruxsat berasiz. (Play Market'ga chiqqach bu savol bo'lmaydi.)

Talab: **Android 7.0 va undan yuqori**.

Ikki fayl bor:

- **arm64** (38.6 MB) — zamonaviy telefonlarning deyarli hammasi
- **arm32** (30.5 MB) — 2018-yilgacha chiqqan arzon telefonlar

arm64 o'rnatilmasa arm32 ni sinang.

---

## 6. Ma'muriyat uchun kundalik ishlar

### Har kuni

- **Klinika arizalari** — yangilarini ko'rib chiqing, sovib qolmasin
- **Sharh navbati** — tasdiqlash yoki rad etish
- **Kelmaganlar** ko'rsatkichi keskin oshsa — sabab qidiring

### Har hafta

- **Shifokor hujjatlari** — tekshirilmaganlarni ko'rib chiqing
- **Jurnal** — g'alati amallar bor-yo'qligini tekshiring
- Zaxira nusxa olinayotganiga ishonch hosil qiling

### Muammo bo'lsa

| Belgi | Sabab | Yechim |
|---|---|---|
| Saytga kirib bo'lmayapti | Bot o'chgan | Botni qayta ishga tushiring |
| «Serverga ulanib bo'lmadi» (ilovada) | Server yoki tunnel o'chgan | Serverni tekshiring |
| Kod kelmayapti | Foydalanuvchi botni bloklagan | Botni qayta ishga tushirsin |
| Klinika parolni unutdi | — | Botga ulangan bo'lsa o'zi tiklaydi, aks holda admin |

---

## Muhim qoidalar

**Kirish faqat Telegram bot orqali.** SMS yo'li ataylab olib tashlangan.
Bot ishlamasa hech kim kira olmaydi — botni kuzatib turing.

**Sharh faqat haqiqiy tashrifdan keyin.** QR check-in klinikada turib
bosiladi. Bu sizning asosiy ustunligingiz — buni yumshatmang.

**Kelishuvlar faqat ilova ichida.** Suhbatdan tashqarida kelishilgan
narsaga StomGo javob bermaydi — bu foydalanuvchi shartnomasida yozilgan.

**AI tashxis qo'ymaydi.** Har bir javobda shu izoh turadi. Uni olib tashlamang.
