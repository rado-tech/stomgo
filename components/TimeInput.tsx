"use client";

/**
 * 24 soatlik vaqt tanlagich.
 *
 * <input type="time"> brauzer TILIGA qarab ko'rinadi — ingliz lokalida
 * AM/PM chiqadi. Bizda vaqt doim 24 soatlik bo'lishi kerak, shuning uchun
 * ikkita oddiy ro'yxatdan foydalanamiz. Qiymat "HH:MM" ko'rinishida.
 */
export default function TimeInput({
  value,
  onChange,
  step = 15,
  className = "",
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  /** Daqiqa qadami: 15 (standart), 30 yoki 5 */
  step?: 5 | 15 | 30;
  className?: string;
  ariaLabel?: string;
}) {
  const [hh = "", mm = ""] = (value || "").split(":");

  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
  const minutes = Array.from({ length: Math.floor(60 / step) }, (_, i) =>
    String(i * step).padStart(2, "0")
  );

  // Mavjud qiymat qadamga tushmasa ham ro'yxatda ko'rinsin
  if (mm && !minutes.includes(mm)) minutes.push(mm);
  minutes.sort();

  const set = (h: string, m: string) => onChange(`${h || "09"}:${m || "00"}`);

  const sel =
    "rounded-xl border border-zinc-200 bg-white px-2.5 py-2 text-[14px] tabular-nums text-zinc-900 outline-none focus:border-teal-500";

  return (
    <span className={`inline-flex items-center gap-1 ${className}`} aria-label={ariaLabel}>
      <select value={hh} onChange={(e) => set(e.target.value, mm)} className={sel} aria-label="Soat">
        {!hh && <option value="">--</option>}
        {hours.map((h) => <option key={h} value={h}>{h}</option>)}
      </select>
      <span className="font-bold text-zinc-400">:</span>
      <select value={mm} onChange={(e) => set(hh, e.target.value)} className={sel} aria-label="Daqiqa">
        {!mm && <option value="">--</option>}
        {minutes.map((m) => <option key={m} value={m}>{m}</option>)}
      </select>
    </span>
  );
}
