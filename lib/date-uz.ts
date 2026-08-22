/**
 * O'zbekcha sana formatlash (Toshkent vaqti).
 * Intl 'uz' lokali ba'zi muhitlarda (Node ICU, ayrim brauzerlar) to'liq emas —
 * "M08 22" kabi chiqadi. Shuning uchun oy/kun nomlari qo'lda beriladi.
 */

const MONTHS = [
  "yanvar", "fevral", "mart", "aprel", "may", "iyun",
  "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr",
];
export const WEEKDAYS_UZ = [
  "Yakshanba", "Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba",
];

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

/** "22-avgust" */
export function fmtDateUz(d: Date | string): string {
  const { m, day } = partsInTashkent(new Date(d));
  return `${day}-${MONTHS[m - 1]}`;
}

/** "22-avgust, 15:00" */
export function fmtDateTimeUz(d: Date | string): string {
  const p = partsInTashkent(new Date(d));
  return `${p.day}-${MONTHS[p.m - 1]}, ${p.hh}:${p.mm}`;
}

/** "Juma, 22-avgust" — slot kunlari uchun */
export function fmtWeekdayDateUz(d: Date | string): string {
  const p = partsInTashkent(new Date(d));
  return `${WEEKDAYS_UZ[p.wd]}, ${p.day}-${MONTHS[p.m - 1]}`;
}
