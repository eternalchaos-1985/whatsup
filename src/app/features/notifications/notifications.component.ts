import { Component, inject, signal, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../../core/services/notification.service';
import { NotificationLogEntry, NotificationTopic } from '../../core/models/hazard.model';

@Component({
  selector: 'app-notifications',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-gray-50">
      <header class="bg-amber-600 text-white px-4 py-6">
        <div class="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold">🔔 Notifications</h1>
            <p class="text-amber-200 mt-1">Real-time alerts pushed to your device</p>
          </div>
          <div class="flex gap-2">
            @if (notificationService.unreadCount() > 0) {
              <button (click)="notificationService.markAllRead()"
                      class="bg-amber-700 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-amber-800 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400">
                Mark all read
              </button>
            }
            <button (click)="triggerRefresh()"
                    [disabled]="isRefreshing()"
                    class="bg-amber-700 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-amber-800 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400"
                    [attr.aria-busy]="isRefreshing()">
              @if (isRefreshing()) {
                Checking...
              } @else {
                🔄 Check Now
              }
            </button>
          </div>
        </div>
      </header>

      <div class="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <!-- Permission Banner -->
        @if (!permissionGranted()) {
          <div class="bg-yellow-50 border border-yellow-300 rounded-lg p-4 flex items-start gap-3">
            <span class="text-2xl">🔕</span>
            <div class="flex-1">
              <p class="font-medium text-yellow-800">Push notifications are not enabled</p>
              <p class="text-sm text-yellow-600 mt-1">Enable notifications to receive real-time alerts about hazards, fires, and utility interruptions.</p>
              <button (click)="enableNotifications()"
                      class="mt-3 bg-amber-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-amber-700 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500">
                Enable Push Notifications
              </button>
            </div>
          </div>
        }

        <!-- Topic Subscriptions -->
        <section class="bg-white rounded-lg shadow p-6" aria-labelledby="topics-heading">
          <h2 id="topics-heading" class="text-lg font-semibold mb-4">📋 Subscribed Topics</h2>
          <p class="text-sm text-gray-500 mb-4">Choose which types of alerts you want to receive.</p>
          <div class="grid sm:grid-cols-2 gap-3">
            @for (topic of topicOptions; track topic.id) {
              <label class="flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors"
                     [class]="isSubscribed(topic.id) ? 'bg-amber-50 border-amber-300' : 'bg-white border-gray-200 hover:bg-gray-50'">
                <input type="checkbox"
                       [checked]="isSubscribed(topic.id)"
                       (change)="toggleTopic(topic.id)"
                       class="w-4 h-4 text-amber-600 rounded focus:ring-amber-500" />
                <span class="text-sm">{{ topic.icon }} {{ topic.label }}</span>
              </label>
            }
          </div>
        </section>

        <!-- Filter tabs -->
        <div class="flex gap-2 flex-wrap" role="tablist">
          <button role="tab"
                  [attr.aria-selected]="activeFilter() === 'all'"
                  (click)="activeFilter.set('all')"
                  class="px-3 py-1.5 rounded-full text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500"
                  [class]="activeFilter() === 'all' ? 'bg-amber-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'">
            All
          </button>
          @for (topic of topicOptions; track topic.id) {
            <button role="tab"
                    [attr.aria-selected]="activeFilter() === topic.id"
                    (click)="activeFilter.set(topic.id)"
                    class="px-3 py-1.5 rounded-full text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500"
                    [class]="activeFilter() === topic.id ? 'bg-amber-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'">
              {{ topic.icon }} {{ topic.label }}
            </button>
          }
        </div>

        <!-- Notification History -->
        <section aria-labelledby="history-heading">
          <h2 id="history-heading" class="text-lg font-semibold mb-3">📜 Recent Alerts</h2>
          @if (isLoadingHistory()) {
            <div class="text-center py-6" role="status">
              <div class="inline-block w-6 h-6 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
              <p class="text-sm text-gray-500 mt-2">Loading history...</p>
            </div>
          } @else if (filteredHistory().length > 0) {
            <div class="space-y-3">
              @for (entry of filteredHistory(); track entry.id) {
                <div class="bg-white rounded-lg shadow p-4 border-l-4"
                     [class]="getTopicBorderClass(entry.topic)">
                  <div class="flex items-start justify-between gap-3">
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2">
                        <span>{{ getTopicIcon(entry.topic) }}</span>
                        <h3 class="font-medium text-gray-800">{{ entry.title }}</h3>
                      </div>
                      <p class="text-sm text-gray-600 mt-1">{{ entry.body }}</p>
                      <div class="flex items-center gap-4 mt-2 text-xs text-gray-400">
                        <span>{{ formatTime(entry.sentAt) }}</span>
                        @if (entry.itemCount > 0) {
                          <span>{{ entry.itemCount }} item(s)</span>
                        }
                        <span class="px-2 py-0.5 rounded-full text-xs"
                              [class]="getTopicBadgeClass(entry.topic)">
                          {{ getTopicLabel(entry.topic) }}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              }
            </div>
          } @else {
            <div class="text-center py-8 bg-white rounded-lg shadow">
              <p class="text-4xl mb-3">🔕</p>
              <p class="text-gray-500">No alerts yet.</p>
              <p class="text-sm text-gray-400 mt-1">When something happens in your area, you'll see it here.</p>
            </div>
          }
        </section>
      </div>
    </div>
  `,
})
export class NotificationsComponent implements OnInit {
  readonly notificationService = inject(NotificationService);

  readonly permissionGranted = signal(false);
  readonly isRefreshing = signal(false);
  readonly isLoadingHistory = signal(false);
  readonly activeFilter = signal<string>('all');

  readonly topicOptions: { id: NotificationTopic; label: string; icon: string }[] = [
    { id: 'hazard-weather', label: 'Weather', icon: '🌀' },
    { id: 'hazard-seismic', label: 'Seismic', icon: '🌋' },
    { id: 'hazard-ndrrmc', label: 'Disasters', icon: '🚨' },
    { id: 'fire-alerts', label: 'Fire', icon: '🔥' },
    { id: 'utility-advisories', label: 'Utilities', icon: '🔧' },
    { id: 'civic-news', label: 'News', icon: '📰' },
  ];

  ngOnInit(): void {
    // Check if notifications already granted
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      this.permissionGranted.set(true);
    }

    // Load saved subscriptions
    const saved = localStorage.getItem('subscribed_topics');
    if (saved) {
      try {
        this.notificationService.subscribedTopics.set(JSON.parse(saved));
      } catch { /* ignore */ }
    }

    this.loadHistory();
  }

  async enableNotifications(): Promise<void> {
    // Firebase config from environment — in production, use environment.ts
    const config = {
      apiKey: '',
      authDomain: '',
      projectId: '',
      storageBucket: '',
      messagingSenderId: '',
      appId: '',
      vapidKey: '',
    };

    const token = await this.notificationService.requestPermissionAndToken(config);
    if (token) {
      this.permissionGranted.set(true);

      // Auto-subscribe to all topics
      const allTopics = this.topicOptions.map((t) => t.id);
      this.notificationService.subscribeAll(allTopics);
      localStorage.setItem('subscribed_topics', JSON.stringify(allTopics));
    }
  }

  isSubscribed(topic: NotificationTopic): boolean {
    return this.notificationService.subscribedTopics().includes(topic);
  }

  toggleTopic(topic: NotificationTopic): void {
    if (this.isSubscribed(topic)) {
      this.notificationService.unsubscribe(topic).subscribe();
    } else {
      this.notificationService.subscribe(topic).subscribe();
    }
    // Persist
    setTimeout(() => {
      localStorage.setItem(
        'subscribed_topics',
        JSON.stringify(this.notificationService.subscribedTopics())
      );
    }, 100);
  }

  triggerRefresh(): void {
    this.isRefreshing.set(true);
    this.notificationService.triggerCheck().subscribe({
      next: () => {
        this.isRefreshing.set(false);
        this.loadHistory();
      },
      error: () => this.isRefreshing.set(false),
    });
  }

  filteredHistory(): NotificationLogEntry[] {
    const filter = this.activeFilter();
    const all = this.notificationService.history();
    if (filter === 'all') return all;
    return all.filter((e) => e.topic === filter);
  }

  formatTime(iso: string): string {
    try {
      const d = new Date(iso);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMin = Math.floor(diffMs / 60000);
      if (diffMin < 1) return 'just now';
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHr = Math.floor(diffMin / 60);
      if (diffHr < 24) return `${diffHr}h ago`;
      return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return iso;
    }
  }

  getTopicIcon(topic: string): string {
    const icons: Record<string, string> = {
      'hazard-weather': '🌀', 'hazard-seismic': '🌋', 'hazard-ndrrmc': '🚨',
      'fire-alerts': '🔥', 'utility-advisories': '🔧', 'civic-news': '📰',
    };
    return icons[topic] || '🔔';
  }

  getTopicLabel(topic: string): string {
    const labels: Record<string, string> = {
      'hazard-weather': 'Weather', 'hazard-seismic': 'Seismic', 'hazard-ndrrmc': 'Disaster',
      'fire-alerts': 'Fire', 'utility-advisories': 'Utility', 'civic-news': 'News',
    };
    return labels[topic] || topic;
  }

  getTopicBorderClass(topic: string): string {
    const map: Record<string, string> = {
      'hazard-weather': 'border-blue-500', 'hazard-seismic': 'border-orange-500',
      'hazard-ndrrmc': 'border-red-600', 'fire-alerts': 'border-red-500',
      'utility-advisories': 'border-yellow-500', 'civic-news': 'border-indigo-500',
    };
    return map[topic] || 'border-gray-300';
  }

  getTopicBadgeClass(topic: string): string {
    const map: Record<string, string> = {
      'hazard-weather': 'bg-blue-100 text-blue-700', 'hazard-seismic': 'bg-orange-100 text-orange-700',
      'hazard-ndrrmc': 'bg-red-100 text-red-700', 'fire-alerts': 'bg-red-50 text-red-600',
      'utility-advisories': 'bg-yellow-100 text-yellow-700', 'civic-news': 'bg-indigo-100 text-indigo-700',
    };
    return map[topic] || 'bg-gray-100 text-gray-600';
  }

  private loadHistory(): void {
    this.isLoadingHistory.set(true);
    this.notificationService.getHistory(50).subscribe({
      next: () => this.isLoadingHistory.set(false),
      error: () => this.isLoadingHistory.set(false),
    });
  }
}
