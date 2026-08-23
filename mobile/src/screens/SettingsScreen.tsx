import React, { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, Linking, TextInput, Alert } from "react-native";
import Constants from "expo-constants";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api, getBaseUrl, setBaseUrl, setToken, getToken } from "../api";
import { C, useTheme, type ThemeMode } from "../theme";
import { Sheet, Btn, BackButton, type IconName } from "../components/ui";
import { unregisterPush } from "../push";
import { useT, LOCALES, LOCALE_NAMES } from "../i18n";

/**
 * Sozlamalar — to'liq ekran (pastdan chiqadigan oyna emas).
 * Guruhlangan kartochkalar: hisob, ko'rinish, ma'lumot, chiqish.
 */
/** Guruh ichidagi qator */
function Row({ icon, label, value, onPress, iconColor, last }: {
  icon: IconName; label: string; value?: string; onPress: () => void;
  iconColor?: string; last?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row", alignItems: "center", gap: 13,
        paddingVertical: 15, paddingHorizontal: 16,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: C.line,
        backgroundColor: pressed ? C.pill : "transparent",
      })}
    >
      <Ionicons name={icon} size={21} color={iconColor ?? C.ink2} />
      <Text style={{ flex: 1, fontSize: 15.5, fontWeight: "700", color: C.text }}>{label}</Text>
      {!!value && <Text style={{ fontSize: 14.5, color: C.mut }}>{value}</Text>}
      <Ionicons name="chevron-forward" size={17} color={C.faint} />
    </Pressable>
  );
}

/** Kartochka guruhi */
function Group({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ backgroundColor: C.card, borderRadius: 18, overflow: "hidden", marginBottom: 14 }}>
      {children}
    </View>
  );
}

export default function SettingsScreen({ navigation }: {
  navigation: { goBack: () => void; navigate: (s: string, p?: object) => void };
}) {
  const insets = useSafeAreaInsets();
  const { t, locale, setLocale } = useT();
  const { mode, setMode } = useTheme();

  const [langOpen, setLangOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [serverOpen, setServerOpen] = useState(false);
  const [serverUrl, setServerUrl] = useState("");
  const [authed, setAuthed] = useState(false);
  const [bot, setBot] = useState("finaybot");

  useEffect(() => { void getBaseUrl().then(setServerUrl); }, []);
  useEffect(() => { void getToken().then((t) => setAuthed(!!t)); }, []);
  useEffect(() => {
    api<{ botUsername?: string }>("/api/telegram/link")
      .then((d) => d.botUsername && setBot(d.botUsername))
      .catch(() => {});
  }, []);

  const openUrl = useCallback(async (path: string) => {
    void Linking.openURL(`${await getBaseUrl()}${path}`);
  }, []);

  const logout = () => {
    Alert.alert("Chiqish", "Hisobdan chiqmoqchimisiz?", [
      { text: "Bekor qilish", style: "cancel" },
      {
        text: "Chiqish", style: "destructive",
        onPress: async () => {
          await unregisterPush().catch(() => {});
          await setToken(null);
          navigation.goBack();
        },
      },
    ]);
  };

  /**
   * Hisobni o'chirish — Google Play talabi.
   * Ikki bosqichli tasdiq: birinchisi nima bo'lishini tushuntiradi,
   * ikkinchisi tasodifan bosishdan saqlaydi.
   */
  const deleteAccount = () => {
    Alert.alert(
      "Hisobni o'chirish",
      [
        "O'chadi: ismingiz, rasmingiz, Telegram ulanishi, barcha suhbatlar va bildirishnomalar.",
        "",
        "Anonim qoladi: qabul yozuvlari va sharhlaringiz — klinikalar statistikasi uchun. Ularda ismingiz ko'rinmaydi.",
        "",
        "Bu amalni qaytarib bo'lmaydi.",
      ].join("\n"),
      [
        { text: "Bekor qilish", style: "cancel" },
        {
          text: "Davom etish",
          style: "destructive",
          onPress: () =>
            Alert.alert("Ishonchingiz komilmi?", "Hisobingiz butunlay o'chiriladi.", [
              { text: "Yo'q", style: "cancel" },
              {
                text: "Ha, o'chirilsin",
                style: "destructive",
                onPress: async () => {
                  try {
                    await api("/api/me", { method: "DELETE" });
                    await unregisterPush().catch(() => {});
                    await setToken(null);
                    navigation.goBack();
                    Alert.alert("O'chirildi", "Hisobingiz o'chirildi.");
                  } catch (e) {
                    Alert.alert("Xatolik", (e as Error).message);
                  }
                },
              },
            ]),
        },
      ],
    );
  };

  const saveServer = async () => {
    const v = serverUrl.trim().replace(/\/+$/, "");
    if (!/^https?:\/\/.+/.test(v)) {
      Alert.alert("Manzil noto'g'ri", "https:// bilan boshlanishi kerak");
      return;
    }
    await setBaseUrl(v);
    setServerOpen(false);
    Alert.alert("Saqlandi", "Ilovani qayta ishga tushiring.");
  };

  const modeLabel = mode === "light" ? "Kunduzgi" : mode === "dark" ? "Tungi" : "Tizim bo'yicha";

  const version = Constants.expoConfig?.version ?? "—";
  const build = Constants.expoConfig?.android?.versionCode ?? "";

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {/* Sarlavha */}
      <View style={{
        flexDirection: "row", alignItems: "center", gap: 14,
        paddingTop: insets.top + 10, paddingBottom: 16, paddingHorizontal: 16,
      }}>
        <BackButton onPress={() => navigation.goBack()} />
        <Text style={{ fontSize: 24, fontWeight: "900", color: C.text }}>Sozlamalar</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 30 }}>
        {authed && (
          <Group>
            <Row
              icon="shield-checkmark" label="Profilni tasdiqlash" iconColor={C.sky} last
              onPress={() => void Linking.openURL(`https://t.me/${bot}`)}
            />
          </Group>
        )}

        <Group>
          <Row icon="globe-outline" label={t("profile.language")} value={LOCALE_NAMES[locale]} onPress={() => setLangOpen(true)} />
          <Row icon="moon-outline" label="Mavzu" value={modeLabel} onPress={() => setThemeOpen(true)} last />
        </Group>

        <Group>
          <Row icon="megaphone-outline" label="Reklama va hamkorlik" onPress={() => void openUrl("/oferta")} />
          <Row icon="document-text-outline" label="Maxfiylik siyosati" onPress={() => void openUrl("/maxfiylik")} />
          <Row icon="headset-outline" label="Qo'llab-quvvatlash"
            onPress={() => navigation.navigate("Tabs", { screen: "Xabarlar" })} />
          <Row icon="server-outline" label="Server sozlamasi" onPress={() => setServerOpen(true)} last />
        </Group>

        {authed && (
          <Pressable
            onPress={logout}
            style={({ pressed }) => ({
              backgroundColor: pressed ? C.redBg : C.red,
              borderRadius: 999, paddingVertical: 16,
              flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
            })}
          >
            <Ionicons name="log-out-outline" size={20} color="#fff" />
            <Text style={{ fontSize: 16, fontWeight: "800", color: "#fff" }}>Chiqish</Text>
          </Pressable>
        )}

        {authed && (
          <Pressable
            onPress={deleteAccount}
            style={{ paddingVertical: 16, alignItems: "center" }}
          >
            <Text style={{ fontSize: 14, fontWeight: "700", color: C.red }}>
              Hisobni o&apos;chirish
            </Text>
          </Pressable>
        )}

        <Text style={{ fontSize: 12.5, color: C.faint, textAlign: "center", marginTop: 18 }}>
          StomGo {version}{build ? ` (${build})` : ""}
        </Text>
      </ScrollView>

      {/* Til */}
      <Sheet open={langOpen} onClose={() => setLangOpen(false)} title={t("profile.language")}>
        {LOCALES.map((code) => {
          const active = locale === code;
          return (
            <Pressable
              key={code}
              onPress={() => { setLocale(code); setLangOpen(false); }}
              style={{
                flexDirection: "row", alignItems: "center", justifyContent: "space-between",
                paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.line,
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: active ? "800" : "600", color: active ? C.text : C.mut }}>
                {LOCALE_NAMES[code]}
              </Text>
              {active && <Ionicons name="checkmark-circle" size={20} color={C.brand} />}
            </Pressable>
          );
        })}
      </Sheet>

      {/* Mavzu */}
      <Sheet open={themeOpen} onClose={() => setThemeOpen(false)} title="Mavzu">
        {([["light", "Kunduzgi", "sunny-outline"], ["dark", "Tungi", "moon-outline"], ["system", "Tizim bo'yicha", "phone-portrait-outline"]] as [ThemeMode, string, IconName][]).map(
          ([m, label, icon]) => (
            <Pressable key={m} onPress={() => { setMode(m); setThemeOpen(false); }}
              style={{
                flexDirection: "row", alignItems: "center", gap: 12,
                paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.line,
              }}>
              <Ionicons name={icon} size={20} color={mode === m ? C.brand : C.ink2} />
              <Text style={{ flex: 1, fontSize: 15, fontWeight: mode === m ? "800" : "600", color: mode === m ? C.brand : C.text }}>
                {label}
              </Text>
              {mode === m && <Ionicons name="checkmark-circle" size={20} color={C.brand} />}
            </Pressable>
          )
        )}
      </Sheet>

      {/* Server */}
      <Sheet open={serverOpen} onClose={() => setServerOpen(false)} title="Server sozlamasi">
        <Text style={{ fontSize: 13, color: C.mut, lineHeight: 19 }}>
          Sinov davrida server manzili o&apos;zgarishi mumkin. Yangi manzil berilsa shu yerga kiriting.
        </Text>
        <TextInput
          value={serverUrl} onChangeText={setServerUrl}
          autoCapitalize="none" autoCorrect={false} keyboardType="url"
          placeholder="https://..." placeholderTextColor={C.faint}
          style={{
            borderWidth: 1.2, borderColor: C.line, borderRadius: 14,
            paddingHorizontal: 14, paddingVertical: 12, marginTop: 12, marginBottom: 12,
            fontSize: 14, color: C.text,
          }}
        />
        <Btn title="Saqlash" onPress={saveServer} />
      </Sheet>
    </View>
  );
}
