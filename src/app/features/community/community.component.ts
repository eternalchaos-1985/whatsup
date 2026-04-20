import { Component, inject, signal, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CommunityService } from '../../core/services/community.service';
import { LocationService } from '../../core/services/location.service';
import { NewsArticle } from '../../core/models/hazard.model';

@Component({
  selector: 'app-community',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-gray-50">
      <header class="bg-green-700 text-white px-4 py-6">
        <div class="max-w-4xl mx-auto">
          <h1 class="text-2xl font-bold">📰 Community Feed</h1>
          <p class="text-green-200 mt-1">Local news, LGU announcements & civic engagement</p>
        </div>
      </header>

      <div class="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <!-- Tabs -->
        <div class="flex gap-2 flex-wrap" role="tablist">
          @for (tab of tabs; track tab.id) {
            <button
              role="tab"
              [attr.aria-selected]="activeTab() === tab.id"
              (click)="activeTab.set(tab.id)"
              class="px-4 py-2 rounded-full text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-green-500"
              [class]="activeTab() === tab.id ? 'bg-green-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'">
              {{ tab.label }}
            </button>
          }
        </div>

        @if (isLoading()) {
          <div class="text-center py-8" role="status">
            <div class="inline-block w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
            <p class="text-gray-500 mt-3">Loading community feed...</p>
          </div>
        } @else {
          <!-- News -->
          @if (activeTab() === 'all' || activeTab() === 'news') {
            <section aria-labelledby="news-heading">
              <h2 id="news-heading" class="text-lg font-semibold mb-3">📰 Local News</h2>
              @if (news().length > 0) {
                <div class="space-y-3">
                  @for (article of news(); track article.url) {
                    <a [href]="article.url" target="_blank" rel="noopener noreferrer"
                       class="block bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow">
                      <h3 class="font-medium text-gray-800">{{ article.title }}</h3>
                      <p class="text-sm text-gray-500 mt-1 line-clamp-2">{{ article.description }}</p>
                      <p class="text-xs text-gray-400 mt-2">{{ article.source }} · {{ article.publishedAt | date:'mediumDate' }}</p>
                    </a>
                  }
                </div>
              } @else {
                <p class="text-sm text-gray-400 bg-white rounded-lg shadow p-4">No local news available.</p>
              }
            </section>
          }

          <!-- LGU Announcements -->
          @if (activeTab() === 'all' || activeTab() === 'lgu') {
            <section aria-labelledby="lgu-heading">
              <h2 id="lgu-heading" class="text-lg font-semibold mb-3">🏛️ LGU Announcements</h2>
              <p class="text-sm text-gray-400 bg-white rounded-lg shadow p-4">LGU feed integration coming soon.</p>
            </section>
          }

          <!-- Events -->
          @if (activeTab() === 'all' || activeTab() === 'events') {
            <section aria-labelledby="events-heading">
              <h2 id="events-heading" class="text-lg font-semibold mb-3">🎉 Community Events</h2>
              <p class="text-sm text-gray-400 bg-white rounded-lg shadow p-4">Local events will appear here once data sources are connected.</p>
            </section>
          }
        }
      </div>
    </div>
  `,
})
export class CommunityComponent implements OnInit {
  private readonly communityService = inject(CommunityService);
  private readonly locationService = inject(LocationService);

  readonly news = signal<NewsArticle[]>([]);
  readonly isLoading = signal(false);
  readonly activeTab = signal('all');

  readonly tabs = [
    { id: 'all', label: '📋 All' },
    { id: 'news', label: '📰 News' },
    { id: 'lgu', label: '🏛️ LGU' },
    { id: 'events', label: '🎉 Events' },
  ];

  ngOnInit(): void {
    this.isLoading.set(true);
    const loc = this.locationService.currentLocation();
    this.communityService.getNews(loc?.name).subscribe({
      next: (data) => {
        this.news.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }
}
