import { SignJWT, importPKCS8 } from "jose";

/**
 * Firebase Cloud Messaging (HTTP v1) orqali to'g'ridan-to'g'ri yuborish.
 * Expo hisobi kerak emas — faqat Firebase service account kaliti.
 *
 * Sozlash: .env da FCM_SERVICE_ACCOUNT — JSON faylning yo'li yoki JSON matnning o'zi.
 * Kalit bo'lmasa bu kanal jimgina o'chiq turadi.
 */

type ServiceAccount = { project_id: string; client_email: string; private_key: string };

let cachedSa: ServiceAccount | null | undefined;
let cachedToken: { value: string; expiresAt: number } | null = null;

async function loadServiceAccount(): Promise<ServiceAccount | null> {
  if (cachedSa !== undefined) return cachedSa;
  const raw = process.env.FCM_SERVICE_ACCOUNT?.trim();
  if (!raw) return (cachedSa = null);

  try {
    let text = raw;
    if (!raw.startsWith("{")) {
      const fs = await import("node:fs/promises");
      text = await fs.readFile(raw, "utf8");
    }
    const sa = JSON.parse(text) as ServiceAccount;
    if (!sa.project_id || !sa.client_email || !sa.private_key) throw new Error("to'liq emas");
    return (cachedSa = sa);
  } catch (e) {
    console.error("FCM: service account o'qilmadi —", (e as Error).message);
    return (cachedSa = null);
  }
}

/** Google OAuth2 kirish tokeni (1 soat amal qiladi, keshlanadi) */
async function getAccessToken(sa: ServiceAccount): Promise<string | null> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;

  try {
    const key = await importPKCS8(sa.private_key.replace(/\\n/g, "\n"), "RS256");
    const now = Math.floor(Date.now() / 1000);
    const assertion = await new SignJWT({
      scope: "https://www.googleapis.com/auth/firebase.messaging",
    })
      .setProtectedHeader({ alg: "RS256" })
      .setIssuer(sa.client_email)
      .setSubject(sa.client_email)
      .setAudience("https://oauth2.googleapis.com/token")
      .setIssuedAt(now)
      .setExpirationTime(now + 3600)
      .sign(key);

    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
      }),
    });
    const j = (await res.json()) as { access_token?: string; expires_in?: number; error?: string };
    if (!j.access_token) {
      console.error("FCM: kirish tokeni olinmadi —", j.error ?? res.status);
      return null;
    }
    cachedToken = { value: j.access_token, expiresAt: Date.now() + (j.expires_in ?? 3600) * 1000 };
    return cachedToken.value;
  } catch (e) {
    console.error("FCM: OAuth xatosi —", (e as Error).message);
    return null;
  }
}

export function fcmConfigured(): boolean {
  return !!process.env.FCM_SERVICE_ACCOUNT?.trim();
}

/**
 * Tokenlarga bildirishnoma yuborish.
 * Ishlamay qolgan tokenlar ro'yxatini qaytaradi (chaqiruvchi ularni o'chiradi).
 */
export async function fcmSend(
  tokens: string[],
  p: { title: string; body: string; link?: string }
): Promise<{ dead: string[] }> {
  const dead: string[] = [];
  if (tokens.length === 0) return { dead };

  const sa = await loadServiceAccount();
  if (!sa) return { dead };
  const access = await getAccessToken(sa);
  if (!access) return { dead };

  const url = `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`;

  // FCM v1 bir so'rovda bitta qurilma — parallel yuboramiz
  await Promise.all(
    tokens.map(async (token) => {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { authorization: `Bearer ${access}`, "content-type": "application/json" },
          body: JSON.stringify({
            message: {
              token,
              notification: { title: p.title, body: p.body },
              data: { link: p.link ?? "" },
              android: {
                priority: "HIGH",
                notification: { channel_id: "default", sound: "default" },
              },
            },
          }),
        });
        if (res.ok) return;
        const j = (await res.json().catch(() => ({}))) as {
          error?: { status?: string; message?: string };
        };
        const status = j.error?.status;
        // Qurilma o'chirilgan yoki ilova olib tashlangan
        if (res.status === 404 || status === "NOT_FOUND" || status === "UNREGISTERED") {
          dead.push(token);
        } else if (res.status === 400 && /not a valid FCM registration token/i.test(j.error?.message ?? "")) {
          dead.push(token);
        } else {
          console.error("FCM yuborilmadi:", res.status, j.error?.message ?? "");
        }
      } catch (e) {
        console.error("FCM tarmoq xatosi:", (e as Error).message);
      }
    })
  );

  return { dead };
}
