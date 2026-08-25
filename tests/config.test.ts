import { test, afterEach } from "node:test";
import assert from "node:assert/strict";

const saved = { ...process.env };

function setEnv(vars: Record<string, string | undefined>) {
  for (const [k, v] of Object.entries(vars)) {
    if (v === undefined) delete (process.env as Record<string, string | undefined>)[k];
    else (process.env as Record<string, string | undefined>)[k] = v;
  }
}

afterEach(() => {
  for (const k of Object.keys(process.env)) if (!(k in saved)) delete process.env[k];
  Object.assign(process.env, saved);
});

async function load() {
  return import(`../lib/config.ts?n=${Math.random()}`);
}

const STRONG = "x".repeat(48);

test("ishlab chiqarishda kalitsiz ishga tushmaydi", async () => {
  setEnv({ NODE_ENV: "production", AUTH_SECRET: undefined });
  const { authSecret } = await load();
  assert.throws(() => authSecret(), /AUTH_SECRET berilmagan/);
});

test("kodda yozilgan zaxira kalit rad etiladi", async () => {
  setEnv({ NODE_ENV: "production", AUTH_SECRET: "dev-secret-stomgo-o-zgartiring-productionda" });
  const { authSecret } = await load();
  assert.throws(() => authSecret(), /zaxira qiymatga teng/);
});

test("qisqa kalit rad etiladi", async () => {
  setEnv({ NODE_ENV: "production", AUTH_SECRET: "qisqa" });
  const { authSecret } = await load();
  assert.throws(() => authSecret(), /juda qisqa/);
});

test("kuchli kalit qabul qilinadi", async () => {
  setEnv({ NODE_ENV: "production", AUTH_SECRET: STRONG });
  const { authSecret } = await load();
  assert.equal(authSecret(), STRONG);
});

test("lokal rejimda kalitsiz ham ishlaydi", async () => {
  setEnv({ NODE_ENV: "development", AUTH_SECRET: undefined });
  const { authSecret } = await load();
  assert.ok(authSecret().length > 0);
});

test("ekranda kod ko'rsatish ishlab chiqarishda xato deb belgilanadi", async () => {
  setEnv({
    NODE_ENV: "production", AUTH_SECRET: STRONG,
    DATABASE_URL: "postgresql://x", TELEGRAM_BOT_TOKEN: "t", ALLOW_SCREEN_OTP: "1",
  });
  const { checkProductionConfig } = await load();
  const { errors } = checkProductionConfig();
  assert.ok(errors.some((e: string) => /ALLOW_SCREEN_OTP/.test(e)), "xato ro'yxatida bo'lishi kerak");
});

test("bot tokensiz ishlab chiqarish rad etiladi", async () => {
  setEnv({
    NODE_ENV: "production", AUTH_SECRET: STRONG,
    DATABASE_URL: "postgresql://x", TELEGRAM_BOT_TOKEN: undefined, ALLOW_SCREEN_OTP: undefined,
  });
  const { checkProductionConfig } = await load();
  const { errors } = checkProductionConfig();
  assert.ok(errors.some((e: string) => /TELEGRAM_BOT_TOKEN/.test(e)));
});

test("to'g'ri sozlamada xato yo'q", async () => {
  setEnv({
    NODE_ENV: "production", AUTH_SECRET: STRONG,
    DATABASE_URL: "postgresql://x", TELEGRAM_BOT_TOKEN: "t", ALLOW_SCREEN_OTP: undefined,
  });
  const { checkProductionConfig } = await load();
  assert.deepEqual((await load()).checkProductionConfig().errors, []);
  const { errors } = checkProductionConfig();
  assert.deepEqual(errors, []);
});

test("lokal rejimda tekshiruv o'tkazib yuboriladi", async () => {
  setEnv({ NODE_ENV: "development", AUTH_SECRET: undefined, DATABASE_URL: undefined });
  const { checkProductionConfig } = await load();
  assert.deepEqual(checkProductionConfig().errors, []);
});
