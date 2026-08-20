export type PortalRole = 'admin' | 'driver';
export type VehicleStatus = 'Running' | 'Warehouse' | 'Maintenance';
export type AlertLevel = 'SAFE' | 'WARNING' | 'CRITICAL ALERT';

export interface FleetAsset {
  id: string;
  vehicleNumber: string;
  driverName: string;
  driverId: string;
  status: VehicleStatus;
  origin: string;
  destination: string;
  startTime: string;
  eta: string;
  commodityManifest: string[];
  totalDistanceKm: number;
  battery: number;
  rssi: number;
  location: { lat: number; lng: number };
  depot: { lat: number; lng: number };
  destinationPoint: { lat: number; lng: number };
  telemetry: {
    temperature: number;
    humidity: number;
    voc: number;
    ammonia: number;
    reedSwitchOpen: boolean;
    vibrationG: number;
    bme280: number;
    dht11: number;
    gpsNeoM8N: string;
    mqComposite: number;
    fermionNh3: number;
  };
  alerts: {
    gas: AlertLevel;
    vibration: AlertLevel;
    access: AlertLevel;
  };
}

export interface DriverProfile {
  id: string;
  name: string;
  phone: string;
  assetId: string;
  attendance: 'Present' | 'Absent';
  workingDays: number;
  avatar: string;
  liveTracking: string;
}

export interface ChatMessage {
  id: string;
  sender: 'admin' | 'driver';
  author: string;
  type: 'text' | 'image' | 'document' | 'audio';
  content: string;
  sentAt: string;
  read: boolean;
}

export interface TrendPoint {
  label: string;
  voc: number;
  nh3: number;
  threshold: number;
  movingAverage: number;
  temp: number;
  humidity: number;
}
