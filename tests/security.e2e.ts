/**
 * Xavfsizlik tekshiruvi — ishlab turgan serverga qarshi.
 * Maqsad: himoyalangan yo'llar tokensiz OCHIQ QOLMASLIGI.
 * Ishga tushirish: E2E_BASE=http://localhost:3000 node --import tsx --test tests/security.e2e.ts
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";

const BASE = process.env.E2E_BASE ?? "http://localhost:3000";

async function call(path: string, init: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, { redirect: "manual", ...init });
  return res;
}

/** Tokensiz kirish 401/403 bo'lishi shart — 200 bo'lsa teshik */
const PROTECTED: [string, string][] = [
  ["GET", "/api/admin/stats"],
  ["GET", "/api/admin/users"],
  ["GET", "/api/admin/clinics"],
  ["GET", "/api/admin/doctors"],
  ["GET", "/api/admin/logs"],
  ["GET", "/api/admin/promo"],
  ["GET", "/api/admin/applications"],
  ["PATCH", "/api/admin/applications"],
  ["GET", "/api/admin/reviews"],
  ["GET", "/api/admin/services"],
  ["GET", "/api/admin/appointments"],
  ["POST", "/api/admin/account"],
  ["PUT", "/api/admin/account"],
  ["GET", "/api/clinic/appointments"],
  ["GET", "/api/clinic/services"],
  ["GET", "/api/clinic/doctors"],
  ["GET", "/api/clinic/reviews"],
  ["GET", "/api/clinic/stats"],
  ["GET", "/api/clinic/profile"],
  ["POST", "/api/clinic/book"],
  ["POST", "/api/me/phone"],
  ["DELETE", "/api/me"],
  ["GET", "/api/notifications"],
  ["GET", "/api/appointments"],
  ["GET", "/api/chat"],
  ["POST", "/api/upload"],
  ["POST", "/api/reviews"],
];

describe("Autentifikatsiya devori", () => {
  for (const [method, path] of PROTECTED) {
    test(`${method} ${path} — tokensiz kirib bo'lmaydi`, async () => {
      const res = await call(path, {
        method,
        ...(method === "GET" ? {} : { headers: { "content-type": "application/json" }, body: "{}" }),
      });
      assert.ok(
        res.status === 401 || res.status === 403,
        `${method} ${path} → ${res.status} (401/403 kutilgandi)`,
      );
    });
  }
});

describe("Ochiq yo'llar ishlaydi", () => {
  test("GET /api/health — 200", async () => {
    const res = await call("/api/health");
    assert.equal(res.status, 200);
  });

  test("GET /api/clinics — 200 va ro'yxat qaytaradi", async () => {
    const res = await call("/api/clinics");
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data.list), "list massiv bo'lsin");
    assert.ok(Array.isArray(data.promos), "promos massiv bo'lsin");
  });

  test("GET /api/me — tokensiz user: null qaytaradi, ma'lumot bermaydi", async () => {
    const res = await call("/api/me");
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.user, null, "tokensiz foydalanuvchi ma'lumoti berilgan");
  });

  test("GET /api/narxlar — 200", async () => {
    const res = await call("/api/narxlar");
    assert.equal(res.status, 200);
  });
});

describe("Ma'lumot sizib chiqmaydi", () => {
  test("klinika ro'yxatida parol yoki token yo'q", async () => {
    const res = await call("/api/clinics");
    const text = await res.text();
    for (const bad of ["passwordHash", "password", "telegramChatId", "sessionToken"]) {
      assert.ok(!text.includes(bad), `javobda "${bad}" bor`);
    }
  });

  test("xato javobida stack trace yo'q", async () => {
    const res = await call("/api/clinics/bunday-klinika-yoq-12345");
    const text = await res.text();
    assert.ok(!text.includes("at async"), "stack trace ko'rinib turibdi");
    assert.ok(!/node_modules[\/]/.test(text), "ichki yo'llar ko'rinib turibdi");
  });
});

describe("Xavfsizlik sarlavhalari", () => {
  test("asosiy sarlavhalar o'rnatilgan", async () => {
    const res = await call("/");
    const h = res.headers;
    assert.equal(h.get("x-content-type-options"), "nosniff");
    assert.equal(h.get("x-frame-options"), "DENY");
    assert.ok(h.get("referrer-policy"), "referrer-policy yo'q");
    assert.ok(h.get("content-security-policy"), "CSP yo'q");
  });

  test("server texnologiyasi oshkor qilinmaydi", async () => {
    const res = await call("/");
    assert.equal(res.headers.get("x-powered-by"), null);
  });
});

describe("Kirish yo'li", () => {
  test("noto'g'ri parol bilan kirib bo'lmaydi", async () => {
    const res = await call("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: "admin", password: "notogri-parol-12345" }),
    });
    assert.ok(res.status >= 400, `kutilmagan holat: ${res.status}`);
    const text = await res.text();
    assert.ok(!text.includes("passwordHash"), "hash javobga chiqib ketgan");
  });

  test("bo'sh so'rov 400/401 qaytaradi", async () => {
    const res = await call("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    assert.ok(res.status >= 400);
  });

  test("SQL in'ektsiya urinishi zarar qilmaydi", async () => {
    const res = await call("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: "' OR 1=1 --", password: "x" }),
    });
    assert.ok(res.status >= 400, `in'ektsiya o'tdi: ${res.status}`);
  });

  test("qidiruvda SQL in'ektsiya server xatosiga olib kelmaydi", async () => {
    const res = await call(`/api/clinics?q=${encodeURIComponent("'; DROP TABLE \"User\"; --")}`);
    assert.ok(res.status < 500, `500 qaytdi: ${res.status}`);
  });
});

describe("Fayl va yo'l himoyasi", () => {
  test("uploads papkasidan tashqariga chiqib bo'lmaydi", async () => {
    for (const p of [
      "/api/files/..%2F..%2F.env",
      "/api/files/../../.env",
      "/api/files/%2e%2e%2f%2e%2e%2fpackage.json",
    ]) {
      const res = await call(p);
      assert.ok(res.status >= 400, `${p} → ${res.status}`);
    }
  });

  test(".env va secrets veb orqali ochilmaydi", async () => {
    for (const p of ["/.env", "/secrets/", "/secrets/kalit.json", "/prisma/dev.db", "/.git/config", "/backups/"]) {
      // redirect: "follow" — Next trailing-slash uchun 308 beradi, oxirgi holat muhim
      const res = await fetch(`${BASE}${p}`, { redirect: "follow" });
      assert.ok(res.status >= 400, `${p} → ${res.status}`);
    }
  });
});

describe("Biznes mantiq suiiste'moli", () => {
  test("o'tgan vaqtga yozilib bo'lmaydi (tokensiz ham 401 dan o'tmaydi)", async () => {
    const res = await call("/api/appointments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ clinicId: "x", date: "2020-01-01", time: "10:00" }),
    });
    // Avval avtorizatsiya, keyin validatsiya — ikkalasi ham to'sadi
    assert.ok(res.status === 401 || res.status === 400, `kutilmagan: ${res.status}`);
  });

  test("QR check-in tokensiz ishlamaydi", async () => {
    const res = await call("/api/checkin", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: "x", lat: 41.3, lng: 69.2 }),
    });
    assert.ok(res.status === 401 || res.status === 403);
  });

  test("noto'g'ri QR token klinika ma'lumotini bermaydi", async () => {
    const res = await call("/api/checkin?token=bunday-token-yoq-12345");
    assert.equal(res.status, 404);
  });
});

describe("Sozlama va sirlar", () => {
  test("javoblarda muhit o'zgaruvchilari ko'rinmaydi", async () => {
    const res = await call("/api/clinics");
    const text = await res.text();
    for (const bad of ["AUTH_SECRET", "DATABASE_URL", "TELEGRAM_BOT_TOKEN", "GEMINI_API_KEY", "postgresql://"]) {
      assert.ok(!text.includes(bad), `javobda "${bad}" bor`);
    }
  });

  test("brauzerga ketadigan sahifada server sirlari yo'q", async () => {
    const res = await call("/");
    const html = await res.text();
    for (const bad of ["AUTH_SECRET", "TELEGRAM_BOT_TOKEN", "GEMINI_API_KEY", "SENTRY_DSN=", "postgresql://"]) {
      assert.ok(!html.includes(bad), `sahifada "${bad}" bor`);
    }
  });

  test("manba xaritalari ishlab chiqarishda ochiq emas", async () => {
    // .map fayllari kodni to'liq ochib beradi
    const res = await call("/_next/static/chunks/main.js.map");
    assert.ok(res.status >= 400, `manba xaritasi ochiq: ${res.status}`);
  });
});
