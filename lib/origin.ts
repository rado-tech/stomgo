import type { NextRequest } from "next/server";

/**
 * So'rovning HAQIQIY tashqi manzili.
 * Cloudflare tunnel / Caddy orqasida nextUrl.origin "localhost:3000" ni qaytaradi —
 * shuning uchun proksi sarlavhalariga tayanamiz.
 */
export function publicOrigin(req: NextRequest): string {
  const proto =
    req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
    req.nextUrl.protocol.replace(":", "") ||
    "https";
  const host =
    req.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    req.headers.get("host") ||
    req.nextUrl.host;
  return `${proto}://${host}`;
}
