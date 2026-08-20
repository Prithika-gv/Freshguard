'use client';

import { MapContainer, Marker, Polyline, Popup, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { FleetAsset } from '@/types';

export const FleetMap = ({ asset }: { asset: FleetAsset }) => {
  const path = [
    [asset.depot.lat, asset.depot.lng],
    [asset.location.lat, asset.location.lng],
    [asset.destinationPoint.lat, asset.destinationPoint.lng],
  ] as [number, number][];

  return (
    <div className="panel overflow-hidden">
      <p className="metric-label">Leaflet Mapping Integration</p>
      <div className="mt-4 h-[360px] overflow-hidden rounded-2xl">
        <MapContainer center={[asset.location.lat, asset.location.lng]} zoom={8} scrollWheelZoom={false} className="h-full w-full">
          <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Marker position={[asset.depot.lat, asset.depot.lng]}><Popup>Warehouse Depot</Popup></Marker>
          <Marker position={[asset.location.lat, asset.location.lng]}><Popup>Live Vehicle Marker</Popup></Marker>
          <Marker position={[asset.destinationPoint.lat, asset.destinationPoint.lng]}><Popup>Destination Node</Popup></Marker>
          <Polyline positions={path} pathOptions={{ color: '#1B5E20', weight: 5 }} />
        </MapContainer>
      </div>
    </div>
  );
};
