/**
 * Oddiy xotiradagi rate-limit (bitta server nusxasi uchun yetarli).
 * SMS byudjetini va OTP brute-force ni himoya qiladi.
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
