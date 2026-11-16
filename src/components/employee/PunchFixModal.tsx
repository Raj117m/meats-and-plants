import React, { useState } from 'react';
import { api } from '../../api';
import { X, Clock, Send, CheckCircle2 } from 'lucide-react';

interface PunchFixModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: number;
  onSuccess: () => void;
}

export const PunchFixModal: React.FC<PunchFixModalProps> = ({
  isOpen,
  onClose,
  employeeId,
  onSuccess
}) => {
  const [type, setType] = useState<'check_in' | 'start_break' | 'end_break' | 'check_out'>('check_in');
  const [date, setDate] = useState('2026-11-15');
  const [time, setTime] = useState('12:00');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason) return;
    try {
      setSubmitting(true);
      await api.submitPunchRequest({
        employee_id: employeeId,
        type,
        date,
        time,
        reason
      });
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        onSuccess();
        onClose();
      }, 1800);
    } catch (err: any) {
      alert(err.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white rounded-[24px] p-6 w-full max-w-sm warm-card animate-scale-in">
        <div className="flex items-center justify-between pb-3 border-b border-[#ECE7DF]">
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-[#C0573E]" />
            <h3 className="font-heading text-lg font-bold text-[#22201C]">Forgot to Punch?</h3>
          </div>
          <button onClick={onClose} className="p-1 text-[#7A746A] hover:text-[#22201C]">
            <X size={18} />
          </button>
        </div>

        {submitted ? (
          <div className="py-8 text-center space-y-2">
            <CheckCircle2 size={36} className="mx-auto text-[#2F7D4F]" />
            <p className="font-heading text-lg font-bold text-[#22201C]">Request Sent!</p>
            <p className="text-xs text-[#7A746A]">The owner will review and update your schedule.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-3.5 text-xs">
            <div>
              <label className="block font-semibold text-[#7A746A] mb-1">Punch Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-[#F6F2EA] border border-[#ECE7DF] text-[#22201C] font-medium"
              >
                <option value="check_in">Start Shift (Check-In)</option>
                <option value="start_break">Start 3h Break</option>
                <option value="end_break">End Break</option>
                <option value="check_out">End Shift (Check-Out)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block font-semibold text-[#7A746A] mb-1">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-[#F6F2EA] border border-[#ECE7DF] text-[#22201C]"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#7A746A] mb-1">Approx. Time</label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-[#F6F2EA] border border-[#ECE7DF] text-[#22201C]"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-[#7A746A] mb-1">Reason</label>
              <textarea
                rows={2}
                placeholder="e.g. Phone battery died, Wi-Fi glitch, kitchen rush..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl bg-[#F6F2EA] border border-[#ECE7DF] text-[#22201C]"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 text-[#7A746A] hover:text-[#22201C]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 rounded-xl bg-[#2F7D4F] hover:bg-[#276842] text-white font-bold flex items-center gap-1.5"
              >
                <Send size={13} />
                <span>{submitting ? 'Sending...' : 'Send to Owner'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
