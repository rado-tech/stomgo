import { test } from "node:test";
import assert from "node:assert/strict";
import { fmtDateUz, fmtDateTimeUz, fmtWeekdayDateUz, WEEKDAYS_UZ } from "../lib/date-uz";

// 22-avgust 2026, 10:00 UTC = Toshkentda 15:00
const D = "2026-08-22T10:00:00.000Z";

test("sana kun/oy/yil ko'rinishida", () => {
  assert.equal(fmtDateUz(D), "22/08/2026");
});

test("bir xonali kun va oy nol bilan to'ldiriladi", () => {
  assert.equal(fmtDateUz("2026-01-05T09:00:00.000Z"), "05/01/2026");
});

test("sana va vaqt 24 soatlik", () => {
  assert.equal(fmtDateTimeUz(D), "22/08/2026, 15:00");
});

test("yarim tundan keyingi vaqt 00 bilan boshlanadi", () => {
  // 21:30 UTC = keyingi kun 02:30 Toshkentda
  assert.equal(fmtDateTimeUz("2026-08-22T21:30:00.000Z"), "23/08/2026, 02:30");
});

test("yarim tun 24:00 emas, 00:00", () => {
  // 19:00 UTC = 00:00 Toshkentda
  assert.equal(fmtDateTimeUz("2026-08-22T19:00:00.000Z"), "23/08/2026, 00:00");
});

test("hafta kuni + kun/oy", () => {
  assert.equal(fmtWeekdayDateUz(D), "Shanba, 22/08");
});

test("hafta kunlari o'zbekcha va 7 ta", () => {
  assert.equal(WEEKDAYS_UZ.length, 7);
  assert.equal(WEEKDAYS_UZ[0], "Yakshanba");
  assert.equal(WEEKDAYS_UZ[6], "Shanba");
});

test("Date obyekti ham, satr ham qabul qilinadi", () => {
  assert.equal(fmtDateUz(new Date(D)), fmtDateUz(D));
});

test("vaqt mintaqasi Toshkent (+05:00) — UTC emas", () => {
  // UTC bo'lganda "22/08/2026, 10:00" chiqardi
  assert.notEqual(fmtDateTimeUz(D), "22/08/2026, 10:00");
});
