import React, { useCallback, useState } from "react";
import { View, Text, FlatList, Pressable, ActivityIndicator, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { api, getBaseUrl, absUrl, getToken } from "../api";
import { C, R, useTheme } from "../theme";
import { fmtDateTime } from "../format";
import { Cover, Empty, Btn } from "../components/ui";
import type { ConversationItem } from "../types";

/** Suhbatlar ro'yxati: klinikalar + qo'llab-quvvatlash */
export default function ChatsScreen({ navigation }: { navigation: { navigate: (s: string, p?: object) => void } }) {
  const insets = useSafeAreaInsets();
  useTheme();
  const [items, setItems] = useState<ConversationItem[] | null>(null);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [base, setBase] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setBase(await getBaseUrl());
    const token = await getToken();
    setAuthed(Boolean(token));
    if (!token) { setItems([]); return; }
    const d = await api<{ items: ConversationItem[] }>("/api/chat").catch(() => null);
    setItems(d?.items ?? []);
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const openSupport = async () => {
    if (!(await getToken())) { navigation.navigate("Tabs", { screen: "Profil" }); return; }
    const r = await api<{ id: string }>("/api/chat", { json: { type: "SUPPORT" } }).catch(() => null);
    if (r) navigation.navigate("Chat", { id: r.id, title: "Qo'llab-quvvatlash" });
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{
        backgroundColor: C.card, paddingTop: insets.top + 10, paddingBottom: 14, paddingHorizontal: 14,
        borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
      }}>
        <Text style={{ fontSize: 26, fontWeight: "900", color: C.text }}>Xabarlar</Text>

        {/* Qo'llab-quvvatlash bloki */}
        <Pressable onPress={openSupport}
          style={{
            flexDirection: "row", alignItems: "center", gap: 12, marginTop: 12,
            backgroundColor: C.brand, borderRadius: R.card, padding: 14,
          }}>
          <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="headset-outline" size={21} color={C.onBrand} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: "800", color: C.onBrand }}>Qo&apos;llab-quvvatlash</Text>
            <Text style={{ fontSize: 12.5, color: C.onBrand, opacity: 0.85, marginTop: 1 }}>Savolingiz bo&apos;lsa — yozing, yordam beramiz</Text>
          </View>
          <Ionicons name="chevron-forward" size={19} color={C.onBrand} />
        </Pressable>
      </View>

      {items === null ? (
        <ActivityIndicator color={C.brand} size="large" style={{ marginTop: 50 }} />
      ) : authed === false ? (
        <View style={{ paddingHorizontal: 30 }}>
          <Empty icon="chatbubbles-outline" title="Suhbatlarni ko'rish uchun kiring"
            subtitle="Klinikalar bilan yozishuv va qo'llab-quvvatlash shu yerda bo'ladi" />
          <Btn title="Profilga o'tish" icon="person-outline" onPress={() => navigation.navigate("Tabs", { screen: "Profil" })} />
        </View>
      ) : items.length === 0 ? (
        <Empty icon="chatbubble-ellipses-outline" title="Hali suhbat yo'q"
          subtitle="Klinika sahifasidagi «Xabar yozish» tugmasi orqali savol bering" />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ paddingVertical: 10 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} colors={[C.brand]} tintColor={C.brand}
              onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />
          }
          renderItem={({ item: c }) => (
            <Pressable
              onPress={() => navigation.navigate("Chat", { id: c.id, title: c.title })}
              style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 11 }}
            >
              {c.type === "SUPPORT" ? (
                <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: C.brandLight, alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="headset" size={22} color={C.brand} />
                </View>
              ) : (
                <Cover hue={c.coverHue} name={c.title} photoUrl={absUrl(base, c.photoUrl)} size={52} radius={26} />
              )}
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={{ fontWeight: c.unread > 0 ? "900" : "700", fontSize: 15, color: C.text }}>{c.title}</Text>
                <Text numberOfLines={1} style={{ fontSize: 13, color: c.unread > 0 ? C.ink2 : C.mut, marginTop: 2 }}>{c.subtitle}</Text>
              </View>
              <View style={{ alignItems: "flex-end", gap: 5 }}>
                <Text style={{ fontSize: 11, color: C.faint }}>{fmtDateTime(c.lastMessageAt).split(",")[0]}</Text>
                {c.unread > 0 && (
                  <View style={{ minWidth: 20, height: 20, borderRadius: 10, backgroundColor: C.brand, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 }}>
                    <Text style={{ color: C.onBrand, fontSize: 11, fontWeight: "900" }}>{c.unread}</Text>
                  </View>
                )}
              </View>
            </Pressable>
          )}
          ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: C.line, marginLeft: 80 }} />}
        />
      )}
    </View>
  );
}
