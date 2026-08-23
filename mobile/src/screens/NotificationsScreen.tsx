import React, { useCallback, useEffect, useState } from "react";
import { BackButton } from "../components/ui";
import { View, Text, ScrollView, Pressable, ActivityIndicator, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, getToken } from "../api";
import { C, useTheme } from "../theme";
import { fmtDateTime } from "../format";
import type { NotificationItem } from "../types";

/** Bildirishnomalar markazi — bosh sahifadagi qo'ng'iroqcha orqali ochiladi */
export default function NotificationsScreen({ navigation }: {
  navigation: { goBack: () => void; navigate: (s: string, p?: object) => void };
}) {
  const insets = useSafeAreaInsets();
  useTheme();
  const [data, setData] = useState<{ items: NotificationItem[]; unread: number } | null>(null);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const token = await getToken();
    setAuthed(Boolean(token));
    if (!token) { setData({ items: [], unread: 0 }); return; }
    const d = await api<{ items: NotificationItem[]; unread: number }>("/api/notifications").catch(() => null);
    setData(d ?? { items: [], unread: 0 });
  }, []);

  useEffect(() => { const t = setTimeout(() => void load(), 0); return () => clearTimeout(t); }, [load]);

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  /**
   * Bildirishnoma bosilganda kerakli ekranga o'tamiz.
   * Server web yo'lini beradi ("/xabarlar", "/profil", "/klinika/<slug>") —
   * uni ilova ekranlariga o'giramiz. Avval bu umuman ishlamasdi: element
   * oddiy View edi, bosish hodisasi yo'q edi.
   */
  const openNotification = async (n: NotificationItem) => {
    if (!n.readAt) {
      void api("/api/notifications", { method: "PATCH", json: { id: n.id } }).catch(() => {});
      setData((d) =>
        d
          ? {
              items: d.items.map((i) => (i.id === n.id ? { ...i, readAt: new Date().toISOString() } : i)),
              unread: Math.max(0, d.unread - 1),
            }
          : d
      );
    }

    const link = n.link || "/";
    if (link.startsWith("/klinika/")) {
      navigation.navigate("Clinic", { slug: link.replace("/klinika/", "") });
    } else if (link.startsWith("/xabarlar/")) {
      navigation.navigate("Chat", { id: link.replace("/xabarlar/", ""), title: "Suhbat" });
    } else if (link.startsWith("/xabarlar")) {
      navigation.navigate("Tabs", { screen: "Xabarlar" });
    } else if (link.startsWith("/profil")) {
      navigation.navigate("Tabs", { screen: "Profil" });
    } else if (link.startsWith("/triaj")) {
      navigation.navigate("Tabs", { screen: "AI maslahat" });
    } else {
      navigation.navigate("Tabs", { screen: "Asosiy" });
    }
  };

  const markAllRead = async () => {
    await api("/api/notifications", { method: "PATCH", json: { all: true } }).catch(() => {});
    setData((d) => d ? { items: d.items.map((i) => ({ ...i, readAt: i.readAt ?? new Date().toISOString() })), unread: 0 } : d);
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{
        flexDirection: "row", alignItems: "center", gap: 10,
        paddingTop: insets.top + 8, paddingBottom: 12, paddingHorizontal: 14, backgroundColor: C.card,
      }}>
        <BackButton onPress={() => navigation.goBack()} size={40} />
        <Text style={{ fontSize: 18, fontWeight: "900", color: C.text, flex: 1 }}>Bildirishnomalar</Text>
      </View>

      {/* "Hammasini o'qildi" — sarlavhaga yopishmasin, kichik ikonka tugma */}
      {(data?.unread ?? 0) > 0 && (
        <View style={{ flexDirection: "row", justifyContent: "flex-end", paddingHorizontal: 14, paddingTop: 10, paddingBottom: 2 }}>
          <Pressable
            onPress={markAllRead}
            hitSlop={8}
            accessibilityLabel="Hammasini o'qilgan deb belgilash"
            style={{
              width: 36, height: 36, borderRadius: 18,
              backgroundColor: C.pill, alignItems: "center", justifyContent: "center",
            }}
          >
            <Ionicons name="checkmark-done" size={19} color={C.brand} />
          </Pressable>
        </View>
      )}

      {!data ? (
        <ActivityIndicator color={C.brand} size="large" style={{ marginTop: 50 }} />
      ) : authed === false ? (
        <View style={{ alignItems: "center", marginTop: 70, paddingHorizontal: 30 }}>
          <Text style={{ fontSize: 38 }}>🔔</Text>
          <Text style={{ fontWeight: "700", color: C.ink2, marginTop: 8, textAlign: "center" }}>
            Bildirishnomalarni ko&apos;rish uchun kiring
          </Text>
          <Pressable onPress={() => navigation.navigate("Tabs", { screen: "Profil" })}
            style={{ backgroundColor: C.brand, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 11, marginTop: 14 }}>
            <Text style={{ color: "#fff", fontWeight: "800" }}>Profilga o&apos;tish</Text>
          </Pressable>
        </View>
      ) : data.items.length === 0 ? (
        <View style={{ alignItems: "center", marginTop: 70 }}>
          <Text style={{ fontSize: 38 }}>🔕</Text>
          <Text style={{ fontWeight: "700", color: C.ink2, marginTop: 8 }}>Hozircha bildirishnoma yo&apos;q</Text>
          <Text style={{ fontSize: 13, color: C.mut, marginTop: 3, textAlign: "center", paddingHorizontal: 40 }}>
            Yozuv tasdiqlanganda va profilaktik ko&apos;rik vaqti kelganda shu yerda ko&apos;rasiz
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 14, paddingBottom: 30 + insets.bottom }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[C.brand]} tintColor={C.brand} />}
        >
          {data.items.map((n) => (
            <Pressable
              key={n.id}
              onPress={() => void openNotification(n)}
              style={({ pressed }) => ({
                backgroundColor: pressed ? C.pill : C.card,
                borderRadius: 15, padding: 13, marginBottom: 9,
                borderLeftWidth: n.readAt ? 0 : 4, borderLeftColor: C.brand,
                flexDirection: "row", alignItems: "center", gap: 10,
              })}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: n.readAt ? "600" : "800", color: C.text }}>{n.title}</Text>
                {!!n.body && <Text style={{ fontSize: 13, color: C.ink3, marginTop: 3, lineHeight: 18 }}>{n.body}</Text>}
                <Text style={{ fontSize: 11.5, color: C.faint, marginTop: 5 }}>{fmtDateTime(n.createdAt)}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={C.faint} />
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
