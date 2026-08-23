import type { Metadata } from "next";
import { abs } from "@/lib/site";

export const metadata: Metadata = {
  title: "Toshkentdagi stomatologiya klinikalari",
  description:
    "Tuman, reyting, narx va ish vaqti bo'yicha filtrlang. Xaritada ko'ring, bemor sharhlarini o'qing va onlayn qabulga yoziling.",
  alternates: { canonical: abs("/klinikalar") },
  openGraph: { title: "Toshkentdagi stomatologiya klinikalari", description: "Tuman, reyting, narx va ish vaqti bo'yicha filtrlang. Xaritada ko'ring, bemor sharhlarini o'qing va onlayn qabulga yoziling.", url: abs("/klinikalar") },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
