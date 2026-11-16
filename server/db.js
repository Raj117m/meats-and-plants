import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '..', 'meats_and_plants.db');

export const db = new DatabaseSync(DB_PATH);

// Enable WAL mode and foreign keys
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      shift_start TEXT NOT NULL DEFAULT '12:00',
      shift_end TEXT NOT NULL DEFAULT '00:00',
      grace_minutes INTEGER NOT NULL DEFAULT 15,
      late_marks_per_half_day INTEGER NOT NULL DEFAULT 3,
      paid_leaves_per_month INTEGER NOT NULL DEFAULT 3,
      break_length_minutes INTEGER NOT NULL DEFAULT 180,
      skipped_breaks_needed INTEGER NOT NULL DEFAULT 4,
      bonus_type TEXT NOT NULL DEFAULT 'pay',
      auto_checkout_time TEXT NOT NULL DEFAULT '00:00',
      allowed_ssids TEXT NOT NULL DEFAULT 'ABHIGIT 5G',
      cafe_name TEXT NOT NULL DEFAULT 'Meats & Plants',
      owner_pin TEXT NOT NULL DEFAULT '1234',
      owner_password TEXT NOT NULL DEFAULT 'meats2026',
      owner_name TEXT NOT NULL DEFAULT 'Abhigit',
      leave_approval_required INTEGER NOT NULL DEFAULT 1,
      store_lat REAL NOT NULL DEFAULT 19.2604227,
      store_lng REAL NOT NULL DEFAULT 72.9794437,
      geofence_radius INTEGER NOT NULL DEFAULT 30,
      store_address TEXT NOT NULL DEFAULT 'Sparta Building, Park Avenue, Hiranandani Estate, Thane West, Maharashtra 400607',
      allow_offsite_checkout INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS locations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      radius INTEGER NOT NULL DEFAULT 75,
      address TEXT,
      is_primary INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT UNIQUE NOT NULL,
      pin TEXT NOT NULL DEFAULT '1234',
      role TEXT NOT NULL,
      pay_type TEXT NOT NULL DEFAULT 'monthly', -- 'monthly' or 'daily'
      daily_wage INTEGER NOT NULL DEFAULT 600,
      monthly_salary INTEGER NOT NULL,
      joining_date TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      bonus_preference TEXT NOT NULL DEFAULT 'pay',
      avatar_color TEXT NOT NULL DEFAULT '#2F7D4F',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS punches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      type TEXT NOT NULL, -- 'check_in', 'start_break', 'end_break', 'check_out'
      timestamp TEXT NOT NULL,
      date TEXT NOT NULL, -- YYYY-MM-DD
      ssid TEXT NOT NULL DEFAULT 'ABHIGIT 5G',
      source TEXT NOT NULL DEFAULT 'app', -- 'app', 'manual', 'auto'
      notes TEXT,
      reviewed INTEGER NOT NULL DEFAULT 0,
      lat REAL,
      lng REAL,
      accuracy REAL,
      distance_m REAL,
      FOREIGN KEY(employee_id) REFERENCES employees(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS days (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      date TEXT NOT NULL, -- YYYY-MM-DD
      status TEXT NOT NULL, -- 'present', 'late', 'paid_leave', 'unpaid_leave', 'absent', 'half_day', 'upcoming_leave', 'pending_leave'
      deduction TEXT NOT NULL DEFAULT 'none', -- 'none', 'half', 'full'
      is_late INTEGER NOT NULL DEFAULT 0,
      late_minutes INTEGER NOT NULL DEFAULT 0,
      break_taken_minutes INTEGER NOT NULL DEFAULT 0,
      break_skipped INTEGER NOT NULL DEFAULT 0,
      manual_override INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(employee_id, date),
      FOREIGN KEY(employee_id) REFERENCES employees(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS leave_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      days_count INTEGER NOT NULL DEFAULT 1,
      reason TEXT,
      is_paid INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'denied'
      reviewed_by TEXT,
      reviewed_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(employee_id) REFERENCES employees(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS punch_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      type TEXT NOT NULL, -- 'check_in', 'start_break', 'end_break', 'check_out'
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'denied'
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      reviewed_by TEXT,
      reviewed_at TEXT,
      FOREIGN KEY(employee_id) REFERENCES employees(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS break_redemptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      month TEXT NOT NULL, -- YYYY-MM
      type TEXT NOT NULL, -- 'pay' or 'leave'
      breaks_redeemed INTEGER NOT NULL DEFAULT 4,
      amount INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(employee_id) REFERENCES employees(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS payroll_months (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      month TEXT UNIQUE NOT NULL, -- YYYY-MM
      is_finalized INTEGER NOT NULL DEFAULT 0,
      finalized_at TEXT,
      finalized_by TEXT
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER,
      target_date TEXT,
      action TEXT NOT NULL,
      actor TEXT NOT NULL DEFAULT 'Owner',
      details TEXT NOT NULL,
      timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS push_notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      type TEXT NOT NULL,
      sent_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      read_status INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY(employee_id) REFERENCES employees(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS holidays (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE, -- YYYY-MM-DD
      name TEXT NOT NULL,
      is_paid INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Safely ensure new columns exist in existing tables if upgrading
  try {
    db.exec(`ALTER TABLE settings ADD COLUMN owner_password TEXT NOT NULL DEFAULT 'meats2026';`);
  } catch {}
  try {
    db.exec(`ALTER TABLE settings ADD COLUMN owner_name TEXT NOT NULL DEFAULT 'Abhigit';`);
  } catch {}
  try {
    db.exec(`ALTER TABLE settings ADD COLUMN leave_approval_required INTEGER NOT NULL DEFAULT 1;`);
  } catch {}
  try {
    db.exec(`ALTER TABLE settings ADD COLUMN store_lat REAL NOT NULL DEFAULT 19.2604227;`);
  } catch {}
  try {
    db.exec(`ALTER TABLE settings ADD COLUMN store_lng REAL NOT NULL DEFAULT 72.9794437;`);
  } catch {}
  try {
    db.exec(`ALTER TABLE settings ADD COLUMN geofence_radius INTEGER NOT NULL DEFAULT 150;`);
  } catch {}
  try {
    db.exec(`ALTER TABLE settings ADD COLUMN store_address TEXT NOT NULL DEFAULT 'Sparta Building, Park Avenue, Hiranandani Estate, Thane West, Maharashtra 400607';`);
  } catch {}
  try {
    db.exec(`ALTER TABLE settings ADD COLUMN allow_offsite_checkout INTEGER NOT NULL DEFAULT 1;`);
  } catch {}
  try {
    db.exec(`ALTER TABLE employees ADD COLUMN pay_type TEXT NOT NULL DEFAULT 'monthly';`);
  } catch {}
  try {
    db.exec(`ALTER TABLE employees ADD COLUMN daily_wage INTEGER NOT NULL DEFAULT 600;`);
  } catch {}
  try {
    db.exec(`ALTER TABLE employees ADD COLUMN break_bank_skipped INTEGER NOT NULL DEFAULT 0;`);
  } catch {}
  try {
    db.exec(`ALTER TABLE employees ADD COLUMN bonus_holidays_earned INTEGER NOT NULL DEFAULT 0;`);
  } catch {}
  try {
    db.exec(`ALTER TABLE employees ADD COLUMN bonus_holidays_used INTEGER NOT NULL DEFAULT 0;`);
  } catch {}
  try {
    db.exec(`ALTER TABLE employees ADD COLUMN paid_leaves_quota INTEGER NOT NULL DEFAULT 3;`);
  } catch {}
  try {
    db.exec(`ALTER TABLE punches ADD COLUMN reviewed INTEGER NOT NULL DEFAULT 0;`);
  } catch {}
  try {
    db.exec(`ALTER TABLE punches ADD COLUMN lat REAL;`);
  } catch {}
  try {
    db.exec(`ALTER TABLE punches ADD COLUMN lng REAL;`);
  } catch {}
  try {
    db.exec(`ALTER TABLE punches ADD COLUMN accuracy REAL;`);
  } catch {}
  try {
    db.exec(`ALTER TABLE punches ADD COLUMN distance_m REAL;`);
  } catch {}

  try {
    const locCount = db.prepare('SELECT COUNT(*) as count FROM locations').get().count;
    if (locCount === 0) {
      db.prepare(`
        INSERT INTO locations (name, lat, lng, radius, address, is_primary)
        VALUES ('Meats & Plants — Sparta Building (Main)', 19.2604227, 72.9794437, 75, 'Sparta Building, Park Avenue, Hiranandani Estate, Thane West, Maharashtra 400607', 1)
      `).run();
    }
  } catch {}
}
