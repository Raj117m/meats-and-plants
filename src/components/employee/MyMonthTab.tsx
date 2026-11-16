import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api';
import { PayrollEmployee, DayRecord, LeaveRequest, Holiday } from '../../types';
import { formatINR, formatINRAmountSigned } from '../../utils/currency';
import { DayDetailSheet } from './DayDetailSheet';
import {
  ChevronLeft,
  ChevronRight,
  Gift,
  Calendar,
  Sparkles,
  Info
} from 'lucide-react';

export const MyMonthTab: React.FC = () => {
  const { currentStaff } = useAuth();
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonthNum, setCurrentMonthNum] = useState(11); // 1-based (11 = Nov)
  const [payrollData, setPayrollData] = useState<PayrollEmployee | null>(null);
  const [daysMap, setDaysMap] = useState<Record<string, DayRecord>>({});
  const [pendingLeaves, setPendingLeaves] = useState<LeaveRequest[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);

  // Day Sheet states
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<DayRecord | null>(null);

  const monthStr = `${currentYear}-${String(currentMonthNum).padStart(2, '0')}`;

  const fetchMonthData = async () => {
    if (!currentStaff?.id) return;
    try {
      setLoading(true);
      const [payRes, attRes, holRes] = await Promise.all([
        api.getMonthPayroll(monthStr),
        api.getMonthAttendance(monthStr),
        api.getHolidays(currentYear).catch(() => [])
      ]);

      const myPay = payRes.employees.find((e) => e.employeeId === currentStaff.id);
      if (myPay) setPayrollData(myPay);
      if (attRes?.dayMap) setDaysMap(attRes.dayMap);
      if (attRes?.pendingLeaves) {
        setPendingLeaves(attRes.pendingLeaves.filter((l) => l.employee_id === currentStaff.id));
      }
      setHolidays(holRes || []);
    } catch (err) {
      console.error('Failed to load month data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonthData();
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

  const handleJumpToToday = () => {
    setCurrentYear(2026);
    setCurrentMonthNum(11);
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
    const isPending = pendingLeaves.some(
      (l) => l.status === 'pending' && dateKey >= l.start_date && dateKey <= l.end_date
    );
    const holiday = holidays.find((h) => h.date === dateKey);
    return {
      dayNum,
      dateKey,
      record,
      isPending,
      holiday
    };
  });

  const handleDateClick = (dateKey: string, record: DayRecord | null) => {
    setSelectedDate(dateKey);
    setSelectedRecord(record);
    setSheetOpen(true);
  };

  const dailyWage = currentStaff?.daily_wage || (payrollData?.dailyRate ?? 600);
  const bonusHolidays = payrollData?.bonusHolidaysAvailable ?? 0;
  const breakRemainder = payrollData ? (payrollData.breaksBanked % 4) : 0;

  return (
    <div className="w-full max-w-md mx-auto px-4 py-4 space-y-4">
      {/* Month Navigation Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="section-label">Monthly Ledger</span>
          <h2 className="text-xl font-bold tracking-tight text-[#0A0A0A]">
            My Month
          </h2>
        </div>

        {/* ‹ Month Year › arrows + Today Jump */}
        <div className="flex items-center gap-1.5 bg-[#FFFFFF] p-1 rounded-xl border border-[#E6E6E2]">
          <button
            onClick={handlePrevMonth}
            className="p-1 rounded-lg hover:bg-[#F2F2EF] text-[#6E6E6A] hover:text-[#0A0A0A] transition-colors"
            title="Previous month"
          >
            <ChevronLeft size={16} />
          </button>

          <span className="text-xs font-semibold text-[#0A0A0A] px-1">
            {monthName} {currentYear}
          </span>

          <button
            onClick={handleNextMonth}
            className="p-1 rounded-lg hover:bg-[#F2F2EF] text-[#6E6E6A] hover:text-[#0A0A0A] transition-colors"
            title="Next month"
          >
            <ChevronRight size={16} />
          </button>

          {(currentYear !== 2026 || currentMonthNum !== 11) && (
            <button
              onClick={handleJumpToToday}
              className="ml-1 px-2 py-0.5 rounded-md bg-[#F2F2EF] text-[#0A0A0A] text-[10px] font-semibold"
            >
              Today
            </button>
          )}
        </div>
      </div>

      {/* Bonus Holiday Available Banner */}
      {bonusHolidays > 0 && (
        <div className="p-3.5 rounded-xl bg-[#FFFFFF] border border-[#B0235F] flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#FAFAF8] border border-[#B0235F]/30 flex items-center justify-center text-sm">
              🎁
            </div>
            <div>
              <p className="text-xs font-bold text-[#0A0A0A]">
                {bonusHolidays} bonus paid holiday available
              </p>
              <p className="text-[11px] text-[#6E6E6A]">
                Earned from 4 banked breaks · Adds to your paid-leave balance
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold text-[#B0235F] uppercase tracking-wide">
            Earned
          </span>
        </div>
      )}

      {/* Hero Projected Salary Card */}
      <div className="p-5 rounded-2xl bg-[#FFFFFF] border border-[#E6E6E2] space-y-2 shadow-2xs">
        <div className="flex items-center justify-between">
          <span className="section-label">Projected Payout</span>
          <span className="text-[11px] font-semibold text-[#6E6E6A]">30-Day Cycle</span>
        </div>

        <div className="text-3xl sm:text-4xl font-bold text-[#0A0A0A] tabular-nums tracking-tight">
          {formatINR(payrollData?.netSalary ?? (dailyWage * 30))}
        </div>

        <div className="pt-1 flex flex-col gap-0.5 text-xs text-[#6E6E6A]">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#2E7D4F]" />
            <span>Today's earning: <strong className="text-[#0A0A0A]">₹{dailyWage}</strong></span>
          </div>
          <p className="text-[11px]">
            Daily rate: ₹{dailyWage}/day · {currentStaff?.pay_type === 'daily' ? 'Daily Wage Contract' : 'Monthly Salary Contract'}
          </p>
        </div>
      </div>

      {/* 3 Stat Tiles */}
      <div className="grid grid-cols-3 gap-2">
        {/* Paid leaves left */}
        <div className="p-3 rounded-xl bg-[#FFFFFF] border border-[#E6E6E2] text-center flex flex-col justify-between">
          <p className="section-label">Paid Leaves</p>
          <div className="text-base sm:text-lg font-bold text-[#3B5BA9] my-1 tabular-nums">
            {payrollData?.paidLeavesLeft ?? 3} <span className="text-[10px] font-normal text-[#6E6E6A]">/ 3</span>
          </div>
          <p className="text-[10px] text-[#6E6E6A]">
            {payrollData?.paidLeavesUsed ?? 0} used (leaves 1–3 paid)
          </p>
        </div>

        {/* Half days / Late marks */}
        <div className="p-3 rounded-xl bg-[#FFFFFF] border border-[#E6E6E2] text-center flex flex-col justify-between">
          <p className="section-label">Half Days</p>
          <div className="text-base sm:text-lg font-bold text-[#B7791F] my-1 tabular-nums">
            {payrollData?.halfDaysCount ?? 0}
          </div>
          <p className="text-[10px] text-[#6E6E6A]">
            After 15m grace period
          </p>
        </div>

        {/* Breaks banked */}
        <div className="p-3 rounded-xl bg-[#FFFFFF] border border-[#E6E6E2] text-center flex flex-col justify-between">
          <p className="section-label">Break Bank</p>
          <div className="flex items-center justify-center gap-1 my-1.5">
            {[0, 1, 2, 3].map((dotIdx) => {
              const isFilled = dotIdx < breakRemainder;
              return (
                <div
                  key={dotIdx}
                  className={`w-2 h-2 rounded-full transition-all ${
                    isFilled ? 'bg-[#0A0A0A]' : 'bg-[#E6E6E2]'
                  }`}
                />
              );
            })}
          </div>
          <p className="text-[10px] text-[#0A0A0A] font-semibold">
            {breakRemainder} of 4 (+1d holiday)
          </p>
        </div>
      </div>

      {/* Attendance Calendar Grid */}
      <div className="p-4 rounded-2xl bg-[#FFFFFF] border border-[#E6E6E2] space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#0A0A0A]">
              Attendance &amp; Schedule
            </h3>
            <p className="text-[11px] text-[#6E6E6A]">Tap any date to view shifts or request leave</p>
          </div>
          <span className="text-xs text-[#6E6E6A] font-semibold">{monthName}</span>
        </div>

        {/* 7-column calendar grid */}
        <div className="grid grid-cols-7 gap-1 text-center">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
            <div key={i} className="text-[10px] font-semibold text-[#6E6E6A] pb-1">
              {d}
            </div>
          ))}

          {calendarDays.map(({ dayNum, dateKey, record, isPending, holiday }) => {
            const status = record?.status;
            const isToday = dateKey === new Date().toISOString().split('T')[0];
            let dotStyle = 'bg-[#FAFAF8] text-[#6E6E6A] border-transparent';

            if (isPending) {
              dotStyle = 'bg-[#FFFFFF] text-[#3B5BA9] font-bold border-2 border-dashed border-[#3B5BA9]';
            } else if (status === 'present') {
              dotStyle = 'bg-[#FFFFFF] text-[#2E7D4F] font-bold border border-[#2E7D4F]';
            } else if (status === 'half_day' || status === 'late') {
              dotStyle = 'bg-[#FFFFFF] text-[#B7791F] font-bold border border-[#B7791F]';
            } else if (status === 'paid_leave' || status === 'upcoming_leave') {
              dotStyle = 'bg-[#FFFFFF] text-[#3B5BA9] font-bold border border-[#3B5BA9]';
            } else if (status === 'unpaid_leave' || status === 'absent') {
              dotStyle = 'bg-[#FFFFFF] text-[#B42318] font-bold border border-[#B42318]';
            }

            // Holiday marker (violet-red outline)
            const isHoliday = !!holiday;

            return (
              <button
                key={dayNum}
                onClick={() => handleDateClick(dateKey, record)}
                className={`h-9 rounded-xl flex items-center justify-center text-xs transition-transform relative cursor-pointer ${dotStyle} ${
                  isHoliday ? 'holiday-marker' : ''
                } ${isToday ? 'ring-2 ring-[#0A0A0A]' : ''}`}
                title={holiday ? `Holiday: ${holiday.name}` : `Date: ${dateKey}`}
              >
                <span className="tabular-nums">{dayNum}</span>
                {holiday && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#B0235F]" />
                )}
                {record?.break_skipped === 1 && !holiday && (
                  <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#0A0A0A]" />
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="pt-2 flex flex-wrap items-center justify-center gap-2 text-[10px] text-[#6E6E6A]">
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded border border-[#2E7D4F] bg-white" />
            <span>Present</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded border border-[#B7791F] bg-white" />
            <span>Half Day</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded border border-[#3B5BA9] bg-white" />
            <span>Paid Leave</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded border-1.5 border-[#B0235F] bg-white" />
            <span>Gazetted Holiday</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded border border-[#B42318] bg-white" />
            <span>Unpaid / Absent</span>
          </div>
        </div>
      </div>

      {/* Itemized Calculation List */}
      <div className="p-4 rounded-2xl bg-[#FFFFFF] border border-[#E6E6E2] space-y-3">
        <span className="section-label">Earnings &amp; Deductions</span>

        <div className="space-y-2 text-xs divide-y divide-[#E6E6E2]">
          <div className="flex items-center justify-between pt-1">
            <span className="text-[#6E6E6A]">Base Monthly Rate (30 days)</span>
            <span className="font-bold text-[#0A0A0A] tabular-nums">
              {formatINR(payrollData?.baseSalary ?? (dailyWage * 30))}
            </span>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-[#6E6E6A]">Unpaid Leaves ({payrollData?.totalUnpaidDays ?? 0}d)</span>
            <span className={`font-bold tabular-nums ${(payrollData?.unpaidDaysDeductionAmount ?? 0) > 0 ? 'text-[#B42318]' : 'text-[#6E6E6A]'}`}>
              {formatINRAmountSigned(payrollData?.unpaidDaysDeductionAmount ?? 0, 'deduction')}
            </span>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-[#6E6E6A]">Half-Day Deductions ({payrollData?.halfDaysCount ?? 0}d)</span>
            <span className={`font-bold tabular-nums ${(payrollData?.halfDaysDeductionAmount ?? 0) > 0 ? 'text-[#B42318]' : 'text-[#6E6E6A]'}`}>
              {formatINRAmountSigned(payrollData?.halfDaysDeductionAmount ?? 0, 'deduction')}
            </span>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-[#6E6E6A]">Gazetted Holidays ({payrollData?.holidaysCount ?? 0} paid)</span>
            <span className="font-bold text-[#2E7D4F] tabular-nums">
              Fully Paid
            </span>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-[#0A0A0A]">
            <span className="font-bold text-sm text-[#0A0A0A]">Net Disbursable</span>
            <span className="font-bold text-base text-[#2E7D4F] tabular-nums">
              {formatINR(payrollData?.netSalary ?? (dailyWage * 30))}
            </span>
          </div>
        </div>
      </div>

      {/* Date Detail Sheet (Past / Future) */}
      <DayDetailSheet
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        dateStr={selectedDate}
        record={selectedRecord}
        employee={currentStaff!}
        paidLeavesLeft={payrollData?.paidLeavesLeft ?? 3}
        onSuccess={() => fetchMonthData()}
      />
    </div>
  );
};
