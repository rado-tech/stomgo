import { test } from "node:test";
import assert from "node:assert/strict";
import { rateLimit } from "../lib/ratelimit";

test("limitgacha ruxsat beradi", () => {
  const key = "test-a";
  assert.equal(rateLimit(key, 3, 60_000), true);
  assert.equal(rateLimit(key, 3, 60_000), true);
  assert.equal(rateLimit(key, 3, 60_000), true);
});

test("limitdan keyin to'xtatadi", () => {
  const key = "test-b";
  for (let i = 0; i < 5; i++) rateLimit(key, 5, 60_000);
  assert.equal(rateLimit(key, 5, 60_000), false);
});

test("kalitlar bir-biriga ta'sir qilmaydi", () => {
  rateLimit("test-c", 1, 60_000);
  assert.equal(rateLimit("test-c", 1, 60_000), false);
  assert.equal(rateLimit("test-d", 1, 60_000), true);
});

test("oyna tugagach qayta ochiladi", async () => {
  const key = "test-e";
  assert.equal(rateLimit(key, 1, 30), true);
  assert.equal(rateLimit(key, 1, 30), false);
  await new Promise((r) => setTimeout(r, 50));
  assert.equal(rateLimit(key, 1, 30), true);
});
