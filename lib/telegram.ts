/**
 * Telegram xabar yuborish (Bot API, kutubxonasiz — oddiy HTTPS).
 * TELEGRAM_BOT_TOKEN berilmagan bo'lsa hamma funksiya jimgina o'tib ketadi.
 * Botning o'zi (polling, tugmalar, eslatmalar) alohida jarayon: scripts/bot.ts
 */

export function tgConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN);
}

export async function tgSend(
  chatId: string,
  text: string,
  buttons?: { text: string; data: string }[][]
): Promise<boolean> {
  if (!tgConfigured() || !chatId) return false;
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "HTML",
          reply_markup: buttons
            ? { inline_keyboard: buttons.map((row) => row.map((b) => ({ text: b.text, callback_data: b.data }))) }
            : undefined,
        }),
      }
    );
    if (!res.ok) console.error("Telegram sendMessage xatosi:", res.status, await res.text().catch(() => ""));
    return res.ok;
  } catch (e) {
    console.error("Telegram yuborishda xato:", e);
    return false;
  }
}

export { fmtDateTimeUz } from "./date-uz";

/**
 * Telegram HTML rejimi uchun matnni xavfsizlashtirish.
 *
 * Xabarlar `parse_mode: "HTML"` bilan yuboriladi. Foydalanuvchi kiritgan matn
 * (ism, izoh, klinika nomi va manzili) to'g'ridan-to'g'ri qo'yilsa, u yerga
 * `<a href="...">` singari teg joylashtirib bo'lardi — klinikaning Telegramida
 * StomGo nomidan kelayotgandek ko'rinadigan fishing havolasi paydo bo'lardi.
 *
 * Telegram faqat shu uchta belgini talab qiladi: & < >
 * https://core.telegram.org/bots/api#html-style
 */
export function tgEscape(v: string | null | undefined): string {
  return String(v ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
