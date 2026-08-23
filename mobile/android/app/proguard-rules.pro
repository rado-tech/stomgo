# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# react-native-reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# Add any project specific keep options here:

# ---------- StomGo: R8 minifikatsiya uchun saqlanadigan sinflar ----------
# MapLibre (xarita) — refleksiya orqali chaqiriladi
-keep class org.maplibre.** { *; }
-keep class com.maplibre.** { *; }
-dontwarn org.maplibre.**

# Expo modullari refleksiya bilan topiladi
-keep class expo.modules.** { *; }
-keep class * extends expo.modules.core.BasePackage { *; }
-keepclassmembers class * { @expo.modules.core.interfaces.ExpoMethod *; }

# React Native ko'prigi
-keep class com.facebook.react.** { *; }
-keep,allowobfuscation @interface com.facebook.proguard.annotations.DoNotStrip
-keep,allowobfuscation @interface com.facebook.jni.annotations.DoNotStrip
-keepclassmembers class * { @com.facebook.proguard.annotations.DoNotStrip *; }
-keepclassmembers class * { @com.facebook.jni.annotations.DoNotStrip *; }
-keepclasseswithmembers class * { native <methods>; }

# Firebase / bildirishnoma
-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**

# OkHttp/Okio (tarmoq)
-dontwarn okhttp3.**
-dontwarn okio.**
-dontwarn javax.annotation.**
