"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { Badge, Spinner, EmptyState, Toast, Cover } from "@/components/ui";

type Clinic = {
  id: string; slug: string; name: string; district: string; tier: string; verified: boolean;
  rating: number; reviewCount: number; appointments: number; reviews: number; doctors: number;
  infoStale: boolean; username: string | null; photoUrl: string | null; deactivated: boolean;
};

type Full = {
  name: string; slug: string; description: string; address: string; district: string;
  phone: string; lat: number; lng: number;
  is247: boolean; emergency: boolean; childFriendly: boolean; showDoctors: boolean;
};

const TIERS = ["FREE", "PRO"] as const;

/** Klinikalarni to'liq boshqarish: tahrirlash, o'chirish, tarif, tekshiruv, parol */
export default function AdminClinicsPage() {
  const router = useRouter();
  const [items, setItems] = useState<Clinic[] | null>(null);
  const [q, setQ] = useState("");
  const [tier, setTier] = useState("");
  const [state, setState] = useState(""); // "" | "active" | "off" | "unverified" | "noPhoto"
  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; error?: boolean } | null>(null);
  const [creds, setCreds] = useState<{ username: string; password: string } | null>(null);

  const [editFor, setEditFor] = useState<Clinic | null>(null);
  const [form, setForm] = useState<Full | null>(null);

  const load = useCallback(() => {
    setItems(null);
    api<{ clinics: Clinic[] }>("/api/admin/clinics")
      .then((d) => setItems(d.clinics))
      .catch(() => setItems([]));
  }, []);

  useEffect(() => { const t = setTimeout(load, 0); return () => clearTimeout(t); }, [load]);

  const show = (msg: string, error?: boolean) => {
    setToast({ msg, error });
    setTimeout(() => setToast(null), 5000);
  };

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (items ?? []).filter((c) => {
      if (t && !(
        c.name.toLowerCase().includes(t) ||
        c.district.toLowerCase().includes(t) ||
        (c.username ?? "").includes(t)
      )) return false;
      if (tier && c.tier !== tier) return false;
      if (state === "active" && c.deactivated) return false;
      if (state === "off" && !c.deactivated) return false;
      if (state === "unverified" && c.verified) return false;
      if (state === "noPhoto" && c.photoUrl) return false;
      return true;
    });
  }, [items, q, tier, state]);

  const act = async (c: Clinic, body: object, okMsg = "Bajarildi") => {
    setBusy(c.id);
    try {
      const r = await api<{ credentials?: { username: string; password: string }; redirect?: string }>(
        "/api/admin/clinics", { method: "PATCH", json: { id: c.id, ...body } }
      );
      if (r.credentials) setCreds(r.credentials);
      if (r.redirect) { router.push(r.redirect); router.refresh(); return; }
      show(okMsg);
      load();
    } catch (e) {
      show((e as Error).message, true);
    } finally {
      setBusy(null);
    }
  };

  const openEdit = async (c: Clinic) => {
    setEditFor(c); setForm(null);
    try {
      const d = await api<{ clinic: Full }>(`/api/clinics/${c.slug}`);
      setForm({
        name: d.clinic.name, slug: c.slug, description: d.clinic.description ?? "",
        address: d.clinic.address, district: d.clinic.district, phone: d.clinic.phone,
        lat: d.clinic.lat, lng: d.clinic.lng,
        is247: d.clinic.is247, emergency: d.clinic.emergency,
        childFriendly: d.clinic.childFriendly, showDoctors: d.clinic.showDoctors,
      });
    } catch {
      show("Klinika ma'lumoti yuklanmadi", true);
      setEditFor(null);
    }
  };

  const saveEdit = async () => {
    if (!editFor || !form) return;
    await act(editFor, { action: "edit", fields: form }, "Saqlandi");
    setEditFor(null);
  };

  const remove = async (c: Clinic) => {
    const typed = prompt(
      [
        `"${c.name}" arxivga o'tkaziladi.`,
        "",
        `O'CHADI: ${c.doctors} shifokor, suhbatlar, narxlar va barcha rasmlar`,
        "(diskdan ham), xodim hisoblari — klinika boshqa kira olmaydi.",
        "",
        `QOLADI: ${c.appointments} yozuv va ${c.reviews} sharh — bemorlar o'z`,
        "tarixini yo'qotmasligi uchun. Klinika hech qanday ro'yxatda ko'rinmaydi.",
        "",
        "Bu amalni qaytarib bo'lmaydi. Tasdiqlash uchun klinika nomini aynan yozing:",
      ].join("\n"),
      ""
    );
    if (typed === null) return;
    setBusy(c.id);
    try {
      await api(`/api/admin/clinics?id=${c.id}&confirm=${encodeURIComponent(typed)}`, { method: "DELETE" });
      show("Klinika arxivga o'tkazildi");
      load();
    } catch (e) {
      show((e as Error).message, true);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-extrabold">
          Klinikalar <span className="text-[15px] font-semibold text-zinc-400">{shown.length}</span>
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Nom, tuman yoki login"
            className="w-56 rounded-xl border border-zinc-200 px-3.5 py-2 text-[13.5px] outline-none focus:border-teal-500"
          />
          <select value={tier} onChange={(e) => setTier(e.target.value)}
            className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-[13px]">
            <option value="">Barcha tarif</option>
            <option value="FREE">FREE</option>
            <option value="PRO">PRO</option>
          </select>
          <select value={state} onChange={(e) => setState(e.target.value)}
            className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-[13px]">
            <option value="">Barcha holat</option>
            <option value="active">Faol</option>
            <option value="off">Shartnoma bekor</option>
            <option value="unverified">Tekshirilmagan</option>
            <option value="noPhoto">Rasmsiz</option>
          </select>
          {(q || tier || state) && (
            <button onClick={() => { setQ(""); setTier(""); setState(""); }}
              className="rounded-xl border border-zinc-200 px-3 py-2 text-[12.5px] font-semibold text-zinc-600">
              Tozalash
            </button>
          )}
        </div>
      </div>

      {creds && (
        <div className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-4">
          <p className="text-[13.5px] font-bold text-amber-900">Yangi parol — bir marta ko&apos;rsatiladi</p>
          <p className="mt-1 font-mono text-[15px] text-amber-900">
            {creds.username} / {creds.password}
          </p>
          <button onClick={() => setCreds(null)} className="mt-2 text-[12.5px] font-semibold text-amber-800 underline">
            Yozib oldim, yopish
          </button>
        </div>
      )}

      <div className="mt-4">
        {!items ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : shown.length === 0 ? (
          <EmptyState icon="🏥" title="Klinika topilmadi" subtitle="Boshqa so'rov bilan urinib ko'ring" />
        ) : (
          <div className="space-y-1.5">
            {shown.map((c) => (
              <div key={c.id} className="rounded-xl border border-zinc-100 bg-white">
                {/* Ixcham qator — bir qarashda hammasi ko'rinadi */}
                <button
                  onClick={() => setOpenId(openId === c.id ? null : c.id)}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left"
                >
                  <Cover hue={200} name={c.name} photoUrl={c.photoUrl} className="h-9 w-9 shrink-0 rounded-lg text-[13px]" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-[14px] font-bold">{c.name}</span>
                      {c.tier === "PRO" && <Badge color="amber">PRO</Badge>}
                      {c.verified && <Badge color="emerald">✓</Badge>}
                      {c.deactivated && <Badge color="red">bekor</Badge>}
                      {!c.photoUrl && <Badge color="zinc">rasmsiz</Badge>}
                    </div>
                    <p className="truncate text-[12px] text-zinc-500">
                      {c.district} · ★{c.rating.toFixed(1)} ({c.reviewCount}) · {c.appointments} yozuv ·{" "}
                      <span className="font-mono">{c.username ?? "—"}</span>
                    </p>
                  </div>
                  <svg
                    width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    className={`shrink-0 text-zinc-400 transition ${openId === c.id ? "rotate-180" : ""}`}
                  >
                    <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                {openId === c.id && (
                <div className="flex flex-wrap gap-1.5 border-t border-zinc-100 px-3 py-2.5">
                  <Link href={`/klinika/${c.slug}`}
                    className="rounded-lg border border-zinc-300 px-3 py-1.5 text-[12px] font-semibold">
                    Sahifasi
                  </Link>
                  <button onClick={() => openEdit(c)} disabled={busy === c.id}
                    className="rounded-lg bg-teal-600 px-3 py-1.5 text-[12px] font-bold text-white disabled:opacity-40">
                    Tahrirlash
                  </button>
                  <button onClick={() => act(c, { action: "impersonate" })} disabled={busy === c.id}
                    className="rounded-lg border border-zinc-300 px-3 py-1.5 text-[12px] font-semibold disabled:opacity-40">
                    Panelga kirish
                  </button>
                  <button onClick={() => act(c, { action: c.verified ? "unverify" : "verify" })} disabled={busy === c.id}
                    className="rounded-lg border border-zinc-300 px-3 py-1.5 text-[12px] font-semibold disabled:opacity-40">
                    {c.verified ? "Tekshiruvni olib tashlash" : "Tekshirilgan deb belgilash"}
                  </button>
                  <select
                    value={c.tier}
                    onChange={(e) => act(c, { action: "setTier", tier: e.target.value }, `Tarif: ${e.target.value}`)}
                    disabled={busy === c.id}
                    className="rounded-lg border border-zinc-300 px-2 py-1.5 text-[12px] font-semibold outline-none disabled:opacity-40"
                  >
                    {TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <button
                    onClick={() => confirm(`${c.name} uchun yangi parol yaratilsinmi? Eski parol ishlamay qoladi.`) && act(c, { action: "resetPassword" })}
                    disabled={busy === c.id}
                    className="rounded-lg border border-amber-300 px-3 py-1.5 text-[12px] font-semibold text-amber-700 disabled:opacity-40"
                  >
                    Yangi parol
                  </button>
                  <button
                    onClick={() => confirm(c.deactivated
                      ? `${c.name} qaytadan faollashtirilsinmi?`
                      : `${c.name} bilan shartnoma bekor qilinsinmi?

Klinika ro'yxatdan chiqadi, lekin bemorlarning yozuv va sharhlari saqlanib qoladi.`
                    ) && act(c, { action: c.deactivated ? "activate" : "deactivate" })}
                    disabled={busy === c.id}
                    className="rounded-lg border border-amber-400 px-3 py-1.5 text-[12px] font-semibold text-amber-700 disabled:opacity-40">
                    {c.deactivated ? "Qayta faollashtirish" : "Shartnomani bekor qilish"}
                  </button>
                  <button onClick={() => remove(c)} disabled={busy === c.id}
                    className="rounded-lg border border-red-300 px-3 py-1.5 text-[12px] font-semibold text-red-600 disabled:opacity-40">
                    Butunlay o&apos;chirish
                  </button>
                </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tahrirlash oynasi */}
      {editFor && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4" onClick={() => setEditFor(null)}>
          <div className="my-8 w-full max-w-lg rounded-2xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-extrabold">{editFor.name} — tahrirlash</h2>
            {!form ? (
              <div className="flex justify-center py-10"><Spinner /></div>
            ) : (
              <>
                <div className="mt-3 space-y-2.5">
                  {([
                    ["name", "Nomi", "text"],
                    ["slug", "Slug (havoladagi nom)", "text"],
                    ["address", "Manzil", "text"],
                    ["district", "Tuman", "text"],
                    ["phone", "Telefon", "text"],
                  ] as const).map(([key, label]) => (
                    <label key={key} className="block text-[12.5px] text-zinc-500">
                      {label}
                      <input
                        value={String(form[key])}
                        onChange={(e) => setForm((f) => f && { ...f, [key]: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-[14px] text-zinc-900 outline-none focus:border-teal-500"
                      />
                    </label>
                  ))}

                  <label className="block text-[12.5px] text-zinc-500">
                    Tavsif
                    <textarea
                      value={form.description} rows={3}
                      onChange={(e) => setForm((f) => f && { ...f, description: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-[14px] text-zinc-900 outline-none focus:border-teal-500"
                    />
                  </label>

                  <div className="flex gap-2">
                    {([["lat", "Kenglik"], ["lng", "Uzunlik"]] as const).map(([key, label]) => (
                      <label key={key} className="flex-1 text-[12.5px] text-zinc-500">
                        {label}
                        <input
                          type="number" step="0.000001" value={form[key]}
                          onChange={(e) => setForm((f) => f && { ...f, [key]: Number(e.target.value) })}
                          className="mt-1 w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-[14px] text-zinc-900 outline-none focus:border-teal-500"
                        />
                      </label>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-3 pt-1">
                    {([
                      ["is247", "24/7"],
                      ["emergency", "Shoshilinch"],
                      ["childFriendly", "Bolalar"],
                      ["showDoctors", "Shifokorlar ko'rinsin"],
                    ] as const).map(([key, label]) => (
                      <label key={key} className="flex items-center gap-1.5 text-[13px]">
                        <input
                          type="checkbox" checked={form[key]}
                          onChange={(e) => setForm((f) => f && { ...f, [key]: e.target.checked })}
                          className="h-4 w-4 accent-teal-600"
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <button onClick={saveEdit} disabled={busy === editFor.id}
                    className="flex-1 rounded-xl bg-teal-600 py-2.5 font-bold text-white disabled:opacity-40">
                    Saqlash
                  </button>
                  <button onClick={() => setEditFor(null)}
                    className="rounded-xl border border-zinc-200 px-5 py-2.5 font-semibold">
                    Bekor
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {toast && <Toast message={toast.msg} error={toast.error} />}
    </div>
  );
}
