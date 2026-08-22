"use client";

import { useRef, useState } from "react";

/** Rasm tanlash → /api/upload ga yuborish → natija URL qaytarish */
export default function UploadButton({
  target, doctorId, label = "Rasm yuklash", onDone,
}: {
  target: "clinic" | "doctor" | "me" | "gallery";
  doctorId?: string;
  label?: string;
  onDone: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const upload = async (file: File) => {
    setBusy(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("target", target);
      if (doctorId) fd.append("doctorId", doctorId);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Yuklash xatosi");
      onDone(data.url);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <span className="inline-flex flex-col gap-1">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void upload(f);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="rounded-xl border border-teal-600 px-4 py-2 text-[13px] font-semibold text-teal-700 disabled:opacity-50"
      >
        {busy ? "Yuklanmoqda..." : label}
      </button>
      {error && <span className="text-[12px] text-red-600">{error}</span>}
    </span>
  );
}
