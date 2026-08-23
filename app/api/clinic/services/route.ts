import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { limitWrite } from "@/lib/ratelimit";
import { requireRole, unauthorized } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { CATEGORIES } from "@/lib/categories";
import { checkPrice } from "@/lib/price";



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
  const lim = limitWrite(`svc:${user.id}`, 60, 60 * 60 * 1000);
  if (lim) return lim;
  const body = await req.json().catch(() => ({}));
  const items: { serviceId: string; enabled: boolean; priceMin: number; priceMax: number }[] =
    Array.isArray(body.services) ? body.services : [];

  // Avval HAMMASINI tekshiramiz — bittasi xato bo'lsa hech narsa saqlanmaydi
  const valid: { serviceId: string; priceMin: number; priceMax: number }[] = [];
  const toRemove: string[] = [];

  for (const item of items) {
    if (!item.enabled) { toRemove.push(item.serviceId); continue; }

    const names = await db.serviceCatalog.findUnique({ where: { id: item.serviceId }, select: { name: true } });
    const label = names?.name ?? "Xizmat";

    const min = checkPrice(item.priceMin, `«${label}» — eng past narx`);
    if (!min.ok) return NextResponse.json({ error: min.error }, { status: 400 });

    // "gacha" bo'sh bo'lsa — "dan" bilan bir xil deb olamiz
    const rawMax = String(item.priceMax ?? "").trim();
    let maxValue = min.value;
    if (rawMax && rawMax !== "0") {
      const max = checkPrice(item.priceMax, `«${label}» — eng yuqori narx`);
      if (!max.ok) return NextResponse.json({ error: max.error }, { status: 400 });
      maxValue = max.value;
    }
    if (maxValue < min.value) {
      return NextResponse.json(
        { error: `«${label}»: yuqori narx (${maxValue.toLocaleString("ru-RU")}) past narxdan (${min.value.toLocaleString("ru-RU")}) kichik bo'lmasin` },
        { status: 400 }
      );
    }

    valid.push({ serviceId: item.serviceId, priceMin: min.value, priceMax: maxValue });
  }

  // Tekshiruvdan o'tgach — bir tranzaksiyada yozamiz
  await db.$transaction([
    ...valid.map((v) =>
      db.clinicService.upsert({
        where: { clinicId_serviceId: { clinicId: user.clinicId!, serviceId: v.serviceId } },
        create: { clinicId: user.clinicId!, serviceId: v.serviceId, priceMin: v.priceMin, priceMax: v.priceMax },
        update: { priceMin: v.priceMin, priceMax: v.priceMax },
      })
    ),
    db.clinicService.deleteMany({ where: { clinicId: user.clinicId!, serviceId: { in: toRemove } } }),
  ]);
  audit({ actorId: user.id, actorRole: "CLINIC", actorName: user.name ?? "Klinika", action: "SERVICES_UPDATE", entity: "Clinic", entityId: user.clinicId });
  return NextResponse.json({ ok: true });
}

/** Katalogda yo'q xizmatni klinika o'zi qo'shadi */
export async function POST(req: NextRequest) {
  const user = await requireRole("CLINIC");
  if (!user?.clinicId) return unauthorized();
  const lim = limitWrite(`svc:${user.id}`, 60, 60 * 60 * 1000);
  if (lim) return lim;
  const body = await req.json().catch(() => ({}));

  const name = String(body.name ?? "").trim().slice(0, 80);
  const category = CATEGORIES.includes(body.category) ? String(body.category) : "BOSHQA";

  if (!name) {
    return NextResponse.json({ error: "Xizmat nomini kiriting" }, { status: 400 });
  }

  const min = checkPrice(body.priceMin, "Eng past narx");
  if (!min.ok) return NextResponse.json({ error: min.error }, { status: 400 });

  const rawMax = String(body.priceMax ?? "").trim();
  let priceMax = min.value;
  if (rawMax) {
    const max = checkPrice(body.priceMax, "Eng yuqori narx");
    if (!max.ok) return NextResponse.json({ error: max.error }, { status: 400 });
    priceMax = max.value;
  }
  if (priceMax < min.value) {
    return NextResponse.json(
      { error: `Yuqori narx (${priceMax.toLocaleString("ru-RU")}) past narxdan (${min.value.toLocaleString("ru-RU")}) kichik bo'lmasin` },
      { status: 400 }
    );
  }
  const priceMin = min.value;

  const customCount = await db.serviceCatalog.count({ where: { clinicId: user.clinicId } });
  if (customCount >= 30) {
    return NextResponse.json({ error: "Maxsus xizmatlar soni 30 tadan oshmasin" }, { status: 400 });
  }

  const dup = await db.serviceCatalog.findFirst({
    where: { clinicId: user.clinicId, name: { equals: name, mode: "insensitive" } },
  });
  if (dup) {
    return NextResponse.json({ error: `«${name}» nomli xizmat allaqachon qo'shilgan` }, { status: 400 });
  }

  // Katalog yozuvi va narx BIRGA yaratiladi — biri yiqilsa ikkinchisi ham qolmaydi
  // (avval narxsiz "yetim" xizmat qolib ketardi)
  const clinicId = user.clinicId;
  await db.$transaction(async (tx) => {
    const svc = await tx.serviceCatalog.create({
      data: {
        code: `c_${clinicId.slice(-6)}_${Date.now().toString(36)}`,
        name, category, clinicId,
      },
    });
    await tx.clinicService.create({
      data: { clinicId, serviceId: svc.id, priceMin, priceMax },
    });
  });

  audit({ actorId: user.id, actorRole: "CLINIC", actorName: user.name ?? "Klinika", action: "SERVICE_CUSTOM_ADD", entity: "Clinic", entityId: user.clinicId, meta: { name, category } });
  return NextResponse.json({ ok: true });
}

/** O'z maxsus xizmatini o'chirish */
export async function DELETE(req: NextRequest) {
  const user = await requireRole("CLINIC");
  if (!user?.clinicId) return unauthorized();
  const lim = limitWrite(`svc:${user.id}`, 60, 60 * 60 * 1000);
  if (lim) return lim;
  const serviceId = req.nextUrl.searchParams.get("id") ?? "";

  const svc = await db.serviceCatalog.findFirst({ where: { id: serviceId, clinicId: user.clinicId } });
  if (!svc) return NextResponse.json({ error: "Faqat o'z maxsus xizmatingizni o'chira olasiz" }, { status: 404 });

  await db.clinicService.deleteMany({ where: { serviceId } });
  await db.serviceCatalog.delete({ where: { id: serviceId } });
  audit({ actorId: user.id, actorRole: "CLINIC", actorName: user.name ?? "Klinika", action: "SERVICE_CUSTOM_DEL", entity: "Clinic", entityId: user.clinicId, meta: { name: svc.name } });
  return NextResponse.json({ ok: true });
}
