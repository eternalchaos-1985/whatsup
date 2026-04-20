import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  LGUOfficial,
  LGUByLocationResponse,
  Facility,
  OfficialLevel,
} from '../models/hazard.model';
import { environment } from '../../../environments/environment';

export interface PSGCRegion { code: string; name: string; }
export interface PSGCProvince { code: string; name: string; regionCode: string; }
export interface PSGCCity { code: string; name: string; isCity: boolean; isMunicipality: boolean; regionCode: string; provinceCode: string | false; }
export interface PSGCBarangay { code: string; name: string; }

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

  searchByAddress(query: string): Observable<LGUByLocationResponse> {
    return this.http.get<LGUByLocationResponse>(`${this.apiUrl}/search`, {
      params: { query },
    });
  }

  searchOfficials(query: string, level?: OfficialLevel): Observable<LGUOfficial[]> {
    const params: Record<string, string> = { query };
    if (level) params['level'] = level;
    return this.http.get<LGUOfficial[]>(`${this.apiUrl}/search`, { params });
  }

  // ─── PSGC Geographic Hierarchy ───

  getRegions(): Observable<PSGCRegion[]> {
    return this.http.get<PSGCRegion[]>(`${this.apiUrl}/regions`);
  }

  getProvinces(regionCode: string): Observable<PSGCProvince[]> {
    return this.http.get<PSGCProvince[]>(`${this.apiUrl}/provinces/${regionCode}`);
  }

  getCities(parentCode: string, type: 'region' | 'province' = 'region'): Observable<PSGCCity[]> {
    return this.http.get<PSGCCity[]>(`${this.apiUrl}/cities/${parentCode}`, {
      params: { type },
    });
  }

  getBarangays(cityMunCode: string): Observable<PSGCBarangay[]> {
    return this.http.get<PSGCBarangay[]>(`${this.apiUrl}/barangays/${cityMunCode}`);
  }

  getLevels(): Observable<Record<string, string[]>> {
    return this.http.get<Record<string, string[]>>(`${this.apiUrl}/levels`);
  }
}
