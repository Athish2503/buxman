# Preserve the line number information for debugging stack traces.
-keepattributes SourceFile,LineNumberTable

# Capacitor specific rules
-keep class com.getcapacitor.** { *; }
-keep class com.pixel.reimburse.MainActivity$NativeBridge { *; }
-keepclassmembers class ** {
  @android.webkit.JavascriptInterface <methods>;
}

# Preserve GMS classes if using Google Services
-keep class com.google.android.gms.** { *; }

# Strip logging calls for production performance and battery
-assumenosideeffects class android.util.Log {
    public static *** d(...);
    public static *** v(...);
    public static *** i(...);
}


