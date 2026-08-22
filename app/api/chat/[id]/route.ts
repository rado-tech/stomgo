import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { sendMessage } from "@/lib/chat";
import { rateLimit } from "@/lib/ratelimit";

/** Suhbatga kirish huquqini tekshirish */
async function access(convId: string) {
  const user = await requireUser();
  if (!user) return { error: "unauth" as const };
  const conv = await db.conversation.findUnique({
    where: { id: convId },
    include: { clinic: { select: { name: true, slug: true, photoUrl: true, coverHue: true } }, user: { select: { name: true, phone: true } } },
  });
  if (!conv) return { error: "notfound" as const };

  const isPatient = conv.userId === user.id;
  const isClinic = user.role === "CLINIC" && user.clinicId && conv.clinicId === user.clinicId;
  const isAdmin = user.role === "ADMIN" && conv.type === "SUPPORT";
  if (!isPatient && !isClinic && !isAdmin) return { error: "forbidden" as const };

  return { user, conv, role: isPatient ? ("PATIENT" as const) : isClinic ? ("CLINIC" as const) : ("SUPPORT" as const) };
}

/** Xabarlarni olish + o'qilgan deb belgilash */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a = await access(id);
  if ("error" in a) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: a.error === "unauth" ? 401 : a.error === "notfound" ? 404 : 403 });
  }

  const messages = await db.message.findMany({
    where: { conversationId: id },
    orderBy: { createdAt: "asc" },
    take: 300,
  });

  await db.conversation.update({
    where: { id },
    data: a.role === "PATIENT" ? { userReadAt: new Date() } : { staffReadAt: new Date() },
  });

  return NextResponse.json({
    conversation: {
      id: a.conv.id,
      type: a.conv.type,
      title: a.role === "PATIENT"
        ? (a.conv.type === "SUPPORT" ? "Qo'llab-quvvatlash" : a.conv.clinic?.name ?? "Klinika")
        : (a.conv.user.name ?? a.conv.user.phone),
      clinicSlug: a.conv.clinic?.slug ?? null,
      photoUrl: a.conv.clinic?.photoUrl ?? null,
      coverHue: a.conv.clinic?.coverHue ?? 200,
    },
    myRole: a.role,
    messages: messages.map((m) => ({
      id: m.id, senderRole: m.senderRole, senderName: m.senderName,
      body: m.body, imageUrl: m.imageUrl, createdAt: m.createdAt,
    })),
  });
}

/** Xabar yuborish */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a = await access(id);
  if ("error" in a) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: a.error === "unauth" ? 401 : a.error === "notfound" ? 404 : 403 });
  }
  if (!rateLimit(`msg:${a.user.id}`, 60, 10 * 60 * 1000)) {
    return NextResponse.json({ error: "Juda ko'p xabar. Birozdan keyin urining." }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const text = String(body.body ?? "");
  // Rasm faqat o'z serverimizdagi yuklangan fayl bo'lishi mumkin
  const rawImage = String(body.imageUrl ?? "");
  const imageUrl = /^\/api\/files\/[A-Za-z0-9._-]+$/.test(rawImage) ? rawImage : null;
  if (!text.trim() && !imageUrl) return NextResponse.json({ error: "Xabar bo'sh" }, { status: 400 });

  const senderName =
    a.role === "PATIENT" ? (a.user.name ?? a.user.phone) :
    a.role === "CLINIC" ? (a.conv.clinic?.name ?? "Klinika") : "Qo'llab-quvvatlash";

  const msg = await sendMessage({ conversationId: id, senderRole: a.role, senderName, body: text, imageUrl });
  if (!msg) return NextResponse.json({ error: "Yuborilmadi" }, { status: 400 });

  return NextResponse.json({
    ok: true,
    message: { id: msg.id, senderRole: msg.senderRole, senderName: msg.senderName, body: msg.body, imageUrl: msg.imageUrl, createdAt: msg.createdAt },
  });
}
