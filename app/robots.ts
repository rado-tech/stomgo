import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/** public/robots.txt o'rniga — sitemap manzili avtomatik qo'shiladi */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Shaxsiy va xizmat sahifalari indekslanmaydi
        disallow: ["/admin", "/clinic", "/api/", "/profil", "/xabarlar", "/bildirishnomalar", "/kirish", "/checkin/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
