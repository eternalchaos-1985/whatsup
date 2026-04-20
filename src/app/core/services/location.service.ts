import { Injectable, signal, computed } from '@angular/core';
import { GeoLocation } from '../models/hazard.model';

export type LocationScope = 'local' | 'philippines' | 'global';

@Injectable({ providedIn: 'root' })
export class LocationService {
  static readonly PH_CENTER: GeoLocation = { lat: 12.8797, lng: 121.7740, name: 'Philippines' };
  static readonly MAX_RADIUS = 20037;

  readonly currentLocation = signal<GeoLocation | null>(null);
  readonly radius = signal<number>(10);
  readonly scope = signal<LocationScope>('local');
  readonly isLoading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  readonly hasLocation = computed(() => this.currentLocation() !== null);

  detectLocation(): Promise<GeoLocation> {
    this.isLoading.set(true);
    this.error.set(null);

    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        const err = 'Geolocation is not supported by this browser.';
        this.error.set(err);
        this.isLoading.set(false);
        reject(new Error(err));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location: GeoLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            name: 'Current Location',
          };
          this.currentLocation.set(location);
          this.isLoading.set(false);
          resolve(location);
        },
        (err) => {
          const errorMsg = this.getGeolocationError(err);
          this.error.set(errorMsg);
          this.isLoading.set(false);
          reject(new Error(errorMsg));
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
      );
    });
  }

  setManualLocation(lat: number, lng: number, name?: string): void {
    this.currentLocation.set({ lat, lng, name: name ?? 'Manual Location' });
    this.error.set(null);
  }

  setRadius(km: number): void {
    this.radius.set(Math.max(1, Math.min(LocationService.MAX_RADIUS, km)));
  }

  setScope(newScope: LocationScope): void {
    this.scope.set(newScope);
    if (newScope === 'philippines') {
      this.currentLocation.set({ ...LocationService.PH_CENTER });
      this.radius.set(2000);
    } else if (newScope === 'global') {
      if (!this.currentLocation()) {
        this.currentLocation.set({ ...LocationService.PH_CENTER });
      }
      this.radius.set(LocationService.MAX_RADIUS);
    } else if (newScope === 'local') {
      if (this.radius() > 500) {
        this.radius.set(10);
      }
    }
  }

  private getGeolocationError(error: GeolocationPositionError): string {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return 'Location permission denied. Please enable GPS or enter your location manually.';
      case error.POSITION_UNAVAILABLE:
        return 'Location information is unavailable.';
      case error.TIMEOUT:
        return 'Location request timed out.';
      default:
        return 'An unknown error occurred while getting location.';
    }
  }
}
