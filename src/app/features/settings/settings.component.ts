import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LocationService } from '../../core/services/location.service';

@Component({
  selector: 'app-settings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-gray-50">
      <header class="bg-gray-800 text-white px-4 py-6">
        <div class="max-w-4xl mx-auto">
          <h1 class="text-2xl font-bold">⚙️ Settings</h1>
          <p class="text-gray-300 mt-1">Manage preferences and saved locations</p>
        </div>
      </header>

      <div class="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <!-- Notification Filters -->
        <section class="bg-white rounded-lg shadow p-6" aria-labelledby="filters-heading">
          <h2 id="filters-heading" class="text-lg font-semibold mb-4">Notification Filters</h2>
          <div class="space-y-3">
            @for (filter of filters; track filter.id) {
              <label class="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" [checked]="filter.enabled"
                       (change)="filter.enabled = !filter.enabled"
                       class="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" />
                <span class="text-sm">{{ filter.icon }} {{ filter.label }}</span>
              </label>
            }
          </div>
        </section>

        <!-- Saved Locations -->
        <section class="bg-white rounded-lg shadow p-6" aria-labelledby="locations-heading">
          <h2 id="locations-heading" class="text-lg font-semibold mb-4">Saved Locations</h2>
          <p class="text-sm text-gray-500">Save your home, workplace, or other locations for quick access.</p>
          <div class="mt-4">
            <button (click)="saveCurrentLocation()"
                    class="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500">
              + Save Current Location
            </button>
          </div>
        </section>

        <!-- Default Radius -->
        <section class="bg-white rounded-lg shadow p-6" aria-labelledby="radius-heading">
          <h2 id="radius-heading" class="text-lg font-semibold mb-4">Default Radius</h2>
          <div class="flex items-center gap-4">
            <input type="range" [min]="1" [max]="50"
                   [value]="locationService.radius()"
                   (input)="onRadiusChange($event)"
                   class="flex-1"
                   aria-label="Default search radius" />
            <span class="text-sm font-medium w-16 text-right">{{ locationService.radius() }} km</span>
          </div>
        </section>
      </div>
    </div>
  `,
})
export class SettingsComponent {
  readonly locationService = inject(LocationService);

  filters = [
    { id: 'hazards', label: 'Hazard Alerts', icon: '⚠️', enabled: true },
    { id: 'emergencies', label: 'Emergencies', icon: '🚨', enabled: true },
    { id: 'fire', label: 'Fire Reports', icon: '🔥', enabled: true },
    { id: 'utilities', label: 'Utility Advisories', icon: '🔧', enabled: true },
    { id: 'civic', label: 'Civic Announcements', icon: '🏛️', enabled: true },
    { id: 'events', label: 'Community Events', icon: '🎉', enabled: true },
    { id: 'news', label: 'Local News', icon: '📰', enabled: true },
  ];

  onRadiusChange(event: Event): void {
    const value = parseInt((event.target as HTMLInputElement).value, 10);
    this.locationService.setRadius(value);
  }

  saveCurrentLocation(): void {
    const loc = this.locationService.currentLocation();
    if (!loc) {
      this.locationService.detectLocation().catch(() => {});
    }
    // In production, save to Firebase user preferences
  }
}
