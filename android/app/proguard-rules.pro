# vLocker ProGuard/R8 Rules
# Keep all Capacitor/Cordova plugin classes for JS bridge reflection access

##### Core Capacitor Framework #####
-keep class com.getcapacitor.** { *; }
-keepclassmembers class com.getcapacitor.** { *; }
-keepclassmembers class * {
    @com.getcapacitor.annotation.CapacitorPlugin <methods>;
}
-keepclassmembers class * {
    @com.getcapacitor.annotation.Permission <methods>;
}
-keepclassmembers class * {
    @com.getcapacitor.annotation.PermissionCallback <methods>;
}
-keepclassmembers class * {
    @com.getcapacitor.annotation.ActivityCallback <methods>;
}

##### Capacitor Plugins #####
-keep class com.capacitorjs.plugins.camera.** { *; }
-keepclassmembers class com.capacitorjs.plugins.camera.** { *; }
-keep class com.capacitorjs.plugins.filesystem.** { *; }
-keepclassmembers class com.capacitorjs.plugins.filesystem.** { *; }
-keep class com.capacitorjs.plugins.localnotifications.** { *; }
-keepclassmembers class com.capacitorjs.plugins.localnotifications.** { *; }
-keep class com.capacitorjs.plugins.preferences.** { *; }
-keepclassmembers class com.capacitorjs.plugins.preferences.** { *; }
-keep class com.capacitorjs.plugins.share.** { *; }
-keepclassmembers class com.capacitorjs.plugins.share.** { *; }

##### Native Biometric Plugin (@capgo) #####
-keep class io.capgo.nativebiometric.** { *; }
-keepclassmembers class io.capgo.nativebiometric.** { *; }

##### Safe Area Plugin #####
-keep class com.capacitor.safearea.** { *; }
-keepclassmembers class com.capacitor.safearea.** { *; }

##### Cordova Plugins #####
-keep class org.apache.cordova.** { *; }
-keepclassmembers class org.apache.cordova.** { *; }
-keep class * extends org.apache.cordova.CordovaPlugin { *; }

##### AndroidX / AppCompat #####
-keep class androidx.appcompat.** { *; }
-keep class androidx.core.** { *; }
-keep class androidx.coordinatorlayout.** { *; }
-keep class androidx.fragment.** { *; }
-keep class androidx.activity.** { *; }
-keep class androidx.webkit.** { *; }

##### WebView and JavaScript Interface #####
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-keepattributes JavascriptInterface
-keep public class * extends android.webkit.WebChromeClient
-keep public class * extends android.webkit.WebViewClient

##### Native Libraries (keep symbols for crash reporting) #####
-keepclasseswithmembernames class * {
    native <methods>;
}

##### Serialization / Reflection #####
-keepattributes *Annotation*
-keepattributes Signature
-keepattributes Exceptions
-keepattributes InnerClasses
-keepattributes EnclosingMethod
-keepattributes SourceFile,LineNumberTable

##### Kotlin Metadata (for libraries using Kotlin) #####
-keepattributes RuntimeVisibleAnnotations
-keepattributes RuntimeInvisibleAnnotations
-keepattributes RuntimeVisibleParameterAnnotations
-keepattributes RuntimeInvisibleParameterAnnotations
-keep class kotlin.Metadata { *; }
-keepclassmembers class **$WhenMappings {
    <fields>;
}

##### R8 Full Mode Compatibility #####
-keep,allowobfuscation,allowshrinking class * extends android.app.Activity
-keep,allowobfuscation,allowshrinking class * extends android.app.Application
-keep,allowobfuscation,allowshrinking class * extends android.app.Service
-keep,allowobfuscation,allowshrinking class * extends android.content.BroadcastReceiver
-keep,allowobfuscation,allowshrinking class * extends android.content.ContentProvider
