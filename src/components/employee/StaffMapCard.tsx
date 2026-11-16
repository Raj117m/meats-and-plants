import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { createCafeMarkerIcon, createStaffMarkerIcon } from '../../utils/leafletIcons';
import { formatDistance } from '../../utils/geo';
import { RefreshCw, MapPin, Navigation, ShieldCheck } from 'lucide-react';

interface StaffMapCardProps {
  userLocation: { lat: number; lng: number; accuracy: number } | null;
  storeCoords: { lat: number; lng: number; radius: number };
  distanceM: number;
  isInsideGeofence: boolean;
  isLocating?: boolean;
  locatingAccuracy?: number | null;
  onRefreshLocation: () => void;
  cafeName?: string;
}

export const StaffMapCard: React.FC<StaffMapCardProps> = ({
  userLocation,
  storeCoords,
  distanceM,
  isInsideGeofence,
  isLocating = false,
  locatingAccuracy = null,
  onRefreshLocation,
  cafeName = 'Meats & Plants'
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const cafeMarkerRef = useRef<L.Marker | null>(null);
  const cafeCircleRef = useRef<L.Circle | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const userAccuracyCircleRef = useRef<L.Circle | null>(null);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [storeCoords.lat, storeCoords.lng],
        zoom: 17,
        zoomControl: false,
        attributionControl: false,
        dragging: true,
        scrollWheelZoom: false,
        doubleClickZoom: true,
        touchZoom: true
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
      }).addTo(map);

      // Café Marker & Geofence Circle
      const cafeMarker = L.marker([storeCoords.lat, storeCoords.lng], {
        icon: createCafeMarkerIcon(),
        interactive: false
      }).addTo(map);

      const cafeCircle = L.circle([storeCoords.lat, storeCoords.lng], {
        radius: storeCoords.radius || 75,
        color: '#2F7D4F',
        fillColor: '#2F7D4F',
        fillOpacity: 0.18,
        weight: 2
      }).addTo(map);

      mapInstanceRef.current = map;
      cafeMarkerRef.current = cafeMarker;
      cafeCircleRef.current = cafeCircle;

      setTimeout(() => {
        map.invalidateSize();
      }, 200);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        cafeMarkerRef.current = null;
        cafeCircleRef.current = null;
        userMarkerRef.current = null;
        userAccuracyCircleRef.current = null;
      }
    };
  }, []);

  // Update positions and fit bounds when userLocation or storeCoords change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Update Café
    if (cafeMarkerRef.current && cafeCircleRef.current) {
      const targetCafe = L.latLng(storeCoords.lat, storeCoords.lng);
      cafeMarkerRef.current.setLatLng(targetCafe);
      cafeCircleRef.current.setLatLng(targetCafe);
      cafeCircleRef.current.setRadius(storeCoords.radius || 75);
    }

    // Update User Marker
    if (userLocation) {
      const userLatLng = L.latLng(userLocation.lat, userLocation.lng);

      if (!userMarkerRef.current) {
        userMarkerRef.current = L.marker(userLatLng, {
          icon: createStaffMarkerIcon(),
          interactive: false
        }).addTo(map);
      } else {
        userMarkerRef.current.setLatLng(userLatLng);
      }

      // Accuracy Ring
      if (!userAccuracyCircleRef.current) {
        userAccuracyCircleRef.current = L.circle(userLatLng, {
          radius: Math.max(10, userLocation.accuracy || 15),
          color: '#3E6FA8',
          fillColor: '#3E6FA8',
          fillOpacity: 0.12,
          weight: 1
        }).addTo(map);
      } else {
        userAccuracyCircleRef.current.setLatLng(userLatLng);
        userAccuracyCircleRef.current.setRadius(Math.max(10, userLocation.accuracy || 15));
      }

      // Auto frame both café and user
      try {
        const bounds = L.latLngBounds([
          [storeCoords.lat, storeCoords.lng],
          [userLocation.lat, userLocation.lng]
        ]);
        map.fitBounds(bounds.pad(0.35), { animate: true, maxZoom: 18 });
      } catch {}
    } else {
      // Remove user marker if null
      if (userMarkerRef.current) {
        map.removeLayer(userMarkerRef.current);
        userMarkerRef.current = null;
      }
      if (userAccuracyCircleRef.current) {
        map.removeLayer(userAccuracyCircleRef.current);
        userAccuracyCircleRef.current = null;
      }
      map.setView([storeCoords.lat, storeCoords.lng], 17, { animate: true });
    }
  }, [userLocation, storeCoords]);

  return (
    <div className="w-full rounded-2xl overflow-hidden border border-[#ECE7DF] bg-[#F6F2EA] shadow-xs relative">
      {/* Map Container */}
      <div ref={mapContainerRef} className="w-full h-44 sm:h-52 z-10" />

      {/* Top Banner Status */}
      <div className="absolute top-2.5 left-2.5 right-2.5 z-20 flex items-center justify-between pointer-events-none">
        <div
          className={`pointer-events-auto px-3 py-1.5 rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 backdrop-blur-md transition-all ${
            !userLocation
              ? 'bg-white/95 text-[#7A746A] border border-[#ECE7DF]'
              : isInsideGeofence
              ? 'bg-[#EAF5EE]/95 text-[#23633E] border border-[#C6E7D1]'
              : 'bg-[#FDF0ED]/95 text-[#C0573E] border border-[#F8D0C8]'
          }`}
        >
          {!userLocation ? (
            <>
              <MapPin size={13} className="text-[#7A746A]" />
              <span>Location Not Shared</span>
            </>
          ) : isInsideGeofence ? (
            <>
              <span className="w-2 h-2 rounded-full bg-[#2F7D4F] animate-ping" />
              <span>You're {formatDistance(distanceM)} from {cafeName} ✅</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-[#C0573E]" />
              <span>You're {formatDistance(distanceM)} away ❌</span>
            </>
          )}
        </div>

        {/* Refresh Location Button */}
        <button
          type="button"
          onClick={onRefreshLocation}
          disabled={isLocating}
          className="pointer-events-auto px-2.5 py-1.5 bg-white/95 hover:bg-white text-[#22201C] rounded-xl text-xs font-bold shadow-xs border border-[#ECE7DF] transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 disabled:opacity-75"
          title="Refresh high-accuracy GPS reading"
        >
          <RefreshCw size={13} className={`text-[#2F7D4F] ${isLocating ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">
            {isLocating
              ? locatingAccuracy != null
                ? `Finding you… ±${Math.round(locatingAccuracy)}m`
                : 'Finding you…'
              : 'Refresh'}
          </span>
        </button>
      </div>

      {/* Bottom Live Searching Bar */}
      {isLocating && (
        <div className="absolute bottom-2.5 left-2.5 right-2.5 z-20 bg-[#22201C]/90 text-white backdrop-blur-md px-3 py-1.5 rounded-xl text-xs flex items-center justify-between shadow-md animate-in fade-in">
          <div className="flex items-center gap-2">
            <RefreshCw size={13} className="animate-spin text-[#2F7D4F]" />
            <span className="font-medium">
              Collecting high-accuracy GPS readings...{' '}
              {locatingAccuracy != null && (
                <strong className="text-[#EAF5EE]">±{Math.round(locatingAccuracy)}m</strong>
              )}
            </span>
          </div>
          <span className="text-[10px] text-[#A8A298]">Filtering best</span>
        </div>
      )}
    </div>
  );
};
