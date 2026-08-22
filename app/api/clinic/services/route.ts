import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole, unauthorized } from "@/lib/auth";
import { audit } from "@/lib/audit";

const CATEGORIES = ["DIAGNOSTIKA", "TERAPIYA", "GIGIENA", "ESTETIKA", "XIRURGIYA", "ORTOPEDIYA", "ORTODONTIYA", "BOLALAR", "BOSHQA"];

export async function GET() {
  const user = await requireRole("CLINIC");
  if (!user?.clinicId) return unauthorized();

  // Umumiy katalog + shu klinikaning o'z xizmatlari
  const catalog = await db.serviceCatalog.findMany({
    where: { OR: [{ clinicId: null }, { clinicId: user.clinicId }] },
    orderBy: [{ clinicId: "asc" }, { category: "asc" }],
  });
  const mine = await db.clinicService.findMany({ where: { clinicId: user.clinicId } });
  const mineMap = new Map(mine.map((m) => [m.serviceId, m]));

  return NextResponse.json({
    services: catalog.map((s) => ({
      serviceId: s.id, code: s.code, name: s.name, category: s.category,
      isCustom: s.clinicId !== null,
      enabled: mineMap.has(s.id),
      priceMin: mineMap.get(s.id)?.priceMin ?? 0,
      priceMax: mineMap.get(s.id)?.priceMax ?? 0,
    })),
  });
}

export async function PUT(req: NextRequest) {
  const user = await requireRole("CLINIC");
  if (!user?.clinicId) return unauthorized();
  const body = await req.json().catch(() => ({}));
  const items: { serviceId: string; enabled: boolean; priceMin: number; priceMax: number }[] =
    Array.isArray(body.services) ? body.services : [];

  for (const item of items) {
    const priceMin = Math.max(0, parseInt(String(item.priceMin), 10) || 0);
    const priceMax = Math.max(priceMin, parseInt(String(item.priceMax), 10) || 0);
    if (item.enabled && priceMin > 0) {
      await db.clinicService.upsert({
        where: { clinicId_serviceId: { clinicId: user.clinicId, serviceId: item.serviceId } },
        create: { clinicId: user.clinicId, serviceId: item.serviceId, priceMin, priceMax },
        update: { priceMin, priceMax },
      });
    } else if (!item.enabled) {
      await db.clinicService.deleteMany({
        where: { clinicId: user.clinicId, serviceId: item.serviceId },
      });
    }
  }
  audit({ actorId: user.id, actorRole: "CLINIC", actorName: user.name ?? "Klinika", action: "SERVICES_UPDATE", entity: "Clinic", entityId: user.clinicId });
  return NextResponse.json({ ok: true });
}

/** Katalogda yo'q xizmatni klinika o'zi qo'shadi */
export async function POST(req: NextRequest) {
  const user = await requireRole("CLINIC");
  if (!user?.clinicId) return unauthorized();
  const body = await req.json().catch(() => ({}));

  const name = String(body.name ?? "").trim().slice(0, 80);
  const category = CATEGORIES.includes(body.category) ? String(body.category) : "BOSHQA";
  const priceMin = Math.max(1, parseInt(String(body.priceMin), 10) || 0);
  const priceMax = Math.max(priceMin, parseInt(String(body.priceMax), 10) || priceMin);

  if (!name || !priceMin) {
    return NextResponse.json({ error: "Xizmat nomi va narxi majburiy" }, { status: 400 });
  }

  const customCount = await db.serviceCatalog.count({ where: { clinicId: user.clinicId } });
  if (customCount >= 30) {
    return NextResponse.json({ error: "Maxsus xizmatlar soni 30 tadan oshmasin" }, { status: 400 });
  }

  const svc = await db.serviceCatalog.create({
    data: {
      code: `c_${user.clinicId.slice(-6)}_${Date.now().toString(36)}`,
      name, category, clinicId: user.clinicId,
    },
  });
  await db.clinicService.create({
    data: { clinicId: user.clinicId, serviceId: svc.id, priceMin, priceMax },
  });

  audit({ actorId: user.id, actorRole: "CLINIC", actorName: user.name ?? "Klinika", action: "SERVICE_CUSTOM_ADD", entity: "Clinic", entityId: user.clinicId, meta: { name, category } });
  return NextResponse.json({ ok: true });
}

/** O'z maxsus xizmatini o'chirish */
export async function DELETE(req: NextRequest) {
  const user = await requireRole("CLINIC");
  if (!user?.clinicId) return unauthorized();
  const serviceId = req.nextUrl.searchParams.get("id") ?? "";

  const svc = await db.serviceCatalog.findFirst({ where: { id: serviceId, clinicId: user.clinicId } });
  if (!svc) return NextResponse.json({ error: "Faqat o'z maxsus xizmatingizni o'chira olasiz" }, { status: 404 });

  await db.clinicService.deleteMany({ where: { serviceId } });
  await db.serviceCatalog.delete({ where: { id: serviceId } });
  audit({ actorId: user.id, actorRole: "CLINIC", actorName: user.name ?? "Klinika", action: "SERVICE_CUSTOM_DEL", entity: "Clinic", entityId: user.clinicId, meta: { name: svc.name } });
  return NextResponse.json({ ok: true });
}
