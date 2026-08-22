import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { rateLimit } from "@/lib/ratelimit";
import { evaluateTriage, type TriageAnswers } from "@/lib/triage/rules";
import { parseFreeText } from "@/lib/triage/ai";
import { haversineKm, mixScore, TASHKENT_CENTER } from "@/lib/geo";
import { isOpenNow, todayHoursLabel } from "@/lib/hours";

export async function POST(req: NextRequest) {
  // AI xarajatlari va spamdan himoya
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!rateLimit(`triage:${ip}`, 30, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Juda ko'p so'rov. Birozdan keyin urining." }, { status: 429 });
  }
  const body = await req.json().catch(() => ({}));
  const session = await getSession();
  const lat = parseFloat(String(body.lat)) || TASHKENT_CENTER.lat;
  const lng = parseFloat(String(body.lng)) || TASHKENT_CENTER.lng;

  let answers: TriageAnswers;
  let aiUsed = false;
  const freeText = typeof body.freeText === "string" ? body.freeText.trim().slice(0, 2000) : "";

  if (freeText && !body.answers) {
    const parsed = await parseFreeText(freeText);
    answers = parsed.answers;
    aiUsed = parsed.aiUsed;
  } else {
    const a = body.answers ?? {};
    answers = {
      problem: a.problem ?? "BOSHQA",
      painLevel: a.painLevel || undefined,
      duration: a.duration || undefined,
      flags: Array.isArray(a.flags) ? a.flags.map(String) : [],
      isChild: Boolean(a.isChild),
    };
  }

  // Shoshilinchlik darajasini FAQAT qoidalar mexanizmi hal qiladi
  const result = evaluateTriage(answers);

  // Narx diapazoni — shahar bo'yicha tegishli xizmatlarning real min/max i
  const services = await db.clinicService.findMany({
    where: { service: { code: { in: result.serviceCodes } } },
  });
  const priceMin = services.length ? Math.min(...services.map((s) => s.priceMin)) : 0;
  const priceMax = services.length ? Math.max(...services.map((s) => s.priceMax)) : 0;

  // Mos klinikalar: kerakli xizmat bor; shoshilinch bo'lsa — hozir ochiq va shoshilinch qabul.
  // MUHIM: bu tavsiya promo/homiylik bilan hech qanday bog'lanmaydi.
  const clinics = await db.clinic.findMany({
    include: {
      services: { include: { service: true } },
      doctors: { where: { isPublic: true } },
    },
  });

  const urgent = result.urgency === "EMERGENCY" || result.urgency === "TODAY";
  const matched = clinics
    .filter((c) => {
      const codes = new Set(c.services.map((s) => s.service.code));
      const hasService = result.serviceCodes.some((sc) => codes.has(sc));
      if (!hasService) return false;
      if (answers.isChild && !c.childFriendly && !c.doctors.some((d) => d.specialty === "BOLALAR")) return false;
      if (urgent) return isOpenNow(c.workingHours) && (c.emergency || c.is247);
      return true;
    })
    .map((c) => ({
      slug: c.slug, name: c.name, district: c.district,
      rating: c.rating, reviewCount: c.reviewCount,
      distanceKm: haversineKm(lat, lng, c.lat, c.lng),
      isOpen: isOpenNow(c.workingHours),
      todayHours: todayHoursLabel(c.workingHours),
      coverHue: c.coverHue, emergency: c.emergency, is247: c.is247,
      score: mixScore(haversineKm(lat, lng, c.lat, c.lng), c.rating, c.responseRate),
    }))
    .sort((a, b) => (urgent ? a.distanceKm - b.distanceKm : b.score - a.score))
    .slice(0, 5);

  await db.triageSession.create({
    data: {
      userId: session?.uid ?? null,
      answers: JSON.stringify(answers),
      freeText,
      urgency: result.urgency,
      specialty: result.specialty,
      priceMin, priceMax,
      explanation: result.explanation,
      aiUsed,
    },
  });

  return NextResponse.json({
    urgency: result.urgency,
    specialty: result.specialty,
    explanation: result.explanation,
    priceMin, priceMax,
    clinics: matched,
    parsedAnswers: freeText ? answers : undefined,
  });
}
