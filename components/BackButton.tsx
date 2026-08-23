"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";

/**
 * Orqaga tugmasi — butun saytda bir xil: to'q doira ichida oq strelka.
 * `href` berilsa aniq sahifaga, berilmasa brauzer tarixida orqaga qaytadi.
 */
export default function BackButton({
  href,
  label,
  className = "",
}: {
  href?: string;
  /** Yonida matn kerak bo'lsa (masalan "Barcha xizmatlar") */
  label?: string;
  className?: string;
}) {
  const router = useRouter();

  const circle = (
    <span
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-white transition hover:bg-zinc-700"
      aria-hidden
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 12H5" />
        <path d="M12 19l-7-7 7-7" />
      </svg>
    </span>
  );

  const content = label ? (
    <span className="flex items-center gap-2.5">
      {circle}
      <span className="text-[14px] font-semibold text-zinc-700">{label}</span>
    </span>
  ) : (
    circle
  );

  if (href) {
    return (
      <Link href={href} aria-label={label ?? "Orqaga"} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={() => router.back()} aria-label={label ?? "Orqaga"} className={className}>
      {content}
    </button>
  );
}
