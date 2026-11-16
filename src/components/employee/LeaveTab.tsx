import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api';
import { LeaveRequest, DayRecord } from '../../types';
import { formatDateReadable } from '../../utils/time';
import { DayDetailSheet } from './DayDetailSheet';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle
} from 'lucide-react';

export const LeaveTab: React.FC = () => {
  const { currentStaff } = useAuth();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Month navigation for leave calendar
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonthNum, setCurrentMonthNum] = useState(11);
  const [daysMap, setDaysMap] = useState<Record<string, DayRecord>>({});
  const [remainingPaidLeaves, setRemainingPaidLeaves] = useState(3);

  // Day Sheet states
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<DayRecord | null>(null);

  const monthStr = `${currentYear}-${String(currentMonthNum).padStart(2, '0')}`;

  const fetchLeaves = async () => {
    if (!currentStaff?.id) return;
    try {
      setLoading(true);
      const [reqList, attRes, payRes] = await Promise.all([
        api.getLeaveRequests(currentStaff.id),
        api.getMonthAttendance(monthStr),
        api.getMonthPayroll(monthStr)
      ]);
      setRequests(reqList);
      if (attRes?.dayMap) setDaysMap(attRes.dayMap);

      const myPay = payRes.employees.find((e) => e.employeeId === currentStaff.id);
      if (myPay) setRemainingPaidLeaves(myPay.paidLeavesLeft);
    } catch (err) {
      console.error('Failed to load leave requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, [currentStaff?.id, monthStr]);

  const handlePrevMonth = () => {
    if (currentMonthNum === 1) {
      setCurrentYear((y) => y - 1);
      setCurrentMonthNum(12);
    } else {
      setCurrentMonthNum((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonthNum === 12) {
      setCurrentYear((y) => y + 1);
      setCurrentMonthNum(1);
    } else {
      setCurrentMonthNum((m) => m + 1);
    }
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const monthName = monthNames[currentMonthNum - 1];

  const daysInMonth = new Date(currentYear, currentMonthNum, 0).getDate();
  const calendarDays = Array.from({ length: daysInMonth }, (_, i) => {
    const dayNum = i + 1;
    const dateKey = `${monthStr}-${String(dayNum).padStart(2, '0')}`;
    const record = daysMap[`${currentStaff?.id}_${dateKey}`];
    const isPending = requests.some(
      (l) => l.status === 'pending' && dateKey >= l.start_date && dateKey <= l.end_date
    );
    return {
      dayNum,
      dateKey,
      record,
      isPending
    };
  });

  const handleDateClick = (dateKey: string, record: DayRecord | null) => {
    setSelectedDate(dateKey);
    setSelectedRecord(record);
    setSheetOpen(true);
  };

  return (
    <div className="max-w-[430px] mx-auto px-4 py-4 space-y-5">
      {/* Title */}
      <div>
        <h2 className="font-heading text-xl font-bold tracking-tight text-[#22201C]">
          Leave Management
        </h2>
        <p className="text-xs text-[#7A746A]">Tap any future date on the calendar to request time off</p>
      </div>

      {/* Quota Banner */}
      <div className="p-4 rounded-[20px] bg-[#ECF2F9] border border-[#4A7BB7]/20 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold text-[#4A7BB7] uppercase tracking-wider">
            Paid Leave Balance
          </p>
          <p className="font-heading text-lg font-bold text-[#22201C] mt-0.5">
            {remainingPaidLeaves} days left <span className="text-xs font-normal text-[#7A746A]">({monthName})</span>
          </p>
        </div>
        <div className="w-9 h-9 rounded-xl bg-white/90 flex items-center justify-center text-[#4A7BB7] shadow-xs">
          <CalendarIcon size={18} />
        </div>
      </div>

      {/* Calendar for Tapping Dates */}
      <div className="p-4 rounded-[24px] bg-white border border-[#ECE7DF] warm-card space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-heading text-sm font-bold text-[#22201C]">
            Select Dates on Calendar
          </span>

          <div className="flex items-center gap-1 bg-[#F6F2EA] px-2 py-1 rounded-xl">
            <button onClick={handlePrevMonth} className="p-0.5 hover:text-[#22201C]">
              <ChevronLeft size={15} />
            </button>
            <span className="text-xs font-semibold px-1 text-[#22201C]">
              {monthName} {currentYear}
            </span>
            <button onClick={handleNextMonth} className="p-0.5 hover:text-[#22201C]">
              <ChevronRight size={15} />
            </button>
          </div>
        </div>

        {/* 7-column grid */}
        <div className="grid grid-cols-7 gap-1 text-center">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
            <div key={i} className="text-[10px] font-bold text-[#7A746A] pb-1">
              {d}
            </div>
          ))}

          {calendarDays.map(({ dayNum, dateKey, record, isPending }) => {
            const status = record?.status;
            let dotStyle = 'bg-[#F6F2EA] text-[#7A746A]';

            if (isPending) {
              dotStyle = 'bg-white text-[#4A7BB7] font-bold border-2 border-dashed border-[#4A7BB7]';
            } else if (status === 'paid_leave' || status === 'upcoming_leave') {
              dotStyle = 'bg-[#ECF2F9] text-[#4A7BB7] font-bold border border-[#4A7BB7]/30';
            } else if (status === 'present') {
              dotStyle = 'bg-[#EBF5EE] text-[#2F7D4F] font-bold';
            } else if (status === 'unpaid_leave' || status === 'absent') {
              dotStyle = 'bg-[#FBECEA] text-[#D9534A] font-bold';
            }

            return (
              <button
                key={dayNum}
                onClick={() => handleDateClick(dateKey, record)}
                className={`h-9 rounded-xl flex items-center justify-center text-xs transition-transform tap-bounce relative cursor-pointer ${dotStyle}`}
              >
                <span>{dayNum}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* List of My Requests */}
      <div className="space-y-3">
        <h3 className="font-heading text-sm font-bold text-[#22201C]">
          My Requests
        </h3>

        {requests.length === 0 ? (
          <div className="p-6 text-center text-xs text-[#7A746A] bg-white rounded-[20px] border border-[#ECE7DF] warm-card">
            No leave requests yet. Tap a date on the calendar above to request one!
          </div>
        ) : (
          <div className="space-y-2">
            {requests.map((req) => {
              const statusColors = {
                pending: 'bg-[#FCF5E3] text-[#E8B44A] border-[#E8B44A]/30',
                approved: 'bg-[#ECF2F9] text-[#4A7BB7] border-[#4A7BB7]/30',
                denied: 'bg-[#FBECEA] text-[#D9534A] border-[#D9534A]/30'
              };

              return (
                <div
                  key={req.id}
                  className="p-4 rounded-[20px] bg-white border border-[#ECE7DF] warm-card flex items-center justify-between"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-heading text-xs font-bold text-[#22201C]">
                        {formatDateReadable(req.start_date)}
                        {req.start_date !== req.end_date && ` → ${formatDateReadable(req.end_date)}`}
                      </span>
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-[#F6F2EA] text-[#7A746A]">
                        {req.days_count}d
                      </span>
                    </div>

                    {req.reason && (
                      <p className="text-xs text-[#7A746A]">{req.reason}</p>
                    )}

                    <p className="text-[10px] text-[#7A746A]">
                      {req.is_paid ? 'Paid leave' : 'Unpaid leave'}
                    </p>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold capitalize border ${
                      statusColors[req.status]
                    }`}
                  >
                    {req.status}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Date Detail Sheet */}
      <DayDetailSheet
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        dateStr={selectedDate}
        record={selectedRecord}
        employee={currentStaff!}
        paidLeavesLeft={remainingPaidLeaves}
        onSuccess={() => fetchLeaves()}
      />
    </div>
  );
};
