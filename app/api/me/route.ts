import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { limitWrite } from "@/lib/ratelimit";
import { requireUser, unauthorized, clearSessionCookie } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { deleteImage } from "@/lib/uploads";

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ user: null });
  return NextResponse.json({
    user: {
      id: user.id, name: user.name, phone: user.phone, role: user.role,
      clinicId: user.clinicId, photoUrl: user.photoUrl, username: user.username,
      birthYear: user.birthYear, gender: user.gender,
    },
  });
}

/** Profil ma'lumotlarini tahrirlash (ism, tug'ilgan yil, jins) */
export async function PATCH(req: NextRequest) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Avtorizatsiya kerak" }, { status: 401 });
  const lim = limitWrite(`profile:${user.id}`, 20, 60 * 60 * 1000);
  if (lim) return lim;
  const body = await req.json().catch(() => ({}));

  const data: Record<string, unknown> = {};
  if (typeof body.name === "string") data.name = body.name.trim().slice(0, 60) || null;
  if (body.birthYear !== undefined) {
    const y = parseInt(String(body.birthYear), 10);
    data.birthYear = y >= 1920 && y <= new Date().getFullYear() ? y : null;
  }
  if (body.gender === "MALE" || body.gender === "FEMALE" || body.gender === null || body.gender === "") {
    data.gender = body.gender || null;
  }

  const updated = await db.user.update({ where: { id: user.id }, data });
  audit({ actorId: user.id, actorRole: user.role, actorName: updated.name ?? user.phone, action: "PROFILE_UPDATE", entity: "User", entityId: user.id, meta: { fields: Object.keys(data) } });
  return NextResponse.json({
    ok: true,
    user: { id: updated.id, name: updated.name, phone: updated.phone, role: updated.role, birthYear: updated.birthYear, gender: updated.gender, photoUrl: updated.photoUrl },
  });
}

/**
 * Hisobni o'chirish.
 *
 * To'liq o'chirish EMAS — shaxsiy ma'lumot tozalanadi, tarix anonim qoladi:
 *
 *  O'CHADI  — ism, tug'ilgan yil, jins, rasm (diskdan ham), Telegram ulanishi,
 *             qurilma tokenlari, bildirishnomalar, barcha suhbatlar va ulardagi
 *             rasmlar, triaj shikoyat matnlari
 *  QOLADI   — qabul yozuvlari va sharhlar (anonim). Klinika o'z statistikasini
 *             va bo'lib o'tgan tashriflar tarixini yo'qotmasligi kerak
 *
 * Telefon raqami bo'shatiladi — o'sha raqam bilan qaytadan ro'yxatdan o'tish
 * mumkin, lekin bu YANGI hisob bo'ladi, eski tarix unga bog'lanmaydi.
 */
export async function DELETE() {
  const user = await requireUser();
  if (!user) return unauthorized();

  // Klinika va admin hisoblarini bu yo'l bilan o'chirib bo'lmaydi:
  // ular klinikaning ishlashiga bog'liq, admin panelidan boshqariladi
  if (user.role !== "PATIENT") {
    return NextResponse.json(
      { error: "Xodim hisobini bu yerdan o'chirib bo'lmaydi. Administratorga murojaat qiling." },
      { status: 403 },
    );
  }

  const lim = limitWrite(`delacc:${user.id}`, 3, 24 * 60 * 60 * 1000);
  if (lim) return lim;

  // Suhbatlardagi rasmlarni diskdan tozalash uchun oldindan yig'amiz
  const chatImages = await db.message.findMany({
    where: { conversation: { userId: user.id }, imageUrl: { not: null } },
    select: { imageUrl: true },
  });

  // Raqam bo'shashi kerak, lekin ustun unique va majburiy —
  // shuning uchun o'rniga qaytarilmaydigan belgi qo'yamiz
  const tombstone = `deleted:${user.id}`;

  await db.$transaction(async (tx) => {
    await tx.message.deleteMany({ where: { conversation: { userId: user.id } } });
    await tx.conversation.deleteMany({ where: { userId: user.id } });
    await tx.notification.deleteMany({ where: { userId: user.id } });
    await tx.device.deleteMany({ where: { userId: user.id } });
    await tx.otpCode.deleteMany({ where: { phone: user.phone } });

    // Triaj: statistika uchun shoshilinchlik va soha qoladi, shikoyat matni ketadi
    await tx.triageSession.updateMany({ where: { userId: user.id }, data: { freeText: "" } });

    await tx.user.update({
      where: { id: user.id },
      data: {
        deletedAt: new Date(),
        phone: tombstone,
        name: null,
        birthYear: null,
        gender: null,
        photoUrl: null,
        telegramChatId: null,
        tgLinkCode: null,
      },
    });
  });

  await deleteImage(user.photoUrl);
  await Promise.all(chatImages.map((m) => deleteImage(m.imageUrl)));

  audit({
    actorId: user.id, actorRole: user.role, actorName: "(o'chirilgan hisob)",
    action: "ACCOUNT_DELETE", entity: "User", entityId: user.id,
    meta: { filesDeleted: chatImages.length + (user.photoUrl ? 1 : 0) },
  });

  // Sessiyani ham yopamiz
  const res = NextResponse.json({ ok: true });
  clearSessionCookie(res);
  return res;
}
