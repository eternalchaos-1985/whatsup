import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { NewsArticle, CommunityEvent } from '../models/hazard.model';

@Injectable({ providedIn: 'root' })
export class CommunityService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/community';

  getEvents(lat: number, lng: number, radius: number): Observable<CommunityEvent[]> {
    return this.http.get<CommunityEvent[]>(`${this.apiUrl}/events`, {
      params: { lat: lat.toString(), lng: lng.toString(), radius: radius.toString() },
    });
  }

  getLGUAnnouncements(municipality?: string): Observable<unknown[]> {
    return this.http.get<unknown[]>(`${this.apiUrl}/lgu`, {
      params: municipality ? { municipality } : {},
    });
  }

  getNews(location?: string): Observable<NewsArticle[]> {
    return this.http.get<NewsArticle[]>(`${this.apiUrl}/news`, {
      params: location ? { location } : {},
    });
  }

  getCivicInfo(address: string): Observable<unknown> {
    return this.http.get(`${this.apiUrl}/civic`, { params: { address } });
  }
}
