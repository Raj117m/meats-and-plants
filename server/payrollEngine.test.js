import { describe, it, expect } from 'vitest';
import {
  calculateEmployeePayroll,
  evaluateLateStatus,
  validateWifiSsid,
  calculateDistanceMeters,
  validateGeofence
} from './payrollEngine.js';

describe('Meats & Plants — Payroll & Rules Engine', () => {
  const defaultSettings = {
    grace_minutes: 15,
    late_marks_per_half_day: 3,
    paid_leaves_per_month: 3,
    skipped_breaks_needed: 4,
    bonus_type: 'pay'
  };

  const sampleEmployee = {
    id: 1,
    name: 'Aarav Sharma',
    monthly_salary: 18000,
    bonus_preference: 'pay'
  };

  it('correctly calculates base salary with perfect attendance (30 days in month)', () => {
    const days = Array.from({ length: 30 }, (_, i) => ({
      date: `2026-11-${String(i + 1).padStart(2, '0')}`,
      status: 'present',
      deduction: 'none',
      is_late: 0,
      break_skipped: 0
    }));

    const result = calculateEmployeePayroll({
      employee: sampleEmployee,
      days,
      settings: defaultSettings,
      daysInMonth: 30
    });

    expect(result.baseSalary).toBe(18000);
    expect(result.dailyRate).toBe(600); // 18000 / 30
    expect(result.halfDayRate).toBe(300);
    expect(result.totalDeductions).toBe(0);
    expect(result.breakBonusAmount).toBe(0);
    expect(result.netSalary).toBe(18000);
    expect(result.paidLeavesLeft).toBe(3);
  });

  describe('Geofence and GPS validation (v3 - Sparta Building, Thane West)', () => {
    const storeLat = 19.2604227;
    const storeLng = 72.9794437;
    const radiusMeters = 30;

    it('calculates distance correctly using Haversine formula', () => {
      // Same point = 0 distance
      expect(calculateDistanceMeters(storeLat, storeLng, storeLat, storeLng)).toBe(0);
      // ~1.3 km away
      const awayLat = 19.2500;
      const awayLng = 72.9700;
      const dist = calculateDistanceMeters(storeLat, storeLng, awayLat, awayLng);
      expect(dist).toBeGreaterThan(1000);
      expect(dist).toBeLessThan(2000);
    });

    it('allows punches inside the tight 30m geofence radius (inside Sparta Building)', () => {
      // Point 8 meters away
      const closeLat = storeLat + 0.00005;
      const closeLng = storeLng + 0.00005;
      const result = validateGeofence({
        lat: closeLat,
        lng: closeLng,
        accuracy: 10,
        storeLat,
        storeLng,
        radiusMeters
      });
      expect(result.allowed).toBe(true);
      expect(result.error).toBeNull();
    });

    it('blocks punches outside the 30m geofence radius with accuracy buffer', () => {
      const awayLat = 19.2500;
      const awayLng = 72.9700;
      const result = validateGeofence({
        lat: awayLat,
        lng: awayLng,
        accuracy: 15,
        storeLat,
        storeLng,
        radiusMeters
      });
      expect(result.allowed).toBe(false);
      expect(result.error).toContain('away from Meats & Plants');
    });

    it('rejects weak GPS signal (>150m) with retry prompt', () => {
      const result = validateGeofence({
        lat: storeLat,
        lng: storeLng,
        accuracy: 160,
        storeLat,
        storeLng,
        radiusMeters
      });
      expect(result.allowed).toBe(false);
      expect(result.error).toContain('Weak GPS signal');
    });
  });

  describe('Wi-Fi SSID lock', () => {
    it('allows ABHIGIT 5G', () => {
      expect(validateWifiSsid('ABHIGIT 5G', 'ABHIGIT 5G')).toBe(true);
      expect(validateWifiSsid('abhigit 5g', 'ABHIGIT 5G')).toBe(true); // case-insensitive
    });

    it('blocks ABHIGIT 4G or any unauthorized network', () => {
      expect(validateWifiSsid('ABHIGIT 4G', 'ABHIGIT 5G')).toBe(false);
      expect(validateWifiSsid('Cafe_Guest_Wifi', 'ABHIGIT 5G')).toBe(false);
      expect(validateWifiSsid(null, 'ABHIGIT 5G')).toBe(false);
      expect(validateWifiSsid('', 'ABHIGIT 5G')).toBe(false);
    });

    it('supports multiple comma-separated allowed SSIDs if configured', () => {
      expect(validateWifiSsid('ABHIGIT 5G', 'ABHIGIT 5G, CAFE_BACKUP_5G')).toBe(true);
      expect(validateWifiSsid('CAFE_BACKUP_5G', 'ABHIGIT 5G, CAFE_BACKUP_5G')).toBe(true);
      expect(validateWifiSsid('ABHIGIT 4G', 'ABHIGIT 5G, CAFE_BACKUP_5G')).toBe(false);
    });
  });

  describe('Grace Period and Late Mark Evaluation', () => {
    it('marks 12:00 to 12:15 as on-time within 15-minute grace period', () => {
      expect(evaluateLateStatus('12:00', '12:00', 15).isLate).toBe(false);
      expect(evaluateLateStatus('12:14', '12:00', 15).isLate).toBe(false);
      expect(evaluateLateStatus('12:15', '12:00', 15).isLate).toBe(false);
    });

    it('marks 12:16 and later as late with correct minutes late', () => {
      const lateCheck = evaluateLateStatus('12:16', '12:00', 15);
      expect(lateCheck.isLate).toBe(true);
      expect(lateCheck.minutesLate).toBe(16);

      const severeLate = evaluateLateStatus('12:45', '12:00', 15);
      expect(severeLate.isLate).toBe(true);
      expect(severeLate.minutesLate).toBe(45);
    });
  });

  describe('Late Marks Deduction Rule (3 Late Marks = 1/2 Day Deduction)', () => {
    it('applies no deduction for 1 or 2 late marks', () => {
      const days = [
        { date: '2026-11-01', status: 'late', is_late: 1, deduction: 'none' },
        { date: '2026-11-02', status: 'late', is_late: 1, deduction: 'none' }
      ];

      const result = calculateEmployeePayroll({
        employee: sampleEmployee,
        days,
        settings: defaultSettings,
        daysInMonth: 30
      });

      expect(result.lateDaysCount).toBe(2);
      expect(result.lateMarkDeductionUnits).toBe(0);
      expect(result.lateMarkDeductionAmount).toBe(0);
      expect(result.netSalary).toBe(18000);
    });

    it('deducts 1/2 day (₹300) when exactly 3 late marks occur', () => {
      const days = [
        { date: '2026-11-01', status: 'late', is_late: 1, deduction: 'none' },
        { date: '2026-11-02', status: 'late', is_late: 1, deduction: 'none' },
        { date: '2026-11-03', status: 'late', is_late: 1, deduction: 'none' }
      ];

      const result = calculateEmployeePayroll({
        employee: sampleEmployee,
        days,
        settings: defaultSettings,
        daysInMonth: 30
      });

      expect(result.lateDaysCount).toBe(3);
      expect(result.lateMarkDeductionUnits).toBe(1);
      expect(result.lateMarkDeductionAmount).toBe(300); // 1/2 day = ₹300
      expect(result.netSalary).toBe(17700);
    });

    it('deducts 1 full day (2 x 1/2 day = ₹600) when 6 late marks occur', () => {
      const days = Array.from({ length: 6 }, (_, i) => ({
        date: `2026-11-${String(i + 1).padStart(2, '0')}`,
        status: 'late',
        is_late: 1,
        deduction: 'none'
      }));

      const result = calculateEmployeePayroll({
        employee: sampleEmployee,
        days,
        settings: defaultSettings,
        daysInMonth: 30
      });

      expect(result.lateDaysCount).toBe(6);
      expect(result.lateMarkDeductionUnits).toBe(2);
      expect(result.lateMarkDeductionAmount).toBe(600);
      expect(result.netSalary).toBe(17400);
    });
  });

  describe('Paid Leaves (3 per month quota, subsequent unpaid)', () => {
    it('allows up to 3 paid leaves with zero deduction', () => {
      const days = [
        { date: '2026-11-04', status: 'paid_leave', deduction: 'none' },
        { date: '2026-11-05', status: 'paid_leave', deduction: 'none' },
        { date: '2026-11-06', status: 'paid_leave', deduction: 'none' }
      ];

      const result = calculateEmployeePayroll({
        employee: sampleEmployee,
        days,
        settings: defaultSettings,
        daysInMonth: 30
      });

      expect(result.paidLeavesUsed).toBe(3);
      expect(result.paidLeavesLeft).toBe(0);
      expect(result.totalUnpaidDays).toBe(0);
      expect(result.unpaidDaysDeductionAmount).toBe(0);
      expect(result.netSalary).toBe(18000);
    });

    it('automatically treats the 4th leave as unpaid (1 daily rate deduction)', () => {
      const days = [
        { date: '2026-11-01', status: 'paid_leave', deduction: 'none' },
        { date: '2026-11-02', status: 'paid_leave', deduction: 'none' },
        { date: '2026-11-03', status: 'paid_leave', deduction: 'none' },
        { date: '2026-11-04', status: 'paid_leave', deduction: 'none' } // 4th
      ];

      const result = calculateEmployeePayroll({
        employee: sampleEmployee,
        days,
        settings: defaultSettings,
        daysInMonth: 30
      });

      expect(result.paidLeavesUsed).toBe(3);
      expect(result.totalUnpaidDays).toBe(1);
      expect(result.unpaidDaysDeductionAmount).toBe(600); // 1 full daily rate = ₹600
      expect(result.netSalary).toBe(17400);
    });
  });

  describe('Skipped Break Banking & Bonus (4 skipped breaks = +1 day pay or +1 leave)', () => {
    it('banks 3 skipped breaks without triggering bonus yet (3 of 4 dots)', () => {
      const days = [
        { date: '2026-11-01', status: 'present', break_skipped: 1, deduction: 'none' },
        { date: '2026-11-02', status: 'present', break_skipped: 1, deduction: 'none' },
        { date: '2026-11-03', status: 'present', break_skipped: 1, deduction: 'none' }
      ];

      const result = calculateEmployeePayroll({
        employee: sampleEmployee,
        days,
        settings: defaultSettings,
        daysInMonth: 30
      });

      expect(result.breaksBanked).toBe(3);
      expect(result.bankedBreaksRemainder).toBe(3);
      expect(result.breakBonusAmount).toBe(0);
      expect(result.netSalary).toBe(18000);
    });

    it('awards +1 day pay (₹600) upon reaching 4 skipped breaks (bonus_preference = pay)', () => {
      const days = [
        { date: '2026-11-01', status: 'present', break_skipped: 1, deduction: 'none' },
        { date: '2026-11-02', status: 'present', break_skipped: 1, deduction: 'none' },
        { date: '2026-11-03', status: 'present', break_skipped: 1, deduction: 'none' },
        { date: '2026-11-04', status: 'present', break_skipped: 1, deduction: 'none' }
      ];

      const result = calculateEmployeePayroll({
        employee: { ...sampleEmployee, bonus_preference: 'pay' },
        days,
        settings: defaultSettings,
        daysInMonth: 30
      });

      expect(result.breaksBanked).toBe(4);
      expect(result.bankedBreaksRemainder).toBe(0);
      expect(result.breakBonusAmount).toBe(600);
      expect(result.netSalary).toBe(18600); // Base 18000 + 600 bonus
    });

    it('awards +1 paid leave upon reaching 4 skipped breaks (bonus_preference = leave)', () => {
      const days = [
        { date: '2026-11-01', status: 'present', break_skipped: 1, deduction: 'none' },
        { date: '2026-11-02', status: 'present', break_skipped: 1, deduction: 'none' },
        { date: '2026-11-03', status: 'present', break_skipped: 1, deduction: 'none' },
        { date: '2026-11-04', status: 'present', break_skipped: 1, deduction: 'none' }
      ];

      const result = calculateEmployeePayroll({
        employee: { ...sampleEmployee, bonus_preference: 'leave' },
        days,
        settings: defaultSettings,
        daysInMonth: 30
      });

      expect(result.breaksBanked).toBe(4);
      expect(result.breakBonusLeaves).toBe(1);
      expect(result.paidLeavesLeft).toBe(4); // 3 standard + 1 bonus = 4
      expect(result.breakBonusAmount).toBe(0);
      expect(result.netSalary).toBe(18000);
    });
  });

  describe('Owner Manual Overrides & Deductions', () => {
    it('applies owner manual half-day deduction and full-day deduction', () => {
      const days = [
        { date: '2026-11-01', status: 'present', deduction: 'half', manual_override: 1 },
        { date: '2026-11-02', status: 'absent', deduction: 'full', manual_override: 1 }
      ];

      const result = calculateEmployeePayroll({
        employee: sampleEmployee,
        days,
        settings: defaultSettings,
        daysInMonth: 30
      });

      // Half day = 300, Full day = 600
      expect(result.manualHalfDaysCount).toBe(1);
      expect(result.halfDaysDeductionAmount).toBe(300);
      expect(result.totalUnpaidDays).toBe(1);
      expect(result.unpaidDaysDeductionAmount).toBe(600);
      expect(result.totalDeductions).toBe(900);
      expect(result.netSalary).toBe(17100);
    });
  });
});
