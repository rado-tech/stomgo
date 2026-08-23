/**
 * Oddiy xotiradagi rate-limit (bitta server nusxasi uchun yetarli).
 * OTP brute-force va yozuv spamidan himoya qiladi.
 */

const buckets = new Map<string, { count: number; resetAt: number }>();

/** true = ruxsat, false = limit oshgan */
export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (b.count >= max) return false;
  b.count++;
  return true;
}

// Eski yozuvlarni vaqti-vaqti bilan tozalash
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of buckets) if (v.resetAt < now) buckets.delete(k);
}, 10 * 60 * 1000).unref?.();

/**
 * Yozuv amallari uchun tayyor chegara: oshib ketsa 429 javobi qaytaradi,
 * aks holda null. Har bir route'da bir xil naqsh yozmaslik uchun.
 *
 *   const limited = limitWrite(`apt:${user.id}`, 10, 60 * 60 * 1000);
 *   if (limited) return limited;
 */
export function limitWrite(key: string, max: number, windowMs: number) {
  if (rateLimit(key, max, windowMs)) return null;
  const minutes = Math.max(1, Math.round(windowMs / 60000));
  return Response.json(
    { error: `Juda ko'p urinish. ${minutes} daqiqadan keyin qayta urining.` },
    { status: 429 },
  );
}
