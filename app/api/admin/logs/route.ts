import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole, unauthorized } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await requireRole("ADMIN");
  if (!user) return unauthorized();
  const sp = req.nextUrl.searchParams;
  const action = sp.get("action") ?? "";
  const role = sp.get("role") ?? "";
  const page = Math.max(0, parseInt(sp.get("page") ?? "0", 10) || 0);
  const PAGE = 50;

  const where: Record<string, unknown> = {};
  if (action) where.action = action;
  if (role) where.actorRole = role;

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
