# ProGuard rules — EV Charging App
# Áp dụng khi build release: flutter build apk --release / flutter build appbundle

# ─── Flutter ──────────────────────────────────────────────────────────────────
-keep class io.flutter.** { *; }
-keep class io.flutter.embedding.** { *; }
-dontwarn io.flutter.**

# ─── Firebase Core & Messaging ────────────────────────────────────────────────
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.firebase.**
-dontwarn com.google.android.gms.**

# FCM background handler — phải giữ top-level function
-keep class com.evcharging.ev_charging_app.MainActivityKt { *; }

# ─── flutter_secure_storage (Android Keystore) ────────────────────────────────
-keep class com.it_nomads.fluttersecurestorage.** { *; }
-dontwarn com.it_nomads.fluttersecurestorage.**

# ─── VNPay SDK (nếu tích hợp native VNPay SDK sau) ───────────────────────────
# Nếu dùng url_launcher (external browser) thì không cần keep VNPay classes
# Nếu tích hợp VNPay native SDK:
# -keep class vn.vnpay.sdk.** { *; }
# -dontwarn vn.vnpay.sdk.**

# ─── mobile_scanner (CameraX + ZXing) ────────────────────────────────────────
-keep class com.google.zxing.** { *; }
-keep class androidx.camera.** { *; }
-dontwarn com.google.zxing.**

# ─── OkHttp (dùng bởi Dio) ───────────────────────────────────────────────────
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }

# ─── Kotlin Coroutines (dùng bởi Firebase) ───────────────────────────────────
-keepclassmembernames class kotlinx.** {
    volatile <fields>;
}

# ─── Serialization / JSON ─────────────────────────────────────────────────────
# Giữ các model không bị obfuscate (nếu dùng json_serializable native)
-keepattributes Signature
-keepattributes *Annotation*
-keepattributes EnclosingMethod
-keepattributes InnerClasses

# ─── Deep link intent filter ─────────────────────────────────────────────────
-keep class com.evcharging.ev_charging_app.MainActivity { *; }

# ─── Loại bỏ logging trong release ───────────────────────────────────────────
-assumenosideeffects class android.util.Log {
    public static boolean isLoggable(java.lang.String, int);
    public static int v(...);
    public static int d(...);
    public static int i(...);
}
