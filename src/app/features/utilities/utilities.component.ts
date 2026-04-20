import { Component, inject, signal, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UtilityService } from '../../core/services/utility.service';
import { LocationService } from '../../core/services/location.service';
import { AllUtilityAdvisoriesResponse, UtilityType } from '../../core/models/hazard.model';

@Component({
  selector: 'app-utilities',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-gray-50">
      <header class="bg-blue-700 text-white px-4 py-6">
        <div class="max-w-4xl mx-auto">
          <h1 class="text-2xl font-bold">🔧 Utility Advisories</h1>
          <p class="text-blue-200 mt-1">Water, Electric & Internet service updates</p>
        </div>
      </header>

      <!-- Filter Tabs -->
      <div class="bg-white shadow-sm border-b">
        <div class="max-w-4xl mx-auto px-4 py-3 flex gap-2 flex-wrap" role="tablist">
          @for (tab of tabs; track tab.id) {
            <button
              role="tab"
              [attr.aria-selected]="activeTab() === tab.id"
              (click)="activeTab.set(tab.id)"
              class="px-4 py-2 rounded-full text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              [class]="activeTab() === tab.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'">
              {{ tab.icon }} {{ tab.label }}
            </button>
          }
        </div>
      </div>

      <div class="max-w-4xl mx-auto px-4 py-6 space-y-6">
        @if (isLoading()) {
          <div class="text-center py-8" role="status">
            <div class="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p class="text-gray-500 mt-3">Loading advisories...</p>
          </div>
        } @else if (data()) {
          <!-- Water -->
          @if (activeTab() === 'all' || activeTab() === 'water') {
            <section aria-labelledby="water-heading">
              <h2 id="water-heading" class="text-lg font-semibold mb-3">💧 Water Service</h2>
              <!-- Providers -->
              <div class="grid md:grid-cols-3 gap-3 mb-4">
                @for (provider of data()!.water?.providers || []; track provider.name) {
                  <div class="bg-white rounded-lg shadow p-3">
                    <p class="font-medium text-sm">{{ provider.name }}</p>
                    <p class="text-xs text-gray-500">{{ provider.area }}</p>
                  </div>
                }
              </div>
              <!-- Scheduled Interruptions -->
              @if ((data()!.water?.scheduledInterruptions?.length || 0) > 0) {
                <h3 class="text-sm font-semibold text-gray-600 mb-2">Scheduled Interruptions</h3>
                @for (item of data()!.water!.scheduledInterruptions; track item.id) {
                  <div class="bg-white rounded-lg shadow p-4 border-l-4 border-blue-400 mb-3">
                    <h4 class="font-medium">{{ item.provider }} — {{ item.area }}</h4>
                    <p class="text-sm text-gray-500">{{ item.reason }}</p>
                    <p class="text-xs text-gray-400 mt-1">{{ item.startDate }} – {{ item.endDate }}</p>
                  </div>
                }
              }
              <!-- News -->
              @if ((data()!.water?.newsReports?.length || 0) > 0) {
                <h3 class="text-sm font-semibold text-gray-600 mb-2">Recent News</h3>
                @for (article of data()!.water!.newsReports; track article.id) {
                  <a [href]="article.url" target="_blank" rel="noopener noreferrer"
                     class="block bg-white rounded-lg shadow p-4 border-l-4 border-cyan-400 mb-3 hover:shadow-md transition-shadow">
                    <h4 class="font-medium text-gray-800 text-sm">{{ article.title }}</h4>
                    <p class="text-xs text-gray-500 mt-1 line-clamp-2">{{ article.description }}</p>
                    <p class="text-xs text-gray-400 mt-1">{{ article.source }} · {{ article.publishedAt | date:'mediumDate' }}</p>
                  </a>
                }
              }
              @if ((data()!.water?.newsReports?.length || 0) === 0 && (data()!.water?.scheduledInterruptions?.length || 0) === 0) {
                <p class="text-sm text-gray-400 bg-white rounded-lg shadow p-4">No water advisories at this time.</p>
              }
            </section>
          }

          <!-- Electric -->
          @if (activeTab() === 'all' || activeTab() === 'electric') {
            <section aria-labelledby="electric-heading">
              <h2 id="electric-heading" class="text-lg font-semibold mb-3">⚡ Electric Service</h2>
              <div class="grid md:grid-cols-2 gap-3 mb-4">
                @for (provider of data()!.electric?.providers || []; track provider.name) {
                  <div class="bg-white rounded-lg shadow p-3">
                    <p class="font-medium text-sm">{{ provider.name }}</p>
                    <p class="text-xs text-gray-500">{{ provider.area }}</p>
                  </div>
                }
              </div>
              @if ((data()!.electric?.scheduledInterruptions?.length || 0) > 0) {
                <h3 class="text-sm font-semibold text-gray-600 mb-2">Scheduled Interruptions</h3>
                @for (item of data()!.electric!.scheduledInterruptions; track item.id) {
                  <div class="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-400 mb-3">
                    <h4 class="font-medium">{{ item.provider }} — {{ item.area }}</h4>
                    <p class="text-sm text-gray-500">{{ item.reason }}</p>
                    <p class="text-xs text-gray-400 mt-1">{{ item.startDate }} – {{ item.endDate }}</p>
                  </div>
                }
              }
              @if ((data()!.electric?.newsReports?.length || 0) > 0) {
                <h3 class="text-sm font-semibold text-gray-600 mb-2">Recent News</h3>
                @for (article of data()!.electric!.newsReports; track article.id) {
                  <a [href]="article.url" target="_blank" rel="noopener noreferrer"
                     class="block bg-white rounded-lg shadow p-4 border-l-4 border-yellow-300 mb-3 hover:shadow-md transition-shadow">
                    <h4 class="font-medium text-gray-800 text-sm">{{ article.title }}</h4>
                    <p class="text-xs text-gray-500 mt-1 line-clamp-2">{{ article.description }}</p>
                    <p class="text-xs text-gray-400 mt-1">{{ article.source }} · {{ article.publishedAt | date:'mediumDate' }}</p>
                  </a>
                }
              }
              @if ((data()!.electric?.newsReports?.length || 0) === 0 && (data()!.electric?.scheduledInterruptions?.length || 0) === 0) {
                <p class="text-sm text-gray-400 bg-white rounded-lg shadow p-4">No electric advisories at this time.</p>
              }
            </section>
          }

          <!-- Internet -->
          @if (activeTab() === 'all' || activeTab() === 'internet') {
            <section aria-labelledby="internet-heading">
              <h2 id="internet-heading" class="text-lg font-semibold mb-3">🌐 Internet & Telecom</h2>
              <div class="grid md:grid-cols-2 gap-3 mb-4">
                @for (provider of data()!.internet?.providers || []; track provider.name) {
                  <div class="bg-white rounded-lg shadow p-3">
                    <p class="font-medium text-sm">{{ provider.name }}</p>
                    <p class="text-xs text-gray-500">{{ provider.area }}</p>
                  </div>
                }
              </div>
              @if ((data()!.internet?.scheduledInterruptions?.length || 0) > 0) {
                <h3 class="text-sm font-semibold text-gray-600 mb-2">Scheduled Maintenance</h3>
                @for (item of data()!.internet!.scheduledInterruptions; track item.id) {
                  <div class="bg-white rounded-lg shadow p-4 border-l-4 border-purple-400 mb-3">
                    <h4 class="font-medium">{{ item.provider }} — {{ item.area }}</h4>
                    <p class="text-sm text-gray-500">{{ item.reason }}</p>
                    <p class="text-xs text-gray-400 mt-1">{{ item.startDate }} – {{ item.endDate }}</p>
                  </div>
                }
              }
              @if ((data()!.internet?.newsReports?.length || 0) > 0) {
                <h3 class="text-sm font-semibold text-gray-600 mb-2">Recent News</h3>
                @for (article of data()!.internet!.newsReports; track article.id) {
                  <a [href]="article.url" target="_blank" rel="noopener noreferrer"
                     class="block bg-white rounded-lg shadow p-4 border-l-4 border-purple-300 mb-3 hover:shadow-md transition-shadow">
                    <h4 class="font-medium text-gray-800 text-sm">{{ article.title }}</h4>
                    <p class="text-xs text-gray-500 mt-1 line-clamp-2">{{ article.description }}</p>
                    <p class="text-xs text-gray-400 mt-1">{{ article.source }} · {{ article.publishedAt | date:'mediumDate' }}</p>
                  </a>
                }
              }
              @if ((data()!.internet?.newsReports?.length || 0) === 0 && (data()!.internet?.scheduledInterruptions?.length || 0) === 0) {
                <p class="text-sm text-gray-400 bg-white rounded-lg shadow p-4">No internet advisories at this time.</p>
              }
            </section>
          }
        } @else {
          <div class="text-center py-12">
            <p class="text-5xl mb-4">🔧</p>
            <p class="text-gray-500">Loading utility advisories for your area...</p>
          </div>
        }
      </div>
    </div>
  `,
})
export class UtilitiesComponent implements OnInit {
  private readonly utilityService = inject(UtilityService);
  private readonly locationService = inject(LocationService);

  readonly data = signal<AllUtilityAdvisoriesResponse | null>(null);
  readonly isLoading = signal(false);
  readonly activeTab = signal('all');

  readonly tabs = [
    { id: 'all', label: 'All', icon: '📋' },
    { id: 'water', label: 'Water', icon: '💧' },
    { id: 'electric', label: 'Electric', icon: '⚡' },
    { id: 'internet', label: 'Internet', icon: '🌐' },
  ];

  ngOnInit(): void {
    this.loadData();
  }

  private loadData(): void {
    this.isLoading.set(true);
    const loc = this.locationService.currentLocation();
    const locationName = loc?.name && loc.name !== 'Current Location' ? loc.name : undefined;

    this.utilityService.getAll(locationName).subscribe({
      next: (result) => {
        this.data.set(result);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }
}
