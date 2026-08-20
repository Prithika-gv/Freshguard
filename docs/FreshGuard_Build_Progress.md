# FreshGuard — Fresh Build Progress & Decisions Log

**Owner:** Prithika (Team Lead, Team BIO SENTINEL)
**Project:** FreshGuard — IoT cold-chain spoilage detection
**Stage:** Finals — rebuilding hardware from scratch
**Last updated:** 17 Jul 2026
**Purpose of this file:** Resumable record. If the chat resets or runs out of tokens, re-open this file to continue exactly where we left off.

---

## 0. Where we are right now

- Selected for finals. Goal: win. Demo execution is the #1 lever (carried from earlier judge feedback: 6.5–7/10).
- Rebuilding the wiring from scratch. **Currently only MQ-135 + OLED are confirmed working.**
- Everything else (MQ-3, BME280, NEO-M8N GPS, SIM900A GSM, MC-38 reed, SW-420 vibration) needs bring-up.

## 1. Components in hand (confirmed by Prithika, 17 Jul)

| # | Component | Role | Interface |
|---|---|---|---|
| 1 | ESP32 dev board | MCU + WiFi | — |
| 2 | MQ-135 | Broad VOC / ammonia (protein spoilage) | Analog |
| 3 | MQ-3 | Ethanol (fruit/veg fermentation) | Analog |
| 4 | BMP280 *(mislabeled as BME280 — confirmed via chip ID 0x58, no humidity channel)* | Temperature (+ pressure) | I²C |
| 4b | DHT11 *(added back from old prototype)* | Humidity | GPIO15, digital |
| 5 | OLED 0.96" (SSD1306, 7-pin SPI) | Local display | SPI |
| 6 | NEO-M8N | GPS position + time | UART |
| 7 | SIM900A ("GSM 900A") | 2G SMS alert / product uplink | UART |
| 8 | MC-38 magnetic reed switch | Door-open detection | Digital |
| 9 | SW-420 | Vibration / rough-handling | Digital |

## 2. Locked decisions (17 Jul)

| Decision | Choice | Why |
|---|---|---|
| Dashboard transport | **WiFi (HTTP JSON) for the live demo** | Reliable at venue; SIM900A kept wired for SMS + product story |
| Dashboard platform | **User already has one** — firmware posts a documented JSON payload to a configurable URL | Need Prithika to confirm platform/endpoint to finalise (see Open Items) |
| GSM role in demo | **SMS alert only** (spoilage/door events + GPS link) | Proves real on-road path without risking venue 2G for live data |
| Power | **One 3S LiPo (11.1V, 2200mAh) → buck converter → 5V/3A rail** | Plenty of headroom for SIM900A 2A spikes + MQ heaters. 18650 spare not needed. |
| MQ analog into ESP32 | **Voltage divider on each AO (10k/15k)** | MQ AO swings to ~5V; ESP32 ADC max 3.3V — divider is mandatory |
| ADC pins | **GPIO34 (MQ135), GPIO35 (MQ3)** — both ADC1 | ADC2 is unusable while WiFi is on |

## 3. Deliverables produced this session

- `FreshGuard_Build_Progress.md` — this file (living log)
- `FreshGuard_Build_Guide.md` — full pinout, power, wiring, bring-up steps, dashboard, opinion
- `FreshGuard_firmware.ino` — complete ESP32 firmware

## 4. Open items (need Prithika's input / action)

- [ ] **Confirm dashboard platform + endpoint URL** (Blynk? Firebase? ThingSpeak? custom Flask?). Firmware currently posts JSON via HTTP POST — 5-min change to match whatever you have.
- [ ] Confirm ESP32 board pin count (30-pin DevKit v1 assumed). GPIO numbers hold regardless as long as those GPIOs are broken out.
- [ ] Confirm 2G SIM is BSNL / Vi / Airtel (NOT Jio) and has balance.
- [ ] Buy: buck converter (XL4015 5A recommended), resistors (10k, 15k ×2 each), 1000µF + 470µF + 100µF caps, breadboard/perfboard.
- [ ] Burn in MQ sensors 24–48h before demo; 20-min warm-up each run.

## 4b. Full wire-by-wire connection list

Common GND = LiPo −, buck −, ESP32 GND, and every module GND all tied together. 5V rail = buck output (set to 5.00V first).

| Module | Module pin | → | ESP32 / rail |
|---|---|---|---|
| MQ-135 | VCC / GND / AO / DO | | 5V / GND / **10k→GPIO34, 15k GPIO34→GND** / n.c. |
| MQ-3 | VCC / GND / AO / DO | | 5V / GND / **10k→GPIO35, 15k GPIO35→GND** / n.c. |
| BME280 | VCC / GND / SCL / SDA | | 3.3V / GND / GPIO22 / GPIO21 (CSB,SDO as-is) |
| OLED SPI | VCC / GND / D0(CLK) / D1(MOSI) / RES / DC / CS | | 3.3V / GND / GPIO18 / GPIO23 / GPIO4 / GPIO19 / GPIO5 |
| NEO-M8N | VCC / GND / TX / RX | | 3.3V / GND / GPIO16 / GPIO17 |
| SIM900A | VCC / GND / TXD / RXD | | 5V (+1000µF cap) / GND / GPIO26 / GPIO27 |
| MC-38 reed | wire A / wire B | | GPIO14 / GND |
| SW-420 | VCC / GND / DO | | 3.3V / GND / GPIO13 |
| Buzzer | + / − | | GPIO25 / GND |
| Power | LiPo+ / LiPo− / buckOUT+ / buckOUT− | | buckIN+ / buckIN−+GND / 5V rail + ESP32 VIN / GND |

## 4b. Q&A log

- **Q: Is the MQ voltage divider actually necessary? Prior version didn't use one and it worked.**
  A: It's a risk you got away with, not a non-issue. MQ AO = VCC × RL/(Rs+RL) — in clean air Rs is high so AO sits low (often <2V, which is why direct-wire "worked" in early testing), but Rs drops as gas rises, pushing AO toward VCC (~5V). ESP32 ADC absolute max is ~3.6V, so a strong gas event can clip or, over repeated exposure, degrade the pin. Worse for FreshGuard specifically: the ADC saturates at 3.3V exactly when gas is highest — i.e. exactly the spoilage event you're trying to measure. Losing resolution there undermines the core "trajectory" thesis. Divider is 2 resistors per channel, cancels out of the Rs/R0 ratio (no accuracy cost) — recommended to keep it in.

- **Q: MQ-135/MQ-3 both have a pot on the back — what do we do with it?**
  A: Ignore it. The pot only sets the LM393 comparator threshold for the DO (digital) pin — it has no effect on AO, which is tapped directly off the sensor's own Rs/RL divider before the comparator stage. We only use AO. DO stays unconnected. Optional: turn pot fully CCW as a safety margin in case DO is accidentally touched.

- **Q: GSM + reed switch not yet connected, no battery yet — can I power via laptop USB for now? Is USB-only with nothing else wired safe?**
  A: Reed switch — yes, wire it now, it's passive, no power risk. SIM900A — no, keep unpowered until the buck+LiPo (or a 5V/2A wall adapter + 1000µF cap) is ready; laptop USB (~0.5–0.9A) can't cover its 2A bursts, causing brownouts/resets rather than damage. ESP32 on USB alone with nothing else wired is completely normal and safe — that's the standard flashing setup.

- **Q: Can we power via laptop USB for now (no GSM/reed/battery wired yet)? Safe to flash without GSM connected?**
  A: Yes to both. USB current-limits/shuts off rather than burning anything; current load without GSM (~400-600mA) is within most laptop ports' range. SIM900A (2A peak) must NEVER run off USB — wait for the buck+LiPo rail before wiring it in. Flashing without GSM/reed connected is safe; GPIO26/27 aren't strapping pins, unconnected UART just gets no response.
  **Gotcha flagged:** PIN_REED (GPIO14) is `INPUT_PULLUP` — if the reed switch isn't wired, it floats HIGH = firmware reads "door open" continuously, triggers buzzer + SMS attempt after 30s, drags Freshness Score down. **Fix: jumper GPIO14 to GND temporarily** to simulate closed door until reed switch is wired.
  **Dashboard:** door_open/door_count are already in the WiFi JSON payload — no buzzer/LED needed for dashboard reporting. Buzzer is a local audible nice-to-have for demo only.

- **Q: Dashboard isn't connected yet — update the code to show details on OLED + Serial instead.**
  A: Done. Added `const bool ENABLE_DASHBOARD = false` — when false, ESP32 skips WiFi entirely at boot and skips the `postDashboard()` POST call in the loop (flip to `true` later once a real `DASHBOARD_URL` exists, no other code changes needed). Added a second, auto-cycling OLED page (toggles every 4s) showing raw MQ voltages/resistances, baseline/warm-up status, door count, and GPS fix — the main score page still shows first. Added a full `printSerial()` block, printed every 3s sample cycle, dumping temp/humidity, both gas channels (ADC, Rs, ratio, slope), gas ratio, baseline state, Freshness/tier/spoil probability, door state, vibration, and GPS — this is now the primary way to watch the sensor fusion live during bring-up.
  **Important:** user's local Arduino sketch lives at `...\Documents\Arduino\fresguard_friday\fresguard_friday.ino` — a separate copy from this project's `FreshGuard_firmware.ino`. Updated code needs to be copied into the local sketch file to take effect.

## 4c. First bring-up test results (17 Jul, Serial log reviewed)

- **BME280 reading 0.0C / 0.0%** — sensor not detected (bmeOK false), most likely I2C wiring fault (check SDA/GPIO21, SCL/GPIO22, VCC/3.3V, GND). Ask user to confirm `[BME] ok` vs `[BME] NOT FOUND` boot line.
- **Door cumOpen=65s at t=45s uptime — impossible, diagnosed and fixed.** Root cause: GPIO14 (reed) still not connected/jumpered → floats HIGH → reads as permanently open. Compounded by a real firmware bug: the 30s door-breach path credited 30s to `doorCumOpen` without resetting `doorOpenedAt`, so the later close-transition double-counted the same span. **Fixed:** breach handler now resets `doorOpenedAt = millis()` after crediting the 30s. User still needs to jumper GPIO14→GND (or wire the real switch) to stop the false-open reading at the source.
- **OLED lit but not showing live data** — likely SPI pin-label mismatch (7-pin SSD1306 modules aren't universally ordered) or bus timing. Added `u8g2.setBusClock(400000)` as a defensive fix. Awaiting user confirmation of module's actual pin silkscreen if issue persists.
- **MQ135/MQ3 readings look sane** (2.548V/10.59k and 0.794V/58.25k) — divider + ADC path working correctly. g135/g3 correctly held at 1.000 pre-baseline (expected, baseline not captured until warm-up completes).

## 4d. OLED root cause found (my bug, not user wiring)

User shared their old working prototype code — it used Adafruit_SSD1306 (software SPI) with **DC on GPIO2**. My new firmware used U8g2 hardware SPI with **DC on GPIO19** — GPIO19 is the default ESP32 VSPI MISO pin, which U8g2's hardware-SPI init implicitly reserves, so my manual DC control on the same pin conflicted with it. That's why the display lit once at boot then never updated. **Fixed:** `OLED_DC` changed from 19 to 2 in `FreshGuard_firmware.ino`, matching the user's already-proven physical wiring. My mistake in the original pin assignment, not a user wiring error.

## 4e. BME280 root cause confirmed: it's actually a BMP280 (no humidity)

Chip ID readback: `0x58` at address 0x76 = **BMP280**, not BME280 (which is 0x60). Wiring/bus was always fine — the module itself has no humidity sensor. **Fixed in firmware:** switched library from Adafruit_BME280 to Adafruit_BMP280 (temperature only), and brought back **DHT11 on GPIO15** for humidity — reusing the exact proven wiring/pin from the user's old working v1.3 prototype. `bmeOK` renamed to `bmpOK` + new `dhtOK` flag; `captureBaseline()` and the sample loop both updated to source temp from BMP280 and humidity from DHT11 independently (one failing doesn't block the other). Component list updated: BME280 → BMP280 + DHT11.

**Libraries now needed:** Adafruit BMP280 Library, Adafruit Unified Sensor, DHT sensor library (by Adafruit), U8g2, TinyGPSPlus.

## 4f. Reed switch confirmed noisy/floating, OLED fix insufficient

- **Door count churning (194->197 opens in ~3s)** confirms GPIO14 is still floating (no reed switch, no jumper) and picking up noise. Data is meaningless until GPIO14->GND jumper or real MC-38 is wired. Flagged 3x now — user prioritizing DHT11 + GSM wiring next, reed switch jumper still pending.
- **OLED still not working even after OLED_DC fix (19->2).** Since `oledShow()` is confirmed running every cycle via Serial log continuity, this is a hardware/wiring-level SPI fault, not a software timing issue. Provided `OLED_Test.ino` — standalone isolation sketch (just the 5 OLED SPI wires, nothing else) to determine if it's a wiring/pin-label mismatch or a display module fault, independent of the rest of the build. User deprioritizing OLED for now in favor of DHT11/GSM wiring — reasonable given Serial Monitor already surfaces all data.
- **Humidity confirmed 0.0%** — DHT11 not yet physically wired (wasn't in original component list, only in old prototype code). User wiring it next per pin map (GPIO15).

## 4g. Standalone test sketches + DHT11/Fermion NH3 pin mappings

- **DHT11:** VCC->3.3V/5V, GND->GND, DATA->GPIO15 (add 10k pull-up if bare sensor, not needed on breakout boards).
- **Fermion NH3 (DFRobot SEN0567, verified via official wiki):** 3-pin analog module (A/VCC/GND), RL built in. VCC->3.3V (not 5V, avoids needing a divider), GND->GND, A->GPIO32 direct. Qualitative sensor, same Rs0/Rs baseline approach as MQ sensors -- not yet integrated into firmware, pending confirmation user has the part in hand.
- **`MQ3_Standalone_Test.ino`** created — isolated MQ-3 bring-up sketch (same divider math as main firmware) for breadboard testing independent of the rest of the build. Answered "why not DO": DO is a fixed-threshold comparator output, throws away the trajectory information the whole fusion method depends on.

## 4h. Divider resistors changed: 10k/15k -> 6k8/6k8

User doesn't have 10k/15k on hand, has 6.8k ("6k8"). Confirmed fine: two equal 6.8k resistors give a clean 2:1 divider (5V->2.5V), safely under the 3.3V ESP32 ADC limit. **Updated `ADC_DIVIDER` constant from 0.60 to 0.50** in both `FreshGuard_firmware.ino` and `MQ3_Standalone_Test.ino`, and updated the build guide's divider diagram — this constant must match the physical resistor ratio exactly (not a cosmetic scale factor; the Rs formula subtracts Vao from VCC, so a mismatch distorts readings nonlinearly, not uniformly). Need 4x 6.8k total (2 per MQ channel).

## 4i. MQ-3 standalone confirmed working; enclosure/mounting plan discussed

Standalone MQ3 test succeeded (stable Rs ~230-245k, low noise) -- confirms sensor + 6.8k/6.8k divider + ADC math all correct. Problem is isolated to the combined/soldered perfboard build. Ranked hypotheses given: power rail sag under combined load, ground integrity, cold solder joints on AO line/divider, GSM EMI on analog lines, resistor/firmware mismatch. Awaiting combined-board Serial log to pinpoint.

**Enclosure/mounting decisions:**
- SW-420 vibration sensor: NOT on the perfboard -- rigid screw/glue mount to enclosure wall or cargo box directly, short wires to ESP32. Must avoid foam/vibration-isolated mounting or it won't sense real shocks.
- MC-38 reed switch: hard requirement, physically split -- switch half on door, magnet half on frame. Inherently outside the main enclosure, 2-wire cable back to ESP32.
- GSM + GPS: don't need to be outside the enclosure, but enclosure must be plastic (not metal -- Faraday cage kills both signals), antennas positioned near an edge/top with clear path out, and kept physically away from the MQ135/MQ3 analog lines to reduce EMI risk (ties to the combined-board debugging above).
- Pitch note: GPS reception inside a sealed metal container/reefer truck will be unreliable regardless of enclosure -- honest framing is "position/timestamp at load, unload, and door-open events" not continuous tracking.

## 4j. Sensor reading log compiled

Created `FreshGuard_Sensor_Log.md` — consolidates every MQ135/MQ3 reading shared so far: 3 full-system snapshots (10k/15k divider, pre-baseline, all g135/g3=1.000 as expected) + the 12-row standalone MQ3 test (6.8k/6.8k divider, Rs stable 229-245k, confirms sensor/divider/ADC path solid). Noted: no standalone MQ135 test done yet; worth doing if MQ135 also misbehaves once the combined-board issue is found.

## 5. Change log

- **17 Jul 2026:** Fresh build kicked off. Locked transport (WiFi+SMS), power (3S LiPo + buck), pin map, MQ voltage dividers. Produced build guide + firmware. Firmware verified: balanced braces/parens, no duplicate GPIO usage, ADC1-only analog (WiFi-safe). Awaiting dashboard endpoint confirmation to finalise the POST target.
