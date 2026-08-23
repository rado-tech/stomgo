"use client";

/**
 * Root layout ishdan chiqqanda ko'rinadigan oxirgi himoya.
 * Bu yerda layout ishlamaydi — shuning uchun <html> va <body> o'zimiz yozamiz
 * va uslublar inline bo'ladi (CSS ham yuklanmagan bo'lishi mumkin).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="uz">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          padding: "24px",
          textAlign: "center",
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          background: "#fafafa",
          color: "#18181b",
        }}
      >
        <div style={{ fontSize: 48, lineHeight: 1 }}>🦷</div>
        <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>Sayt vaqtincha ishlamayapti</h1>
        <p style={{ fontSize: 14, color: "#71717a", margin: 0, maxWidth: 420, lineHeight: 1.6 }}>
          Kutilmagan muammo yuz berdi. Bir daqiqadan keyin qayta urinib ko&apos;ring —
          muammo takrorlansa, biz allaqachon xabardormiz va tuzatyapmiz.
        </p>

        <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap", justifyContent: "center" }}>
          <button
            onClick={reset}
            style={{
              border: "none", borderRadius: 16, background: "#0d9488", color: "#fff",
              padding: "12px 24px", fontSize: 15, fontWeight: 700, cursor: "pointer",
            }}
          >
            Qayta urinish
          </button>
          {/* Bu yerda next/link ishlatilmaydi: global-error root layout o'rniga
              chiziladi va router konteksti buzilgan bo'lishi mumkin.
              To'liq sahifa yangilanishi aynan kerak. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/"
            style={{
              borderRadius: 16, border: "1px solid #d4d4d8", color: "#3f3f46",
              padding: "12px 24px", fontSize: 15, fontWeight: 600, textDecoration: "none",
            }}
          >
            Bosh sahifa
          </a>
        </div>

        {/* Qo'llab-quvvatlashga murojaat qilganda shu raqamni aytish kifoya */}
        {error.digest && (
          <p style={{ fontSize: 12, color: "#a1a1aa", marginTop: 12, fontFamily: "monospace" }}>
            Xato kodi: {error.digest}
          </p>
        )}
      </body>
    </html>
  );
}
