# Reglas ProGuard/R8 — Abys Android.
# kotlinx.serialization genera serializers estáticos; se conservan sus metadatos.
-keepattributes *Annotation*, InnerClasses
-dontnote kotlinx.serialization.**

-keepclassmembers class com.mikylab.abys.data.remote.dto.** {
    *** Companion;
}
-keepclasseswithmembers class com.mikylab.abys.data.remote.dto.** {
    kotlinx.serialization.KSerializer serializer(...);
}
-keep,includedescriptorclasses class com.mikylab.abys.data.remote.dto.**$$serializer { *; }

# Retrofit / OkHttp
-dontwarn okhttp3.**
-dontwarn okio.**
-dontwarn retrofit2.**
-keepattributes Signature, Exceptions
-keep,allowobfuscation interface com.mikylab.abys.data.remote.AbysApi

# Room
-keep class * extends androidx.room.RoomDatabase { <init>(); }
-dontwarn androidx.room.paging.**
