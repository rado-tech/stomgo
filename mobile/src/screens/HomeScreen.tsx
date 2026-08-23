import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, FlatList, Pressable, RefreshControl, ScrollView, ActivityIndicator, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { api, getBaseUrl, absUrl, getToken } from "../api";
import { C, R, useTheme } from "../theme";
import { fmtKm, fmtPrice } from "../format";
import { Stars, Badge, Chip, Cover, IconPill, Sheet, Empty } from "../components/ui";
import type { ClinicListItem } from "../types";

const TASHKENT = { lat: 41.3111, lng: 69.2797 };

const SERVICES = [
  ["", "Barchasi"], ["konsultatsiya", "Konsultatsiya"], ["plomba", "Plomba"],
  ["kanal", "Kanal davolash"], ["tozalash", "Tozalash"], ["oqartirish", "Oqartirish"],
  ["olib_tashlash", "Tish olib tashlash"], ["implant", "Implant"], ["koronka", "Koronka"],
  ["breket", "Breket"], ["vinir", "Vinir"], ["bolalar_davolash", "Bolalar davolash"],
] as const;

type Mode = "near" | "open" | "urgent";

export default function HomeScreen({ navigation }: { navigation: { navigate: (s: string, p?: object) => void } }) {
  const insets = useSafeAreaInsets();
  useTheme();
  const [geo, setGeo] = useState(TASHKENT);
  const [base, setBase] = useState("");
  const [data, setData] = useState<{ promos: ClinicListItem[]; list: ClinicListItem[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [mode, setMode] = useState<Mode>("near");
  const [service, setService] = useState("");
  const [svcOpen, setSvcOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [flags, setFlags] = useState({ female: false, child: false, night: false });

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      void (async () => {
        if (!(await getToken())) { if (alive) setUnread(0); return; }
        const d = await api<{ unread: number }>("/api/notifications").catch(() => null);
        if (alive && d) setUnread(d.unread);
      })();
      return () => { alive = false; };
    }, [])
  );

  useEffect(() => {
    getBaseUrl().then(setBase);
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const last = await Location.getLastKnownPositionAsync().catch(() => null);
        if (last) setGeo({ lat: last.coords.latitude, lng: last.coords.longitude });
        const fresh = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }).catch(() => null);
        if (fresh) setGeo({ lat: fresh.coords.latitude, lng: fresh.coords.longitude });
      }
    })();
  }, []);

  const query = useMemo(() => {
    const p = new URLSearchParams();
    p.set("lat", String(geo.lat)); p.set("lng", String(geo.lng));
    p.set("sort", "distance");
    if (q.trim()) p.set("q", q.trim());
    if (service) p.set("service", service);
    if (mode === "open") p.set("openNow", "1");
    if (mode === "urgent") p.set("urgent", "1");
    if (flags.female) p.set("female", "1");
    if (flags.child) p.set("child", "1");
    if (flags.night) p.set("night", "1");
    return p.toString();
  }, [geo, q, service, mode, flags]);

  const load = useCallback(() => {
    setLoading(true);
    api<{ promos: ClinicListItem[]; list: ClinicListItem[] }>(`/api/clinics?${query}`)
      .then(setData)
      .catch(() => setData({ promos: [], list: [] }))
      .finally(() => setLoading(false));
  }, [query]);

  useEffect(() => {
    const t = setTimeout(load, q ? 350 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  const toggle = (k: keyof typeof flags) => setFlags((f) => ({ ...f, [k]: !f[k] }));
  const total = (data?.promos.length ?? 0) + (data?.list.length ?? 0);

  /** VIP kartochka (klinika reklamasi) */
  const VipCard = ({ c }: { c: ClinicListItem }) => (
    <Pressable
      onPress={() => navigation.navigate("Clinic", { slug: c.slug })}
      style={{ width: 240, backgroundColor: C.card, borderRadius: R.card, overflow: "hidden", marginRight: 10 }}
    >
      <View style={{ height: 132, backgroundColor: C.pill }}>
        {c.photoUrl ? (
          <Image source={{ uri: absUrl(base, c.photoUrl)! }} style={{ width: "100%", height: "100%" }} />
        ) : (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: `hsl(${c.coverHue}, 45%, 42%)` }}>
            <Text style={{ color: "#fff", fontSize: 40, fontWeight: "800" }}>{c.name[0]}</Text>
          </View>
        )}
        <View style={{
          position: "absolute", top: 0, right: 0, backgroundColor: C.accent,
          paddingHorizontal: 12, paddingVertical: 5, borderBottomLeftRadius: 14,
        }}>
          <Text style={{ fontSize: 11, fontWeight: "900", color: "#3d2c00" }}>VIP</Text>
        </View>
      </View>
      <View style={{ padding: 11 }}>
        <Text numberOfLines={1} style={{ fontWeight: "800", fontSize: 14.5, color: C.text }}>{c.name}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 }}>
          <Stars value={c.rating} size={11} />
          <Text style={{ fontSize: 11.5, color: C.mut }}>{c.rating.toFixed(1)} ({c.reviewCount})</Text>
        </View>
        {c.consultPrice !== null && (
          <Text style={{ fontSize: 14, fontWeight: "900", color: C.text, marginTop: 6 }}>
            {fmtPrice(c.consultPrice)} so&apos;mdan
          </Text>
        )}
        <Text numberOfLines={1} style={{ fontSize: 11.5, color: C.faint, marginTop: 2 }}>
          {c.district} · {fmtKm(c.distanceKm)}
        </Text>
      </View>
    </Pressable>
  );

  /** Oddiy klinika kartochkasi */
  const ClinicRow = ({ c }: { c: ClinicListItem }) => (
    <Pressable
      onPress={() => navigation.navigate("Clinic", { slug: c.slug })}
      style={{ backgroundColor: C.card, borderRadius: R.card, padding: 12, marginBottom: 10, marginHorizontal: 14 }}
    >
      <View style={{ flexDirection: "row", gap: 11 }}>
        <Cover hue={c.coverHue} name={c.name} photoUrl={absUrl(base, c.photoUrl)} size={62} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ fontWeight: "800", fontSize: 15, color: C.text }}>{c.name}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 3 }}>
            <Stars value={c.rating} size={12} />
            <Text style={{ fontSize: 12.5, fontWeight: "700", color: C.text }}>{c.rating.toFixed(1)}</Text>
            <Text style={{ fontSize: 12.5, color: C.mut }}>({c.reviewCount})</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 }}>
            <Ionicons name="location-outline" size={12} color={C.faint} />
            <Text style={{ fontSize: 12.5, color: C.mut }}>{c.district} · {fmtKm(c.distanceKm)}</Text>
          </View>
        </View>
        {c.consultPrice !== null && (
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ fontSize: 10.5, color: C.faint }}>ko&apos;rik</Text>
            <Text style={{ fontSize: 14, fontWeight: "900", color: C.text }}>{fmtPrice(c.consultPrice)}</Text>
          </View>
        )}
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: 9 }}>
        <Badge label={c.isOpen ? `Ochiq · ${c.todayHours}` : "Yopiq"} icon={c.isOpen ? "time-outline" : "moon-outline"}
          color={c.isOpen ? C.green : C.mut} bg={c.isOpen ? C.greenBg : C.pill} />
        {c.is247 && <Badge label="24/7" color={C.sky} bg={C.skyBg} />}
        {c.emergency && !c.is247 && <Badge label="Shoshilinch" color={C.amber} bg={C.amberBg} />}
        {c.hasFemaleDoctor && <Badge label="Ayol shifokor" color={C.pink} bg={C.pinkBg} />}
        {c.childFriendly && <Badge label="Bolalar" color={C.violet} bg={C.violetBg} />}
      </View>
      {/* Eng yaqin bo'sh vaqt va javob tezligi */}
      {(!!c.nextSlot || c.avgResponseMin > 0) && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 10, marginTop: 8 }}>
          {!!c.nextSlot && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Ionicons name="calendar-outline" size={13} color={C.green} />
              <Text style={{ fontSize: 12.5, fontWeight: "700", color: C.green }}>
                {c.nextSlot.label} {c.nextSlot.time}
              </Text>
            </View>
          )}
          {c.avgResponseMin > 0 && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Ionicons name="flash-outline" size={13} color={C.mut} />
              <Text style={{ fontSize: 12, color: C.mut }}>~{c.avgResponseMin} daq</Text>
            </View>
          )}
        </View>
      )}

      {c.filteredService && (
        <Text style={{ fontSize: 12.5, marginTop: 8, color: C.mut }}>
          {c.filteredService.name}:{" "}
          <Text style={{ color: C.brand, fontWeight: "800" }}>
            {fmtPrice(c.filteredService.priceMin)} – {fmtPrice(c.filteredService.priceMax)} so&apos;m
          </Text>
        </Text>
      )}
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {/* ===== Sarlavha ===== */}
      <View style={{
        backgroundColor: C.card, paddingTop: insets.top + 8, paddingBottom: 12, paddingHorizontal: 14,
        borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
      }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View style={{
            flexDirection: "row", alignItems: "center", gap: 8,
            backgroundColor: C.pill, borderRadius: R.pill, paddingLeft: 6, paddingRight: 14, paddingVertical: 6,
          }}>
            <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: C.brand, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="medkit" size={16} color={C.onBrand} />
            </View>
            <Text style={{ fontSize: 16, fontWeight: "900", color: C.text, letterSpacing: 0.3 }}>StomGo</Text>
          </View>

          <View style={{ flexDirection: "row", gap: 7, marginLeft: "auto" }}>
            <IconPill name="map-outline" onPress={() => navigation.navigate("Map", { query })} />
            <IconPill name="notifications-outline" badge={unread} onPress={() => navigation.navigate("Notifications")} />
          </View>
        </View>

        {/* Qidiruv + filtr */}
        <View style={{ flexDirection: "row", gap: 8, marginTop: 11 }}>
          <View style={{
            flex: 1, flexDirection: "row", alignItems: "center", gap: 8,
            backgroundColor: C.pill, borderRadius: R.pill, paddingHorizontal: 14,
          }}>
            <Ionicons name="search" size={17} color={C.faint} />
            <TextInput
              value={q} onChangeText={setQ}
              placeholder="Klinika yoki tuman qidiring"
              placeholderTextColor={C.faint}
              style={{ flex: 1, paddingVertical: 11, fontSize: 14, color: C.text }}
            />
            {!!q && <Pressable onPress={() => setQ("")} hitSlop={8}><Ionicons name="close-circle" size={17} color={C.faint} /></Pressable>}
          </View>
          <IconPill name="options-outline" onPress={() => setSvcOpen(true)} bg={service ? C.brand : C.pill} color={service ? C.onBrand : C.text} />
        </View>

        {/* Rejim segmentlari */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 11 }}>
          <Chip active={mode === "near"} onPress={() => setMode("near")} icon="navigate-outline">Yaqinimda</Chip>
          <Chip active={mode === "open"} onPress={() => setMode("open")} icon="time-outline">Hozir ochiq</Chip>
          <Chip active={mode === "urgent"} onPress={() => setMode("urgent")} icon="alert-circle-outline">Shoshilinch</Chip>
        </ScrollView>

        {/* Qo'shimcha filtrlar */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
          <Chip active={!!service} onPress={() => setSvcOpen(true)} icon="pricetag-outline">
            {service ? SERVICES.find(([c]) => c === service)?.[1] : "Xizmat turi"}
          </Chip>
          <Chip active={flags.female} onPress={() => toggle("female")}>Ayol shifokor</Chip>
          <Chip active={flags.child} onPress={() => toggle("child")}>Bolalar</Chip>
          <Chip active={flags.night} onPress={() => toggle("night")}>24/7</Chip>
        </ScrollView>
      </View>

      {/* ===== Ro'yxat ===== */}
      {loading && !data ? (
        <ActivityIndicator color={C.brand} size="large" style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={data?.list ?? []}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => <ClinicRow c={item} />}
          contentContainerStyle={{ paddingTop: 14, paddingBottom: 28 }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} colors={[C.brand]} tintColor={C.brand} />}
          ListHeaderComponent={
            <View>
              {(data?.promos.length ?? 0) > 0 && (
                <View style={{ marginBottom: 16 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, marginBottom: 9 }}>
                    <Text style={{ fontSize: 17, fontWeight: "900", color: C.text }}>VIP e&apos;lonlar</Text>
                    <View style={{ backgroundColor: C.accentSoft, borderRadius: R.pill, paddingHorizontal: 8, paddingVertical: 2 }}>
                      <Text style={{ fontSize: 10.5, fontWeight: "800", color: C.accentInk }}>homiylik</Text>
                    </View>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 14 }}>
                    {data?.promos.map((c) => <VipCard key={c.id} c={c} />)}
                  </ScrollView>
                </View>
              )}
              <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8, paddingHorizontal: 14, marginBottom: 10 }}>
                <Text style={{ fontSize: 17, fontWeight: "900", color: C.text }}>
                  {mode === "urgent" ? "Shoshilinch qabul" : mode === "open" ? "Hozir ochiq" : "Yaqinimdagi klinikalar"}
                </Text>
                <Text style={{ fontSize: 13, color: C.faint }}>{total} ta</Text>
              </View>
            </View>
          }
          ListEmptyComponent={
            <Empty icon="search-outline" title="Hech narsa topilmadi" subtitle="Filtrlarni o'zgartirib ko'ring" />
          }
        />
      )}

      {/* Xizmat tanlash */}
      <Sheet open={svcOpen} onClose={() => setSvcOpen(false)} title="Xizmat turi">
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {SERVICES.map(([code, label]) => (
            <Pressable key={code} onPress={() => { setService(code); setSvcOpen(false); }}
              style={{
                borderRadius: R.pill, paddingHorizontal: 15, paddingVertical: 10,
                backgroundColor: service === code ? C.brand : C.pill,
              }}>
              <Text style={{ fontSize: 13, fontWeight: "700", color: service === code ? C.onBrand : C.ink2 }}>{label}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={{ fontSize: 12, color: C.faint, marginTop: 12 }}>
          Xizmat tanlansa, har bir klinikada o&apos;sha xizmat narxi ko&apos;rsatiladi.
        </Text>
      </Sheet>
    </View>
  );
}
