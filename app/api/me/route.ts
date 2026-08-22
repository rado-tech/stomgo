import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";

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
