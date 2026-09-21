# Avecinna: Context-Aware Secure EMR

🔗 **GitHub:** [https://github.com/ahmadktn/avecinna](https://github.com/ahmadktn/avecinna)  
🌐 **Live Site:** [https://avecinna.vitalsdeck.com.ng](https://avecinna.vitalsdeck.com.ng)

> **Zero-Trust Clinical Access Control, Server-Side DTO Masking & Tamper-Proof Merkle Audit Ledger**  
> *Built for Nigerian Hospital Realities & Resource-Constrained Clinical Environments*  
> **ICSC Hackathon — Track C1: Safe Access to Patient Records** | **Team VitalsDeck** | September 2026

---

## 🏥 The Problem: Healthcare Security in Emerging Markets

Hospitals in Nigeria and across the Global South are transitioning from paper folders to digital workstations faster than their technical infrastructure can secure them:

1. **All-or-Nothing Access (Privilege Creep):** Static Role-Based Access Control (RBAC) treats anyone with staff credentials identically. A night admissions clerk, an intern, and an attending physician can open the exact same comprehensive patient history.
2. **Devastating Privacy Fallout:** Medical records contain intensely stigmatized information: an unintended disclosure of HIV status, sickle-cell genotype, pregnancy termination, or psychiatric history routinely destroys livelihoods, marriages, and personal safety.
3. **Destructible Co-Located Audit Logs:** In prevailing systems, audit tables sit inside the operational database. Rogue administrators or ransomware operators execute `DROP TABLE audit_logs;` to wipe forensic evidence.
4. **The Emergency vs. Security Deadlock:** Stringent security prompts cause fatal delays during cardiac arrest and acute trauma. Doctors cannot be stopped by a login screen, which forces hospitals to weaken security or share super-user credentials.
5. **Grid Collapse & Network Blackouts:** Unstable electrical grids and intermittent broadband paralyse cloud-only EMRs, forcing clinicians back to untracked paper notes.

---

## 🛡️ The Solution: Three Architectural Pillars

Avecinna is an open-source, dual-database EMR security platform that resolves the tension between clinical urgency, patient privacy, and forensic accountability:

```mermaid
flowchart TD
    subgraph ClientLayer ["Client Layer — Nuxt 4 PWA"]
        UI["Clinical Dashboard UI"]
        SW["Service Worker\n(Background Sync)"]
        IDB[("Encrypted IndexedDB\nAES-GCM-256")]
        UI <--> IDB
        UI <--> SW
    end

    subgraph SecurityCore ["Avecinna Security Core — Fastify / TypeScript"]
        API["Fastify API Gateway"]
        CAAC["CAAC Engine\n(4-Factor Authorization)"]
        DTO["Server-Side DTO Masker\n(OWASP API3)"]
        MERKLE["Merkle Ledger Engine\n(SHA-256 Chain + Tree)"]
        SCANNER["Suspicious Access\nScanner"]
        PROXY["Mode B Reverse Proxy\nSidecar"]

        API --> CAAC
        CAAC --> DTO
        CAAC --> MERKLE
        API --> SCANNER
        CAAC --> PROXY
    end

    subgraph PrimaryDB ["Primary Relational Storage"]
        DB[("avecinna_primary_db\nUsers · Wards · Patients\nEncounters · Care Teams")]
    end

    subgraph AuditDB ["Physically Isolated Audit Storage"]
        LEDGER[("avecinna_audit_db\nChained SHA-256 Blocks\nAppend-Only · Write-Only Credentials")]
    end

    subgraph LegacyEMR ["Mode B Target: Legacy EMR"]
        UPSTREAM["Upstream EMR API\n(OpenMRS / FHIR)"]
    end

    UI -->|HTTPS| API
    SW -->|Reconnection Sync| API
    API <-->|Read/Write| DB
    MERKLE <-->|Append-Only Blocks| LEDGER
    PROXY <-->|Filtered Requests| UPSTREAM
```

### 1. Context-Aware Access Control (CAAC) Engine
Unlike static RBAC, CAAC dynamically evaluates access at execution time against a formal Boolean predicate:
$$\text{Permit} = \text{RoleValid} \land \text{ShiftActive} \land (\text{ActiveWard} == \text{PatientWard} \lor \text{StaffID} \in \text{CareTeam} \lor \text{OutpatientDoctorToday} \lor \text{BreakGlassActive})$$
* **BOLA / IDOR Elimination (OWASP API1):** Directly mitigates URL ID substitution attacks.
* **Time-Bounded Care Teams:** Manages multidisciplinary consults (`PRIMARY`, `ON_CALL`, `CONSULT`) that expire automatically.
* **Nurse least-privilege:** Nurses monitor ward bed occupancy and record bedside vitals, but viewing detailed patient records requires an active care team assignment or emergency break-glass.

### 2. Server-Side DTO Masking & Two-Tier Break-Glass
* **Server-Side Field Pruning (OWASP API3):** Raw JSON is filtered by role before transmission. Non-physicians never receive clinical notes over the network.
* **Administrator Privacy Redaction:** System Administrators configure users and wards, but are strictly barred from reading confidential ePHI (`[REDACTED - ADMIN PRIVACY RESTRICTION]`).
* **Two-Tier Emergency Break-Glass:**
  * **Tier 1 (Instant Resuscitation Summary, <500ms):** 1-click access to blood group, severe drug allergies, resuscitation meds, and vitals. No justification required.
  * **Tier 2 (Full Record Unlock, 4-Hour Session):** Mandatory clinical justification ($\ge 10$ characters), 4-hour hard ceiling, alerts Head of Unit, rate-limited to 3 activations/shift.

### 3. Isolated Cryptographic Audit Ledger & Offline DAG
* **Physical Database Isolation:** Audit blocks reside in a dedicated PostgreSQL database (`avecinna_audit_db`) using write-only credentials (`REVOKE UPDATE, DELETE, TRUNCATE`).
* **Sequential SHA-256 Hash Chain ($O(1)$ Append):** Every event generates a cryptographically chained block. Tampering cascades invalidation across the entire history.
* **Binary Merkle Tree ($O(\log N)$ Proofs):** Generates logarithmic inclusion proofs for external auditors without exposing neighboring patient records.
* **Zero-ePHI Storage:** Only the deterministic hash of the payload ($\text{SHA256}(\text{JSON.stringify}(\text{payload}))$) is stored in the audit ledger.
* **Offline Merkle DAG Merge:** When wards disconnect during power cuts, they build a local audit branch in AES-GCM-256 encrypted IndexedDB. Upon reconnection, the server creates a Git-style dual-parent merge commit:
  $$\text{MergeHash} = \text{SHA256}(\text{MainlineTail} \parallel \text{OfflineTail} \parallel \text{WardID} \parallel \text{Timestamp})$$

---

## 🚀 Tri-Mode Deployment Architecture

Avecinna adapts to hospital infrastructure constraints:

* **Mode A (Standalone EMR):** Full-stack deployment with Nuxt 4 PWA frontend and Fastify security core.
* **Mode B (Zero-Trust Reverse Proxy Sidecar):** Deploys as a gateway in front of existing, unmodifiable systems (OpenMRS, Bahmni, FHIR servers). Intercepts traffic at `/api/v1/emr-proxy/*`, enforces CAAC, applies DTO masking, and records audit blocks with zero upstream code changes.
* **Mode C (Embedded Security SDK):** Standalone npm packages (`@avecina/sdk`, `@avecina/middleware`) enabling HealthTech developers to embed CAAC and Merkle audit into Express, Fastify, and Web Standard runtimes.

---

## 💻 Tech Stack & Zero-Cost Compliance

Built with 100% free, open-source software on a standard development laptop ($0 spend). 100% synthetic patient data generated by Synthea (zero real personal health information):

| Layer | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Frontend** | Nuxt 4 (Vue 3) | Nuxt 4.0, Vite | SSR + PWA architecture, offline caching |
| **Styling** | TailwindCSS | TailwindCSS 4 | Accessible, medical-grade UI |
| **Backend Core** | Fastify | Fastify 5.x, TypeScript | High-throughput async REST API engine |
| **ORM** | Drizzle ORM | Drizzle ORM, `drizzle-kit` | Type-safe SQL migrations and dual-database connections |
| **Primary Database** | PostgreSQL | PostgreSQL 16 | ACID operational storage (`avecinna_primary_db`) |
| **Audit Ledger DB** | PostgreSQL | PostgreSQL 16 (Isolated) | Append-only chained cryptographic ledger (`avecinna_audit_db`) |
| **Cryptography** | Node.js `crypto` / Web Crypto | SHA-256, AES-GCM-256, PBKDF2 | Hash chains, Merkle trees, client-side encryption |
| **Testing** | Vitest & Supertest | Vitest 2.x, 13 test suites | Automated BOLA, DTO masking, and Merkle verification |
| **Synthetic Data** | Synthea | Synthetic FHIR R4 Bundles | 100% realistic synthetic clinical test data |

---

## 📁 Repository Structure

```text
avecinna/
├── frontend/               # Nuxt 4 Clinical Web Application & PWA
│   ├── app/
│   │   ├── pages/          # Role-tailored dashboards (/nurse, /doctor, /admin, /patients)
│   │   ├── components/     # Break-glass modal, Merkle DAG visualizer, bed matrix
│   │   ├── composables/    # useAuth, usePatients, useAudit, useBreakGlass
│   │   └── utils/          # offlineCrypto.ts (AES-GCM-256), offlineDatabase.ts
│   └── public/sw.js        # Service Worker for offline PWA background sync
├── backend/                # Fastify 5 TypeScript Security Core API
│   ├── src/
│   │   ├── services/       # caacEngine.ts, dtoMasker.ts, merkleEngine.ts, scannerService.ts
│   │   ├── routes/         # patients.ts, breakGlass.ts, audit.ts, nurse.ts, proxy.ts
│   │   ├── db/             # schemaPrimary.ts, schemaAudit.ts, seedFullHospital.ts
│   │   └── app.ts          # Fastify server entry point
│   └── tests/              # Vitest security test suites (BOLA, DTO, Merkle, Proxy)
├── packages/
│   ├── security-sdk/       # Mode C: Standalone TypeScript Security SDK
│   └── security-middleware/# Mode C: Express / Fastify / Web Standard middleware
├── docs/                   # Interactive developer documentation & architecture guides
└── Avecinna_Technical_Writeup.docx  # 3-Page Hackathon Submission Write-Up
```

---

## ⚡ Quick Start & Setup Guide

### Prerequisites
* **Node.js:** v20.10.0 or higher
* **Package Manager:** `pnpm` (v9+)
* **Database:** PostgreSQL 16 (running locally or via Docker)

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/ahmadktn/avecinna.git
cd avecinna
pnpm install
```

### 2. Configure Environment Variables
Create `.env` in the project root:
```env
# Primary Operational Database (Clinical Data)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/avecinna_primary_db

# Isolated Audit Database (Append-Only Cryptographic Ledger)
AUDIT_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/avecinna_audit_db

# Security & JWT
JWT_SECRET=super-secure-dev-jwt-secret-key-32-chars-min!
PORT=4000
HOST=0.0.0.0
NODE_ENV=development

# Frontend API URL
NUXT_PUBLIC_API_BASE=http://localhost:4000/api/v1
```

### 3. Initialize Databases & Seed Hospital Data
```bash
# Push schemas to both primary and audit databases
pnpm --filter backend db:push

# Seed full hospital dataset (wards, users, care teams, Synthea patients, audit chain)
pnpm --filter backend db:seed:full
```

### 4. Start Development Servers
```bash
# Start backend API (http://localhost:4000) and Nuxt 4 frontend (http://localhost:3000)
pnpm dev
```
* **Web Application:** [http://localhost:3000](http://localhost:3000)
* **Swagger API Docs:** [http://localhost:4000/docs](http://localhost:4000/docs)

---

## 🔑 Demo Personas & Credentials

All seeded demo accounts use the standard password: **`SecurePassword123!`**

| Role | Email | Username | Primary Ward | Key Capability to Test |
| :--- | :--- | :--- | :--- | :--- |
| **Ward Nurse** | `nurse.cardio@avecinna.org` | `nurse_cardio` | Cardiology | Records vitals for ward beds; blocked on unassigned charts; triggers Break-Glass. |
| **Cardiologist** | `doctor.cardio@avecinna.org` | `dr_cardio` | Cardiology | Full clinical charts for ward inpatients and assigned care team consults. |
| **Head of Unit** | `hou.cardio@avecinna.org` | `hou_cardio` | Cardiology | Supervisory ward access, care team grant issuance, and break-glass reviews. |
| **Admissions Clerk** | `clerk@avecinna.org` | `clerk` | Admissions | DTO Masking demo: sees bed numbers and names; clinical data stripped server-side. |
| **Compliance Officer** | `compliance@avecinna.org` | `compliance` | Quality & Safety | Audits live SHA-256 stream, verifies Merkle root integrity, reviews scanner alerts. |
| **System Admin** | `admin@avecinna.org` | `admin` | IT Operations | User & ward provisioning; clinical fields strictly redacted (`[REDACTED]`). |
| **Trauma Surgeon** | `doctor.emerg@avecinna.org` | `dr_emerg` | Emergency | Emergency room triage and rapid operative chart unlock. |

---

## 🧪 Security Test Suite

Avecinna features 13 automated security test suites covering OWASP API Top 10 vulnerabilities:

```bash
# Run all security test suites
pnpm --filter backend test
```

### Key Verified Vulnerabilities:
* **OWASP API1 (BOLA/IDOR):** Verified in `tests/caac.test.ts` — Cross-ward patient ID substitution returns `403 Forbidden` and seals a `PATIENT_VIEW_BLOCKED` audit block.
* **OWASP API3 (Excessive Data Exposure):** Verified in `tests/dtoMasking.test.ts` — Clerk and Admin responses stripped of all clinical notes, diagnoses, and vitals.
* **Cryptographic Tamper Detection:** Verified in `tests/merkleEngine.test.ts` — Changing 1 character in a historical block invalidates the sequential hash chain and breaks the Merkle root.
* **Break-Glass Rate Limiting:** Verified in `tests/breakGlass.test.ts` — Capped at 3 Tier-2 activations per clinician per shift.

---

## 📋 Hackathon Rules Compliance Matrix

| Rule | Requirement | Implementation in Avecinna |
| :---: | :--- | :--- |
| **01** | **No real personal data** | 100% synthetic clinical data generated via Synthea; zero real patient ePHI. |
| **02** | **Build something** | Complete working full-stack prototype (Nuxt 4 PWA + Fastify API + dual PostgreSQL). |
| **03** | **A prototype is enough** | Scoped working prototype demonstrating CAAC, DTO masking, Break-Glass, and Merkle verification. |
| **04** | **Spend nothing** | Built exclusively with free and open-source tools on a normal laptop ($0 cost). |
| **05** | **Explain results honestly** | Dedicated limitations table disclosing offline collisions, prototype scale limits, and roadmap. |
| **06** | **Power & network cuts** | Client-side AES-GCM-256 encrypted cache + Service Worker + dual-parent Merkle DAG merge. |

---

## ⚖️ License
Released under the [MIT License](LICENSE). Built for the ICSC Hackathon by **Team VitalsDeck**.
