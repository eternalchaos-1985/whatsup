import { Component, inject, signal, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HazardService } from '../../core/services/hazard.service';
import { LocationService } from '../../core/services/location.service';
import { NotificationService } from '../../core/services/notification.service';
import { NearbyHazardsResponse } from '../../core/models/hazard.model';

@Component({
  selector: 'app-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- Header -->
      <header class="bg-red-600 text-white shadow-lg">
        <div class="max-w-7xl mx-auto px-4 py-6">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-3xl font-bold">WhatsUp</h1>
              <p class="text-red-100 mt-1">Civic & Hazard Detection Platform</p>
            </div>
            <a routerLink="/notifications" class="relative p-2 rounded-full hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-white" aria-label="Notifications">
              <span class="text-2xl">🔔</span>
              @if (notificationService.unreadCount() > 0) {
                <span class="absolute -top-1 -right-1 bg-yellow-400 text-red-900 text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {{ notificationService.unreadCount() > 9 ? '9+' : notificationService.unreadCount() }}
                </span>
              }
            </a>
          </div>
        </div>
      </header>

      <!-- Location Bar -->
      <div class="bg-white shadow-sm border-b">
        <div class="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4 flex-wrap">
          <button
            (click)="detectLocation()"
            class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            [disabled]="locationService.isLoading()"
            [attr.aria-busy]="locationService.isLoading()">
            @if (locationService.isLoading()) {
              Detecting...
            } @else {
              📍 Detect Location
            }
          </button>

          <div class="flex items-center gap-2">
            <label for="radius-slider" class="text-sm text-gray-600">Radius:</label>
            <input
              id="radius-slider"
              type="range"
              [min]="1"
              [max]="50"
              [value]="locationService.radius()"
              (input)="onRadiusChange($event)"
              class="w-32"
              aria-label="Search radius in kilometers" />
            <span class="text-sm font-medium text-gray-700">{{ locationService.radius() }} km</span>
          </div>

          @if (locationService.currentLocation(); as loc) {
            <span class="text-sm text-gray-500">
              {{ loc.name }} ({{ loc.lat.toFixed(4) }}, {{ loc.lng.toFixed(4) }})
            </span>
          }

          @if (locationService.error(); as err) {
            <span class="text-sm text-red-500" role="alert">{{ err }}</span>
          }
        </div>
      </div>

      <!-- Quick Nav -->
      <div class="max-w-7xl mx-auto px-4 py-4">
        <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          <a routerLink="/map"
             class="bg-white rounded-xl shadow p-4 text-center hover:shadow-md transition-shadow focus:outline-none focus:ring-2 focus:ring-blue-500">
            <span class="text-2xl">🗺️</span>
            <p class="text-sm font-medium mt-1">Map View</p>
          </a>
          <a routerLink="/hazards"
             class="bg-white rounded-xl shadow p-4 text-center hover:shadow-md transition-shadow focus:outline-none focus:ring-2 focus:ring-red-500">
            <span class="text-2xl">⚠️</span>
            <p class="text-sm font-medium mt-1">Hazard Alerts</p>
          </a>
          <a routerLink="/emergency"
             class="bg-red-50 rounded-xl shadow p-4 text-center hover:shadow-md transition-shadow border-2 border-red-200 focus:outline-none focus:ring-2 focus:ring-red-500">
            <span class="text-2xl">🚨</span>
            <p class="text-sm font-medium mt-1 text-red-700">Emergency</p>
          </a>
          <a routerLink="/fire"
             class="bg-orange-50 rounded-xl shadow p-4 text-center hover:shadow-md transition-shadow border-2 border-orange-200 focus:outline-none focus:ring-2 focus:ring-orange-500">
            <span class="text-2xl">🔥</span>
            <p class="text-sm font-medium mt-1 text-orange-700">Fire Reports</p>
          </a>
          <a routerLink="/utilities"
             class="bg-blue-50 rounded-xl shadow p-4 text-center hover:shadow-md transition-shadow border-2 border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <span class="text-2xl">🔧</span>
            <p class="text-sm font-medium mt-1 text-blue-700">Utilities</p>
          </a>
          <a routerLink="/officials"
             class="bg-indigo-50 rounded-xl shadow p-4 text-center hover:shadow-md transition-shadow border-2 border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <span class="text-2xl">🏛️</span>
            <p class="text-sm font-medium mt-1 text-indigo-700">Officials</p>
          </a>
          <a routerLink="/community"
             class="bg-white rounded-xl shadow p-4 text-center hover:shadow-md transition-shadow focus:outline-none focus:ring-2 focus:ring-green-500">
            <span class="text-2xl">📰</span>
            <p class="text-sm font-medium mt-1">Community</p>
          </a>
          <a routerLink="/notifications"
             class="bg-amber-50 rounded-xl shadow p-4 text-center hover:shadow-md transition-shadow border-2 border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500 relative">
            <span class="text-2xl">🔔</span>
            <p class="text-sm font-medium mt-1 text-amber-700">Notifications</p>
            @if (notificationService.unreadCount() > 0) {
              <span class="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {{ notificationService.unreadCount() > 9 ? '9+' : notificationService.unreadCount() }}
              </span>
            }
          </a>
        </div>
      </div>

      <!-- Alert Summary -->
      <div class="max-w-7xl mx-auto px-4 pb-8">
        @if (isLoading()) {
          <div class="text-center py-12" role="status" aria-label="Loading hazard data">
            <div class="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p class="text-gray-500 mt-3">Loading hazard data...</p>
          </div>
        } @else if (hazardData()) {
          <div class="space-y-6">
            <!-- Weather Alerts -->
            <section aria-labelledby="weather-heading">
              <h2 id="weather-heading" class="text-lg font-semibold text-gray-800 mb-3">🌦️ Weather Alerts</h2>
              <div class="grid md:grid-cols-3 gap-4">
                <div class="bg-white rounded-lg shadow p-4">
                  <h3 class="font-medium text-gray-700">Typhoons</h3>
                  <p class="text-sm text-gray-500 mt-1">
                    {{ hazardData()?.weather?.typhoons ? 'Active warnings' : 'No current warnings' }}
                  </p>
                </div>
                <div class="bg-white rounded-lg shadow p-4">
                  <h3 class="font-medium text-gray-700">Floods</h3>
                  <p class="text-sm text-gray-500 mt-1">
                    {{ hazardData()?.weather?.floods ? 'Active alerts' : 'No current alerts' }}
                  </p>
                </div>
                <div class="bg-white rounded-lg shadow p-4">
                  <h3 class="font-medium text-gray-700">Rainfall</h3>
                  <p class="text-sm text-gray-500 mt-1">
                    {{ hazardData()?.weather?.rainfall ? 'Warnings issued' : 'Normal conditions' }}
                  </p>
                </div>
              </div>
            </section>

            <!-- Seismic Alerts -->
            <section aria-labelledby="seismic-heading">
              <h2 id="seismic-heading" class="text-lg font-semibold text-gray-800 mb-3">🌍 Seismic Activity</h2>
              <div class="grid md:grid-cols-3 gap-4">
                <div class="bg-white rounded-lg shadow p-4">
                  <h3 class="font-medium text-gray-700">Earthquakes</h3>
                  <p class="text-sm text-gray-500 mt-1">
                    {{ hazardData()?.seismic?.earthquakes ? 'Recent activity detected' : 'No recent activity' }}
                  </p>
                </div>
                <div class="bg-white rounded-lg shadow p-4">
                  <h3 class="font-medium text-gray-700">Volcanic Activity</h3>
                  <p class="text-sm text-gray-500 mt-1">
                    {{ hazardData()?.seismic?.volcanic ? 'Monitoring active' : 'Normal levels' }}
                  </p>
                </div>
                <div class="bg-white rounded-lg shadow p-4">
                  <h3 class="font-medium text-gray-700">Tsunami</h3>
                  <p class="text-sm text-gray-500 mt-1">
                    {{ hazardData()?.seismic?.tsunami ? 'Warning active' : 'No warnings' }}
                  </p>
                </div>
              </div>
            </section>

            <!-- Air Quality -->
            @if (hazardData()?.airQuality; as aq) {
              <section aria-labelledby="air-heading">
                <h2 id="air-heading" class="text-lg font-semibold text-gray-800 mb-3">🌱 Air Quality</h2>
                <div class="bg-white rounded-lg shadow p-4">
                  <div class="flex items-center gap-4">
                    <div class="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-lg"
                         [style.background-color]="aq.level?.color || '#ccc'">
                      {{ aq.aqi }}
                    </div>
                    <div>
                      <p class="font-medium">{{ aq.level?.level || 'Unknown' }}</p>
                      <p class="text-sm text-gray-500">{{ aq.level?.advice || 'No data available' }}</p>
                    </div>
                  </div>
                </div>
              </section>
            }
          </div>
        } @else {
          <div class="text-center py-12">
            <p class="text-gray-500">Detect your location or enter it manually to see nearby hazards and alerts.</p>
          </div>
        }
      </div>
    </div>
  `,
})
export class DashboardComponent implements OnInit {
  readonly locationService = inject(LocationService);
  readonly notificationService = inject(NotificationService);
  private readonly hazardService = inject(HazardService);

  readonly hazardData = signal<NearbyHazardsResponse | null>(null);
  readonly isLoading = signal(false);

  ngOnInit(): void {
    this.detectLocation();
  }

  async detectLocation(): Promise<void> {
    try {
      const location = await this.locationService.detectLocation();
      this.loadHazardData(location.lat, location.lng);
    } catch {
      // Error is already set in LocationService
    }
  }

  onRadiusChange(event: Event): void {
    const value = parseInt((event.target as HTMLInputElement).value, 10);
    this.locationService.setRadius(value);
    const loc = this.locationService.currentLocation();
    if (loc) {
      this.loadHazardData(loc.lat, loc.lng);
    }
  }

  private loadHazardData(lat: number, lng: number): void {
    this.isLoading.set(true);
    this.hazardService.getNearby(lat, lng, this.locationService.radius()).subscribe({
      next: (data) => {
        this.hazardData.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }
}
