import { test } from "node:test";
import assert from "node:assert/strict";
import { checkPrice, checkPriceRange, PRICE_MIN, PRICE_MAX } from "../lib/price";

test("to'g'ri narx qabul qilinadi", () => {
  const r = checkPrice("250000", "Narx");
  assert.equal(r.ok, true);
  assert.equal(r.ok && r.value, 250000);
});

test("chegaradagi qiymatlar o'tadi", () => {
  assert.equal(checkPrice(String(PRICE_MIN), "Narx").ok, true);
  assert.equal(checkPrice(String(PRICE_MAX), "Narx").ok, true);
});

test("bo'sh narx rad etiladi", () => {
  const r = checkPrice("", "Narx");
  assert.equal(r.ok, false);
  assert.match(r.ok ? "" : r.error, /kiritilmagan/);
});

test("manfiy son jimgina to'g'irlanmaydi — sababi aytiladi", () => {
  const r = checkPrice("-5000", "Narx");
  assert.equal(r.ok, false);
  assert.match(r.ok ? "" : r.error, /butun son/);
});

test("kasr son rad etiladi", () => {
  assert.equal(checkPrice("1000.5", "Narx").ok, false);
  assert.equal(checkPrice("1000,5", "Narx").ok, false);
});

test("eksponenta va harf rad etiladi", () => {
  assert.equal(checkPrice("1e9", "Narx").ok, false);
  assert.equal(checkPrice("abc", "Narx").ok, false);
  assert.equal(checkPrice("100 000", "Narx").ok, false);
});

test("juda katta son Int ustuniga yetib bormaydi", () => {
  const r = checkPrice("99999999999", "Narx");
  assert.equal(r.ok, false);
  assert.match(r.ok ? "" : r.error, /ko'pi bilan/);
});

test("juda kichik son rad etiladi", () => {
  const r = checkPrice("1", "Narx");
  assert.equal(r.ok, false);
  assert.match(r.ok ? "" : r.error, /kamida/);
});

test("null va undefined rad etiladi", () => {
  assert.equal(checkPrice(null, "Narx").ok, false);
  assert.equal(checkPrice(undefined, "Narx").ok, false);
});

test("xato matni maydon nomini o'z ichiga oladi", () => {
  const r = checkPrice("-1", "Eng past narx");
  assert.match(r.ok ? "" : r.error, /^Eng past narx/);
});

test("diapazon: yuqori narx pastdan kichik bo'lmaydi", () => {
  const r = checkPriceRange("300000", "100000");
  assert.equal(r.ok, false);
});

test("diapazon: teng narxlar ruxsat", () => {
  const r = checkPriceRange("300000", "300000");
  assert.equal(r.ok, true);
});

test("diapazon: pastdagi xato birinchi qaytadi", () => {
  const r = checkPriceRange("-1", "100000");
  assert.equal(r.ok, false);
  assert.match(r.ok ? "" : r.error, /Eng past narx/);
});
