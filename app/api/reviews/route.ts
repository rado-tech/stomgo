import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser, unauthorized } from "@/lib/auth";
import { audit } from "@/lib/audit";

/** Sharh faqat tasdiqlangan tashrifdan keyin (ARRIVED yoki DONE) yoziladi */
export async function POST(req: NextRequest) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const body = await req.json().catch(() => ({}));

  const appointmentId = String(body.appointmentId ?? "");
  const rating = Math.min(5, Math.max(1, parseInt(String(body.rating), 10) || 0));
  if (!rating) return NextResponse.json({ error: "Baho tanlang" }, { status: 400 });

  const apt = await db.appointment.findFirst({
    where: { id: appointmentId, userId: user.id },
    include: { review: true },
  });
  if (!apt) return NextResponse.json({ error: "Yozuv topilmadi" }, { status: 404 });
  if (!["ARRIVED", "DONE"].includes(apt.status)) {
    return NextResponse.json({ error: "Sharh faqat tashrifdan keyin yoziladi" }, { status: 400 });
  }
  if (apt.review) return NextResponse.json({ error: "Bu tashrif uchun sharh yozilgan" }, { status: 409 });

  const sub = (v: unknown) => {
    const n = parseInt(String(v), 10);
    return n >= 1 && n <= 5 ? n : null;
  };

  await db.review.create({
    data: {
      appointmentId, userId: user.id, clinicId: apt.clinicId, rating,
      waitTime: sub(body.waitTime), attitude: sub(body.attitude), priceMatch: sub(body.priceMatch),
      text: String(body.text ?? "").slice(0, 1000),
      status: "PENDING", // moderatsiyadan keyin ko'rinadi
    },
  });

  audit({ actorId: user.id, actorRole: "PATIENT", actorName: user.name ?? user.phone, action: "REVIEW_CREATE", entity: "Review", entityId: appointmentId });
  return NextResponse.json({ ok: true, message: "Sharhingiz moderatsiyadan so'ng e'lon qilinadi" });
}
