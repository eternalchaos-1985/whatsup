import { Component, inject, signal, ChangeDetectionStrategy, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { LGUService, SearchLocation, DilgBarangay } from '../../core/services/lgu.service';
import { LocationService } from '../../core/services/location.service';
import { LGUByLocationResponse, LGUOfficial, Facility, EmergencyContact } from '../../core/models/hazard.model';

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
        } @else if (locationResults().length > 0 && !data()) {
          <!-- Location Picker -->
          <div>
            <h2 class="text-lg font-semibold mb-3">📍 Select a location <span class="text-sm font-normal text-gray-400">({{ locationResults().length }} found)</span></h2>
            <div class="space-y-2">
              @for (loc of locationResults(); track loc.displayName; let i = $index) {
                <button (click)="selectLocation(loc)"
                        class="w-full text-left bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:border-indigo-400 hover:bg-indigo-50 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <div class="flex items-start gap-3">
                    <div class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                         [class]="loc.isCity ? 'bg-purple-100 text-purple-600' : 'bg-indigo-100 text-indigo-600'">
                      {{ i + 1 }}
                    </div>
                    <div class="flex-1 min-w-0">
                      <p class="font-medium text-gray-800">{{ loc.displayName }}</p>
                      <div class="flex flex-wrap gap-2 mt-1">
                        @if (loc.barangay) {
                          <span class="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">🏠 {{ loc.barangay }}</span>
                        }
                        @if (loc.city) {
                          <span class="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded">🏢 {{ loc.city }}</span>
                        }
                        @if (loc.province) {
                          <span class="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded">🗺️ {{ loc.province }}</span>
                        }
                        @if (loc.region) {
                          <span class="text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded">🌏 {{ loc.region }}</span>
                        }
                        @if (loc.psgcCode) {
                          <span class="text-xs bg-gray-50 text-gray-400 px-2 py-0.5 rounded">PSGC {{ loc.psgcCode }}</span>
                        }
                      </div>
                    </div>
                    <span class="text-indigo-400 shrink-0">›</span>
                  </div>
                </button>
              }
            </div>
          </div>
        } @else if (barangayList().length > 0 && !data()) {
          <!-- Barangay Picker -->
          <div>
            <!-- Geographic breadcrumbs -->
            @if (selectedLocation(); as loc) {
              <div class="bg-indigo-50 rounded-lg p-3 border border-indigo-200 mb-4">
                <div class="flex items-center gap-2 text-sm text-indigo-700 flex-wrap">
                  @if (loc.region) {
                    <span class="bg-amber-50 text-amber-700 px-2 py-0.5 rounded">🌏 {{ loc.region }}</span>
                    <span class="text-indigo-300">›</span>
                  }
                  @if (loc.province) {
                    <span class="bg-green-50 text-green-700 px-2 py-0.5 rounded">🗺️ {{ loc.province }}</span>
                    <span class="text-indigo-300">›</span>
                  }
                  @if (loc.city) {
                    <span class="bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-medium">🏢 {{ loc.city }}</span>
                  }
                </div>
                <button (click)="goBackToLocations()" class="text-xs text-indigo-500 hover:text-indigo-700 mt-2 underline">← Back to locations</button>
              </div>
            }

            <h2 class="text-lg font-semibold mb-3">🏘️ Select a barangay
              <span class="text-sm font-normal text-gray-400">({{ barangayList().length }} barangays)</span>
            </h2>

            <!-- Filter input for large lists -->
            @if (barangayList().length > 20) {
              <input type="text" [(ngModel)]="barangayFilter"
                     placeholder="Filter barangays..."
                     class="w-full border rounded-lg px-3 py-2 text-sm mb-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                     aria-label="Filter barangays" />
            }

            <!-- Skip option -->
            <button (click)="skipBarangayPicker()"
                    class="w-full text-left bg-gray-50 rounded-lg border border-dashed border-gray-300 p-3 mb-3 hover:bg-gray-100 transition-colors text-sm text-gray-500">
              Skip — load officials by detected location instead
            </button>

            <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[60vh] overflow-y-auto pr-1">
              @for (brgy of filteredBarangays(); track brgy.barangay) {
                <button (click)="selectBarangay(brgy.barangay)"
                        class="text-left bg-white rounded-lg shadow-sm border border-gray-200 p-3 hover:border-indigo-400 hover:bg-indigo-50 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <p class="font-medium text-gray-800 text-sm truncate">{{ brgy.barangay }}</p>
                  <div class="flex items-center justify-between mt-1">
                    <span class="text-xs text-gray-400">{{ brgy.officialCount }} officials</span>
                    @if (brgy.chairman) {
                      <span class="text-xs text-indigo-600 truncate ml-2">👤 {{ brgy.chairman }}</span>
                    }
                  </div>
                </button>
              }
            </div>

            @if (filteredBarangays().length === 0 && barangayFilter) {
              <div class="text-center py-6 text-sm text-gray-400">
                No barangays matching "{{ barangayFilter }}"
              </div>
            }
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
              @if (data()!.area.region) {
                <span>Region: <strong>{{ data()!.area.region }}</strong></span>
              }
            </div>
            <div class="flex flex-wrap gap-3 mt-2 text-xs text-indigo-500">
              @if (data()!.area.psgcCode) {
                <span class="bg-indigo-100 px-2 py-0.5 rounded">PSGC: {{ data()!.area.psgcCode }}</span>
              }
              @if (data()!.psgcBarangayCount) {
                <span class="bg-indigo-100 px-2 py-0.5 rounded">{{ data()!.psgcBarangayCount }} barangays</span>
              }
              @if (data()!.dataSources.length) {
                <span class="bg-indigo-100 px-2 py-0.5 rounded">Sources: {{ data()!.dataSources.join(', ') }}</span>
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
                      <button (click)="toggleBookmark(official.id)"
                              class="text-lg shrink-0 hover:scale-110 transition-transform" [attr.aria-label]="bookmarkedIds().has(official.id) ? 'Remove bookmark' : 'Bookmark official'">
                        {{ bookmarkedIds().has(official.id) ? '⭐' : '☆' }}
                      </button>
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
                        @if (official.source) {
                          <span class="inline-block text-[10px] bg-purple-50 text-purple-500 px-1.5 py-0.5 rounded mt-1">{{ official.source }}</span>
                        }
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
                      <button (click)="toggleBookmark(official.id)"
                              class="text-lg shrink-0 hover:scale-110 transition-transform" [attr.aria-label]="bookmarkedIds().has(official.id) ? 'Remove bookmark' : 'Bookmark official'">
                        {{ bookmarkedIds().has(official.id) ? '⭐' : '☆' }}
                      </button>
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

          <!-- Emergency Contacts -->
          @if (activeTab() === 'all' || activeTab() === 'emergency') {
            <section aria-labelledby="emergency-heading">
              <h2 id="emergency-heading" class="text-lg font-semibold mb-3">🚨 Emergency Contacts</h2>
              @if (data()!.emergencyContacts.length > 0) {
                <div class="space-y-2">
                  @for (contact of data()!.emergencyContacts; track contact.id) {
                    <div class="bg-white rounded-lg shadow p-4 flex items-center justify-between gap-3 border-l-4 border-red-500">
                      <div>
                        <div class="flex items-center gap-2">
                          <span>{{ getEmergencyIcon(contact.type) }}</span>
                          <h3 class="font-medium text-gray-800 text-sm">{{ contact.name }}</h3>
                        </div>
                        <p class="text-xs text-gray-400 mt-0.5">{{ contact.area }}</p>
                      </div>
                      <a [href]="'tel:' + contact.phone"
                         class="inline-flex items-center gap-1.5 bg-red-50 text-red-700 px-4 py-2 rounded-full text-sm font-medium hover:bg-red-100 transition-colors shrink-0 focus:outline-none focus:ring-2 focus:ring-red-500">
                        📞 {{ contact.phone }}
                      </a>
                    </div>
                  }
                </div>
              } @else {
                <div class="bg-white rounded-lg shadow p-4 text-sm text-gray-400">
                  No curated emergency contacts for this area yet. Dial <strong>911</strong> for emergencies.
                </div>
              }
            </section>
          }

          <!-- Bookmarked Officials -->
          @if (activeTab() === 'bookmarks') {
            <section aria-labelledby="bookmarks-heading">
              <h2 id="bookmarks-heading" class="text-lg font-semibold mb-3">⭐ Saved Officials</h2>
              @if (bookmarkedOfficials().length > 0) {
                <div class="grid md:grid-cols-2 gap-3">
                  @for (official of bookmarkedOfficials(); track official.id) {
                    <div class="bg-white rounded-lg shadow p-4 flex items-start gap-3">
                      <div class="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600 font-bold text-lg shrink-0">
                        {{ official.name.charAt(0) }}
                      </div>
                      <div class="flex-1 min-w-0">
                        <p class="font-medium text-gray-800 truncate">{{ official.name }}</p>
                        <p class="text-xs text-indigo-600 font-medium">{{ official.position }}</p>
                        <p class="text-xs text-gray-400">{{ official.area }}</p>
                        @if (official.phone) {
                          <a [href]="'tel:' + official.phone"
                             class="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline mt-1">
                            📞 {{ official.phone }}
                          </a>
                        }
                      </div>
                      <button (click)="toggleBookmark(official.id)"
                              class="text-yellow-500 hover:text-yellow-600 text-lg shrink-0" aria-label="Remove bookmark">
                        ⭐
                      </button>
                    </div>
                  }
                </div>
              } @else {
                <div class="bg-white rounded-lg shadow p-4 text-sm text-gray-400 text-center">
                  <div class="text-3xl mb-2">⭐</div>
                  No saved officials yet. Tap the star icon on any official to save them for quick access.
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
          @if (searchFailed()) {
            <div class="text-center py-12">
              <p class="text-5xl mb-4">🔍</p>
              <p class="text-gray-600">No results found for <strong>"{{ searchFailed() }}"</strong></p>
              <p class="text-sm text-gray-400 mt-2">Try searching for a city, municipality, or barangay name (e.g. "Makati", "Quezon City", "Davao").</p>
            </div>
          } @else {
            <div class="text-center py-12">
              <p class="text-5xl mb-4">🏡️</p>
              <p class="text-gray-500">Tap <strong>Use My Location</strong> or search by area to find local government officials.</p>
              <p class="text-sm text-gray-400 mt-2">See your barangay chairman, city mayor, police precincts, fire stations & health centers — all in one place.</p>
            </div>
          }
        }
      </div>
    </div>
  `,
})
export class OfficialsComponent implements OnInit {
  readonly locationService = inject(LocationService);
  private readonly lguService = inject(LGUService);

  readonly data = signal<LGUByLocationResponse | null>(null);
  readonly locationResults = signal<SearchLocation[]>([]);
  readonly searchResults = signal<LGUOfficial[]>([]);
  readonly isLoading = signal(false);
  readonly searchFailed = signal<string | null>(null);
  readonly activeTab = signal('all');

  readonly barangayList = signal<DilgBarangay[]>([]);
  readonly selectedLocation = signal<SearchLocation | null>(null);
  barangayFilter = '';

  readonly filteredBarangays = computed(() => {
    const list = this.barangayList();
    const filter = this.barangayFilter.toLowerCase().trim();
    if (!filter) return list;
    return list.filter(b => b.barangay.toLowerCase().includes(filter));
  });

  searchQuery = '';

  readonly tabs = [
    { id: 'all', label: 'All', icon: '📋' },
    { id: 'barangay', label: 'Barangay', icon: '🏘️' },
    { id: 'city', label: 'City/Municipal', icon: '🏙️' },
    { id: 'facilities', label: 'Facilities', icon: '🏢' },
    { id: 'emergency', label: 'Emergency', icon: '🚨' },
    { id: 'bookmarks', label: 'Saved', icon: '⭐' },
  ];

  readonly bookmarkedIds = signal<Set<string>>(new Set());

  readonly bookmarkedOfficials = computed(() => {
    const ids = this.bookmarkedIds();
    const d = this.data();
    if (!d || ids.size === 0) return [];
    return [...d.barangayOfficials, ...d.cityOfficials].filter(o => ids.has(o.id));
  });

  ngOnInit(): void {
    this.loadBookmarks();
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
    const query = this.searchQuery.trim();
    if (!query) return;
    this.isLoading.set(true);
    this.searchResults.set([]);
    this.searchFailed.set(null);
    this.data.set(null);
    this.locationResults.set([]);
    this.barangayList.set([]);
    this.selectedLocation.set(null);
    this.barangayFilter = '';
    this.lguService.searchLocations(query).subscribe({
      next: (result) => {
        if (result.locations?.length) {
          if (result.locations.length === 1) {
            // Single result — auto-drill into it
            this.selectLocation(result.locations[0]);
          } else {
            this.locationResults.set(result.locations);
            this.isLoading.set(false);
          }
        } else if (result.officials?.length) {
          this.searchResults.set(result.officials);
          this.isLoading.set(false);
        } else {
          this.searchFailed.set(query);
          this.isLoading.set(false);
        }
      },
      error: () => {
        this.searchFailed.set(query);
        this.isLoading.set(false);
      },
    });
  }

  selectLocation(loc: SearchLocation): void {
    this.locationResults.set([]);
    this.selectedLocation.set(loc);

    const city = loc.city;
    const regionCode = loc.psgcCode?.substring(0, 2);

    if (city && regionCode) {
      this.isLoading.set(true);
      this.lguService.getDilgBarangays(city, regionCode).subscribe({
        next: (result) => {
          if (result.barangays.length > 0) {
            this.barangayList.set(result.barangays);
            this.isLoading.set(false);
          } else {
            // No DILG barangay list — load directly
            this.loadByLocation(loc.lat, loc.lng);
          }
        },
        error: () => this.loadByLocation(loc.lat, loc.lng),
      });
    } else {
      this.isLoading.set(true);
      this.loadByLocation(loc.lat, loc.lng);
    }
  }

  selectBarangay(barangayName: string): void {
    const loc = this.selectedLocation();
    if (!loc) return;

    this.barangayList.set([]);
    this.barangayFilter = '';
    this.isLoading.set(true);

    const regionCode = loc.psgcCode?.substring(0, 2) || '';
    const city = loc.city || '';

    forkJoin({
      area: this.lguService.getByLocation(loc.lat, loc.lng),
      dilg: this.lguService.getDilgOfficials(regionCode, city, barangayName),
    }).subscribe({
      next: ({ area, dilg }) => {
        if (dilg.officials?.length) {
          area.barangayOfficials = dilg.officials;
        }
        area.area.barangay = barangayName;
        this.data.set(area);
        this.activeTab.set('all');
        this.isLoading.set(false);
      },
      error: () => {
        this.searchFailed.set(barangayName);
        this.isLoading.set(false);
      },
    });
  }

  skipBarangayPicker(): void {
    const loc = this.selectedLocation();
    if (!loc) return;
    this.barangayList.set([]);
    this.barangayFilter = '';
    this.isLoading.set(true);
    this.loadByLocation(loc.lat, loc.lng);
  }

  goBackToLocations(): void {
    this.barangayList.set([]);
    this.barangayFilter = '';
    this.selectedLocation.set(null);
    // Re-trigger last search to show location picker again
    if (this.searchQuery.trim()) {
      this.onSearch();
    }
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

  getEmergencyIcon(type: string): string {
    const icons: Record<string, string> = {
      police: '👮', fire_station: '🚒', hospital: '🏥', clinic: '🩺', emergency: '🚨',
    };
    return icons[type] || '🚨';
  }

  toggleBookmark(officialId: string): void {
    const current = new Set(this.bookmarkedIds());
    if (current.has(officialId)) {
      current.delete(officialId);
    } else {
      current.add(officialId);
    }
    this.bookmarkedIds.set(current);
    try {
      localStorage.setItem('whatsup-bookmarked-officials', JSON.stringify([...current]));
    } catch { /* localStorage may be unavailable */ }
  }

  private loadBookmarks(): void {
    try {
      const stored = localStorage.getItem('whatsup-bookmarked-officials');
      if (stored) {
        this.bookmarkedIds.set(new Set(JSON.parse(stored)));
      }
    } catch { /* ignore */ }
  }

  private loadByLocation(lat: number, lng: number): void {
    this.isLoading.set(true);
    this.searchFailed.set(null);
    this.searchResults.set([]);
    this.locationResults.set([]);
    this.lguService.getByLocation(lat, lng).subscribe({
      next: (result) => {
        this.data.set(result);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }
}
