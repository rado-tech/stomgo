"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, useGeo, useUser } from "@/lib/client";
import { Stars, Badge, Cover, Spinner, Sheet, Toast } from "@/components/ui";
import RouteSheet from "@/components/RouteSheet";
import BottomNav from "@/components/BottomNav";
import { fmtKm, fmtPrice, SPECIALTY_LABELS, VERIFICATION_LABELS, fmtDate } from "@/lib/format";

type Detail = {
  id: string; slug: string; name: string; description: string; address: string; district: string;
  phone: string; lat: number; lng: number; distanceKm: number; isOpen: boolean; todayHours: string;
  week: { day: string; label: string; isToday: boolean }[];
  is247: boolean; emergency: boolean; childFriendly: boolean; verified: boolean; tier: string;
  rating: number; reviewCount: number; avgResponseMin: number; coverHue: number; photoUrl: string | null;
  gallery: string[]; infoStale: boolean;
  servicesByCategory: Record<string, { code: string; name: string; priceMin: number; priceMax: number }[]>;
  doctors: { id: string; name: string; gender: string; specialty: string; experienceYears: number; verification: string; photoUrl: string | null }[];
  showDoctors: boolean;
  reviews: { id: string; rating: number; text: string; reply: string; author: string; date: string }[];
  slots: { date: string; label: string; slots: string[] }[];
};

const CATEGORY_LABELS: Record<string, string> = {
  DIAGNOSTIKA: "Diagnostika", TERAPIYA: "Terapiya", GIGIENA: "Gigiena", ESTETIKA: "Estetika",
  XIRURGIYA: "Xirurgiya", ORTOPEDIYA: "Ortopediya", ORTODONTIYA: "Ortodontiya", BOLALAR: "Bolalar",
};

export default function ClinicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const geo = useGeo();
  const router = useRouter();
  const { user } = useUser();
  const [d, setD] = useState<Detail | null>(null);
  const [error, setError] = useState("");
  const [bookOpen, setBookOpen] = useState(false);
  const [routeOpen, setRouteOpen] = useState(false);
  const [toast, setToast] = useState<{ msg: string; error?: boolean } | null>(null);

  // Yozilish holati
  const [selDoctor, setSelDoctor] = useState<string | null>(null);
  const [selService, setSelService] = useState<string | null>(null);
  const [selDay, setSelDay] = useState(0);
  const [selTime, setSelTime] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ code: string } | null>(null);

  useEffect(() => {
    api<{ clinic: Detail }>(`/api/clinics/${slug}?lat=${geo.lat}&lng=${geo.lng}`)
      .then((r) => setD(r.clinic))
      .catch((e) => setError(e.message));
  }, [slug, geo.lat, geo.lng]);

  // Kirishdan qaytgach — saqlangan yozilish ma'lumotlarini tiklaymiz
  useEffect(() => {
    if (!d || !user) return;
    const raw = sessionStorage.getItem("sg_booking_draft");
    if (!raw) return;
    const t = setTimeout(() => {
    try {
      const draft = JSON.parse(raw) as {
        slug: string; selDoctor: string | null; selService: string | null;
        date?: string; selTime: string | null; note: string;
      };
      if (draft.slug !== slug) return;
      sessionStorage.removeItem("sg_booking_draft");
      setSelDoctor(draft.selDoctor);
      setSelService(draft.selService);
      const dayIdx = d.slots.findIndex((s) => s.date === draft.date);
      const idx = dayIdx >= 0 ? dayIdx : 0;
      setSelDay(idx);
      // Vaqt hali bo'sh bo'lsa tiklaymiz (o'tib ketgan bo'lsa foydalanuvchi qayta tanlaydi)
      if (draft.selTime && d.slots[idx]?.slots.includes(draft.selTime)) setSelTime(draft.selTime);
      setNote(draft.note ?? "");
      setBookOpen(true);
    } catch { /* buzilgan draft — e'tiborsiz */ }
    }, 0);
    return () => clearTimeout(t);
  }, [d, user, slug]);

  const showToast = (msg: string, error?: boolean) => {
    setToast({ msg, error });
    setTimeout(() => setToast(null), 3000);
  };

  const track = (type: string) => {
    if (d) void api("/api/events", { json: { type, clinicId: d.id } }).catch(() => {});
  };

  /** Ilova/sayt ichida suhbat ochish */
  const openChat = async () => {
    if (!d) return;
    if (!user) {
      router.push(`/kirish?next=/klinika/${slug}`);
      return;
    }
    try {
      const r = await api<{ id: string }>("/api/chat", { json: { clinicId: d.id } });
      router.push(`/xabarlar/${r.id}`);
    } catch (e) {
      showToast((e as Error).message, true);
    }
  };

  const submit = async () => {
    if (!d || !selTime) return;
    if (!user) {
      // Tanlangan ma'lumotlarni saqlaymiz — kirishdan keyin shu joydan davom etadi
      sessionStorage.setItem("sg_booking_draft", JSON.stringify({
        slug, selDoctor, selService, date: d.slots[selDay]?.date, selTime, note,
      }));
      router.push(`/kirish?next=/klinika/${slug}`);
      return;
    }
    setSubmitting(true);
    try {
      const day = d.slots[selDay];
      const res = await api<{ code: string }>("/api/appointments", {
        json: {
          clinicId: d.id, doctorId: selDoctor, serviceCode: selService,
          date: day.date, time: selTime, note,
        },
      });
      setSuccess({ code: res.code });
    } catch (e) {
      showToast((e as Error).message, true);
    } finally {
      setSubmitting(false);
    }
  };

  if (error) return <div className="p-8 text-center text-red-600">{error}</div>;
  if (!d) return <div className="flex min-h-dvh items-center justify-center"><Spinner /></div>;

  const allServices = Object.values(d.servicesByCategory).flat();

  return (
    <div className="mx-auto min-h-dvh w-full max-w-4xl pb-32 sm:pb-24 md:pt-5">
      {/* Muqova */}
      <div className="relative md:px-4">
        <Cover hue={d.coverHue} name={d.name} photoUrl={d.photoUrl} className="h-44 w-full text-6xl md:h-64 md:rounded-3xl" />
        <button
          onClick={() => {
            // Tarix bo'sh bo'lsa (to'g'ridan-to'g'ri havola bilan kelingan) bosh sahifaga
            if (window.history.length > 2) router.back();
            else router.push("/");
          }}
          className="absolute left-3 top-3 rounded-full bg-white/90 p-2 shadow" aria-label="Orqaga">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#18181b" strokeWidth="2.5"><path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>

      <div className="px-4">
        {/* Nomi va asosiy ma'lumot */}
        <div className="py-4">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold">{d.name}</h1>
            {d.verified && (
              <span title="Platforma tekshirgan klinika">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#0f766e"><path d="M12 2l2.4 2.4 3.3-.5.5 3.3L20.6 9.6 22 12l-1.4 2.4-2.4 2.4-.5 3.3-3.3-.5L12 22l-2.4-2.4-3.3.5-.5-3.3L3.4 14.4 2 12l1.4-2.4 2.4-2.4.5-3.3 3.3.5L12 2z"/><path d="M9 12l2 2 4-4" stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </span>
            )}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-[13px]">
            <Stars value={d.rating} />
            <b>{d.rating.toFixed(1)}</b>
            <span className="text-zinc-500">({d.reviewCount} sharh)</span>
          </div>
          <p className="mt-1 text-[13px] text-zinc-500">{d.address} · {fmtKm(d.distanceKm)}</p>

          {/* Tekshiruv holati bemorga aniq aytiladi — nishonning yo'qligi ham ma'no beradi */}
          {!d.verified && (
            <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-[12.5px] leading-relaxed text-amber-800">
              Bu klinikaning hujjatlari platforma tomonidan hali tekshirilmagan.
              Ma&apos;lumotlarni klinikaning o&apos;zi kiritgan.
            </p>
          )}

          <div className="mt-2 flex flex-wrap gap-1.5">
            {d.isOpen ? <Badge color="emerald">Ochiq · {d.todayHours}</Badge> : <Badge color="zinc">Yopiq · {d.todayHours}</Badge>}
            {d.is247 && <Badge color="sky">24/7</Badge>}
            {d.emergency && <Badge color="orange">Shoshilinch qabul</Badge>}
            {d.childFriendly && <Badge color="violet">Bolalar uchun</Badge>}
            {d.infoStale && <Badge color="zinc">Ma&apos;lumot 3 oydan beri yangilanmagan</Badge>}
          </div>

          {d.description && <p className="mt-3 text-[14px] leading-relaxed text-zinc-600">{d.description}</p>}
          <p className="mt-2 text-[12px] text-zinc-400">Odatda {d.avgResponseMin} daqiqada javob beradi</p>

          {/* Foto galereya */}
          {d.gallery.length > 0 && (
            <div className="scrollbar-none -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
              {d.gallery.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noreferrer"
                  className="h-24 w-36 shrink-0 overflow-hidden rounded-xl bg-zinc-100"
                  style={{ backgroundImage: `url(${url})`, backgroundSize: "cover", backgroundPosition: "center" }}
                  aria-label={`Klinika rasmi ${i + 1}`} />
              ))}
            </div>
          )}
        </div>

        {/* Amallar — muloqot faqat ilova/sayt ichida */}
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={openChat}
            className="col-span-1 flex items-center justify-center gap-2 rounded-xl bg-teal-600 py-2.5 text-[14px] font-bold text-white"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 11.5a8.4 8.4 0 01-9 8.4 9 9 0 01-3.8-.8L3 21l1.9-4.9A8.4 8.4 0 0112 3.1a8.4 8.4 0 019 8.4z" strokeLinejoin="round" />
            </svg>
            Xabar
          </button>
          <a
            href={`tel:${d.phone}`} onClick={() => track("CALL_CLICK")}
            className="flex items-center justify-center gap-2 rounded-xl border border-zinc-300 py-2.5 text-[14px] font-semibold text-zinc-700"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.9v3a2 2 0 01-2.2 2A19.8 19.8 0 012 4.2 2 2 0 014 2h3a2 2 0 012 1.7c.1 1 .4 2 .7 2.9a2 2 0 01-.5 2.1L8 9.9a16 16 0 006.1 6.1l1.2-1.2a2 2 0 012.1-.5c.9.3 1.9.6 2.9.7a2 2 0 011.7 1.9z"/></svg>
            Qo&apos;ng&apos;iroq
          </a>
          <button
            onClick={() => setRouteOpen(true)}
            className="flex items-center justify-center gap-2 rounded-xl border border-zinc-300 py-2.5 text-[14px] font-semibold text-zinc-700"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 21s-7-5.3-7-11a7 7 0 0114 0c0 5.7-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>
            Marshrut
          </button>
        </div>
        <p className="mt-2 text-[11.5px] leading-relaxed text-zinc-400">
          🔒 Kelishuvlarni ilova ichidagi suhbatda oling — tashqi kanallardagi (Telegram, telefon)
          kelishuvlarga platforma javobgar emas.
        </p>

        {/* Xizmatlar va narxlar */}
        <section className="mt-6">
          <h2 className="mb-2 font-bold">Xizmatlar va narxlar</h2>
          <div className="space-y-3 lg:columns-2 lg:gap-3 lg:space-y-0 [&>div]:lg:mb-3 [&>div]:lg:break-inside-avoid">
            {Object.entries(d.servicesByCategory).map(([cat, items]) => (
              <div key={cat} className="rounded-2xl border border-zinc-100 bg-white p-3">
                <p className="mb-1.5 text-[12px] font-semibold uppercase tracking-wide text-teal-700">{CATEGORY_LABELS[cat] ?? cat}</p>
                {items.map((s) => (
                  <div key={s.code} className="flex items-center justify-between border-b border-zinc-50 py-1.5 text-[13.5px] last:border-0">
                    <span>{s.name}</span>
                    <span className="shrink-0 font-semibold text-zinc-700">{fmtPrice(s.priceMin)} – {fmtPrice(s.priceMax)}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <p className="mt-2 text-[12px] text-zinc-400">Narxlar taxminiy diapazon. Aniq narx ko&apos;rikdan keyin belgilanadi.</p>
        </section>

        {/* Shifokorlar */}
        {d.showDoctors && d.doctors.length > 0 && (
          <section className="mt-6">
            <h2 className="mb-2 font-bold">Shifokorlar</h2>
            <div className="space-y-2">
              {d.doctors.map((doc) => (
                <div key={doc.id} className="flex items-center gap-3 rounded-2xl border border-zinc-100 bg-white p-3">
                  {doc.photoUrl ? (
                    <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full bg-zinc-100" style={{ backgroundImage: `url(${doc.photoUrl})`, backgroundSize: "cover", backgroundPosition: "center" }} role="img" aria-label={doc.name} />
                  ) : (
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white ${doc.gender === "FEMALE" ? "bg-pink-400" : "bg-sky-500"}`}>
                      {doc.name[0]}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold">{doc.name}</p>
                    <p className="text-[12.5px] text-zinc-500">
                      {SPECIALTY_LABELS[doc.specialty] ?? doc.specialty} · {doc.experienceYears} yil tajriba
                    </p>
                  </div>
                  <Badge color={doc.verification === "DOC_VERIFIED" ? "teal" : "zinc"}>
                    {VERIFICATION_LABELS[doc.verification]}
                  </Badge>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Ish vaqti */}
        <section className="mt-6">
          <h2 className="mb-2 font-bold">Ish vaqti</h2>
          <div className="rounded-2xl border border-zinc-100 bg-white p-3">
            {d.week.map((w) => (
              <div key={w.day} className={`flex justify-between py-1 text-[13.5px] ${w.isToday ? "font-bold text-teal-700" : "text-zinc-600"}`}>
                <span>{w.day}</span><span>{w.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Sharhlar */}
        <section className="mt-6">
          <h2 className="mb-2 font-bold">Sharhlar ({d.reviewCount})</h2>
          {d.reviews.length === 0 ? (
            <p className="text-[13px] text-zinc-500">Hozircha sharh yo&apos;q.</p>
          ) : (
            <div className="space-y-2">
              {d.reviews.map((r) => (
                <div key={r.id} className="rounded-2xl border border-zinc-100 bg-white p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] font-semibold">{r.author}</p>
                    <div className="flex items-center gap-2">
                      <Stars value={r.rating} size={12} />
                      <span className="text-[11px] text-zinc-400">{fmtDate(r.date)}</span>
                    </div>
                  </div>
                  {r.text && <p className="mt-1.5 text-[13.5px] text-zinc-600">{r.text}</p>}
                  {r.reply && (
                    <div className="mt-2 rounded-xl bg-zinc-50 p-2.5 text-[13px] text-zinc-600">
                      <b className="text-teal-700">Klinika javobi:</b> {r.reply}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          <p className="mt-2 text-[12px] text-zinc-400">Sharhlar faqat tasdiqlangan tashrifdan keyin yoziladi.</p>
        </section>
      </div>

      {/* Yozilish tugmasi */}
      <div className="fixed bottom-14 left-0 right-0 z-30 mx-auto max-w-4xl px-4 pb-3 sm:bottom-0">
        <button
          onClick={() => setBookOpen(true)}
          className="w-full rounded-2xl bg-teal-600 py-3.5 text-[15px] font-bold text-white shadow-lg shadow-teal-600/30 transition hover:bg-teal-700"
        >
          Qabulga yozilish
        </button>
      </div>

      {/* Yozilish oynasi */}
      <Sheet open={bookOpen} onClose={() => { setBookOpen(false); setSuccess(null); }} title={success ? "So'rov yuborildi" : "Qabulga yozilish"}>
        {success ? (
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <p className="font-semibold">So&apos;rovingiz klinikaga yuborildi</p>
            <p className="mt-1 text-[13.5px] text-zinc-500">
              Klinika odatda {d.avgResponseMin} daqiqada javob beradi. Holatni <Link href="/profil" className="font-semibold text-teal-700">Profil</Link> bo&apos;limida kuzating.
            </p>
            <p className="mt-3 rounded-xl bg-zinc-50 py-2 text-[13px]">Yozuv kodi: <b className="font-mono text-[15px]">{success.code}</b></p>
          </div>
        ) : (
          <div className="space-y-4">
            {d.showDoctors && d.doctors.length > 0 && (
              <div>
                <p className="mb-1.5 text-[13px] font-semibold text-zinc-600">Shifokor (ixtiyoriy)</p>
                <div className="flex flex-wrap gap-1.5">
                  <Chip2 active={selDoctor === null} onClick={() => setSelDoctor(null)}>Farqi yo&apos;q</Chip2>
                  {d.doctors.map((doc) => (
                    <Chip2 key={doc.id} active={selDoctor === doc.id} onClick={() => setSelDoctor(doc.id)}>
                      {doc.name}{doc.gender === "FEMALE" ? " ♀" : ""}
                    </Chip2>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="mb-1.5 text-[13px] font-semibold text-zinc-600">Xizmat (ixtiyoriy)</p>
              <div className="flex flex-wrap gap-1.5">
                <Chip2 active={selService === null} onClick={() => setSelService(null)}>Bilmayman / ko&apos;rik</Chip2>
                {allServices.map((s) => (
                  <Chip2 key={s.code} active={selService === s.code} onClick={() => setSelService(s.code)}>{s.name}</Chip2>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-[13px] font-semibold text-zinc-600">Kun</p>
              <div className="scrollbar-none flex gap-1.5 overflow-x-auto pb-1">
                {d.slots.map((day, i) => (
                  <Chip2 key={day.date} active={selDay === i} onClick={() => { setSelDay(i); setSelTime(null); }}>{day.label}</Chip2>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-[13px] font-semibold text-zinc-600">Vaqt</p>
              <div className="grid max-h-40 grid-cols-4 gap-1.5 overflow-y-auto">
                {d.slots[selDay]?.slots.map((t) => (
                  <button
                    key={t}
                    onClick={() => setSelTime(t)}
                    className={`rounded-lg border py-1.5 text-[13px] font-medium ${selTime === t ? "border-teal-600 bg-teal-600 text-white" : "border-zinc-200"}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-[12px] text-zinc-400">Bu so&apos;ralgan vaqt — klinika tasdiqlagach yakuniy hisoblanadi.</p>
            </div>

            <textarea
              value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="Izoh (ixtiyoriy): nima bezovta qilyapti?"
              rows={2}
              className="w-full rounded-xl border border-zinc-200 p-3 text-[14px] outline-none focus:border-teal-500"
            />

            <button
              disabled={!selTime || submitting}
              onClick={submit}
              className="w-full rounded-2xl bg-teal-600 py-3 font-bold text-white disabled:opacity-40"
            >
              {submitting ? "Yuborilmoqda..." : user ? "So'rov yuborish" : "Kirish va yozilish"}
            </button>
          </div>
        )}
      </Sheet>

      <RouteSheet
        open={routeOpen}
        onClose={() => setRouteOpen(false)}
        lat={d.lat} lng={d.lng} name={d.name}
        onPick={() => track("ROUTE_CLICK")}
      />

      {toast && <Toast message={toast.msg} error={toast.error} />}
      <BottomNav />
    </div>
  );
}

function Chip2({ active, onClick, children }: { active?: boolean; onClick?: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full border px-3 py-1.5 text-[13px] font-medium ${active ? "border-teal-600 bg-teal-50 text-teal-800" : "border-zinc-200 text-zinc-700"}`}
    >
      {children}
    </button>
  );
}
