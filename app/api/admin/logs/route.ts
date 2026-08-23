import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole, unauthorized } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await requireRole("ADMIN");
  if (!user) return unauthorized();
  const sp = req.nextUrl.searchParams;
  const action = sp.get("action") ?? "";
  const role = sp.get("role") ?? "";
  const q = (sp.get("q") ?? "").trim();
  const from = sp.get("from") ?? "";
  const to = sp.get("to") ?? "";
  const page = Math.max(0, parseInt(sp.get("page") ?? "0", 10) || 0);
  const PAGE = 50;

  const where: Record<string, unknown> = {};
  if (action) where.action = action;
  if (role) where.actorRole = role;

  // Matn qidiruvi: kim bajargan, qaysi yozuv, meta ichidagi nom
  // (masalan o'chirilgan top joylashuvni klinika nomi bo'yicha topish)
  if (q) {
    where.OR = [
      { actorName: { contains: q, mode: "insensitive" } },
      { meta: { contains: q, mode: "insensitive" } },
      { entityId: { contains: q } },
    ];
  }

  // Sana oralig'i (Toshkent vaqti bo'yicha kun boshi/oxiri)
  if (from || to) {
    const range: Record<string, Date> = {};
    if (/^\d{4}-\d{2}-\d{2}$/.test(from)) range.gte = new Date(`${from}T00:00:00+05:00`);
    if (/^\d{4}-\d{2}-\d{2}$/.test(to)) range.lte = new Date(`${to}T23:59:59+05:00`);
    if (Object.keys(range).length) where.createdAt = range;
  }

  const [logs, total] = await Promise.all([
    db.auditLog.findMany({
      where, orderBy: { createdAt: "desc" }, skip: page * PAGE, take: PAGE,
    }),
    db.auditLog.count({ where }),
  ]);

  return NextResponse.json({
    logs: logs.map((l) => ({
      id: l.id, action: l.action, actorRole: l.actorRole, actorName: l.actorName,
      entity: l.entity, entityId: l.entityId, meta: l.meta, createdAt: l.createdAt,
    })),
    total, page, pages: Math.ceil(total / PAGE),
  });
}
