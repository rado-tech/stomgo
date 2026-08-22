import { NextRequest, NextResponse } from "next/server";
import { requireRole, unauthorized } from "@/lib/auth";
import { clinicAction } from "@/lib/booking-actions";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("CLINIC");
  if (!user?.clinicId) return unauthorized();
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const result = await clinicAction(
    id, user.clinicId, String(body.action ?? ""),
    {
      altAt: body.altAt ? new Date(String(body.altAt)) : undefined,
      reason: body.reason ? String(body.reason) : undefined,
    },
    { id: user.id, role: "CLINIC", name: user.name ?? "Klinika xodimi" }
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
