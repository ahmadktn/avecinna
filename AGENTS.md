# AGENTS.md — AI Agent Guidelines & Architecture Blueprint

Welcome, AI Coding Agent! This document defines the technical rules, security constraints, codebase organization, authoritative reference specifications, and security skills reference for building **Avecinna: Context-Aware Secure EMR**.

---

## 0. Authoritative System Specifications (`dev-docs/`)

Before making architectural, data modeling, access control, or implementation decisions, **you MUST inspect and consult the latest design documents in `dev-docs/`**:

1. **Latest System Design Document:**  
   [dev-docs/system_design.md](file:///home/ahmad/Documents/GitHub/avecinna/dev-docs/system_design.md) (or [dev-docs/SYSTEM DESIGN V1.3.MD](file:///home/ahmad/Documents/GitHub/avecinna/dev-docs/SYSTEM%20DESIGN%20V1.3.MD)) — Authoritative technical architecture, ER diagrams, DDL schemas, Hash Chain + Merkle Tree algorithms, Fastify Reverse Proxy sidecar code, and DTO masks.
2. **Technical Design Document:**  
   [dev-docs/Avecinna_Secure_Electronic_Medical_Records_EMR_v2.md](file:///home/ahmad/Documents/GitHub/avecinna/dev-docs/Avecinna_Secure_Electronic_Medical_Records_EMR_v2.md) — Team v2.1 technical design specification, challenge problem statement, core design philosophy, and HIPAA compliance matrix.
   - **Technical Design Document (v1.3):** [dev-docs/Avecinna_Context-Aware_Secure_EMR_System_Design_DocumentV1.3.md](file:///home/ahmad/Documents/GitHub/avecinna/dev-docs/Avecinna_Context-Aware_Secure_EMR_System_Design_DocumentV1.3.md)
3. **Latest Requirements Specification Document:**  
   [dev-docs/requirements.md](file:///home/ahmad/Documents/GitHub/avecinna/dev-docs/requirements.md) — System requirements, user personas, functional user stories (`As a ..., I want to ... so that ...`), and non-functional requirements across Modes A, B, and C.
4. **Development Progress & Tasks Tracker:**  
   [tasks.md](file:///home/ahmad/Documents/GitHub/avecinna/tasks.md) — Phased task checklist for tracking progress.

---

## 1. Project Technology Stack & Workspace Structure

- **Frontend:** **Nuxt 4** (using the new `app/` directory structure, `vue-router v5`), **TailwindCSS 3** with Vite, **Service Worker** (Background Sync API), and **IndexedDB** (Web Crypto API `AES-GCM-256`).
- **Backend:** **Fastify** (TypeScript), **Drizzle ORM** (`drizzle-kit` for migrations), Node.js v20+.
- **Database Layer (Dual PostgreSQL DBs):**
  - **Primary Database (`avecinna_primary_db`):** Stores Users, Wards, Inpatients, Outpatients, Appointments, Lab Results, Medical Documents, Sessions, Security Alerts.
  - **Isolated Audit Database (`avecinna_audit_db`):** Physically isolated PostgreSQL database storing chained SHA-256 `audit_blocks` with write-only credentials to prevent ransomware log wiping.
- **Integration Packages:**
  - `backend/src/routes/proxy.ts` — **Mode B:** Security Reverse Proxy Gateway Sidecar (for OpenMRS/FHIR).
  - `packages/security-middleware` — **Mode C:** Embedded Middleware SDK (`@avecina/security-middleware`).
- **Testing:** **Vitest** (Unit/Integration), **Supertest** (Fastify API), **Playwright** (E2E).

```text
avecinna/
├── app/                      # Nuxt 4 Application Code (pages, components, composables)
├── backend/                  # Fastify Backend API Server
│   ├── src/
│   │   ├── db/              # Drizzle ORM client & schemas (schemaPrimary.ts, schemaAudit.ts)
│   │   ├── routes/          # Fastify route handlers (auth, patients, admin, unit, proxy, audit)
│   │   └── services/        # Security engines (caacEngine.ts, dtoMasker.ts, merkleEngine.ts)
│   └── tests/               # Vitest & Supertest API security test suites
├── packages/
│   └── security-middleware/ # Mode C npm SDK (@avecina/security-middleware)
├── dev-docs/                 # Architectural specifications (system_design.md, requirements.md)
├── tasks.md                  # Development progress tracker
└── AGENTS.md                 # AI agent rules & guidelines (THIS FILE)
```

---

## 2. Mandatory Architectural Security Rules

### Rule 1: Context-Aware Access Control (CAAC) Authorization
- Every patient record access **MUST** be evaluated via `evaluateCAAC()` before fetching data.
- **Formula:** $\text{Permit} = \text{RoleValid} \land \text{ShiftActive} \land \left( (\text{ActiveWard} == \text{PatientWard}) \lor (\text{StaffID} \in \text{PatientCareTeam}) \lor \text{OutpatientDoctorToday} \lor \text{BreakGlassActive} \right)$.
- Denied requests MUST return HTTP `403 Forbidden` and append an unauthorized access block to `avecinna_audit_db`.

### Rule 2: Server-Side Role DTO Masking (OWASP API3 Mitigation)
- **NEVER** return full raw database objects to non-doctor roles.
- Use `filterPatientRecordByRole()` in `backend/src/services/dtoMasker.ts` to serialize response JSON server-side:
  - **Doctor / Head of Unit:** Full clinical record.
  - **Nurse / Paramedic:** Vitals, active medications, allergies, care plan ONLY (no long-term clinical notes/labs).
  - **Clerk:** Demographics and bed assignment ONLY.
  - **Pharmacist:** Medication history, active prescriptions, and allergy profile ONLY.
  - **System Admin (`ADMIN`):** **STRICT CLINICAL DATA REDACTION**. Admins manage users/wards/audit verification BUT querying clinical data returns `[REDACTED - ADMIN PRIVACY RESTRICTION]`.

### Rule 3: Cryptographic Audit Ledger Integration (`avecinna_audit_db`)
- Every sensitive event (View, Edit, Ward Switch, Break-Glass T1/T2, Consult Grant, Document Upload) **MUST** invoke `appendAuditBlock()`.
- **NEVER** write audit logs into `avecinna_primary_db`. Audit logs sit in `avecinna_audit_db`.
- **NEVER** store raw ePHI in audit blocks. Store `payloadHash = SHA256(JSON.stringify(payload))`.
- Understand the 3-Tier Audit Division of Labor:
  1. **Sequential Hash Chain:** Provides $O(1)$ real-time sequential block chaining (`prev_hash`).
  2. **Binary Merkle Tree:** Periodically constructs Merkle tree roots over leaves for external signing & $O(\log N)$ tamper proofs.
  3. **Merkle DAG:** Merges parallel offline ward branches upon reconnection via dual-parent merge commits.

### Rule 4: Medical Document & Lab Attachment Integrity
- Uploaded files (`medical_documents`, `lab_results`) MUST compute the SHA-256 hash of binary file content (`document_hash`).
- File access MUST enforce CAAC rules to prevent unauthorized document downloads.

---

## 3. Integration with Security Skills (`~/.agents/skills`)

When building, auditing, or writing tests for Avecinna, leverage the security patterns from `~/.agents/skills`:

1. **`testing-api-for-broken-object-level-authorization` (BOLA/IDOR)**:
   - Apply BOLA ID substitution testing patterns in `backend/tests/caac.test.ts` to prove that Doctor A substituting Patient B's ID yields HTTP 403 unless a care team consult exists.
2. **`exploiting-excessive-data-exposure-in-api` (OWASP API3)**:
   - Apply response DTO auditing to ensure Clerk, Pharmacist, and Admin JSON responses contain zero leaked clinical fields.
3. **`implementing-api-schema-validation-security`**:
   - Enforce Fastify JSON Schema validation (`schema: { body: ..., response: ... }`) on all Fastify routes to reject malformed payloads.
4. **`implementing-identity-verification-for-zero-trust`**:
   - Enforce JWT validation and dynamic session active-ward resolution on every request header.
5. **`implementing-api-abuse-detection-with-rate-limiting`**:
   - Throttle `/api/v1/patients/:id/break-glass/tier2` activations to max 3 per shift per clinician.

---

## 4. Coding Conventions & Workflow Rules

1. **TypeScript Strictness:** Always use explicit TypeScript types. Avoid using `any` unless absolutely necessary during transient data parsing.
2. **Drizzle Connection Isolation:** Use `dbPrimary` for `avecinna_primary_db` and `dbAudit` for `avecinna_audit_db`. Do not cross-mix connections.
3. **Nuxt 4 Structure:** Place pages in `app/pages/`, components in `app/components/`, composables in `app/composables/`, and shared types in `shared/`.
4. **Task Tracking (`tasks.md`):** Whenever completing a milestone or task, update [tasks.md](file:///home/ahmad/Documents/GitHub/avecinna/tasks.md) to check off completed items (`- [x]`).
5. **Testing Verification:** Never mark a phase complete without running Vitest/Supertest suites to verify clean execution.
6. Never use emoji in the frontend, use real icons
7. Never use hardcoded silent fallbacks in the code, everything must use real data from the database, if the data is not available, return an error, or a null response or appropriate error message.