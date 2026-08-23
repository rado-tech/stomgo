import { test } from "node:test";
import assert from "node:assert/strict";
import { safeNext, insidePanel } from "../lib/navigation";

test("oddiy ichki yo'l o'tadi", () => {
  assert.equal(safeNext("/profil"), "/profil");
  assert.equal(safeNext("/admin/klinikalar"), "/admin/klinikalar");
  assert.equal(safeNext("/xabarlar?id=5"), "/xabarlar?id=5");
});

test("tashqi manzil rad etiladi", () => {
  assert.equal(safeNext("https://evil.com"), "");
  assert.equal(safeNext("http://evil.com"), "");
});

test("protokolsiz tashqi manzil rad etiladi", () => {
  assert.equal(safeNext("//evil.com"), "");
  assert.equal(safeNext("//evil.com/admin"), "");
});

test("teskari chiziqli hiyla rad etiladi", () => {
  // Ba'zi brauzerlar "/\evil.com" ni tashqi manzil deb o'qiydi
  assert.equal(safeNext(String.raw`/\evil.com`), "");
});

test("javascript: sxemasi rad etiladi", () => {
  assert.equal(safeNext("javascript:alert(1)"), "");
  assert.equal(safeNext("data:text/html,<script>"), "");
});

test("bo'sh qiymat bo'sh qoladi", () => {
  assert.equal(safeNext(""), "");
});

test("panel ichidagi sahifa tan olinadi", () => {
  assert.equal(insidePanel("/admin", "/admin"), true);
  assert.equal(insidePanel("/admin/loglar", "/admin"), true);
});

test("o'xshash nomli begona yo'l panel ichida emas", () => {
  // "/adminfoo" mavjud emas — bu yerga yo'naltirish 404 berardi
  assert.equal(insidePanel("/adminfoo", "/admin"), false);
  assert.equal(insidePanel("/administrator", "/admin"), false);
});

test("boshqa panelning sahifasi tan olinmaydi", () => {
  assert.equal(insidePanel("/clinic/xabarlar", "/admin"), false);
  assert.equal(insidePanel("/profil", "/clinic"), false);
});
