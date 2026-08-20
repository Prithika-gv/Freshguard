# FreshGuard

**IoT cold-chain spoilage detection** — an ESP32-based box that watches a refrigerated load and reports a single **Freshness / Spoilage Score** instead of raw sensor numbers.

Built by **Team BIO SENTINEL** (Lead: Prithika) for hackathon finals.

---

## The idea

Most cold-chain monitors just log temperature. FreshGuard measures the **evidence of spoilage directly** — the gases a decaying load actually gives off — and uses temperature, humidity, door events and handling shocks to *explain* it. The output is one number (0–100) with a causal audit trail, e.g. *"spoilage rising because door was open 40 min at 14:22."*

Three things make it defensible:

- **2-gas fingerprint** — it tracks the *ratio* between gas channels, not absolute ppm thresholds.
- **Per-trip self-referential baselining** — every reading is compared to *this box, this load, this trip's* clean-air baseline (`Rs/R₀`), so sensor drift and calibration cancel out.
- **Sensor fusion into one probability** — gas deviation + slope, gas ratio, cumulative temperature dose, humidity, door open count/duration and elapsed time fuse into a single spoilage score with 4 tiers (SAFE / WARN / ALERT / EMERGENCY).

All inference runs **on the edge** (the ESP32). WiFi and GSM only carry the result — lose signal and the box keeps deciding and buffering.

---

## Hardware

| Component | Role | Interface |
|---|---|---|
| ESP32 dev board | MCU + WiFi | — |
| MQ-135 | Broad VOC / ammonia (protein spoilage) | Analog (GPIO34) |
| MQ-3 | Ethanol (fermentation) | Analog (GPIO33)* |
| Fermion NH3 (SEN0567) | Ammonia | Analog (GPIO32) |
| BMP280 | Temperature (+ pressure) | I²C (SDA 21 / SCL 22) |
| DHT11 | Humidity | Digital (GPIO15) |
| OLED SSD1306 0.96" | Local display | SPI (MOSI 23 / CLK 18 / DC 19 / CS 5 / RST 4) |
| NEO-M8N | GPS position + time | UART2 (RX 16 / TX 17) |
| SIM900A | 2G SMS alert | UART |
| MC-38 reed switch | Door-open detection | Digital (GPIO14) |
| SW-420 | Vibration / rough-handling | Digital interrupt (GPIO13) |

\* See the firmware header for the current MQ-3 handling note. Full wiring, power plan and voltage-divider details are in [`docs/FreshGuard_Build_Guide.md`](docs/FreshGuard_Build_Guide.md).

**Power:** 3S LiPo (11.1 V) → buck converter set to 5.00 V → 5 V rail. The SIM900A needs a 1000 µF cap across its VCC/GND and must never run off USB (2 A peaks).

---

## Firmware

Located in [`firmware/thursfg.ino`](firmware/thursfg.ino) (ESP32, Arduino framework).

### Setup

1. Install the ESP32 board package (Espressif) in Arduino IDE, board = **ESP32 Dev Module**.
2. Install libraries: **Adafruit BME280**, **Adafruit BMP280**, **Adafruit Unified Sensor**, **DHT sensor library**, **Adafruit GFX**, **Adafruit SSD1306**, **TinyGPSPlus**.
3. **Copy `firmware/secrets.example.h` → `firmware/secrets.h`** and fill in your WiFi credentials, dashboard URL, device key and device ID. `secrets.h` is git-ignored so your credentials stay out of the repo.
4. Flash to the ESP32.

### Serial / telnet commands

The board mirrors serial output to a telnet feed on port 23 (use the IP printed at boot). Commands: `r` = preheat + re-baseline, `b` = re-baseline only, `s` = skip preheat, `c` = clear shock counter.

### Telemetry payload

Every cycle the firmware POSTs JSON (device id, gas raws, temp/humidity/pressure, GPS, door/vibration state, spoilage index + state) to `FG_INGEST_URL`.

---

## Dashboard

A **Next.js + TypeScript + Tailwind** web app lives in [`dashboard/`](dashboard/). It receives the ESP32's telemetry, stores it in Supabase, and shows live fleet status.

- **Admin view** — fleet overview, per-vehicle detail pages, gas-trend charts, fleet map, report export.
- **Driver view** — single-vehicle status for the person on the road.
- **Telemetry API** (`src/app/api/telemetry/route.ts`) — the ESP32 POSTs here every ~3s with an `x-device-key` header; readings + baselines are written to Supabase.
- **Auth** — signup / login / password reset with hashed passwords.

### Run locally

```bash
cd dashboard
npm install
cp .env.example .env.local   # then fill in SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DEVICE_KEY, SMTP_* 
npm run dev
```

All secrets (Supabase keys, `DEVICE_KEY`, SMTP creds) are read from environment variables — `.env.local` is git-ignored and never committed.

## Repository layout

```
firmware/       ESP32 sketch + secrets template
dashboard/      Next.js web dashboard (telemetry API, admin + driver views)
docs/           build guide, progress log, sensor log, reports
presentation/   pitch decks (pptx) + PDF export
```

- [`docs/FreshGuard_Build_Guide.md`](docs/FreshGuard_Build_Guide.md) — pinout, power, wiring, bring-up order, dashboard integration.
- [`docs/FreshGuard_Build_Progress.md`](docs/FreshGuard_Build_Progress.md) — decisions log and bring-up history.
- [`docs/FreshGuard_Sensor_Log.md`](docs/FreshGuard_Sensor_Log.md) — recorded MQ sensor readings.
- [`docs/FreshGuard_Final_Evolution_Report.docx`](docs/FreshGuard_Final_Evolution_Report.docx) — final report.

---

## Status

Finals build, hardware rebuilt from scratch. See the progress log for the current state of each subsystem.
