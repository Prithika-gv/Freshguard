'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { AlertTriangle, DoorOpen, Gauge, Map, Thermometer, Waves } from 'lucide-react';
import { fleetAssets as mockFleetAssets } from '@/data/mock-data';
import { TopBar } from '@/components/layout/topbar';
import { GasTrendChart } from '@/components/charts/gas-trend-chart';
import { DownloadReport } from '@/components/ui/download-report';
import { statusClasses } from '@/lib/utils';
import { FleetAsset } from '@/types';

const FleetMap = dynamic(() => import('@/components/map/fleet-map').then((mod) => mod.FleetMap), { ssr: false });

export function VehicleDetailClient({ id }: { id: string }) {
  const [assets, setAssets] = useState<FleetAsset[]>(mockFleetAssets);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const res = await fetch('/api/telemetry', { cache: 'no-store' });
        const data = await res.json();
        if (alive && Array.isArray(data)) setAssets(data);
      } catch {
        // keep showing last good data
      }
    };
    tick();
    const iv = setInterval(tick, 4000);
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, []);

  const asset = assets.find((item) => item.id === id) ?? mockFleetAssets.find((item) => item.id === id)!;

  const telemetryCards = [
    ['BME280 Temperature', `${asset.telemetry.bme280} °C`, Thermometer],
    ['DHT11 Humidity', `${asset.telemetry.dht11} %`, Waves],
    ['GPS Neo M8N', asset.telemetry.gpsNeoM8N, Map],
    ['MQ3 + MQ135 VOC', `${asset.telemetry.mqComposite} ppm`, Gauge],
    ['Fermion NH3', `${asset.telemetry.fermionNh3} ppm`, AlertTriangle],
    ['Reed Switch', asset.telemetry.reedSwitchOpen ? 'Door Open' : 'Door Closed', DoorOpen],
  ] as const;

  return (
    <main className="min-h-screen px-6 py-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <TopBar profileName="Dr. Kavya Raman" />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="metric-label">Deep-Dive Asset Analytics</p>
            <h1 className="text-4xl text-brand-dark">{asset.vehicleNumber}</h1>
            <p className="mt-2 text-slate-600">{asset.origin} → {asset.destination} · Driver: {asset.driverName}</p>
          </div>
          <div className="flex gap-3">
            <Link href="/admin" className="rounded-2xl bg-brand-surface px-4 py-3 text-brand-dark">Back to Fleet Grid</Link>
            <DownloadReport asset={asset} role="admin" />
          </div>
        </div>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {telemetryCards.map(([label, value, Icon]) => (
            <div key={label} className="panel">
              <Icon className="h-6 w-6 text-brand-dark" />
              <p className="metric-label mt-4">{label}</p>
              <p className="metric-value">{value}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <div className="panel">
            <p className="metric-label">Gas Hazard Engine</p>
            <p className={`status-pill mt-4 ${statusClasses(asset.alerts.gas)}`}>{asset.alerts.gas}</p>
            <p className="mt-4 text-sm leading-7 text-slate-600">Contextual visual status shifts from SAFE → WARNING → CRITICAL ALERT are bound to real-time VOC and ammonia thresholds.</p>
          </div>
          <div className="panel">
            <p className="metric-label">Kinematic Displacement Warnings</p>
            <p className={`status-pill mt-4 ${statusClasses(asset.alerts.vibration)}`}>{asset.alerts.vibration}</p>
            <p className="mt-4 text-sm leading-7 text-slate-600">SW420 shock monitoring reporting {asset.telemetry.vibrationG} g current structural load.</p>
          </div>
          <div className="panel">
            <p className="metric-label">Access Breach Loggers</p>
            <p className={`status-pill mt-4 ${statusClasses(asset.alerts.access)}`}>{asset.alerts.access}</p>
            <p className="mt-4 text-sm leading-7 text-slate-600">ESP32 door-state events capture unauthorized or extended door-open conditions.</p>
          </div>
        </section>

        <GasTrendChart />

        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <FleetMap asset={asset} />
          <div className="panel">
            <p className="metric-label">Predictive Trend Analytics</p>
            <h3 className="text-2xl text-brand-dark">Shelf-life decay velocity matrix</h3>
            <div className="mt-5 rounded-3xl bg-gradient-to-br from-brand-dark to-brand px-6 py-8 text-white">
              <p className="text-xs uppercase tracking-[0.32em] text-white/70">Predictive Shelf-Life Readout</p>
              <p className="mt-3 text-3xl">Commodity: {asset.commodityManifest[0]}</p>
              <p className="mt-2 text-5xl font-semibold">36 Hours</p>
              <p className="mt-3 text-sm text-white/80">Remaining Shelf Life Estimate</p>
              <span className={`status-pill mt-5 ${asset.alerts.gas === 'CRITICAL ALERT' ? 'bg-rose-100 text-rose-800' : asset.alerts.gas === 'WARNING' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>{asset.alerts.gas === 'CRITICAL ALERT' ? 'Critical Shelf Degradation Warning' : asset.alerts.gas === 'WARNING' ? 'Monitor Closely' : 'Safe'}</span>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-brand-surface p-4"><p className="metric-label">Ambient Temperature Weight</p><p className="metric-value">34%</p></div>
              <div className="rounded-2xl bg-brand-surface p-4"><p className="metric-label">Humidity Weight</p><p className="metric-value">26%</p></div>
              <div className="rounded-2xl bg-brand-surface p-4"><p className="metric-label">VOC Influence</p><p className="metric-value">28%</p></div>
              <div className="rounded-2xl bg-brand-surface p-4"><p className="metric-label">Shock Penalty</p><p className="metric-value">12%</p></div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
