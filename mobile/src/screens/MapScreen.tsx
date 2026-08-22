import React, { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, ActivityIndicator, type NativeSyntheticEvent } from "react-native";
import { Map, Camera, Marker, type CameraRef } from "@maplibre/maplibre-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Location from "expo-location";
import { api, getBaseUrl, absUrl } from "../api";
import { C, useTheme } from "../theme";
import { fmtKm } from "../format";
import { Stars, Badge, Cover } from "../components/ui";
import MapsSheet, { openRoute } from "../components/MapsSheet";
import type { ClinicListItem } from "../types";

// Xarita fon uslubi ikkala rejimda ham liberty — ishonchli va bepul.
// (OpenFreeMap rasmiy dark uslubini bermaydi; kelajakda Carto dark qo'shsa bo'ladi)
const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";
const TASHKENT: [number, number] = [69.2797, 41.3111];

type MapApp = { key: string; label: string; letter: string; bg: string; url: string };
type PressPayload = { lngLat: [number, number] };
type RegionPayload = { zoom: number };

function distKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371, dLat = ((lat2 - lat1) * Math.PI) / 180, dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function MapScreen({ route, navigation }: {
  route: { params?: { query?: string } };
  navigation: { navigate: (s: string, p?: object) => void; goBack: () => void };
}) {
  const insets = useSafeAreaInsets();
  useTheme(); // mavzu almashsa ekran qayta chiziladi (remount emas)
  const [clinics, setClinics] = useState<ClinicListItem[]>([]);
  const [selected, setSelected] = useState<ClinicListItem | null>(null);
  const [base, setBase] = useState("");
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [userLoc, setUserLoc] = useState<[number, number] | null>(null);
  const [mapsApps, setMapsApps] = useState<MapApp[] | null>(null);
  const cameraRef = useRef<CameraRef>(null);
  const zoomRef = useRef(11);
  const clinicsRef = useRef<ClinicListItem[]>([]);

  useEffect(() => {
    clinicsRef.current = clinics;
  }, [clinics]);

  useEffect(() => {
    getBaseUrl().then(setBase);
    const q = route.params?.query ?? "";
    api<{ promos: ClinicListItem[]; list: ClinicListItem[] }>(`/api/clinics?${q}`)
      .then((d) => setClinics([...d.promos, ...d.list]))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [route.params?.query]);

  /**
   * Xaritaga bosilganda ISHONCHLI tanlash: bosilgan nuqtaga eng yaqin klinika
   * topiladi (marker hit-testing'ga bog'liq emas — barcha telefonlarda ishlaydi).
   * Tolerantlik ~40 piksel, joriy zoom'ga qarab metrga aylantiriladi.
   */
  const onMapPress = (event: NativeSyntheticEvent<PressPayload>) => {
    const ll = event.nativeEvent?.lngLat;
    if (!ll) { setSelected(null); return; }
    const [lng, lat] = ll;
    const metersPerPx = (156543.03 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoomRef.current);
    const thresholdKm = Math.max((metersPerPx * 40) / 1000, 0.05);

    let best: ClinicListItem | null = null;
    let bestD = Infinity;
    for (const c of clinicsRef.current) {
      const d = distKm(lat, lng, c.lat, c.lng);
      if (d < bestD) { bestD = d; best = c; }
    }
    if (best && bestD <= thresholdKm) {
      setSelected(best);
      cameraRef.current?.easeTo({ center: [best.lng, best.lat], zoom: Math.max(zoomRef.current, 13), duration: 350 });
    } else {
      setSelected(null);
    }
  };

  const locateMe = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const goTo = (lng: number, lat: number) => {
        setUserLoc([lng, lat]);
        cameraRef.current?.easeTo({ center: [lng, lat], zoom: 14, duration: 500 });
      };
      const last = await Location.getLastKnownPositionAsync().catch(() => null);
      if (last) goTo(last.coords.longitude, last.coords.latitude);
      const fresh = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }).catch(() => null);
      if (fresh) goTo(fresh.coords.longitude, fresh.coords.latitude);
    } finally {
      setLocating(false);
    }
  };

  const track = (type: string, clinicId: string) => {
    void api("/api/events", { json: { type, clinicId } }).catch(() => {});
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Map
        style={{ flex: 1 }}
        mapStyle={STYLE_URL}
        onPress={onMapPress}
        onRegionDidChange={(e: NativeSyntheticEvent<RegionPayload>) => {
          if (e.nativeEvent?.zoom) zoomRef.current = e.nativeEvent.zoom;
        }}
      >
        <Camera ref={cameraRef} initialViewState={{ center: TASHKENT, zoom: 11 }} />
        {userLoc && (
          <Marker lngLat={userLoc}>
            <View style={{ width: 15, height: 15, borderRadius: 8, backgroundColor: "#2563eb", borderWidth: 3, borderColor: "#fff" }} />
          </Marker>
        )}
        {clinics.map((c) => (
          <Marker key={c.id} lngLat={[c.lng, c.lat]}>
            <View
              pointerEvents="none"
              style={{
                flexDirection: "row", alignItems: "center", gap: 4,
                backgroundColor: selected?.id === c.id ? C.brand : C.card,
                borderColor: c.isOpen ? C.brand : C.faint, borderWidth: 1.4,
                borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4,
                elevation: 3,
              }}
            >
              <Text style={{
                fontSize: 11.5, fontWeight: "700",
                color: selected?.id === c.id ? "#fff" : c.isOpen ? C.brand : C.mut,
              }}>
                {c.name}
              </Text>
            </View>
          </Marker>
        ))}
      </Map>

      {/* Orqaga */}
      <Pressable onPress={() => navigation.goBack()}
        style={{ position: "absolute", top: insets.top + 10, left: 14, backgroundColor: C.card, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 9, elevation: 4 }}>
        <Text style={{ fontSize: 15, fontWeight: "800", color: C.text }}>←</Text>
      </Pressable>

      {/* Yaqinimda */}
      <Pressable onPress={locateMe} disabled={locating}
        style={{ position: "absolute", bottom: (selected ? 210 : 30) + insets.bottom, right: 14, backgroundColor: C.card, borderRadius: 999, paddingHorizontal: 15, paddingVertical: 11, elevation: 4, flexDirection: "row", alignItems: "center", gap: 6 }}>
        {locating && <ActivityIndicator size="small" color={C.brand} />}
        <Text style={{ fontSize: 13, fontWeight: "800", color: C.brand }}>📍 Yaqinimda</Text>
      </Pressable>

      {loading && <ActivityIndicator color={C.brand} size="large" style={{ position: "absolute", top: "48%", alignSelf: "center" }} />}

      {/* Tanlangan klinika */}
      {selected && (
        <View style={{ position: "absolute", bottom: 20 + insets.bottom, left: 14, right: 14, backgroundColor: C.card, borderRadius: 18, padding: 12, elevation: 6 }}>
          <Pressable onPress={() => navigation.navigate("Clinic", { slug: selected.slug })}
            style={{ flexDirection: "row", gap: 11, alignItems: "center" }}>
            <Cover hue={selected.coverHue} name={selected.name} photoUrl={absUrl(base, selected.photoUrl)} size={52} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "800", fontSize: 14.5, color: C.text }}>{selected.name}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 }}>
                <Stars value={selected.rating} size={11} />
                <Text style={{ fontSize: 12, color: C.mut }}>
                  {selected.rating.toFixed(1)} ({selected.reviewCount}) · {fmtKm(selected.distanceKm)}
                </Text>
              </View>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: 5 }}>
                <Badge label={selected.isOpen ? `Ochiq · ${selected.todayHours}` : "Yopiq"} color={selected.isOpen ? C.green : C.mut} bg={selected.isOpen ? C.greenBg : C.pill} />
                {selected.hasFemaleDoctor && <Badge label="Ayol shifokor" color={C.pink} bg={C.pinkBg} />}
                {selected.childFriendly && <Badge label="Bolalar" color={C.violet} bg={C.violetBg} />}
              </View>
            </View>
            <Text style={{ fontSize: 18, color: C.faint }}>›</Text>
          </Pressable>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
            <Pressable
              onPress={() => {
                track("ROUTE_CLICK", selected.id);
                void openRoute(selected.lat, selected.lng, (apps) => setMapsApps(apps));
              }}
              style={{ flex: 1, backgroundColor: C.brand, borderRadius: 12, paddingVertical: 11, alignItems: "center" }}>
              <Text style={{ color: "#fff", fontWeight: "800", fontSize: 13 }}>📍 Marshrut</Text>
            </Pressable>
            <Pressable
              onPress={() => navigation.navigate("Clinic", { slug: selected.slug })}
              style={{ flex: 1, borderWidth: 1.3, borderColor: C.brand, borderRadius: 12, paddingVertical: 11, alignItems: "center" }}>
              <Text style={{ color: C.brand, fontWeight: "800", fontSize: 13 }}>Batafsil / Yozilish</Text>
            </Pressable>
          </View>
        </View>
      )}

      <MapsSheet open={!!mapsApps} onClose={() => setMapsApps(null)} apps={mapsApps ?? []} />
    </View>
  );
}
