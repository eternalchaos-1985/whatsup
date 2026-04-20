import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { EmergencyHotline } from '../models/hazard.model';

@Injectable({ providedIn: 'root' })
export class EmergencyService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/emergency';

  getHotlines(category?: string): Observable<EmergencyHotline[]> {
    return this.http.get<EmergencyHotline[]>(`${this.apiUrl}/hotlines`, {
      params: category ? { category } : {},
    });
  }

  getEvacuationCenters(lat: number, lng: number, radius: number): Observable<unknown[]> {
    return this.http.get<unknown[]>(`${this.apiUrl}/evacuation-centers`, {
      params: { lat: lat.toString(), lng: lng.toString(), radius: radius.toString() },
    });
  }

  getHospitals(lat: number, lng: number, radius: number): Observable<unknown[]> {
    return this.http.get<unknown[]>(`${this.apiUrl}/hospitals`, {
      params: { lat: lat.toString(), lng: lng.toString(), radius: radius.toString() },
    });
  }

  getSituationReports(): Observable<unknown[]> {
    return this.http.get<unknown[]>(`${this.apiUrl}/situation-reports`);
  }
}
