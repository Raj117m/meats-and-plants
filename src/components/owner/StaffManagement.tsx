import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { Employee, LeaveRequest } from '../../types';
import { formatINR } from '../../utils/currency';
import { formatTime12, formatDuration } from '../../utils/time';
import {
  Users,
  Plus,
  Edit2,
  Check,
  X,
  Phone,
  Search,
  Sparkles,
  MessageCircle,
  Coffee,
  CheckCircle2,
  RotateCcw,
  Calendar,
  Download,
  Clock,
  MapPin
} from 'lucide-react';

interface StaffManagementProps {
  employees: Employee[];
  onStaffChanged: () => void;
  highlightEmployeeId?: number | null;
}

export const StaffManagement: React.FC<StaffManagementProps> = ({
  employees,
  onStaffChanged,
  highlightEmployeeId
}) => {
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [editPayType, setEditPayType] = useState<'monthly' | 'daily'>('monthly');
  const [editDailyWage, setEditDailyWage] = useState<number>(600);
  const [editMonthlySalary, setEditMonthlySalary] = useState<number>(18000);
  const [editRole, setEditRole] = useState<string>('');
  const [editName, setEditName] = useState<string>('');
  const [editPhone, setEditPhone] = useState<string>('');
  const [editPin, setEditPin] = useState<string>('1234');
  const [editActive, setEditActive] = useState<number>(1);

  // Add staff modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState('Server');
  const [newPayType, setNewPayType] = useState<'monthly' | 'daily'>('monthly');
  const [newDailyWage, setNewDailyWage] = useState(600);
  const [newMonthlySalary, setNewMonthlySalary] = useState(18000);

  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [todayRosterMap, setTodayRosterMap] = useState<Record<number, any>>({});
  const [exportingCsv, setExportingCsv] = useState(false);

  // Undo toast state
  const [undoToast, setUndoToast] = useState<{
    visible: boolean;
    message: string;
    employeeId: number;
    redemptionId: number;
  } | null>(null);

  // Drawer for reviewing leave request from Staff page
  const [activeLeaveDrawer, setActiveLeaveDrawer] = useState<{
    employee: Employee;
    request: LeaveRequest;
  } | null>(null);

  const loadTodayRoster = async () => {
    try {
      const res = await api.getTodayRoster('2026-11-15');
      const map: Record<number, any> = {};
      for (const r of res.roster) {
        map[r.id] = r;
      }
      setTodayRosterMap(map);
    } catch (err) {
      console.error('Failed to load roster on staff page:', err);
    }
  };

  useEffect(() => {
    loadTodayRoster();
    const interval = setInterval(loadTodayRoster, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleExportCsv = async (period: 'today' | 'month') => {
    try {
      setExportingCsv(true);
      if (period === 'today') {
        api.downloadAttendanceCsv('2026-11-15');
      } else {
        api.downloadAttendanceCsv(undefined, '2026-11');
      }
    } catch (err: any) {
      alert(`Failed to export CSV: ${err.message}`);
    } finally {
      setTimeout(() => setExportingCsv(false), 1000);
    }
  };

  useEffect(() => {
    if (highlightEmployeeId) {
      const el = document.getElementById(`staff-card-${highlightEmployeeId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [highlightEmployeeId]);

  const startEdit = (emp: Employee) => {
    setEditingEmp(emp);
    setEditName(emp.name);
    setEditPhone(emp.phone);
    setEditRole(emp.role);
    setEditPin(emp.pin);
    setEditPayType(emp.pay_type || 'monthly');
    setEditDailyWage(emp.daily_wage || Math.round(emp.monthly_salary / 30));
    setEditMonthlySalary(emp.monthly_salary || 18000);
    setEditActive(emp.is_active);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmp) return;
    try {
      setSaving(true);
      await api.updateEmployee(editingEmp.id, {
        name: editName,
        phone: editPhone,
        role: editRole,
        pin: editPin,
        pay_type: editPayType,
        daily_wage: Number(editDailyWage),
        monthly_salary: editPayType === 'daily' ? Number(editDailyWage) * 30 : Number(editMonthlySalary),
        is_active: editActive
      });
      setEditingEmp(null);
      onStaffChanged();
    } catch (err: any) {
      alert(err.message || 'Failed to update employee');
    } finally {
      setSaving(false);
    }
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.createEmployee({
        name: newName,
        phone: newPhone,
        pin: '1234',
        role: newRole,
        pay_type: newPayType,
        daily_wage: Number(newDailyWage),
        monthly_salary: newPayType === 'daily' ? Number(newDailyWage) * 30 : Number(newMonthlySalary),
        joining_date: new Date().toISOString().split('T')[0],
        bonus_preference: 'pay',
        avatar_color: '#2F7D4F'
      });
      setAddModalOpen(false);
      setNewName('');
      setNewPhone('');
      onStaffChanged();
    } catch (err: any) {
      alert(err.message || 'Failed to create employee');
    } finally {
      setSaving(false);
    }
  };

  // Redeem break bonus: +1 Day Pay or +1 Paid Leave
  const handleRedeemBreak = async (emp: Employee, type: 'pay' | 'leave') => {
    try {
      const res = await api.redeemBreak(emp.id, type);
      setUndoToast({
        visible: true,
        message: res.message,
        employeeId: emp.id,
        redemptionId: res.redemptionId
      });
      onStaffChanged();
    } catch (err: any) {
      alert(err.message || 'Failed to redeem break bonus');
    }
  };

  const handleUndoRedemption = async () => {
    if (!undoToast) return;
    try {
      await api.undoBreakRedemption(undoToast.employeeId, undoToast.redemptionId);
      setUndoToast(null);
      onStaffChanged();
    } catch (err: any) {
      alert(err.message || 'Failed to undo redemption');
    }
  };

  // Review leave request from Staff page drawer
  const handleReviewLeave = async (status: 'approved' | 'denied') => {
    if (!activeLeaveDrawer) return;
    try {
      await api.reviewLeaveRequest(activeLeaveDrawer.request.id, status);
      setActiveLeaveDrawer(null);
      onStaffChanged();
    } catch (err: any) {
      alert(err.message || 'Action failed');
    }
  };

  const filtered = employees.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Undo Toast */}
      {undoToast && undoToast.visible && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#22201C] text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 size={16} className="text-[#2F7D4F]" />
          <span className="text-xs font-semibold">{undoToast.message}</span>
          <button
            onClick={handleUndoRedemption}
            className="flex items-center gap-1 text-xs font-bold text-[#E8B44A] hover:underline cursor-pointer ml-2"
          >
            <RotateCcw size={12} />
            <span>Undo</span>
          </button>
          <button
            onClick={() => setUndoToast(null)}
            className="p-1 hover:bg-[#33302A] rounded-full text-[#A8A298]"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Title & Add Staff */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#22201C]">
            Staff &amp; Wages
          </h2>
          <p className="text-xs text-[#7A746A] mt-0.5">
            {employees.length} team members · Real-time break bank redemptions &amp; wage contracts
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7A746A]" />
            <input
              type="text"
              placeholder="Search staff..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-xl bg-white border border-[#ECE7DF] text-xs focus:outline-none focus:border-[#2F7D4F]"
            />
          </div>

          {/* Export Attendance CSV */}
          <button
            onClick={() => handleExportCsv('today')}
            disabled={exportingCsv}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#ECE7DF] text-xs font-bold text-[#22201C] hover:bg-[#F6F2EA] shadow-2xs cursor-pointer active:scale-95 transition-all"
            title="Download complete attendance and timings CSV for today (all staff)"
          >
            <Download size={14} className="text-[#2F7D4F]" />
            <span>{exportingCsv ? 'Exporting...' : 'Export Attendance CSV'}</span>
          </button>

          <button
            onClick={() => handleExportCsv('month')}
            disabled={exportingCsv}
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#ECE7DF] text-xs font-semibold text-[#7A746A] hover:text-[#22201C] hover:bg-[#F6F2EA] shadow-2xs cursor-pointer active:scale-95 transition-all"
            title="Download full month attendance and payroll CSV for November 2026"
          >
            <Calendar size={13} />
            <span>Month CSV</span>
          </button>

          <button
            onClick={() => setAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#2F7D4F] text-white text-xs font-bold hover:bg-[#276842] shadow-xs cursor-pointer active:scale-95 transition-all"
          >
            <Plus size={15} />
            <span>Add Staff Member</span>
          </button>
        </div>
      </div>

      {/* Staff Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((emp) => {
          const daily = emp.daily_wage || Math.round(emp.monthly_salary / 30);
          const monthly = emp.pay_type === 'daily' ? daily * 30 : emp.monthly_salary;
          const availableBreaks = emp.breakBank?.available ?? 0;
          const neededBreaks = emp.breakBank?.needed ?? 4;
          const canRedeem = availableBreaks >= neededBreaks;
          const pendingLeaves = emp.pendingLeaves || [];
          const isHighlighted = highlightEmployeeId === emp.id;

          const todayItem = todayRosterMap[emp.id];
          const checkInPunch = todayItem?.punches?.find((p: any) => p.type === 'check_in');
          const checkOutPunch = todayItem?.punches?.find((p: any) => p.type === 'check_out');
          const breakStartPunch = todayItem?.punches ? [...todayItem.punches].reverse().find((p: any) => p.type === 'start_break') : null;
          const breakEndPunch = todayItem?.punches ? [...todayItem.punches].reverse().find((p: any) => p.type === 'end_break') : null;

          return (
            <div
              key={emp.id}
              id={`staff-card-${emp.id}`}
              className={`p-5 rounded-2xl bg-white border transition-all ${
                isHighlighted
                  ? 'border-[#2F7D4F] ring-2 ring-[#2F7D4F]/20 shadow-md'
                  : 'border-[#ECE7DF] warm-card-interactive'
              } flex flex-col justify-between gap-3.5`}
            >
              {/* Top Row: Avatar + Name + Status + Edit */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-xs"
                    style={{ backgroundColor: emp.avatar_color || '#2F7D4F' }}
                  >
                    {emp.name[0]}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-[#22201C]">
                        {emp.name}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          emp.is_active === 1
                            ? 'bg-[#EAF5EE] text-[#23633E] border border-[#C6E7D1]'
                            : 'bg-[#FDF0ED] text-[#A8382B] border border-[#F8D0C8]'
                        }`}
                      >
                        {emp.is_active === 1 ? 'Active' : 'Inactive'}
                      </span>

                      {/* Pending Leave Requests Butter Chip */}
                      {pendingLeaves.length > 0 && (
                        <button
                          onClick={() => setActiveLeaveDrawer({ employee: emp, request: pendingLeaves[0] })}
                          className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FEF7E6] text-[#9A6A12] border border-[#FDE3A7] hover:bg-[#FDEBBF] flex items-center gap-1 cursor-pointer transition-colors"
                          title="Click to view leave request details"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-[#E8B44A]" />
                          <span>
                            {pendingLeaves.length} pending · {pendingLeaves[0].start_date.substring(5)} ({pendingLeaves[0].is_paid ? 'paid' : 'unpaid'})
                          </span>
                        </button>
                      )}
                    </div>

                    <p className="text-xs text-[#7A746A]">{emp.role}</p>

                    {/* Dual Wage Display ("₹600/day · ≈ ₹18,000/month") */}
                    <div className="pt-0.5 flex items-center gap-1.5 text-xs flex-wrap">
                      <span className="font-bold text-[#22201C] tabular-nums">
                        ₹{daily}/day
                      </span>
                      <span className="text-[#7A746A]">·</span>
                      <span className="text-[#7A746A] text-[11px] tabular-nums">
                        ≈ {formatINR(monthly)}/month
                      </span>
                      <span className="px-1.5 py-0.5 rounded-md bg-[#F6F2EA] text-[#7A746A] text-[9px] uppercase font-semibold">
                        {emp.pay_type === 'daily' ? 'Daily Wage' : 'Monthly'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Edit button */}
                <button
                  onClick={() => startEdit(emp)}
                  className="p-2 rounded-xl text-[#7A746A] hover:text-[#22201C] hover:bg-[#F6F2EA] transition-colors cursor-pointer"
                  title="Edit staff details"
                >
                  <Edit2 size={15} />
                </button>
              </div>

              {/* Today's Shift Attendance Log Strip */}
              <div className="pt-2 border-t border-[#ECE7DF] flex flex-col gap-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[#7A746A] uppercase tracking-wider flex items-center gap-1">
                    <Clock size={11} className="text-[#2F7D4F]" />
                    <span>Today's Shift Log (15 Nov)</span>
                  </span>
                  {todayItem ? (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                        todayItem.status === 'on_floor'
                          ? 'bg-[#EAF5EE] text-[#23633E] border border-[#C6E7D1]'
                          : todayItem.status === 'on_break'
                          ? 'bg-[#FEF7E6] text-[#9A6A12] border border-[#FDE3A7]'
                          : todayItem.status === 'checked_out'
                          ? 'bg-[#EDF4FC] text-[#2A5A8F] border border-[#CDE0F7]'
                          : todayItem.status === 'on_leave'
                          ? 'bg-[#EDF4FC] text-[#2A5A8F] border border-[#CDE0F7]'
                          : 'bg-[#F6F2EA] text-[#7A746A] border border-[#ECE7DF]'
                      }`}
                    >
                      {todayItem.status === 'on_floor' && <span className="w-1.5 h-1.5 rounded-full bg-[#2F7D4F] pulse-dot-green" />}
                      {todayItem.status === 'on_break' && <Coffee size={10} className="text-[#E8B44A]" />}
                      {todayItem.status === 'checked_out' && <CheckCircle2 size={10} className="text-[#3E6FA8]" />}
                      <span>
                        {todayItem.status === 'on_floor'
                          ? 'On Floor'
                          : todayItem.status === 'on_break'
                          ? 'On 3-hr Break'
                          : todayItem.status === 'checked_out'
                          ? 'Shift Completed'
                          : todayItem.status === 'on_leave'
                          ? 'On Leave'
                          : 'Not In Yet'}
                      </span>
                    </span>
                  ) : (
                    <span className="text-[10px] text-[#7A746A]">No log</span>
                  )}
                </div>

                <div className="flex items-center justify-between text-[11px] text-[#22201C] bg-[#FAF9F5] px-2.5 py-1.5 rounded-xl border border-[#ECE7DF]">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <div>
                      <span className="text-[#7A746A]">In: </span>
                      <strong className="font-semibold tabular-nums">
                        {todayItem?.checkInTime ? formatTime12(todayItem.checkInTime) : '—'}
                      </strong>
                      {checkInPunch?.distance_m != null && (
                        <span className="text-[10px] text-[#7A746A] ml-1">
                          (📍 {Math.round(checkInPunch.distance_m)}m)
                        </span>
                      )}
                    </div>

                    {breakStartPunch && (
                      <div>
                        <span className="text-[#7A746A]">Break: </span>
                        <strong className="font-semibold tabular-nums">
                          {formatTime12(breakStartPunch.timestamp)}
                          {breakEndPunch ? ` → ${formatTime12(breakEndPunch.timestamp)}` : ' (active)'}
                        </strong>
                      </div>
                    )}

                    <div>
                      <span className="text-[#7A746A]">Out: </span>
                      <strong className="font-semibold tabular-nums">
                        {todayItem?.checkOutTime ? formatTime12(todayItem.checkOutTime) : '—'}
                      </strong>
                      {checkOutPunch?.distance_m != null && (
                        <span className="text-[10px] text-[#7A746A] ml-1">
                          (📍 {Math.round(checkOutPunch.distance_m)}m)
                        </span>
                      )}
                    </div>
                  </div>

                  {todayItem?.checkInTime && (
                    <div className="font-bold text-[#2F7D4F] tabular-nums shrink-0 ml-1.5 text-[11px]">
                      {todayItem.status === 'checked_out' ? 'Total: ' : 'Live: '}
                      {formatDuration(todayItem.workedSeconds)}
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Row: Break Bank Pill & Immediate Redemption */}
              <div className="pt-2 border-t border-[#ECE7DF] flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <div
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                      canRedeem
                        ? 'bg-[#EAF5EE] text-[#23633E] border-[#C6E7D1]'
                        : 'bg-[#F6F2EA] text-[#7A746A] border-[#ECE7DF]'
                    }`}
                  >
                    {/* 4 dots progress visual: ●●●○ */}
                    <span className="font-mono text-xs tracking-tight">
                      {'●'.repeat(Math.min(4, availableBreaks))}
                      {'○'.repeat(Math.max(0, 4 - availableBreaks))}
                    </span>
                    <span className="text-[11px]">
                      {availableBreaks} of {neededBreaks} banked
                    </span>
                  </div>

                  {availableBreaks > 4 && (
                    <span className="text-[10px] text-[#7A746A]">
                      ({availableBreaks - 4} will carry over)
                    </span>
                  )}
                </div>

                {/* Inline redemption buttons when 4 banked */}
                {canRedeem && (
                  <div className="flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-150">
                    <button
                      onClick={() => handleRedeemBreak(emp, 'pay')}
                      className="px-2.5 py-1 rounded-lg bg-[#2F7D4F] hover:bg-[#276842] text-white text-[11px] font-bold transition-all cursor-pointer shadow-xs active:scale-95"
                      title="Apply +1 Day Pay bonus to this month's payroll"
                    >
                      +1 Day Pay
                    </button>
                    <button
                      onClick={() => handleRedeemBreak(emp, 'leave')}
                      className="px-2.5 py-1 rounded-lg bg-[#4A7BB7] hover:bg-[#3E6FA8] text-white text-[11px] font-bold transition-all cursor-pointer shadow-xs active:scale-95"
                      title="Award +1 extra paid leave"
                    >
                      +1 Paid Leave
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Leave Approval Side Drawer (Staff Page) */}
      {activeLeaveDrawer && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-sm h-full p-6 shadow-2xl flex flex-col justify-between border-l border-[#ECE7DF] animate-in slide-in-from-right duration-200">
            <div className="space-y-5">
              <div className="flex items-start justify-between pb-3 border-b border-[#ECE7DF]">
                <div>
                  <h3 className="text-lg font-bold text-[#22201C]">
                    Leave Request
                  </h3>
                  <p className="text-xs text-[#7A746A]">
                    {activeLeaveDrawer.employee.name} · {activeLeaveDrawer.employee.role}
                  </p>
                </div>
                <button
                  onClick={() => setActiveLeaveDrawer(null)}
                  className="p-1 rounded-full text-[#7A746A] hover:bg-[#F6F2EA] cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Request Info Card */}
              <div className="p-4 rounded-2xl bg-[#F6F2EA] space-y-3 border border-[#ECE7DF] text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#7A746A]">Requested Dates:</span>
                  <span className="font-bold text-[#22201C] flex items-center gap-1">
                    <Calendar size={13} className="text-[#2F7D4F]" />
                    {activeLeaveDrawer.request.start_date}
                    {activeLeaveDrawer.request.end_date !== activeLeaveDrawer.request.start_date && (
                      ` → ${activeLeaveDrawer.request.end_date}`
                    )}
                    {' '}({activeLeaveDrawer.request.days_count} {activeLeaveDrawer.request.days_count === 1 ? 'day' : 'days'})
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#7A746A]">Leave Type:</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      activeLeaveDrawer.request.is_paid
                        ? 'bg-[#EDF4FC] text-[#2A5A8F] border border-[#CDE0F7]'
                        : 'bg-[#FDF0ED] text-[#A8382B] border border-[#F8D0C8]'
                    }`}
                  >
                    {activeLeaveDrawer.request.is_paid ? 'Paid Leave' : 'Unpaid Leave'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#7A746A]">Paid Leaves Left:</span>
                  <span className="font-bold text-[#22201C]">
                    2 of 3 remaining
                  </span>
                </div>

                <div className="pt-2 border-t border-[#ECE7DF]">
                  <span className="text-[#7A746A] block mb-1">Reason:</span>
                  <p className="text-[#22201C] italic bg-white p-2.5 rounded-xl border border-[#ECE7DF]">
                    "{activeLeaveDrawer.request.reason || 'No reason provided'}"
                  </p>
                </div>
              </div>
            </div>

            {/* Actions: Approve / Deny + WhatsApp Message Button */}
            <div className="space-y-2.5 pt-4 border-t border-[#ECE7DF]">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleReviewLeave('approved')}
                  className="py-2.5 rounded-xl bg-[#2F7D4F] hover:bg-[#276842] text-white text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
                >
                  Approve Leave
                </button>
                <button
                  onClick={() => handleReviewLeave('denied')}
                  className="py-2.5 rounded-xl bg-[#FDF0ED] hover:bg-[#FBE9E7] text-[#A8382B] border border-[#F8D0C8] text-xs font-bold transition-all cursor-pointer"
                >
                  Deny
                </button>
              </div>

              {/* WhatsApp message link */}
              <a
                href={`https://wa.me/91${activeLeaveDrawer.employee.phone}?text=${encodeURIComponent(
                  `Hi ${activeLeaveDrawer.employee.name.split(' ')[0]}, about your leave request for ${activeLeaveDrawer.request.start_date}...`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#128C7E] border border-[#25D366]/30 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <MessageCircle size={15} />
                <span>Message on WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Edit Staff Modal with Pay Type Toggle */}
      {editingEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md warm-card animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#ECE7DF]">
              <div>
                <h3 className="text-lg font-bold text-[#22201C]">
                  Edit Staff Member
                </h3>
                <p className="text-xs text-[#7A746A]">{editingEmp.name}</p>
              </div>
              <button onClick={() => setEditingEmp(null)} className="p-1 text-[#7A746A] cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#7A746A] mb-1">Full Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-[#F6F2EA] border border-[#ECE7DF] text-[#22201C]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#7A746A] mb-1">Role / Station</label>
                  <input
                    type="text"
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-[#F6F2EA] border border-[#ECE7DF] text-[#22201C]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#7A746A] mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-[#F6F2EA] border border-[#ECE7DF] text-[#22201C]"
                  />
                </div>
              </div>

              {/* Pay Type Toggle: Daily wage | Monthly salary */}
              <div className="p-3.5 rounded-2xl bg-[#F6F2EA] space-y-2 border border-[#ECE7DF]">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#22201C]">Pay Contract Type</span>
                  <div className="flex bg-white p-0.5 rounded-xl border border-[#ECE7DF]">
                    <button
                      type="button"
                      onClick={() => setEditPayType('daily')}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        editPayType === 'daily'
                          ? 'bg-[#2F7D4F] text-white shadow-xs'
                          : 'text-[#7A746A] hover:text-[#22201C]'
                      }`}
                    >
                      Daily Wage
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditPayType('monthly')}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        editPayType === 'monthly'
                          ? 'bg-[#2F7D4F] text-white shadow-xs'
                          : 'text-[#7A746A] hover:text-[#22201C]'
                      }`}
                    >
                      Monthly Salary
                    </button>
                  </div>
                </div>

                {editPayType === 'daily' ? (
                  <div>
                    <label className="block text-[11px] font-semibold text-[#7A746A] mb-1">
                      Daily Wage (₹ / day)
                    </label>
                    <input
                      type="number"
                      value={editDailyWage}
                      onChange={(e) => setEditDailyWage(Number(e.target.value))}
                      step="25"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-[#ECE7DF] font-bold text-sm"
                    />
                    <p className="text-[10px] text-[#7A746A] mt-1">
                      Equivalent ≈ {formatINR(editDailyWage * 30)}/month (30-day calculation)
                    </p>
                  </div>
                ) : (
                  <div>
                    <label className="block text-[11px] font-semibold text-[#7A746A] mb-1">
                      Monthly Base Salary (₹ / month)
                    </label>
                    <input
                      type="number"
                      value={editMonthlySalary}
                      onChange={(e) => setEditMonthlySalary(Number(e.target.value))}
                      step="500"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-[#ECE7DF] font-bold text-sm"
                    />
                    <p className="text-[10px] text-[#7A746A] mt-1">
                      Daily rate ≈ ₹{Math.round(editMonthlySalary / 30)}/day
                    </p>
                  </div>
                )}
              </div>

              {/* Active Status */}
              <div>
                <label className="block font-semibold text-[#7A746A] mb-1">Status</label>
                <select
                  value={editActive}
                  onChange={(e) => setEditActive(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-[#F6F2EA] border border-[#ECE7DF] text-[#22201C]"
                >
                  <option value={1}>Active Staff</option>
                  <option value={0}>Inactive / Left</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingEmp(null)}
                  className="px-4 py-2 text-[#7A746A] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-[#2F7D4F] hover:bg-[#276842] text-white font-bold cursor-pointer"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Staff Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md warm-card animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#ECE7DF]">
              <h3 className="text-lg font-bold text-[#22201C]">
                Add New Staff Member
              </h3>
              <button onClick={() => setAddModalOpen(false)} className="p-1 text-[#7A746A] cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddEmployee} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-[#7A746A] mb-1">Name</label>
                <input
                  type="text"
                  placeholder="e.g. Sana Sheikh"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-[#F6F2EA] border border-[#ECE7DF]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#7A746A] mb-1">Role</label>
                  <input
                    type="text"
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-[#F6F2EA] border border-[#ECE7DF]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#7A746A] mb-1">Phone</label>
                  <input
                    type="tel"
                    placeholder="10-digit"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-[#F6F2EA] border border-[#ECE7DF]"
                  />
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-[#F6F2EA] border border-[#ECE7DF] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold">Contract</span>
                  <div className="flex bg-white p-0.5 rounded-lg border border-[#ECE7DF]">
                    <button
                      type="button"
                      onClick={() => setNewPayType('daily')}
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer ${
                        newPayType === 'daily' ? 'bg-[#2F7D4F] text-white' : 'text-[#7A746A]'
                      }`}
                    >
                      Daily
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewPayType('monthly')}
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer ${
                        newPayType === 'monthly' ? 'bg-[#2F7D4F] text-white' : 'text-[#7A746A]'
                      }`}
                    >
                      Monthly
                    </button>
                  </div>
                </div>

                {newPayType === 'daily' ? (
                  <div>
                    <label className="block text-[11px] font-semibold text-[#7A746A] mb-1">Daily Wage (₹/day)</label>
                    <input
                      type="number"
                      value={newDailyWage}
                      onChange={(e) => setNewDailyWage(Number(e.target.value))}
                      className="w-full px-3 py-1.5 rounded-xl bg-white border border-[#ECE7DF]"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-[11px] font-semibold text-[#7A746A] mb-1">Monthly Salary (₹/month)</label>
                    <input
                      type="number"
                      value={newMonthlySalary}
                      onChange={(e) => setNewMonthlySalary(Number(e.target.value))}
                      className="w-full px-3 py-1.5 rounded-xl bg-white border border-[#ECE7DF]"
                    />
                  </div>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2 text-[#7A746A] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-[#2F7D4F] hover:bg-[#276842] text-white font-bold cursor-pointer"
                >
                  {saving ? 'Adding...' : 'Add Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
