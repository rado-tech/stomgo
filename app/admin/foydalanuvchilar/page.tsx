"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";
import { Badge, Spinner, EmptyState, Toast } from "@/components/ui";
import { fmtDate } from "@/lib/format";

type U = {
  id: string; name: string | null; phone: string; role: string;
  gender: string | null; birthYear: number | null; clinic: string | null;
  telegramUlangan: boolean; blocked: boolean;
  yozuvlar: number; sharhlar: number; qurilmalar: number; createdAt: string;
};

const ROLES: [string, string][] = [
  ["PATIENT", "Bemorlar"],
  ["CLINIC", "Klinika hisoblari"],
  ["ADMIN", "Adminlar"],
  ["all", "Hammasi"],
];

/** Foydalanuvchilarni boshqarish: qidirish, tahrirlash, bloklash, o'chirish */
export default function AdminUsersPage() {
  const [items, setItems] = useState<U[] | null>(null);
  const [role, setRole] = useState("PATIENT");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; error?: boolean } | null>(null);
  const [editFor, setEditFor] = useState<U | null>(null);
  const [form, setForm] = useState({ name: "", gender: "", birthYear: "" });

  const load = useCallback(() => {
    setItems(null);
    api<{ items: U[] }>(`/api/admin/users?role=${role}&q=${encodeURIComponent(q)}`)
      .then((d) => setItems(d.items))
      .catch(() => setItems([]));
  }, [role, q]);

  useEffect(() => { const t = setTimeout(load, q ? 350 : 0); return () => clearTimeout(t); }, [load, q]);

  const show = (msg: string, error?: boolean) => {
    setToast({ msg, error });
    setTimeout(() => setToast(null), 4500);
  };

  const act = async (u: U, body: object) => {
    setBusy(u.id);
    try {
      await api("/api/admin/users", { method: "PATCH", json: { id: u.id, ...body } });
      show("Bajarildi");
      load();
    } catch (e) {
      show((e as Error).message, true);
    } finally {
      setBusy(null);
    }
  };

  const remove = async (u: U) => {
    const typed = prompt(
      `${u.name ?? u.phone} va uning BARCHA ma'lumotlari (yozuvlar, sharhlar, suhbatlar) o'chiriladi.\n\nTasdiqlash uchun raqamni yozing:`,
      ""
    );
    if (typed === null) return;
    setBusy(u.id);
    try {
      await api(`/api/admin/users?id=${u.id}&confirm=${encodeURIComponent(typed)}`, { method: "DELETE" });
      show("O'chirildi");
      load();
    } catch (e) {
      show((e as Error).message, true);
    } finally {
      setBusy(null);
    }
  };

  const openEdit = (u: U) => {
    setEditFor(u);
    setForm({ name: u.name ?? "", gender: u.gender ?? "", birthYear: u.birthYear ? String(u.birthYear) : "" });
  };

  const saveEdit = async () => {
    if (!editFor) return;
    await act(editFor, {
      action: "edit",
      fields: {
        name: form.name,
        gender: form.gender,
        birthYear: form.birthYear ? Number(form.birthYear) : null,
      },
    });
    setEditFor(null);
  };

  return (
    <div>
      <h1 className="text-xl font-extrabold">Foydalanuvchilar</h1>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {ROLES.map(([key, label]) => (
          <button
            key={key} onClick={() => setRole(key)}
            className={`rounded-full px-3.5 py-2 text-[13px] font-semibold transition ${
              role === key ? "bg-teal-600 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            {label}
          </button>
        ))}
        <input
          value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Ism yoki raqam bo'yicha qidirish"
          className="ml-auto w-64 rounded-xl border border-zinc-200 px-3.5 py-2 text-[13.5px] outline-none focus:border-teal-500"
        />
      </div>

      <div className="mt-4 overflow-x-auto">
        {!items ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : items.length === 0 ? (
          <EmptyState icon="👤" title="Topilmadi" subtitle="Boshqa filtr yoki so'rov bilan urinib ko'ring" />
        ) : (
          <table className="w-full min-w-[820px] border-separate border-spacing-y-2 text-[13.5px]">
            <thead>
              <tr className="text-left text-[12px] uppercase tracking-wide text-zinc-400">
                <th className="px-3 pb-1 font-semibold">Foydalanuvchi</th>
                <th className="px-3 pb-1 font-semibold">Rol</th>
                <th className="px-3 pb-1 font-semibold">Faollik</th>
                <th className="px-3 pb-1 font-semibold">Qo&apos;shilgan</th>
                <th className="px-3 pb-1 font-semibold">Amallar</th>
              </tr>
            </thead>
            <tbody>
              {items.map((u) => (
                <tr key={u.id} className="bg-white [&>td]:border-y [&>td]:border-zinc-100 [&>td]:px-3 [&>td]:py-2.5 [&>td:first-child]:rounded-l-xl [&>td:first-child]:border-l [&>td:last-child]:rounded-r-xl [&>td:last-child]:border-r">
                  <td>
                    <p className="font-semibold">{u.name ?? "—"}</p>
                    <p className="font-mono text-[12.5px] text-zinc-500">{u.phone}</p>
                    {u.blocked && <Badge color="red">Bloklangan</Badge>}
                  </td>
                  <td>
                    <Badge color={u.role === "ADMIN" ? "violet" : u.role === "CLINIC" ? "teal" : "zinc"}>{u.role}</Badge>
                    {u.clinic && <p className="mt-1 text-[12px] text-zinc-500">{u.clinic}</p>}
                  </td>
                  <td className="text-[12.5px] text-zinc-600">
                    {u.yozuvlar} yozuv · {u.sharhlar} sharh
                    <p className="text-[12px] text-zinc-400">
                      {u.telegramUlangan ? "Telegram ✓" : "Telegram —"} · {u.qurilmalar} qurilma
                    </p>
                  </td>
                  <td className="text-[12.5px] text-zinc-500">{fmtDate(u.createdAt)}</td>
                  <td>
                    <div className="flex flex-wrap gap-1.5">
                      <button onClick={() => openEdit(u)} disabled={busy === u.id}
                        className="rounded-lg border border-zinc-200 px-2.5 py-1.5 text-[12px] font-semibold disabled:opacity-40">
                        Tahrirlash
                      </button>
                      <button
                        onClick={() => act(u, { action: u.blocked ? "unblock" : "block" })}
                        disabled={busy === u.id || u.role === "ADMIN"}
                        className="rounded-lg border border-amber-300 px-2.5 py-1.5 text-[12px] font-semibold text-amber-700 disabled:opacity-40"
                      >
                        {u.blocked ? "Blokdan chiqarish" : "Bloklash"}
                      </button>
                      <button onClick={() => remove(u)} disabled={busy === u.id || u.role === "ADMIN"}
                        className="rounded-lg border border-red-300 px-2.5 py-1.5 text-[12px] font-semibold text-red-600 disabled:opacity-40">
                        O&apos;chirish
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Tahrirlash oynasi */}
      {editFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setEditFor(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-extrabold">Foydalanuvchini tahrirlash</h2>
            <p className="mt-0.5 font-mono text-[12.5px] text-zinc-500">{editFor.phone}</p>

            <label className="mt-3 block text-[13px] text-zinc-500">
              Ism
              <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-[14px] text-zinc-900 outline-none focus:border-teal-500" />
            </label>

            <label className="mt-2.5 block text-[13px] text-zinc-500">
              Jins
              <select value={form.gender} onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-[14px] text-zinc-900 outline-none">
                <option value="">Ko&apos;rsatilmagan</option>
                <option value="MALE">Erkak</option>
                <option value="FEMALE">Ayol</option>
              </select>
            </label>

            <label className="mt-2.5 block text-[13px] text-zinc-500">
              Tug&apos;ilgan yil
              <input type="number" value={form.birthYear}
                onChange={(e) => setForm((f) => ({ ...f, birthYear: e.target.value.replace(/[^\d]/g, "").slice(0, 4) }))}
                placeholder="1990"
                className="mt-1 w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-[14px] text-zinc-900 outline-none focus:border-teal-500" />
            </label>

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
          </div>
        </div>
      )}

      {toast && <Toast message={toast.msg} error={toast.error} />}
    </div>
  );
}
