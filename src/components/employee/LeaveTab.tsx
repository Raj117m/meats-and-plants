import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api';
import { LeaveRequest } from '../../types';
import { Plus, X, Calendar as CalendarIcon, Clock, CheckCircle2, XCircle } from 'lucide-react';

export const LeaveTab: React.FC = () => {
  const { currentStaff } = useAuth();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [paidLeavesLeft, setPaidLeavesLeft] = useState(3);

  // Sheet / Modal state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [startDate, setStartDate] = useState('2026-11-20');
  const [endDate, setEndDate] = useState('2026-11-20');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchLeaves = async () => {
    if (!currentStaff?.id) return;
    try {
      setLoading(true);
      const [reqList, payroll] = await Promise.all([
        api.getLeaveRequests(currentStaff.id),
        api.getMonthPayroll('2026-11')
      ]);
      setRequests(reqList);

      const me = payroll.records?.find((r) => r.employeeId === currentStaff.id);
      if (me) {
        setPaidLeavesLeft(me.paidLeavesLeft);
      }
    } catch (err) {
      console.error('Failed to load leave data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, [currentStaff?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStaff?.id) return;

    setSubmitting(true);
    try {
      await api.submitLeaveRequest({
        employee_id: currentStaff.id,
        start_date: startDate,
        end_date: endDate || startDate,
        reason: reason.trim() || 'Personal leave',
        is_paid: paidLeavesLeft > 0
      });

      setSheetOpen(false);
      setReason('');
      await fetchLeaves();
    } catch (err: any) {
      alert(`Error submitting request: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const willBePaid = paidLeavesLeft > 0;

  return (
    <div className="space-y-4 max-w-2xl mx-auto pb-10">
      {/* Header with "+ Request leave" */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-[#0A0A0A]">
            Leaves
          </h2>
          <p className="text-xs text-[#6E6E6A] mt-0.5">
            {paidLeavesLeft > 0
              ? `${paidLeavesLeft} paid leave${paidLeavesLeft > 1 ? 's' : ''} available this month`
              : 'Paid leave quota used (next leave will be unpaid)'}
          </p>
        </div>

        <button
          onClick={() => setSheetOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0A0A0A] text-white hover:bg-[#222222] text-xs font-medium transition-colors cursor-pointer"
        >
          <Plus size={14} />
          <span>Request leave</span>
        </button>
      </div>

      {/* Simplified Clean Table: Date · Reason · Paid / Unpaid · Status */}
      <div className="rounded-xl bg-white border border-[#E6E6E2] overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E6E6E2] bg-[#FAFAF8] text-[#6E6E6A] section-label">
                <th className="py-2.5 px-4 font-semibold">Date</th>
                <th className="py-2.5 px-4 font-semibold">Reason</th>
                <th className="py-2.5 px-4 font-semibold">Type</th>
                <th className="py-2.5 px-4 font-semibold text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6E6E2]">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-xs text-[#6E6E6A]">
                    Loading leaves…
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-xs text-[#6E6E6A]">
                    No leave requests found. Tap "+ Request leave" above to submit one.
                  </td>
                </tr>
              ) : (
                requests.map((req) => {
                  const isPaid = req.is_paid === 1;
                  const dateStr = req.start_date === req.end_date
                    ? req.start_date
                    : `${req.start_date} – ${req.end_date}`;

                  return (
                    <tr key={req.id} className="hover:bg-[#FAFAF8] transition-colors">
                      <td className="py-3 px-4 font-medium text-[#0A0A0A] whitespace-nowrap tabular-nums">
                        {dateStr}
                      </td>
                      <td className="py-3 px-4 text-[#0A0A0A] max-w-[200px] truncate">
                        {req.reason || 'Personal leave'}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${
                            isPaid
                              ? 'text-[#3B5BA9] bg-[#3B5BA9]/10'
                              : 'text-[#B42318] bg-[#B42318]/10'
                          }`}
                        >
                          {isPaid ? 'Paid' : 'Unpaid'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium capitalize ${
                            req.status === 'approved'
                              ? 'text-[#2E7D4F] bg-[#2E7D4F]/10'
                              : req.status === 'denied'
                              ? 'text-[#B42318] bg-[#B42318]/10'
                              : 'text-[#B7791F] bg-[#B7791F]/10'
                          }`}
                        >
                          {req.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Request Leave Sheet / Modal */}
      {sheetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-xl border border-[#E6E6E2] shadow-xl overflow-hidden animate-scale-in">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E6E6E2]">
              <div className="text-sm font-semibold tracking-tight text-[#0A0A0A]">
                Request Leave
              </div>
              <button
                onClick={() => setSheetOpen(false)}
                className="p-1 rounded-lg text-[#6E6E6A] hover:text-[#0A0A0A] hover:bg-[#F2F2EF] transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* Date pickers */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="section-label block mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      if (endDate < e.target.value) setEndDate(e.target.value);
                    }}
                    className="w-full px-3 py-2 rounded-lg bg-[#FAFAF8] border border-[#E6E6E2] text-xs text-[#0A0A0A] focus-quartz"
                  />
                </div>
                <div>
                  <label className="section-label block mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#FAFAF8] border border-[#E6E6E2] text-xs text-[#0A0A0A] focus-quartz"
                  />
                </div>
              </div>

              {/* Reason input */}
              <div>
                <label className="section-label block mb-1">Reason</label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Doctor appointment, family function..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#FAFAF8] border border-[#E6E6E2] text-xs text-[#0A0A0A] focus-quartz resize-none"
                />
              </div>

              {/* Live Preview of Paid vs Unpaid */}
              <div
                className={`p-3 rounded-lg border text-xs leading-relaxed ${
                  willBePaid
                    ? 'bg-[#3B5BA9]/5 border-[#3B5BA9]/20 text-[#3B5BA9]'
                    : 'bg-[#B42318]/5 border-[#B42318]/20 text-[#B42318]'
                }`}
              >
                <div className="font-semibold">
                  {willBePaid ? '✓ Paid Leave' : '⚠ Unpaid Leave'}
                </div>
                <div className="text-[11px] opacity-90 mt-0.5">
                  {willBePaid
                    ? `You currently have ${paidLeavesLeft} paid leave${paidLeavesLeft > 1 ? 's' : ''} available. No pay will be deducted.`
                    : 'Your monthly paid leave quota is exhausted. One day\'s pay will be deducted for this day.'}
                </div>
              </div>

              {/* Action buttons */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSheetOpen(false)}
                  className="px-3.5 py-2 text-xs font-medium rounded-lg border border-[#E6E6E2] text-[#0A0A0A] hover:bg-[#F2F2EF] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-medium rounded-lg bg-[#0A0A0A] text-white hover:bg-[#222222] transition-colors cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Submitting…' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
