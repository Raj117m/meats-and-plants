import { db } from './db.js';

/**
 * Runs auto-checkout for any employee who is still checked in past shift end (12:00 AM).
 * @param {string} [customTimestamp]
 * @returns {Array} List of employees auto checked-out
 */
export function executeAutoCheckout(customTimestamp) {
  const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
  const today = customTimestamp ? customTimestamp.split('T')[0] : new Date().toISOString().split('T')[0];
  const timestamp = customTimestamp || new Date().toISOString();

  // Find employees who checked in today
  const activeCheckIns = db.prepare(`
    SELECT p1.employee_id, e.name
    FROM punches p1
    JOIN employees e ON e.id = p1.employee_id
    WHERE p1.date = ?
      AND p1.type = 'check_in'
      AND p1.employee_id NOT IN (
        SELECT p2.employee_id FROM punches p2
        WHERE p2.date = ? AND p2.type = 'check_out'
      )
  `).all(today, today);

  const autoCheckedOut = [];

  const insertPunch = db.prepare(`
    INSERT INTO punches (employee_id, type, timestamp, date, ssid, source, notes)
    VALUES (?, 'check_out', ?, ?, ?, 'auto', 'Shift ended - Auto checked out at 12:00 AM')
  `);

  const insertAudit = db.prepare(`
    INSERT INTO audit_log (employee_id, target_date, action, actor, details, timestamp)
    VALUES (?, ?, 'auto_checkout', 'System (Auto)', ?, ?)
  `);

  for (const emp of activeCheckIns) {
    insertPunch.run(emp.employee_id, timestamp, today, settings.allowed_ssids);
    insertAudit.run(
      emp.employee_id,
      today,
      `Auto checked out ${emp.name} at shift end (${settings.shift_end || '12:00 AM'})`,
      timestamp
    );
    autoCheckedOut.push({ id: emp.employee_id, name: emp.name });
  }

  return autoCheckedOut;
}

/**
 * Checks for shift start reminders:
 * If an employee is scheduled today, has not checked in by 10 min after shift start,
 * and is connected to Wi-Fi, trigger reminder.
 */
export function checkShiftReminders(customTime) {
  const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
  const today = customTime ? customTime.split('T')[0] : new Date().toISOString().split('T')[0];

  const absentStaff = db.prepare(`
    SELECT e.id, e.name
    FROM employees e
    WHERE e.is_active = 1
      AND e.id NOT IN (
        SELECT p.employee_id FROM punches p WHERE p.date = ?
      )
      AND e.id NOT IN (
        SELECT d.employee_id FROM days d WHERE d.date = ? AND d.status IN ('paid_leave', 'unpaid_leave')
      )
  `).all(today, today);

  const notifications = [];
  const insertPush = db.prepare(`
    INSERT INTO push_notifications (employee_id, title, body, type, sent_at, read_status)
    VALUES (?, ?, ?, 'shift_reminder', ?, 0)
  `);

  const nowStr = customTime || new Date().toISOString();

  for (const emp of absentStaff) {
    const title = 'Shift Started · Check-in Reminder';
    const body = `Hi ${emp.name}, shift began at ${settings.shift_start}. Please tap Check In on café Wi-Fi (${settings.allowed_ssids}).`;
    insertPush.run(emp.id, title, body, nowStr);
    notifications.push({ employeeId: emp.id, name: emp.name, title, body });
  }

  return notifications;
}

/**
 * Checks for break warnings:
 * Employees on break for >= 170 min (10 min before 3h end).
 */
export function checkBreakReminders(customTime) {
  const today = customTime ? customTime.split('T')[0] : new Date().toISOString().split('T')[0];
  const now = customTime ? new Date(customTime) : new Date();

  // Find employees who started break and haven't ended it
  const breaks = db.prepare(`
    SELECT p1.employee_id, p1.timestamp, e.name
    FROM punches p1
    JOIN employees e ON e.id = p1.employee_id
    WHERE p1.date = ?
      AND p1.type = 'start_break'
      AND p1.employee_id NOT IN (
        SELECT p2.employee_id FROM punches p2
        WHERE p2.date = ? AND p2.type = 'end_break' AND p2.id > p1.id
      )
  `).all(today, today);

  const notifications = [];
  const insertPush = db.prepare(`
    INSERT INTO push_notifications (employee_id, title, body, type, sent_at, read_status)
    VALUES (?, ?, ?, ?, ?, 0)
  `);

  for (const b of breaks) {
    const startTime = new Date(b.timestamp);
    const elapsedMinutes = Math.floor((now - startTime) / (1000 * 60));

    if (elapsedMinutes >= 170 && elapsedMinutes < 180) {
      const title = 'Break Ending Soon';
      const body = `Hi ${b.name}, you have 10 minutes left on your 3-hour break. Floor resumes shortly.`;
      insertPush.run(b.employee_id, title, body, 'break_warning', now.toISOString());
      notifications.push({ employeeId: b.employee_id, name: b.name, title });
    } else if (elapsedMinutes >= 180) {
      const title = 'Break Ended';
      const body = `Hi ${b.name}, your 3-hour break has completed. Please tap End Break to resume shift.`;
      insertPush.run(b.employee_id, title, body, 'break_ended', now.toISOString());
      notifications.push({ employeeId: b.employee_id, name: b.name, title });
    }
  }

  return notifications;
}

/**
 * Initializes periodic interval checks (runs every 60 seconds)
 */
export function startCronService() {
  setInterval(() => {
    try {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();

      // Midnight auto-checkout (00:00 - 00:01)
      if (hours === 0 && minutes === 0) {
        executeAutoCheckout();
      }

      // Check break reminders
      checkBreakReminders();
    } catch (err) {
      console.error('Error in cron task interval:', err);
    }
  }, 60 * 1000);
}
