import { test } from "node:test";
import assert from "node:assert/strict";
import { isOpenNow, todayHoursLabel, fullWeekLabel, generateSlots, nextFreeSlot } from "../lib/hours";

const ALWAYS = JSON.stringify({
  mon: [["00:00", "23:59"]], tue: [["00:00", "23:59"]], wed: [["00:00", "23:59"]],
  thu: [["00:00", "23:59"]], fri: [["00:00", "23:59"]], sat: [["00:00", "23:59"]],
  sun: [["00:00", "23:59"]],
});
const NEVER = JSON.stringify({ mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] });

test("24/7 jadval — hozir ochiq", () => {
  assert.equal(isOpenNow(ALWAYS), true);
});

test("bo'sh jadval — yopiq", () => {
  assert.equal(isOpenNow(NEVER), false);
});

test("buzuq JSON dastur ishdan chiqarmaydi", () => {
  assert.equal(isOpenNow("{buzuq"), false);
  assert.equal(isOpenNow(""), false);
  assert.doesNotThrow(() => todayHoursLabel("{buzuq"));
  assert.doesNotThrow(() => generateSlots("{buzuq"));
});

test("yopiq kun uchun yorliq", () => {
  assert.match(todayHoursLabel(NEVER), /Yopiq/i);
});

test("hafta jadvali 7 kun va bitta 'bugun'", () => {
  const w = fullWeekLabel(ALWAYS);
  assert.equal(w.length, 7);
  assert.equal(w.filter((d) => d.isToday).length, 1);
});

test("slotlar yaratiladi va HH:MM ko'rinishida", () => {
  const days = generateSlots(ALWAYS);
  assert.ok(days.length > 0);
  const withSlots = days.find((d) => d.slots.length > 0);
  assert.ok(withSlots, "kamida bitta kunda slot bo'lsin");
  for (const t of withSlots!.slots) assert.match(t, /^\d{2}:\d{2}$/);
});

test("slotlar o'sish tartibida", () => {
  const day = generateSlots(ALWAYS).find((d) => d.slots.length > 1)!;
  const sorted = [...day.slots].sort();
  assert.deepEqual(day.slots, sorted);
});

test("yopiq klinikada eng yaqin bo'sh vaqt yo'q", () => {
  assert.equal(nextFreeSlot(NEVER), null);
});

test("eng yaqin bo'sh vaqt — birinchi slot bilan bir xil", () => {
  const first = generateSlots(ALWAYS).find((d) => d.slots.length > 0)!;
  const next = nextFreeSlot(ALWAYS)!;
  assert.equal(next.date, first.date);
  assert.equal(next.time, first.slots[0]);
  assert.equal(next.label, first.label);
});
