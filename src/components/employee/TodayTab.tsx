import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLocation } from '../../context/LocationContext';
import { api } from '../../api';
import { LocationPill } from '../common/LocationPill';
import { StaffMapCard } from './StaffMapCard';
import { PunchFixModal } from './PunchFixModal';
import { formatTime12, formatCountdown, formatDuration } from '../../utils/time';
import { formatDistance, calculateDistanceMeters } from '../../utils/geo';
import confetti from 'canvas-confetti';
import {
  Coffee,
  LogOut,
  CheckCircle2,
  Clock,
  Lock,
  AlertTriangle,
  Play,
  PlayCircle,
  MapPin,
  RefreshCw,
  Navigation,
  RotateCcw
} from 'lucide-react';

interface TodayTabProps {
  onRefreshNeeded?: () => void;
}

export const TodayTab: React.FC<TodayTabProps> = ({ onRefreshNeeded }) => {
  const { currentStaff, switchStaff } = useAuth();
  const {
    isInsideGeofence,
    isWeakGps,
    userLocation,
    distanceM,
    storeCoords,
    permissionStatus,
    mockMode,
    isLocating,
    locatingAccuracy,
    refreshLocation,
    requestLiveLocation,
    stopSharingLocation,
    setMockMode,
    setShowHelpModal
  } = useLocation();

  const [loading, setLoading] = useState(false);
  const [isRequestingLocation, setIsRequestingLocation] = useState(false);
  const [successAnimation, setSuccessAnimation] = useState(false);
  const [rosterData, setRosterData] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fixModalOpen, setFixModalOpen] = useState(false);

  // Live timer states
  const [workedSeconds, setWorkedSeconds] = useState(0);
  const [breakSecondsLeft, setBreakSecondsLeft] = useState(0);

  const fetchTodayStatus = async () => {
    if (!currentStaff?.id) return;
    try {
      const data = await api.getTodayRoster('2026-11-15');
      const myRoster = data.roster.find((r) => r.id === currentStaff.id);
      setRosterData(myRoster);

      if (myRoster) {
        setWorkedSeconds(myRoster.workedSeconds || 0);
        setBreakSecondsLeft(myRoster.breakSecondsLeft || 0);
      }
    } catch (err) {
      console.error('Failed to load roster:', err);
    }
  };

  const handleResetToday = async () => {
    if (!currentStaff?.id) return;
    try {
      setLoading(true);
      await api.resetEmployeeToday(currentStaff.id, '2026-11-15');
      await fetchTodayStatus();
      if (onRefreshNeeded) onRefreshNeeded();
    } catch (err: any) {
      alert(`Error resetting: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodayStatus();
    const interval = setInterval(fetchTodayStatus, 8000);
    return () => clearInterval(interval);
  }, [currentStaff?.id]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (rosterData?.status === 'on_floor') {
        setWorkedSeconds((prev) => prev + 1);
      } else if (rosterData?.status === 'on_break' && breakSecondsLeft > 0) {
        setBreakSecondsLeft((prev) => Math.max(0, prev - 1));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [rosterData?.status, breakSecondsLeft]);

  const verifyLocationOrThrow = async () => {
    if (userLocation && userLocation.accuracy <= 150) {
      return userLocation;
    }
    const pos = await refreshLocation();
    if (!pos) {
      setShowHelpModal(true);
      throw new Error('Location is off or blocked. Please allow location access to continue.');
    }
    if (pos.accuracy > 150) {
      throw new Error(`Weak GPS signal (±${Math.round(pos.accuracy)}m). Step near a window and tap retry.`);
    }
    return pos;
  };

  const isPosInsideSpartaOrGeofence = (pos: { lat: number; lng: number; accuracy?: number }) => {
    const freshDist = calculateDistanceMeters(pos.lat, pos.lng, storeCoords.lat, storeCoords.lng);
    const accuracy = pos.accuracy || 0;
    const freshEffective = freshDist - Math.min(accuracy, 50);

    const isStoreAtSparta = Math.abs(storeCoords.lat - 19.2604227) < 0.005 && Math.abs(storeCoords.lng - 72.9794437) < 0.005;
    const isInsideSpartaBox = isStoreAtSparta && (
      pos.lat >= 19.2580 &&
      pos.lat <= 19.2630 &&
      pos.lng >= 72.9770 &&
      pos.lng <= 72.9820
    );

    const isAllowed = isInsideSpartaBox || freshEffective <= storeCoords.radius || freshDist <= storeCoords.radius;
    return { isAllowed, freshDist, freshEffective };
  };

  const handleEnableLocation = async () => {
    setIsRequestingLocation(true);
    setErrorMessage(null);
    try {
      const res = await requestLiveLocation();
      if (!res.success) {
        setShowHelpModal(true);
      }
    } catch (err: any) {
      setShowHelpModal(true);
      setErrorMessage(err.message || 'Location access failed');
    } finally {
      setIsRequestingLocation(false);
    }
  };

  const handleStartShift = async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const pos = await verifyLocationOrThrow();
      const check = isPosInsideSpartaOrGeofence(pos);

      if (!check.isAllowed) {
        setErrorMessage(`📍 You are ${formatDistance(check.freshDist)} away from Sparta Building. You must be inside or very near Meats & Plants (${storeCoords.radius}m) to start your shift.`);
        return;
      }

      // Celebratory confetti animation on shift start
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#2F7D4F', '#EAF5EE', '#C0573E']
      });

      setSuccessAnimation(true);
      setTimeout(() => setSuccessAnimation(false), 2500);

      const nowIso = new Date().toISOString();
      // Start live clock immediately
      setWorkedSeconds(1);
      setRosterData((prev: any) => ({
        ...(prev || {}),
        status: 'on_floor',
        checkInTime: nowIso,
        workedSeconds: 1
      }));

      await api.submitPunch({
        employee_id: currentStaff!.id,
        type: 'check_in',
        lat: pos.lat,
        lng: pos.lng,
        accuracy: pos.accuracy,
        custom_time: nowIso
      });

      await fetchTodayStatus();
      if (onRefreshNeeded) onRefreshNeeded();
    } catch (err: any) {
      setErrorMessage(err.message || 'Could not start shift');
    } finally {
      setLoading(false);
    }
  };

  const handleStartBreak = async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const pos = await verifyLocationOrThrow();
      const check = isPosInsideSpartaOrGeofence(pos);
      if (!check.isAllowed) {
        setErrorMessage(`📍 You're outside Sparta Building (${formatDistance(check.freshDist)} away). Must be inside Meats & Plants (${storeCoords.radius}m) to start break.`);
        return;
      }

      const nowIso = new Date().toISOString();
      await api.submitPunch({
        employee_id: currentStaff!.id,
        type: 'start_break',
        lat: pos.lat,
        lng: pos.lng,
        accuracy: pos.accuracy,
        custom_time: nowIso
      });
      await fetchTodayStatus();
      if (onRefreshNeeded) onRefreshNeeded();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to start break');
    } finally {
      setLoading(false);
    }
  };

  const handleEndBreak = async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const pos = await verifyLocationOrThrow();
      const check = isPosInsideSpartaOrGeofence(pos);
      if (!check.isAllowed) {
        setErrorMessage(`📍 You're outside Sparta Building (${formatDistance(check.freshDist)} away). Return inside Meats & Plants to resume shift.`);
        return;
      }

      const nowIso = new Date().toISOString();
      await api.submitPunch({
        employee_id: currentStaff!.id,
        type: 'end_break',
        lat: pos.lat,
        lng: pos.lng,
        accuracy: pos.accuracy,
        custom_time: nowIso
      });
      await fetchTodayStatus();
      if (onRefreshNeeded) onRefreshNeeded();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to end break');
    } finally {
      setLoading(false);
    }
  };

  const handleEndShift = async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const pos = await verifyLocationOrThrow();
      const check = isPosInsideSpartaOrGeofence(pos);

      if (!check.isAllowed) {
        setErrorMessage(`📍 You are outside Sparta Building (${formatDistance(check.freshDist)} away). You must be inside Meats & Plants (${storeCoords.radius}m) to end your shift.`);
        return;
      }

      if (!confirm('Ready to Stop Shift (check out) for today at Meats & Plants?')) {
        return;
      }

      const nowIso = new Date().toISOString();
      await api.submitPunch({
        employee_id: currentStaff!.id,
        type: 'check_out',
        lat: pos.lat,
        lng: pos.lng,
        accuracy: pos.accuracy,
        custom_time: nowIso
      });

      await fetchTodayStatus();
      if (onRefreshNeeded) onRefreshNeeded();
    } catch (err: any) {
      setErrorMessage(err.message || 'Stop shift failed');
    } finally {
      setLoading(false);
    }
  };

  const status = rosterData?.status || 'not_in_yet';
  const firstName = currentStaff?.name ? currentStaff.name.split(' ')[0] : 'Staff';

  return (
    <div className="flex flex-col items-center justify-between min-h-[calc(100vh-140px)] max-w-[430px] mx-auto px-4 py-4 space-y-4">
      {/* Top Bar: Switch Staff link + Location pill */}
      <div className="w-full flex items-center justify-between">
        <button
          onClick={switchStaff}
          className="text-xs text-[#7A746A] hover:text-[#22201C] font-semibold cursor-pointer"
        >
          Not {firstName}? <span className="underline">Switch</span>
        </button>

        <LocationPill />
      </div>

      {/* Greeting Card */}
      <div className="text-center space-y-1">
        <p className="text-xs font-semibold text-[#7A746A] tracking-tight">
          Sunday, 15 Nov · Shift 12:00 PM → 12:00 AM
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-[#22201C]">
          Hi {firstName}! 👋
        </h1>
        <p className="text-xs text-[#7A746A]">
          {currentStaff?.role} · Today's earning: <strong className="text-[#22201C] tabular-nums font-bold">₹{currentStaff?.daily_wage || 600}</strong>
        </p>
      </div>

      {/* Error / Location Banner */}
      {errorMessage && (
        <div className="w-full p-3 bg-[#FDF0ED] border border-[#F8D0C8] rounded-2xl flex items-center gap-2 text-xs text-[#A8382B] animate-shake">
          <AlertTriangle size={15} className="shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Hero Timer / Clock Center Area */}
      <div className="my-auto py-4 flex flex-col items-center justify-center relative w-full">
        <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center">
          {/* Subtle Outer Glow */}
          <div className="absolute inset-0 rounded-full bg-white border border-[#ECE7DF] warm-card" />

          {/* SVG Progress Arc */}
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="44"
              stroke="#F6F2EA"
              strokeWidth="5"
              fill="transparent"
            />
            <circle
              cx="50"
              cy="50"
              r="44"
              stroke={
                status === 'on_break'
                  ? '#E8B44A'
                  : status === 'on_floor'
                  ? '#2F7D4F'
                  : status === 'checked_out'
                  ? '#4A7BB7'
                  : '#ECE7DF'
              }
              strokeWidth="5.5"
              strokeDasharray={276}
              strokeDashoffset={
                status === 'on_floor'
                  ? Math.max(0, 276 - (workedSeconds / (12 * 3600)) * 276)
                  : status === 'on_break'
                  ? Math.max(0, 276 - (breakSecondsLeft / (3 * 3600)) * 276)
                  : 0
              }
              strokeLinecap="round"
              fill="transparent"
              className="transition-all duration-1000 ease-linear"
            />
          </svg>

          {/* Center Info */}
          <div className="relative z-10 flex flex-col items-center justify-center text-center p-4">
            {status === 'on_floor' ? (
              <>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAF5EE] text-[#23633E] border border-[#C6E7D1] text-xs font-semibold mb-2">
                  <span className="w-2 h-2 rounded-full bg-[#2F7D4F] pulse-dot-green" />
                  <span>On Floor</span>
                </div>
                <div className="hero-num text-4xl sm:text-5xl font-extrabold text-[#22201C] tabular-nums">
                  {formatDuration(workedSeconds)}
                </div>
                <p className="text-xs text-[#7A746A] mt-1 font-medium">Worked Today</p>
              </>
            ) : status === 'on_break' ? (
              <>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FEF7E6] text-[#9A6A12] border border-[#FDE3A7] text-xs font-semibold mb-2">
                  <Coffee size={13} />
                  <span>3-hr Break</span>
                </div>
                <div className="hero-num text-3xl sm:text-4xl font-bold text-[#E8B44A] tabular-nums">
                  {formatCountdown(breakSecondsLeft)}
                </div>
                <p className="text-xs text-[#7A746A] mt-1 font-medium">Time Remaining</p>
              </>
            ) : status === 'checked_out' ? (
              <>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EDF4FC] text-[#2A5A8F] border border-[#CDE0F7] text-xs font-semibold mb-2">
                  <CheckCircle2 size={13} />
                  <span>Shift Completed</span>
                </div>
                <div className="hero-num text-3xl sm:text-4xl font-bold text-[#22201C] tabular-nums">
                  {formatDuration(workedSeconds)}
                </div>
                <p className="text-xs text-[#7A746A] mt-1">Out at {formatTime12(rosterData?.checkOutTime)}</p>
              </>
            ) : status === 'on_leave' ? (
              <>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EDF4FC] text-[#2A5A8F] border border-[#CDE0F7] text-xs font-semibold mb-2">
                  <span>Approved Leave</span>
                </div>
                <div className="text-2xl font-bold text-[#22201C] mt-1">Day Off</div>
                <p className="text-xs text-[#7A746A] mt-1">Enjoy your rest day!</p>
              </>
            ) : (
              <>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F3F1EC] text-[#55524B] border border-[#E5E1D8] text-xs font-semibold mb-2">
                  <Clock size={13} />
                  <span>Shift Ready</span>
                </div>
                <div className="text-2xl font-bold text-[#22201C]">
                  Start Shift
                </div>
                <p className="text-xs text-[#7A746A] mt-1">
                  {isInsideGeofence ? 'Tap below to punch in' : 'Head to Sparta Building to enter shift'}
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Staff Live Location Map Card (v4) */}
      <div className="w-full">
        <StaffMapCard
          userLocation={userLocation}
          storeCoords={storeCoords}
          distanceM={distanceM}
          isInsideGeofence={isInsideGeofence}
          isLocating={isLocating || isRequestingLocation}
          locatingAccuracy={locatingAccuracy}
          onRefreshLocation={handleEnableLocation}
        />
      </div>

      {/* Primary Action Button */}
      <div className="w-full space-y-3 pt-2">
        {status === 'not_in_yet' && (
          <div className="space-y-3">
            {(!userLocation || permissionStatus === 'denied' || mockMode === 'off') ? (
              <div className="p-4 rounded-2xl bg-[#F6F2EA] border border-[#ECE7DF] text-center space-y-3">
                <div className="flex items-center justify-center gap-1.5 font-bold text-[#A8382B] text-xs">
                  <AlertTriangle size={15} />
                  <span>Location Sharing Off / Blocked</span>
                </div>
                <p className="text-[11px] text-[#7A746A] leading-relaxed">
                  Location is strictly required to verify you are at Meats &amp; Plants (Sparta Building, {storeCoords.radius}m radius) before starting your shift.
                </p>

                <button
                  type="button"
                  onClick={handleEnableLocation}
                  disabled={isRequestingLocation}
                  className="w-full py-3 px-4 rounded-xl bg-[#22201C] hover:bg-[#3D3A34] text-white text-xs font-bold transition-all cursor-pointer shadow-xs flex items-center justify-center gap-2 active:scale-98 disabled:opacity-75"
                >
                  {isRequestingLocation ? (
                    <>
                      <RefreshCw size={14} className="animate-spin text-[#2F7D4F]" />
                      <span>Requesting GPS Location...</span>
                    </>
                  ) : (
                    <>
                      <Navigation size={14} className="text-[#2F7D4F]" />
                      <span>Enable / Share My Location</span>
                    </>
                  )}
                </button>

                <p className="text-[10px] text-[#7A746A] italic">
                  If blocked, click the 🔒 lock or tune icon in your address bar to <strong>Allow Location</strong>, or use the quick trial test buttons below.
                </p>

                <div className="pt-2 border-t border-[#ECE7DF] space-y-1.5">
                  <p className="text-[10px] font-bold text-[#7A746A] uppercase tracking-wider">
                    Quick Trial Testing
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setMockMode('inside')}
                      className="px-2.5 py-1.5 rounded-lg bg-[#EAF5EE] text-[#23633E] border border-[#C6E7D1] text-[11px] font-bold hover:bg-[#D5EEDB] transition-all cursor-pointer flex items-center justify-center gap-1"
                    >
                      <span>📍 At Sparta (30m)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMockMode('away')}
                      className="px-2.5 py-1.5 rounded-lg bg-[#FDF0ED] text-[#C0573E] border border-[#F8D0C8] text-[11px] font-bold hover:bg-[#FBE9E7] transition-all cursor-pointer flex items-center justify-center gap-1"
                    >
                      <span>🚶 Away (1.3 km)</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : !isInsideGeofence ? (
              <div className="p-4 rounded-2xl bg-[#FDF0ED] border border-[#F8D0C8] text-center space-y-2">
                <div className="flex items-center justify-center gap-1.5 font-bold text-[#C0573E] text-xs">
                  <Lock size={15} className="text-[#C0573E]" />
                  <span>Outside Geofence ({formatDistance(distanceM)} away)</span>
                </div>
                <p className="text-[11px] text-[#7A746A] leading-relaxed">
                  Shift entry is only permitted when you are inside or very near Sparta Building ({storeCoords.radius}m).
                </p>
                <div className="pt-2 border-t border-[#F8D0C8]/60 flex items-center justify-between text-[11px]">
                  <button
                    type="button"
                    onClick={() => setMockMode('inside')}
                    className="font-bold text-[#23633E] hover:underline cursor-pointer"
                  >
                    📍 Switch to At Sparta (30m)
                  </button>
                  <button
                    type="button"
                    onClick={stopSharingLocation}
                    className="text-[#7A746A] hover:underline cursor-pointer"
                  >
                    🚫 Stop Sharing
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-[#EAF5EE] border border-[#C6E7D1] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-[#23633E] text-xs">
                    <CheckCircle2 size={15} />
                    <span>Location Verified: At Sparta Building</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#2F7D4F] text-white">
                    {distanceM < 1 ? '0m' : formatDistance(distanceM)} away
                  </span>
                </div>
                <p className="text-[11px] text-[#2F7D4F]">
                  You are inside the {storeCoords.radius}m café radius. Tap below to start shift!
                </p>
                <div className="pt-1.5 border-t border-[#C6E7D1]/70 flex items-center justify-between text-[10px]">
                  <button
                    type="button"
                    onClick={stopSharingLocation}
                    className="text-[#C0573E] hover:underline font-semibold cursor-pointer"
                  >
                    🚫 Stop Sharing Location (Lock Shift)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMockMode('away')}
                    className="text-[#7A746A] hover:underline font-semibold cursor-pointer"
                  >
                    🚶 Test Away (1.3 km)
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={handleStartShift}
              disabled={(!isInsideGeofence && (userLocation !== null && permissionStatus === 'granted')) || loading}
              className={`w-full py-4 px-6 rounded-2xl text-base font-bold transition-all tap-bounce flex items-center justify-center gap-2 shadow-xs ${
                isInsideGeofence
                  ? 'text-white bg-[#2F7D4F] hover:bg-[#276842] cursor-pointer active:scale-98 ring-4 ring-[#2F7D4F]/20'
                  : 'bg-[#F6F2EA] text-[#A8A298] border border-[#ECE7DF] cursor-not-allowed'
              }`}
            >
              {successAnimation ? (
                <>
                  <CheckCircle2 size={20} className="animate-scale-in" />
                  <span>Shift Started! 🎉</span>
                </>
              ) : isInsideGeofence ? (
                <>
                  <Play size={18} fill="currentColor" />
                  <span>Start Shift (At Sparta Building)</span>
                </>
              ) : (
                <>
                  <Lock size={18} />
                  <span>
                    {!userLocation || permissionStatus === 'denied' || mockMode === 'off'
                      ? 'Enable Location to Start Shift'
                      : 'Start Shift (Must Be At Sparta)'}
                  </span>
                </>
              )}
            </button>
          </div>
        )}

        {status === 'on_floor' && (
          <div className="space-y-2.5">
            <button
              onClick={handleEndShift}
              disabled={loading || !isInsideGeofence}
              className={`w-full py-4 px-6 rounded-2xl font-bold text-sm transition-all tap-bounce flex items-center justify-center gap-2 shadow-xs active:scale-98 ${
                isInsideGeofence
                  ? 'text-white bg-[#C0573E] hover:bg-[#A84530] cursor-pointer'
                  : 'text-[#A8A298] border border-[#ECE7DF] bg-[#F6F2EA] cursor-not-allowed'
              }`}
              title={isInsideGeofence ? 'Stop Shift at Sparta Building' : `Must be inside Sparta Building to stop shift (${formatDistance(distanceM)} away)`}
            >
              {isInsideGeofence ? (
                <>
                  <LogOut size={18} />
                  <span>Stop Shift (Check Out)</span>
                </>
              ) : (
                <>
                  <Lock size={18} />
                  <span>Stop Shift (Must Be At Sparta)</span>
                </>
              )}
            </button>

            <button
              onClick={handleStartBreak}
              disabled={!isInsideGeofence || loading}
              className={`w-full py-3 px-4 rounded-xl font-bold text-xs transition-all tap-bounce flex items-center justify-center gap-2 ${
                isInsideGeofence
                  ? 'text-[#9A6A12] bg-[#FEF7E6] border border-[#FDE3A7] hover:bg-[#FDE3A7]/50 cursor-pointer'
                  : 'bg-[#F6F2EA] text-[#A8A298] cursor-not-allowed border border-[#ECE7DF]'
              }`}
            >
              <Coffee size={15} />
              <span>Start 3-hr Break</span>
            </button>
          </div>
        )}

        {status === 'on_break' && (
          <div className="space-y-2.5">
            <button
              onClick={handleEndBreak}
              disabled={!isInsideGeofence || loading}
              className={`w-full py-4 px-6 rounded-2xl font-bold text-xs transition-all tap-bounce flex items-center justify-center gap-2 shadow-xs ${
                isInsideGeofence
                  ? 'text-white bg-[#2F7D4F] hover:bg-[#276842] cursor-pointer'
                  : 'bg-[#F6F2EA] text-[#A8A298] cursor-not-allowed'
              }`}
            >
              <PlayCircle size={18} />
              <span>End Break &amp; Return to Floor</span>
            </button>

            <button
              onClick={handleEndShift}
              disabled={loading || !isInsideGeofence}
              className={`w-full py-3 px-4 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 ${
                isInsideGeofence
                  ? 'text-[#A8382B] bg-[#FDF0ED] border border-[#F8D0C8] hover:bg-[#FBE9E7] cursor-pointer'
                  : 'text-[#A8A298] bg-[#F6F2EA] border border-[#ECE7DF] cursor-not-allowed'
              }`}
            >
              {isInsideGeofence ? <LogOut size={15} /> : <Lock size={15} />}
              <span>Stop Shift for Today {isInsideGeofence ? '' : '(Must Be At Sparta)'}</span>
            </button>
          </div>
        )}

        {status === 'checked_out' && (
          <div className="p-4 bg-[#F6F2EA] rounded-2xl text-center space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAF5EE] text-[#23633E] border border-[#C6E7D1] text-xs font-bold">
              <CheckCircle2 size={14} />
              <span>Shift Completed &amp; Recorded</span>
            </div>
            <p className="text-xs text-[#7A746A]">
              Check-in and check-out successfully recorded for today. Great job! 👏
            </p>
            <button
              onClick={handleResetToday}
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-white border border-[#ECE7DF] text-xs font-bold text-[#C0573E] hover:bg-[#FDF0ED] transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-2 active:scale-98"
            >
              <RotateCcw size={14} />
              <span>↺ Reset Shift (Re-test Check-in from Scratch)</span>
            </button>
          </div>
        )}

        {/* Status Strip & Forgot to Punch Link */}
        <div className="flex items-center justify-between text-xs px-2 pt-1">
          {rosterData?.checkInTime ? (
            <span className="text-[#7A746A]">
              Checked in at <strong className="text-[#22201C]">{formatTime12(rosterData.checkInTime)}</strong>
              {rosterData.isLate && <span className="text-[#9A6A12] ml-1 font-bold">(Late mark)</span>}
            </span>
          ) : (
            <span className="text-[#7A746A]">Shift not started</span>
          )}

          <button
            onClick={() => setFixModalOpen(true)}
            className="text-xs text-[#C0573E] hover:underline font-semibold cursor-pointer"
          >
            Forgot to punch? Request a fix
          </button>
        </div>
      </div>

      {/* Trial Reset Helper */}
      <div className="w-full text-center pt-2">
        <button
          onClick={handleResetToday}
          disabled={loading}
          className="text-[11px] text-[#7A746A] hover:text-[#C0573E] underline font-semibold cursor-pointer inline-flex items-center gap-1 transition-colors"
          title="Reset your shift for today to test check-in again"
        >
          <span>↺ Reset today's shift to test check-in again</span>
        </button>
      </div>

      {/* Forgot to punch Modal */}
      <PunchFixModal
        isOpen={fixModalOpen}
        onClose={() => setFixModalOpen(false)}
        employeeId={currentStaff!.id}
        onSuccess={() => fetchTodayStatus()}
      />
    </div>
  );
};
