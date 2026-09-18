# Avecinna EMR — Screens Design & API Specification

This document details the visual design system, UI layout templates, role-scoped sidebar navigation, interactive workflows, detailed dashboard analytics, audit trails, and backend API mappings for all application screens in **Avecinna: Context-Aware Secure EMR**.

---

> [!IMPORTANT]
> **Design Pattern & Dynamic Ward Rendering Philosophy:**
> The design screen assets provided (e.g., `Doctor - ICU.png`, `Doctor - oncology.png`, `Clerk - emergency.png`, `Nurse - ICU.png`) represent **generic UI layout templates and design patterns** for the entire application.
> 
> The frontend application does **not** hardcode separate pages for each department. Instead, it utilizes **reusable, dynamic role-scoped templates** (`DynamicWardDashboard`, `PatientClinicalView`, `ClerkPortal`, `PharmacyQueue`, `AdminDashboard`) that adapt in real time whenever a clinician switches active ward context (`ICU`, `Oncology`, `Cardiology`, `Emergency`, `Pediatrics`, `Surgical`, etc.) via `POST /api/v1/auth/switch-ward`.

---

## 1. System Architecture & Data Flow Blueprint

```mermaid
flowchart TD
    subgraph Client ["Nuxt 4 Dynamic Frontend Templates"]
        LoginScreen["1. Login View (/login)"]
        HeaderNav["2. Header & Ward Context Switcher"]
        ClinicianTemplate["3. Clinician Dynamic Dashboard (/patients)"]
        ClerkTemplate["4. Clerk Registration & Appointments (/clerk/*)"]
        PharmTemplate["5. Pharmacist Prescriptions Queue (/pharmacy/*)"]
        BreakGlassModal["6. Break-Glass Modal (Tier 1 / Tier 2)"]
        AdminAnalytics["7. Admin Security Dashboard (/admin/dashboard)"]
        AdminAuditLedger["8. Detailed Audit Ledger Inspector (/admin/audit)"]
        StaffDashboard["9. Staff Management Portal (/admin/users)"]
    end

    subgraph FastifyAPI ["Fastify Security Server (:4000)"]
        AuthRoute["POST /api/v1/auth/login"]
        SwitchWardRoute["POST /api/v1/auth/switch-ward"]
        CAACCheck["evaluateCAAC() Authorization Engine"]
        DTOMasker["filterPatientRecordByRole() Masking Engine"]
        PatientCreateRoute["POST /api/v1/patients"]
        BreakGlassRoute["POST /api/v1/patients/:id/break-glass/*"]
        DocLabRoute["POST/GET /api/v1/patients/:id/documents & /lab-results"]
        AdminRoute["GET/POST/PUT /api/v1/admin/users"]
        AuditVerifyRoute["POST /api/v1/audit/verify"]
    end

    subgraph Storage ["Dual PostgreSQL DBs"]
        PrimaryDB[("avecinna_primary_db (:5432)")]
        AuditDB[("avecinna_audit_db (:5433)\nAppend-Only SHA-256 Ledger")]
    end

    LoginScreen -->|username, password| AuthRoute
    AuthRoute -->|JWT Token + ActiveWard| LoginScreen
    HeaderNav -->|targetWardId| SwitchWardRoute
    ClinicianTemplate -->|GET /patients| CAACCheck
    CAACCheck -->|Permitted| DTOMasker
    DTOMasker -->|Role-Scoped DTO| ClinicianTemplate
    ClerkTemplate -->|POST /patients & /appointments| PatientCreateRoute
    PharmTemplate -->|GET /patients (Meds/Allergies DTO)| CAACCheck
    CAACCheck -->|Denied| BreakGlassModal
    BreakGlassModal -->|Tier 1 / Tier 2 Request| BreakGlassRoute
    ClinicianTemplate -->|Upload Doc / Add Lab| DocLabRoute
    BreakGlassRoute -->|High-Severity Alert| PrimaryDB
    BreakGlassRoute -->|Audit Block| AuditDB
    AdminAnalytics -->|Security Stats & Alerts| PrimaryDB
    AdminAuditLedger -->|Verify Ledger & Audit Blocks| AuditVerifyRoute
    StaffDashboard -->|Create/Update User| AdminRoute
```

---

## 2. Global Layout Shell & Dynamic Context System

All authenticated pages share a unified layout shell containing a fixed left sidebar and a dynamic top header context bar.

### 2.1 Sidebar Framework (`width: 224px / w-56`, `bg-slate-950`)
- **Brand Header Area** (`px-5 py-5`): Blue Cross icon (`18x18px`, `bg-blue-600 rounded-md`) + `Avecinna` wordmark in **Fraunces** font (`text-2xl`, white).
- **Navigation Links** (`px-3 py-2.5`, `rounded-lg`, hover `bg-slate-900`, active `bg-slate-900 text-white`): Dynamically rendered based on authenticated user role.
- **User Profile Footer** (`px-5 py-4`, bottom fixed, border-top `border-slate-800`):
  - Avatar circle with user initials (`DS`, `AD`, `SR`, `AU`, `PT`).
  - Staff Full Name (e.g. `Dr. Serlin Arslan`) and Role Badge pill (`Doctor`, `Nurse`, `Clerk`, `Pharmacist`, `Admin`, `Head of Unit`).
  - **Sign Out Button**: Outlined dark button (`border border-slate-700 text-white hover:bg-slate-900 rounded-xl px-3 py-2`).

### 2.2 Dynamic Header & Ward Switcher (`px-8 py-5`, `bg-white`, border-bottom `border-slate-200`)
- **Active Ward Indicator**: Map pin icon (`13x13px`, `blue-500`) + Dynamic Ward Code (`ICU - 6C`, `Oncology - 5N`, `Cardiology - 3W`, `Emergency - 1E`, `Pediatrics - 2N`, etc.).
- **Greeting Heading**: `Good morning, [User First Name]` in **DM Sans** (`text-xl`, `font-bold`, `slate-900`).
- **Header Actions**:
  - `Switch Ward` button: Opens dynamic ward selection dropdown (`border border-slate-300 hover:bg-slate-50 rounded-xl px-4 py-2 text-sm font-medium`). Triggers `POST /api/v1/auth/switch-ward`.
  - `Emergency Access` button: Solid Amber pill button (`bg-amber-500 hover:bg-amber-400 text-white rounded-xl px-4 py-2 text-sm font-medium`). Triggers Break-Glass modal.

### 2.3 Role-Based Sidebar Matrix

| User Role | Sidebar Links | Primary Route | Purpose & Clinical Scope |
| :--- | :--- | :--- | :--- |
| **Doctor** | 1. `My Patients`<br>2. `Outpatient Schedule` | `/patients`<br>`/doctor/appointments` | Dynamic inpatient directory for active ward, assigned care team patients, clinical history, diagnostic notes, lab ordering, and document uploads. |
| **Nurse** | 1. `My Patients`<br>2. `Care Team Assigned` | `/patients` | Dynamic active ward patients on left, care team assigned patients on right, vitals observation trends, active medication schedules, allergy warnings, and document viewing under CAAC. |
| **Clerk** | 1. `Patient Registration`<br>2. `Appointments & Schedule`<br>3. `Bed Allocation & Admissions` | `/clerk/register`<br>`/clerk/appointments`<br>`/clerk/admissions` | **No clinical patient directory view.** Registers new patients (`POST /patients`), books outpatient appointments, manages clinic check-ins, and assigns bed numbers across any department. |
| **Pharmacist** | 1. `Prescription Queue`<br>2. `Medication History`<br>3. `Allergy Profiles` | `/pharmacy/prescriptions`<br>`/pharmacy/history`<br>`/pharmacy/allergies` | **No clinical patient directory view.** Manages medication dispensing queues, active prescription verification, drug-allergy interactions, and dosage records. |
| **Head of Unit** | 1. `My Patients`<br>2. `Unit Staff Roster`<br>3. `Security Scanner Alerts` | `/patients`<br>`/unit/manage`<br>`/unit/alerts` | Active ward patient directory + staff shift roster monitoring (`GET /unit/staff`) + ward security scanner alerts (`GET /unit/alerts`). |
| **System Admin (`ADMIN`)** | 1. `Dashboard & Analytics`<br>2. `Audit Ledger`<br>3. `Staff Management` | `/admin/dashboard`<br>`/admin/audit`<br>`/admin/users` | Global system security analytics & graphs + detailed audit trail ledger & SHA-256 Merkle verifier + hospital staff user account management.<br>*(Note: System Admins are strictly **REDACTED** from viewing patient clinical data).* |

---

## 3. Generic UI Layout Templates & Screen Patterns

---

### Template 1: Staff Authentication View (`/login`) — Reference Asset: `screens/Login page.png`

#### Visual Design Pattern
- **Canvas**: Dark slate viewport background (`bg-slate-950` / `#020617`).
- **Modal Card**: Centered floating container (`bg-slate-900` / `#0f172a`, `rounded-xl`, width `420px`, padding `32px / p-8`, `border border-slate-800`).
- **Header Section**: Blue cross logo mark (`bg-blue-600 rounded-md p-2`), `Avecinna` wordmark in **Fraunces** font (`text-2xl font-semibold text-white`), and subtitle `Clinical Records – Secure Access` (`text-slate-400 text-xs`).
- **Form Controls**:
  - **Staff Account Selector**: Custom select input (`bg-slate-800 text-white rounded-lg px-3 py-2.5 w-full border border-slate-700`) with demo staff options (`Dr. Serlin Arslan - Doctor`, `Nurse Amara Diop - Nurse`, `Clerk Sofia Reyes - Clerk`, `Pharm Reza Tehrani - Pharmacist`, `Administrator - Admin`).
  - **Password Input**: Password field (`bg-slate-800 text-white placeholder-slate-500 rounded-lg px-3 py-2.5 w-full border border-slate-700`).
  - **Sign In Button**: Primary filled button (`bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2.5 w-full font-medium text-sm`).
- **Security Policy Notice Box**: Container below form card (`bg-slate-900/80 border border-slate-800 rounded-xl p-4 w-[420px] text-xs text-slate-400 flex items-start gap-2`). Text: *"Each staff member has an individual login. Shared accounts are prohibited — all access is logged and attributed."*

#### API Integration
- `POST /api/v1/auth/login`: Authenticates staff, issues JWT token, sets initial active ward session context, and logs `USER_LOGIN_SUCCESS` to `avecinna_audit_db`.

---

### Template 2: Clinician Dynamic Ward Dashboard — Reference Assets: `Doctor - ICU.png`, `Doctor - oncology.png`, `Nurse - ICU.png`, `Nurse - oncology.png`

This reusable layout template dynamically renders patient census data, clinical status indicators, and CAAC restriction states for **any hospital ward** (ICU, Oncology, Cardiology, Emergency, etc.).

#### Visual Design Pattern
- **Top Context Header**: Map pin icon + Active Ward Name (`ICU - 6C`, `Oncology - 5N`, `Cardiology - 3W`), greeting `Good morning, [Name]`, `Switch Ward` button, `Emergency Access` button.
- **Dynamic KPI Census Grid** (3 white cards, `rounded-xl`, `border border-slate-200`, `px-5 py-4`):
  1. `Patients in Ward`: Stat number of patients admitted to active ward (`text-slate-900`).
  2. `Monitoring`: Stat number of patients requiring observation (`text-amber-600`).
  3. `Critical`: Stat number of acute/critical patients (`text-red-600`).
- **Active Ward Patients Area (`PATIENTS - [ACTIVE WARD CODE]`)**:
  - **Populated State**: Patient card (`bg-white border border-slate-200 rounded-xl px-5 py-4 flex items-center justify-between hover:border-blue-500`).
    - **Left**: Initials avatar (`FD`, `MO`, `TB`) + Patient Full Name + Condition Badge (`Stable` green, `Monitoring` amber, `Critical` red) + Subtitle (Primary Diagnosis).
    - **Right**: Bed assignment & Age (`3W - 14B`, `54 yrs`) + `Assigned Ward` pill (`bg-emerald-50 text-emerald-700`) + Right chevron.
  - **Empty State**: Centered container (`bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-400 text-sm`) stating `"No patients in this ward"`.
- **Restricted Other Wards Area (`OTHER WARDS - RESTRICTED`)**:
  - Displays locked patient cards (`bg-slate-50/60 border border-dashed border-slate-200 rounded-xl px-5 py-4 opacity-75`).
  - Lock icon + Patient Name + Ward Name + `Access Restricted` disabled badge.
  - **Click Action**: Clicking any restricted card launches the **Two-Tier Break-Glass Emergency Modal**.

#### Role-Based DTO Masking & Detail Drawer (`/patients/:id`)
- **Doctor / Head of Unit View**: Full clinical notes, diagnostic SOAP history, vitals trends, lab ordering (`POST /lab-results`), and document attachments (`POST /documents`).
- **Nurse View**: Ward patient list on left, care team assigned patients on right, active vitals observation trends, active medication schedules, allergy warnings, and document viewing (long-term clinical history redacted).

#### API Integration
- `GET /api/v1/patients`: Retrieves active ward patient directory (DTO masked by role).
- `POST /api/v1/auth/switch-ward`: Dynamic ward switching (`targetWardId`).
- `GET /api/v1/patients/:id`: Retrieves individual patient record under CAAC rules.

---

### Template 3: Clerk Administrative Portal — Reference Assets: `Clerk - cardiology.png`, `Clerk - emergency.png`, `Clerk - ICU.png`, `Clerk - oncology.png`

Clerks do **not** have a clinical patient directory. Their template provides dynamic administrative controls across any department.

#### Visual Design Pattern
- **Top Header**: Active ward context pin, greeting `Good morning, Sofia`, `Switch Ward` button, `Emergency Access` button.
- **Sidebar Links**: `Patient Registration`, `Appointments & Schedule`, `Bed Allocation & Admissions`.
- **Administrative Census Cards**: `Patients in Ward`, `Monitoring`, `Critical`.
- **Administrative Functions**:
  - **Patient Registration & Admissions Form (`/clerk/register`)**: MRN, Full Name, DOB, Gender, Genotype, Blood Group, Patient Type (`INPATIENT`/`OUTPATIENT`), Primary Ward assignment dropdown, Bed allocation (`CARD-BED-12`).
  - **Outpatient Scheduling View (`/clerk/appointments`)**: Appointment booking form (Patient MRN search, Attending Doctor select, Clinic Ward select, Date/Time picker) and scheduled appointments table.
  - **Demographic Lookup**: Quick search by MRN/Name to verify patient registration or update contact information.

#### API Integration
- `POST /api/v1/patients`: Registers new patient record and assigns ward bed.
- `GET/POST /api/v1/outpatient/appointments`: Schedules and manages clinic visits.
- `GET /api/v1/admin/wards`: Retrieves hospital ward list for assignment dropdowns.

---

### Template 4: Pharmacist Queue & Medication Safety Portal — Reference Asset: `Pharmacist - ICU.png`

Pharmacists do **not** have a general clinical patient directory. Their template focuses on prescription safety and medication administration across wards.

#### Visual Design Pattern
- **Top Header**: Ward filter pin, greeting `Good morning, Reza`, `Switch Ward` button.
- **Sidebar Links**: `Prescription Queue`, `Medication History`, `Allergy Profiles`.
- **Dispensing & Safety Queue (`/pharmacy/prescriptions`)**:
  - Filter Tabs: `Pending Dispense`, `Completed Orders`, `Allergy Warnings Flagged`.
  - Queue Table: Patient Name, MRN, Active Prescription Order (`Ciprofloxacin 500mg PO Q12H`), Ordering Doctor, Highlighted Allergy Alert (`SEVERE ALLERGY: Sulfa Drugs`).
  - Action Buttons: `Verify & Dispense` (`bg-emerald-600 text-white`) or `Flag Interaction` (`bg-red-600 text-white`).

#### API Integration
- `GET /api/v1/patients`: Receives Pharmacist DTO (`allergies`, `activeMedications`, `medicationHistory` ONLY).

---

### Template 5: System Admin Security & Analytics Dashboard — Reference Asset: `Admin - security dashboard.png`

System Admins are strictly redacted from viewing patient clinical data (`[REDACTED - ADMIN PRIVACY RESTRICTION]`). Their template provides global security monitoring, analytics graphs, and audit ledger tools.

#### Visual Design Pattern
- **Top Header**: Page Title `Security Dashboard`, Subtitle `Audit logs - all records access events`.
- **Sidebar Links**: `Dashboard & Analytics`, `Audit Ledger`, `Staff Management`.
- **KPI Summary Grid** (4 cards):
  1. `Total Events`: Stat `8` (`text-slate-900`), Subtitle `Last 24H`.
  2. `Break Glass uses`: Stat `3` (`text-amber-600`), Subtitle `⚠️ Review recommended`.
  3. `Flagged entries`: Stat `3` (`text-red-600`), Subtitle `require review`.
  4. `Active staff`: Stat `7` (`text-slate-900`), Subtitle `Currently logged in`.
- **Filter Toolbar**: `All Events` active pill, `Flagged Only` badge pill (`3`).
- **Audit Events Log Table** (`bg-white border border-slate-200 rounded-xl overflow-hidden`):
  - Headers: `STAFF MEMBER | PATIENT | ACTION | WARD | TIME | STATUS`
  - Data Rows: Displays staff member name, role badge, patient name, event description (e.g. `⚠️ BREAK GLASS ACCESS "Patient transfer review - cardiac risk"`), ward code, ISO timestamp, and `Flagged` badge.

#### System Admin Analytics & Security Charts
- **Security Access Trends Line Chart**: Tracks total access events vs. flagged events over 24 hours.
- **Break-Glass Usage Bar Chart**: Break-glass activations by ward/department.
- **CAAC Permit vs. Denial Donut Chart**: Authorization permit/denial distribution.
- **Active Staff Distribution Stacked Bar Chart**: Logged-in staff count by role and ward context.

#### API Integration
- `GET /api/v1/security/alerts`: Lists scanner security alerts.
- `POST /api/v1/audit/verify`: Verifies hash chain & computes Merkle tree root over `avecinna_audit_db`.
- `PATCH /api/v1/security/alerts/:id`: Updates alert review status (`OPEN`, `INVESTIGATING`, `RESOLVED`, `FALSE_POSITIVE`).

---

### Template 6: System Admin Staff Management Portal — Reference Asset: `Admin - staff management.png`

#### Visual Design Pattern
- **Top Header**: Page Title `Staff Management`, Subtitle `7 Accounts - 6 Active`, `+ Add Staff` blue button (`bg-blue-600`).
- **Staff Accounts Table**:
  - Headers: `NAME | ROLE | WARD | STATUS | LAST LOGIN | ACTIONS`
  - Data Rows: Initials avatar + Staff Name, Role badge pill (`Doctor`, `Nurse`, `Clerk`, `Pharmacist`, `Admin`), Assigned home ward (`CARDIOLOGY - 1W`), Status badge (`Active` green pill or `Suspended` gray pill), Last login timestamp, Actions (`Edit` blue border, `Suspend` red border, `Restore` green border).
- **Add / Edit Staff Modal**: Username, Full Name, Password, Role select, Home Ward select.

#### API Integration
- `GET/POST/PUT /api/v1/admin/users`: Manages staff accounts.
- `PATCH /api/v1/admin/users/:id/status`: Toggles account active status (`Suspend` / `Restore`).
- `GET/POST /api/v1/admin/wards`: Manages hospital ward directory.

---

## 4. Interactive Workflows & Specialized Pages

### 4.1 Two-Tier Emergency Break-Glass Modal (`/patients/:id/break-glass`)
- **Trigger**: Clicked from top bar `Emergency Access` button or when clicking a restricted out-of-ward patient card.
- **Surface**: `bg-white rounded-2xl p-7 max-w-lg shadow-2xl border border-slate-200`.
- **Header**: Amber warning triangle icon (`amber-100 bg, amber-600 stroke`) + Title `Emergency Access (Break-Glass)` + Subtitle `Override Context-Aware Access Control for acute triage`.
- **Tab 1: Tier 1 Immediate View (0 Delay)**:
  - Invokes `POST /api/v1/patients/:id/break-glass/tier1`.
  - Displays read-only summary card (Blood Group, Code Status e.g. `FULL CODE`, Allergies, Active Vitals).
- **Tab 2: Tier 2 Full Record Unlock (Reasoned)**:
  - Invokes `POST /api/v1/patients/:id/break-glass/tier2`.
  - Requires mandatory justification text (min 10 chars). Generates `HIGH` severity `securityAlerts` entry and appends `BREAK_GLASS_TIER_2` audit block.

### 4.2 Detailed Cryptographic Audit Ledger Page (`/admin/audit` / `/audit/ledger`)
- **Backend Source**: Powered by physically isolated database `avecinna_audit_db`.
- **Header Status Banner**: Displays `100% Cryptographically Intact` (Green) or `Tampering Detected` (Red) + `Total Blocks` + `Merkle Root Hash`.
- **Action Button**: `Verify Hash Chain & Compute Merkle Root` (`POST /api/v1/audit/verify`).
- **Audit Block Stream Table**:
  - Columns: `BLOCK ID | TIMESTAMP | USER ID / ROLE | ACTIVE WARD | ACTION | PAYLOAD HASH | PREVIOUS BLOCK HASH | INTEGRITY LINK`
  - Verifies sequential SHA-256 link (`prev_hash` -> `hash`) for each block in `avecinna_audit_db`.

---

## 5. Complete Screen-to-API & DTO Summary Matrix

| Template / Screen Asset | User Role Scope | Primary API Endpoints | DTO Mask / CAAC Rule |
| :--- | :--- | :--- | :--- |
| **`Login page.png`** | Public / All Staff | `POST /api/v1/auth/login` | Issues JWT Token + Sets Active Ward |
| **Clinician Ward Template** (`Doctor - ICU.png`, `Doctor - oncology.png`) | Doctor, Head of Unit | `GET /api/v1/patients`, `POST /auth/switch-ward` | Full Clinical Access for active ward patients |
| **Nurse Ward Template** (`Nurse - ICU.png`, `Nurse - oncology.png`) | Nurse, Paramedic | `GET /api/v1/patients` | Nursing DTO (Vitals, Meds, Allergies, Bed allocation) |
| **Clerk Administrative Template** (`Clerk - cardiology.png`, `emergency.png`, `ICU.png`, `oncology.png`) | Clerk ONLY | `POST /patients`, `GET/POST /appointments` | Demographics & Bed Allocation ONLY (No clinical notes) |
| **Pharmacist Safety Template** (`Pharmacist - ICU.png`) | Pharmacist ONLY | `GET /api/v1/patients` | Prescriptions, Med History & Allergies ONLY |
| **`Admin - security dashboard.png`** | System Admin, Head of Unit | `GET /security/alerts`, `POST /audit/verify` | Clinical Redacted (`[REDACTED]`), Audit & Security Analytics |
| **`Admin - staff management.png`** | System Admin ONLY | `GET/POST/PUT /admin/users`, `PATCH /status` | User Account & Ward Management |
