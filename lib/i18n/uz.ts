/**
 * O'zbekcha lug'at — ASOSIY manba.
 * Yangi kalit avval shu yerga qo'shiladi, keyin ru.ts ga tarjima qilinadi.
 * ru.ts tipi shu obyektdan olinadi, ya'ni tarjima unutilsa TypeScript aytadi.
 */
export const uz = {
  // ---------- Umumiy ----------
  "common.back": "Orqaga",
  "common.cancel": "Bekor qilish",
  "common.save": "Saqlash",
  "common.close": "Yopish",
  "common.confirm": "Tasdiqlash",
  "common.delete": "O'chirish",
  "common.edit": "Tahrirlash",
  "common.search": "Qidirish",
  "common.loading": "Yuklanmoqda...",
  "common.retry": "Qayta urinish",
  "common.more": "Batafsil",
  "common.all": "Hammasi",
  "common.km": "km",
  "common.sum": "so'm",
  "common.from": "dan",
  "common.to": "gacha",
  "common.today": "Bugun",
  "common.tomorrow": "Ertaga",

  // ---------- Navigatsiya ----------
  "nav.home": "Asosiy",
  "nav.clinics": "Klinikalar",
  "nav.ai": "AI",
  "nav.messages": "Xabarlar",
  "nav.profile": "Profil",
  "nav.prices": "Narxlar",
  "nav.notifications": "Bildirishnomalar",

  // ---------- Bosh sahifa va ro'yxat ----------
  "home.searchPlaceholder": "Klinika yoki tuman qidiring...",
  "home.allServices": "Barcha xizmatlar",
  "home.nothingFound": "Hech narsa topilmadi",
  "home.changeFilters": "Filtrlarni o'zgartirib ko'ring",
  "home.map": "Xarita",
  "home.nearMe": "Yaqinimda",
  "home.openNow": "Hozir ochiq",
  "home.urgent": "Shoshilinch",
  "home.sort": "Saralash",
  "home.sortMix": "Aralash (tavsiya)",
  "home.sortDistance": "Yaqinlik bo'yicha",
  "home.sortRating": "Reyting bo'yicha",
  "home.sortPrice": "Narx bo'yicha",
  "home.nextSlot": "Eng yaqin bo'sh vaqt",
  "home.repliesIn": "Javob beradi",
  "home.min": "daq",

  // ---------- Klinika sahifasi ----------
  "clinic.book": "Qabulga yozilish",
  "clinic.services": "Xizmatlar va narxlar",
  "clinic.doctors": "Shifokorlar",
  "clinic.reviews": "Sharhlar",
  "clinic.hours": "Ish vaqti",
  "clinic.route": "Marshrut",
  "clinic.message": "Xabar yozish",
  "clinic.closed": "Yopiq",
  "clinic.open": "Ochiq",
  "clinic.nonstop": "24/7",
  "clinic.verified": "Hujjatlari tekshirilgan",
  "clinic.contractEnded": "Bu klinika bilan shartnoma bekor qilingan",
  "clinic.noReviews": "Hozircha sharh yo'q",
  "clinic.reviewsOnlyAfterVisit": "Sharhlar faqat tasdiqlangan tashrifdan keyin yoziladi.",

  // ---------- Qabulga yozilish ----------
  "booking.chooseDay": "Kunni tanlang",
  "booking.chooseTime": "Vaqtni tanlang",
  "booking.chooseDoctor": "Shifokor (ixtiyoriy)",
  "booking.note": "Izoh (ixtiyoriy)",
  "booking.notePlaceholder": "Shikoyatingizni qisqacha yozing",
  "booking.submit": "Yozilish",
  "booking.noSlots": "Bu kunda bo'sh vaqt yo'q",
  "booking.success": "So'rov yuborildi. Klinika tasdiqlashini kuting.",

  // ---------- Yozuv holatlari ----------
  "status.PENDING": "Kutilmoqda",
  "status.CONFIRMED": "Tasdiqlangan",
  "status.ALT_OFFERED": "Boshqa vaqt taklif qilindi",
  "status.REJECTED": "Rad etilgan",
  "status.CANCELLED": "Bekor qilingan",
  "status.ARRIVED": "Keldi",
  "status.NO_SHOW": "Kelmadi",
  "status.DONE": "Yakunlandi",

  // ---------- Profil ----------
  "profile.myBookings": "Yozuvlarim",
  "profile.noBookings": "Yozuvlar yo'q",
  "profile.noBookingsHint": "Klinika tanlab qabulga yoziling",
  "profile.logout": "Chiqish",
  "profile.settings": "Sozlamalar",
  "profile.language": "Til",
  "profile.deleteAccount": "Hisobni o'chirish",
  "profile.reschedule": "Vaqtni ko'chirish",
  "profile.cancelBooking": "Bekor qilish",
  "profile.rate": "Baholash",

  // ---------- Kirish ----------
  "auth.title": "Kirish yoki ro'yxatdan o'tish",
  "auth.subtitle": "Telefon raqamingizga tasdiqlash kodi yuboriladi",
  "auth.phone": "Telefon raqam",
  "auth.getCode": "Kod olish",
  "auth.enterCode": "Kodni kiriting",
  "auth.staffLogin": "Xodimlar kirishi",
  "auth.patient": "Bemor",
  "auth.staff": "Xodim",
  "auth.forgotPassword": "Parolni unutdingizmi?",

  // ---------- Xabarlar ----------
  "chat.title": "Xabarlar",
  "chat.empty": "Hozircha suhbat yo'q",
  "chat.placeholder": "Xabar yozing...",
  "chat.send": "Yuborish",
  "chat.photo": "Rasm",
  "chat.support": "Qo'llab-quvvatlash",
  "chat.onlyInApp":
    "Kelishuvlar faqat shu suhbatda amal qiladi. Ilovadan tashqari kelishuvlarga javobgar emasmiz.",

  // ---------- AI triaj ----------
  "triage.title": "AI yordamchi",
  "triage.subtitle": "Shikoyatingizni yozing — shoshilinchligini aniqlaymiz",
  "triage.placeholder": "Masalan: pastki tishim kecha kechqurundan qattiq og'riyapti",
  "triage.analyze": "Tahlil qilish",
  "triage.notDiagnosis": "Bu tashxis emas. Aniq javobni shifokor beradi.",

  // ---------- Xatoliklar ----------
  "error.offline": "Internet yo'q — ba'zi ma'lumotlar yangilanmasligi mumkin",
  "error.restored": "Ulanish tiklandi",
  "error.generic": "Xatolik yuz berdi",
  "error.tryAgain": "Birozdan keyin qayta urining",
  "error.notFound": "Sahifa topilmadi",

  "home.service": "Xizmat",
  "home.serviceType": "Xizmat turi",
  "home.femaleDoctor": "Ayol shifokor",
  "home.children": "Bolalar",
  "home.serviceHint": "Xizmat tanlansa, har bir klinikada o'sha xizmat narxi ko'rsatiladi va narx bo'yicha saralash mumkin bo'ladi.",
  "home.sortMixHint": "Yaqinlik + reyting + javob berish tezligi",
  "home.sortPriceHint": "Xizmat tanlangan bo'lsa — o'sha xizmat narxi bo'yicha",
  "home.list": "Ro'yxat",

  "home.vip": "VIP e'lonlar",
  "home.ad": "Reklama",

  "chat.loginToSee": "Suhbatlarni ko'rish uchun kiring",
  "chat.loginHint": "Klinikalar bilan yozishuv va qo'llab-quvvatlash shu yerda",
  "chat.emptyHint": "Klinika sahifasidagi «Xabar yozish» tugmasi orqali savol bering",
  "triage.nearbyOpen": "Hozir qabul qiladigan yaqin klinikalar",
  "triage.matching": "Mos klinikalar",

  "clinics.searchPlaceholder": "Klinika nomini kiriting",
  "clinics.notFound": "Klinika topilmadi",
  "clinics.notFoundHint": "Boshqa nom bilan qidirib ko'ring",

  "settings.title": "Sozlamalar",
  "settings.theme": "Mavzu",
  "settings.themeLight": "Kunduzgi",
  "settings.themeDark": "Tungi",
  "settings.themeSystem": "Tizim bo'yicha",
  "settings.verifyProfile": "Profilni tasdiqlash",
  "settings.partnership": "Reklama va hamkorlik",
  "settings.privacy": "Maxfiylik siyosati",
  "settings.support": "Qo'llab-quvvatlash",
  "settings.server": "Server sozlamasi",
  "settings.logoutConfirm": "Hisobdan chiqmoqchimisiz?",

  // ---------- Xizmat nomlari ----------
  "service.konsultatsiya": "Konsultatsiya",
  "service.plomba": "Plomba",
  "service.kanal": "Kanal davolash",
  "service.tozalash": "Tozalash",
  "service.oqartirish": "Oqartirish",
  "service.olib_tashlash": "Tish olib tashlash",
  "service.akl_tishi": "Aql tishi",
  "service.implant": "Implant",
  "service.koronka": "Koronka",
  "service.protez": "Protez",
  "service.breket": "Breket",
  "service.vinir": "Vinir",
  "service.bolalar_davolash": "Bolalar davolash",
  "service.rentgen": "Rentgen",
} as const;

export type TranslationKey = keyof typeof uz;
