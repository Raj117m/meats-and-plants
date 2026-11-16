import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { PayrollMonthResponse, PayrollEmployee } from '../../types';
import { formatINR } from '../../utils/currency';
import { exportPayrollPDF } from '../../utils/pdfExport';
import { EmployeePayrollDetailModal } from './EmployeePayrollDetailModal';
import {
  Wallet,
  Download,
  Share2,
  Lock,
  Unlock,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Sparkles
} from 'lucide-react';

interface PayrollViewProps {
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  highlightEmployeeId?: number | null;
}

export const PayrollView: React.FC<PayrollViewProps> = ({
  selectedMonth,
  onMonthChange,
  highlightEmployeeId
}) => {
  const [data, setData] = useState<PayrollMonthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedEmp, setSelectedEmp] = useState<PayrollEmployee | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [copyTeamSuccess, setCopyTeamSuccess] = useState(false);

  const fetchPayroll = async () => {
    try {
      setLoading(true);
      const res = await api.getMonthPayroll(selectedMonth);
      setData(res);
    } catch (err) {
      console.error('Failed to load payroll:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayroll();
  }, [selectedMonth]);

  useEffect(() => {
    if (highlightEmployeeId) {
      const el = document.getElementById(`payroll-row-${highlightEmployeeId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [highlightEmployeeId, data]);

  const [yearStr, monthNumStr] = selectedMonth.split('-');
  const year = Number(yearStr);
  const monthNum = Number(monthNumStr);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const monthName = monthNames[monthNum - 1];

  const handlePrevMonth = () => {
    if (monthNum === 1) {
      onMonthChange(`${year - 1}-12`);
    } else {
      onMonthChange(`${year}-${String(monthNum - 1).padStart(2, '0')}`);
    }
  };

  const handleNextMonth = () => {
    if (monthNum === 12) {
      onMonthChange(`${year + 1}-01`);
    } else {
      onMonthChange(`${year}-${String(monthNum + 1).padStart(2, '0')}`);
    }
  };

  const handleFinalize = async () => {
    if (!confirm(`Finalize and lock payroll records for ${monthName} ${year}? This action cannot be reversed.`)) return;
    try {
      setFinalizing(true);
      await api.finalizePayroll(selectedMonth);
      await fetchPayroll();
    } catch (err: any) {
      alert(err.message || 'Failed to finalize');
    } finally {
      setFinalizing(false);
    }
  };

  const handleCopyTeamWhatsApp = () => {
    if (!data) return;
    const lines = [
      `🌿 *Meats & Plants — Payroll Summary (${monthName} ${year})*`,
      `📅 Period: ${selectedMonth} (${data.daysInMonth} days)`,
      `👥 Staff: 10 employees`,
      `💰 Total Net Disbursable: ${formatINR(data.totals.totalNet)}`,
      `---------------------------------`
    ];

    data.employees.forEach((emp) => {
      lines.push(`• *${emp.employeeName}*: ${formatINR(emp.netSalary)} (${emp.presentDays} days worked, ${emp.paidLeavesUsed} leaves)`);
    });

    lines.push(`---------------------------------`);
    lines.push(`Disbursements scheduled on 1st of next month.`);

    navigator.clipboard.writeText(lines.join('\n'));
    setCopyTeamSuccess(true);
    setTimeout(() => setCopyTeamSuccess(false), 2500);
  };

  if (loading && !data) {
    return <div className="p-8 text-center text-xs text-[#7A746A]">Calculating deterministic payroll...</div>;
  }

  const totals = data?.totals || {
    totalBase: 0,
    totalNet: 0,
    totalDeductions: 0,
    totalBonuses: 0,
    totalLateMarks: 0,
    totalPaidLeavesUsed: 0,
    totalUnpaidDays: 0
  };

  return (
    <div className="space-y-8">
      {/* Title & Top Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight text-[#22201C]">
              Payroll Ledger
            </h2>
            {data?.isFinalized ? (
              <span className="px-2.5 py-0.5 rounded-full bg-[#EAF5EE] text-[#23633E] border border-[#C6E7D1] text-[10px] font-bold flex items-center gap-1">
                <Lock size={10} /> Locked &amp; Disbursed
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full bg-[#FEF7E6] text-[#9A6A12] border border-[#FDE3A7] text-[10px] font-bold flex items-center gap-1">
                <Unlock size={10} /> Live Calculation
              </span>
            )}
          </div>
          <p className="text-xs text-[#7A746A] mt-0.5">
            Transparent salary disbursement for all 10 staff members
          </p>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Month Navigation */}
          <div className="flex items-center gap-1.5 bg-white p-1 rounded-2xl border border-[#ECE7DF] warm-card">
            <button onClick={handlePrevMonth} className="p-1 rounded-xl hover:bg-[#F6F2EA] text-[#7A746A] cursor-pointer">
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-bold text-[#22201C] px-1.5">
              {monthName} {year}
            </span>
            <button onClick={handleNextMonth} className="p-1 rounded-xl hover:bg-[#F6F2EA] text-[#7A746A] cursor-pointer">
              <ChevronRight size={16} />
            </button>
            {selectedMonth !== '2026-11' && (
              <button
                onClick={() => onMonthChange('2026-11')}
                className="ml-1 px-2 py-0.5 rounded-lg bg-[#EAF5EE] text-[#23633E] text-[10px] font-bold cursor-pointer"
              >
                This month
              </button>
            )}
          </div>

          <button
            onClick={handleCopyTeamWhatsApp}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#ECE7DF] text-xs font-semibold text-[#22201C] hover:bg-[#F6F2EA] transition-colors cursor-pointer"
          >
            {copyTeamSuccess ? <Check size={14} className="text-[#2F7D4F]" /> : <Share2 size={14} />}
            <span>{copyTeamSuccess ? 'Copied!' : 'WhatsApp'}</span>
          </button>

          <button
            onClick={() => data && exportPayrollPDF(data, 'Meats & Plants')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#22201C] text-white text-xs font-semibold hover:bg-[#33302A] shadow-xs cursor-pointer"
          >
            <Download size={14} />
            <span>Export PDF</span>
          </button>

          {!data?.isFinalized && (
            <button
              onClick={handleFinalize}
              disabled={finalizing}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#2F7D4F] text-white text-xs font-bold hover:bg-[#276842] shadow-xs cursor-pointer active:scale-95 transition-all"
            >
              <Lock size={14} />
              <span>{finalizing ? 'Locking...' : 'Finalize'}</span>
            </button>
          )}
        </div>
      </div>

      {/* 4 Summary Metric Tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white border border-[#ECE7DF] warm-card">
          <p className="text-xs font-semibold text-[#7A746A]">Total Base Salary</p>
          <p className="text-3xl font-extrabold text-[#22201C] mt-1 tabular-nums">
            {formatINR(totals.totalBase)}
          </p>
          <p className="text-[11px] text-[#7A746A] mt-0.5">10 active team members</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#ECE7DF] warm-card">
          <p className="text-xs font-semibold text-[#7A746A]">Total Deductions</p>
          <p className="text-3xl font-extrabold text-[#A8382B] mt-1 tabular-nums">
            -{formatINR(totals.totalDeductions)}
          </p>
          <p className="text-[11px] text-[#7A746A] mt-0.5">Unpaid + ½-days + lates</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#ECE7DF] warm-card">
          <p className="text-xs font-semibold text-[#7A746A]">Total Break Bonuses</p>
          <p className="text-3xl font-extrabold text-[#23633E] mt-1 tabular-nums">
            +{formatINR(totals.totalBonuses)}
          </p>
          <p className="text-[11px] text-[#7A746A] mt-0.5">Earned from 4-break bank tiers</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#EAF5EE] border border-[#C6E7D1] warm-card">
          <p className="text-xs font-semibold text-[#23633E]">Net Disbursable</p>
          <p className="text-3xl font-extrabold text-[#23633E] mt-1 tabular-nums">
            {formatINR(totals.totalNet)}
          </p>
          <p className="text-[11px] text-[#2F7D4F] mt-0.5">Payday in 6 days 💸</p>
        </div>
      </div>

      {/* Airy 56px Rows List Table */}
      <div className="bg-white rounded-2xl border border-[#ECE7DF] warm-card overflow-hidden">
        <div className="px-5 py-4 border-b border-[#ECE7DF] flex items-center justify-between">
          <h3 className="text-base font-bold text-[#22201C]">
            Disbursement List · {monthName}
          </h3>
          <span className="text-xs text-[#7A746A]">Tap any row to view full payslip breakdown</span>
        </div>

        <div className="divide-y divide-[#ECE7DF]/70">
          {data?.employees.map((emp) => {
            const isHighlighted = highlightEmployeeId === emp.employeeId;

            return (
              <div
                key={emp.employeeId}
                id={`payroll-row-${emp.employeeId}`}
                onClick={() => {
                  setSelectedEmp(emp);
                  setModalOpen(true);
                }}
                className={`px-5 py-3.5 min-h-[56px] flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors cursor-pointer group ${
                  isHighlighted
                    ? 'bg-[#EAF5EE]/60 border-l-4 border-l-[#2F7D4F]'
                    : 'hover:bg-[#F6F2EA]/50'
                }`}
              >
                {/* Left: Avatar + Name + Wage */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#F6F2EA] flex items-center justify-center font-bold text-xs text-[#22201C]">
                    {emp.employeeName[0]}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-[#22201C] group-hover:text-[#2F7D4F] transition-colors">
                      {emp.employeeName}
                    </div>
                    <div className="text-xs text-[#7A746A]">
                      ₹{emp.dailyWage}/day · {emp.payType === 'daily' ? 'Daily Wage' : 'Monthly'} ({emp.presentDays} days worked)
                    </div>
                  </div>
                </div>

                {/* Middle: Chips */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="px-2.5 py-0.5 rounded-full bg-[#EDF4FC] text-[#2A5A8F] border border-[#CDE0F7] font-semibold text-[11px]">
                    {emp.paidLeavesUsed} leaves used
                  </span>

                  {emp.lateDaysCount > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full bg-[#FEF7E6] text-[#9A6A12] border border-[#FDE3A7] font-semibold text-[11px]">
                      {emp.lateDaysCount} lates
                    </span>
                  )}

                  {emp.breaksBanked > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full bg-[#EAF5EE] text-[#23633E] border border-[#C6E7D1] font-semibold text-[11px]">
                      {emp.breaksBanked} breaks banked
                    </span>
                  )}

                  {emp.totalDeductions > 0 && (
                    <span className="text-[#A8382B] font-bold text-[11px] tabular-nums">
                      -{formatINR(emp.totalDeductions)}
                    </span>
                  )}
                </div>

                {/* Right: Net Pay */}
                <div className="text-right">
                  <div className="text-base font-bold text-[#23633E] tabular-nums">
                    {formatINR(emp.netSalary)}
                  </div>
                  <div className="text-[10px] text-[#7A746A]">Net payable</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <EmployeePayrollDetailModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        data={selectedEmp}
        month={selectedMonth}
      />
    </div>
  );
};
