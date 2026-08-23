import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizePhone } from "../lib/phone";

test("9 xonali raqamga +998 qo'shiladi", () => {
  assert.equal(normalizePhone("901234567"), "+998901234567");
});

test("probel, qavs va tire tozalanadi", () => {
  assert.equal(normalizePhone("90 123 45 67"), "+998901234567");
  assert.equal(normalizePhone("(90) 123-45-67"), "+998901234567");
});

test("998 bilan boshlanuvchi 12 xonali raqam qabul qilinadi", () => {
  assert.equal(normalizePhone("998901234567"), "+998901234567");
  assert.equal(normalizePhone("+998 90 123 45 67"), "+998901234567");
});

test("noto'g'ri uzunlik null qaytaradi", () => {
  assert.equal(normalizePhone("12345"), null);
  assert.equal(normalizePhone("9012345678901234"), null);
  assert.equal(normalizePhone(""), null);
});

test("boshqa davlat kodi rad etiladi", () => {
  assert.equal(normalizePhone("+7 999 123 45 67"), null);
});
