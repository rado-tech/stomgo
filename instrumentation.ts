import * as Sentry from "@sentry/nextjs";

/**
 * Server tomonidagi xatolarni kuzatish (Sentry).
 * SENTRY_DSN berilmagan bo'lsa — hech narsa qilmaydi.
 * DSN olish: sentry.io → project yaratish → DSN → .env ga SENTRY_DSN=...
 */
export async function register() {
  if (process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: 0.1,
      // Tibbiy loyiha: shaxsiy ma'lumotlar (IP, cookie) yuborilmaydi
      sendDefaultPii: false,
      beforeSend(event) {
        // Telefon raqamlarini xabarlardan tozalaymiz
        if (event.message) event.message = event.message.replace(/\+998\d{9}/g, "+998*********");
        return event;
      },
    });
  }
}

export const onRequestError = Sentry.captureRequestError;
