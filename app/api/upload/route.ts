import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser, unauthorized } from "@/lib/auth";
import { saveImage, deleteImage } from "@/lib/uploads";
import { audit } from "@/lib/audit";
import { rateLimit } from "@/lib/ratelimit";

const MAX_SIZE = 8 * 1024 * 1024; // 8 MB

/**
 * Rasm yuklash.
 * target: "clinic" (klinika muqovasi) | "doctor" (shifokor, doctorId kerak) | "me" (bemor avatari)
 * Huquq: clinic/doctor — o'sha klinika xodimi yoki admin; me — har kim o'ziga.
 */
export async function POST(req: NextRequest) {
  const user = await requireUser();
  if (!user) return unauthorized();

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Fayl yuborilmadi" }, { status: 400 });

  const file = form.get("file");
  const target = String(form.get("target") ?? "");
  const doctorId = String(form.get("doctorId") ?? "");
  const clinicIdParam = String(form.get("clinicId") ?? "");

  if (!(file instanceof File)) return NextResponse.json({ error: "Fayl topilmadi" }, { status: 400 });
  if (file.size > MAX_SIZE) return NextResponse.json({ error: "Rasm 8 MB dan katta" }, { status: 400 });
  if (!file.type.startsWith("image/")) return NextResponse.json({ error: "Faqat rasm fayllari" }, { status: 400 });

  const buf = Buffer.from(await file.arrayBuffer());
  const actor = { actorId: user.id, actorRole: user.role, actorName: user.name ?? user.phone };

  // Xavfsizlik: fayl HAQIQIY rasm ekanini bayt darajasida tekshiramiz (MIME'ga ishonmaymiz).
  // Keyin sharp to'liq QAYTA KODLAYDI (webp) — EXIF/geolokatsiya, skript va boshqa
  // yashirin ma'lumotlar butunlay yo'qoladi. SVG kabi skriptli formatlar rad etiladi.
  const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp", "gif", "avif", "heif", "tiff"]);
  try {
    const sharpMod = (await import("sharp")).default;
    const meta = await sharpMod(buf).metadata();
    if (!meta.format || !ALLOWED_FORMATS.has(meta.format)) {
      return NextResponse.json({ error: "Fayl formati qo'llanmaydi. JPG yoki PNG yuklang." }, { status: 400 });
    }
    if ((meta.width ?? 0) < 100 || (meta.height ?? 0) < 100) {
      return NextResponse.json({ error: "Rasm juda kichkina (kamida 100×100)" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Fayl rasm emas yoki buzilgan" }, { status: 400 });
  }

  try {
    if (target === "me") {
      const url = await saveImage(buf, "avatar");
      await deleteImage(user.photoUrl);
      await db.user.update({ where: { id: user.id }, data: { photoUrl: url } });
      audit({ ...actor, action: "PHOTO_UPLOAD", entity: "User", entityId: user.id });
      return NextResponse.json({ ok: true, url });
    }

    // Suhbat rasmi (tish surati) — har qanday rol o'zi a'zo bo'lgan suhbatga
    if (target === "chat") {
      const conversationId = String(form.get("conversationId") ?? "");
      const conv = await db.conversation.findUnique({ where: { id: conversationId } });
      if (!conv) return NextResponse.json({ error: "Suhbat topilmadi" }, { status: 404 });

      const isPatient = conv.userId === user.id;
      const isClinic = user.role === "CLINIC" && !!user.clinicId && conv.clinicId === user.clinicId;
      const isAdmin = user.role === "ADMIN" && conv.type === "SUPPORT";
      if (!isPatient && !isClinic && !isAdmin) {
        return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
      }
      if (!rateLimit(`chatimg:${user.id}`, 20, 10 * 60 * 1000)) {
        return NextResponse.json({ error: "Juda ko'p rasm. Birozdan keyin urining." }, { status: 429 });
      }

      const url = await saveImage(buf, "chat");
      audit({ ...actor, action: "PHOTO_UPLOAD", entity: "Message", entityId: conversationId, meta: { chat: true } });
      return NextResponse.json({ ok: true, url });
    }

    // Klinika/shifokor rasmi: klinika xodimi o'zinikiga, admin istalganiga
    let clinicId = user.clinicId;
    if (user.role === "ADMIN" && clinicIdParam) clinicId = clinicIdParam;
    if (!clinicId || (user.role !== "CLINIC" && user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
    }

    // Galereya: klinikaga bir nechta rasm (asosiy muqovadan tashqari, maks 8 ta)
    if (target === "gallery") {
      const clinic = await db.clinic.findUnique({ where: { id: clinicId } });
      if (!clinic) return NextResponse.json({ error: "Klinika topilmadi" }, { status: 404 });
      const count = await db.clinicPhoto.count({ where: { clinicId } });
      if (count >= 8) {
        return NextResponse.json({ error: "Galereyada ko'pi bilan 8 ta rasm bo'ladi. Avval birini o'chiring." }, { status: 400 });
      }
      const url = await saveImage(buf, "cover");
      const photo = await db.clinicPhoto.create({ data: { clinicId, url, order: count } });
      audit({ ...actor, action: "PHOTO_UPLOAD", entity: "Clinic", entityId: clinicId, meta: { gallery: true } });
      return NextResponse.json({ ok: true, url, id: photo.id });
    }

    if (target === "clinic") {
      const clinic = await db.clinic.findUnique({ where: { id: clinicId } });
      if (!clinic) return NextResponse.json({ error: "Klinika topilmadi" }, { status: 404 });
      const url = await saveImage(buf, "cover");
      await deleteImage(clinic.photoUrl);
      await db.clinic.update({ where: { id: clinicId }, data: { photoUrl: url } });
      audit({ ...actor, action: "PHOTO_UPLOAD", entity: "Clinic", entityId: clinicId });
      return NextResponse.json({ ok: true, url });
    }

    if (target === "doctor") {
      const doctor = await db.doctor.findFirst({ where: { id: doctorId, clinicId } });
      if (!doctor) return NextResponse.json({ error: "Shifokor topilmadi" }, { status: 404 });
      const url = await saveImage(buf, "avatar");
      await deleteImage(doctor.photoUrl);
      await db.doctor.update({ where: { id: doctorId }, data: { photoUrl: url } });
      audit({ ...actor, action: "PHOTO_UPLOAD", entity: "Doctor", entityId: doctorId });
      return NextResponse.json({ ok: true, url });
    }

    return NextResponse.json({ error: "Noma'lum target" }, { status: 400 });
  } catch (e) {
    console.error("Upload xatosi:", e);
    return NextResponse.json({ error: "Rasmni saqlashda xato. Boshqa rasm bilan urining." }, { status: 500 });
  }
}
