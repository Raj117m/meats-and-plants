/**
 * Geolocation & Geofence Utilities for Meats & Plants v4
 * Accurate GPS reading collector, Haversine formula, URL parsing, and Leaflet helpers
 */

export interface GeoPosition {
  lat: number;
  lng: number;
  accuracy: number;
  mocked?: boolean;
}

export function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return Infinity;
  const numLat1 = Number(lat1);
  const numLon1 = Number(lon1);
  const numLat2 = Number(lat2);
  const numLon2 = Number(lon2);
  if (isNaN(numLat1) || isNaN(numLon1) || isNaN(numLat2) || isNaN(numLon2)) return Infinity;

  const R = 6371000; // Earth radius in meters
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(numLat2 - numLat1);
  const dLon = toRad(numLon2 - numLon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(numLat1)) * Math.cos(toRad(numLat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export function formatDistance(meters: number): string {
  if (!isFinite(meters)) return 'Unknown distance';
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${Math.round(meters)} m`;
}

export type MockGeoMode = 'real' | 'inside' | 'away' | 'off';

declare global {
  interface Window {
    __MOCK_GEO_MODE?: MockGeoMode;
    __CAFE_COORDS?: { lat: number; lng: number; radius: number };
  }
}

/**
 * Parses raw coordinates or Google Maps link formats:
 * - @lat,lng (e.g. /@19.260423,72.979444,17z)
 * - ?q=lat,lng or &q=lat,lng
 * - !3d... and !4d... (e.g. !3d19.260423!4d72.979444)
 * - Raw "19.260423, 72.979444" or "19.260423 72.979444"
 */
export function parseCoordinatesFromInput(input: string): { lat: number; lng: number } | null {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();

  // 1. Google Maps data format: !3d<lat>!4d<lng>
  const d3dMatch = trimmed.match(/!3d(-?\d+(?:\.\d+)?)(?:!4d|.*?)(?:!4d(-?\d+(?:\.\d+)?))/);
  if (d3dMatch && d3dMatch[1] && d3dMatch[2]) {
    const lat = parseFloat(d3dMatch[1]);
    const lng = parseFloat(d3dMatch[2]);
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng };
    }
  }

  // 2. Google Maps URL with @lat,lng
  const atMatch = trimmed.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (atMatch && atMatch[1] && atMatch[2]) {
    const lat = parseFloat(atMatch[1]);
    const lng = parseFloat(atMatch[2]);
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng };
    }
  }

  // 3. Query param ?q=lat,lng or &q=lat,lng or ?ll=lat,lng
  const queryMatch = trimmed.match(/[?&](?:q|ll|query|center)=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/i);
  if (queryMatch && queryMatch[1] && queryMatch[2]) {
    const lat = parseFloat(queryMatch[1]);
    const lng = parseFloat(queryMatch[2]);
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng };
    }
  }

  // 4. Raw coordinate string: "19.260423, 72.979444" or "19.260423 72.979444"
  const rawMatch = trimmed.match(/^\s*\(?\s*(-?\d{1,2}(?:\.\d+)?)\s*[, ]\s*(-?\d{1,3}(?:\.\d+)?)\s*\)?\s*$/);
  if (rawMatch && rawMatch[1] && rawMatch[2]) {
    const lat = parseFloat(rawMatch[1]);
    const lng = parseFloat(rawMatch[2]);
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng };
    }
  }

  // 5. Fallback regex to find any floating point coordinate pair in the string
  const anyPair = trimmed.match(/(-?\d{1,2}\.\d{3,})\s*,\s*(-?\d{1,3}\.\d{3,})/);
  if (anyPair && anyPair[1] && anyPair[2]) {
    const lat = parseFloat(anyPair[1]);
    const lng = parseFloat(anyPair[2]);
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng };
    }
  }

  return null;
}

export interface AccuratePositionOptions {
  timeoutMs?: number; // default 8000
  stopAccuracyThreshold?: number; // default 30m
  onProgress?: (accuracy: number, readingsCount: number) => void;
  storeLat?: number;
  storeLng?: number;
}

/**
 * v4 Accurate GPS Reader:
 * Uses navigator.geolocation.watchPosition with enableHighAccuracy: true.
 * Collects readings for up to 8 seconds and keeps the best (lowest) accuracy.
 * Stops early if accuracy is <= 30m.
 */
export async function getAccuratePosition(
  options: AccuratePositionOptions = {}
): Promise<GeoPosition> {
  const storeLat = options.storeLat ?? 19.2604227;
  const storeLng = options.storeLng ?? 72.9794437;
  const mockMode = typeof window !== 'undefined' ? window.__MOCK_GEO_MODE || 'real' : 'real';

  if (mockMode === 'off') {
    const error: any = new Error('Location sharing stopped / permission denied.');
    error.code = 1; // PERMISSION_DENIED
    throw error;
  }

  if (mockMode === 'inside') {
    // 6 meters from café center (well inside geofence)
    if (options.onProgress) {
      options.onProgress(6, 1);
    }
    return {
      lat: storeLat + 0.00004,
      lng: storeLng + 0.00004,
      accuracy: 6,
      mocked: true
    };
  }

  if (mockMode === 'away') {
    // ~1.3 km away from café
    if (options.onProgress) {
      options.onProgress(12, 1);
    }
    return {
      lat: storeLat - 0.009,
      lng: storeLng - 0.008,
      accuracy: 12,
      mocked: true
    };
  }

  // Real device GPS collection via watchPosition
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      const err: any = new Error('Geolocation is not supported by your browser.');
      err.code = 1;
      return reject(err);
    }

    let bestPos: GeoPosition | null = null;
    let readingsCount = 0;
    let watchId: number | null = null;
    let timer: NodeJS.Timeout | null = null;
    let hasResolved = false;

    const cleanup = () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
      }
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
    };

    const finish = () => {
      if (hasResolved) return;
      hasResolved = true;
      cleanup();

      if (bestPos) {
        resolve(bestPos);
      } else {
        const err: any = new Error('Could not acquire GPS position in time. Please step near a window and retry.');
        err.code = 3; // TIMEOUT
        reject(err);
      }
    };

    // Maximum collection duration: default 8 seconds
    const timeoutDuration = options.timeoutMs ?? 8000;
    const threshold = options.stopAccuracyThreshold ?? 30;

    timer = setTimeout(() => {
      finish();
    }, timeoutDuration);

    try {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          readingsCount++;
          const curAccuracy = pos.coords.accuracy;
          const currentReading: GeoPosition = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: curAccuracy,
            mocked: false
          };

          if (!bestPos || curAccuracy < bestPos.accuracy) {
            bestPos = currentReading;
          }

          if (options.onProgress) {
            options.onProgress(bestPos.accuracy, readingsCount);
          }

          // Stop early if accuracy reaches threshold (<= 30m)
          if (curAccuracy <= threshold) {
            finish();
          }
        },
        (err) => {
          // If denied, fail immediately
          if (err.code === 1) {
            cleanup();
            hasResolved = true;
            reject(err);
          }
          // Otherwise keep waiting until timeout in case a reading arrives
        },
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 15000
        }
      );
    } catch (e) {
      cleanup();
      reject(e);
    }
  });
}

export async function getCurrentPosition(storeLat = 19.2604227, storeLng = 72.9794437): Promise<GeoPosition> {
  return getAccuratePosition({ storeLat, storeLng, timeoutMs: 5000 });
}

/**
 * v4 Decision Rule:
 * Allow if distance - min(accuracy, 50) <= radius
 * If accuracy > 150m, weak GPS signal
 * If distance >= radius * 0.75, close to edge of circle
 */
export function evaluateGeofenceRule(distanceM: number, accuracy: number, radiusM: number) {
  const effectiveDistance = distanceM - Math.min(accuracy, 50);
  const isAllowed = effectiveDistance <= radiusM;
  const isWeakSignal = accuracy > 150;
  const isEdge = distanceM >= radiusM * 0.75 && distanceM <= radiusM + 15;

  return {
    isAllowed,
    effectiveDistance,
    isWeakSignal,
    isEdge
  };
}
