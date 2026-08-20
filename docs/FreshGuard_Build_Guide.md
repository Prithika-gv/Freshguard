# FreshGuard — Fresh Build Guide (Pinout · Power · Firmware · Dashboard)

Team BIO SENTINEL · Finals build · 17 Jul 2026

This is your single source of truth for the rebuild. Wire in the order in §5 — do **not** connect everything then power up. Each module is proven working before the next goes on.

---

## 1. Pin map (ESP32 DevKit v1, 30-pin — GPIO numbers hold for any ESP32 board)

| Module | Signal | → ESP32 GPIO | Notes |
|---|---|---|---|
| **MQ-135** | AO (via divider) | **GPIO34** | ADC1, input-only. Divider REQUIRED (see §3) |
| | VCC | 5V rail | Heater needs 5V, ~150 mA |
| **MQ-3** | AO (via divider) | **GPIO35** | ADC1, input-only. Divider REQUIRED |
| | VCC | 5V rail | Heater needs 5V, ~150 mA |
| **BME280** | SDA | **GPIO21** | I²C |
| | SCL | **GPIO22** | I²C |
| | VCC | 3.3V | GY-BME280 board has regulator (3.3–5V ok) |
| **OLED SSD1306 (SPI, 7-pin)** | D0 / SCK / CLK | **GPIO18** | Hardware VSPI clock |
| | D1 / MOSI / SDA / DIN | **GPIO23** | VSPI data |
| | CS | **GPIO5** | |
| | DC | **GPIO19** | |
| | RES / RST | **GPIO4** | |
| | VCC | 3.3V | |
| **NEO-M8N GPS** | TX → ESP32 RX2 | **GPIO16** | UART2 |
| | RX ← ESP32 TX2 | **GPIO17** | UART2 |
| | VCC | 3.3V or 5V | Module has regulator; logic is 3.3V |
| **SIM900A GSM** | TXD → ESP32 RX1 | **GPIO26** | UART1 (remapped) |
| | RXD ← ESP32 TX1 | **GPIO27** | See §3 note on optional divider |
| | VCC | **5V rail (own feed + 1000µF cap)** | 2 A peak — never off ESP32/USB |
| **MC-38 reed (door)** | one leg | **GPIO14** | `INPUT_PULLUP`, interrupt |
| | other leg | GND | |
| **SW-420 vibration** | DO | **GPIO13** | Digital, interrupt |
| | VCC / GND | 3.3V / GND | |
| **Buzzer (optional)** | + | **GPIO25** | Active buzzer |

**All grounds are common** — every module GND, the buck GND, and the LiPo negative tie to one ground rail. This is the single most common reason a "correct" wiring doesn't work.

### Pins deliberately avoided
GPIO0, 2, 12, 15 (strapping/boot pins), GPIO6–11 (flash — never use). ADC2 pins are avoided for analog because ADC2 is disabled while WiFi runs — that's why both MQ sensors are on ADC1 (34/35).

---

## 2. Power supply plan

You have the current headroom, so this is straightforward and safe.

```
3S LiPo (11.1V, 2200mAh)  ──►  Buck converter (set to 5.00V)  ──►  5V RAIL
                                                                      ├── SIM900A VCC  (+ 1000µF cap across VCC/GND, right at the module)
                                                                      ├── MQ-135 VCC   (+ 100µF nearby)
                                                                      ├── MQ-3 VCC
                                                                      ├── NEO-M8N VCC
                                                                      └── ESP32 VIN (5V pin)  ──► onboard AMS1117 ──► 3.3V for BME280, OLED, GPS logic, SW-420
```

Rules that keep the demo alive:

1. **Set the buck to exactly 5.00V with a multimeter BEFORE connecting anything.** 11.1V into any module = instant death. Turn the pot, measure, then connect.
2. **Buck converter:** use an **XL4015 (5A)** — it holds voltage through SIM900A's 2 A current spikes. An LM2596 (rated 3A, sags under spikes) works but is marginal; XL4015 is the safer choice and cheap.
3. **Big cap on SIM900A:** solder a **1000µF (≥6.3V) electrolytic across the SIM900A VCC/GND**, as close to the module as possible. This is the difference between a clean SMS send and a mid-demo brownout reset. Add a **470µF bulk cap on the 5V rail** and **100µF near the MQ sensors**.
4. **Do NOT power SIM900A or the MQ heaters from the ESP32's 3.3V pin or from the USB 5V** — neither can source 2 A. They come off the buck 5V rail only.
5. **One 3S LiPo is enough.** 2200mAh at ~11.1V is plenty for a demo; keep the second as a charged spare. The 18650 isn't needed.
6. During development you can power the ESP32 from USB for flashing **and** have the buck 5V rail live for the peripherals — just make sure grounds are common. Don't back-feed USB 5V into the buck rail.

---

## 3. The MQ voltage divider (mandatory — read this)

MQ modules output their analog signal (AO) referenced to their supply. Powered at 5V, AO can swing to ~5V. **The ESP32 ADC tolerates max 3.3V** — feeding 5V into GPIO34/35 clips readings and can damage the pin.

Put a resistor divider on each AO before it reaches the ESP32:

```
MQ AO ──[ R1 = 6.8kΩ ]──┬── GPIO34 (or 35)
                        │
                     [ R2 = 6.8kΩ ]
                        │
                       GND
```

(10k/15k works too if you have those instead — any ratio is fine as long as the firmware's `ADC_DIVIDER` constant matches it exactly.)

Scale factor = R2 / (R1 + R2) = 6.8 / 13.6 = **0.5**, so 5.0V → 2.5V (safe margin under 3.3V). This matches `ADC_DIVIDER = 0.50f` in the firmware — if you use a different resistor pair, update that constant to match, since it's not just a harmless scale factor: the Rs formula subtracts `Vao` from `VCC`, so a mismatched ratio distorts the resistance math nonlinearly, not just uniformly.

**Why this doesn't hurt accuracy:** FreshGuard never uses the absolute reading. It uses `Rs/R₀` — every reading is divided by that same box's baseline. The divider is a constant factor that cancels out of the ratio. So the divider protects the pin and costs you nothing in the fusion logic. This is exactly the self-referential baselining in your pitch, working in your favour.

**SIM900A RXD note:** ESP32 TX is 3.3V into SIM900A RXD. Most SIM900A breakouts accept this fine. If yours is fussy, drop ESP32 TX (GPIO27) through the same 10k/15k divider to ~2V. SIM900A TXD (~2.8V) into ESP32 RX needs no divider.

---

## 4. Libraries to install (Arduino IDE → Library Manager)

- **Adafruit BME280** + **Adafruit Unified Sensor**
- **U8g2** (for the SPI SSD1306 OLED — handles 7-pin SPI cleanly)
- **TinyGPSPlus** (Mikal Hart) for NEO-M8N
- Board package: **esp32 by Espressif** (Boards Manager). Select board "ESP32 Dev Module".

SIM900A and the digital sensors need no library — plain `Serial1` AT commands and `digitalRead`.

---

## 5. Bring-up order — prove each module before adding the next

Do them in this sequence. After each step you have a known-good baseline to fall back to.

1. **ESP32 alone** — flash the Blink example. Confirms board + USB + toolchain.
2. **OLED (already working)** — run the U8g2 "Hello World" for SPI SSD1306 on the pins in §1. Confirms SPI + display.
3. **BME280** — I²C scan sketch should find it at 0x76 or 0x77. Then read temperature/humidity. This is your compensation source; nothing gas-related is trustworthy without it.
4. **MQ-135 (already working) + MQ-3** — with dividers in place. Power for 20 min warm-up. Print raw ADC + computed `Rs/R₀`. Breathe alcohol near MQ-3, hold a marker near MQ-135, watch both move.
5. **Reed switch + SW-420** — digital reads. Open/close the magnet, tap the board. Confirm interrupts fire.
6. **NEO-M8N GPS** — near a window/outdoors. First fix (cold) can take 1–5 min. Confirm `location.isValid()`. Indoors it may never fix — that's normal; have a window seat at the venue or accept "last known" for the demo.
7. **SIM900A** — bench-test standalone FIRST on the buck 5V rail with the 1000µF cap:
   - `AT` → `OK`
   - `AT+CPIN?` → `READY`
   - `AT+CSQ` → signal (needs to be >10 or so)
   - `AT+CREG?` → registered
   - Send a test SMS via `AT+CMGF=1` then `AT+CMGS`. Only after a real SMS lands do you integrate it.
8. **WiFi → dashboard** — connect to venue/hotspot WiFi, POST the JSON payload (§7), confirm it appears on your dashboard.
9. **Full firmware merge** — flash `FreshGuard_firmware.ino`, verify OLED shows the Freshness Score and all subsystems report.

---

## 6. What the firmware does (matches your pitch)

- **Preheat + settle:** discards MQ readings during a warm-up window on boot.
- **Baseline capture:** on a long-press of the BOOT button (or auto after warm-up), it records `R₀` for both gas channels + the T/RH at that instant — "this box, this load, this trip."
- **Compensation:** every gas reading is corrected against BME280 live T/RH before use.
- **Trajectory, not level:** it tracks `Rs/R₀` and its slope, plus the **MQ135:MQ3 ratio** (the fingerprint), not raw ppm.
- **Fusion → Freshness Score (0–100, 4 tiers):** weighted fusion of normalized gas deviation + slope, the gas ratio, cumulative temperature dose (time-above-threshold, not instantaneous), humidity, door-open count/duration, and elapsed time since seal → a single spoilage probability.
- **Causal audit trail:** door and vibration events are timestamped + geo-tagged, so an alert reads "spoilage rising **because** door open 40 min at 14:22, <GPS link>."
- **Edge-first:** all inference runs on the ESP32. WiFi/GSM only carry the result. Loses signal → keeps deciding + buffering.
- **Two output paths:** WiFi HTTP POST (JSON) to your dashboard every cycle; SIM900A SMS on tier change to CAUTION/SPOILING and on door-breach.

---

## 7. Dashboard integration (the one thing I need from you)

The firmware sends this JSON via HTTP POST to a URL you set at the top of the file (`DASHBOARD_URL`):

```json
{
  "device": "FRESHGUARD-01",
  "ts": 1234567,
  "temp_c": 6.4,
  "humidity": 82.1,
  "mq135_ratio": 1.83,
  "mq3_ratio": 1.12,
  "gas_ratio": 1.63,
  "freshness": 74,
  "tier": "CAUTION",
  "spoil_prob": 0.26,
  "door_open": false,
  "door_count": 3,
  "vibration": false,
  "lat": 11.0168,
  "lng": 76.9558
}
```

Tell me which dashboard you already have and I'll match it in ~5 minutes:

- **Firebase Realtime DB** → change POST to a `PUT` on `https://<proj>.firebaseio.com/live.json`.
- **ThingSpeak** → switch to a GET on `api.thingspeak.com/update?api_key=...&field1=...`.
- **Blynk** → swap to `Blynk.virtualWrite(Vn, ...)` calls (I'll drop in the library).
- **Custom Flask/Node** → it already works; just set `DASHBOARD_URL`.

Everything else in the firmware stays identical regardless of which you pick.

---

## 8. Demo hedges (protect the win)

- **Warm the MQ sensors 20 min before you present.** Cold sensors read garbage.
- **Pre-capture the baseline** during setup, not on stage — so the score is already sensible when judges walk up.
- **Rehearse the spoilage trigger:** a cotton ball with a drop of ethanol (MQ-3) or a small piece of ripe/overripe fruit or a whiff of ammonia cleaner (MQ-135) in a small sealed cup makes the score move on cue. Practise the exact prop.
- **Have a fallback alert screenshot** (a real SMS + a dashboard screen-recording) in case venue WiFi or 2G is flaky. Judges forgive network flakiness; they don't forgive a blank screen.
- **Door demo is your strongest visual:** open the lid → OLED flips to DOOR OPEN → SMS fires → score starts climbing. It's the clearest "condition, not conditions" story on the table.
- **Keep a charged spare LiPo** and pre-check `AT+CSQ` signal at the venue before you go up.

---

## 9. My honest opinion on the project

The core idea is genuinely strong, and stronger than most hardware-hackathon entries because it has a real thesis, not just a sensor bolted to a screen. "We measure the evidence of spoilage directly and use temperature to explain it" is a sentence a domain judge respects. The three things that make it defensible — the 2-gas fingerprint (ratio, not thresholds), per-trip self-referential baselining, and fusion into one probability with a causal audit trail — are exactly the right answers to the objections a sharp judge would raise. You've clearly already thought about the failure modes (MQ drift, humidity, the ppm-accuracy trap), and saying the honest version out loud ("we detect a reproducible compensated deviation pattern, not lab-grade ppm") will win you more credibility than an overclaim would.

Where I'd push you, bluntly: **your risk is 100% execution, not concept.** Judges rated you 6.5–7 and told you demo is the lever. Right now only 2 of 9 modules work with days to go. So the win condition is not "add another sensor" or "improve the pitch deck" — it's "get a stable box that visibly moves its Freshness Score and fires a door SMS on stage without resetting." Every hour goes to that. Specifically: (1) nail SIM900A power first, because a brownout reset mid-demo is the single most likely way you lose; (2) make sure the score *visibly changes* when you introduce a spoilage prop — a number that just sits at 100 is unconvincing even if the science is right; (3) the door-open → SMS → score-climb sequence is your best 20 seconds, so rehearse it until it's boringly reliable.

One scope-discipline point: SW-420 and GPS are nice, but if time gets tight, a rock-solid gas+temp+door+dashboard demo beats a shaky all-nine-sensors demo every time. Cut vibration before you cut reliability. GPS can degrade gracefully to "last known location" if it won't fix indoors.

Net: the idea is finals-worthy and the framing is honest and smart. Whether you win comes down to a box that doesn't flinch when a judge opens the lid. Put your remaining time there.
