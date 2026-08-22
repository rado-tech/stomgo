export function fmtPrice(n: number): string {
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    return `${m % 1 === 0 ? m : m.toFixed(1)} mln`;
  }
  return `${Math.round(n / 1000)} ming`;
}

export function fmtPriceRange(min: number, max: number): string {
  return `${fmtPrice(min)} – ${fmtPrice(max)} so'm`;
}

export function fmtPriceFull(n: number): string {
  return n.toLocaleString("uz-UZ").replace(/,/g, " ") + " so'm";
}

import { fmtDateUz, fmtDateTimeUz } from "./date-uz";

export function fmtDate(d: string | Date): string {
  return fmtDateUz(d);
}

export function fmtDateTime(d: string | Date): string {
  return fmtDateTimeUz(d);
}

export function fmtKm(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

export const SPECIALTY_LABELS: Record<string, string> = {
  TERAPEVT: "Terapevt-stomatolog",
  XIRURG: "Xirurg-stomatolog",
  ORTOPED: "Ortoped-stomatolog",
  ORTODONT: "Ortodont",
  BOLALAR: "Bolalar stomatologi",
  GIGIENIST: "Gigienist",
  IMPLANTOLOG: "Implantolog",
};

export const APPOINTMENT_STATUS: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Kutilmoqda", color: "amber" },
  CONFIRMED: { label: "Tasdiqlangan", color: "emerald" },
  ALT_OFFERED: { label: "Boshqa vaqt taklif qilindi", color: "sky" },
  REJECTED: { label: "Rad etilgan", color: "red" },
  CANCELLED: { label: "Bekor qilingan", color: "zinc" },
  ARRIVED: { label: "Keldi", color: "emerald" },
  NO_SHOW: { label: "Kelmadi", color: "red" },
  DONE: { label: "Yakunlangan", color: "violet" },
};

export const VERIFICATION_LABELS: Record<string, string> = {
  REGISTERED: "Ro'yxatdan o'tgan",
  CLINIC_CONFIRMED: "Klinika tasdiqlagan",
  DOC_VERIFIED: "Hujjatlari tekshirilgan",
};
