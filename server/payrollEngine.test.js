import { describe, it, expect } from 'vitest';
import {
  calculateEmployeePayroll,
  evaluateLateStatus,
  validateWifiSsid,
  calculateDistanceMeters,
  validateGeofence,
  computeEmployeeDayState,
  validateStateTransition
} from './payrollEngine.js';

describe('Meats & Plants — Payroll & Rules Engine v5 (Quartz)', () => {
  const defaultSettings = {
    shift_start: '12:00',
    shift_end: '00:00',
    grace_minutes: 15,
    paid_leaves_per_month: 3,
    skipped_breaks_needed: 4,
    break_length_minutes: 180
  };

  const sampleEmployee = {
    id: 1,
    name: 'Shoaib',
    monthly_salary: 18000,
    daily_wage: 600,
    pay_type: 'monthly',
    break_bank_skipped: 0,
    bonus_holidays_earned: 0,
    bonus_holidays_used: 0,
    paid_leaves_quota: 3
  };

  describe('1. Attendance & Shift State Machine Transitions', () => {
    it('allows NOT_STARTED -> startShift -> ON_SHIFT', () => {
      expect(validateStateTransition('NOT_STARTED', 'startShift')).toBe('ON_SHIFT');
      expect(validateStateTransition('NOT_STARTED', 'check_in')).toBe('ON_SHIFT');
    });

    it('blocks starting a shift if already on shift or ended', () => {
      expect(() => validateStateTransition('ON_SHIFT', 'startShift')).toThrow();
      expect(() => validateStateTransition('ENDED', 'startShift')).toThrow();
    });

    it('allows ON_SHIFT -> startBreak -> ON_BREAK', () => {
      expect(validateStateTransition('ON_SHIFT', 'startBreak', false)).toBe('ON_BREAK');
    });

    it('blocks starting a second break if one was already taken today', () => {
      expect(() => validateStateTransition('ON_SHIFT', 'startBreak', true)).toThrow(
        /Break already taken today/
      );
    });

    it('allows ON_BREAK -> endBreak -> ON_SHIFT', () => {
      expect(validateStateTransition('ON_BREAK', 'endBreak')).toBe('ON_SHIFT');
    });

    it('allows ending the shift directly from ON_SHIFT or ON_BREAK', () => {
      expect(validateStateTransition('ON_SHIFT', 'endShift')).toBe('ENDED');
      expect(validateStateTransition('ON_BREAK', 'endShift')).toBe('ENDED');
    });
  });

  describe('2. Live Worked Seconds and Break Countdown', () => {
    it('calculates worked seconds = now - shiftStart when no break taken', () => {
      const shiftStart = '2026-11-15T12:00:00.000Z';
      const nowMs = new Date('2026-11-15T14:30:00.000Z').getTime(); // 2.5 hours later

      const state = computeEmployeeDayState({
        employee: sampleEmployee,
        date: '2026-11-15',
        punches: [{ type: 'check_in', timestamp: shiftStart }],
        nowMs
      });

      expect(state.status).toBe('ON_SHIFT');
      expect(state.workedSeconds).toBe(2.5 * 3600);
      expect(state.breakUsed).toBe(false);
    });

    it('freezes worked time during an active break and runs a 3h countdown', () => {
      const shiftStart = '2026-11-15T12:00:00.000Z';
      const breakStart = '2026-11-15T14:00:00.000Z'; // worked 2 hours
      const nowMs = new Date('2026-11-15T15:00:00.000Z').getTime(); // 1 hour into break

      const state = computeEmployeeDayState({
        employee: sampleEmployee,
        date: '2026-11-15',
        punches: [
          { type: 'check_in', timestamp: shiftStart },
          { type: 'start_break', timestamp: breakStart }
        ],
        nowMs
      });

      expect(state.status).toBe('ON_BREAK');
      expect(state.workedSeconds).toBe(2 * 3600); // exactly 2 hours
      expect(state.breakRemainingSeconds).toBe(2 * 3600); // 3h - 1h = 2h remaining
    });

    it('auto-ends break at 3 hours (180 minutes) and resumes shift timer', () => {
      const shiftStart = '2026-11-15T12:00:00.000Z';
      const breakStart = '2026-11-15T14:00:00.000Z';
      // 4 hours after break start (exceeded 3h break limit by 1h)
      const nowMs = new Date('2026-11-15T18:00:00.000Z').getTime();

      const state = computeEmployeeDayState({
        employee: sampleEmployee,
        date: '2026-11-15',
        punches: [
          { type: 'check_in', timestamp: shiftStart },
          { type: 'start_break', timestamp: breakStart }
        ],
        nowMs
      });

      expect(state.status).toBe('ON_SHIFT');
      expect(state.breakRemainingSeconds).toBe(0);
      // Worked time = 2h before break + 1h after auto-ended break = 3 hours worked
      expect(state.workedSeconds).toBe(3 * 3600);
    });

    it('handles ending shift during break by auto-closing break', () => {
      const shiftStart = '2026-11-15T12:00:00.000Z';
      const breakStart = '2026-11-15T15:00:00.000Z';
      const shiftEnd = '2026-11-15T16:00:00.000Z'; // Ended 1h into break

      const state = computeEmployeeDayState({
        employee: sampleEmployee,
        date: '2026-11-15',
        punches: [
          { type: 'check_in', timestamp: shiftStart },
          { type: 'start_break', timestamp: breakStart },
          { type: 'check_out', timestamp: shiftEnd }
        ],
        nowMs: new Date(shiftEnd).getTime()
      });

      expect(state.status).toBe('ENDED');
      expect(state.workedSeconds).toBe(3 * 3600); // 12:00 to 15:00
    });
  });

  describe('3. Late Rule (Section 2: 15-min Grace -> Half Day Deduction)', () => {
    it('marks check-in within grace period (12:00 to 12:15) as on-time with zero deduction', () => {
      const onTime1 = evaluateLateStatus('12:00', '12:00', 15);
      expect(onTime1.isLate).toBe(false);
      expect(onTime1.isHalfDay).toBe(false);
      expect(onTime1.deduction).toBe('none');

      const onTime2 = evaluateLateStatus('12:14', '12:00', 15);
      expect(onTime2.isLate).toBe(false);
      expect(onTime2.deduction).toBe('none');

      const onTime3 = evaluateLateStatus('12:15', '12:00', 15);
      expect(onTime3.isLate).toBe(false);
      expect(onTime3.deduction).toBe('none');
    });

    it('marks check-in after grace period (12:16+) as Half Day with half-day deduction', () => {
      const lateCheck = evaluateLateStatus('12:16', '12:00', 15);
      expect(lateCheck.isLate).toBe(true);
      expect(lateCheck.isHalfDay).toBe(true);
      expect(lateCheck.deduction).toBe('half');
      expect(lateCheck.minutesLate).toBe(16);
    });

    it('deducts half a day pay in payroll when late check-in occurs', () => {
      const days = [
        { date: '2026-11-01', status: 'half_day', deduction: 'half', is_late: 1 }
      ];

      const result = calculateEmployeePayroll({
        employee: sampleEmployee,
        days,
        settings: defaultSettings,
        daysInMonth: 30
      });

      expect(result.halfDaysCount).toBe(1);
      expect(result.halfDaysDeductionAmount).toBe(300); // 600 / 2 = 300
      expect(result.totalDeductions).toBe(300);
      expect(result.netSalary).toBe(17700); // 18000 - 300
    });
  });

  describe('4. Automatic Paid -> Unpaid Leave Calculation (Section 3)', () => {
    it('treats leaves 1 to 3 as Paid leaves with zero deduction', () => {
      const days = [
        { date: '2026-11-02', status: 'paid_leave' },
        { date: '2026-11-03', status: 'paid_leave' },
        { date: '2026-11-04', status: 'paid_leave' }
      ];

      const result = calculateEmployeePayroll({
        employee: sampleEmployee,
        days,
        settings: defaultSettings,
        daysInMonth: 30
      });

      expect(result.paidLeavesUsed).toBe(3);
      expect(result.paidLeavesLeft).toBe(0);
      expect(result.unpaidDaysCount).toBe(0);
      expect(result.totalDeductions).toBe(0);
      expect(result.netSalary).toBe(18000);
    });

    it('automatically marks the 4th leave onward as Unpaid, deducting 1 full day per leave', () => {
      const days = [
        { date: '2026-11-02', status: 'leave' },
        { date: '2026-11-03', status: 'leave' },
        { date: '2026-11-04', status: 'leave' },
        { date: '2026-11-05', status: 'leave' }, // 4th
        { date: '2026-11-06', status: 'leave' }  // 5th
      ];

      const result = calculateEmployeePayroll({
        employee: sampleEmployee,
        days,
        settings: defaultSettings,
        daysInMonth: 30
      });

      expect(result.paidLeavesUsed).toBe(3);
      expect(result.unpaidDaysCount).toBe(2);
      expect(result.unpaidDaysDeductionAmount).toBe(1200); // 2 x 600 = 1200
      expect(result.netSalary).toBe(16800); // 18000 - 1200
    });
  });

  describe('5. Government Holidays (Section 4)', () => {
    it('government holidays never deduct pay and never consume leave quota', () => {
      const holidays = [
        { date: '2026-11-08', name: 'Diwali', is_paid: 1 },
        { date: '2026-11-24', name: 'Guru Nanak Jayanti', is_paid: 1 }
      ];

      const days = [
        { date: '2026-11-08', status: 'absent' }, // Closed on holiday
        { date: '2026-11-24', status: 'absent' }
      ];

      const result = calculateEmployeePayroll({
        employee: sampleEmployee,
        days,
        holidays,
        settings: defaultSettings,
        daysInMonth: 30
      });

      expect(result.holidayDaysCount).toBe(2);
      expect(result.unpaidDaysCount).toBe(0);
      expect(result.totalDeductions).toBe(0);
      expect(result.netSalary).toBe(18000);
      expect(result.paidLeavesLeft).toBe(3); // 3 paid leaves still fully available
    });
  });

  describe('6. Break System & Holiday Banking (Section 5)', () => {
    it('increments break bank when shift ends without taking a break', () => {
      const days = [
        { date: '2026-11-01', status: 'present', break_skipped: 1 },
        { date: '2026-11-02', status: 'present', break_skipped: 1 },
        { date: '2026-11-03', status: 'present', break_skipped: 1 }
      ];

      const result = calculateEmployeePayroll({
        employee: sampleEmployee,
        days,
        settings: defaultSettings,
        daysInMonth: 30
      });

      expect(result.breaksBanked).toBe(3);
      expect(result.breakBankRemainder).toBe(3);
      expect(result.availableBonusHolidays).toBe(0);
    });

    it('credits +1 extra paid holiday on reaching 4 banked breaks and adds to paid leave quota', () => {
      const days = [
        { date: '2026-11-01', status: 'present', break_skipped: 1 },
        { date: '2026-11-02', status: 'present', break_skipped: 1 },
        { date: '2026-11-03', status: 'present', break_skipped: 1 },
        { date: '2026-11-04', status: 'present', break_skipped: 1 }
      ];

      const empWithBonusHoliday = {
        ...sampleEmployee,
        break_bank_skipped: 0,
        bonus_holidays_earned: 1 // 4 breaks converted to 1 holiday
      };

      const result = calculateEmployeePayroll({
        employee: empWithBonusHoliday,
        days,
        settings: defaultSettings,
        daysInMonth: 30
      });

      expect(result.availableBonusHolidays).toBe(1);
      expect(result.totalPaidLeavesQuota).toBe(4); // 3 standard + 1 bonus = 4
      expect(result.paidLeavesLeft).toBe(4);
    });

    it('allows break bank and bonus holidays to carry across months seamlessly', () => {
      // Employee carried 2 banked breaks and 1 bonus holiday from October
      const carriedEmployee = {
        ...sampleEmployee,
        break_bank_skipped: 2,
        bonus_holidays_earned: 1,
        bonus_holidays_used: 0
      };

      const result = calculateEmployeePayroll({
        employee: carriedEmployee,
        days: [],
        settings: defaultSettings,
        daysInMonth: 30
      });

      expect(result.breakBankRemainder).toBe(2);
      expect(result.availableBonusHolidays).toBe(1);
      expect(result.totalPaidLeavesQuota).toBe(4);
    });
  });

  describe('7. Geofence & GPS Validation', () => {
    it('accepts Sparta Building coordinates within radius', () => {
      const res = validateGeofence({
        lat: 19.260423,
        lng: 72.979444,
        accuracy: 15,
        radiusMeters: 75
      });
      expect(res.allowed).toBe(true);
    });

    it('rejects coordinates far away (>1 km)', () => {
      const res = validateGeofence({
        lat: 19.250000,
        lng: 72.960000,
        accuracy: 20,
        radiusMeters: 75
      });
      expect(res.allowed).toBe(false);
      expect(res.error).toContain('away from Meats & Plants');
    });
  });
});
