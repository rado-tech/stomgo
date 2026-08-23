import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import SwRegister from "@/components/SwRegister";
import OfflineBanner from "@/components/OfflineBanner";
import I18nProvider from "@/components/I18nProvider";
import { cookies, headers } from "next/headers";
import { LOCALE_KEY, normalizeLocale, guessLocale } from "@/lib/i18n";
import { SITE_URL, SITE_NAME } from "@/lib/site";
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
  // Nisbiy manzillar (og:image, canonical) shu asosda to'liq URL ga aylanadi
  metadataBase: new URL(SITE_URL),
  title: {
    default: "StomGo — Toshkent stomatologiyalari",
    template: "%s | StomGo",
  },
  description:
    "Toshkentdagi stomatologiya klinikalari: xaritada toping, narxlarni solishtiring, onlayn yoziling. AI yordamchi shoshilinchlikni aniqlab beradi.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "StomGo" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "uz_UZ",
    url: SITE_URL,
  },
};

/** Bosh sahifada — qidiruv tizimi saytni tashkilot sifatida tanishi uchun */
const SITE_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: SITE_URL,
  inLanguage: "uz",
  potentialAction: {
    "@type": "SearchAction",
    target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/klinikalar?q={search_term_string}` },
    "query-input": "required name=search_term_string",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f766e",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Til cookie'dan — birinchi chizishda to'g'ri bo'lsin, matn miltillamasin.
  // Cookie yo'q bo'lsa brauzer tilidan taxmin qilamiz.
  const store = await cookies();
  const h = await headers();
  const locale = store.get(LOCALE_KEY)?.value
    ? normalizeLocale(store.get(LOCALE_KEY)?.value)
    : guessLocale(h.get("accept-language"));

  return (
    <html lang={locale} className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(SITE_JSON_LD) }}
        />
        {/* Tema tanlovini birinchi chizishdan OLDIN qo'llash (miltillashni oldini oladi) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem("sg_theme")==="dark")document.documentElement.dataset.theme="dark"}catch(e){}`,
          }}
        />
        <I18nProvider initial={locale}>
          <OfflineBanner />
          <SwRegister />
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
