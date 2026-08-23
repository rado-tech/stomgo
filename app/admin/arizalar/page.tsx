"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";
import { Badge, Spinner, EmptyState, Toast, Sheet } from "@/components/ui";
import { fmtDateTime } from "@/lib/format";

type App = {
  id: string; clinicName: string; district: string; address: string; phone: string;
  contactName: string; telegram: string; doctorCount: number; note: string;
  status: string; adminNote: string; clinicId: string | null;
  createdAt: string; reviewedAt: string | null;
};

type Credentials = { username: string; password: string };

const STATUS: Record<string, { label: string; color: string }> = {
  NEW: { label: "Yangi", color: "amber" },
  CONTACTED: { label: "Bog'lanildi", color: "sky" },
  APPROVED: { label: "Tasdiqlangan", color: "teal" },
  REJECTED: { label: "Rad etilgan", color: "zinc" },
};

const FILTERS: [string, string][] = [
  ["open", "Ochiq"],
  ["APPROVED", "Tasdiqlangan"],
  ["REJECTED", "Rad etilgan"],
  ["all", "Hammasi"],
];

/** Klinikalardan kelgan hamkorlik arizalari */
export default function AdminApplicationsPage() {
  const [items, setItems] = useState<App[] | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [filter, setFilter] = useState("open");
  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; error?: boolean } | null>(null);
  const [creds, setCreds] = useState<{ clinicName: string; c: Credentials } | null>(null);

  const load = useCallback(() => {
    setItems(null);
    api<{ items: App[]; counts: Record<string, number> }>(`/api/admin/applications?status=${filter}`)
      .then((d) => { setItems(d.items); setCounts(d.counts); })
      .catch(() => setItems([]));
  }, [filter]);

  useEffect(() => { const t = setTimeout(load, 0); return () => clearTimeout(t); }, [load]);

  const show = (msg: string, error?: boolean) => {
    setToast({ msg, error });
    setTimeout(() => setToast(null), 4000);
  };

  const setStatus = async (a: App, status: string) => {
    setBusy(a.id);
    try {
      await api("/api/admin/applications", { method: "PATCH", json: { id: a.id, status } });
      show("Holat yangilandi");
      load();
    } catch (e) {
      show((e as Error).message, true);
    } finally { setBusy(null); }
  };

  /** Arizani tasdiqlash: klinika yaratiladi, login-parol chiqadi */
  const approve = async (a: App) => {
    if (!confirm(`"${a.clinicName}" uchun klinika yaratilsinmi? Login va parol chiqariladi.`)) return;
    setBusy(a.id);
    try {
      const res = await api<{ credentials: Credentials }>("/api/admin/clinics", {
        json: {
          name: a.clinicName, district: a.district, address: a.address,
          phone: a.phone, applicationId: a.id,
        },
      });
      setCreds({ clinicName: a.clinicName, c: res.credentials });
      load();
    } catch (e) {
      show((e as Error).message, true);
    } finally { setBusy(null); }
  };

  const remove = async (a: App) => {
    if (!confirm(`"${a.clinicName}" arizasi butunlay o'chirilsinmi? (spam uchun)`)) return;
    setBusy(a.id);
    try {
      await api(`/api/admin/applications?id=${a.id}`, { method: "DELETE" });
      show("O'chirildi");
      load();
    } catch (e) {
      show((e as Error).message, true);
    } finally { setBusy(null); }
  };

  const openCount = (counts.NEW ?? 0) + (counts.CONTACTED ?? 0);

  return (
    <div>
      <h1 className="text-xl font-extrabold">Klinika arizalari</h1>
      <p className="mt-1 max-w-2xl text-[13.5px] leading-relaxed text-zinc-500">
        Klinikalar <span className="font-mono text-zinc-600">/hamkorlik</span> sahifasi orqali
        o&apos;zi topshiradi. Bog&apos;lanib, kelishilgach «Tasdiqlash» bosiladi —
        klinika yaratiladi va login-parol chiqadi.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        {FILTERS.map(([key, label]) => (
          <button
            key={key} onClick={() => setFilter(key)}
            className={`rounded-full px-3.5 py-2 text-[13px] font-semibold transition ${
              filter === key ? "bg-teal-600 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            {label}
            {key === "open" && openCount > 0 && (
              <span className="ml-1.5 rounded-full bg-amber-500 px-1.5 text-[11px] font-bold text-white">
                {openCount}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {!items ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : items.length === 0 ? (
          <EmptyState icon="📨" title="Ariza yo'q" subtitle="Bu filtrda hech narsa topilmadi" />
        ) : (
          <div className="space-y-1.5">
            {items.map((a) => {
              const open = openId === a.id;
              const st = STATUS[a.status] ?? { label: a.status, color: "zinc" };
              return (
                <div key={a.id} className="rounded-xl border border-zinc-100 bg-white">
                  <button
                    onClick={() => setOpenId(open ? null : a.id)}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-[14px] font-bold">{a.clinicName}</span>
                        <Badge color={st.color}>{st.label}</Badge>
                      </div>
                      <p className="truncate text-[12px] text-zinc-500">
                        {a.district} · {a.contactName} · {a.phone}
                        {a.doctorCount > 0 && ` · ${a.doctorCount} shifokor`}
                      </p>
                    </div>
                    <span className="shrink-0 text-[11px] text-zinc-400">{fmtDateTime(a.createdAt)}</span>
                    <svg
                      width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                      className={`shrink-0 text-zinc-400 transition ${open ? "rotate-180" : ""}`}
                    >
                      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>

                  {open && (
                    <div className="border-t border-zinc-100 px-3 py-2.5">
                      <dl className="mb-2.5 space-y-1 text-[12.5px]">
                        {([
                          ["Manzil", a.address || "—"],
                          ["Telegram", a.telegram || "—"],
                          ["Qo'shimcha", a.note || "—"],
                          ["Ko'rildi", a.reviewedAt ? fmtDateTime(a.reviewedAt) : "—"],
                        ] as const).map(([k, v]) => (
                          <div key={k} className="flex gap-2">
                            <dt className="w-24 shrink-0 text-zinc-400">{k}</dt>
                            <dd className="min-w-0 break-words">{v}</dd>
                          </div>
                        ))}
                      </dl>

                      <div className="flex flex-wrap items-center gap-2">
                        <a href={`tel:${a.phone}`}
                          className="rounded-lg border border-teal-600 px-3 py-1.5 text-[12px] font-semibold text-teal-700">
                          Qo&apos;ng&apos;iroq
                        </a>
                        {a.status === "NEW" && (
                          <button onClick={() => setStatus(a, "CONTACTED")} disabled={busy === a.id}
                            className="rounded-lg border border-sky-500 px-3 py-1.5 text-[12px] font-semibold text-sky-700 disabled:opacity-50">
                            Bog&apos;lanildi
                          </button>
                        )}
                        {a.status !== "APPROVED" && (
                          <button onClick={() => approve(a)} disabled={busy === a.id}
                            className="rounded-lg bg-teal-600 px-3 py-1.5 text-[12px] font-bold text-white disabled:opacity-40">
                            Tasdiqlash va klinika yaratish
                          </button>
                        )}
                        {a.status !== "REJECTED" && a.status !== "APPROVED" && (
                          <button onClick={() => setStatus(a, "REJECTED")} disabled={busy === a.id}
                            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-[12px] font-semibold text-zinc-600 disabled:opacity-50">
                            Rad etish
                          </button>
                        )}
                        <button onClick={() => remove(a)} disabled={busy === a.id}
                          className="ml-auto rounded-lg px-2 py-1.5 text-[12px] font-semibold text-red-600 disabled:opacity-50">
                          O&apos;chirish
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Sheet open={!!creds} onClose={() => setCreds(null)} title="Klinika kirish ma'lumotlari">
        <p className="text-[13.5px] text-zinc-600">
          <b>{creds?.clinicName}</b> uchun kirish ma&apos;lumotlari. Parol faqat hozir
          ko&apos;rsatiladi — nusxalab klinikaga yetkazing.
        </p>
        <div className="mt-3 space-y-2 rounded-xl bg-zinc-50 p-4 font-mono text-[15px]">
          <p>Login: <b>{creds?.c.username}</b></p>
          <p>Parol: <b>{creds?.c.password}</b></p>
        </div>
        <button
          onClick={() => {
            navigator.clipboard?.writeText(
              `StomGo klinika paneli: ${location.origin}/kirish\nLogin: ${creds?.c.username}\nParol: ${creds?.c.password}`
            );
            show("Nusxalandi");
          }}
          className="mt-3 w-full rounded-2xl bg-teal-600 py-3 font-bold text-white"
        >
          Nusxalash
        </button>
      </Sheet>

      {toast && <Toast message={toast.msg} error={toast.error} />}
    </div>
  );
}
