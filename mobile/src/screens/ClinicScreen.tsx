import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, Image, Linking, TextInput, ActivityIndicator, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api, getBaseUrl, absUrl, getToken, setToken } from "../api";
import { C, SPECIALTY_LABELS, useTheme } from "../theme";
import { fmtKm, fmtPrice } from "../format";
import { Stars, Badge, Btn, Sheet, Chip } from "../components/ui";
import MapsSheet, { openRoute } from "../components/MapsSheet";
import type { ClinicDetail, Me } from "../types";

const CATEGORY_LABELS: Record<string, string> = {
  DIAGNOSTIKA: "Diagnostika", TERAPIYA: "Terapiya", GIGIENA: "Gigiena", ESTETIKA: "Estetika",
  XIRURGIYA: "Xirurgiya", ORTOPEDIYA: "Ortopediya", ORTODONTIYA: "Ortodontiya", BOLALAR: "Bolalar",
};

type MapApp = { key: string; label: string; letter: string; bg: string; url: string };

export default function ClinicScreen({ route, navigation }: {
  route: { params: { slug: string } };
  navigation: { goBack: () => void; navigate: (s: string, p?: object) => void };
}) {
  const { slug } = route.params;
  const insets = useSafeAreaInsets();
  useTheme(); // mavzu almashsa ekran qayta chiziladi (remount emas)
  const [d, setD] = useState<ClinicDetail | null>(null);
  const [base, setBase] = useState("");
  const [mapsApps, setMapsApps] = useState<MapApp[] | null>(null);
  const [bookOpen, setBookOpen] = useState(false);
  const [selDoctor, setSelDoctor] = useState<string | null>(null);
  const [selDay, setSelDay] = useState(0);
  const [selTime, setSelTime] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  // Yozilish ichidagi tezkor kirish (tanlovlar saqlanib qoladi)
  const [loginMode, setLoginMode] = useState<null | "phone" | "code">(null);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState("");
  const [via, setVia] = useState("");
  const [deepLink, setDeepLink] = useState("");
  const [loginError, setLoginError] = useState("");

  useEffect(() => {
    getBaseUrl().then(setBase);
    api<{ clinic: ClinicDetail }>(`/api/clinics/${slug}`).then((r) => setD(r.clinic)).catch(() => {});
  }, [slug]);

  const track = (type: string) => {
    if (d) void api("/api/events", { json: { type, clinicId: d.id } }).catch(() => {});
  };

  /** Ilova ichida suhbat ochish (kirmagan bo'lsa — profilga) */
  const openChat = async () => {
    if (!d) return;
    if (!(await getToken())) {
      Alert.alert("Kirish kerak", "Klinikaga xabar yozish uchun avval kiring.");
      navigation.navigate("Tabs", { screen: "Profil" });
      return;
    }
    const r = await api<{ id: string }>("/api/chat", { json: { clinicId: d.id } }).catch(() => null);
    if (r) navigation.navigate("Chat", { id: r.id, title: d.name });
  };

  /** Yozuvni yuborish. Kirilmagan bo'lsa — sheet ichida login ochiladi, tanlovlar joyida qoladi. */
  const submit = async () => {
    if (!d || !selTime) return;
    const token = await getToken();
    if (!token) {
      setLoginMode("phone");
      return;
    }
    setBusy(true);
    try {
      const day = d.slots[selDay];
      const res = await api<{ code: string }>("/api/appointments", {
        json: { clinicId: d.id, doctorId: selDoctor, date: day.date, time: selTime, note },
      });
      setSuccess(res.code);
      setLoginMode(null);
    } catch (e) {
      Alert.alert("Xatolik", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const requestOtp = async () => {
    setLoginError(""); setBusy(true);
    try {
      const res = await api<{ devCode?: string; via?: string; deepLink?: string }>("/api/auth/otp", { json: { phone } });
      if (res.devCode) setDevCode(res.devCode);
      setVia(res.via ?? "");
      setDeepLink(res.deepLink ?? "");
      setLoginMode("code");
      if (res.via === "telegram_link" && res.deepLink) void Linking.openURL(res.deepLink);
    } catch (e) {
      setLoginError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    setLoginError(""); setBusy(true);
    try {
      const res = await api<{ token: string; user: Me }>("/api/auth/verify", { json: { phone, code, name } });
      await setToken(res.token);
      setLoginMode(null); setCode(""); setDevCode("");
      // Kirish tugadi — yozuvni avtomatik davom ettiramiz
      setBusy(false);
      await submit();
    } catch (e) {
      setLoginError((e as Error).message);
      setBusy(false);
    }
  };

  if (!d) return <View style={{ flex: 1, justifyContent: "center", backgroundColor: C.bg }}><ActivityIndicator color={C.brand} size="large" /></View>;

  const cover = absUrl(base, d.photoUrl);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}>
        {cover ? (
          <Image source={{ uri: cover }} style={{ width: "100%", height: 190 }} />
        ) : (
          <View style={{ height: 170, alignItems: "center", justifyContent: "center", backgroundColor: `hsl(${d.coverHue}, 55%, 45%)` }}>
            <Text style={{ fontSize: 56, fontWeight: "900", color: "#fff" }}>{d.name[0]}</Text>
          </View>
        )}
        <Pressable onPress={() => navigation.goBack()}
          style={{ position: "absolute", top: insets.top + 8, left: 14, backgroundColor: C.card, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 9 }}>
          <Text style={{ fontSize: 15, fontWeight: "800" }}>←</Text>
        </Pressable>

        <View style={{ paddingHorizontal: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 14 }}>
            <Text style={{ fontSize: 20, fontWeight: "900", color: C.text }}>{d.name}</Text>
            {d.verified && <Text style={{ color: C.brand, fontSize: 16 }}>✔︎</Text>}
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 3 }}>
            <Stars value={d.rating} />
            <Text style={{ fontWeight: "800", fontSize: 13 }}>{d.rating.toFixed(1)}</Text>
            <Text style={{ color: C.mut, fontSize: 13 }}>({d.reviewCount} sharh)</Text>
          </View>
          <Text style={{ color: C.mut, fontSize: 13, marginTop: 3 }}>{d.address} · {fmtKm(d.distanceKm)}</Text>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: 8 }}>
            <Badge label={d.isOpen ? `Ochiq · ${d.todayHours}` : `Yopiq · ${d.todayHours}`}
              color={d.isOpen ? C.green : C.mut} bg={d.isOpen ? C.greenBg : C.pill} />
            {d.is247 && <Badge label="24/7" color={C.sky} bg={C.skyBg} />}
            {d.emergency && <Badge label="Shoshilinch qabul" color={C.amber} bg={C.amberBg} />}
            {d.childFriendly && <Badge label="Bolalar uchun" color={C.violet} bg={C.violetBg} />}
          </View>

          {!!d.description && <Text style={{ fontSize: 13.5, color: C.ink3, lineHeight: 20, marginTop: 10 }}>{d.description}</Text>}
          <Text style={{ fontSize: 12, color: C.faint, marginTop: 6 }}>Odatda {d.avgResponseMin} daqiqada javob beradi</Text>

          {/* Foto galereya */}
          {d.gallery?.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }} contentContainerStyle={{ gap: 8 }}>
              {d.gallery.map((url, i) => (
                <Image key={i} source={{ uri: absUrl(base, url)! }} style={{ width: 150, height: 96, borderRadius: 12, backgroundColor: C.pill }} />
              ))}
            </ScrollView>
          )}

          {/* Amallar: xabar (ilova ichida), qo'ng'iroq, marshrut */}
          <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
            <Pressable
              onPress={openChat}
              style={{ flex: 1.2, backgroundColor: C.brand, borderWidth: 1.5, borderColor: C.outlinePrimary, borderRadius: 14, paddingVertical: 11, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 6 }}>
              <Ionicons name="chatbubble-ellipses-outline" size={16} color={C.onBrand} />
              <Text style={{ color: C.onBrand, fontWeight: "800", fontSize: 13 }}>Xabar yozish</Text>
            </Pressable>
            <Pressable
              onPress={() => { track("CALL_CLICK"); void Linking.openURL(`tel:${d.phone}`); }}
              style={{ flex: 1, borderWidth: 1.3, borderColor: C.line, borderRadius: 14, paddingVertical: 11, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 5 }}>
              <Ionicons name="call-outline" size={16} color={C.ink2} />
              <Text style={{ color: C.ink2, fontWeight: "700", fontSize: 13 }}>Qo&apos;ng&apos;iroq</Text>
            </Pressable>
            <Pressable
              onPress={() => { track("ROUTE_CLICK"); void openRoute(d.lat, d.lng, (apps) => setMapsApps(apps)); }}
              style={{ borderWidth: 1.3, borderColor: C.line, borderRadius: 14, paddingVertical: 11, paddingHorizontal: 14, alignItems: "center" }}>
              <Ionicons name="navigate-outline" size={16} color={C.ink2} />
            </Pressable>
          </View>

          <Text style={{ fontSize: 11.5, color: C.faint, marginTop: 7, lineHeight: 16 }}>
            🔒 Kelishuvlarni ilova ichidagi suhbatda oling — tashqi kanallardagi
            kelishuvlarga platforma javobgar emas.
          </Text>

          {/* Xizmatlar */}
          <Text style={{ fontSize: 16, fontWeight: "800", marginTop: 20, marginBottom: 8 }}>Xizmatlar va narxlar</Text>
          {Object.entries(d.servicesByCategory).map(([cat, items]) => (
            <View key={cat} style={{ backgroundColor: C.card, borderRadius: 15, padding: 12, marginBottom: 8 }}>
              <Text style={{ fontSize: 11, fontWeight: "800", color: C.brand, textTransform: "uppercase", marginBottom: 4 }}>
                {CATEGORY_LABELS[cat] ?? cat}
              </Text>
              {items.map((s) => (
                <View key={s.code} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 5, borderBottomWidth: 0.6, borderBottomColor: C.pill }}>
                  <Text style={{ fontSize: 13, color: C.text, flex: 1 }}>{s.name}</Text>
                  <Text style={{ fontSize: 13, fontWeight: "700", color: C.ink2 }}>{fmtPrice(s.priceMin)} – {fmtPrice(s.priceMax)}</Text>
                </View>
              ))}
            </View>
          ))}
          <Text style={{ fontSize: 11.5, color: C.faint }}>Narxlar taxminiy. Aniq narx ko&apos;rikdan keyin belgilanadi.</Text>

          {/* Shifokorlar */}
          {d.showDoctors && d.doctors.length > 0 && (
            <>
              <Text style={{ fontSize: 16, fontWeight: "800", marginTop: 20, marginBottom: 8 }}>Shifokorlar</Text>
              {d.doctors.map((doc) => (
                <View key={doc.id} style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.card, borderRadius: 15, padding: 11, marginBottom: 7 }}>
                  {doc.photoUrl ? (
                    <Image source={{ uri: absUrl(base, doc.photoUrl)! }} style={{ width: 44, height: 44, borderRadius: 22 }} />
                  ) : (
                    <View style={{ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: doc.gender === "FEMALE" ? "#f472b6" : "#38bdf8" }}>
                      <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16 }}>{doc.name[0]}</Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: "700", fontSize: 13.5 }}>{doc.name}{doc.gender === "FEMALE" ? " ♀" : ""}</Text>
                    <Text style={{ fontSize: 12, color: C.mut }}>
                      {SPECIALTY_LABELS[doc.specialty] ?? doc.specialty} · {doc.experienceYears} yil
                    </Text>
                  </View>
                </View>
              ))}
            </>
          )}

          {/* Sharhlar */}
          <Text style={{ fontSize: 16, fontWeight: "800", marginTop: 20, marginBottom: 8 }}>Sharhlar</Text>
          {d.reviews.length === 0 ? (
            <Text style={{ fontSize: 13, color: C.mut }}>Hozircha sharh yo&apos;q.</Text>
          ) : (
            d.reviews.map((r) => (
              <View key={r.id} style={{ backgroundColor: C.card, borderRadius: 15, padding: 12, marginBottom: 7 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ fontWeight: "700", fontSize: 13 }}>{r.author}</Text>
                  <Stars value={r.rating} size={11} />
                </View>
                {!!r.text && <Text style={{ fontSize: 13, color: C.ink3, marginTop: 4 }}>{r.text}</Text>}
                {!!r.reply && (
                  <View style={{ backgroundColor: C.softer, borderRadius: 10, padding: 8, marginTop: 6 }}>
                    <Text style={{ fontSize: 12.5, color: C.ink3 }}>
                      <Text style={{ color: C.brand, fontWeight: "700" }}>Klinika javobi: </Text>{r.reply}
                    </Text>
                  </View>
                )}
              </View>
            ))
          )}
          <Text style={{ fontSize: 11.5, color: C.faint, marginBottom: 8 }}>Sharhlar faqat tasdiqlangan tashrifdan keyin yoziladi.</Text>
        </View>
      </ScrollView>

      {/* Yozilish tugmasi — telefon tugmalaridan yuqorida (tunda oq ramka bilan ajraladi) */}
      <View style={{ position: "absolute", bottom: insets.bottom + 14, left: 16, right: 16 }}>
        <Btn title="Qabulga yozilish" onPress={() => setBookOpen(true)} />
      </View>

      <MapsSheet open={!!mapsApps} onClose={() => setMapsApps(null)} apps={mapsApps ?? []} />

      {/* Yozilish */}
      <Sheet
        open={bookOpen}
        onClose={() => { setBookOpen(false); setSuccess(null); setLoginMode(null); }}
        title={success ? "So'rov yuborildi" : loginMode ? "Kirish" : "Qabulga yozilish"}
      >
        {success ? (
          <View style={{ alignItems: "center" }}>
            <Text style={{ fontSize: 40 }}>✅</Text>
            <Text style={{ fontWeight: "700", fontSize: 15, marginTop: 8 }}>So&apos;rovingiz klinikaga yuborildi</Text>
            <Text style={{ fontSize: 13, color: C.mut, textAlign: "center", marginTop: 5 }}>
              Klinika odatda {d.avgResponseMin} daqiqada javob beradi. Holatni Profil bo&apos;limida kuzating.
            </Text>
            <View style={{ backgroundColor: C.softer, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, marginTop: 12 }}>
              <Text style={{ fontSize: 12.5, color: C.mut, textAlign: "center", lineHeight: 18 }}>
                Klinikaga borganingizda resepshndagi QR kodni skanerlang — tashrifingiz
                tasdiqlanadi va sharh yozish ochiladi.
              </Text>
            </View>
          </View>
        ) : loginMode ? (
          /* Tanlovlar saqlangan holda tezkor kirish */
          <View>
            <View style={{ backgroundColor: C.brandLight, borderRadius: 12, padding: 10, marginBottom: 12 }}>
              <Text style={{ fontSize: 12.5, color: C.brandDark }}>
                Tanlovingiz saqlandi: {d.slots[selDay]?.label}, {selTime}. Kirishdan keyin so&apos;rov avtomatik yuboriladi.
              </Text>
            </View>
            {loginMode === "phone" ? (
              <>
                <View style={{ flexDirection: "row", alignItems: "center", borderWidth: 1.2, borderColor: C.line, borderRadius: 13, paddingHorizontal: 12, marginBottom: 8 }}>
                  <Text style={{ fontWeight: "700", color: C.mut }}>+998</Text>
                  <TextInput value={phone} onChangeText={setPhone} keyboardType="phone-pad"
                    placeholder="90 123 45 67" placeholderTextColor={C.faint}
                    style={{ flex: 1, paddingVertical: 11, paddingHorizontal: 7, fontSize: 15 }} />
                </View>
                <TextInput value={name} onChangeText={setName}
                  placeholder="Ismingiz (ixtiyoriy)" placeholderTextColor={C.faint}
                  style={{ borderWidth: 1.2, borderColor: C.line, borderRadius: 13, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14, marginBottom: 8 }} />
                {!!loginError && <Text style={{ color: C.red, fontSize: 12.5, marginBottom: 8 }}>{loginError}</Text>}
                <Btn title={busy ? "..." : "Kod olish"} onPress={requestOtp} disabled={busy || phone.replace(/\D/g, "").length < 9} />
              </>
            ) : (
              <>
                {via === "telegram" && (
                  <View style={{ backgroundColor: C.skyBg, borderRadius: 12, padding: 9, marginBottom: 8 }}>
                    <Text style={{ fontSize: 12.5, color: C.sky, textAlign: "center" }}>✈️ Kod Telegram botingizga yuborildi</Text>
                  </View>
                )}
                {via === "telegram_link" && (
                  <View style={{ backgroundColor: C.skyBg, borderRadius: 12, padding: 10, marginBottom: 8 }}>
                    <Text style={{ fontSize: 12.5, color: C.sky, textAlign: "center" }}>Botda raqamni tasdiqlang — kod o&apos;sha yerda</Text>
                    <Pressable onPress={() => void Linking.openURL(deepLink)}
                      style={{ backgroundColor: "#0ea5e9", borderRadius: 10, paddingVertical: 8, alignItems: "center", marginTop: 7 }}>
                      <Text style={{ color: "#fff", fontWeight: "800", fontSize: 12.5 }}>✈️ Botni ochish</Text>
                    </Pressable>
                  </View>
                )}
                {via === "screen" && !!devCode && (
                  <View style={{ backgroundColor: C.amberBg, borderRadius: 12, padding: 9, marginBottom: 8 }}>
                    <Text style={{ fontSize: 12.5, color: C.amberInk, textAlign: "center" }}>
                      Demo rejim: kod — <Text style={{ fontWeight: "900", fontSize: 14 }}>{devCode}</Text>
                    </Text>
                  </View>
                )}
                <TextInput value={code} onChangeText={(t) => setCode(t.replace(/\D/g, "").slice(0, 6))}
                  keyboardType="number-pad" placeholder="••••••" placeholderTextColor={C.faint}
                  style={{ borderWidth: 1.2, borderColor: C.line, borderRadius: 13, paddingVertical: 11, fontSize: 22, textAlign: "center", letterSpacing: 8, marginBottom: 8 }} />
                {!!loginError && <Text style={{ color: C.red, fontSize: 12.5, marginBottom: 8 }}>{loginError}</Text>}
                <Btn title={busy ? "..." : "Tasdiqlash va yozilish"} onPress={verify} disabled={busy || code.length !== 6} />
              </>
            )}
          </View>
        ) : (
          <View>
            {d.showDoctors && d.doctors.length > 0 && (
              <>
                <Text style={{ fontSize: 12.5, fontWeight: "700", color: C.mut, marginBottom: 6 }}>Shifokor (ixtiyoriy)</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                  <Chip active={selDoctor === null} onPress={() => setSelDoctor(null)}>Farqi yo&apos;q</Chip>
                  {d.doctors.map((doc) => (
                    <Chip key={doc.id} active={selDoctor === doc.id} onPress={() => setSelDoctor(doc.id)}>
                      {doc.name}{doc.gender === "FEMALE" ? " ♀" : ""}
                    </Chip>
                  ))}
                </View>
              </>
            )}

            <Text style={{ fontSize: 12.5, fontWeight: "700", color: C.mut, marginBottom: 6 }}>Kun</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {d.slots.map((day, i) => (
                <Chip key={day.date} active={selDay === i} onPress={() => { setSelDay(i); setSelTime(null); }}>{day.label}</Chip>
              ))}
            </ScrollView>

            <Text style={{ fontSize: 12.5, fontWeight: "700", color: C.mut, marginBottom: 6 }}>Vaqt</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 4 }}>
              {d.slots[selDay]?.slots.map((t) => (
                <Pressable key={t} onPress={() => setSelTime(t)}
                  style={{
                    borderRadius: 10, borderWidth: 1.2, paddingHorizontal: 13, paddingVertical: 7,
                    borderColor: selTime === t ? C.brand : C.line,
                    backgroundColor: selTime === t ? C.brand : C.card,
                  }}>
                  <Text style={{ fontSize: 12.5, fontWeight: "600", color: selTime === t ? "#fff" : C.ink2 }}>{t}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={{ fontSize: 11.5, color: C.faint, marginBottom: 10 }}>Bu so&apos;ralgan vaqt — klinika tasdiqlagach yakuniy hisoblanadi.</Text>

            <TextInput
              value={note} onChangeText={setNote}
              placeholder="Izoh (ixtiyoriy): nima bezovta qilyapti?"
              placeholderTextColor={C.faint}
              multiline
              style={{ borderWidth: 1.2, borderColor: C.line, borderRadius: 13, padding: 11, fontSize: 13.5, minHeight: 60, textAlignVertical: "top", marginBottom: 12 }}
            />

            <Btn title={busy ? "Yuborilmoqda..." : "So'rov yuborish"} onPress={submit} disabled={!selTime || busy} />
          </View>
        )}
      </Sheet>
    </View>
  );
}
