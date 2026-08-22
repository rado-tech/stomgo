"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";
import { Badge, Sheet, Spinner, Toast, EmptyState } from "@/components/ui";
import UploadButton from "@/components/UploadButton";
import { SPECIALTY_LABELS, VERIFICATION_LABELS } from "@/lib/format";

type Doc = {
  id: string; name: string; gender: string; specialty: string; experienceYears: number;
  education: string; licenseNo: string; verification: string; isPublic: boolean;
  photoUrl: string | null;
};

const SPECIALTIES = Object.keys(SPECIALTY_LABELS);

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState<Doc[] | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Doc | null>(null);
  const [form, setForm] = useState({ name: "", gender: "MALE", specialty: "TERAPEVT", experienceYears: 1, education: "", licenseNo: "", isPublic: true });
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api<{ doctors: Doc[] }>("/api/clinic/doctors").then((d) => setDoctors(d.doctors));
  }, []);
  useEffect(load, [load]);

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2500); };

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", gender: "MALE", specialty: "TERAPEVT", experienceYears: 1, education: "", licenseNo: "", isPublic: true });
    setFormOpen(true);
  };
  const openEdit = (d: Doc) => {
    setEditing(d);
    setForm({
      name: d.name, gender: d.gender, specialty: d.specialty, experienceYears: d.experienceYears,
      education: d.education ?? "", licenseNo: d.licenseNo ?? "", isPublic: d.isPublic,
    });
    setFormOpen(true);
  };

  const save = async () => {
    setBusy(true);
    try {
      if (editing) {
        await api(`/api/clinic/doctors/${editing.id}`, { method: "PATCH", json: form });
      } else {
        await api("/api/clinic/doctors", { json: form });
      }
      setFormOpen(false); load(); showToast("Saqlandi");
    } catch (e) {
      showToast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (d: Doc) => {
    if (!confirm(`${d.name} o'chirilsinmi?`)) return;
    await api(`/api/clinic/doctors/${d.id}`, { method: "DELETE" });
    load(); showToast("O'chirildi");
  };

  if (!doctors) return <div className="flex justify-center py-20"><Spinner /></div>;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold">Shifokorlar</h1>
          <p className="text-[13px] text-zinc-500">Siz qo&apos;shgan shifokor &quot;Klinika tasdiqlagan&quot; belgisini oladi</p>
        </div>
        <button onClick={openNew} className="rounded-xl bg-teal-600 px-4 py-2.5 font-bold text-white">+ Qo&apos;shish</button>
      </div>

      {doctors.length === 0 ? (
        <EmptyState icon="🧑‍⚕️" title="Shifokorlar qo'shilmagan" />
      ) : (
        <div className="space-y-2">
          {doctors.map((d) => (
            <div key={d.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-zinc-100 bg-white p-3.5">
              {d.photoUrl ? (
                <div className="h-11 w-11 overflow-hidden rounded-full bg-zinc-100"
                  style={{ backgroundImage: `url(${d.photoUrl})`, backgroundSize: "cover", backgroundPosition: "center" }}
                  role="img" aria-label={d.name} />
              ) : (
                <div className={`flex h-11 w-11 items-center justify-center rounded-full text-lg font-bold text-white ${d.gender === "FEMALE" ? "bg-pink-400" : "bg-sky-500"}`}>
                  {d.name[0]}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{d.name} {d.gender === "FEMALE" && <span className="text-pink-500">♀</span>}</p>
                <p className="text-[12.5px] text-zinc-500">
                  {SPECIALTY_LABELS[d.specialty] ?? d.specialty} · {d.experienceYears} yil
                </p>
              </div>
              <Badge color={d.verification === "DOC_VERIFIED" ? "teal" : "zinc"}>{VERIFICATION_LABELS[d.verification]}</Badge>
              {!d.isPublic && <Badge color="amber">Yashirilgan</Badge>}
              <div className="flex flex-wrap gap-1.5">
                <UploadButton target="doctor" doctorId={d.id} label={d.photoUrl ? "Rasm ↺" : "Rasm +"}
                  onDone={() => { load(); showToast("Rasm yuklandi"); }} />
                <button onClick={() => openEdit(d)} className="rounded-lg border border-zinc-200 px-3 py-1.5 text-[12.5px] font-semibold">Tahrirlash</button>
                <button onClick={() => remove(d)} className="rounded-lg border border-red-200 px-3 py-1.5 text-[12.5px] font-semibold text-red-600">O&apos;chirish</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Sheet open={formOpen} onClose={() => setFormOpen(false)} title={editing ? "Shifokorni tahrirlash" : "Shifokor qo'shish"}>
        <div className="space-y-3">
          <input
            value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="F.I.Sh" className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-[14px] outline-none focus:border-teal-500"
          />
          <div className="flex gap-2">
            {(["MALE", "FEMALE"] as const).map((g) => (
              <button key={g} onClick={() => setForm((f) => ({ ...f, gender: g }))}
                className={`flex-1 rounded-xl border py-2.5 text-[13.5px] font-medium ${form.gender === g ? "border-teal-600 bg-teal-50 text-teal-800" : "border-zinc-200"}`}>
                {g === "MALE" ? "Erkak" : "Ayol"}
              </button>
            ))}
          </div>
          <select
            value={form.specialty} onChange={(e) => setForm((f) => ({ ...f, specialty: e.target.value }))}
            className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-[14px] outline-none"
          >
            {SPECIALTIES.map((s) => <option key={s} value={s}>{SPECIALTY_LABELS[s]}</option>)}
          </select>
          <label className="block text-[13px] text-zinc-500">
            Tajriba (yil)
            <input
              type="number" min={0} max={60} value={form.experienceYears}
              onChange={(e) => setForm((f) => ({ ...f, experienceYears: parseInt(e.target.value, 10) || 0 }))}
              className="mt-1 w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-[14px] text-zinc-900 outline-none"
            />
          </label>
          <input
            value={form.education} onChange={(e) => setForm((f) => ({ ...f, education: e.target.value }))}
            placeholder="Ta'lim (masalan: Toshkent davlat stomatologiya instituti)"
            className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-[14px] outline-none focus:border-teal-500"
          />
          <input
            value={form.licenseNo} onChange={(e) => setForm((f) => ({ ...f, licenseNo: e.target.value }))}
            placeholder="Diplom/litsenziya raqami (tekshiruv uchun)"
            className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-[14px] outline-none focus:border-teal-500"
          />
          <label className="flex cursor-pointer items-center gap-2.5 text-[14px]">
            <input type="checkbox" checked={form.isPublic}
              onChange={(e) => setForm((f) => ({ ...f, isPublic: e.target.checked }))}
              className="h-4 w-4 accent-teal-600" />
            Bemorlar ilovasida ko&apos;rsatilsin
          </label>
          <button disabled={busy || !form.name.trim()} onClick={save}
            className="w-full rounded-2xl bg-teal-600 py-3 font-bold text-white disabled:opacity-40">
            Saqlash
          </button>
        </div>
      </Sheet>

      {toast && <Toast message={toast} />}
    </div>
  );
}
