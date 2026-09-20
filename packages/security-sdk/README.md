# @avecina/sdk — Universal Healthcare Developer SDK

> **Zero-Trust Healthcare Security Platform SDK (Mode C)**  
> Framework-agnostic client library providing Context-Aware Access Control (CAAC), Server-Side Role DTO Masking (OWASP API3), and physically isolated SHA-256 Merkle Hash Chain Audit Logging for any Node.js, TypeScript, or edge backend.

---

## Features

- **Framework-Agnostic Core:** Use directly in NestJS, Express, Fastify, Hono, Next.js, Nuxt Nitro, GraphQL resolvers, or plain Node.js.
- **Context-Aware Access Control (CAAC):** Enforces dynamic ward matching, shift validation, and care team consults.
- **OWASP API3 Mitigation:** Server-side DTO response masking ensures non-doctors never receive unauthorized clinical notes or HIV/psychiatric labs over the wire.
- **Isolated Cryptographic Audit Ledger:** Appends tamper-proof sequential SHA-256 hash blocks directly to `avecinna_audit_db` with `execution_mode = 'MODE_C'`.

---

## Installation

```bash
npm install @avecina/sdk pg
# or
pnpm add @avecina/sdk pg
```

---

## Initialization

```typescript
import { AvecinnaSDK } from '@avecina/sdk';

export const avecinna = new AvecinnaSDK({
  primaryDbUrl: process.env.DATABASE_URL_PRIMARY!,
  auditDbUrl: process.env.DATABASE_URL_AUDIT!,
  serviceName: 'radiology-imaging-service',
  executionMode: 'MODE_C',
});
```

---

## 1. Standalone Usage (NestJS, GraphQL, Background Workers, Plain TypeScript)

```typescript
// 1. Evaluate CAAC Authorization anywhere:
const decision = await avecinna.caac.evaluate({
  userId: 'u-doc-cardio',
  role: 'DOCTOR',
  activeWardId: 'w-cardio',
  patientId: 'p-cardio-01',
  shiftStart: '2026-09-20T08:00:00Z',
  shiftEnd: '2026-09-20T20:00:00Z',
});

if (!decision.isPermitted) {
  throw new Error(`Forbidden: ${decision.denialReason}`);
}

// 2. Role DTO Masking:
const safeRecord = avecinna.masking.maskPatient(rawPatientData, 'NURSE');
// -> Vitals and medications preserved; clinical notes & diagnostic history stripped

// 3. Cryptographic Audit Log:
await avecinna.audit.log({
  userId: 'u-doc-cardio',
  patientId: 'p-cardio-01',
  action: 'IMAGING_STUDY_ACCESSED',
  activeWard: 'w-cardio',
  payload: { studyId: 'xray-409' },
});

// 4. Verify Audit Ledger Integrity:
const integrity = await avecinna.audit.verifyChain();
console.log(integrity.status); // 'VERIFIED'
```

---

## 2. Express.js Integration

```typescript
import express from 'express';
import { avecinna } from './sdk.js';

const app = express();
app.use(express.json());

// Protect clinical endpoints with one line:
app.get('/patients/:id', avecinna.express({ patientIdParam: 'id' }), (req, res) => {
  // req.avecina contains verified clinician session, patient record, and relationship
  res.json(req.avecina.patient); // Automatically role-masked & audit-logged!
});
```

---

## 3. Fastify Integration

```typescript
import Fastify from 'fastify';
import { avecinna } from './sdk.js';

const fastify = Fastify();

await fastify.register(avecinna.fastify());

fastify.get('/patients/:id', async (req) => {
  return req.avecina.patient; // Automatically role-masked & audit-logged!
});
```

---

## 4. Web Standard (Hono / Next.js / Nuxt Nitro / Cloudflare / Lambda)

```typescript
// in app/api/patients/[id]/route.ts (Next.js / Nuxt / Hono):
export async function GET(request: Request) {
  const guard = await avecinna.guardRequest(request);
  if (!guard.isPermitted) {
    return guard.response!; // Pre-built 403 Forbidden Response with audit logged
  }

  return avecinna.createSecureResponse(guard.patient, guard.user!.role);
}
```
