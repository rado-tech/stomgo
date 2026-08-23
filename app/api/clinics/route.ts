import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { haversineKm, mixScore, TASHKENT_CENTER } from "@/lib/geo";
import { isOpenNow, todayHoursLabel, nextFreeSlot } from "@/lib/hours";

export type ClinicListItem = {
  id: string; slug: string; name: string; district: string; address: string;
  lat: number; lng: number; rating: number; reviewCount: number;
  distanceKm: number; isOpen: boolean; todayHours: string;
  is247: boolean; emergency: boolean; childFriendly: boolean;
  hasFemaleDoctor: boolean; tier: string; isPromo: boolean;
  coverHue: number; photoUrl: string | null; consultPrice: number | null;
  filteredService: { name: string; priceMin: number; priceMax: number } | null;
  infoStale: boolean;
  /** Eng yaqin bo'sh vaqt: "Bugun 15:00" ko'rinishida ko'rsatiladi */
  nextSlot: { date: string; label: string; time: string } | null;
  /** Klinika odatda necha daqiqada javob beradi va necha foiz so'rovga javob bergan */
  avgResponseMin: number;
  responseRate: number;
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
  // "Hozir og'riyapti" rejimi.
  // MUHIM: "shoshilinch" va "bo'sh vaqt bor" bir xil narsa emas.
  //  - emergency/24/7 — klinikaning xossasi: o'tkir og'riqli bemorni navbatsiz oladi
  //  - nextSlot       — jadvaldagi navbatdagi bo'sh vaqt
  // Og'rigan odamga ikkalasi ham to'g'ri keladi, shuning uchun bu rejimda
  // ikkalasini BIRLASHTIRAMIZ: hozir ochiq VA (shoshilinch qabul qiladi YOKI
  // bugun bo'sh vaqti bor).
  const urgent = sp.get("urgent") === "1";
  const maxPrice = parseInt(sp.get("maxPrice") ?? "", 10) || 0;
  const minRating = parseFloat(sp.get("minRating") ?? "") || 0;

  const clinics = await db.clinic.findMany({
    // Shartnomasi bekor qilinganlar ro'yxatda, xaritada va qidiruvda ko'rinmaydi
    where: { deactivatedAt: null },
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
      nextSlot: nextFreeSlot(c.workingHours),
      avgResponseMin: c.avgResponseMin,
      responseRate: c.responseRate,
      _score: 0, _responseRate: c.responseRate,
    } as ClinicListItem & { _score: number; _responseRate: number };
  });

  // Filtrlar
  if (q) items = items.filter((i) => i.name.toLowerCase().includes(q) || i.district.toLowerCase().includes(q));
  if (service) items = items.filter((i) => i.filteredService !== null);
  if (openNow || urgent) items = items.filter((i) => i.isOpen);
  if (female) items = items.filter((i) => i.hasFemaleDoctor);
  if (child) items = items.filter((i) => i.childFriendly);
  if (emergency) items = items.filter((i) => i.emergency || i.is247);
  if (urgent) {
    items = items.filter((i) => i.emergency || i.is247 || i.nextSlot?.label === "Bugun");
  }
  if (night) items = items.filter((i) => i.is247);
  if (minRating) items = items.filter((i) => i.rating >= minRating);
  if (maxPrice && service) items = items.filter((i) => (i.filteredService?.priceMin ?? 0) <= maxPrice);

  // Saralash
  const withScore = items as (ClinicListItem & { _score: number; _responseRate: number })[];
  for (const i of withScore) i._score = mixScore(i.distanceKm, i.rating, i._responseRate);

  if (urgent) {
    // Og'riyotgan odamga: avval bugun qabul qiladiganlar, keyin eng yaqini
    const todayFirst = (x: ClinicListItem) =>
      x.is247 ? 0 : x.nextSlot?.label === "Bugun" ? 1 : x.emergency ? 2 : 3;
    withScore.sort((a, b) => todayFirst(a) - todayFirst(b) || a.distanceKm - b.distanceKm);
  } else if (sort === "distance") withScore.sort((a, b) => a.distanceKm - b.distanceKm);
  else if (sort === "rating") withScore.sort((a, b) => b.rating - a.rating || a.distanceKm - b.distanceKm);
  else if (sort === "price")
    withScore.sort(
      (a, b) =>
        (a.filteredService?.priceMin ?? a.consultPrice ?? 1e12) -
        (b.filteredService?.priceMin ?? b.consultPrice ?? 1e12)
    );
  else withScore.sort((a, b) => b._score - a._score);

  // VIP (pullik joylashuv) — faqat filtrlarga mos kelganlar. Soni cheklanmagan:
  // qancha faol slot bo'lsa, shuncha ko'rsatiladi (admin belgilaydi).
  // Shoshilinch rejimda VIP ko'rsatilmaydi — u yerda faqat masofa hal qiladi.
  let promos: ClinicListItem[] = [];
  let list = withScore.map(({ _score, _responseRate, ...rest }) => { void _score; void _responseRate; return rest; });
  if (!urgent) {
    promos = list.filter((i) => i.isPromo);
    const promoIds = new Set(promos.map((p) => p.id));
    list = list.filter((i) => !promoIds.has(i.id));
  }

  return NextResponse.json({ promos, list });
}
