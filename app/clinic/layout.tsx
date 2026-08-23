"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api, useUser } from "@/lib/client";
import { Spinner } from "@/components/ui";
import ThemeToggle from "@/components/ThemeToggle";

function Icon({ d }: { d: string }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

const GROUPS: { title: string; items: { href: string; label: string; icon: ReactNode; exact?: boolean }[] }[] = [
  {
    title: "Kundalik ish",
    items: [
      { href: "/clinic", label: "Yozuvlar", exact: true, icon: <Icon d="M8 2v4M16 2v4M3 10h18M5 6h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z" /> },
      { href: "/clinic/xabarlar", label: "Xabarlar", icon: <Icon d="M21 11.5a8.4 8.4 0 01-9 8.4 9 9 0 01-3.8-.8L3 21l1.9-4.9A8.4 8.4 0 0112 3.1a8.4 8.4 0 019 8.4z" /> },
      { href: "/clinic/qr", label: "QR plakat", icon: <Icon d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h3v3h-3zM19 19h2v2h-2z" /> },
    ],
  },
  {
    title: "Klinika ma'lumoti",
    items: [
      { href: "/clinic/xizmatlar", label: "Xizmat va narxlar", icon: <Icon d="M4 6h16M4 12h16M4 18h10" /> },
      { href: "/clinic/shifokorlar", label: "Shifokorlar", icon: <Icon d="M12 11a4 4 0 100-8 4 4 0 000 8zM4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" /> },
      { href: "/clinic/sozlamalar", label: "Sozlamalar", icon: <Icon d="M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.9-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1A1.7 1.7 0 008.9 19a1.7 1.7 0 00-1.9.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.9 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1A1.7 1.7 0 004.6 8.4a1.7 1.7 0 00-.3-1.9l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.9.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.9-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.9V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" /> },
    ],
  },
  {
    title: "Natijalar",
    items: [
      { href: "/clinic/sharhlar", label: "Sharhlar", icon: <Icon d="M12 2l2.9 6.3 6.6.8-4.9 4.5 1.3 6.6L12 17l-5.9 3.2 1.3-6.6L2.5 9.1l6.6-.8z" /> },
      { href: "/clinic/statistika", label: "Statistika", icon: <Icon d="M3 3v18h18M7 15l4-4 3 3 5-6" /> },
    ],
  },
];

export default function ClinicLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useUser();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  if (loading) return <div className="flex min-h-dvh items-center justify-center"><Spinner /></div>;

  if (!user || user.role !== "CLINIC") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6">
        <p className="text-center font-semibold">Bu bo&apos;lim klinika xodimlari uchun</p>
        <Link href="/kirish?next=/clinic" className="rounded-2xl bg-teal-600 px-6 py-3 font-bold text-white">Kirish</Link>
      </div>
    );
  }

  const logout = async () => {
    await api("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  };

  const nav = (
    <nav className="space-y-5">
      {GROUPS.map((g) => (
        <div key={g.title}>
          <p className="mb-1.5 px-3 text-[10.5px] font-bold uppercase tracking-wider text-zinc-400">{g.title}</p>
          <div className="space-y-0.5">
            {g.items.map((n) => {
              const active = n.exact ? pathname === n.href : pathname.startsWith(n.href);
              return (
                <Link
                  key={n.href} href={n.href}
                  onClick={() => setMenuOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13.5px] font-medium transition ${
                    active ? "bg-teal-600 text-white" : "text-zinc-600 hover:bg-zinc-100"
                  }`}
                >
                  {n.icon}
                  {n.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="min-h-dvh bg-zinc-50 lg:flex">
      {/* ============ YON MENYU ============ */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-zinc-200 bg-white lg:sticky lg:top-0 lg:flex lg:h-dvh">
        <Link href="/clinic" className="flex items-center gap-2 px-4 py-4 font-extrabold text-teal-800">
          <svg width="26" height="26" viewBox="0 0 512 512" aria-hidden>
            <rect width="512" height="512" rx="112" fill="#0f766e" />
            <path d="M256 96c-38 0-52 22-88 22-40 0-72 30-72 76 0 34 12 60 26 88 16 32 22 64 28 106 4 28 10 36 22 36 14 0 20-10 24-34 6-38 14-70 30-70h60c16 0 24 32 30 70 4 24 10 34 24 34 12 0 18-8 22-36 6-42 12-74 28-106 14-28 26-54 26-88 0-46-32-76-72-76-36 0-50-22-88-22z" fill="#fff" />
          </svg>
          StomGo
        </Link>

        <div className="flex-1 overflow-y-auto px-2 pb-4">{nav}</div>

        <div className="border-t border-zinc-200 p-2">
          <div className="flex items-center gap-2.5 rounded-lg px-3 py-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-600 text-[13px] font-bold text-white">
              {(user.name ?? "K")[0].toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold">{user.name ?? "Klinika"}</span>
              <span className="block truncate font-mono text-[11px] text-zinc-400">{user.username}</span>
            </span>
          </div>
          <div className="mt-1 flex items-center gap-1 px-1">
            <Link href="/" className="flex-1 rounded-lg px-2 py-1.5 text-center text-[12px] text-zinc-500 hover:bg-zinc-100">
              Sayt
            </Link>
            <ThemeToggle />
            <button onClick={logout} className="flex-1 rounded-lg px-2 py-1.5 text-[12px] text-red-600 hover:bg-zinc-100">
              Chiqish
            </button>
          </div>
        </div>
      </aside>

      {/* ============ TELEFON ============ */}
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-zinc-200 bg-white px-3 py-2.5 lg:hidden">
          <button onClick={() => setMenuOpen((v) => !v)} aria-label="Menyu"
            className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-zinc-100">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d={menuOpen ? "M18 6L6 18M6 6l12 12" : "M4 7h16M4 12h16M4 17h16"} />
            </svg>
          </button>
          <Link href="/clinic" className="flex-1 truncate font-extrabold text-teal-800">
            {user.name ?? "Klinika"}
          </Link>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-600 text-[13px] font-bold text-white">
            {(user.name ?? "K")[0].toUpperCase()}
          </span>
        </header>

        {menuOpen && (
          <div className="border-b border-zinc-200 bg-white px-2 py-3 lg:hidden">
            {nav}
            <div className="mt-4 flex items-center gap-2 border-t border-zinc-200 px-1 pt-3">
              <Link href="/" className="flex-1 rounded-lg px-2 py-2 text-center text-[13px] text-zinc-600 hover:bg-zinc-100">Sayt</Link>
              <ThemeToggle />
              <button onClick={logout} className="flex-1 rounded-lg px-2 py-2 text-[13px] text-red-600 hover:bg-zinc-100">Chiqish</button>
            </div>
          </div>
        )}

        <main className="mx-auto w-full max-w-7xl p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
