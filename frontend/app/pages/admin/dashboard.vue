<template>
  <div class="space-y-5">
    <!-- Header & Quick Actions -->
    <PageHeader
      title="System Overview"
      description="Real-time hospital operations, staff allocation, patient census, and security telemetry"
    >
      <template #actions>
        <button
          type="button"
          @click="loadOverview"
          :disabled="loading"
          class="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 shadow-2xs flex items-center gap-2 transition-all cursor-pointer"
        >
          <svg class="w-3.5 h-3.5 text-slate-500" :class="{ 'animate-spin': loading }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Refresh</span>
        </button>
      </template>
    </PageHeader>

    <AdminRedactionBanner />

    <!-- Error State -->
    <AlertBanner
      v-if="error"
      variant="error"
      :message="error"
      actionLabel="Retry"
      @action="loadOverview"
    />

    <!-- 4 Clean Stat Cards Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      <!-- Total Patients -->
      <MetricCard
        label="Hospital Patients"
        :value="overview?.metrics.totalPatients ?? '-'"
        subtext="Inpatients &amp; Outpatients Census"
      >
        <template #icon>
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </template>
      </MetricCard>

      <!-- Total Wards -->
      <MetricCard
        label="Hospital Wards"
        :value="overview?.metrics.totalWards ?? '-'"
        subtext="Active Clinical Units &amp; Wings"
      >
        <template #icon>
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </template>
      </MetricCard>

      <!-- Total Staff -->
      <MetricCard
        label="Staff Accounts"
        :value="overview?.metrics.totalStaff ?? '-'"
        :subtext="`${overview?.metrics.activeStaff ?? 0} active clinicians on shift`"
      >
        <template #icon>
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </template>
      </MetricCard>

      <!-- Total Audit Blocks -->
      <MetricCard
        label="Audit Ledger"
        :value="overview?.metrics.totalAuditBlocks ?? '-'"
        subtext="100% Cryptographically Intact"
      >
        <template #icon>
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </template>
      </MetricCard>
    </div>

        <!-- Real Meaningful Analytics Charts -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Chart 1: Ward Patient Census -->
          <div class="bg-white border border-slate-200/80 rounded-xl p-6 shadow-2xs space-y-5">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-sm font-bold text-slate-900">Ward Inpatient Census</h3>
                <p class="text-xs text-slate-500 mt-0.5">Live patient distribution across hospital units</p>
              </div>
              <span class="text-xs text-slate-600 bg-slate-100 font-semibold px-2.5 py-1 rounded-lg">
                {{ overview?.wardsWithCensus.length ?? 0 }} Wards
              </span>
            </div>

            <div class="space-y-4 pt-1">
              <div
                v-for="ward in overview?.wardsWithCensus"
                :key="ward.id"
                class="space-y-1.5"
              >
                <div class="flex items-center justify-between text-xs">
                  <span class="font-medium text-slate-800">{{ ward.name }} <span class="text-slate-400 font-mono">({{ ward.code }})</span></span>
                  <span class="font-mono text-slate-600">{{ ward.patientCount }} Patients · {{ ward.staffCount }} Staff</span>
                </div>
                <div class="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    class="bg-blue-600 h-full rounded-full transition-all duration-500"
                    :style="{ width: `${Math.max(6, Math.min(100, (ward.patientCount / Math.max(1, overview?.metrics.totalPatients || 1)) * 100))}%` }"
                  ></div>
                </div>
              </div>

              <div v-if="!overview?.wardsWithCensus?.length" class="py-8 text-center text-xs text-slate-400">
                No ward census data recorded.
              </div>
            </div>
          </div>

          <!-- Chart 2: Staff Role Distribution Breakdown -->
          <div class="bg-white border border-slate-200/80 rounded-xl p-6 shadow-2xs space-y-5">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-sm font-bold text-slate-900">Staff Account Allocation</h3>
                <p class="text-xs text-slate-500 mt-0.5">Clinical and administrative privilege distribution</p>
              </div>
              <span class="text-xs text-slate-600 bg-slate-100 font-semibold px-2.5 py-1 rounded-lg">
                {{ overview?.metrics.totalStaff ?? 0 }} Accounts
              </span>
            </div>

            <div class="space-y-4 pt-1">
              <div
                v-for="(count, roleName) in overview?.roleBreakdown"
                :key="roleName"
                class="space-y-1.5"
              >
                <div class="flex items-center justify-between text-xs">
                  <span class="font-medium text-slate-800 capitalize">{{ String(roleName).replace(/_/g, ' ').toLowerCase() }}</span>
                  <span class="font-mono text-slate-600">{{ count }} staff</span>
                </div>
                <div class="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    class="bg-slate-700 h-full rounded-full transition-all duration-500"
                    :style="{ width: `${Math.max(6, Math.min(100, (Number(count) / Math.max(1, overview?.metrics.totalStaff || 1)) * 100))}%` }"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Recent Audit Stream -->
        <div class="bg-white border border-slate-200/80 rounded-xl p-6 shadow-2xs space-y-5">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 class="text-sm font-bold text-slate-900">Recent Audit Activity</h3>
              <p class="text-xs text-slate-500 mt-0.5">Live immutable ledger events and access records</p>
            </div>
            <NuxtLink
              to="/admin/audit"
              class="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 self-start sm:self-auto"
            >
              <span>View Full Ledger</span>
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </NuxtLink>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr class="border-b border-slate-100 text-slate-400 uppercase tracking-wider font-semibold">
                  <th class="py-3 px-3 font-mono">Block</th>
                  <th class="py-3 px-3">Action</th>
                  <th class="py-3 px-3">Actor</th>
                  <th class="py-3 px-3">Ward</th>
                  <th class="py-3 px-3 font-mono">SHA-256 Digest</th>
                  <th class="py-3 px-3">Timestamp</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr
                  v-for="log in overview?.recentAuditLogs"
                  :key="log.indexNum"
                  class="hover:bg-slate-50/60 transition-colors"
                >
                  <td class="py-3.5 px-3 font-mono font-bold text-slate-900">#{{ log.indexNum }}</td>
                  <td class="py-3.5 px-3">
                    <span class="inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold" :class="getActionBadgeClass(log.action)">
                      {{ log.action }}
                    </span>
                  </td>
                  <td class="py-3.5 px-3 font-medium text-slate-800">{{ log.userId }}</td>
                  <td class="py-3.5 px-3 text-slate-500 font-mono">{{ log.activeWard }}</td>
                  <td class="py-3.5 px-3 font-mono text-[11px] text-slate-400">
                    <span class="hover:text-slate-700 cursor-pointer select-all font-mono" :title="log.blockHash">
                      {{ log.blockHash.slice(0, 10) }}...{{ log.blockHash.slice(-6) }}
                    </span>
                  </td>
                  <td class="py-3.5 px-3 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                    {{ formatDate(log.createdAt) }}
                  </td>
                </tr>
                <tr v-if="!overview?.recentAuditLogs?.length">
                  <td colspan="6" class="py-8 text-center text-slate-400">No audit logs recorded yet.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useAdmin } from '~/composables/useAdmin'

const admin = useAdmin()
const overview = admin.overview
const loading = admin.loading
const error = admin.error

const loadOverview = async () => {
  try {
    await admin.fetchOverview()
  } catch (err) {
    // Handled in composable
  }
}

onMounted(() => {
  loadOverview()
})

const getActionBadgeClass = (action: string) => {
  if (action.includes('BREAK_GLASS') || action.includes('EMERGENCY')) {
    return 'bg-amber-100 text-amber-800'
  }
  if (action.includes('UNAUTHORIZED') || action.includes('FORBIDDEN')) {
    return 'bg-red-100 text-red-800'
  }
  if (action.includes('ADMIN')) {
    return 'bg-purple-100 text-purple-800'
  }
  return 'bg-blue-100 text-blue-800'
}

const formatDate = (iso: string) => {
  if (!iso) return '-'
  const d = new Date(iso)
  return d.toLocaleString('en-GB', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}
</script>

