import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole, unauthorized } from "@/lib/auth";

export async function GET() {
  const user = await requireRole("ADMIN");
  if (!user) return unauthorized();

  const since = new Date(Date.now() - 30 * 864e5);
  const [clinics, users, appointments, pendingReviews, triages, recentTriages, recentPatients] = await Promise.all([
    db.clinic.count(),
    db.user.count({ where: { role: "PATIENT" } }),
    db.appointment.findMany({ where: { createdAt: { gte: since } } }),
    db.review.count({ where: { status: "PENDING" } }),
    db.triageSession.count(),
    db.triageSession.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
    db.user.findMany({ where: { role: "PATIENT", createdAt: { gte: since } }, select: { createdAt: true } }),
  ]);

  // Oxirgi 14 kun platforma dinamikasi
  const isoFmt = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tashkent", year: "numeric", month: "2-digit", day: "2-digit" });
  const days: { date: string; bookings: number; patients: number }[] = [];
  for (let d = 13; d >= 0; d--) {
    const date = isoFmt.format(new Date(Date.now() - d * 864e5));
    days.push({
      date,
      bookings: appointments.filter((a) => isoFmt.format(a.createdAt) === date).length,
      patients: recentPatients.filter((u) => isoFmt.format(u.createdAt) === date).length,
    });
  }

  return NextResponse.json({
    days,
    totals: {
      clinics,
      patients: users,
      bookings30d: appointments.length,
      arrived30d: appointments.filter((a) => ["ARRIVED", "DONE"].includes(a.status)).length,
      noShow30d: appointments.filter((a) => a.status === "NO_SHOW").length,
      pendingReviews,
      triages,
    },
    triages: recentTriages.map((t) => ({
      id: t.id, urgency: t.urgency, specialty: t.specialty,
      freeText: t.freeText, aiUsed: t.aiUsed, date: t.createdAt,
    })),
  });
}
