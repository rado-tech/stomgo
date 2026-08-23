function tashkentParts(d: Date) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tashkent",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
  const p: Record<string, string> = {};
  for (const part of fmt.formatToParts(d)) p[part.type] = part.value;
  return p;
}

/** "22/08/2026, 15:00" — butun loyihada bir xil: kun/oy/yil */
export function fmtDateTime(d: string | Date): string {
  const p = tashkentParts(new Date(d));
  return `${p.day}/${p.month}/${p.year}, ${p.hour === "24" ? "00" : p.hour}:${p.minute}`;
}

/** "22/08/2026" */
export function fmtDate(d: string | Date): string {
  const p = tashkentParts(new Date(d));
  return `${p.day}/${p.month}/${p.year}`;
}

export function fmtPrice(n: number): string {
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    return `${m % 1 === 0 ? m : m.toFixed(1)} mln`;
  }
  return `${Math.round(n / 1000)} ming`;
}

export function fmtKm(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}
