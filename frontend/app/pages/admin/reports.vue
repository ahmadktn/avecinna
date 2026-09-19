<template>
  <div class="space-y-5">
    <!-- Header -->
    <PageHeader
      title="Compliance &amp; Cryptographic Reports Export"
      description="Export HIPAA-compliant audit extracts, sequential block logs, incident registries, and Merkle tree proofs"
    />

    <AdminRedactionBanner />

        <!-- Report Catalog Cards Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Report 1: Cryptographic Audit Ledger -->
          <div class="bg-white border border-slate-200/80 rounded-xl p-6 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between space-y-5">
            <div class="space-y-3">
              <div class="w-10 h-10 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center border border-slate-200 shadow-2xs">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 class="text-base font-bold text-slate-900">Audit Ledger Extract</h3>
              <p class="text-xs text-slate-500 leading-relaxed">
                Complete sequential block logs, actor IDs, actions, and SHA-256 payload integrity proofs for regulatory compliance.
              </p>
            </div>

            <div class="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
              <span class="text-xs font-mono text-slate-400">SHA-256 Chained</span>
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  :disabled="downloading === 'audit_ledger_csv'"
                  @click="handleDownload('audit_ledger', 'csv')"
                  class="px-3.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <svg v-if="downloading === 'audit_ledger_csv'" class="w-3.5 h-3.5 animate-spin text-slate-500" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <svg v-else class="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span>CSV</span>
                </button>
                <button
                  type="button"
                  :disabled="downloading === 'audit_ledger_json'"
                  @click="handleDownload('audit_ledger', 'json')"
                  class="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <svg v-if="downloading === 'audit_ledger_json'" class="w-3.5 h-3.5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <svg v-else class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span>JSON</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Report 2: Security Violations & Alerts -->
          <div class="bg-white border border-slate-200/80 rounded-xl p-6 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between space-y-5">
            <div class="space-y-3">
              <div class="w-10 h-10 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center border border-slate-200 shadow-2xs">
                <svg class="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 class="text-base font-bold text-slate-900">Security Alerts & Anomalies</h3>
              <p class="text-xs text-slate-500 leading-relaxed">
                Log of automated security scanner rule triggers, unauthorized cross-ward access attempts, and break-glass overrides.
              </p>
            </div>

            <div class="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
              <span class="text-xs font-mono text-slate-500 font-semibold">Security Events</span>
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  :disabled="downloading === 'security_alerts_csv'"
                  @click="handleDownload('security_alerts', 'csv')"
                  class="px-3.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <svg v-if="downloading === 'security_alerts_csv'" class="w-3.5 h-3.5 animate-spin text-slate-500" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <svg v-else class="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span>CSV</span>
                </button>
                <button
                  type="button"
                  :disabled="downloading === 'security_alerts_json'"
                  @click="handleDownload('security_alerts', 'json')"
                  class="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <svg v-if="downloading === 'security_alerts_json'" class="w-3.5 h-3.5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <svg v-else class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span>JSON</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Report 3: Ward Census & Capacity -->
          <div class="bg-white border border-slate-200/80 rounded-xl p-6 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between space-y-5">
            <div class="space-y-3">
              <div class="w-10 h-10 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center border border-slate-200 shadow-2xs">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 class="text-base font-bold text-slate-900">Ward Census & Allocation</h3>
              <p class="text-xs text-slate-500 leading-relaxed">
                Operational snapshot of inpatient admissions, bed occupancy counts, and departmental ward distribution.
              </p>
            </div>

            <div class="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
              <span class="text-xs font-mono text-slate-400">Hospital Census</span>
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  :disabled="downloading === 'ward_census_json'"
                  @click="handleDownload('ward_census', 'json')"
                  class="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <svg v-if="downloading === 'ward_census_json'" class="w-3.5 h-3.5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <svg v-else class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span>JSON</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Report 4: Merkle Tree Proof Certificate -->
          <div class="bg-white border border-slate-200/80 rounded-xl p-6 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between space-y-5">
            <div class="space-y-3">
              <div class="w-10 h-10 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center border border-slate-200 shadow-2xs">
                <svg class="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 class="text-base font-bold text-slate-900">Merkle Tree Root Certificate</h3>
              <p class="text-xs text-slate-500 leading-relaxed">
                Cryptographic integrity proof containing the current Merkle Tree Root, total chained leaf count, and proof tree hierarchy.
              </p>
            </div>

            <div class="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
              <span class="text-xs font-mono text-slate-500 font-semibold">Integrity Proof</span>
              <div class="flex items-center gap-2">
                <NuxtLink
                  to="/admin/audit"
                  class="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <span>View Proof</span>
                </NuxtLink>
              </div>
            </div>
          </div>
        </div>

    <!-- Download status error alert -->
    <AlertBanner
      v-if="admin.error"
      variant="error"
      :message="admin.error"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAdmin } from '~/composables/useAdmin'

const admin = useAdmin()
const downloading = ref<string | null>(null)

const handleDownload = async (type: string, format: string) => {
  const key = `${type}_${format}`
  downloading.value = key
  try {
    await admin.downloadReport(type, format)
  } catch (err) {
    // Error is handled in useAdmin
  } finally {
    downloading.value = null
  }
}
</script>
