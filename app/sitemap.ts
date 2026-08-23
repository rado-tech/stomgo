import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { SITE_URL } from "@/lib/site";

/** Har bir so'rovda yangilanadi — yangi klinika darhol indeksga tushsin */
export const revalidate = 3600;

/**
 * Sitemap: statik sahifalar + har bir faol klinika + har bir xizmat.
 * Klinika va xizmat sahifalari — SEO uchun eng qimmatli aktivlar.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = (
    [
      ["", "daily", 1],
      ["/klinikalar", "daily", 0.9],
      ["/narxlar", "weekly", 0.9],
      ["/triaj", "monthly", 0.7],
      ["/hamkorlik", "monthly", 0.6],
      ["/oferta", "yearly", 0.2],
      ["/maxfiylik", "yearly", 0.2],
    ] as const
  ).map(([path, changeFrequency, priority]) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }));

  // Baza yetib bormasa sitemap butunlay yiqilmasin — statik qism baribir chiqsin
  const [clinics, services] = await Promise.all([
    db.clinic
      .findMany({
        where: { deactivatedAt: null },
        select: { slug: true, infoConfirmedAt: true },
        orderBy: { rating: "desc" },
        take: 5000,
      })
      .catch(() => []),
    db.serviceCatalog
      .findMany({ where: { clinicId: null }, select: { code: true }, take: 500 })
      .catch(() => []),
  ]);

  return [
    ...staticPages,
    ...clinics.map((c) => ({
      url: `${SITE_URL}/klinika/${c.slug}`,
      lastModified: c.infoConfirmedAt ?? now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...services.map((s) => ({
      url: `${SITE_URL}/narxlar/${s.code}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
