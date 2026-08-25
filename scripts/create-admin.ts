/**
 * Birinchi adminni yaratish — ishlab chiqarish serverida bir marta ishlatiladi.
 *
 *   npx tsx --env-file=.env scripts/create-admin.ts
 *
 * Boshlang'ich ma'lumot (db:seed) namunaviy klinikalarni ham yaratadi,
 * shuning uchun haqiqiy serverda u ishlatilmaydi. Bu skript esa faqat
 * bitta admin hisobini ochadi va boshqa hech narsaga tegmaydi.
 *
 * Parol AVTOMATIK yaratiladi va bir marta ekranga chiqadi — buyruqlar
 * tarixida qolib ketmasligi uchun uni argument sifatida qabul qilmaymiz.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { createInterface } from "readline/promises";

const db = new PrismaClient();

/** O'qishga oson, chalkashtirmaydigan belgilardan iborat parol */
function genPassword(): string {
  const alphabet = "abcdefghijkmnpqrstuvwxyz23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  const bytes = randomBytes(20);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

async function main() {
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  const existing = await db.user.count({ where: { role: "ADMIN" } });
  if (existing > 0) {
    console.log(`\nDiqqat: allaqachon ${existing} ta admin bor.`);
    const go = (await rl.question("Yana bittasini yaratasizmi? (ha/yo'q): ")).trim().toLowerCase();
    if (go !== "ha") {
      console.log("Bekor qilindi.");
      rl.close();
      return;
    }
  }

  const username = (await rl.question("Login (kichik harf, raqam, _): ")).trim().toLowerCase();
  if (!/^[a-z0-9_]{4,30}$/.test(username)) {
    console.error("Login 4-30 belgi bo'lsin: kichik lotin harflar, raqam va _");
    rl.close();
    process.exitCode = 1;
    return;
  }

  const taken = await db.user.findUnique({ where: { username } });
  if (taken) {
    console.error(`"${username}" band.`);
    rl.close();
    process.exitCode = 1;
    return;
  }

  const rawPhone = (await rl.question("Telefon (+998 90 123 45 67): ")).trim();
  const digits = rawPhone.replace(/\D/g, "");
  const phone =
    digits.length === 9 ? `+998${digits}`
    : digits.length === 12 && digits.startsWith("998") ? `+${digits}`
    : null;

  if (!phone) {
    console.error("Telefon raqami noto'g'ri.");
    rl.close();
    process.exitCode = 1;
    return;
  }
  if (await db.user.findUnique({ where: { phone } })) {
    console.error("Bu raqam allaqachon ro'yxatdan o'tgan.");
    rl.close();
    process.exitCode = 1;
    return;
  }

  const name = (await rl.question("Ism (ixtiyoriy): ")).trim() || null;
  rl.close();

  const password = genPassword();
  const admin = await db.user.create({
    data: {
      username,
      phone,
      name,
      role: "ADMIN",
      passwordHash: await bcrypt.hash(password, 10),
    },
  });

  await db.auditLog.create({
    data: {
      actorId: admin.id, actorRole: "SYSTEM", actorName: username,
      action: "ADMIN_CREATE", entity: "User", entityId: admin.id,
      meta: JSON.stringify({ via: "create-admin.ts" }),
    },
  }).catch(() => {});

  console.log([
    "",
    "Admin yaratildi.",
    "",
    `  Login: ${username}`,
    `  Parol: ${password}`,
    "",
    "Parol boshqa ko'rsatilmaydi — hozir nusxalab, xavfsiz joyga saqlang.",
    "Kirgach darhol Telegram botga ulaning: parol tiklash faqat shu orqali ishlaydi.",
    "",
  ].join("\n"));
}

main()
  .catch((e) => {
    console.error("Xato:", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
