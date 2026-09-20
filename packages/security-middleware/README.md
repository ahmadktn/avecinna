# @avecina/security-middleware

> **Zero-Trust Healthcare Security Middleware SDK (Mode C)**  
> Enforces Context-Aware Access Control (CAAC), Server-Side Role DTO Masking (OWASP API3), and physically isolated SHA-256 Merkle Hash Chain Audit Logging for custom healthcare microservices.

---

## Installation

```bash
npm install @avecina/security-middleware pg
# or
pnpm add @avecina/security-middleware pg
```

---

## 1. Express Integration Example

```typescript
import express from 'express';
import { createAvecinnaExpressMiddleware } from '@avecina/security-middleware';

const app = express();
app.use(express.json());

// 1. Configure the Zero-Trust Middleware
const avecinnaMiddleware = createAvecinnaExpressMiddleware({
  primaryDbUrl: process.env.DATABASE_URL_PRIMARY!,
  auditDbUrl: process.env.DATABASE_URL_AUDIT!,
  serviceName: 'radiology-imaging-service',
  enforceCaac: true,
  enforceDtoMasking: true,
});

// 2. Protect Clinical Endpoints
app.get('/api/v1/patients/:id', avecinnaMiddleware, (req, res) => {
  // req.avecina contains verified clinician session, patient record, and relationship
  const patient = req.avecina.patient;
  
  // Responding with the clinical record will automatically be masked by caller role!
  res.json(patient);
});

app.listen(5000, () => {
  console.log('Secure Clinical Microservice running on port 5000');
});
```

---

## 2. Fastify Integration Example

```typescript
import Fastify from 'fastify';
import { createAvecinnaFastifyPlugin } from '@avecina/security-middleware';

const fastify = Fastify();

await fastify.register(createAvecinnaFastifyPlugin({
  primaryDbUrl: process.env.DATABASE_URL_PRIMARY!,
  auditDbUrl: process.env.DATABASE_URL_AUDIT!,
  serviceName: 'oncology-lab-service',
}));

fastify.get('/api/v1/patients/:id', async (request, reply) => {
  return request.avecina.patient;
});

await fastify.listen({ port: 5000 });
```

---

## 3. Core Security Guarantees

1. **Context-Aware Access Control (CAAC):**  
   Evaluates whether caller role, shift status, active working ward context, and care team assignments permit access. Unauthorized attempts yield `403 Forbidden` and append `MODE_C_ACCESS_DENIED` blocks to the isolated audit database.
2. **OWASP API3 Excessive Data Exposure Mitigation:**  
   Scavenges outgoing JSON objects, stripping unauthorized clinical fields (e.g. clinical notes and long-term history for Nurses/Paramedics, clinical observations for Clerks, full redaction for Admins).
3. **Isolated Merkle Audit Ledger:**  
   Directly records chained SHA-256 blocks with `execution_mode = 'MODE_C'` to `avecinna_audit_db`, preserving cryptographic non-repudiation.
