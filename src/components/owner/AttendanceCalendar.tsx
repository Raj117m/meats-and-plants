import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { Employee, DayRecord, LeaveRequest, PayrollEmployee, Holiday } from '../../types';
import { AttendanceDrawer } from './AttendanceDrawer';
import { EmployeeQuickProfileDrawer } from './EmployeeQuickProfileDrawer';
import { formatTime12 } from '../../utils/time';
import { formatINR } from '../../utils/currency';
import { useLocation } from '../../context/LocationContext';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Download,
  Search,
  Clock,
  Coffee,
  Wallet,
  ArrowRight,
  ExternalLink,
  MapPin
} from 'lucide-react';

interface AttendanceCalendarProps {
  employees: Employee[];
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  onAttendanceChanged?: () => void;
  onNavigateToStaff?: (employeeId: number) => void;
  onNavigateToPayroll?: (employeeId?: number) => void;
}

export const AttendanceCalendar: React.FC<AttendanceCalendarProps> = ({
  employees,
  selectedMonth,
  onMonthChange,
  onAttendanceChanged,
  onNavigateToStaff,
  onNavigateToPayroll
}) => {
  const { storeCoords } = useLocation();
  const [dayMap, setDayMap] = useState<Record<string, DayRecord>>({});
  const [pendingLeaves, setPendingLeaves] = useState<LeaveRequest[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [payrollEmployees, setPayrollEmployees] = useState<PayrollEmployee[]>([]);
  const [payrollTotalNet, setPayrollTotalNet] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');

  // Cell Drawer states
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedDayRecord, setSelectedDayRecord] = useState<DayRecord | null>(null);
  const [selectedPendingLeave, setSelectedPendingLeave] = useState<LeaveRequest | null>(null);

  // Quick Profile Drawer state
  const [profileDrawerOpen, setProfileDrawerOpen] = useState(false);
  const [profileEmp, setProfileEmp] = useState<Employee | null>(null);

  // Hover Tooltip state
  const [hoveredCell, setHoveredCell] = useState<{
    emp: Employee;
    dateStr: string;
    record: DayRecord | null;
    isPending: boolean;
    holiday?: Holiday;
    x: number;
    y: number;
  } | null>(null);

  const fetchMonthData = async () => {
    try {
      setLoading(true);
      const [attRes, payRes, holRes] = await Promise.all([
        api.getMonthAttendance(selectedMonth),
        api.getMonthPayroll(selectedMonth).catch(() => null),
        api.getHolidays(year).catch(() => [])
      ]);
      setDayMap(attRes.dayMap || {});
      setPendingLeaves(attRes.pendingLeaves || []);
      setHolidays(holRes || attRes.holidays || []);

      if (payRes?.employees) {
        setPayrollEmployees(payRes.employees);
        setPayrollTotalNet(payRes.totals?.totalNet || 0);
      }
    } catch (err) {
      console.error('Failed to load month attendance & payroll:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonthData();
  }, [selectedMonth]);

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

  const handleThisMonth = () => {
    onMonthChange('2026-11');
  };

  const daysCount = new Date(year, monthNum, 0).getDate();
  const daysList = Array.from({ length: daysCount }, (_, i) => i + 1);

  // Open day edit drawer
  const handleCellClick = (emp: Employee, dayNum: number) => {
    const dateStr = `${selectedMonth}-${String(dayNum).padStart(2, '0')}`;
    const record = dayMap[`${emp.id}_${dateStr}`] || null;
    const pending = pendingLeaves.find(
      (l) => l.employee_id === emp.id && dateStr >= l.start_date && dateStr <= l.end_date
    ) || null;

    setSelectedEmp(emp);
    setSelectedDate(dateStr);
    setSelectedDayRecord(record);
    setSelectedPendingLeave(pending);
    setDrawerOpen(true);
    setHoveredCell(null);
  };

  // Open profile drawer
  const handleNameClick = (emp: Employee) => {
    setProfileEmp(emp);
    setProfileDrawerOpen(true);
  };

  const filteredEmployees = employees.filter((e) =>
    e.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
    e.role.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const exportCSV = () => {
    let csv = `Employee,Role,${daysList.map((d) => `Day ${d}`).join(',')},Net Pay\n`;
    for (const emp of employees) {
      const pEmp = payrollEmployees.find((p) => p.employeeId === emp.id);
      const row = [emp.name, emp.role];
      for (const d of daysList) {
        const dateStr = `${selectedMonth}-${String(d).padStart(2, '0')}`;
        const rec = dayMap[`${emp.id}_${dateStr}`];
        row.push(rec ? rec.status : 'off');
      }
      row.push(pEmp ? pEmp.netSalary : '');
      csv += `${row.join(',')}\n`;
    }

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Meats_and_Plants_Attendance_${selectedMonth}.csv`;
    a.click();
  };

  // Compute daily totals across whole café
  const dailyPresentTotals = daysList.map((dayNum) => {
    const dateStr = `${selectedMonth}-${String(dayNum).padStart(2, '0')}`;
    let count = 0;
    for (const emp of employees) {
      const rec = dayMap[`${emp.id}_${dateStr}`];
      if (rec && (rec.status === 'present' || rec.status === 'late' || rec.status === 'half_day')) {
        count++;
      }
    }
    return count;
  });

  return (
    <div className="space-y-8">
      {/* Title & Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#22201C]">
            Attendance Matrix
          </h2>
          <p className="text-xs text-[#7A746A] mt-0.5">
            Click employee name for quick profile · Hover day for details · Click cell to edit
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7A746A]" />
            <input
              type="text"
              placeholder="Filter staff..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-xl bg-white border border-[#ECE7DF] text-xs focus:outline-none focus:border-[#2F7D4F]"
            />
          </div>

          {/* Month Navigation: ‹ Month Year › + This Month */}
          <div className="flex items-center gap-1.5 bg-white p-1 rounded-2xl border border-[#ECE7DF] warm-card">
            <button
              onClick={handlePrevMonth}
              className="p-1 rounded-xl hover:bg-[#F6F2EA] text-[#7A746A] hover:text-[#22201C] cursor-pointer"
              title="Previous month"
            >
              <ChevronLeft size={16} />
            </button>

            <span className="text-xs font-bold text-[#22201C] px-1.5">
              {monthName} {year}
            </span>

            <button
              onClick={handleNextMonth}
              className="p-1 rounded-xl hover:bg-[#F6F2EA] text-[#7A746A] hover:text-[#22201C] cursor-pointer"
              title="Next month"
            >
              <ChevronRight size={16} />
            </button>

            {selectedMonth !== '2026-11' && (
              <button
                onClick={handleThisMonth}
                className="ml-1 px-2 py-0.5 rounded-lg bg-[#EAF5EE] text-[#23633E] text-[10px] font-bold cursor-pointer"
              >
                This month
              </button>
            )}
          </div>

          {/* Export CSV */}
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#ECE7DF] text-xs font-semibold text-[#22201C] hover:bg-[#F6F2EA] transition-colors cursor-pointer"
          >
            <Download size={13} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Legend Bar */}
      <div className="flex flex-wrap items-center gap-3 text-xs bg-[#F6F2EA] p-3 rounded-2xl border border-[#ECE7DF]">
        <span className="font-bold text-[#7A746A] text-[11px] uppercase mr-1">Legend:</span>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-md bg-[#EAF5EE] border border-[#C6E7D1]" />
          <span className="text-[#22201C]">Present (P)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-md bg-[#FEF7E6] border border-[#FDE3A7]" />
          <span className="text-[#22201C]">Late (L)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-md bg-[#EDF4FC] border border-[#CDE0F7]" />
          <span className="text-[#22201C]">Paid Leave (PL)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-md bg-white border-2 border-dashed border-[#4A7BB7]" />
          <span className="text-[#22201C]">Pending Leave (?)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-md bg-[#FDF0ED] border border-[#F8D0C8]" />
          <span className="text-[#22201C]">Absent (A)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-md bg-[#F8EAE6] border border-[#C0573E]/30" />
          <span className="text-[#22201C]">Half-Day (½)</span>
        </div>
      </div>

      {/* Matrix Table with Columns & Totals */}
      <div className="bg-white rounded-2xl border border-[#ECE7DF] warm-card overflow-x-auto relative">
        <table className="w-full text-left border-collapse min-w-[1100px]">
          <thead>
            <tr className="border-b border-[#ECE7DF] bg-[#F6F2EA]/60">
              <th className="py-3 px-4 text-xs font-bold text-[#7A746A] uppercase sticky left-0 bg-[#FFFDF9] z-20 w-48 shadow-xs">
                Staff (Click for profile)
              </th>
              {daysList.map((d) => {
                const isToday = selectedMonth === '2026-11' && d === 15;
                return (
                  <th
                    key={d}
                    className={`py-2 px-1 text-center text-[11px] font-semibold ${
                      isToday ? 'text-[#23633E] font-bold bg-[#EAF5EE]' : 'text-[#7A746A]'
                    }`}
                  >
                    {d}
                    {isToday && <span className="block text-[8px] font-bold uppercase text-[#23633E]">Today</span>}
                  </th>
                );
              })}
              {/* Column of Totals on the Right */}
              <th
                onClick={() => onNavigateToPayroll && onNavigateToPayroll()}
                className="py-3 px-3 text-right text-xs font-bold text-[#23633E] uppercase sticky right-0 bg-[#FFFDF9] z-20 shadow-xs cursor-pointer hover:bg-[#EAF5EE] transition-colors"
                title="Click to view full payroll ledger"
              >
                Net Pay →
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[#ECE7DF]/70">
            {filteredEmployees.map((emp) => {
              const pEmp = payrollEmployees.find((p) => p.employeeId === emp.id);

              return (
                <tr key={emp.id} className="hover:bg-[#F6F2EA]/40 transition-colors">
                  {/* Fixed Staff Column (Clickable for Quick Profile) */}
                  <td
                    onClick={() => handleNameClick(emp)}
                    className="py-3 px-4 sticky left-0 bg-white z-10 shadow-xs cursor-pointer hover:bg-[#EAF5EE]/40 transition-colors group"
                    title="Click for quick profile drawer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-7 h-7 rounded-xl flex items-center justify-center text-white text-[11px] font-bold shrink-0 shadow-xs group-hover:scale-105 transition-transform"
                        style={{ backgroundColor: emp.avatar_color || '#2F7D4F' }}
                      >
                        {emp.name[0]}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[#22201C] leading-tight group-hover:text-[#2F7D4F] transition-colors">
                          {emp.name}
                        </div>
                        <div className="text-[10px] text-[#7A746A] leading-tight">{emp.role}</div>
                      </div>
                    </div>
                  </td>

                  {/* Day Cells */}
                  {daysList.map((dayNum) => {
                    const dateStr = `${selectedMonth}-${String(dayNum).padStart(2, '0')}`;
                    const record = dayMap[`${emp.id}_${dateStr}`];
                    const status = record?.status;
                    const isToday = selectedMonth === '2026-11' && dayNum === 15;
                    const holiday = holidays.find((h) => h.date === dateStr);

                    const isPending = pendingLeaves.some(
                      (l) => l.employee_id === emp.id && dateStr >= l.start_date && dateStr <= l.end_date
                    );

                    let cellClasses = 'bg-[#F6F2EA]/40 text-[#7A746A] border-transparent hover:border-[#D9D3C7]';
                    let symbol = '';

                    if (isPending) {
                      cellClasses = 'bg-white text-[#4A7BB7] font-bold border-2 border-dashed border-[#4A7BB7] hover:scale-110';
                      symbol = '?';
                    } else if (holiday && status === 'present') {
                      cellClasses = 'bg-white text-[#2E7D4F] font-bold border-2 border-[#B0235F] hover:scale-110';
                      symbol = 'P';
                    } else if (holiday) {
                      cellClasses = 'bg-white text-[#B0235F] font-bold border-1.5 border-[#B0235F] hover:scale-110';
                      symbol = 'H';
                    } else if (status === 'present') {
                      cellClasses = 'bg-[#EAF5EE] text-[#23633E] font-bold border border-[#C6E7D1] hover:scale-110';
                      symbol = 'P';
                    } else if (status === 'late') {
                      cellClasses = 'bg-[#FEF7E6] text-[#9A6A12] font-bold border border-[#FDE3A7] hover:scale-110';
                      symbol = 'L';
                    } else if (status === 'paid_leave' || status === 'upcoming_leave') {
                      cellClasses = 'bg-[#EDF4FC] text-[#2A5A8F] font-bold border border-[#CDE0F7] hover:scale-110';
                      symbol = 'PL';
                    } else if (status === 'unpaid_leave' || status === 'absent') {
                      cellClasses = 'bg-[#FDF0ED] text-[#A8382B] font-bold border border-[#F8D0C8] hover:scale-110';
                      symbol = 'A';
                    } else if (status === 'half_day') {
                      cellClasses = 'bg-[#F8EAE6] text-[#C0573E] font-bold border border-[#C0573E]/30 hover:scale-110';
                      symbol = '½';
                    }

                    return (
                      <td
                        key={dayNum}
                        className={`p-1 text-center ${isToday ? 'bg-[#EAF5EE]/30' : ''}`}
                        onMouseEnter={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setHoveredCell({
                            emp,
                            dateStr,
                            record: record || null,
                            isPending,
                            holiday,
                            x: rect.left + rect.width / 2,
                            y: rect.top - 8
                          });
                        }}
                        onMouseLeave={() => setHoveredCell(null)}
                      >
                        <button
                          onClick={() => handleCellClick(emp, dayNum)}
                          className={`w-7 h-7 mx-auto rounded-lg flex items-center justify-center text-[10px] transition-transform select-none cursor-pointer relative ${cellClasses}`}
                        >
                          <span>{symbol}</span>
                          {record?.break_skipped === 1 && (
                            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[#2F7D4F]" />
                          )}
                        </button>
                      </td>
                    );
                  })}

                  {/* Net Pay Column Cell (Clickable -> Payroll) */}
                  <td
                    onClick={() => onNavigateToPayroll && onNavigateToPayroll(emp.id)}
                    className="py-3 px-3 text-right sticky right-0 bg-white z-10 shadow-xs cursor-pointer hover:bg-[#EAF5EE] transition-colors group"
                    title={`Click to open ${emp.name} in Payroll`}
                  >
                    <span className="font-bold text-xs text-[#22201C] group-hover:text-[#23633E] tabular-nums">
                      {pEmp ? formatINR(pEmp.netSalary) : '...'}
                    </span>
                  </td>
                </tr>
              );
            })}

            {/* Row of Totals at the Bottom of Matrix */}
            <tr className="border-t-2 border-[#ECE7DF] bg-[#F6F2EA]/80 font-bold text-xs">
              <td
                onClick={() => onNavigateToPayroll && onNavigateToPayroll()}
                className="py-3 px-4 sticky left-0 bg-[#F6F2EA] z-20 text-[#22201C] cursor-pointer hover:text-[#23633E]"
                title="Click to open Payroll"
              >
                <span>Café Present Totals</span>
              </td>
              {dailyPresentTotals.map((tot, idx) => (
                <td
                  key={idx}
                  className="py-2 px-1 text-center text-[11px] text-[#22201C] tabular-nums"
                >
                  {tot > 0 ? tot : '—'}
                </td>
              ))}
              <td
                onClick={() => onNavigateToPayroll && onNavigateToPayroll()}
                className="py-3 px-3 text-right sticky right-0 bg-[#F6F2EA] z-20 text-[#23633E] cursor-pointer hover:underline tabular-nums"
                title="Total net payroll payout for the month. Click for details."
              >
                {formatINR(payrollTotalNet)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Floating Hover Tooltip Card */}
      {hoveredCell && (
        <div
          className="fixed z-50 pointer-events-none transform -translate-x-1/2 -translate-y-full transition-opacity duration-150 animate-in fade-in zoom-in-95"
          style={{ left: hoveredCell.x, top: hoveredCell.y }}
        >
          <div className="bg-[#22201C] text-white p-3 rounded-2xl shadow-2xl max-w-xs w-64 border border-[#3D3A34] text-xs space-y-1.5">
            {/* Header: Date + Status Chip */}
            <div className="flex items-center justify-between pb-1.5 border-b border-[#3D3A34]">
              <span className="font-bold text-white">
                {hoveredCell.dateStr}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                  hoveredCell.holiday && hoveredCell.record?.status === 'present'
                    ? 'bg-[#B0235F] text-white'
                    : hoveredCell.holiday
                    ? 'bg-[#B0235F] text-white'
                    : hoveredCell.isPending
                    ? 'bg-[#4A7BB7] text-white'
                    : hoveredCell.record?.status === 'present'
                    ? 'bg-[#2F7D4F] text-white'
                    : hoveredCell.record?.status === 'late'
                    ? 'bg-[#E8B44A] text-[#22201C]'
                    : hoveredCell.record?.status === 'paid_leave'
                    ? 'bg-[#4A7BB7] text-white'
                    : hoveredCell.record?.status === 'half_day'
                    ? 'bg-[#C0573E] text-white'
                    : 'bg-[#55524B] text-white'
                }`}
              >
                {hoveredCell.holiday && hoveredCell.record?.status === 'present'
                  ? 'Worked on holiday'
                  : hoveredCell.holiday
                  ? 'Holiday'
                  : hoveredCell.isPending
                  ? 'Pending'
                  : (hoveredCell.record?.status || 'Off')}
              </span>
            </div>

            {hoveredCell.holiday && (
              <div className="text-[11px] text-[#B0235F] font-semibold py-0.5">
                🏛️ {hoveredCell.holiday.name} (Paid gazetted holiday)
              </div>
            )}

            {/* In / Out Timings with Auto / Manual Tags */}
            <div className="text-[11px] text-[#ECE7DF] space-y-0.5">
              {hoveredCell.record?.punches && hoveredCell.record.punches.length > 0 ? (
                (() => {
                  const checkIn = hoveredCell.record.punches.find((p) => p.type === 'check_in');
                  const checkOut = hoveredCell.record.punches.find((p) => p.type === 'check_out');
                  const primaryPunch = checkIn || checkOut;
                  const isEdge = primaryPunch && primaryPunch.distance_m != null && primaryPunch.distance_m >= (storeCoords.radius || 75) * 0.75;

                  return (
                    <div className="space-y-1">
                      <div>
                        <span>
                          In {checkIn ? formatTime12(checkIn.timestamp) : '—'}
                          {checkIn?.source && checkIn.source !== 'app' && (
                            <span className="ml-1 text-[9px] px-1 py-0.2 rounded bg-[#3D3A34] text-[#E8B44A]">
                              {checkIn.source}
                            </span>
                          )}
                        </span>
                        <span className="mx-1">·</span>
                        <span>
                          Out {checkOut ? formatTime12(checkOut.timestamp) : '—'}
                          {checkOut?.source && checkOut.source !== 'app' && (
                            <span className="ml-1 text-[9px] px-1 py-0.2 rounded bg-[#3D3A34] text-[#E8B44A]">
                              {checkOut.source}
                            </span>
                          )}
                        </span>
                      </div>

                      {/* GPS Distance & Map Link (v4) */}
                      {primaryPunch && (
                        <div className="flex items-center justify-between text-[10px] text-[#A8A298] pt-0.5 border-t border-[#3D3A34]/50">
                          <div className="flex items-center gap-1.5">
                            {isEdge && (
                              <span className="w-2 h-2 rounded-full bg-[#E8B44A] shrink-0" title="Near edge of geofence zone" />
                            )}
                            <span>
                              📍 {primaryPunch.distance_m != null ? `${Math.round(primaryPunch.distance_m)} m from café` : 'At café'}
                              {primaryPunch.accuracy != null ? ` (±${Math.round(primaryPunch.accuracy)} m)` : ''}
                            </span>
                          </div>
                          {primaryPunch.lat != null && primaryPunch.lng != null && (
                            <a
                              href={`https://www.openstreetmap.org/?mlat=${primaryPunch.lat}&mlon=${primaryPunch.lng}#map=19/${primaryPunch.lat}/${primaryPunch.lng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#4A7BB7] hover:underline flex items-center gap-0.5 ml-2"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <span>Map</span>
                              <ExternalLink size={10} />
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()
              ) : (
                <div className="text-[#A8A298]">No punches recorded</div>
              )}

              {/* 3-hr Break Status */}
              <div className="flex items-center gap-1 text-[11px] text-[#A8A298] pt-0.5">
                <Coffee size={11} className="text-[#E8B44A]" />
                <span>
                  3-hr break: {
                    hoveredCell.record?.break_skipped === 1
                      ? 'Skipped (banked)'
                      : hoveredCell.record?.break_taken_minutes && hoveredCell.record.break_taken_minutes > 0
                      ? `Taken 3:10–6:10 PM (${hoveredCell.record.break_taken_minutes}m)`
                      : 'Not taken'
                  }
                </span>
              </div>

              {/* Today's Pay */}
              <div className="flex items-center justify-between pt-1 border-t border-[#3D3A34] font-bold text-white text-[11px]">
                <span>Today's pay:</span>
                <span className="text-[#2F7D4F] tabular-nums">
                  {(() => {
                    const daily = hoveredCell.emp.daily_wage || Math.round(hoveredCell.emp.monthly_salary / 30);
                    const status = hoveredCell.record?.status;
                    const ded = hoveredCell.record?.deduction;
                    if (status === 'present') return `₹${daily}`;
                    if (status === 'late') return `₹${daily}`;
                    if (status === 'paid_leave') return `₹${daily} (paid leave)`;
                    if (status === 'half_day' || ded === 'half') return `−₹${Math.round(daily / 2)} (half-day)`;
                    if (status === 'absent' || status === 'unpaid_leave') return '₹0 unpaid';
                    if (hoveredCell.isPending) return 'Pending approval';
                    return '—';
                  })()}
                </span>
              </div>

              {/* Note if any */}
              {hoveredCell.record?.notes && (
                <div className="text-[10px] text-[#A8A298] italic pt-0.5">
                  Note: "{hoveredCell.record.notes}"
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quick Profile Drawer (Triggered by Clicking Employee Name) */}
      <EmployeeQuickProfileDrawer
        isOpen={profileDrawerOpen}
        onClose={() => setProfileDrawerOpen(false)}
        employee={profileEmp}
        selectedMonth={selectedMonth}
        onNavigateToStaff={(id) => {
          setProfileDrawerOpen(false);
          if (onNavigateToStaff) onNavigateToStaff(id);
        }}
        onNavigateToPayroll={(id) => {
          setProfileDrawerOpen(false);
          if (onNavigateToPayroll) onNavigateToPayroll(id);
        }}
        onEmployeeUpdated={() => {
          fetchMonthData();
          if (onAttendanceChanged) onAttendanceChanged();
        }}
      />

      {/* Edit Day Drawer (Triggered by Clicking Day Cell) */}
      <AttendanceDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        employee={selectedEmp}
        date={selectedDate}
        dayRecord={selectedDayRecord}
        pendingLeave={selectedPendingLeave}
        onSaveSuccess={() => {
          fetchMonthData();
          if (onAttendanceChanged) onAttendanceChanged();
        }}
      />
    </div>
  );
};
