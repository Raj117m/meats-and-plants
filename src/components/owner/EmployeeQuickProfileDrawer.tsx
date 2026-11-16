import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { Employee, LeaveRequest } from '../../types';
import { formatINR } from '../../utils/currency';
import {
  X,
  Phone,
  Calendar,
  AlertCircle,
  Coffee,
  CheckCircle2,
  ExternalLink,
  Save,
  MessageCircle,
  ArrowRight
} from 'lucide-react';

interface EmployeeQuickProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
  selectedMonth: string;
  onNavigateToStaff: (employeeId: number) => void;
  onNavigateToPayroll: (employeeId: number) => void;
  onEmployeeUpdated: () => void;
}

export const EmployeeQuickProfileDrawer: React.FC<EmployeeQuickProfileDrawerProps> = ({
  isOpen,
  onClose,
  employee,
  selectedMonth,
  onNavigateToStaff,
  onNavigateToPayroll,
  onEmployeeUpdated
}) => {
  if (!isOpen || !employee) return null;

  // Editable pay contract state
  const [payType, setPayType] = useState<'monthly' | 'daily'>(employee.pay_type || 'monthly');
  const [dailyWage, setDailyWage] = useState<number>(employee.daily_wage || 600);
  const [monthlySalary, setMonthlySalary] = useState<number>(employee.monthly_salary || 18000);
  const [isSavingPay, setIsSavingPay] = useState(false);
  const [paySavedSuccess, setPaySavedSuccess] = useState(false);

  // Month payroll / attendance details for this employee
  const [netPay, setNetPay] = useState<number | null>(null);
  const [paidLeavesLeft, setPaidLeavesLeft] = useState<number>(3);
  const [lateMarks, setLateMarks] = useState<number>(0);
  const [pendingRequests, setPendingRequests] = useState<LeaveRequest[]>([]);
  const [availableBreaks, setAvailableBreaks] = useState<number>(employee.breakBank?.available ?? 0);

  useEffect(() => {
    setPayType(employee.pay_type || 'monthly');
    setDailyWage(employee.daily_wage || 600);
    setMonthlySalary(employee.monthly_salary || 18000);
    setAvailableBreaks(employee.breakBank?.available ?? 0);

    const loadProfileData = async () => {
      try {
        const payrollData = await api.getMonthPayroll(selectedMonth);
        const pEmp = payrollData.employees.find((e) => e.employeeId === employee.id);
        if (pEmp) {
          setNetPay(pEmp.netSalary);
          setPaidLeavesLeft(pEmp.paidLeavesLeft);
          setLateMarks(pEmp.lateDaysCount);
          if (pEmp.availableBreakBank !== undefined) {
            setAvailableBreaks(pEmp.availableBreakBank);
          }
        }

        const leaveReqs = await api.getLeaveRequests();
        const pending = leaveReqs.filter(
          (r) => r.employee_id === employee.id && r.status === 'pending'
        );
        setPendingRequests(pending);
      } catch (err) {
        console.error('Failed to load employee quick profile data:', err);
      }
    };

    loadProfileData();
  }, [employee.id, selectedMonth]);

  const handleSavePay = async () => {
    try {
      setIsSavingPay(true);
      await api.updateEmployee(employee.id, {
        pay_type: payType,
        daily_wage: Number(dailyWage),
        monthly_salary: payType === 'daily' ? Number(dailyWage) * 30 : Number(monthlySalary)
      });
      setPaySavedSuccess(true);
      setTimeout(() => setPaySavedSuccess(false), 2000);
      onEmployeeUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to update pay contract');
    } finally {
      setIsSavingPay(false);
    }
  };

  const handleRedeemBreak = async (type: 'pay' | 'leave') => {
    try {
      await api.redeemBreak(employee.id, type, selectedMonth);
      setAvailableBreaks((prev) => Math.max(0, prev - 4));
      onEmployeeUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to redeem break bonus');
    }
  };

  const handleReviewLeave = async (reqId: number, status: 'approved' | 'denied') => {
    try {
      await api.reviewLeaveRequest(reqId, status);
      setPendingRequests((prev) => prev.filter((r) => r.id !== reqId));
      onEmployeeUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to review leave');
    }
  };

  const canRedeem = availableBreaks >= 4;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-md h-full p-6 shadow-2xl flex flex-col justify-between border-l border-[#ECE7DF] overflow-y-auto animate-in slide-in-from-right duration-200">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between pb-3 border-b border-[#ECE7DF]">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-base shrink-0 shadow-xs"
                style={{ backgroundColor: employee.avatar_color || '#2F7D4F' }}
              >
                {employee.name[0]}
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#22201C] leading-snug">
                  {employee.name}
                </h3>
                <p className="text-xs text-[#7A746A]">
                  {employee.role} · {employee.phone}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1 rounded-full text-[#7A746A] hover:bg-[#F6F2EA] cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Projected Net Pay */}
            <div className="p-3.5 rounded-2xl bg-[#EAF5EE] border border-[#C6E7D1] space-y-0.5">
              <span className="text-[10px] font-bold text-[#23633E] uppercase tracking-wide">
                This Month Net
              </span>
              <div className="text-xl font-extrabold text-[#23633E] tabular-nums">
                {netPay !== null ? formatINR(netPay) : '...'}
              </div>
              <p className="text-[10px] text-[#2F7D4F]">Calculated take-home</p>
            </div>

            {/* Paid Leaves Left */}
            <div className="p-3.5 rounded-2xl bg-[#EDF4FC] border border-[#CDE0F7] space-y-0.5">
              <span className="text-[10px] font-bold text-[#2A5A8F] uppercase tracking-wide">
                Paid Leaves
              </span>
              <div className="text-xl font-extrabold text-[#2A5A8F] tabular-nums">
                {paidLeavesLeft} of 3
              </div>
              <p className="text-[10px] text-[#4A7BB7]">Leaves remaining</p>
            </div>

            {/* Late Marks */}
            <div className="p-3.5 rounded-2xl bg-[#FEF7E6] border border-[#FDE3A7] space-y-0.5">
              <span className="text-[10px] font-bold text-[#9A6A12] uppercase tracking-wide">
                Late Marks
              </span>
              <div className="text-xl font-extrabold text-[#9A6A12] tabular-nums">
                {lateMarks} of 3
              </div>
              <p className="text-[10px] text-[#E8B44A]">
                {lateMarks >= 3 ? '½ day deduction applied' : `${3 - (lateMarks % 3)} marks till deduction`}
              </p>
            </div>

            {/* Break Bank */}
            <div className="p-3.5 rounded-2xl bg-[#F6F2EA] border border-[#ECE7DF] space-y-0.5">
              <span className="text-[10px] font-bold text-[#7A746A] uppercase tracking-wide">
                Break Bank
              </span>
              <div className="text-sm font-extrabold text-[#22201C] tabular-nums font-mono">
                {'●'.repeat(Math.min(4, availableBreaks))}
                {'○'.repeat(Math.max(0, 4 - availableBreaks))}
              </div>
              <p className="text-[10px] text-[#7A746A]">
                {availableBreaks} of 4 banked
              </p>
            </div>
          </div>

          {/* Break Bank Redemption Action (when ready) */}
          {canRedeem && (
            <div className="p-4 rounded-2xl bg-[#EAF5EE] border border-[#C6E7D1] space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#23633E] flex items-center gap-1.5">
                  <Coffee size={14} /> 4 Banked Breaks Ready!
                </span>
                <span className="text-[10px] font-bold text-[#2F7D4F] uppercase">Redeem</span>
              </div>
              <p className="text-[11px] text-[#2F7D4F] leading-tight">
                Employee skipped 4 breaks. Choose an immediate reward:
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => handleRedeemBreak('pay')}
                  className="py-2 px-3 rounded-xl bg-[#2F7D4F] hover:bg-[#276842] text-white text-xs font-bold shadow-xs transition-all cursor-pointer active:scale-95"
                >
                  +1 Day Pay
                </button>
                <button
                  onClick={() => handleRedeemBreak('leave')}
                  className="py-2 px-3 rounded-xl bg-[#4A7BB7] hover:bg-[#3E6FA8] text-white text-xs font-bold shadow-xs transition-all cursor-pointer active:scale-95"
                >
                  +1 Paid Leave
                </button>
              </div>
            </div>
          )}

          {/* Editable Pay Contract */}
          <div className="p-4 rounded-2xl bg-white border border-[#ECE7DF] space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#22201C]">Pay Contract &amp; Wage Rate</span>
              <div className="flex bg-[#F6F2EA] p-0.5 rounded-lg border border-[#ECE7DF]">
                <button
                  type="button"
                  onClick={() => setPayType('daily')}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                    payType === 'daily' ? 'bg-[#2F7D4F] text-white' : 'text-[#7A746A]'
                  }`}
                >
                  Daily Wage
                </button>
                <button
                  type="button"
                  onClick={() => setPayType('monthly')}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                    payType === 'monthly' ? 'bg-[#2F7D4F] text-white' : 'text-[#7A746A]'
                  }`}
                >
                  Monthly Salary
                </button>
              </div>
            </div>

            {payType === 'daily' ? (
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <label className="text-[10px] text-[#7A746A] block mb-0.5 font-semibold">
                    Rate per day (₹)
                  </label>
                  <input
                    type="number"
                    value={dailyWage}
                    onChange={(e) => setDailyWage(Number(e.target.value))}
                    step="25"
                    className="w-full px-3 py-1.5 rounded-xl bg-[#F6F2EA] border border-[#ECE7DF] text-xs font-bold text-[#22201C]"
                  />
                </div>
                <button
                  onClick={handleSavePay}
                  disabled={isSavingPay}
                  className="mt-4 px-3 py-1.5 rounded-xl bg-[#2F7D4F] text-white text-xs font-bold hover:bg-[#276842] flex items-center gap-1 cursor-pointer"
                >
                  <Save size={13} />
                  <span>{isSavingPay ? '...' : paySavedSuccess ? 'Saved!' : 'Save'}</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <label className="text-[10px] text-[#7A746A] block mb-0.5 font-semibold">
                    Monthly Base (₹)
                  </label>
                  <input
                    type="number"
                    value={monthlySalary}
                    onChange={(e) => setMonthlySalary(Number(e.target.value))}
                    step="500"
                    className="w-full px-3 py-1.5 rounded-xl bg-[#F6F2EA] border border-[#ECE7DF] text-xs font-bold text-[#22201C]"
                  />
                </div>
                <button
                  onClick={handleSavePay}
                  disabled={isSavingPay}
                  className="mt-4 px-3 py-1.5 rounded-xl bg-[#2F7D4F] text-white text-xs font-bold hover:bg-[#276842] flex items-center gap-1 cursor-pointer"
                >
                  <Save size={13} />
                  <span>{isSavingPay ? '...' : paySavedSuccess ? 'Saved!' : 'Save'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Pending Leave Requests if any */}
          {pendingRequests.length > 0 && (
            <div className="p-4 rounded-2xl bg-[#FEF7E6] border border-[#FDE3A7] space-y-2.5">
              <span className="text-xs font-bold text-[#9A6A12] flex items-center gap-1">
                <AlertCircle size={14} />
                {pendingRequests.length} Pending Leave Request{pendingRequests.length > 1 ? 's' : ''}
              </span>

              {pendingRequests.map((req) => (
                <div
                  key={req.id}
                  className="p-3 bg-white rounded-xl border border-[#FDE3A7] space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between font-bold text-[#22201C]">
                    <span>{req.start_date} ({req.is_paid ? 'Paid' : 'Unpaid'})</span>
                    <span className="text-[#9A6A12]">{req.days_count} day</span>
                  </div>
                  {req.reason && <p className="text-[11px] text-[#7A746A] italic">"{req.reason}"</p>}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => handleReviewLeave(req.id, 'approved')}
                      className="px-2.5 py-1 rounded-lg bg-[#2F7D4F] text-white text-[11px] font-bold cursor-pointer"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleReviewLeave(req.id, 'denied')}
                      className="px-2.5 py-1 rounded-lg bg-[#FDF0ED] text-[#A8382B] border border-[#F8D0C8] text-[11px] font-bold cursor-pointer"
                    >
                      Deny
                    </button>
                    <a
                      href={`https://wa.me/91${employee.phone}?text=${encodeURIComponent(
                        `Hi ${employee.name.split(' ')[0]}, about your leave on ${req.start_date}...`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto text-[11px] font-semibold text-[#128C7E] flex items-center gap-1 hover:underline"
                    >
                      <MessageCircle size={12} />
                      <span>WhatsApp</span>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom Navigation Links to Staff and Payroll */}
        <div className="pt-4 border-t border-[#ECE7DF] space-y-2">
          <button
            onClick={() => {
              onClose();
              onNavigateToStaff(employee.id);
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-[#F6F2EA] hover:bg-[#EBE6DC] text-[#22201C] text-xs font-bold flex items-center justify-between transition-colors cursor-pointer"
          >
            <span>Open in Staff &amp; Wages</span>
            <ArrowRight size={14} className="text-[#7A746A]" />
          </button>

          <button
            onClick={() => {
              onClose();
              onNavigateToPayroll(employee.id);
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-[#EAF5EE] hover:bg-[#DFEFE5] text-[#23633E] text-xs font-bold flex items-center justify-between transition-colors cursor-pointer"
          >
            <span>Open in Payroll Ledger</span>
            <ArrowRight size={14} className="text-[#2F7D4F]" />
          </button>
        </div>
      </div>
    </div>
  );
};
