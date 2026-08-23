import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole, unauthorized } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { clinicAction } from "@/lib/booking-actions";

/** Barcha yozuvlarni ko'rish va boshqarish — faqat admin */
export async function GET(req: NextRequest) {
  const admin = await requireRole("ADMIN");
  if (!admin) return unauthorized();

  const sp = req.nextUrl.searchParams;
  const status = sp.get("status") ?? "";
  const clinicId = sp.get("clinicId") ?? "";
  const q = (sp.get("q") ?? "").trim();

  const items = await db.appointment.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(clinicId ? { clinicId } : {}),
      ...(q
        ? {
            OR: [
              { code: { contains: q, mode: "insensitive" } },
              { user: { phone: { contains: q } } },
              { user: { name: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      clinic: { select: { id: true, name: true, slug: true } },
      user: { select: { id: true, name: true, phone: true } },
      doctor: { select: { name: true } },
    },
  });

  return NextResponse.json({
    items: items.map((a) => ({
      id: a.id, code: a.code, status: a.status,
      requestedAt: a.requestedAt, altAt: a.altAt, createdAt: a.createdAt,
      rejectReason: a.rejectReason, note: a.note,
      rescheduleCount: a.rescheduleCount,
      clinic: a.clinic.name, clinicId: a.clinic.id,
      patient: a.user.name ?? "—", phone: a.user.phone,
      doctor: a.doctor?.name ?? null,
    })),
  });
}

/** Admin yozuv holatini o'zgartiradi (klinika o'rniga) */
export async function PATCH(req: NextRequest) {
  const admin = await requireRole("ADMIN");
  if (!admin) return unauthorized();

  const body = await req.json().catch(() => ({}));
  const id = String(body.id ?? "");
  const action = String(body.action ?? "");

  const apt = await db.appointment.findUnique({ where: { id }, include: { clinic: true } });
  if (!apt) return NextResponse.json({ error: "Yozuv topilmadi" }, { status: 404 });

  if (action === "cancel") {
    if (["CANCELLED", "DONE", "NO_SHOW"].includes(apt.status)) {
      return NextResponse.json({ error: "Bu yozuvni bekor qilib bo'lmaydi" }, { status: 400 });
    }
    await db.appointment.update({ where: { id }, data: { status: "CANCELLED" } });
    audit({
      actorId: admin.id, actorRole: "ADMIN", actorName: admin.name ?? "Admin",
      action: "APT_CANCEL", entity: "Appointment", entityId: id, meta: { byAdmin: true },
    });
    return NextResponse.json({ ok: true });
  }

  // Qolgan amallarni klinika mantiqi orqali bajaramiz (bildirishnomalar ham ketadi)
  if (["confirm", "reject", "arrived", "no_show", "done"].includes(action)) {
    // Argument tartibi: (appointmentId, clinicId, action, extra, actor)
    const res = await clinicAction(id, apt.clinicId, action, undefined, {
      id: admin.id, role: "ADMIN", name: admin.name ?? "Admin",
    });
    if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Noma'lum amal" }, { status: 400 });
}
