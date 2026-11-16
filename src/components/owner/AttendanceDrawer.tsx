import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { DayRecord, Employee, LeaveRequest } from '../../types';
import { formatDateReadable, formatTime12 } from '../../utils/time';
import { useLocation } from '../../context/LocationContext';
import { X, Clock, Check, AlertCircle, Save, CheckCircle2, XCircle, ExternalLink, MapPin } from 'lucide-react';

interface AttendanceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
  date: string | null;
  dayRecord: DayRecord | null;
  pendingLeave?: LeaveRequest | null;
  onSaveSuccess: () => void;
}

export const AttendanceDrawer: React.FC<AttendanceDrawerProps> = ({
  isOpen,
  onClose,
  employee,
  date,
  dayRecord,
  pendingLeave,
  onSaveSuccess
}) => {
  if (!isOpen || !employee || !date) return null;

  const { storeCoords } = useLocation();
  const [status, setStatus] = useState<string>(dayRecord?.status || 'present');
  const [deduction, setDeduction] = useState<string>(dayRecord?.deduction || 'none');
  const [isLate, setIsLate] = useState<boolean>(Boolean(dayRecord?.is_late));
  const [breakSkipped, setBreakSkipped] = useState<boolean>(Boolean(dayRecord?.break_skipped));
  const [notes, setNotes] = useState<string>(dayRecord?.notes || '');

  const inPunch = dayRecord?.punches?.find((p) => p.type === 'check_in');
  const outPunch = dayRecord?.punches?.find((p) => p.type === 'check_out');

  const [checkInTime, setCheckInTime] = useState<string>(
    inPunch ? inPunch.timestamp.split('T')[1]?.substring(0, 5) || '' : '12:00'
  );
  const [checkOutTime, setCheckOutTime] = useState<string>(
    outPunch ? outPunch.timestamp.split('T')[1]?.substring(0, 5) || '' : '23:55'
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setStatus(dayRecord?.status || 'present');
    setDeduction(dayRecord?.deduction || 'none');
    setIsLate(Boolean(dayRecord?.is_late));
    setBreakSkipped(Boolean(dayRecord?.break_skipped));
    setNotes(dayRecord?.notes || '');
    if (inPunch) setCheckInTime(inPunch.timestamp.split('T')[1]?.substring(0, 5) || '12:00');
    if (outPunch) setCheckOutTime(outPunch.timestamp.split('T')[1]?.substring(0, 5) || '23:55');
  }, [dayRecord]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await api.updateAttendanceDay({
        employee_id: employee.id,
        date,
        status,
        deduction,
        is_late: isLate,
        break_skipped: breakSkipped,
        notes: notes.trim(),
        check_in_time: checkInTime || undefined,
        check_out_time: checkOutTime || undefined
      });

      onSaveSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update attendance');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveLeave = async () => {
    if (!pendingLeave) return;
    try {
      setLoading(true);
      await api.reviewLeaveRequest(pendingLeave.id, 'approved');
      onSaveSuccess();
      onClose();
    } catch (err: any) {
      setError('Could not approve leave');
    } finally {
      setLoading(false);
    }
  };

  const handleDenyLeave = async () => {
    if (!pendingLeave) return;
    try {
      setLoading(true);
      await api.reviewLeaveRequest(pendingLeave.id, 'denied');
      onSaveSuccess();
      onClose();
    } catch (err: any) {
      setError('Could not deny leave');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-xs transition-opacity" onClick={onClose} />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#FFFDF9] rounded-l-[28px] warm-card p-6 flex flex-col justify-between overflow-y-auto">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-[#ECE7DF]">
              <div>
                <h3 className="font-heading text-lg font-bold text-[#22201C]">{employee.name}</h3>
                <p className="text-xs text-[#7A746A]">{formatDateReadable(date)} · Shift Day Editor</p>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-[#F6F2EA] text-[#7A746A]"
              >
                <X size={18} />
              </button>
            </div>

            {error && (
              <div className="mt-3 p-3 bg-[#FBECEA] text-[#D9534A] text-xs rounded-xl flex items-center gap-2">
                <AlertCircle size={14} />
                <span>{error}</span>
              </div>
            )}

            {/* If there is a pending leave request on this date, show inline approval banner! */}
            {pendingLeave && (
              <div className="mt-4 p-4 rounded-2xl bg-[#ECF2F9] border border-[#4A7BB7]/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-heading text-xs font-bold text-[#22201C]">
                    Pending Leave Request
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-[#4A7BB7]">
                    {pendingLeave.is_paid ? 'Paid' : 'Unpaid'}
                  </span>
                </div>
                {pendingLeave.reason && (
                  <p className="text-xs text-[#7A746A]">"{pendingLeave.reason}"</p>
                )}
                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={handleDenyLeave}
                    disabled={loading}
                    className="flex-1 py-1.5 rounded-xl text-xs font-semibold text-[#D9534A] hover:bg-white"
                  >
                    Deny
                  </button>
                  <button
                    onClick={handleApproveLeave}
                    disabled={loading}
                    className="flex-1 py-1.5 rounded-xl text-xs font-bold text-white bg-[#2F7D4F] hover:bg-[#276842]"
                  >
                    Approve Leave
                  </button>
                </div>
              </div>
            )}

            {/* Existing Punches History */}
            {dayRecord?.punches && dayRecord.punches.length > 0 && (
              <div className="mt-4 p-3.5 rounded-2xl bg-[#F6F2EA] border border-[#ECE7DF] space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#7A746A]">
                  Recorded Punches for this Day
                </p>
                <div className="space-y-2 text-xs">
                  {dayRecord.punches.map((p) => {
                    const isEdge = p.distance_m != null && p.distance_m >= (storeCoords.radius || 75) * 0.75;
                    return (
                      <div key={p.id} className="p-2.5 rounded-xl bg-white border border-[#ECE7DF] space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="capitalize text-[#22201C] font-bold">
                            {p.type.replace('_', ' ')}
                          </span>
                          <span className="font-bold text-[#22201C] tnum">
                            {formatTime12(p.timestamp)}{' '}
                            <span className="text-[10px] font-normal text-[#7A746A]">({p.source})</span>
                          </span>
                        </div>

                        {/* Location Details & Mini-map Link (v4) */}
                        <div className="flex items-center justify-between text-[11px] text-[#7A746A] pt-0.5 border-t border-[#ECE7DF]/50">
                          <div className="flex items-center gap-1.5">
                            {isEdge && (
                              <span className="w-2 h-2 rounded-full bg-[#E8B44A] shrink-0" title="Near edge of geofence zone" />
                            )}
                            <span>
                              📍 {p.distance_m != null ? `${Math.round(p.distance_m)} m from café` : 'At café'}
                              {p.accuracy != null ? ` (±${Math.round(p.accuracy)} m)` : ''}
                            </span>
                            {isEdge && (
                              <span className="text-[9px] font-bold text-[#9A6A12] bg-[#FEF7E6] px-1.5 py-0.2 rounded border border-[#FDE3A7]">
                                Edge check
                              </span>
                            )}
                          </div>

                          {p.lat != null && p.lng != null && (
                            <a
                              href={`https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lng}#map=19/${p.lat}/${p.lng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#4A7BB7] hover:underline font-bold flex items-center gap-1"
                            >
                              <span>View Map</span>
                              <ExternalLink size={10} />
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Form */}
            <form id="attendance-drawer-form" onSubmit={handleSave} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#7A746A] mb-1.5">Day Status</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'present', label: 'Present', color: 'bg-[#EBF5EE] text-[#2F7D4F]' },
                    { id: 'late', label: 'Late', color: 'bg-[#FCF5E3] text-[#E8B44A]' },
                    { id: 'paid_leave', label: 'Paid Leave', color: 'bg-[#ECF2F9] text-[#4A7BB7]' },
                    { id: 'unpaid_leave', label: 'Unpaid / Absent', color: 'bg-[#FBECEA] text-[#D9534A]' },
                    { id: 'half_day', label: 'Half-Day Worked', color: 'bg-[#F9ECE8] text-[#C0573E]' }
                  ].map((s) => (
                    <button
                      type="button"
                      key={s.id}
                      onClick={() => setStatus(s.id)}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold text-center transition-all ${
                        status === s.id
                          ? `${s.color} border-2 border-current shadow-xs`
                          : 'bg-[#F6F2EA] text-[#7A746A] hover:bg-[#ECE7DF]'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#7A746A] mb-1.5">
                  Deduction Penalty Override
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'none', label: 'None (₹0)' },
                    { id: 'half', label: 'Half-Day (½)' },
                    { id: 'full', label: 'Full-Day (1x)' }
                  ].map((d) => (
                    <button
                      type="button"
                      key={d.id}
                      onClick={() => setDeduction(d.id)}
                      className={`py-2 px-2.5 rounded-xl text-xs font-semibold text-center transition-all ${
                        deduction === d.id
                          ? 'bg-[#22201C] text-white shadow-xs'
                          : 'bg-[#F6F2EA] text-[#7A746A] hover:bg-[#ECE7DF]'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-[#F6F2EA] border border-[#ECE7DF]">
                <div>
                  <span className="text-xs font-bold text-[#22201C] block">Late Mark</span>
                  <span className="text-[11px] text-[#7A746A]">Counts towards 3-late ½-day penalty</span>
                </div>
                <input
                  type="checkbox"
                  checked={isLate}
                  onChange={(e) => setIsLate(e.target.checked)}
                  className="w-5 h-5 rounded-md text-[#2F7D4F] accent-[#2F7D4F] cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-[#F6F2EA] border border-[#ECE7DF]">
                <div>
                  <span className="text-xs font-bold text-[#22201C] block">Break Skipped (Banked)</span>
                  <span className="text-[11px] text-[#7A746A]">Counts towards 4-break +1d bonus</span>
                </div>
                <input
                  type="checkbox"
                  checked={breakSkipped}
                  onChange={(e) => setBreakSkipped(e.target.checked)}
                  className="w-5 h-5 rounded-md text-[#2F7D4F] accent-[#2F7D4F] cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#7A746A] mb-1">Check-In</label>
                  <input
                    type="time"
                    value={checkInTime}
                    onChange={(e) => setCheckInTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#F6F2EA] text-xs font-bold border border-[#ECE7DF]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#7A746A] mb-1">Check-Out</label>
                  <input
                    type="time"
                    value={checkOutTime}
                    onChange={(e) => setCheckOutTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#F6F2EA] text-xs font-bold border border-[#ECE7DF]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#7A746A] mb-1">Note</label>
                <textarea
                  rows={2}
                  placeholder="Reason for change..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#F6F2EA] text-xs border border-[#ECE7DF]"
                />
              </div>
            </form>
          </div>

          <div className="pt-4 border-t border-[#ECE7DF] flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-medium text-[#7A746A] hover:bg-[#F6F2EA]"
            >
              Cancel
            </button>
            <button
              form="attendance-drawer-form"
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-[#2F7D4F] hover:bg-[#276842] transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Save size={15} />
              <span>{loading ? 'Saving...' : 'Save & Recalculate'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
