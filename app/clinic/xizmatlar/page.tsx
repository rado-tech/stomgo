"use client";

import { useEffect, useState } from "react";
import { CATEGORY_LABELS } from "@/lib/categories";
import { api } from "@/lib/client";
import { Spinner, Toast } from "@/components/ui";

type Svc = { serviceId: string; code: string; name: string; category: string; isCustom: boolean; enabled: boolean; priceMin: number; priceMax: number };


/** Narx chegaralari — server bilan bir xil */
const PRICE_MIN = 1_000;
const PRICE_MAX = 500_000_000;

const nf = (n: number) => n.toLocaleString("ru-RU");

/** Manfiy belgi, kasr va eksponentani klaviaturadayoq to'xtatamiz */
function blockSign(e: React.KeyboardEvent<HTMLInputElement>) {
  if (["-", "+", "e", "E", ",", "."].includes(e.key)) e.preventDefault();
}

/** Faqat raqamlar; bo'sh bo'lsa 0 */
function digits(v: string): number {
  const d = v.replace(/[^\d]/g, "");
  return d ? Number(d) : 0;
}

/** Bitta xizmat narxini tekshirish — xato bo'lsa sababi qaytadi */
function priceProblem(label: string, min: number, max: number): string | null {
  if (!min) return `${label}: narx kiritilmagan`;
  if (min < PRICE_MIN) return `${label}: narx kamida ${nf(PRICE_MIN)} so'm bo'lsin`;
  if (min > PRICE_MAX) return `${label}: narx ko'pi bilan ${nf(PRICE_MAX)} so'm bo'lsin`;
  if (max && max > PRICE_MAX) return `${label}: yuqori narx ko'pi bilan ${nf(PRICE_MAX)} so'm bo'lsin`;
  if (max && max < min) return `${label}: yuqori narx (${nf(max)}) past narxdan (${nf(min)}) kichik bo'lmasin`;
  return null;
}

const EMPTY_CUSTOM = { name: "", category: "BOSHQA", priceMin: "", priceMax: "" };

export default function ServicesPage() {
  const [services, setServices] = useState<Svc[] | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [custom, setCustom] = useState(EMPTY_CUSTOM);
  const [customOpen, setCustomOpen] = useState(false);

  const load = () => {
    api<{ services: Svc[] }>("/api/clinic/services").then((d) => setServices(d.services));
  };
  useEffect(load, []);

  const addCustom = async () => {
    const name = custom.name.trim();
    if (!name) { setToast("Xizmat nomini kiriting"); setTimeout(() => setToast(null), 4000); return; }

    const problem = priceProblem(name, Number(custom.priceMin || 0), Number(custom.priceMax || 0));
    if (problem) { setToast(problem); setTimeout(() => setToast(null), 5000); return; }

    setSaving(true);
    try {
      await api("/api/clinic/services", { json: { ...custom, name } });
      setCustom(EMPTY_CUSTOM);
      setCustomOpen(false);
      load();
      setToast("Xizmat qo'shildi");
      setTimeout(() => setToast(null), 2500);
    } catch (e) {
      // Xato sababi serverdan keladi — foydalanuvchi o'qib ulgursin
      setToast((e as Error).message);
      setTimeout(() => setToast(null), 5000);
    } finally {
      setSaving(false);
    }
  };

  const removeCustom = async (s: Svc) => {
    if (!confirm(`"${s.name}" o'chirilsinmi?`)) return;
    await api(`/api/clinic/services?id=${s.serviceId}`, { method: "DELETE" });
    load();
  };

  const update = (id: string, patch: Partial<Svc>) =>
    setServices((s) => s!.map((x) => (x.serviceId === id ? { ...x, ...patch } : x)));

  const save = async () => {
    // Serverga yubormasdan oldin tekshiramiz — xato bo'lsa hech narsa saqlanmaydi
    for (const s of services ?? []) {
      if (!s.enabled) continue;
      const problem = priceProblem(s.name, s.priceMin, s.priceMax);
      if (problem) {
        setToast(problem);
        setTimeout(() => setToast(null), 5000);
        return;
      }
    }

    setSaving(true);
    try {
      await api("/api/clinic/services", { method: "PUT", json: { services } });
      setToast("Saqlandi");
      setTimeout(() => setToast(null), 2500);
    } catch (e) {
      setToast((e as Error).message);
      setTimeout(() => setToast(null), 5000);
    } finally {
      setSaving(false);
    }
  };

  if (!services) return <div className="flex justify-center py-20"><Spinner /></div>;

  const byCat: Record<string, Svc[]> = {};
  for (const s of services) (byCat[s.category] ??= []).push(s);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="sticky top-0 z-20 -mx-1 mb-4 flex items-center justify-between rounded-b-2xl bg-white/95 px-1 py-3 backdrop-blur">
        <div>
          <h1 className="text-xl font-extrabold">Xizmatlar va narxlar</h1>
          <p className="text-[13px] text-zinc-500">
            Narxlar so&apos;mda, &quot;dan – gacha&quot; diapazon · {nf(PRICE_MIN)} – {nf(PRICE_MAX)} oralig&apos;ida, butun son
          </p>
        </div>
        <button onClick={save} disabled={saving}
          className="rounded-xl bg-teal-600 px-5 py-2.5 font-bold text-white disabled:opacity-50">
          {saving ? "..." : "Saqlash"}
        </button>
      </div>

      <div className="space-y-4">
        {Object.entries(byCat).map(([cat, items]) => (
          <section key={cat} className="rounded-2xl border border-zinc-100 bg-white p-4">
            <h2 className="mb-2 text-[12px] font-bold uppercase tracking-wide text-teal-700">{CATEGORY_LABELS[cat] ?? cat}</h2>
            <div className="space-y-2">
              {items.map((s) => (
                <div key={s.serviceId} className="flex flex-wrap items-center gap-3 border-b border-zinc-50 pb-2 last:border-0">
                  <label className="flex min-w-48 flex-1 cursor-pointer items-center gap-2.5">
                    <input
                      type="checkbox" checked={s.enabled}
                      onChange={(e) => update(s.serviceId, { enabled: e.target.checked })}
                      className="h-4 w-4 accent-teal-600"
                    />
                    <span className={`text-[14px] ${s.enabled ? "font-medium" : "text-zinc-400"}`}>{s.name}</span>
                    {s.isCustom && (
                      <>
                        <span className="rounded bg-teal-50 px-1.5 py-0.5 text-[10px] font-bold text-teal-700">SIZNIKI</span>
                        <button onClick={(e) => { e.preventDefault(); void removeCustom(s); }}
                          className="text-[12px] font-semibold text-red-500">o&apos;chirish</button>
                      </>
                    )}
                  </label>
                  {s.enabled && (
                    <div className="flex items-center gap-1.5 text-[13px]">
                      <input
                        type="number" inputMode="numeric" min={PRICE_MIN} max={PRICE_MAX} step={1000}
                        value={s.priceMin || ""} placeholder="dan"
                        onKeyDown={blockSign}
                        onChange={(e) => update(s.serviceId, { priceMin: digits(e.target.value) })}
                        className="w-28 rounded-lg border border-zinc-200 px-2 py-1.5 outline-none focus:border-teal-500"
                      />
                      <span className="text-zinc-400">–</span>
                      <input
                        type="number" inputMode="numeric" min={PRICE_MIN} max={PRICE_MAX} step={1000}
                        value={s.priceMax || ""} placeholder="gacha"
                        onKeyDown={blockSign}
                        onChange={(e) => update(s.serviceId, { priceMax: digits(e.target.value) })}
                        className="w-28 rounded-lg border border-zinc-200 px-2 py-1.5 outline-none focus:border-teal-500"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Maxsus xizmat qo'shish */}
      <section className="mt-4 rounded-2xl border border-dashed border-teal-300 bg-teal-50/40 p-4">
        {!customOpen ? (
          <button onClick={() => setCustomOpen(true)} className="w-full py-1 text-left text-[14px] font-bold text-teal-700">
            + Ro&apos;yxatda yo&apos;q xizmatni qo&apos;shish
          </button>
        ) : (
          <div className="space-y-2.5">
            <p className="text-[13.5px] font-bold text-teal-800">O&apos;z xizmatingiz</p>
            <input
              value={custom.name} onChange={(e) => setCustom((c) => ({ ...c, name: e.target.value }))}
              placeholder="Xizmat nomi (masalan: Lazer bilan oqartirish)"
              className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-[14px] outline-none focus:border-teal-500"
            />
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={custom.category} onChange={(e) => setCustom((c) => ({ ...c, category: e.target.value }))}
                className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-[13px] outline-none"
              >
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <input
                type="number" inputMode="numeric" min={PRICE_MIN} max={PRICE_MAX} step={1000}
                value={custom.priceMin} placeholder="Narx dan"
                onKeyDown={blockSign}
                onChange={(e) => setCustom((c) => ({ ...c, priceMin: e.target.value.replace(/[^\d]/g, "") }))}
                className="w-28 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-[13px] outline-none"
              />
              <span className="text-zinc-400">–</span>
              <input
                type="number" inputMode="numeric" min={PRICE_MIN} max={PRICE_MAX} step={1000}
                value={custom.priceMax} placeholder="gacha"
                onKeyDown={blockSign}
                onChange={(e) => setCustom((c) => ({ ...c, priceMax: e.target.value.replace(/[^\d]/g, "") }))}
                className="w-28 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-[13px] outline-none"
              />
              <span className="text-[12px] text-zinc-400">so&apos;m</span>
            </div>
            <div className="flex gap-2">
              <button onClick={addCustom} disabled={saving || !custom.name.trim() || !custom.priceMin}
                className="rounded-xl bg-teal-600 px-5 py-2.5 text-[13px] font-bold text-white disabled:opacity-40">
                Qo&apos;shish
              </button>
              <button onClick={() => setCustomOpen(false)} className="rounded-xl border border-zinc-200 px-5 py-2.5 text-[13px] font-semibold">
                Bekor
              </button>
            </div>
          </div>
        )}
      </section>

      {toast && <Toast message={toast} />}
    </div>
  );
}
