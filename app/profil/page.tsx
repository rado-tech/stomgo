"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { api, useUser, type Me } from "@/lib/client";
import { Badge, Sheet, Spinner, EmptyState, Toast, Cover } from "@/components/ui";
import TelegramLink from "@/components/TelegramLink";
import UploadButton from "@/components/UploadButton";
import ThemeToggle from "@/components/ThemeToggle";
import BottomNav from "@/components/BottomNav";
import PushSetup from "@/components/PushSetup";
import { APPOINTMENT_STATUS, fmtDateTime } from "@/lib/format";

type Apt = {
  id: string; status: string; requestedAt: string; altAt: string | null; code: string;
  createdAt: string; note: string; rejectReason: string;
  clinic: { name: string; slug: string; address: string; phone: string; coverHue: number };
  doctor: { name: string; specialty: string } | null;
  review: { id: string } | null;
  rescheduleCount?: number;
};

export default function ProfilePage() {
  const { user, loading: userLoading, setUser } = useUser();
  const router = useRouter();
  const [items, setItems] = useState<(Apt & { overdue: boolean })[] | null>(null);
  const [toast, setToast] = useState<{ msg: string; error?: boolean } | null>(null);
  const [qrFor, setQrFor] = useState<Apt | null>(null);
  const [qr, setQr] = useState<{ code: string; url: string } | null>(null);
  const [checkinFor, setCheckinFor] = useState<Apt | null>(null);
  const [checkinCode, setCheckinCode] = useState("");
  const [reviewFor, setReviewFor] = useState<Apt | null>(null);
  const [moveFor, setMoveFor] = useState<Apt | null>(null);
  const [moveSlots, setMoveSlots] = useState<{ date: string; label: string; slots: string[] }[] | null>(null);
  const [moveDay, setMoveDay] = useState(0);
  const [moveTime, setMoveTime] = useState("");
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [busy, setBusy] = useState(false);

  // Ma'lumotlarni tahrirlash
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", birthYear: "", gender: "" });
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [phoneDevCode, setPhoneDevCode] = useState("");
  const [phoneVia, setPhoneVia] = useState("");
  const [phoneDeepLink, setPhoneDeepLink] = useState("");
  const [phoneStep, setPhoneStep] = useState<"phone" | "code">("phone");


  const load = useCallback(() => {
    api<{ items: Apt[] }>("/api/appointments")
      .then((d) => {
        const now = Date.now();
        setItems(d.items.map((a) => ({
          ...a,
          overdue: a.status === "PENDING" && now - new Date(a.createdAt).getTime() > 60 * 60 * 1000,
        })));
      })
      .catch(() => setItems([]));
  }, []);

  useEffect(() => {
    if (user) {
      load();
    }
  }, [user, load]);


  useEffect(() => {
    if (qrFor) {
      const code = qrFor.code;
      QRCode.toDataURL(code, { width: 220, margin: 1 }).then((url) => setQr({ code, url }));
    }
  }, [qrFor]);

  const showToast = (msg: string, error?: boolean) => {
    setToast({ msg, error });
    setTimeout(() => setToast(null), 3000);
  };

  const action = async (id: string, body: object, onDone?: () => void) => {
    setBusy(true);
    try {
      await api(`/api/appointments/${id}`, { method: "PATCH", json: body });
      load();
      onDone?.();
    } catch (e) {
      showToast((e as Error).message, true);
    } finally {
      setBusy(false);
    }
  };

  /** Vaqtni ko'chirish oynasini ochish — klinikaning bo'sh vaqtlarini olamiz */
  const openMove = async (a: Apt) => {
    setMoveFor(a); setMoveSlots(null); setMoveDay(0); setMoveTime("");
    try {
      const d = await api<{ slots: { date: string; label: string; slots: string[] }[] }>(`/api/clinics/${a.clinic.slug}`);
      setMoveSlots(d.slots);
    } catch {
      setMoveSlots([]);
    }
  };

  const submitMove = async () => {
    if (!moveFor || !moveSlots || !moveTime) return;
    const day = moveSlots[moveDay];
    if (!day) return;
    await action(moveFor.id, { action: "reschedule", date: day.date, time: moveTime }, () => {
      setMoveFor(null);
      showToast("Yangi vaqt yuborildi — klinika tasdiqlashini kuting");
    });
  };

  const submitReview = async () => {
    if (!reviewFor) return;
    setBusy(true);
    try {
      const res = await api<{ message: string }>("/api/reviews", {
        json: { appointmentId: reviewFor.id, rating, text: reviewText },
      });
      showToast(res.message);
      setReviewFor(null); setReviewText(""); setRating(5);
      load();
    } catch (e) {
      showToast((e as Error).message, true);
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    await api("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  };

  const openEdit = () => {
    setEditForm({
      name: user?.name ?? "",
      birthYear: user?.birthYear ? String(user.birthYear) : "",
      gender: user?.gender ?? "",
    });
    setEditOpen(true);
  };

  const saveProfile = async () => {
    setBusy(true);
    try {
      const res = await api<{ user: Me }>("/api/me", {
        method: "PATCH",
        json: { name: editForm.name, birthYear: editForm.birthYear || null, gender: editForm.gender },
      });
      setUser(res.user);
      setEditOpen(false);
      showToast("Saqlandi");
    } catch (e) {
      showToast((e as Error).message, true);
    } finally {
      setBusy(false);
    }
  };

  const requestPhoneChange = async () => {
    setBusy(true);
    try {
      const res = await api<{ devCode?: string; via?: string; deepLink?: string }>("/api/me/phone", { json: { newPhone } });
      if (res.devCode) setPhoneDevCode(res.devCode);
      setPhoneVia(res.via ?? "");
      setPhoneDeepLink(res.deepLink ?? "");
      setPhoneStep("code");
    } catch (e) {
      showToast((e as Error).message, true);
    } finally {
      setBusy(false);
    }
  };

  const confirmPhoneChange = async () => {
    setBusy(true);
    try {
      const res = await api<{ phone: string }>("/api/me/phone", { method: "PUT", json: { newPhone, code: phoneCode } });
      setUser(user ? { ...user, phone: res.phone } : user);
      setPhoneOpen(false); setPhoneStep("phone"); setNewPhone(""); setPhoneCode(""); setPhoneDevCode("");
      showToast("Raqam almashtirildi");
    } catch (e) {
      showToast((e as Error).message, true);
    } finally {
      setBusy(false);
    }
  };

  if (userLoading) return <div className="flex min-h-dvh items-center justify-center"><Spinner /></div>;

  if (!user) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-6 pb-20">
        <EmptyState icon="👤" title="Profilga kirmagansiz" subtitle="Yozuvlaringizni ko'rish uchun kiring" />
        <Link href="/kirish?next=/profil" className="w-full rounded-2xl bg-teal-600 py-3.5 text-center font-bold text-white">
          Kirish
        </Link>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-dvh w-full max-w-md px-4 pb-24 pt-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {user.photoUrl ? (
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full bg-zinc-100"
              style={{ backgroundImage: `url(${user.photoUrl})`, backgroundSize: "cover", backgroundPosition: "center" }}
              role="img" aria-label="Profil rasmi" />
          ) : (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xl font-bold text-teal-700">
              {(user.name ?? "F")[0]}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="truncate text-xl font-extrabold">{user.name ?? "Foydalanuvchi"}</h1>
            <p className="text-[13px] text-zinc-500">{user.phone}</p>
            <UploadButton target="me" label={user.photoUrl ? "Rasmni almashtirish" : "Rasm qo'yish"}
              onDone={(url) => setUser({ ...user, photoUrl: url })} />
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <ThemeToggle />
          <button onClick={openEdit} className="rounded-xl border border-teal-600 px-3 py-1.5 text-[12.5px] font-semibold text-teal-700">
            Tahrirlash
          </button>
          <button onClick={logout} className="rounded-xl border border-zinc-200 px-3 py-1.5 text-[12.5px] font-semibold text-zinc-600">
            Chiqish
          </button>
        </div>
      </div>

      {(user.role === "CLINIC" || user.role === "ADMIN") && (
        <Link href={user.role === "ADMIN" ? "/admin" : "/clinic"} className="mt-4 block rounded-2xl bg-teal-600 p-4 font-bold text-white">
          {user.role === "ADMIN" ? "Admin panelga o'tish →" : "Klinika paneliga o'tish →"}
        </Link>
      )}

      <div className="mt-4">
        <TelegramLink variant="patient" />
      </div>

      <div className="mt-3">
        <PushSetup />
      </div>

      <h2 className="mb-2 mt-6 font-bold">Yozuvlarim</h2>
      {!items ? (
        <div className="space-y-3">{[1, 2].map((i) => <div key={i} className="sg-skeleton h-28" />)}</div>
      ) : items.length === 0 ? (
        <EmptyState icon="📅" title="Yozuvlar yo'q" subtitle="Klinika tanlab qabulga yoziling" />
      ) : (
        <div className="space-y-3">
          {items.map((a) => {
            const st = APPOINTMENT_STATUS[a.status];
            const overdue = a.overdue;
            return (
              <div key={a.id} className="rounded-2xl border border-zinc-100 bg-white p-3.5">
                <div className="flex items-center gap-3">
                  <Cover hue={a.clinic.coverHue} name={a.clinic.name} className="h-10 w-10 shrink-0 rounded-xl" />
                  <div className="min-w-0 flex-1">
                    <Link href={`/klinika/${a.clinic.slug}`} className="truncate font-semibold">{a.clinic.name}</Link>
                    <p className="text-[12.5px] text-zinc-500">{fmtDateTime(a.requestedAt)}{a.doctor ? ` · ${a.doctor.name}` : ""}</p>
                  </div>
                  <Badge color={st?.color}>{st?.label}</Badge>
                </div>

                {a.status === "ALT_OFFERED" && a.altAt && (
                  <div className="mt-2.5 rounded-xl bg-sky-50 p-3 text-[13px]">
                    <p>Klinika boshqa vaqt taklif qildi: <b>{fmtDateTime(a.altAt)}</b></p>
                    <div className="mt-2 flex gap-2">
                      <button disabled={busy} onClick={() => action(a.id, { action: "accept_alt" })}
                        className="rounded-lg bg-teal-600 px-3 py-1.5 text-[12.5px] font-bold text-white">Qabul qilaman</button>
                      <button disabled={busy} onClick={() => action(a.id, { action: "cancel" })}
                        className="rounded-lg border border-zinc-300 px-3 py-1.5 text-[12.5px] font-semibold">Bekor qilish</button>
                    </div>
                  </div>
                )}

                {a.status === "REJECTED" && a.rejectReason && (
                  <p className="mt-2 rounded-xl bg-red-50 p-2.5 text-[13px] text-red-700">Sabab: {a.rejectReason}</p>
                )}

                {overdue && (
                  <div className="mt-2 rounded-xl bg-amber-50 p-2.5 text-[13px] text-amber-800">
                    Klinika 1 soatdan beri javob bermadi. <Link href="/" className="font-bold underline">Boshqa klinika tanlash →</Link>
                  </div>
                )}

                <div className="mt-2.5 flex flex-wrap gap-2">
                  {["PENDING", "CONFIRMED", "ALT_OFFERED"].includes(a.status) && (
                    <>
                      <button disabled={busy} onClick={() => openMove(a)}
                        className="rounded-lg border border-zinc-300 px-3 py-1.5 text-[12.5px] font-semibold text-zinc-700">
                        Vaqtni o&apos;zgartirish
                      </button>
                      <button disabled={busy} onClick={() => action(a.id, { action: "cancel" })}
                        className="rounded-lg border border-zinc-200 px-3 py-1.5 text-[12.5px] font-semibold text-zinc-600">
                        Bekor qilish
                      </button>
                    </>
                  )}
                  {a.status === "CONFIRMED" && (
                    <>
                      <button onClick={() => setQrFor(a)}
                        className="rounded-lg border border-teal-600 px-3 py-1.5 text-[12.5px] font-semibold text-teal-700">
                        QR / kod
                      </button>
                      <button onClick={() => { setCheckinFor(a); setCheckinCode(""); }}
                        className="rounded-lg bg-teal-600 px-3 py-1.5 text-[12.5px] font-bold text-white">
                        Keldim ✓
                      </button>
                    </>
                  )}
                  {["ARRIVED", "DONE"].includes(a.status) && !a.review && (
                    <button onClick={() => setReviewFor(a)}
                      className="rounded-lg bg-amber-500 px-3 py-1.5 text-[12.5px] font-bold text-white">
                      Sharh yozish ★
                    </button>
                  )}
                  {a.review && <Badge color="emerald">Sharh yozilgan</Badge>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* QR kod */}
      <Sheet open={!!qrFor} onClose={() => setQrFor(null)} title="Yozuv kodi">
        <div className="text-center">
          <p className="text-[13.5px] text-zinc-500">Resepshnda shu kodni ko&apos;rsating</p>
          {/* eslint-disable-next-line @next/next/no-img-element -- data-URL QR, next/image optimallashtira olmaydi */}
          {qr && qr.code === qrFor?.code && <img src={qr.url} alt="QR kod" className="mx-auto mt-3 rounded-xl" />}
          <p className="mt-2 font-mono text-2xl font-bold tracking-widest">{qrFor?.code}</p>
        </div>
      </Sheet>

      {/* Check-in */}
      <Sheet open={!!checkinFor} onClose={() => setCheckinFor(null)} title="Kelganingizni tasdiqlang">
        <p className="text-[13.5px] text-zinc-500">
          Resepshn stolidagi 4 xonali kodni kiriting — tashrifingiz tasdiqlanadi va sharh yozish ochiladi.
        </p>
        <input
          value={checkinCode}
          onChange={(e) => setCheckinCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
          placeholder="••••"
          inputMode="numeric"
          className="mt-3 w-full rounded-2xl border border-zinc-200 px-4 py-3 text-center font-mono text-2xl tracking-[0.4em] outline-none focus:border-teal-500"
        />
        <button
          disabled={busy || checkinCode.length !== 4}
          onClick={() => checkinFor && action(checkinFor.id, { action: "checkin", clinicCode: checkinCode }, () => { setCheckinFor(null); showToast("Tashrif tasdiqlandi!"); })}
          className="mt-3 w-full rounded-2xl bg-teal-600 py-3 font-bold text-white disabled:opacity-40"
        >
          Tasdiqlash
        </button>
      </Sheet>

      {/* Sharh */}
      <Sheet open={!!reviewFor} onClose={() => setReviewFor(null)} title="Sharh yozish">
        <p className="text-[13.5px] text-zinc-500">{reviewFor?.clinic.name} haqida fikringiz</p>
        <div className="mt-3 flex justify-center gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <button key={i} onClick={() => setRating(i)} className="text-3xl">
              {i <= rating ? "★" : "☆"}
            </button>
          ))}
        </div>
        <textarea
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
          rows={3}
          placeholder="Xizmat qanday bo'ldi? (ixtiyoriy)"
          className="mt-3 w-full rounded-2xl border border-zinc-200 p-3 text-[14px] outline-none focus:border-teal-500"
        />
        <button disabled={busy} onClick={submitReview}
          className="mt-3 w-full rounded-2xl bg-teal-600 py-3 font-bold text-white disabled:opacity-40">
          Yuborish
        </button>
      </Sheet>

      {/* Ma'lumotlarni tahrirlash */}
      <Sheet open={editOpen} onClose={() => setEditOpen(false)} title="Ma'lumotlarim">
        <div className="space-y-3">
          <label className="block text-[13px] text-zinc-500">
            Ism
            <input value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-[14px] text-zinc-900 outline-none focus:border-teal-500" />
          </label>
          <label className="block text-[13px] text-zinc-500">
            Tug&apos;ilgan yil
            <input type="number" value={editForm.birthYear} placeholder="1995"
              onChange={(e) => setEditForm((f) => ({ ...f, birthYear: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-[14px] text-zinc-900 outline-none focus:border-teal-500" />
          </label>
          <div>
            <p className="text-[13px] text-zinc-500">Jins</p>
            <div className="mt-1 flex gap-2">
              {([["MALE", "Erkak"], ["FEMALE", "Ayol"], ["", "Ko'rsatmayman"]] as const).map(([v, l]) => (
                <button key={v} onClick={() => setEditForm((f) => ({ ...f, gender: v }))}
                  className={`flex-1 rounded-xl border py-2.5 text-[13px] font-medium ${editForm.gender === v ? "border-teal-600 bg-teal-50 text-teal-800" : "border-zinc-200"}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-xl bg-zinc-50 p-3">
            <p className="text-[13px] text-zinc-500">Telefon: <b className="text-zinc-800">{user.phone}</b></p>
            <button onClick={() => { setEditOpen(false); setPhoneOpen(true); }}
              className="mt-1 text-[13px] font-semibold text-teal-700">
              Raqamni almashtirish →
            </button>
          </div>
          <button disabled={busy} onClick={saveProfile}
            className="w-full rounded-2xl bg-teal-600 py-3 font-bold text-white disabled:opacity-40">
            Saqlash
          </button>
        </div>
      </Sheet>

      {/* Raqam almashtirish */}
      <Sheet open={phoneOpen} onClose={() => { setPhoneOpen(false); setPhoneStep("phone"); }} title="Raqamni almashtirish">
        {phoneStep === "phone" ? (
          <div>
            <p className="text-[13.5px] text-zinc-500">Yangi raqamga tasdiqlash kodi yuboriladi. Joriy: <b>{user.phone}</b></p>
            <div className="mt-3 flex items-center gap-2 rounded-2xl border border-zinc-200 px-4 py-3">
              <span className="font-semibold text-zinc-500">+998</span>
              <input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} inputMode="tel"
                placeholder="90 123 45 67" className="w-full text-[15px] outline-none" autoFocus />
            </div>
            <button disabled={busy || newPhone.replace(/\D/g, "").length < 9} onClick={requestPhoneChange}
              className="mt-3 w-full rounded-2xl bg-teal-600 py-3 font-bold text-white disabled:opacity-40">
              Kod olish
            </button>
          </div>
        ) : (
          <div>
            {phoneVia === "telegram_link" && (
              <div className="rounded-xl bg-sky-50 p-3 text-center">
                <a href={phoneDeepLink} target="_blank" rel="noreferrer"
                  className="inline-block rounded-xl bg-sky-500 px-5 py-2.5 text-[13.5px] font-bold text-white">
                  ✈️ Botda yangi raqamni tasdiqlash
                </a>
                <p className="mt-1.5 text-[12px] text-sky-700">Kod botda beriladi — qaytib shu yerga kiriting</p>
              </div>
            )}
            {phoneVia === "screen" && phoneDevCode && (
              <p className="rounded-xl bg-amber-50 px-3 py-2 text-center text-[13px] text-amber-800">
                Demo rejim: kod — <b className="font-mono">{phoneDevCode}</b>
              </p>
            )}
            <input value={phoneCode} onChange={(e) => setPhoneCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="••••••" inputMode="numeric"
              className="mt-3 w-full rounded-2xl border border-zinc-200 px-4 py-3 text-center font-mono text-2xl tracking-[0.4em] outline-none" autoFocus />
            <button disabled={busy || phoneCode.length !== 6} onClick={confirmPhoneChange}
              className="mt-3 w-full rounded-2xl bg-teal-600 py-3 font-bold text-white disabled:opacity-40">
              Tasdiqlash
            </button>
          </div>
        )}
      </Sheet>

      {/* Vaqtni o'zgartirish */}
      <Sheet open={!!moveFor} onClose={() => setMoveFor(null)} title="Yangi vaqt tanlang">
        {moveFor && (
          <div className="px-4 pb-5">
            <p className="text-[13px] text-zinc-500">
              {moveFor.clinic.name} · hozirgi vaqt: <b className="text-zinc-700">{fmtDateTime(moveFor.requestedAt)}</b>
            </p>
            <p className="mt-1 text-[12px] text-zinc-400">
              Yangi vaqtni klinika qaytadan tasdiqlaydi. Ko&apos;pi bilan 3 marta o&apos;zgartirish mumkin.
            </p>

            {!moveSlots ? (
              <div className="flex justify-center py-8"><Spinner /></div>
            ) : moveSlots.length === 0 ? (
              <p className="py-6 text-center text-[13.5px] text-zinc-500">
                Bo&apos;sh vaqt topilmadi. Klinikaga qo&apos;ng&apos;iroq qiling.
              </p>
            ) : (
              <>
                <div className="sg-noscroll mt-3 flex gap-2 overflow-x-auto pb-1">
                  {moveSlots.map((day, i) => (
                    <button key={day.date} onClick={() => { setMoveDay(i); setMoveTime(""); }}
                      className={`shrink-0 rounded-xl px-3.5 py-2 text-[13px] font-semibold ${i === moveDay ? "bg-teal-600 text-white" : "bg-zinc-100 text-zinc-700"}`}>
                      {day.label}
                    </button>
                  ))}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {(moveSlots[moveDay]?.slots ?? []).map((t) => (
                    <button key={t} onClick={() => setMoveTime(t)}
                      className={`rounded-xl px-3.5 py-2 text-[13px] font-semibold ${t === moveTime ? "bg-teal-600 text-white" : "border border-zinc-200 text-zinc-700"}`}>
                      {t}
                    </button>
                  ))}
                  {(moveSlots[moveDay]?.slots ?? []).length === 0 && (
                    <p className="text-[13px] text-zinc-500">Bu kunda bo&apos;sh vaqt yo&apos;q</p>
                  )}
                </div>

                <button disabled={busy || !moveTime} onClick={submitMove}
                  className="mt-4 w-full rounded-2xl bg-teal-600 py-3 font-bold text-white disabled:opacity-40">
                  Yangi vaqtni yuborish
                </button>
              </>
            )}
          </div>
        )}
      </Sheet>

      {toast && <Toast message={toast.msg} error={toast.error} />}
      <BottomNav />
    </div>
  );
}
