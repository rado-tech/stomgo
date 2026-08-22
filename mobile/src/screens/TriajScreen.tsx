import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, TextInput, ActivityIndicator, Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../api";
import { C, SPECIALTY_LABELS, useTheme } from "../theme";
import { fmtPrice, fmtKm } from "../format";
import { Stars, Badge, Btn } from "../components/ui";
import type { TriageResult } from "../types";

const PROBLEMS = [
  ["OGRIQ", "🦷", "Tish og'riyapti"],
  ["SHISH", "😖", "Shish / flyus"],
  ["QONASH", "🩸", "Milk qonayapti"],
  ["TRAVMA", "💥", "Tish sindi / travma"],
  ["ESTETIKA", "✨", "Estetika (oqartirish, vinir)"],
  ["PROFILAKTIKA", "🪥", "Profilaktik ko'rik"],
  ["BOSHQA", "❓", "Boshqa"],
] as const;

const PAIN = [
  ["YENGIL", "Yengil — chidasa bo'ladi"],
  ["ORTACHA", "O'rtacha — vaqti-vaqti bilan"],
  ["KUCHLI", "Kuchli — doimiy og'riq"],
  ["CHIDAB_BOLMAS", "Chidab bo'lmas — dori yordam bermayapti"],
] as const;

const DURATION = [
  ["BUGUN", "Bugun boshlandi"], ["KUNLAR_2_3", "2–3 kun"], ["HAFTA", "Bir haftadan ko'p"], ["OY", "Bir oydan ko'p"],
] as const;

const FLAGS = [
  ["FACE_SWELLING", "Yuz / lunj shishgan"],
  ["FEVER", "Harorat bor"],
  ["SWALLOW", "Yutish qiyin"],
  ["BREATH", "Nafas olish qiyin"],
  ["BLEEDING_NONSTOP", "Qon to'xtamayapti"],
  ["NIGHT_PAIN", "Tunda uyg'otadi"],
  ["SENSITIVITY", "Sovuq-issiqqa sezgir"],
  ["GUM_BLEED", "Milk qonashi"],
] as const;

const URGENCY_UI = {
  EMERGENCY: { color: "#dc2626", label: "Shoshilinch holat" },
  TODAY: { color: "#ea580c", label: "Bugun ko'rining" },
  SOON: { color: "#d97706", label: "3–5 kun ichida ko'rining" },
  ROUTINE: { color: "#059669", label: "Rejali ko'rik yetarli" },
};

function Option({ label, onPress, active }: { label: string; onPress: () => void; active?: boolean }) {
  return (
    <Pressable onPress={onPress}
      style={{
        backgroundColor: active ? C.brandLight : C.card, borderWidth: 1.2,
        borderColor: active ? C.brand : C.line, borderRadius: 15, padding: 13, marginBottom: 8,
      }}>
      <Text style={{ fontSize: 14, fontWeight: "600", color: C.text }}>{label}</Text>
    </Pressable>
  );
}

export default function TriajScreen({ navigation }: { navigation: { navigate: (s: string, p?: object) => void } }) {
  const insets = useSafeAreaInsets();
  useTheme(); // mavzu almashsa ekran qayta chiziladi (remount emas)
  const [mode, setMode] = useState<"wizard" | "text">("wizard");
  const [step, setStep] = useState(0);
  const [problem, setProblem] = useState<string | null>(null);
  const [painLevel, setPainLevel] = useState<string | null>(null);
  const [duration, setDuration] = useState<string | null>(null);
  const [flags, setFlags] = useState<string[]>([]);
  const [isChild, setIsChild] = useState<boolean | null>(null);
  const [freeText, setFreeText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TriageResult | null>(null);

  const needsPain = problem === "OGRIQ" || problem === "SHISH";

  const submit = async (payload: { answers?: object; freeText?: string }) => {
    setLoading(true);
    try {
      const res = await api<TriageResult>("/api/triage", { json: payload });
      setResult(res);
    } catch { /* jim */ } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep(0); setProblem(null); setPainLevel(null); setDuration(null);
    setFlags([]); setIsChild(null); setResult(null); setFreeText("");
  };

  if (result) {
    const ui = URGENCY_UI[result.urgency];
    return (
      <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 16, paddingTop: insets.top + 12, paddingBottom: 40 }}>
        <View style={{ backgroundColor: C.card, borderRadius: 18, padding: 15, borderLeftWidth: 5, borderLeftColor: ui.color }}>
          <View style={{ alignSelf: "flex-start", backgroundColor: ui.color, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 }}>
            <Text style={{ color: "#fff", fontWeight: "800", fontSize: 13 }}>{ui.label}</Text>
          </View>
          <Text style={{ fontSize: 13.5, lineHeight: 20, color: C.ink2, marginTop: 10 }}>{result.explanation}</Text>
          {result.urgency === "EMERGENCY" && (
            <Pressable onPress={() => void Linking.openURL("tel:103")}
              style={{ backgroundColor: "#dc2626", borderRadius: 14, paddingVertical: 13, alignItems: "center", marginTop: 12 }}>
              <Text style={{ color: "#fff", fontWeight: "900", fontSize: 16 }}>📞 103 — Tez yordam</Text>
            </Pressable>
          )}
        </View>

        <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
          <View style={{ flex: 1, backgroundColor: C.card, borderRadius: 15, padding: 12 }}>
            <Text style={{ fontSize: 10.5, fontWeight: "800", color: C.faint, textTransform: "uppercase" }}>Mutaxassis</Text>
            <Text style={{ fontSize: 13, fontWeight: "800", marginTop: 3 }}>{SPECIALTY_LABELS[result.specialty] ?? result.specialty}</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: C.card, borderRadius: 15, padding: 12 }}>
            <Text style={{ fontSize: 10.5, fontWeight: "800", color: C.faint, textTransform: "uppercase" }}>Taxminiy narx</Text>
            <Text style={{ fontSize: 13, fontWeight: "800", color: C.brand, marginTop: 3 }}>
              {result.priceMin ? `${fmtPrice(result.priceMin)} – ${fmtPrice(result.priceMax)} so'm` : "—"}
            </Text>
          </View>
        </View>

        {result.clinics.length > 0 && (
          <>
            <Text style={{ fontSize: 15, fontWeight: "800", marginTop: 16, marginBottom: 8 }}>
              {result.urgency === "EMERGENCY" || result.urgency === "TODAY" ? "Hozir qabul qiladigan yaqin klinikalar" : "Mos klinikalar"}
            </Text>
            {result.clinics.map((c) => (
              <Pressable key={c.slug} onPress={() => navigation.navigate("Clinic", { slug: c.slug })}
                style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.card, borderRadius: 15, padding: 11, marginBottom: 7 }}>
                <View style={{ width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: `hsl(${c.coverHue}, 55%, 45%)` }}>
                  <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16 }}>{c.name[0]}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "700", fontSize: 13.5 }}>{c.name}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Stars value={c.rating} size={10} />
                    <Text style={{ fontSize: 11.5, color: C.mut }}>{c.rating.toFixed(1)} · {c.district} · {fmtKm(c.distanceKm)}</Text>
                  </View>
                </View>
                <Badge label={c.isOpen ? "Ochiq" : "Yopiq"} color={c.isOpen ? C.green : C.mut} bg={c.isOpen ? C.greenBg : C.pill} />
              </Pressable>
            ))}
          </>
        )}

        <View style={{ backgroundColor: C.pill, borderRadius: 13, padding: 12, marginTop: 14 }}>
          <Text style={{ fontSize: 11.5, color: C.mut, lineHeight: 17 }}>
            ⚠️ Bu tibbiy tashxis emas — faqat yo&apos;naltiruvchi taxmin. Aniq tashxis uchun shifokor ko&apos;rigi shart.
            Tavsiyalarga homiylik yoki reklama ta&apos;sir qilmaydi.
          </Text>
        </View>

        <View style={{ marginTop: 12 }}>
          <Btn title="Qaytadan boshlash" variant="outline" onPress={reset} />
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 16, paddingTop: insets.top + 12, paddingBottom: 40 }}>
      <Text style={{ fontSize: 20, fontWeight: "900", color: C.text }}>AI maslahat</Text>
      <Text style={{ fontSize: 13, color: C.mut, marginTop: 3 }}>
        Savollarga javob bering — shoshilinchlik, mutaxassis va taxminiy narxni aytamiz.
      </Text>

      <View style={{ flexDirection: "row", backgroundColor: C.pill, borderRadius: 12, padding: 3, marginTop: 12, marginBottom: 14 }}>
        {(["wizard", "text"] as const).map((m) => (
          <Pressable key={m} onPress={() => setMode(m)}
            style={{ flex: 1, borderRadius: 10, paddingVertical: 8, alignItems: "center", backgroundColor: mode === m ? "#fff" : "transparent" }}>
            <Text style={{ fontSize: 13, fontWeight: "700", color: mode === m ? C.text : C.mut }}>
              {m === "wizard" ? "Savollar" : "O'zim yozaman"}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={{ alignItems: "center", marginTop: 50 }}>
          <ActivityIndicator color={C.brand} size="large" />
          <Text style={{ fontSize: 13, color: C.mut, marginTop: 10 }}>Tahlil qilinmoqda...</Text>
        </View>
      ) : mode === "text" ? (
        <View>
          <TextInput
            value={freeText} onChangeText={setFreeText} multiline
            placeholder="Masalan: pastki jag'imdagi tish 3 kundan beri og'riyapti, kechasi uxlolmayapman..."
            placeholderTextColor={C.faint}
            style={{ backgroundColor: C.card, borderWidth: 1.2, borderColor: C.line, borderRadius: 15, padding: 13, fontSize: 14, minHeight: 110, textAlignVertical: "top" }}
          />
          <View style={{ marginTop: 10 }}>
            <Btn title="Tahlil qilish" onPress={() => submit({ freeText })} disabled={freeText.trim().length < 10} />
          </View>
        </View>
      ) : (
        <View>
          {step === 0 && (
            <>
              <Text style={{ fontWeight: "800", fontSize: 15, marginBottom: 8 }}>Nima bezovta qilyapti?</Text>
              {PROBLEMS.map(([code, emoji, label]) => (
                <Option key={code} label={`${emoji}  ${label}`} onPress={() => { setProblem(code); setStep(1); }} />
              ))}
            </>
          )}
          {step === 1 && needsPain && (
            <>
              <Text style={{ fontWeight: "800", fontSize: 15, marginBottom: 8 }}>Og&apos;riq qanchalik kuchli?</Text>
              {PAIN.map(([code, label]) => (
                <Option key={code} label={label} onPress={() => { setPainLevel(code); setStep(2); }} />
              ))}
            </>
          )}
          {((step === 1 && !needsPain) || (step === 2 && needsPain)) && (
            <>
              <Text style={{ fontWeight: "800", fontSize: 15, marginBottom: 8 }}>Qachondan beri?</Text>
              {DURATION.map(([code, label]) => (
                <Option key={code} label={label} onPress={() => { setDuration(code); setStep(needsPain ? 3 : 2); }} />
              ))}
            </>
          )}
          {((step === 2 && !needsPain) || (step === 3 && needsPain)) && (
            <>
              <Text style={{ fontWeight: "800", fontSize: 15 }}>Qo&apos;shimcha belgilar bormi?</Text>
              <Text style={{ fontSize: 12, color: C.mut, marginBottom: 8 }}>Bir nechtasini tanlash mumkin</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                {FLAGS.map(([code, label]) => (
                  <Pressable key={code}
                    onPress={() => setFlags((f) => f.includes(code) ? f.filter((x) => x !== code) : [...f, code])}
                    style={{
                      borderRadius: 999, borderWidth: 1.2, paddingHorizontal: 12, paddingVertical: 8,
                      borderColor: flags.includes(code) ? C.brand : C.line,
                      backgroundColor: flags.includes(code) ? C.brandLight : "#fff",
                    }}>
                    <Text style={{ fontSize: 12.5, fontWeight: "600" }}>{label}</Text>
                  </Pressable>
                ))}
              </View>
              <Btn title="Davom etish" onPress={() => setStep(needsPain ? 4 : 3)} />
            </>
          )}
          {((step === 3 && !needsPain) || (step === 4 && needsPain)) && (
            <>
              <Text style={{ fontWeight: "800", fontSize: 15, marginBottom: 8 }}>Kim uchun?</Text>
              <Option label="O'zim uchun (katta yoshli)" active={isChild === false} onPress={() => setIsChild(false)} />
              <Option label="Bola uchun" active={isChild === true} onPress={() => setIsChild(true)} />
              <View style={{ marginTop: 6 }}>
                <Btn title="Natijani ko'rish" disabled={isChild === null}
                  onPress={() => submit({ answers: { problem, painLevel, duration, flags, isChild: isChild === true } })} />
              </View>
            </>
          )}
          {step > 0 && (
            <Pressable onPress={() => setStep((s) => Math.max(0, s - 1))} style={{ marginTop: 12 }}>
              <Text style={{ fontSize: 13, fontWeight: "600", color: C.mut }}>← Orqaga</Text>
            </Pressable>
          )}
        </View>
      )}
    </ScrollView>
  );
}
