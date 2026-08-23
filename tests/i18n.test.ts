import { test } from "node:test";
import assert from "node:assert/strict";
import { uz } from "../lib/i18n/uz";
import { ru } from "../lib/i18n/ru";
import { uz as mobileUz } from "../mobile/src/i18n/uz";
import { ru as mobileRu } from "../mobile/src/i18n/ru";

const uzKeys = Object.keys(uz).sort();

test("har bir o'zbekcha kalitning ruscha tarjimasi bor", () => {
  const missing = uzKeys.filter((k) => !(k in ru));
  assert.deepEqual(missing, [], `tarjimasiz kalitlar: ${missing.join(", ")}`);
});

test("ruschada ortiqcha kalit yo'q", () => {
  const extra = Object.keys(ru).filter((k) => !(k in uz));
  assert.deepEqual(extra, [], `uz.ts da yo'q kalitlar: ${extra.join(", ")}`);
});

test("hech qanday tarjima bo'sh emas", () => {
  for (const [k, v] of Object.entries({ ...uz, ...ru })) {
    assert.ok(String(v).trim().length > 0, `bo'sh qiymat: ${k}`);
  }
});

test("ruscha tarjima o'zbekchadan nusxa emas", () => {
  // Bir xil qolishi mumkin bo'lgan atayin istisnolar
  const same = new Set(["clinic.nonstop", "common.km", "nav.ai", "service.implant"]);
  const copied = uzKeys.filter(
    (k) => !same.has(k) && ru[k as keyof typeof ru] === uz[k as keyof typeof uz],
  );
  assert.deepEqual(copied, [], `tarjima qilinmagan (o'zbekcha bilan bir xil): ${copied.join(", ")}`);
});

test("mobil lug'at sayt lug'ati bilan bir xil kalitlarga ega", () => {
  // Ikki to'plam alohida yig'iladi, shuning uchun nusxa saqlanadi —
  // bu test ular bir-biridan uzoqlashib ketmasligini kafolatlaydi
  assert.deepEqual(Object.keys(mobileUz).sort(), uzKeys, "mobile/src/i18n/uz.ts farq qiladi");
  assert.deepEqual(Object.keys(mobileRu).sort(), uzKeys, "mobile/src/i18n/ru.ts farq qiladi");
});

test("mobil va sayt lug'atlarining qiymatlari bir xil", () => {
  const diff = uzKeys.filter(
    (k) =>
      mobileUz[k as keyof typeof mobileUz] !== uz[k as keyof typeof uz] ||
      mobileRu[k as keyof typeof mobileRu] !== ru[k as keyof typeof ru],
  );
  assert.deepEqual(diff, [], `qiymati farq qiladigan kalitlar: ${diff.join(", ")}`);
});
