import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api';
import { PayrollEmployee, DayRecord } from '../../types';
import { formatINR, formatINRAmountSigned } from '../../utils/currency';
import {
  Calendar as CalendarIcon,
  HelpCircle,
  TrendingUp,
  Award,
  AlertCircle,
  Coffee,
  CheckCircle2,
  Clock
} from 'lucide-react';

export const MyPayTab: React.FC = () => {
  const { currentUser } = useAuth();
  const [payrollData, setPayrollData] = useState<PayrollEmployee | null>(null);
  const [daysMap, setDaysMap] = useState<Record<string, DayRecord>>({});
  const [loading, setLoading] = useState(true);

  const fetchPayData = async () => {
    if (!currentUser?.id) return;
    try {
      setLoading(true);
      const [payRes, attRes] = await Promise.all([
        api.getMonthPayroll('2026-11'),
        api.getMonthAttendance('2026-11')
      ]);

      const myPay = payRes.employees.find((e) => e.employeeId === currentUser.id);
      if (myPay) setPayrollData(myPay);
      if (attRes?.dayMap) setDaysMap(attRes.dayMap);
    } catch (err) {
      console.error('Failed to load my pay data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayData();
  }, [currentUser?.id]);

  if (loading || !payrollData) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-[#6B6B66] text-sm">
        <Clock className="animate-spin mr-2" size={18} />
        Loading your transparency ledger...
      </div>
    );
  }

  // Generate 30 days for November mini-calendar
  const daysInNov = 30;
  const calendarDays = Array.from({ length: daysInNov }, (_, i) => {
    const dayNum = i + 1;
    const dateStr = `2026-11-${String(dayNum).padStart(2, '0')}`;
    const dayRecord = daysMap[`${currentUser?.id}_${dateStr}`];
    return {
      dayNum,
      dateStr,
      record: dayRecord
    };
  });

  return (
    <div className="max-w-md mx-auto px-4 py-4 sm:py-6 space-y-4">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#1C1C1A]">My Pay Ledger</h2>
          <p className="text-xs text-[#6B6B66]">Cycle: November 2026 · 100% Transparent</p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#E8F3EC] text-[#2F7D4F]">
          Active Month
        </span>
      </div>

      {/* Hero Card: Projected Salary */}
      <div className="p-6 rounded-3xl bg-[#F7F6F3] border border-[#ECEAE5] soft-card-shadow relative overflow-hidden">
        <div className="relative z-10">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#6B6B66]">
            Projected Salary This Month
          </p>
          <div className="text-4xl sm:text-5xl font-black tracking-tight text-[#1C1C1A] mt-2 tnum">
            {formatINR(payrollData.netSalary)}
          </div>
          <div className="flex items-center gap-2 mt-2 text-xs text-[#6B6B66]">
            <span>Base: <strong className="text-[#1C1C1A]">{formatINR(payrollData.baseSalary)}</strong></span>
            <span>·</span>
            <span>Daily: <strong className="text-[#1C1C1A]">{formatINR(payrollData.dailyRate)}/day</strong></span>
          </div>
        </div>
      </div>

      {/* 3 Small Stat Tiles */}
      <div className="grid grid-cols-3 gap-2.5">
        {/* Paid leaves left */}
        <div className="p-3.5 rounded-2xl bg-white border border-[#ECEAE5] soft-card-shadow text-center flex flex-col justify-between">
          <p className="text-[11px] font-semibold text-[#6B6B66]">Paid Leaves</p>
          <div className="text-xl font-bold text-[#3E6FA8] my-1 tnum">
            {payrollData.paidLeavesLeft} <span className="text-xs font-normal text-[#6B6B66]">/ 3 left</span>
          </div>
          <p className="text-[10px] text-[#A0A09B]">{payrollData.paidLeavesUsed} used</p>
        </div>

        {/* Late marks */}
        <div className="p-3.5 rounded-2xl bg-white border border-[#ECEAE5] soft-card-shadow text-center flex flex-col justify-between">
          <p className="text-[11px] font-semibold text-[#6B6B66]">Late Marks</p>
          <div className="text-xl font-bold text-[#D99A2B] my-1 tnum">
            {payrollData.lateDaysCount} <span className="text-xs font-normal text-[#6B6B66]">/ 3</span>
          </div>
          <p className="text-[10px] text-[#A0A09B]">
            {payrollData.lateMarksLeftUntilDeduction} left till ½-day ded.
          </p>
        </div>

        {/* Breaks banked (4-dot progress bar!) */}
        <div className="p-3.5 rounded-2xl bg-white border border-[#ECEAE5] soft-card-shadow text-center flex flex-col justify-between">
          <p className="text-[11px] font-semibold text-[#6B6B66]">Breaks Banked</p>
          <div className="flex items-center justify-center gap-1.5 my-2">
            {[0, 1, 2, 3].map((dotIdx) => {
              const isFilled = dotIdx < (payrollData.bankedBreaksRemainder || (payrollData.breaksBanked % 4));
              return (
                <div
                  key={dotIdx}
                  className={`w-3 h-3 rounded-full transition-all ${
                    isFilled ? 'bg-[#2F7D4F]' : 'bg-[#ECEAE5] border border-[#D4D2CD]'
                  }`}
                />
              );
            })}
          </div>
          <p className="text-[10px] text-[#2F7D4F] font-semibold">
            {payrollData.breaksBanked} of 4 (+1 day bonus)
          </p>
        </div>
      </div>

      {/* Clean Line Items Ledger */}
      <div className="p-5 rounded-3xl bg-white border border-[#ECEAE5] soft-card-shadow space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#6B6B66]">
          Calculation Line Items
        </h3>

        <div className="space-y-2.5 text-xs divide-y divide-[#ECEAE5]/60">
          {/* Base */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-[#6B6B66]">Base Monthly Salary</span>
            <span className="font-semibold text-[#1C1C1A] tnum">{formatINR(payrollData.baseSalary)}</span>
          </div>

          {/* Unpaid leaves */}
          <div className="flex items-center justify-between pt-2">
            <div>
              <span className="text-[#6B6B66]">Unpaid Absences / Extra Leaves</span>
              {payrollData.totalUnpaidDays > 0 && (
                <span className="ml-1 text-[11px] text-[#A0A09B]">({payrollData.totalUnpaidDays} day)</span>
              )}
            </div>
            <span className={`font-semibold tnum ${payrollData.unpaidDaysDeductionAmount > 0 ? 'text-[#C8463D]' : 'text-[#6B6B66]'}`}>
              {formatINRAmountSigned(payrollData.unpaidDaysDeductionAmount, 'deduction')}
            </span>
          </div>

          {/* Half-day deductions */}
          <div className="flex items-center justify-between pt-2">
            <div>
              <span className="text-[#6B6B66]">Half-Day Deductions</span>
              {payrollData.manualHalfDaysCount > 0 && (
                <span className="ml-1 text-[11px] text-[#A0A09B]">({payrollData.manualHalfDaysCount} day)</span>
              )}
            </div>
            <span className={`font-semibold tnum ${payrollData.halfDaysDeductionAmount > 0 ? 'text-[#C8463D]' : 'text-[#6B6B66]'}`}>
              {formatINRAmountSigned(payrollData.halfDaysDeductionAmount, 'deduction')}
            </span>
          </div>

          {/* Late mark deductions */}
          <div className="flex items-center justify-between pt-2">
            <div>
              <span className="text-[#6B6B66]">Late Mark Penalties (3 marks = ½ day)</span>
              {payrollData.lateMarkDeductionUnits > 0 && (
                <span className="ml-1 text-[11px] text-[#A0A09B]">({payrollData.lateMarkDeductionUnits} unit)</span>
              )}
            </div>
            <span className={`font-semibold tnum ${payrollData.lateMarkDeductionAmount > 0 ? 'text-[#C8463D]' : 'text-[#6B6B66]'}`}>
              {formatINRAmountSigned(payrollData.lateMarkDeductionAmount, 'deduction')}
            </span>
          </div>

          {/* Break bonus */}
          <div className="flex items-center justify-between pt-2">
            <div>
              <span className="text-[#6B6B66]">Break Bonus (4 skipped breaks)</span>
              {payrollData.breaksBanked >= 4 && (
                <span className="ml-1 text-[11px] text-[#2F7D4F] font-semibold">(Achieved!)</span>
              )}
            </div>
            <span className={`font-semibold tnum ${payrollData.breakBonusAmount > 0 ? 'text-[#2F7D4F]' : 'text-[#6B6B66]'}`}>
              {payrollData.breakBonusAmount > 0
                ? formatINRAmountSigned(payrollData.breakBonusAmount, 'bonus')
                : (payrollData.breakBonusLeaves > 0 ? `+${payrollData.breakBonusLeaves} Leave` : '₹0')}
            </span>
          </div>

          {/* Net */}
          <div className="flex items-center justify-between pt-3 border-t-2 border-[#1C1C1A]">
            <span className="font-bold text-sm text-[#1C1C1A]">Net Disbursable</span>
            <span className="font-extrabold text-base text-[#2F7D4F] tnum">
              {formatINR(payrollData.netSalary)}
            </span>
          </div>
        </div>
      </div>

      {/* Mini Month Calendar with Colored Dots */}
      <div className="p-4 rounded-3xl bg-white border border-[#ECEAE5] soft-card-shadow space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#6B6B66]">
            Monthly Attendance Dots
          </h3>
          <span className="text-[11px] text-[#6B6B66]">Nov 2026</span>
        </div>

        {/* 7-column calendar grid */}
        <div className="grid grid-cols-7 gap-1.5 text-center">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
            <div key={i} className="text-[10px] font-semibold text-[#A0A09B] pb-1">
              {d}
            </div>
          ))}

          {calendarDays.map(({ dayNum, record }) => {
            const status = record?.status;
            let dotBg = 'bg-[#ECEAE5] text-[#6B6B66]'; // default empty/future
            let label = 'No shift';

            if (status === 'present') {
              dotBg = 'bg-[#E8F3EC] text-[#2F7D4F] font-bold border border-[#2F7D4F]/30';
              label = 'Present';
            } else if (status === 'late') {
              dotBg = 'bg-[#FBF3E2] text-[#D99A2B] font-bold border border-[#D99A2B]/30';
              label = 'Late';
            } else if (status === 'paid_leave' || status === 'upcoming_leave') {
              dotBg = 'bg-[#E7EEF7] text-[#3E6FA8] font-bold border border-[#3E6FA8]/30';
              label = 'Paid Leave';
            } else if (status === 'unpaid_leave' || status === 'absent') {
              dotBg = 'bg-[#FBE9E7] text-[#C8463D] font-bold border border-[#C8463D]/30';
              label = 'Absent';
            } else if (status === 'half_day') {
              dotBg = 'bg-[#FBE9E7] text-[#B5523B] font-bold border border-[#B5523B]/30';
              label = 'Half-day';
            }

            return (
              <div
                key={dayNum}
                className={`h-8 rounded-xl flex items-center justify-center text-xs transition-transform hover:scale-110 cursor-pointer ${dotBg}`}
                title={`Nov ${dayNum}: ${label} ${record?.notes ? `(${record.notes})` : ''}`}
              >
                {dayNum}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="pt-2 flex flex-wrap items-center justify-center gap-2.5 text-[10px] text-[#6B6B66]">
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2F7D4F]" />
            <span>Present</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#D99A2B]" />
            <span>Late</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#3E6FA8]" />
            <span>Paid Leave</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#C8463D]" />
            <span>Absent</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#B5523B]" />
            <span>Half-day</span>
          </div>
        </div>
      </div>
    </div>
  );
};
