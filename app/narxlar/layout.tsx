import type { Metadata } from "next";
import { abs } from "@/lib/site";

export const metadata: Metadata = {
  title: "Stomatologiya narxlari — Toshkent bo'yicha solishtirish",
  description:
    "Implant, breket, plomba, oqartirish va boshqa muolajalar narxini Toshkentdagi klinikalar bo'yicha solishtiring. Median narx, masofa va reyting bir ekranda.",
  alternates: { canonical: abs("/narxlar") },
  openGraph: { title: "Stomatologiya narxlari — Toshkent bo'yicha solishtirish", description: "Implant, breket, plomba, oqartirish va boshqa muolajalar narxini Toshkentdagi klinikalar bo'yicha solishtiring. Median narx, masofa va reyting bir ekranda.", url: abs("/narxlar") },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
