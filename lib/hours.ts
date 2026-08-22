import { fmtWeekdayDateUz } from "./date-uz";

export type WorkingHours = Record<string, [string, string][]>;

const DAY_NAMES: Record<string, string> = {
  mon: "Dushanba", tue: "Seshanba", wed: "Chorshanba", thu: "Payshanba",
  fri: "Juma", sat: "Shanba", sun: "Yakshanba",
};

/** Toshkent vaqti bo'yicha hozirgi kun kaliti va daqiqalar */
export function nowInTashkent(): { dayKey: string; minutes: number } {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tashkent",
    weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false,
  });
  const parts = fmt.formatToParts(new Date());
  const wd = parts.find((p) => p.type === "weekday")?.value ?? "Mon";
  const h = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
  const m = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0", 10);
  const map: Record<string, string> = { Sun: "sun", Mon: "mon", Tue: "tue", Wed: "wed", Thu: "thu", Fri: "fri", Sat: "sat" };
  return { dayKey: map[wd] ?? "mon", minutes: (h === 24 ? 0 : h) * 60 + m };
}

function toMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function isOpenNow(whJson: string): boolean {
  try {
    const wh: WorkingHours = JSON.parse(whJson);
    const { dayKey, minutes } = nowInTashkent();
    const ranges = wh[dayKey] ?? [];
    return ranges.some(([from, to]) => minutes >= toMin(from) && minutes < toMin(to));
  } catch {
    return false;
  }
}

export function todayHoursLabel(whJson: string): string {
  try {
    const wh: WorkingHours = JSON.parse(whJson);
    const { dayKey } = nowInTashkent();
    const ranges = wh[dayKey] ?? [];
    if (!ranges.length) return "Bugun yopiq";
    if (ranges.some(([f, t]) => f === "00:00" && t === "24:00")) return "24 soat ochiq";
    return ranges.map(([f, t]) => `${f}–${t}`).join(", ");
  } catch {
    return "";
  }
}

export function fullWeekLabel(whJson: string): { day: string; label: string; isToday: boolean }[] {
  try {
    const wh: WorkingHours = JSON.parse(whJson);
    const { dayKey } = nowInTashkent();
    return ["mon", "tue", "wed", "thu", "fri", "sat", "sun"].map((k) => {
      const ranges = wh[k] ?? [];
      let label = "Yopiq";
      if (ranges.length) {
        label = ranges.some(([f, t]) => f === "00:00" && t === "24:00")
          ? "24 soat"
          : ranges.map(([f, t]) => `${f}–${t}`).join(", ");
      }
      return { day: DAY_NAMES[k], label, isToday: k === dayKey };
    });
  } catch {
    return [];
  }
}

/** Kelgusi 7 kun uchun bo'sh vaqt slotlari (30 daqiqalik), klinika ish vaqti asosida */
export function generateSlots(whJson: string): { date: string; label: string; slots: string[] }[] {
  const out: { date: string; label: string; slots: string[] }[] = [];
  let wh: WorkingHours;
  try { wh = JSON.parse(whJson); } catch { return out; }

  const keyFmt = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Tashkent", weekday: "short" });
  const isoFmt = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tashkent", year: "numeric", month: "2-digit", day: "2-digit" });
  const map: Record<string, string> = { Sun: "sun", Mon: "mon", Tue: "tue", Wed: "wed", Thu: "thu", Fri: "fri", Sat: "sat" };
  const { minutes: nowMin } = nowInTashkent();

  for (let d = 0; d < 7; d++) {
    const date = new Date(Date.now() + d * 864e5);
    const dayKey = map[keyFmt.format(date)] ?? "mon";
    const ranges = wh[dayKey] ?? [];
    const slots: string[] = [];
    for (const [from, to] of ranges) {
      let f = toMin(from);
      const t = Math.min(toMin(to), 24 * 60);
      // bugungi kun uchun o'tgan vaqtlarni chiqarmaymiz (+1 soat zaxira)
      if (d === 0) f = Math.max(f, Math.ceil((nowMin + 60) / 30) * 30);
      for (let m = f; m + 30 <= t; m += 30) {
        const hh = String(Math.floor(m / 60)).padStart(2, "0");
        const mm = String(m % 60).padStart(2, "0");
        slots.push(`${hh}:${mm}`);
      }
    }
    if (slots.length) {
      out.push({ date: isoFmt.format(date), label: d === 0 ? "Bugun" : d === 1 ? "Ertaga" : fmtWeekdayDateUz(date), slots });
    }
  }
  return out;
}
