import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { UPLOADS_DIR } from "@/lib/uploads";

/** Yuklangan rasmlarni berish (keshlash bilan) */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  if (name.includes("/") || name.includes("..") || !name.endsWith(".webp")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  try {
    const buf = await fs.readFile(path.join(UPLOADS_DIR, name));
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
