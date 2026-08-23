import type { Metadata } from "next";
import { db } from "@/lib/db";
import { SITE_NAME, abs } from "@/lib/site";

/**
 * Narx solishtirish sahifasi uchun SEO qatlami.
 * "implant narxi toshkent" kabi so'rovlar aynan shu sahifaga tushadi —
 * shuning uchun sarlavhada haqiqiy narx oralig'i ko'rsatiladi.
 */

const money = (n: number) => `${Math.round(n / 1000).toLocaleString("ru-RU")} ming so'm`;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ kod: string }>;
}): Promise<Metadata> {
  const { kod } = await params;

  const service = await db.serviceCatalog
    .findFirst({ where: { code: kod, clinicId: null }, select: { name: true } })
    .catch(() => null);

  if (!service) return { title: "Xizmat topilmadi" };

  const prices = await db.clinicService
    .findMany({
      where: { service: { code: kod }, clinic: { deactivatedAt: null } },
      select: { priceMin: true },
    })
    .catch(() => []);

  const values = prices.map((p) => p.priceMin).filter((n) => n > 0).sort((a, b) => a - b);
  const range =
    values.length > 0 ? ` — ${money(values[0])} dan ${money(values[values.length - 1])} gacha` : "";

  const title = `${service.name} narxi Toshkentda${range}`;
  const description =
    `Toshkentdagi ${values.length || ""} klinikada «${service.name}» narxini solishtiring. ` +
    `Manzil, reyting, bemor sharhlari va onlayn qabulga yozilish — ${SITE_NAME}.`;

  return {
    title,
    description: description.replace(/\s+/g, " ").slice(0, 300),
    alternates: { canonical: abs(`/narxlar/${kod}`) },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title,
      description: description.slice(0, 300),
      url: abs(`/narxlar/${kod}`),
    },
  };
}

export default function PriceLayout({ children }: { children: React.ReactNode }) {
  return children;
}
