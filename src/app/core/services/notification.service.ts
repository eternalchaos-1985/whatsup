import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import {
  NotificationLogEntry,
  NotificationStatus,
  NotificationTopic,
} from '../models/hazard.model';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/notifications';

  /** The FCM device token once registered. */
  readonly fcmToken = signal<string | null>(null);

  /** Topics the user is subscribed to. */
  readonly subscribedTopics = signal<NotificationTopic[]>([]);

  /** Unread notification count (in-app). */
  readonly unreadCount = signal(0);

  /** Recent notification log entries. */
  readonly history = signal<NotificationLogEntry[]>([]);

  // ─── FCM Registration ────────────────────────────────────

  /**
   * Request browser notification permission and get the Firebase
   * Messaging token. Caches the token in localStorage.
   */
  async requestPermissionAndToken(firebaseConfig: Record<string, string>): Promise<string | null> {
    if (typeof Notification === 'undefined') return null;

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;

    // Dynamically import Firebase Messaging (tree-shake friendly)
    const { initializeApp, getApps } = await import('firebase/app');
    const { getMessaging, getToken, onMessage } = await import('firebase/messaging');

    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    const messaging = getMessaging(app);

    const token = await getToken(messaging, {
      vapidKey: firebaseConfig['vapidKey'],
    });

    if (token) {
      this.fcmToken.set(token);
      localStorage.setItem('fcm_token', token);
    }

    // Listen for foreground messages
    onMessage(messaging, (payload) => {
      const entry: NotificationLogEntry = {
        id: crypto.randomUUID(),
        topic: (payload.data?.['topic'] as NotificationTopic) || 'hazard-weather',
        title: payload.notification?.title || '',
        body: payload.notification?.body || '',
        itemCount: parseInt(payload.data?.['count'] || '0', 10),
        sentAt: payload.data?.['timestamp'] || new Date().toISOString(),
      };
      this.history.update((h) => [entry, ...h]);
      this.unreadCount.update((n) => n + 1);
    });

    return token;
  }

  // ─── Topic Subscriptions ─────────────────────────────────

  subscribe(topic: NotificationTopic): Observable<unknown> {
    const token = this.fcmToken() || localStorage.getItem('fcm_token');
    return this.http
      .post(`${this.apiUrl}/subscribe`, { token, topic })
      .pipe(tap(() => {
        this.subscribedTopics.update((topics) =>
          topics.includes(topic) ? topics : [...topics, topic]
        );
      }));
  }

  unsubscribe(topic: NotificationTopic): Observable<unknown> {
    const token = this.fcmToken() || localStorage.getItem('fcm_token');
    return this.http
      .post(`${this.apiUrl}/unsubscribe`, { token, topic })
      .pipe(tap(() => {
        this.subscribedTopics.update((topics) => topics.filter((t) => t !== topic));
      }));
  }

  subscribeAll(topics: NotificationTopic[]): void {
    topics.forEach((topic) => this.subscribe(topic).subscribe());
    this.subscribedTopics.set([...topics]);
  }

  // ─── History & Status ────────────────────────────────────

  getHistory(limit = 50): Observable<NotificationLogEntry[]> {
    return this.http
      .get<NotificationLogEntry[]>(`${this.apiUrl}/history`, { params: { limit: limit.toString() } })
      .pipe(tap((entries) => this.history.set(entries)));
  }

  getStatus(): Observable<NotificationStatus> {
    return this.http.get<NotificationStatus>(`${this.apiUrl}/status`);
  }

  triggerCheck(): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.apiUrl}/check-now`, {});
  }

  markAllRead(): void {
    this.unreadCount.set(0);
  }

  // ─── Preferences ─────────────────────────────────────────

  savePreferences(userId: string, preferences: Record<string, unknown>): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/preferences`, { userId, preferences });
  }

  getPreferences(userId: string): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>(`${this.apiUrl}/preferences/${encodeURIComponent(userId)}`);
  }
}
