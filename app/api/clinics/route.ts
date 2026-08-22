import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { haversineKm, mixScore, TASHKENT_CENTER } from "@/lib/geo";
import { isOpenNow, todayHoursLabel } from "@/lib/hours";

export type ClinicListItem = {
  id: string; slug: string; name: string; district: string; address: string;
  lat: number; lng: number; rating: number; reviewCount: number;
  distanceKm: number; isOpen: boolean; todayHours: string;
  is247: boolean; emergency: boolean; childFriendly: boolean;
  hasFemaleDoctor: boolean; tier: string; isPromo: boolean;
  coverHue: number; photoUrl: string | null; consultPrice: number | null;
  filteredService: { name: string; priceMin: number; priceMax: number } | null;
  infoStale: boolean;
};

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const lat = parseFloat(sp.get("lat") ?? "") || TASHKENT_CENTER.lat;
  const lng = parseFloat(sp.get("lng") ?? "") || TASHKENT_CENTER.lng;
  const sort = sp.get("sort") ?? "mix"; // mix | distance | rating | price
  const service = sp.get("service") ?? "";
  const q = (sp.get("q") ?? "").toLowerCase().trim();
  const openNow = sp.get("openNow") === "1";
  const female = sp.get("female") === "1";
  const child = sp.get("child") === "1";
  const emergency = sp.get("emergency") === "1";
  const night = sp.get("night") === "1";
  const urgent = sp.get("urgent") === "1"; // "Hozir og'riyapti" rejimi
  const maxPrice = parseInt(sp.get("maxPrice") ?? "", 10) || 0;
  const minRating = parseFloat(sp.get("minRating") ?? "") || 0;

  const clinics = await db.clinic.findMany({
    include: {
      services: { include: { service: true } },
      doctors: { where: { isPublic: true } },
      promoSlots: { where: { startsAt: { lte: new Date() }, endsAt: { gte: new Date() } } },
    },
  });

  const staleThreshold = Date.now() - 90 * 864e5;

  let items: ClinicListItem[] = clinics.map((c) => {
    const consult = c.services.find((s) => s.service.code === "konsultatsiya");
    const filtered = service ? c.services.find((s) => s.service.code === service) : null;
    return {
      id: c.id, slug: c.slug, name: c.name, district: c.district, address: c.address,
      lat: c.lat, lng: c.lng, rating: c.rating, reviewCount: c.reviewCount,
      distanceKm: haversineKm(lat, lng, c.lat, c.lng),
      isOpen: isOpenNow(c.workingHours),
      todayHours: todayHoursLabel(c.workingHours),
      is247: c.is247, emergency: c.emergency, childFriendly: c.childFriendly,
      hasFemaleDoctor: c.doctors.some((d) => d.gender === "FEMALE"),
      tier: c.tier,
      isPromo: c.promoSlots.length > 0,
      coverHue: c.coverHue,
      photoUrl: c.photoUrl,
      consultPrice: consult?.priceMin ?? null,
      filteredService: filtered
        ? { name: filtered.service.name, priceMin: filtered.priceMin, priceMax: filtered.priceMax }
        : null,
      infoStale: c.infoConfirmedAt.getTime() < staleThreshold,
      _score: 0, _responseRate: c.responseRate,
    } as ClinicListItem & { _score: number; _responseRate: number };
  });

  // Filtrlar
  if (q) items = items.filter((i) => i.name.toLowerCase().includes(q) || i.district.toLowerCase().includes(q));
  if (service) items = items.filter((i) => i.filteredService !== null);
  if (openNow || urgent) items = items.filter((i) => i.isOpen);
  if (female) items = items.filter((i) => i.hasFemaleDoctor);
  if (child) items = items.filter((i) => i.childFriendly);
  if (emergency || urgent) items = items.filter((i) => i.emergency || i.is247);
  if (night) items = items.filter((i) => i.is247);
  if (minRating) items = items.filter((i) => i.rating >= minRating);
  if (maxPrice && service) items = items.filter((i) => (i.filteredService?.priceMin ?? 0) <= maxPrice);

  // Saralash
  const withScore = items as (ClinicListItem & { _score: number; _responseRate: number })[];
  for (const i of withScore) i._score = mixScore(i.distanceKm, i.rating, i._responseRate);

  if (urgent || sort === "distance") withScore.sort((a, b) => a.distanceKm - b.distanceKm);
  else if (sort === "rating") withScore.sort((a, b) => b.rating - a.rating || a.distanceKm - b.distanceKm);
  else if (sort === "price")
    withScore.sort(
      (a, b) =>
        (a.filteredService?.priceMin ?? a.consultPrice ?? 1e12) -
        (b.filteredService?.priceMin ?? b.consultPrice ?? 1e12)
    );
  else withScore.sort((a, b) => b._score - a._score);

  // Promo (homiylik) slotlari — faqat filtrlarga mos kelganlar, ko'pi bilan 2 ta.
  // Shoshilinch rejimda promo ko'rsatilmaydi — u yerda faqat masofa hal qiladi.
  let promos: ClinicListItem[] = [];
  let list = withScore.map(({ _score, _responseRate, ...rest }) => { void _score; void _responseRate; return rest; });
  if (!urgent) {
    promos = list.filter((i) => i.isPromo).slice(0, 2);
    const promoIds = new Set(promos.map((p) => p.id));
    list = list.filter((i) => !promoIds.has(i.id));
  }

  return NextResponse.json({ promos, list });
}
