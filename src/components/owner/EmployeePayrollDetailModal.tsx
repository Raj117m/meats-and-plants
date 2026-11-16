import React, { useState } from 'react';
import { PayrollEmployee } from '../../types';
import { formatINR } from '../../utils/currency';
import { exportSinglePayslipPDF } from '../../utils/pdfExport';
import { X, Share2, Check, Download } from 'lucide-react';

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
      `Employee: *${data.employeeName}* (${data.role})\n` +
      `Rate: ₹${data.dailyWage}/day · ${data.workingDays || 30} working days\n` +
      `--------------------------------\n` +
      `*1. EARNINGS:*\n` +
      `• Present: ${data.presentDays} days = ₹${data.presentDays * data.dailyWage}\n` +
      `• Paid Leaves: ${data.paidLeavesUsed} days = ₹${data.paidLeavesUsed * data.dailyWage}\n` +
      `• Gazetted Holidays: ${data.holidaysCount || 0} days = ₹${(data.holidaysCount || 0) * data.dailyWage}\n` +
      (data.bonusHolidaysEarned ? `• Bonus Holiday: +1 day = ₹${data.dailyWage}\n` : '') +
      `*Gross Total: ${formatINR(data.grossPay || data.baseSalary)}*\n` +
      `--------------------------------\n` +
      `*2. DEDUCTIONS:*\n` +
      (data.unpaidDays > 0 ? `• Unpaid leaves (4th onward): -₹${data.unpaidDaysDeductionAmount || data.unpaidDays * data.dailyWage} (${data.unpaidDays}d)\n` : '') +
      (data.halfDaysCount > 0 ? `• Half Day (Late check-in past 15m): -₹${data.halfDaysDeductionAmount || data.halfDaysCount * (data.dailyWage / 2)} (${data.halfDaysCount}d)\n` : '') +
      `*Total Deductions: -${formatINR(data.totalDeductions)}*\n` +
      `--------------------------------\n` +
      `*NET PAYABLE: ${formatINR(data.netSalary || data.netPay)}*\n` +
      `\nMeats & Plants Café · Sparta Building`
    );
  };

  const handleCopyWhatsApp = () => {
    navigator.clipboard.writeText(getWhatsAppText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-[#FFFFFF] rounded-2xl p-6 w-full max-w-lg border border-[#E6E6E2] shadow-xl animate-scale-in space-y-5">
        {/* Header: Meats & Plants, employee name, role, month */}
        <div className="flex items-start justify-between pb-3 border-b border-[#E6E6E2]">
          <div>
            <span className="section-label">Meats &amp; Plants Payslip</span>
            <h3 className="text-xl font-bold text-[#0A0A0A] mt-0.5">{data.employeeName}</h3>
            <p className="text-xs text-[#6E6E6A]">{data.role} · Pay Period: {month}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[#F2F2EF] text-[#6E6E6A] hover:text-[#0A0A0A] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Hero Net Card */}
        <div className="p-4 rounded-xl bg-[#F2F2EF] border border-[#E6E6E2] flex items-center justify-between">
          <div>
            <span className="section-label">Net Salary Payable</span>
            <p className="text-3xl font-bold text-[#0A0A0A] mt-0.5 tabular-nums">
              {formatINR(data.netSalary || data.netPay)}
            </p>
            <p className="text-xs text-[#6E6E6A] mt-0.5">
              Daily Rate: ₹{data.dailyWage}/day · {data.workingDays || 30} working days
            </p>
          </div>
          <div className="text-right space-y-1">
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-[#FFFFFF] border border-[#E6E6E2] text-[#0A0A0A] block">
              {data.presentDays} days worked
            </span>
            <span className="text-[10px] text-[#6E6E6A] block">
              {data.paidLeavesUsed} leaves / {data.holidaysCount || 0} holidays
            </span>
          </div>
        </div>

        {/* Section 1: Earnings */}
        <div className="space-y-2">
          <div className="flex items-center justify-between pb-1 border-b border-[#E6E6E2]">
            <span className="text-xs font-bold text-[#0A0A0A] uppercase tracking-wider">
              1. Earnings
            </span>
            <span className="text-xs font-bold text-[#0A0A0A] tabular-nums">
              {formatINR(data.grossPay || data.baseSalary)}
            </span>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-[#6E6E6A]">
              <span>Present days ({data.presentDays} × ₹{data.dailyWage})</span>
              <span className="text-[#0A0A0A] font-medium tabular-nums">
                {formatINR(data.presentDays * data.dailyWage)}
              </span>
            </div>

            <div className="flex items-center justify-between text-[#6E6E6A]">
              <span>Paid leaves ({data.paidLeavesUsed} × ₹{data.dailyWage})</span>
              <span className="text-[#0A0A0A] font-medium tabular-nums">
                {formatINR(data.paidLeavesUsed * data.dailyWage)}
              </span>
            </div>

            <div className="flex items-center justify-between text-[#6E6E6A]">
              <span>Gazetted holidays ({data.holidaysCount || 0} × ₹{data.dailyWage})</span>
              <span className="text-[#0A0A0A] font-medium tabular-nums">
                {formatINR((data.holidaysCount || 0) * data.dailyWage)}
              </span>
            </div>

            {(data.bonusHolidaysEarned || 0) > 0 && (
              <div className="flex items-center justify-between text-[#6E6E6A]">
                <span>Break bonus holiday ({data.bonusHolidaysEarned} × ₹{data.dailyWage})</span>
                <span className="text-[#2E7D4F] font-medium tabular-nums">
                  +{formatINR((data.bonusHolidaysEarned || 0) * data.dailyWage)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Section 2: Deductions */}
        <div className="space-y-2">
          <div className="flex items-center justify-between pb-1 border-b border-[#E6E6E2]">
            <span className="text-xs font-bold text-[#0A0A0A] uppercase tracking-wider">
              2. Deductions
            </span>
            <span className="text-xs font-bold text-[#B42318] tabular-nums">
              -{formatINR(data.totalDeductions)}
            </span>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-[#6E6E6A]">
              <span>Unpaid leaves (4th leave onward: {data.unpaidDays || data.totalUnpaidDays || 0}d)</span>
              <span className="text-[#B42318] font-medium tabular-nums">
                -₹{data.unpaidDaysDeductionAmount || (data.unpaidDays || 0) * data.dailyWage}
              </span>
            </div>

            <div className="flex items-center justify-between text-[#6E6E6A]">
              <span>Half Day late check-in ({data.halfDaysCount || data.manualHalfDaysCount || 0}d past 15m grace)</span>
              <span className="text-[#B42318] font-medium tabular-nums">
                -₹{data.halfDaysDeductionAmount || (data.halfDaysCount || 0) * (data.dailyWage / 2)}
              </span>
            </div>
          </div>
        </div>

        {/* Net Pay Bar at Bottom */}
        <div className="p-3 rounded-xl bg-[#FAFAF8] border border-[#E6E6E2] flex items-center justify-between">
          <span className="text-xs font-bold text-[#0A0A0A]">NET PAYABLE</span>
          <span className="text-base font-bold text-[#0A0A0A] tabular-nums">
            {formatINR(data.netSalary || data.netPay)}
          </span>
        </div>

        {/* Two Buttons: Copy text (for WhatsApp) and Download PDF */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={handleCopyWhatsApp}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-[#E6E6E2] bg-[#FFFFFF] hover:bg-[#F2F2EF] text-[#0A0A0A] text-xs font-medium transition-colors cursor-pointer"
          >
            {copied ? <Check size={14} className="text-[#2E7D4F]" /> : <Share2 size={14} />}
            <span>{copied ? 'Copied to Clipboard' : 'Copy for WhatsApp'}</span>
          </button>

          <button
            onClick={() => exportSinglePayslipPDF(data, month)}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-[#0A0A0A] hover:bg-[#222222] text-[#FFFFFF] text-xs font-medium transition-colors cursor-pointer"
          >
            <Download size={14} />
            <span>Download PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
};
