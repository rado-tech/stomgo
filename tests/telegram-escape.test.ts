import { test } from "node:test";
import assert from "node:assert/strict";
import { tgEscape } from "../lib/telegram";

test("oddiy matn o'zgarmaydi", () => {
  assert.equal(tgEscape("Shaxobiddin"), "Shaxobiddin");
  assert.equal(tgEscape("Amir Temur ko'chasi 24"), "Amir Temur ko'chasi 24");
});

test("havola tegi zararsizlantiriladi", () => {
  const attack = '<a href="https://evil.uz">Toshkent Bank</a>';
  const out = tgEscape(attack);
  assert.ok(!out.includes("<a "), "teg qolmasligi kerak");
  assert.ok(out.includes("&lt;a"), "belgilar almashtirilishi kerak");
});

test("qalin va kod teglari ham zararsizlantiriladi", () => {
  assert.equal(tgEscape("<b>admin</b>"), "&lt;b&gt;admin&lt;/b&gt;");
  assert.equal(tgEscape("<code>x</code>"), "&lt;code&gt;x&lt;/code&gt;");
});

test("ampersand birinchi almashtiriladi — ikki marta qochirilmaydi", () => {
  // Agar & oxirida almashtirilsa "&lt;" ning & si ham buzilardi
  assert.equal(tgEscape("a & b"), "a &amp; b");
  assert.equal(tgEscape("<x>&"), "&lt;x&gt;&amp;");
});

test("bo'sh va yo'q qiymatlar bo'sh satr beradi", () => {
  assert.equal(tgEscape(null), "");
  assert.equal(tgEscape(undefined), "");
  assert.equal(tgEscape(""), "");
});
