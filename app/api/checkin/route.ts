import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser, unauthorized } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { askReview } from "@/lib/booking-actions";
import { rateLimit } from "@/lib/ratelimit";

/**
 * QR check-in: bemor klinikadagi QR kodni skanerlab kelganini O'ZI tasdiqlaydi.
 * Resepshn hech narsa qilmaydi — navbat sekinlashmaydi.
 *
 * - Bugungi faol yozuvi bo'lsa → ARRIVED
 * - Yozuvsiz kelgan (walk-in) bo'lsa → ARRIVED holatida yangi tashrif yoziladi
 *   (shu orqali sharh yozish huquqi ochiladi)
 */

/** QR sahifasi uchun klinika ma'lumoti (autentifikatsiyasiz) */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const clinic = await db.clinic.findUnique({
    where: { qrToken: token },
    select: { name: true, address: true, photoUrl: true, coverHue: true },
  });
  if (!clinic) return NextResponse.json({ error: "QR kod noto'g'ri" }, { status: 404 });
  return NextResponse.json({ clinic });
}

export async function POST(req: NextRequest) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const body = await req.json().catch(() => ({}));
  const token = String(body.token ?? "");

  if (!rateLimit(`checkin:${user.id}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Juda ko'p urinish" }, { status: 429 });
  }

  const clinic = await db.clinic.findUnique({ where: { qrToken: token } });
  if (!clinic) return NextResponse.json({ error: "QR kod noto'g'ri yoki eskirgan" }, { status: 404 });

  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);

  // 1) Faol yozuvi bormi? (bugungi yoki kutilayotgan)
  const existing = await db.appointment.findFirst({
    where: {
      userId: user.id, clinicId: clinic.id,
      status: { in: ["PENDING", "CONFIRMED", "ALT_OFFERED"] },
    },
    orderBy: { requestedAt: "asc" },
  });

  let aptId: string;
  let walkIn = false;

  if (existing) {
    await db.appointment.update({
      where: { id: existing.id },
      data: { status: "ARRIVED", arrivedAt: new Date(), respondedAt: existing.respondedAt ?? new Date() },
    });
    aptId = existing.id;
  } else {
    // 2) Walk-in: yozuvsiz kelgan bemor. Kuniga bitta klinikaga bittadan.
    const todayWalkin = await db.appointment.findFirst({
      where: { userId: user.id, clinicId: clinic.id, source: "WALKIN", createdAt: { gte: dayStart } },
    });
    if (todayWalkin) {
      aptId = todayWalkin.id;
    } else {
      const apt = await db.appointment.create({
        data: {
          userId: user.id, clinicId: clinic.id,
          requestedAt: new Date(), status: "ARRIVED", arrivedAt: new Date(),
          source: "WALKIN", code: String(100000 + Math.floor(Math.random() * 900000)),
        },
      });
      aptId = apt.id;
      walkIn = true;
    }
  }

  audit({
    actorId: user.id, actorRole: "PATIENT", actorName: user.name ?? user.phone,
    action: "APT_CHECKIN", entity: "Appointment", entityId: aptId,
    meta: { clinic: clinic.name, via: "qr", walkIn },
  });

  // Botga ulangan bo'lsa — baholash so'rovi
  void askReview(aptId).catch(() => {});

  const hasReview = await db.review.findUnique({ where: { appointmentId: aptId } });

  return NextResponse.json({
    ok: true,
    appointmentId: aptId,
    clinicName: clinic.name,
    canReview: !hasReview,
    walkIn,
  });
}
