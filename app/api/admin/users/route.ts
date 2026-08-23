import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole, unauthorized } from "@/lib/auth";
import { audit } from "@/lib/audit";

/** Foydalanuvchilarni boshqarish — faqat admin */
export async function GET(req: NextRequest) {
  const admin = await requireRole("ADMIN");
  if (!admin) return unauthorized();

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  const role = req.nextUrl.searchParams.get("role") ?? "PATIENT";

  const users = await db.user.findMany({
    where: {
      ...(role !== "all" ? { role } : {}),
      ...(q ? { OR: [{ phone: { contains: q } }, { name: { contains: q, mode: "insensitive" } }] } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      clinic: { select: { name: true } },
      _count: { select: { appointments: true, reviews: true, devices: true } },
    },
  });

  return NextResponse.json({
    items: users.map((u) => ({
      id: u.id, name: u.name, phone: u.phone, role: u.role,
      gender: u.gender, birthYear: u.birthYear,
      clinic: u.clinic?.name ?? null,
      telegramUlangan: !!u.telegramChatId,
      blocked: !!u.blockedAt,
      yozuvlar: u._count.appointments,
      sharhlar: u._count.reviews,
      qurilmalar: u._count.devices,
      createdAt: u.createdAt,
    })),
  });
}

/** Bloklash / blokdan chiqarish / ma'lumotni tahrirlash */
export async function PATCH(req: NextRequest) {
  const admin = await requireRole("ADMIN");
  if (!admin) return unauthorized();

  const body = await req.json().catch(() => ({}));
  const id = String(body.id ?? "");
  const target = await db.user.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: "Foydalanuvchi topilmadi" }, { status: 404 });
  if (target.id === admin.id) {
    return NextResponse.json({ error: "O'zingizni o'zgartira olmaysiz" }, { status: 400 });
  }

  const actor = { actorId: admin.id, actorRole: "ADMIN", actorName: admin.name ?? "Admin" };

  if (body.action === "block" || body.action === "unblock") {
    const blocked = body.action === "block";
    if (blocked && target.role === "ADMIN") {
      return NextResponse.json({ error: "Adminni bloklab bo'lmaydi" }, { status: 400 });
    }
    await db.user.update({ where: { id }, data: { blockedAt: blocked ? new Date() : null } });
    if (blocked) await db.device.deleteMany({ where: { userId: id } });
    audit({ ...actor, action: "USER_BLOCK", entity: "User", entityId: id, meta: { phone: target.phone, blocked } });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "edit") {
    const f = (body.fields ?? {}) as Record<string, unknown>;
    const data: Record<string, unknown> = {};
    if (typeof f.name === "string") data.name = f.name.trim().slice(0, 80) || null;
    if (typeof f.gender === "string" && ["MALE", "FEMALE", ""].includes(f.gender)) {
      data.gender = f.gender || null;
    }
    if (f.birthYear === null || f.birthYear === "") data.birthYear = null;
    else if (typeof f.birthYear === "number") {
      const y = Math.round(f.birthYear);
      const now = new Date().getFullYear();
      if (y < 1900 || y > now) return NextResponse.json({ error: `Tug'ilgan yil 1900–${now} oralig'ida bo'lsin` }, { status: 400 });
      data.birthYear = y;
    }
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "O'zgartirish uchun maydon yo'q" }, { status: 400 });
    }
    await db.user.update({ where: { id }, data });
    audit({ ...actor, action: "USER_EDIT", entity: "User", entityId: id, meta: { fields: Object.keys(data) } });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Noma'lum amal" }, { status: 400 });
}

/** Foydalanuvchini butunlay o'chirish (bog'liq ma'lumotlari bilan) */
export async function DELETE(req: NextRequest) {
  const admin = await requireRole("ADMIN");
  if (!admin) return unauthorized();

  const id = req.nextUrl.searchParams.get("id") ?? "";
  const confirm = req.nextUrl.searchParams.get("confirm") ?? "";

  const target = await db.user.findUnique({
    where: { id },
    include: { _count: { select: { appointments: true, reviews: true } } },
  });
  if (!target) return NextResponse.json({ error: "Foydalanuvchi topilmadi" }, { status: 404 });
  if (target.id === admin.id) return NextResponse.json({ error: "O'zingizni o'chira olmaysiz" }, { status: 400 });
  if (target.role === "ADMIN") return NextResponse.json({ error: "Adminni o'chirib bo'lmaydi" }, { status: 400 });
  if (confirm.trim() !== target.phone) {
    return NextResponse.json({ error: `Tasdiqlash uchun raqamni aynan yozing: ${target.phone}` }, { status: 400 });
  }

  await db.$transaction(async (tx) => {
    await tx.message.deleteMany({ where: { conversation: { userId: id } } });
    await tx.conversation.deleteMany({ where: { userId: id } });
    await tx.review.deleteMany({ where: { userId: id } });
    await tx.appointment.deleteMany({ where: { userId: id } });
    await tx.notification.deleteMany({ where: { userId: id } });
    await tx.device.deleteMany({ where: { userId: id } });
    await tx.triageSession.deleteMany({ where: { userId: id } });
    await tx.otpCode.deleteMany({ where: { phone: target.phone } });
    await tx.user.delete({ where: { id } });
  });

  audit({
    actorId: admin.id, actorRole: "ADMIN", actorName: admin.name ?? "Admin",
    action: "USER_DELETE", entity: "User", entityId: id,
    meta: { phone: target.phone, appointments: target._count.appointments, reviews: target._count.reviews },
  });
  return NextResponse.json({ ok: true });
}
