"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { Badge, Sheet, Spinner, Toast } from "@/components/ui";

type AdminStats = {
  totals: { clinics: number; patients: number; bookings30d: number; arrived30d: number; noShow30d: number; pendingReviews: number; triages: number };
  days: { date: string; bookings: number; patients: number }[];
  triages: { id: string; urgency: string; specialty: string; freeText: string; aiUsed: boolean; date: string }[];
};
type AdminClinic = {
  id: string; slug: string; name: string; district: string; tier: string; verified: boolean;
  rating: number; reviewCount: number; appointments: number; reviews: number; doctors: number;
  infoStale: boolean; username: string | null; photoUrl: string | null;
};

type Credentials = { username: string; password: string };

const URGENCY_COLORS: Record<string, string> = { EMERGENCY: "red", TODAY: "orange", SOON: "amber", ROUTINE: "emerald" };

/** Bitta seriyali kichik ustunlar grafigi */
function MiniBars({ data, color, title }: { data: { date: string; value: number }[]; color: string; title: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  const W = 560, H = 90, PAD = 4;
  const bw = (W - PAD * 2) / data.length;
  return (
    <div className="rounded-2xl border border-zinc-100 bg-white p-4">
      <div className="flex items-baseline justify-between">
        <p className="text-[13px] font-semibold text-zinc-600">{title}</p>
        <p className="text-[12px] text-zinc-400">14 kun · maks: {max}</p>
      </div>
      <div className="relative mt-2">
        <svg viewBox={`0 0 ${W} ${H + 16}`} className="w-full">
          <line x1={PAD} x2={W - PAD} y1={H} y2={H} stroke="#e4e4e7" strokeWidth="1" />
          {data.map((d, i) => {
            const h = d.value === 0 ? 2 : Math.max(3, (d.value / max) * (H - 8));
            const x = PAD + i * bw + 3;
            const w = Math.max(4, bw - 6);
            return (
              <g key={d.date}>
                <rect x={x} y={H - h} width={w} height={h} rx={3}
                  fill={d.value === 0 ? "#e4e4e7" : color}
                  opacity={hover === null || hover === i ? 1 : 0.45} />
                <rect x={PAD + i * bw} y={0} width={bw} height={H} fill="transparent"
                  onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />
                {(i === 0 || i === data.length - 1) && (
                  <text x={x + w / 2} y={H + 13} textAnchor="middle" fontSize="10" fill="#a1a1aa">
                    {d.date.slice(5).replace("-", "/")}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
        {hover !== null && (
          <div className="pointer-events-none absolute -top-1 rounded-lg bg-zinc-800 px-2.5 py-1.5 text-[12px] font-medium text-white shadow"
            style={{ left: `${((hover + 0.5) / data.length) * 100}%`, transform: "translateX(-50%)" }}>
            {data[hover].date.slice(5).replace("-", "/")}: <b>{data[hover].value}</b>
          </div>
        )}
      </div>
    </div>
  );
}

const EMPTY_FORM = { name: "", district: "", address: "", phone: "" };

export default function AdminPage() {
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [clinics, setClinics] = useState<AdminClinic[] | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [creds, setCreds] = useState<{ clinicName: string; c: Credentials } | null>(null);

  const load = useCallback(() => {
    api<AdminStats>("/api/admin/stats").then(setStats);
    api<{ clinics: AdminClinic[] }>("/api/admin/clinics").then((d) => setClinics(d.clinics));
  }, []);
  useEffect(load, [load]);

  const act = async (id: string, body: object) => {
    await api("/api/admin/clinics", { method: "PATCH", json: { id, ...body } });
    load();
    setToast("Saqlandi");
    setTimeout(() => setToast(null), 2000);
  };

  const createClinic = async () => {
    setBusy(true);
    try {
      const res = await api<{ credentials: Credentials }>("/api/admin/clinics", { json: form });
      setCreateOpen(false);
      setCreds({ clinicName: form.name, c: res.credentials });
      setForm(EMPTY_FORM);
      load();
    } catch (e) {
      setToast((e as Error).message);
      setTimeout(() => setToast(null), 3500);
    } finally {
      setBusy(false);
    }
  };

  const impersonate = async (c: AdminClinic) => {
    if (!confirm(`${c.name} paneliga kirasiz. Admin panelga qaytish uchun qaytadan admin sifatida kirishingiz kerak bo'ladi. Davom etilsinmi?`)) return;
    await api("/api/admin/clinics", { method: "PATCH", json: { id: c.id, action: "impersonate" } });
    // Sessiya roli o'zgardi — router keshi eski rolni ko'rsatmasligi uchun to'liq qayta yuklash
    router.push("/clinic");
    router.refresh();
  };

  const resetPassword = async (c: AdminClinic) => {
    if (!confirm(`${c.name} uchun yangi parol yaratilsinmi? Eski parol ishlamay qoladi.`)) return;
    const res = await api<{ credentials: Credentials }>("/api/admin/clinics", {
      method: "PATCH", json: { id: c.id, action: "resetPassword" },
    });
    setCreds({ clinicName: c.name, c: res.credentials });
  };

  if (!stats || !clinics) return <div className="flex justify-center py-20"><Spinner /></div>;

  const t = stats.totals;
  return (
    <div className="mx-auto max-w-6xl">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {([
          ["Klinikalar", t.clinics], ["Bemorlar", t.patients], ["Yozuvlar (30k)", t.bookings30d],
          ["Kelganlar (30k)", t.arrived30d], ["No-show (30k)", t.noShow30d],
          ["Sharh navbati", t.pendingReviews], ["Triaj sessiyalari", t.triages],
        ] as const).map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-zinc-100 bg-white p-3">
            <p className="text-[11px] font-semibold uppercase text-zinc-400">{label}</p>
            <p className="mt-0.5 text-xl font-extrabold">{value}</p>
          </div>
        ))}
      </div>

      {/* Platforma dinamikasi (14 kun) */}
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <MiniBars title="Yozuv so'rovlari (kunlik)" color="#0f766e" data={stats.days.map((d) => ({ date: d.date, value: d.bookings }))} />
        <MiniBars title="Yangi bemorlar (kunlik)" color="#1d4ed8" data={stats.days.map((d) => ({ date: d.date, value: d.patients }))} />
      </div>

      <div className="mb-2 mt-6 flex items-center justify-between">
        <h2 className="font-bold">Klinikalar</h2>
        <button onClick={() => setCreateOpen(true)} className="rounded-xl bg-teal-600 px-4 py-2 text-[13px] font-bold text-white">
          + Yangi klinika
        </button>
      </div>
      {/* Mobil: kartochkalar */}
      <div className="space-y-2.5 md:hidden">
        {clinics.map((c) => (
          <div key={c.id} className="rounded-2xl border border-zinc-100 bg-white p-3.5">
            <div className="flex items-center justify-between gap-2">
              <p className="font-bold">{c.name}{c.infoStale && " ⚠️"}{!c.photoUrl && " 📷"}</p>
              {c.verified ? <Badge color="teal">Tekshirilgan</Badge> : <Badge color="zinc">Tekshirilmagan</Badge>}
            </div>
            <p className="mt-0.5 text-[12.5px] text-zinc-500">
              {c.district} · ★ {c.rating.toFixed(1)} ({c.reviewCount}) · {c.appointments} yozuv · login: <span className="font-mono">{c.username ?? "—"}</span>
            </p>
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              <select
                value={c.tier}
                onChange={(e) => act(c.id, { action: "setTier", tier: e.target.value })}
                className="rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-[12px]"
              >
                <option value="FREE">FREE</option>
                <option value="STANDARD">STANDARD</option>
                <option value="PREMIUM">PREMIUM</option>
              </select>
              <button onClick={() => act(c.id, { action: c.verified ? "unverify" : "verify" })}
                className="rounded-lg border border-zinc-200 px-2.5 py-1.5 text-[12px] font-semibold">
                {c.verified ? "Bekor" : "Tasdiqlash"}
              </button>
              <button onClick={() => resetPassword(c)}
                className="rounded-lg border border-amber-300 px-2.5 py-1.5 text-[12px] font-semibold text-amber-700">
                Parol
              </button>
              <button onClick={() => impersonate(c)}
                className="rounded-lg border border-teal-300 px-2.5 py-1.5 text-[12px] font-semibold text-teal-700">
                Panel →
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Katta ekran: jadval */}
      <div className="hidden overflow-x-auto rounded-2xl border border-zinc-100 bg-white md:block">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-zinc-100 text-left text-[11px] uppercase text-zinc-400">
              <th className="p-3">Klinika</th><th className="p-3">Login</th><th className="p-3">Tuman</th><th className="p-3">Reyting</th>
              <th className="p-3">Yozuvlar</th><th className="p-3">Tarif</th><th className="p-3">Holat</th><th className="p-3">Amallar</th>
            </tr>
          </thead>
          <tbody>
            {clinics.map((c) => (
              <tr key={c.id} className="border-b border-zinc-50 last:border-0">
                <td className="p-3 font-semibold">
                  {c.name}
                  {c.infoStale && <span title="Ma'lumot eskirgan"> ⚠️</span>}
                  {!c.photoUrl && <span title="Rasm yuklanmagan"> 📷</span>}
                </td>
                <td className="p-3 font-mono text-[12px] text-zinc-500">{c.username ?? "—"}</td>
                <td className="p-3 text-zinc-500">{c.district}</td>
                <td className="p-3">★ {c.rating.toFixed(1)} ({c.reviewCount})</td>
                <td className="p-3">{c.appointments}</td>
                <td className="p-3">
                  <select
                    value={c.tier}
                    onChange={(e) => act(c.id, { action: "setTier", tier: e.target.value })}
                    className="rounded-lg border border-zinc-200 px-2 py-1 text-[12px]"
                  >
                    <option value="FREE">FREE</option>
                    <option value="STANDARD">STANDARD</option>
                    <option value="PREMIUM">PREMIUM</option>
                  </select>
                </td>
                <td className="p-3">{c.verified ? <Badge color="teal">Tekshirilgan</Badge> : <Badge color="zinc">Tekshirilmagan</Badge>}</td>
                <td className="p-3">
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => act(c.id, { action: c.verified ? "unverify" : "verify" })}
                      className="rounded-lg border border-zinc-200 px-2.5 py-1 text-[12px] font-semibold"
                    >
                      {c.verified ? "Bekor qilish" : "Tasdiqlash"}
                    </button>
                    <button
                      onClick={() => resetPassword(c)}
                      className="rounded-lg border border-amber-300 px-2.5 py-1 text-[12px] font-semibold text-amber-700"
                    >
                      Parol
                    </button>
                    <button
                      onClick={() => impersonate(c)}
                      title="Klinika panelini ochish (admin sifatida)"
                      className="rounded-lg border border-teal-300 px-2.5 py-1 text-[12px] font-semibold text-teal-700"
                    >
                      Panel →
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mb-2 mt-6 font-bold">Oxirgi triaj sessiyalari</h2>
      <div className="space-y-1.5">
        {stats.triages.slice(0, 15).map((tr) => (
          <div key={tr.id} className="flex items-center gap-3 rounded-xl border border-zinc-100 bg-white px-3 py-2 text-[13px]">
            <Badge color={URGENCY_COLORS[tr.urgency]}>{tr.urgency}</Badge>
            <span className="text-zinc-500">{tr.specialty}</span>
            {tr.aiUsed && <Badge color="violet">AI</Badge>}
            <span className="min-w-0 flex-1 truncate text-zinc-400">{tr.freeText || "savollar orqali"}</span>
            <span className="shrink-0 text-[11px] text-zinc-400">{new Date(tr.date).toLocaleString("uz-UZ")}</span>
          </div>
        ))}
      </div>

      <Sheet open={createOpen} onClose={() => setCreateOpen(false)} title="Yangi klinika qo'shish">
        <div className="space-y-2.5">
          {([
            ["name", "Klinika nomi *"], ["district", "Tuman *"], ["address", "Manzil (ixtiyoriy)"],
            ["phone", "Klinika telefoni (ixtiyoriy)"],
          ] as const).map(([key, label]) => (
            <input
              key={key} value={form[key]} placeholder={label}
              onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-[14px] outline-none focus:border-teal-500"
            />
          ))}
          <p className="text-[12px] text-zinc-400">
            Tizim avtomatik login va parol yaratadi — ularni klinikaga topshirasiz.
            Klinika o&apos;zi kirib rasm, joylashuv, narxlar va qolgan hamma narsani to&apos;ldiradi.
          </p>
          <button onClick={createClinic} disabled={busy || !form.name.trim() || !form.district.trim()}
            className="w-full rounded-2xl bg-teal-600 py-3 font-bold text-white disabled:opacity-50">
            {busy ? "Yaratilmoqda..." : "Yaratish"}
          </button>
        </div>
      </Sheet>

      {/* Login-parol ko'rsatish (bir marta) */}
      <Sheet open={!!creds} onClose={() => setCreds(null)} title="Klinika kirish ma'lumotlari">
        <p className="text-[13.5px] text-zinc-600">
          <b>{creds?.clinicName}</b> uchun kirish ma&apos;lumotlari. Parol faqat hozir ko&apos;rsatiladi —
          nusxalab klinikaga yetkazing (keyin faqat yangi parol yaratish mumkin).
        </p>
        <div className="mt-3 space-y-2 rounded-xl bg-zinc-50 p-4 font-mono text-[15px]">
          <p>Login: <b>{creds?.c.username}</b></p>
          <p>Parol: <b>{creds?.c.password}</b></p>
        </div>
        <button
          onClick={() => {
            navigator.clipboard?.writeText(`StomGo klinika paneli: ${location.origin}/kirish\nLogin: ${creds?.c.username}\nParol: ${creds?.c.password}`);
            setToast("Nusxalandi");
            setTimeout(() => setToast(null), 2000);
          }}
          className="mt-3 w-full rounded-2xl bg-teal-600 py-3 font-bold text-white"
        >
          Nusxalash
        </button>
      </Sheet>

      {toast && <Toast message={toast} />}
    </div>
  );
}
