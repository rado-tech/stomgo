import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { requireRole, unauthorized, createSession, setSessionCookie } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { TASHKENT_CENTER } from "@/lib/geo";

export async function GET() {
  const user = await requireRole("ADMIN");
  if (!user) return unauthorized();
  const clinics = await db.clinic.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      _count: { select: { appointments: true, reviews: true, doctors: true } },
      users: { where: { role: "CLINIC" }, select: { username: true }, take: 1 },
    },
  });
  return NextResponse.json({
    clinics: clinics.map((c) => ({
      id: c.id, slug: c.slug, name: c.name, district: c.district,
      tier: c.tier, tierEndsAt: c.tierEndsAt, verified: Boolean(c.verifiedAt),
      rating: c.rating, reviewCount: c.reviewCount, photoUrl: c.photoUrl,
      username: c.users[0]?.username ?? null,
      appointments: c._count.appointments, reviews: c._count.reviews, doctors: c._count.doctors,
      deactivated: !!c.deactivatedAt,
      infoStale: c.infoConfirmedAt.getTime() < Date.now() - 60 * 864e5,
    })),
  });
}

function genPassword(): string {
  // O'qishga oson, 10 belgili parol
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  let p = "";
  for (let i = 0; i < 10; i++) p += chars[Math.floor(Math.random() * chars.length)];
  return p;
}

function slugify(name: string): string {
  return name.toLowerCase()
    .replace(/['ʻʼ`]/g, "").replace(/[^a-z0-9а-яё]+/gi, "-")
    .replace(/^-+|-+$/g, "").slice(0, 40) || "klinika";
}

/**
 * Yangi klinika: admin nom/tuman/manzilni kiritadi, tizim login+parol yaratadi.
 * Joylashuv va qolgan hamma narsani klinika o'z panelida to'ldiradi.
 */
export async function POST(req: NextRequest) {
  const admin = await requireRole("ADMIN");
  if (!admin) return unauthorized();
  const body = await req.json().catch(() => ({}));

  const name = String(body.name ?? "").trim().slice(0, 100);
  const district = String(body.district ?? "").trim().slice(0, 50);
  const address = String(body.address ?? "").trim().slice(0, 200);
  const phone = String(body.phone ?? "").trim().slice(0, 20);

  if (!name || !district) {
    return NextResponse.json({ error: "Klinika nomi va tumani majburiy" }, { status: 400 });
  }

  let slug = slugify(name);
  if (await db.clinic.findUnique({ where: { slug } })) {
    slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
  }

  // Login: slug asosida, band bo'lsa raqam qo'shiladi
  let username = slug.replace(/-/g, "_").slice(0, 24);
  if (await db.user.findUnique({ where: { username } })) {
    username = `${username}_${Math.floor(Math.random() * 90 + 10)}`;
  }
  const password = genPassword();

  const clinic = await db.clinic.create({
    data: {
      slug, name, district, address: address || district, phone,
      lat: TASHKENT_CENTER.lat, lng: TASHKENT_CENTER.lng, // klinika o'zi aniqlashtiradi
      workingHours: JSON.stringify({ mon: [["09:00","18:00"]], tue: [["09:00","18:00"]], wed: [["09:00","18:00"]], thu: [["09:00","18:00"]], fri: [["09:00","18:00"]], sat: [["09:00","15:00"]], sun: [] }),
      checkinCode: String(1000 + Math.floor(Math.random() * 9000)),
      qrToken: "q" + Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6),
      coverHue: Math.floor(Math.random() * 360),
    },
  });

  await db.user.create({
    data: {
      phone: `clinic:${clinic.id}`, // telefon o'rniga texnik identifikator
      name: `${name} administratori`,
      role: "CLINIC",
      clinicId: clinic.id,
      username,
      passwordHash: await bcrypt.hash(password, 10),
    },
  });

  audit({
    actorId: admin.id, actorRole: "ADMIN", actorName: admin.name ?? "Admin",
    action: "CLINIC_CREATE", entity: "Clinic", entityId: clinic.id,
    meta: { name, username },
  });

  // Parol faqat shu javobda ko'rsatiladi — admin klinikaga yetkazadi
  return NextResponse.json({ ok: true, slug: clinic.slug, credentials: { username, password } });
}

export async function PATCH(req: NextRequest) {
  const admin = await requireRole("ADMIN");
  if (!admin) return unauthorized();
  const body = await req.json().catch(() => ({}));
  const id = String(body.id ?? "");
  const clinic = await db.clinic.findUnique({ where: { id } });
  if (!clinic) return NextResponse.json({ error: "Klinika topilmadi" }, { status: 404 });

  const actor = { actorId: admin.id, actorRole: "ADMIN", actorName: admin.name ?? "Admin" };

  // Admin klinika panelini o'z ko'zi bilan ko'rishi/tahrirlashi uchun
  if (body.action === "impersonate") {
    const clinicUser = await db.user.findFirst({ where: { clinicId: id, role: "CLINIC" } });
    if (!clinicUser) return NextResponse.json({ error: "Klinika hisobi topilmadi" }, { status: 404 });
    const token = await createSession({ uid: clinicUser.id, role: "CLINIC", clinicId: id });
    audit({ ...actor, action: "CLINIC_UPDATE", entity: "Clinic", entityId: id, meta: { impersonate: true } });
    const res = NextResponse.json({ ok: true, redirect: "/clinic" });
    setSessionCookie(res, token);
    return res;
  }

  if (body.action === "resetPassword") {
    const clinicUser = await db.user.findFirst({ where: { clinicId: id, role: "CLINIC" } });
    if (!clinicUser) return NextResponse.json({ error: "Klinika hisobi topilmadi" }, { status: 404 });
    const password = genPassword();
    await db.user.update({ where: { id: clinicUser.id }, data: { passwordHash: await bcrypt.hash(password, 10) } });
    audit({ ...actor, action: "CLINIC_PASSWORD_RESET", entity: "Clinic", entityId: id });
    return NextResponse.json({ ok: true, credentials: { username: clinicUser.username, password } });
  }

  // To'liq tahrirlash — admin klinikaning istalgan maydonini o'zgartira oladi
  if (body.action === "edit") {
    const f = (body.fields ?? {}) as Record<string, unknown>;
    const edit: Record<string, unknown> = {};
    const str = (k: string, max: number) => {
      if (typeof f[k] === "string") edit[k] = (f[k] as string).trim().slice(0, max);
    };
    str("name", 120); str("description", 1000); str("address", 200);
    str("district", 60); str("phone", 30);

    if (typeof f.lat === "number" && f.lat >= -90 && f.lat <= 90) edit.lat = f.lat;
    if (typeof f.lng === "number" && f.lng >= -180 && f.lng <= 180) edit.lng = f.lng;
    for (const b of ["is247", "emergency", "childFriendly", "showDoctors"]) {
      if (typeof f[b] === "boolean") edit[b] = f[b];
    }
    if (typeof f.coverHue === "number") edit.coverHue = Math.max(0, Math.min(360, Math.round(f.coverHue)));
    if (typeof f.workingHours === "string") {
      try { JSON.parse(f.workingHours as string); edit.workingHours = f.workingHours; }
      catch { return NextResponse.json({ error: "Ish vaqti formati noto'g'ri (JSON)" }, { status: 400 }); }
    }
    if (typeof f.slug === "string") {
      const slug = (f.slug as string).trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").slice(0, 60);
      if (!slug) return NextResponse.json({ error: "Slug bo'sh bo'lmasin" }, { status: 400 });
      const taken = await db.clinic.findFirst({ where: { slug, id: { not: id } } });
      if (taken) return NextResponse.json({ error: `"${slug}" band — boshqa slug tanlang` }, { status: 400 });
      edit.slug = slug;
    }

    if (Object.keys(edit).length === 0) {
      return NextResponse.json({ error: "O'zgartirish uchun maydon yo'q" }, { status: 400 });
    }
    await db.clinic.update({ where: { id }, data: edit });
    audit({ ...actor, action: "CLINIC_UPDATE", entity: "Clinic", entityId: id, meta: { fields: Object.keys(edit) } });
    return NextResponse.json({ ok: true });
  }

  // Shartnomani bekor qilish — klinika ro'yxatdan chiqadi, tarix saqlanadi.
  // O'chirishdan farqi: bemorlarning yozuvlari va sharhlari yo'qolmaydi.
  if (body.action === "deactivate" || body.action === "activate") {
    const off = body.action === "deactivate";
    await db.clinic.update({ where: { id }, data: { deactivatedAt: off ? new Date() : null } });
    await db.user.updateMany({
      where: { clinicId: id, role: "CLINIC" },
      data: { blockedAt: off ? new Date() : null },
    });
    if (off) {
      // Kutilayotgan so'rovlar osilib qolmasin
      await db.appointment.updateMany({
        where: { clinicId: id, status: { in: ["PENDING", "CONFIRMED", "ALT_OFFERED"] } },
        data: { status: "CANCELLED" },
      });
      await db.promoSlot.deleteMany({ where: { clinicId: id } });
    }
    audit({ ...actor, action: "CLINIC_UPDATE", entity: "Clinic", entityId: id, meta: { deactivated: off } });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "block" || body.action === "unblock") {
    const blocked = body.action === "block";
    await db.user.updateMany({
      where: { clinicId: id, role: "CLINIC" },
      data: { blockedAt: blocked ? new Date() : null },
    });
    audit({ ...actor, action: "CLINIC_UPDATE", entity: "Clinic", entityId: id, meta: { blocked } });
    return NextResponse.json({ ok: true });
  }

  const data: Record<string, unknown> = {};
  if (body.action === "verify") {
    data.verifiedAt = new Date();
    audit({ ...actor, action: "CLINIC_VERIFY", entity: "Clinic", entityId: id, meta: { value: true } });
  }
  if (body.action === "unverify") {
    data.verifiedAt = null;
    audit({ ...actor, action: "CLINIC_VERIFY", entity: "Clinic", entityId: id, meta: { value: false } });
  }
  if (body.action === "setTier" && ["FREE", "PRO"].includes(body.tier)) {
    data.tier = body.tier;
    data.tierEndsAt = body.tier === "FREE" ? null : new Date(Date.now() + 30 * 864e5);
    audit({ ...actor, action: "CLINIC_TIER", entity: "Clinic", entityId: id, meta: { tier: body.tier } });
  }
  await db.clinic.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}

/**
 * Klinikani butunlay o'chirish.
 * Bog'liq yozuvlar ko'p — tartib bilan, bitta tranzaksiyada o'chiramiz.
 * Xavfsizlik: tasdiq sifatida klinika nomi aynan yuborilishi shart.
 */
export async function DELETE(req: NextRequest) {
  const admin = await requireRole("ADMIN");
  if (!admin) return unauthorized();

  const id = req.nextUrl.searchParams.get("id") ?? "";
  const confirmName = req.nextUrl.searchParams.get("confirm") ?? "";

  const clinic = await db.clinic.findUnique({
    where: { id },
    include: { _count: { select: { appointments: true, reviews: true, doctors: true } } },
  });
  if (!clinic) return NextResponse.json({ error: "Klinika topilmadi" }, { status: 404 });

  if (confirmName.trim() !== clinic.name) {
    return NextResponse.json(
      { error: `Tasdiqlash uchun klinika nomini aynan yozing: "${clinic.name}"` },
      { status: 400 }
    );
  }

  await db.$transaction(async (tx) => {
    await tx.message.deleteMany({ where: { conversation: { clinicId: id } } });
    await tx.conversation.deleteMany({ where: { clinicId: id } });
    await tx.review.deleteMany({ where: { clinicId: id } });
    await tx.appointment.deleteMany({ where: { clinicId: id } });
    await tx.clinicService.deleteMany({ where: { clinicId: id } });
    await tx.serviceCatalog.deleteMany({ where: { clinicId: id } });
    await tx.clinicPhoto.deleteMany({ where: { clinicId: id } });
    await tx.promoSlot.deleteMany({ where: { clinicId: id } });
    await tx.event.deleteMany({ where: { clinicId: id } });
    await tx.doctor.deleteMany({ where: { clinicId: id } });
    await tx.user.deleteMany({ where: { clinicId: id, role: "CLINIC" } });
    await tx.clinic.delete({ where: { id } });
  });

  audit({
    actorId: admin.id, actorRole: "ADMIN", actorName: admin.name ?? "Admin",
    action: "CLINIC_DELETE", entity: "Clinic", entityId: id,
    meta: {
      name: clinic.name,
      appointments: clinic._count.appointments,
      reviews: clinic._count.reviews,
      doctors: clinic._count.doctors,
    },
  });

  return NextResponse.json({ ok: true });
}
