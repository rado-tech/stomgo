"use client";

import { type ReactNode } from "react";

export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} yulduz`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 20 20"
          fill={i <= Math.round(value) ? "#f59e0b" : "#e5e7eb"}>
          <path d="M10 1.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8L10 14.9l-5.3 2.7 1-5.8L1.5 7.7l5.9-.9L10 1.5z" />
        </svg>
      ))}
    </span>
  );
}

const BADGE_COLORS: Record<string, string> = {
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  red: "bg-red-50 text-red-700 border-red-200",
  sky: "bg-sky-50 text-sky-700 border-sky-200",
  violet: "bg-violet-50 text-violet-700 border-violet-200",
  zinc: "bg-zinc-100 text-zinc-600 border-zinc-200",
  orange: "bg-orange-50 text-orange-700 border-orange-200",
  teal: "bg-teal-50 text-teal-700 border-teal-200",
  pink: "bg-pink-50 text-pink-700 border-pink-200",
};

export function Badge({ color = "zinc", children }: { color?: string; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${BADGE_COLORS[color] ?? BADGE_COLORS.zinc}`}>
      {children}
    </span>
  );
}

export function Cover({ hue, name, photoUrl, className = "" }: { hue: number; name: string; photoUrl?: string | null; className?: string }) {
  if (photoUrl) {
    return (
      <div
        className={`overflow-hidden bg-zinc-100 ${className}`}
        style={{ backgroundImage: `url(${photoUrl})`, backgroundSize: "cover", backgroundPosition: "center" }}
        role="img"
        aria-label={name}
      />
    );
  }
  return (
    <div
      className={`flex items-center justify-center font-bold text-white ${className}`}
      style={{ background: `linear-gradient(135deg, hsl(${hue} 55% 45%), hsl(${(hue + 40) % 360} 50% 35%))` }}
    >
      {name.slice(0, 1).toUpperCase()}
    </div>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-block h-5 w-5 animate-spin rounded-full border-2 border-teal-600 border-t-transparent ${className}`} />
  );
}

export function EmptyState({ icon, title, subtitle }: { icon?: ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      {icon && <div className="mb-3 text-4xl">{icon}</div>}
      <p className="font-semibold text-zinc-700">{title}</p>
      {subtitle && <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>}
    </div>
  );
}

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: string; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="sg-sheet relative z-10 max-h-[88vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 sm:max-w-lg sm:rounded-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-bold">{title}</h3>
          <button onClick={onClose} className="rounded-full p-2 text-zinc-400 hover:bg-zinc-100" aria-label="Yopish">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Chip({ active, onClick, children }: { active?: boolean; onClick?: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full border px-3 py-1.5 text-[13px] font-medium transition ${
        active
          ? "border-teal-600 bg-teal-600 text-white"
          : "border-zinc-200 bg-white text-zinc-700 hover:border-teal-300"
      }`}
    >
      {children}
    </button>
  );
}

export function Toast({ message, error }: { message: string; error?: boolean }) {
  return (
    <div className={`fixed bottom-24 left-1/2 z-[60] -translate-x-1/2 rounded-xl px-4 py-2.5 text-sm font-medium text-white shadow-lg ${error ? "bg-red-600" : "bg-zinc-800"}`}>
      {message}
    </div>
  );
}
