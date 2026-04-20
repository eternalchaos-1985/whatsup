import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  LGUOfficial,
  LGUByLocationResponse,
  Facility,
  CivicRepresentatives,
  OfficialLevel,
} from '../models/hazard.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class LGUService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiBaseUrl}/api/lgu`;

  getOfficials(area: string, level: OfficialLevel = 'barangay'): Observable<LGUOfficial[]> {
    return this.http.get<LGUOfficial[]>(`${this.apiUrl}/officials`, {
      params: { area, level },
    });
  }

  getByLocation(lat: number, lng: number): Observable<LGUByLocationResponse> {
    return this.http.get<LGUByLocationResponse>(`${this.apiUrl}/by-location`, {
      params: { lat: lat.toString(), lng: lng.toString() },
    });
  }

  getFacilities(lat: number, lng: number, radiusKm?: number): Observable<Facility[]> {
    const params: Record<string, string> = { lat: lat.toString(), lng: lng.toString() };
    if (radiusKm != null) params['radius'] = radiusKm.toString();
    return this.http.get<Facility[]>(`${this.apiUrl}/facilities`, { params });
  }

  getCivicRepresentatives(address: string): Observable<CivicRepresentatives> {
    return this.http.get<CivicRepresentatives>(`${this.apiUrl}/civic`, {
      params: { address },
    });
  }

  searchOfficials(query: string, level?: OfficialLevel): Observable<LGUOfficial[]> {
    const params: Record<string, string> = { query };
    if (level) params['level'] = level;
    return this.http.get<LGUOfficial[]>(`${this.apiUrl}/search`, { params });
  }

  getLevels(): Observable<Record<string, string[]>> {
    return this.http.get<Record<string, string[]>>(`${this.apiUrl}/levels`);
  }
}
