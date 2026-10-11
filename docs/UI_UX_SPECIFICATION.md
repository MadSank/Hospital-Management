# UI/UX Specification

## 1. Product Identity

**Product Name:** MedFlow HMS  
**Tagline:** Hospital Management System  
**Logo concept:** Stylized "M" with a heartbeat line motif, rendered in the primary teal color.

## 2. Design System

### 2.1 Color Palette

**Primary palette — Medical Teal:**
```
--primary-50:    hsl(174, 80%, 96%)   #E6FAF7
--primary-100:   hsl(174, 72%, 88%)   #B2F0E8
--primary-200:   hsl(174, 65%, 76%)   #73E3D4
--primary-300:   hsl(174, 58%, 62%)   #40CCBA
--primary-400:   hsl(174, 55%, 48%)   #2BA898
--primary-500:   hsl(174, 62%, 38%)   #248F82  (PRIMARY)
--primary-600:   hsl(174, 65%, 30%)   #1A7268
--primary-700:   hsl(174, 68%, 22%)   #12554E
--primary-800:   hsl(174, 70%, 16%)   #0C3D38
--primary-900:   hsl(174, 72%, 10%)   #072623
```

**Neutral palette:**
```
--gray-50:    #F8FAFC
--gray-100:   #F1F5F9
--gray-200:   #E2E8F0
--gray-300:   #CBD5E1
--gray-400:   #94A3B8
--gray-500:   #64748B
--gray-600:   #475569
--gray-700:   #334155
--gray-800:   #1E293B
--gray-900:   #0F172A
```

**Semantic colors:**
```
--success:    hsl(142, 71%, 45%)   #22C55E   — Completed, discharged, available
--warning:    hsl(38, 92%, 50%)    #F59E0B   — Pending, expiring, low stock
--danger:     hsl(0, 84%, 60%)     #EF4444   — Cancelled, critical, error
--info:       hsl(217, 91%, 60%)   #3B82F6   — In progress, informational
```

**Status-specific colors:**
```
--status-scheduled:   #3B82F6  (blue)
--status-checked-in:  #F59E0B  (amber)
--status-in-progress: #8B5CF6  (purple)
--status-completed:   #22C55E  (green)
--status-cancelled:   #EF4444  (red)
--status-no-show:     #6B7280  (gray)
```

### 2.2 Typography

**Font family:** Inter (Google Fonts)
- Fallback: `-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif`

**Scale:**
```
--text-xs:    0.75rem / 1rem      (12px) — badges, captions
--text-sm:    0.875rem / 1.25rem  (14px) — table cells, secondary text
--text-base:  1rem / 1.5rem       (16px) — body text, form labels
--text-lg:    1.125rem / 1.75rem  (18px) — card titles
--text-xl:    1.25rem / 1.75rem   (20px) — section headers
--text-2xl:   1.5rem / 2rem       (24px) — page titles
--text-3xl:   1.875rem / 2.25rem  (30px) — dashboard hero metrics
```

**Weights:** 400 (regular), 500 (medium), 600 (semibold), 700 (bold)

### 2.3 Spacing System

Base unit: 4px
```
--space-1:  0.25rem  (4px)
--space-2:  0.5rem   (8px)
--space-3:  0.75rem  (12px)
--space-4:  1rem     (16px)
--space-5:  1.25rem  (20px)
--space-6:  1.5rem   (24px)
--space-8:  2rem     (32px)
--space-10: 2.5rem   (40px)
--space-12: 3rem     (48px)
--space-16: 4rem     (64px)
```

### 2.4 Border Radius
```
--radius-sm:   0.25rem  (4px)   — small chips, badges
--radius-md:   0.375rem (6px)   — buttons, inputs
--radius-lg:   0.5rem   (8px)   — cards
--radius-xl:   0.75rem  (12px)  — modals, large cards
--radius-full: 9999px           — avatar circles
```

### 2.5 Shadows
```
--shadow-sm:   0 1px 2px 0 rgba(0,0,0,0.05)
--shadow-md:   0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)
--shadow-lg:   0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)
--shadow-xl:   0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)
```

### 2.6 Transitions
```
--transition-fast:   150ms ease
--transition-normal: 200ms ease
--transition-slow:   300ms ease
```

All interactive elements use `transition-normal` for hover/focus state changes.

## 3. Layout Architecture

### 3.1 App Shell

```
┌────────────────────────────────────────────────────────────┐
│ TopBar (h: 64px, fixed top)                                │
│ ┌──────┐  MedFlow HMS        🔔 3  👤 Dr. Amit Patel ▾   │
│ │ Logo │                                                    │
│ └──────┘                                                    │
├──────────┬─────────────────────────────────────────────────┤
│ Sidebar  │  Main Content Area                               │
│ (w:260px)│  ┌──────────────────────────────────────────┐   │
│          │  │ Breadcrumb: Dashboard > Patients > Detail │   │
│ 🏠 Dash  │  ├──────────────────────────────────────────┤   │
│ 👥 Pati  │  │                                          │   │
│ 📅 Appt  │  │  Page Content                            │   │
│ 🩺 Enco  │  │  (scrollable, padded 24px)               │   │
│ 💊 Phar  │  │                                          │   │
│ 🔬 Lab   │  │                                          │   │
│ 🛏️ Ward  │  │                                          │   │
│ 💰 Bill  │  │                                          │   │
│ 📊 Repo  │  │                                          │   │
│ ⚙️ Sett  │  │                                          │   │
│          │  └──────────────────────────────────────────┘   │
└──────────┴─────────────────────────────────────────────────┘
```

- **Sidebar:** Fixed left, 260px width, collapsible to 72px (icon-only) on smaller screens.
- **TopBar:** Fixed top, spans full width, contains logo, global search (optional), notification bell with unread count, user menu dropdown.
- **Main content:** Scrollable area with 24px padding, max-width 1400px.
- **Breadcrumbs:** Below top bar, inside main content area.

### 3.2 Responsive Breakpoints

```
sm:  640px   — Mobile
md:  768px   — Tablet (sidebar collapses to icon-only)
lg:  1024px  — Desktop (sidebar expanded)
xl:  1280px  — Wide desktop
2xl: 1536px  — Ultra-wide
```

On screens < 768px:
- Sidebar becomes a slide-in drawer triggered by hamburger menu.
- Tables switch to card-based layouts.
- Forms use full-width stacked layout.

## 4. Component Library

### 4.1 Buttons

| Variant | Usage | Style |
|---------|-------|-------|
| Primary | Main actions (Save, Create, Submit) | `bg-primary-500 text-white hover:bg-primary-600` |
| Secondary | Secondary actions (Cancel, Back) | `bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300` |
| Danger | Destructive actions (Delete, Cancel appointment) | `bg-red-500 text-white hover:bg-red-600` |
| Ghost | Tertiary actions, toolbar buttons | `text-gray-600 hover:bg-gray-100` |
| Link | Inline navigation | `text-primary-500 hover:underline` |

Sizes: `sm` (h: 32px), `md` (h: 40px, default), `lg` (h: 48px)

All buttons have `focus-visible:ring-2 ring-primary-500 ring-offset-2` for keyboard accessibility.

### 4.2 Status Badges

```
Scheduled    →  blue background, blue text, rounded pill
Checked In   →  amber background, amber text
In Progress  →  purple background, purple text
Completed    →  green background, green text
Cancelled    →  red background, red text
No Show      →  gray background, gray text
Pending      →  amber background, amber text
Dispensed    →  green background, green text
Admitted     →  blue background, blue text
Discharged   →  green background, green text
Available    →  green background
Occupied     →  red background
Maintenance  →  gray background
```

Style: `px-2.5 py-0.5 text-xs font-medium rounded-full` with semantic color + lighter background.

### 4.3 Data Tables

Built with TanStack Table:
- **Header:** `bg-gray-50 text-gray-600 text-sm font-semibold uppercase tracking-wider`
- **Rows:** Alternating white/gray-50 backgrounds, `hover:bg-primary-50` transition
- **Cells:** `py-3 px-4 text-sm text-gray-700`
- **Features:** Column sorting (click header), search input above table, per-column filters, pagination below
- **Pagination:** "Showing 1-20 of 150" with Previous/Next buttons and page numbers
- **Empty state:** Centered illustration with message "No patients found" and action button

### 4.4 Forms

- **Layout:** Labels above inputs, 6px gap, grouped in sections with section headers
- **Inputs:** `h-10 px-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500`
- **Labels:** `text-sm font-medium text-gray-700`
- **Required indicator:** Red asterisk after label
- **Help text:** `text-xs text-gray-500 mt-1` below input
- **Error text:** `text-xs text-red-500 mt-1` below input, input border turns red
- **Select:** Same style as input with chevron icon
- **Textarea:** Same border/focus style, min-height 80px
- **Checkbox/Radio:** Custom styled with primary color
- **Date picker:** Calendar popup using shadcn/ui date picker

### 4.5 Cards

- `bg-white rounded-lg border border-gray-200 shadow-sm`
- Hover: `hover:shadow-md transition-shadow`
- Sections separated by `border-t border-gray-100`

**Metric Card (Dashboard):**
```
┌──────────────────────────┐
│ 📅 Today's Appointments  │
│                          │
│      15                  │  (text-3xl font-bold)
│  ↑ 12% from yesterday   │  (text-sm text-green-500)
└──────────────────────────┘
```

### 4.6 Dialogs/Modals

- Centered, `max-w-lg` default, `rounded-xl shadow-xl`
- Dark overlay `bg-black/50`
- Header with title and close (X) button
- Body with scrollable content if long
- Footer with action buttons (right-aligned: Cancel, Primary Action)
- Animate in: scale from 95% to 100% + fade in (200ms)
- Close on Escape key and overlay click

### 4.7 Confirm Dialogs

For destructive actions:
```
┌──────────────────────────────┐
│ ⚠️  Cancel Appointment?     │
│                              │
│ This will cancel the appoint-│
│ ment for Rahul Sharma on     │
│ Jan 20, 2026 at 10:00 AM.    │
│                              │
│ Reason: [________________]   │
│                              │
│         [Cancel] [Confirm]   │
└──────────────────────────────┘
```

### 4.8 Toast Notifications

Using Sonner:
- Position: bottom-right
- Duration: 5 seconds (auto-dismiss)
- Variants: success (green), error (red), warning (amber), info (blue)
- Close button on hover
- Stacks up to 3 visible

### 4.9 Loading States

- **Page loading:** Skeleton loaders matching content layout (gray animated pulse blocks)
- **Table loading:** Skeleton rows (5 rows with pulsing cells)
- **Button loading:** Replace text with spinner, disable button
- **Form submit:** Disable all inputs and submit button, show spinner

### 4.10 Empty States

Centered in content area:
- Relevant Lucide icon (64px, gray-300)
- Title: `text-lg font-semibold text-gray-700`
- Description: `text-sm text-gray-500`
- Action button: Primary (e.g., "Register New Patient")

## 5. Navigation Structure by Role

### 5.1 Administrator

```
📊 Dashboard
👥 Patients
   └── All Patients
   └── Register Patient
👨‍⚕️ Staff Management
   └── All Staff
   └── Departments
📅 Appointments
   └── Calendar View
   └── Queue
🩺 Consultations
💊 Pharmacy
   └── Medicines
   └── Inventory
   └── Dispensing
🔬 Laboratory
   └── Test Catalog
   └── Orders
🛏️ Wards & Beds
   └── Ward Management
   └── Admissions
💰 Billing
   └── Invoices
   └── Payments
📊 Reports & Analytics
📋 Audit Logs
⚙️ Settings
```

### 5.2 Doctor

```
📊 Dashboard (My Summary)
📅 My Appointments
   └── Today
   └── Calendar
🩺 My Consultations
   └── Active Encounters
   └── History
💊 Prescriptions
🔬 Lab Orders
   └── My Orders
   └── Results
👥 My Patients
🔔 Notifications
```

### 5.3 Receptionist

```
📊 Dashboard
👥 Patients
   └── Register
   └── Search
📅 Appointments
   └── Book Appointment
   └── Today's Schedule
   └── Check-in Queue
💰 Billing
   └── Create Invoice
   └── Payments
🔔 Notifications
```

### 5.4 Nurse

```
📊 Dashboard
📅 Appointments
   └── Today
   └── Check-in
🩺 Patient Care
   └── Record Vitals
   └── Active Patients
🛏️ Wards & Beds
   └── Bed Status
   └── Admissions
🔔 Notifications
```

### 5.5 Pharmacist

```
📊 Dashboard
💊 Pharmacy
   └── Pending Prescriptions
   └── Dispense
   └── Medicine Catalog
   └── Inventory
   └── Stock Alerts
   └── Stock Movements
🔔 Notifications
```

### 5.6 Laboratory Technician

```
📊 Dashboard
🔬 Laboratory
   └── Pending Orders
   └── Sample Collection
   └── Enter Results
   └── All Orders
   └── Test Catalog
🔔 Notifications
```

### 5.7 Patient

```
📊 My Dashboard
📅 My Appointments
   └── Book Appointment
   └── History
🩺 Medical Records
   └── Visit History
   └── Prescriptions
   └── Lab Results
💰 My Invoices
🔔 Notifications
👤 My Profile
```

## 6. Key Screen Specifications

### 6.1 Login Page

- Centered card on gradient background (`primary-800` to `primary-900`)
- MedFlow HMS logo and tagline at top
- Email input, password input (with show/hide toggle), "Sign In" button
- Error message below form on failure
- Demo accounts hint at bottom (collapsible)
- No registration link (accounts created by admin)

### 6.2 Admin Dashboard

```
┌──────────────────────────────────────────────────────────┐
│ Welcome back, Administrator                               │
│ Thursday, January 15, 2026                                │
├──────────┬──────────┬──────────┬──────────┬──────────────┤
│ 📊       │ 👥       │ 📅       │ 🛏️       │ ⚠️          │
│ Revenue  │ Patients │ Appts    │ Beds     │ Alerts       │
│ Today    │ Total    │ Today    │ Occupied │ Count        │
│ ₹12,500  │ 250      │ 15       │ 8/20     │ 3            │
│ +12%     │ +5 new   │ 6 done   │ 40%      │ Low stock    │
├──────────┴──────────┴──────────┴──────────┴──────────────┤
│ ┌─────────────────────────┐ ┌──────────────────────────┐ │
│ │ Appointments This Week  │ │ Revenue This Month       │ │
│ │ [Bar Chart]             │ │ [Line Chart]             │ │
│ │                         │ │                          │ │
│ └─────────────────────────┘ └──────────────────────────┘ │
│ ┌─────────────────────────┐ ┌──────────────────────────┐ │
│ │ Recent Patients         │ │ Bed Occupancy            │ │
│ │ [Table: 5 recent]       │ │ [Donut Chart by ward]    │ │
│ └─────────────────────────┘ └──────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────┐  │
│ │ Alerts & Notifications                               │  │
│ │ ⚠️ Low stock: Amoxicillin 500mg (30 remaining)      │  │
│ │ ⚠️ Expiring: Paracetamol Batch BTH-2025-010 (Feb 15)│  │
│ │ 📅 5 appointments pending check-in                   │  │
│ └─────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

### 6.3 Doctor Dashboard

```
┌──────────────────────────────────────────────────────────┐
│ Good Morning, Dr. Amit Patel                              │
│ Thursday, January 15, 2026                                │
├──────────┬──────────┬──────────┬─────────────────────────┤
│ 📅       │ 🩺       │ 💊       │ 🔬                      │
│ Today's  │ Pending  │ Active   │ Pending                  │
│ Appts    │ Consult  │ Prescrip │ Lab Results              │
│ 8        │ 3        │ 5        │ 2                        │
├──────────┴──────────┴──────────┴─────────────────────────┤
│ ┌─────────────────────────────────────────────────────┐  │
│ │ Today's Schedule                                     │  │
│ │ ┌─────┬─────────────┬───────────┬──────────────────┐│  │
│ │ │Time │ Patient      │ Type      │ Status           ││  │
│ │ │09:00│ Rahul Sharma │ Consult   │ ✅ Completed     ││  │
│ │ │09:30│ Priya Mehta  │ Follow-up │ 🟡 Checked In   ││  │
│ │ │10:00│ Amit Kumar   │ Consult   │ 🔵 Scheduled    ││  │
│ │ └─────┴─────────────┴───────────┴──────────────────┘│  │
│ └─────────────────────────────────────────────────────┘  │
│ ┌───────────────────────┐ ┌────────────────────────────┐ │
│ │ Waiting Queue (3)     │ │ Recent Lab Results          │ │
│ │ 1. Priya Mehta (12m)  │ │ Rahul Sharma - CBC ✅       │ │
│ │ 2. Sunil Verma (5m)   │ │ Amit Kumar - Lipid ⏳       │ │
│ └───────────────────────┘ └────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

### 6.4 Patient List Page

```
┌──────────────────────────────────────────────────────────┐
│ Patients                                     [+ Register]│
│ ─────────────────────────────────────────────────────────│
│ [🔍 Search patients...] [Gender ▾] [Blood Group ▾]      │
│                                                          │
│ ┌────┬─────────┬───────────────┬────────┬──────┬───────┐│
│ │ ID │ Name     │ Phone         │ Gender │ DOB  │Actions││
│ ├────┼─────────┼───────────────┼────────┼──────┼───────┤│
│ │0001│R. Sharma │+91-9876543210│ Male   │05/90 │👁 ✏️  ││
│ │0002│P. Mehta  │+91-9876543211│ Female │03/85 │👁 ✏️  ││
│ └────┴─────────┴───────────────┴────────┴──────┴───────┘│
│ Showing 1-20 of 150          [← 1 2 3 ... 8 →]          │
└──────────────────────────────────────────────────────────┘
```

### 6.5 Patient Registration Form

Two-column layout in a card:
- **Left column:** Personal info (name, DOB, gender, blood group, phone, email)
- **Right column:** Address, medical history, allergies, notes
- **Below:** Emergency contacts (dynamic add/remove rows)
- **Footer:** Cancel and Save buttons

All fields have inline validation with error messages.

### 6.6 Appointment Booking

**Step 1:** Select doctor (filterable by department/specialty)  
**Step 2:** Select date (calendar, shows doctor availability)  
**Step 3:** Select time slot (grid of available slots, booked ones grayed out)  
**Step 4:** Enter reason and confirm  

Or: Single form with dependent dropdowns (department → doctor → date → slot).

### 6.7 Encounter/Consultation Page

Full-width form with sections:
```
┌──────────────────────────────────────────────────────────┐
│ Consultation — Rahul Sharma (PAT-0001)          [Save] │
│ Dr. Amit Patel | Jan 15, 2026                            │
├──────────────────────────────────────────────────────────┤
│ ┌─ Vitals ──────────────────────────────────────────┐   │
│ │ Temp: [98.6°F]  BP: [120/80]  HR: [72]  SpO2:[98]│   │
│ │ Weight: [75.5kg]  Height: [170cm]  RR: [16]      │   │
│ └───────────────────────────────────────────────────┘   │
│ ┌─ Chief Complaint ────────────────────────────────┐    │
│ │ [_____________________________________________]   │    │
│ └──────────────────────────────────────────────────┘    │
│ ┌─ History of Present Illness ─────────────────────┐    │
│ │ [_____________________________________________]   │    │
│ └──────────────────────────────────────────────────┘    │
│ ┌─ Examination Notes ─────────────────────────────┐     │
│ │ [_____________________________________________]   │    │
│ └──────────────────────────────────────────────────┘    │
│ ┌─ Diagnoses ──────────────────────────────────────┐    │
│ │ [+ Add Diagnosis]                                 │    │
│ │ • Unstable Angina (I20.0) — Primary              │    │
│ └──────────────────────────────────────────────────┘    │
│ ┌─ Assessment & Plan ─────────────────────────────┐     │
│ │ [_____________________________________________]   │    │
│ └──────────────────────────────────────────────────┘    │
│                                                          │
│ [+ Create Prescription]  [+ Order Lab Tests]             │
│ [Complete Encounter]                                      │
└──────────────────────────────────────────────────────────┘
```

### 6.8 Prescription View (Print-Friendly)

```
┌──────────────────────────────────────────────────────────┐
│                    MedFlow HMS                            │
│                 PRESCRIPTION                              │
│──────────────────────────────────────────────────────────│
│ Patient: Rahul Sharma (PAT-0001)    Date: Jan 15, 2026  │
│ Doctor: Dr. Amit Patel              Dept: Cardiology     │
│──────────────────────────────────────────────────────────│
│ Rx                                                       │
│                                                          │
│ 1. Amoxicillin 500mg Capsule                            │
│    Dosage: 500mg | Frequency: 3x daily | Route: Oral    │
│    Duration: 7 days | Qty: 21                           │
│    Instructions: Take after meals                        │
│                                                          │
│ 2. Paracetamol 500mg Tablet                             │
│    Dosage: 500mg | Frequency: As needed | Route: Oral   │
│    Duration: 5 days | Qty: 15                           │
│    Instructions: For fever above 100°F                  │
│──────────────────────────────────────────────────────────│
│ Notes: Complete full course of antibiotics               │
│                                                          │
│ Signature: ___________________                           │
│ Dr. Amit Patel, MD Cardiology                           │
└──────────────────────────────────────────────────────────┘
```

### 6.9 Pharmacy Dispensing Page

```
┌──────────────────────────────────────────────────────────┐
│ Pending Prescriptions                                     │
│──────────────────────────────────────────────────────────│
│ ┌─ PRE-0005 ─────────────────────────────────────────┐  │
│ │ Patient: Rahul Sharma    Doctor: Dr. Patel          │  │
│ │ Date: Jan 15, 2026       Status: 🟡 Pending        │  │
│ │                                                      │  │
│ │ Items:                                               │  │
│ │ ☐ Amoxicillin 500mg × 21  Stock: 230  Batch: [▾]   │  │
│ │ ☐ Paracetamol 500mg × 15  Stock: 500  Batch: [▾]   │  │
│ │                                                      │  │
│ │                              [Dispense Selected]     │  │
│ └──────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

### 6.10 Invoice Page (Print-Friendly)

```
┌──────────────────────────────────────────────────────────┐
│                    MedFlow HMS                            │
│                      INVOICE                              │
│──────────────────────────────────────────────────────────│
│ Invoice: INV-0042          Date: Jan 15, 2026            │
│ Patient: Rahul Sharma      Status: 🟡 Partially Paid    │
│──────────────────────────────────────────────────────────│
│ # │ Description                │ Qty │ Price  │ Total    │
│ 1 │ Consultation - Dr. Patel   │  1  │ ₹500   │ ₹500    │
│ 2 │ CBC Test                   │  1  │ ₹350   │ ₹350    │
│ 3 │ Amoxicillin 500mg          │  21 │ ₹25    │ ₹525    │
│ 4 │ Paracetamol 500mg          │  15 │ ₹10    │ ₹150    │
│──────────────────────────────────────────────────────────│
│                                   Subtotal:    ₹1,525    │
│                                   Discount:    ₹0        │
│                                   Tax (5%):    ₹76.25    │
│                                   ─────────────────────  │
│                                   Total:       ₹1,601.25 │
│                                   Paid:        ₹500.00   │
│                                   Balance:     ₹1,101.25 │
│──────────────────────────────────────────────────────────│
│ Payment History:                                          │
│ Jan 15, 2026 | Cash | ₹500.00 | Received by: Reception  │
│                                                          │
│                         [Record Payment] [🖨️ Print]     │
└──────────────────────────────────────────────────────────┘
```

### 6.11 Ward/Bed Management

Visual bed map:
```
┌──────────────────────────────────────────────────────────┐
│ Ward Management                                           │
│──────────────────────────────────────────────────────────│
│ [General Ward A ▾]    Capacity: 5    Occupied: 3/5       │
│                                                          │
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ │
│ │ Bed 1  │ │ Bed 2  │ │ Bed 3  │ │ Bed 4  │ │ Bed 5  │ │
│ │ 🟢     │ │ 🔴     │ │ 🔴     │ │ 🟢     │ │ 🔴     │ │
│ │ Avail  │ │R.Sharma│ │P.Mehta │ │ Avail  │ │A.Kumar │ │
│ │        │ │ Day 3  │ │ Day 1  │ │        │ │ Day 5  │ │
│ │[Admit] │ │[Detail]│ │[Detail]│ │[Admit] │ │[Detail]│ │
│ └────────┘ └────────┘ └────────┘ └────────┘ └────────┘ │
└──────────────────────────────────────────────────────────┘
```

## 7. Interaction Patterns

### 7.1 Search

- **Debounced input** (300ms delay) for patient search, medicine search
- Minimum 2 characters before search triggers
- Shows loading spinner during search
- "No results" empty state with clear search button

### 7.2 Form Submission

1. User fills form → client-side Zod validation on change/blur
2. Submit → button shows spinner, all inputs disabled
3. Success → toast notification, redirect to detail/list page
4. Error → toast with error message, re-enable form, highlight problematic field

### 7.3 Deletion/Cancellation

1. Click delete/cancel → Confirm dialog appears
2. For cancellations: require reason input in dialog
3. Confirm → API call → success toast → update list
4. Cancel → close dialog, no change

### 7.4 Quick Actions

- Click patient row → navigate to patient detail
- Click appointment → navigate to appointment detail (or start encounter for doctors)
- Action column: eye icon (view), pencil icon (edit), context menu (...) for additional actions

### 7.5 Notification Bell

- Click bell → dropdown panel (max 5 recent, "View All" link)
- Unread: bold text, blue dot indicator
- Click notification → mark as read, navigate to referenced entity
- Badge count on bell icon (red circle with number)

## 8. Icon System

Use **Lucide React** icons consistently. Key icons:

| Concept | Icon |
|---------|------|
| Dashboard | `LayoutDashboard` |
| Patients | `Users` |
| Appointments | `Calendar` |
| Encounters | `Stethoscope` |
| Prescriptions | `FileText` |
| Pharmacy | `Pill` |
| Laboratory | `FlaskConical` |
| Wards/Beds | `Bed` |
| Billing | `Receipt` |
| Reports | `BarChart3` |
| Audit | `ClipboardList` |
| Settings | `Settings` |
| Notifications | `Bell` |
| Search | `Search` |
| Add/Create | `Plus` |
| Edit | `Pencil` |
| Delete | `Trash2` |
| View | `Eye` |
| Print | `Printer` |
| Check-in | `UserCheck` |
| Discharge | `LogOut` |
| Filter | `Filter` |
| Sort | `ArrowUpDown` |
| Calendar | `CalendarDays` |
| Clock | `Clock` |
| Alert | `AlertTriangle` |
| Success | `CheckCircle2` |
| Error | `XCircle` |
| Info | `Info` |
| User menu | `ChevronDown` |
| Back | `ArrowLeft` |
| Close | `X` |

## 9. Accessibility Requirements

1. All interactive elements reachable via keyboard (Tab navigation).
2. Focus indicators visible (ring outline) on all focusable elements.
3. Color is never the sole indicator of state — always pair with text or icon.
4. Form inputs have associated `<label>` elements.
5. Images and icons have `aria-label` when they convey meaning.
6. Tables use `<th>` with `scope` attributes.
7. Modals trap focus when open.
8. Toast notifications have `role="alert"` for screen readers.
9. Minimum contrast ratio 4.5:1 for text, 3:1 for large text.
10. All status badges include text labels, not just colors.
