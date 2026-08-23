import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import SwRegister from "@/components/SwRegister";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "StomGo — Toshkent stomatologiyalari",
    template: "%s | StomGo",
  },
  description:
    "Toshkentdagi stomatologiya klinikalari: xaritada toping, narxlarni solishtiring, onlayn yoziling. AI yordamchi shoshilinchlikni aniqlab beradi.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "StomGo" },
};

export const viewport: Viewport = {
  themeColor: "#0f766e",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="uz" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {/* Tema tanlovini birinchi chizishdan OLDIN qo'llash (miltillashni oldini oladi) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem("sg_theme")==="dark")document.documentElement.dataset.theme="dark"}catch(e){}`,
          }}
        />
        <SwRegister />
        {children}
      </body>
    </html>
  );
}
