import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { api } from '../../api';
import { createCafeMarkerIcon } from '../../utils/leafletIcons';
import { parseCoordinatesFromInput } from '../../utils/geo';
import { CafeLocation, Settings } from '../../types';
import {
  MapPin,
  Search,
  Navigation,
  Link as LinkIcon,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Save,
  RotateCcw,
  Sparkles,
  Plus,
  Building,
  RefreshCw,
  X
} from 'lucide-react';

interface CafeLocationPickerProps {
  initialLat?: number;
  initialLng?: number;
  initialRadius?: number;
  initialAddress?: string;
  onSaved?: (settings: Settings) => void;
  onClose?: () => void;
  isModal?: boolean;
}

export const CafeLocationPicker: React.FC<CafeLocationPickerProps> = ({
  initialLat = 19.2584498,
  initialLng = 72.977272,
  initialRadius = 150,
  initialAddress = 'Shop No. 21, Hiranandani Estate, Thane',
  onSaved,
  onClose,
  isModal = false
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);

  const [lat, setLat] = useState<number>(initialLat);
  const [lng, setLng] = useState<number>(initialLng);
  const [radius, setRadius] = useState<number>(initialRadius);
  const [address, setAddress] = useState<string>(initialAddress);

  // Search & Link Input States
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [mapsUrlInput, setMapsUrlInput] = useState('');
  const [urlParseSuccess, setUrlParseSuccess] = useState<string | null>(null);

  // Status & Branches States
  const [isSaving, setIsSaving] = useState(false);
  const [isLocatingUser, setIsLocatingUser] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Branches
  const [branches, setBranches] = useState<CafeLocation[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [showAddBranch, setShowAddBranch] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');

  // Fetch branches on mount
  useEffect(() => {
    api.getLocations().then((list) => {
      setBranches(list);
      if (list.length > 0) {
        const primary = list.find((b) => b.is_primary) || list[0];
        setSelectedBranchId(primary.id);
      }
    }).catch(() => {});
  }, []);

  // Initialize or re-center Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [lat, lng],
        zoom: 17,
        zoomControl: true,
        scrollWheelZoom: true
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      // Add Draggable Marker
      const marker = L.marker([lat, lng], {
        icon: createCafeMarkerIcon(),
        draggable: true,
        autoPan: true
      }).addTo(map);

      marker.bindTooltip('Drag me to fine-tune café pin', {
        permanent: false,
        direction: 'top',
        offset: [0, -44]
      });

      // Marker drag event
      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        setLat(Number(pos.lat.toFixed(7)));
        setLng(Number(pos.lng.toFixed(7)));
        if (circleRef.current) {
          circleRef.current.setLatLng(pos);
        }
      });

      // Add Geofence Circle Overlay
      const circle = L.circle([lat, lng], {
        radius: radius,
        color: '#2F7D4F',
        fillColor: '#2F7D4F',
        fillOpacity: 0.16,
        weight: 2
      }).addTo(map);

      // Map Click event: drop pin anywhere
      map.on('click', (e: L.LeafletMouseEvent) => {
        const { lat: clickLat, lng: clickLng } = e.latlng;
        setLat(Number(clickLat.toFixed(7)));
        setLng(Number(clickLng.toFixed(7)));
        marker.setLatLng([clickLat, clickLng]);
        circle.setLatLng([clickLat, clickLng]);
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;
      circleRef.current = circle;

      // Fix tile rendering size after modal open
      setTimeout(() => {
        map.invalidateSize();
      }, 200);
    }

    return () => {
      // Clean up map instance on unmount
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
        circleRef.current = null;
      }
    };
  }, []);

  // Update map position & circle when lat, lng, or radius change
  const updateMapPosition = useCallback((newLat: number, newLng: number, newRadius?: number) => {
    setLat(newLat);
    setLng(newLng);
    if (newRadius !== undefined) setRadius(newRadius);

    if (mapInstanceRef.current && markerRef.current && circleRef.current) {
      const targetLatLng = L.latLng(newLat, newLng);
      markerRef.current.setLatLng(targetLatLng);
      circleRef.current.setLatLng(targetLatLng);
      if (newRadius !== undefined) {
        circleRef.current.setRadius(newRadius);
      }
      mapInstanceRef.current.flyTo(targetLatLng, Math.max(17, mapInstanceRef.current.getZoom()), {
        animate: true,
        duration: 0.8
      });
    }
  }, []);

  // Update circle radius live when slider moves
  const handleRadiusChange = (newRad: number) => {
    setRadius(newRad);
    if (circleRef.current) {
      circleRef.current.setRadius(newRad);
    }
  };

  // 1. Search via Nominatim Geocoding
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setErrorMessage(null);
    try {
      const endpoint = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        searchQuery
      )}&limit=5`;
      const res = await fetch(endpoint, {
        headers: { 'Accept-Language': 'en' }
      });
      const data = await res.json();
      setSearchResults(data || []);
      if (!data || data.length === 0) {
        setErrorMessage('No places found. Try a different landmark or area name.');
      }
    } catch {
      setErrorMessage('Search request failed. Please check network connection.');
    } finally {
      setIsSearching(false);
    }
  };

  const selectSearchResult = (item: any) => {
    const sLat = parseFloat(item.lat);
    const sLng = parseFloat(item.lon);
    if (!isNaN(sLat) && !isNaN(sLng)) {
      updateMapPosition(Number(sLat.toFixed(7)), Number(sLng.toFixed(7)));
      setAddress(item.display_name || searchQuery);
      setSearchResults([]);
      setSearchQuery('');
    }
  };

  // 2. Parse Google Maps Link or Raw Coordinates
  const handleApplyMapsUrl = () => {
    if (!mapsUrlInput.trim()) return;
    const parsed = parseCoordinatesFromInput(mapsUrlInput);
    if (parsed) {
      updateMapPosition(Number(parsed.lat.toFixed(7)), Number(parsed.lng.toFixed(7)));
      setUrlParseSuccess(`Found: ${parsed.lat.toFixed(6)}, ${parsed.lng.toFixed(6)}`);
      setErrorMessage(null);
      setTimeout(() => setUrlParseSuccess(null), 4000);
    } else {
      setErrorMessage('Could not find valid coordinates in the link. Supported: @lat,lng, ?q=lat,lng, !3d...!4d..., or raw coordinates.');
    }
  };

  // 3. Use My Current Location (Device GPS)
  const handleUseMyLocation = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setErrorMessage('Geolocation not supported by this browser.');
      return;
    }

    setIsLocatingUser(true);
    setErrorMessage(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const uLat = Number(pos.coords.latitude.toFixed(7));
        const uLng = Number(pos.coords.longitude.toFixed(7));
        updateMapPosition(uLat, uLng);
        setIsLocatingUser(false);
        setUrlParseSuccess(`Location detected (±${Math.round(pos.coords.accuracy)}m)`);
        setTimeout(() => setUrlParseSuccess(null), 3500);
      },
      (err) => {
        setIsLocatingUser(false);
        setErrorMessage(
          err.code === 1
            ? 'Location access was blocked. Please click the 🔒 lock icon in the address bar to Allow.'
            : 'Unable to get live position. Step near a window and retry.'
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // 4. Save Location to Database
  const handleSaveLocation = async () => {
    setIsSaving(true);
    setErrorMessage(null);
    try {
      // 1. Update main store settings
      const updatedSettings = await api.updateSettings({
        store_lat: lat,
        store_lng: lng,
        geofence_radius: radius,
        store_address: address
      });

      // 2. If a branch is selected, update it
      if (selectedBranchId) {
        await api.updateLocation(selectedBranchId, {
          lat,
          lng,
          radius,
          address
        }).catch(() => {});
      }

      setSaveSuccess(true);
      if (onSaved) onSaved(updatedSettings);

      setTimeout(() => {
        setSaveSuccess(false);
        if (onClose) onClose();
      }, 1500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save location.');
    } finally {
      setIsSaving(false);
    }
  };

  // 5. Add Branch
  const handleCreateBranch = async () => {
    if (!newBranchName.trim()) return;
    try {
      const created = await api.createLocation({
        name: newBranchName.trim(),
        lat,
        lng,
        radius,
        address,
        is_primary: 0
      });
      setBranches((prev) => [...prev, created]);
      setSelectedBranchId(created.id);
      setNewBranchName('');
      setShowAddBranch(false);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to add branch');
    }
  };

  return (
    <div className={`space-y-4 ${isModal ? 'p-1' : ''}`}>
      {/* Header Info Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-[#EAF5EE] border border-[#C6E7D1] rounded-2xl">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#2F7D4F] text-white flex items-center justify-center shrink-0 shadow-xs">
            <MapPin size={18} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#23633E]">
              Interactive Café Geofence Picker
            </h4>
            <p className="text-[11px] text-[#2F7D4F]">
              Search, click on map, drag the pin, or paste a Google Maps link to define the attendance zone.
            </p>
          </div>
        </div>

        {/* Quick action buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleUseMyLocation}
            disabled={isLocatingUser}
            className="px-3 py-1.5 rounded-xl bg-white border border-[#C6E7D1] hover:bg-[#D5EEDB] text-xs font-bold text-[#23633E] transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
            title="Use device GPS when standing in the café"
          >
            <Navigation size={13} className={isLocatingUser ? 'animate-spin' : ''} />
            <span>{isLocatingUser ? 'Locating...' : 'Use My Location'}</span>
          </button>

          {isModal && onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-[#D5EEDB] text-[#23633E] cursor-pointer"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Search & URL Input Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Nominatim Search Box */}
        <div className="relative">
          <form onSubmit={handleSearch} className="flex items-center gap-1.5">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search place, street, or landmark..."
                className="w-full pl-8 pr-3 py-2 text-xs rounded-xl bg-white border border-[#ECE7DF] focus:outline-none focus:border-[#2F7D4F] transition-all shadow-2xs"
              />
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#7A746A]" />
            </div>
            <button
              type="submit"
              disabled={isSearching || !searchQuery.trim()}
              className="px-3 py-2 bg-[#22201C] hover:bg-[#3D3A34] text-white text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50 shadow-2xs"
            >
              {isSearching ? '...' : 'Search'}
            </button>
          </form>

          {/* Search Results Dropdown */}
          {searchResults.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white rounded-xl border border-[#ECE7DF] shadow-lg max-h-56 overflow-y-auto divide-y divide-[#ECE7DF]">
              {searchResults.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => selectSearchResult(item)}
                  className="w-full p-2.5 text-left text-xs hover:bg-[#F6F2EA] transition-colors cursor-pointer flex items-start gap-2"
                >
                  <MapPin size={14} className="text-[#2F7D4F] shrink-0 mt-0.5" />
                  <span className="line-clamp-2 text-[#22201C] font-medium">{item.display_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Google Maps Link / Coordinate Parser */}
        <div className="flex items-center gap-1.5">
          <div className="relative flex-1">
            <input
              type="text"
              value={mapsUrlInput}
              onChange={(e) => setMapsUrlInput(e.target.value)}
              placeholder="Paste Google Maps link or coordinates..."
              className="w-full pl-8 pr-3 py-2 text-xs rounded-xl bg-white border border-[#ECE7DF] focus:outline-none focus:border-[#2F7D4F] transition-all shadow-2xs"
            />
            <LinkIcon size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#7A746A]" />
          </div>
          <button
            type="button"
            onClick={handleApplyMapsUrl}
            disabled={!mapsUrlInput.trim()}
            className="px-3 py-2 bg-[#2F7D4F] hover:bg-[#276842] text-white text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50 shadow-2xs"
          >
            Apply
          </button>
        </div>
      </div>

      {/* Success / Alert Toast */}
      {urlParseSuccess && (
        <div className="p-2.5 bg-[#EAF5EE] border border-[#C6E7D1] rounded-xl text-xs text-[#23633E] font-semibold flex items-center gap-2">
          <CheckCircle2 size={14} />
          <span>{urlParseSuccess}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-2.5 bg-[#FDF0ED] border border-[#F8D0C8] rounded-xl text-xs text-[#C0573E] font-semibold flex items-center gap-2">
          <AlertCircle size={14} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Leaflet Interactive Map Container */}
      <div className="relative rounded-2xl overflow-hidden border border-[#ECE7DF] shadow-xs">
        <div ref={mapContainerRef} className="w-full h-80 sm:h-96 z-10" />

        {/* Map Overlay Badge */}
        <div className="absolute top-3 left-3 z-20 bg-white/95 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-[#ECE7DF] shadow-xs text-[11px] text-[#22201C] flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#2F7D4F] animate-pulse" />
          <span className="font-bold">Allowed Zone: {radius}m Radius</span>
        </div>

        {/* Map Tip */}
        <div className="absolute bottom-3 left-3 right-3 z-20 bg-white/90 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-[#ECE7DF] shadow-xs text-[10px] text-[#7A746A] flex items-center justify-between">
          <span>💡 Tap anywhere on the map or drag the green pin to position the café.</span>
          <span className="font-bold text-[#22201C] hidden sm:inline">OpenStreetMap</span>
        </div>
      </div>

      {/* Radius Slider & Presets */}
      <div className="p-4 bg-[#F6F2EA] rounded-2xl border border-[#ECE7DF] space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-[#22201C] flex items-center gap-1.5">
            <Sliders size={14} className="text-[#2F7D4F]" />
            <span>Geofence Radius (Strict Shift Zone)</span>
          </span>
          <span className="font-extrabold text-[#2F7D4F] text-sm tabular-nums">
            {radius} meters
          </span>
        </div>

        <input
          type="range"
          min={25}
          max={300}
          step={5}
          value={radius}
          onChange={(e) => handleRadiusChange(Number(e.target.value))}
          className="w-full accent-[#2F7D4F] cursor-pointer"
        />

        <div className="flex items-center justify-between gap-1.5 pt-1">
          <span className="text-[10px] text-[#7A746A]">25m (Tight)</span>
          <div className="flex items-center gap-1.5">
            {[
              { val: 30, label: '30m' },
              { val: 50, label: '50m' },
              { val: 75, label: '75m (Default)' },
              { val: 120, label: '120m' },
              { val: 200, label: '200m' }
            ].map((p) => (
              <button
                key={p.val}
                type="button"
                onClick={() => handleRadiusChange(p.val)}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                  radius === p.val
                    ? 'bg-[#2F7D4F] text-white'
                    : 'bg-white text-[#7A746A] border border-[#ECE7DF] hover:bg-[#F3EFE6]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <span className="text-[10px] text-[#7A746A]">300m (Block)</span>
        </div>
      </div>

      {/* Details Strip (6-decimal coordinates & address) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div className="p-3 bg-white rounded-xl border border-[#ECE7DF] space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#7A746A]">
            GPS Coordinates (6 Decimals)
          </span>
          <div className="font-mono font-bold text-[#22201C] tabular-nums text-xs">
            {lat.toFixed(6)}, {lng.toFixed(6)}
          </div>
          <div className="text-[10px] text-[#7A746A]">
            Lat: {lat.toFixed(6)} · Lng: {lng.toFixed(6)}
          </div>
        </div>

        <div className="p-3 bg-white rounded-xl border border-[#ECE7DF] space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#7A746A]">
            Address / Label
          </span>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Store address..."
            className="w-full text-xs font-semibold text-[#22201C] bg-transparent border-b border-dashed border-[#ECE7DF] focus:outline-none focus:border-[#2F7D4F] pb-0.5"
          />
          <div className="text-[10px] text-[#7A746A]">
            Displayed to staff on shift punch screen
          </div>
        </div>
      </div>

      {/* Multi-Branch Selector (Optional Bonus) */}
      {branches.length > 0 && (
        <div className="p-3 bg-white rounded-xl border border-[#ECE7DF] space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-[#22201C] flex items-center gap-1.5">
              <Building size={14} className="text-[#2F7D4F]" />
              <span>Café Branch Locations ({branches.length})</span>
            </span>
            <button
              type="button"
              onClick={() => setShowAddBranch(!showAddBranch)}
              className="text-[11px] text-[#2F7D4F] hover:underline font-bold cursor-pointer flex items-center gap-1"
            >
              <Plus size={12} />
              <span>Add Branch</span>
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {branches.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => {
                  setSelectedBranchId(b.id);
                  updateMapPosition(b.lat, b.lng, b.radius);
                  if (b.address) setAddress(b.address);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedBranchId === b.id
                    ? 'bg-[#2F7D4F] text-white shadow-2xs'
                    : 'bg-[#F6F2EA] text-[#55524B] hover:bg-[#ECE7DF]'
                }`}
              >
                <span>{b.name}</span>
                {b.is_primary === 1 && (
                  <span className="text-[9px] px-1 py-0.2 rounded bg-white/20 uppercase">
                    Main
                  </span>
                )}
              </button>
            ))}
          </div>

          {showAddBranch && (
            <div className="mt-2 pt-2 border-t border-[#ECE7DF] flex items-center gap-2">
              <input
                type="text"
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value)}
                placeholder="New branch name (e.g. Bandra Outlet)..."
                className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-[#F6F2EA] border border-[#ECE7DF] focus:outline-none"
              />
              <button
                type="button"
                onClick={handleCreateBranch}
                disabled={!newBranchName.trim()}
                className="px-3 py-1.5 bg-[#2F7D4F] text-white text-xs font-bold rounded-xl hover:bg-[#276842] cursor-pointer"
              >
                Save Branch
              </button>
            </div>
          )}
        </div>
      )}

      {/* Save Button */}
      <div className="pt-2">
        <button
          type="button"
          onClick={handleSaveLocation}
          disabled={isSaving}
          className="w-full py-3.5 px-6 rounded-2xl bg-[#2F7D4F] hover:bg-[#276842] text-white text-sm font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2 active:scale-98 disabled:opacity-60"
        >
          {isSaving ? (
            <>
              <RefreshCw size={16} className="animate-spin" />
              <span>Saving Location...</span>
            </>
          ) : saveSuccess ? (
            <>
              <CheckCircle2 size={16} className="animate-scale-in" />
              <span>Location Saved &amp; Applied Instantly! 🎉</span>
            </>
          ) : (
            <>
              <Save size={16} />
              <span>Save Location (Applies Instantly to All Staff)</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
