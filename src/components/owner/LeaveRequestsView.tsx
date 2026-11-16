import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { LeaveRequest } from '../../types';
import { formatDateReadable } from '../../utils/time';
import {
  Calendar,
  Check,
  X,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  User,
  Filter
} from 'lucide-react';

interface LeaveRequestsViewProps {
  onRequestProcessed?: () => void;
}

export const LeaveRequestsView: React.FC<LeaveRequestsViewProps> = ({ onRequestProcessed }) => {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'reviewed'>('pending');

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const list = await api.getLeaveRequests();
      setRequests(list);
    } catch (err) {
      console.error('Failed to load leave requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleAction = async (id: number, status: 'approved' | 'denied') => {
    try {
      setProcessingId(id);
      await api.reviewLeaveRequest(id, status);
      await fetchRequests();
      if (onRequestProcessed) onRequestProcessed();
    } catch (err) {
      alert('Failed to process leave request');
    } finally {
      setProcessingId(null);
    }
  };

  const filtered = requests.filter((r) => {
    if (filter === 'pending') return r.status === 'pending';
    if (filter === 'reviewed') return r.status !== 'pending';
    return true;
  });

  const pendingCount = requests.filter((r) => r.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight text-[#1C1C1A]">Leave Approval Queue</h2>
            {pendingCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-[#D99A2B] text-white text-xs font-bold">
                {pendingCount} Pending
              </span>
            )}
          </div>
          <p className="text-xs text-[#6B6B66] mt-0.5">
            Review time-off requests. Approved dates populate the attendance schedule automatically.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center bg-white p-1 rounded-xl border border-[#ECEAE5] soft-card-shadow">
          <button
            onClick={() => setFilter('pending')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              filter === 'pending'
                ? 'bg-[#1C1C1A] text-white shadow-xs'
                : 'text-[#6B6B66] hover:text-[#1C1C1A]'
            }`}
          >
            Pending ({pendingCount})
          </button>
          <button
            onClick={() => setFilter('reviewed')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              filter === 'reviewed'
                ? 'bg-[#1C1C1A] text-white shadow-xs'
                : 'text-[#6B6B66] hover:text-[#1C1C1A]'
            }`}
          >
            History
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              filter === 'all'
                ? 'bg-[#1C1C1A] text-white shadow-xs'
                : 'text-[#6B6B66] hover:text-[#1C1C1A]'
            }`}
          >
            All ({requests.length})
          </button>
        </div>
      </div>

      {/* Requests Grid */}
      {loading ? (
        <div className="p-8 text-center text-xs text-[#6B6B66]">Loading leave queue...</div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-[#ECEAE5] soft-card-shadow">
          <CheckCircle2 size={32} className="mx-auto text-[#2F7D4F]/40 mb-2" />
          <p className="text-sm font-bold text-[#1C1C1A]">All caught up!</p>
          <p className="text-xs text-[#6B6B66] mt-0.5">No leave requests in this queue.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((req) => {
            const isPending = req.status === 'pending';

            return (
              <div
                key={req.id}
                className="p-5 rounded-3xl bg-white border border-[#ECEAE5] soft-card-shadow flex flex-col justify-between space-y-4 hover:border-[#D4D2CD] transition-colors"
              >
                <div>
                  {/* Top Bar */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-[#1C1C1A]">{req.employee_name}</h4>
                      <p className="text-xs text-[#6B6B66]">{req.employee_role} · {req.employee_phone}</p>
                    </div>

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold capitalize ${
                        req.status === 'approved'
                          ? 'bg-[#E8F3EC] text-[#2F7D4F]'
                          : req.status === 'denied'
                          ? 'bg-[#FBE9E7] text-[#C8463D]'
                          : 'bg-[#FBF3E2] text-[#D99A2B]'
                      }`}
                    >
                      {req.status}
                    </span>
                  </div>

                  {/* Dates & Duration Banner */}
                  <div className="mt-3 p-3 rounded-2xl bg-[#F7F6F3] border border-[#ECEAE5] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar size={16} className="text-[#3E6FA8]" />
                      <span className="text-xs font-bold text-[#1C1C1A]">
                        {formatDateReadable(req.start_date)}
                        {req.start_date !== req.end_date && ` → ${formatDateReadable(req.end_date)}`}
                      </span>
                    </div>

                    <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-white border border-[#ECEAE5] text-[#1C1C1A]">
                      {req.days_count} day{req.days_count > 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Reason & Type Details */}
                  <div className="mt-3 space-y-1.5 text-xs">
                    {req.reason && (
                      <p className="text-[#1C1C1A]">
                        <strong className="text-[#6B6B66]">Reason:</strong> {req.reason}
                      </p>
                    )}

                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-[#6B6B66]">Coverage:</span>
                      <span
                        className={`font-semibold px-2 py-0.5 rounded-md text-[11px] ${
                          req.is_paid ? 'bg-[#E8F3EC] text-[#2F7D4F]' : 'bg-[#FBE9E7] text-[#C8463D]'
                        }`}
                      >
                        {req.is_paid ? 'Paid Leave (Covered by monthly 3-day quota)' : 'Unpaid Leave (Quota Exceeded)'}
                      </span>
                    </div>

                    <p className="text-[10px] text-[#A0A09B] pt-1">
                      Submitted on {req.created_at}
                    </p>
                  </div>
                </div>

                {/* Approve / Deny Action Buttons */}
                {isPending && (
                  <div className="pt-3 border-t border-[#ECEAE5] flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleAction(req.id, 'denied')}
                      disabled={processingId === req.id}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-[#C8463D] hover:bg-[#FBE9E7] transition-colors flex items-center gap-1.5"
                    >
                      <X size={15} />
                      <span>Deny</span>
                    </button>

                    <button
                      onClick={() => handleAction(req.id, 'approved')}
                      disabled={processingId === req.id}
                      className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#2F7D4F] hover:bg-[#276842] transition-colors flex items-center gap-1.5 shadow-xs"
                    >
                      <Check size={15} />
                      <span>{processingId === req.id ? 'Approving...' : 'Approve Leave'}</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
