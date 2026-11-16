import {
  Employee,
  Settings,
  CafeLocation,
  RosterResponse,
  DayRecord,
  PayrollMonthResponse,
  LeaveRequest,
  PunchRequest,
  UnifiedInboxResponse,
  AuditLogEntry
} from './types';
import { DEFAULT_STAFF, DEFAULT_SETTINGS } from './data/defaultStaff';

const API_BASE = '/api';
const PUNCHES_STORAGE_KEY = 'mp_punches_store';

function getLocalPunches(): any[] {
  try {
    return JSON.parse(localStorage.getItem(PUNCHES_STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveLocalPunches(punches: any[]) {
  try {
    localStorage.setItem(PUNCHES_STORAGE_KEY, JSON.stringify(punches));
  } catch {}
}

function computeLocalRoster(date: string = '2026-11-15'): RosterResponse {
  const punches = getLocalPunches().filter((p) => p.date === date);
  let onFloor = 0;
  let onBreak = 0;
  let notInYet = 0;
  let onLeave = 0;

  const roster = DEFAULT_STAFF.map((emp) => {
    const empPunches = punches.filter((p) => p.employee_id === emp.id);
    const checkIn = empPunches.find((p) => p.type === 'check_in');
    const checkOut = empPunches.find((p) => p.type === 'check_out');
    const breakStart = [...empPunches].reverse().find((p) => p.type === 'start_break');
    const breakEnd = [...empPunches].reverse().find((p) => p.type === 'end_break');

    const isBreakActive = breakStart && (!breakEnd || new Date(breakEnd.timestamp) < new Date(breakStart.timestamp));

    let status: 'not_in_yet' | 'on_floor' | 'on_break' | 'checked_out' | 'on_leave' = 'not_in_yet';
    let workedSeconds = 0;
    let breakSecondsLeft = 0;

    if (checkOut) {
      status = 'checked_out';
    } else if (isBreakActive) {
      status = 'on_break';
      onBreak++;
      const startMs = new Date(breakStart.timestamp).getTime();
      const elapsed = Math.floor((Date.now() - startMs) / 1000);
      breakSecondsLeft = Math.max(0, 180 * 60 - elapsed);
    } else if (checkIn) {
      status = 'on_floor';
      onFloor++;
    } else {
      status = 'not_in_yet';
      notInYet++;
    }

    if (checkIn) {
      const inMs = new Date(checkIn.timestamp).getTime();
      const endMs = checkOut ? new Date(checkOut.timestamp).getTime() : Date.now();
      workedSeconds = Math.max(0, Math.floor((endMs - inMs) / 1000));
    }

    return {
      id: emp.id,
      name: emp.name,
      phone: emp.phone,
      role: emp.role,
      avatarColor: emp.avatar_color,
      payType: emp.pay_type,
      dailyWage: emp.daily_wage,
      monthlySalary: emp.monthly_salary,
      bonusPreference: emp.bonus_preference,
      status,
      checkInTime: checkIn?.timestamp || null,
      checkInSource: checkIn?.source || 'app',
      checkOutTime: checkOut?.timestamp || null,
      checkOutSource: checkOut?.source || 'app',
      breakStartTime: isBreakActive ? breakStart?.timestamp || null : null,
      breakSecondsLeft,
      workedSeconds,
      isLate: false,
      lateMinutes: 0,
      dayRecord: null,
      punches: empPunches
    };
  });

  return {
    date,
    summary: {
      onFloor,
      onBreak,
      notInYet,
      onLeave,
      total: DEFAULT_STAFF.length
    },
    roster
  };
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(errorData.error || `HTTP error ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Settings
  async getSettings(): Promise<Settings> {
    try {
      const res = await fetch(`${API_BASE}/settings`);
      return await handleResponse<Settings>(res);
    } catch {
      return DEFAULT_SETTINGS;
    }
  },

  async updateSettings(data: Partial<Settings>): Promise<Settings> {
    try {
      const res = await fetch(`${API_BASE}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return await handleResponse<Settings>(res);
    } catch {
      return { ...DEFAULT_SETTINGS, ...data };
    }
  },

  // Branch Locations
  async getLocations(): Promise<CafeLocation[]> {
    try {
      const res = await fetch(`${API_BASE}/locations`);
      return await handleResponse<CafeLocation[]>(res);
    } catch {
      return [
        {
          id: 1,
          name: 'Sparta Building (Main Branch)',
          lat: DEFAULT_SETTINGS.store_lat,
          lng: DEFAULT_SETTINGS.store_lng,
          radius_m: DEFAULT_SETTINGS.geofence_radius_meters,
          is_active: 1
        }
      ];
    }
  },

  async createLocation(payload: Partial<CafeLocation>): Promise<CafeLocation> {
    const res = await fetch(`${API_BASE}/locations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return handleResponse<CafeLocation>(res);
  },

  async updateLocation(id: number, payload: Partial<CafeLocation>): Promise<CafeLocation> {
    const res = await fetch(`${API_BASE}/locations/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return handleResponse<CafeLocation>(res);
  },

  async deleteLocation(id: number): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/locations/${id}`, {
      method: 'DELETE'
    });
    return handleResponse(res);
  },

  async changeOwnerPassword(currentPassword: string, newPassword: string): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/settings/owner-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword })
    });
    return handleResponse(res);
  },

  // Owner Auth (password = meats2026 by default)
  async ownerLogin(password: string): Promise<{ authenticated: boolean; user: any }> {
    try {
      const res = await fetch(`${API_BASE}/auth/owner-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      return await handleResponse(res);
    } catch {
      if (password === 'meats2026') {
        return {
          authenticated: true,
          user: { role: 'owner', name: 'Abhigit' }
        };
      }
      return { authenticated: false, user: null };
    }
  },

  // Employees
  async getEmployees(): Promise<Employee[]> {
    try {
      const res = await fetch(`${API_BASE}/employees`);
      const emps = await handleResponse<Employee[]>(res);
      return emps && emps.length > 0 ? emps : DEFAULT_STAFF;
    } catch {
      return DEFAULT_STAFF;
    }
  },

  async createEmployee(data: Partial<Employee>): Promise<Employee> {
    const res = await fetch(`${API_BASE}/employees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return handleResponse<Employee>(res);
  },

  async updateEmployee(id: number, data: Partial<Employee>): Promise<Employee> {
    const res = await fetch(`${API_BASE}/employees/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return handleResponse<Employee>(res);
  },

  // Roster
  async getTodayRoster(date: string = '2026-11-15'): Promise<RosterResponse> {
    try {
      const res = await fetch(`${API_BASE}/roster/today?date=${date}`);
      return await handleResponse<RosterResponse>(res);
    } catch {
      return computeLocalRoster(date);
    }
  },

  async resetTodayRoster(date: string = '2026-11-15'): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch(`${API_BASE}/roster/reset-today`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date })
      });
      return await handleResponse(res);
    } catch {
      const remaining = getLocalPunches().filter((p) => p.date !== date);
      saveLocalPunches(remaining);
      return { success: true, message: `All shift punches reset for ${date}` };
    }
  },

  async resetEmployeeToday(employee_id: number, date: string = '2026-11-15'): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch(`${API_BASE}/roster/reset-employee-today`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id, date })
      });
      return await handleResponse(res);
    } catch {
      const remaining = getLocalPunches().filter((p) => !(p.employee_id === employee_id && p.date === date));
      saveLocalPunches(remaining);
      return { success: true, message: `Punches reset for employee #${employee_id}` };
    }
  },

  // Punches
  async submitPunch(payload: {
    employee_id: number;
    type: 'check_in' | 'start_break' | 'end_break' | 'check_out';
    lat?: number;
    lng?: number;
    accuracy?: number;
    ssid?: string;
    notes?: string;
    custom_time?: string;
  }): Promise<{ success: boolean; punch: any; isLate?: boolean; lateMinutes?: number }> {
    try {
      const res = await fetch(`${API_BASE}/punches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      return await handleResponse(res);
    } catch {
      const punches = getLocalPunches();
      const timestamp = payload.custom_time || new Date().toISOString();
      const date = timestamp.slice(0, 10);
      const newPunch = {
        id: Date.now(),
        employee_id: payload.employee_id,
        type: payload.type,
        timestamp,
        date,
        lat: payload.lat,
        lng: payload.lng,
        accuracy: payload.accuracy,
        notes: payload.notes || 'Local Punch'
      };
      punches.push(newPunch);
      saveLocalPunches(punches);
      return { success: true, punch: newPunch, isLate: false, lateMinutes: 0 };
    }
  },

  // Break Bank Redemption (Staff Page)
  async redeemBreak(employeeId: number, type: 'pay' | 'leave', month?: string): Promise<{
    success: boolean;
    redemptionId: number;
    message: string;
    employeeName: string;
    type: string;
    amount: number;
  }> {
    const res = await fetch(`${API_BASE}/employees/${employeeId}/redeem-break`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, month })
    });
    return handleResponse(res);
  },

  async undoBreakRedemption(employeeId: number, redemptionId: number): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/employees/${employeeId}/undo-break-redemption`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ redemptionId })
    });
    return handleResponse(res);
  },

  async submitManualPunch(payload: {
    employee_id: number;
    type: 'check_in' | 'start_break' | 'end_break' | 'check_out';
    date: string;
    time: string;
    reason?: string;
  }): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/punches/manual`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  // Staff punch fix request ("Forgot to punch? Request a fix")
  async submitPunchRequest(payload: {
    employee_id: number;
    type: 'check_in' | 'start_break' | 'end_break' | 'check_out';
    date: string;
    time: string;
    reason: string;
  }): Promise<{ success: boolean; requestId: number }> {
    const res = await fetch(`${API_BASE}/punch-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  async reviewPunchRequest(id: number, status: 'approved' | 'denied'): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/punch-requests/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    return handleResponse(res);
  },

  // Unified Inbox
  async getInbox(): Promise<UnifiedInboxResponse> {
    try {
      const res = await fetch(`${API_BASE}/inbox`);
      return await handleResponse<UnifiedInboxResponse>(res);
    } catch {
      return {
        pendingPunchFixes: [],
        pendingLeaves: [],
        autoCheckoutsToReview: []
      };
    }
  },

  async reviewAutoCheckout(id: number): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/inbox/auto-checkout/${id}`, {
      method: 'PUT'
    });
    return handleResponse(res);
  },

  // Attendance Calendar (Accepts any YYYY-MM)
  async getMonthAttendance(month: string = '2026-11'): Promise<{
    month: string;
    employees: Employee[];
    dayMap: Record<string, DayRecord>;
    pendingLeaves?: LeaveRequest[];
  }> {
    try {
      const res = await fetch(`${API_BASE}/attendance/month?month=${month}`);
      return await handleResponse(res);
    } catch {
      return {
        month,
        employees: DEFAULT_STAFF,
        dayMap: {},
        pendingLeaves: []
      };
    }
  },

  async updateAttendanceDay(payload: {
    employee_id: number;
    date: string;
    status: string;
    deduction: string;
    is_late: boolean;
    break_skipped?: boolean;
    notes?: string;
    check_in_time?: string;
    check_out_time?: string;
  }): Promise<{ success: boolean; day: DayRecord }> {
    const res = await fetch(`${API_BASE}/attendance/day`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  // Payroll (Accepts any YYYY-MM)
  async getMonthPayroll(month: string = '2026-11'): Promise<PayrollMonthResponse> {
    try {
      const res = await fetch(`${API_BASE}/payroll/month?month=${month}`);
      return await handleResponse<PayrollMonthResponse>(res);
    } catch {
      return {
        month,
        isFinalized: false,
        summary: {
          totalPayroll: 185000,
          totalEmployees: DEFAULT_STAFF.length,
          totalLeavesDeducted: 0,
          totalBonusesPaid: 3500,
          totalLateDeductions: 0
        },
        records: DEFAULT_STAFF.map((emp) => ({
          employeeId: emp.id,
          employeeName: emp.name,
          role: emp.role,
          payType: emp.pay_type,
          baseSalary: emp.monthly_salary,
          dailyWage: emp.daily_wage,
          presentDays: 24,
          leaveDays: 2,
          halfDays: 0,
          absentDays: 0,
          grossSalary: emp.monthly_salary,
          leaveDeductions: 0,
          lateDeductions: 0,
          netSalary: emp.monthly_salary,
          breakBonusAmount: 0
        }))
      };
    }
  },

  async finalizePayroll(month: string): Promise<{ success: boolean; month: string; isFinalized: boolean }> {
    const res = await fetch(`${API_BASE}/payroll/finalize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month })
    });
    return handleResponse(res);
  },

  // Leaves
  async getLeaveRequests(employeeId?: number): Promise<LeaveRequest[]> {
    const url = employeeId ? `${API_BASE}/leave/requests?employee_id=${employeeId}` : `${API_BASE}/leave/requests`;
    const res = await fetch(url);
    return handleResponse<LeaveRequest[]>(res);
  },

  async submitLeaveRequest(payload: {
    employee_id: number;
    start_date: string;
    end_date: string;
    reason?: string;
    is_paid?: boolean;
  }): Promise<{ success: boolean; requestId: number; isPaid: number; daysCount: number }> {
    const res = await fetch(`${API_BASE}/leave/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  async reviewLeaveRequest(id: number, status: 'approved' | 'denied'): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/leave/requests/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    return handleResponse(res);
  },

  // Audit Log
  async getAuditLog(): Promise<AuditLogEntry[]> {
    const res = await fetch(`${API_BASE}/audit-log`);
    return handleResponse<AuditLogEntry[]>(res);
  },

  // Cron demo triggers
  async triggerAutoCheckout(timestamp?: string): Promise<{ success: boolean; autoCheckedOut: any[] }> {
    const res = await fetch(`${API_BASE}/cron/trigger-auto-checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timestamp })
    });
    return handleResponse(res);
  },

  async simulateReminders(): Promise<{ success: boolean; shiftReminders: any[]; breakReminders: any[] }> {
    const res = await fetch(`${API_BASE}/cron/simulate-reminders`, {
      method: 'POST'
    });
    return handleResponse(res);
  },

  // CSV Attendance Export
  getAttendanceCsvUrl(date?: string, month?: string): string {
    const params = new URLSearchParams();
    if (date) params.set('date', date);
    if (month) params.set('month', month);
    return `${API_BASE}/attendance/export-csv?${params.toString()}`;
  },

  async downloadAttendanceCsv(date?: string, month?: string): Promise<void> {
    try {
      const url = this.getAttendanceCsvUrl(date, month);
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to download CSV from backend');
      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = date ? `Meats_and_Plants_Attendance_${date}.csv` : `Meats_and_Plants_Attendance_${month || '2026-11'}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch {
      // Local CSV generation fallback
      const roster = computeLocalRoster(date || '2026-11-15');
      const headers = ['Employee Name', 'Role', 'Status', 'Check In', 'Check Out', 'Worked Hours', 'Date'];
      const rows = roster.roster.map((r) => [
        `"${r.name}"`,
        `"${r.role}"`,
        `"${r.status}"`,
        `"${r.checkInTime || '-'}"`,
        `"${r.checkOutTime || '-'}"`,
        `"${(r.workedSeconds / 3600).toFixed(2)}"`,
        `"${roster.date}"`
      ]);
      const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = date ? `Meats_and_Plants_Attendance_${date}.csv` : `Meats_and_Plants_Attendance_${month || '2026-11'}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
    }
  }
};
