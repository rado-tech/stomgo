import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/ratelimit";

const ALLOWED = new Set(["CALL_CLICK", "ROUTE_CLICK"]);

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!rateLimit(`events:${ip}`, 120, 60 * 60 * 1000)) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }
  const body = await req.json().catch(() => ({}));
  const type = String(body.type ?? "");
  const clinicId = String(body.clinicId ?? "");
  if (!ALLOWED.has(type) || !clinicId) return NextResponse.json({ ok: false }, { status: 400 });
  const clinic = await db.clinic.findUnique({ where: { id: clinicId } });
  if (!clinic) return NextResponse.json({ ok: false }, { status: 404 });
  await db.event.create({ data: { clinicId, type } });
  return NextResponse.json({ ok: true });
}
