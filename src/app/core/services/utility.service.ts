import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  AllUtilityAdvisoriesResponse,
  UtilityAdvisoryResponse,
  UtilityType,
} from '../models/hazard.model';

@Injectable({ providedIn: 'root' })
export class UtilityService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/utilities';

  getAll(location?: string): Observable<AllUtilityAdvisoriesResponse> {
    return this.http.get<AllUtilityAdvisoriesResponse>(this.apiUrl, {
      params: location ? { location } : {},
    });
  }

  getByType(type: UtilityType, location?: string): Observable<UtilityAdvisoryResponse> {
    return this.http.get<UtilityAdvisoryResponse>(`${this.apiUrl}/${type}`, {
      params: location ? { location } : {},
    });
  }

  getWater(location?: string): Observable<UtilityAdvisoryResponse> {
    return this.getByType('water', location);
  }

  getElectric(location?: string): Observable<UtilityAdvisoryResponse> {
    return this.getByType('electric', location);
  }

  getInternet(location?: string): Observable<UtilityAdvisoryResponse> {
    return this.getByType('internet', location);
  }

  getProviders(): Observable<Record<string, { providers: { name: string; area: string }[] }>> {
    return this.http.get<Record<string, { providers: { name: string; area: string }[] }>>(`${this.apiUrl}/providers`);
  }
}
