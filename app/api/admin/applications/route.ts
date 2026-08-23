import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole, unauthorized } from "@/lib/auth";
import { limitWrite } from "@/lib/ratelimit";
import { audit } from "@/lib/audit";

/** Klinika arizalarini ko'rish */
export async function GET(req: NextRequest) {
  const admin = await requireRole("ADMIN");
  if (!admin) return unauthorized();

  const status = req.nextUrl.searchParams.get("status") ?? "open";
  const where =
    status === "all" ? {}
    : status === "open" ? { status: { in: ["NEW", "CONTACTED"] } }
    : { status };

  const items = await db.clinicApplication.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const counts = await db.clinicApplication.groupBy({ by: ["status"], _count: true });

  return NextResponse.json({
    items,
    counts: Object.fromEntries(counts.map((c) => [c.status, c._count])),
  });
}

/** Ariza holatini o'zgartirish yoki izoh qo'shish */
export async function PATCH(req: NextRequest) {
  const admin = await requireRole("ADMIN");
  if (!admin) return unauthorized();
  const lim = limitWrite(`apps:${admin.id}`, 100, 60 * 60 * 1000);
  if (lim) return lim;

  const body = await req.json().catch(() => ({}));
  const id = String(body.id ?? "");
  const status = String(body.status ?? "");
  const adminNote = body.adminNote === undefined ? undefined : String(body.adminNote).slice(0, 500);

  const allowed = ["NEW", "CONTACTED", "APPROVED", "REJECTED"];
  if (status && !allowed.includes(status)) {
    return NextResponse.json({ error: "Noto'g'ri holat" }, { status: 400 });
  }

  const app = await db.clinicApplication.findUnique({ where: { id } });
  if (!app) return NextResponse.json({ error: "Ariza topilmadi" }, { status: 404 });

  const updated = await db.clinicApplication.update({
    where: { id },
    data: {
      ...(status ? { status, reviewedAt: new Date() } : {}),
      ...(adminNote !== undefined ? { adminNote } : {}),
    },
  });

  audit({
    actorId: admin.id, actorRole: "ADMIN", actorName: admin.name ?? "Admin",
    action: "CLINIC_APPLICATION_UPDATE", entity: "ClinicApplication", entityId: id,
    meta: { clinicName: app.clinicName, from: app.status, to: updated.status },
  });

  return NextResponse.json({ ok: true });
}

/** Arizani o'chirish (spam) */
export async function DELETE(req: NextRequest) {
  const admin = await requireRole("ADMIN");
  if (!admin) return unauthorized();
  const lim = limitWrite(`appsdel:${admin.id}`, 50, 60 * 60 * 1000);
  if (lim) return lim;

  const id = req.nextUrl.searchParams.get("id") ?? "";
  const app = await db.clinicApplication.findUnique({ where: { id } });
  if (!app) return NextResponse.json({ error: "Ariza topilmadi" }, { status: 404 });

  await db.clinicApplication.delete({ where: { id } });

  audit({
    actorId: admin.id, actorRole: "ADMIN", actorName: admin.name ?? "Admin",
    action: "CLINIC_APPLICATION_DELETE", entity: "ClinicApplication", entityId: id,
    meta: { clinicName: app.clinicName, phone: app.phone },
  });

  return NextResponse.json({ ok: true });
}
