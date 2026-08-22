import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/** Monitoring va Docker healthcheck uchun */
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, db: true, time: new Date().toISOString() });
  } catch {
    return NextResponse.json({ ok: false, db: false }, { status: 503 });
  }
}
