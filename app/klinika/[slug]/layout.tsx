import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { SITE_URL, SITE_NAME, abs } from "@/lib/site";

/**
 * Klinika sahifasi uchun SEO qatlami.
 *
 * page.tsx "use client" — undan generateMetadata eksport qilib bo'lmaydi,
 * shuning uchun sarlavha, tavsif va Schema.org razmetkasi shu server
 * qatlamida yig'iladi. Bu sahifalar qidiruv uchun eng qimmatli aktivlar:
 * "chilonzor stomatologiya narxlari" kabi so'rovlar aynan shu yerga tushadi.
 */

async function getClinic(slug: string) {
  return db.clinic
    .findUnique({
      where: { slug },
      select: {
        name: true, description: true, district: true, address: true, phone: true,
        lat: true, lng: true, rating: true, photoUrl: true, is247: true,
        workingHours: true, deactivatedAt: true,
        _count: { select: { reviews: true } },
      },
    })
    .catch(() => null);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const c = await getClinic(slug);
  if (!c) return { title: "Klinika topilmadi" };

  const title = `${c.name} — ${c.district} tumani stomatologiyasi`;
  const description =
    c.description?.trim() ||
    `${c.name}: ${c.address}. Narxlar, shifokorlar, bemor sharhlari va onlayn qabulga yozilish.`;

  return {
    title,
    description: description.slice(0, 300),
    alternates: { canonical: abs(`/klinika/${slug}`) },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title,
      description: description.slice(0, 300),
      url: abs(`/klinika/${slug}`),
      ...(c.photoUrl ? { images: [{ url: abs(c.photoUrl) }] } : {}),
    },
    // Shartnomasi bekor qilingan klinika qidiruvda ko'rinmasin
    ...(c.deactivatedAt ? { robots: { index: false, follow: true } } : {}),
  };
}

/** workingHours JSON -> Schema.org openingHoursSpecification */
function openingHours(json: string) {
  const DAY: Record<string, string> = {
    mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday",
    fri: "Friday", sat: "Saturday", sun: "Sunday",
  };
  try {
    const wh = JSON.parse(json) as Record<string, [string, string][]>;
    return Object.entries(wh).flatMap(([key, ranges]) =>
      (ranges ?? []).map(([opens, closes]) => ({
        "@type": "OpeningHoursSpecification",
        dayOfWeek: DAY[key] ?? key,
        opens,
        closes,
      })),
    );
  } catch {
    return [];
  }
}

export default async function ClinicLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const c = await getClinic(slug);
  if (!c) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Dentist",
    name: c.name,
    url: abs(`/klinika/${slug}`),
    ...(c.description?.trim() ? { description: c.description.trim() } : {}),
    ...(c.photoUrl ? { image: abs(c.photoUrl) } : {}),
    ...(c.phone ? { telephone: c.phone } : {}),
    address: {
      "@type": "PostalAddress",
      streetAddress: c.address,
      addressLocality: `${c.district} tumani`,
      addressRegion: "Toshkent",
      addressCountry: "UZ",
    },
    geo: { "@type": "GeoCoordinates", latitude: c.lat, longitude: c.lng },
    // Reyting faqat haqiqiy sharh bo'lganda — soxta yulduzcha ko'rsatmaymiz
    ...(c._count.reviews > 0 && c.rating > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: c.rating.toFixed(1),
            reviewCount: c._count.reviews,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
    ...(c.is247
      ? { openingHours: "Mo-Su 00:00-23:59" }
      : { openingHoursSpecification: openingHours(c.workingHours) }),
    isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
  };

  return (
    <>
      <script
        type="application/ld+json"
        // Ma'lumot bazadan keladi va JSON.stringify bilan qochiriladi
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      {children}
    </>
  );
}
