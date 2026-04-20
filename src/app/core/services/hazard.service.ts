import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  NearbyHazardsResponse,
  WeatherData,
  SeismicData,
  AirQualityData,
  HazardAlert,
} from '../models/hazard.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class HazardService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiBaseUrl}/api/hazards`;

  getAll(): Observable<{ weather: WeatherData; seismic: SeismicData; timestamp: string }> {
    return this.http.get<{ weather: WeatherData; seismic: SeismicData; timestamp: string }>(this.apiUrl);
  }

  getNearby(lat: number, lng: number, radius: number): Observable<NearbyHazardsResponse> {
    return this.http.get<NearbyHazardsResponse>(`${this.apiUrl}/nearby`, {
      params: { lat: lat.toString(), lng: lng.toString(), radius: radius.toString() },
    });
  }

  getWeather(location?: string): Observable<unknown> {
    return this.http.get(`${this.apiUrl}/weather`, {
      params: location ? { location } : {},
    });
  }

  getTyphoons(): Observable<HazardAlert[]> {
    return this.http.get<HazardAlert[]>(`${this.apiUrl}/typhoons`);
  }

  getFloods(): Observable<HazardAlert[]> {
    return this.http.get<HazardAlert[]>(`${this.apiUrl}/floods`);
  }

  getEarthquakes(minMagnitude?: number): Observable<unknown> {
    return this.http.get(`${this.apiUrl}/earthquakes`, {
      params: minMagnitude ? { minMagnitude: minMagnitude.toString() } : {},
    });
  }

  getVolcanic(): Observable<HazardAlert[]> {
    return this.http.get<HazardAlert[]>(`${this.apiUrl}/volcanic`);
  }

  getTsunami(): Observable<HazardAlert[]> {
    return this.http.get<HazardAlert[]>(`${this.apiUrl}/tsunami`);
  }

  getAirQuality(lat: number, lng: number): Observable<AirQualityData> {
    return this.http.get<AirQualityData>(`${this.apiUrl}/air-quality`, {
      params: { lat: lat.toString(), lng: lng.toString() },
    });
  }

  getNdrrmc(): Observable<HazardAlert[]> {
    return this.http.get<HazardAlert[]>(`${this.apiUrl}/ndrrmc`);
  }

  getHealth(location?: string): Observable<{ advisories: unknown; outbreaks: unknown }> {
    return this.http.get<{ advisories: unknown; outbreaks: unknown }>(`${this.apiUrl}/health`, {
      params: location ? { location } : {},
    });
  }
}
