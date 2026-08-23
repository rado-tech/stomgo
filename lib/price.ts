/**
 * Narx tekshiruvi — klinika xizmat narxini kiritganda ishlatiladi.
 * Alohida modul: API yo'lida ham, testda ham bir xil qoida.
 */

/** Narx chegaralari (so'mda) — Prisma Int ustunidan oshmasligi ham shu yerda kafolatlanadi */
export const PRICE_MIN = 1_000;
export const PRICE_MAX = 500_000_000;

export type PriceCheck = { ok: true; value: number } | { ok: false; error: string };

/** Narxni tekshiradi: xato bo'lsa SABABINI qaytaradi, jimgina to'g'irlamaydi */
export function checkPrice(raw: unknown, label: string): PriceCheck {
  const text = String(raw ?? "").trim();
  if (!text) return { ok: false, error: `${label} kiritilmagan` };
  if (!/^\d+$/.test(text)) {
    return { ok: false, error: `${label} faqat butun son bo'lishi kerak (manfiy son, kasr va harf bo'lmaydi)` };
  }
  const n = Number(text);
  if (!Number.isSafeInteger(n)) return { ok: false, error: `${label} juda katta` };
  if (n < PRICE_MIN) return { ok: false, error: `${label} kamida ${PRICE_MIN.toLocaleString("ru-RU")} so'm bo'lsin` };
  if (n > PRICE_MAX) return { ok: false, error: `${label} ko'pi bilan ${PRICE_MAX.toLocaleString("ru-RU")} so'm bo'lsin` };
  return { ok: true, value: n };
}

/** «dan – gacha» juftligi mantiqan to'g'rimi */
export function checkPriceRange(min: unknown, max: unknown): PriceCheck | { ok: true; min: number; max: number } {
  const a = checkPrice(min, "Eng past narx");
  if (!a.ok) return a;
  const b = checkPrice(max, "Eng yuqori narx");
  if (!b.ok) return b;
  if (b.value < a.value) return { ok: false, error: "Eng yuqori narx eng past narxdan kichik bo'lmasin" };
  return { ok: true, min: a.value, max: b.value };
}
