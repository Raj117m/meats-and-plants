import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { RosterResponse, RosterItem, Employee } from '../../types';
import { ManualPunchModal } from './ManualPunchModal';
import { CafeLocationModal } from '../common/CafeLocationModal';
import { useLocation } from '../../context/LocationContext';
import { formatTime12, formatCountdown } from '../../utils/time';
import {
  Users,
  Coffee,
  Clock,
  Calendar,
  AlertCircle,
  PlusCircle,
  MoreVertical,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  Play,
  LogOut,
  MapPin,
  Download
} from 'lucide-react';

interface TodayLiveRosterProps {
  employees: Employee[];
}

export const TodayLiveRoster: React.FC<TodayLiveRosterProps> = ({ employees }) => {
  const { isInsideGeofence, userLocation, storeCoords } = useLocation();
  const [data, setData] = useState<RosterResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [quickToast, setQuickToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setQuickToast(msg);
    setTimeout(() => setQuickToast(null), 3000);
  };

  // Manual Punch modal
  const [punchModalOpen, setPunchModalOpen] = useState(false);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [targetEmp, setTargetEmp] = useState<RosterItem | null>(null);
  const [targetAction, setTargetAction] = useState<'check_in' | 'start_break' | 'end_break' | 'check_out'>('check_in');

  const fetchRoster = async (showRefresh = false) => {
    try {
      if (showRefresh) setIsRefreshing(true);
      const res = await api.getTodayRoster('2026-11-15');
      setData(res);
    } catch (err) {
      console.error('Failed to load today roster:', err);
    } finally {
      setLoading(false);
      if (showRefresh) setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  useEffect(() => {
    fetchRoster();
    const interval = setInterval(() => fetchRoster(), 8000);
    return () => clearInterval(interval);
  }, []);

  const openManualPunch = (
    person: RosterItem,
    action: 'check_in' | 'start_break' | 'end_break' | 'check_out'
  ) => {
    setTargetEmp(person);
    setTargetAction(action);
    setPunchModalOpen(true);
    setActiveMenuId(null);
  };

  const handleQuickShiftAction = async (person: RosterItem, actionType: 'check_in' | 'check_out') => {
    const isStart = actionType === 'check_in';
    const actionName = isStart ? 'Start shift' : 'Stop shift';

    if (!confirm(`${actionName} for ${person.name} now?`)) return;

    setActionLoadingId(person.id);

    try {
      const pos = userLocation || {
        lat: storeCoords.lat,
        lng: storeCoords.lng,
        accuracy: 8
      };

      await api.submitPunch({
        employee_id: person.id,
        type: actionType,
        lat: pos.lat,
        lng: pos.lng,
        accuracy: pos.accuracy,
        custom_time: new Date().toISOString()
      });

      showToast(isStart ? `Started shift for ${person.name}! 🎉` : `Stopped shift for ${person.name}! 🛑`);
      await fetchRoster(true);
    } catch (err: any) {
      alert(`Error: ${err.message || 'Action failed'}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  if (loading && !data) {
    return (
      <div className="p-8 text-center text-xs text-[#7A746A]">
        Loading live team status...
      </div>
    );
  }

  const summary = data?.summary || { onFloor: 0, onBreak: 0, notInYet: 0, onLeave: 0, total: 10 };
  const onBreakStaff = data?.roster.find((r) => r.status === 'on_break');

  const summaryLine = onBreakStaff
    ? `${summary.onFloor} of ${summary.total} on floor today. ${onBreakStaff.name.split(' ')[0]}'s on 3-hr break.`
    : `${summary.onFloor} of ${summary.total} on floor · Operations running smoothly.`;

  return (
    <div className="space-y-8 relative">
      {/* Toast Notification */}
      {quickToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-[#22201C] text-white px-5 py-2.5 rounded-full text-xs font-bold shadow-lg animate-bounce flex items-center gap-2">
          <Sparkles size={14} className="text-[#2F7D4F]" />
          <span>{quickToast}</span>
        </div>
      )}

      {/* Friendly Summary Line */}
      <div className="p-4 rounded-2xl bg-[#F6F2EA] border border-[#ECE7DF] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-base font-bold text-[#22201C] tracking-tight">
            "{summaryLine}"
          </p>
          <div className="flex items-center gap-1.5 mt-1 text-[11px] text-[#7A746A]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2F7D4F]" />
            <span>Sparta Building Geofence (30m) Active · 1-Tap Shift Controls Ready</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => api.downloadAttendanceCsv('2026-11-15')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#ECE7DF] text-xs font-semibold text-[#22201C] hover:bg-[#F6F2EA] shadow-2xs transition-colors cursor-pointer"
            title="Download today's attendance & timings CSV"
          >
            <Download size={13} className="text-[#2F7D4F]" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => setLocationModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#C6E7D1] text-xs font-bold text-[#23633E] hover:bg-[#EAF5EE] shadow-2xs transition-colors cursor-pointer"
            title="Open interactive map to set café location and radius"
          >
            <MapPin size={13} className="text-[#2F7D4F]" />
            <span>📍 Set Café Location</span>
          </button>

          <button
            onClick={() => fetchRoster(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#ECE7DF] text-xs font-semibold text-[#22201C] hover:bg-[#F6F2EA] transition-colors cursor-pointer"
          >
            <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => {
              setTargetEmp(null);
              setTargetAction('check_in');
              setPunchModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#2F7D4F] text-white text-xs font-bold hover:bg-[#276842] shadow-xs transition-colors cursor-pointer active:scale-95"
          >
            <PlusCircle size={14} />
            <span>Manual Punch</span>
          </button>
        </div>
      </div>

      {/* 4 Summary Tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* On floor */}
        <div className="p-4 rounded-2xl bg-white border border-[#ECE7DF] warm-card flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[#7A746A]">On Floor</p>
            <p className="hero-num text-3xl font-extrabold text-[#23633E] mt-1 tabular-nums">
              {summary.onFloor}
            </p>
            <p className="text-[11px] text-[#7A746A] mt-0.5">Active café floor</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-[#EAF5EE] flex items-center justify-center text-[#2F7D4F]">
            <span className="w-3.5 h-3.5 rounded-full bg-[#2F7D4F] pulse-dot-green" />
          </div>
        </div>

        {/* On break */}
        <div className="p-4 rounded-2xl bg-white border border-[#ECE7DF] warm-card flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[#7A746A]">On Break</p>
            <p className="hero-num text-3xl font-extrabold text-[#9A6A12] mt-1 tabular-nums">
              {summary.onBreak}
            </p>
            <p className="text-[11px] text-[#7A746A] mt-0.5">3-hr countdown</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-[#FEF7E6] flex items-center justify-center text-[#E8B44A]">
            <Coffee size={20} />
          </div>
        </div>

        {/* Not in yet */}
        <div className="p-4 rounded-2xl bg-white border border-[#ECE7DF] warm-card flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[#7A746A]">Not in Yet</p>
            <p className="hero-num text-3xl font-extrabold text-[#7A746A] mt-1 tabular-nums">
              {summary.notInYet}
            </p>
            <p className="text-[11px] text-[#7A746A] mt-0.5">Shift start 12:00 PM</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-[#F6F2EA] flex items-center justify-center text-[#7A746A]">
            <Clock size={20} />
          </div>
        </div>

        {/* On leave */}
        <div className="p-4 rounded-2xl bg-white border border-[#ECE7DF] warm-card flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[#7A746A]">On Leave</p>
            <p className="hero-num text-3xl font-extrabold text-[#2A5A8F] mt-1 tabular-nums">
              {summary.onLeave}
            </p>
            <p className="text-[11px] text-[#7A746A] mt-0.5">Approved time off</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-[#EDF4FC] flex items-center justify-center text-[#4A7BB7]">
            <Calendar size={20} />
          </div>
        </div>
      </div>

      {/* 2-3 Column Card Grid for 10 Employees */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-[#22201C] tracking-tight">
          Team Live Status
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.roster.map((person) => {
            const isMenuOpen = activeMenuId === person.id;

            return (
              <div
                key={person.id}
                className="p-4 rounded-2xl bg-white border border-[#ECE7DF] warm-card-interactive flex flex-col justify-between space-y-3"
              >
                {/* Top Info */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-xs"
                      style={{ backgroundColor: person.avatarColor || '#2F7D4F' }}
                    >
                      {person.name.split(' ').map((n) => n[0]).join('')}
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-[#22201C]">{person.name}</span>
                        {person.isLate && (
                          <span className="px-1.5 py-0.5 rounded-md bg-[#FEF7E6] text-[#9A6A12] border border-[#FDE3A7] text-[9px] font-bold">
                            Late ({person.lateMinutes}m)
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#7A746A]">{person.role} · ₹{person.dailyWage}/d</p>
                    </div>
                  </div>

                  {/* Menu "⋯" button */}
                  <div className="relative">
                    <button
                      onClick={() => setActiveMenuId(isMenuOpen ? null : person.id)}
                      className="p-1 rounded-xl text-[#7A746A] hover:bg-[#F6F2EA] transition-colors cursor-pointer"
                    >
                      <MoreVertical size={16} />
                    </button>

                    {isMenuOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-30"
                          onClick={() => setActiveMenuId(null)}
                        />
                        <div className="absolute right-0 mt-1 w-44 bg-white rounded-2xl p-1.5 border border-[#ECE7DF] warm-card z-40 text-xs shadow-lg">
                          <button
                            onClick={() => openManualPunch(person, 'check_in')}
                            className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-[#F6F2EA] text-[#22201C] cursor-pointer"
                          >
                            Punch In...
                          </button>
                          <button
                            onClick={() => openManualPunch(person, 'start_break')}
                            className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-[#F6F2EA] text-[#9A6A12] cursor-pointer"
                          >
                            Start Break...
                          </button>
                          <button
                            onClick={() => openManualPunch(person, 'end_break')}
                            className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-[#F6F2EA] text-[#23633E] cursor-pointer"
                          >
                            End Break...
                          </button>
                          <button
                            onClick={() => openManualPunch(person, 'check_out')}
                            className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-[#F6F2EA] text-[#A8382B] cursor-pointer"
                          >
                            Punch Out...
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Status Ring & Punch Timings */}
                <div className="p-2.5 rounded-xl bg-[#F6F2EA] flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-[#7A746A] block">Shift Punch</span>
                    <span className="font-semibold text-[#22201C]">
                      {person.checkInTime ? formatTime12(person.checkInTime) : 'Not started'}
                    </span>
                  </div>

                  {/* Status Indicator */}
                  {person.status === 'on_floor' ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#EAF5EE] text-[#23633E] border border-[#C6E7D1] text-[11px] font-bold">
                      <span className="w-2 h-2 rounded-full bg-[#2F7D4F] pulse-dot-green" />
                      <span>On floor</span>
                    </span>
                  ) : person.status === 'on_break' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FEF7E6] text-[#9A6A12] border border-[#FDE3A7] text-[11px] font-bold">
                      <Coffee size={11} />
                      <span className="tabular-nums">{formatCountdown(person.breakSecondsLeft)}</span>
                    </span>
                  ) : person.status === 'checked_out' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white text-[#7A746A] text-[11px] font-semibold border border-[#ECE7DF]">
                      <span>Out {formatTime12(person.checkOutTime)}</span>
                    </span>
                  ) : person.status === 'on_leave' ? (
                    <span className="px-2 py-0.5 rounded-full bg-[#EDF4FC] text-[#2A5A8F] border border-[#CDE0F7] text-[11px] font-bold">
                      On leave
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-white text-[#7A746A] text-[11px] font-semibold border border-[#ECE7DF]">
                      Not in
                    </span>
                  )}
                </div>

                {/* 1-Tap Action: Start Shift / Stop Shift */}
                <div className="pt-2 border-t border-[#ECE7DF] flex items-center gap-2">
                  {person.status === 'not_in_yet' ? (
                    <button
                      onClick={() => handleQuickShiftAction(person, 'check_in')}
                      disabled={actionLoadingId === person.id}
                      className="flex-1 py-2 px-3 rounded-xl bg-[#2F7D4F] hover:bg-[#276842] text-white text-xs font-bold transition-all tap-bounce flex items-center justify-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                      title={`Start shift for ${person.name}`}
                    >
                      <Play size={13} fill="currentColor" />
                      <span>{actionLoadingId === person.id ? 'Starting...' : 'Start Shift'}</span>
                    </button>
                  ) : person.status === 'on_floor' || person.status === 'on_break' ? (
                    <button
                      onClick={() => handleQuickShiftAction(person, 'check_out')}
                      disabled={actionLoadingId === person.id}
                      className="flex-1 py-2 px-3 rounded-xl bg-[#C0573E] hover:bg-[#A84530] text-white text-xs font-bold transition-all tap-bounce flex items-center justify-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                      title={`Stop shift for ${person.name}`}
                    >
                      <LogOut size={13} />
                      <span>{actionLoadingId === person.id ? 'Stopping...' : 'Stop Shift'}</span>
                    </button>
                  ) : person.status === 'checked_out' ? (
                    <div className="flex-1 py-1.5 px-3 rounded-xl bg-[#F6F2EA] text-[#7A746A] text-xs font-semibold text-center flex items-center justify-center gap-1.5">
                      <CheckCircle2 size={13} className="text-[#2F7D4F]" />
                      <span>Shift Completed</span>
                    </div>
                  ) : (
                    <div className="flex-1 py-1.5 px-3 rounded-xl bg-[#EDF4FC] text-[#2A5A8F] text-xs font-semibold text-center">
                      On Approved Leave
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Manual Punch Modal */}
      <ManualPunchModal
        isOpen={punchModalOpen}
        onClose={() => setPunchModalOpen(false)}
        employee={targetEmp}
        employees={employees}
        initialType={targetAction}
        onSuccess={() => fetchRoster(true)}
      />

      {/* Café Location Picker Modal */}
      <CafeLocationModal
        isOpen={locationModalOpen}
        onClose={() => setLocationModalOpen(false)}
        onSaved={() => fetchRoster(true)}
      />
    </div>
  );
};
