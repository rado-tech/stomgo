import Link from "next/link";

/**
 * Sayt pastki qismi — huquqiy havolalar va klinikalar uchun kirish nuqtasi.
 * Telefonda pastki menyu (BottomNav) yopib qolmasligi uchun pastdan bo'shliq.
 */
export default function SiteFooter() {
  return (
    <footer className="mt-10 border-t border-zinc-100 px-4 pb-24 pt-6 md:pb-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <Link
          href="/hamkorlik"
          className="flex items-center gap-3 rounded-2xl border border-teal-200 bg-teal-50/60 px-4 py-3 transition hover:bg-teal-50 md:max-w-md"
        >
          <span className="text-2xl" aria-hidden>🤝</span>
          <span className="min-w-0">
            <span className="block text-[13.5px] font-bold text-teal-900">
              Klinikangizni StomGo&apos;ga qo&apos;shing
            </span>
            <span className="block text-[12px] text-teal-700">
              Ulanish bepul — ariza qoldiring, biz bog&apos;lanamiz
            </span>
          </span>
        </Link>

        <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[12.5px] text-zinc-500">
          <Link href="/narxlar" className="hover:text-zinc-800">Narxlar</Link>
          <Link href="/klinikalar" className="hover:text-zinc-800">Klinikalar</Link>
          <Link href="/oferta" className="hover:text-zinc-800">Shartnoma</Link>
          <Link href="/maxfiylik" className="hover:text-zinc-800">Maxfiylik</Link>
          <Link href="/kirish" className="hover:text-zinc-800">Xodimlar kirishi</Link>
        </nav>
      </div>

      <p className="mx-auto mt-4 max-w-6xl text-[11.5px] leading-relaxed text-zinc-400">
        StomGo — Toshkentdagi stomatologiya klinikalarini topish va onlayn qabulga
        yozilish xizmati. Tashxis qo&apos;ymaymiz va davolash tayinlamaymiz.
      </p>
    </footer>
  );
}
