<template>
  <aside class="w-64 shrink-0 border-r border-slate-200 bg-white py-6 pl-4 pr-3 overflow-y-auto">
    <div class="space-y-6">
      <div v-for="section in navSections" :key="section.title">
        <h5 class="flex items-center gap-2 font-brand text-xs font-bold uppercase tracking-wider text-slate-400">
          <Icon :name="section.icon" class="h-3.5 w-3.5 text-slate-400" />
          {{ section.title }}
        </h5>
        <ul class="mt-2 space-y-1">
          <li v-for="link in section.links" :key="link.to">
            <NuxtLink
              :to="link.to"
              class="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition"
              active-class="bg-blue-50 text-blue-700 font-semibold"
            >
              <span>{{ link.title }}</span>
            </NuxtLink>
          </li>
        </ul>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
const navSections = [
  {
    title: 'Getting Started',
    icon: 'lucide:compass',
    links: [
      { title: 'Overview & Problem', to: '/getting-started' },
      { title: 'Quick Start (5 Min)', to: '/getting-started/quick-start' },
      { title: 'System Architecture', to: '/getting-started/architecture-overview' },
      { title: 'Production Deployment', to: '/getting-started/deployment-guide' },
    ],
  },
  {
    title: 'Core Security Engine',
    icon: 'lucide:shield-check',
    links: [
      { title: 'CAAC Authorization', to: '/core-security-engine/caac-authorization' },
      { title: 'Server-Side DTO Masking', to: '/core-security-engine/dto-masking' },
      { title: 'Break-Glass Protocol', to: '/core-security-engine/break-glass-protocol' },
      { title: 'Suspicious Access Scanner', to: '/core-security-engine/suspicious-access-scanner' },
    ],
  },
  {
    title: 'Cryptographic Audit',
    icon: 'lucide:database-zap',
    links: [
      { title: 'Isolated Audit DB', to: '/cryptographic-audit-ledger/isolated-audit-db' },
      { title: 'Sequential Hash Chain', to: '/cryptographic-audit-ledger/sequential-hash-chain' },
      { title: 'Binary Merkle Trees', to: '/cryptographic-audit-ledger/binary-merkle-tree' },
      { title: 'Merkle DAG Offline Sync', to: '/cryptographic-audit-ledger/merkle-dag-offline-sync' },
    ],
  },
  {
    title: 'Operational Modes',
    icon: 'lucide:layers',
    links: [
      { title: 'Mode A: Standalone EMR', to: '/operational-modes/mode-a-standalone-emr' },
      { title: 'Mode B: Reverse Proxy', to: '/operational-modes/mode-b-reverse-proxy' },
      { title: 'Mode C: Embedded SDK', to: '/operational-modes/mode-c-embedded-sdk' },
    ],
  },
  {
    title: 'REST API Reference',
    icon: 'lucide:code-2',
    links: [
      { title: 'Auth & Ward Switching', to: '/api-reference/authentication-and-session' },
      { title: 'Patient Management', to: '/api-reference/patient-management' },
      { title: 'Clinical Workflows', to: '/api-reference/clinical-workflows' },
      { title: 'Care Team Collaboration', to: '/api-reference/care-team-collaboration' },
      { title: 'Audit & Merkle API', to: '/api-reference/audit-and-compliance' },
      { title: 'Mode B Proxy API', to: '/api-reference/mode-b-proxy-api' },
    ],
  },
  {
    title: 'Frontend & Offline',
    icon: 'lucide:layout-grid',
    links: [
      { title: 'Nuxt 4 Architecture', to: '/frontend-and-offline/nuxt-4-architecture' },
      { title: 'Service Worker Sync', to: '/frontend-and-offline/service-worker-sync' },
      { title: 'IndexedDB Crypto (AES-256)', to: '/frontend-and-offline/indexeddb-crypto' },
      { title: 'Interactive Visualizers', to: '/frontend-and-offline/interactive-visualizers' },
    ],
  },
  {
    title: 'Compliance & Safety',
    icon: 'lucide:file-check',
    links: [
      { title: 'HIPAA Security Matrix', to: '/compliance-and-governance/hipaa-security-matrix' },
      { title: 'Threat Model & STRIDE', to: '/compliance-and-governance/threat-model-and-mitigations' },
    ],
  },
]
</script>
