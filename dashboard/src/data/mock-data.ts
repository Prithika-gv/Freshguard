import { ChatMessage, DriverProfile, FleetAsset, TrendPoint } from '@/types';

export const commodities = [
  'Tomatoes','Apples','Onions','Bananas','Potatoes','Carrots','Cabbage','Cauliflower','Spinach','Lettuce',
  'Mangoes','Grapes','Oranges','Pineapples','Papayas','Cucumbers','Bell Peppers','Brinjals','Beans','Peas',
  'Broccoli','Pomegranates','Guavas','Chillies','Pumpkins'
];

export const fleetAssets: FleetAsset[] = [
  {
    id: 'FG-201', vehicleNumber: 'TN-09-FG-201', driverName: 'Arjun M.', driverId: 'DRV-01', status: 'Running',
    origin: 'Chennai Cold Hub', destination: 'Vellore Retail Node', startTime: '06:40', eta: '11:10',
    commodityManifest: ['Tomatoes', 'Spinach', 'Bell Peppers'], totalDistanceKm: 124, battery: 84, rssi: -58,
    location: { lat: 12.9165, lng: 79.1325 }, depot: { lat: 13.0827, lng: 80.2707 }, destinationPoint: { lat: 12.9165, lng: 79.1325 },
    telemetry: { temperature: 4.8, humidity: 74, voc: 118, ammonia: 17, reedSwitchOpen: false, vibrationG: 1.2, bme280: 4.8, dht11: 74, gpsNeoM8N: 'LOCKED', mqComposite: 118, fermionNh3: 17 },
    alerts: { gas: 'SAFE', vibration: 'SAFE', access: 'SAFE' }
  },
  {
    id: 'FG-202', vehicleNumber: 'TN-09-FG-202', driverName: 'Nisha R.', driverId: 'DRV-02', status: 'Warehouse',
    origin: 'Chennai Cold Hub', destination: 'Salem Distribution Dock', startTime: '08:00', eta: '15:30',
    commodityManifest: ['Apples', 'Grapes', 'Pomegranates'], totalDistanceKm: 0, battery: 96, rssi: -49,
    location: { lat: 13.0827, lng: 80.2707 }, depot: { lat: 13.0827, lng: 80.2707 }, destinationPoint: { lat: 11.6643, lng: 78.1460 },
    telemetry: { temperature: 3.9, humidity: 70, voc: 126, ammonia: 20, reedSwitchOpen: true, vibrationG: 0.4, bme280: 3.9, dht11: 70, gpsNeoM8N: 'LOCKED', mqComposite: 126, fermionNh3: 20 },
    alerts: { gas: 'WARNING', vibration: 'SAFE', access: 'WARNING' }
  },
  {
    id: 'FG-203', vehicleNumber: 'TN-09-FG-203', driverName: 'Praveen S.', driverId: 'DRV-03', status: 'Maintenance',
    origin: 'Madurai Service Bay', destination: 'Madurai Service Bay', startTime: '09:15', eta: 'N/A',
    commodityManifest: ['Onions', 'Potatoes'], totalDistanceKm: 14, battery: 61, rssi: -71,
    location: { lat: 9.9252, lng: 78.1198 }, depot: { lat: 9.9252, lng: 78.1198 }, destinationPoint: { lat: 9.9252, lng: 78.1198 },
    telemetry: { temperature: 7.1, humidity: 79, voc: 168, ammonia: 33, reedSwitchOpen: false, vibrationG: 2.9, bme280: 7.1, dht11: 79, gpsNeoM8N: 'LOCKED', mqComposite: 168, fermionNh3: 33 },
    alerts: { gas: 'WARNING', vibration: 'CRITICAL ALERT', access: 'SAFE' }
  },
  {
    id: 'FG-204', vehicleNumber: 'TN-09-FG-204', driverName: 'Meera K.', driverId: 'DRV-04', status: 'Running',
    origin: 'Coimbatore Produce Terminal', destination: 'Erode Grocery Cluster', startTime: '05:50', eta: '10:05',
    commodityManifest: ['Bananas', 'Mangoes', 'Papayas'], totalDistanceKm: 178, battery: 72, rssi: -63,
    location: { lat: 11.3410, lng: 77.7172 }, depot: { lat: 11.0168, lng: 76.9558 }, destinationPoint: { lat: 11.3410, lng: 77.7172 },
    telemetry: { temperature: 5.6, humidity: 77, voc: 214, ammonia: 42, reedSwitchOpen: false, vibrationG: 1.8, bme280: 5.6, dht11: 77, gpsNeoM8N: 'LOCKED', mqComposite: 214, fermionNh3: 42 },
    alerts: { gas: 'CRITICAL ALERT', vibration: 'WARNING', access: 'SAFE' }
  }
];

export const drivers: DriverProfile[] = [
  { id: 'DRV-01', name: 'Arjun M.', phone: '+91 98400 10001', assetId: 'FG-201', attendance: 'Present', workingDays: 22, avatar: '/avatars/arjun.png', liveTracking: 'Vellore Corridor' },
  { id: 'DRV-02', name: 'Nisha R.', phone: '+91 98400 10002', assetId: 'FG-202', attendance: 'Present', workingDays: 20, avatar: '/avatars/nisha.png', liveTracking: 'Warehouse Ready State' },
  { id: 'DRV-03', name: 'Praveen S.', phone: '+91 98400 10003', assetId: 'FG-203', attendance: 'Absent', workingDays: 16, avatar: '/avatars/praveen.png', liveTracking: 'Maintenance Bay' },
  { id: 'DRV-04', name: 'Meera K.', phone: '+91 98400 10004', assetId: 'FG-204', attendance: 'Present', workingDays: 24, avatar: '/avatars/meera.png', liveTracking: 'Erode Corridor' }
];

export const chatSeed: ChatMessage[] = [
  { id: '1', sender: 'admin', author: 'Dispatch HQ', type: 'text', content: 'Confirm dock seal integrity after the next halt.', sentAt: '09:14', read: true },
  { id: '2', sender: 'driver', author: 'Arjun M.', type: 'audio', content: 'Audio log uploaded: compartment stable, no odor spike.', sentAt: '09:18', read: true },
  { id: '3', sender: 'admin', author: 'Dispatch HQ', type: 'document', content: 'Updated SOP checklist attached for reefer compliance.', sentAt: '09:24', read: true },
  { id: '4', sender: 'driver', author: 'Arjun M.', type: 'image', content: 'Door seal image proof received.', sentAt: '09:29', read: false },
];

const baseTrend = [118, 120, 124, 132, 145, 158, 166, 174, 186, 194, 207, 214];
export const trendData: Record<string, TrendPoint[]> = {
  '1H': baseTrend.map((voc, index) => ({ label: `${index * 5}m`, voc, nh3: 14 + index * 2.1, threshold: 180, movingAverage: voc - 8, temp: 4.6 + index * 0.08, humidity: 73 + index * 0.2 })),
  '6H': baseTrend.map((voc, index) => ({ label: `${index + 1}h`, voc: voc + 8, nh3: 16 + index * 2.4, threshold: 180, movingAverage: voc - 4, temp: 4.7 + index * 0.12, humidity: 74 + index * 0.3 })),
  '12H': baseTrend.map((voc, index) => ({ label: `${index + 1}h`, voc: voc + 15, nh3: 20 + index * 2.6, threshold: 190, movingAverage: voc + 2, temp: 5.0 + index * 0.13, humidity: 75 + index * 0.28 })),
  '24H': baseTrend.map((voc, index) => ({ label: `${(index + 1) * 2}h`, voc: voc + 22, nh3: 22 + index * 2.8, threshold: 200, movingAverage: voc + 10, temp: 5.1 + index * 0.15, humidity: 76 + index * 0.25 })),
  '7D': baseTrend.map((voc, index) => ({ label: `D${index + 1}`, voc: voc + 30, nh3: 25 + index * 3, threshold: 210, movingAverage: voc + 15, temp: 5.4 + index * 0.18, humidity: 76 + index * 0.4 }))
};

export const weatherSnapshot = { location: 'Chennai', temperature: 31, humidity: 68, condition: 'Partly Cloudy' };

export const hardwareComparison = [
  ['Main Processing Unit','ESP32 Development Board','ESP32-S3 Dual-Core Industrial SoC'],
  ['Ethylene / Gas Array','MQ3 + MQ135 Core Sensors','Figaro Industrial VOC Solid-State Array'],
  ['Ammonia Monitoring','Base Electrochemical Probe','Fermion NH3 Precision Industrial Array'],
  ['Ambient Telemetry','BME280 Environment Sensor','SHT30 Sealed Industrial Probe Assembly'],
  ['Kinematic Shock Sensor','SW420 Vibration Switch','Heavy-Duty Industrial Accelerometer Array'],
  ['Physical Access Array','Magnetic Reed Proximity Switch','Heavy-Duty Industrial Magnetic Reed Array'],
  ['Spatial Telemetry','GPS Neo M8N Receiver Engine','Multi-Constellation Industrial GNSS Module'],
  ['Telemetry Transport','Onboard Wi‑Fi / GSM900A Module','High-Speed 4G LTE Cellular Gateway Module'],
  ['Local Visual Output','Standard I2C OLED Display Panel','Ruggedized Industrial OLED Control Interface'],
  ['Enclosure & Power','Standard Breadboard/Battery Grid','IP65 Weatherproof Chassis + Integrated Battery Backup']
];
