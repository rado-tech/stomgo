import { NextRequest, NextResponse } from "next/server";
import { publicOrigin } from "@/lib/origin";

/**
 * Xarita uslubi (style.json) — barcha havolalar bizning proksiga yo'naltiriladi.
 * Shu tufayli brauzer tashqi xarita domeniga umuman murojaat qilmaydi.
 */
const UPSTREAM_STYLE = "https://tiles.openfreemap.org/styles/liberty";
const UPSTREAM_ORIGIN = "https://tiles.openfreemap.org";

export async function GET(req: NextRequest) {
  try {
    const res = await fetch(UPSTREAM_STYLE, {
      headers: { "User-Agent": "StomGo/1.0" },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return NextResponse.json({ error: "style upstream error" }, { status: 502 });

    const text = await res.text();
    const origin = publicOrigin(req);
    const rewritten = text.replaceAll(`${UPSTREAM_ORIGIN}/`, `${origin}/api/map/t/`);

    return new NextResponse(rewritten, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "style fetch failed" }, { status: 502 });
  }
}
