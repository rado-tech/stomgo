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
