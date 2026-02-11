# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Keep Capacitor Plugin classes
-keep class com.pyu.koremd.** { *; }

# Keep Wi-Fi Direct related classes
-keep class android.net.wifi.p2p.** { *; }
