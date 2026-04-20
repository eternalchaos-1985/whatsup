import { Component, inject, signal, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EmergencyService } from '../../core/services/emergency.service';
import { LocationService } from '../../core/services/location.service';
import { EmergencyHotline } from '../../core/models/hazard.model';

@Component({
  selector: 'app-emergency',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-red-50">
      <header class="bg-red-700 text-white px-4 py-6">
        <div class="max-w-4xl mx-auto">
          <h1 class="text-2xl font-bold">🚨 Emergency Mode</h1>
          <p class="text-red-200 mt-1">One-tap access to hotlines, hospitals & evacuation centers</p>
        </div>
      </header>

      <div class="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <!-- Hotlines -->
        <section aria-labelledby="hotlines-heading">
          <h2 id="hotlines-heading" class="text-lg font-semibold mb-3">📞 Emergency Hotlines</h2>
          <div class="grid md:grid-cols-2 gap-3">
            @for (hotline of hotlines(); track hotline.name) {
              <a [href]="'tel:' + hotline.number"
                 class="bg-white rounded-lg shadow p-4 flex items-center gap-4 hover:shadow-md transition-shadow focus:outline-none focus:ring-2 focus:ring-red-500">
                <div class="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold text-lg shrink-0">
                  📞
                </div>
                <div>
                  <p class="font-medium text-gray-800">{{ hotline.name }}</p>
                  <p class="text-lg font-bold text-red-600">{{ hotline.number }}</p>
                  <p class="text-xs text-gray-400 capitalize">{{ hotline.category }}</p>
                </div>
              </a>
            }
          </div>
        </section>

        <!-- Quick Actions -->
        <section aria-labelledby="quick-heading">
          <h2 id="quick-heading" class="text-lg font-semibold mb-3">⚡ Quick Actions</h2>
          <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
            <button (click)="findNearby('hospitals')"
                    class="bg-white rounded-lg shadow p-4 text-center hover:shadow-md transition-shadow focus:outline-none focus:ring-2 focus:ring-red-500">
              <span class="text-3xl">🏥</span>
              <p class="text-sm font-medium mt-2">Nearest Hospitals</p>
            </button>
            <button (click)="findNearby('evacuation')"
                    class="bg-white rounded-lg shadow p-4 text-center hover:shadow-md transition-shadow focus:outline-none focus:ring-2 focus:ring-red-500">
              <span class="text-3xl">🏫</span>
              <p class="text-sm font-medium mt-2">Evacuation Centers</p>
            </button>
            <button (click)="findNearby('police')"
                    class="bg-white rounded-lg shadow p-4 text-center hover:shadow-md transition-shadow focus:outline-none focus:ring-2 focus:ring-red-500">
              <span class="text-3xl">👮</span>
              <p class="text-sm font-medium mt-2">Police Stations</p>
            </button>
          </div>
        </section>

        <!-- Situation Reports -->
        <section aria-labelledby="sitrep-heading">
          <h2 id="sitrep-heading" class="text-lg font-semibold mb-3">📋 Situation Reports</h2>
          <div class="bg-white rounded-lg shadow p-4">
            <p class="text-sm text-gray-500">Latest NDRRMC situation reports will appear here.</p>
          </div>
        </section>
      </div>
    </div>
  `,
})
export class EmergencyComponent implements OnInit {
  private readonly emergencyService = inject(EmergencyService);
  private readonly locationService = inject(LocationService);

  readonly hotlines = signal<EmergencyHotline[]>([]);

  ngOnInit(): void {
    this.emergencyService.getHotlines().subscribe({
      next: (data) => this.hotlines.set(data),
      error: () => {
        // Fallback hardcoded hotlines
        this.hotlines.set([
          { name: 'NDRRMC', number: '(02) 8911-5061', category: 'disaster' },
          { name: 'Philippine Red Cross', number: '143', category: 'emergency' },
          { name: 'PNP Emergency', number: '117', category: 'police' },
          { name: 'Bureau of Fire Protection', number: '(02) 8426-0219', category: 'fire' },
          { name: 'DOH Hotline', number: '(02) 8651-7800', category: 'health' },
          { name: 'NCMH Crisis Hotline', number: '0917-899-8727', category: 'health' },
        ]);
      },
    });
  }

  findNearby(type: string): void {
    const loc = this.locationService.currentLocation();
    if (!loc) {
      this.locationService.detectLocation().catch(() => {});
      return;
    }
    // In production, navigate to map with filtered overlay
    console.log(`Finding nearby ${type} at`, loc.lat, loc.lng);
  }
}
