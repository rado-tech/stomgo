/** Toshkent tumanlari — sayt bo'ylab bitta manba */
export const DISTRICTS = [
  "Bektemir", "Chilonzor", "Mirobod", "Mirzo Ulug'bek", "Olmazor", "Sergeli",
  "Shayxontohur", "Uchtepa", "Yakkasaroy", "Yashnobod", "Yunusobod", "Yangihayot",
] as const;

export type District = (typeof DISTRICTS)[number];

export function isDistrict(v: string): boolean {
  return (DISTRICTS as readonly string[]).includes(v);
}
