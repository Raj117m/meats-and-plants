import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor Configuration for Meats & Plants — Staff App
 *
 * WiFi Lock Native Requirements:
 * - Android:
 *     Requires permissions in AndroidManifest.xml:
 *       <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
 *       <uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />
 *       <uses-permission android:name="android.permission.CHANGE_WIFI_STATE" />
 *     Native API: android.net.wifi.WifiManager.getConnectionInfo().getSSID()
 *
 * - iOS:
 *     Requires "Access WiFi Information" entitlement in Staff.entitlements:
 *       <key>com.apple.developer.networking.wifi-info</key>
 *       <true/>
 *     Requires Info.plist privacy description:
 *       <key>NSLocationWhenInUseUsageDescription</key>
 *       <string>WiFi network verification is required for café check-in at Meats & Plants.</string>
 *     Native API: NetworkExtension.NEHotspotNetwork.fetchCurrent()
 */
const config: CapacitorConfig = {
  appId: 'com.meatsandplants.staff',
  appName: 'Meats & Plants',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    }
  }
};

export default config;
