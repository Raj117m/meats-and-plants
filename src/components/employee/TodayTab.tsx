import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLocation } from '../../context/LocationContext';
import { api } from '../../api';
import { DayState } from '../../types';
import { StaffMapCard } from './StaffMapCard';
import { PunchFixModal } from './PunchFixModal';
import { RulesModal } from '../common/RulesModal';
import { formatTime12, formatCountdown, formatDuration } from '../../utils/time';
import { formatDistance, calculateDistanceMeters } from '../../utils/geo';
import {
  Coffee,
  LogOut,
  Clock,
  Play,
  RotateCcw,
  Info,
  AlertCircle,
  MapPin,
  RefreshCw,
  CheckCircle2
} from 'lucide-react';

interface TodayTabProps {
  onRefreshNeeded?: () => void;
}

export const TodayTab: React.FC<TodayTabProps> = ({ onRefreshNeeded }) => {
  const { currentStaff, switchStaff } = useAuth();
  const {
    isInsideGeofence,
    userLocation,
    distanceM,
    storeCoords,
    isLocating,
    locatingAccuracy,
    refreshLocation,
    requestLiveLocation,
    setShowHelpModal
  } = useLocation();

  const [loading, setLoading] = useState(false);
  const [dayState, setDayState] = useState<DayState | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fixModalOpen, setFixModalOpen] = useState(false);
  const [rulesModalOpen, setRulesModalOpen] = useState(false);

  // Dynamic seconds for live rendering
  const [liveWorkedSeconds, setLiveWorkedSeconds] = useState(0);
  const [liveBreakSecondsLeft, setLiveBreakSecondsLeft] = useState(0);

  // Fetch authoritative state from backend
  const fetchState = async () => {
    if (!currentStaff?.id) return;
    try {
      const state = await api.getTodayState(currentStaff.id);
      setDayState(state);
      setLiveWorkedSeconds(state.workedSeconds || 0);
      setLiveBreakSecondsLeft(state.breakRemainingSeconds || 0);
    } catch (err) {
      console.error('Failed to fetch today state:', err);
    }
  };

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 10000); // Polling every 10s as background sync
    return () => clearInterval(interval);
  }, [currentStaff?.id]);

  // Section 1: Timer dial driven strictly by shiftStart from server
  // worked = now - shiftStart - breakDuration
  useEffect(() => {
    if (!dayState?.shiftStart || (dayState.status !== 'ON_SHIFT' && dayState.status !== 'ON_BREAK')) {
      return;
    }

    const startMs = new Date(dayState.shiftStart).getTime();
    const bStartMs = dayState.breakStart ? new Date(dayState.breakStart).getTime() : null;
    const bEndMs = dayState.breakEnd ? new Date(dayState.breakEnd).getTime() : null;
    const maxBreakSec = 180 * 60; // 3 hours

    const timer = setInterval(() => {
      const nowMs = Date.now();

      if (dayState.status === 'ON_BREAK' && bStartMs) {
        const elapsedBreak = Math.floor((nowMs - bStartMs) / 1000);
        const remaining = Math.max(0, maxBreakSec - elapsedBreak);
        setLiveBreakSecondsLeft(remaining);

        // Worked time frozen at break start
        setLiveWorkedSeconds(Math.max(0, Math.floor((bStartMs - startMs) / 1000)));

        // If 3 hours elapsed, trigger auto refresh
        if (remaining <= 0) {
          fetchState();
        }
      } else if (dayState.status === 'ON_SHIFT') {
        let breakDurationMs = 0;
        if (bStartMs) {
          const actualEnd = bEndMs || Math.min(nowMs, bStartMs + maxBreakSec * 1000);
          breakDurationMs = Math.max(0, actualEnd - bStartMs);
        }
        const worked = Math.max(0, Math.floor((nowMs - startMs - breakDurationMs) / 1000));
        setLiveWorkedSeconds(worked);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [dayState?.shiftStart, dayState?.breakStart, dayState?.breakEnd, dayState?.status]);

  // Section 1: Verify location with a strict 15s timeout
  const verifyLocationWithTimeout = async (): Promise<{ lat: number; lng: number; accuracy: number }> => {
    if (userLocation && userLocation.accuracy <= 150) {
      return userLocation;
    }

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('GPS signal timeout (15s). Step near a window or check location permission.'));
      }, 15000);

      requestLiveLocation()
        .then((res) => {
          clearTimeout(timeoutId);
          if (res.success && res.coords) {
            resolve({ lat: res.coords.lat, lng: res.coords.lng, accuracy: res.coords.accuracy || 20 });
          } else {
            reject(new Error(res.error || 'Could not access GPS location.'));
          }
        })
        .catch((err) => {
          clearTimeout(timeoutId);
          reject(err);
        });
    });
  };

  const handleStartShift = async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const pos = await verifyLocationWithTimeout();
      const dist = calculateDistanceMeters(pos.lat, pos.lng, storeCoords.lat, storeCoords.lng);
      const effectiveDist = dist - Math.min(pos.accuracy || 0, 50);

      const isStoreAtSparta = Math.abs(storeCoords.lat - 19.2604227) < 0.005 && Math.abs(storeCoords.lng - 72.9794437) < 0.005;
      const isInsideSpartaBox = isStoreAtSparta && (pos.lat >= 19.2580 && pos.lat <= 19.2630 && pos.lng >= 72.9770 && pos.lng <= 72.9820);

      if (!isInsideSpartaBox && effectiveDist > storeCoords.radius && dist > storeCoords.radius) {
        setErrorMessage(`📍 You are ${formatDistance(dist)} from Sparta Building. Must be inside Meats & Plants (${storeCoords.radius}m) to start shift.`);
        return;
      }

      const res = await api.submitPunch({
        employeeId: currentStaff!.id,
        action: 'startShift',
        source: 'app',
        lat: pos.lat,
        lng: pos.lng,
        accuracy: pos.accuracy
      });

      // Update state solely from server response
      setDayState(res);
      setLiveWorkedSeconds(res.workedSeconds || 0);
      setLiveBreakSecondsLeft(res.breakRemainingSeconds || 0);

      if (onRefreshNeeded) onRefreshNeeded();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to start shift');
    } finally {
      setLoading(false);
    }
  };

  const handleStartBreak = async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const pos = await verifyLocationWithTimeout();
      const dist = calculateDistanceMeters(pos.lat, pos.lng, storeCoords.lat, storeCoords.lng);
      const effectiveDist = dist - Math.min(pos.accuracy || 0, 50);

      const isStoreAtSparta = Math.abs(storeCoords.lat - 19.2604227) < 0.005 && Math.abs(storeCoords.lng - 72.9794437) < 0.005;
      const isInsideSpartaBox = isStoreAtSparta && (pos.lat >= 19.2580 && pos.lat <= 19.2630 && pos.lng >= 72.9770 && pos.lng <= 72.9820);

      if (!isInsideSpartaBox && effectiveDist > storeCoords.radius && dist > storeCoords.radius) {
        setErrorMessage(`📍 You are ${formatDistance(dist)} away from the café. Must be inside to start break.`);
        return;
      }

      const res = await api.submitPunch({
        employeeId: currentStaff!.id,
        action: 'startBreak',
        source: 'app',
        lat: pos.lat,
        lng: pos.lng,
        accuracy: pos.accuracy
      });

      setDayState(res);
      setLiveBreakSecondsLeft(res.breakRemainingSeconds || 180 * 60);

      if (onRefreshNeeded) onRefreshNeeded();
    } catch (err: any) {
      setErrorMessage(err.message || 'Could not start break');
    } finally {
      setLoading(false);
    }
  };

  const handleEndBreak = async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await api.submitPunch({
        employeeId: currentStaff!.id,
        action: 'endBreak',
        source: 'app',
        lat: userLocation?.lat,
        lng: userLocation?.lng,
        accuracy: userLocation?.accuracy
      });

      setDayState(res);
      setLiveBreakSecondsLeft(0);

      if (onRefreshNeeded) onRefreshNeeded();
    } catch (err: any) {
      setErrorMessage(err.message || 'Could not end break');
    } finally {
      setLoading(false);
    }
  };

  const handleEndShift = async () => {
    const confirmEnd = window.confirm('Are you sure you want to end your shift for today?');
    if (!confirmEnd) return;

    setLoading(true);
    setErrorMessage(null);

    try {
      const pos = userLocation || { lat: storeCoords.lat, lng: storeCoords.lng, accuracy: 20 };

      const res = await api.submitPunch({
        employeeId: currentStaff!.id,
        action: 'endShift',
        source: 'app',
        lat: pos.lat,
        lng: pos.lng,
        accuracy: pos.accuracy
      });

      setDayState(res);
      if (onRefreshNeeded) onRefreshNeeded();
    } catch (err: any) {
      setErrorMessage(err.message || 'Could not end shift');
    } finally {
      setLoading(false);
    }
  };

  const handleResetShift = async () => {
    if (!currentStaff?.id) return;
    try {
      setLoading(true);
      await api.resetEmployeeToday(currentStaff.id);
      await fetchState();
      if (onRefreshNeeded) onRefreshNeeded();
    } catch (err: any) {
      alert(`Error resetting: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const currentStatus = dayState?.status || 'NOT_STARTED';

  // Circular timer dial calculations
  const totalShiftSeconds = 12 * 3600; // 12h normal shift
  const progressRatio = currentStatus === 'ON_BREAK'
    ? Math.max(0, Math.min(1, liveBreakSecondsLeft / (180 * 60)))
    : Math.max(0, Math.min(1, liveWorkedSeconds / totalShiftSeconds));

  const dialRadius = 88;
  const circumference = 2 * Math.PI * dialRadius;
  const strokeDashoffset = circumference * (1 - progressRatio);

  return (
    <div className="space-y-4 max-w-[430px] mx-auto pb-10">
      {/* Top Header Card */}
      <div className="p-4 rounded-xl bg-white border border-[#E6E6E2] shadow-2xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-semibold shrink-0"
            style={{ backgroundColor: currentStaff?.avatar_color || '#0A0A0A' }}
          >
            {currentStaff?.name[0]}
          </div>
          <div>
            <div className="text-sm font-semibold tracking-tight text-[#0A0A0A]">
              {currentStaff?.name}
            </div>
            <div className="text-xs text-[#6E6E6A]">
              {currentStaff?.role}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Rules info icon */}
          <button
            onClick={() => setRulesModalOpen(true)}
            className="p-2 rounded-lg text-[#6E6E6A] hover:text-[#0A0A0A] hover:bg-[#F2F2EF] transition-colors cursor-pointer"
            title="Café Rules & Guidelines"
          >
            <Info size={16} />
          </button>

          {/* Switch Staff button */}
          <button
            onClick={switchStaff}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#E6E6E2] bg-white text-xs font-medium text-[#0A0A0A] hover:bg-[#F2F2EF] transition-colors cursor-pointer"
            title="Switch staff member"
          >
            <RotateCcw size={13} />
            <span>Switch</span>
          </button>
        </div>
      </div>

      {/* Error Toast Banner */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-white border border-[#B42318] text-xs text-[#B42318] flex items-start gap-2.5 shadow-2xs animate-fade-in">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <div className="flex-1 leading-relaxed">{errorMessage}</div>
          <button onClick={() => setErrorMessage(null)} className="text-[#6E6E6A] hover:text-[#0A0A0A] text-xs font-semibold">✕</button>
        </div>
      )}

      {/* Section 1 & 9: Circular Timer Dial */}
      <div className="p-6 rounded-xl bg-white border border-[#E6E6E2] text-center shadow-2xs">
        <div className="relative w-56 h-56 mx-auto flex items-center justify-center">
          <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 200 200">
            {/* Background hairline track */}
            <circle
              cx="100"
              cy="100"
              r={dialRadius}
              fill="transparent"
              stroke="#E6E6E2"
              strokeWidth="5"
            />
            {/* Violet-red progress arc */}
            {(currentStatus === 'ON_SHIFT' || currentStatus === 'ON_BREAK') && (
              <circle
                cx="100"
                cy="100"
                r={dialRadius}
                fill="transparent"
                stroke={currentStatus === 'ON_BREAK' ? '#B7791F' : '#B0235F'}
                strokeWidth="5"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 0.8s ease' }}
              />
            )}
          </svg>

          {/* Central tabular time display */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="section-label mb-1">
              {currentStatus === 'NOT_STARTED' && 'READY FOR SHIFT'}
              {currentStatus === 'ON_SHIFT' && 'WORKED TODAY'}
              {currentStatus === 'ON_BREAK' && 'BREAK REMAINING'}
              {currentStatus === 'ENDED' && 'SHIFT COMPLETED'}
            </span>

            <div className="font-semibold text-3xl tracking-tight text-[#0A0A0A] tabular-nums">
              {currentStatus === 'ON_BREAK'
                ? formatCountdown(liveBreakSecondsLeft)
                : formatDuration(liveWorkedSeconds)}
            </div>

            <div className="mt-1 text-xs text-[#6E6E6A] flex items-center gap-1.5">
              {currentStatus === 'NOT_STARTED' && (
                <span>Shift starts at 12:00 PM</span>
              )}
              {currentStatus === 'ON_SHIFT' && (
                <>
                  <span className="w-1.5 h-1.5 rounded-full status-dot-present" />
                  <span>On floor · Shift running</span>
                </>
              )}
              {currentStatus === 'ON_BREAK' && (
                <>
                  <span className="w-1.5 h-1.5 rounded-full status-dot-break animate-pulse" />
                  <span>On 3-hr break</span>
                </>
              )}
              {currentStatus === 'ENDED' && (
                <>
                  <span className="w-1.5 h-1.5 rounded-full status-dot-present" />
                  <span>Total {formatDuration(liveWorkedSeconds)}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="mt-6 pt-5 border-t border-[#E6E6E2] space-y-2.5">
          {currentStatus === 'NOT_STARTED' && (
            <button
              onClick={handleStartShift}
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-[#0A0A0A] text-white hover:bg-[#222222] font-medium text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <RefreshCw size={16} className="animate-spin text-white" />
              ) : (
                <Play size={16} fill="currentColor" />
              )}
              <span>{loading ? 'Verifying location…' : 'Start Shift'}</span>
            </button>
          )}

          {currentStatus === 'ON_SHIFT' && (
            <div className="space-y-2">
              {!dayState?.breakUsed ? (
                <button
                  onClick={handleStartBreak}
                  disabled={loading}
                  className="w-full py-2.5 px-4 rounded-xl bg-white border border-[#E6E6E2] text-[#0A0A0A] hover:bg-[#F2F2EF] font-medium text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Coffee size={14} className="text-[#B7791F]" />
                  <span>{loading ? 'Checking location…' : 'Start 3-Hour Break'}</span>
                </button>
              ) : (
                <div className="text-[11px] text-[#6E6E6A] py-1">
                  1 of 1 break taken today
                </div>
              )}

              <button
                onClick={handleEndShift}
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl bg-white border border-[#E6E6E2] text-[#B42318] hover:bg-[#F2F2EF] font-medium text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <LogOut size={14} />
                <span>End Shift</span>
              </button>
            </div>
          )}

          {currentStatus === 'ON_BREAK' && (
            <div className="space-y-2">
              <button
                onClick={handleEndBreak}
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-[#0A0A0A] text-white hover:bg-[#222222] font-medium text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 size={16} />
                <span>{loading ? 'Ending break…' : 'End Break & Back to Floor'}</span>
              </button>

              <button
                onClick={handleEndShift}
                disabled={loading}
                className="w-full py-2 text-xs text-[#B42318] hover:underline transition-all cursor-pointer"
              >
                End shift now (closes break)
              </button>
            </div>
          )}

          {currentStatus === 'ENDED' && (
            <div className="p-3 rounded-lg bg-[#FAFAF8] border border-[#E6E6E2] text-xs text-[#6E6E6A]">
              Shift ended for today at {dayState?.shiftEnd ? formatTime12(dayState.shiftEnd) : 'earlier'}.
            </div>
          )}

          {/* Test Trial Reset Button */}
          <div className="pt-2 flex items-center justify-between text-[11px] text-[#6E6E6A]">
            <button
              onClick={() => setFixModalOpen(true)}
              className="hover:underline text-[#0A0A0A] font-medium cursor-pointer"
            >
              Forgot to punch? Request fix
            </button>

            <button
              onClick={handleResetShift}
              disabled={loading}
              className="text-[#6E6E6A] hover:text-[#0A0A0A] hover:underline cursor-pointer"
              title="Reset today's shift records to test again"
            >
              Reset for trial
            </button>
          </div>
        </div>
      </div>

      {/* Section 3: Staff GPS Map Card */}
      <StaffMapCard
        userLocation={userLocation}
        storeCoords={storeCoords}
        distanceM={distanceM}
        isInsideGeofence={isInsideGeofence}
        isLocating={isLocating}
        locatingAccuracy={locatingAccuracy}
        onRefreshLocation={refreshLocation}
        cafeName="Meats & Plants"
      />

      {/* Punch Fix Modal */}
      {fixModalOpen && currentStaff && (
        <PunchFixModal
          employeeId={currentStaff.id}
          onClose={() => setFixModalOpen(false)}
        />
      )}

      {/* Rules Info Modal */}
      <RulesModal
        isOpen={rulesModalOpen}
        onClose={() => setRulesModalOpen(false)}
      />
    </div>
  );
};
