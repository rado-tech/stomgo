"use client";

import { type ReactNode } from "react";
import BackButton from "@/components/BackButton";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api, useUser } from "@/lib/client";
import { Spinner } from "@/components/ui";
import ThemeToggle from "@/components/ThemeToggle";

const NAV = [
  { href: "/clinic", label: "Yozuvlar", exact: true },
  { href: "/clinic/xizmatlar", label: "Xizmatlar va narxlar" },
  { href: "/clinic/shifokorlar", label: "Shifokorlar" },
  { href: "/clinic/xabarlar", label: "Xabarlar" },
  { href: "/clinic/sharhlar", label: "Sharhlar" },
  { href: "/clinic/statistika", label: "Statistika" },
  { href: "/clinic/qr", label: "QR kod (check-in)" },
  { href: "/clinic/sozlamalar", label: "Sozlamalar" },
];

export default function ClinicLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useUser();
  const pathname = usePathname();
  const router = useRouter();

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

  return (
    <div className="flex min-h-dvh">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-zinc-200 bg-white p-4 md:flex">
        <Link href="/" className="mb-6 flex items-center gap-2">
          <svg width="26" height="26" viewBox="0 0 512 512"><rect width="512" height="512" rx="112" fill="#0f766e"/><path d="M256 96c-38 0-52 22-88 22-40 0-72 30-72 76 0 34 12 60 26 88 16 32 22 64 28 106 4 28 10 36 22 36 14 0 20-10 24-34 6-38 14-70 30-70h60c16 0 24 32 30 70 4 24 10 34 24 34 12 0 18-8 22-36 6-42 12-74 28-106 14-28 26-54 26-88 0-46-32-76-72-76-36 0-50-22-88-22z" fill="#fff"/></svg>
          <span className="font-extrabold text-teal-800">StomGo</span>
          <span className="rounded bg-teal-50 px-1.5 py-0.5 text-[10px] font-bold text-teal-700">KLINIKA</span>
        </Link>
        <nav className="flex flex-col gap-1">
          {NAV.map((n) => {
            const active = n.exact ? pathname === n.href : pathname.startsWith(n.href);
            return (
              <Link key={n.href} href={n.href}
                className={`rounded-xl px-3 py-2 text-[14px] font-medium ${active ? "bg-teal-50 text-teal-800" : "text-zinc-600 hover:bg-zinc-50"}`}>
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto">
          <div className="flex items-center justify-between px-3">
            <Link href="/" className="text-[13px] font-medium text-zinc-500 hover:text-teal-700">← Saytga qaytish</Link>
            <ThemeToggle />
          </div>
          <p className="mt-2 truncate px-3 text-[12px] text-zinc-400">{user.name}</p>
          <button onClick={logout} className="mt-1 w-full rounded-xl px-3 py-2 text-left text-[14px] font-medium text-red-600 hover:bg-red-50">
            Chiqish
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobil nav */}
        <div className="scrollbar-none flex items-center gap-1 overflow-x-auto border-b border-zinc-200 bg-white px-3 py-2 md:hidden">
          <BackButton href="/" className="shrink-0" />
          {NAV.map((n) => {
            const active = n.exact ? pathname === n.href : pathname.startsWith(n.href);
            return (
              <Link key={n.href} href={n.href}
                className={`shrink-0 rounded-full px-3 py-1.5 text-[13px] font-medium ${active ? "bg-teal-600 text-white" : "bg-zinc-100 text-zinc-600"}`}>
                {n.label}
              </Link>
            );
          })}
        </div>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
