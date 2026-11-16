import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { UnifiedInboxResponse } from '../../types';
import { formatDateReadable, formatTime12 } from '../../utils/time';
import { X, Check, CheckCircle2, Clock, Calendar, AlertCircle, Sparkles, Inbox } from 'lucide-react';

interface UnifiedInboxDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onActionComplete: () => void;
}

export const UnifiedInboxDrawer: React.FC<UnifiedInboxDrawerProps> = ({
  isOpen,
  onClose,
  onActionComplete
}) => {
  const [data, setData] = useState<UnifiedInboxResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchInbox = async () => {
    try {
      setLoading(true);
      const res = await api.getInbox();
      setData(res);
    } catch (err) {
      console.error('Failed to load inbox:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchInbox();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleApproveLeave = async (id: number) => {
    try {
      setProcessingId(`leave_${id}`);
      await api.reviewLeaveRequest(id, 'approved');
      await fetchInbox();
      onActionComplete();
    } finally {
      setProcessingId(null);
    }
  };

  const handleDenyLeave = async (id: number) => {
    try {
      setProcessingId(`leave_${id}`);
      await api.reviewLeaveRequest(id, 'denied');
      await fetchInbox();
      onActionComplete();
    } finally {
      setProcessingId(null);
    }
  };

  const handleApprovePunch = async (id: number) => {
    try {
      setProcessingId(`punch_${id}`);
      await api.reviewPunchRequest(id, 'approved');
      await fetchInbox();
      onActionComplete();
    } finally {
      setProcessingId(null);
    }
  };

  const handleDenyPunch = async (id: number) => {
    try {
      setProcessingId(`punch_${id}`);
      await api.reviewPunchRequest(id, 'denied');
      await fetchInbox();
      onActionComplete();
    } finally {
      setProcessingId(null);
    }
  };

  const handleAckAutoCheckout = async (id: number) => {
    try {
      setProcessingId(`auto_${id}`);
      await api.reviewAutoCheckout(id);
      await fetchInbox();
      onActionComplete();
    } finally {
      setProcessingId(null);
    }
  };

  const leaves = data?.leaveRequests || [];
  const punchFixes = data?.punchRequests || [];
  const autoCheckouts = data?.autoCheckouts || [];
  const total = (leaves.length + punchFixes.length + autoCheckouts.length);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-xs" onClick={onClose} />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#FFFDF9] rounded-l-[28px] warm-card p-6 flex flex-col justify-between overflow-y-auto">
          {/* Header */}
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-[#ECE7DF]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#F6F2EA] flex items-center justify-center text-[#2F7D4F]">
                  <Inbox size={18} />
                </div>
                <div>
                  <h3 className="font-heading text-lg font-bold text-[#22201C]">
                    Approvals &amp; Inbox
                  </h3>
                  <p className="text-xs text-[#7A746A]">
                    {total > 0 ? `${total} pending requests` : 'All caught up 🎉'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-[#F6F2EA] text-[#7A746A] transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* List */}
            {total === 0 ? (
              <div className="py-16 text-center space-y-2">
                <CheckCircle2 size={36} className="mx-auto text-[#2F7D4F]/40" />
                <p className="font-heading text-lg font-bold text-[#22201C]">All caught up 🎉</p>
                <p className="text-xs text-[#7A746A]">No pending leave or punch approvals.</p>
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                {/* 1. Leave Requests */}
                {leaves.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#7A746A]">
                      Leave Requests ({leaves.length})
                    </p>
                    {leaves.map((lr) => (
                      <div
                        key={lr.id}
                        className="p-3.5 rounded-[18px] bg-white border border-[#ECE7DF] warm-card space-y-2.5"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="font-heading text-sm font-bold text-[#22201C] block">
                              {lr.employee_name}
                            </span>
                            <span className="text-[11px] text-[#7A746A]">
                              {formatDateReadable(lr.start_date)} ({lr.days_count}d) · {lr.is_paid ? 'Paid' : 'Unpaid'}
                            </span>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#ECF2F9] text-[#4A7BB7]">
                            Leave
                          </span>
                        </div>

                        {lr.reason && (
                          <p className="text-xs text-[#7A746A] bg-[#F6F2EA] p-2 rounded-xl">
                            "{lr.reason}"
                          </p>
                        )}

                        <div className="flex items-center justify-end gap-2 pt-1 border-t border-[#ECE7DF]/60">
                          <button
                            onClick={() => handleDenyLeave(lr.id)}
                            disabled={processingId === `leave_${lr.id}`}
                            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-[#D9534A] hover:bg-[#FBECEA]"
                          >
                            Deny
                          </button>
                          <button
                            onClick={() => handleApproveLeave(lr.id)}
                            disabled={processingId === `leave_${lr.id}`}
                            className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-[#2F7D4F] hover:bg-[#276842] shadow-xs"
                          >
                            Approve
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 2. Staff Punch Requests ("Forgot to punch? Request a fix") */}
                {punchFixes.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#7A746A]">
                      Punch Fix Requests ({punchFixes.length})
                    </p>
                    {punchFixes.map((pr) => (
                      <div
                        key={pr.id}
                        className="p-3.5 rounded-[18px] bg-white border border-[#ECE7DF] warm-card space-y-2.5"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="font-heading text-sm font-bold text-[#22201C] block">
                              {pr.employee_name}
                            </span>
                            <span className="text-[11px] text-[#7A746A]">
                              {pr.type.replace('_', ' ')} · {pr.date} at {pr.time}
                            </span>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FCF5E3] text-[#E8B44A]">
                            Punch Fix
                          </span>
                        </div>

                        <p className="text-xs text-[#7A746A] bg-[#F6F2EA] p-2 rounded-xl">
                          "{pr.reason}"
                        </p>

                        <div className="flex items-center justify-end gap-2 pt-1 border-t border-[#ECE7DF]/60">
                          <button
                            onClick={() => handleDenyPunch(pr.id)}
                            disabled={processingId === `punch_${pr.id}`}
                            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-[#D9534A] hover:bg-[#FBECEA]"
                          >
                            Deny
                          </button>
                          <button
                            onClick={() => handleApprovePunch(pr.id)}
                            disabled={processingId === `punch_${pr.id}`}
                            className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-[#2F7D4F] hover:bg-[#276842] shadow-xs"
                          >
                            Approve &amp; Log
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 3. Midnight Auto Checkouts */}
                {autoCheckouts.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#7A746A]">
                      Auto Check-Out Reviews ({autoCheckouts.length})
                    </p>
                    {autoCheckouts.map((ac) => (
                      <div
                        key={ac.id}
                        className="p-3.5 rounded-[18px] bg-white border border-[#ECE7DF] warm-card space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-heading text-sm font-bold text-[#22201C] block">
                              {ac.employee_name}
                            </span>
                            <span className="text-[11px] text-[#7A746A]">
                              Auto-checked out at 12:00 AM on {ac.date}
                            </span>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F9ECE8] text-[#C0573E]">
                            Midnight Auto
                          </span>
                        </div>

                        <div className="flex items-center justify-end pt-1">
                          <button
                            onClick={() => handleAckAutoCheckout(ac.id)}
                            disabled={processingId === `auto_${ac.id}`}
                            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#F6F2EA] text-[#22201C] hover:bg-[#ECE7DF]"
                          >
                            Acknowledge
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-[#ECE7DF]">
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-[#F6F2EA] text-[#22201C] text-xs font-semibold hover:bg-[#ECE7DF]"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
