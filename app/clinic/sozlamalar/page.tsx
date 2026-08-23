"use client";

import Link from "next/link";
import TimeInput from "@/components/TimeInput";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { api } from "@/lib/client";
import { Badge, Spinner, Toast } from "@/components/ui";
import TelegramLink from "@/components/TelegramLink";
import UploadButton from "@/components/UploadButton";

const LocationPicker = dynamic(() => import("@/components/LocationPicker"), { ssr: false });

type Profile = {
  name: string; description: string; address: string; district: string; phone: string;
  lat: number; lng: number; photoUrl: string | null;
  workingHours: Record<string, [string, string][]>;
  is247: boolean; emergency: boolean; childFriendly: boolean; showDoctors: boolean;
  tier: string; tierEndsAt: string | null; checkinCode: string;
  infoConfirmedAt: string; infoStale: boolean;
};

const DAYS: [string, string][] = [
  ["mon", "Dushanba"], ["tue", "Seshanba"], ["wed", "Chorshanba"], ["thu", "Payshanba"],
  ["fri", "Juma"], ["sat", "Shanba"], ["sun", "Yakshanba"],
];

const DISTRICTS = [
  "Bektemir", "Chilonzor", "Mirobod", "Mirzo Ulug'bek", "Olmazor", "Sergeli",
  "Shayxontohur", "Uchtepa", "Yakkasaroy", "Yashnobod", "Yunusobod", "Yangihayot",
];

type GalleryPhoto = { id: string; url: string };

export default function SettingsPage() {
  const [p, setP] = useState<Profile | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [gallery, setGallery] = useState<GalleryPhoto[]>([]);

  const loadGallery = () => {
    api<{ photos: GalleryPhoto[] }>("/api/clinic/gallery").then((d) => setGallery(d.photos)).catch(() => {});
  };

  useEffect(() => {
    api<{ clinic: Profile }>("/api/clinic/profile").then((d) => setP(d.clinic));
    loadGallery();
  }, []);

  const deleteGalleryPhoto = async (id: string) => {
    if (!confirm("Rasm o'chirilsinmi?")) return;
    await api(`/api/clinic/gallery?id=${id}`, { method: "DELETE" });
    loadGallery();
  };

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2500); };

  const save = async (extra?: object) => {
    if (!p) return;
    setSaving(true);
    try {
      await api("/api/clinic/profile", {
        method: "PATCH",
        json: {
          name: p.name, description: p.description, address: p.address, district: p.district,
          phone: p.phone, lat: p.lat, lng: p.lng, workingHours: p.workingHours,
          is247: p.is247, emergency: p.emergency, childFriendly: p.childFriendly,
          showDoctors: p.showDoctors, ...extra,
        },
      });
      showToast("Saqlandi");
      if (extra) {
        const d = await api<{ clinic: Profile }>("/api/clinic/profile");
        setP(d.clinic);
      }
    } catch (e) {
      showToast((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (!p) return <div className="flex justify-center py-20"><Spinner /></div>;

  const setDay = (key: string, ranges: [string, string][]) =>
    setP({ ...p, workingHours: { ...p.workingHours, [key]: ranges } });

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-4 text-xl font-extrabold">{p.name} — sozlamalar</h1>

      {p.infoStale && (
        <div className="mb-4 flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-[13.5px] text-amber-800">
            Ma&apos;lumotlaringiz 60 kundan beri tasdiqlanmagan. Dolzarbligini tasdiqlang.
          </p>
          <button onClick={() => save({ confirmInfo: true })} className="shrink-0 rounded-xl bg-amber-500 px-4 py-2 text-[13px] font-bold text-white">
            Tasdiqlash
          </button>
        </div>
      )}

      <div className="space-y-4">
        {/* Rasm — majburiy */}
        <section className="rounded-2xl border border-zinc-100 bg-white p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Klinika rasmi</h2>
            {p.photoUrl ? <Badge color="emerald">Yuklangan ✓</Badge> : <Badge color="red">Majburiy!</Badge>}
          </div>
          {!p.photoUrl && (
            <p className="mt-1 text-[13px] text-red-600">
              Rasmsiz kartochkangiz bemorlarga kam ishonch uyg&apos;otadi. Klinikaning old tomoni yoki qabul zali rasmini yuklang.
            </p>
          )}
          <div className="mt-3 flex items-center gap-4">
            {p.photoUrl && (
              <div className="h-24 w-40 overflow-hidden rounded-xl bg-zinc-100"
                style={{ backgroundImage: `url(${p.photoUrl})`, backgroundSize: "cover", backgroundPosition: "center" }} />
            )}
            <UploadButton target="clinic" label={p.photoUrl ? "Rasmni almashtirish" : "Rasm yuklash"}
              onDone={(url) => { setP({ ...p, photoUrl: url }); showToast("Rasm yuklandi"); }} />
          </div>

          {/* Galereya — qo'shimcha rasmlar */}
          <div className="mt-4 border-t border-zinc-100 pt-3">
            <p className="text-[13.5px] font-semibold">Foto galereya <span className="font-normal text-zinc-400">({gallery.length}/8)</span></p>
            <p className="text-[12px] text-zinc-400">Kabinetlar, uskunalar, jamoa — bemorlar ishonchini oshiradi</p>
            <div className="mt-2.5 flex flex-wrap gap-2.5">
              {gallery.map((g) => (
                <div key={g.id} className="group relative h-20 w-32 overflow-hidden rounded-xl bg-zinc-100"
                  style={{ backgroundImage: `url(${g.url})`, backgroundSize: "cover", backgroundPosition: "center" }}>
                  <button onClick={() => deleteGalleryPhoto(g.id)}
                    className="absolute right-1 top-1 rounded-full bg-black/60 px-1.5 text-[11px] text-white opacity-80 hover:opacity-100"
                    aria-label="O'chirish">✕</button>
                </div>
              ))}
              {gallery.length < 8 && (
                <UploadButton target="gallery" label="+ Rasm" onDone={() => { loadGallery(); showToast("Galereyaga qo'shildi"); }} />
              )}
            </div>
          </div>
        </section>

        {/* Asosiy ma'lumot */}
        <section className="rounded-2xl border border-zinc-100 bg-white p-4">
          <h2 className="mb-3 font-bold">Asosiy ma&apos;lumot</h2>
          <label className="block text-[13px] text-zinc-500">
            Klinika nomi
            <input
              value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })}
              className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-[14px] text-zinc-900 outline-none focus:border-teal-500"
            />
          </label>
          <label className="mt-3 block text-[13px] text-zinc-500">
            Tavsif
            <textarea
              value={p.description} onChange={(e) => setP({ ...p, description: e.target.value })} rows={3}
              placeholder="Klinikangiz haqida qisqacha: yo'nalishlar, tajriba, afzalliklar..."
              className="mt-1 w-full rounded-xl border border-zinc-200 p-3 text-[14px] text-zinc-900 outline-none focus:border-teal-500"
            />
          </label>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block text-[13px] text-zinc-500">
              Tuman
              <select
                value={p.district} onChange={(e) => setP({ ...p, district: e.target.value })}
                className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-[14px] text-zinc-900 outline-none"
              >
                {!DISTRICTS.includes(p.district) && <option value={p.district}>{p.district}</option>}
                {DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </label>
            <label className="block text-[13px] text-zinc-500">
              Telefon
              <input
                value={p.phone} onChange={(e) => setP({ ...p, phone: e.target.value })}
                className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-[14px] text-zinc-900 outline-none focus:border-teal-500"
              />
            </label>
          </div>
          <label className="mt-3 block text-[13px] text-zinc-500">
            Manzil (ko&apos;cha, uy)
            <input
              value={p.address} onChange={(e) => setP({ ...p, address: e.target.value })}
              className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-[14px] text-zinc-900 outline-none focus:border-teal-500"
            />
          </label>
        </section>

        {/* Joylashuv */}
        <section className="rounded-2xl border border-zinc-100 bg-white p-4">
          <h2 className="mb-1 font-bold">Xaritadagi joylashuv</h2>
          <p className="mb-3 text-[13px] text-zinc-500">
            Bemorlar sizni xaritada shu nuqtada ko&apos;radi va masofa shu nuqtadan hisoblanadi — aniq belgilang.
          </p>
          <LocationPicker lat={p.lat} lng={p.lng} onChange={(lat, lng) => setP((prev) => prev ? { ...prev, lat, lng } : prev)} />
          <p className="mt-2 text-[12px] text-zinc-400">Koordinata: {p.lat.toFixed(5)}, {p.lng.toFixed(5)}</p>
        </section>

        {/* Ish vaqti */}
        <section className="rounded-2xl border border-zinc-100 bg-white p-4">
          <h2 className="mb-3 font-bold">Ish vaqti</h2>
          <div className="space-y-2">
            {DAYS.map(([key, label]) => {
              const ranges = p.workingHours[key] ?? [];
              const open = ranges.length > 0;
              return (
                <div key={key} className="flex flex-wrap items-center gap-3">
                  <label className="flex w-32 cursor-pointer items-center gap-2 text-[14px]">
                    <input
                      type="checkbox" checked={open}
                      onChange={(e) => setDay(key, e.target.checked ? [["09:00", "18:00"]] : [])}
                      className="h-4 w-4 accent-teal-600"
                    />
                    {label}
                  </label>
                  {open ? (
                    <div className="flex items-center gap-1.5">
                      <TimeInput
                        value={ranges[0][0]}
                        onChange={(v) => setDay(key, [[v, ranges[0][1]]])}
                        step={30} ariaLabel="Ochilish vaqti"
                      />
                      <span className="text-zinc-400">–</span>
                      <TimeInput
                        value={ranges[0][1] === "24:00" ? "23:59" : ranges[0][1]}
                        onChange={(v) => setDay(key, [[ranges[0][0], v]])}
                        step={30} ariaLabel="Yopilish vaqti"
                      />
                    </div>
                  ) : (
                    <span className="text-[13px] text-zinc-400">Yopiq</span>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Xususiyatlar */}
        <section className="rounded-2xl border border-zinc-100 bg-white p-4">
          <h2 className="mb-3 font-bold">Xususiyatlar</h2>
          {([
            ["is247", "24/7 ishlaymiz"],
            ["emergency", "Shoshilinch qabul qilamiz"],
            ["childFriendly", "Bolalarni qabul qilamiz"],
            ["showDoctors", "Shifokorlar jamoasi bemorlarga ko'rsatilsin"],
          ] as const).map(([key, label]) => (
            <label key={key} className="flex cursor-pointer items-center justify-between border-b border-zinc-50 py-2.5 text-[14px] last:border-0">
              {label}
              <input
                type="checkbox" checked={p[key]}
                onChange={(e) => setP({ ...p, [key]: e.target.checked })}
                className="h-4 w-4 accent-teal-600"
              />
            </label>
          ))}
        </section>

        <TelegramLink variant="clinic" />

        <section className="rounded-2xl border border-zinc-100 bg-white p-4">
          <h2 className="mb-2 font-bold">Kelganini tasdiqlash</h2>
          <p className="text-[13.5px] leading-relaxed text-zinc-500">
            Bemor resepshndagi <b>QR kodni</b> skanerlab kelganini o&apos;zi tasdiqlaydi.
            Skanerlay olmasa — bu yerdagi yozuvlar ro&apos;yxatidan <b>&laquo;Keldi&raquo;</b> tugmasini bosasiz.
          </p>
          <Link href="/clinic/qr" className="mt-2 inline-block rounded-xl border border-teal-600 px-4 py-2 text-[13px] font-semibold text-teal-700">
            QR kodni ochish va chop etish
          </Link>
        </section>

        <section className="rounded-2xl border border-zinc-100 bg-white p-4">
          <h2 className="mb-2 font-bold">Tarif</h2>
          <div className="flex items-center gap-2">
            <Badge color={p.tier === "PREMIUM" ? "amber" : p.tier === "STANDARD" ? "teal" : "zinc"}>{p.tier}</Badge>
            {p.tierEndsAt && <span className="text-[13px] text-zinc-500">amal qilish muddati: {new Date(p.tierEndsAt).toLocaleDateString("uz-UZ")}</span>}
          </div>
          <p className="mt-2 text-[12.5px] text-zinc-400">
            Tarifni o&apos;zgartirish uchun administratsiya bilan bog&apos;laning.
          </p>
        </section>

        {/* Saqlash tugmasi doim ko'rinib turadi */}
        <div className="sticky bottom-3 z-20">
          <button onClick={() => save()} disabled={saving}
            className="w-full rounded-2xl bg-teal-600 py-3.5 font-bold text-white shadow-lg shadow-teal-600/30 disabled:opacity-50">
            {saving ? "Saqlanmoqda..." : "Barchasini saqlash"}
          </button>
        </div>
      </div>

      {toast && <Toast message={toast} />}
    </div>
  );
}
