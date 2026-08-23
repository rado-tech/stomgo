import { test } from "node:test";
import assert from "node:assert/strict";
import { haversineKm, mixScore, TASHKENT_CENTER } from "../lib/geo";

test("bir nuqtadan o'ziga masofa nol", () => {
  const { lat, lng } = TASHKENT_CENTER;
  assert.equal(haversineKm(lat, lng, lat, lng), 0);
});

test("masofa simmetrik", () => {
  const a = haversineKm(41.31, 69.28, 41.35, 69.20);
  const b = haversineKm(41.35, 69.20, 41.31, 69.28);
  assert.ok(Math.abs(a - b) < 1e-9);
});

test("Toshkent ichidagi masofa mantiqiy oraliqda", () => {
  // Chilonzor ↔ Yunusobod taxminan 10 km
  const km = haversineKm(41.2756, 69.2035, 41.3661, 69.2891);
  assert.ok(km > 5 && km < 15, `kutilmagan masofa: ${km}`);
});

test("1 daraja kenglik ≈ 111 km", () => {
  const km = haversineKm(41, 69, 42, 69);
  assert.ok(Math.abs(km - 111) < 2, `kutilmagan: ${km}`);
});

test("yaqinroq klinika yuqoriroq ball oladi", () => {
  assert.ok(mixScore(1, 4.5, 0.9) > mixScore(10, 4.5, 0.9));
});

test("yuqori reyting yuqoriroq ball", () => {
  assert.ok(mixScore(3, 5, 0.9) > mixScore(3, 3, 0.9));
});

test("javob berish sifati ballga ta'sir qiladi", () => {
  assert.ok(mixScore(3, 4.5, 1) > mixScore(3, 4.5, 0));
});

test("ball 0 va 1 orasida", () => {
  assert.ok(mixScore(0, 5, 1) <= 1);
  assert.ok(mixScore(1000, 0, 0) >= 0);
});
