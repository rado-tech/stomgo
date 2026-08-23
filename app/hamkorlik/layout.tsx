import type { Metadata } from "next";
import { abs } from "@/lib/site";

export const metadata: Metadata = {
  title: "Klinikangizni StomGo'ga qo'shing",
  description:
    "Toshkentdagi stomatologiya klinikalari uchun bepul ulanish. Bemorlar sizni xaritada, narx bo'yicha va tuman bo'yicha qidiruvda topadi. Ariza qoldiring — bir ish kunida bog'lanamiz.",
  alternates: { canonical: abs("/hamkorlik") },
  openGraph: { title: "Klinikangizni StomGo'ga qo'shing", description: "Toshkentdagi stomatologiya klinikalari uchun bepul ulanish. Bemorlar sizni xaritada, narx bo'yicha va tuman bo'yicha qidiruvda topadi. Ariza qoldiring — bir ish kunida bog'lanamiz.", url: abs("/hamkorlik") },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
