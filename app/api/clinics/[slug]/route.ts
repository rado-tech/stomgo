import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isOpenNow, todayHoursLabel, fullWeekLabel, generateSlots } from "@/lib/hours";
import { haversineKm, TASHKENT_CENTER } from "@/lib/geo";

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const sp = req.nextUrl.searchParams;
  const lat = parseFloat(sp.get("lat") ?? "") || TASHKENT_CENTER.lat;
  const lng = parseFloat(sp.get("lng") ?? "") || TASHKENT_CENTER.lng;

  const c = await db.clinic.findUnique({
    where: { slug },
    include: {
      services: { include: { service: true } },
      photos: { orderBy: { order: "asc" } },
      doctors: { where: { isPublic: true }, orderBy: { experienceYears: "desc" } },
      reviews: {
        where: { status: "APPROVED" },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { user: { select: { name: true } } },
      },
    },
  });
  if (!c) return NextResponse.json({ error: "Klinika topilmadi" }, { status: 404 });

  // Profil ko'rish statistikasi
  await db.event.create({ data: { clinicId: c.id, type: "PROFILE_VIEW" } });

  const byCategory: Record<string, { code: string; name: string; priceMin: number; priceMax: number }[]> = {};
  for (const s of c.services) {
    (byCategory[s.service.category] ??= []).push({
      code: s.service.code, name: s.service.name, priceMin: s.priceMin, priceMax: s.priceMax,
    });
  }

  return NextResponse.json({
    clinic: {
      id: c.id, slug: c.slug, name: c.name, description: c.description,
      address: c.address, district: c.district, phone: c.phone,
      lat: c.lat, lng: c.lng,
      distanceKm: haversineKm(lat, lng, c.lat, c.lng),
      isOpen: isOpenNow(c.workingHours),
      todayHours: todayHoursLabel(c.workingHours),
      week: fullWeekLabel(c.workingHours),
      is247: c.is247, emergency: c.emergency, childFriendly: c.childFriendly,
      verified: Boolean(c.verifiedAt), tier: c.tier,
      rating: c.rating, reviewCount: c.reviewCount,
      avgResponseMin: c.avgResponseMin, coverHue: c.coverHue, photoUrl: c.photoUrl,
      gallery: c.photos.map((p) => p.url),
      infoStale: c.infoConfirmedAt.getTime() < Date.now() - 90 * 864e5,
      servicesByCategory: byCategory,
      doctors: c.showDoctors
        ? c.doctors.map((d) => ({
            id: d.id, name: d.name, gender: d.gender, specialty: d.specialty,
            experienceYears: d.experienceYears, verification: d.verification,
            photoUrl: d.photoUrl,
          }))
        : [],
      showDoctors: c.showDoctors,
      reviews: c.reviews.map((r) => ({
        id: r.id, rating: r.rating, text: r.text, reply: r.reply,
        author: r.user.name?.trim() || "Bemor",
        date: r.createdAt,
      })),
      slots: generateSlots(c.workingHours),
    },
  });
}
