import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole, unauthorized } from "@/lib/auth";
import { deleteImage } from "@/lib/uploads";
import { audit } from "@/lib/audit";

export async function GET() {
  const user = await requireRole("CLINIC");
  if (!user?.clinicId) return unauthorized();
  const photos = await db.clinicPhoto.findMany({
    where: { clinicId: user.clinicId },
    orderBy: { order: "asc" },
  });
  return NextResponse.json({ photos });
}

export async function DELETE(req: NextRequest) {
  const user = await requireRole("CLINIC");
  if (!user?.clinicId) return unauthorized();
  const id = req.nextUrl.searchParams.get("id") ?? "";
  const photo = await db.clinicPhoto.findFirst({ where: { id, clinicId: user.clinicId } });
  if (!photo) return NextResponse.json({ error: "Rasm topilmadi" }, { status: 404 });
  await db.clinicPhoto.delete({ where: { id } });
  await deleteImage(photo.url);
  audit({ actorId: user.id, actorRole: "CLINIC", actorName: user.name ?? "Klinika", action: "PHOTO_UPLOAD", entity: "Clinic", entityId: user.clinicId, meta: { galleryDeleted: true } });
  return NextResponse.json({ ok: true });
}
