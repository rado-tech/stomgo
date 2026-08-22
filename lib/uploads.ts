import path from "path";
import fs from "fs/promises";
import sharp from "sharp";

/**
 * Rasm saqlash: diskda (UPLOADS_DIR), /api/files/<nom> orqali beriladi.
 * Docker'da uploads papkasi volume qilinadi.
 */

export const UPLOADS_DIR = process.env.UPLOADS_DIR ?? path.join(process.cwd(), "uploads");

export async function saveImage(
  buf: Buffer,
  kind: "cover" | "avatar" | "chat"
): Promise<string> {
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
  const name = `${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;

  // chat — tish rasmi: kesilmasin, nisbat saqlansin (tashxis uchun muhim)
  const pipeline =
    kind === "cover"
      ? sharp(buf).rotate().resize(1200, 675, { fit: "cover" })
      : kind === "chat"
        ? sharp(buf).rotate().resize(1400, 1400, { fit: "inside", withoutEnlargement: true })
        : sharp(buf).rotate().resize(512, 512, { fit: "cover" });

  await pipeline.webp({ quality: 82 }).toFile(path.join(UPLOADS_DIR, name));
  return `/api/files/${name}`;
}

export async function deleteImage(url: string | null | undefined) {
  if (!url?.startsWith("/api/files/")) return;
  const name = url.replace("/api/files/", "");
  if (name.includes("/") || name.includes("..")) return;
  await fs.unlink(path.join(UPLOADS_DIR, name)).catch(() => {});
}
