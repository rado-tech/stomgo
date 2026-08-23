import React, { useEffect, useRef } from "react";
import { View, Platform } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { NavigationContainer, DefaultTheme, type NavigationContainerRef } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import HomeScreen from "./src/screens/HomeScreen";
import ClinicsScreen from "./src/screens/ClinicsScreen";
import MapScreen from "./src/screens/MapScreen";
import ClinicScreen from "./src/screens/ClinicScreen";
import TriajScreen from "./src/screens/TriajScreen";
import ChatsScreen from "./src/screens/ChatsScreen";
import ChatScreen from "./src/screens/ChatScreen";
import ProfilScreen from "./src/screens/ProfilScreen";
import NotificationsScreen from "./src/screens/NotificationsScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import * as Notifications from "expo-notifications";
import { C, ThemeProvider, useTheme } from "./src/theme";
import { registerPush, parseLink } from "./src/push";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

type IconName = React.ComponentProps<typeof Ionicons>["name"];

const TAB_ICONS: Record<string, [IconName, IconName]> = {
  Asosiy: ["home", "home-outline"],
  Klinikalar: ["business", "business-outline"],
  Xabarlar: ["chatbubble-ellipses", "chatbubble-ellipses-outline"],
  Profil: ["person-circle", "person-circle-outline"],
};

/** Markazdagi ajralib turuvchi AI tugmasi */
function AiTabIcon({ focused }: { focused: boolean }) {
  return (
    <View style={{
      width: 58, height: 58, borderRadius: 29, marginTop: -22,
      backgroundColor: focused ? C.brandDark : C.brand,
      alignItems: "center", justifyContent: "center",
      borderWidth: 4, borderColor: C.card,
      ...Platform.select({ android: { elevation: 6 }, default: {} }),
    }}>
      <Ionicons name="sparkles" size={25} color={C.onBrand} />
    </View>
  );
}

function Tabs() {
  const insets = useSafeAreaInsets();
  useTheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: C.brand,
        tabBarInactiveTintColor: C.faint,
        tabBarLabelStyle: { fontSize: 12.5, fontWeight: "700", marginTop: 3, marginBottom: 0 },
        // Tizim navigatsiyasi uchun joy pastda alohida ajratiladi (paddingBottom),
        // menyu tugmalari esa qolgan 62px lentaning MARKAZIDA turadi.
        tabBarStyle: {
          height: 74 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 0,
          backgroundColor: C.card,
          borderTopColor: C.line,
          borderTopWidth: 1,
        },
        tabBarItemStyle: { height: 74, paddingVertical: 9, justifyContent: "center" },
        tabBarIconStyle: { flex: 0 },
        tabBarIcon: ({ focused, color }) => {
          if (route.name === "AI maslahat") return <AiTabIcon focused={focused} />;
          // Uy — to'ldirilgan, eshik kesigi bilan (Ionicons'da bunday variant yo'q)
          if (route.name === "Asosiy") {
            return (
              <MaterialCommunityIcons
                name={focused ? "home" : "home-outline"}
                size={29}
                color={color}
              />
            );
          }
          const pair = TAB_ICONS[route.name];
          return <Ionicons name={focused ? pair[0] : pair[1]} size={27} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Asosiy" component={HomeScreen} />
      <Tab.Screen name="Klinikalar" component={ClinicsScreen} />
      <Tab.Screen name="AI maslahat" component={TriajScreen} options={{ tabBarLabel: "AI" }} />
      <Tab.Screen name="Xabarlar" component={ChatsScreen} />
      <Tab.Screen name="Profil" component={ProfilScreen} />
    </Tab.Navigator>
  );
}

/** Mavzu o'zgarganda bu daraxt qayta yaratilmaydi — foydalanuvchi turgan ekranda qoladi */
function Root() {
  const { dark } = useTheme();
  const navRef = useRef<NavigationContainerRef<Record<string, object | undefined>>>(null);

  // Push: tokenni ro'yxatdan o'tkazamiz va bosilganda kerakli ekranga o'tamiz
  useEffect(() => {
    // Ruxsat oldin berilgan bo'lsagina tokenni yangilaymiz.
    // Birinchi marta so'rash Profil → «Push bildirishnoma» tugmasi orqali bo'ladi.
    void registerPush({ silent: true });

    const go = (data: unknown) => {
      const link = parseLink(data);
      if (!link || !navRef.current) return;
      if (link.screen === "Chat") navRef.current.navigate("Chat", { id: link.id, title: "Suhbat" });
      else navRef.current.navigate("Tabs", { screen: "Profil" });
    };

    // Ilova bildirishnoma bosilishi bilan ochilgan bo'lsa
    void Notifications.getLastNotificationResponseAsync().then((r) => {
      if (r) setTimeout(() => go(r.notification.request.content.data), 400);
    });

    const sub = Notifications.addNotificationResponseReceivedListener((r) => {
      go(r.notification.request.content.data);
    });
    return () => sub.remove();
  }, []);
  const navTheme = {
    ...DefaultTheme,
    dark,
    colors: {
      ...DefaultTheme.colors,
      background: C.bg, card: C.card, text: C.text, border: C.line, primary: C.brand,
    },
  };

  return (
    <NavigationContainer theme={navTheme} ref={navRef}>
      <StatusBar style={dark ? "light" : "dark"} />
      <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }}>
        <Stack.Screen name="Tabs" component={Tabs} />
        <Stack.Screen name="Clinic" component={ClinicScreen as React.ComponentType} />
        <Stack.Screen name="Map" component={MapScreen as React.ComponentType} />
        <Stack.Screen name="Chat" component={ChatScreen as React.ComponentType} />
        <Stack.Screen name="Notifications" component={NotificationsScreen as React.ComponentType} />
        <Stack.Screen name="Settings" component={SettingsScreen as React.ComponentType} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <Root />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
