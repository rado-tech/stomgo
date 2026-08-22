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

  const data: Record<string, unknown> = {};
  if (body.action === "verify") {
    data.verifiedAt = new Date();
    audit({ ...actor, action: "CLINIC_VERIFY", entity: "Clinic", entityId: id, meta: { value: true } });
  }
  if (body.action === "unverify") {
    data.verifiedAt = null;
    audit({ ...actor, action: "CLINIC_VERIFY", entity: "Clinic", entityId: id, meta: { value: false } });
  }
  if (body.action === "setTier" && ["FREE", "STANDARD", "PREMIUM"].includes(body.tier)) {
    data.tier = body.tier;
    data.tierEndsAt = body.tier === "FREE" ? null : new Date(Date.now() + 30 * 864e5);
    audit({ ...actor, action: "CLINIC_TIER", entity: "Clinic", entityId: id, meta: { tier: body.tier } });
  }
  await db.clinic.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}
