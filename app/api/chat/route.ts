import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { limitWrite } from "@/lib/ratelimit";
import { requireUser, unauthorized } from "@/lib/auth";
import { getOrCreateConversation, listConversations, type Actor } from "@/lib/chat";

function toActor(user: { id: string; role: string; clinicId: string | null; name: string | null; phone: string }): Actor | null {
  if (user.role === "CLINIC" && user.clinicId) {
    return { kind: "CLINIC", userId: user.id, clinicId: user.clinicId, name: user.name ?? "Klinika" };
  }
  if (user.role === "ADMIN") return { kind: "ADMIN", userId: user.id, name: user.name ?? "Qo'llab-quvvatlash" };
  return { kind: "PATIENT", userId: user.id, name: user.name ?? user.phone };
}

/** Suhbatlar ro'yxati (rolga qarab) */
export async function GET() {
  const user = await requireUser();
  if (!user) return unauthorized();
  const actor = toActor(user);
  if (!actor) return unauthorized();
  const items = await listConversations(actor);
  return NextResponse.json({ items, unread: items.reduce((s, i) => s + i.unread, 0) });
}

/** Suhbat ochish: {clinicId} yoki {type:"SUPPORT"} — faqat bemor uchun */
export async function POST(req: NextRequest) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const lim = limitWrite(`conv:${user.id}`, 20, 60 * 60 * 1000);
  if (lim) return lim;
  const body = await req.json().catch(() => ({}));

  const type = body.type === "SUPPORT" ? "SUPPORT" : "CLINIC";
  let clinicId: string | null = null;

  if (type === "CLINIC") {
    clinicId = String(body.clinicId ?? "");
    const clinic = await db.clinic.findUnique({ where: { id: clinicId } });
    if (!clinic) return NextResponse.json({ error: "Klinika topilmadi" }, { status: 404 });
  }

  const conv = await getOrCreateConversation(user.id, { clinicId, type });
  return NextResponse.json({ ok: true, id: conv.id });
}
