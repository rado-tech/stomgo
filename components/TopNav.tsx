"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";
import NotifBell from "./NotifBell";

/**
 * Kompyuter uchun yuqori navigatsiya (md dan boshlab ko'rinadi).
 * Telefonda o'rniga BottomNav ishlaydi.
 */

const LINKS = [
  { href: "/", label: "Asosiy", exact: true },
  { href: "/klinikalar", label: "Klinikalar" },
  { href: "/narxlar", label: "Narxlar" },
  { href: "/triaj", label: "AI maslahat" },
  { href: "/xabarlar", label: "Xabarlar" },
  { href: "/profil", label: "Profil" },
];

export default function TopNav({ sticky = true }: { sticky?: boolean }) {
  const pathname = usePathname();

  return (
    <header
      className={`z-30 hidden border-b border-zinc-100 bg-white/95 backdrop-blur md:block ${sticky ? "sticky top-0" : ""}`}
    >
      <div className="mx-auto flex w-full max-w-7xl items-center gap-2 px-6 py-3">
        <Link href="/" className="mr-3 flex shrink-0 items-center gap-2">
          <svg width="28" height="28" viewBox="0 0 512 512" aria-hidden>
            <rect width="512" height="512" rx="112" fill="#0f766e" />
            <path d="M256 96c-38 0-52 22-88 22-40 0-72 30-72 76 0 34 12 60 26 88 16 32 22 64 28 106 4 28 10 36 22 36 14 0 20-10 24-34 6-38 14-70 30-70h60c16 0 24 32 30 70 4 24 10 34 24 34 12 0 18-8 22-36 6-42 12-74 28-106 14-28 26-54 26-88 0-46-32-76-72-76-36 0-50-22-88-22z" fill="#fff" />
          </svg>
          <span className="text-lg font-extrabold tracking-tight text-teal-800">StomGo</span>
        </Link>

        <nav className="flex items-center gap-1">
          {LINKS.map((l) => {
            const active = l.exact ? pathname === l.href : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-full px-3.5 py-2 text-[14px] font-semibold transition ${
                  active ? "bg-teal-50 text-teal-800" : "text-zinc-600 hover:bg-zinc-100"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <NotifBell />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
