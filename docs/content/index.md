---
title: Avecinna Documentation
description: Context-Aware Secure Electronic Medical Records (EMR) — Technical Architecture, Zero-Trust Authorization & Cryptographic Audit Ledger
layout: page
---

# Avecinna: Context-Aware Secure EMR

::badge{type="info"}
ICSC Hackathon Track C1 — Safe Access to Patient Records
::

::badge{type="success"}
Production Architecture v2.1
::

Welcome to the official developer and architecture documentation for **Avecinna: Context-Aware Secure Electronic Medical Records**.

Avecinna eliminates insider medical record snooping, unsegmented cross-ward unauthorized data exposure, and ransomware audit log destruction in healthcare environments through **Context-Aware Access Control (CAAC)**, **Server-Side Role DTO Masking (OWASP API3 Mitigation)**, and a **Physically Isolated Cryptographic Merkle Audit Ledger**.

---

## Interactive Security Demonstrations

Experience Avecinna's core security algorithms live directly in your browser:

### 1. Context-Aware Access Control (CAAC) Simulator
::caac-simulator
::

### 2. Server-Side Role DTO Masking (OWASP API3)
::dto-mask-preview
::

### 3. Cryptographic Merkle Tree & Tamper Proofs
::merkle-tree-demo
::

---

## Architectural Pillars

::card-grid
#title
Core System Capabilities

#root
:::card
---
title: Context-Aware Access Control (CAAC)
icon: lucide:shield-check
---
Dynamic 4-factor authorization engine evaluating:  
$\text{Permit} = \text{RoleValid} \land \text{ShiftActive} \land (\text{Ward} \lor \text{CareTeam} \lor \text{OPD} \lor \text{BreakGlass})$
:::

:::card
---
title: Server-Side DTO Masking
icon: lucide:eye-off
---
Defeats OWASP API3 (Excessive Data Exposure). Serializes distinct, strictly scoped JSON representations for Doctors, Nurses, Clerks, Pharmacists, and Administrators.
:::

:::card
---
title: Isolated Cryptographic Audit Ledger
icon: lucide:database-zap
---
Physically isolated PostgreSQL database storing chained SHA-256 blocks with Merkle DAG offline branch reconciliation. Immune to primary database ransomware wipes.
:::

:::card
---
title: Tri-Mode Deployment Architecture
icon: lucide:layers
---
Operates as a **Standalone Nuxt 4 EMR (Mode A)**, a **Zero-Trust Reverse Proxy Sidecar (Mode B)** for OpenMRS/FHIR, and an **Embedded Middleware SDK (Mode C)**.
:::
::

---

## Quick Navigation

- [Quick Start Guide](/getting-started/quick-start) — Boot local PostgreSQL databases, backend API, and frontend client in under 5 minutes.
- [CAAC Engine Specification](/core-security-engine/caac-authorization) — Mathematical authorization formulas, shift roster checks, and BOLA/IDOR defenses.
- [Cryptographic Audit Architecture](/cryptographic-audit-ledger/isolated-audit-db) — Dual DB isolation, sequential hash chains, and Merkle DAG branch merging.
- [Mode B Reverse Proxy Sidecar](/operational-modes/mode-b-reverse-proxy) — Securing legacy hospital EMRs (OpenMRS/FHIR) transparently.
- [Mode C Developer SDK](/operational-modes/mode-c-embedded-sdk) — Using `@avecina/sdk` in Express, Fastify, and Web Standard runtimes.
- [REST API Reference](/api-reference/authentication-and-session) — Complete endpoint schemas, authentication headers, and cURL examples.
