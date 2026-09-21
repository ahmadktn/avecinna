# Avecinna — Clinical Frontend (Nuxt 4 PWA)

> **Zero-Trust Clinical Interface, Offline Encrypted Storage & Interactive Merkle Tree Visualizer**  
> *Built with Nuxt 4, Vue 3, TailwindCSS 4, and the Web Crypto API*

---

## 🌟 Overview

The Avecinna frontend is a modern, Progressive Web Application (PWA) engineered for clinical workflows in resource-constrained hospital environments. It provides role-tailored clinical dashboards, strict client-side least-privilege enforcement, client-side encrypted offline caching (AES-GCM-256), and interactive forensic visualizers.

---

## 🩺 Role-Tailored Clinical Workspaces

Every staff role lands on a specialized dashboard tailored to their clinical responsibilities:

| Route | Role | Clinical Workflow & Capabilities |
| :--- | :--- | :--- |
| **`/nurse`** | **Nurses & Paramedics** | Ward bed census, live acuity monitoring, bedside vitals entry, unassigned chart restrictions, and 1-click Emergency Break-Glass. |
| **`/doctor`** | **Physicians & Consultants** | Inpatient encounter documentation (SOAP notes), lab results review, clinical notes, and cross-ward consult management. |
| **`/patients`** | **All Clinicians** | Patient directory filterable by ward, care team, and acuity. Clicking a patient evaluates CAAC before rendering `/patients/:id`. |
| **`/admin/audit`** | **Compliance & Admins** | Live SHA-256 audit stream, rule-engine anomaly flags, and the interactive **Topological Merkle Tree & Git DAG Visualizer**. |
| **`/admin/users`** | **System Admin** | User lifecycle management and ward scheduling (with clinical fields strictly redacted). |
| **`/pharmacy`** | **Pharmacists** | Medication reconciliation, allergy contraindication audit, and prescription dispensing. |
| **`/clerk`** | **Admissions Clerks** | Demographic intake and bed assignments; clinical notes and diagnoses stripped server-side. |

---

## ⚡ Offline-First Architecture (Surviving Blackouts)

Designed specifically for hospitals subject to routine power grid failures and internet drops:

1. **Client-Side Encryption at Rest (`app/utils/offlineCrypto.ts`):**
   * Patient records cached in browser IndexedDB are encrypted using **AES-GCM-256**.
   * Symmetric encryption keys are derived dynamically from the clinician's session secret and salt using **PBKDF2 with SHA-256 (100,000 iterations)** via the browser's native **Web Crypto API**.
   * When a clinician logs out, the ephemeral `CryptoKey` is cleared from RAM, ensuring cached charts cannot be extracted from a stolen device.
2. **Service Worker (`public/sw.js`):**
   * Caches application shells and static assets for instant offline loading.
   * Intercepts mutations during offline operation and queues them for automatic synchronization via the Background Sync API upon reconnection.
3. **Merkle DAG Branch Reconciliation:**
   * Offline audit transactions are signed locally and reconciled on the server using dual-parent Merkle DAG merge commits.

---

## 🔍 Key Interactive Components

* **`AuditVerifierModal.vue` (`/admin/audit`):**  
  Triggers a real-time cryptographic audit walk across the isolated audit database, recalculating sequential SHA-256 hashes and displaying tamper-detection results.
* **`BreakGlassModal.vue` (`/patients/:id`):**  
  Allows authorized clinicians to trigger **Tier 1 (Instant Resuscitation Telemetry, <500ms)** or **Tier 2 (Full Chart Unlock with mandatory justification)** when encountering a CAAC access restriction.
* **`CareTeamModal.vue`:**  
  Enables physicians to issue time-bounded multidisciplinary consults (`PRIMARY`, `ON_CALL`, `CONSULT`) with automatic expiry.
* **`WardBedMatrix.vue`:**  
  Interactive visual bed grid displaying inpatient occupancy, patient initials, and acuity badges (`STABLE`, `MONITORING`, `CRITICAL`).
* **`RecordVitalsModal.vue`:**  
  Bedside physiological data entry form for blood pressure, pulse, oxygen saturation, temperature, respiratory rate, and blood glucose.

---

## 🛠️ Project Structure

```text
frontend/
├── app/
│   ├── app.vue                 # Root layout and theme wrapper
│   ├── components/             # Reusable medical & security UI components
│   │   ├── AuditVerifierModal.vue    # Live cryptographic integrity inspector
│   │   ├── BreakGlassModal.vue       # Two-tier emergency override launcher
│   │   ├── CareTeamModal.vue         # Care team consult grant modal
│   │   ├── RecordVitalsModal.vue     # Bedside vital signs observation form
│   │   ├── WardBedMatrix.vue         # Inpatient bed census matrix
│   │   └── VitalsTrendChart.vue      # Historical vitals trend line chart
│   ├── composables/            # Reactive state & API integration
│   │   ├── useAuth.ts          # Session management, JWT tokens, ward switching
│   │   ├── usePatients.ts      # Patient directory, charts, and lab results
│   │   ├── useAudit.ts         # Audit stream, Merkle tree data, verification
│   │   ├── useBreakGlass.ts    # Emergency Tier 1 & Tier 2 override actions
│   │   └── useApi.ts           # Type-safe Fetch wrapper with bearer auth
│   ├── pages/                  # Nuxt 4 page routes
│   │   ├── index.vue           # Landing page with interactive architecture demos
│   │   ├── login.vue           # Role-based login and demo credential selector
│   │   ├── nurse/              # Nursing station & ward bed census
│   │   ├── doctor/             # Physician dashboard & encounter notes
│   │   ├── patients/           # Patient directory & CAAC-protected full charts
│   │   ├── admin/              # Audit visualizer, user & ward management
│   │   ├── pharmacy/           # Medication dispensing & interaction checks
│   │   └── clerk/              # Demographic intake & bed assignment
│   └── utils/                  # Cryptography & offline storage utilities
│       ├── offlineCrypto.ts    # Web Crypto AES-GCM-256 + PBKDF2 (100k rounds)
│       └── offlineDatabase.ts  # Encrypted IndexedDB database manager
├── public/
│   ├── sw.js                   # Service Worker for PWA background sync
│   └── favicon.ico
├── nuxt.config.ts              # Nuxt 4 configuration & PWA metadata
└── package.json
```

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
# Run from repository root or frontend directory
pnpm install
```

### 2. Configure Environment
Set the backend API endpoint (default: `http://localhost:4000/api/v1`):
```bash
export NUXT_PUBLIC_API_BASE=http://localhost:4000/api/v1
```

### 3. Start Development Server
```bash
pnpm dev
```
The application will be accessible at: **[http://localhost:3000](http://localhost:3000)**

### 4. Build for Production
```bash
# Build optimized client & SSR bundle
pnpm build

# Preview production build locally
pnpm preview
```

---

## 🔒 Security Best Practices Implemented

* **Strict Non-Reliance on Frontend Enforcement:** All security boundaries (CAAC, role masking, shift active windows) are enforced authoritatively on the Fastify server. The frontend never assumes permissions.
* **No Medical Data in Client Logs:** Diagnostic payloads and patient identification strings are never logged to browser `console.log` in production.
* **Zero Real Personal Data:** Seeded data is 100% synthetic, generated via the Synthea simulator.
