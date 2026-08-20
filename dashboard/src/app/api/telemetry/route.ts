import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { getLiveFleetAssets } from '@/lib/live-fleet';

export const dynamic = 'force-dynamic';

// GET: dashboard pages poll this every few seconds.
export async function GET() {
  const assets = await getLiveFleetAssets();
  return NextResponse.json(assets);
}

// POST: the ESP32 calls this every ~3s with x-device-key header.
export async function POST(request: Request) {
  if (request.headers.get('x-device-key') !== process.env.DEVICE_KEY) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const b = await request.json();
  const deviceId = b.device_id || 'TRUCK-01';
  const sb = getSupabase();

  await sb.from('devices').upsert({ device_id: deviceId });

  if (b.baseline) {
    await sb.from('baselines').upsert({
      device_id: deviceId,
      mq3_base: b.baseline.mq3,
      mq135_base: b.baseline.mq135,
      nh3_base: b.baseline.nh3,
      recorded_at: new Date().toISOString(),
    });
  }

  const { error } = await sb.from('readings').insert({
    device_id: deviceId,
    mq3: b.mq3,
    mq135: b.mq135,
    nh3: b.nh3,
    temp_c: b.temp_c,
    humidity: b.humidity,
    pressure_hpa: b.pressure_hpa,
    lat: b.lat ?? null,
    lng: b.lng ?? null,
    speed_kmh: b.speed_kmh,
    sats: b.sats,
    vibration: !!b.vibration,
    door_open: !!b.door_open,
    spoilage_index: b.spoilage_index ?? 0,
    spoilage_state: b.spoilage_state ?? 'SAFE',
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
