import type { Metadata } from "next";
import { abs } from "@/lib/site";

export const metadata: Metadata = {
  title: "AI yordamchi — tish og'rig'i qanchalik shoshilinch",
  description:
    "Shikoyatingizni yozing, yordamchi shoshilinchlik darajasini aniqlaydi va mos klinikalarni ko'rsatadi. Bu tashxis emas — aniq javobni shifokor beradi.",
  alternates: { canonical: abs("/triaj") },
  openGraph: { title: "AI yordamchi — tish og'rig'i qanchalik shoshilinch", description: "Shikoyatingizni yozing, yordamchi shoshilinchlik darajasini aniqlaydi va mos klinikalarni ko'rsatadi. Bu tashxis emas — aniq javobni shifokor beradi.", url: abs("/triaj") },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
