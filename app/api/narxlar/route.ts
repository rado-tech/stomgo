import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { haversineKm, TASHKENT_CENTER } from "@/lib/geo";
import { isOpenNow, nextFreeSlot } from "@/lib/hours";

/**
 * Narx solishtirish: bitta xizmat bo'yicha barcha klinikalar yonma-yon.
 * Med24'da bunday narsa yo'q — u yerda narx xizmat turiga biriktirilgan,
 * qaysi klinikada qancha ekani ko'rinmaydi.
 *
 * ?code=implant  — aniq xizmat
 * (kodsiz)       — solishtirish mumkin bo'lgan xizmatlar ro'yxati
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const code = (sp.get("code") ?? "").trim();
  const lat = parseFloat(sp.get("lat") ?? "") || TASHKENT_CENTER.lat;
  const lng = parseFloat(sp.get("lng") ?? "") || TASHKENT_CENTER.lng;

  // Xizmatlar ro'yxati (faqat umumiy katalog — klinika maxsus xizmatlari emas)
  if (!code) {
    const services = await db.serviceCatalog.findMany({
      where: { clinicId: null },
      orderBy: [{ category: "asc" }, { name: "asc" }],
      include: {
        _count: { select: { clinicServices: true } },
        clinicServices: { select: { priceMin: true, priceMax: true } },
      },
    });

    return NextResponse.json({
      items: services
        .filter((s) => s._count.clinicServices > 0)
        .map((s) => {
          const mins = s.clinicServices.map((c) => c.priceMin).filter((n) => n > 0);
          const maxs = s.clinicServices.map((c) => c.priceMax || c.priceMin).filter((n) => n > 0);
          return {
            code: s.code, name: s.name, category: s.category,
            clinicCount: s._count.clinicServices,
            from: mins.length ? Math.min(...mins) : null,
            to: maxs.length ? Math.max(...maxs) : null,
          };
        }),
    });
  }

  const service = await db.serviceCatalog.findFirst({ where: { code, clinicId: null } });
  if (!service) return NextResponse.json({ error: "Xizmat topilmadi" }, { status: 404 });

  const rows = await db.clinicService.findMany({
    where: { serviceId: service.id, clinic: { deactivatedAt: null } },
    include: {
      clinic: {
        include: {
          doctors: { where: { isPublic: true }, select: { gender: true } },
          promoSlots: { where: { startsAt: { lte: new Date() }, endsAt: { gte: new Date() } } },
        },
      },
    },
  });

  const items = rows.map((r) => {
    const c = r.clinic;
    return {
      id: c.id, slug: c.slug, name: c.name, district: c.district,
      photoUrl: c.photoUrl, coverHue: c.coverHue,
      rating: c.rating, reviewCount: c.reviewCount,
      distanceKm: haversineKm(lat, lng, c.lat, c.lng),
      isOpen: isOpenNow(c.workingHours),
      nextSlot: nextFreeSlot(c.workingHours),
      avgResponseMin: c.avgResponseMin,
      hasFemaleDoctor: c.doctors.some((d) => d.gender === "FEMALE"),
      isPromo: c.promoSlots.length > 0,
      verified: !!c.verifiedAt,
      priceMin: r.priceMin,
      priceMax: r.priceMax || r.priceMin,
    };
  });

  const prices = items.map((i) => i.priceMin).filter((n) => n > 0);

  return NextResponse.json({
    service: { code: service.code, name: service.name, category: service.category },
    stats: {
      clinicCount: items.length,
      min: prices.length ? Math.min(...prices) : null,
      max: prices.length ? Math.max(...items.map((i) => i.priceMax)) : null,
      // O'rtacha emas, MEDIANA — bitta juda qimmat klinika rasmni buzmasligi uchun
      median: prices.length ? [...prices].sort((a, b) => a - b)[Math.floor(prices.length / 2)] : null,
    },
    items,
  });
}
