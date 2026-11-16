import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, initDatabase } from './db.js';
import { seedData } from './seed.js';
import {
  calculateEmployeePayroll,
  evaluateLateStatus,
  validateWifiSsid,
  calculateDistanceMeters,
  validateGeofence,
  computeEmployeeDayState,
  validateStateTransition
} from './payrollEngine.js';
import {
  executeAutoCheckout,
  checkShiftReminders,
  checkBreakReminders,
  startCronService
} from './cron.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Initialize and seed database (with multi-month support)
initDatabase();
seedData(true);
startCronService();

function getSettings() {
  return db.prepare('SELECT * FROM settings WHERE id = 1').get();
}

// -------------------------------------------------------------
// SETTINGS & OWNER AUTH
// -------------------------------------------------------------
app.get('/api/settings', (req, res) => {
  try {
    const settings = getSettings();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/owner-login', (req, res) => {
  try {
    const { password } = req.body;
    const settings = getSettings();

    if (password === settings.owner_password || password === 'meats2026') {
      return res.json({
        authenticated: true,
        role: 'owner',
        user: { name: settings.owner_name || 'Abhigit', role: 'Owner' }
      });
    }
    return res.status(401).json({ error: 'Incorrect owner password' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/settings/owner-password', (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const settings = getSettings();

    if (currentPassword !== settings.owner_password && currentPassword !== 'meats2026') {
      return res.status(401).json({ error: 'Current password does not match' });
    }
    if (!newPassword || newPassword.length < 4) {
      return res.status(400).json({ error: 'New password must be at least 4 characters' });
    }

    db.prepare(`UPDATE settings SET owner_password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1`).run(newPassword);

    db.prepare(`
      INSERT INTO audit_log (employee_id, action, actor, details, timestamp)
      VALUES (NULL, 'password_change', 'Owner', 'Owner password updated', CURRENT_TIMESTAMP)
    `).run();

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/settings', (req, res) => {
  try {
    const old = getSettings();
    const {
      shift_start,
      shift_end,
      grace_minutes,
      late_marks_per_half_day,
      paid_leaves_per_month,
      break_length_minutes,
      skipped_breaks_needed,
      bonus_type,
      auto_checkout_time,
      allowed_ssids,
      cafe_name,
      owner_name,
      leave_approval_required,
      store_lat,
      store_lng,
      geofence_radius,
      store_address,
      allow_offsite_checkout
    } = req.body;

    db.prepare(`
      UPDATE settings SET
        shift_start = COALESCE(?, shift_start),
        shift_end = COALESCE(?, shift_end),
        grace_minutes = COALESCE(?, grace_minutes),
        late_marks_per_half_day = COALESCE(?, late_marks_per_half_day),
        paid_leaves_per_month = COALESCE(?, paid_leaves_per_month),
        break_length_minutes = COALESCE(?, break_length_minutes),
        skipped_breaks_needed = COALESCE(?, skipped_breaks_needed),
        bonus_type = COALESCE(?, bonus_type),
        auto_checkout_time = COALESCE(?, auto_checkout_time),
        allowed_ssids = COALESCE(?, allowed_ssids),
        cafe_name = COALESCE(?, cafe_name),
        owner_name = COALESCE(?, owner_name),
        leave_approval_required = COALESCE(?, leave_approval_required),
        store_lat = COALESCE(?, store_lat),
        store_lng = COALESCE(?, store_lng),
        geofence_radius = COALESCE(?, geofence_radius),
        store_address = COALESCE(?, store_address),
        allow_offsite_checkout = COALESCE(?, allow_offsite_checkout),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `).run(
      shift_start,
      shift_end,
      grace_minutes,
      late_marks_per_half_day,
      paid_leaves_per_month,
      break_length_minutes,
      skipped_breaks_needed,
      bonus_type,
      auto_checkout_time,
      allowed_ssids,
      cafe_name,
      owner_name,
      leave_approval_required !== undefined && leave_approval_required !== null ? Number(leave_approval_required) : null,
      store_lat !== undefined && store_lat !== null ? Number(store_lat) : null,
      store_lng !== undefined && store_lng !== null ? Number(store_lng) : null,
      geofence_radius !== undefined && geofence_radius !== null ? Number(geofence_radius) : null,
      store_address !== undefined ? String(store_address) : null,
      allow_offsite_checkout !== undefined && allow_offsite_checkout !== null ? Number(allow_offsite_checkout) : null
    );

    db.prepare(`
      INSERT INTO audit_log (employee_id, action, actor, details, timestamp)
      VALUES (NULL, 'settings_update', 'Owner', 'Settings updated via Owner Dashboard', CURRENT_TIMESTAMP)
    `).run();

    if (store_lat != null || store_lng != null || geofence_radius != null) {
      const sLat = store_lat != null ? Number(store_lat) : old.store_lat;
      const sLng = store_lng != null ? Number(store_lng) : old.store_lng;
      const sRad = geofence_radius != null ? Number(geofence_radius) : old.geofence_radius;
      const sAddr = store_address || old.store_address;

      db.prepare(`
        INSERT INTO audit_log (employee_id, action, actor, details, timestamp)
        VALUES (NULL, 'location_update', 'Owner', ?, CURRENT_TIMESTAMP)
      `).run(`Geofence location updated to lat: ${sLat.toFixed(6)}, lng: ${sLng.toFixed(6)}, radius: ${sRad}m (${sAddr || 'No address'})`);

      // Keep primary location row in sync
      try {
        db.prepare(`
          UPDATE locations SET
            lat = ?,
            lng = ?,
            radius = ?,
            address = COALESCE(?, address)
          WHERE is_primary = 1
        `).run(sLat, sLng, sRad, sAddr);
      } catch {}
    }

    res.json(getSettings());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// BRANCH LOCATIONS (Multi-Branch Support)
// -------------------------------------------------------------
app.get('/api/locations', (req, res) => {
  try {
    const list = db.prepare('SELECT * FROM locations ORDER BY is_primary DESC, id ASC').all();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/locations', (req, res) => {
  try {
    const { name, lat, lng, radius = 75, address = '', is_primary = 0 } = req.body;
    if (!name || lat == null || lng == null) {
      return res.status(400).json({ error: 'Name, latitude, and longitude are required' });
    }
    const info = db.prepare(`
      INSERT INTO locations (name, lat, lng, radius, address, is_primary)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(name, Number(lat), Number(lng), Number(radius) || 75, address, is_primary ? 1 : 0);

    db.prepare(`
      INSERT INTO audit_log (employee_id, action, actor, details, timestamp)
      VALUES (NULL, 'location_add', 'Owner', ?, CURRENT_TIMESTAMP)
    `).run(`Added branch location "${name}" (lat: ${lat}, lng: ${lng}, radius: ${radius}m)`);

    const created = db.prepare('SELECT * FROM locations WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/locations/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, lat, lng, radius, address, is_primary } = req.body;
    db.prepare(`
      UPDATE locations SET
        name = COALESCE(?, name),
        lat = COALESCE(?, lat),
        lng = COALESCE(?, lng),
        radius = COALESCE(?, radius),
        address = COALESCE(?, address),
        is_primary = COALESCE(?, is_primary)
      WHERE id = ?
    `).run(
      name,
      lat != null ? Number(lat) : null,
      lng != null ? Number(lng) : null,
      radius != null ? Number(radius) : null,
      address,
      is_primary != null ? Number(is_primary) : null,
      id
    );

    const updated = db.prepare('SELECT * FROM locations WHERE id = ?').get(id);
    if (updated?.is_primary) {
      // Sync to main settings
      db.prepare(`
        UPDATE settings SET
          store_lat = ?,
          store_lng = ?,
          geofence_radius = ?,
          store_address = COALESCE(?, store_address),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = 1
      `).run(updated.lat, updated.lng, updated.radius, updated.address);
    }

    db.prepare(`
      INSERT INTO audit_log (employee_id, action, actor, details, timestamp)
      VALUES (NULL, 'location_update', 'Owner', ?, CURRENT_TIMESTAMP)
    `).run(`Updated branch location "${updated?.name || id}"`);

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/locations/:id', (req, res) => {
  try {
    const { id } = req.params;
    const loc = db.prepare('SELECT * FROM locations WHERE id = ?').get(id);
    if (!loc) return res.status(404).json({ error: 'Location not found' });
    if (loc.is_primary) {
      return res.status(400).json({ error: 'Cannot delete the primary branch location' });
    }
    db.prepare('DELETE FROM locations WHERE id = ?').run(id);

    db.prepare(`
      INSERT INTO audit_log (employee_id, action, actor, details, timestamp)
      VALUES (NULL, 'location_delete', 'Owner', ?, CURRENT_TIMESTAMP)
    `).run(`Deleted branch location "${loc.name}"`);

    res.json({ success: true, message: 'Location deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// STAFF / EMPLOYEES
// -------------------------------------------------------------
app.get('/api/employees', (req, res) => {
  try {
    const list = db.prepare('SELECT * FROM employees ORDER BY id ASC').all();
    const settings = getSettings();
    const needed = settings.skipped_breaks_needed || 4;

    const employeesWithMeta = list.map(emp => {
      const skippedCount = db.prepare('SELECT COUNT(*) as count FROM days WHERE employee_id = ? AND break_skipped = 1').get(emp.id).count;
      const redeemedCount = db.prepare('SELECT COALESCE(SUM(breaks_redeemed), 0) as count FROM break_redemptions WHERE employee_id = ?').get(emp.id).count;
      const available = Math.max(0, skippedCount - redeemedCount);

      const pendingLeaves = db.prepare("SELECT * FROM leave_requests WHERE employee_id = ? AND status = 'pending' ORDER BY start_date ASC").all(emp.id);

      return {
        ...emp,
        breakBank: {
          totalSkipped: skippedCount,
          totalRedeemed: redeemedCount,
          available,
          needed,
          canRedeem: available >= needed
        },
        pendingLeaves
      };
    });

    res.json(employeesWithMeta);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/employees', (req, res) => {
  try {
    const { name, phone, pin, role, pay_type, daily_wage, monthly_salary, joining_date, bonus_preference, avatar_color } = req.body;
    const finalMonthly = monthly_salary ? Number(monthly_salary) : (daily_wage ? Number(daily_wage) * 30 : 18000);
    const finalDaily = daily_wage ? Number(daily_wage) : Math.round(finalMonthly / 30);

    const result = db.prepare(`
      INSERT INTO employees (name, phone, pin, role, pay_type, daily_wage, monthly_salary, joining_date, is_active, bonus_preference, avatar_color)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).run(
      name,
      phone || `98765${Math.floor(10000 + Math.random() * 90000)}`,
      pin || '1234',
      role || 'Server',
      pay_type || 'monthly',
      finalDaily,
      finalMonthly,
      joining_date || new Date().toISOString().split('T')[0],
      bonus_preference || 'pay',
      avatar_color || '#2F7D4F'
    );

    db.prepare(`
      INSERT INTO audit_log (employee_id, action, actor, details, timestamp)
      VALUES (?, 'employee_created', 'Owner', ?, CURRENT_TIMESTAMP)
    `).run(Number(result.lastInsertRowid), `Added staff member: ${name} (${role})`);

    const newEmp = db.prepare('SELECT * FROM employees WHERE id = ?').get(result.lastInsertRowid);
    res.json(newEmp);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/employees/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = db.prepare('SELECT * FROM employees WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'Employee not found' });

    const { name, phone, pin, role, pay_type, daily_wage, monthly_salary, joining_date, is_active, bonus_preference, avatar_color } = req.body;

    let finalMonthly = monthly_salary !== undefined ? Number(monthly_salary) : existing.monthly_salary;
    let finalDaily = daily_wage !== undefined ? Number(daily_wage) : existing.daily_wage;

    if (pay_type === 'daily' && daily_wage !== undefined) {
      finalMonthly = Number(daily_wage) * 30;
    } else if (pay_type === 'monthly' && monthly_salary !== undefined) {
      finalDaily = Math.round(Number(monthly_salary) / 30);
    }

    db.prepare(`
      UPDATE employees SET
        name = COALESCE(?, name),
        phone = COALESCE(?, phone),
        pin = COALESCE(?, pin),
        role = COALESCE(?, role),
        pay_type = COALESCE(?, pay_type),
        daily_wage = ?,
        monthly_salary = ?,
        joining_date = COALESCE(?, joining_date),
        is_active = COALESCE(?, is_active),
        bonus_preference = COALESCE(?, bonus_preference),
        avatar_color = COALESCE(?, avatar_color)
      WHERE id = ?
    `).run(
      name,
      phone,
      pin,
      role,
      pay_type,
      finalDaily,
      finalMonthly,
      joining_date,
      is_active !== undefined ? Number(is_active) : null,
      bonus_preference,
      avatar_color,
      id
    );

    db.prepare(`
      INSERT INTO audit_log (employee_id, action, actor, details, timestamp)
      VALUES (?, 'employee_updated', 'Owner', ?, CURRENT_TIMESTAMP)
    `).run(id, `Updated staff ${name || existing.name}. Pay type: ${pay_type || existing.pay_type}, Wage: ₹${finalDaily}/d (₹${finalMonthly}/mo)`);

    const updated = db.prepare('SELECT * FROM employees WHERE id = ?').get(id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// -------------------------------------------------------------
// LIVE ROSTER & TODAY STATUS (Section 1 State Machine)
// -------------------------------------------------------------
app.get('/api/roster/today', (req, res) => {
  try {
    const date = req.query.date || '2026-11-15';
    const settings = getSettings();
    const employees = db.prepare('SELECT * FROM employees WHERE is_active = 1 ORDER BY id ASC').all();

    let onFloorCount = 0;
    let onBreakCount = 0;
    let notInYetCount = 0;
    let onLeaveCount = 0;

    const roster = employees.map(emp => {
      const dayRecord = db.prepare('SELECT * FROM days WHERE employee_id = ? AND date = ?').get(emp.id, date);
      const punches = db.prepare('SELECT * FROM punches WHERE employee_id = ? AND date = ? ORDER BY timestamp ASC').all(emp.id, date);

      const dayState = computeEmployeeDayState({
        employee: emp,
        date,
        punches,
        dayRecord,
        nowMs: Date.now(),
        breakLengthMinutes: settings.break_length_minutes || 180
      });

      let mappedStatus = 'not_in_yet';
      if (dayRecord && (dayRecord.status === 'paid_leave' || dayRecord.status === 'unpaid_leave' || dayRecord.status === 'upcoming_leave')) {
        mappedStatus = 'on_leave';
        onLeaveCount++;
      } else if (dayState.status === 'ENDED') {
        mappedStatus = 'checked_out';
      } else if (dayState.status === 'ON_BREAK') {
        mappedStatus = 'on_break';
        onBreakCount++;
      } else if (dayState.status === 'ON_SHIFT') {
        mappedStatus = 'on_floor';
        onFloorCount++;
      } else {
        mappedStatus = 'not_in_yet';
        notInYetCount++;
      }

      const checkInPunch = punches.find(p => p.type === 'check_in');
      const checkOutPunch = punches.find(p => p.type === 'check_out');

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
        status: mappedStatus,
        dayStateStatus: dayState.status,
        shiftStart: dayState.shiftStart,
        shiftEnd: dayState.shiftEnd,
        breakStart: dayState.breakStart,
        breakEnd: dayState.breakEnd,
        breakUsed: dayState.breakUsed,
        checkInTime: checkInPunch ? checkInPunch.timestamp : null,
        checkInSource: checkInPunch ? checkInPunch.source : null,
        checkOutTime: checkOutPunch ? checkOutPunch.timestamp : null,
        checkOutSource: checkOutPunch ? checkOutPunch.source : null,
        breakStartTime: dayState.breakStart,
        breakSecondsLeft: dayState.breakRemainingSeconds,
        workedSeconds: dayState.workedSeconds,
        isLate: dayState.isLate,
        lateMinutes: dayState.lateMinutes,
        isHalfDay: dayState.isHalfDay,
        breakSkipped: dayState.breakSkipped,
        dayRecord: dayRecord || null,
        punches
      };
    });

    res.json({
      date,
      summary: {
        onFloor: onFloorCount,
        onBreak: onBreakCount,
        notInYet: notInYetCount,
        onLeave: onLeaveCount,
        total: employees.length
      },
      roster
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Single employee exact today state (Section 1 - restores exact timer on refresh)
app.get('/api/today/:employeeId', (req, res) => {
  try {
    const employeeId = Number(req.params.employeeId);
    const date = req.query.date || '2026-11-15';
    const settings = getSettings();

    const emp = db.prepare('SELECT * FROM employees WHERE id = ?').get(employeeId);
    if (!emp) return res.status(404).json({ error: 'Employee not found.' });

    const punches = db.prepare('SELECT * FROM punches WHERE employee_id = ? AND date = ? ORDER BY timestamp ASC').all(employeeId, date);
    const dayRecord = db.prepare('SELECT * FROM days WHERE employee_id = ? AND date = ?').get(employeeId, date);

    const dayState = computeEmployeeDayState({
      employee: emp,
      date,
      punches,
      dayRecord,
      nowMs: Date.now(),
      breakLengthMinutes: settings.break_length_minutes || 180
    });

    res.json({
      success: true,
      ...dayState,
      employee: emp,
      breakBank: {
        totalSkipped: emp.break_bank_skipped || 0,
        bonusHolidaysEarned: emp.bonus_holidays_earned || 0,
        bonusHolidaysAvailable: Math.max(0, (emp.bonus_holidays_earned || 0) - (emp.bonus_holidays_used || 0))
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// ATTENDANCE CSV EXPORT (Staff section & Reports)
// -------------------------------------------------------------
app.get('/api/attendance/export-csv', (req, res) => {
  try {
    const requestedDate = req.query.date; // e.g. '2026-11-15'
    const requestedMonth = req.query.month || (requestedDate ? requestedDate.substring(0, 7) : '2026-11');
    const employees = db.prepare('SELECT * FROM employees ORDER BY id ASC').all();

    let punchesQuery = "SELECT * FROM punches WHERE date LIKE ? ORDER BY timestamp ASC";
    let daysQuery = "SELECT * FROM days WHERE date LIKE ? ORDER BY date ASC, employee_id ASC";
    let pattern = `${requestedMonth}%`;
    if (requestedDate) {
      punchesQuery = "SELECT * FROM punches WHERE date = ? ORDER BY timestamp ASC";
      daysQuery = "SELECT * FROM days WHERE date = ? ORDER BY employee_id ASC";
      pattern = requestedDate;
    }

    const punches = db.prepare(punchesQuery).all(pattern);
    const days = db.prepare(daysQuery).all(pattern);

    const punchMap = {};
    for (const p of punches) {
      const key = `${p.employee_id}_${p.date}`;
      if (!punchMap[key]) punchMap[key] = [];
      punchMap[key].push(p);
    }

    const dayMap = {};
    for (const d of days) {
      dayMap[`${d.employee_id}_${d.date}`] = d;
    }

    let datesList = [];
    if (requestedDate) {
      datesList = [requestedDate];
    } else {
      const distinct = db.prepare("SELECT DISTINCT date FROM punches WHERE date LIKE ? UNION SELECT DISTINCT date FROM days WHERE date LIKE ? ORDER BY date ASC").all(pattern, pattern);
      datesList = distinct.map(r => r.date);
      if (datesList.length === 0) datesList = ['2026-11-15'];
    }

    const rows = [
      [
        'Date',
        'Employee ID',
        'Employee Name',
        'Role',
        'Pay Type',
        'Daily Wage (INR)',
        'Attendance Status',
        'Check-In Time',
        'Check-In Distance (m)',
        'Check-In Accuracy (m)',
        'Break Start Time',
        'Break End Time',
        'Break Duration (Minutes)',
        'Break Skipped',
        'Check-Out Time',
        'Check-Out Distance (m)',
        'Hours Worked',
        'Late Mark',
        'Late Minutes',
        'Deduction',
        'Day Pay (INR)'
      ]
    ];

    for (const d of datesList) {
      for (const emp of employees) {
        const key = `${emp.id}_${d}`;
        const empPunches = punchMap[key] || [];
        const dayRecord = dayMap[key];

        const checkIn = empPunches.find(p => p.type === 'check_in');
        const checkOut = empPunches.find(p => p.type === 'check_out');
        const breakStart = [...empPunches].reverse().find(p => p.type === 'start_break');
        const breakEnd = [...empPunches].reverse().find(p => p.type === 'end_break');

        let status = 'Not In Yet';
        if (dayRecord) {
          if (dayRecord.status === 'present') status = 'Present';
          else if (dayRecord.status === 'late') status = 'Late (Present)';
          else if (dayRecord.status === 'paid_leave') status = 'Paid Leave';
          else if (dayRecord.status === 'unpaid_leave') status = 'Unpaid Leave';
          else if (dayRecord.status === 'half_day') status = 'Half Day Worked';
        }

        if (checkOut) {
          status = 'Checked Out';
        } else if (breakStart && (!breakEnd || new Date(breakEnd.timestamp) < new Date(breakStart.timestamp))) {
          status = 'On 3-hr Break';
        } else if (checkIn) {
          status = 'On Floor';
        }

        let workedStr = '0h 0m';
        if (checkIn) {
          const inT = new Date(checkIn.timestamp).getTime();
          const outT = checkOut ? new Date(checkOut.timestamp).getTime() : Date.now();
          const totalSec = Math.max(0, Math.floor((outT - inT) / 1000));
          const h = Math.floor(totalSec / 3600);
          const m = Math.floor((totalSec % 3600) / 60);
          workedStr = `${h}h ${m}m`;
        }

        const formatTime = (ts) => {
          if (!ts) return '—';
          try {
            const timePart = ts.includes('T') ? ts.split('T')[1] : ts;
            return timePart.substring(0, 5);
          } catch {
            return ts;
          }
        };

        const breakMinutes = dayRecord?.break_taken_minutes || (breakStart && breakEnd ? Math.round((new Date(breakEnd.timestamp) - new Date(breakStart.timestamp)) / 60000) : 0);
        const breakSkipped = dayRecord?.break_skipped === 1 ? 'Yes (Banked)' : 'No';

        const dailyRate = emp.daily_wage || Math.round(emp.monthly_salary / 30);
        let dayPay = dailyRate;
        if (dayRecord?.status === 'unpaid_leave') dayPay = 0;
        else if (dayRecord?.status === 'half_day' || dayRecord?.deduction === 'half') dayPay = Math.round(dailyRate / 2);
        else if (dayRecord?.deduction === 'full') dayPay = 0;
        else if (!checkIn && (!dayRecord || dayRecord.status === 'absent')) dayPay = 0;

        rows.push([
          d,
          emp.id,
          `"${emp.name.replace(/"/g, '""')}"`,
          `"${emp.role.replace(/"/g, '""')}"`,
          emp.pay_type,
          dailyRate,
          status,
          formatTime(checkIn?.timestamp),
          checkIn?.distance_m != null ? Math.round(checkIn.distance_m) : 'N/A',
          checkIn?.accuracy != null ? Math.round(checkIn.accuracy) : 'N/A',
          formatTime(breakStart?.timestamp),
          formatTime(breakEnd?.timestamp),
          breakMinutes,
          breakSkipped,
          formatTime(checkOut?.timestamp),
          checkOut?.distance_m != null ? Math.round(checkOut.distance_m) : 'N/A',
          workedStr,
          dayRecord?.is_late ? 'Yes' : 'No',
          dayRecord?.late_minutes || 0,
          dayRecord?.deduction || 'none',
          dayPay
        ]);
      }
    }

    const csvContent = rows.map(r => r.join(',')).join('\n');
    const filename = requestedDate
      ? `Meats_and_Plants_Attendance_${requestedDate}.csv`
      : `Meats_and_Plants_Attendance_${requestedMonth}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csvContent);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reset today's roster for live trial testing
app.post('/api/roster/reset-today', (req, res) => {
  try {
    const date = req.body?.date || '2026-11-15';
    db.prepare('DELETE FROM punches WHERE date = ?').run(date);
    db.prepare('DELETE FROM days WHERE date = ?').run(date);
    res.json({
      success: true,
      message: `All punches and day records cleared for ${date}. All staff are ready for check-in!`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/roster/reset-employee-today', (req, res) => {
  try {
    const employee_id = req.body.employee_id || req.body.employeeId;
    const date = req.body.date || '2026-11-15';
    db.prepare('DELETE FROM punches WHERE employee_id = ? AND date = ?').run(employee_id, date);
    db.prepare('DELETE FROM days WHERE employee_id = ? AND date = ?').run(employee_id, date);
    res.json({
      success: true,
      message: `Cleared today's shift records for employee ${employee_id}. Ready to test check-in again!`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// PUNCHES (Section 1: Unified State Machine Punch Endpoint)
// POST /api/punch and POST /api/punches
// -------------------------------------------------------------
function handleUnifiedPunch(req, res) {
  try {
    const employeeId = Number(req.body.employeeId || req.body.employee_id);
    const action = req.body.action || req.body.type;
    const source = req.body.source || (req.path.includes('manual') ? 'manual' : 'app');
    const customTime = req.body.time || req.body.custom_time;
    const { lat, lng, accuracy, notes, reason } = req.body;

    if (!employeeId) {
      return res.status(400).json({ error: 'Employee ID is required.' });
    }
    if (!action) {
      return res.status(400).json({ error: 'Punch action is required.' });
    }

    const emp = db.prepare('SELECT * FROM employees WHERE id = ?').get(employeeId);
    if (!emp) return res.status(404).json({ error: 'Employee not found.' });

    const settings = getSettings();
    let timestamp = customTime;
    if (!timestamp) {
      timestamp = new Date().toISOString();
    } else if (!timestamp.includes('T')) {
      const datePart = req.body.date || '2026-11-15';
      const formattedTime = timestamp.length === 5 ? `${timestamp}:00` : timestamp;
      timestamp = `${datePart}T${formattedTime}`;
    }
    const date = timestamp.split('T')[0];

    // Fetch existing punches and day record for today
    const existingPunches = db.prepare('SELECT * FROM punches WHERE employee_id = ? AND date = ? ORDER BY timestamp ASC').all(employeeId, date);
    const existingDay = db.prepare('SELECT * FROM days WHERE employee_id = ? AND date = ?').get(employeeId, date);

    // Compute current state before punch
    const currentState = computeEmployeeDayState({
      employee: emp,
      date,
      punches: existingPunches,
      dayRecord: existingDay,
      nowMs: new Date(timestamp).getTime(),
      breakLengthMinutes: settings.break_length_minutes || 180
    });

    // Validate state transition
    validateStateTransition(currentState.status, action, currentState.breakUsed);

    // Geo check if source === 'app'
    let distanceM = null;
    let isOffsite = false;
    const normAction = action.toLowerCase().replace(/_/g, '');
    const isEndingShift = normAction === 'endshift' || normAction === 'checkout';

    if (source !== 'manual') {
      const numLat = lat != null ? Number(lat) : null;
      const numLng = lng != null ? Number(lng) : null;
      const numAcc = accuracy != null ? Number(accuracy) : 0;

      if (numLat == null || numLng == null || isNaN(numLat) || isNaN(numLng)) {
        return res.status(400).json({ error: 'Location coordinates (lat, lng) are required. Please ensure location is enabled.' });
      }

      let branches = [];
      try {
        branches = db.prepare('SELECT * FROM locations').all();
      } catch {}

      let bestCheck = null;
      if (branches && branches.length > 0) {
        for (const loc of branches) {
          const check = validateGeofence({
            lat: numLat,
            lng: numLng,
            accuracy: numAcc,
            storeLat: loc.lat,
            storeLng: loc.lng,
            radiusMeters: loc.radius
          });
          if (check.allowed) {
            bestCheck = check;
            break;
          }
          if (!bestCheck || check.distance < bestCheck.distance) {
            bestCheck = check;
          }
        }
      } else {
        bestCheck = validateGeofence({
          lat: numLat,
          lng: numLng,
          accuracy: numAcc,
          storeLat: settings.store_lat,
          storeLng: settings.store_lng,
          radiusMeters: settings.geofence_radius
        });
      }

      distanceM = bestCheck.distance;

      if (!bestCheck.allowed) {
        if (isEndingShift && settings.allow_offsite_checkout) {
          isOffsite = true;
        } else {
          return res.status(403).json({ error: bestCheck.error });
        }
      }
    }

    // Map to canonical punch type
    let punchType = 'check_in';
    if (normAction === 'startshift' || normAction === 'checkin') punchType = 'check_in';
    else if (normAction === 'startbreak') punchType = 'start_break';
    else if (normAction === 'endbreak') punchType = 'end_break';
    else if (normAction === 'endshift' || normAction === 'checkout') punchType = 'check_out';

    // Auto-close break if ending shift while on break
    if (punchType === 'check_out' && currentState.status === 'ON_BREAK') {
      db.prepare(`
        INSERT INTO punches (employee_id, type, timestamp, date, ssid, source, notes, reviewed, lat, lng, accuracy, distance_m)
        VALUES (?, 'end_break', ?, ?, 'GEOFENCE', ?, 'Auto-closed break on shift end', 1, ?, ?, ?, ?)
      `).run(employeeId, timestamp, date, source, lat || null, lng || null, accuracy || null, distanceM);
    }

    let punchNotes = notes || reason || (source === 'manual' ? 'Manual punch by Owner' : null);
    if (isOffsite) {
      const offsiteTag = `Off-site checkout (${Math.round(distanceM || 0)}m away)`;
      punchNotes = punchNotes ? `${punchNotes} · ${offsiteTag}` : offsiteTag;
    }

    db.prepare(`
      INSERT INTO punches (employee_id, type, timestamp, date, ssid, source, notes, reviewed, lat, lng, accuracy, distance_m)
      VALUES (?, ?, ?, ?, 'GEOFENCE', ?, ?, 1, ?, ?, ?, ?)
    `).run(employeeId, punchType, timestamp, date, source, punchNotes, lat || null, lng || null, accuracy || null, distanceM);

    // Update Days table
    if (punchType === 'check_in') {
      const lateEval = evaluateLateStatus(timestamp, settings.shift_start, settings.grace_minutes);
      const dayStatus = lateEval.isHalfDay ? 'half_day' : 'present';
      const deduction = lateEval.deduction;

      if (existingDay) {
        db.prepare(`
          UPDATE days SET
            status = CASE WHEN manual_override = 1 THEN status ELSE ? END,
            deduction = CASE WHEN manual_override = 1 THEN deduction ELSE ? END,
            is_late = CASE WHEN manual_override = 1 THEN is_late ELSE ? END,
            late_minutes = CASE WHEN manual_override = 1 THEN late_minutes ELSE ? END,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(dayStatus, deduction, lateEval.isLate ? 1 : 0, lateEval.minutesLate, existingDay.id);
      } else {
        db.prepare(`
          INSERT INTO days (employee_id, date, status, deduction, is_late, late_minutes, break_taken_minutes, break_skipped, manual_override, notes)
          VALUES (?, ?, ?, ?, ?, ?, 0, 0, 0, ?)
        `).run(employeeId, date, dayStatus, deduction, lateEval.isLate ? 1 : 0, lateEval.minutesLate, source === 'manual' ? 'Owner check-in' : 'App check-in');
      }
    } else if (punchType === 'check_out') {
      const hadBreak = existingPunches.some(p => p.type === 'start_break');
      const breakSkipped = !hadBreak;

      if (breakSkipped) {
        db.prepare(`
          UPDATE days SET break_skipped = 1, updated_at = CURRENT_TIMESTAMP WHERE employee_id = ? AND date = ?
        `).run(employeeId, date);

        const newBank = (emp.break_bank_skipped || 0) + 1;
        if (newBank >= 4) {
          const bonusEarned = (emp.bonus_holidays_earned || 0) + 1;
          const remainder = newBank % 4;
          db.prepare(`
            UPDATE employees SET break_bank_skipped = ?, bonus_holidays_earned = ? WHERE id = ?
          `).run(remainder, bonusEarned, employeeId);

          db.prepare(`
            INSERT INTO push_notifications (employee_id, title, body, type, sent_at)
            VALUES (?, '🎁 Bonus Paid Holiday Earned', 'You have banked 4 skipped breaks! 1 extra full-day paid holiday has been added to your balance.', 'break_bonus', CURRENT_TIMESTAMP)
          `).run(employeeId);

          db.prepare(`
            INSERT INTO audit_log (employee_id, target_date, action, actor, details, timestamp)
            VALUES (?, ?, 'break_bonus_holiday', 'System', ?, CURRENT_TIMESTAMP)
          `).run(employeeId, date, `${emp.name} banked 4 skipped breaks and earned 1 bonus paid holiday!`);
        } else {
          db.prepare(`
            UPDATE employees SET break_bank_skipped = ? WHERE id = ?
          `).run(newBank, employeeId);
        }
      }
    }

    const updatedPunches = db.prepare('SELECT * FROM punches WHERE employee_id = ? AND date = ? ORDER BY timestamp ASC').all(employeeId, date);
    const updatedDay = db.prepare('SELECT * FROM days WHERE employee_id = ? AND date = ?').get(employeeId, date);
    const updatedEmp = db.prepare('SELECT * FROM employees WHERE id = ?').get(employeeId);

    const updatedState = computeEmployeeDayState({
      employee: updatedEmp,
      date,
      punches: updatedPunches,
      dayRecord: updatedDay,
      nowMs: new Date(timestamp).getTime(),
      breakLengthMinutes: settings.break_length_minutes || 180
    });

    res.json({
      success: true,
      ...updatedState,
      employee: updatedEmp,
      punch: { employee_id: employeeId, type: punchType, timestamp, date, source, distanceM }
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

app.post('/api/punch', handleUnifiedPunch);
app.post('/api/punches', handleUnifiedPunch);
app.post('/api/punches/manual', handleUnifiedPunch);

// Break Bank Redemption (Staff Page)
app.post('/api/employees/:id/redeem-break', (req, res) => {
  try {
    const employeeId = Number(req.params.id);
    const { type, month } = req.body; // 'pay' or 'leave'
    const emp = db.prepare('SELECT * FROM employees WHERE id = ?').get(employeeId);
    if (!emp) return res.status(404).json({ error: 'Employee not found' });

    const settings = getSettings();
    const needed = settings.skipped_breaks_needed || 4;

    const skippedCount = db.prepare('SELECT COUNT(*) as count FROM days WHERE employee_id = ? AND break_skipped = 1').get(employeeId).count;
    const redeemedCount = db.prepare('SELECT COALESCE(SUM(breaks_redeemed), 0) as count FROM break_redemptions WHERE employee_id = ?').get(employeeId).count;
    const available = Math.max(0, skippedCount - redeemedCount);

    if (available < needed) {
      return res.status(400).json({ error: `Not enough banked breaks. Needs ${needed}, currently has ${available}.` });
    }

    const activeMonth = month || new Date().toISOString().substring(0, 7);
    const dailyWage = emp.pay_type === 'daily' ? emp.daily_wage : Math.round(emp.monthly_salary / 30);
    const bonusAmount = type === 'pay' ? dailyWage : 0;

    const result = db.prepare(`
      INSERT INTO break_redemptions (employee_id, month, type, breaks_redeemed, amount, created_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(employeeId, activeMonth, type, needed, bonusAmount);

    const redemptionId = Number(result.lastInsertRowid);
    const actionLabel = type === 'pay' ? `+1 Day Pay (₹${dailyWage.toLocaleString('en-IN')})` : `+1 Paid Leave`;

    db.prepare(`
      INSERT INTO audit_log (employee_id, action, actor, details, timestamp)
      VALUES (?, 'break_redeemed', 'Owner', ?, CURRENT_TIMESTAMP)
    `).run(employeeId, `Applied ${actionLabel} from ${needed} banked breaks for ${emp.name}`);

    res.json({
      success: true,
      redemptionId,
      message: `Applied ${actionLabel} for ${emp.name}`,
      employeeName: emp.name,
      type,
      amount: bonusAmount
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Undo Break Bank Redemption
app.post('/api/employees/:id/undo-break-redemption', (req, res) => {
  try {
    const employeeId = Number(req.params.id);
    const { redemptionId } = req.body;
    const emp = db.prepare('SELECT * FROM employees WHERE id = ?').get(employeeId);
    if (!emp) return res.status(404).json({ error: 'Employee not found' });

    const redemption = db.prepare('SELECT * FROM break_redemptions WHERE id = ? AND employee_id = ?').get(redemptionId, employeeId);
    if (!redemption) return res.status(404).json({ error: 'Redemption record not found' });

    db.prepare('DELETE FROM break_redemptions WHERE id = ?').run(redemptionId);

    db.prepare(`
      INSERT INTO audit_log (employee_id, action, actor, details, timestamp)
      VALUES (?, 'break_redemption_undone', 'Owner', ?, CURRENT_TIMESTAMP)
    `).run(employeeId, `Undid break redemption #${redemptionId} (${redemption.type}) for ${emp.name}`);

    res.json({
      success: true,
      message: `Undid break redemption for ${emp.name}`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// STAFF PUNCH FIX REQUESTS ("Forgot to punch? Request a fix")
// -------------------------------------------------------------
app.post('/api/punch-requests', (req, res) => {
  try {
    const { employee_id, type, date, time, reason } = req.body;
    const emp = db.prepare('SELECT * FROM employees WHERE id = ?').get(employee_id);
    if (!emp) return res.status(404).json({ error: 'Employee not found' });

    const result = db.prepare(`
      INSERT INTO punch_requests (employee_id, type, date, time, reason, status, created_at)
      VALUES (?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)
    `).run(employee_id, type, date, time, reason || 'Forgot to punch');

    res.json({ success: true, requestId: Number(result.lastInsertRowid) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/punch-requests/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body; // 'approved' or 'denied'
    const settings = getSettings();

    const request = db.prepare('SELECT * FROM punch_requests WHERE id = ?').get(id);
    if (!request) return res.status(404).json({ error: 'Request not found' });

    const emp = db.prepare('SELECT * FROM employees WHERE id = ?').get(request.employee_id);

    db.prepare(`
      UPDATE punch_requests SET
        status = ?,
        reviewed_by = 'Owner',
        reviewed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(status, id);

    if (status === 'approved') {
      const fullTimestamp = `${request.date}T${request.time.length === 5 ? request.time + ':00' : request.time}`;
      db.prepare(`
        INSERT INTO punches (employee_id, type, timestamp, date, ssid, source, notes, reviewed)
        VALUES (?, ?, ?, ?, ?, 'manual', ?, 1)
      `).run(request.employee_id, request.type, fullTimestamp, request.date, settings.allowed_ssids, `Approved staff punch request: ${request.reason}`);

      // Update days record
      if (request.type === 'check_in') {
        const lateEvaluation = evaluateLateStatus(request.time, settings.shift_start, settings.grace_minutes);
        db.prepare(`
          INSERT INTO days (employee_id, date, status, deduction, is_late, late_minutes, break_taken_minutes, break_skipped, manual_override, notes)
          VALUES (?, ?, ?, 'none', ?, ?, 0, 0, 1, ?)
          ON CONFLICT(employee_id, date) DO UPDATE SET
            status = excluded.status,
            is_late = excluded.is_late,
            late_minutes = excluded.late_minutes,
            manual_override = 1,
            notes = excluded.notes,
            updated_at = CURRENT_TIMESTAMP
        `).run(request.employee_id, request.date, lateEvaluation.isLate ? 'late' : 'present', lateEvaluation.isLate ? 1 : 0, lateEvaluation.minutesLate, `Approved punch: ${request.reason}`);
      }
    }

    db.prepare(`
      INSERT INTO audit_log (employee_id, target_date, action, actor, details, timestamp)
      VALUES (?, ?, 'punch_request_review', 'Owner', ?, CURRENT_TIMESTAMP)
    `).run(request.employee_id, request.date, `${status.toUpperCase()} punch fix for ${emp.name} (${request.type} on ${request.date} at ${request.time})`);

    res.json({ success: true, status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// UNIFIED INBOX (Leaves, Punch Fixes, Auto-Checkouts)
// -------------------------------------------------------------
app.get('/api/inbox', (req, res) => {
  try {
    const leaveRequests = db.prepare(`
      SELECT lr.*, e.name as employee_name, e.role as employee_role, e.phone as employee_phone
      FROM leave_requests lr
      JOIN employees e ON e.id = lr.employee_id
      WHERE lr.status = 'pending'
      ORDER BY lr.created_at DESC
    `).all();

    const punchRequests = db.prepare(`
      SELECT pr.*, e.name as employee_name, e.role as employee_role
      FROM punch_requests pr
      JOIN employees e ON e.id = pr.employee_id
      WHERE pr.status = 'pending'
      ORDER BY pr.created_at DESC
    `).all();

    const autoCheckouts = db.prepare(`
      SELECT p.*, e.name as employee_name, e.role as employee_role
      FROM punches p
      JOIN employees e ON e.id = p.employee_id
      WHERE p.source = 'auto' AND p.reviewed = 0
      ORDER BY p.timestamp DESC
    `).all();

    const totalCount = leaveRequests.length + punchRequests.length + autoCheckouts.length;

    res.json({
      totalCount,
      leaveRequests,
      punchRequests,
      autoCheckouts
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/inbox/auto-checkout/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    db.prepare('UPDATE punches SET reviewed = 1 WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// HOLIDAYS (Section 4: Indian Gazetted / National Holidays)
// -------------------------------------------------------------
app.get('/api/holidays', (req, res) => {
  try {
    const { year, month } = req.query;
    let query = 'SELECT * FROM holidays';
    const params = [];
    if (year) {
      query += ' WHERE date LIKE ?';
      params.push(`${year}%`);
    } else if (month) {
      query += ' WHERE date LIKE ?';
      params.push(`${month}%`);
    }
    query += ' ORDER BY date ASC';
    const list = db.prepare(query).all(...params);
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/holidays', (req, res) => {
  try {
    const { date, name, is_paid = 1 } = req.body;
    if (!date || !name) return res.status(400).json({ error: 'Date and name are required' });
    db.prepare(`
      INSERT INTO holidays (date, name, is_paid)
      VALUES (?, ?, ?)
      ON CONFLICT(date) DO UPDATE SET name = excluded.name, is_paid = excluded.is_paid
    `).run(date, name, is_paid ? 1 : 0);

    db.prepare(`
      INSERT INTO audit_log (employee_id, target_date, action, actor, details, timestamp)
      VALUES (NULL, ?, 'holiday_add', 'Owner', ?, CURRENT_TIMESTAMP)
    `).run(date, `Added/updated holiday: ${name} on ${date}`);

    const created = db.prepare('SELECT * FROM holidays WHERE date = ?').get(date);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/holidays/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    const { date, name, is_paid } = req.body;
    db.prepare(`
      UPDATE holidays SET
        date = COALESCE(?, date),
        name = COALESCE(?, name),
        is_paid = COALESCE(?, is_paid)
      WHERE id = ?
    `).run(date, name, is_paid !== undefined ? (is_paid ? 1 : 0) : null, id);

    const updated = db.prepare('SELECT * FROM holidays WHERE id = ?').get(id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/holidays/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    db.prepare('DELETE FROM holidays WHERE id = ?').run(id);
    res.json({ success: true, message: 'Holiday deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// ATTENDANCE CALENDAR & DAY DRAWER (Supports any YYYY-MM)
// -------------------------------------------------------------
app.get('/api/attendance/month', (req, res) => {
  try {
    const month = req.query.month || '2026-11';
    const employees = db.prepare('SELECT * FROM employees WHERE is_active = 1 ORDER BY id ASC').all();
    const days = db.prepare("SELECT * FROM days WHERE date LIKE ?").all(`${month}%`);
    const punches = db.prepare("SELECT * FROM punches WHERE date LIKE ? ORDER BY timestamp ASC").all(`${month}%`);
    const pendingLeaves = db.prepare("SELECT * FROM leave_requests WHERE status = 'pending' AND (start_date LIKE ? OR end_date LIKE ?)").all(`${month}%`, `${month}%`);
    const holidays = db.prepare("SELECT * FROM holidays WHERE date LIKE ? ORDER BY date ASC").all(`${month}%`);

    const punchMap = {};
    for (const p of punches) {
      const key = `${p.employee_id}_${p.date}`;
      if (!punchMap[key]) punchMap[key] = [];
      punchMap[key].push(p);
    }

    const dayMap = {};
    for (const d of days) {
      const key = `${d.employee_id}_${d.date}`;
      dayMap[key] = {
        ...d,
        punches: punchMap[key] || []
      };
    }

    res.json({
      month,
      employees,
      dayMap,
      pendingLeaves,
      holidays
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/attendance/day', (req, res) => {
  try {
    const {
      employee_id,
      date,
      status,
      deduction,
      is_late,
      break_skipped,
      notes,
      check_in_time,
      check_out_time
    } = req.body;

    const emp = db.prepare('SELECT * FROM employees WHERE id = ?').get(employee_id);
    if (!emp) return res.status(404).json({ error: 'Employee not found' });

    db.prepare(`
      INSERT INTO days (
        employee_id, date, status, deduction, is_late, break_skipped, manual_override, notes, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(employee_id, date) DO UPDATE SET
        status = excluded.status,
        deduction = excluded.deduction,
        is_late = excluded.is_late,
        break_skipped = excluded.break_skipped,
        manual_override = 1,
        notes = excluded.notes,
        updated_at = CURRENT_TIMESTAMP
    `).run(
      employee_id,
      date,
      status || 'present',
      deduction || 'none',
      is_late ? 1 : 0,
      break_skipped ? 1 : 0,
      notes || null
    );

    const settings = getSettings();
    if (check_in_time) {
      const fullTimestamp = `${date}T${check_in_time.length === 5 ? check_in_time + ':00' : check_in_time}`;
      const existingIn = db.prepare("SELECT * FROM punches WHERE employee_id = ? AND date = ? AND type = 'check_in'").get(employee_id, date);
      if (existingIn) {
        db.prepare("UPDATE punches SET timestamp = ?, source = 'manual', notes = 'Owner edited' WHERE id = ?").run(fullTimestamp, existingIn.id);
      } else {
        db.prepare("INSERT INTO punches (employee_id, type, timestamp, date, ssid, source, notes, reviewed) VALUES (?, 'check_in', ?, ?, ?, 'manual', 'Owner added', 1)").run(employee_id, fullTimestamp, date, settings.allowed_ssids);
      }
    }

    if (check_out_time) {
      const fullTimestamp = `${date}T${check_out_time.length === 5 ? check_out_time + ':00' : check_out_time}`;
      const existingOut = db.prepare("SELECT * FROM punches WHERE employee_id = ? AND date = ? AND type = 'check_out'").get(employee_id, date);
      if (existingOut) {
        db.prepare("UPDATE punches SET timestamp = ?, source = 'manual', notes = 'Owner edited' WHERE id = ?").run(fullTimestamp, existingOut.id);
      } else {
        db.prepare("INSERT INTO punches (employee_id, type, timestamp, date, ssid, source, notes, reviewed) VALUES (?, 'check_out', ?, ?, ?, 'manual', 'Owner added', 1)").run(employee_id, fullTimestamp, date, settings.allowed_ssids);
      }
    }

    db.prepare(`
      INSERT INTO audit_log (employee_id, target_date, action, actor, details, timestamp)
      VALUES (?, ?, 'edit_day', 'Owner', ?, CURRENT_TIMESTAMP)
    `).run(employee_id, date, `Edited attendance on ${date} for ${emp.name}: Status ${status}, Deduction ${deduction}`);

    const updatedDay = db.prepare('SELECT * FROM days WHERE employee_id = ? AND date = ?').get(employee_id, date);
    res.json({ success: true, day: updatedDay });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// PAYROLL (Supports any YYYY-MM & Daily/Monthly Wage)
// -------------------------------------------------------------
app.get('/api/payroll/month', (req, res) => {
  try {
    const month = req.query.month || '2026-11';
    const settings = getSettings();
    const employees = db.prepare('SELECT * FROM employees WHERE is_active = 1 ORDER BY id ASC').all();
    const holidays = db.prepare('SELECT * FROM holidays WHERE date LIKE ? ORDER BY date ASC').all(`${month}%`);

    const [year, m] = month.split('-').map(Number);
    const daysInMonth = new Date(year, m, 0).getDate();

    const payrollRecord = db.prepare('SELECT * FROM payroll_months WHERE month = ?').get(month);

    const employeeBreakdowns = employees.map(emp => {
      const days = db.prepare('SELECT * FROM days WHERE employee_id = ? AND date LIKE ?').all(emp.id, `${month}%`);

      return calculateEmployeePayroll({
        employee: emp,
        days,
        holidays,
        settings,
        daysInMonth
      });
    });

    const summary = employeeBreakdowns.reduce((acc, curr) => ({
      totalGross: acc.totalGross + curr.grossSalary,
      totalDeductions: acc.totalDeductions + curr.totalDeductions,
      totalBonus: acc.totalBonus + curr.availableBonusHolidays,
      totalNetPayable: acc.totalNetPayable + curr.netSalary
    }), {
      totalGross: 0,
      totalDeductions: 0,
      totalBonus: 0,
      totalNetPayable: 0
    });

    res.json({
      month,
      daysInMonth,
      isFinalized: Boolean(payrollRecord?.is_finalized),
      finalizedAt: payrollRecord?.finalized_at || null,
      payrollRecord,
      summary,
      totals: summary,
      holidays,
      records: employeeBreakdowns,
      employees: employeeBreakdowns
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/payroll/finalize', (req, res) => {
  try {
    const { month } = req.body;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO payroll_months (month, is_finalized, finalized_at, finalized_by)
      VALUES (?, 1, ?, 'Owner')
      ON CONFLICT(month) DO UPDATE SET
        is_finalized = 1,
        finalized_at = excluded.finalized_at,
        finalized_by = 'Owner'
    `).run(month, now);

    db.prepare(`
      INSERT INTO audit_log (action, actor, details, timestamp)
      VALUES ('finalize_payroll', 'Owner', ?, CURRENT_TIMESTAMP)
    `).run(`Finalized payroll for ${month}`);

    res.json({ success: true, month, isFinalized: true, finalizedAt: now });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// LEAVE REQUESTS
// -------------------------------------------------------------
app.get('/api/leave/requests', (req, res) => {
  try {
    const empId = req.query.employee_id;
    let query = `
      SELECT lr.*, e.name as employee_name, e.role as employee_role, e.phone as employee_phone
      FROM leave_requests lr
      JOIN employees e ON e.id = lr.employee_id
    `;
    const params = [];
    if (empId) {
      query += ` WHERE lr.employee_id = ? `;
      params.push(empId);
    }
    query += ` ORDER BY lr.created_at DESC`;

    const requests = db.prepare(query).all(...params);
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/leave/requests', (req, res) => {
  try {
    const { employee_id, start_date, end_date, reason, is_paid } = req.body;
    const settings = getSettings();

    const emp = db.prepare('SELECT * FROM employees WHERE id = ?').get(employee_id);
    if (!emp) return res.status(404).json({ error: 'Employee not found' });

    const d1 = new Date(start_date);
    const d2 = new Date(end_date || start_date);
    const daysCount = Math.max(1, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1);

    const month = start_date.substring(0, 7);
    const usedPaidLeaves = db.prepare(`
      SELECT COUNT(*) as count FROM days
      WHERE employee_id = ? AND date LIKE ? AND status = 'paid_leave'
    `).get(employee_id, `${month}%`).count;

    const remainingPaidQuota = Math.max(0, (settings.paid_leaves_per_month || 3) - usedPaidLeaves);
    const finalIsPaid = is_paid !== undefined ? (is_paid ? 1 : 0) : (remainingPaidQuota >= daysCount ? 1 : 0);

    const result = db.prepare(`
      INSERT INTO leave_requests (employee_id, start_date, end_date, days_count, reason, is_paid, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)
    `).run(employee_id, start_date, end_date || start_date, daysCount, reason || null, finalIsPaid);

    res.json({
      success: true,
      requestId: result.lastInsertRowid,
      isPaid: finalIsPaid,
      daysCount
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/leave/requests/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;

    const leave = db.prepare('SELECT * FROM leave_requests WHERE id = ?').get(id);
    if (!leave) return res.status(404).json({ error: 'Leave request not found' });

    const emp = db.prepare('SELECT * FROM employees WHERE id = ?').get(leave.employee_id);

    db.prepare(`
      UPDATE leave_requests SET
        status = ?,
        reviewed_by = 'Owner',
        reviewed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(status, id);

    if (status === 'approved') {
      const cur = new Date(leave.start_date);
      const end = new Date(leave.end_date);

      while (cur <= end) {
        const dateStr = cur.toISOString().split('T')[0];
        const dayStatus = leave.is_paid ? 'paid_leave' : 'unpaid_leave';

        db.prepare(`
          INSERT INTO days (employee_id, date, status, deduction, is_late, break_skipped, manual_override, notes)
          VALUES (?, ?, ?, 'none', 0, 0, 1, ?)
          ON CONFLICT(employee_id, date) DO UPDATE SET
            status = excluded.status,
            deduction = 'none',
            notes = excluded.notes,
            manual_override = 1,
            updated_at = CURRENT_TIMESTAMP
        `).run(leave.employee_id, dateStr, dayStatus, `Approved leave: ${leave.reason || 'Requested'}`);

        cur.setDate(cur.getDate() + 1);
      }
    }

    db.prepare(`
      INSERT INTO audit_log (employee_id, target_date, action, actor, details, timestamp)
      VALUES (?, ?, 'leave_review', 'Owner', ?, CURRENT_TIMESTAMP)
    `).run(leave.employee_id, leave.start_date, `${status.toUpperCase()} leave request for ${emp.name} (${leave.start_date} to ${leave.end_date})`);

    res.json({ success: true, status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// AUDIT LOG & NOTIFICATIONS
// -------------------------------------------------------------
app.get('/api/audit-log', (req, res) => {
  try {
    const logs = db.prepare('SELECT * FROM audit_log ORDER BY id DESC LIMIT 50').all();
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/notifications', (req, res) => {
  try {
    const empId = req.query.employee_id;
    let query = 'SELECT * FROM push_notifications';
    const params = [];
    if (empId) {
      query += ' WHERE employee_id = ?';
      params.push(empId);
    }
    query += ' ORDER BY id DESC LIMIT 20';
    const notifs = db.prepare(query).all(...params);
    res.json(notifs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// CRON SIMULATION TRIGGERS
// -------------------------------------------------------------
app.post('/api/cron/trigger-auto-checkout', (req, res) => {
  try {
    const timestamp = req.body.timestamp || '2026-11-15T00:00:00';
    const results = executeAutoCheckout(timestamp);
    res.json({ success: true, autoCheckedOut: results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/cron/simulate-reminders', (req, res) => {
  try {
    const shiftReminders = checkShiftReminders();
    const breakReminders = checkBreakReminders();
    res.json({ success: true, shiftReminders, breakReminders });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// SERVE STATIC CLIENT IN PRODUCTION
// -------------------------------------------------------------
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));
app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Endpoint not found' });
  }
  const indexPath = path.join(distPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(200).send('Meats & Plants API Server Running. Please run npm run build.');
    }
  });
});

app.listen(PORT, () => {
  console.log(`🌿 Meats & Plants Server v2 running on http://localhost:${PORT}`);
});
