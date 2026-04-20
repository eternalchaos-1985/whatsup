import { Component, inject, signal, computed, OnInit, OnDestroy, ChangeDetectionStrategy, ElementRef, viewChild, afterNextRender } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LocationService } from '../../core/services/location.service';
import { HazardService } from '../../core/services/hazard.service';
import { FireService } from '../../core/services/fire.service';
import { CommunityService } from '../../core/services/community.service';
import { UtilityService } from '../../core/services/utility.service';
import {
  HazardAlert, EarthquakeEvent, FireIncident, NewsArticle,
  CommunityEvent, UtilityNewsReport
} from '../../core/models/hazard.model';
import * as L from 'leaflet';

type LayerKey = 'hazards' | 'earthquakes' | 'fire' | 'news' | 'events' | 'utilities';

interface MapLayer {
  key: LayerKey;
  label: string;
  icon: string;
  color: string;
  active: boolean;
}

interface SidePanelItem {
  id: string;
  layer: LayerKey;
  icon: string;
  color: string;
  title: string;
  subtitle: string;
  detail?: string;
  timestamp?: string;
  severity?: string;
  lat?: number;
  lng?: number;
  url?: string;
}

@Component({
  selector: 'app-map',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="h-screen flex flex-col relative">
      <!-- Header -->
      <header class="bg-white shadow-sm px-4 py-3 flex items-center gap-3 z-20">
        <h2 class="font-semibold text-lg shrink-0">Map</h2>
        <div class="flex items-center gap-2 ml-auto">
          <label for="map-radius" class="text-sm text-gray-600 hidden sm:inline">Radius:</label>
          <input id="map-radius" type="range" [min]="1" [max]="50"
            [value]="locationService.radius()" (input)="onRadiusChange($event)"
            class="w-20 sm:w-24" aria-label="Map radius in kilometers" />
          <span class="text-sm font-medium w-12">{{ locationService.radius() }} km</span>
          <button (click)="panelOpen.set(!panelOpen())"
            class="ml-2 p-2 rounded-lg border border-gray-300 hover:bg-gray-100 lg:hidden"
            [attr.aria-expanded]="panelOpen()" aria-label="Toggle side panel">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
          </button>
        </div>
      </header>

      <!-- Layer toggle strip -->
      <div class="bg-white border-b px-4 py-2 flex gap-2 overflow-x-auto z-20">
        @for (layer of layers(); track layer.key) {
          <button (click)="toggleLayer(layer.key)"
            [class]="'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors whitespace-nowrap ' +
              (layer.active ? 'text-white border-transparent' : 'text-gray-600 border-gray-300 bg-white hover:bg-gray-50')"
            [style]="layer.active ? 'background-color:' + layer.color : ''"
            [attr.aria-pressed]="layer.active">
            <span>{{ layer.icon }}</span>
            <span>{{ layer.label }}</span>
            @if (layerCounts()[layer.key]; as count) {
              <span class="bg-white/30 rounded-full px-1.5 text-[10px]">{{ count }}</span>
            }
          </button>
        }
      </div>

      <!-- Main content: map + side panel -->
      <div class="flex-1 flex overflow-hidden relative">
        <!-- Map -->
        <div #mapContainer class="flex-1" role="application" aria-label="Hazard map"></div>

        <!-- Side panel (desktop: always visible, mobile: slide-over) -->
        <aside [class]="'flex flex-col bg-white border-l shadow-lg z-30 transition-transform duration-300 ' +
          (panelOpen() ? 'translate-x-0' : 'translate-x-full') +
          ' absolute right-0 top-0 bottom-0 w-80 lg:relative lg:translate-x-0 lg:w-96 lg:shadow-none'">
          <div class="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
            <h3 class="font-semibold text-sm">
              Events & Alerts
              @if (panelItems().length > 0) {
                <span class="text-gray-400 font-normal">({{ panelItems().length }})</span>
              }
            </h3>
            <button (click)="panelOpen.set(false)" class="p-1 rounded lg:hidden hover:bg-gray-200">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <!-- Panel content -->
          <div class="flex-1 overflow-y-auto">
            @if (panelItems().length === 0) {
              <div class="p-8 text-center text-gray-400 text-sm">
                <div class="text-3xl mb-2">🗺️</div>
                <div>Toggle layers above to see events</div>
              </div>
            } @else {
              @for (item of panelItems(); track item.id) {
                <button (click)="focusItem(item)" class="w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-blue-50 transition-colors">
                  <div class="flex gap-3">
                    <span class="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm text-white"
                      [style]="'background:' + item.color">{{ item.icon }}</span>
                    <div class="min-w-0 flex-1">
                      <div class="font-medium text-sm truncate">{{ item.title }}</div>
                      <div class="text-xs text-gray-500 truncate">{{ item.subtitle }}</div>
                      @if (item.detail) {
                        <div class="text-xs text-gray-400 mt-0.5 line-clamp-2">{{ item.detail }}</div>
                      }
                      <div class="flex items-center gap-2 mt-1">
                        @if (item.severity) {
                          <span class="text-[10px] px-1.5 py-0.5 rounded-full text-white font-medium"
                            [style]="'background:' + severityColor(item.severity)">{{ item.severity | uppercase }}</span>
                        }
                        @if (item.timestamp) {
                          <span class="text-[10px] text-gray-400">{{ item.timestamp | date:'short' }}</span>
                        }
                      </div>
                    </div>
                  </div>
                </button>
              }
            }
          </div>
        </aside>

        <!-- Mobile backdrop -->
        @if (panelOpen()) {
          <div (click)="panelOpen.set(false)" class="absolute inset-0 bg-black/20 z-20 lg:hidden"></div>
        }
      </div>

      <!-- Loading -->
      @if (loading()) {
        <div class="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 text-white text-sm px-4 py-2 rounded-full z-40">
          Loading map data…
        </div>
      }
    </div>
  `,
})
export class MapComponent implements OnInit, OnDestroy {
  readonly locationService = inject(LocationService);
  private readonly hazardService = inject(HazardService);
  private readonly fireService = inject(FireService);
  private readonly communityService = inject(CommunityService);
  private readonly utilityService = inject(UtilityService);

  private readonly mapEl = viewChild.required<ElementRef>('mapContainer');

  private map: L.Map | null = null;
  private radiusCircle: L.Circle | null = null;
  private userMarker: L.Marker | null = null;

  // One layer group per data category
  private layerGroups: Record<LayerKey, L.LayerGroup> = {
    hazards: L.layerGroup(),
    earthquakes: L.layerGroup(),
    fire: L.layerGroup(),
    news: L.layerGroup(),
    events: L.layerGroup(),
    utilities: L.layerGroup(),
  };

  readonly loading = signal(false);
  readonly layerCounts = signal<Partial<Record<LayerKey, number>>>({});
  readonly panelOpen = signal(false);
  readonly panelItems = signal<SidePanelItem[]>([]);

  readonly layers = signal<MapLayer[]>([
    { key: 'hazards', label: 'Weather Alerts', icon: '🌀', color: '#ef4444', active: false },
    { key: 'earthquakes', label: 'Earthquakes', icon: '🔴', color: '#f97316', active: false },
    { key: 'fire', label: 'Fire Incidents', icon: '🔥', color: '#dc2626', active: false },
    { key: 'news', label: 'News', icon: '📰', color: '#8b5cf6', active: false },
    { key: 'events', label: 'Community', icon: '👥', color: '#06b6d4', active: false },
    { key: 'utilities', label: 'Utilities', icon: '⚡', color: '#eab308', active: false },
  ]);

  readonly anyLayerActive = signal(false);

  focusItem(item: SidePanelItem): void {
    if (item.lat != null && item.lng != null && this.map) {
      this.map.setView([item.lat, item.lng], 13);
      // Open popup for the matching marker
      const group = this.layerGroups[item.layer];
      group.eachLayer((layer: any) => {
        const latlng = layer.getLatLng?.();
        if (latlng && Math.abs(latlng.lat - item.lat!) < 0.001 && Math.abs(latlng.lng - item.lng!) < 0.001) {
          layer.openPopup();
        }
      });
      // Close panel on mobile
      if (window.innerWidth < 1024) this.panelOpen.set(false);
    }
  }

  severityColor(severity: string): string {
    switch (severity) {
      case 'critical': return '#dc2626';
      case 'high': return '#f97316';
      case 'moderate': return '#eab308';
      default: return '#22c55e';
    }
  }

  constructor() {
    afterNextRender(() => {
      this.initMap();
    });
  }

  ngOnInit(): void {
    if (!this.locationService.hasLocation()) {
      this.locationService.detectLocation().then(() => this.onLocationReady()).catch(() => {});
    }
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  onRadiusChange(event: Event): void {
    const value = parseInt((event.target as HTMLInputElement).value, 10);
    this.locationService.setRadius(value);
    this.updateRadiusCircle();
    this.refreshActiveLayers();
  }

  toggleLayer(key: LayerKey): void {
    const updated = this.layers().map(l =>
      l.key === key ? { ...l, active: !l.active } : l
    );
    this.layers.set(updated);
    this.anyLayerActive.set(updated.some(l => l.active));

    const layer = updated.find(l => l.key === key)!;
    if (layer.active) {
      this.loadLayerData(key);
      this.layerGroups[key].addTo(this.map!);
    } else {
      this.layerGroups[key].clearLayers();
      this.map?.removeLayer(this.layerGroups[key]);
      this.layerCounts.update(c => { const copy = { ...c }; delete copy[key]; return copy; });
      this.panelItems.update(items => items.filter(i => i.layer !== key));
    }
  }

  // ── Map setup ──

  private initMap(): void {
    const loc = this.locationService.currentLocation();
    const center: L.LatLngExpression = loc ? [loc.lat, loc.lng] : [14.5995, 120.9842];

    this.map = L.map(this.mapEl().nativeElement, {
      center,
      zoom: 11,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(this.map);

    if (loc) {
      this.placeUserMarker(loc.lat, loc.lng);
      this.updateRadiusCircle();
    }
  }

  private onLocationReady(): void {
    const loc = this.locationService.currentLocation();
    if (!loc || !this.map) return;
    this.map.setView([loc.lat, loc.lng], 11);
    this.placeUserMarker(loc.lat, loc.lng);
    this.updateRadiusCircle();
    this.refreshActiveLayers();
  }

  private placeUserMarker(lat: number, lng: number): void {
    if (this.userMarker) this.map?.removeLayer(this.userMarker);
    this.userMarker = L.marker([lat, lng], {
      icon: this.createDivIcon('📍', '#3b82f6'),
      zIndexOffset: 1000,
    }).addTo(this.map!).bindPopup('<b>Your Location</b>');
  }

  private updateRadiusCircle(): void {
    const loc = this.locationService.currentLocation();
    if (!loc || !this.map) return;

    if (this.radiusCircle) this.map.removeLayer(this.radiusCircle);

    this.radiusCircle = L.circle([loc.lat, loc.lng], {
      radius: this.locationService.radius() * 1000,
      color: '#3b82f6',
      fillColor: '#3b82f680',
      fillOpacity: 0.1,
      weight: 2,
      dashArray: '6 4',
    }).addTo(this.map);

    this.map.fitBounds(this.radiusCircle.getBounds(), { padding: [30, 30] });
  }

  // ── Data loading per layer ──

  private refreshActiveLayers(): void {
    for (const layer of this.layers()) {
      if (layer.active) this.loadLayerData(layer.key);
    }
  }

  private loadLayerData(key: LayerKey): void {
    this.loading.set(true);
    switch (key) {
      case 'hazards': this.loadHazards(); break;
      case 'earthquakes': this.loadEarthquakes(); break;
      case 'fire': this.loadFire(); break;
      case 'news': this.loadNews(); break;
      case 'events': this.loadEvents(); break;
      case 'utilities': this.loadUtilities(); break;
    }
  }

  private loadHazards(): void {
    this.hazardService.getAll().subscribe({
      next: (data) => {
        const group = this.layerGroups['hazards'];
        group.clearLayers();
        let count = 0;
        const items: SidePanelItem[] = [];

        const addAlerts = (alerts: HazardAlert[] | null, emoji: string) => {
          if (!alerts) return;
          for (const a of alerts) {
            if (!a.location) continue;
            count++;
            L.marker([a.location.lat, a.location.lng], {
              icon: this.createDivIcon(emoji, this.severityColor(a.severity)),
            }).bindPopup(this.hazardPopup(a)).addTo(group);
            items.push({
              id: a.id || `hazard-${count}`,
              layer: 'hazards',
              icon: emoji,
              color: this.severityColor(a.severity),
              title: a.title,
              subtitle: a.source,
              detail: a.description?.slice(0, 120),
              timestamp: a.timestamp,
              severity: a.severity,
              lat: a.location.lat,
              lng: a.location.lng,
            });
          }
        };

        addAlerts(data.weather?.typhoons, '🌀');
        addAlerts(data.weather?.floods, '🌊');
        addAlerts(data.weather?.rainfall, '🌧️');
        addAlerts(data.seismic?.volcanic, '🌋');
        addAlerts(data.seismic?.tsunami, '🌊');

        this.layerCounts.update(c => ({ ...c, hazards: count }));
        this.panelItems.update(prev => [...prev.filter(i => i.layer !== 'hazards'), ...items]);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private loadEarthquakes(): void {
    this.hazardService.getEarthquakes().subscribe({
      next: (data: any) => {
        const group = this.layerGroups['earthquakes'];
        group.clearLayers();
        const quakes: EarthquakeEvent[] = Array.isArray(data) ? data : data?.earthquakes ?? [];
        const items: SidePanelItem[] = [];
        for (const eq of quakes) {
          const color = eq.magnitude >= 5 ? '#dc2626' : eq.magnitude >= 3 ? '#f97316' : '#eab308';
          L.circleMarker([eq.lat, eq.lng], {
            radius: Math.max(20, Math.min(40, eq.magnitude * 6)) / 3,
            color,
            fillColor: color,
            fillOpacity: 0.6,
            weight: 2,
          }).bindPopup(
            `<div class="text-sm">
              <div class="font-bold">🔴 M${eq.magnitude.toFixed(1)} Earthquake</div>
              <div class="text-gray-600">${eq.location}</div>
              <div>Depth: ${eq.depth} km</div>
              <div class="text-xs text-gray-500 mt-1">${new Date(eq.timestamp).toLocaleString()}</div>
              <div class="text-xs text-gray-400">Source: ${eq.source}</div>
            </div>`
          ).addTo(group);
          items.push({
            id: eq.id,
            layer: 'earthquakes',
            icon: '🔴',
            color,
            title: `M${eq.magnitude.toFixed(1)} Earthquake`,
            subtitle: eq.location,
            detail: `Depth: ${eq.depth} km`,
            timestamp: eq.timestamp,
            severity: eq.magnitude >= 5 ? 'high' : eq.magnitude >= 3 ? 'moderate' : 'low',
            lat: eq.lat,
            lng: eq.lng,
          });
        }
        this.layerCounts.update(c => ({ ...c, earthquakes: quakes.length }));
        this.panelItems.update(prev => [...prev.filter(i => i.layer !== 'earthquakes'), ...items]);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private loadFire(): void {
    const loc = this.locationService.currentLocation();
    const params: any = {};
    if (loc) {
      params.lat = loc.lat;
      params.lng = loc.lng;
      params.radius = this.locationService.radius();
    }
    this.fireService.getIncidents(params).subscribe({
      next: (data) => {
        const group = this.layerGroups['fire'];
        group.clearLayers();
        let count = 0;
        const items: SidePanelItem[] = [];

        for (const incident of [...data.satelliteHotspots, ...data.newsReports, ...data.bfpReports]) {
          if (incident.lat == null || incident.lng == null) continue;
          count++;
          L.marker([incident.lat, incident.lng], {
            icon: this.createDivIcon('🔥', '#dc2626'),
          }).bindPopup(this.firePopup(incident)).addTo(group);
          items.push({
            id: incident.id,
            layer: 'fire',
            icon: '🔥',
            color: '#dc2626',
            title: incident.title ?? 'Fire Incident',
            subtitle: `${incident.source} · ${incident.type}`,
            detail: incident.description?.slice(0, 120),
            timestamp: incident.date || incident.publishedAt,
            lat: incident.lat,
            lng: incident.lng,
            url: incident.url,
          });
        }
        this.layerCounts.update(c => ({ ...c, fire: count }));
        this.panelItems.update(prev => [...prev.filter(i => i.layer !== 'fire'), ...items]);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private loadNews(): void {
    const loc = this.locationService.currentLocation();
    this.communityService.getNews(loc?.name).subscribe({
      next: (articles) => {
        const group = this.layerGroups['news'];
        group.clearLayers();
        const items: SidePanelItem[] = [];
        if (loc && articles.length > 0) {
          L.marker([loc.lat, loc.lng + 0.005], {
            icon: this.createDivIcon('📰', '#8b5cf6'),
          }).bindPopup(this.newsListPopup(articles.slice(0, 8))).addTo(group);
        }
        for (const a of articles) {
          items.push({
            id: `news-${a.title?.slice(0, 20)}`,
            layer: 'news',
            icon: '📰',
            color: '#8b5cf6',
            title: a.title,
            subtitle: a.source,
            detail: a.description?.slice(0, 120),
            timestamp: a.publishedAt,
            lat: loc?.lat,
            lng: loc ? loc.lng + 0.005 : undefined,
            url: a.url,
          });
        }
        this.layerCounts.update(c => ({ ...c, news: articles.length }));
        this.panelItems.update(prev => [...prev.filter(i => i.layer !== 'news'), ...items]);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private loadEvents(): void {
    const loc = this.locationService.currentLocation();
    if (!loc) { this.loading.set(false); return; }
    this.communityService.getEvents(loc.lat, loc.lng, this.locationService.radius()).subscribe({
      next: (events) => {
        const group = this.layerGroups['events'];
        group.clearLayers();
        let count = 0;
        const items: SidePanelItem[] = [];
        for (const ev of events) {
          const lat = ev.venue?.lat;
          const lng = ev.venue?.lng;
          if (lat == null || lng == null) continue;
          count++;
          L.marker([lat, lng], {
            icon: this.createDivIcon('👥', '#06b6d4'),
          }).bindPopup(this.eventPopup(ev)).addTo(group);
          items.push({
            id: ev.id,
            layer: 'events',
            icon: '👥',
            color: '#06b6d4',
            title: ev.name,
            subtitle: ev.venue?.name || ev.category,
            detail: ev.description?.slice(0, 120),
            timestamp: ev.startDate,
            lat,
            lng,
            url: ev.url,
          });
        }
        if (count === 0 && events.length > 0 && loc) {
          L.marker([loc.lat - 0.005, loc.lng], {
            icon: this.createDivIcon('👥', '#06b6d4'),
          }).bindPopup(
            `<div class="text-sm"><b>Community Events (${events.length})</b><br>${events.slice(0, 5).map(e => e.name).join('<br>')}</div>`
          ).addTo(group);
          count = events.length;
          for (const ev of events) {
            items.push({
              id: ev.id,
              layer: 'events',
              icon: '👥',
              color: '#06b6d4',
              title: ev.name,
              subtitle: ev.category,
              detail: ev.description?.slice(0, 120),
              timestamp: ev.startDate,
            });
          }
        }
        this.layerCounts.update(c => ({ ...c, events: count }));
        this.panelItems.update(prev => [...prev.filter(i => i.layer !== 'events'), ...items]);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private loadUtilities(): void {
    const loc = this.locationService.currentLocation();
    this.utilityService.getAll(loc?.name).subscribe({
      next: (data) => {
        const group = this.layerGroups['utilities'];
        group.clearLayers();
        let count = 0;
        const items: SidePanelItem[] = [];
        const allNews: UtilityNewsReport[] = [
          ...(data.water?.newsReports ?? []),
          ...(data.electric?.newsReports ?? []),
          ...(data.internet?.newsReports ?? []),
        ];

        if (loc && allNews.length > 0) {
          count = allNews.length;
          const typeIcons: Record<string, string> = { water: '💧', electric: '⚡', internet: '📶' };
          L.marker([loc.lat, loc.lng - 0.005], {
            icon: this.createDivIcon('⚡', '#eab308'),
          }).bindPopup(
            `<div class="text-sm max-h-48 overflow-y-auto">
              <div class="font-bold mb-1">⚡ Utility Advisories (${count})</div>
              ${allNews.slice(0, 8).map(n =>
                `<div class="border-b pb-1 mb-1">
                  <div>${typeIcons[n.utilityType] ?? '⚡'} <b>${n.title}</b></div>
                  <div class="text-xs text-gray-500">${n.source} · ${new Date(n.publishedAt).toLocaleDateString()}</div>
                </div>`
              ).join('')}
            </div>`
          ).addTo(group);
        }

        for (const n of allNews) {
          const typeIcons: Record<string, string> = { water: '💧', electric: '⚡', internet: '📶' };
          items.push({
            id: n.id,
            layer: 'utilities',
            icon: typeIcons[n.utilityType] ?? '⚡',
            color: '#eab308',
            title: n.title,
            subtitle: `${n.source} · ${n.utilityType}`,
            timestamp: n.publishedAt,
            lat: loc?.lat,
            lng: loc ? loc.lng - 0.005 : undefined,
          });
        }

        this.layerCounts.update(c => ({ ...c, utilities: count }));
        this.panelItems.update(prev => [...prev.filter(i => i.layer !== 'utilities'), ...items]);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  // ── Popup builders ──

  private hazardPopup(a: HazardAlert): string {
    return `<div class="text-sm max-w-64">
      <div class="font-bold">${a.title}</div>
      <div class="inline-block px-1.5 py-0.5 rounded text-xs text-white mt-1" style="background:${this.severityColor(a.severity)}">${a.severity.toUpperCase()}</div>
      <div class="mt-1 text-gray-600 text-xs">${a.description?.slice(0, 150) ?? ''}${(a.description?.length ?? 0) > 150 ? '…' : ''}</div>
      <div class="text-xs text-gray-400 mt-1">Source: ${a.source} · ${new Date(a.timestamp).toLocaleString()}</div>
    </div>`;
  }

  private firePopup(f: FireIncident): string {
    return `<div class="text-sm max-w-64">
      <div class="font-bold">🔥 ${f.title ?? 'Fire Incident'}</div>
      <div class="text-xs text-gray-500">${f.source} · ${f.type}</div>
      ${f.description ? `<div class="mt-1 text-xs text-gray-600">${f.description.slice(0, 120)}</div>` : ''}
      ${f.confidence ? `<div class="text-xs mt-1">Confidence: ${f.confidence}</div>` : ''}
      ${f.brightness ? `<div class="text-xs">Brightness: ${f.brightness}</div>` : ''}
      ${f.date ? `<div class="text-xs text-gray-400 mt-1">${f.date} ${f.time ?? ''}</div>` : ''}
      ${f.url ? `<a href="${this.sanitizeUrl(f.url)}" target="_blank" rel="noopener" class="text-xs text-blue-600 mt-1 block">Read more →</a>` : ''}
    </div>`;
  }

  private eventPopup(ev: CommunityEvent): string {
    return `<div class="text-sm max-w-64">
      <div class="font-bold">👥 ${ev.name}</div>
      ${ev.description ? `<div class="text-xs text-gray-600 mt-1">${ev.description.slice(0, 120)}</div>` : ''}
      <div class="text-xs text-gray-500 mt-1">${new Date(ev.startDate).toLocaleDateString()}${ev.venue?.name ? ` · ${ev.venue.name}` : ''}</div>
      ${ev.url ? `<a href="${this.sanitizeUrl(ev.url)}" target="_blank" rel="noopener" class="text-xs text-blue-600 block mt-1">Details →</a>` : ''}
    </div>`;
  }

  private newsListPopup(articles: NewsArticle[]): string {
    return `<div class="text-sm max-w-72 max-h-56 overflow-y-auto">
      <div class="font-bold mb-1.5">📰 Latest News</div>
      ${articles.map(a =>
        `<div class="border-b pb-1 mb-1">
          <a href="${this.sanitizeUrl(a.url)}" target="_blank" rel="noopener" class="text-blue-700 font-medium text-xs hover:underline">${a.title}</a>
          <div class="text-[10px] text-gray-400">${a.source} · ${new Date(a.publishedAt).toLocaleDateString()}</div>
        </div>`
      ).join('')}
    </div>`;
  }

  // ── Helpers ──

  private createDivIcon(emoji: string, bgColor: string): L.DivIcon {
    return L.divIcon({
      html: `<div style="background:${bgColor};width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);font-size:14px;">${emoji}</div>`,
      className: '',
      iconSize: [28, 28],
      iconAnchor: [14, 14],
      popupAnchor: [0, -16],
    });
  }

  private sanitizeUrl(url: string): string {
    try {
      const parsed = new URL(url);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') return parsed.href;
    } catch {}
    return '#';
  }
}
