# 🌿 Meats & Plants — Staff & Payroll (v3)

A clean, premium, warm-toned web application and mobile-first staff attendance and deterministic payroll system designed for **Meats & Plants Café** (10 employees).

Built with a unified, modern café aesthetic: warm white canvas (`#FFFDF9`), soft cream surfaces (`#F6F2EA`), 16px rounded cards with delicate shadows, single font family (**Manrope** across all weights and components), softer chip colors, and an earthy café palette.

---

## 🔗 Single Link Access for Everyone

Everyone opens the exact same URL:
👉 **`http://localhost:4000/`**

1. **Staff Experience (Always Mobile Layout)**:
   - Fills screen naturally on mobile devices.
   - On laptops and desktops, renders as a centered phone column (`max-width: 430px`) on a warm cream canvas (`#F6F2EA`), never stretched.
2. **Staff Login (By Name — No Passcode)**:
   - **"Who's working today?"** screen displays 10 friendly name cards (avatar circle + first name) with real-time search.
   - Tap your name → confirmation card: **"Hi Ravi! 👋"** with a *"Remember me on this phone"* checkbox (default checked) → **Continue**.
   - When remembered, opening the link jumps directly to the **Today** screen.
   - A discreet **"Not you? Switch"** link at the top lets any employee switch or log out.
3. **Owner Access**:
   - Reached via the small, tasteful **"Owner"** button with lock icon in the top-right corner.
   - Opens password bottom sheet (Default password: `meats2026`).
   - Entering an invalid password triggers a gentle shake animation (`animate-shake`).
   - Owner session persists in `localStorage` until logout.

---

## 📍 Geo-Lock Replaces Wi-Fi Lock (v3)

Attendance actions (**Start Shift, Start Break, End Break, End Shift**) are strictly geofenced:

1. **High-Accuracy Geolocation**:
   - Uses `navigator.geolocation.getCurrentPosition` with `enableHighAccuracy: true` and 10s timeout.
   - Allowed when distance to café (Haversine formula) is `≤ radius + accuracy buffer` (accuracy buffer capped at 50 m).
   - If GPS accuracy is worse than 100 m, prompts employee to retry with better sky visibility.
   - Server re-validates the coordinates with every punch and saves `lat`, `lng`, `accuracy`, and `distance_m` on the punch record.
   - Owner manual punches continue to bypass the lock.
2. **Status Pill on Today Screen**:
   - 🟢 **Green**: `"📍 You're at Meats & Plants"` (inside 75m geofence)
   - 🔴 **Red**: `"📍 You're 1.2 km away. Head to the café to start your shift"` (outside geofence)
   - ⚪ **Grey**: `"Location off. Tap to allow"`
3. **Permission How-To Guide**:
   - If location access is denied, tapping the pill or action button displays a step-by-step how-to for turning on location in iPhone (Settings → Safari → Location) and Android (Chrome → Site Settings → Location).
4. **Settings → Location & Geofence**:
   - Plain-English configuration: *"Meats & Plants is located at [12.9716, 77.5946]. Shift actions allowed within a [75] m radius."*
   - Google Maps link paste helper to quickly extract latitude and longitude.
   - Interactive visual map preview with café pin and translucent green radius circle.
   - Radius slider (25 m – 250 m).
5. **Prototype Reviewer Toolbar**:
   - Includes one-click simulator buttons: `At Café (Inside 75m)`, `Away (1.2 km)`, and `Real GPS`.

---

## ☕ Break Bank & Staff Page Redemptions (v3)

1. **Break Bank Pill on Staff Page**:
   - Each employee row displays their live bank progress: `●●●○ (3 of 4 banked)`.
   - When reaching 4 banked breaks, the pill turns green: `●●●● (4 banked)` with two inline action buttons:
     - `+1 Day Pay`: immediately adds 1 day's pay to this month's payroll.
     - `+1 Paid Leave`: awards +1 extra paid leave.
   - Redeeming triggers an immediate update with an **Undo Toast** (`"Applied +1 Day Pay for Vikram. [Undo]"`) and an audit log entry.
   - The bank resets after each redemption (bank -= 4), and leftover banked breaks carry over to subsequent months.
   - Settings retains only the global threshold (`skipped_breaks_needed: 4`).

---

## 🔔 Pending Approvals on Staff Page (v3)

1. **Inline Pending Leave Chip**:
   - Each employee row with a pending leave request displays a small butter-colored chip: e.g. `1 pending · Nov 28 (paid)`.
2. **Leave Request Drawer**:
   - Clicking the chip opens a slide-over drawer with:
     - Requested dates and duration
     - Paid vs Unpaid status
     - Remaining paid leaves quota
     - Reason provided by the employee
     - `Approve` and `Deny` buttons
     - **"Message on WhatsApp"** button opening `wa.me/<phone>?text=Hi Ravi, about your leave on 28 Nov...`
3. **Instant Synchronization**:
   - Approvals made from the Staff page, Attendance matrix, or Approvals Inbox synchronize everywhere in real time.

---

## 🧭 Attendance Matrix as the Main Hub (v3)

The Attendance view serves as the central operational hub:

1. **Click Employee Name → Quick Profile Drawer**:
   - Editable pay contract type (`Daily wage` vs `Monthly salary`) and wage rate with instant inline Save.
   - Paid leaves left this month (`2 of 3`).
   - Late marks count (`1 of 3`).
   - Break bank with redemption buttons (`+1 Day Pay` / `+1 Paid Leave`) when ready.
   - Pending requests with inline Approve / Deny.
   - Projected net pay for the month.
   - Two bottom shortcuts: **"Open in Staff →"** and **"Open in Payroll →"** (navigates and highlights the employee).
2. **Hover Day Cell (or tap and hold on mobile) → Detail Tooltip**:
   - Date + status chip (Present / Late / Paid leave / Absent / Half-day / Pending).
   - In / Out punch times with `(auto)` or `(manual)` tags when applicable.
   - 3-hr break status: `Taken 3:10–6:10 PM`, `Skipped (banked)`, `Partial`, or `Not taken`.
   - Today's pay: `₹733`, `−₹367 (half-day)`, or `₹0 unpaid`.
   - Day note if present.
3. **Click Day Cell**: opens the existing day edit drawer to adjust punches, deductions, or approve leaves.
4. **Row of Totals (Bottom)**:
   - Shows total present staff count for each day across the café, and total month payroll payout. Clicking jumps to Payroll.
5. **Column of Totals (Right)**:
   - Displays Net Pay for each employee. Clicking jumps to Payroll with that employee highlighted.

---

## 🎨 Visual Polish & Typography (v3)

- **Single Font Family**: **Manrope** (Google Fonts) across all elements.
  - Headings: 700–800, tight letter-spacing (`-0.02em`).
  - Body: 500 (`font-medium`).
  - Numbers: 700 with tabular figures (`font-variant-numeric: tabular-nums`).
  - Serif font (Fraunces) removed completely.
- **Card Radius**: Consistent 16px (`rounded-2xl`).
- **Whitespace**: 32px (`space-y-8` / `gap-8`) between major sections.
- **Palette & Soft Chips**:
  - Present / Green: bg `#EAF5EE`, text `#23633E`, border `#C6E7D1`
  - Late / Butter: bg `#FEF7E6`, text `#9A6A12`, border `#FDE3A7`
  - Paid Leave / Blue: bg `#EDF4FC`, text `#2A5A8F`, border `#CDE0F7`
  - Absent / Red: bg `#FDF0ED`, text `#A8382B`, border `#F8D0C8`
  - Neutral: bg `#F3F1EC`, text `#55524B`, border `#E5E1D8`

---

## 👥 Seeded 10-Employee Dataset

| # | Name | Station / Role | Pay Type | Wage / Salary | Break Bank Status | Pending Requests |
|---|---|---|---|---|---|---|
| 1 | **Aarav Sharma** | Head Chef | Monthly | ₹22,000/mo (₹733/d) | ●●●○ (3 banked) | — |
| 2 | **Priya Nair** | Sous Chef | Monthly | ₹19,500/mo (₹650/d) | ○○○○ (0 banked) | — |
| 3 | **Rohan Verma** | Head Barista | Monthly | ₹18,000/mo (₹600/d) | ○○○○ (0 banked) | 1 pending · Nov 28 (paid) |
| 4 | **Ananya Sen** | Barista & Mixologist | Monthly | ₹16,500/mo (₹550/d) | ○○○○ (0 banked) | — |
| 5 | **Vikram Patel** | Floor Captain | Monthly | ₹18,500/mo (₹617/d) | ●●●● (12 banked, **Ready!**) | — |
| 6 | **Neha Roy** | Senior Server | Monthly | ₹15,500/mo (₹517/d) | ○○○○ (0 banked) | 1 pending · Nov 25-26 (unpaid) |
| 7 | **Kabir Das** | Server | Daily | ₹550/day (₹16,500/mo) | ○○○○ (0 banked) | — |
| 8 | **Tanvi Kulkarni** | Pastry & Bakery Chef | Monthly | ₹19,000/mo (₹633/d) | ○○○○ (0 banked) | — |
| 9 | **Rahul Mehra** | Line Cook | Monthly | ₹16,000/mo (₹533/d) | ○○○○ (0 banked) | — |
| 10 | **Sunil Jadhav** | Kitchen Steward | Daily | ₹500/day (₹15,000/mo) | ○○○○ (0 banked) | — |

*Vikram Patel has 12 banked breaks (shows green pill with `+1 Day Pay` and `+1 Paid Leave`).*  
*Rohan Verma and Neha Roy both have pending leave requests (showing butter chips on the Staff page).*

---

## 🧪 Testing & Execution

```bash
# Run unit tests
npm test

# Build production bundle
npm run build

# Start server
node server/index.js
```
Open **`http://localhost:4000/`** to explore the prototype.
