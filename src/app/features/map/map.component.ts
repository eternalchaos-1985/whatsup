import { Component, inject, signal, OnInit, OnDestroy, ChangeDetectionStrategy, ElementRef, viewChild, afterNextRender } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LocationService } from '../../core/services/location.service';
import { HazardService } from '../../core/services/hazard.service';
import * as L from 'leaflet';

@Component({
  selector: 'app-map',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="h-screen flex flex-col">
      <header class="bg-white shadow-sm px-4 py-3 flex items-center gap-4 z-10">
        <h2 class="font-semibold text-lg">Interactive Map</h2>
        <div class="flex items-center gap-2 ml-auto">
          <label for="map-radius" class="text-sm text-gray-600">Radius:</label>
          <input
            id="map-radius"
            type="range"
            [min]="1"
            [max]="50"
            [value]="locationService.radius()"
            (input)="onRadiusChange($event)"
            class="w-32"
            aria-label="Map radius in kilometers" />
          <span class="text-sm font-medium">{{ locationService.radius() }} km</span>
        </div>
      </header>
      <div #mapContainer class="flex-1" role="application" aria-label="Hazard map"></div>
    </div>
  `,
})
export class MapComponent implements OnInit, OnDestroy {
  readonly locationService = inject(LocationService);
  private readonly hazardService = inject(HazardService);

  private readonly mapEl = viewChild.required<ElementRef>('mapContainer');

  private map: L.Map | null = null;
  private radiusCircle: L.Circle | null = null;
  private markersLayer: L.LayerGroup = L.layerGroup();

  constructor() {
    afterNextRender(() => {
      this.initMap();
    });
  }

  ngOnInit(): void {
    if (!this.locationService.hasLocation()) {
      this.locationService.detectLocation().catch(() => {});
    }
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  onRadiusChange(event: Event): void {
    const value = parseInt((event.target as HTMLInputElement).value, 10);
    this.locationService.setRadius(value);
    this.updateRadiusCircle();
  }

  private initMap(): void {
    const loc = this.locationService.currentLocation();
    const center: L.LatLngExpression = loc ? [loc.lat, loc.lng] : [14.5995, 120.9842]; // Default: Manila

    this.map = L.map(this.mapEl().nativeElement, {
      center,
      zoom: 12,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(this.map);

    this.markersLayer.addTo(this.map);

    if (loc) {
      L.marker([loc.lat, loc.lng])
        .addTo(this.map)
        .bindPopup('📍 Your Location')
        .openPopup();

      this.updateRadiusCircle();
    }
  }

  private updateRadiusCircle(): void {
    const loc = this.locationService.currentLocation();
    if (!loc || !this.map) return;

    if (this.radiusCircle) {
      this.map.removeLayer(this.radiusCircle);
    }

    this.radiusCircle = L.circle([loc.lat, loc.lng], {
      radius: this.locationService.radius() * 1000,
      color: '#3b82f6',
      fillColor: '#3b82f680',
      fillOpacity: 0.15,
      weight: 2,
    }).addTo(this.map);

    this.map.fitBounds(this.radiusCircle.getBounds());
  }
}
