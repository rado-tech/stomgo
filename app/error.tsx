"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="text-5xl">⚠️</p>
      <h1 className="text-xl font-extrabold">Xatolik yuz berdi</h1>
      <p className="text-[14px] text-zinc-500">Kutilmagan muammo. Qayta urinib ko&apos;ring.</p>
      <button onClick={reset} className="mt-2 rounded-2xl bg-teal-600 px-6 py-3 font-bold text-white">
        Qayta urinish
      </button>
    </div>
  );
}
