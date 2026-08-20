'use client';

import { useState } from 'react';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import { trendData } from '@/data/mock-data';

const frames = ['1H', '6H', '12H', '24H', '7D'] as const;

export const GasTrendChart = () => {
  const [frame, setFrame] = useState<(typeof frames)[number]>('24H');
  const data = trendData[frame];

  return (
    <div className="panel">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="metric-label">Advanced Gas Trend & Predictive Analysis</p>
          <h3 className="text-2xl text-brand-dark">VOC + NH₃ trajectory with threshold intelligence</h3>
        </div>
        <div className="flex rounded-full bg-brand-surface p-1.5">
          {frames.map((item) => (
            <button key={item} onClick={() => setFrame(item)} className={`rounded-full px-4 py-2 text-sm ${frame === item ? 'bg-brand-dark text-white' : 'text-brand-dark'}`}>{item}</button>
          ))}
        </div>
      </div>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#c8e6c9" />
            <XAxis dataKey="label" />
            <YAxis />
            <Tooltip />
            <Line dataKey="voc" stroke="#2E7D32" strokeWidth={3} dot={false} name="VOC Curve" />
            <Line dataKey="nh3" stroke="#C9A227" strokeWidth={3} dot={false} name="NH₃ Accumulation" />
            <Line dataKey="threshold" stroke="#ef4444" strokeWidth={2} dot={false} name="Threshold Boundary" strokeDasharray="4 4" />
            <Line dataKey="movingAverage" stroke="#4CAF50" strokeWidth={2} dot={false} name="Moving Average" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
