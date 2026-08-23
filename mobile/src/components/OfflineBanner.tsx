import React, { useSyncExternalStore } from "react";
import { View, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { subscribeReachable, isReachable } from "../api";

/**
 * Server yetib bormaganda ko'rinadigan tasma.
 *
 * Alohida tarmoq paketiga tayanmaymiz: wifi yoqilgan bo'lib ham server
 * javob bermasligi mumkin (tunnel o'chgan, server qayta yuklanmoqda).
 * Shuning uchun api() ning haqiqiy natijasiga qaraymiz.
 */
export default function OfflineBanner() {
  const ok = useSyncExternalStore(subscribeReachable, isReachable, isReachable);
  const insets = useSafeAreaInsets();

  if (ok) return null;

  return (
    <View
      accessibilityRole="alert"
      style={{
        position: "absolute",
        top: 0, left: 0, right: 0,
        zIndex: 100,
        paddingTop: insets.top + 6,
        paddingBottom: 8,
        paddingHorizontal: 14,
        backgroundColor: "#27272a",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 7,
      }}
    >
      <Ionicons name="cloud-offline-outline" size={16} color="#fff" />
      <Text style={{ color: "#fff", fontSize: 12.5, fontWeight: "700" }}>
        Serverga ulanib bo&apos;lmadi — qayta urinilmoqda
      </Text>
    </View>
  );
}
