import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api';
import { PayrollEmployee, DayRecord, LeaveRequest } from '../../types';
import { formatINR, formatINRAmountSigned } from '../../utils/currency';
import { DayDetailSheet } from './DayDetailSheet';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Sparkles,
  Coffee,
  CheckCircle2,
  Clock,
  TrendingUp,
  AlertCircle
} from 'lucide-react';

export const MyMonthTab: React.FC = () => {
  const { currentStaff } = useAuth();
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonthNum, setCurrentMonthNum] = useState(11); // 1-based (11 = Nov)
  const [payrollData, setPayrollData] = useState<PayrollEmployee | null>(null);
  const [daysMap, setDaysMap] = useState<Record<string, DayRecord>>({});
  const [pendingLeaves, setPendingLeaves] = useState<LeaveRequest[]>([]);
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
      const [payRes, attRes] = await Promise.all([
        api.getMonthPayroll(monthStr),
        api.getMonthAttendance(monthStr)
      ]);

      const myPay = payRes.employees.find((e) => e.employeeId === currentStaff.id);
      if (myPay) setPayrollData(myPay);
      if (attRes?.dayMap) setDaysMap(attRes.dayMap);
      if (attRes?.pendingLeaves) {
        setPendingLeaves(attRes.pendingLeaves.filter((l) => l.employee_id === currentStaff.id));
      }
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

  // Number of days in this month
  const daysInMonth = new Date(currentYear, currentMonthNum, 0).getDate();
  const calendarDays = Array.from({ length: daysInMonth }, (_, i) => {
    const dayNum = i + 1;
    const dateKey = `${monthStr}-${String(dayNum).padStart(2, '0')}`;
    const record = daysMap[`${currentStaff?.id}_${dateKey}`];
    const isPending = pendingLeaves.some(
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

  const dailyWage = currentStaff?.daily_wage || (payrollData?.dailyRate ?? 600);

  return (
    <div className="max-w-[430px] mx-auto px-4 py-4 space-y-4">
      {/* Month Navigation Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-xl font-bold tracking-tight text-[#22201C]">
            My Month
          </h2>
          <p className="text-xs text-[#7A746A]">Personal ledger &amp; shift earnings</p>
        </div>

        {/* ‹ Month Year › arrows + Today Jump */}
        <div className="flex items-center gap-1.5 bg-white p-1 rounded-2xl border border-[#ECE7DF] warm-card">
          <button
            onClick={handlePrevMonth}
            className="p-1 rounded-xl hover:bg-[#F6F2EA] text-[#7A746A] hover:text-[#22201C] transition-colors"
            title="Previous month"
          >
            <ChevronLeft size={16} />
          </button>

          <span className="text-xs font-semibold text-[#22201C] px-1 font-heading">
            {monthName} {currentYear}
          </span>

          <button
            onClick={handleNextMonth}
            className="p-1 rounded-xl hover:bg-[#F6F2EA] text-[#7A746A] hover:text-[#22201C] transition-colors"
            title="Next month"
          >
            <ChevronRight size={16} />
          </button>

          {(currentYear !== 2026 || currentMonthNum !== 11) && (
            <button
              onClick={handleJumpToToday}
              className="ml-1 px-2 py-0.5 rounded-lg bg-[#EBF5EE] text-[#2F7D4F] text-[10px] font-bold"
            >
              Today
            </button>
          )}
        </div>
      </div>

      {/* Hero Projected Salary Card */}
      <div className="p-6 rounded-[24px] bg-white border border-[#ECE7DF] warm-card relative overflow-hidden space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#7A746A]">
          Projected Salary · {monthName}
        </p>

        <div className="hero-num text-4xl sm:text-5xl font-black text-[#22201C] tnum tracking-tight">
          {formatINR(payrollData?.netSalary ?? (dailyWage * 30))}
        </div>

        <div className="pt-1 flex flex-col gap-0.5 text-xs text-[#7A746A]">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#2F7D4F]" />
            <span>Today's earning: <strong className="text-[#22201C]">₹{dailyWage}</strong></span>
          </div>
          <p className="text-[11px]">
            Daily rate: ₹{dailyWage}/day · {currentStaff?.pay_type === 'daily' ? 'Daily Wage Contract' : 'Monthly Salary Contract'}
          </p>
        </div>
      </div>

      {/* 3 Stat Tiles */}
      <div className="grid grid-cols-3 gap-2">
        {/* Paid leaves left */}
        <div className="p-3.5 rounded-[20px] bg-white border border-[#ECE7DF] warm-card text-center flex flex-col justify-between">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#7A746A]">Paid Leaves</p>
          <div className="font-heading text-lg font-bold text-[#4A7BB7] my-1 tnum">
            {payrollData?.paidLeavesLeft ?? 3} <span className="text-[10px] font-normal text-[#7A746A]">/ 3</span>
          </div>
          <p className="text-[10px] text-[#7A746A]">
            {payrollData?.paidLeavesUsed ?? 0} used
          </p>
        </div>

        {/* Late marks */}
        <div className="p-3.5 rounded-[20px] bg-white border border-[#ECE7DF] warm-card text-center flex flex-col justify-between">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#7A746A]">Late Marks</p>
          <div className="font-heading text-lg font-bold text-[#E8B44A] my-1 tnum">
            {payrollData?.lateDaysCount ?? 0} <span className="text-[10px] font-normal text-[#7A746A]">/ 3</span>
          </div>
          <p className="text-[10px] text-[#7A746A]">
            {(payrollData?.lateMarksLeftUntilDeduction ?? 3)} left till ½d
          </p>
        </div>

        {/* Breaks banked (4-dot progress bar!) */}
        <div className="p-3.5 rounded-[20px] bg-white border border-[#ECE7DF] warm-card text-center flex flex-col justify-between">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#7A746A]">Breaks Banked</p>
          <div className="flex items-center justify-center gap-1 my-1.5">
            {[0, 1, 2, 3].map((dotIdx) => {
              const remainder = payrollData ? (payrollData.breaksBanked % 4) : 0;
              const isFilled = dotIdx < remainder;
              return (
                <div
                  key={dotIdx}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${
                    isFilled ? 'bg-[#2F7D4F]' : 'bg-[#ECE7DF]'
                  }`}
                />
              );
            })}
          </div>
          <p className="text-[10px] text-[#2F7D4F] font-semibold">
            {payrollData?.breaksBanked ?? 0} of 4 (+1d)
          </p>
        </div>
      </div>

      {/* Attendance Calendar with Dots */}
      <div className="p-4 rounded-[24px] bg-white border border-[#ECE7DF] warm-card space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-heading text-sm font-bold text-[#22201C]">
              Attendance &amp; Schedule
            </h3>
            <p className="text-[11px] text-[#7A746A]">Tap any date to view or request leave</p>
          </div>
          <span className="text-xs text-[#7A746A] font-semibold">{monthName}</span>
        </div>

        {/* 7-column calendar grid */}
        <div className="grid grid-cols-7 gap-1 text-center">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
            <div key={i} className="text-[10px] font-bold text-[#7A746A] pb-1">
              {d}
            </div>
          ))}

          {calendarDays.map(({ dayNum, dateKey, record, isPending }) => {
            const status = record?.status;
            const isToday = dateKey === '2026-11-15';
            let dotStyle = 'bg-[#F6F2EA] text-[#7A746A] border-transparent';

            if (isPending) {
              dotStyle = 'bg-white text-[#4A7BB7] font-bold border-2 border-dashed border-[#4A7BB7]';
            } else if (status === 'present') {
              dotStyle = 'bg-[#EBF5EE] text-[#2F7D4F] font-bold border border-[#2F7D4F]/30';
            } else if (status === 'late') {
              dotStyle = 'bg-[#FCF5E3] text-[#E8B44A] font-bold border border-[#E8B44A]/30';
            } else if (status === 'paid_leave' || status === 'upcoming_leave') {
              dotStyle = 'bg-[#ECF2F9] text-[#4A7BB7] font-bold border border-[#4A7BB7]/30';
            } else if (status === 'unpaid_leave' || status === 'absent') {
              dotStyle = 'bg-[#FBECEA] text-[#D9534A] font-bold border border-[#D9534A]/30';
            } else if (status === 'half_day') {
              dotStyle = 'bg-[#F9ECE8] text-[#C0573E] font-bold border border-[#C0573E]/30';
            }

            return (
              <button
                key={dayNum}
                onClick={() => handleDateClick(dateKey, record)}
                className={`h-9 rounded-xl flex items-center justify-center text-xs transition-transform tap-bounce relative cursor-pointer ${dotStyle} ${
                  isToday ? 'ring-2 ring-[#2F7D4F] ring-offset-1' : ''
                }`}
                title={`Date: ${dateKey}`}
              >
                <span>{dayNum}</span>
                {record?.break_skipped === 1 && (
                  <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#2F7D4F]" />
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="pt-2 flex flex-wrap items-center justify-center gap-2 text-[10px] text-[#7A746A]">
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-md bg-[#EBF5EE] border border-[#2F7D4F]/30" />
            <span>Present</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-md bg-[#FCF5E3] border border-[#E8B44A]/30" />
            <span>Late</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-md bg-[#ECF2F9] border border-[#4A7BB7]/30" />
            <span>Paid Leave</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-md bg-white border-2 border-dashed border-[#4A7BB7]" />
            <span>Pending</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-md bg-[#FBECEA] border border-[#D9534A]/30" />
            <span>Absent</span>
          </div>
        </div>
      </div>

      {/* Clean Line Items Breakdown */}
      <div className="p-5 rounded-[24px] bg-white border border-[#ECE7DF] warm-card space-y-3">
        <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-[#7A746A]">
          Monthly Earnings Breakdown
        </h3>

        <div className="space-y-2 text-xs divide-y divide-[#ECE7DF]">
          <div className="flex items-center justify-between pt-1">
            <span className="text-[#7A746A]">Base Monthly Rate</span>
            <span className="font-bold text-[#22201C] tnum">
              {formatINR(payrollData?.baseSalary ?? (dailyWage * 30))}
            </span>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-[#7A746A]">Unpaid Absences ({payrollData?.totalUnpaidDays ?? 0}d)</span>
            <span className={`font-bold tnum ${(payrollData?.unpaidDaysDeductionAmount ?? 0) > 0 ? 'text-[#D9534A]' : 'text-[#7A746A]'}`}>
              {formatINRAmountSigned(payrollData?.unpaidDaysDeductionAmount ?? 0, 'deduction')}
            </span>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-[#7A746A]">Half-Day Deductions ({payrollData?.manualHalfDaysCount ?? 0}d)</span>
            <span className={`font-bold tnum ${(payrollData?.halfDaysDeductionAmount ?? 0) > 0 ? 'text-[#D9534A]' : 'text-[#7A746A]'}`}>
              {formatINRAmountSigned(payrollData?.halfDaysDeductionAmount ?? 0, 'deduction')}
            </span>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-[#7A746A]">Late Mark Penalties ({payrollData?.lateDaysCount ?? 0} marks)</span>
            <span className={`font-bold tnum ${(payrollData?.lateMarkDeductionAmount ?? 0) > 0 ? 'text-[#D9534A]' : 'text-[#7A746A]'}`}>
              {formatINRAmountSigned(payrollData?.lateMarkDeductionAmount ?? 0, 'deduction')}
            </span>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-[#7A746A]">Break Bonus ({payrollData?.breaksBanked ?? 0} banked)</span>
            <span className={`font-bold tnum ${(payrollData?.breakBonusAmount ?? 0) > 0 ? 'text-[#2F7D4F]' : 'text-[#7A746A]'}`}>
              {(payrollData?.breakBonusAmount ?? 0) > 0
                ? formatINRAmountSigned(payrollData!.breakBonusAmount, 'bonus')
                : '₹0'}
            </span>
          </div>

          <div className="flex items-center justify-between pt-3 border-t-2 border-[#22201C]">
            <span className="font-heading font-bold text-sm text-[#22201C]">Net Disbursable</span>
            <span className="font-heading font-bold text-lg text-[#2F7D4F] tnum">
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
