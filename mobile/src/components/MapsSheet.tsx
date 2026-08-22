import React, { useEffect, useState } from "react";
import { Text, Pressable, View, Linking } from "react-native";
import { C } from "../theme";
import { Sheet } from "./ui";

/**
 * Marshrut: telefonda O'RNATILGAN xarita ilovalarigina ko'rsatiladi.
 * Hech biri yo'q bo'lsa — brauzerda Yandex Maps ochiladi (sheet chiqmaydi).
 */

type MapApp = { key: string; label: string; letter: string; bg: string; url: string };

export async function detectMapApps(lat: number, lng: number): Promise<MapApp[]> {
  const candidates: (MapApp & { probe: string })[] = [
    {
      key: "yandex", label: "Yandex Maps", letter: "Y", bg: "#ef4444",
      probe: "yandexmaps://",
      url: `yandexmaps://maps.yandex.ru/?rtext=~${lat},${lng}&rtt=auto`,
    },
    {
      key: "google", label: "Google Maps", letter: "G", bg: "#ffffff",
      probe: `google.navigation:q=${lat},${lng}`,
      url: `google.navigation:q=${lat},${lng}`,
    },
  ];
  const available: MapApp[] = [];
  for (const c of candidates) {
    try {
      if (await Linking.canOpenURL(c.probe)) available.push(c);
    } catch { /* aniqlab bo'lmadi — o'tkazamiz */ }
  }
  return available;
}

export const webFallbackUrl = (lat: number, lng: number) =>
  `https://yandex.uz/maps/?rtext=~${lat},${lng}&rtt=auto`;

export default function MapsSheet({
  open, onClose, apps, onPick,
}: {
  open: boolean;
  onClose: () => void;
  apps: MapApp[];
  onPick?: () => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} title="Marshrut tuzish">
      {apps.map((a) => (
        <Pressable
          key={a.key}
          onPress={() => { onPick?.(); void Linking.openURL(a.url); onClose(); }}
          style={{ flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1.2, borderColor: C.line, borderRadius: 15, padding: 13, marginBottom: 8 }}
        >
          <View style={{
            width: 38, height: 38, borderRadius: 11, backgroundColor: a.bg,
            alignItems: "center", justifyContent: "center",
            borderWidth: a.bg === "#ffffff" ? 1 : 0, borderColor: C.line,
          }}>
            <Text style={{ color: a.bg === "#ffffff" ? "#0ea5e9" : "#fff", fontWeight: "900", fontSize: 17 }}>{a.letter}</Text>
          </View>
          <Text style={{ fontWeight: "700", fontSize: 14.5 }}>{a.label}</Text>
        </Pressable>
      ))}
    </Sheet>
  );
}

/** Marshrut tugmasi bosilganda chaqiriladi: 2+ ilova — sheet, 1 ta — to'g'ridan-to'g'ri, 0 — brauzer */
export async function openRoute(
  lat: number, lng: number,
  showSheet: (apps: MapApp[]) => void,
  onPick?: () => void
) {
  const apps = await detectMapApps(lat, lng);
  if (apps.length === 0) {
    onPick?.();
    void Linking.openURL(webFallbackUrl(lat, lng));
  } else if (apps.length === 1) {
    onPick?.();
    void Linking.openURL(apps[0].url);
  } else {
    showSheet(apps);
  }
}
