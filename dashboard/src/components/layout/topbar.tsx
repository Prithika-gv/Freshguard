'use client';

import { Bell, CloudSun, LogOut } from 'lucide-react';
import { useClock } from '@/hooks/use-clock';
import { weatherSnapshot } from '@/data/mock-data';

export const TopBar = ({ profileName }: { profileName: string }) => {
  const now = useClock();

  if (!now) {
    return (
      <div className="glass sticky top-4 z-20 flex flex-col gap-4 rounded-2xl px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            FreshGuard Command Grid
          </p>
          <h2 className="mt-0.5 font-display text-xl font-semibold text-brand-dark">
            Loading...
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 text-sm text-slate-600">
          <span className="rounded-full bg-brand-surface px-4 py-2 font-mono text-xs">
            --:--:--
          </span>

          <span className="inline-flex items-center gap-2 rounded-full bg-brand-surface px-4 py-2 text-xs">
            <CloudSun className="h-4 w-4 text-brand-dark" />
            {weatherSnapshot.location} · {weatherSnapshot.temperature}°C ·{' '}
            {weatherSnapshot.humidity}% RH
          </span>

          <span className="rounded-full bg-brand-surface px-4 py-2 text-xs">
            {profileName}
          </span>

          <button className="relative rounded-full bg-white px-3.5 py-2 text-brand-dark shadow-sm">
            <Bell className="h-4 w-4" />
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-semibold text-white">
              3
            </span>
          </button>

          <button className="inline-flex items-center gap-2 rounded-full bg-brand-dark px-4 py-2 text-xs font-semibold text-white">
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="glass sticky top-4 z-20 flex flex-col gap-4 rounded-2xl px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
          FreshGuard Command Grid
        </p>

        <h2 className="mt-0.5 font-display text-xl font-semibold text-brand-dark">
          {now.toLocaleDateString('en-IN', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </h2>
      </div>

      <div className="flex flex-wrap items-center gap-2.5 text-sm text-slate-600">
        <span className="rounded-full bg-brand-surface px-4 py-2 font-mono text-xs">
          {now.toLocaleTimeString('en-IN')}
        </span>

        <span className="inline-flex items-center gap-2 rounded-full bg-brand-surface px-4 py-2 text-xs">
          <CloudSun className="h-4 w-4 text-brand-dark" />
          {weatherSnapshot.location} · {weatherSnapshot.temperature}°C ·{' '}
          {weatherSnapshot.humidity}% RH
        </span>

        <span className="rounded-full bg-brand-surface px-4 py-2 text-xs">
          {profileName}
        </span>

        <button className="relative rounded-full bg-white px-3.5 py-2 text-brand-dark shadow-sm">
          <Bell className="h-4 w-4" />
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-semibold text-white">
            3
          </span>
        </button>

        <button className="inline-flex items-center gap-2 rounded-full bg-brand-dark px-4 py-2 text-xs font-semibold text-white">
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </div>
  );
};