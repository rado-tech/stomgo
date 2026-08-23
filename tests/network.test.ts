import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

/**
 * lib/client.ts brauzer moduli — Node'da sinash uchun fetch va navigator
 * o'rniga soxta obyekt qo'yamiz.
 */

type FetchFn = typeof globalThis.fetch;
const realFetch = globalThis.fetch;

// Node 24 da globalThis.navigator faqat o'qish uchun — defineProperty kerak
function setNavigator(onLine: boolean | undefined) {
  Object.defineProperty(globalThis, "navigator", {
    value: onLine === undefined ? undefined : { onLine },
    configurable: true,
    writable: true,
  });
}

/** Har testda yangi nusxa — modul ichidagi holat aralashmasin */
async function loadApi() {
  const m = await import(`../lib/client.ts?n=${Math.random()}`);
  return m as { api: <T>(p: string, o?: RequestInit & { json?: unknown }) => Promise<T>; NetworkError: new (m: string, o: boolean) => Error };
}

const jsonOk = (body: unknown) =>
  new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });

beforeEach(() => setNavigator(true));
afterEach(() => { globalThis.fetch = realFetch; setNavigator(undefined); });

test("muvaffaqiyatli so'rov ma'lumot qaytaradi", async () => {
  globalThis.fetch = (async () => jsonOk({ ok: true, n: 7 })) as FetchFn;
  const { api } = await loadApi();
  const r = await api<{ n: number }>("/api/test");
  assert.equal(r.n, 7);
});

test("brauzer oflayn bo'lsa so'rov umuman yuborilmaydi", async () => {
  setNavigator(false);
  let called = 0;
  globalThis.fetch = (async () => { called++; return jsonOk({}); }) as FetchFn;
  const { api } = await loadApi();
  await assert.rejects(() => api("/api/test"), /Internet yo'q/);
  assert.equal(called, 0, "oflayn holatda fetch chaqirilmasligi kerak");
});

test("GET tarmoq xatosida bir marta qayta uriniladi", async () => {
  let calls = 0;
  globalThis.fetch = (async () => {
    calls++;
    if (calls === 1) throw new TypeError("Failed to fetch");
    return jsonOk({ ok: true });
  }) as FetchFn;
  const { api } = await loadApi();
  await api("/api/test");
  assert.equal(calls, 2, "ikkinchi urinish bo'lishi kerak");
});

test("POST qayta yuborilmaydi — yozuv ikki marta ketmasin", async () => {
  let calls = 0;
  globalThis.fetch = (async () => { calls++; throw new TypeError("Failed to fetch"); }) as FetchFn;
  const { api } = await loadApi();
  await assert.rejects(() => api("/api/test", { json: { a: 1 } }));
  assert.equal(calls, 1, "yozuv so'rovi faqat bir marta yuborilishi kerak");
});

test("server xatosi qayta urinishga sabab bo'lmaydi", async () => {
  let calls = 0;
  globalThis.fetch = (async () => {
    calls++;
    return new Response(JSON.stringify({ error: "Ruxsat yo'q" }), { status: 403 });
  }) as FetchFn;
  const { api } = await loadApi();
  await assert.rejects(() => api("/api/test"), /Ruxsat yo'q/);
  assert.equal(calls, 1, "403 — tarmoq muammosi emas, qayta urinilmasin");
});

test("server xato matni foydalanuvchiga yetkaziladi", async () => {
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ error: "Narx juda katta" }), { status: 400 })) as FetchFn;
  const { api } = await loadApi();
  await assert.rejects(() => api("/api/test"), /Narx juda katta/);
});

test("matnsiz xatoda holat kodi ko'rsatiladi", async () => {
  globalThis.fetch = (async () => new Response("", { status: 500 })) as FetchFn;
  const { api } = await loadApi();
  await assert.rejects(() => api("/api/test"), /500/);
});

test("tarmoq xatosi NetworkError sifatida keladi", async () => {
  globalThis.fetch = (async () => { throw new TypeError("Failed to fetch"); }) as FetchFn;
  const { api } = await loadApi();
  await assert.rejects(
    () => api("/api/test", { json: {} }),
    (e: Error) => e.name === "NetworkError",
  );
});
