/** Xizmat turkumlari — server va klient uchun yagona manba */
export const CATEGORIES = [
  "DIAGNOSTIKA", "TERAPIYA", "GIGIENA", "ESTETIKA",
  "XIRURGIYA", "ORTOPEDIYA", "ORTODONTIYA", "BOLALAR", "BOSHQA",
] as const;

export type Category = (typeof CATEGORIES)[number];

/** Turkum nomlari (interfeys uchun) */
export const CATEGORY_LABELS: Record<string, string> = {
  DIAGNOSTIKA: "Diagnostika", TERAPIYA: "Terapiya", GIGIENA: "Gigiena", ESTETIKA: "Estetika",
  XIRURGIYA: "Xirurgiya", ORTOPEDIYA: "Ortopediya", ORTODONTIYA: "Ortodontiya", BOLALAR: "Bolalar",
  BOSHQA: "Boshqa",
};
