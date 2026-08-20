import { NextResponse } from 'next/server';
import { fleetAssets } from '@/data/mock-data';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const vehicle = searchParams.get('vehicle');
  const asset = fleetAssets.find((item) => item.id === vehicle) ?? fleetAssets[0];
  const rows = [
    ['timestamp', new Date().toISOString()],
    ['vehicleNumber', asset.vehicleNumber],
    ['driverName', asset.driverName],
    ['route', `${asset.origin} -> ${asset.destination}`],
    ['temperature', String(asset.telemetry.temperature)],
    ['humidity', String(asset.telemetry.humidity)],
    ['voc', String(asset.telemetry.voc)],
    ['ammonia', String(asset.telemetry.ammonia)],
    ['doorState', asset.telemetry.reedSwitchOpen ? 'Open' : 'Closed'],
    ['vibration', String(asset.telemetry.vibrationG)],
  ];
  const csv = ['field,value', ...rows.map((row) => row.join(','))].join('\n');
  return new NextResponse(csv, { headers: { 'Content-Type': 'text/csv' } });
}
