import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, FlatList, Pressable, RefreshControl, ScrollView, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api, getBaseUrl, absUrl } from "../api";
import { C, R, useTheme } from "../theme";
import { fmtKm } from "../format";
import { Stars, Badge, Chip, Cover, Empty } from "../components/ui";
import type { ClinicListItem } from "../types";

const TASHKENT = { lat: 41.3111, lng: 69.2797 };

type Sort = "mix" | "rating" | "distance" | "price";
const SORTS: [Sort, string][] = [
  ["mix", "Tavsiya"], ["rating", "Reyting"], ["distance", "Yaqinlik"], ["price", "Narx"],
];

/** Barcha klinikalar katalogi — qidiruv va saralash bilan */
export default function ClinicsScreen({ navigation }: { navigation: { navigate: (s: string, p?: object) => void } }) {
  const insets = useSafeAreaInsets();
  useTheme();
  const [items, setItems] = useState<ClinicListItem[] | null>(null);
  const [base, setBase] = useState("");
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("mix");

  useEffect(() => { getBaseUrl().then(setBase); }, []);

  const query = useMemo(() => {
    const p = new URLSearchParams();
    p.set("lat", String(TASHKENT.lat)); p.set("lng", String(TASHKENT.lng));
    p.set("sort", sort);
    if (q.trim()) p.set("q", q.trim());
    return p.toString();
  }, [q, sort]);

  const load = useCallback(() => {
    setLoading(true);
    api<{ promos: ClinicListItem[]; list: ClinicListItem[] }>(`/api/clinics?${query}`)
      .then((d) => setItems([...d.promos, ...d.list]))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [query]);

  useEffect(() => {
    const t = setTimeout(load, q ? 350 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{
        backgroundColor: C.card, paddingTop: insets.top + 10, paddingBottom: 12, paddingHorizontal: 14,
        borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
      }}>
        <Text style={{ fontSize: 26, fontWeight: "900", color: C.text }}>Klinikalar</Text>

        <View style={{
          flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12,
          backgroundColor: C.pill, borderRadius: R.pill, paddingHorizontal: 14,
        }}>
          <Ionicons name="search" size={17} color={C.faint} />
          <TextInput
            value={q} onChangeText={setQ}
            placeholder="Klinika nomini kiriting"
            placeholderTextColor={C.faint}
            style={{ flex: 1, paddingVertical: 12, fontSize: 14, color: C.text }}
          />
          {!!q && <Pressable onPress={() => setQ("")} hitSlop={8}><Ionicons name="close-circle" size={17} color={C.faint} /></Pressable>}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 11 }}>
          {SORTS.map(([key, label]) => (
            <Chip key={key} active={sort === key} onPress={() => setSort(key)}>{label}</Chip>
          ))}
        </ScrollView>
      </View>

      {loading && !items ? (
        <ActivityIndicator color={C.brand} size="large" style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={items ?? []}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ paddingVertical: 12 }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} colors={[C.brand]} tintColor={C.brand} />}
          ListHeaderComponent={
            <Text style={{ fontSize: 13.5, color: C.mut, paddingHorizontal: 18, marginBottom: 10 }}>
              {(items?.length ?? 0)} ta klinika
            </Text>
          }
          ListEmptyComponent={<Empty icon="business-outline" title="Klinika topilmadi" subtitle="Boshqa nom bilan qidirib ko'ring" />}
          renderItem={({ item: c }) => (
            <Pressable
              onPress={() => navigation.navigate("Clinic", { slug: c.slug })}
              style={{
                flexDirection: "row", alignItems: "center", gap: 12,
                paddingHorizontal: 16, paddingVertical: 11,
              }}
            >
              <Cover hue={c.coverHue} name={c.name} photoUrl={absUrl(base, c.photoUrl)} size={54} radius={27} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                  <Text numberOfLines={1} style={{ fontWeight: "800", fontSize: 15.5, color: C.text, flexShrink: 1 }}>{c.name}</Text>
                  {c.tier !== "FREE" && <Ionicons name="checkmark-circle" size={15} color={C.sky} />}
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 }}>
                  <Stars value={c.rating} size={11} />
                  <Text style={{ fontSize: 12, color: C.mut }}>{c.rating.toFixed(1)} · {c.reviewCount} sharh</Text>
                </View>
                <Text numberOfLines={1} style={{ fontSize: 12, color: C.faint, marginTop: 2 }}>
                  {c.district} · {fmtKm(c.distanceKm)}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end", gap: 5 }}>
                {c.isPromo && <Badge label="VIP" color={C.accentInk} bg={C.accentSoft} />}
                <Badge label={c.isOpen ? "Ochiq" : "Yopiq"} color={c.isOpen ? C.green : C.mut} bg={c.isOpen ? C.greenBg : C.pill} />
              </View>
            </Pressable>
          )}
          ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: C.line, marginLeft: 82 }} />}
        />
      )}
    </View>
  );
}
