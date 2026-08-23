import React from "react";
import { View, Text, Pressable, StyleSheet, Image, Modal, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { C, R } from "../theme";

export type IconName = React.ComponentProps<typeof Ionicons>["name"];

/** Yumaloq ikonka tugmasi (Joymee uslubidagi "hab") */
export function IconPill({ name, onPress, size = 20, color, bg, badge }: {
  name: IconName; onPress?: () => void; size?: number; color?: string; bg?: string; badge?: number;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => ({
        width: 40, height: 40, borderRadius: R.pill,
        alignItems: "center", justifyContent: "center",
        backgroundColor: bg ?? C.pill,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Ionicons name={name} size={size} color={color ?? C.text} />
      {badge !== undefined && badge > 0 && (
        <View style={{
          position: "absolute", top: 2, right: 2, minWidth: 16, height: 16, borderRadius: 8,
          backgroundColor: C.red, alignItems: "center", justifyContent: "center",
          paddingHorizontal: 4, borderWidth: 1.5, borderColor: C.card,
        }}>
          <Text style={{ color: "#fff", fontSize: 9.5, fontWeight: "900" }}>{badge > 9 ? "9+" : badge}</Text>
        </View>
      )}
    </Pressable>
  );
}

export function Stars({ value, size = 13 }: { value: number; size?: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 1 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons key={i} name="star" size={size} color={i <= Math.round(value) ? C.accent : C.starOff} />
      ))}
    </View>
  );
}

export function Badge({ label, color, bg, icon }: { label: string; color: string; bg: string; icon?: IconName }) {
  return (
    <View style={{
      backgroundColor: bg, borderRadius: R.pill, paddingHorizontal: 9, paddingVertical: 3.5,
      flexDirection: "row", alignItems: "center", gap: 3.5,
    }}>
      {icon && <Ionicons name={icon} size={11} color={color} />}
      <Text style={{ color, fontSize: 11, fontWeight: "700" }}>{label}</Text>
    </View>
  );
}

/** Filtr/segment chipi */
export function Chip({ active, onPress, children, icon }: {
  active?: boolean; onPress?: () => void; children: React.ReactNode; icon?: IconName;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        borderRadius: R.pill, paddingHorizontal: 14, paddingVertical: 9, marginRight: 7,
        backgroundColor: active ? C.brand : C.pill,
        flexDirection: "row", alignItems: "center", gap: 5,
      }}
    >
      {icon && <Ionicons name={icon} size={14} color={active ? C.onBrand : C.ink2} />}
      <Text style={{ fontSize: 13, fontWeight: "700", color: active ? C.onBrand : C.ink2 }}>{children}</Text>
    </Pressable>
  );
}

export function Cover({ hue, name, photoUrl, size = 56, radius = R.tile }: {
  hue: number; name: string; photoUrl?: string | null; size?: number; radius?: number;
}) {
  if (photoUrl) {
    return <Image source={{ uri: photoUrl }} style={{ width: size, height: size, borderRadius: radius, backgroundColor: C.pill }} />;
  }
  return (
    <View style={{
      width: size, height: size, borderRadius: radius, alignItems: "center", justifyContent: "center",
      backgroundColor: `hsl(${hue}, 45%, 42%)`,
    }}>
      <Text style={{ color: "#fff", fontSize: size * 0.38, fontWeight: "800" }}>{name[0]?.toUpperCase()}</Text>
    </View>
  );
}

/**
 * Tugma. Tunda muhim tugmalar ramkasi bilan ajratiladi:
 * primary → oq ramka, accent → sariq, danger → qizil.
 */
export function Btn({ title, onPress, disabled, variant = "primary", icon }: {
  title: string; onPress?: () => void; disabled?: boolean;
  variant?: "primary" | "accent" | "outline" | "danger" | "ghost";
  icon?: IconName;
}) {
  const bg =
    variant === "primary" ? C.brand :
    variant === "accent" ? C.accent :
    variant === "danger" ? C.red : "transparent";
  const border =
    variant === "primary" ? C.outlinePrimary :
    variant === "accent" ? C.outlineAccent :
    variant === "danger" ? C.red :
    variant === "outline" ? C.line : "transparent";
  const borderWidth = variant === "ghost" ? 0 : variant === "outline" ? 1.3 : 1.5;
  const color =
    variant === "primary" ? C.onBrand :
    variant === "accent" ? "#3d2c00" :
    variant === "danger" ? "#fff" :
    variant === "ghost" ? C.mut : C.text;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        backgroundColor: bg, borderWidth, borderColor: border,
        borderRadius: R.input, paddingVertical: 13, alignItems: "center",
        flexDirection: "row", justifyContent: "center", gap: 7,
        opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
      })}
    >
      {icon && <Ionicons name={icon} size={17} color={color} />}
      <Text style={{ color, fontWeight: "700", fontSize: 14.5 }}>{title}</Text>
    </Pressable>
  );
}

/** Ekran sarlavhasi (orqaga + nom + o'ngdagi element) */
export function ScreenHeader({ title, onBack, right }: { title: string; onBack?: () => void; right?: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{
      flexDirection: "row", alignItems: "center", gap: 10,
      paddingTop: insets.top + 8, paddingBottom: 12, paddingHorizontal: 14,
      backgroundColor: C.card,
    }}>
      {onBack && <IconPill name="chevron-back" onPress={onBack} size={19} />}
      <Text style={{ fontSize: 19, fontWeight: "800", color: C.text, flex: 1 }} numberOfLines={1}>{title}</Text>
      {right}
    </View>
  );
}

/** Pastdan chiqadigan oyna — klaviatura ochilganda ko'tariladi */
export function Sheet({ open, onClose, title, children, position = "bottom" }: {
  open: boolean; onClose: () => void; title?: string; children: React.ReactNode;
  /** "bottom" — pastdan (standart), "center" — ekran o'rtasida (klaviatura uchun qulay) */
  position?: "bottom" | "center";
}) {
  const insets = useSafeAreaInsets();
  const centered = position === "center";

  return (
    <Modal visible={open} transparent animationType={centered ? "fade" : "slide"} onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1, justifyContent: centered ? "center" : "flex-end" }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Pressable style={s.backdrop} onPress={onClose} />
        <View
          style={[
            s.sheet,
            { backgroundColor: C.card },
            centered
              ? { marginHorizontal: 16, borderRadius: 22, paddingBottom: 18 }
              : { paddingBottom: Math.max(insets.bottom, 14) + 6 },
          ]}
        >
          {!centered && <View style={s.grabber} />}
          <View style={[s.sheetHeader, centered && { marginTop: 4 }]}>
            <Text style={{ fontSize: 17, fontWeight: "800", color: C.text }}>{title}</Text>
            <IconPill name="close" onPress={onClose} size={17} />
          </View>
          <ScrollView style={{ maxHeight: 520 }} keyboardShouldPersistTaps="handled">
            {children}
            <View style={{ height: 10 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** Bo'sh holat */
export function Empty({ icon, title, subtitle }: { icon: IconName; title: string; subtitle?: string }) {
  return (
    <View style={{ alignItems: "center", paddingVertical: 50, paddingHorizontal: 34 }}>
      <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: C.pill, alignItems: "center", justifyContent: "center" }}>
        <Ionicons name={icon} size={34} color={C.faint} />
      </View>
      <Text style={{ fontWeight: "800", fontSize: 15, color: C.ink2, marginTop: 12, textAlign: "center" }}>{title}</Text>
      {subtitle && <Text style={{ fontSize: 13, color: C.mut, marginTop: 4, textAlign: "center", lineHeight: 18 }}>{subtitle}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  backdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 18, paddingTop: 8 },
  grabber: { alignSelf: "center", width: 38, height: 4, borderRadius: 2, backgroundColor: "#c9ced1", marginBottom: 10 },
  sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
});
