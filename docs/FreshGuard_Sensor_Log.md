# FreshGuard — MQ-135 / MQ-3 Reading Log

Compiled from Serial Monitor pastes shared during bring-up, 17 Jul 2026.
**Note:** divider changed partway through (10k/15k -> 6.8k/6.8k). Rs values from
before and after that change are NOT directly comparable in absolute terms —
what matters for FreshGuard is the Rs0/Rs ratio *within* a session, not the
raw kOhm number across sessions.

---

## A. Full-system readings (MQ135 + MQ3 together, via FreshGuard_firmware.ino)

Divider in use for all three rows below: **10k/15k (scale 0.60)** — before the
switch to 6.8k/6.8k. Baseline had not yet been captured in any of these
(still in the 20-min warm-up window), which is why g135/g3 all read 1.000 —
that's expected, not an error.

| Time | Context | MQ135 AO_V | MQ135 Rs (k) | MQ3 AO_V | MQ3 Rs (k) | Gas ratio |
|---|---|---|---|---|---|---|
| t=45s | First bring-up (BMP/BME not yet diagnosed) | 2.548 | 10.59 | 0.794 | 58.25 | 1.000 |
| t=12s | Right after BMP280 fix (temp confirmed 26.5C) | 2.529 | 14.66 | 0.766 | 82.95 | 1.000 |
| t=198s | During the reed-switch floating-pin episode | 2.361 | 16.77 | 0.739 | 86.46 | 1.000 |

*(g135 / g3 columns omitted since all three were exactly 1.000 — no baseline
captured yet in any of these runs, so no deviation could be computed.)*

## B. Standalone MQ-3 test (isolated on breadboard, MQ3_Standalone_Test.ino)

Divider in use: **6.8k/6.8k (scale 0.50)** — after the resistor swap.
12 consecutive samples, 1s apart, ~11:48:48–11:49:00.

| Time | raw ADC | ADC_V (pin) | AO_V (undone) | Rs (k) |
|---|---|---|---|---|
| 11:48:48.971 | 124 | 0.100 | 0.198 | 241.96 |
| 11:48:50.018 | 118 | 0.095 | 0.200 | 239.43 |
| 11:48:51.022 | 126 | 0.102 | 0.202 | 237.44 |
| 11:48:52.076 | 119 | 0.096 | 0.206 | 232.25 |
| 11:48:53.085 | 128 | 0.103 | 0.199 | 241.45 |
| 11:48:54.117 | 133 | 0.107 | 0.200 | 239.55 |
| 11:48:55.196 | 137 | 0.110 | 0.204 | 234.63 |
| 11:48:56.182 | 128 | 0.103 | 0.201 | 238.80 |
| 11:48:57.214 | 125 | 0.101 | 0.201 | 238.43 |
| 11:48:58.268 | 114 | 0.092 | 0.209 | 229.56 |
| 11:48:59.301 | 131 | 0.106 | 0.201 | 239.18 |
| 11:49:00.315 | 128 | 0.103 | 0.196 | 245.20 |

**Observation:** very stable — Rs holds in a tight 229–245k band across all 12
samples, low noise, no drift or spikes. This is the cleanest data we've seen
from any sensor on this build so far, and confirms the sensor + divider +
ADC path are solid in isolation.

## C. No standalone MQ-135 log yet

MQ-135 has only ever been read as part of the full combined system (table A) —
no isolated bench test has been run on it the way we did for MQ-3. Worth doing
the same standalone-on-breadboard test for MQ-135 if it's also acting up once
the combined-board issue is chased down, so we have a clean baseline to
compare against, the same way the MQ-3 test gave us one.

---

*Compiled from chat-shared Serial output — not a live/continuous device log.
Once GPS/dashboard or SD logging is added, this can be replaced by an actual
timestamped data file from the device itself.*
