/**
 * MapLibre worker fayllarini public/ ga ko'chiradi.
 *
 * Nega kerak: MapLibre v6 worker manzilini `import.meta.url` ga NISBATAN
 * hisoblaydi — ya'ni bundlerdan chiqqan chunk yonidan `maplibre-gl-worker.mjs`
 * ni qidiradi. Next.js/Turbopack esa bu faylni chunk yoniga chiqarmaydi,
 * natijada 404 → Next.js HTML sahifasini qaytaradi va brauzer:
 *   "Failed to load module script: non-JavaScript MIME type text/html"
 * deydi. Worker ishga tushmagach VEKTOR qatlamlar chizilmaydi (marker va
 * boshqaruvlar ko'rinaveradi — chalg'ituvchi holat).
 *
 * Yechim: fayllarni barqaror manzilga qo'yamiz va MapView'da
 * `setWorkerUrl("/maplibre/maplibre-gl-worker.mjs")` chaqiramiz.
 *
 * Ikkita fayl kerak: worker o'zi `./maplibre-gl-shared.mjs` ni import qiladi,
 * shuning uchun ikkalasi BIR papkada turishi shart.
 */
import { copyFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const from = path.join(root, "node_modules", "maplibre-gl", "dist");
const to = path.join(root, "public", "maplibre");

const FILES = ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"];

async function main() {
  if (!existsSync(from)) {
    console.error("maplibre-gl topilmadi — npm install qilinganmi?");
    process.exit(1);
  }
  await mkdir(to, { recursive: true });
  for (const f of FILES) {
    const src = path.join(from, f);
    if (!existsSync(src)) {
      console.error(`${f} topilmadi (maplibre-gl versiyasi o'zgarganmi?)`);
      process.exit(1);
    }
    await copyFile(src, path.join(to, f));
  }
  console.log(`maplibre worker fayllari ko'chirildi -> public/maplibre/ (${FILES.length} ta)`);
}

main();
