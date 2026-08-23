import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, Pressable, TextInput, ActivityIndicator, Alert, Linking, RefreshControl } from "react-native";
import Constants from "expo-constants";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api, getToken, setToken } from "../api";
import { C, statusUi, useTheme } from "../theme";
import { fmtDateTime } from "../format";
import { Badge, Btn, Sheet, IconPill } from "../components/ui";
import { registerPush, unregisterPush, isPushOn } from "../push";
import type { Appointment, Me, OtpResponse } from "../types";

type Filter = "ALL" | "ACTIVE" | "ARRIVED" | "MISSED";

const FILTERS: [Filter, string][] = [
  ["ALL", "Hammasi"],
  ["ACTIVE", "Qabulga yozilgan"],
  ["ARRIVED", "Bordim"],
  ["MISSED", "Bormadim"],
];

export default function ProfilScreen({ navigation }: { navigation: { navigate: (s: string, p?: object) => void } }) {
  const insets = useSafeAreaInsets();
  useTheme();

  const [me, setMe] = useState<Me | null>(null);
  const [checked, setChecked] = useState(false);
  const [items, setItems] = useState<Appointment[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<Filter>("ALL");

  // Vaqtni o'zgartirish
  const [moveFor, setMoveFor] = useState<Appointment | null>(null);
  const [moveSlots, setMoveSlots] = useState<{ date: string; label: string; slots: string[] }[] | null>(null);
  const [moveDay, setMoveDay] = useState(0);
  const [moveTime, setMoveTime] = useState("");

  // Push bildirishnoma
  const [pushOn, setPushOn] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);

  // Kirish
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState("");
  const [via, setVia] = useState("");
  const [deepLink, setDeepLink] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Amallar
  const [checkinFor, setCheckinFor] = useState<Appointment | null>(null);
  const [reviewFor, setReviewFor] = useState<Appointment | null>(null);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");

  // Menyu / oynalar
  const [tg, setTg] = useState<{ linked: boolean; deepLink: string | null; botUsername?: string } | null>(null);

  // Tahrirlash
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editYear, setEditYear] = useState("");
  const [editGender, setEditGender] = useState("");
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [phoneDevCode, setPhoneDevCode] = useState("");
  const [phoneVia, setPhoneVia] = useState("");
  const [phoneDeepLink, setPhoneDeepLink] = useState("");
  const [phoneStep, setPhoneStep] = useState<"phone" | "code">("phone");

  const loadMe = useCallback(async () => {
    const token = await getToken();
    if (!token) { setChecked(true); return; }
    try {
      const d = await api<{ user: Me | null }>("/api/me");
      setMe(d.user);
      if (d.user) {
        api<{ items: Appointment[] }>("/api/appointments").then((r) => setItems(r.items)).catch(() => setItems([]));
        api<{ linked: boolean; deepLink: string | null; botUsername?: string }>("/api/telegram/link").then(setTg).catch(() => {});
      }
    } catch { /* token eskirgan */ } finally {
      setChecked(true);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void loadMe(), 0);
    return () => clearTimeout(t);
  }, [loadMe]);

  // Push holati (kirgandan keyin tekshiriladi)
  useEffect(() => { void isPushOn().then(setPushOn); }, [me]);

  const refresh = async () => {
    setRefreshing(true);
    await loadMe();
    setRefreshing(false);
  };

  // ---------- Kirish ----------
  const requestOtp = async () => {
    setError(""); setBusy(true);
    try {
      const res = await api<OtpResponse>("/api/auth/otp", { json: { phone } });
      if (res.devCode) setDevCode(res.devCode);
      setVia(res.via ?? "");
      setDeepLink(res.deepLink ?? "");
      setStep("code");
      if (res.via === "telegram_link" && res.deepLink) void Linking.openURL(res.deepLink);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    setError(""); setBusy(true);
    try {
      const res = await api<{ token: string; user: Me }>("/api/auth/verify", { json: { phone, code, name } });
      await setToken(res.token);
      setMe(res.user);
      setStep("phone"); setCode(""); setDevCode(""); setVia("");
      void loadMe();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    await setToken(null);
    setMe(null); setItems(null); setTg(null);
  };

  // ---------- Yozuv amallari ----------
  const act = async (id: string, body: object, onDone?: () => void) => {
    try {
      await api(`/api/appointments/${id}`, { method: "PATCH", json: body });
      void loadMe();
      onDone?.();
    } catch (e) {
      Alert.alert("Xatolik", (e as Error).message);
    }
  };

  /** Yozuv ustiga bosilganda klinika sahifasiga o'tish */
  const openClinic = (a: Appointment) => {
    if (a.clinic.active === false) {
      Alert.alert(
        "Klinika platformada yo'q",
        `${a.clinic.name} bilan shartnoma bekor qilingan — klinika sahifasi endi mavjud emas.

` +
        "Yozuvingiz tarixda saqlanib qoladi. Yangi qabul uchun boshqa klinika tanlang.",
        [{ text: "Tushunarli" }]
      );
      return;
    }
    navigation.navigate("Clinic", { slug: a.clinic.slug });
  };

  /** Vaqtni o'zgartirish oynasi — klinikaning bo'sh vaqtlarini olamiz */
  const openMove = async (a: Appointment) => {
    setMoveFor(a); setMoveSlots(null); setMoveDay(0); setMoveTime("");
    const d = await api<{ slots: { date: string; label: string; slots: string[] }[] }>(
      `/api/clinics/${a.clinic.slug}`
    ).catch(() => null);
    setMoveSlots(d?.slots ?? []);
  };

  const submitMove = async () => {
    if (!moveFor || !moveSlots || !moveTime) return;
    const day = moveSlots[moveDay];
    if (!day) return;
    setBusy(true);
    try {
      await api(`/api/appointments/${moveFor.id}`, {
        method: "PATCH",
        json: { action: "reschedule", date: day.date, time: moveTime },
      });
      setMoveFor(null);
      await loadMe();
      Alert.alert("Yuborildi", "Yangi vaqt klinikaga yuborildi — tasdiqlashini kuting.");
    } catch (e) {
      Alert.alert("Xatolik", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  /** Push bildirishnomani yoqish/o'chirish */
  const togglePush = async () => {
    setPushBusy(true);
    try {
      if (pushOn) {
        await unregisterPush();
        setPushOn(false);
      } else {
        const r = await registerPush();
        setPushOn(r.ok);
        if (!r.ok) Alert.alert("Yoqilmadi", r.reason ?? "Push bildirishnoma yoqilmadi");
      }
    } finally {
      setPushBusy(false);
    }
  };

  const submitReview = async () => {
    if (!reviewFor) return;
    try {
      const res = await api<{ message: string }>("/api/reviews", {
        json: { appointmentId: reviewFor.id, rating, text: reviewText },
      });
      Alert.alert("Rahmat!", res.message);
      setReviewFor(null); setReviewText(""); setRating(5);
      void loadMe();
    } catch (e) {
      Alert.alert("Xatolik", (e as Error).message);
    }
  };

  // ---------- Profil tahriri ----------
  const openEdit = () => {
    setEditName(me?.name ?? "");
    setEditYear(me?.birthYear ? String(me.birthYear) : "");
    setEditGender(me?.gender ?? "");
    setEditOpen(true);
  };

  const saveProfile = async () => {
    setBusy(true);
    try {
      const res = await api<{ user: Me }>("/api/me", {
        method: "PATCH",
        json: { name: editName, birthYear: editYear || null, gender: editGender },
      });
      setMe(res.user);
      setEditOpen(false);
    } catch (e) {
      Alert.alert("Xatolik", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const requestPhoneChange = async () => {
    setBusy(true);
    try {
      const res = await api<OtpResponse>("/api/me/phone", { json: { newPhone } });
      if (res.devCode) setPhoneDevCode(res.devCode);
      setPhoneVia(res.via ?? "");
      setPhoneDeepLink(res.deepLink ?? "");
      setPhoneStep("code");
      if (res.via === "telegram_link" && res.deepLink) void Linking.openURL(res.deepLink);
    } catch (e) {
      Alert.alert("Xatolik", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const confirmPhoneChange = async () => {
    setBusy(true);
    try {
      const res = await api<{ phone: string }>("/api/me/phone", { method: "PUT", json: { newPhone, code: phoneCode } });
      setMe(me ? { ...me, phone: res.phone } : me);
      setPhoneOpen(false); setPhoneStep("phone"); setNewPhone(""); setPhoneCode(""); setPhoneDevCode(""); setPhoneVia("");
      Alert.alert("Tayyor", "Raqam almashtirildi");
    } catch (e) {
      Alert.alert("Xatolik", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  // ---------- Yozuvlar tarixi ----------
  const counts = useMemo(() => {
    const l = items ?? [];
    return {
      ALL: l.length,
      ACTIVE: l.filter((a) => ["PENDING", "CONFIRMED", "ALT_OFFERED"].includes(a.status)).length,
      ARRIVED: l.filter((a) => ["ARRIVED", "DONE"].includes(a.status)).length,
      MISSED: l.filter((a) => ["NO_SHOW", "REJECTED", "CANCELLED"].includes(a.status)).length,
    };
  }, [items]);

  const visible = useMemo(() => {
    const l = items ?? [];
    if (filter === "ACTIVE") return l.filter((a) => ["PENDING", "CONFIRMED", "ALT_OFFERED"].includes(a.status));
    if (filter === "ARRIVED") return l.filter((a) => ["ARRIVED", "DONE"].includes(a.status));
    if (filter === "MISSED") return l.filter((a) => ["NO_SHOW", "REJECTED", "CANCELLED"].includes(a.status));
    return l;
  }, [items, filter]);

  if (!checked) {
    return <View style={{ flex: 1, justifyContent: "center", backgroundColor: C.bg }}><ActivityIndicator color={C.brand} size="large" /></View>;
  }

  // ============ KIRISH EKRANI ============
  if (!me) {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 20, paddingTop: insets.top + 50 }} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
          <IconPill name="menu" onPress={() => navigation.navigate("Settings")} size={20} />
        </View>
        <Text style={{ fontSize: 26, fontWeight: "900", color: C.brandDark, textAlign: "center", marginTop: 6 }}>StomGo</Text>

        {step === "phone" ? (
          <>
            <Text style={{ fontSize: 17, fontWeight: "800", textAlign: "center", marginTop: 20, color: C.text }}>Kirish yoki ro&apos;yxatdan o&apos;tish</Text>
            <Text style={{ fontSize: 13, color: C.mut, textAlign: "center", marginTop: 4 }}>Kirish kodi Telegram botga yuboriladi</Text>
            <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: C.card, borderWidth: 1.2, borderColor: C.line, borderRadius: 15, paddingHorizontal: 14, marginTop: 18 }}>
              <Text style={{ fontWeight: "700", color: C.mut }}>+998</Text>
              <TextInput
                value={phone} onChangeText={setPhone} keyboardType="phone-pad"
                placeholder="90 123 45 67" placeholderTextColor={C.faint}
                style={{ flex: 1, paddingVertical: 13, paddingHorizontal: 8, fontSize: 16, color: C.text }}
              />
            </View>
            <TextInput
              value={name} onChangeText={setName}
              placeholder="Ismingiz (ixtiyoriy)" placeholderTextColor={C.faint}
              style={{ backgroundColor: C.card, borderWidth: 1.2, borderColor: C.line, borderRadius: 15, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, marginTop: 10, color: C.text }}
            />
            {!!error && <Text style={{ color: C.red, fontSize: 13, textAlign: "center", marginTop: 10 }}>{error}</Text>}
            <View style={{ marginTop: 14 }}>
              <Btn title={busy ? "..." : "Kod olish"} onPress={requestOtp} disabled={busy || phone.replace(/\D/g, "").length < 9} />
            </View>
          </>
        ) : (
          <>
            <Text style={{ fontSize: 17, fontWeight: "800", textAlign: "center", marginTop: 20, color: C.text }}>Kodni kiriting</Text>
            {via === "telegram" && (
              <View style={{ backgroundColor: C.skyBg, borderRadius: 12, padding: 10, marginTop: 12 }}>
                <Text style={{ fontSize: 13, color: C.sky, textAlign: "center" }}>✈️ Kod Telegram botingizga yuborildi</Text>
              </View>
            )}
            {via === "telegram_link" && (
              <View style={{ backgroundColor: C.skyBg, borderRadius: 12, padding: 12, marginTop: 12 }}>
                <Text style={{ fontSize: 13, color: C.sky, textAlign: "center" }}>
                  Botda raqamingizni tasdiqlang — kod o&apos;sha yerda beriladi.
                </Text>
                <Pressable onPress={() => void Linking.openURL(deepLink)}
                  style={{ backgroundColor: "#0ea5e9", borderRadius: 11, paddingVertical: 9, alignItems: "center", marginTop: 8 }}>
                  <Text style={{ color: "#fff", fontWeight: "800", fontSize: 13 }}>✈️ Botni ochish</Text>
                </Pressable>
              </View>
            )}
            {via === "screen" && !!devCode && (
              <View style={{ backgroundColor: C.amberBg, borderRadius: 12, padding: 10, marginTop: 12 }}>
                <Text style={{ fontSize: 13, color: C.amberInk, textAlign: "center" }}>
                  Demo rejim: kod — <Text style={{ fontWeight: "900", fontSize: 15 }}>{devCode}</Text>
                </Text>
              </View>
            )}
            <TextInput
              value={code} onChangeText={(t) => setCode(t.replace(/\D/g, "").slice(0, 6))}
              keyboardType="number-pad" placeholder="••••••" placeholderTextColor={C.faint}
              style={{ backgroundColor: C.card, borderWidth: 1.2, borderColor: C.line, borderRadius: 15, paddingVertical: 13, fontSize: 24, textAlign: "center", letterSpacing: 10, marginTop: 16, color: C.text }}
            />
            {!!error && <Text style={{ color: C.red, fontSize: 13, textAlign: "center", marginTop: 10 }}>{error}</Text>}
            <View style={{ marginTop: 14 }}>
              <Btn title={busy ? "..." : "Tasdiqlash"} onPress={verify} disabled={busy || code.length !== 6} />
            </View>
            <Pressable onPress={() => { setStep("phone"); setCode(""); setDevCode(""); setVia(""); }} style={{ marginTop: 12 }}>
              <Text style={{ fontSize: 13, color: C.mut, textAlign: "center" }}>Raqamni o&apos;zgartirish</Text>
            </Pressable>
          </>
        )}

      </ScrollView>
    );
  }

  // ============ PROFIL ============
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: C.bg }}
      contentContainerStyle={{ padding: 16, paddingTop: insets.top + 10, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[C.brand]} tintColor={C.brand} />}
    >
      {/* Sarlavha: chapda ism, o'ngda ✏️ va ☰ */}
      <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 21, fontWeight: "900", color: C.text }}>{me.name ?? "Foydalanuvchi"}</Text>
          <Text style={{ fontSize: 13, color: C.mut, marginTop: 1 }}>{me.phone}</Text>
          {(me.birthYear || me.gender) && (
            <Text style={{ fontSize: 12.5, color: C.faint, marginTop: 1 }}>
              {[me.birthYear ? `${me.birthYear}-yil` : null, me.gender === "MALE" ? "Erkak" : me.gender === "FEMALE" ? "Ayol" : null]
                .filter(Boolean).join(" · ")}
            </Text>
          )}
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <IconPill name="pencil" onPress={openEdit} size={18} />
          <IconPill name="menu" onPress={() => navigation.navigate("Settings")} size={20} />
        </View>
      </View>

      {/* Telegram */}
      <View style={{ backgroundColor: C.card, borderRadius: 16, padding: 14, marginTop: 16 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ fontWeight: "800", fontSize: 14.5, color: C.text }}>Telegram bildirishnomalar</Text>
          <Badge label={tg?.linked ? "Ulangan ✓" : "Ulanmagan"} color={tg?.linked ? C.green : C.mut} bg={tg?.linked ? C.greenBg : C.pill} />
        </View>
        {!tg?.linked && tg?.deepLink && (
          <Pressable onPress={() => void Linking.openURL(tg.deepLink!)}
            style={{ backgroundColor: "#0ea5e9", borderRadius: 12, paddingVertical: 10, alignItems: "center", marginTop: 10 }}>
            <Text style={{ color: "#fff", fontWeight: "800", fontSize: 13.5 }}>Telegram&apos;da ulash</Text>
          </Pressable>
        )}
        <Text style={{ fontSize: 12, color: C.mut, marginTop: 8 }}>
          Yozuv tasdiqlanganda va qabuldan 24/2 soat oldin eslatma keladi.
        </Text>
      </View>

      {/* Push bildirishnoma */}
      <View style={{ backgroundColor: C.card, borderRadius: 16, padding: 14, marginTop: 12 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: "800", fontSize: 14.5, color: C.text }}>Push bildirishnoma</Text>
            <Text style={{ fontSize: 12, color: C.mut, marginTop: 3 }}>
              Klinika javob berganda telefoningizga darhol keladi
            </Text>
          </View>
          <Pressable
            onPress={() => void togglePush()}
            disabled={pushBusy}
            style={{
              borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8,
              backgroundColor: pushOn ? C.pill : C.brand,
              borderWidth: pushOn ? 1.2 : 0, borderColor: C.line,
              opacity: pushBusy ? 0.5 : 1,
            }}
          >
            <Text style={{ fontWeight: "800", fontSize: 12.5, color: pushOn ? C.ink2 : C.onBrand }}>
              {pushBusy ? "..." : pushOn ? "O'chirish" : "Yoqish"}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Yozuvlar tarixi */}
      <Text style={{ fontSize: 16, fontWeight: "800", marginTop: 18, marginBottom: 8, color: C.text }}>Yozuvlarim tarixi</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
        {FILTERS.map(([key, label]) => (
          <Pressable key={key} onPress={() => setFilter(key)}
            style={{
              borderRadius: 999, borderWidth: 1.2, paddingHorizontal: 13, paddingVertical: 7, marginRight: 6,
              borderColor: filter === key ? C.brand : C.line,
              backgroundColor: filter === key ? C.brand : C.card,
            }}>
            <Text style={{ fontSize: 12.5, fontWeight: "700", color: filter === key ? "#fff" : C.ink2 }}>
              {label} {counts[key] > 0 ? `(${counts[key]})` : ""}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {!items ? (
        <ActivityIndicator color={C.brand} style={{ marginTop: 20 }} />
      ) : visible.length === 0 ? (
        <View style={{ alignItems: "center", paddingVertical: 26 }}>
          <Text style={{ fontSize: 32 }}>📅</Text>
          <Text style={{ fontWeight: "700", color: C.ink2, marginTop: 6 }}>
            {filter === "ALL" ? "Yozuvlar yo'q" : "Bu bo'limda yozuv yo'q"}
          </Text>
        </View>
      ) : (
        visible.map((a) => {
          const st = statusUi(a.status);
          return (
            <View key={a.id} style={{ backgroundColor: C.card, borderRadius: 16, padding: 13, marginBottom: 9 }}>
              {/* Klinika nomi — bosilsa sahifasiga o'tadi; shartnoma bekor bo'lsa xabar chiqadi */}
              <Pressable
                onPress={() => openClinic(a)}
                style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }}
              >
                <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 5 }}>
                  <Text style={{ fontWeight: "800", fontSize: 14.5, color: C.text }} numberOfLines={1}>
                    {a.clinic.name}
                  </Text>
                  <Ionicons
                    name={a.clinic.active === false ? "alert-circle-outline" : "chevron-forward"}
                    size={15}
                    color={a.clinic.active === false ? C.amber : C.faint}
                  />
                </View>
                {st && <Badge label={st.label} color={st.color} bg={st.bg} />}
              </Pressable>
              <Text style={{ fontSize: 13, color: C.mut, marginTop: 3 }}>
                🕐 {fmtDateTime(a.requestedAt)}{a.doctor ? ` · ${a.doctor.name}` : ""}
              </Text>

              {a.status === "ALT_OFFERED" && a.altAt && (
                <View style={{ backgroundColor: C.skyBg, borderRadius: 12, padding: 10, marginTop: 8 }}>
                  <Text style={{ fontSize: 13, color: C.text }}>Klinika taklifi: <Text style={{ fontWeight: "800" }}>{fmtDateTime(a.altAt)}</Text></Text>
                  <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                    <Pressable onPress={() => act(a.id, { action: "accept_alt" })}
                      style={{ backgroundColor: C.brand, borderRadius: 10, paddingHorizontal: 13, paddingVertical: 7 }}>
                      <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12.5 }}>Qabul qilaman</Text>
                    </Pressable>
                    <Pressable onPress={() => act(a.id, { action: "cancel" })}
                      style={{ borderWidth: 1.2, borderColor: C.line, borderRadius: 10, paddingHorizontal: 13, paddingVertical: 7 }}>
                      <Text style={{ fontWeight: "600", fontSize: 12.5, color: C.ink2 }}>Bekor qilish</Text>
                    </Pressable>
                  </View>
                </View>
              )}

              {a.status === "REJECTED" && !!a.rejectReason && (
                <Text style={{ fontSize: 12.5, color: C.red, marginTop: 6 }}>Sabab: {a.rejectReason}</Text>
              )}

              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 9 }}>
                {["PENDING", "CONFIRMED", "ALT_OFFERED"].includes(a.status) && (
                  <>
                    <Pressable onPress={() => void openMove(a)}
                      style={{ borderWidth: 1.2, borderColor: C.line, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 }}>
                      <Text style={{ fontSize: 12.5, fontWeight: "700", color: C.ink2 }}>Vaqtni o&apos;zgartirish</Text>
                    </Pressable>
                    <Pressable onPress={() => act(a.id, { action: "cancel" })}
                      style={{ borderWidth: 1.2, borderColor: C.line, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 }}>
                      <Text style={{ fontSize: 12.5, fontWeight: "600", color: C.mut }}>Bekor qilish</Text>
                    </Pressable>
                  </>
                )}
                {a.status === "CONFIRMED" && (
                  <Pressable onPress={() => { setCheckinFor(a); }}
                    style={{
                      backgroundColor: C.brand, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6,
                      borderWidth: 1.5, borderColor: C.outlinePrimary,
                    }}>
                    <Text style={{ fontSize: 12.5, fontWeight: "800", color: "#fff" }}>Keldim ✓</Text>
                  </Pressable>
                )}
                {["ARRIVED", "DONE"].includes(a.status) && !a.review && (
                  <Pressable onPress={() => setReviewFor(a)}
                    style={{
                      backgroundColor: "#f59e0b", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6,
                      borderWidth: 1.5, borderColor: C.outlineAccent,
                    }}>
                    <Text style={{ fontSize: 12.5, fontWeight: "800", color: "#fff" }}>Sharh yozish ★</Text>
                  </Pressable>
                )}
                {a.review && <Badge label="Sharh yozilgan" color={C.green} bg={C.greenBg} />}
              </View>
            </View>
          );
        })
      )}

      <Text style={{ fontSize: 11, color: C.faint, textAlign: "center", marginTop: 18 }}>
        StomGo v{Constants.expoConfig?.version ?? "?"}
      </Text>

      {/* ---------- Oynalar ---------- */}

      {/* Tahrirlash */}
      <Sheet open={editOpen} onClose={() => setEditOpen(false)} title="Profilni tahrirlash" position="center">
        <Text style={{ fontSize: 12.5, color: C.mut, marginBottom: 4 }}>Ism</Text>
        <TextInput value={editName} onChangeText={setEditName} placeholderTextColor={C.faint}
          style={{ borderWidth: 1.2, borderColor: C.line, borderRadius: 13, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, marginBottom: 10, color: C.text }} />
        <Text style={{ fontSize: 12.5, color: C.mut, marginBottom: 4 }}>Tug&apos;ilgan yil</Text>
        <TextInput value={editYear} onChangeText={(t) => setEditYear(t.replace(/\D/g, "").slice(0, 4))}
          keyboardType="number-pad" placeholder="1995" placeholderTextColor={C.faint}
          style={{ borderWidth: 1.2, borderColor: C.line, borderRadius: 13, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, marginBottom: 10, color: C.text }} />
        <Text style={{ fontSize: 12.5, color: C.mut, marginBottom: 4 }}>Jins</Text>
        <View style={{ flexDirection: "row", gap: 6, marginBottom: 12 }}>
          {([["MALE", "Erkak"], ["FEMALE", "Ayol"], ["", "Ko'rsatmayman"]] as const).map(([v, l]) => (
            <Pressable key={v} onPress={() => setEditGender(v)}
              style={{
                flex: 1, borderWidth: 1.2, borderRadius: 12, paddingVertical: 9, alignItems: "center",
                borderColor: editGender === v ? C.brand : C.line,
                backgroundColor: editGender === v ? C.brandLight : C.card,
              }}>
              <Text style={{ fontSize: 12.5, fontWeight: "600", color: C.text }}>{l}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable onPress={() => { setEditOpen(false); setPhoneOpen(true); }} style={{ marginBottom: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={{ fontSize: 13, fontWeight: "700", color: C.brand }}>Raqamni almashtirish</Text>
            <Text style={{ fontSize: 12.5, color: C.mut }}>{me.phone}</Text>
            <Ionicons name="chevron-forward" size={14} color={C.faint} />
          </View>
        </Pressable>
        <Btn title={busy ? "..." : "Saqlash"} onPress={saveProfile} disabled={busy} />
      </Sheet>

      {/* Raqam almashtirish */}
      <Sheet open={phoneOpen} onClose={() => { setPhoneOpen(false); setPhoneStep("phone"); }} title="Raqamni almashtirish" position="center">
        {phoneStep === "phone" ? (
          <>
            <View style={{ backgroundColor: C.pill, borderRadius: 14, padding: 12, marginBottom: 14 }}>
              <Text style={{ fontSize: 12, color: C.mut }}>Hozirgi raqam</Text>
              <Text style={{ fontSize: 16, fontWeight: "800", color: C.text, marginTop: 2 }}>{me.phone}</Text>
            </View>

            <Text style={{ fontSize: 12.5, fontWeight: "700", color: C.ink2, marginBottom: 6 }}>Yangi raqam</Text>
            <View style={{
              flexDirection: "row", alignItems: "center",
              borderWidth: 1.5, borderColor: newPhone ? C.brand : C.line,
              borderRadius: 14, paddingHorizontal: 14, marginBottom: 10,
            }}>
              <Text style={{ fontWeight: "800", fontSize: 15.5, color: C.ink2 }}>+998</Text>
              <View style={{ width: 1, height: 22, backgroundColor: C.line, marginHorizontal: 10 }} />
              <TextInput
                value={newPhone} onChangeText={setNewPhone} keyboardType="phone-pad"
                placeholder="90 123 45 67" placeholderTextColor={C.faint} maxLength={12}
                style={{ flex: 1, paddingVertical: 13, fontSize: 16, letterSpacing: 0.5, color: C.text }}
              />
            </View>
            <Text style={{ fontSize: 12, color: C.mut, lineHeight: 17, marginBottom: 14 }}>
              Tasdiqlash kodi Telegram botga yuboriladi. Yangi raqam avvalgisining
              o&apos;rniga ishlatiladi.
            </Text>
            <Btn title={busy ? "..." : "Kod olish"} onPress={requestPhoneChange} disabled={busy || newPhone.replace(/\D/g, "").length < 9} />
          </>
        ) : (
          <>
            {phoneVia === "telegram_link" && (
              <View style={{ backgroundColor: C.skyBg, borderRadius: 12, padding: 10, marginBottom: 10 }}>
                <Text style={{ fontSize: 12.5, color: C.sky, textAlign: "center" }}>Botda yangi raqamni tasdiqlang.</Text>
                <Pressable onPress={() => void Linking.openURL(phoneDeepLink)}
                  style={{ backgroundColor: "#0ea5e9", borderRadius: 10, paddingVertical: 8, alignItems: "center", marginTop: 7 }}>
                  <Text style={{ color: "#fff", fontWeight: "800", fontSize: 12.5 }}>✈️ Botni ochish</Text>
                </Pressable>
              </View>
            )}
            {phoneVia === "screen" && !!phoneDevCode && (
              <View style={{ backgroundColor: C.amberBg, borderRadius: 12, padding: 9, marginBottom: 10 }}>
                <Text style={{ fontSize: 12.5, color: C.amberInk, textAlign: "center" }}>
                  Demo rejim: kod — <Text style={{ fontWeight: "900" }}>{phoneDevCode}</Text>
                </Text>
              </View>
            )}
            <TextInput value={phoneCode} onChangeText={(t) => setPhoneCode(t.replace(/\D/g, "").slice(0, 6))}
              keyboardType="number-pad" placeholder="••••••" placeholderTextColor={C.faint}
              style={{ borderWidth: 1.2, borderColor: C.line, borderRadius: 13, paddingVertical: 11, fontSize: 22, textAlign: "center", letterSpacing: 8, marginBottom: 12, color: C.text }} />
            <Btn title={busy ? "..." : "Tasdiqlash"} onPress={confirmPhoneChange} disabled={busy || phoneCode.length !== 6} />
          </>
        )}
      </Sheet>

      {/* Check-in */}
      {/* Vaqtni o'zgartirish */}
      <Sheet open={!!moveFor} onClose={() => setMoveFor(null)} title="Yangi vaqt tanlang">
        {!!moveFor && (
          <View>
            <Text style={{ fontSize: 13, color: C.mut }}>
              {moveFor.clinic.name} · hozirgi vaqt:{" "}
              <Text style={{ fontWeight: "800", color: C.ink2 }}>{fmtDateTime(moveFor.requestedAt)}</Text>
            </Text>
            <Text style={{ fontSize: 12, color: C.faint, marginTop: 4 }}>
              Yangi vaqtni klinika qaytadan tasdiqlaydi. Ko&apos;pi bilan 3 marta o&apos;zgartirish mumkin.
            </Text>

            {moveSlots === null ? (
              <ActivityIndicator color={C.brand} style={{ marginTop: 24 }} />
            ) : moveSlots.length === 0 ? (
              <Text style={{ fontSize: 13, color: C.mut, textAlign: "center", marginTop: 20 }}>
                Bo&apos;sh vaqt topilmadi. Klinikaga qo&apos;ng&apos;iroq qiling.
              </Text>
            ) : (
              <>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
                  {moveSlots.map((day, i) => (
                    <Pressable key={day.date} onPress={() => { setMoveDay(i); setMoveTime(""); }}
                      style={{
                        borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9, marginRight: 7,
                        backgroundColor: i === moveDay ? C.brand : C.pill,
                      }}>
                      <Text style={{ fontSize: 13, fontWeight: "700", color: i === moveDay ? C.onBrand : C.ink2 }}>
                        {day.label}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>

                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 12 }}>
                  {(moveSlots[moveDay]?.slots ?? []).map((t) => (
                    <Pressable key={t} onPress={() => setMoveTime(t)}
                      style={{
                        borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9,
                        backgroundColor: t === moveTime ? C.brand : "transparent",
                        borderWidth: 1.2, borderColor: t === moveTime ? C.brand : C.line,
                      }}>
                      <Text style={{ fontSize: 13, fontWeight: "700", color: t === moveTime ? C.onBrand : C.ink2 }}>{t}</Text>
                    </Pressable>
                  ))}
                  {(moveSlots[moveDay]?.slots ?? []).length === 0 && (
                    <Text style={{ fontSize: 13, color: C.mut }}>Bu kunda bo&apos;sh vaqt yo&apos;q</Text>
                  )}
                </View>

                <View style={{ marginTop: 16 }}>
                  <Btn title="Yangi vaqtni yuborish" onPress={() => void submitMove()} disabled={busy || !moveTime} />
                </View>
              </>
            )}
          </View>
        )}
      </Sheet>

      <Sheet open={!!checkinFor} onClose={() => setCheckinFor(null)} title="Kelganingizni tasdiqlang">
        <View style={{ alignItems: "center" }}>
          <View style={{
            width: 56, height: 56, borderRadius: 16, backgroundColor: C.brandLight,
            alignItems: "center", justifyContent: "center",
          }}>
            <Ionicons name="qr-code-outline" size={28} color={C.brand} />
          </View>
          <Text style={{ fontSize: 13.5, color: C.mut, textAlign: "center", marginTop: 12, lineHeight: 20 }}>
            Resepshn stolidagi <Text style={{ fontWeight: "800", color: C.ink2 }}>QR kodni</Text> telefon
            kamerangiz bilan skanerlang — tashrifingiz tasdiqlanadi va sharh yozish ochiladi.
          </Text>
          <Text style={{ fontSize: 12.5, color: C.faint, textAlign: "center", marginTop: 8 }}>
            Skanerlay olmasangiz, resepshnga ayting — ular panelda belgilaydi.
          </Text>
          <View style={{ width: "100%", marginTop: 16 }}>
            <Btn title="Yopish" variant="outline" onPress={() => setCheckinFor(null)} />
          </View>
        </View>
      </Sheet>

      {/* Sharh */}
      <Sheet open={!!reviewFor} onClose={() => setReviewFor(null)} title="Sharh yozish">
        <Text style={{ fontSize: 13, color: C.mut }}>{reviewFor?.clinic.name} haqida fikringiz</Text>
        <View style={{ flexDirection: "row", justifyContent: "center", gap: 8, marginVertical: 12 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Pressable key={i} onPress={() => setRating(i)}>
              <Text style={{ fontSize: 32, color: i <= rating ? "#f59e0b" : C.starOff }}>★</Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          value={reviewText} onChangeText={setReviewText} multiline
          placeholder="Xizmat qanday bo'ldi? (ixtiyoriy)" placeholderTextColor={C.faint}
          style={{ borderWidth: 1.2, borderColor: C.line, borderRadius: 13, padding: 11, fontSize: 13.5, minHeight: 70, textAlignVertical: "top", marginBottom: 12, color: C.text }}
        />
        <Btn title="Yuborish" onPress={submitReview} />
      </Sheet>
    </ScrollView>
  );
}

/** ☰ menyu: mavzu, til, maxfiylik, qo'llab-quvvatlash, server, chiqish */
