import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import {
  calculateDistanceMeters,
  formatDistance,
  getAccuratePosition,
  evaluateGeofenceRule,
  type GeoPosition,
  type MockGeoMode
} from '../utils/geo';

export type { MockGeoMode };

interface LocationContextType {
  userLocation: GeoPosition | null;
  distanceM: number;
  isInsideGeofence: boolean;
  isWeakGps: boolean;
  permissionStatus: 'granted' | 'prompt' | 'denied' | 'idle';
  storeCoords: { lat: number; lng: number; radius: number };
  mockMode: MockGeoMode;
  setMockMode: (mode: MockGeoMode) => void;
  statusPillState: 'green' | 'red' | 'grey';
  statusText: string;
  isLocating: boolean;
  locatingAccuracy: number | null;
  refreshLocation: () => Promise<GeoPosition | null>;
  requestLiveLocation: () => Promise<{ success: boolean; error?: string }>;
  stopSharingLocation: () => void;
  showHelpModal: boolean;
  setShowHelpModal: (show: boolean) => void;
  reloadStoreSettings: () => Promise<void>;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [storeCoords, setStoreCoords] = useState<{ lat: number; lng: number; radius: number }>({
    lat: 19.2584498,
    lng: 72.977272,
    radius: 150
  });

  const [mockMode, setMockModeState] = useState<MockGeoMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mp_geo_mode') as MockGeoMode;
      if (saved) return saved;
    }
    return 'real';
  });

  const [userLocation, setUserLocation] = useState<GeoPosition | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'prompt' | 'denied' | 'idle'>('idle');
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locatingAccuracy, setLocatingAccuracy] = useState<number | null>(null);

  // Sync window global and localStorage for mock mode
  const setMockMode = useCallback((mode: MockGeoMode) => {
    setMockModeState(mode);
    if (typeof window !== 'undefined') {
      window.__MOCK_GEO_MODE = mode;
      localStorage.setItem('mp_geo_mode', mode);
    }
    if (mode === 'inside') {
      setUserLocation({
        lat: storeCoords.lat + 0.00004,
        lng: storeCoords.lng + 0.00004,
        accuracy: 6,
        mocked: true
      });
      setPermissionStatus('granted');
    } else if (mode === 'away') {
      setUserLocation({
        lat: storeCoords.lat - 0.009,
        lng: storeCoords.lng - 0.008,
        accuracy: 12,
        mocked: true
      });
      setPermissionStatus('granted');
    } else if (mode === 'off') {
      setUserLocation(null);
      setPermissionStatus('denied');
    }
  }, [storeCoords.lat, storeCoords.lng]);

  const stopSharingLocation = useCallback(() => {
    setMockMode('off');
  }, [setMockMode]);

  const loadStoreSettings = useCallback(async () => {
    try {
      const s = await api.getSettings();
      if (s) {
        setStoreCoords({
          lat: s.store_lat || 19.2584498,
          lng: s.store_lng || 72.977272,
          radius: s.geofence_radius || 150
        });
      }
    } catch {
      // fallback
    }
  }, []);

  // Accurate GPS Reader with live progress
  const refreshLocation = useCallback(async (): Promise<GeoPosition | null> => {
    setIsLocating(true);
    setLocatingAccuracy(null);
    try {
      const pos = await getAccuratePosition({
        storeLat: storeCoords.lat,
        storeLng: storeCoords.lng,
        timeoutMs: 8000,
        stopAccuracyThreshold: 30,
        onProgress: (acc) => {
          setLocatingAccuracy(acc);
        }
      });
      setUserLocation(pos);
      setPermissionStatus('granted');
      return pos;
    } catch (err: any) {
      setUserLocation(null);
      if (err?.code === 1) { // PERMISSION_DENIED or stopped sharing
        setPermissionStatus('denied');
      } else {
        setPermissionStatus('prompt');
      }
      return null;
    } finally {
      setIsLocating(false);
      setLocatingAccuracy(null);
    }
  }, [storeCoords.lat, storeCoords.lng]);

  const requestLiveLocation = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    // Reset to real mode
    setMockModeState('real');
    if (typeof window !== 'undefined') {
      window.__MOCK_GEO_MODE = 'real';
      localStorage.setItem('mp_geo_mode', 'real');
    }

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setPermissionStatus('denied');
      setUserLocation(null);
      setShowHelpModal(true);
      return { success: false, error: 'Geolocation is not supported by your browser.' };
    }

    setIsLocating(true);
    setLocatingAccuracy(null);

    try {
      const pos = await getAccuratePosition({
        storeLat: storeCoords.lat,
        storeLng: storeCoords.lng,
        timeoutMs: 8000,
        stopAccuracyThreshold: 30,
        onProgress: (acc) => {
          setLocatingAccuracy(acc);
        }
      });
      setUserLocation(pos);
      setPermissionStatus('granted');
      return { success: true };
    } catch (err: any) {
      setUserLocation(null);
      setPermissionStatus('denied');
      setShowHelpModal(true);
      return {
        success: false,
        error:
          err.code === 1
            ? 'Location permission was denied or blocked in your browser settings.'
            : err.message || 'Unable to retrieve location.'
      };
    } finally {
      setIsLocating(false);
      setLocatingAccuracy(null);
    }
  }, [storeCoords.lat, storeCoords.lng]);

  useEffect(() => {
    loadStoreSettings();
  }, [loadStoreSettings]);

  useEffect(() => {
    refreshLocation();
  }, [mockMode, storeCoords.lat, storeCoords.lng, refreshLocation]);

  // Compute v4 Decision Rule:
  // distance = haversine(user, store)
  // Allow if distance - min(accuracy, 50) <= radius
  let distanceM = Infinity;
  let isInsideGeofence = false;
  let isWeakGps = false;

  if (userLocation && permissionStatus === 'granted') {
    distanceM = calculateDistanceMeters(
      userLocation.lat,
      userLocation.lng,
      storeCoords.lat,
      storeCoords.lng
    );
    const accuracy = userLocation.accuracy || 0;
    isWeakGps = accuracy > 150;
    const effectiveDistance = distanceM - Math.min(accuracy, 50);

    // Hiranandani Estate, Thane West perimeter
    const isStoreAtHiranandani = Math.abs(storeCoords.lat - 19.2584498) < 0.005 && Math.abs(storeCoords.lng - 72.977272) < 0.005;
    const isInsideHiranandaniBox = isStoreAtHiranandani && (
      userLocation.lat >= 19.2550 &&
      userLocation.lat <= 19.2630 &&
      userLocation.lng >= 72.9730 &&
      userLocation.lng <= 72.9820
    );

    isInsideGeofence = isInsideHiranandaniBox || effectiveDistance <= storeCoords.radius || distanceM <= storeCoords.radius;
  }

  let statusPillState: 'green' | 'red' | 'grey' = 'grey';
  let statusText = 'Location off. Tap to allow';

  if (permissionStatus === 'denied' || mockMode === 'off') {
    statusPillState = 'grey';
    statusText = 'Location blocked. Check-in locked';
  } else if (!userLocation) {
    statusPillState = 'grey';
    statusText = 'Location off. Tap to allow';
  } else if (isWeakGps) {
    statusPillState = 'red';
    statusText = `Weak GPS signal (±${Math.round(userLocation.accuracy)}m). Step near a window and retry.`;
  } else if (isInsideGeofence) {
    statusPillState = 'green';
    statusText = `📍 You're at Meats & Plants (${formatDistance(distanceM)})`;
  } else {
    statusPillState = 'red';
    statusText = `📍 You're ${formatDistance(distanceM)} away from Meats & Plants. Entry locked`;
  }

  return (
    <LocationContext.Provider
      value={{
        userLocation,
        distanceM,
        isInsideGeofence,
        isWeakGps,
        permissionStatus,
        storeCoords,
        mockMode,
        setMockMode,
        statusPillState,
        statusText,
        isLocating,
        locatingAccuracy,
        refreshLocation,
        requestLiveLocation,
        stopSharingLocation,
        showHelpModal,
        setShowHelpModal,
        reloadStoreSettings: loadStoreSettings
      }}
    >
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};

