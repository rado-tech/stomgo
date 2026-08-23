import { test, afterEach } from "node:test";
import assert from "node:assert/strict";

const saved = { env: process.env.NODE_ENV, allow: process.env.ALLOW_SCREEN_OTP };

/** NODE_ENV faqat o'qish uchun deb e'lon qilingan — testda almashtirish uchun */
function setEnv(nodeEnv: string | undefined, allow: string | undefined) {
  if (nodeEnv === undefined) delete (process.env as Record<string, string | undefined>).NODE_ENV;
  else (process.env as Record<string, string | undefined>).NODE_ENV = nodeEnv;
  if (allow === undefined) delete process.env.ALLOW_SCREEN_OTP;
  else process.env.ALLOW_SCREEN_OTP = allow;
}

afterEach(() => setEnv(saved.env, saved.allow));

async function allowed() {
  // Har chaqiruvda yangi o'qilishi uchun modulni qayta import qilamiz
  const m = await import(`../lib/otp-channel.ts?t=${Math.random()}`);
  return m.screenCodeAllowed();
}

test("ishlab chiqarishda kod HECH QACHON ekranda ko'rsatilmaydi", async () => {
  setEnv("production", "1");   // ruxsat berilgan bo'lsa ham
  assert.equal(await allowed(), false);
});

test("ishlab chiqarishda aniq ruxsatsiz ham yopiq", async () => {
  setEnv("production", undefined);
  assert.equal(await allowed(), false);
});

test("lokal rejimda aniq ruxsatsiz yopiq", async () => {
  setEnv("development", undefined);
  assert.equal(await allowed(), false);
});

test("lokal rejimda aniq ruxsat berilsa ochiq", async () => {
  setEnv("development", "1");
  assert.equal(await allowed(), true);
});

test("noto'g'ri ruxsat qiymati o'tmaydi", async () => {
  setEnv("development", "true");
  assert.equal(await allowed(), false);
});
