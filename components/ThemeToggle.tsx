"use client";

import { useEffect, useState } from "react";

/** Kunduzgi/tungi rejim almashtirgichi — tanlov localStorage'da saqlanadi */
export default function ThemeToggle({ className = "" }: { className?: string }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    // Sinxron setState'dan qochish uchun keyingi tickka qoldiramiz
    const t = setTimeout(() => setDark(document.documentElement.dataset.theme === "dark"), 0);
    return () => clearTimeout(t);
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    if (next) {
      document.documentElement.dataset.theme = "dark";
      localStorage.setItem("sg_theme", "dark");
    } else {
      delete document.documentElement.dataset.theme;
      localStorage.setItem("sg_theme", "light");
    }
  };

  return (
    <button
      onClick={toggle}
      aria-label={dark ? "Kunduzgi rejim" : "Tungi rejim"}
      title={dark ? "Kunduzgi rejim" : "Tungi rejim"}
      className={`rounded-full bg-zinc-100 p-2 text-[15px] leading-none hover:bg-zinc-200 ${className}`}
    >
      {dark ? "☀️" : "🌙"}
    </button>
  );
}
