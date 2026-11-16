import React, { useState } from 'react';
import { PayrollEmployee } from '../../types';
import { formatINR, formatINRAmountSigned } from '../../utils/currency';
import { X, Share2, Check, Download, ShieldCheck, Award, AlertCircle } from 'lucide-react';

interface EmployeePayrollDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: PayrollEmployee | null;
  month: string;
}

export const EmployeePayrollDetailModal: React.FC<EmployeePayrollDetailModalProps> = ({
  isOpen,
  onClose,
  data,
  month
}) => {
  if (!isOpen || !data) return null;

  const [copied, setCopied] = useState(false);

  const getWhatsAppText = () => {
    return (
      `*Meats & Plants — Payslip (${month})*\n` +
      `Employee: *${data.employeeName}*\n` +
      `--------------------------------\n` +
      `• Base Salary: ${formatINR(data.baseSalary)}\n` +
      `• Daily Rate: ${formatINR(data.dailyRate)} (30 days)\n` +
      `• Days Present: ${data.presentDays}\n` +
      `• Paid Leaves Used: ${data.paidLeavesUsed} (Left: ${data.paidLeavesLeft})\n` +
      (data.totalUnpaidDays > 0 ? `• Unpaid Absences: -${formatINR(data.unpaidDaysDeductionAmount)} (${data.totalUnpaidDays}d)\n` : '') +
      (data.manualHalfDaysCount > 0 ? `• Half-Day Deductions: -${formatINR(data.halfDaysDeductionAmount)} (${data.manualHalfDaysCount}d)\n` : '') +
      (data.lateMarkDeductionUnits > 0 ? `• Late Penalty (${data.lateDaysCount} marks): -${formatINR(data.lateMarkDeductionAmount)}\n` : '') +
      (data.breakBonusAmount > 0 ? `• Break Bonus (${data.breaksBanked} banked): +${formatINR(data.breakBonusAmount)}\n` : '') +
      `--------------------------------\n` +
      `• Total Deductions: -${formatINR(data.totalDeductions)}\n` +
      `*• Net Salary Payable: ${formatINR(data.netSalary)}*\n` +
      `\nMeats & Plants · Transparent Payroll`
    );
  };

  const handleCopyWhatsApp = () => {
    navigator.clipboard.writeText(getWhatsAppText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShareWhatsAppDirect = () => {
    const text = encodeURIComponent(getWhatsAppText());
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white rounded-3xl p-6 w-full max-w-lg soft-elevated-shadow border border-[#ECEAE5] animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#ECEAE5]">
          <div>
            <h3 className="text-lg font-bold text-[#1C1C1A]">{data.employeeName}</h3>
            <p className="text-xs text-[#6B6B66]">Payroll Breakdown · Cycle: {month}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[#F7F6F3] text-[#6B6B66] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Hero Net Card */}
        <div className="mt-4 p-5 rounded-2xl bg-[#F7F6F3] border border-[#ECEAE5] flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[#6B6B66] uppercase">Net Salary Disbursable</p>
            <p className="text-3xl font-extrabold text-[#2F7D4F] mt-1 tnum">
              {formatINR(data.netSalary)}
            </p>
            <p className="text-xs text-[#6B6B66] mt-0.5">
              Base: {formatINR(data.baseSalary)} · Daily: {formatINR(data.dailyRate)}/day
            </p>
          </div>
          <div className="text-right space-y-1">
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#E8F3EC] text-[#2F7D4F] block">
              30 Days Cycle
            </span>
            <span className="text-[11px] text-[#6B6B66] block">
              {data.presentDays} days worked
            </span>
          </div>
        </div>

        {/* Itemized Calculation List */}
        <div className="mt-4 space-y-2 text-xs divide-y divide-[#ECEAE5]">
          <div className="flex items-center justify-between pt-1">
            <span className="text-[#6B6B66]">Base Monthly Salary</span>
            <span className="font-bold text-[#1C1C1A] tnum">{formatINR(data.baseSalary)}</span>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div>
              <span className="text-[#6B6B66]">Unpaid Absences / Extra Leaves</span>
              <span className="ml-1 text-[11px] text-[#A0A09B]">({data.totalUnpaidDays} day{data.totalUnpaidDays === 1 ? '' : 's'})</span>
            </div>
            <span className={`font-bold tnum ${data.unpaidDaysDeductionAmount > 0 ? 'text-[#C8463D]' : 'text-[#6B6B66]'}`}>
              {formatINRAmountSigned(data.unpaidDaysDeductionAmount, 'deduction')}
            </span>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div>
              <span className="text-[#6B6B66]">Half-Day Deductions</span>
              <span className="ml-1 text-[11px] text-[#A0A09B]">({data.manualHalfDaysCount} day{data.manualHalfDaysCount === 1 ? '' : 's'})</span>
            </div>
            <span className={`font-bold tnum ${data.halfDaysDeductionAmount > 0 ? 'text-[#C8463D]' : 'text-[#6B6B66]'}`}>
              {formatINRAmountSigned(data.halfDaysDeductionAmount, 'deduction')}
            </span>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div>
              <span className="text-[#6B6B66]">Late Marks ({data.lateDaysCount} recorded)</span>
              <span className="ml-1 text-[11px] text-[#A0A09B]">({data.lateMarkDeductionUnits} unit deductions)</span>
            </div>
            <span className={`font-bold tnum ${data.lateMarkDeductionAmount > 0 ? 'text-[#C8463D]' : 'text-[#6B6B66]'}`}>
              {formatINRAmountSigned(data.lateMarkDeductionAmount, 'deduction')}
            </span>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div>
              <span className="text-[#6B6B66]">Break Bonus ({data.breaksBanked} banked)</span>
              {data.breaksBanked >= 4 && (
                <span className="ml-1 text-[11px] text-[#2F7D4F] font-semibold">(Tier Reached)</span>
              )}
            </div>
            <span className={`font-bold tnum ${data.breakBonusAmount > 0 ? 'text-[#2F7D4F]' : 'text-[#6B6B66]'}`}>
              {data.breakBonusAmount > 0
                ? formatINRAmountSigned(data.breakBonusAmount, 'bonus')
                : (data.breakBonusLeaves > 0 ? `+${data.breakBonusLeaves} Leave` : '₹0')}
            </span>
          </div>

          <div className="flex items-center justify-between pt-2 font-bold">
            <span className="text-[#C8463D]">Total Deductions</span>
            <span className="text-[#C8463D] tnum">-{formatINR(data.totalDeductions)}</span>
          </div>
        </div>

        {/* WhatsApp & Actions Footer */}
        <div className="mt-6 pt-4 border-t border-[#ECEAE5] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyWhatsApp}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#F7F6F3] text-xs font-semibold text-[#1C1C1A] hover:bg-[#ECEAE5] transition-colors"
            >
              {copied ? <Check size={14} className="text-[#2F7D4F]" /> : <Share2 size={14} />}
              <span>{copied ? 'Copied!' : 'Copy for WhatsApp'}</span>
            </button>

            <button
              onClick={handleShareWhatsAppDirect}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#25D366]/15 text-[#128C7E] text-xs font-semibold hover:bg-[#25D366]/25 transition-colors"
              title="Open WhatsApp Web or app"
            >
              <span>Share to WhatsApp</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#1C1C1A] text-white text-xs font-semibold hover:bg-[#2A2A28]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
