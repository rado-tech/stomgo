/**
 * Sana formatlash (Toshkent vaqti). Butun loyihada bir xil: KUN/OY/YIL.
 * Intl 'uz' lokali ba'zi muhitlarda to'liq emas ("M08 22" beradi),
 * shuning uchun qo'lda yig'amiz.
 */

export const WEEKDAYS_UZ = [
  "Yakshanba", "Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba",
];

const pad = (n: number) => String(n).padStart(2, "0");

function partsInTashkent(d: Date): { y: number; m: number; day: number; hh: string; mm: string; wd: number } {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tashkent",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false, weekday: "short",
  });
  const p: Record<string, string> = {};
  for (const part of fmt.formatToParts(d)) p[part.type] = part.value;
  const wdMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    y: parseInt(p.year, 10),
    m: parseInt(p.month, 10),
    day: parseInt(p.day, 10),
    hh: p.hour === "24" ? "00" : p.hour,
    mm: p.minute,
    wd: wdMap[p.weekday] ?? 1,
  };
}

/** "22/08/2026" — butun loyihada bir xil: kun/oy/yil */
export function fmtDateUz(d: Date | string): string {
  const { y, m, day } = partsInTashkent(new Date(d));
  return `${pad(day)}/${pad(m)}/${y}`;
}

/** "22/08/2026, 15:00" */
export function fmtDateTimeUz(d: Date | string): string {
  const p = partsInTashkent(new Date(d));
  return `${pad(p.day)}/${pad(p.m)}/${p.y}, ${p.hh}:${p.mm}`;
}

/** "Juma, 22/08" — slot kunlari uchun */
export function fmtWeekdayDateUz(d: Date | string): string {
  const p = partsInTashkent(new Date(d));
  return `${WEEKDAYS_UZ[p.wd]}, ${pad(p.day)}/${pad(p.m)}`;
}
