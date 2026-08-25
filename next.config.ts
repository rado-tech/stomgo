import type { NextConfig } from "next";

/**
 * Xavfsizlik sarlavhalari.
 * CSP: xarita (maplibre) blob worker va data: URL ishlatadi, shuning uchun
 * worker-src/img-src kengroq. Barcha tashqi manbalar o'z proksimiz orqali o'tadi.
 */
const isDev = process.env.NODE_ENV !== "production";

/**
 * Sentry qaysi manzilga xabar yuborishi DSN ichida yozilgan.
 * Uni CSP ga qo'lda yozib qo'ysak, DSN o'zgarganda unutiladi va brauzer
 * xatolari jimgina bloklanib ketadi — aynan shu bo'lgan edi.
 */
function sentryOrigin(): string | null {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;
  if (!dsn) return null;
  try {
    return new URL(dsn).origin;
  } catch {
    return null;
  }
}

const connectSrc = ["'self'", sentryOrigin()].filter(Boolean).join(" ");

const securityHeaders = [
  // Sayt boshqa saytga <iframe> qilib joylashtirilmasin (clickjacking)
  { key: "X-Frame-Options", value: "DENY" },
  // Brauzer fayl turini "taxmin qilmasin"
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Tashqi saytga faqat domen nomi ketsin, to'liq manzil emas
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Keraksiz qurilma ruxsatlarini o'chiramiz (joylashuv bizga kerak)
  { key: "Permissions-Policy", value: "camera=(), microphone=(), payment=(), usb=(), geolocation=(self)" },
  // HTTPS majburiy (faqat https orqali kelganda kuchga kiradi)
  { key: "Strict-Transport-Security", value: "max-age=15552000; includeSubDomains" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // 'unsafe-inline' — Next.js ishlab chiqarishda ham inline bootstrap
      // skriptidan foydalanadi (nonce uchun middleware kerak bo'lardi).
      // 'unsafe-eval' esa FAQAT ishlab chiqishda kerak (React Refresh) —
      // ishlab chiqarishda u XSS uchun ochiq eshik, shuning uchun yo'q.
      isDev
        ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
        : "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      // Xarita worker'lari blob orqali yuklanadi
      "worker-src 'self' blob:",
      "child-src 'self' blob:",
      `connect-src ${connectSrc}`,
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  // Docker konteyner uchun minimal chiqish
  output: "standalone",

  // Server versiyasini oshkor qilmaymiz
  poweredByHeader: false,

  // Standalone yig'ishda mobil ilovaning Android build papkalari skanerlanmasin —
  // ular serverga aloqasi yo'q, lekin yuz megabaytlab fayl nusxalashga urinadi.
  outputFileTracingExcludes: {
    "*": ["mobile/**", "tools/**", "uploads/**", ".next/cache/**"],
  },

  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
