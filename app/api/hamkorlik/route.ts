import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/ratelimit";
import { normalizePhone } from "@/lib/phone";
import { isDistrict } from "@/lib/districts";
import { audit } from "@/lib/audit";
import { pushToAdmins } from "@/lib/push";

/**
 * Klinika hamkorlik arizasi — ochiq yo'l, kirish talab qilinmaydi.
 * Admin /admin/arizalar da ko'rib chiqadi va tasdiqlaydi.
 */
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";

  // Ochiq yo'l — spamga qarshi qattiq chegara
  if (!rateLimit(`apply:ip:${ip}`, 3, 24 * 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Bugun ariza yuborish chegarasi tugadi. Ertaga urining yoki bizga yozing." },
      { status: 429 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const clinicName = String(body.clinicName ?? "").trim().slice(0, 100);
  const district = String(body.district ?? "").trim().slice(0, 50);
  const address = String(body.address ?? "").trim().slice(0, 200);
  const contactName = String(body.contactName ?? "").trim().slice(0, 80);
  const telegram = String(body.telegram ?? "").trim().slice(0, 60);
  const note = String(body.note ?? "").trim().slice(0, 500);
  const phone = normalizePhone(String(body.phone ?? ""));

  const doctorCountRaw = String(body.doctorCount ?? "0").trim();
  const doctorCount = /^\d{1,3}$/.test(doctorCountRaw) ? Number(doctorCountRaw) : 0;

  if (clinicName.length < 2) {
    return NextResponse.json({ error: "Klinika nomini kiriting" }, { status: 400 });
  }
  if (!isDistrict(district)) {
    return NextResponse.json({ error: "Tumanni ro'yxatdan tanlang" }, { status: 400 });
  }
  if (contactName.length < 2) {
    return NextResponse.json({ error: "Bog'lanish uchun ismni kiriting" }, { status: 400 });
  }
  if (!phone) {
    return NextResponse.json({ error: "Telefon raqami noto'g'ri. Masalan: 90 123 45 67" }, { status: 400 });
  }

  // Bir xil klinika ikki marta yubormasin
  const dup = await db.clinicApplication.findFirst({
    where: { phone, status: { in: ["NEW", "CONTACTED"] } },
  });
  if (dup) {
    return NextResponse.json(
      { error: "Bu raqam bilan ariza allaqachon ko'rib chiqilmoqda. Tez orada bog'lanamiz." },
      { status: 409 },
    );
  }

  const app = await db.clinicApplication.create({
    data: { clinicName, district, address, phone, contactName, telegram, doctorCount, note, ip },
  });

  audit({
    actorRole: "SYSTEM", actorName: contactName,
    action: "CLINIC_APPLICATION", entity: "ClinicApplication", entityId: app.id,
    meta: { clinicName, district, phone, ip },
  });

  // Admin darhol bilsin — ariza sovib qolmasin
  void pushToAdmins({
    title: "Yangi klinika arizasi",
    body: `${clinicName} (${district}) — ${contactName}`,
    link: "/admin/arizalar",
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
