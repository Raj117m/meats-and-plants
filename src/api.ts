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

const API_BASE = '/api';

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
    const res = await fetch(`${API_BASE}/settings`);
    return handleResponse<Settings>(res);
  },

  async updateSettings(data: Partial<Settings>): Promise<Settings> {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return handleResponse<Settings>(res);
  },

  // Branch Locations
  async getLocations(): Promise<CafeLocation[]> {
    const res = await fetch(`${API_BASE}/locations`);
    return handleResponse<CafeLocation[]>(res);
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
    const res = await fetch(`${API_BASE}/auth/owner-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    return handleResponse(res);
  },

  // Employees
  async getEmployees(): Promise<Employee[]> {
    const res = await fetch(`${API_BASE}/employees`);
    return handleResponse<Employee[]>(res);
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
    const res = await fetch(`${API_BASE}/roster/today?date=${date}`);
    return handleResponse<RosterResponse>(res);
  },

  async resetTodayRoster(date: string = '2026-11-15'): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/roster/reset-today`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date })
    });
    return handleResponse(res);
  },

  async resetEmployeeToday(employee_id: number, date: string = '2026-11-15'): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/roster/reset-employee-today`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employee_id, date })
    });
    return handleResponse(res);
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
    const res = await fetch(`${API_BASE}/punches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
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
    const res = await fetch(`${API_BASE}/inbox`);
    return handleResponse<UnifiedInboxResponse>(res);
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
    const res = await fetch(`${API_BASE}/attendance/month?month=${month}`);
    return handleResponse(res);
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
    const res = await fetch(`${API_BASE}/payroll/month?month=${month}`);
    return handleResponse<PayrollMonthResponse>(res);
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
    const url = this.getAttendanceCsvUrl(date, month);
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to download CSV');
    const blob = await res.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = date ? `Meats_and_Plants_Attendance_${date}.csv` : `Meats_and_Plants_Attendance_${month || '2026-11'}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(downloadUrl);
  }
};
