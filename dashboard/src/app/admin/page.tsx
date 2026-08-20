'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Activity, BatteryCharging, MapPinned, ShieldAlert, Warehouse } from 'lucide-react';
import { TopBar } from '@/components/layout/topbar';
import { MetricCard } from '@/components/ui/metric-card';
import { ChatPanel } from '@/components/chat/chat-panel';
import { fleetAssets as mockFleetAssets, drivers, hardwareComparison } from '@/data/mock-data';
import { statusClasses } from '@/lib/utils';
import { FleetAsset } from '@/types';

export default function AdminPage() {
  const [fleetAssets, setFleetAssets] = useState<FleetAsset[]>(mockFleetAssets);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const res = await fetch('/api/telemetry', { cache: 'no-store' });
        const data = await res.json();
        if (alive && Array.isArray(data)) setFleetAssets(data);
      } catch {
        // keep showing the last good data if a poll fails
      }
    };
    tick();
    const id = setInterval(tick, 4000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const totals = {
    vehicles: fleetAssets.length,
    running: fleetAssets.filter((item) => item.status === 'Running').length,
    warehouse: fleetAssets.filter((item) => item.status === 'Warehouse').length,
    spoilage: fleetAssets.filter((item) => item.alerts.gas !== 'SAFE').length,
    door: fleetAssets.filter((item) => item.alerts.access !== 'SAFE').length,
    vibration: fleetAssets.filter((item) => item.alerts.vibration !== 'SAFE').length,
    avgTemp: (fleetAssets.reduce((acc, item) => acc + item.telemetry.temperature, 0) / fleetAssets.length).toFixed(1),
    avgHumidity: Math.round(fleetAssets.reduce((acc, item) => acc + item.telemetry.humidity, 0) / fleetAssets.length),
    avgVoc: Math.round(fleetAssets.reduce((acc, item) => acc + item.telemetry.voc, 0) / fleetAssets.length),
    avgNh3: Math.round(fleetAssets.reduce((acc, item) => acc + item.telemetry.ammonia, 0) / fleetAssets.length),
  };

  return (
    <main className="min-h-screen px-6 py-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <TopBar profileName="Dr. Kavya Raman" />

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <MetricCard label="Total Vehicles" value={String(totals.vehicles)} subtext="Specialized delivery assets tracked" />
          <MetricCard label="Vehicles Running" value={String(totals.running)} subtext="Real-time road operations" />
          <MetricCard label="Vehicles in Warehouse" value={String(totals.warehouse)} subtext="Awaiting dispatch / loading" />
          <MetricCard label="Spoilage Alerts" value={String(totals.spoilage)} subtext="Gas hazard deviations" />
          <MetricCard label="Door Alerts" value={String(totals.door)} subtext="Door integrity / extended open" />
        </section>

        <section className="grid gap-4 lg:grid-cols-4">
          <div className="panel"><Activity className="h-7 w-7 text-brand-dark" /><p className="metric-label mt-4">Average Fleet Temperature</p><p className="metric-value">{totals.avgTemp}°C</p></div>
          <div className="panel"><Warehouse className="h-7 w-7 text-brand-dark" /><p className="metric-label mt-4">Average Fleet Humidity</p><p className="metric-value">{totals.avgHumidity}%</p></div>
          <div className="panel"><ShieldAlert className="h-7 w-7 text-brand-dark" /><p className="metric-label mt-4">Average VOC Gas</p><p className="metric-value">{totals.avgVoc} ppm</p></div>
          <div className="panel"><BatteryCharging className="h-7 w-7 text-brand-dark" /><p className="metric-label mt-4">Average Ammonia (NH₃)</p><p className="metric-value">{totals.avgNh3} ppm</p></div>
        </section>

        <section className="panel overflow-hidden">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="metric-label">Interactive Fleet Grid</p>
              <h3 className="text-2xl text-brand-dark">Specialized cold-chain asset status matrix</h3>
            </div>
            <span className="rounded-full bg-brand-surface px-4 py-2 text-sm text-brand-dark">{fleetAssets.length} delivery assets</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-brand-dark/10 text-slate-500">
                <tr>
                  {['Vehicle', 'Driver', 'Status', 'Route', 'Start / ETA', 'Commodity', 'Distance', 'Battery', 'RSSI', 'Open'].map((head) => <th key={head} className="px-3 py-3 font-semibold uppercase tracking-[0.18em]">{head}</th>)}
                </tr>
              </thead>
              <tbody>
                {fleetAssets.map((asset) => (
                  <tr key={asset.id} className="border-b border-brand-dark/5">
                    <td className="px-3 py-4 font-semibold text-brand-dark">{asset.vehicleNumber}</td>
                    <td className="px-3 py-4">{asset.driverName}</td>
                    <td className="px-3 py-4"><span className={`status-pill ${statusClasses(asset.status)}`}>{asset.status}</span></td>
                    <td className="px-3 py-4">{asset.origin} → {asset.destination}</td>
                    <td className="px-3 py-4">{asset.startTime} / {asset.eta}</td>
                    <td className="px-3 py-4">{asset.commodityManifest.join(', ')}</td>
                    <td className="px-3 py-4">{asset.totalDistanceKm} km</td>
                    <td className="px-3 py-4">{asset.battery}%</td>
                    <td className="px-3 py-4">{asset.rssi} dBm</td>
                    <td className="px-3 py-4"><Link href={`/admin/vehicles/${asset.id}`} className="inline-flex items-center gap-2 rounded-full bg-brand-dark px-4 py-2 text-white"><MapPinned className="h-4 w-4" />View</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="panel">
            <p className="metric-label">Driver Manifest Matrix</p>
            <h3 className="mb-5 text-2xl text-brand-dark">Attendance and assignment registry</h3>
            <div className="space-y-4">
              {drivers.map((driver) => (
                <div key={driver.id} className="flex items-center justify-between rounded-2xl border border-brand-dark/10 bg-white/70 p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-surface text-brand-dark">{driver.name.charAt(0)}</div>
                    <div>
                      <p className="font-semibold text-brand-dark">{driver.name}</p>
                      <p className="text-sm text-slate-500">{driver.phone} · {driver.assetId}</p>
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <p className={`status-pill ${statusClasses(driver.attendance === 'Present' ? 'SAFE' : 'WARNING')}`}>{driver.attendance}</p>
                    <p className="mt-2 text-slate-500">Working Days: {driver.workingDays}</p>
                    <p className="text-slate-500">Tracking: {driver.liveTracking}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <ChatPanel title="Admin ↔ Driver dispatcher network" />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="panel">
            <p className="metric-label">Hardware Prototyping Reference Validation</p>
            <h3 className="mb-5 text-2xl text-brand-dark">System prototype vs enterprise commercial version</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-brand-dark/10 text-slate-500">
                    <th className="px-3 py-3 uppercase tracking-[0.18em]">Architectural Component</th>
                    <th className="px-3 py-3 uppercase tracking-[0.18em]">Prototyping Hardware Stack Spec</th>
                    <th className="px-3 py-3 uppercase tracking-[0.18em]">Enterprise Commercial Hardware Stack Spec</th>
                  </tr>
                </thead>
                <tbody>
                  {hardwareComparison.map(([component, prototype, enterprise]) => (
                    <tr key={component} className="border-b border-brand-dark/5">
                      <td className="px-3 py-4 font-semibold text-brand-dark">{component}</td>
                      <td className="px-3 py-4">{prototype}</td>
                      <td className="px-3 py-4">{enterprise}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="panel">
            <p className="metric-label">System Management Grid</p>
            <h3 className="mb-5 text-2xl text-brand-dark">Threshold and calibration governance</h3>
            <div className="space-y-4">
              {[
                ['Threshold Settings', 'VOC 180 ppm · NH₃ 30 ppm · shock 2.2 g'],
                ['Asset Lifecycle Updates', '2 assets running, 1 warehouse, 1 maintenance'],
                ['Sensor Field Calibration', 'BME280 ±0.5°C · DHT11 ±2% RH · NH₃ offset 0.8 ppm'],
                ['Automated Alert Routing', 'Dispatcher HQ, fleet QA lead, warehouse supervisor'],
                ['Cloud Backup Sync Hooks', '15-minute cadence to regional failover bucket'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-brand-dark/10 bg-white/70 p-4">
                  <p className="metric-label">{label}</p>
                  <p className="mt-2 text-sm leading-7 text-slate-700">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
