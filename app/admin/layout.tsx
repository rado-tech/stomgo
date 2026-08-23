"use client";

import { type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api, useUser } from "@/lib/client";
import { Spinner } from "@/components/ui";
import ThemeToggle from "@/components/ThemeToggle";

const NAV = [
  { href: "/admin", label: "Boshqaruv", exact: true },
  { href: "/admin/hisob", label: "Mening hisobim" },
  { href: "/admin/klinikalar", label: "Klinikalar" },
  { href: "/admin/yozuvlar", label: "Yozuvlar" },
  { href: "/admin/foydalanuvchilar", label: "Foydalanuvchilar" },
  { href: "/admin/shifokorlar", label: "Shifokor hujjatlari" },
  { href: "/admin/xizmatlar", label: "Xizmatlar katalogi" },
  { href: "/admin/sharhlar", label: "Sharh moderatsiyasi" },
  { href: "/admin/promo", label: "Top joylashuv" },
  { href: "/admin/qollab", label: "Qo'llab-quvvatlash" },
  { href: "/admin/loglar", label: "Jurnal" },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useUser();
  const pathname = usePathname();
  const router = useRouter();

  if (loading) return <div className="flex min-h-dvh items-center justify-center"><Spinner /></div>;
  if (!user || user.role !== "ADMIN") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6">
        <p className="font-semibold">Bu bo&apos;lim administratorlar uchun</p>
        <Link href="/kirish?next=/admin" className="rounded-2xl bg-teal-600 px-6 py-3 font-bold text-white">Kirish</Link>
      </div>
    );
  }

  const logout = async () => {
    await api("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  };

  return (
    <div className="min-h-dvh">
      <header className="border-b border-zinc-200 bg-zinc-900 text-white">
        <div className="flex items-center justify-between px-4 py-2.5">
          <Link href="/admin" className="flex items-center gap-2 font-extrabold">
            StomGo <span className="rounded bg-red-500 px-1.5 py-0.5 text-[10px]">ADMIN</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/" aria-label="Saytga qaytish"
              className="flex items-center gap-2 text-[13px] font-medium text-zinc-300 transition hover:text-white">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-700">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
                </svg>
              </span>
              Sayt
            </Link>
            <ThemeToggle />
            <button onClick={logout} className="text-[13px] font-medium text-zinc-300 hover:text-white">Chiqish</button>
          </div>
        </div>
        {/* Mobilda ham sig'adigan aylanma nav */}
        <nav className="scrollbar-none flex gap-1 overflow-x-auto px-3 pb-2">
          {NAV.map((n) => {
            const active = n.exact ? pathname === n.href : pathname.startsWith(n.href);
            return (
              <Link key={n.href} href={n.href}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-[13px] font-medium ${active ? "bg-zinc-700" : "text-zinc-300 hover:bg-zinc-800"}`}>
                {n.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="p-4 md:p-6">{children}</main>
    </div>
  );
}
