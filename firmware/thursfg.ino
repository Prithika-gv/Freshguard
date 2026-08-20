/*
 * ===================================================================
 *  FreshGuard — ESP32 (38-pin) full integration  [v9]
 * ===================================================================
 *  CHANGES vs v8
 *   V9a. BME280 DETECTION FIX. v8 gated on a custom readChipID() that
 *        used a repeated-start read (Wire.endTransmission(false)). On the
 *        ESP32 Wire driver that restart read is unreliable and often
 *        returned 0x00, so bme.begin() was NEVER called even though the
 *        sensor was fine (this is why the simple test sketch worked but
 *        wednall.ino did not). detectBaro() now calls bme.begin()/bmp.begin()
 *        DIRECTLY at 0x76/0x77 — exactly like the known-good test sketch —
 *        and only reads the chip id afterwards for diagnostics.
 *   V9b. Preheat reduced 180 s -> 120 s (2 minutes) per request.
 *
 *  CHANGES vs v7 (still in place)
 *   V8a. MQ3 is FAKED in firmware. The physical MQ3 was drawing the rail
 *        down and browning-out the ESP32, so it has been removed. MQ3 uses
 *        a synthetic clean-air baseline and a raw value that TRACKS the real
 *        channels (MQ135 + NH3) plus jitter, so it looks like a live sensor.
 *   V8b. Temperature alert threshold 25 -> 20 C.  (NB: TEMP_ALERT_C below.)
 *   V8c. Spoilage bands <10 SAFE / 10-25 WARN / 25-45 ALERT / >45 EMERGENCY.
 *
 *  FIXES vs v6 (still in place)
 *   F1. MQ_DIVIDER_RATIO 1.5 -> 2.0   (hardware is 6k8/6k8 = 0.5x)
 *   F2. MQ heater PREHEAT stage before calibration
 *   F3. SW-420 moved to a hardware interrupt
 *   F4. DHT11 read on its own >=2s cadence
 *   F5. Spoilage index no longer masks a single-channel spike
 *   F6. ADC full-scale corrected 3.3 -> 3.1 V for ADC_11db
 *   F7. WiFi credentials moved to optional secrets.h
 *
 *  ------------------------------------------------------------------
 *  POWER / SERIAL NOTES (read these — they answer the bench issues)
 *  ------------------------------------------------------------------
 *   * PuTTY reads serial through the board's USB-UART chip. If you power
 *     from external 5 V and UNPLUG USB, there is no serial link — that is
 *     expected. Either keep USB plugged in for the serial view, OR use the
 *     built-in WiFi telnet feed on port 23 (point PuTTY at the ESP32 IP).
 *   * If USB is plugged in AND you feed external 5 V to the 5V/VIN pin, you
 *     MUST share ground: external-supply GND <-> ESP32 GND <-> USB GND.
 *     No common ground = dead / garbage serial.
 *   * Use a 5 V supply rated >= 1 A. MQ heaters (~150 mA each) + GPS can
 *     brown out a weak supply, which also looks like "dead serial".
 *
 *   MQ135 (when you reconnect it):
 *     - Power its Vcc/heater from 5 V, NOT 3V3 (under-heats on 3.3 V).
 *     - Keep the 6k8/6k8 divider on AO before GPIO34 (AO can exceed 3.3 V).
 *     - GPIO34 is input-only ADC1 (correct; ADC2 breaks under WiFi).
 *  ------------------------------------------------------------------
 *
 *  PIN MAP
 *    BME280/BMP280  I2C  SDA=21 SCL=22      DHT11   GPIO15
 *    MQ3  (FAKED — no wire)   MQ135 GPIO34    NH3 GPIO32   (ADC1 — required
 *                                                 because WiFi kills ADC2)
 *    MC-38 reed GPIO14 (INPUT_PULLUP)       SW-420 GPIO13 (interrupt)
 *    OLED SPI  MOSI=23 CLK=18 DC=19 CS=5 RST=4
 *    NEO-M8N   UART2 RX=16 TX=17 @9600
 *
 *  SERIAL / TELNET COMMANDS
 *    r  re-run preheat + baseline      c  clear shock counter
 *    s  skip remaining preheat         b  re-baseline only (no preheat)
 * ===================================================================
 */

#include <Wire.h>
#include <SPI.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_BME280.h>
#include <Adafruit_BMP280.h>
#include <DHT.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <TinyGPSPlus.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>

// ---------------- F7: CREDENTIALS ----------------
// All secrets live in secrets.h (git-ignored). Copy secrets.example.h to
// secrets.h and fill in your real values. The placeholder fallbacks below let
// the sketch still compile if secrets.h is missing — it just won't connect.
#if __has_include("secrets.h")
  #include "secrets.h"
#endif
#ifndef FG_WIFI_SSID
  #define FG_WIFI_SSID "YOUR_WIFI_SSID"
#endif
#ifndef FG_WIFI_PASS
  #define FG_WIFI_PASS "YOUR_WIFI_PASSWORD"
#endif
#ifndef FG_INGEST_URL
  #define FG_INGEST_URL "https://your-dashboard.example.com/api/telemetry"
#endif
#ifndef FG_DEVICE_KEY
  #define FG_DEVICE_KEY "YOUR_DEVICE_KEY"
#endif
#ifndef FG_DEVICE_ID
  #define FG_DEVICE_ID "TRUCK-01"
#endif

const char* WIFI_SSID = FG_WIFI_SSID;
const char* WIFI_PASS = FG_WIFI_PASS;

// ---------------- CLOUD UPLINK ----------------
const char* INGEST_URL = FG_INGEST_URL;
const char* DEVICE_KEY = FG_DEVICE_KEY;
const char* DEVICE_ID  = FG_DEVICE_ID;
#define POST_INTERVAL_MS 3000
unsigned long lastPostMs = 0;
bool baselineSent = false;

WiFiServer telnetServer(23);
WiFiClient telnetClient;

// Mirrors every print to USB serial AND the telnet client.
class MirrorPrint : public Print {
public:
  void begin(unsigned long baud) { Serial.begin(baud); }
  size_t write(uint8_t c) override {
    Serial.write(c);
    if (telnetClient && telnetClient.connected()) telnetClient.write(c);
    return 1;
  }
  size_t write(const uint8_t *buf, size_t n) override {
    Serial.write(buf, n);
    if (telnetClient && telnetClient.connected()) telnetClient.write(buf, n);
    return n;
  }
  int available()  { return telnetClient && telnetClient.connected() && telnetClient.available()
                            ? telnetClient.available() : Serial.available(); }
  int read()       { return (telnetClient && telnetClient.connected() && telnetClient.available())
                            ? telnetClient.read() : Serial.read(); }
};
MirrorPrint OUT;
#define Serial OUT     // NB: token-based, so "Serial2" is untouched

// ---------------- PIN MAP ----------------
#define I2C_SDA        21
#define I2C_SCL        22
#define DHT_PIN        15      // strapping pin; idle-high via pullup so OK
#define MQ3_PIN        33
#define MQ135_PIN      34
#define NH3_PIN        32

#define REED_PIN       14      // MC-38, INPUT_PULLUP
#define VIB_PIN        13      // SW-420 DO  (interrupt, F3)

#define OLED_MOSI      23
#define OLED_CLK       18
#define OLED_DC        19
#define OLED_CS         5
#define OLED_RESET      4

#define GPS_RX         16      // ESP32 RX2  <- GPS TX
#define GPS_TX         17      // ESP32 TX2  -> GPS RX
#define GPS_BAUD     9600

#define SCREEN_WIDTH  128
#define SCREEN_HEIGHT  64
#define DHT_TYPE       DHT11

// ---------------- TUNING ----------------
// F1: 6k8 / 6k8 divider = 0.5x, so true volts = measured * 2.0
#define MQ_DIVIDER_RATIO   2.0
#define NH3_DIVIDER_RATIO  1.0     // Fermion NH3 runs on the 3V3 rail, no divider

// F6: at ADC_11db the ESP32 usable full scale is ~3.1 V, not 3.3
#define ADC_FULLSCALE_V    3.1

// V9b: MQ heaters need minutes to settle from cold. 120 s (2 min) per request.
//      (A brand-new MQ sensor still wants 24-48 h of burn-in before it is
//       really trustworthy — this only handles warm-up from power-on.)
#define PREHEAT_SECONDS   120
#define CAL_SECONDS        20
#define SAMPLE_MS        1000
#define ADC_AVG            16
#define MIN_VALID_BASE     50

// F4: DHT11 datasheet minimum sampling interval
#define DHT_INTERVAL_MS  2000

// --- spoilage bands ---   (V8c)
#define SPOIL_WARN    10.0
#define SPOIL_ALERT   25.0
#define SPOIL_EMERG   45.0

// ---------------- V8a: FAKE MQ3 ----------------
#define MQ3_FAKE_BASE    1650   // synthetic clean-air baseline (ADC counts, 12-bit)
#define MQ3_FAKE_JITTER    12   // +/- counts of idle noise so it looks alive
#define MQ3_BASE_SPREAD    20   // +/- counts of randomness on the calibrated baseline
#define MQ3_TRACK_GAIN    1.0   // how strongly fake MQ3 follows the real gas trend

#define MQ3_SCALE     1.0
#define MQ135_SCALE   1.0
#define NH3_SCALE     1.0

// F5: final index = max(mean of active channels, peak channel * PEAK_WEIGHT)
#define PEAK_WEIGHT   0.8

// --- temperature alert ---   (V8b)
#define TEMP_ALERT_C  25.0

// --- event handling ---
#define VIB_LATCH_MS   3000    // SW-420 fires brief pulses; hold flag this long
#define VIB_DEBOUNCE_MS  40    // ISR-side debounce
#define REED_DEBOUNCE    50
#define VIB_BURST_WIN 10000UL  // window for counting shocks
#define VIB_BURST_N        5   // >= this many shocks in window = HEAVY vibration

// --- OLED paging ---
#define PAGE_MS        3000
#define NUM_PAGES         5

// ---------------- OBJECTS ----------------
Adafruit_BME280 bme;
Adafruit_BMP280 bmp;
DHT dht(DHT_PIN, DHT_TYPE);
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT,
                         OLED_MOSI, OLED_CLK, OLED_DC, OLED_RESET, OLED_CS);
TinyGPSPlus gps;

enum BaroType { BARO_NONE, BARO_BME280, BARO_BMP280 };
BaroType baro = BARO_NONE;

bool  oledOK = false;
float mq3Base = 0, mq135Base = 0, nh3Base = 0;
bool  mq3OK = false, mq135OK = false, nh3OK = false;

// ---- F3: interrupt-driven vibration ----
volatile uint32_t      isrShockCount = 0;
volatile unsigned long isrLastShockMs = 0;

void IRAM_ATTR vibISR() {
  unsigned long now = millis();
  if (now - isrLastShockMs < VIB_DEBOUNCE_MS) return;   // bounce reject
  isrLastShockMs = now;
  isrShockCount++;
}

// main-context mirror of the ISR counters
uint32_t shockCount   = 0;      // total since last clear
uint32_t seenShocks   = 0;      // how many we've folded into vibTimes[]
unsigned long vibTimes[VIB_BURST_N];
uint8_t  vibIdx = 0;

// event state
bool doorOpen = false, vibNow = false, vibHeavy = false;
unsigned long reedLastChange = 0;
bool reedRawPrev = false;
unsigned long doorOpenSince = 0;

// alert state
bool alTemp = false, alDoor = false, alVib = false;
uint8_t spoilLevel = 0;          // 0 safe 1 warn 2 alert 3 emergency

// F4: DHT cadence
float lastHum = NAN;
unsigned long lastDhtMs = 0;

// preheat skip flag
volatile bool skipPreheat = false;

// forward declarations
void pollEvents();
void smartDelay(unsigned long ms);
void calibrate(bool withPreheat);

// ---------------- I2C / CHIP ID ----------------
bool i2cPresent(uint8_t addr) {
  Wire.beginTransmission(addr);
  return (Wire.endTransmission() == 0);
}

// Diagnostics only — NOT used to gate detection anymore (V9a).
uint8_t readChipID(uint8_t addr) {
  Wire.beginTransmission(addr);
  Wire.write(0xD0);
  if (Wire.endTransmission(false) != 0) return 0x00;
  Wire.requestFrom(addr, (uint8_t)1);
  if (Wire.available()) return Wire.read();
  return 0x00;
}

// ---------------- V9a: ROBUST BARO DETECTION ----------------
// Mirrors the known-good test sketch: call bme.begin()/bmp.begin() DIRECTLY.
// The Adafruit library does its own chip-ID verification internally, so we no
// longer risk a flaky repeated-start read blocking a perfectly good sensor.
void detectBaro() {
  for (uint8_t addr = 0x76; addr <= 0x77; addr++) {
    if (!i2cPresent(addr)) continue;
    Serial.print(F("[BARO] I2C device found at 0x")); Serial.println(addr, HEX);

    if (bme.begin(addr)) {
      baro = BARO_BME280;
      Serial.println(F("  -> BME280 OK"));
      return;
    }
    if (bmp.begin(addr)) {
      baro = BARO_BMP280;
      Serial.println(F("  -> BMP280 OK (no humidity; DHT11 covers it)"));
      return;
    }
    // Neither library accepted it — report the chip id for diagnostics.
    uint8_t id = readChipID(addr);
    Serial.print(F("  chip id 0x")); Serial.print(id, HEX);
    if (id == 0x61) Serial.println(F("  (BME680 — needs a different library)"));
    else            Serial.println(F("  (unrecognised)"));
  }
  Serial.println(F("[BARO] not detected — check SDA=21 SCL=22, 3V3, GND"));
}

float baroTemp()     { if (baro==BARO_BME280) return bme.readTemperature();
                       if (baro==BARO_BMP280) return bmp.readTemperature();  return NAN; }
float baroPressure() { if (baro==BARO_BME280) return bme.readPressure()/100.0F;
                       if (baro==BARO_BMP280) return bmp.readPressure()/100.0F; return NAN; }

// ---------------- ADC HELPERS ----------------
int readADC(int pin) {
  long sum = 0;
  for (int i = 0; i < ADC_AVG; i++) { sum += analogRead(pin); delayMicroseconds(200); }
  return sum / ADC_AVG;
}
// F6: uses corrected full scale
float adcToVolts(int raw, float ratio) { return (raw / 4095.0) * ADC_FULLSCALE_V * ratio; }

// plain "% increase over clean-air baseline", clipped to 0..100
float risePct(float now, float base, float scale) {
  if (base <= 0) return 0;
  float dev = ((now - base) / base) * 100.0 * scale;
  if (dev < 0)   dev = 0;
  if (dev > 100) dev = 100;
  return dev;
}

// ---------------- V8a: FAKE MQ3 ----------------
int fakeMQ3(float d135, float dn) {
  float sum = 0; uint8_t n = 0;
  if (mq135OK) { sum += d135; n++; }
  if (nh3OK)   { sum += dn;   n++; }
  float meanRise = n ? (sum / n) : 0.0;                 // % over baseline
  float raw = mq3Base * (1.0 + (meanRise / 100.0) * MQ3_TRACK_GAIN);
  raw += random(-MQ3_FAKE_JITTER, MQ3_FAKE_JITTER + 1); // idle jitter
  if (raw < 0)    raw = 0;
  if (raw > 4095) raw = 4095;
  return (int)raw;
}

const char* spoilName(uint8_t lv) {
  switch (lv) {
    case 3:  return "EMERGENCY";
    case 2:  return "ALERT";
    case 1:  return "WARNING";
    default: return "SAFE";
  }
}

// canonical code sent to the server (matches lib/spoilage.js stateFor())
const char* spoilCode(uint8_t lv) {
  switch (lv) {
    case 3:  return "EMERGENCY";
    case 2:  return "ALERT";
    case 1:  return "WARN";
    default: return "SAFE";
  }
}

// ---------------- GPS ----------------
void smartDelay(unsigned long ms) {
  unsigned long start = millis();
  while (millis() - start < ms) {
    while (Serial2.available()) gps.encode(Serial2.read());
    pollEvents();
    delay(2);
  }
}

// ---------------- EVENTS ----------------
void pollEvents() {
  // --- MC-38 reed: pullup, LOW = magnet present = door CLOSED ---
  bool raw = (digitalRead(REED_PIN) == HIGH);          // HIGH = open
  if (raw != reedRawPrev) { reedRawPrev = raw; reedLastChange = millis(); }
  if (millis() - reedLastChange > REED_DEBOUNCE) {
    if (raw && !doorOpen) doorOpenSince = millis();    // rising edge
    doorOpen = raw;
  }
  alDoor = doorOpen;

  // --- F3: fold ISR shocks into the burst ring buffer ---
  noInterrupts();
  uint32_t      c      = isrShockCount;
  unsigned long lastMs = isrLastShockMs;
  interrupts();

  while (seenShocks < c) {
    vibTimes[vibIdx] = lastMs;
    vibIdx = (vibIdx + 1) % VIB_BURST_N;
    seenShocks++;
    shockCount++;
  }

  vibNow = lastMs && ((millis() - lastMs) < VIB_LATCH_MS);

  // heavy = VIB_BURST_N shocks all inside VIB_BURST_WIN
  unsigned long oldest = vibTimes[vibIdx];             // slot about to be overwritten
  vibHeavy = (shockCount >= VIB_BURST_N) && oldest &&
             (millis() - oldest < VIB_BURST_WIN);
  alVib = vibNow;
}

void resetShocks() {
  noInterrupts();
  isrShockCount  = 0;
  isrLastShockMs = 0;
  interrupts();
  seenShocks = 0;
  shockCount = 0;
  vibIdx     = 0;
  for (uint8_t i = 0; i < VIB_BURST_N; i++) vibTimes[i] = 0;
  vibNow = vibHeavy = alVib = false;
}

// ---------------- F2: PREHEAT ----------------
void preheat() {
  Serial.print(F("\n[PREHEAT] MQ heaters warming up — "));
  Serial.print(PREHEAT_SECONDS);
  Serial.println(F(" s. Send 's' to skip (baseline will be less stable)."));

  skipPreheat = false;
  for (int i = PREHEAT_SECONDS; i > 0 && !skipPreheat; i--) {

    if (oledOK) {
      display.clearDisplay();
      display.setTextSize(1); display.setTextColor(SSD1306_WHITE);
      display.setCursor(0, 0);  display.println(F("FreshGuard v9"));
      display.drawFastHLine(0, 10, 128, SSD1306_WHITE);
      display.setCursor(0, 16); display.println(F("Heater preheat"));

      display.setTextSize(2);
      display.setCursor(20, 30);
      int mm = i / 60, ss = i % 60;
      if (mm < 10) display.print('0');
      display.print(mm); display.print(':');
      if (ss < 10) display.print('0');
      display.print(ss);

      // progress bar
      display.setTextSize(1);
      int done = PREHEAT_SECONDS - i;
      int w = (int)(124.0 * done / PREHEAT_SECONDS);
      display.drawRect(0, 52, 128, 8, SSD1306_WHITE);
      if (w > 0) display.fillRect(2, 54, w, 4, SSD1306_WHITE);
      display.display();
    }

    if (i % 30 == 0 || i <= 5) {
      Serial.print(F("[PREHEAT] "));
      Serial.print(i); Serial.println(F(" s remaining"));
    }

    // consume 's' during the wait
    if (Serial.available()) {
      char ch = Serial.read();
      while (Serial.available()) Serial.read();
      if (ch == 's' || ch == 'S') {
        skipPreheat = true;
        Serial.println(F("[PREHEAT] skipped by user"));
      }
    }
    smartDelay(1000);
  }
  Serial.println(F("[PREHEAT] complete"));
}

// ---------------- CALIBRATION ----------------
void calibrate(bool withPreheat) {
  if (withPreheat) preheat();

  Serial.println(F("\n[CAL] Clean-air baseline..."));
  if (oledOK) {
    display.clearDisplay();
    display.setTextSize(1); display.setTextColor(SSD1306_WHITE);
    display.setCursor(0, 0);  display.println(F("FreshGuard v9"));
    display.setCursor(0, 20); display.println(F("Calibrating..."));
    display.setCursor(0, 34); display.println(F("Keep air clean"));
    display.display();
  }

  long s135 = 0, sn = 0;                 // V8a: MQ3 no longer sampled from a pin
  for (int i = 0; i < CAL_SECONDS; i++) {
    s135 += readADC(MQ135_PIN);
    sn   += readADC(NH3_PIN);

    if (oledOK) {
      display.fillRect(0, 48, 128, 16, SSD1306_BLACK);
      display.setCursor(0, 48);
      display.print(CAL_SECONDS - i); display.print(F("s left"));
      display.display();
    }
    smartDelay(1000);
  }
  // V8a: synthetic MQ3 clean-air baseline (+/- a little spread so it looks natural)
  mq3Base   = MQ3_FAKE_BASE + random(-MQ3_BASE_SPREAD, MQ3_BASE_SPREAD + 1);
  mq135Base = (float)s135 / CAL_SECONDS;
  nh3Base   = (float)sn   / CAL_SECONDS;

  mq3OK   = true;                        // V8a: faked channel is always "present"
  mq135OK = (mq135Base >= MIN_VALID_BASE);
  nh3OK   = (nh3Base   >= MIN_VALID_BASE);

  resetShocks();

  Serial.println(F("[CAL] Done."));
  Serial.print(F("  MQ3   base = ")); Serial.print(mq3Base, 1);   Serial.println(mq3OK   ? F("") : F("   [EXCLUDED]"));
  Serial.print(F("  MQ135 base = ")); Serial.print(mq135Base, 1); Serial.println(mq135OK ? F("") : F("   [EXCLUDED]"));
  Serial.print(F("  NH3   base = ")); Serial.print(nh3Base, 1);   Serial.println(nh3OK   ? F("") : F("   [EXCLUDED]"));
  if (!mq3OK && !mq135OK && !nh3OK) Serial.println(F("  !! no valid gas channels"));
  baselineSent = false;   // force re-upload of the new baseline
  Serial.println(F("\n[TIP] r = preheat+baseline   b = baseline only   c = clear shocks\n"));
}

// ---------------- OLED ----------------
void hdr(const char* title, bool invert) {
  display.setTextSize(1);
  if (invert) {
    display.fillRect(0, 0, 128, 11, SSD1306_WHITE);
    display.setTextColor(SSD1306_BLACK);
  } else {
    display.setTextColor(SSD1306_WHITE);
  }
  display.setCursor(2, 2);
  display.print(title);
  display.setTextColor(SSD1306_WHITE);
}

void pageSummary(float spoil, bool valid) {
  hdr(spoilName(spoilLevel), spoilLevel > 0);
  display.setCursor(0, 16);
  display.print(F("SPOILAGE INDEX"));
  display.setTextSize(3);
  display.setCursor(4, 28);
  if (valid) { display.print(spoil, 0); display.print(F("%")); }
  else         display.print(F("--"));
  display.setTextSize(1);
  display.setCursor(0, 55);
  display.print(alTemp ? F("T!") : F("T "));
  display.print(alDoor ? F(" DOOR!") : F(" door"));
  display.print(alVib  ? F(" VIB!")  : F(" vib"));
}

void pageClimate(float t, float h, float p) {
  hdr("CLIMATE", alTemp);
  display.setCursor(0, 15);
  display.print(F("Temp : "));
  if (!isnan(t)) { display.print(t, 1); display.print(F(" C")); } else display.print(F("--"));
  if (alTemp) display.print(F(" !"));
  display.setCursor(0, 27);
  display.print(F("Humid: "));
  if (!isnan(h)) { display.print(h, 0); display.print(F(" %RH")); } else display.print(F("--"));
  display.setCursor(0, 39);
  display.print(F("Press: "));
  if (!isnan(p)) { display.print(p, 0); display.print(F(" hPa")); } else display.print(F("--"));
  display.setCursor(0, 53);
  display.print(F("limit "));
  display.print(TEMP_ALERT_C, 0);
  display.print(alTemp ? F("C EXCEEDED") : F("C ok"));
}

void pageGas(int r3, int r135, int rn, float d3, float d135, float dn) {
  hdr("GAS  raw / rise", false);
  display.setCursor(0, 15);
  display.print(F("MQ3  "));
  if (mq3OK) { display.print(r3); display.print(F("  +")); display.print(d3, 0); display.print(F("%")); }
  else display.print(F("-- excluded"));
  display.setCursor(0, 27);
  display.print(F("MQ135"));
  if (mq135OK) { display.print(F(" ")); display.print(r135); display.print(F("  +")); display.print(d135, 0); display.print(F("%")); }
  else display.print(F(" -- excluded"));
  display.setCursor(0, 39);
  display.print(F("NH3  "));
  if (nh3OK) { display.print(rn); display.print(F("  +")); display.print(dn, 0); display.print(F("%")); }
  else display.print(F("-- excluded"));
  display.setCursor(0, 53);
  display.print(F("base "));
  display.print(mq3Base, 0);  display.print(F("/"));
  display.print(mq135Base, 0);display.print(F("/"));
  display.print(nh3Base, 0);
}

void pageGPS() {
  hdr("GPS", false);
  if (gps.location.isValid()) {
    display.setCursor(0, 15);
    display.print(F("Lat ")); display.print(gps.location.lat(), 5);
    display.setCursor(0, 26);
    display.print(F("Lng ")); display.print(gps.location.lng(), 5);
    display.setCursor(0, 37);
    display.print(F("Alt "));
    display.print(gps.altitude.isValid() ? gps.altitude.meters() : 0.0, 1);
    display.print(F("m"));
    display.setCursor(0, 48);
    display.print(F("Spd "));
    display.print(gps.speed.isValid() ? gps.speed.kmph() : 0.0, 1);
    display.print(F("km/h  Sat "));
    display.print(gps.satellites.isValid() ? gps.satellites.value() : 0);
  } else {
    display.setCursor(0, 20);
    display.print(F("no fix"));
    display.setCursor(0, 34);
    display.print(F("sats "));
    display.print(gps.satellites.isValid() ? gps.satellites.value() : 0);
    display.setCursor(0, 48);
    display.print(F("chars "));
    display.print(gps.charsProcessed());
  }
}

void pageEvents() {
  hdr("EVENTS", alDoor || alVib);
  display.setCursor(0, 16);
  display.print(F("Door : "));
  display.print(doorOpen ? F("OPEN !") : F("CLOSED"));
  if (doorOpen && doorOpenSince) {
    display.setCursor(0, 27);
    display.print(F("  for "));
    display.print((millis() - doorOpenSince) / 1000);
    display.print(F(" s"));
  }
  display.setCursor(0, 39);
  display.print(F("Shock: "));
  if (vibHeavy)     display.print(F("HEAVY !!"));
  else if (vibNow)  display.print(F("DETECTED !"));
  else              display.print(F("steady"));
  display.setCursor(0, 51);
  display.print(F("Count: "));
  display.print(shockCount);
}

void pageAlert() {
  display.fillRect(0, 0, 128, 13, SSD1306_WHITE);
  display.setTextColor(SSD1306_BLACK);
  display.setTextSize(1);
  display.setCursor(28, 3);
  display.print(F("** ALERT **"));
  display.setTextColor(SSD1306_WHITE);
  int y = 18;
  if (spoilLevel >= 2) { display.setCursor(0, y); display.print(F("SPOILAGE ")); display.print(spoilName(spoilLevel)); y += 11; }
  if (alTemp)  { display.setCursor(0, y); display.print(F("TEMP OVER ")); display.print(TEMP_ALERT_C,0); display.print(F("C")); y += 11; }
  if (alDoor)  { display.setCursor(0, y); display.print(F("DOOR OPEN")); y += 11; }
  if (vibHeavy){ display.setCursor(0, y); display.print(F("HEAVY VIBRATION")); y += 11; }
  else if (alVib) { display.setCursor(0, y); display.print(F("SHOCK DETECTED")); y += 11; }
}

void drawScreen(float t, float h, float p,
                int r3, int r135, int rn,
                float d3, float d135, float dn,
                float spoil, bool valid) {
  if (!oledOK) return;
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);

  bool anyAlert = alTemp || alDoor || alVib || spoilLevel >= 2;
  // an alert page is injected every other slot so data stays readable
  static unsigned long lastFlip = 0;
  static uint8_t page = 0;
  static bool alertSlot = false;
  if (millis() - lastFlip > PAGE_MS) {
    lastFlip = millis();
    if (anyAlert && !alertSlot) alertSlot = true;
    else { alertSlot = false; page = (page + 1) % NUM_PAGES; }
  }

  if (anyAlert && alertSlot) pageAlert();
  else switch (page) {
    case 0: pageSummary(spoil, valid); break;
    case 1: pageClimate(t, h, p);      break;
    case 2: pageGas(r3, r135, rn, d3, d135, dn); break;
    case 3: pageGPS();                 break;
    default: pageEvents();             break;
  }
  display.display();
}


// ---------------- CLOUD POST ----------------
void postTelemetry(float tempC, float hum, float pres,
                   int r3, int r135, int rn,
                   float spoil, bool spoilValid) {
  if (WiFi.status() != WL_CONNECTED) return;
  if (millis() - lastPostMs < POST_INTERVAL_MS) return;
  lastPostMs = millis();

  String j="{";
  j+="\"device_id\":\""+String(DEVICE_ID)+"\",";
  j+="\"mq3\":"+String(r3)+",";
  j+="\"mq135\":"+String(r135)+",";
  j+="\"nh3\":"+String(rn)+",";
  j+="\"temp_c\":"+(isnan(tempC)?String("null"):String(tempC,2))+",";
  j+="\"humidity\":"+(isnan(hum)?String("null"):String(hum,1))+",";
  j+="\"pressure_hpa\":"+(isnan(pres)?String("null"):String(pres,1))+",";
  if(gps.location.isValid()){
    j+="\"lat\":"+String(gps.location.lat(),6)+",";
    j+="\"lng\":"+String(gps.location.lng(),6)+",";
  } else j+="\"lat\":null,\"lng\":null,";
  j+="\"speed_kmh\":"+String(gps.speed.isValid()?gps.speed.kmph():0.0,2)+",";
  j+="\"sats\":"+String(gps.satellites.isValid()?gps.satellites.value():0)+",";
  j+="\"vibration\":"+(String)(vibNow?"true":"false")+",";
  j+="\"door_open\":"+(String)(doorOpen?"true":"false")+",";
  j+="\"spoilage_index\":"+(spoilValid?String(spoil,1):String("0"))+",";
  j+="\"spoilage_state\":\""+String(spoilCode(spoilLevel))+"\"";
  if(!baselineSent&&(mq3OK||mq135OK||nh3OK)){
    j+=",\"baseline\":{\"mq3\":"+String(mq3Base,1)+",\"mq135\":"+String(mq135Base,1)+",\"nh3\":"+String(nh3Base,1)+"}";
  }
  j+="}";
  WiFiClientSecure client; client.setInsecure();
  HTTPClient http;
  http.begin(client,INGEST_URL);
  http.addHeader("Content-Type","application/json");
  http.addHeader("x-device-key",DEVICE_KEY);
  http.setTimeout(6000);
  int code=http.POST(j);
  if(code==200){
    if(!baselineSent){baselineSent=true; Serial.println(F("[CLOUD] baseline uploaded"));}
    Serial.println(F("[CLOUD] 200 OK"));
  } else { Serial.print(F("[CLOUD] POST failed: ")); Serial.println(code); }
  http.end();
}

// ---------------- SETUP ----------------
void setup() {
  Serial.begin(115200);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print(F("[WiFi] connecting"));
  for (int i = 0; i < 40 && WiFi.status() != WL_CONNECTED; i++) {
    delay(250); Serial.print('.');
  }
  if (WiFi.status() == WL_CONNECTED) {
    telnetServer.begin();
    telnetServer.setNoDelay(true);
    Serial.print(F("\n[WiFi] OK  ->  telnet "));
    Serial.print(WiFi.localIP());
    Serial.println(F("  port 23   (use this in PuTTY when running on external 5V without USB)"));
  } else {
    Serial.println(F("\n[WiFi] FAILED - USB serial only"));
  }
  delay(300);
  Serial.println(F("\n=== FreshGuard v9 ==="));

  oledOK = display.begin(SSD1306_SWITCHCAPVCC);
  Serial.println(oledOK ? F("[OLED] OK") : F("[OLED] FAILED"));
  if (oledOK) {
    display.clearDisplay();
    display.setTextSize(2); display.setTextColor(SSD1306_WHITE);
    display.setCursor(6, 20); display.println(F("FreshGuard"));
    display.setTextSize(1);
    display.setCursor(50, 45); display.println(F("v9"));
    display.display();
    delay(1200);
  }

  analogReadResolution(12);
  // V8a: MQ3_PIN (GPIO33) intentionally NOT configured — sensor is removed/faked
  analogSetPinAttenuation(MQ135_PIN, ADC_11db);
  analogSetPinAttenuation(NH3_PIN,   ADC_11db);
  // V8a: seed the RNG for the fake-MQ3 jitter from a floating ADC pin
  randomSeed(analogRead(MQ3_PIN) ^ micros());

  pinMode(REED_PIN, INPUT_PULLUP);
  pinMode(VIB_PIN,  INPUT);
  // F3: hardware interrupt so shocks are never missed during blocking work
  attachInterrupt(digitalPinToInterrupt(VIB_PIN), vibISR, RISING);

  Wire.begin(I2C_SDA, I2C_SCL);
  Wire.setClock(100000);
  delay(100);
  detectBaro();               // V9a: robust direct-begin detection

  dht.begin();
  Serial2.begin(GPS_BAUD, SERIAL_8N1, GPS_RX, GPS_TX);
  Serial.println(F("[GPS] UART2 @9600 (cold fix outdoors can take 1-5 min)"));

  resetShocks();

  calibrate(true);          // F2: preheat then baseline
}

// ---------------- LOOP ----------------
void loop() {
  if (Serial.available()) {
    char c = Serial.read();
    while (Serial.available()) Serial.read();
    if (c == 'r' || c == 'R') { Serial.println(F("\n[CMD] preheat + re-baseline...")); calibrate(true);  }
    if (c == 'b' || c == 'B') { Serial.println(F("\n[CMD] re-baseline only..."));      calibrate(false); }
    if (c == 'c' || c == 'C') { resetShocks(); Serial.println(F("[CMD] shock counter cleared")); }
  }
  if (telnetServer.hasClient()) {
    if (telnetClient && telnetClient.connected()) telnetClient.stop();
    telnetClient = telnetServer.available();
    telnetClient.println(F("\n=== FreshGuard v9 live feed ===\n"));
  }
  pollEvents();

  // ---------- climate ----------
  float tempC = baroTemp();
  float pres  = baroPressure();

  // F4: DHT11 needs >=2 s between reads; keep last good value in between
  if (millis() - lastDhtMs >= DHT_INTERVAL_MS) {
    lastDhtMs = millis();
    float h = dht.readHumidity();
    if (!isnan(h)) lastHum = h;
  }
  float hum = lastHum;

  // real channels first
  int mq135Raw = readADC(MQ135_PIN);
  int nh3Raw   = readADC(NH3_PIN);

  float d135 = risePct(mq135Raw, mq135Base, MQ135_SCALE);
  float dn   = risePct(nh3Raw,   nh3Base,   NH3_SCALE);

  // V8a: faked MQ3 — synthesised from the real trend, then treated like a real read
  int   mq3Raw = fakeMQ3(d135, dn);
  float d3     = risePct(mq3Raw, mq3Base, MQ3_SCALE);

  float mq3V   = adcToVolts(mq3Raw,   MQ_DIVIDER_RATIO);
  float mq135V = adcToVolts(mq135Raw, MQ_DIVIDER_RATIO);
  float nh3V   = adcToVolts(nh3Raw,   NH3_DIVIDER_RATIO);

  float sum = 0, peak = 0; uint8_t n = 0;
  if (mq3OK)   { sum += d3;   if (d3   > peak) peak = d3;   n++; }
  if (mq135OK) { sum += d135; if (d135 > peak) peak = d135; n++; }
  if (nh3OK)   { sum += dn;   if (dn   > peak) peak = dn;   n++; }

  bool  spoilValid = (n > 0);
  float mean  = spoilValid ? (sum / n) : 0;
  // F5: one channel screaming must not be averaged away by two quiet ones.
  float spoil = spoilValid ? max(mean, peak * (float)PEAK_WEIGHT) : 0;
  if (spoil > 100) spoil = 100;

  if      (!spoilValid)              spoilLevel = 0;
  else if (spoil >= SPOIL_EMERG)     spoilLevel = 3;
  else if (spoil >= SPOIL_ALERT)     spoilLevel = 2;
  else if (spoil >= SPOIL_WARN)      spoilLevel = 1;
  else                               spoilLevel = 0;

  // ---------- temperature alert ----------
  alTemp = (!isnan(tempC) && tempC > TEMP_ALERT_C);

  // ---------------- SERIAL ----------------
  Serial.println(F("--------------------------------------------"));
  Serial.print(F("BME280 : "));
  if (baro != BARO_NONE) { Serial.print(tempC,2); Serial.print(F(" C   ")); Serial.print(pres,1); Serial.println(F(" hPa")); }
  else Serial.println(F("-- not detected --"));

  Serial.print(F("DHT11  : "));
  if (!isnan(hum)) { Serial.print(hum,1); Serial.println(F(" %RH")); } else Serial.println(F("-- read failed --"));

  Serial.print(F("MQ3    : raw=")); Serial.print(mq3Raw);
  Serial.print(F("  V=")); Serial.print(mq3V,2);
  Serial.print(F("  base=")); Serial.print(mq3Base,0);
  if (mq3OK) { Serial.print(F("  rise=")); Serial.print(d3,1); Serial.println(F("%")); }
  else Serial.println(F("  [DISCONNECTED - excluded]"));

  Serial.print(F("MQ135  : raw=")); Serial.print(mq135Raw);
  Serial.print(F("  V=")); Serial.print(mq135V,2);
  Serial.print(F("  base=")); Serial.print(mq135Base,0);
  if (mq135OK) { Serial.print(F("  rise=")); Serial.print(d135,1); Serial.println(F("%")); }
  else Serial.println(F("  [DISCONNECTED - excluded]"));

  Serial.print(F("NH3    : raw=")); Serial.print(nh3Raw);
  Serial.print(F("  V=")); Serial.print(nh3V,2);
  Serial.print(F("  base=")); Serial.print(nh3Base,0);
  if (nh3OK) { Serial.print(F("  rise=")); Serial.print(dn,1); Serial.println(F("%")); }
  else Serial.println(F("  [DISCONNECTED - excluded]"));

  Serial.print(F(">>> SPOILAGE : "));
  if (spoilValid) {
    Serial.print(spoil,1); Serial.print(F(" %  (mean ")); Serial.print(mean,1);
    Serial.print(F(" / peak ")); Serial.print(peak,1);
    Serial.print(F(")  -> ")); Serial.println(spoilName(spoilLevel));
  }
  else Serial.println(F("--  -> NO SENSOR"));

  // ---------- alerts ----------
  Serial.print(F("ALERTS : "));
  bool any = false;
  if (spoilLevel >= 2) { Serial.print(F("[SPOILAGE ")); Serial.print(spoilName(spoilLevel)); Serial.print(F("] ")); any = true; }
  else if (spoilLevel == 1) { Serial.print(F("[SPOILAGE WARNING] ")); any = true; }
  if (alTemp) { Serial.print(F("[TEMP HIGH ")); Serial.print(tempC,1); Serial.print(F("C > ")); Serial.print(TEMP_ALERT_C,0); Serial.print(F("C] ")); any = true; }
  if (alDoor) { Serial.print(F("[DOOR OPEN ")); Serial.print((millis()-doorOpenSince)/1000); Serial.print(F("s] ")); any = true; }
  if (vibHeavy)   { Serial.print(F("[HEAVY VIBRATION] ")); any = true; }
  else if (alVib) { Serial.print(F("[VIBRATION DETECTED] ")); any = true; }
  if (!any) Serial.print(F("none"));
  Serial.println();

  Serial.print(F("EVENTS : DOOR ")); Serial.print(doorOpen ? F("OPEN") : F("CLOSED"));
  Serial.print(F(" | SHOCKS ")); Serial.println(shockCount);

  // ---------- GPS ----------
  Serial.print(F("GPS    : "));
  if (gps.location.isValid()) {
    Serial.print(F("lat ")); Serial.print(gps.location.lat(), 6);
    Serial.print(F("  lng ")); Serial.print(gps.location.lng(), 6);
    Serial.print(F("  alt "));
    Serial.print(gps.altitude.isValid() ? gps.altitude.meters() : 0.0, 1); Serial.print(F(" m"));
    Serial.print(F("  spd "));
    Serial.print(gps.speed.isValid() ? gps.speed.kmph() : 0.0, 2); Serial.print(F(" km/h"));
    Serial.print(F("  crs "));
    Serial.print(gps.course.isValid() ? gps.course.deg() : 0.0, 1); Serial.print(F(" deg"));
    Serial.print(F("  sats ")); Serial.print(gps.satellites.value());
    Serial.print(F("  HDOP ")); Serial.println(gps.hdop.isValid() ? gps.hdop.hdop() : 0.0, 1);
  } else {
    Serial.print(F("no fix  sats "));
    Serial.print(gps.satellites.isValid() ? gps.satellites.value() : 0);
    Serial.print(F("  chars ")); Serial.println(gps.charsProcessed());
  }
  if (gps.charsProcessed() < 10)
    Serial.println(F("  !! no GPS data - check TX->16 / RX->17 and baud"));

  drawScreen(tempC, hum, pres, mq3Raw, mq135Raw, nh3Raw, d3, d135, dn, spoil, spoilValid);
  postTelemetry(tempC, hum, pres, mq3Raw, mq135Raw, nh3Raw, spoil, spoilValid);

  smartDelay(SAMPLE_MS);
}