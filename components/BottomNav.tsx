"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "@/components/I18nProvider";
import type { TranslationKey } from "@/lib/i18n";

/** 5 bo'limli pastki navigatsiya — markazda AI maslahatchi */
const TABS = [
  {
    href: "/", key: "nav.home" as TranslationKey, exact: true,
    icon: (a: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={a ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.7">
        <path d="M3 10.2L12 3l9 7.2V20a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1v-9.8z" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/klinikalar", key: "nav.clinics" as TranslationKey,
    icon: (a: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={a ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.7">
        <path d="M4 21V7a1 1 0 011-1h6V3h8a1 1 0 011 1v17" strokeLinejoin="round" />
        <path d="M2 21h20M8 10h.01M8 14h.01M15 10h.01M15 14h.01M15 18h.01" strokeLinecap="round" />
      </svg>
    ),
  },
  { href: "/triaj", key: "nav.ai" as TranslationKey, center: true },
  {
    href: "/xabarlar", key: "nav.messages" as TranslationKey,
    icon: (a: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={a ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.7">
        <path d="M21 11.5a8.4 8.4 0 01-9 8.4 9 9 0 01-3.8-.8L3 21l1.9-4.9A8.4 8.4 0 0112 3.1a8.4 8.4 0 019 8.4z" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/profil", key: "nav.profile" as TranslationKey,
    icon: (a: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
        <circle cx="12" cy="8.5" r="3.6" fill={a ? "currentColor" : "none"} />
        <path d="M4.5 20.5c0-3.9 3.4-6.6 7.5-6.6s7.5 2.7 7.5 6.6" strokeLinecap="round" />
      </svg>
    ),
  },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { t } = useT();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-zinc-100 bg-white/97 backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex max-w-md items-end">
        {TABS.map((tab) => {
          const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);

          if (tab.center) {
            return (
              <Link key={tab.href} href={tab.href} className="flex flex-1 flex-col items-center">
                <span className={`-mt-4 flex h-12 w-12 items-center justify-center rounded-full ring-4 ring-white ${active ? "bg-teal-700" : "bg-teal-600"}`}>
                  <svg width="21" height="21" viewBox="0 0 24 24" fill="#fff">
                    <path d="M12 2l1.6 4.6L18 8.2l-4.4 1.6L12 14.4l-1.6-4.6L6 8.2l4.4-1.6L12 2z" />
                    <path d="M18.5 14l.9 2.5 2.6.9-2.6.9-.9 2.5-.9-2.5-2.6-.9 2.6-.9.9-2.5z" opacity=".85" />
                  </svg>
                </span>
                <span className={`pb-1.5 pt-0.5 text-[10.5px] font-bold ${active ? "text-teal-700" : "text-zinc-500"}`}>{t(tab.key)}</span>
              </Link>
            );
          }

          return (
            <Link key={tab.href} href={tab.href} className="flex flex-1 flex-col items-center gap-0.5 pb-1.5 pt-2">
              <span className={active ? "text-teal-700" : "text-zinc-400"}>{tab.icon!(active)}</span>
              <span className={`text-[10.5px] font-semibold ${active ? "text-teal-700" : "text-zinc-500"}`}>{t(tab.key)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
