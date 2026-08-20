import { notFound } from 'next/navigation';
import { fleetAssets } from '@/data/mock-data';
import { VehicleDetailClient } from './vehicle-detail-client';

export default async function VehicleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const exists = fleetAssets.some((item) => item.id === id);
  if (!exists) return notFound();
  return <VehicleDetailClient id={id} />;
}
