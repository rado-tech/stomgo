/**
 * Bazaning avtomatik zaxira nusxasi.
 *
 * Ishga tushirish:
 *   npx tsx --env-file=.env scripts/backup.ts          — bir marta
 *   npx tsx --env-file=.env scripts/backup.ts --daemon — har kuni (server ichida)
 *
 * Nima qiladi:
 *   1. pg_dump orqali to'liq nusxa oladi (gzip)
 *   2. uploads/ papkasidagi rasmlarni ham arxivlaydi
 *   3. Eski nusxalarni tozalaydi (kunlik 14 ta, haftalik 8 ta saqlanadi)
 *
 * Sozlash (.env):
 *   BACKUP_DIR   — nusxalar papkasi (standart: ./backups)
 *   BACKUP_KEEP  — necha kunlik nusxa saqlansin (standart: 14)
 */
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { createGzip } from "node:zlib";
import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";

const BACKUP_DIR = process.env.BACKUP_DIR ?? path.join(process.cwd(), "backups");
const KEEP_DAYS = Math.max(3, parseInt(process.env.BACKUP_KEEP ?? "14", 10) || 14);
const UPLOADS_DIR = process.env.UPLOADS_DIR ?? path.join(process.cwd(), "uploads");

function log(msg: string) {
  console.log(`[backup ${new Date().toISOString().slice(0, 19).replace("T", " ")}] ${msg}`);
}

/** DATABASE_URL ni pg_dump argumentlariga ajratamiz */
function parseDbUrl(url: string) {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: u.port || "5432",
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, "").split("?")[0],
  };
}

/** Mahalliy pg_dump bormi? */
function hasLocalPgDump(): Promise<boolean> {
  return new Promise((resolve) => {
    const p = spawn("pg_dump", ["--version"]);
    p.on("error", () => resolve(false));
    p.on("close", (code) => resolve(code === 0));
  });
}

/** pg_dump chiqishini to'g'ridan-to'g'ri gzip faylga yozamiz */
async function dumpDatabase(outFile: string): Promise<void> {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error("DATABASE_URL topilmadi");
  const db = parseDbUrl(raw);

  const dumpArgs = [
    "-U", db.user, "-d", db.database,
    "--no-owner", "--no-privileges", "--clean", "--if-exists",
  ];

  // pg_dump mahalliy o'rnatilmagan bo'lsa (masalan Windows'da) — Docker
  // konteyneri ichidagisidan foydalanamiz.
  const container = process.env.BACKUP_PG_CONTAINER ?? "stomgo-pg";
  const useDocker = !(await hasLocalPgDump());

  const proc = useDocker
    ? spawn("docker", ["exec", "-e", `PGPASSWORD=${db.password}`, container, "pg_dump", ...dumpArgs])
    : spawn("pg_dump", ["-h", db.host, "-p", db.port, ...dumpArgs], {
        env: { ...process.env, PGPASSWORD: db.password },
      });

  let stderr = "";
  proc.stderr.on("data", (c) => { stderr += String(c); });

  const gzip = createGzip({ level: 9 });
  const out = createWriteStream(outFile);

  const done = new Promise<void>((resolve, reject) => {
    proc.on("error", (e) =>
      reject(new Error(
        useDocker
          ? `Docker orqali pg_dump ishlamadi (konteyner "${container}" ishlayaptimi?): ${e.message}`
          : `pg_dump ishga tushmadi: ${e.message}`
      ))
    );
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`pg_dump xatosi (${code}): ${stderr.trim().slice(0, 400)}`));
    });
  });

  await Promise.all([pipeline(proc.stdout, gzip, out), done]);
}

/** uploads/ papkasini nusxalash (rasmlar bazada emas, diskda) */
async function copyUploads(destRoot: string): Promise<number> {
  let count = 0;
  try {
    const files = await fs.readdir(UPLOADS_DIR);
    if (files.length === 0) return 0;
    const dest = path.join(destRoot, "uploads");
    await fs.mkdir(dest, { recursive: true });
    for (const f of files) {
      await fs.copyFile(path.join(UPLOADS_DIR, f), path.join(dest, f));
      count++;
    }
  } catch {
    // uploads yo'q bo'lsa — muammo emas
  }
  return count;
}

/** Eski nusxalarni o'chirish */
async function prune(): Promise<number> {
  const entries = await fs.readdir(BACKUP_DIR).catch(() => [] as string[]);
  const dumps = entries.filter((e) => e.startsWith("stomgo-") && e.endsWith(".sql.gz")).sort();
  const extra = dumps.slice(0, Math.max(0, dumps.length - KEEP_DAYS));
  for (const f of extra) {
    await fs.rm(path.join(BACKUP_DIR, f), { force: true });
    // Shu nusxaga tegishli uploads papkasi
    await fs.rm(path.join(BACKUP_DIR, f.replace(".sql.gz", "-files")), { recursive: true, force: true });
  }
  return extra.length;
}

async function runOnce() {
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  await fs.mkdir(BACKUP_DIR, { recursive: true });

  const dumpFile = path.join(BACKUP_DIR, `stomgo-${stamp}.sql.gz`);
  log("baza nusxasi olinmoqda...");
  await dumpDatabase(dumpFile);
  const size = (await fs.stat(dumpFile)).size;
  log(`baza: ${path.basename(dumpFile)} (${(size / 1024 / 1024).toFixed(2)} MB)`);

  const filesDir = path.join(BACKUP_DIR, `stomgo-${stamp}-files`);
  const n = await copyUploads(filesDir);
  if (n > 0) log(`rasmlar: ${n} ta fayl`);

  const pruned = await prune();
  if (pruned > 0) log(`eski nusxalar o'chirildi: ${pruned} ta`);

  log(`tayyor. Saqlanadi: oxirgi ${KEEP_DAYS} nusxa`);
  return dumpFile;
}

async function main() {
  const daemon = process.argv.includes("--daemon");

  try {
    await runOnce();
  } catch (e) {
    console.error(`[backup] XATO: ${(e as Error).message}`);
    if (!daemon) process.exit(1);
  }

  if (!daemon) return;

  log("kunlik rejimda ishlayapti (har 24 soatda)");
  setInterval(() => {
    void runOnce().catch((e) => console.error(`[backup] XATO: ${(e as Error).message}`));
  }, 24 * 60 * 60 * 1000);
}

void main();

/*
 * TIKLASH (qo'lda, ehtiyot bo'lib):
 *
 *   # 1. Nusxani ochish
 *   gunzip -c backups/stomgo-YYYY-MM-DD-HH-MM-SS.sql.gz > /tmp/restore.sql
 *
 *   # 2. Bazaga qaytarish (mavjud ma'lumot ustiga yoziladi!)
 *   docker exec -i stomgo-pg psql -U stomgo -d stomgo < /tmp/restore.sql
 *
 *   # 3. Rasmlarni qaytarish
 *   cp backups/stomgo-YYYY-MM-DD-HH-MM-SS-files/uploads/* uploads/
 */
