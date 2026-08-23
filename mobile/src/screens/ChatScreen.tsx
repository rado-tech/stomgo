import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View, Text, TextInput, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
  Image, Alert, Linking,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api, uploadImage, getBaseUrl, absUrl } from "../api";
import { C, R, useTheme } from "../theme";
import { fmtDateTime } from "../format";
import { ScreenHeader } from "../components/ui";
import type { ChatMessage } from "../types";

/** Suhbat oynasi — barcha muloqot ilova ichida */
export default function ChatScreen({ route, navigation }: {
  route: { params: { id: string; title?: string } };
  navigation: { goBack: () => void };
}) {
  const { id, title } = route.params;
  const insets = useSafeAreaInsets();
  useTheme();
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [convTitle, setConvTitle] = useState(title ?? "Suhbat");
  const [myRole, setMyRole] = useState<string>("PATIENT");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [image, setImage] = useState<string | null>(null); // yuborishdan oldingi rasm (server URL)
  const [uploading, setUploading] = useState(false);
  const [base, setBase] = useState("");
  const scrollRef = useRef<ScrollView>(null);

  const load = useCallback(async () => {
    const d = await api<{ conversation: { title: string }; myRole: string; messages: ChatMessage[] }>(`/api/chat/${id}`)
      .catch(() => null);
    if (d) {
      setMessages(d.messages);
      setConvTitle(d.conversation.title);
      setMyRole(d.myRole);
    } else {
      setMessages([]);
    }
  }, [id]);

  useEffect(() => { const t = setTimeout(() => void load(), 0); return () => clearTimeout(t); }, [load]);
  useEffect(() => { void getBaseUrl().then(setBase); }, []);

  // Yangi xabarlarni kuzatib turamiz
  useEffect(() => {
    const t = setInterval(() => void load(), 15000);
    return () => clearInterval(t);
  }, [load]);

  const send = async () => {
    const body = text.trim();
    if ((!body && !image) || sending) return;
    setSending(true);
    const snap = { body, image };
    setText(""); setImage(null);
    try {
      const r = await api<{ message: ChatMessage }>(`/api/chat/${id}`, {
        json: { body, imageUrl: snap.image },
      });
      setMessages((m) => [...(m ?? []), r.message]);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    } catch (e) {
      setText(snap.body); setImage(snap.image); // yuborilmasa qaytadi
      Alert.alert("Yuborilmadi", (e as Error).message);
    } finally {
      setSending(false);
    }
  };

  /** Rasm tanlash: kamera yoki galereya */
  const pickImage = () => {
    Alert.alert("Rasm qo'shish", "Tish rasmini qayerdan olamiz?", [
      { text: "Kamera", onPress: () => void grab("camera") },
      { text: "Galereya", onPress: () => void grab("library") },
      { text: "Bekor qilish", style: "cancel" },
    ]);
  };

  const grab = async (from: "camera" | "library") => {
    try {
      const perm = from === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Ruxsat kerak", "Sozlamalardan ruxsat bering.", [
          { text: "Yopish", style: "cancel" },
          { text: "Sozlamalar", onPress: () => void Linking.openSettings() },
        ]);
        return;
      }
      const res = from === "camera"
        ? await ImagePicker.launchCameraAsync({ quality: 0.8 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
      if (res.canceled || !res.assets?.[0]?.uri) return;

      setUploading(true);
      const url = await uploadImage(res.assets[0].uri, { target: "chat", conversationId: id });
      setImage(url);
    } catch (e) {
      Alert.alert("Rasm yuklanmadi", (e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScreenHeader title={convTitle} onBack={() => navigation.goBack()} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        {messages === null ? (
          <ActivityIndicator color={C.brand} size="large" style={{ marginTop: 40 }} />
        ) : (
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={{ padding: 14, paddingBottom: 20 }}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
          >
            {/* Xavfsizlik eslatmasi */}
            <View style={{ backgroundColor: C.amberBg, borderRadius: R.tile, padding: 11, marginBottom: 14 }}>
              <Text style={{ fontSize: 11.5, color: C.amberInk, lineHeight: 16 }}>
                🔒 Kelishuvlarni faqat shu suhbatda oling. Ilovadan tashqarida (Telegram, telefon)
                qilingan kelishuvlarga platforma javobgar emas.
              </Text>
            </View>

            {messages.length === 0 && (
              <Text style={{ fontSize: 13, color: C.mut, textAlign: "center", marginTop: 20 }}>
                Savolingizni yozing — javob shu yerda keladi.
              </Text>
            )}

            {messages.map((m) => {
              const mine = m.senderRole === myRole;
              return (
                <View key={m.id} style={{ alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "82%", marginBottom: 9 }}>
                  <View style={{
                    backgroundColor: mine ? C.brand : C.card,
                    borderRadius: 16,
                    borderBottomRightRadius: mine ? 4 : 16,
                    borderBottomLeftRadius: mine ? 16 : 4,
                    paddingHorizontal: 13, paddingVertical: 9,
                  }}>
                    {!mine && (
                      <Text style={{ fontSize: 11.5, fontWeight: "800", color: C.brand, marginBottom: 2 }}>{m.senderName}</Text>
                    )}
                    {!!m.imageUrl && (
                      <Image
                        source={{ uri: absUrl(base, m.imageUrl) ?? "" }}
                        style={{ width: 210, height: 210, borderRadius: 12, marginBottom: m.body ? 6 : 0, backgroundColor: C.pill }}
                        resizeMode="cover"
                      />
                    )}
                    {!!m.body && (
                      <Text style={{ fontSize: 14.5, color: mine ? C.onBrand : C.text, lineHeight: 20 }}>{m.body}</Text>
                    )}
                  </View>
                  <Text style={{ fontSize: 10.5, color: C.faint, marginTop: 3, alignSelf: mine ? "flex-end" : "flex-start" }}>
                    {fmtDateTime(m.createdAt)}
                  </Text>
                </View>
              );
            })}
          </ScrollView>
        )}

        {/* Yozish paneli */}
        <View style={{
          paddingHorizontal: 12, paddingTop: 10,
          paddingBottom: Math.max(insets.bottom, 10),
          backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.line,
        }}>
        {!!image && (
          <View style={{ marginBottom: 8 }}>
            <Image source={{ uri: absUrl(base, image) ?? "" }}
              style={{ width: 74, height: 74, borderRadius: 12, backgroundColor: C.pill }} />
            <Pressable onPress={() => setImage(null)} hitSlop={8}
              style={{
                position: "absolute", left: 62, top: -6, width: 24, height: 24, borderRadius: 12,
                backgroundColor: C.ink2, alignItems: "center", justifyContent: "center",
              }}>
              <Ionicons name="close" size={15} color={C.card} />
            </Pressable>
          </View>
        )}

        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
          <Pressable
            onPress={pickImage}
            disabled={uploading}
            style={{
              width: 44, height: 44, borderRadius: 22, backgroundColor: C.pill,
              alignItems: "center", justifyContent: "center", opacity: uploading ? 0.5 : 1,
            }}
          >
            {uploading
              ? <ActivityIndicator size="small" color={C.mut} />
              : <Ionicons name="image-outline" size={21} color={C.ink2} />}
          </Pressable>
          <TextInput
            value={text} onChangeText={setText} multiline
            placeholder="Xabar yozing..." placeholderTextColor={C.faint}
            style={{
              flex: 1, backgroundColor: C.pill, borderRadius: 20,
              paddingHorizontal: 15, paddingTop: 11, paddingBottom: 11,
              fontSize: 14.5, maxHeight: 110, color: C.text,
            }}
          />
          <Pressable
            onPress={send}
            disabled={(!text.trim() && !image) || sending}
            style={{
              width: 44, height: 44, borderRadius: 22, backgroundColor: C.brand,
              alignItems: "center", justifyContent: "center",
              opacity: (!text.trim() && !image) || sending ? 0.45 : 1,
            }}
          >
            <Ionicons name="send" size={19} color={C.onBrand} />
          </Pressable>
        </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
