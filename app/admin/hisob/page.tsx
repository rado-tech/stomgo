"use client";

import { useState } from "react";
import { api, useUser } from "@/lib/client";
import { Toast } from "@/components/ui";
import TelegramLink from "@/components/TelegramLink";
import PhoneChange from "@/components/PhoneChange";

/**
 * Admin o'z login va parolini o'zgartiradi.
 * Ikki bosqich: joriy parol bilan so'rov → Telegram botga kelgan kod bilan tasdiq.
 */
export default function AdminAccountPage() {
  const { user, setUser } = useUser();
  const [step, setStep] = useState<"form" | "code">("form");
  const [editName, setEditName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [nameBusy, setNameBusy] = useState(false);
  const [form, setForm] = useState({ username: "", password: "", password2: "", currentPassword: "" });
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ msg: string; error?: boolean } | null>(null);

  const show = (msg: string, error?: boolean) => {
    setToast({ msg, error });
    setTimeout(() => setToast(null), 5000);
  };

  const saveName = async () => {
    const value = nameDraft.trim();
    if (!value) return show("Ism bo'sh bo'lmasin", true);
    setNameBusy(true);
    try {
      await api("/api/me", { method: "PATCH", json: { name: value } });
      if (user) setUser({ ...user, name: value });
      setEditName(false);
      show("Ism saqlandi");
    } catch (e) {
      show((e as Error).message, true);
    } finally {
      setNameBusy(false);
    }
  };

  const start = async () => {
    if (!form.currentPassword) return show("Joriy parolni kiriting", true);
    if (!form.username.trim() && !form.password) return show("Login yoki yangi parolni kiriting", true);
    if (form.password && form.password !== form.password2) return show("Parollar mos kelmadi", true);
    if (form.password && form.password.length < 10) return show("Parol kamida 10 belgi bo'lsin", true);

    setBusy(true);
    try {
      await api("/api/admin/account", {
        json: {
          username: form.username.trim(),
          password: form.password,
          currentPassword: form.currentPassword,
        },
      });
      setStep("code");
      show("Tasdiqlash kodi Telegram botga yuborildi");
    } catch (e) {
      show((e as Error).message, true);
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    if (code.length !== 6) return show("6 xonali kodni kiriting", true);
    setBusy(true);
    try {
      await api("/api/admin/account", {
        method: "PUT",
        json: { code, username: form.username.trim(), password: form.password },
      });
      setStep("form");
      setForm({ username: "", password: "", password2: "", currentPassword: "" });
      setCode("");
      show("Saqlandi. Keyingi kirishda yangi ma'lumotlardan foydalaning.");
    } catch (e) {
      show((e as Error).message, true);
    } finally {
      setBusy(false);
    }
  };

  const input =
    "mt-1 w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-[14px] text-zinc-900 outline-none focus:border-teal-500";

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-xl font-extrabold">Mening hisobim</h1>
      <p className="mt-1 text-[13.5px] leading-relaxed text-zinc-500">
        Login va parolni o&apos;zgartirish. Har qanday o&apos;zgarish Telegram botga
        kelgan kod bilan tasdiqlanadi.
      </p>

      {/* Profil kartochkasi */}
      <div className="mt-4 flex items-center gap-3 rounded-2xl border border-zinc-100 bg-white p-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-teal-600 text-[18px] font-bold text-white">
          {(user?.name ?? user?.username ?? "A")[0].toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          {editName ? (
            <div className="flex items-center gap-2">
              <input
                value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} autoFocus maxLength={60}
                onKeyDown={(e) => { if (e.key === "Enter") void saveName(); if (e.key === "Escape") setEditName(false); }}
                className="w-full rounded-lg border border-zinc-200 px-2.5 py-1.5 text-[14px] outline-none focus:border-teal-500"
              />
              <button onClick={saveName} disabled={nameBusy}
                className="shrink-0 rounded-lg bg-teal-600 px-3 py-1.5 text-[12.5px] font-bold text-white disabled:opacity-40">
                {nameBusy ? "..." : "Saqlash"}
              </button>
              <button onClick={() => setEditName(false)}
                className="shrink-0 rounded-lg px-2 py-1.5 text-[12.5px] text-zinc-500">
                Bekor
              </button>
            </div>
          ) : (
            <>
              <p className="truncate text-[15px] font-bold">{user?.name ?? "Administrator"}</p>
              <p className="truncate font-mono text-[13px] text-zinc-500">{user?.username ?? "—"}</p>
            </>
          )}
        </div>
        {!editName && (
          <button
            onClick={() => { setNameDraft(user?.name ?? ""); setEditName(true); }}
            className="shrink-0 rounded-xl border border-zinc-300 px-3.5 py-2 text-[12.5px] font-semibold text-zinc-700"
          >
            Tahrirlash
          </button>
        )}
      </div>

      <div className="mt-3">
        <PhoneChange
          currentPhone={user?.phone ?? "—"}
          onChanged={(phone) => user && setUser({ ...user, phone })}
        />
      </div>

      <div className="mt-3">
        <TelegramLink variant="patient" />
      </div>

      <h2 className="mb-2 mt-6 text-[15px] font-bold">Login va parol</h2>

      {step === "form" ? (
        <div className="mt-3 rounded-2xl border border-zinc-100 bg-white p-4">
          <label className="block text-[12.5px] text-zinc-500">
            Yangi login (bo&apos;sh qoldirsangiz o&apos;zgarmaydi)
            <input
              value={form.username}
              onChange={(e) => setForm((f) => ({ ...f, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") }))}
              placeholder={user?.username ?? "admin"}
              autoComplete="off"
              className={`${input} font-mono`}
            />
          </label>

          <label className="mt-3 block text-[12.5px] text-zinc-500">
            Yangi parol (kamida 10 belgi)
            <input
              type="password" value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              autoComplete="new-password"
              className={input}
            />
          </label>

          <label className="mt-3 block text-[12.5px] text-zinc-500">
            Yangi parolni takrorlang
            <input
              type="password" value={form.password2}
              onChange={(e) => setForm((f) => ({ ...f, password2: e.target.value }))}
              autoComplete="new-password"
              className={input}
            />
          </label>

          <div className="mt-4 border-t border-zinc-100 pt-3">
            <label className="block text-[12.5px] text-zinc-500">
              Tasdiqlash uchun <b className="text-zinc-700">joriy parolingiz</b>
              <input
                type="password" value={form.currentPassword}
                onChange={(e) => setForm((f) => ({ ...f, currentPassword: e.target.value }))}
                autoComplete="current-password"
                className={input}
              />
            </label>
          </div>

          <button onClick={start} disabled={busy}
            className="mt-4 w-full rounded-xl bg-teal-600 py-3 font-bold text-white disabled:opacity-40">
            {busy ? "..." : "Davom etish"}
          </button>
        </div>
      ) : (
        <div className="mt-3 rounded-2xl border border-teal-200 bg-teal-50/40 p-4">
          <p className="text-[13.5px] leading-relaxed text-zinc-700">
            Telegram botga 6 xonali kod yuborildi. Uni shu yerga kiriting.
          </p>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="••••••" inputMode="numeric" autoFocus
            className="mt-3 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-center font-mono text-2xl tracking-[0.4em] outline-none focus:border-teal-500"
          />
          <div className="mt-3 flex gap-2">
            <button onClick={confirm} disabled={busy || code.length !== 6}
              className="flex-1 rounded-xl bg-teal-600 py-3 font-bold text-white disabled:opacity-40">
              {busy ? "..." : "Tasdiqlash"}
            </button>
            <button onClick={() => { setStep("form"); setCode(""); }}
              className="rounded-xl border border-zinc-200 px-5 py-3 font-semibold text-zinc-600">
              Orqaga
            </button>
          </div>
          <p className="mt-3 text-[12px] leading-relaxed text-amber-800">
            Kod boshqa birov so&apos;ragan bo&apos;lsa — uni kiritmang va parolingizni
            darhol o&apos;zgartiring.
          </p>
        </div>
      )}

      {toast && <Toast message={toast.msg} error={toast.error} />}
    </div>
  );
}
