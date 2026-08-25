/**
 * Ishga tushishdagi sozlama tekshiruvi.
 *
 * Maqsad: ishlab chiqarishda XAVFSIZ BO'LMAGAN sozlama bilan ishga tushmaslik.
 * Yashirin zaxira qiymat bilan ishlab ketishdan ko'ra, darhol to'xtab
 * sababni aytish yaxshiroq — aks holda muammo oylab sezilmay qoladi.
 */

/** Sessiya imzosi uchun eng kam uzunlik (baytda) */
const MIN_SECRET_LENGTH = 32;

/** Kod ichida yozilgan zaxira kalit — u OCHIQ REPODA, ya'ni hech qanday himoya emas */
const INSECURE_FALLBACK = "dev-secret-stomgo-o-zgartiring-productionda";

export const isProduction = process.env.NODE_ENV === "production";

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

/**
 * Sessiya imzo kaliti.
 *
 * Ishlab chiqarishda: yo'q bo'lsa, qisqa bo'lsa yoki zaxira qiymatga teng bo'lsa —
 * dastur ishga tushmaydi. Aks holda kalitni bilgan har qanday odam istalgan
 * foydalanuvchi (jumladan admin) nomidan sessiya yasab olardi.
 */
export function authSecret(): string {
  const value = process.env.AUTH_SECRET?.trim();

  if (isProduction) {
    if (!value) {
      throw new ConfigError(
        "AUTH_SECRET berilmagan. Sessiyalarni imzolab bo'lmaydi.\n" +
          "Yarating: openssl rand -base64 48",
      );
    }
    if (value === INSECURE_FALLBACK) {
      throw new ConfigError(
        "AUTH_SECRET kodda yozilgan zaxira qiymatga teng. U ochiq repoda — " +
          "istalgan odam sessiya yasab oladi. Yangisini yarating: openssl rand -base64 48",
      );
    }
    if (Buffer.byteLength(value, "utf8") < MIN_SECRET_LENGTH) {
      throw new ConfigError(
        `AUTH_SECRET juda qisqa (${Buffer.byteLength(value, "utf8")} bayt). ` +
          `Kamida ${MIN_SECRET_LENGTH} bayt kerak: openssl rand -base64 48`,
      );
    }
    return value;
  }

  // Lokal ishlab chiqish: kalitsiz ham ishlaydi, lekin ogohlantiramiz
  if (!value) {
    console.warn(
      "[config] AUTH_SECRET berilmagan — lokal zaxira kalit ishlatilmoqda. " +
        "Ishlab chiqarishda dastur bunday holatda ishga tushmaydi.",
    );
    return INSECURE_FALLBACK;
  }
  return value;
}

/**
 * Ishlab chiqarishga chiqishdan oldingi tekshiruv ro'yxati.
 * instrumentation.ts da chaqiriladi — server ko'tarilishida bir marta.
 */
export function checkProductionConfig(): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!isProduction) return { errors, warnings };

  try {
    authSecret();
  } catch (e) {
    errors.push((e as Error).message);
  }

  if (!process.env.DATABASE_URL) {
    errors.push("DATABASE_URL berilmagan — bazaga ulanib bo'lmaydi.");
  }

  // Kirish FAQAT Telegram bot orqali — botsiz hech kim kira olmaydi
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    errors.push(
      "TELEGRAM_BOT_TOKEN berilmagan. Kirish kodlari faqat bot orqali yuboriladi — " +
        "botsiz hech kim tizimga kira olmaydi.",
    );
  }

  if (process.env.ALLOW_SCREEN_OTP === "1") {
    errors.push(
      "ALLOW_SCREEN_OTP=1 — kirish kodi javobda ochiq qaytadi. " +
        "Bu ishlab chiqarishda kirish himoyasini butunlay chetlab o'tish yo'li.",
    );
  }

  if (!process.env.NEXT_PUBLIC_SITE_URL) {
    warnings.push(
      "NEXT_PUBLIC_SITE_URL berilmagan — sitemap va ulashish havolalari localhost ko'rsatadi.",
    );
  }

  if (!process.env.SENTRY_DSN) {
    warnings.push("SENTRY_DSN berilmagan — server xatolari hech qayerga yozilmaydi.");
  }

  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    warnings.push("VAPID kalitlari yo'q — brauzerda push bildirishnoma ishlamaydi.");
  }

  return { errors, warnings };
}
