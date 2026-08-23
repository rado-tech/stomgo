import { NextRequest, NextResponse } from "next/server";
import { publicOrigin } from "@/lib/origin";

/**
 * Xarita plitkalari proksisi.
 * Brauzer faqat BIZNING domen bilan gaplashadi — provayder/tarmoq tashqi
 * xarita domenini bloklagan bo'lsa ham xarita ochiladi.
 * Faqat bitta ishonchli manba (openfreemap) uzatiladi.
 */
const UPSTREAM = "https://tiles.openfreemap.org";

/**
 * Plitka manzillariga qo'shiladigan versiya.
 * Plitkalar 7 kunga "immutable" keshlanadi — proksida xato bo'lsa, tuzatgandan
 * keyin ham brauzer eski buzuq nusxani ishlatadi. Versiyani oshirish kesh
 * kalitini yangilaydi va brauzer qaytadan yuklaydi.
 */
const TILE_VERSION = "2";

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const safe = path.filter((p) => p !== ".." && !p.includes("\\"));

  // O'zimizning versiya parametrini upstream'ga yubormaymiz
  const q = new URLSearchParams(req.nextUrl.search);
  q.delete("v");
  const qs = q.toString() ? `?${q.toString()}` : "";
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
      const rewritten = text
        .replaceAll(`${UPSTREAM}/`, `${origin}/api/map/t/`)
        // Plitka shablonlariga versiya qo'shamiz (kesh yangilanishi uchun)
        .replaceAll("{y}.pbf", `{y}.pbf?v=${TILE_VERSION}`)
        .replaceAll("{y}.png", `{y}.png?v=${TILE_VERSION}`);
      return new NextResponse(rewritten, {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=86400",
        },
      });
    }

    // MUHIM: fetch() javobni O'ZI ochib beradi (gzip/br). Shuning uchun
    // upstream'ning Content-Encoding sarlavhasini UZATMAYMIZ — aks holda brauzer
    // siqilmagan ma'lumotni gunzip qilmoqchi bo'lib xato beradi va plitka chizilmaydi.
    const buf = await upstream.arrayBuffer();
    return new NextResponse(buf, {
      headers: {
        "Content-Type": type,
        "Content-Length": String(buf.byteLength),
        "Cache-Control": "public, max-age=604800, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "tile fetch failed" }, { status: 502 });
  }
}
