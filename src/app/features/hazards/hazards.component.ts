import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HazardService } from '../../core/services/hazard.service';
import { LocationService } from '../../core/services/location.service';

@Component({
  selector: 'app-hazards',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-gray-50">
      <header class="bg-orange-600 text-white px-4 py-6">
        <div class="max-w-4xl mx-auto">
          <h1 class="text-2xl font-bold">⚠️ Hazard Alerts</h1>
          <p class="text-orange-100 mt-1">Real-time environmental and safety warnings</p>
        </div>
      </header>

      <div class="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <!-- Filter Tabs -->
        <div class="flex gap-2 flex-wrap" role="tablist">
          @for (tab of tabs; track tab.id) {
            <button
              role="tab"
              [attr.aria-selected]="activeTab() === tab.id"
              (click)="activeTab.set(tab.id)"
              class="px-4 py-2 rounded-full text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500"
              [class]="activeTab() === tab.id ? 'bg-orange-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'">
              {{ tab.label }}
            </button>
          }
        </div>

        @if (isLoading()) {
          <div class="text-center py-8" role="status">
            <div class="inline-block w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
            <p class="text-gray-500 mt-3">Loading alerts...</p>
          </div>
        } @else {
          <!-- Weather Section -->
          @if (activeTab() === 'all' || activeTab() === 'weather') {
            <section aria-labelledby="weather-section">
              <h2 id="weather-section" class="text-lg font-semibold mb-3">🌦️ Weather</h2>
              <div class="space-y-3">
                <div class="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
                  <h3 class="font-medium">Typhoon Warnings</h3>
                  <p class="text-sm text-gray-500 mt-1">Data from PAGASA tropical cyclone bulletins</p>
                </div>
                <div class="bg-white rounded-lg shadow p-4 border-l-4 border-cyan-500">
                  <h3 class="font-medium">Flood Alerts</h3>
                  <p class="text-sm text-gray-500 mt-1">River basin and urban flood monitoring</p>
                </div>
                <div class="bg-white rounded-lg shadow p-4 border-l-4 border-indigo-500">
                  <h3 class="font-medium">Heavy Rainfall</h3>
                  <p class="text-sm text-gray-500 mt-1">Rainfall advisory and warnings</p>
                </div>
              </div>
            </section>
          }

          <!-- Seismic Section -->
          @if (activeTab() === 'all' || activeTab() === 'seismic') {
            <section aria-labelledby="seismic-section">
              <h2 id="seismic-section" class="text-lg font-semibold mb-3">🌍 Seismic</h2>
              <div class="space-y-3">
                <div class="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
                  <h3 class="font-medium">Earthquakes</h3>
                  <p class="text-sm text-gray-500 mt-1">Latest earthquake events from PHIVOLCS</p>
                </div>
                <div class="bg-white rounded-lg shadow p-4 border-l-4 border-orange-500">
                  <h3 class="font-medium">Volcanic Activity</h3>
                  <p class="text-sm text-gray-500 mt-1">Volcano monitoring and alert levels</p>
                </div>
                <div class="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
                  <h3 class="font-medium">Tsunami Warnings</h3>
                  <p class="text-sm text-gray-500 mt-1">Coastal tsunami advisory</p>
                </div>
              </div>
            </section>
          }

          <!-- Air Quality Section -->
          @if (activeTab() === 'all' || activeTab() === 'environment') {
            <section aria-labelledby="env-section">
              <h2 id="env-section" class="text-lg font-semibold mb-3">🌱 Environment & Health</h2>
              <div class="space-y-3">
                <div class="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
                  <h3 class="font-medium">Air Quality Index</h3>
                  <p class="text-sm text-gray-500 mt-1">Pollution levels from IQAir / OpenAQ</p>
                </div>
                <div class="bg-white rounded-lg shadow p-4 border-l-4 border-pink-500">
                  <h3 class="font-medium">Health Advisories</h3>
                  <p class="text-sm text-gray-500 mt-1">DOH disease outbreaks and health warnings</p>
                </div>
                <div class="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
                  <h3 class="font-medium">NDRRMC Alerts</h3>
                  <p class="text-sm text-gray-500 mt-1">National disaster response alerts</p>
                </div>
              </div>
            </section>
          }
        }
      </div>
    </div>
  `,
})
export class HazardsComponent implements OnInit {
  private readonly hazardService = inject(HazardService);
  private readonly locationService = inject(LocationService);

  readonly isLoading = signal(false);
  readonly activeTab = signal('all');

  readonly tabs = [
    { id: 'all', label: 'All' },
    { id: 'weather', label: '🌦️ Weather' },
    { id: 'seismic', label: '🌍 Seismic' },
    { id: 'environment', label: '🌱 Environment' },
  ];

  ngOnInit(): void {
    this.loadData();
  }

  private loadData(): void {
    this.isLoading.set(true);
    this.hazardService.getAll().subscribe({
      next: () => this.isLoading.set(false),
      error: () => this.isLoading.set(false),
    });
  }
}
