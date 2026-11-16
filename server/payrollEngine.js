/**
 * Meats & Plants — Payroll & Rules Engine v5 (Quartz Edition)
 * Deterministic state machine, attendance validation, 
 * late mark half-day rule, automatic paid->unpaid leave calculation,
 * government holiday exemption, and 4-break holiday banking.
 */

/**
 * Calculates haversine distance between two coordinates in meters.
 * @param {number} lat1
 * @param {number} lon1
 * @param {number} lat2
 * @param {number} lon2
 * @returns {number} distance in meters
 */
export function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return Infinity;
  const R = 6371000; // Earth's radius in meters
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Validates GPS location against store geofence.
 * v5 Formula: Allow if distance - min(accuracy, 50) <= radius
 * If accuracy > 150m, prompt: "Weak GPS signal. Step near a window and tap retry".
 */
export function validateGeofence({
  lat,
  lng,
  accuracy = 0,
  storeLat = 19.2584498,
  storeLng = 72.977272,
  radiusMeters = 150
}) {
  const numLat = Number(lat);
  const numLng = Number(lng);
  const numAcc = accuracy != null ? Number(accuracy) : 0;
  const numStoreLat = Number(storeLat);
  const numStoreLng = Number(storeLng);
  const numRadius = Number(radiusMeters) || 150;

  if (isNaN(numLat) || isNaN(numLng)) {
    return { allowed: false, distance: Infinity, error: 'Location coordinates are required.' };
  }

  const distance = calculateDistanceMeters(numLat, numLng, numStoreLat, numStoreLng);

  if (numAcc > 150) {
    return {
      allowed: false,
      distance,
      error: `Weak GPS signal (±${Math.round(numAcc)}m). Step near a window and tap retry.`
    };
  }

  // Hiranandani Estate, Thane West perimeter
  const isStoreAtHiranandani = Math.abs(numStoreLat - 19.2584498) < 0.005 && Math.abs(numStoreLng - 72.977272) < 0.005;
  const isInsideHiranandaniBox = isStoreAtHiranandani && (numLat >= 19.2550 && numLat <= 19.2630 && numLng >= 72.9730 && numLng <= 72.9820);

  const effectiveDistance = distance - Math.min(numAcc, 50);

  if (isInsideHiranandaniBox || effectiveDistance <= numRadius || distance <= numRadius) {
    return { allowed: true, distance, error: null };
  }

  const distText = distance >= 1000 ? `${(distance / 1000).toFixed(1)} km` : `${distance} m`;
  return {
    allowed: false,
    distance,
    error: `You are ${distText} away from Meats & Plants. Must be within ${numRadius}m to enter shift.`
  };
}

/**
 * Validates Wi-Fi SSID
 */
export function validateWifiSsid(currentSsid, allowedSsids) {
  if (!currentSsid || !allowedSsids) return false;
  const allowedList = allowedSsids
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return allowedList.includes(currentSsid.trim().toLowerCase());
}

/**
 * Section 2: Late rule
 * Grace period: 15 minutes after shift start (editable by owner, default 15).
 * Check-in within grace period = on time.
 * Check-in after grace period = Half Day (half a day's pay deducted).
 *
 * @param {string} checkInTimeString - 'HH:MM' or ISO string
 * @param {string} shiftStartTime - 'HH:MM' (default '12:00')
 * @param {number} graceMinutes - default 15
 * @returns {{ isLate: boolean, isHalfDay: boolean, minutesLate: number, deduction: 'none' | 'half' }}
 */
export function evaluateLateStatus(checkInTimeString, shiftStartTime = '12:00', graceMinutes = 15) {
  if (!checkInTimeString) {
    return { isLate: false, isHalfDay: false, minutesLate: 0, deduction: 'none' };
  }

  let timeStr = checkInTimeString;
  if (timeStr.includes('T')) {
    // Extract HH:MM in Asia/Kolkata
    try {
      const d = new Date(timeStr);
      timeStr = d.toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false });
    } catch {
      timeStr = timeStr.split('T')[1]?.substring(0, 5) || '12:00';
    }
  }

  const [inH, inM] = timeStr.split(':').map(Number);
  const [startH, startM] = shiftStartTime.split(':').map(Number);

  const inTotalMin = inH * 60 + inM;
  const startTotalMin = startH * 60 + startM;
  const graceCutoffMin = startTotalMin + graceMinutes;

  if (inTotalMin <= graceCutoffMin) {
    return {
      isLate: false,
      isHalfDay: false,
      minutesLate: 0,
      deduction: 'none'
    };
  }

  const minutesLate = inTotalMin - startTotalMin;
  return {
    isLate: true,
    isHalfDay: true,
    minutesLate,
    deduction: 'half'
  };
}

/**
 * Section 1: Computes the complete Day State for an employee on a given date.
 * State Machine:
 * NOT_STARTED -> ON_SHIFT -> ON_BREAK -> ON_SHIFT -> ENDED
 * 
 * Auto-ends break at 3 hours (180 minutes).
 */
export function computeEmployeeDayState({
  employee,
  date,
  punches = [],
  dayRecord = null,
  nowMs = Date.now(),
  breakLengthMinutes = 180
}) {
  const checkIn = punches.find((p) => p.type === 'check_in');
  const checkOut = punches.find((p) => p.type === 'check_out');
  const breakStart = [...punches].reverse().find((p) => p.type === 'start_break');
  const breakEnd = [...punches].reverse().find((p) => p.type === 'end_break');

  const maxBreakSec = breakLengthMinutes * 60; // 180 min = 10,800 sec

  let status = 'NOT_STARTED';
  let shiftStart = checkIn ? checkIn.timestamp : null;
  let shiftEnd = checkOut ? checkOut.timestamp : null;
  let bStart = breakStart ? breakStart.timestamp : null;
  let bEnd = breakEnd ? breakEnd.timestamp : null;
  let breakUsed = Boolean(bStart);
  let workedSeconds = 0;
  let breakRemainingSeconds = 0;

  if (checkOut) {
    status = 'ENDED';
  } else if (bStart) {
    const bStartMs = new Date(bStart).getTime();
    if (bEnd) {
      // Break was manually or auto ended
      status = 'ON_SHIFT';
    } else {
      // Active break check
      const elapsedBreakSec = Math.max(0, Math.floor((nowMs - bStartMs) / 1000));
      if (elapsedBreakSec >= maxBreakSec) {
        // Break auto-ended at 3h
        status = 'ON_SHIFT';
        bEnd = new Date(bStartMs + maxBreakSec * 1000).toISOString();
        breakRemainingSeconds = 0;
      } else {
        status = 'ON_BREAK';
        breakRemainingSeconds = maxBreakSec - elapsedBreakSec;
      }
    }
  } else if (checkIn) {
    status = 'ON_SHIFT';
  } else {
    status = 'NOT_STARTED';
  }

  // Calculate worked seconds:
  // worked = now - shiftStart - breakDuration
  if (shiftStart) {
    const startMs = new Date(shiftStart).getTime();
    const endMs = shiftEnd ? new Date(shiftEnd).getTime() : nowMs;

    let breakDurationMs = 0;
    if (bStart) {
      const bStartMs = new Date(bStart).getTime();
      const bEndMs = bEnd ? new Date(bEnd).getTime() : Math.min(nowMs, bStartMs + maxBreakSec * 1000);
      breakDurationMs = Math.max(0, bEndMs - bStartMs);
    }

    if (status === 'ON_BREAK') {
      // While on break, worked time freezes at break start
      const bStartMs = new Date(bStart).getTime();
      workedSeconds = Math.max(0, Math.floor((bStartMs - startMs) / 1000));
    } else {
      workedSeconds = Math.max(0, Math.floor((endMs - startMs - breakDurationMs) / 1000));
    }
  }

  // Late mark & deduction
  const isLate = Boolean(dayRecord?.is_late);
  const lateMinutes = dayRecord?.late_minutes || 0;
  const deduction = dayRecord?.deduction || 'none';
  const isHalfDay = deduction === 'half' || dayRecord?.status === 'half_day';
  const breakSkipped = Boolean(dayRecord?.break_skipped);

  return {
    status,
    shiftStart,
    breakStart: bStart,
    breakEnd: bEnd,
    breakUsed,
    shiftEnd,
    workedSeconds,
    breakRemainingSeconds,
    date,
    isLate,
    lateMinutes,
    isHalfDay,
    deduction,
    breakSkipped,
    punches
  };
}

/**
 * Validates and applies state transitions for punches.
 * 
 * NOT_STARTED -> startShift -> ON_SHIFT
 * ON_SHIFT    -> startBreak -> ON_BREAK (only if no break taken today)
 * ON_BREAK    -> endBreak   -> ON_SHIFT
 * ON_SHIFT    -> endShift   -> ENDED
 * ON_BREAK    -> endShift   -> ENDED (break auto-closed)
 */
export function validateStateTransition(currentStatus, action, breakAlreadyUsed = false) {
  const normAction = (action || '').toLowerCase().replace(/_/g, '');

  if (normAction === 'startshift' || normAction === 'checkin') {
    if (currentStatus !== 'NOT_STARTED') {
      throw new Error(`Cannot start shift: current status is ${currentStatus}.`);
    }
    return 'ON_SHIFT';
  }

  if (normAction === 'startbreak') {
    if (currentStatus !== 'ON_SHIFT') {
      throw new Error(`Cannot start break: shift must be active (current status: ${currentStatus}).`);
    }
    if (breakAlreadyUsed) {
      throw new Error('Break already taken today. Only one 3-hour break is allowed per shift.');
    }
    return 'ON_BREAK';
  }

  if (normAction === 'endbreak') {
    if (currentStatus !== 'ON_BREAK') {
      throw new Error(`Cannot end break: employee is not currently on break (status: ${currentStatus}).`);
    }
    return 'ON_SHIFT';
  }

  if (normAction === 'endshift' || normAction === 'checkout') {
    if (currentStatus !== 'ON_SHIFT' && currentStatus !== 'ON_BREAK') {
      throw new Error(`Cannot end shift: employee is not on shift or break (status: ${currentStatus}).`);
    }
    return 'ENDED';
  }

  throw new Error(`Unknown punch action: ${action}`);
}

/**
 * Section 3 & 4 & 5 & 8: Full Month Payroll Calculation
 *
 * Rules:
 * - Paid leaves quota: 3 standard + bonus holidays earned - bonus holidays used.
 * - In date order, leaves 1-3 are Paid (0 deduction). Leaves 4+ are Unpaid (1 daily rate deduction).
 * - Government holidays never count as leave and never deduct pay.
 * - Late check-in (>15m) = Half Day = 1/2 daily rate deducted (unless owner override).
 * - 4 banked breaks = 1 bonus paid holiday credited.
 */
export function calculateEmployeePayroll({
  employee,
  days = [],
  holidays = [],
  settings = {},
  daysInMonth = 30
}) {
  const payType = employee.pay_type || 'monthly';
  let baseSalary = Number(employee.monthly_salary) || 0;
  let dailyWage = Number(employee.daily_wage) || 0;

  if (payType === 'daily') {
    if (!dailyWage && baseSalary > 0) {
      dailyWage = Math.round(baseSalary / daysInMonth);
    }
    baseSalary = dailyWage * daysInMonth;
  } else {
    if (!dailyWage && baseSalary > 0 && daysInMonth > 0) {
      dailyWage = Math.round(baseSalary / daysInMonth);
    }
  }

  const dailyRate = dailyWage;
  const halfDayRate = Math.round(dailyRate / 2);

  // Bonus holidays from break bank
  const bonusHolidaysEarned = employee.bonus_holidays_earned || 0;
  const bonusHolidaysUsed = employee.bonus_holidays_used || 0;
  const availableBonusHolidays = Math.max(0, bonusHolidaysEarned - bonusHolidaysUsed);

  // Base quota + available bonus holidays
  const basePaidLeavesQuota = employee.paid_leaves_quota ?? settings?.paid_leaves_per_month ?? 3;
  const totalPaidLeavesQuota = basePaidLeavesQuota + availableBonusHolidays;

  const holidayDateSet = new Set((holidays || []).map((h) => h.date));

  let presentDays = 0;
  let holidayDaysCount = 0;
  let halfDaysCount = 0;
  let absentDaysCount = 0;
  let breaksBanked = 0;

  // Collect leave days sorted by date ascending
  const rawLeaves = [];

  for (const day of days) {
    const isHoliday = holidayDateSet.has(day.date);
    const status = day.status;
    const deduction = day.deduction || 'none';
    const breakSkipped = Boolean(day.break_skipped);

    if (breakSkipped && (status === 'present' || status === 'late' || status === 'half_day')) {
      breaksBanked++;
    }

    if (isHoliday) {
      holidayDaysCount++;
      if (status === 'present' || status === 'late') {
        presentDays++;
      }
      // Government holidays never deduct pay
      continue;
    }

    // Manual override checks
    if (deduction === 'half' || status === 'half_day') {
      halfDaysCount++;
      presentDays++; // Counted as half day present
    } else if (deduction === 'full' || status === 'absent') {
      absentDaysCount++;
    } else if (status === 'present' || status === 'late') {
      presentDays++;
    } else if (status === 'paid_leave' || status === 'unpaid_leave' || status === 'leave') {
      rawLeaves.push(day);
    }
  }

  // Sort leaves by date ascending to assign paid/unpaid deterministically
  rawLeaves.sort((a, b) => a.date.localeCompare(b.date));

  let paidLeavesUsed = 0;
  let unpaidLeavesCount = 0;

  for (let i = 0; i < rawLeaves.length; i++) {
    if (i < totalPaidLeavesQuota) {
      paidLeavesUsed++;
    } else {
      unpaidLeavesCount++;
    }
  }

  const paidLeavesLeft = Math.max(0, totalPaidLeavesQuota - paidLeavesUsed);
  const totalUnpaidDays = unpaidLeavesCount + absentDaysCount;

  // Deductions
  const unpaidDaysDeductionAmount = totalUnpaidDays * dailyRate;
  const halfDaysDeductionAmount = halfDaysCount * halfDayRate;
  const totalDeductions = unpaidDaysDeductionAmount + halfDaysDeductionAmount;

  let netSalary = 0;
  if (payType === 'daily') {
    const grossEarned = (presentDays * dailyRate) + (paidLeavesUsed * dailyRate);
    netSalary = Math.max(0, grossEarned - halfDaysDeductionAmount);
  } else {
    netSalary = Math.max(0, baseSalary - totalDeductions);
  }

  return {
    employeeId: employee.id,
    employeeName: employee.name,
    role: employee.role,
    payType,
    baseSalary,
    dailyWage: dailyRate,
    dailyRate,
    halfDayRate,
    workingDays: daysInMonth,
    presentDays,
    paidLeavesUsed,
    paidLeavesLeft,
    totalPaidLeavesQuota,
    availableBonusHolidays,
    holidayDaysCount,
    unpaidDaysCount: totalUnpaidDays,
    halfDaysCount,
    grossSalary: baseSalary,
    unpaidDaysDeductionAmount,
    halfDaysDeductionAmount,
    totalDeductions,
    netSalary,
    breaksBanked,
    breakBankRemainder: (employee.break_bank_skipped || breaksBanked) % 4
  };
}
