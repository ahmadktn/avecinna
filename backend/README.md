# Avecinna — Security Core & Fastify API

> **High-Performance Context-Aware Access Control, Server-Side DTO Masking & Cryptographic Merkle Audit Engine**  
> *Built with Fastify 5, TypeScript, Drizzle ORM, and PostgreSQL 16*

---

## 🌟 Overview

The Avecinna backend serves as the authoritative security gateway for all clinical data requests. It intercepts every transaction, evaluates the 4-factor Context-Aware Access Control (CAAC) predicate, scrubs response payloads through role-specific DTO serialization filters (OWASP API3 mitigation), and appends tamper-proof SHA-256 blocks to a physically isolated audit database.

---

## 🛡️ Core Security Services (`src/services/`)

### 1. CAAC Engine (`caacEngine.ts`)
Evaluates authorization in real time based on the formal Boolean predicate:
$$\text{Permit} = \text{RoleValid} \land \text{ShiftActive} \land (\text{ActiveWard} == \text{PatientWard} \lor \text{StaffID} \in \text{CareTeam} \lor \text{OutpatientDoctorToday} \lor \text{BreakGlassActive})$$

* **Shift Window Enforcement:** Validates current time against `shift_start` and `shift_end` in `ward_rosters`. Off-shift requests return `403 SHIFT_INACTIVE`.
* **OWASP API1 (BOLA/IDOR) Mitigation:** Prevents cross-ward URL substitution attacks. If a Cardiology physician attempts to query `/patients/p-peds-01`, CAAC returns `403 Forbidden` and writes a `PATIENT_VIEW_BLOCKED` audit block.
* **Nursing Least-Privilege:** On-duty nurses can monitor ward beds and record bedside observations (`action: 'RECORD_VITALS'`), but viewing detailed patient records requires an explicit care team assignment or emergency break-glass.

### 2. Server-Side DTO Masker (`dtoMasker.ts`)
Mitigates **OWASP API3 (Excessive Data Exposure)** at the network serialization boundary:
* Filters raw database entities through role-specific whitelist projections before JSON serialization.
* **Doctor / Head of Unit:** Receives full clinical history, vitals, active medications, allergy profile, and SOAP notes.
* **Nurse / Paramedic:** Receives vitals, care plan, medications, and allergies; clinical doctor notes are excluded.
* **Admissions Clerk:** Receives demographics, bed allocation, and emergency contacts; all clinical data is stripped.
* **Pharmacist:** Receives active medications, dosages, and drug allergies; SOAP notes and diagnoses are excluded.
* **Administrator Clinical Redaction:** System Administrators configure users and wards, but all clinical fields return `'[REDACTED - ADMIN PRIVACY RESTRICTION]'`.

### 3. Merkle Audit Ledger Engine (`merkleEngine.ts`)
Implements a three-tier cryptographic ledger:
1. **Sequential SHA-256 Hash Chain ($O(1)$ Append):**  
   $$\text{BlockHash}_k = \text{SHA256}(\text{prev\_hash}_{k-1} \parallel \text{user\_id} \parallel \text{patient\_id} \parallel \text{action} \parallel \text{ward} \parallel \text{payload\_hash} \parallel \text{ip} \parallel \text{timestamp})$$
   Modifying any historical block invalidates all subsequent hashes.
2. **Binary Merkle Tree ($O(\log N)$ Inclusion Proofs):**  
   Aggregates transaction hashes into a single 32-byte Merkle Root. Provides cryptographic inclusion proofs for regulatory audits without disclosing other patient records.
3. **Merkle DAG Offline Branch Merge:**  
   When offline wards reconnect, the server creates a dual-parent merge commit:
   $$\text{MergeHash} = \text{SHA256}(\text{MainlineTail} \parallel \text{OfflineTail} \parallel \text{WardID} \parallel \text{Timestamp})$$
   Preserves unbroken cryptographic history across grid outages.
4. **Zero-ePHI Storage:**  
   The audit database never stores patient names or clinical notes—only $\text{payloadHash} = \text{SHA256}(\text{JSON.stringify}(\text{payload}))$.

### 4. Suspicious Access Scanner (`scannerService.ts`)
Background heuristic scanner analyzing live audit blocks for insider threat patterns:
* **Excessive Break-Glass:** $> 3$ Tier-2 emergency activations per 8-hour shift flags a `CRITICAL` compliance incident.
* **Rapid Ward Hopping:** $> 4$ ward switches within 15 minutes triggers a `HIGH` privilege anomaly alert.
* **Off-Shift Snooping:** Repeated query attempts outside scheduled shifts triggers a session freeze.

---

## 🗄️ Dual Database Architecture

Avecinna enforces strict physical database isolation:

```text
┌─────────────────────────────────────────┐     ┌─────────────────────────────────────────┐
│     avecinna_primary_db (PostgreSQL)    │     │      avecinna_audit_db (PostgreSQL)     │
├─────────────────────────────────────────┤     ├─────────────────────────────────────────┤
│ • users, wards, ward_rosters            │     │ • audit_blocks                          │
│ • patients, vitals, medical_history     │     │   - block_hash (SHA-256, UNIQUE)        │
│ • care_teams, encounters, documents     │     │   - prev_hash (Chained SHA-256)         │
│ • outpatient_appointments               │     │   - payload_hash (Zero-ePHI Hash)       │
│ • security_alerts                       │     │   - merkle_root, secondary_parent_hash  │
│                                         │     │                                         │
│ Permissions: Full CRUD                  │     │ Permissions: APPEND-ONLY (Write-Only)   │
│                                         │     │ (REVOKE UPDATE, DELETE, TRUNCATE)       │
└─────────────────────────────────────────┘     └─────────────────────────────────────────┘
```

---

## 🔌 API Endpoints Reference (`src/routes/`)

### Authentication (`/api/v1/auth`)
* `POST /login` — Authenticates credentials, issues HS256 JWT containing user ID, role, and home ward.
* `POST /switch-ward` — Switches active operational ward context; validates against scheduled rosters and logs a `WARD_SWITCH` audit block.
* `GET /me` — Returns current authenticated session metadata.

### Patient Records (`/api/v1/patients`)
* `GET /` — Lists patients within active ward scope and permitted care teams (role DTO masked).
* `GET /:id` — Retrieves a single patient record. Evaluates CAAC; returns masked DTO on success or `403 Forbidden` with a `PATIENT_VIEW_BLOCKED` audit block on denial.
* `POST /` — Registers a new patient record (requires `CLERK`, `ADMIN`, or clinical role).

### Emergency Break-Glass (`/api/v1/patients/:id/break-glass`)
* `POST /tier1` — 1-click unlock (<500ms) for resuscitation summary (blood type, allergies, vitals, code status). Logs `BREAK_GLASS_TIER1`.
* `POST /tier2` — Full chart unlock (4-hour session). Requires mandatory clinical justification ($\ge 10$ characters); logs `BREAK_GLASS_TIER2` and alerts Head of Unit.

### Cryptographic Audit Ledger (`/api/v1/audit`)
* `GET /stream` — Paginated query over the live sequential audit block stream.
* `POST /verify` — Recalculates hash chain integrity from Genesis to present; returns `valid: true` or pinpoints the exact tampered block index.
* `GET /merkle-tree` — Returns the current binary Merkle tree topology, roots, and DAG branches for visualization.
* `POST /proof` — Generates an $O(\log N)$ Merkle inclusion proof for a specific audit block.
* `POST /reconcile-offline` — Ingests offline audit blocks and generates a dual-parent Merkle DAG merge commit.

### Clinical Workflows
* `GET /nurse/overview` — Nurse station telemetry, bed census, and acuity breakdown.
* `POST /nurse/vitals` — Records bedside vital signs observation (`action: 'RECORD_VITALS'`).
* `GET /doctor/overview` — Physician active caseload and consultations.
* `POST /doctor/encounters` — Records SOAP encounter notes with CAAC validation.

### Mode B: Legacy EMR Reverse Proxy (`/api/v1/emr-proxy`)
* `ALL /*` — Intercepts HTTP traffic targeting upstream legacy EMRs (OpenMRS, Bahmni, FHIR), evaluates CAAC, forwards request, applies role DTO masking to upstream response, and seals audit blocks.

---

## 🛠️ Project Structure

```text
backend/
├── src/
│   ├── app.ts                  # Fastify server initialization & plugin registration
│   ├── db/
│   │   ├── clientPrimary.ts    # Drizzle client for avecinna_primary_db
│   │   ├── clientAudit.ts      # Drizzle client for avecinna_audit_db (write-only)
│   │   ├── schemaPrimary.ts    # Relational clinical & operational schema
│   │   ├── schemaAudit.ts      # Chained append-only audit ledger schema
│   │   └── seedFullHospital.ts # 100-patient synthetic hospital seeder (Synthea)
│   ├── services/
│   │   ├── caacEngine.ts       # 4-factor Context-Aware Access Control engine
│   │   ├── dtoMasker.ts        # Server-side role DTO masking & Admin redaction
│   │   ├── merkleEngine.ts     # SHA-256 chain, Merkle trees & DAG merge
│   │   └── scannerService.ts   # Real-time anomaly detection scanner
│   └── routes/
│       ├── auth.ts             # JWT authentication & ward switching
│       ├── patients.ts         # Patient records CRUD with CAAC
│       ├── breakGlass.ts       # Two-tier emergency override routes
│       ├── audit.ts            # Audit stream & Merkle verification
│       ├── nurse.ts            # Ward census & bedside vitals observation
│       ├── doctor.ts           # Clinical encounter documentation
│       ├── proxy.ts            # Mode B legacy EMR reverse proxy gateway
│       └── admin.ts            # User, ward, and security alert management
├── tests/                      # 13 Vitest security test suites
│   ├── caac.test.ts            # BOLA/IDOR access control verification
│   ├── dtoMasking.test.ts      # OWASP API3 role serialization verification
│   ├── merkleEngine.test.ts    # Tamper detection & hash chain integrity
│   └── breakGlass.test.ts      # Rate limits & emergency override flows
├── drizzle.primary.config.ts   # Primary database Drizzle configuration
├── drizzle.audit.config.ts     # Audit database Drizzle configuration
├── tsconfig.json
└── package.json
```

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
# Run from repository root or backend directory
pnpm install
```

### 2. Configure Environment Variables
Create `.env` in `backend/`:
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/avecinna_primary_db
AUDIT_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/avecinna_audit_db
JWT_SECRET=super-secure-dev-jwt-secret-key-32-chars-min!
PORT=4000
HOST=0.0.0.0
NODE_ENV=development
```

### 3. Database Migration & Seeding
```bash
# Push schema definitions to both databases
pnpm db:push

# Seed full hospital dataset (100 Synthea patients, 12 staff, care teams, audit chain)
pnpm db:seed:full
```

### 4. Start Development Server
```bash
pnpm dev
```
* **API Gateway:** [http://localhost:4000](http://localhost:4000)
* **Interactive Swagger Documentation:** [http://localhost:4000/docs](http://localhost:4000/docs)

---

## 🧪 Security Test Suite

```bash
# Run all Vitest security suites
pnpm test

# Run a specific security test suite
npx vitest run tests/caac.test.ts
npx vitest run tests/dtoMasking.test.ts
npx vitest run tests/merkleEngine.test.ts
```

All test cases run against realistic synthetic data generated by the Synthea simulator, ensuring compliance with Hackathon Rule 01 (No real personal data).
