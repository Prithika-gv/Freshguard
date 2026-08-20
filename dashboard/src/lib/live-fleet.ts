import { fleetAssets as mockFleetAssets } from '@/data/mock-data';
import { AlertLevel, FleetAsset } from '@/types';
import { getSupabase } from './supabase';

// Which real ESP32 device feeds which mock vehicle card.
const LIVE_DEVICE_ID = 'TRUCK-01';
const LIVE_VEHICLE_ID = 'FG-201';

function risePct(now: number | null | undefined, base: number | null | undefined) {
  if (!now || !base || base <= 0) return 0;
  const pct = ((now - base) / base) * 100;
  return Math.max(0, Math.min(pct, 100));
}

function gasAlert(state: string | null | undefined): AlertLevel {
  if (state === 'EMERGENCY' || state === 'ALERT') return 'CRITICAL ALERT';
  if (state === 'WARN') return 'WARNING';
  return 'SAFE';
}

// Returns the same fleetAssets shape the UI already expects, with the one
// real device's row swapped in for live values. Falls back to the original
// mock data untouched if Supabase isn't reachable or has no readings yet,
// so the site never breaks even before the ESP32 sends its first packet.
export async function getLiveFleetAssets(): Promise<FleetAsset[]> {
  const assets: FleetAsset[] = mockFleetAssets.map((a) => ({
    ...a,
    location: { ...a.location },
    telemetry: { ...a.telemetry },
    alerts: { ...a.alerts },
  }));

  try {
    const sb = getSupabase();
    const [{ data: reading }, { data: baseline }] = await Promise.all([
      sb.from('readings').select('*').eq('device_id', LIVE_DEVICE_ID).order('ts', { ascending: false }).limit(1).maybeSingle(),
      sb.from('baselines').select('*').eq('device_id', LIVE_DEVICE_ID).maybeSingle(),
    ]);

    if (reading) {
      const idx = assets.findIndex((a) => a.id === LIVE_VEHICLE_ID);
      if (idx !== -1) {
        const voc = baseline ? Math.round(risePct(reading.mq135, baseline.mq135_base)) : assets[idx].telemetry.voc;
        const ammonia = baseline ? Math.round(risePct(reading.nh3, baseline.nh3_base)) : assets[idx].telemetry.ammonia;
        const gas = gasAlert(reading.spoilage_state);
        const vibration: AlertLevel = reading.vibration ? 'WARNING' : 'SAFE';
        const access: AlertLevel = reading.door_open ? 'WARNING' : 'SAFE';

        assets[idx] = {
          ...assets[idx],
          location:
            reading.lat && reading.lng ? { lat: reading.lat, lng: reading.lng } : assets[idx].location,
          telemetry: {
            ...assets[idx].telemetry,
            temperature: reading.temp_c ?? assets[idx].telemetry.temperature,
            humidity: reading.humidity ?? assets[idx].telemetry.humidity,
            voc,
            ammonia,
            bme280: reading.temp_c ?? assets[idx].telemetry.bme280,
            dht11: reading.humidity ?? assets[idx].telemetry.dht11,
            mqComposite: voc,
            fermionNh3: ammonia,
            reedSwitchOpen: !!reading.door_open,
            vibrationG: reading.vibration ? 2.5 : 0.3,
            gpsNeoM8N: (reading.sats ?? 0) > 3 ? 'LOCKED' : 'ACQUIRING',
          },
          alerts: { gas, vibration, access },
        };
      }
    }
  } catch (err) {
    // Live source unreachable - keep serving the mock fleet so the page never breaks.
    console.error('[live-fleet] falling back to mock data:', err);
  }

  return assets;
}

export const LIVE_DEVICE = LIVE_DEVICE_ID;
