"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";
import { Badge, Spinner, EmptyState, Toast } from "@/components/ui";
import { CATEGORIES, CATEGORY_LABELS } from "@/lib/categories";

type Svc = {
  id: string; code: string; name: string; category: string;
  umumiy: boolean; klinika: string | null; ishlatilishi: number;
};

const EMPTY = { name: "", code: "", category: "BOSHQA" };

/** Umumiy xizmatlar katalogi — barcha klinikalar shu ro'yxatdan tanlaydi */
export default function AdminServicesPage() {
  const [items, setItems] = useState<Svc[] | null>(null);
  const [scope, setScope] = useState<"umumiy" | "maxsus" | "all">("umumiy");
  const [form, setForm] = useState(EMPTY);
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", category: "BOSHQA" });
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ msg: string; error?: boolean } | null>(null);

  const load = useCallback(() => {
    setItems(null);
    api<{ items: Svc[] }>("/api/admin/services").then((d) => setItems(d.items)).catch(() => setItems([]));
  }, []);

  useEffect(() => { const t = setTimeout(load, 0); return () => clearTimeout(t); }, [load]);

  const show = (msg: string, error?: boolean) => {
    setToast({ msg, error });
    setTimeout(() => setToast(null), 4500);
  };

  const add = async () => {
    if (!form.name.trim()) return show("Nom kiriting", true);
    if (!form.code.trim()) return show("Kod kiriting", true);
    setBusy(true);
    try {
      await api("/api/admin/services", { json: form });
      setForm(EMPTY); setAdding(false); load();
      show("Qo'shildi");
    } catch (e) { show((e as Error).message, true); } finally { setBusy(false); }
  };

  const saveEdit = async (s: Svc) => {
    setBusy(true);
    try {
      await api("/api/admin/services", { method: "PATCH", json: { id: s.id, ...editForm } });
      setEditId(null); load();
      show("Saqlandi");
    } catch (e) { show((e as Error).message, true); } finally { setBusy(false); }
  };

  const remove = async (s: Svc) => {
    if (!confirm(
      `"${s.name}" katalogdan o'chiriladi.\n\n${s.ishlatilishi} ta klinikadagi narxi ham o'chadi. Davom etilsinmi?`
    )) return;
    setBusy(true);
    try {
      await api(`/api/admin/services?id=${s.id}`, { method: "DELETE" });
      load();
      show("O'chirildi");
    } catch (e) { show((e as Error).message, true); } finally { setBusy(false); }
  };

  const shown = (items ?? []).filter((s) =>
    scope === "all" ? true : scope === "umumiy" ? s.umumiy : !s.umumiy
  );

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold">Xizmatlar katalogi</h1>
          <p className="mt-1 max-w-xl text-[13.5px] leading-relaxed text-zinc-500">
            <b>Umumiy</b> xizmatlarni barcha klinikalar ro&apos;yxatdan tanlaydi.
            <b> Maxsus</b> — klinika o&apos;zi qo&apos;shgani, faqat o&apos;shanda ko&apos;rinadi.
          </p>
        </div>
        <button onClick={() => setAdding((v) => !v)}
          className="rounded-xl bg-teal-600 px-4 py-2.5 text-[13.5px] font-bold text-white">
          {adding ? "Yopish" : "+ Umumiy xizmat qo'shish"}
        </button>
      </div>

      {adding && (
        <div className="mt-4 rounded-2xl border border-teal-200 bg-teal-50/40 p-4">
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-[12.5px] text-zinc-500">
              Nom
              <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Masalan: Parodontologik tozalash"
                className="mt-1 block w-64 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-[13.5px] text-zinc-900 outline-none" />
            </label>
            <label className="text-[12.5px] text-zinc-500">
              Kod (lotin, _)
              <input value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") }))}
                placeholder="parodontologik_tozalash"
                className="mt-1 block w-56 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 font-mono text-[13px] text-zinc-900 outline-none" />
            </label>
            <label className="text-[12.5px] text-zinc-500">
              Turkum
              <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="mt-1 block rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-[13.5px] text-zinc-900 outline-none">
                {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c] ?? c}</option>)}
              </select>
            </label>
            <button onClick={add} disabled={busy}
              className="rounded-xl bg-teal-600 px-5 py-2.5 text-[13.5px] font-bold text-white disabled:opacity-40">
              Qo&apos;shish
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 flex gap-1.5">
        {([["umumiy", "Umumiy"], ["maxsus", "Klinika maxsus"], ["all", "Hammasi"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setScope(k)}
            className={`rounded-full px-3.5 py-2 text-[13px] font-semibold transition ${
              scope === k ? "bg-teal-600 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}>
            {l}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {!items ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : shown.length === 0 ? (
          <EmptyState icon="🦷" title="Xizmat yo'q" subtitle="Boshqa bo'limni tanlang" />
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {shown.map((s) => (
              <div key={s.id} className="rounded-xl border border-zinc-100 bg-white p-3">
                {editId === s.id ? (
                  <div className="flex flex-wrap items-end gap-2">
                    <input value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                      className="flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-[13.5px] outline-none" />
                    <select value={editForm.category} onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))}
                      className="rounded-lg border border-zinc-200 px-2 py-2 text-[13px] outline-none">
                      {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c] ?? c}</option>)}
                    </select>
                    <button onClick={() => saveEdit(s)} disabled={busy}
                      className="rounded-lg bg-teal-600 px-3 py-2 text-[12px] font-bold text-white disabled:opacity-40">Saqlash</button>
                    <button onClick={() => setEditId(null)}
                      className="rounded-lg border border-zinc-200 px-3 py-2 text-[12px] font-semibold">Bekor</button>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{s.name}</p>
                      <p className="truncate font-mono text-[11.5px] text-zinc-400">{s.code}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <Badge color="zinc">{CATEGORY_LABELS[s.category] ?? s.category}</Badge>
                        {s.umumiy ? <Badge color="teal">Umumiy</Badge> : <Badge color="amber">{s.klinika}</Badge>}
                        <span className="text-[11.5px] text-zinc-400">{s.ishlatilishi} klinikada</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      <button
                        onClick={() => { setEditId(s.id); setEditForm({ name: s.name, category: s.category }); }}
                        className="rounded-lg border border-zinc-200 px-2.5 py-1.5 text-[12px] font-semibold"
                      >
                        Tahrir
                      </button>
                      <button onClick={() => remove(s)} disabled={busy}
                        className="rounded-lg border border-red-300 px-2.5 py-1.5 text-[12px] font-semibold text-red-600 disabled:opacity-40">
                        O&apos;chirish
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {toast && <Toast message={toast.msg} error={toast.error} />}
    </div>
  );
}
