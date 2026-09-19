# Avecinna EMR — Development Progress & Tasks Tracker (`tasks.md`)

**Tech Stack:**
- **Frontend:** Nuxt 4 (with `app/` structure), TailwindCSS 3, Vite, Service Worker (Background Sync), IndexedDB (Web Crypto AES-GCM-256)
- **Backend:** Fastify (TypeScript), Drizzle ORM (`drizzle-kit`)
- **Primary Database:** PostgreSQL (`avecinna_primary_db` storing Users, Wards, Patients, Appointments, Documents, Sessions, Security Alerts)
- **Isolated Audit Database:** PostgreSQL (`avecinna_audit_db` storing append-only Merkle Audit Ledger blocks separately to prevent ransomware/DB tampering)
- **Integration Packages:** Mode B Security Reverse Proxy Gateway Sidecar, Mode C Embedded Middleware SDK (`@avecina/security-middleware`)
- **Testing:** Vitest, Supertest, Playwright E2E

---

## Phase 1: Foundation, Dual Database Architecture & Schemas
- [x] Configure TypeScript configuration (`tsconfig.json`, `drizzle.config.ts`, `.env.example`).
- [x] Configure **Dual PostgreSQL Database Connections** in Drizzle ORM:
  - [x] Connection 1: `clientPrimary.ts` (`avecinna_primary_db`)
  - [x] Connection 2: `clientAudit.ts` (`avecinna_audit_db` with write-only append access)
- [x] Define Drizzle Table Schemas:
  - [x] Primary Schema (`src/db/schemaPrimary.ts`): `wards`, `users` (with `ADMIN`, `HEAD_OF_UNIT` roles), `patients` (inpatients & outpatients), `outpatient_appointments`, `care_teams`, `lab_results`, `medical_documents`, `sessions`, `security_alerts`
  - [x] Isolated Audit Schema (`src/db/schemaAudit.ts`): `audit_blocks`
- [x] Build **Synthea Synthetic FHIR Patient Parser** (`syntheaParser.ts`).
- [x] Create Synthetic Hospital & Patient Seeding Script (`seed.ts`).
- [x] Automated Test: Synthea parser & database unit test suite (`tests/db.test.ts`).

---

## Phase 2: Authentication, User & Ward Management, CAAC & Admin Privacy DTO Engine
- [x] Implement Fastify Auth Plugin (`/api/v1/auth/login`, JWT issue, password hashing via argon2, session validation in `authPlugin.ts`).
- [x] Implement Active Ward Context Switching (`/api/v1/auth/switch-ward`).
- [x] Implement System Admin User Management endpoints (`/api/v1/admin/users`, `/api/v1/admin/wards`).
- [x] Implement Head of Unit Ward Supervision endpoints (`/api/v1/unit/staff`, `/api/v1/unit/alerts`).
- [x] Build **CAAC Engine Service** (`caacEngine.ts`):
  - [x] Evaluate `Permit = Role AND Shift AND (ActiveWard == PatientWard OR StaffID IN CareTeam OR OutpatientDoctorToday)`
  - [x] Check time-boxed consult exclamations & outpatient appointment expiry.
- [x] Build **Role-Scoped DTO Response Filter with Admin Redaction** (`dtoMasker.ts`, OWASP API3 Mitigation):
  - [x] Doctor / Head of Unit DTO filter (Full record for assigned/consulted patients)
  - [x] Nurse/Paramedic DTO filter (Vitals, active meds, allergies)
  - [x] Clerk DTO filter (Demographics & bed assignment only)
  - [x] Pharmacist DTO filter (Medication history & allergy profile only)
  - [x] **System Admin DTO filter (User/Ward management access, BUT CLINICAL DATA STRICTLY REDACTED)**
- [x] Automated Security Tests:
  - [x] Unit tests for CAAC decision matrix (`tests/caac.test.ts`).
  - [x] **Admin Privacy Test**: Verify System Admin querying `/api/v1/patients/:id` receives `[REDACTED - ADMIN PRIVACY RESTRICTION]` (`tests/adminPrivacy.test.ts`).
  - [x] BOLA / IDOR security test (`tests/dtoMasking.test.ts`, OWASP API1 verification: User A accessing User B's patient returns HTTP 403).

---

## Phase 3: Medical Documents, Two-Tier Break-Glass & Isolated Merkle Audit Ledger
- [x] Build **Medical Documents & Lab Results Storage Module**:
  - [x] File Upload endpoint (`/api/v1/patients/:id/documents`) with SHA-256 document hashing.
  - [x] Lab results creation & retrieval with document hash verification (`/api/v1/patients/:id/lab-results`).
- [x] Build **Cryptographic Merkle Audit Engine**:
  - [x] Connects exclusively to `avecinna_audit_db`.
  - [x] SHA-256 block hashing formula ($\text{Block}_n = \text{SHA256}(\text{PrevHash} \parallel \text{User} \parallel \text{Patient} \parallel \text{Action} \parallel \text{PayloadHash})$).
  - [x] Audit Ledger verification endpoint (`POST /api/v1/audit/verify`) reading isolated audit DB.
- [x] Implement **Two-Tier Break-Glass Endpoints**:
  - [x] Tier 1 Immediate Emergency View (`POST /api/v1/patients/:id/break-glass/tier1`).
  - [x] Tier 2 Full Record Request (`POST /api/v1/patients/:id/break-glass/tier2` with reason code validation).
- [x] Implement **Suspicious Access Rule Scanner**:
  - [x] Detect clerk unauthorized views, admin clinical access attempts, expired consult use, and excessive Tier 2 requests.
  - [x] Generate `security_alerts` entries in primary database.
- [x] Automated Tests:
  - [x] Isolated audit chain integrity verification test (`tests/merkle.test.ts`).
  - [x] Document SHA-256 hash verification & attachment access tests (`tests/breakGlass.test.ts`).

---

## Phase 4: Nuxt 4 Frontend PWA & Dynamic Role-Scoped Clinical UI
- [x] Initialize Nuxt 4 project under `frontend/` (using new `app/` directory convention).
- [x] Configure TailwindCSS 4 with Vite in Nuxt 4 (`nuxt.config.ts`, `@tailwindcss/vite`).
- [x] Build Core Components (`app/components/`):
  - [x] Navbar & Ward Switcher dropdown (`Active Ward: Cardiology -> Switch`).
  - [x] Dynamic Role Badge & Shift status indicator.
  - [x] User & Ward Management Table (Admin View).
  - [x] Head of Unit Staff & Alert Review Dashboard.
  - [x] Outpatient Appointment Scheduling Modal.
  - [x] Lab Results & Document Attachment Viewer.
  - [x] Tier 1 & Tier 2 Emergency Break-Glass Modals.
  - [x] Isolated Audit Ledger Verification Component.
- [x] Build Role-Scoped Clinical Pages (`app/pages/`):
  - [x] Login View (`/login`)
  - [x] Patient Directory (`/patients` - dynamic ward patient dashboard)
  - [x] Patient Detail View (`/patients/:id`) rendering role-appropriate fields dynamically (with Redacted notice for Admin).
  - [x] Admin Control Panel (`/admin/dashboard`, `/admin/audit`, `/admin/users`)
  - [x] Head of Unit Supervisory Portal:
    - [x] Unit Overview (`/unit`): Real census telemetry, acuity breakdown, duty roster cards, security alerts stream
    - [x] Staff Directory (`/unit/staff`): Paginated staff table, multi-attribute filtering, suspend/restore toggling, clinician reassignment modal
    - [x] Duty Roster (`/unit/roster`): Paginated shifts table, status/date/type filtering, shift assignment modal, status transition updates
    - [x] Doctor Dual-Role Integration: Unified sidebar navigation, full clinical encounters, SOAP notes, and care team consult grants
  - [x] Nurse Account & Clinical Station Portal:
    - [x] Station Overview (`/nurse`): Ward census, active care team consults, acuity monitoring, shift details, bedside vitals recording
    - [x] Patients Directory Integration (`/patients`): Scope filters (All Permitted, Ward Inpatients, Care Team Consults), care team consult badges, bedside observation triggers
    - [x] Patient Chart View (`/patients/:id`): Nursing care plan, live physiological telemetry, allergy profiles, active medications, bedside observation modal, OWASP API3 clinical notes redaction notice
    - [x] Backend Endpoints: `GET /api/v1/nurse/overview`, `POST /api/v1/nurse/vitals`, `GET /api/v1/care-teams/my-assignments`, `scope` query on `GET /api/v1/patients`, role DTO masking with `nursingCarePlan`
  - [x] **Complete Clinical UI/UX Overhaul & Standardization**:
    - [x] Unified layout rhythm: Standardized sidebar width to `w-56`, main content padding offset to `pl-56`, and spacing to `space-y-5`.
    - [x] Clinical typography hierarchy: Inter (`font-sans`), Fraunces (`font-brand` for headings and wordmarks), IBM Plex Mono (`font-mono` for IDs, MRNs, vitals, timestamps).
    - [x] Color de-escalation: Neutralized KPI stat card icons to `bg-slate-100 text-slate-500`, softened Break-Glass action to subtle ghost outline, removed loud multi-color clutter.
    - [x] Refactored all 25+ views across Doctor, Head of Unit, Nurse, Clerk, Pharmacy, and Admin personas.
  - [x] **Nuxt 4 Native Layout Engine & Reusable Component Library Refactoring**:
    - [x] Native layout engine: `app/layouts/default.vue` (clinical shell with sidebar, navbar, global modals) and `app/layouts/auth.vue` (clean auth backdrop), wired through `<NuxtLayout>` in `app.vue`.
    - [x] Standardized auto-imported components: `PageHeader.vue` (title, description/subtitle, badges, actions), `MetricCard.vue` (KPI card, icons, critical telemetry variants), `FilterToolbar.vue` (search, filter slots, count badges), `ModalDialog.vue` (standard modal surface), `AlertBanner.vue` (semantic alerts with type/variant).
    - [x] Clean page architecture: Removed shell boilerplate, redundant navigation offsets, and duplicate modal instances across all 25+ role views.

- [ ] Automated Tests:
  - [ ] Vue Component tests with Vitest & `@vue/test-utils`.
  - [ ] Playwright E2E tests for Admin User Creation, Outpatient Appointment Flow, and Break-Glass.

---

## Phase 5: Offline-First Storage & Service Worker Background Sync
- [ ] Implement Client Web Crypto AES-GCM-256 Key Derivation helper.
- [ ] Configure IndexedDB Store (`avecina_offline_db`) for encrypted patient cache & offline audit queue.
- [ ] Register Service Worker (`sw.js`) with Background Sync API handlers.
- [ ] Build Dual-Parent Merkle Branch Merge Algorithm for reconciling offline audit blocks into the isolated audit DB upon reconnection.
- [ ] Automated Tests:
  - [ ] DevTools offline simulation test.
  - [ ] IndexedDB Web Crypto encryption/decryption validation.

---

## Phase 6: Third-Party Integration — Mode B Proxy Sidecar & Mode C Middleware SDK
- [ ] **Mode B: Security Reverse Proxy Gateway Sidecar**:
  - [ ] Fastify Proxy Plugin (`/emr-proxy/v1/*`).
  - [ ] Upstream HTTP Interceptor forwarding requests to OpenMRS / Bahmni / FHIR endpoints.
  - [ ] Reverse Proxy CAAC authorization check, DTO response masking (OWASP API3), and block logging to `avecinna_audit_db`.
- [ ] **Mode C: Embedded Middleware SDK (`packages/security-middleware`)**:
  - [ ] Create npm package structure (`packages/security-middleware`).
  - [ ] Implement exportable Fastify/Express plugin registering CAAC evaluation, DTO masking, and Merkle audit logging.
  - [ ] Publish local build and create integration sample app (`examples/custom-express-app`).
- [ ] Automated Tests:
  - [ ] Mock upstream OpenMRS server integration test.
  - [ ] Mode C Express/Fastify middleware plugin unit and integration test.

---

## Phase 7: Hackathon Demonstration Prep & System Polish
- [ ] Seed full synthetic Nigerian hospital dataset (10 Wards, 50 Clinicians, 100 Inpatients/Outpatients, 20 Lab Documents).
- [ ] Create Hackathon Demo Script & Judge Verification Dashboard (showing Mode A Standalone, Mode B OpenMRS Proxy, Mode C SDK, Admin Privacy Enforcement, Head of Unit View, and Isolated Audit DB).
- [ ] Final security audit pass (OWASP API Top 10 checklist).
- [ ] Build production distribution / Docker Compose setup running primary Postgres container + isolated audit Postgres container + proxy sidecar.
