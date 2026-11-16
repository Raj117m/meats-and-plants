/**
 * Meats & Plants — Payroll & Rules Engine v3
 * Deterministic, server-side attendance, geofence validation and salary computation
 * Supports both Daily Wage and Monthly Salary pay types, plus Break Bank Redemptions
 */

/**
 * Calculates haversine distance between two coordinates in meters.
 * @param {number} lat1
 * @param {number} lon1
 * @param {number} lat2
 * @param {number} lon2
 * @returns {number} distance in meters
 */
function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
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
 * Validates whether GPS coordinates fall within store geofence radius.
 * v4 Formula: Allow if distance - min(accuracy, 50) <= radius
 * If accuracy > 150m, prompt: "Weak GPS signal. Step near a window and tap retry".
 *
 * @param {Object} params
 * @param {number} params.lat
 * @param {number} params.lng
 * @param {number} [params.accuracy]
 * @param {number} params.storeLat
 * @param {number} params.storeLng
 * @param {number} [params.radiusMeters]
 * @returns {{ allowed: boolean, distance: number, error: string | null }}
 */
function validateGeofence({ lat, lng, accuracy = 0, storeLat = 19.2604227, storeLng = 72.9794437, radiusMeters = 75 }) {
  const numLat = Number(lat);
  const numLng = Number(lng);
  const numAcc = accuracy != null ? Number(accuracy) : 0;
  const numStoreLat = Number(storeLat);
  const numStoreLng = Number(storeLng);
  const numRadius = Number(radiusMeters) || 75;

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

  // Sparta Building Complex perimeter (Hiranandani Estate, Thane West)
  // Ensures any employee inside or around Sparta Building is recognized cleanly
  const isStoreAtSparta = Math.abs(numStoreLat - 19.2604227) < 0.005 && Math.abs(numStoreLng - 72.9794437) < 0.005;
  const isInsideSpartaBox = isStoreAtSparta && (numLat >= 19.2580 && numLat <= 19.2630 && numLng >= 72.9770 && numLng <= 72.9820);

  // Decision rule: distance - min(accuracy, 50) <= radius
  const effectiveDistance = distance - Math.min(numAcc, 50);

  if (isInsideSpartaBox || effectiveDistance <= numRadius || distance <= numRadius) {
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
 * Calculates payroll breakdown for an employee for a given month.
 *
 * @param {Object} params
 * @param {Object} params.employee - { id, name, monthly_salary, daily_wage, pay_type ('monthly'|'daily'), bonus_preference }
 * @param {Array} params.days - Array of day records for this employee in the month
 * @param {Array} [params.redemptions] - Array of break_redemptions in this month
 * @param {number} [params.totalSkippedBreaksAllTime]
 * @param {number} [params.totalRedeemedBreaksAllTime]
 * @param {Object} params.settings - {
 *   grace_minutes: 15,
 *   late_marks_per_half_day: 3,
 *   paid_leaves_per_month: 3,
 *   skipped_breaks_needed: 4,
 *   bonus_type: 'pay'
 * }
 * @param {number} params.daysInMonth - number of days in the month (e.g., 30 for Nov)
 * @returns {Object} Full payroll breakdown
 */
function calculateEmployeePayroll({
  employee,
  days = [],
  redemptions = null,
  totalSkippedBreaksAllTime = null,
  totalRedeemedBreaksAllTime = null,
  settings,
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

  const lateMarksPerHalfDay = settings?.late_marks_per_half_day || 3;
  const maxPaidLeaves = settings?.paid_leaves_per_month ?? 3;
  const skippedBreaksNeeded = settings?.skipped_breaks_needed || 4;
  const bonusPreference = employee.bonus_preference || settings?.bonus_type || 'pay';

  let presentDays = 0;
  let lateDaysCount = 0;
  let paidLeavesClaimed = 0;
  let unpaidDaysCount = 0;
  let manualHalfDaysCount = 0;
  let manualFullDaysCount = 0;
  let breaksBankedInMonth = 0;

  // Process day by day
  for (const day of days) {
    const status = day.status;
    const deduction = day.deduction || 'none';
    const isLate = Boolean(day.is_late);
    const breakSkipped = Boolean(day.break_skipped);

    if (isLate) {
      lateDaysCount++;
    }

    if (breakSkipped && (status === 'present' || status === 'late' || status === 'half_day')) {
      breaksBankedInMonth++;
    }

    if (deduction === 'half') {
      manualHalfDaysCount++;
    } else if (deduction === 'full') {
      manualFullDaysCount++;
    }

    if (status === 'present') {
      presentDays++;
    } else if (status === 'late') {
      presentDays++;
    } else if (status === 'half_day') {
      if (deduction === 'none') {
        manualHalfDaysCount++;
      }
    } else if (status === 'paid_leave') {
      paidLeavesClaimed++;
    } else if (status === 'unpaid_leave' || status === 'absent') {
      if (deduction === 'none') {
        unpaidDaysCount++;
      }
    }
  }

  // Cap paid leaves according to policy
  let paidLeavesUsed = 0;
  let extraLeavesTreatedAsUnpaid = 0;

  if (paidLeavesClaimed <= maxPaidLeaves) {
    paidLeavesUsed = paidLeavesClaimed;
  } else {
    paidLeavesUsed = maxPaidLeaves;
    extraLeavesTreatedAsUnpaid = paidLeavesClaimed - maxPaidLeaves;
  }

  const paidLeavesLeft = Math.max(0, maxPaidLeaves - paidLeavesUsed);

  // Total unpaid days = absent days + leaves exceeding paid quota + manual full days
  const totalUnpaidDays = unpaidDaysCount + extraLeavesTreatedAsUnpaid + manualFullDaysCount;

  // Late mark deductions
  const lateMarkDeductionUnits = Math.floor(lateDaysCount / lateMarksPerHalfDay);
  const lateMarkDeductionAmount = Math.round(lateMarkDeductionUnits * halfDayRate);

  // Unpaid days deduction
  const unpaidDaysDeductionAmount = Math.round(totalUnpaidDays * dailyRate);

  // Half day deduction
  const halfDaysDeductionAmount = Math.round(manualHalfDaysCount * halfDayRate);

  // Break bonus handling:
  // If redemptions array is provided, use actual redeemed bonuses
  let breakBonusAmount = 0;
  let breakBonusLeaves = 0;
  let availableBreakBank = 0;
  let totalSkippedAll = totalSkippedBreaksAllTime != null ? totalSkippedBreaksAllTime : breaksBankedInMonth;
  let totalRedeemedAll = totalRedeemedBreaksAllTime != null ? totalRedeemedBreaksAllTime : 0;

  if (redemptions !== null) {
    for (const r of redemptions) {
      if (r.type === 'pay') {
        breakBonusAmount += (r.amount || dailyRate);
      } else if (r.type === 'leave') {
        breakBonusLeaves += 1;
      }
    }
    availableBreakBank = Math.max(0, totalSkippedAll - totalRedeemedAll);
  } else {
    // Fallback for tests/legacy where redemptions not passed
    const completedBreakBonusTiers = Math.floor(breaksBankedInMonth / skippedBreaksNeeded);
    if (bonusPreference === 'pay') {
      breakBonusAmount = Math.round(completedBreakBonusTiers * dailyRate);
    } else {
      breakBonusLeaves = completedBreakBonusTiers;
    }
    availableBreakBank = breaksBankedInMonth % skippedBreaksNeeded;
  }

  let totalDeductions = 0;
  let netSalary = 0;

  if (payType === 'daily') {
    const grossEarned = (presentDays * dailyWage) + (paidLeavesUsed * dailyWage);
    const deductions = (manualHalfDaysCount * halfDayRate) + lateMarkDeductionAmount;
    totalDeductions = deductions;
    netSalary = Math.max(0, grossEarned - deductions + breakBonusAmount);
  } else {
    totalDeductions = unpaidDaysDeductionAmount + halfDaysDeductionAmount + lateMarkDeductionAmount;
    netSalary = Math.max(0, Math.round(baseSalary - totalDeductions + breakBonusAmount));
  }

  return {
    employeeId: employee.id,
    employeeName: employee.name,
    payType,
    dailyWage,
    baseSalary,
    dailyRate,
    halfDayRate,
    daysInMonth,
    presentDays,
    lateDaysCount,
    lateMarksLeftUntilDeduction: lateMarksPerHalfDay - (lateDaysCount % lateMarksPerHalfDay),
    lateMarkDeductionUnits,
    lateMarkDeductionAmount,
    paidLeavesUsed,
    paidLeavesLeft: paidLeavesLeft + breakBonusLeaves,
    totalUnpaidDays,
    unpaidDaysDeductionAmount,
    manualHalfDaysCount,
    halfDaysDeductionAmount,
    breaksBanked: breaksBankedInMonth,
    bankedBreaksRemainder: breaksBankedInMonth % skippedBreaksNeeded,
    availableBreakBank,
    canRedeemBreak: availableBreakBank >= skippedBreaksNeeded,
    skippedBreaksNeeded,
    breakBonusAmount,
    breakBonusLeaves,
    bonusPreference,
    totalDeductions,
    netSalary,
    todayEarning: dailyRate
  };
}

/**
 * Validates whether a punch-in timestamp is late according to shift start and grace period.
 */
function evaluateLateStatus(punchTimeString, shiftStartTime = "12:00", graceMinutes = 15) {
  let punchHour = 0;
  let punchMinute = 0;

  if (punchTimeString.includes('T')) {
    const d = new Date(punchTimeString);
    punchHour = d.getHours();
    punchMinute = d.getMinutes();
  } else {
    const [h, m] = punchTimeString.split(':').map(Number);
    punchHour = h;
    punchMinute = m;
  }

  const [shiftH, shiftM] = shiftStartTime.split(':').map(Number);
  const punchTotalMinutes = punchHour * 60 + punchMinute;
  const shiftTotalMinutes = shiftH * 60 + shiftM;
  const thresholdMinutes = shiftTotalMinutes + graceMinutes;

  if (punchTotalMinutes > thresholdMinutes) {
    return {
      isLate: true,
      minutesLate: punchTotalMinutes - shiftTotalMinutes
    };
  }

  return {
    isLate: false,
    minutesLate: 0
  };
}

/**
 * Validates Wi-Fi SSID (retained for backward compatibility)
 */
function validateWifiSsid(detectedSsid, allowedSsidsConfig = "ABHIGIT 5G") {
  if (!detectedSsid) return false;
  const allowed = allowedSsidsConfig
    .split(',')
    .map(s => s.trim().toUpperCase())
    .filter(Boolean);
  return allowed.includes(detectedSsid.trim().toUpperCase());
}

export {
  calculateDistanceMeters,
  validateGeofence,
  calculateEmployeePayroll,
  evaluateLateStatus,
  validateWifiSsid
};
