import { Component, inject, signal, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LGUService } from '../../core/services/lgu.service';
import { LocationService } from '../../core/services/location.service';
import { LGUByLocationResponse, LGUOfficial, Facility } from '../../core/models/hazard.model';

@Component({
  selector: 'app-officials',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-gray-50">
      <header class="bg-indigo-700 text-white px-4 py-6">
        <div class="max-w-4xl mx-auto">
          <h1 class="text-2xl font-bold">🏛️ Local Government Officials</h1>
          <p class="text-indigo-200 mt-1">Find your barangay, city & municipal officials and key contacts</p>
        </div>
      </header>

      <!-- Location / Search Bar -->
      <div class="bg-white shadow-sm border-b">
        <div class="max-w-4xl mx-auto px-4 py-4 flex flex-wrap gap-3 items-end">
          <button (click)="detectAndLoad()"
                  class="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  [disabled]="locationService.isLoading()"
                  [attr.aria-busy]="locationService.isLoading()">
            @if (locationService.isLoading()) {
              Detecting...
            } @else {
              📍 Use My Location
            }
          </button>
          <span class="text-gray-400">or</span>
          <div class="flex gap-2">
            <input type="text" [(ngModel)]="searchQuery"
                   placeholder="Search by name or area..."
                   class="border rounded-lg px-3 py-2 text-sm w-64 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                   aria-label="Search officials by name or area"
                   (keydown.enter)="onSearch()" />
            <button (click)="onSearch()"
                    class="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500">
              Search
            </button>
          </div>
        </div>
      </div>

      <div class="max-w-4xl mx-auto px-4 py-6 space-y-6">
        @if (isLoading()) {
          <div class="text-center py-8" role="status">
            <div class="inline-block w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p class="text-gray-500 mt-3">Looking up officials for your area...</p>
          </div>
        } @else if (data()) {
          <!-- Area Info -->
          <div class="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
            <h2 class="font-semibold text-indigo-800">📍 {{ data()!.area.displayName }}</h2>
            <div class="flex flex-wrap gap-4 mt-2 text-sm text-indigo-700">
              @if (data()!.area.barangay) {
                <span>Barangay: <strong>{{ data()!.area.barangay }}</strong></span>
              }
              @if (data()!.area.city) {
                <span>City/Municipality: <strong>{{ data()!.area.city }}</strong></span>
              }
              @if (data()!.area.province) {
                <span>Province: <strong>{{ data()!.area.province }}</strong></span>
              }
            </div>
          </div>

          <!-- Tabs -->
          <div class="flex gap-2 flex-wrap" role="tablist">
            @for (tab of tabs; track tab.id) {
              <button role="tab"
                      [attr.aria-selected]="activeTab() === tab.id"
                      (click)="activeTab.set(tab.id)"
                      class="px-4 py-2 rounded-full text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      [class]="activeTab() === tab.id ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'">
                {{ tab.icon }} {{ tab.label }}
              </button>
            }
          </div>

          <!-- Barangay Officials -->
          @if (activeTab() === 'all' || activeTab() === 'barangay') {
            <section aria-labelledby="brgy-heading">
              <h2 id="brgy-heading" class="text-lg font-semibold mb-3">🏘️ Barangay Officials</h2>
              @if (data()!.barangayOfficials.length > 0) {
                <div class="grid md:grid-cols-2 gap-3">
                  @for (official of data()!.barangayOfficials; track official.id) {
                    <div class="bg-white rounded-lg shadow p-4 flex items-start gap-3">
                      <div class="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-lg shrink-0">
                        {{ official.name.charAt(0) }}
                      </div>
                      <div class="flex-1 min-w-0">
                        <p class="font-medium text-gray-800 truncate">{{ official.name }}</p>
                        <p class="text-xs text-indigo-600 font-medium">{{ official.position }}</p>
                        <p class="text-xs text-gray-400">{{ official.area }}</p>
                        @if (official.phone) {
                          <a [href]="'tel:' + official.phone"
                             class="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline mt-1 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded">
                            📞 {{ official.phone }}
                          </a>
                        }
                        <div class="flex gap-2 mt-1">
                          @if (official.facebookUrl) {
                            <a [href]="official.facebookUrl" target="_blank" rel="noopener noreferrer"
                               class="text-xs text-blue-500 hover:underline">Facebook</a>
                          }
                          @if (official.websiteUrl) {
                            <a [href]="official.websiteUrl" target="_blank" rel="noopener noreferrer"
                               class="text-xs text-blue-500 hover:underline">Website</a>
                          }
                        </div>
                      </div>
                    </div>
                  }
                </div>
              } @else {
                <div class="bg-white rounded-lg shadow p-4 text-sm text-gray-400">
                  No barangay officials data available yet for this area.
                  <span class="block mt-1 text-xs">Data sourced from DILG / COMELEC. Community contributions welcome.</span>
                </div>
              }
            </section>
          }

          <!-- City / Municipal Officials -->
          @if (activeTab() === 'all' || activeTab() === 'city') {
            <section aria-labelledby="city-heading">
              <h2 id="city-heading" class="text-lg font-semibold mb-3">🏙️ City / Municipal Officials</h2>
              @if (data()!.cityOfficials.length > 0) {
                <div class="grid md:grid-cols-2 gap-3">
                  @for (official of data()!.cityOfficials; track official.id) {
                    <div class="bg-white rounded-lg shadow p-4 flex items-start gap-3">
                      <div class="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-lg shrink-0">
                        {{ official.name.charAt(0) }}
                      </div>
                      <div class="flex-1 min-w-0">
                        <p class="font-medium text-gray-800 truncate">{{ official.name }}</p>
                        <p class="text-xs text-purple-600 font-medium">{{ official.position }}</p>
                        <p class="text-xs text-gray-400">{{ official.area }}</p>
                        @if (official.phone) {
                          <a [href]="'tel:' + official.phone"
                             class="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline mt-1 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded">
                            📞 {{ official.phone }}
                          </a>
                        }
                        <div class="flex gap-2 mt-1">
                          @if (official.facebookUrl) {
                            <a [href]="official.facebookUrl" target="_blank" rel="noopener noreferrer"
                               class="text-xs text-blue-500 hover:underline">Facebook</a>
                          }
                          @if (official.websiteUrl) {
                            <a [href]="official.websiteUrl" target="_blank" rel="noopener noreferrer"
                               class="text-xs text-blue-500 hover:underline">Website</a>
                          }
                        </div>
                      </div>
                    </div>
                  }
                </div>
              } @else {
                <div class="bg-white rounded-lg shadow p-4 text-sm text-gray-400">
                  No city/municipal officials data available yet for this area.
                </div>
              }
            </section>
          }

          <!-- Nearby Facilities (Police, Fire, Health) -->
          @if (activeTab() === 'all' || activeTab() === 'facilities') {
            <section aria-labelledby="facilities-heading">
              <h2 id="facilities-heading" class="text-lg font-semibold mb-3">🏢 Nearby Facilities</h2>
              @if (data()!.facilities.length > 0) {
                <div class="space-y-3">
                  @for (facility of data()!.facilities; track facility.id) {
                    <div class="bg-white rounded-lg shadow p-4 border-l-4"
                         [class]="getFacilityBorderClass(facility.type)">
                      <div class="flex items-start justify-between gap-3">
                        <div>
                          <div class="flex items-center gap-2">
                            <span>{{ getFacilityIcon(facility.type) }}</span>
                            <h3 class="font-medium text-gray-800">{{ facility.name }}</h3>
                          </div>
                          <p class="text-xs text-gray-500 capitalize mt-1">{{ formatFacilityType(facility.type) }}</p>
                          @if (facility.address) {
                            <p class="text-xs text-gray-400 mt-1">📍 {{ facility.address }}</p>
                          }
                          @if (facility.operator) {
                            <p class="text-xs text-gray-400">🏷️ {{ facility.operator }}</p>
                          }
                        </div>
                        <div class="flex flex-col items-end gap-1 shrink-0">
                          @if (facility.phone) {
                            <a [href]="'tel:' + facility.phone"
                               class="inline-flex items-center gap-1 bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm hover:bg-green-100 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500">
                              📞 Call
                            </a>
                          }
                          @if (facility.website) {
                            <a [href]="facility.website" target="_blank" rel="noopener noreferrer"
                               class="text-xs text-blue-500 hover:underline">Visit website</a>
                          }
                        </div>
                      </div>
                    </div>
                  }
                </div>
              } @else {
                <div class="bg-white rounded-lg shadow p-4 text-sm text-gray-400">
                  No facilities found nearby. Try increasing your search radius.
                </div>
              }
            </section>
          }

          <!-- Search Results -->
          @if (searchResults().length > 0) {
            <section aria-labelledby="search-heading">
              <h2 id="search-heading" class="text-lg font-semibold mb-3">🔎 Search Results</h2>
              <div class="grid md:grid-cols-2 gap-3">
                @for (official of searchResults(); track official.id) {
                  <div class="bg-white rounded-lg shadow p-4 flex items-start gap-3">
                    <div class="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold shrink-0">
                      {{ official.name.charAt(0) }}
                    </div>
                    <div class="flex-1 min-w-0">
                      <p class="font-medium text-gray-800 truncate">{{ official.name }}</p>
                      <p class="text-xs text-indigo-600">{{ official.position }} · {{ official.area }}</p>
                      @if (official.phone) {
                        <a [href]="'tel:' + official.phone"
                           class="text-sm text-blue-600 hover:underline">📞 {{ official.phone }}</a>
                      }
                    </div>
                  </div>
                }
              </div>
            </section>
          }
        } @else if (!isLoading()) {
          <div class="text-center py-12">
            <p class="text-5xl mb-4">🏛️</p>
            <p class="text-gray-500">Tap <strong>Use My Location</strong> or search by area to find local government officials.</p>
            <p class="text-sm text-gray-400 mt-2">See your barangay chairman, city mayor, police precincts, fire stations & health centers — all in one place.</p>
          </div>
        }
      </div>
    </div>
  `,
})
export class OfficialsComponent implements OnInit {
  readonly locationService = inject(LocationService);
  private readonly lguService = inject(LGUService);

  readonly data = signal<LGUByLocationResponse | null>(null);
  readonly searchResults = signal<LGUOfficial[]>([]);
  readonly isLoading = signal(false);
  readonly activeTab = signal('all');

  searchQuery = '';

  readonly tabs = [
    { id: 'all', label: 'All', icon: '📋' },
    { id: 'barangay', label: 'Barangay', icon: '🏘️' },
    { id: 'city', label: 'City/Municipal', icon: '🏙️' },
    { id: 'facilities', label: 'Facilities', icon: '🏢' },
  ];

  ngOnInit(): void {
    const loc = this.locationService.currentLocation();
    if (loc) {
      this.loadByLocation(loc.lat, loc.lng);
    }
  }

  async detectAndLoad(): Promise<void> {
    try {
      const loc = await this.locationService.detectLocation();
      this.loadByLocation(loc.lat, loc.lng);
    } catch {
      // Error is displayed by LocationService
    }
  }

  onSearch(): void {
    if (!this.searchQuery.trim()) return;
    this.isLoading.set(true);
    this.searchResults.set([]);
    // Try address-based geocode search first (returns full location data)
    this.lguService.searchByAddress(this.searchQuery.trim()).subscribe({
      next: (result) => {
        if (result && result.area) {
          // Got a geocoded location result — show full area data
          this.data.set(result);
        } else if (result && (result as any).officials) {
          // Fallback: name/position search returned officials array
          this.searchResults.set((result as any).officials);
        }
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  getFacilityIcon(type: string): string {
    const icons: Record<string, string> = {
      police: '👮', fire_station: '🚒', hospital: '🏥', clinic: '🩺',
    };
    return icons[type] || '🏢';
  }

  getFacilityBorderClass(type: string): string {
    const classes: Record<string, string> = {
      police: 'border-blue-500',
      fire_station: 'border-red-500',
      hospital: 'border-green-500',
      clinic: 'border-teal-500',
    };
    return classes[type] || 'border-gray-300';
  }

  formatFacilityType(type: string): string {
    return type.replace(/_/g, ' ');
  }

  private loadByLocation(lat: number, lng: number): void {
    this.isLoading.set(true);
    this.lguService.getByLocation(lat, lng).subscribe({
      next: (result) => {
        this.data.set(result);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }
}
