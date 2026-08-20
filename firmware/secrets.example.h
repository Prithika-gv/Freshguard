// ===================================================================
//  FreshGuard — secrets.example.h
// ===================================================================
//  1. Copy this file to  secrets.h  (in the same folder as thursfg.ino)
//  2. Fill in your real values below
//  3. secrets.h is git-ignored, so your credentials never get committed
// ===================================================================

// ---- WiFi (the network the ESP32 joins to upload telemetry) ----
#define FG_WIFI_SSID   "YOUR_WIFI_SSID"
#define FG_WIFI_PASS   "YOUR_WIFI_PASSWORD"

// ---- Cloud uplink / dashboard ----
#define FG_INGEST_URL  "https://your-dashboard.example.com/api/telemetry"
#define FG_DEVICE_KEY  "YOUR_DEVICE_KEY"   // sent as the x-device-key header
#define FG_DEVICE_ID   "TRUCK-01"          // identifies this box in telemetry
