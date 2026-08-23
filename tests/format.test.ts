import { test } from "node:test";
import assert from "node:assert/strict";
import { fmtPrice, fmtPriceRange, fmtPriceFull, fmtKm, SPECIALTY_LABELS, APPOINTMENT_STATUS } from "../lib/format";

test("mingdagi narx qisqartiriladi", () => {
  assert.equal(fmtPrice(250_000), "250 ming");
});

test("millionli narx 'mln' bilan", () => {
  assert.equal(fmtPrice(2_000_000), "2 mln");
  assert.equal(fmtPrice(2_500_000), "2.5 mln");
});

test("narx diapazoni so'm bilan tugaydi", () => {
  assert.match(fmtPriceRange(100_000, 300_000), /so'm$/);
});

test("to'liq narxda vergul emas, probel", () => {
  const s = fmtPriceFull(1_250_000);
  assert.ok(!s.includes(","), s);
  assert.match(s, /so'm$/);
});

test("1 km dan kichik masofa metrda", () => {
  assert.equal(fmtKm(0.35), "350 m");
});

test("1 km dan katta masofa kilometrda", () => {
  assert.equal(fmtKm(2.34), "2.3 km");
});

test("mutaxassislik yorliqlari o'zbekcha va bo'sh emas", () => {
  const keys = Object.keys(SPECIALTY_LABELS);
  assert.ok(keys.length > 0);
  for (const k of keys) assert.ok(SPECIALTY_LABELS[k].trim().length > 0, k);
});

test("qabul holatlarining har birida yorliq va rang bor", () => {
  for (const [k, v] of Object.entries(APPOINTMENT_STATUS)) {
    assert.ok(v.label.trim().length > 0, k);
    assert.ok(v.color.trim().length > 0, k);
  }
});
