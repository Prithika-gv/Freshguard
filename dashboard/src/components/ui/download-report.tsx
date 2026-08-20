'use client';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Download } from 'lucide-react';
import { FleetAsset } from '@/types';

export const DownloadReport = ({ asset, role }: { asset: FleetAsset; role: 'admin' | 'driver' }) => {
  const downloadCsv = async () => {
    const res = await fetch(`/api/export?vehicle=${asset.id}`);
    const csv = await res.text();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${asset.id}-${role}-telemetry.csv`;
    link.click();
  };

  const downloadPdf = () => {
    const doc = new jsPDF();
    doc.setFont('times');
    doc.text(`FreshGuard Telemetry Report - ${asset.vehicleNumber}`, 14, 16);
    autoTable(doc, {
      head: [['Field', 'Value']],
      body: [
        ['Driver', asset.driverName], ['Route', `${asset.origin} → ${asset.destination}`], ['Temperature', `${asset.telemetry.temperature} °C`],
        ['Humidity', `${asset.telemetry.humidity} %`], ['VOC', `${asset.telemetry.voc} ppm`], ['NH3', `${asset.telemetry.ammonia} ppm`],
        ['Door', asset.telemetry.reedSwitchOpen ? 'Open' : 'Closed'], ['Vibration', `${asset.telemetry.vibrationG} g`],
        ['Timestamp', new Date().toLocaleString('en-IN')]
      ],
      startY: 24,
      styles: { font: 'times' },
      headStyles: { fillColor: [27, 94, 32] }
    });
    doc.save(`${asset.id}-${role}-telemetry.pdf`);
  };

  return (
    <div className="flex flex-wrap gap-3">
      <button onClick={downloadCsv} className="rounded-2xl bg-brand-dark px-4 py-3 text-sm uppercase tracking-[0.24em] text-white inline-flex items-center gap-2"><Download className="h-4 w-4" />Download CSV</button>
      <button onClick={downloadPdf} className="rounded-2xl bg-brand-surface px-4 py-3 text-sm uppercase tracking-[0.24em] text-brand-dark inline-flex items-center gap-2"><Download className="h-4 w-4" />Download PDF</button>
    </div>
  );
};
