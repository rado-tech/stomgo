/**
 * Saytning ommaviy manzili — sitemap, Schema.org va ulashish havolalari uchun.
 *
 * Bu qiymat SERVER tomonida, so'rovdan tashqarida ham kerak bo'ladi
 * (sitemap.ts, generateMetadata), shuning uchun publicOrigin() dan farqli
 * o'laroq muhit o'zgaruvchisidan olinadi.
 *
 * Doimiy domen olingach .env ga yoziladi:
 *   NEXT_PUBLIC_SITE_URL="https://stomgo.uz"
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");

export const SITE_NAME = "StomGo";

export function abs(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
