# .agents/AGENTS.md — Workspace Security & Architecture Rules

Refer to the primary [AGENTS.md](file:///home/ahmad/Documents/GitHub/avecinna/AGENTS.md) file in the workspace root for the full architecture blueprint, security constraints, and security skills reference for **Avecinna: Context-Aware Secure EMR**.

### Authoritative System Specifications (`dev-docs/`)
- **System Design Document:** [dev-docs/system_design.md](file:///home/ahmad/Documents/GitHub/avecinna/dev-docs/system_design.md)
- **Technical Design Document (v2.1):** [dev-docs/Avecinna_Secure_Electronic_Medical_Records_EMR_v2.md](file:///home/ahmad/Documents/GitHub/avecinna/dev-docs/Avecinna_Secure_Electronic_Medical_Records_EMR_v2.md)
- **Technical Design Document (v1.3):** [dev-docs/Avecinna_Context-Aware_Secure_EMR_System_Design_DocumentV1.3.md](file:///home/ahmad/Documents/GitHub/avecinna/dev-docs/Avecinna_Context-Aware_Secure_EMR_System_Design_DocumentV1.3.md)
- **Requirements Specification:** [dev-docs/requirements.md](file:///home/ahmad/Documents/GitHub/avecinna/dev-docs/requirements.md)
- **Task Tracker:** [tasks.md](file:///home/ahmad/Documents/GitHub/avecinna/tasks.md)

### Core Directives Summary
- **CAAC Authorization**: Enforce `Permit = RoleValid AND ShiftActive AND (ActiveWard == PatientWard OR StaffID IN CareTeam OR OutpatientDoctorToday)` on all endpoints.
- **Admin Privacy Redaction**: System Admins (`ADMIN`) manage users/wards/audit verification BUT ARE STRICTLY REDACTED FROM READING CONFIDENTIAL CLINICAL DATA (`[REDACTED - ADMIN PRIVACY RESTRICTION]`).
- **Dual Database Isolation**: `avecinna_primary_db` (primary operational clinical data) vs. `avecinna_audit_db` (isolated, append-only SHA-256 Merkle audit ledger).
- **OWASP API3 Mitigation**: Always pass responses through `filterPatientRecordByRole()` in `backend/src/services/dtoMasker.ts` before transmitting JSON.
- **Security Skills**: Apply patterns from `~/.agents/skills` (`testing-api-for-broken-object-level-authorization`, `exploiting-excessive-data-exposure-in-api`, `implementing-api-schema-validation-security`).
