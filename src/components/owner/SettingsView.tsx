import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { Settings } from '../../types';
import { CafeLocationPicker } from '../common/CafeLocationPicker';
import {
  Clock,
  Coffee,
  Calendar,
  MapPin,
  Lock,
  User,
  Check,
  RotateCcw,
  KeyRound,
  ExternalLink,
  Navigation
} from 'lucide-react';

interface SettingsViewProps {
  onSettingsSaved?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onSettingsSaved }) => {
  const [initialSettings, setInitialSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Plain-English sentence form states
  const [shiftStart, setShiftStart] = useState('12:00');
  const [shiftEnd, setShiftEnd] = useState('00:00');
  const [graceMinutes, setGraceMinutes] = useState(15);
  const [lateMarksPerHalfDay, setLateMarksPerHalfDay] = useState(3);
  const [breakLengthHours, setBreakLengthHours] = useState(3);
  const [skippedBreaksNeeded, setSkippedBreaksNeeded] = useState(4);
  const [paidLeavesPerMonth, setPaidLeavesPerMonth] = useState(3);
  const [leaveApprovalRequired, setLeaveApprovalRequired] = useState(1);
  const [ownerName, setOwnerName] = useState('Abhigit');

  // Geofence states (Sparta Building, Hiranandani Estate, Thane West)
  const [storeLat, setStoreLat] = useState(19.2604227);
  const [storeLng, setStoreLng] = useState(72.9794437);
  const [geofenceRadius, setGeofenceRadius] = useState(30);
  const [mapsInput, setMapsInput] = useState('');

  // Password change modal
  const [pwModalOpen, setPwModalOpen] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState(false);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const s = await api.getSettings();
      setInitialSettings(s);
      if (s) {
        setShiftStart(s.shift_start);
        setShiftEnd(s.shift_end);
        setGraceMinutes(s.grace_minutes);
        setLateMarksPerHalfDay(s.late_marks_per_half_day);
        setBreakLengthHours(Math.round((s.break_length_minutes || 180) / 60));
        setSkippedBreaksNeeded(s.skipped_breaks_needed);
        setPaidLeavesPerMonth(s.paid_leaves_per_month);
        setLeaveApprovalRequired(s.leave_approval_required ?? 1);
        setOwnerName(s.owner_name || 'Abhigit');
        setStoreLat(s.store_lat || 19.2604227);
        setStoreLng(s.store_lng || 72.9794437);
        setGeofenceRadius(s.geofence_radius || 30);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Check if anything has changed
  const hasChanges = Boolean(
    initialSettings &&
    (shiftStart !== initialSettings.shift_start ||
      shiftEnd !== initialSettings.shift_end ||
      graceMinutes !== initialSettings.grace_minutes ||
      lateMarksPerHalfDay !== initialSettings.late_marks_per_half_day ||
      breakLengthHours !== Math.round(initialSettings.break_length_minutes / 60) ||
      skippedBreaksNeeded !== initialSettings.skipped_breaks_needed ||
      paidLeavesPerMonth !== initialSettings.paid_leaves_per_month ||
      leaveApprovalRequired !== (initialSettings.leave_approval_required ?? 1) ||
      ownerName !== (initialSettings.owner_name || 'Abhigit') ||
      storeLat !== (initialSettings.store_lat || 19.2604227) ||
      storeLng !== (initialSettings.store_lng || 72.9794437) ||
      geofenceRadius !== (initialSettings.geofence_radius || 30))
  );

  const handleDiscard = () => {
    if (initialSettings) {
      setShiftStart(initialSettings.shift_start);
      setShiftEnd(initialSettings.shift_end);
      setGraceMinutes(initialSettings.grace_minutes);
      setLateMarksPerHalfDay(initialSettings.late_marks_per_half_day);
      setBreakLengthHours(Math.round(initialSettings.break_length_minutes / 60));
      setSkippedBreaksNeeded(initialSettings.skipped_breaks_needed);
      setPaidLeavesPerMonth(initialSettings.paid_leaves_per_month);
      setLeaveApprovalRequired(initialSettings.leave_approval_required ?? 1);
      setOwnerName(initialSettings.owner_name || 'Abhigit');
      setStoreLat(initialSettings.store_lat || 19.2604227);
      setStoreLng(initialSettings.store_lng || 72.9794437);
      setGeofenceRadius(initialSettings.geofence_radius || 30);
    }
  };

  const handleSaveAll = async () => {
    try {
      setSaving(true);
      await api.updateSettings({
        shift_start: shiftStart,
        shift_end: shiftEnd,
        grace_minutes: Number(graceMinutes),
        late_marks_per_half_day: Number(lateMarksPerHalfDay),
        break_length_minutes: Number(breakLengthHours) * 60,
        skipped_breaks_needed: Number(skippedBreaksNeeded),
        paid_leaves_per_month: Number(paidLeavesPerMonth),
        leave_approval_required: leaveApprovalRequired,
        owner_name: ownerName,
        store_lat: Number(storeLat),
        store_lng: Number(storeLng),
        geofence_radius: Number(geofenceRadius)
      });
      await fetchSettings();
      if (onSettingsSaved) onSettingsSaved();
    } catch (err: any) {
      alert(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  // Google Maps link parser helper
  const handleParseMapsLink = (input: string) => {
    setMapsInput(input);
    const trimmed = input.trim();
    if (!trimmed) return;

    // Pattern 1: @lat,lng e.g. https://www.google.com/maps/@12.9715987,77.5945627,17z
    const matchAt = trimmed.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (matchAt) {
      setStoreLat(parseFloat(matchAt[1]));
      setStoreLng(parseFloat(matchAt[2]));
      return;
    }

    // Pattern 2: ?q=lat,lng or ll=lat,lng
    const matchQ = trimmed.match(/[?&](?:q|ll)=(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (matchQ) {
      setStoreLat(parseFloat(matchQ[1]));
      setStoreLng(parseFloat(matchQ[2]));
      return;
    }

    // Pattern 3: direct "lat, lng" text
    const matchDirect = trimmed.match(/^(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)$/);
    if (matchDirect) {
      setStoreLat(parseFloat(matchDirect[1]));
      setStoreLng(parseFloat(matchDirect[2]));
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);
    try {
      await api.changeOwnerPassword(currentPw, newPw);
      setPwSuccess(true);
      setCurrentPw('');
      setNewPw('');
      setTimeout(() => {
        setPwSuccess(false);
        setPwModalOpen(false);
      }, 1500);
    } catch (err: any) {
      setPwError(err.message || 'Failed to change password');
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-xs text-[#7A746A]">
        Loading settings...
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-24">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-[#22201C]">
          Settings
        </h2>
        <p className="text-xs text-[#7A746A] mt-0.5">
          Configure café timings, GPS geofence, lateness grace, and owner security
        </p>
      </div>

      {/* Grouped Plain-English Cards */}
      <div className="space-y-4 max-w-3xl">
        {/* 1. Shift Card */}
        <div className="p-5 rounded-2xl bg-white border border-[#ECE7DF] warm-card space-y-2">
          <div className="flex items-center gap-2 text-[#7A746A]">
            <Clock size={16} className="text-[#2F7D4F]" />
            <span className="text-xs font-bold uppercase tracking-wider">Shift Schedule</span>
          </div>

          <div className="pt-1 flex flex-wrap items-center gap-2 text-sm text-[#22201C]">
            <span>Shift runs from</span>
            <input
              type="time"
              value={shiftStart}
              onChange={(e) => setShiftStart(e.target.value)}
              className="px-2.5 py-1 rounded-xl bg-[#F6F2EA] border border-[#ECE7DF] font-bold text-xs"
            />
            <span>to</span>
            <input
              type="time"
              value={shiftEnd}
              onChange={(e) => setShiftEnd(e.target.value)}
              className="px-2.5 py-1 rounded-xl bg-[#F6F2EA] border border-[#ECE7DF] font-bold text-xs"
            />
            <span className="text-xs text-[#7A746A]">(Auto check-out triggers at midnight)</span>
          </div>
        </div>

        {/* 2. Lateness Card */}
        <div className="p-5 rounded-2xl bg-white border border-[#ECE7DF] warm-card space-y-2">
          <div className="flex items-center gap-2 text-[#7A746A]">
            <Clock size={16} className="text-[#E8B44A]" />
            <span className="text-xs font-bold uppercase tracking-wider">Lateness &amp; Grace</span>
          </div>

          <div className="pt-1 flex flex-wrap items-center gap-2 text-sm text-[#22201C]">
            <span>Allow</span>
            <input
              type="number"
              value={graceMinutes}
              onChange={(e) => setGraceMinutes(Number(e.target.value))}
              min={0}
              max={60}
              className="w-16 px-2.5 py-1 rounded-xl bg-[#F6F2EA] border border-[#ECE7DF] font-bold text-xs text-center"
            />
            <span>minutes of grace.</span>
            <input
              type="number"
              value={lateMarksPerHalfDay}
              onChange={(e) => setLateMarksPerHalfDay(Number(e.target.value))}
              min={1}
              max={10}
              className="w-14 px-2.5 py-1 rounded-xl bg-[#F6F2EA] border border-[#ECE7DF] font-bold text-xs text-center"
            />
            <span>late marks = half a day's deduction.</span>
          </div>
        </div>

        {/* 3. Breaks Card (Bonus choice removed, only global count kept) */}
        <div className="p-5 rounded-2xl bg-white border border-[#ECE7DF] warm-card space-y-2">
          <div className="flex items-center gap-2 text-[#7A746A]">
            <Coffee size={16} className="text-[#C0573E]" />
            <span className="text-xs font-bold uppercase tracking-wider">Breaks &amp; Banking</span>
          </div>

          <div className="pt-1 flex flex-wrap items-center gap-2 text-sm text-[#22201C]">
            <span>Each shift has a</span>
            <input
              type="number"
              value={breakLengthHours}
              onChange={(e) => setBreakLengthHours(Number(e.target.value))}
              min={1}
              max={5}
              className="w-14 px-2.5 py-1 rounded-xl bg-[#F6F2EA] border border-[#ECE7DF] font-bold text-xs text-center"
            />
            <span>-hour break. Skip</span>
            <input
              type="number"
              value={skippedBreaksNeeded}
              onChange={(e) => setSkippedBreaksNeeded(Number(e.target.value))}
              min={1}
              max={10}
              className="w-14 px-2.5 py-1 rounded-xl bg-[#F6F2EA] border border-[#ECE7DF] font-bold text-xs text-center"
            />
            <span>breaks to bank a bonus for the Staff page.</span>
          </div>
          <p className="text-[11px] text-[#7A746A] italic">
            Choice of "+1 Day Pay" or "+1 Paid Leave" is chosen by the owner directly on the Staff page when redeemed.
          </p>
        </div>

        {/* 4. Leave Card */}
        <div className="p-5 rounded-2xl bg-white border border-[#ECE7DF] warm-card space-y-2">
          <div className="flex items-center gap-2 text-[#7A746A]">
            <Calendar size={16} className="text-[#4A7BB7]" />
            <span className="text-xs font-bold uppercase tracking-wider">Leave Policy</span>
          </div>

          <div className="pt-1 flex flex-wrap items-center gap-2 text-sm text-[#22201C]">
            <input
              type="number"
              value={paidLeavesPerMonth}
              onChange={(e) => setPaidLeavesPerMonth(Number(e.target.value))}
              min={0}
              max={10}
              className="w-14 px-2.5 py-1 rounded-xl bg-[#F6F2EA] border border-[#ECE7DF] font-bold text-xs text-center"
            />
            <span>paid leaves per month. Owner must approve:</span>
            <button
              type="button"
              onClick={() => setLeaveApprovalRequired((prev) => (prev === 1 ? 0 : 1))}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                leaveApprovalRequired === 1
                  ? 'bg-[#EAF5EE] text-[#23633E] border border-[#C6E7D1]'
                  : 'bg-[#F6F2EA] text-[#7A746A]'
              }`}
            >
              {leaveApprovalRequired === 1 ? 'ON ✓' : 'OFF'}
            </button>
          </div>
        </div>

        {/* 5. Location & Geofence Card (Full-width Interactive Leaflet Map) */}
        <div className="p-5 rounded-2xl bg-white border border-[#ECE7DF] warm-card space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#7A746A]">
              <MapPin size={16} className="text-[#2F7D4F]" />
              <span className="text-xs font-bold uppercase tracking-wider">Store Location &amp; Geofence Map</span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#EAF5EE] text-[#23633E] border border-[#C6E7D1]">
              Live GPS Lock Active
            </span>
          </div>

          <CafeLocationPicker
            initialLat={storeLat}
            initialLng={storeLng}
            initialRadius={geofenceRadius}
            initialAddress={initialSettings?.store_address || 'Sparta Building, Park Avenue, Hiranandani Estate, Thane West, Maharashtra 400607'}
            onSaved={(newSettings) => {
              setStoreLat(newSettings.store_lat);
              setStoreLng(newSettings.store_lng);
              setGeofenceRadius(newSettings.geofence_radius);
              setInitialSettings(newSettings);
              if (onSettingsSaved) onSettingsSaved();
            }}
          />
        </div>

        {/* 6. Owner Security & Name Card */}
        <div className="p-5 rounded-2xl bg-white border border-[#ECE7DF] warm-card space-y-2">
          <div className="flex items-center gap-2 text-[#7A746A]">
            <User size={16} className="text-[#22201C]" />
            <span className="text-xs font-bold uppercase tracking-wider">Owner Profile &amp; Security</span>
          </div>

          <div className="pt-1 flex flex-wrap items-center gap-2 text-sm text-[#22201C]">
            <span>Owner name is</span>
            <input
              type="text"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              className="px-2.5 py-1 rounded-xl bg-[#F6F2EA] border border-[#ECE7DF] font-bold text-xs"
            />
            <span>. Owner password:</span>
            <button
              type="button"
              onClick={() => setPwModalOpen(true)}
              className="px-3 py-1 rounded-xl bg-[#F6F2EA] hover:bg-[#EBE6DC] text-xs font-bold text-[#22201C] border border-[#ECE7DF] flex items-center gap-1.5 cursor-pointer"
            >
              <KeyRound size={12} className="text-[#7A746A]" />
              <span>Change Password</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Save Changes Bar */}
      {hasChanges && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[#22201C] text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-200 border border-[#3D3A34]">
          <span className="text-xs font-bold text-[#ECE7DF]">
            You have unsaved changes
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDiscard}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-[#A8A298] hover:text-white transition-colors cursor-pointer"
            >
              Discard
            </button>

            <button
              onClick={handleSaveAll}
              disabled={saving}
              className="px-4 py-1.5 rounded-xl bg-[#2F7D4F] hover:bg-[#276842] text-white text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
            >
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {pwModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm warm-card animate-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-[#22201C] mb-1">
              Change Owner Password
            </h3>
            <p className="text-xs text-[#7A746A] mb-4">
              Current password is used to access the Owner Suite
            </p>

            {pwError && (
              <div className="mb-3 p-2.5 rounded-xl bg-[#FDF0ED] border border-[#F8D0C8] text-xs text-[#A8382B]">
                {pwError}
              </div>
            )}

            {pwSuccess && (
              <div className="mb-3 p-2.5 rounded-xl bg-[#EAF5EE] border border-[#C6E7D1] text-xs text-[#23633E] font-bold">
                Password updated successfully!
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#7A746A] font-semibold mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  placeholder="meats2026"
                  required
                  className="w-full px-3 py-2 rounded-xl bg-[#F6F2EA] border border-[#ECE7DF]"
                />
              </div>

              <div>
                <label className="block text-[#7A746A] font-semibold mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  placeholder="Min 4 characters"
                  required
                  minLength={4}
                  className="w-full px-3 py-2 rounded-xl bg-[#F6F2EA] border border-[#ECE7DF]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPwModalOpen(false)}
                  className="px-3 py-2 text-[#7A746A] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#2F7D4F] hover:bg-[#276842] text-white font-bold cursor-pointer"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
