'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertOctagon, CalendarClock, ClipboardList, Send, ShieldPlus } from 'lucide-react';
import { TopBar } from '@/components/layout/topbar';
import { ChatPanel } from '@/components/chat/chat-panel';
import { DownloadReport } from '@/components/ui/download-report';
import { commodities, fleetAssets as mockFleetAssets } from '@/data/mock-data';
import { FleetAsset } from '@/types';

export default function DriverPage() {
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
    const id = setInterval(tick, 4000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const asset = assets[0];
  const [selected, setSelected] = useState<string[]>(asset.commodityManifest);
  const [leaveRequest, setLeaveRequest] = useState('Request off-duty support for preventive health check on 25 July.');
  const telemetryGrid = useMemo(() => [
    ['BME280 Temp', `${asset.telemetry.bme280} °C`],
    ['DHT11 Humidity', `${asset.telemetry.dht11} %`],
    ['VOC', `${asset.telemetry.mqComposite} ppm`],
    ['NH3', `${asset.telemetry.fermionNh3} ppm`],
    ['Location', `${asset.location.lat}, ${asset.location.lng}`],
    ['Reed Switch', asset.telemetry.reedSwitchOpen ? 'Open' : 'Closed'],
    ['Vibrational Shock', `${asset.telemetry.vibrationG} g`],
  ], [asset]);

  const toggleCommodity = (item: string) => setSelected((prev) => prev.includes(item) ? prev.filter((entry) => entry !== item) : [...prev, item]);

  return (
    <main className="min-h-screen px-6 py-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <TopBar profileName={asset.driverName} />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="metric-label">Comprehensive Enterprise Driver Portal</p>
            <h1 className="text-4xl text-brand-dark">Assigned Asset: {asset.vehicleNumber}</h1>
            <p className="mt-2 text-slate-600">Focused vehicle telemetry, cargo manifest management, and dispatcher communications.</p>
          </div>
          <DownloadReport asset={asset} role="driver" />
        </div>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {telemetryGrid.map(([label, value]) => (
            <div key={label} className="panel"><p className="metric-label">{label}</p><p className="metric-value">{value}</p></div>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="panel">
            <div className="mb-5 flex items-center gap-3">
              <ClipboardList className="h-6 w-6 text-brand-dark" />
              <div>
                <p className="metric-label">Cargo Management System</p>
                <h3 className="text-2xl text-brand-dark">25 selectable fruits and vegetable commodities</h3>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {commodities.map((item) => (
                <button key={item} onClick={() => toggleCommodity(item)} className={`rounded-2xl border px-4 py-3 text-left ${selected.includes(item) ? 'border-brand-dark bg-brand-dark text-white' : 'border-brand-dark/10 bg-white text-slate-700'}`}>
                  {item}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-6">
            <div className="panel">
              <p className="metric-label">Driver Logistical Actions</p>
              <div className="mt-5 space-y-4">
                <div className="rounded-2xl bg-brand-surface p-4">
                  <div className="mb-3 flex items-center gap-2 text-brand-dark"><CalendarClock className="h-5 w-5" /> Leave Request</div>
                  <textarea value={leaveRequest} onChange={(e) => setLeaveRequest(e.target.value)} className="h-28 w-full rounded-2xl border border-brand-dark/10 bg-white p-4 outline-none" />
                  <button className="mt-3 rounded-2xl bg-brand-dark px-4 py-3 text-sm uppercase tracking-[0.22em] text-white inline-flex items-center gap-2"><Send className="h-4 w-4" />Transmit to Admin</button>
                </div>
                <button className="w-full rounded-2xl bg-rose-600 px-5 py-4 text-sm font-semibold uppercase tracking-[0.24em] text-white inline-flex items-center justify-center gap-2"><AlertOctagon className="h-5 w-5" />High-Priority Emergency Assistance</button>
                <button className="w-full rounded-2xl bg-brand-surface px-5 py-4 text-sm font-semibold uppercase tracking-[0.24em] text-brand-dark inline-flex items-center justify-center gap-2"><ShieldPlus className="h-5 w-5" />Sync operational status</button>
              </div>
            </div>
            <ChatPanel title="Direct chat with main dispatcher network" />
          </div>
        </section>
      </div>
    </main>
  );
}
