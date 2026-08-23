import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Appearance } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Mavzu tizimi (Joymee uslubidagi toza, yumshoq interfeys).
 * Rejim almashganda navigatsiya QAYTA YUKLANMAYDI — faqat ranglar yangilanadi.
 */

const LIGHT = {
  // Sirtlar — fon brend rangi bilan bir oilada (sovuq, ozgina yashil tovlanish)
  bg: "#f1f4f4",        // umumiy fon
  card: "#ffffff",      // kartochka
  pill: "#e8edec",      // tugma/qidiruv "hab"lari
  pillActive: "#0f766e",
  softer: "#f7f9f9",

  // Matn — sof qora emas, ko'zga yumshoq
  text: "#0d1a19",
  ink2: "#33413f",
  ink3: "#4d5a58",
  mut: "#6a7674",
  faint: "#98a3a1",

  line: "#e2e8e7",
  starOff: "#dbe3e1",

  // Brend
  brand: "#0f766e",
  brandDark: "#0b5c56",
  brandLight: "#d7f5f1",
  onBrand: "#ffffff",

  // Aksent (VIP, muhim belgilar) — teal bilan muvozanatda, neon emas
  accent: "#e0a106",
  accentSoft: "#fff3d6",
  accentInk: "#7a5600",

  outlinePrimary: "#0f766e",
  outlineAccent: "#e0a106",

  red: "#d93a40",
  redBg: "#fdf0f0",
  amber: "#b87400",
  amberBg: "#fff5e3",
  amberInk: "#7a5600",
  green: "#0b8a5a",
  greenBg: "#e6f6ee",
  sky: "#0b7fc4",
  skyBg: "#e8f3fb",
  violet: "#6d46c8",
  violetBg: "#f0ebfd",
  pink: "#c92c7f",
  pinkBg: "#fceaf3",
};

const DARK: typeof LIGHT = {
  // Sof qora emas — brend bilan bir oiladagi to'q slate (ko'zni charchatmaydi)
  bg: "#0d1211",
  card: "#161d1c",
  pill: "#222b2a",
  pillActive: "#2dd4bf",
  softer: "#121817",

  text: "#ffffff",
  ink2: "#e9efee",
  ink3: "#d3dbda",
  mut: "#a8b3b1",
  faint: "#7d8886",

  line: "#2b3634",
  starOff: "#3a4644",

  brand: "#2dd4bf",
  brandDark: "#5eead4",
  brandLight: "rgba(45, 212, 191, 0.16)",
  onBrand: "#04211f",

  accent: "#ffcb2b",
  accentSoft: "rgba(255, 203, 43, 0.16)",
  accentInk: "#ffcb2b",

  // Tunda muhim tugmalar ajralib tursin
  outlinePrimary: "#ffffff",
  outlineAccent: "#ffcb2b",

  red: "#ff6b6f",
  redBg: "rgba(229, 72, 77, 0.18)",
  amber: "#ffcb2b",
  amberBg: "rgba(245, 179, 1, 0.18)",
  amberInk: "#ffcb2b",
  green: "#3ddc97",
  greenBg: "rgba(11, 138, 90, 0.22)",
  sky: "#4cb8f5",
  skyBg: "rgba(11, 127, 196, 0.2)",
  violet: "#b39bf5",
  violetBg: "rgba(109, 70, 200, 0.22)",
  pink: "#f57cb8",
  pinkBg: "rgba(201, 44, 127, 0.2)",
};

/** O'lchov tokenlari — butun ilovada bir xil ritm */
export const R = { pill: 999, card: 20, tile: 16, input: 14 };
export const SP = { screen: 16, gap: 10 };

export type ThemeMode = "light" | "dark" | "system";

export const themeState = {
  mode: "system" as ThemeMode,
  dark: Appearance.getColorScheme() === "dark",
};

export const C: typeof LIGHT = { ...(themeState.dark ? DARK : LIGHT) };

function resolveDark(mode: ThemeMode): boolean {
  return mode === "system" ? Appearance.getColorScheme() === "dark" : mode === "dark";
}

function applyMode(mode: ThemeMode) {
  themeState.mode = mode;
  themeState.dark = resolveDark(mode);
  Object.assign(C, themeState.dark ? DARK : LIGHT);
}

type Ctx = { mode: ThemeMode; dark: boolean; version: number; setMode: (m: ThemeMode) => void };
const ThemeCtx = createContext<Ctx>({ mode: "system", dark: false, version: 0, setMode: () => {} });

export function useTheme() {
  return useContext(ThemeCtx);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [version, setVersion] = useState(0);
  const [mode, setModeState] = useState<ThemeMode>(themeState.mode);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const saved = (await AsyncStorage.getItem("sg_scheme").catch(() => null)) as ThemeMode | null;
      if (!alive) return;
      applyMode(saved ?? "system");
      setModeState(themeState.mode);
      setVersion((v) => v + 1);
      setReady(true);
    })();
    return () => { alive = false; };
  }, []);

  const setMode = useCallback((m: ThemeMode) => {
    applyMode(m);
    setModeState(m);
    setVersion((v) => v + 1);
    void AsyncStorage.setItem("sg_scheme", m).catch(() => {});
  }, []);

  const value = useMemo<Ctx>(() => ({ mode, dark: themeState.dark, version, setMode }), [mode, version, setMode]);

  if (!ready) return null;
  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export function statusUi(status: string): { label: string; color: string; bg: string } | undefined {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    PENDING: { label: "Kutilmoqda", color: C.amber, bg: C.amberBg },
    CONFIRMED: { label: "Tasdiqlangan", color: C.green, bg: C.greenBg },
    ALT_OFFERED: { label: "Boshqa vaqt taklifi", color: C.sky, bg: C.skyBg },
    REJECTED: { label: "Rad etilgan", color: C.red, bg: C.redBg },
    CANCELLED: { label: "Bekor qilingan", color: C.mut, bg: C.pill },
    ARRIVED: { label: "Bordim", color: C.green, bg: C.greenBg },
    NO_SHOW: { label: "Bormadim", color: C.red, bg: C.redBg },
    DONE: { label: "Yakunlangan", color: C.violet, bg: C.violetBg },
  };
  return map[status];
}

export const SPECIALTY_LABELS: Record<string, string> = {
  TERAPEVT: "Terapevt-stomatolog",
  XIRURG: "Xirurg-stomatolog",
  ORTOPED: "Ortoped-stomatolog",
  ORTODONT: "Ortodont",
  BOLALAR: "Bolalar stomatologi",
  GIGIENIST: "Gigienist",
  IMPLANTOLOG: "Implantolog",
};
