import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole, unauthorized } from "@/lib/auth";

/** Klinika uchun oxirgi 30 kunlik voronka va kunlik dinamika */
export async function GET() {
  const user = await requireRole("CLINIC");
  if (!user?.clinicId) return unauthorized();
  const since = new Date(Date.now() - 30 * 864e5);

  const [events, appointments] = await Promise.all([
    db.event.findMany({ where: { clinicId: user.clinicId, createdAt: { gte: since } } }),
    db.appointment.findMany({ where: { clinicId: user.clinicId, createdAt: { gte: since } } }),
  ]);

  const funnel = {
    profileViews: events.filter((e) => e.type === "PROFILE_VIEW").length,
    callClicks: events.filter((e) => e.type === "CALL_CLICK").length,
    routeClicks: events.filter((e) => e.type === "ROUTE_CLICK").length,
    bookings: appointments.length,
    confirmed: appointments.filter((a) => ["CONFIRMED", "ARRIVED", "DONE"].includes(a.status)).length,
    arrived: appointments.filter((a) => ["ARRIVED", "DONE"].includes(a.status)).length,
    noShow: appointments.filter((a) => a.status === "NO_SHOW").length,
    rejected: appointments.filter((a) => a.status === "REJECTED").length,
  };

  // Kunlik dinamika (oxirgi 14 kun): ko'rishlar va yozuvlar
  const days: { date: string; views: number; bookings: number }[] = [];
  const isoFmt = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tashkent", year: "numeric", month: "2-digit", day: "2-digit" });
  for (let d = 13; d >= 0; d--) {
    const date = isoFmt.format(new Date(Date.now() - d * 864e5));
    days.push({
      date,
      views: events.filter((e) => e.type === "PROFILE_VIEW" && isoFmt.format(e.createdAt) === date).length,
      bookings: appointments.filter((a) => isoFmt.format(a.createdAt) === date).length,
    });
  }

  // Javob tezligi (noto'g'ri yozuvlardan himoya: respondedAt createdAt dan keyin bo'lishi shart)
  const responded = appointments.filter(
    (a) => a.respondedAt && a.respondedAt.getTime() >= a.createdAt.getTime()
  );
  const avgResponseMin = responded.length
    ? Math.round(
        responded.reduce((sum, a) => sum + (a.respondedAt!.getTime() - a.createdAt.getTime()) / 60000, 0) /
          responded.length
      )
    : null;

  return NextResponse.json({ funnel, days, avgResponseMin });
}
