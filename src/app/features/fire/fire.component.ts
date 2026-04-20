import { Component, inject, signal, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FireService } from '../../core/services/fire.service';
import { LocationService } from '../../core/services/location.service';
import { FireIncidentsResponse } from '../../core/models/hazard.model';

@Component({
  selector: 'app-fire',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-gray-50">
      <header class="bg-red-700 text-white px-4 py-6">
        <div class="max-w-4xl mx-auto">
          <h1 class="text-2xl font-bold">🔥 Fire Reports</h1>
          <p class="text-red-200 mt-1">Fire incidents, satellite hotspots & BFP reports</p>
        </div>
      </header>

      <!-- Filter Panel -->
      <div class="bg-white shadow-sm border-b">
        <div class="max-w-4xl mx-auto px-4 py-4 space-y-3">
          <div class="flex flex-wrap gap-4 items-end">
            <div>
              <label for="date-from" class="block text-sm font-medium text-gray-700">From</label>
              <input id="date-from" type="date" [(ngModel)]="dateFrom"
                     class="mt-1 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:outline-none" />
            </div>
            <div>
              <label for="date-to" class="block text-sm font-medium text-gray-700">To</label>
              <input id="date-to" type="date" [(ngModel)]="dateTo"
                     class="mt-1 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:outline-none" />
            </div>
            <div>
              <label for="fire-location" class="block text-sm font-medium text-gray-700">City / Region</label>
              <input id="fire-location" type="text" [(ngModel)]="locationFilter"
                     placeholder="e.g. Cavite, Metro Manila"
                     class="mt-1 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:outline-none w-48" />
            </div>
            <div class="flex items-center gap-2">
              <label for="fire-radius" class="text-sm text-gray-600">Radius:</label>
              <input id="fire-radius" type="range" [min]="1" [max]="50"
                     [value]="locationService.radius()"
                     (input)="onRadiusChange($event)"
                     class="w-24" aria-label="Search radius in kilometers" />
              <span class="text-sm font-medium">{{ locationService.radius() }} km</span>
            </div>
            <button (click)="search()"
                    class="bg-red-600 text-white px-5 py-2 rounded-lg hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500">
              Search
            </button>
          </div>
        </div>
      </div>

      <!-- Results -->
      <div class="max-w-4xl mx-auto px-4 py-6 space-y-6">
        @if (isLoading()) {
          <div class="text-center py-8" role="status">
            <div class="inline-block w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
            <p class="text-gray-500 mt-3">Searching fire incidents...</p>
          </div>
        } @else if (data()) {
          <!-- Summary -->
          <div class="bg-white rounded-lg shadow p-4">
            <p class="text-sm text-gray-500">
              Found <strong class="text-red-700">{{ data()!.totalCount }}</strong> incident(s) —
              {{ data()!.satelliteHotspots.length }} satellite hotspots,
              {{ data()!.newsReports.length }} news reports,
              {{ data()!.bfpReports.length }} BFP reports
            </p>
          </div>

          <!-- Satellite Hotspots -->
          @if (data()!.satelliteHotspots.length > 0) {
            <section aria-labelledby="satellite-heading">
              <h2 id="satellite-heading" class="text-lg font-semibold mb-3">🛰️ Satellite Hotspots (NASA FIRMS)</h2>
              <div class="space-y-3">
                @for (spot of data()!.satelliteHotspots; track spot.id) {
                  <div class="bg-white rounded-lg shadow p-4 border-l-4 border-orange-500">
                    <div class="flex justify-between items-start">
                      <div>
                        <h3 class="font-medium text-gray-800">Fire Hotspot Detected</h3>
                        <p class="text-sm text-gray-500 mt-1">
                          📍 {{ spot.lat?.toFixed(4) }}, {{ spot.lng?.toFixed(4) }}
                          @if (spot.distance != null) {
                            · {{ spot.distance.toFixed(1) }} km away
                          }
                        </p>
                        <p class="text-sm text-gray-500">📅 {{ spot.date }} {{ spot.time }}</p>
                      </div>
                      <span class="text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-700">
                        Confidence: {{ spot.confidence }}
                      </span>
                    </div>
                  </div>
                }
              </div>
            </section>
          }

          <!-- News Reports -->
          @if (data()!.newsReports.length > 0) {
            <section aria-labelledby="news-heading">
              <h2 id="news-heading" class="text-lg font-semibold mb-3">📰 News Reports</h2>
              <div class="space-y-3">
                @for (article of data()!.newsReports; track article.id) {
                  <a [href]="article.url" target="_blank" rel="noopener noreferrer"
                     class="block bg-white rounded-lg shadow p-4 border-l-4 border-red-500 hover:shadow-md transition-shadow">
                    <h3 class="font-medium text-gray-800">{{ article.title }}</h3>
                    <p class="text-sm text-gray-500 mt-1 line-clamp-2">{{ article.description }}</p>
                    <p class="text-xs text-gray-400 mt-2">{{ article.source }} · {{ article.publishedAt | date:'medium' }}</p>
                  </a>
                }
              </div>
            </section>
          }

          <!-- BFP Reports -->
          @if (data()!.bfpReports.length > 0) {
            <section aria-labelledby="bfp-heading">
              <h2 id="bfp-heading" class="text-lg font-semibold mb-3">🚒 BFP Official Reports</h2>
              <div class="space-y-3">
                @for (report of data()!.bfpReports; track report.id) {
                  <div class="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
                    <h3 class="font-medium text-gray-800">{{ report.title }}</h3>
                    <p class="text-sm text-gray-500 mt-1">{{ report.description }}</p>
                  </div>
                }
              </div>
            </section>
          }
        } @else {
          <div class="text-center py-12">
            <p class="text-5xl mb-4">🔥</p>
            <p class="text-gray-500">Set your date range and location, then tap <strong>Search</strong> to find fire incidents.</p>
          </div>
        }
      </div>
    </div>
  `,
})
export class FireComponent implements OnInit {
  readonly locationService = inject(LocationService);
  private readonly fireService = inject(FireService);

  readonly data = signal<FireIncidentsResponse | null>(null);
  readonly isLoading = signal(false);

  dateFrom = '';
  dateTo = '';
  locationFilter = '';

  ngOnInit(): void {
    // Set default date range: last 7 days
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    this.dateTo = now.toISOString().split('T')[0];
    this.dateFrom = weekAgo.toISOString().split('T')[0];
  }

  onRadiusChange(event: Event): void {
    const value = parseInt((event.target as HTMLInputElement).value, 10);
    this.locationService.setRadius(value);
  }

  search(): void {
    this.isLoading.set(true);
    const loc = this.locationService.currentLocation();

    this.fireService.getIncidents({
      lat: loc?.lat,
      lng: loc?.lng,
      radius: this.locationService.radius(),
      dateFrom: this.dateFrom || undefined,
      dateTo: this.dateTo || undefined,
      location: this.locationFilter || undefined,
    }).subscribe({
      next: (result) => {
        this.data.set(result);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }
}
