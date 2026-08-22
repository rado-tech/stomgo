import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="text-5xl">🦷</p>
      <h1 className="text-xl font-extrabold">Sahifa topilmadi</h1>
      <p className="text-[14px] text-zinc-500">Qidirayotgan sahifangiz mavjud emas yoki ko&apos;chirilgan.</p>
      <Link href="/" className="mt-2 rounded-2xl bg-teal-600 px-6 py-3 font-bold text-white">
        Bosh sahifaga qaytish
      </Link>
    </div>
  );
}
