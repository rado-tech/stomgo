import { NextRequest, NextResponse } from "next/server";
import { publicOrigin } from "@/lib/origin";

/**
 * Xarita plitkalari proksisi.
 * Brauzer faqat BIZNING domen bilan gaplashadi — provayder/tarmoq tashqi
 * xarita domenini bloklagan bo'lsa ham xarita ochiladi.
 * Faqat bitta ishonchli manba (openfreemap) uzatiladi.
 */
const UPSTREAM = "https://tiles.openfreemap.org";

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const safe = path.filter((p) => p !== ".." && !p.includes("\\"));
  const qs = req.nextUrl.search;
  const url = `${UPSTREAM}/${safe.map(encodeURIComponent).join("/")}${qs}`;

  try {
    const upstream = await fetch(url, {
      headers: { "User-Agent": "StomGo/1.0" },
      signal: AbortSignal.timeout(15_000),
    });
    if (!upstream.ok) {
      return NextResponse.json({ error: "tile upstream error" }, { status: upstream.status });
    }

    const type = upstream.headers.get("content-type") ?? "application/octet-stream";

    // TileJSON ichida ham to'liq URL'lar bor — ularni ham proksiga yo'naltiramiz
    if (type.includes("json")) {
      const text = await upstream.text();
      const origin = publicOrigin(req);
      const rewritten = text.replaceAll(`${UPSTREAM}/`, `${origin}/api/map/t/`);
      return new NextResponse(rewritten, {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=86400",
        },
      });
    }

    const buf = await upstream.arrayBuffer();
    return new NextResponse(buf, {
      headers: {
        "Content-Type": type,
        "Content-Encoding": upstream.headers.get("content-encoding") ?? "",
        "Cache-Control": "public, max-age=604800, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "tile fetch failed" }, { status: 502 });
  }
}
