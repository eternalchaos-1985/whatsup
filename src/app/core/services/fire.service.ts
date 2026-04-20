import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { FireIncidentsResponse, FireIncident } from '../models/hazard.model';

@Injectable({ providedIn: 'root' })
export class FireService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/fire';

  getIncidents(params: {
    lat?: number;
    lng?: number;
    radius?: number;
    dateFrom?: string;
    dateTo?: string;
    location?: string;
  }): Observable<FireIncidentsResponse> {
    let httpParams = new HttpParams();
    if (params.lat != null) httpParams = httpParams.set('lat', params.lat.toString());
    if (params.lng != null) httpParams = httpParams.set('lng', params.lng.toString());
    if (params.radius != null) httpParams = httpParams.set('radius', params.radius.toString());
    if (params.dateFrom) httpParams = httpParams.set('dateFrom', params.dateFrom);
    if (params.dateTo) httpParams = httpParams.set('dateTo', params.dateTo);
    if (params.location) httpParams = httpParams.set('location', params.location);

    return this.http.get<FireIncidentsResponse>(this.apiUrl, { params: httpParams });
  }

  getSatelliteHotspots(days?: number): Observable<FireIncident[]> {
    let httpParams = new HttpParams();
    if (days != null) httpParams = httpParams.set('days', days.toString());
    return this.http.get<FireIncident[]>(`${this.apiUrl}/satellite`, { params: httpParams });
  }

  getFireNews(location?: string, dateFrom?: string, dateTo?: string): Observable<FireIncident[]> {
    let httpParams = new HttpParams();
    if (location) httpParams = httpParams.set('location', location);
    if (dateFrom) httpParams = httpParams.set('dateFrom', dateFrom);
    if (dateTo) httpParams = httpParams.set('dateTo', dateTo);

    return this.http.get<FireIncident[]>(`${this.apiUrl}/news`, { params: httpParams });
  }
}
