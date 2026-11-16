export interface Employee {
  id: number;
  name: string;
  phone: string;
  pin: string;
  role: string;
  pay_type: 'monthly' | 'daily';
  daily_wage: number;
  monthly_salary: number;
  joining_date: string;
  is_active: number;
  bonus_preference: 'pay' | 'leave';
  avatar_color: string;
  breakBank?: {
    totalSkipped: number;
    totalRedeemed: number;
    available: number;
    needed: number;
    canRedeem: boolean;
  };
  pendingLeaves?: LeaveRequest[];
}

export interface Settings {
  id: number;
  shift_start: string;
  shift_end: string;
  grace_minutes: number;
  late_marks_per_half_day: number;
  paid_leaves_per_month: number;
  break_length_minutes: number;
  skipped_breaks_needed: number;
  bonus_type: 'pay' | 'leave';
  auto_checkout_time: string;
  allowed_ssids: string;
  cafe_name: string;
  owner_pin: string;
  owner_password: string;
  owner_name: string;
  leave_approval_required: number;
  store_lat: number;
  store_lng: number;
  geofence_radius: number;
  store_address?: string;
  allow_offsite_checkout?: number;
}

export interface CafeLocation {
  id: number;
  name: string;
  lat: number;
  lng: number;
  radius: number;
  address?: string;
  is_primary: number;
  created_at?: string;
}

export interface Punch {
  id: number;
  employee_id: number;
  type: 'check_in' | 'start_break' | 'end_break' | 'check_out';
  timestamp: string;
  date: string;
  ssid: string;
  source: 'app' | 'manual' | 'auto';
  notes?: string | null;
  reviewed?: number;
  lat?: number | null;
  lng?: number | null;
  accuracy?: number | null;
  distance_m?: number | null;
}

export interface DayRecord {
  id: number;
  employee_id: number;
  date: string;
  status: 'present' | 'late' | 'paid_leave' | 'unpaid_leave' | 'absent' | 'half_day' | 'upcoming_leave' | 'pending_leave';
  deduction: 'none' | 'half' | 'full';
  is_late: number;
  late_minutes: number;
  break_taken_minutes: number;
  break_skipped: number;
  manual_override: number;
  notes?: string | null;
  punches?: Punch[];
}

export interface RosterItem {
  id: number;
  name: string;
  phone: string;
  role: string;
  avatarColor: string;
  payType: 'monthly' | 'daily';
  dailyWage: number;
  monthlySalary: number;
  bonusPreference: 'pay' | 'leave';
  status: 'on_floor' | 'on_break' | 'checked_out' | 'not_in_yet' | 'on_leave';
  checkInTime: string | null;
  checkInSource: 'app' | 'manual' | 'auto' | null;
  checkOutTime: string | null;
  checkOutSource: 'app' | 'manual' | 'auto' | null;
  breakStartTime: string | null;
  breakSecondsLeft: number;
  workedSeconds: number;
  isLate: boolean;
  lateMinutes: number;
  dayRecord: DayRecord | null;
  punches: Punch[];
}

export interface RosterResponse {
  date: string;
  summary: {
    onFloor: number;
    onBreak: number;
    notInYet: number;
    onLeave: number;
    total: number;
  };
  roster: RosterItem[];
}

export interface LeaveRequest {
  id: number;
  employee_id: number;
  employee_name?: string;
  employee_role?: string;
  employee_phone?: string;
  start_date: string;
  end_date: string;
  days_count: number;
  reason?: string;
  is_paid: number;
  status: 'pending' | 'approved' | 'denied';
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
}

export interface PunchRequest {
  id: number;
  employee_id: number;
  employee_name?: string;
  employee_role?: string;
  type: 'check_in' | 'start_break' | 'end_break' | 'check_out';
  date: string;
  time: string;
  reason: string;
  status: 'pending' | 'approved' | 'denied';
  created_at: string;
  reviewed_by?: string;
  reviewed_at?: string;
}

export interface UnifiedInboxResponse {
  totalCount: number;
  leaveRequests: LeaveRequest[];
  punchRequests: PunchRequest[];
  autoCheckouts: any[];
}

export interface PayrollEmployee {
  employeeId: number;
  employeeName: string;
  payType: 'monthly' | 'daily';
  dailyWage: number;
  baseSalary: number;
  dailyRate: number;
  halfDayRate: number;
  daysInMonth: number;
  presentDays: number;
  lateDaysCount: number;
  lateMarksLeftUntilDeduction: number;
  lateMarkDeductionUnits: number;
  lateMarkDeductionAmount: number;
  paidLeavesUsed: number;
  paidLeavesLeft: number;
  totalUnpaidDays: number;
  unpaidDaysDeductionAmount: number;
  manualHalfDaysCount: number;
  halfDaysDeductionAmount: number;
  breaksBanked: number;
  bankedBreaksRemainder: number;
  availableBreakBank?: number;
  canRedeemBreak?: boolean;
  skippedBreaksNeeded: number;
  breakBonusAmount: number;
  breakBonusLeaves: number;
  bonusPreference: 'pay' | 'leave';
  totalDeductions: number;
  netSalary: number;
  todayEarning: number;
}

export interface PayrollMonthResponse {
  month: string;
  daysInMonth: number;
  isFinalized: boolean;
  finalizedAt: string | null;
  totals: {
    totalBase: number;
    totalNet: number;
    totalDeductions: number;
    totalBonuses: number;
    totalLateMarks: number;
    totalPaidLeavesUsed: number;
    totalUnpaidDays: number;
  };
  employees: PayrollEmployee[];
}

export interface AuditLogEntry {
  id: number;
  employee_id: number | null;
  target_date: string | null;
  action: string;
  actor: string;
  details: string;
  timestamp: string;
}
