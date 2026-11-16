import React, { useState } from 'react';
import { api } from '../../api';
import { Employee } from '../../types';
import { Clock, ShieldAlert, X, Check } from 'lucide-react';

interface ManualPunchModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee?: { id: number; name: string } | null;
  employees: Employee[];
  onSuccess: () => void;
  initialType?: 'check_in' | 'start_break' | 'end_break' | 'check_out';
}

export const ManualPunchModal: React.FC<ManualPunchModalProps> = ({
  isOpen,
  onClose,
  employee,
  employees,
  onSuccess,
  initialType = 'check_in'
}) => {
  const [selectedEmpId, setSelectedEmpId] = useState<number>(employee?.id || employees[0]?.id || 1);
  const [type, setType] = useState<'check_in' | 'start_break' | 'end_break' | 'check_out'>(initialType);
  const [date, setDate] = useState('2026-11-15');
  const [time, setTime] = useState('12:00');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await api.submitManualPunch({
        employee_id: employee?.id || selectedEmpId,
        type,
        date,
        time,
        reason: reason.trim() || 'Owner manual punch'
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit manual punch');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white rounded-3xl p-6 w-full max-w-md soft-elevated-shadow border border-[#ECEAE5] animate-scale-in">
        <div className="flex items-center justify-between pb-3 border-b border-[#ECEAE5]">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#F7F6F3] text-[#1C1C1A]">
              <Clock size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1C1C1A]">Manual Punch Override</h3>
              <p className="text-xs text-[#6B6B66]">Logged with "manual" tag in audit trail</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[#F7F6F3] text-[#6B6B66] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {error && (
            <div className="p-3 bg-[#FBE9E7] text-[#C8463D] text-xs rounded-xl flex items-center gap-2">
              <ShieldAlert size={14} />
              <span>{error}</span>
            </div>
          )}

          {/* Employee */}
          <div>
            <label className="block text-xs font-semibold text-[#6B6B66] mb-1">Employee</label>
            {employee ? (
              <div className="px-3.5 py-2.5 rounded-xl bg-[#F7F6F3] text-xs font-bold text-[#1C1C1A] border border-[#ECEAE5]">
                {employee.name}
              </div>
            ) : (
              <select
                value={selectedEmpId}
                onChange={(e) => setSelectedEmpId(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F6F3] text-xs font-semibold text-[#1C1C1A] border border-[#ECEAE5] focus:outline-none focus:border-[#2F7D4F]"
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.role})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Punch Type */}
          <div>
            <label className="block text-xs font-semibold text-[#6B6B66] mb-1">Action Type</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'check_in', label: 'Punch In' },
                { id: 'start_break', label: 'Start 3h Break' },
                { id: 'end_break', label: 'End Break' },
                { id: 'check_out', label: 'Punch Out' }
              ].map((t) => (
                <button
                  type="button"
                  key={t.id}
                  onClick={() => setType(t.id as any)}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
                    type === t.id
                      ? 'bg-[#1C1C1A] text-white'
                      : 'bg-[#F7F6F3] text-[#6B6B66] hover:bg-[#ECEAE5]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#6B6B66] mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl bg-[#F7F6F3] text-xs font-semibold border border-[#ECEAE5] focus:outline-none focus:border-[#2F7D4F]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#6B6B66] mb-1">Time</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl bg-[#F7F6F3] text-xs font-semibold border border-[#ECEAE5] focus:outline-none focus:border-[#2F7D4F]"
              />
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-semibold text-[#6B6B66] mb-1">Reason for Manual Entry</label>
            <input
              type="text"
              placeholder="e.g. Phone dead, Wi-Fi router reboot, emergency..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-xl bg-[#F7F6F3] text-xs border border-[#ECEAE5] focus:outline-none focus:border-[#2F7D4F]"
            />
          </div>

          {/* Submit */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-[#6B6B66] hover:bg-[#F7F6F3]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#2F7D4F] hover:bg-[#276842] transition-colors flex items-center gap-1.5"
            >
              {loading ? 'Recording...' : 'Record Manual Punch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
