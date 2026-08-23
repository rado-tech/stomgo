/**
 * Kirishdan keyingi yo'naltirishni xavfsiz qilish.
 * Alohida modul: sahifa ham, test ham bir xil qoidadan foydalanadi.
 */

/**
 * `?next=` faqat SHU saytning ichki sahifasi bo'lishi mumkin.
 * "https://…", "//boshqa-sayt", "javascript:" kabi qiymatlar foydalanuvchini
 * tashqi saytga olib chiqib ketardi (ochiq yo'naltirish) — ular rad etiladi.
 */
export function safeNext(raw: string): string {
  if (!raw.startsWith("/")) return "";        // mutlaq manzil yoki sxema
  if (raw.startsWith("//")) return "";        // "//evil.com" — protokolsiz tashqi manzil
  if (raw.startsWith("/\\")) return "";       // "/\evil.com" — ba'zi brauzerlar shuni ham tashqi deb oladi
  return raw;
}

/** `next` shu panelning ichidami: "/admin" yoki "/admin/..." */
export function insidePanel(next: string, panel: string): boolean {
  return next === panel || next.startsWith(panel + "/");
}
