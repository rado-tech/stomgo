import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole, unauthorized } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { CATEGORIES } from "@/lib/categories";

/** Umumiy xizmatlar katalogi (barcha klinikalar ko'radi) — faqat admin boshqaradi */
export async function GET() {
  const admin = await requireRole("ADMIN");
  if (!admin) return unauthorized();

  const items = await db.serviceCatalog.findMany({
    orderBy: [{ clinicId: "asc" }, { category: "asc" }, { name: "asc" }],
    include: { _count: { select: { clinicServices: true } } },
  });

  // ServiceCatalog.clinicId oddiy maydon (bog'lanish emas) — nomlarni alohida olamiz
  const clinicIds = [...new Set(items.map((s) => s.clinicId).filter(Boolean))] as string[];
  const clinics = clinicIds.length
    ? await db.clinic.findMany({ where: { id: { in: clinicIds } }, select: { id: true, name: true } })
    : [];
  const nameById = new Map(clinics.map((c) => [c.id, c.name]));

  return NextResponse.json({
    items: items.map((s) => ({
      id: s.id, code: s.code, name: s.name, category: s.category,
      umumiy: !s.clinicId,
      klinika: s.clinicId ? nameById.get(s.clinicId) ?? "—" : null,
      ishlatilishi: s._count.clinicServices,
    })),
  });
}

/** Katalogga yangi umumiy xizmat qo'shish */
export async function POST(req: NextRequest) {
  const admin = await requireRole("ADMIN");
  if (!admin) return unauthorized();

  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim().slice(0, 80);
  const category = CATEGORIES.includes(body.category) ? String(body.category) : "BOSHQA";
  const code = String(body.code ?? "").trim().toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 40);

  if (!name) return NextResponse.json({ error: "Xizmat nomini kiriting" }, { status: 400 });
  if (!code) return NextResponse.json({ error: "Kod kiriting (lotin harflar va _)" }, { status: 400 });

  const dup = await db.serviceCatalog.findFirst({ where: { OR: [{ code }, { name, clinicId: null }] } });
  if (dup) return NextResponse.json({ error: "Bunday kod yoki nom allaqachon bor" }, { status: 400 });

  const svc = await db.serviceCatalog.create({ data: { code, name, category, clinicId: null } });
  audit({
    actorId: admin.id, actorRole: "ADMIN", actorName: admin.name ?? "Admin",
    action: "SERVICE_CATALOG_EDIT", entity: "ServiceCatalog", entityId: svc.id, meta: { created: name },
  });
  return NextResponse.json({ ok: true });
}

/** Nomi/turkumini o'zgartirish */
export async function PATCH(req: NextRequest) {
  const admin = await requireRole("ADMIN");
  if (!admin) return unauthorized();

  const body = await req.json().catch(() => ({}));
  const id = String(body.id ?? "");
  const svc = await db.serviceCatalog.findUnique({ where: { id } });
  if (!svc) return NextResponse.json({ error: "Xizmat topilmadi" }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim().slice(0, 80);
  if (CATEGORIES.includes(body.category)) data.category = String(body.category);
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "O'zgartirish uchun maydon yo'q" }, { status: 400 });
  }

  await db.serviceCatalog.update({ where: { id }, data });
  audit({
    actorId: admin.id, actorRole: "ADMIN", actorName: admin.name ?? "Admin",
    action: "SERVICE_CATALOG_EDIT", entity: "ServiceCatalog", entityId: id, meta: { fields: Object.keys(data) },
  });
  return NextResponse.json({ ok: true });
}

/** Katalogdan o'chirish — klinikalar narxlari bilan birga */
export async function DELETE(req: NextRequest) {
  const admin = await requireRole("ADMIN");
  if (!admin) return unauthorized();

  const id = req.nextUrl.searchParams.get("id") ?? "";
  const svc = await db.serviceCatalog.findUnique({
    where: { id },
    include: { _count: { select: { clinicServices: true } } },
  });
  if (!svc) return NextResponse.json({ error: "Xizmat topilmadi" }, { status: 404 });

  await db.$transaction(async (tx) => {
    await tx.clinicService.deleteMany({ where: { serviceId: id } });
    await tx.serviceCatalog.delete({ where: { id } });
  });

  audit({
    actorId: admin.id, actorRole: "ADMIN", actorName: admin.name ?? "Admin",
    action: "SERVICE_CATALOG_EDIT", entity: "ServiceCatalog", entityId: id,
    meta: { deleted: svc.name, klinikalarda: svc._count.clinicServices },
  });
  return NextResponse.json({ ok: true });
}
