/**
 * Eskiz.uz SMS integratsiyasi.
 * ESKIZ_EMAIL va ESKIZ_PASSWORD berilmagan bo'lsa — SMS yuborilmaydi (demo rejim,
 * OTP kodi ekranda ko'rsatiladi).
 *
 * MUHIM: Eskiz'da ro'yxatdan o'tgach SMS matn shablonini moderatsiyadan o'tkazish
 * kerak (my.eskiz.uz → SMS → Мои тексты). Shablon: "StomGo kirish kodi: {kod}".
 * Test rejimida Eskiz faqat "Bu Eskiz dan test" matnini yuborishga ruxsat beradi.
 */

const ESKIZ_BASE = "https://notify.eskiz.uz/api";

let cachedToken: { token: string; expiresAt: number } | null = null;

export function smsConfigured(): boolean {
  return Boolean(process.env.ESKIZ_EMAIL && process.env.ESKIZ_PASSWORD);
}

async function getToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.token;

  const res = await fetch(`${ESKIZ_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: process.env.ESKIZ_EMAIL,
      password: process.env.ESKIZ_PASSWORD,
    }),
  });
  if (!res.ok) throw new Error(`Eskiz auth xatosi: ${res.status}`);
  const data = (await res.json()) as { data?: { token?: string } };
  const token = data.data?.token;
  if (!token) throw new Error("Eskiz token qaytarmadi");
  // Eskiz tokeni 30 kun amal qiladi; 25 kun keshda saqlaymiz
  cachedToken = { token, expiresAt: Date.now() + 25 * 864e5 };
  return token;
}

/** SMS yuborish. Muvaffaqiyat: true. Xato loglanadi, exception tashlanmaydi. */
export async function sendSms(phone: string, message: string): Promise<boolean> {
  if (!smsConfigured()) return false;
  try {
    const token = await getToken();
    const mobile = phone.replace(/\D/g, ""); // 998901234567 formati
    const res = await fetch(`${ESKIZ_BASE}/message/sms/send`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mobile_phone: mobile,
        message,
        from: process.env.ESKIZ_FROM ?? "4546",
      }),
    });
    if (res.status === 401) {
      // token eskirgan — bir marta yangilab qayta urinamiz
      cachedToken = null;
      return sendSms(phone, message);
    }
    if (!res.ok) {
      console.error("Eskiz SMS xatosi:", res.status, await res.text().catch(() => ""));
      return false;
    }
    return true;
  } catch (e) {
    console.error("SMS yuborishda xato:", e);
    return false;
  }
}
