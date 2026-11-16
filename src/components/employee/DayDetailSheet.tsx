import React, { useState } from 'react';
import { DayRecord, Employee } from '../../types';
import { formatDateReadable, formatTime12 } from '../../utils/time';
import { formatINR } from '../../utils/currency';
import { api } from '../../api';
import { X, Calendar, Clock, Coffee, AlertCircle, CheckCircle2, Send } from 'lucide-react';

interface DayDetailSheetProps {
  isOpen: boolean;
  onClose: () => void;
  dateStr: string | null;
  record: DayRecord | null;
  employee: Employee;
  paidLeavesLeft: number;
  onSuccess: () => void;
}

export const DayDetailSheet: React.FC<DayDetailSheetProps> = ({
  isOpen,
  onClose,
  dateStr,
  record,
  employee,
  paidLeavesLeft,
  onSuccess
}) => {
  if (!isOpen || !dateStr) return null;

  const todayStr = '2026-11-15';
  const isFuture = dateStr > todayStr;
  const isPastOrToday = !isFuture;

  // Leave request form states (for future dates)
  const [leaveType, setLeaveType] = useState<'paid' | 'unpaid'>(paidLeavesLeft > 0 ? 'paid' : 'unpaid');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const dailyWage = employee.daily_wage || Math.round(employee.monthly_salary / 30);

  const handleRequestLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await api.submitLeaveRequest({
        employee_id: employee.id,
        start_date: dateStr,
        end_date: dateStr,
        reason: reason.trim() || undefined,
        is_paid: leaveType === 'paid' && paidLeavesLeft > 0
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to submit leave request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-xs">
      <div className="w-full max-w-[430px] warm-sheet p-6 space-y-4 animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#ECE7DF]">
          <div>
            <h3 className="font-heading text-lg font-bold text-[#22201C]">
              {formatDateReadable(dateStr)}
            </h3>
            <p className="text-xs text-[#7A746A]">
              {isFuture ? 'Future Date · Request Time Off' : 'Past Shift Summary'}
            </p>
          </div>
          <button onClick={onClose} className="p-1 text-[#7A746A] hover:text-[#22201C]">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        {isFuture ? (
          /* Future Date: Leave Request Bottom Sheet */
          <form onSubmit={handleRequestLeave} className="space-y-4">
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[#7A746A]">
                Select Leave Choice
              </label>

              {/* Option 1: Paid Leave */}
              <button
                type="button"
                onClick={() => setLeaveType('paid')}
                className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all ${
                  leaveType === 'paid'
                    ? 'border-[#4A7BB7] bg-[#ECF2F9] text-[#22201C]'
                    : 'border-[#ECE7DF] bg-white text-[#7A746A]'
                }`}
              >
                <div>
                  <div className="text-xs font-bold text-[#22201C]">Request Paid Leave</div>
                  <div className="text-[11px] text-[#4A7BB7] font-medium mt-0.5">
                    {paidLeavesLeft > 0
                      ? `${paidLeavesLeft} of 3 left this month`
                      : 'This will be unpaid (3 of 3 used)'}
                  </div>
                </div>
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    leaveType === 'paid' ? 'border-[#4A7BB7] bg-[#4A7BB7]' : 'border-[#ECE7DF]'
                  }`}
                >
                  {leaveType === 'paid' && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
              </button>

              {/* Option 2: Unpaid Leave */}
              <button
                type="button"
                onClick={() => setLeaveType('unpaid')}
                className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all ${
                  leaveType === 'unpaid'
                    ? 'border-[#D9534A] bg-[#FBECEA] text-[#22201C]'
                    : 'border-[#ECE7DF] bg-white text-[#7A746A]'
                }`}
              >
                <div>
                  <div className="text-xs font-bold text-[#22201C]">Request Leave (Unpaid)</div>
                  <div className="text-[11px] text-[#7A746A] mt-0.5">
                    Doesn't count against your 3 paid leave quota
                  </div>
                </div>
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    leaveType === 'unpaid' ? 'border-[#D9534A] bg-[#D9534A]' : 'border-[#ECE7DF]'
                  }`}
                >
                  {leaveType === 'unpaid' && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#7A746A] mb-1">
                Reason (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Doctor appointment, family function..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-[#F6F2EA] border border-[#ECE7DF] text-xs text-[#22201C]"
              />
            </div>

            <p className="text-[11px] text-[#7A746A]">
              Requests appear with a dotted outline until the owner approves.
            </p>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 px-4 rounded-xl font-bold text-xs text-white bg-[#2F7D4F] hover:bg-[#276842] transition-colors tap-bounce flex items-center justify-center gap-2"
            >
              <Send size={14} />
              <span>{submitting ? 'Submitting...' : 'Submit Request to Owner'}</span>
            </button>
          </form>
        ) : (
          /* Past Date: Read-only Detail */
          <div className="space-y-3.5 text-xs">
            {/* Status Pill & Day's Earning */}
            <div className="p-4 rounded-2xl bg-[#F6F2EA] border border-[#ECE7DF] flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#7A746A] block">
                  Status
                </span>
                <span className="font-heading text-base font-bold text-[#22201C] capitalize">
                  {record?.status ? record.status.replace('_', ' ') : 'Off / No Record'}
                </span>
              </div>

              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-[#7A746A] block">
                  Day's Earning
                </span>
                <span
                  className={`font-heading text-lg font-bold ${
                    record?.status === 'present' || record?.status === 'paid_leave'
                      ? 'text-[#2F7D4F]'
                      : record?.status === 'late'
                      ? 'text-[#E8B44A]'
                      : record?.deduction === 'half'
                      ? 'text-[#C0573E]'
                      : 'text-[#7A746A]'
                  }`}
                >
                  {record?.status === 'present' || record?.status === 'paid_leave'
                    ? `+${formatINR(dailyWage)}`
                    : record?.deduction === 'half'
                    ? `+${formatINR(Math.round(dailyWage / 2))}`
                    : record?.status === 'late'
                    ? `+${formatINR(dailyWage)} (Late)`
                    : '₹0'}
                </span>
              </div>
            </div>

            {/* Punches & Break Information */}
            <div className="space-y-2 p-3 bg-white rounded-2xl border border-[#ECE7DF]">
              <div className="flex items-center justify-between">
                <span className="text-[#7A746A]">Punch Times:</span>
                <span className="font-semibold text-[#22201C]">
                  {record?.punches && record.punches.length > 0
                    ? record.punches.map((p) => `${formatTime12(p.timestamp)}`).join(' · ')
                    : '12:00 PM → 12:00 AM (Scheduled)'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[#7A746A]">3-hr Break:</span>
                <span className="font-semibold text-[#22201C]">
                  {record?.break_skipped === 1
                    ? 'Break Skipped (Banked ✓)'
                    : '3-hour Break Taken'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[#7A746A]">Punctuality:</span>
                <span
                  className={`font-semibold ${
                    record?.is_late ? 'text-[#E8B44A]' : 'text-[#2F7D4F]'
                  }`}
                >
                  {record?.is_late ? `Late (${record.late_minutes}m)` : 'On time ✓'}
                </span>
              </div>

              {record?.notes && (
                <div className="pt-2 border-t border-[#ECE7DF]">
                  <span className="text-[#7A746A] block text-[11px]">Note:</span>
                  <span className="text-[#22201C] font-medium">{record.notes}</span>
                </div>
              )}
            </div>

            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-[#F6F2EA] text-[#22201C] font-semibold text-xs hover:bg-[#ECE7DF] transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
