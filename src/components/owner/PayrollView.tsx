import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { PayrollMonthResponse, PayrollEmployee } from '../../types';
import { formatINR } from '../../utils/currency';
import { exportPayrollPDF } from '../../utils/pdfExport';
import { EmployeePayrollDetailModal } from './EmployeePayrollDetailModal';
import {
  Download,
  Share2,
  Lock,
  Unlock,
  Check,
  ChevronLeft,
  ChevronRight
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
    if (highlightEmployeeId && data?.employees) {
      const emp = data.employees.find((e) => e.employeeId === highlightEmployeeId);
      if (emp) {
        setSelectedEmp(emp);
        setModalOpen(true);
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
    if (!confirm(`Finalize and lock payroll ledger for ${monthName} ${year}? This action cannot be reversed.`)) return;
    try {
      setFinalizing(true);
      await api.finalizePayroll(selectedMonth);
      await fetchPayroll();
    } catch (err: any) {
      alert(err.message || 'Failed to finalize payroll');
    } finally {
      setFinalizing(false);
    }
  };

  const handleCopyTeamWhatsApp = () => {
    if (!data) return;
    const summary = data.summary || {
      totalGross: data.totals?.totalGross || data.totals?.totalBase || 0,
      totalDeductions: data.totals?.totalDeductions || 0,
      totalBonus: data.totals?.totalBonus || 0,
      totalNet: data.totals?.totalNet || 0
    };

    const lines = [
      `*Meats & Plants — Payroll Statement (${monthName} ${year})*`,
      `📅 Period: ${selectedMonth} (${data.daysInMonth} days)`,
      `👥 Staff: 10 employees`,
      `💰 Total Gross: ${formatINR(summary.totalGross)}`,
      `🔻 Total Deductions: -${formatINR(summary.totalDeductions)}`,
      `🎁 Total Bonus: +${formatINR(summary.totalBonus)}`,
      `*💵 Total Net Disbursable: ${formatINR(summary.totalNet)}*`,
      `---------------------------------`
    ];

    data.employees.forEach((emp) => {
      lines.push(`• *${emp.employeeName}*: ${formatINR(emp.netSalary || emp.netPay)} (${emp.presentDays}d present, ${emp.paidLeavesUsed}d paid leave, ${emp.holidaysCount || 0}d holiday, ${emp.unpaidDays || 0}d unpaid)`);
    });

    lines.push(`---------------------------------`);
    lines.push(`Disbursements scheduled on 1st of next month.`);

    navigator.clipboard.writeText(lines.join('\n'));
    setCopyTeamSuccess(true);
    setTimeout(() => setCopyTeamSuccess(false), 2500);
  };

  if (loading && !data) {
    return (
      <div className="p-12 text-center text-xs text-[#6E6E6A]">
        Calculating payroll accounting statement...
      </div>
    );
  }

  const summary = data?.summary || {
    totalGross: data?.totals?.totalGross || data?.totals?.totalBase || 0,
    totalDeductions: data?.totals?.totalDeductions || 0,
    totalBonus: data?.totals?.totalBonus || 0,
    totalNet: data?.totals?.totalNet || 0
  };

  const employees = data?.employees || [];

  return (
    <div className="space-y-6">
      {/* 1. Header: ‹ Nov 2026 ›, Status badge (Draft/Finalized), Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight text-[#0A0A0A]">
              Payroll
            </h2>

            {data?.isFinalized ? (
              <span className="px-2.5 py-0.5 rounded-full bg-[#FFFFFF] text-[#2E7D4F] border border-[#2E7D4F] text-[10px] font-semibold flex items-center gap-1">
                <Lock size={10} /> Finalized
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full bg-[#FFFFFF] text-[#B7791F] border border-[#B7791F] text-[10px] font-semibold flex items-center gap-1">
                <Unlock size={10} /> Draft
              </span>
            )}
          </div>
          <p className="text-xs text-[#6E6E6A] mt-0.5">
            Transparent monthly disbursements for Meats &amp; Plants team
          </p>
        </div>

        {/* Header Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Month Picker: ‹ Nov 2026 › */}
          <div className="flex items-center gap-1.5 bg-[#FFFFFF] p-1 rounded-xl border border-[#E6E6E2]">
            <button
              onClick={handlePrevMonth}
              className="p-1 rounded-lg hover:bg-[#F2F2EF] text-[#6E6E6A] hover:text-[#0A0A0A] transition-colors cursor-pointer"
              title="Previous month"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-semibold text-[#0A0A0A] px-1.5 tabular-nums">
              {monthName.slice(0, 3)} {year}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1 rounded-lg hover:bg-[#F2F2EF] text-[#6E6E6A] hover:text-[#0A0A0A] transition-colors cursor-pointer"
              title="Next month"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Copy for WhatsApp */}
          <button
            onClick={handleCopyTeamWhatsApp}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#FFFFFF] border border-[#E6E6E2] text-xs font-medium text-[#0A0A0A] hover:bg-[#F2F2EF] transition-colors cursor-pointer"
          >
            {copyTeamSuccess ? <Check size={14} className="text-[#2E7D4F]" /> : <Share2 size={14} />}
            <span>{copyTeamSuccess ? 'Copied' : 'Copy for WhatsApp'}</span>
          </button>

          {/* Export PDF */}
          <button
            onClick={() => data && exportPayrollPDF(data, 'Meats & Plants')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#FFFFFF] border border-[#E6E6E2] text-xs font-medium text-[#0A0A0A] hover:bg-[#F2F2EF] transition-colors cursor-pointer"
          >
            <Download size={14} />
            <span>Export PDF</span>
          </button>

          {/* Finalize Button */}
          {!data?.isFinalized && (
            <button
              onClick={handleFinalize}
              disabled={finalizing}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0A0A0A] text-white text-xs font-medium hover:bg-[#222222] transition-colors cursor-pointer disabled:opacity-50"
            >
              <Lock size={13} />
              <span>{finalizing ? 'Locking...' : 'Finalize'}</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Summary Strip: Total gross · Total deductions · Total bonus · Total net payable */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-[#FFFFFF] border border-[#E6E6E2]">
          <span className="section-label">Total Gross</span>
          <p className="text-2xl font-bold text-[#0A0A0A] mt-1 tabular-nums">
            {formatINR(summary.totalGross)}
          </p>
          <p className="text-[11px] text-[#6E6E6A] mt-0.5">10 employees</p>
        </div>

        <div className="p-4 rounded-xl bg-[#FFFFFF] border border-[#E6E6E2]">
          <span className="section-label">Total Deductions</span>
          <p className="text-2xl font-bold text-[#B42318] mt-1 tabular-nums">
            -{formatINR(summary.totalDeductions)}
          </p>
          <p className="text-[11px] text-[#6E6E6A] mt-0.5">Unpaid + Half days</p>
        </div>

        <div className="p-4 rounded-xl bg-[#FFFFFF] border border-[#E6E6E2]">
          <span className="section-label">Total Bonus</span>
          <p className="text-2xl font-bold text-[#2E7D4F] mt-1 tabular-nums">
            +{formatINR(summary.totalBonus)}
          </p>
          <p className="text-[11px] text-[#6E6E6A] mt-0.5">Banked break bonus</p>
        </div>

        <div className="p-4 rounded-xl bg-[#F2F2EF] border border-[#E6E6E2]">
          <span className="section-label">Total Net Payable</span>
          <p className="text-2xl font-bold text-[#0A0A0A] mt-1 tabular-nums">
            {formatINR(summary.totalNet)}
          </p>
          <p className="text-[11px] text-[#6E6E6A] mt-0.5">Disbursement ledger</p>
        </div>
      </div>

      {/* 3. Main Table — Clean Accounting Statement */}
      <div className="rounded-xl border border-[#E6E6E2] bg-[#FFFFFF] overflow-hidden shadow-2xs">
        <div className="px-5 py-3.5 border-b border-[#E6E6E2] flex items-center justify-between">
          <span className="section-label">Employee Payroll Ledger</span>
          <span className="text-[11px] text-[#6E6E6A]">Click any row to open full payslip drawer</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              {/* Grouped Header Row */}
              <tr className="border-b border-[#E6E6E2] bg-[#FAFAF8] text-[10px] font-semibold text-[#6E6E6A] uppercase tracking-wider">
                <th colSpan={3} className="py-2 px-4 border-r border-[#E6E6E2]">
                  Staff Details
                </th>
                <th colSpan={5} className="py-2 px-4 text-center border-r border-[#E6E6E2]">
                  Attendance (Days)
                </th>
                <th colSpan={3} className="py-2 px-4 text-right">
                  Compensation (₹)
                </th>
              </tr>

              {/* Column Header Row */}
              <tr className="border-b border-[#E6E6E2] bg-[#FAFAF8] text-[11px] font-semibold text-[#6E6E6A]">
                <th className="py-2.5 px-4 font-semibold text-[#0A0A0A]">Employee</th>
                <th className="py-2.5 px-3 text-right">Rate (₹/day)</th>
                <th className="py-2.5 px-3 text-right border-r border-[#E6E6E2]">Working days</th>

                {/* Attendance Group */}
                <th className="py-2.5 px-3 text-right">Present</th>
                <th className="py-2.5 px-3 text-right">Paid leave</th>
                <th className="py-2.5 px-3 text-right">Holidays</th>
                <th className="py-2.5 px-3 text-right">Unpaid</th>
                <th className="py-2.5 px-3 text-right border-r border-[#E6E6E2]">Half days</th>

                {/* Pay Group */}
                <th className="py-2.5 px-3 text-right">Gross</th>
                <th className="py-2.5 px-3 text-right">Deductions</th>
                <th className="py-2.5 px-4 text-right font-bold text-[#0A0A0A]">Net pay</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#E6E6E2]">
              {employees.map((emp) => {
                return (
                  <tr
                    key={emp.employeeId}
                    onClick={() => {
                      setSelectedEmp(emp);
                      setModalOpen(true);
                    }}
                    className="hover:bg-[#FAFAF8] transition-colors cursor-pointer group"
                  >
                    {/* Employee */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-[#0A0A0A] group-hover:text-[#B0235F] transition-colors">
                        {emp.employeeName}
                      </div>
                      <div className="text-[10px] text-[#6E6E6A]">
                        {emp.role}
                      </div>
                    </td>

                    {/* Rate */}
                    <td className="py-3 px-3 text-right tabular-nums text-[#0A0A0A]">
                      {emp.dailyWage}
                    </td>

                    {/* Working days */}
                    <td className="py-3 px-3 text-right tabular-nums text-[#6E6E6A] border-r border-[#E6E6E2]">
                      {emp.workingDays || data?.daysInMonth || 30}
                    </td>

                    {/* Present */}
                    <td className="py-3 px-3 text-right tabular-nums font-medium text-[#2E7D4F]">
                      {emp.presentDays}
                    </td>

                    {/* Paid leave */}
                    <td className="py-3 px-3 text-right tabular-nums text-[#3B5BA9]">
                      {emp.paidLeavesUsed}
                    </td>

                    {/* Holidays */}
                    <td className="py-3 px-3 text-right tabular-nums text-[#0A0A0A]">
                      {emp.holidaysCount || 0}
                    </td>

                    {/* Unpaid */}
                    <td className="py-3 px-3 text-right tabular-nums text-[#B42318]">
                      {emp.unpaidDays || emp.totalUnpaidDays || 0}
                    </td>

                    {/* Half days */}
                    <td className="py-3 px-3 text-right tabular-nums text-[#B7791F] border-r border-[#E6E6E2]">
                      {emp.halfDaysCount || emp.manualHalfDaysCount || 0}
                    </td>

                    {/* Gross */}
                    <td className="py-3 px-3 text-right tabular-nums text-[#0A0A0A]">
                      {formatINR(emp.grossPay || emp.baseSalary)}
                    </td>

                    {/* Deductions */}
                    <td className="py-3 px-3 text-right tabular-nums text-[#B42318]">
                      {emp.totalDeductions > 0 ? `-${formatINR(emp.totalDeductions)}` : '₹0'}
                    </td>

                    {/* Net pay */}
                    <td className="py-3 px-4 text-right tabular-nums font-bold text-[#0A0A0A]">
                      {formatINR(emp.netSalary || emp.netPay)}
                    </td>
                  </tr>
                );
              })}

              {/* Bold Totals Row matching summary strip */}
              <tr className="bg-[#F2F2EF] font-bold text-xs border-t-2 border-[#E6E6E2]">
                <td className="py-3.5 px-4 text-[#0A0A0A]">
                  TOTALS
                </td>
                <td className="py-3.5 px-3 text-right text-[#6E6E6A]">—</td>
                <td className="py-3.5 px-3 text-right text-[#6E6E6A] border-r border-[#E6E6E2]">—</td>

                <td className="py-3.5 px-3 text-right tabular-nums text-[#2E7D4F]">
                  {data?.totals?.totalPresentDays ?? employees.reduce((acc, e) => acc + e.presentDays, 0)}
                </td>
                <td className="py-3.5 px-3 text-right tabular-nums text-[#3B5BA9]">
                  {data?.totals?.totalPaidLeavesUsed ?? employees.reduce((acc, e) => acc + e.paidLeavesUsed, 0)}
                </td>
                <td className="py-3.5 px-3 text-right tabular-nums text-[#0A0A0A]">
                  {data?.totals?.totalHolidays ?? employees.reduce((acc, e) => acc + (e.holidaysCount || 0), 0)}
                </td>
                <td className="py-3.5 px-3 text-right tabular-nums text-[#B42318]">
                  {data?.totals?.totalUnpaidDays ?? employees.reduce((acc, e) => acc + (e.unpaidDays || e.totalUnpaidDays || 0), 0)}
                </td>
                <td className="py-3.5 px-3 text-right tabular-nums text-[#B7791F] border-r border-[#E6E6E2]">
                  {data?.totals?.totalHalfDays ?? employees.reduce((acc, e) => acc + (e.halfDaysCount || e.manualHalfDaysCount || 0), 0)}
                </td>

                <td className="py-3.5 px-3 text-right tabular-nums text-[#0A0A0A]">
                  {formatINR(summary.totalGross)}
                </td>
                <td className="py-3.5 px-3 text-right tabular-nums text-[#B42318]">
                  -{formatINR(summary.totalDeductions)}
                </td>
                <td className="py-3.5 px-4 text-right tabular-nums text-sm font-extrabold text-[#0A0A0A]">
                  {formatINR(summary.totalNet)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Payslip Drawer Modal */}
      <EmployeePayrollDetailModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        data={selectedEmp}
        month={selectedMonth}
      />
    </div>
  );
};
