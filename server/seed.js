import { db, initDatabase } from './db.js';

export function seedData(force = false) {
  initDatabase();

  if (force) {
    db.exec(`
      DELETE FROM settings;
      DELETE FROM employees;
      DELETE FROM punches;
      DELETE FROM days;
      DELETE FROM leave_requests;
      DELETE FROM punch_requests;
      DELETE FROM break_redemptions;
      DELETE FROM payroll_months;
      DELETE FROM audit_log;
      DELETE FROM push_notifications;
    `);
  } else {
    const existing = db.prepare('SELECT COUNT(*) as count FROM employees').get();
    if (existing && existing.count >= 10) {
      // Check if we already have multi-month data
      const monthCount = db.prepare("SELECT COUNT(DISTINCT substr(date, 1, 7)) as count FROM days").get();
      if (monthCount && monthCount.count >= 3) {
        console.log('Database already has multi-month seed data.');
        return;
      }
    }
  }

  console.log('Seeding rich multi-month Meats & Plants dataset (Aug, Sep, Oct, Nov 2026)...');

  // 1. Settings
  db.prepare(`
    INSERT INTO settings (
      id, shift_start, shift_end, grace_minutes, late_marks_per_half_day,
      paid_leaves_per_month, break_length_minutes, skipped_breaks_needed,
      bonus_type, auto_checkout_time, allowed_ssids, cafe_name, owner_pin,
      owner_password, owner_name, leave_approval_required, store_lat, store_lng, geofence_radius, store_address, allow_offsite_checkout
    ) VALUES (
      1, '12:00', '00:00', 15, 3,
      3, 180, 4,
      'pay', '00:00', 'ABHIGIT 5G', 'Meats & Plants Thane', '1234',
      'meats2026', 'Abhigit', 1, 19.2584498, 72.977272, 150,
      'Shop No. 21, Hiranandani Estate, Thane', 1
    )
    ON CONFLICT(id) DO UPDATE SET
      owner_password = 'meats2026',
      owner_name = 'Abhigit',
      allowed_ssids = 'ABHIGIT 5G',
      leave_approval_required = 1,
      cafe_name = 'Meats & Plants Thane',
      store_lat = 19.2584498,
      store_lng = 72.977272,
      geofence_radius = 150,
      store_address = 'Shop No. 21, Hiranandani Estate, Thane',
      allow_offsite_checkout = 1
  `).run();

  // 2. Staff Members (10 actual café team members from handwritten roster)
  const staff = [
    { name: 'Shoaib', phone: '9876543210', pin: '1111', role: 'Head Chef', pay_type: 'monthly', daily_wage: 750, salary: 22500, joined: '2025-06-01', bonus: 'pay', color: '#2F7D4F' },
    { name: 'Vansh', phone: '9876543211', pin: '2222', role: 'Sous Chef', pay_type: 'monthly', daily_wage: 650, salary: 19500, joined: '2025-07-15', bonus: 'pay', color: '#C0573E' },
    { name: 'Akash', phone: '9876543212', pin: '3333', role: 'Head Barista', pay_type: 'monthly', daily_wage: 600, salary: 18000, joined: '2025-08-01', bonus: 'pay', color: '#4A7BB7' },
    { name: 'Kunal', phone: '9876543213', pin: '4444', role: 'Barista & Mixologist', pay_type: 'monthly', daily_wage: 550, salary: 16500, joined: '2025-09-10', bonus: 'pay', color: '#E8B44A' },
    { name: 'Praveen', phone: '9876543214', pin: '5555', role: 'Floor Captain', pay_type: 'monthly', daily_wage: 600, salary: 18000, joined: '2025-05-20', bonus: 'pay', color: '#2F7D4F' },
    { name: 'Harsh', phone: '9876543215', pin: '6666', role: 'Senior Server', pay_type: 'monthly', daily_wage: 550, salary: 16500, joined: '2025-10-01', bonus: 'pay', color: '#C0573E' },
    { name: 'Narayan', phone: '9876543216', pin: '7777', role: 'Server', pay_type: 'daily', daily_wage: 500, salary: 15000, joined: '2025-11-01', bonus: 'pay', color: '#4A7BB7' },
    { name: 'Shrini', phone: '9876543217', pin: '8888', role: 'Pastry & Bakery Chef', pay_type: 'monthly', daily_wage: 650, salary: 19500, joined: '2025-07-01', bonus: 'leave', color: '#E8B44A' },
    { name: 'Karthik', phone: '9876543218', pin: '9999', role: 'Line Cook', pay_type: 'monthly', daily_wage: 550, salary: 16500, joined: '2025-09-15', bonus: 'pay', color: '#2F7D4F' },
    { name: 'Shivam', phone: '9876543219', pin: '1234', role: 'Kitchen Steward', pay_type: 'daily', daily_wage: 500, salary: 15000, joined: '2025-08-10', bonus: 'pay', color: '#7A746A' }
  ];

  const insertEmployee = db.prepare(`
    INSERT INTO employees (id, name, phone, pin, role, pay_type, daily_wage, monthly_salary, joining_date, is_active, bonus_preference, avatar_color)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      role = excluded.role,
      pay_type = excluded.pay_type,
      daily_wage = excluded.daily_wage,
      monthly_salary = excluded.monthly_salary,
      avatar_color = excluded.avatar_color
  `);

  staff.forEach((emp, idx) => {
    insertEmployee.run(idx + 1, emp.name, emp.phone, emp.pin, emp.role, emp.pay_type, emp.daily_wage, emp.salary, emp.joined, emp.bonus, emp.color);
  });

  const insertDay = db.prepare(`
    INSERT INTO days (employee_id, date, status, deduction, is_late, late_minutes, break_taken_minutes, break_skipped, manual_override, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(employee_id, date) DO NOTHING
  `);

  const insertPunch = db.prepare(`
    INSERT INTO punches (employee_id, type, timestamp, date, ssid, source, notes, reviewed)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Seed August 2026, September 2026, October 2026 (Past months)
  const pastMonths = [
    { year: 2026, month: 8, days: 31 },
    { year: 2026, month: 9, days: 30 },
    { year: 2026, month: 10, days: 31 }
  ];

  for (const mObj of pastMonths) {
    const mStr = `${mObj.year}-${String(mObj.month).padStart(2, '0')}`;

    // Mark payroll month as finalized
    db.prepare(`
      INSERT INTO payroll_months (month, is_finalized, finalized_at, finalized_by)
      VALUES (?, 1, ?, 'Owner (Abhigit)')
      ON CONFLICT(month) DO NOTHING
    `).run(mStr, `${mStr}-30 23:59:59`);

    // Populate realistic attendance for each staff
    for (let empId = 1; empId <= 10; empId++) {
      for (let d = 1; d <= mObj.days; d++) {
        // Skip Tuesdays as general weekly off rotation
        const dateObj = new Date(mObj.year, mObj.month - 1, d);
        const dayOfWeek = dateObj.getDay(); // 2 = Tuesday
        const dateStr = `${mStr}-${String(d).padStart(2, '0')}`;

        if (dayOfWeek === 2) {
          // Off day
          continue;
        }

        // Varied realism:
        if (empId === 3 && (d === 5 || d === 12 || d === 19)) {
          // Rohan late 3 times
          insertDay.run(empId, dateStr, 'late', 'none', 1, 20, 180, 0, 0, 'Traffic delay');
        } else if (empId === 6 && d === 14) {
          // Neha 1 paid leave
          insertDay.run(empId, dateStr, 'paid_leave', 'none', 0, 0, 0, 0, 0, 'Personal leave');
        } else if (empId === 5 && (d === 4 || d === 11 || d === 18 || d === 25)) {
          // Vikram banked 4 breaks
          insertDay.run(empId, dateStr, 'present', 'none', 0, 0, 0, 1, 0, 'Busy floor service - break banked');
        } else {
          insertDay.run(empId, dateStr, 'present', 'none', 0, 0, 180, 0, 0, null);
        }
      }
    }
  }

  // Seed November 2026 (Current Active Month)
  const currentMonthStr = '2026-11';
  db.prepare(`
    INSERT INTO payroll_months (month, is_finalized, finalized_at, finalized_by)
    VALUES (?, 0, null, null)
    ON CONFLICT(month) DO NOTHING
  `).run(currentMonthStr);

  for (let d = 1; d <= 14; d++) {
    const dayStr = `${currentMonthStr}-${String(d).padStart(2, '0')}`;

    // Aarav (emp 1): skipped 3 breaks
    const aaravSkipped = (d === 3 || d === 7 || d === 11) ? 1 : 0;
    insertDay.run(1, dayStr, 'present', 'none', 0, 0, aaravSkipped ? 0 : 180, aaravSkipped, 0, null);
    insertPunch.run(1, 'check_in', `${dayStr}T12:02:00`, dayStr, 'ABHIGIT 5G', 'app', null, 1);
    insertPunch.run(1, 'check_out', `${dayStr}T23:58:00`, dayStr, 'ABHIGIT 5G', 'app', null, 1);

    // Priya (emp 2): present
    insertDay.run(2, dayStr, 'present', 'none', 0, 0, 180, 0, 0, null);
    insertPunch.run(2, 'check_in', `${dayStr}T12:05:00`, dayStr, 'ABHIGIT 5G', 'app', null, 1);
    insertPunch.run(2, 'check_out', `${dayStr}T23:55:00`, dayStr, 'ABHIGIT 5G', 'app', null, 1);

    // Rohan (emp 3): Late on days 2, 6, 12 (3 late marks)
    const rohanLate = (d === 2 || d === 6 || d === 12);
    insertDay.run(3, dayStr, rohanLate ? 'late' : 'present', 'none', rohanLate ? 1 : 0, rohanLate ? 25 : 0, 180, 0, 0, rohanLate ? 'Late arrival' : null);
    insertPunch.run(3, 'check_in', `${dayStr}T${rohanLate ? '12:25:00' : '12:04:00'}`, dayStr, 'ABHIGIT 5G', 'app', null, 1);
    insertPunch.run(3, 'check_out', `${dayStr}T23:59:00`, dayStr, 'ABHIGIT 5G', 'app', null, 1);

    // Ananya (emp 4): paid leaves on days 4, 5
    if (d === 4 || d === 5) {
      insertDay.run(4, dayStr, 'paid_leave', 'none', 0, 0, 0, 0, 0, 'Family celebration');
    } else {
      insertDay.run(4, dayStr, 'present', 'none', 0, 0, 180, 0, 0, null);
      insertPunch.run(4, 'check_in', `${dayStr}T12:08:00`, dayStr, 'ABHIGIT 5G', 'app', null, 1);
      insertPunch.run(4, 'check_out', `${dayStr}T23:50:00`, dayStr, 'ABHIGIT 5G', 'app', null, 1);
    }

    // Vikram (emp 5): 4 banked breaks
    const vikramSkipped = (d === 1 || d === 4 || d === 8 || d === 12) ? 1 : 0;
    insertDay.run(5, dayStr, 'present', 'none', 0, 0, vikramSkipped ? 0 : 180, vikramSkipped, 0, null);
    insertPunch.run(5, 'check_in', `${dayStr}T12:01:00`, dayStr, 'ABHIGIT 5G', 'app', null, 1);
    insertPunch.run(5, 'check_out', `${dayStr}T23:59:00`, dayStr, 'ABHIGIT 5G', 'app', null, 1);

    // Neha (emp 6): 3 paid leaves + 1 unpaid on day 10
    if (d >= 2 && d <= 4) {
      insertDay.run(6, dayStr, 'paid_leave', 'none', 0, 0, 0, 0, 0, 'Medical leave');
    } else if (d === 10) {
      insertDay.run(6, dayStr, 'unpaid_leave', 'none', 0, 0, 0, 0, 0, 'Unpaid leave');
    } else {
      insertDay.run(6, dayStr, 'present', 'none', 0, 0, 180, 0, 0, null);
      insertPunch.run(6, 'check_in', `${dayStr}T12:06:00`, dayStr, 'ABHIGIT 5G', 'app', null, 1);
      insertPunch.run(6, 'check_out', `${dayStr}T23:55:00`, dayStr, 'ABHIGIT 5G', 'app', null, 1);
    }

    // Kabir (emp 7 - daily wage): Day 9 half-day
    if (d === 9) {
      insertDay.run(7, dayStr, 'half_day', 'half', 0, 0, 0, 0, 1, 'Early departure at 6 PM');
      insertPunch.run(7, 'check_in', `${dayStr}T12:00:00`, dayStr, 'ABHIGIT 5G', 'app', null, 1);
      insertPunch.run(7, 'check_out', `${dayStr}T18:00:00`, dayStr, 'ABHIGIT 5G', 'manual', 'Early exit', 1);
    } else {
      insertDay.run(7, dayStr, 'present', 'none', 0, 0, 180, 0, 0, null);
      insertPunch.run(7, 'check_in', `${dayStr}T12:09:00`, dayStr, 'ABHIGIT 5G', 'app', null, 1);
      insertPunch.run(7, 'check_out', `${dayStr}T23:50:00`, dayStr, 'ABHIGIT 5G', 'app', null, 1);
    }

    // Tanvi (emp 8): present
    insertDay.run(8, dayStr, 'present', 'none', 0, 0, 180, 0, 0, null);
    // Rahul (emp 9): present
    insertDay.run(9, dayStr, 'present', 'none', 0, 0, 180, 0, 0, null);

    // Sunil (emp 10 - daily wage): Day 10 auto checkout awaiting review
    insertDay.run(10, dayStr, 'present', 'none', 0, 0, 180, 0, 0, d === 10 ? 'Midnight auto check-out' : null);
    insertPunch.run(10, 'check_in', `${dayStr}T12:12:00`, dayStr, 'ABHIGIT 5G', 'app', null, 1);
    insertPunch.run(10, 'check_out', `${dayStr}T00:00:00`, dayStr, 'ABHIGIT 5G', d === 10 ? 'auto' : 'app', d === 10 ? 'Auto check-out at midnight' : null, d === 10 ? 0 : 1);
  }

  // Today is Nov 15, 2026:
  // Fresh start for trial: All staff start in "not_in_yet" ready to test live check-in!
  const todayStr = '2026-11-15';

  // 3. Pending Items in Unified Inbox
  // A. Leave requests:
  db.prepare(`
    INSERT INTO leave_requests (id, employee_id, start_date, end_date, days_count, reason, is_paid, status, created_at)
    VALUES
      (1, 6, '2026-11-25', '2026-11-26', 2, 'Cousin wedding out of town', 0, 'pending', '2026-11-14 16:45:00'),
      (2, 3, '2026-11-28', '2026-11-28', 1, 'Doctor appointment', 1, 'pending', '2026-11-15 09:30:00'),
      (3, 4, '2026-11-18', '2026-11-18', 1, 'Family celebration', 1, 'approved', '2026-11-12 10:00:00')
    ON CONFLICT(id) DO NOTHING
  `).run();

  // B. Staff Manual Punch Fix Requests ("Forgot to punch? Request a fix"):
  db.prepare(`
    INSERT INTO punch_requests (id, employee_id, type, date, time, reason, status, created_at)
    VALUES
      (1, 8, 'check_in', '2026-11-14', '12:00', 'Phone battery died during morning transit', 'pending', '2026-11-14 14:10:00'),
      (2, 9, 'check_out', '2026-11-13', '23:55', 'Wi-Fi router rebooting during store closing', 'pending', '2026-11-14 09:15:00')
    ON CONFLICT(id) DO NOTHING
  `).run();

  // 4. Preloaded Indian National & Gazetted Holidays (2026 - 2027)
  const indianHolidays = [
    // 2026
    { date: '2026-01-26', name: 'Republic Day', is_paid: 1 },
    { date: '2026-02-17', name: 'Maha Shivratri', is_paid: 1 },
    { date: '2026-03-04', name: 'Holi', is_paid: 1 },
    { date: '2026-04-03', name: 'Good Friday', is_paid: 1 },
    { date: '2026-04-14', name: 'Dr. Ambedkar Jayanti', is_paid: 1 },
    { date: '2026-05-01', name: 'Maharashtra Day / Labour Day', is_paid: 1 },
    { date: '2026-05-31', name: 'Bakrid / Eid al-Adha', is_paid: 1 },
    { date: '2026-08-15', name: 'Independence Day', is_paid: 1 },
    { date: '2026-08-28', name: 'Raksha Bandhan', is_paid: 1 },
    { date: '2026-09-04', name: 'Janmashtami', is_paid: 1 },
    { date: '2026-09-15', name: 'Milad-un-Nabi', is_paid: 1 },
    { date: '2026-10-02', name: 'Mahatma Gandhi Jayanti', is_paid: 1 },
    { date: '2026-10-20', name: 'Dussehra (Vijayadashami)', is_paid: 1 },
    { date: '2026-11-08', name: 'Diwali (Laxmi Pujan)', is_paid: 1 },
    { date: '2026-11-10', name: 'Bhai Dooj', is_paid: 1 },
    { date: '2026-11-24', name: 'Guru Nanak Jayanti', is_paid: 1 },
    { date: '2026-12-25', name: 'Christmas Day', is_paid: 1 },
    // 2027
    { date: '2027-01-26', name: 'Republic Day', is_paid: 1 },
    { date: '2027-03-08', name: 'Maha Shivratri', is_paid: 1 },
    { date: '2027-03-23', name: 'Holi', is_paid: 1 },
    { date: '2027-03-26', name: 'Good Friday', is_paid: 1 },
    { date: '2027-04-14', name: 'Dr. Ambedkar Jayanti', is_paid: 1 },
    { date: '2027-05-01', name: 'Maharashtra Day / Labour Day', is_paid: 1 },
    { date: '2027-05-20', name: 'Eid al-Adha', is_paid: 1 },
    { date: '2027-08-15', name: 'Independence Day', is_paid: 1 },
    { date: '2027-08-17', name: 'Raksha Bandhan', is_paid: 1 },
    { date: '2027-08-25', name: 'Janmashtami', is_paid: 1 },
    { date: '2027-10-02', name: 'Mahatma Gandhi Jayanti', is_paid: 1 },
    { date: '2027-10-10', name: 'Dussehra', is_paid: 1 },
    { date: '2027-10-29', name: 'Diwali', is_paid: 1 },
    { date: '2027-11-14', name: 'Guru Nanak Jayanti', is_paid: 1 },
    { date: '2027-12-25', name: 'Christmas Day', is_paid: 1 }
  ];

  const insertHoliday = db.prepare(`
    INSERT INTO holidays (date, name, is_paid)
    VALUES (?, ?, ?)
    ON CONFLICT(date) DO UPDATE SET name = excluded.name, is_paid = excluded.is_paid
  `);

  for (const h of indianHolidays) {
    insertHoliday.run(h.date, h.name, h.is_paid);
  }

  // Audit log
  db.prepare(`
    INSERT INTO audit_log (employee_id, target_date, action, actor, details, timestamp)
    VALUES (null, null, 'system_init', 'System', 'Multi-month seed data loaded for Meats & Plants (Aug - Nov 2026)', '2026-11-01 00:00:00')
  `).run();

  console.log('Seeding complete! 4 months of data, staff daily/monthly wage types, and inbox items ready.');
}
