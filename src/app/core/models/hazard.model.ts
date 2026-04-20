export interface HazardAlert {
  id: string;
  type: 'typhoon' | 'flood' | 'earthquake' | 'volcanic' | 'tsunami' | 'rainfall' | 'air-quality' | 'health' | 'fire';
  severity: 'low' | 'moderate' | 'high' | 'critical';
  title: string;
  description: string;
  location?: GeoLocation;
  timestamp: string;
  source: string;
  active: boolean;
}

export interface GeoLocation {
  lat: number;
  lng: number;
  name?: string;
  radius?: number;
}

export interface WeatherData {
  typhoons: HazardAlert[] | null;
  floods: HazardAlert[] | null;
  rainfall: HazardAlert[] | null;
}

export interface SeismicData {
  earthquakes: EarthquakeEvent[] | null;
  volcanic: HazardAlert[] | null;
  tsunami: HazardAlert[] | null;
}

export interface EarthquakeEvent {
  id: string;
  magnitude: number;
  depth: number;
  location: string;
  lat: number;
  lng: number;
  timestamp: string;
  source: string;
}

export interface AirQualityData {
  source: string;
  city?: string;
  aqi: number;
  mainPollutant?: string;
  temperature?: number;
  humidity?: number;
  level: AQILevel | null;
  timestamp?: string;
}

export interface AQILevel {
  level: string;
  color: string;
  advice: string;
}

export interface EmergencyHotline {
  name: string;
  number: string;
  category: string;
}

export interface NewsArticle {
  source: string;
  title: string;
  description: string;
  url: string;
  imageUrl?: string;
  publishedAt: string;
  category: string;
}

export interface CommunityEvent {
  id: string;
  name: string;
  description?: string;
  url?: string;
  startDate: string;
  endDate?: string;
  venue?: {
    name: string;
    address?: string;
    lat?: number;
    lng?: number;
  };
  category: string;
}

export interface NearbyHazardsResponse {
  location: GeoLocation;
  weather: WeatherData | null;
  seismic: SeismicData | null;
  airQuality: AirQualityData | null;
  ndrrmc: HazardAlert[] | null;
  health: HazardAlert[] | null;
  timestamp: string;
}

export interface UserPreferences {
  filters: string[];
  favoriteLocations: GeoLocation[];
  notificationTopics: string[];
}

// ─── Fire Reports ───

export interface FireIncident {
  id: string;
  source: string;
  lat?: number;
  lng?: number;
  date?: string;
  time?: string;
  confidence?: string;
  brightness?: number | null;
  type: 'satellite-hotspot' | 'news-report' | 'bfp-report';
  title?: string;
  description?: string;
  url?: string;
  imageUrl?: string;
  publishedAt?: string;
  distance?: number;
}

export interface FireIncidentsResponse {
  satelliteHotspots: FireIncident[];
  newsReports: FireIncident[];
  bfpReports: FireIncident[];
  totalCount: number;
  timestamp: string;
}

// ─── Utility Advisories (Water, Electric, Internet) ───

export type UtilityType = 'water' | 'electric' | 'internet';

export interface UtilityProvider {
  name: string;
  area: string;
  feedUrl?: string;
}

export interface UtilityNewsReport {
  id: string;
  utilityType: UtilityType;
  source: string;
  title: string;
  description: string;
  url: string;
  imageUrl?: string;
  publishedAt: string;
}

export interface ScheduledInterruption {
  id: string;
  utilityType: UtilityType;
  provider: string;
  area: string;
  startDate: string;
  endDate: string;
  reason: string;
  source: string;
}

export interface UtilityAdvisoryResponse {
  utilityType: UtilityType;
  providers: UtilityProvider[];
  newsReports: UtilityNewsReport[];
  scheduledInterruptions: ScheduledInterruption[];
  timestamp: string;
}

export interface AllUtilityAdvisoriesResponse {
  water: UtilityAdvisoryResponse | null;
  electric: UtilityAdvisoryResponse | null;
  internet: UtilityAdvisoryResponse | null;
  timestamp: string;
}

// ─── LGU Officials & Civic Governance ───

export type OfficialLevel = 'barangay' | 'municipal' | 'city' | 'provincial';

export interface LGUOfficial {
  id: string;
  name: string;
  position: string;
  level: OfficialLevel;
  area: string;
  phone?: string;
  email?: string;
  photo?: string;
  facebookUrl?: string;
  websiteUrl?: string;
  updatedAt?: string;
  source?: string;
  termStart?: string;
}

export interface AreaInfo {
  barangay: string | null;
  city: string | null;
  province: string | null;
  region: string | null;
  country: string;
  displayName: string;
  psgcCode: string | null;
  isCity: boolean;
}

export interface Facility {
  id: string;
  name: string;
  type: 'police' | 'fire_station' | 'hospital' | 'clinic';
  lat: number;
  lng: number;
  phone?: string | null;
  website?: string | null;
  address?: string | null;
  operator?: string | null;
}

export interface LGUByLocationResponse {
  area: AreaInfo;
  barangayOfficials: LGUOfficial[];
  cityOfficials: LGUOfficial[];
  facilities: Facility[];
  psgcBarangayCount: number | null;
  dataSources: string[];
  timestamp: string;
}

export interface CivicRepresentatives {
  offices: { name: string; divisionId: string; officialIndices: number[] }[];
  officials: { name: string; party: string; phones?: string[]; urls?: { type: string; value: string }[]; photoUrl?: string }[];
  divisions: Record<string, { name: string; officeIndices: number[] }>;
}

// ─── Notification Types ──────────────────────────────────────────────

export type NotificationTopic =
  | 'hazard-weather'
  | 'hazard-seismic'
  | 'hazard-ndrrmc'
  | 'fire-alerts'
  | 'utility-advisories'
  | 'civic-news';

export interface NotificationLogEntry {
  id: string;
  topic: NotificationTopic;
  title: string;
  body: string;
  itemCount: number;
  sentAt: string;
}

export interface NotificationStatus {
  running: boolean;
  pollIntervalMs: number;
  topics: NotificationTopic[];
}
