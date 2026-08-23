/**
 * OTP kodini qaysi kanal orqali yuborish mumkinligini hal qiladi.
 *
 * MUHIM: kodni javobda ochiq qaytarish ("screen" kanali) — bu kirish
 * himoyasini butunlay chetlab o'tish yo'li. Telefon raqamini bilgan
 * har qanday odam istalgan hisobga kirib oladi. Shuning uchun u FAQAT
 * lokal ishlab chiqishda ruxsat etiladi.
 */

/** Kodni ekranda ko'rsatish mumkinmi (faqat lokal ishlab chiqish) */
export function screenCodeAllowed(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  // Ochiq tunnel orqali sinov qilinayotgan bo'lsa ham yopiq turishi uchun
  // aniq ruxsat talab qilamiz
  return process.env.ALLOW_SCREEN_OTP === "1";
}

/** Hech qanday kanal ishlamaganda qaytariladigan xabar */
export const NO_CHANNEL_ERROR =
  "Hozircha kod yuborib bo'lmadi. Telegram bot ishlamayapti — birozdan keyin qayta urining.";
