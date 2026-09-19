<template>
  <div class="space-y-5">
    <!-- Error Banner -->
    <AlertBanner :message="error" @dismiss="unitApi.error.value = null">
      <template #actions>
        <button @click="loadOverview" class="underline font-bold hover:text-red-900 cursor-pointer">Retry</button>
      </template>
    </AlertBanner>

    <!-- Success Toast -->
    <AlertBanner type="success" :message="successMessage" @dismiss="successMessage = null" />

    <!-- Clean Page Header -->
    <PageHeader
      title="Departmental Leadership"
      subtitle="Supervisory telemetry, staff shift coverage, CAAC scanner alerts, and clinical acuity oversight."
    >
      <template #badge>
        <span class="bg-purple-50 text-purple-700 border border-purple-200 px-2.5 py-0.5 rounded-full text-xs font-semibold font-mono">
          {{ wardName }} ({{ wardCode }})
        </span>
      </template>

      <template #actions>
        <NuxtLink
          to="/doctor/encounter"
          class="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-xs cursor-pointer"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <span>New Encounter</span>
        </NuxtLink>

        <NuxtLink
          to="/unit/staff"
          class="inline-flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-2xs cursor-pointer"
        >
          <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <span>Manage Staff</span>
        </NuxtLink>

        <NuxtLink
          to="/unit/roster"
          class="inline-flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-2xs cursor-pointer"
        >
          <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>Duty Roster</span>
        </NuxtLink>
      </template>
    </PageHeader>

    <!-- 5 KPI Stat Cards Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      <MetricCard
        label="Ward Inpatients"
        :value="metrics.totalWardInpatients"
        :subtext="`${metrics.bedOccupancyRate}% Bed Occupancy`"
      >
        <template #icon>
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </template>
      </MetricCard>

      <MetricCard
        label="Acuity Status"
        :value="metrics.criticalCount"
        :subtext="`${metrics.monitoringCount} monitoring · ${metrics.stableCount} stable`"
        :variant="metrics.criticalCount > 0 ? 'critical' : 'default'"
      >
        <template #icon>
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </template>
      </MetricCard>
      <MetricCard
        label="Clinicians On-Duty"
        :value="metrics.onDutyStaffCount"
        :subtext="`of ${metrics.totalAssignedStaff} total assigned`"
      >
        <template #icon>
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </template>
      </MetricCard>

      <MetricCard
        label="Clinic Queue"
        :value="metrics.todayAppointmentsCount"
        subtext="Consultation slots today"
      >
        <template #icon>
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </template>
      </MetricCard>

      <MetricCard
        label="Security Alerts"
        :value="metrics.activeSecurityAlertsCount"
        subtext="Requiring supervisor review"
        :variant="metrics.activeSecurityAlertsCount > 0 ? 'critical' : 'default'"
      >
        <template #icon>
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </template>
      </MetricCard>
    </div>

        <!-- 2 Column Section: On-Duty Shift Coverage & CAAC Security Alerts -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Left: On-Duty Staff Shift Roster Snippet -->
          <div class="bg-white border border-slate-200/90 rounded-xl p-6 shadow-2xs space-y-5">
            <div class="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 class="text-xs font-bold text-slate-700 uppercase tracking-wider">Today's Duty Shift Roster</h3>
                <p class="text-[11px] text-slate-500">Currently active and scheduled ward clinicians</p>
              </div>
              <NuxtLink
                to="/unit/roster"
                class="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1"
              >
                <span>Full Roster</span>
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </NuxtLink>
            </div>

            <div v-if="loading && onDutyStaff.length === 0" class="py-8 text-center text-xs text-slate-400">
              Loading duty roster...
            </div>

            <div v-else-if="onDutyStaff.length === 0" class="py-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              No shifts recorded for today. Click "Full Roster" to schedule staff coverage.
            </div>

            <div v-else class="divide-y divide-slate-100">
              <div
                v-for="shift in onDutyStaff"
                :key="shift.id"
                class="py-3 flex items-center justify-between gap-3 text-xs"
              >
                <div class="min-w-0 space-y-0.5">
                  <div class="flex items-center gap-2">
                    <span class="font-bold text-slate-900 truncate">{{ shift.staffName }}</span>
                    <RoleBadge :role="shift.staffRole || 'DOCTOR'" />
                  </div>
                  <p class="text-[11px] text-slate-500 font-mono">
                    <span>Shift: {{ shift.shiftType }} ({{ shift.startTime }} - {{ shift.endTime }})</span>
                    <span v-if="shift.notes" class="text-slate-400 font-sans italic ml-1">· {{ shift.notes }}</span>
                  </p>
                </div>

                <div class="shrink-0 flex items-center gap-2">
                  <span
                    class="text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase"
                    :class="shift.status === 'ON_DUTY' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'"
                  >
                    {{ shift.status.replace('_', ' ') }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Right: Ward Security Scanner Alerts -->
          <div class="bg-white border border-slate-200/90 rounded-xl p-6 shadow-2xs space-y-5">
            <div class="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 class="text-xs font-bold text-slate-700 uppercase tracking-wider">CAAC Anomaly & Security Scanner Alerts</h3>
                <p class="text-[11px] text-slate-500">Real-time alerts for out-of-ward access & Tier 2 break-glass</p>
              </div>
              <span class="text-xs font-mono font-bold text-slate-400">
                {{ recentAlerts.length }} Recorded
              </span>
            </div>

            <div v-if="loading && recentAlerts.length === 0" class="py-8 text-center text-xs text-slate-400">
              Loading security telemetry...
            </div>

            <div v-else-if="recentAlerts.length === 0" class="py-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              No active security alerts. Zero CAAC policy violations recorded in unit.
            </div>

            <div v-else class="space-y-3 max-h-80 overflow-y-auto pr-1">
              <div
                v-for="alert in recentAlerts"
                :key="alert.id"
                class="p-4 rounded-xl border text-xs space-y-2 transition-colors"
                :class="alert.status === 'OPEN' ? 'bg-amber-50/60 border-amber-200' : 'bg-slate-50 border-slate-200'"
              >
                <div class="flex items-center justify-between">
                  <span class="font-bold text-slate-900 flex items-center gap-1.5">
                    <svg class="w-4 h-4 text-amber-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    {{ alert.alertType.replace(/_/g, ' ') }}
                  </span>
                  <div class="flex items-center gap-1.5">
                    <span
                      class="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase"
                      :class="alert.severity === 'HIGH' || alert.severity === 'CRITICAL' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'"
                    >
                      {{ alert.severity }}
                    </span>
                    <span
                      v-if="alert.status === 'RESOLVED'"
                      class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 uppercase"
                    >
                      Resolved
                    </span>
                  </div>
                </div>

                <p class="text-slate-700 leading-relaxed text-[11px]">{{ alert.description }}</p>

                <div class="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[10px] text-slate-400 font-mono">
                  <span>{{ formatDateTime(alert.createdAt) }}</span>
                  <button
                    v-if="alert.status === 'OPEN'"
                    type="button"
                    @click="handleResolveAlert(alert.id)"
                    class="font-bold text-amber-800 hover:text-amber-950 underline cursor-pointer"
                  >
                    Acknowledge & Resolve
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Full-Width Inpatient Acuity & Census Table -->
        <div class="bg-white border border-slate-200/90 rounded-xl p-6 shadow-2xs space-y-5">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 class="text-xs font-bold text-slate-700 uppercase tracking-wider">Ward Inpatients & Clinical Acuity Surveillance</h3>
              <p class="text-[11px] text-slate-500">Direct clinical oversight of inpatients currently assigned to {{ wardName }}</p>
            </div>
            <NuxtLink
              to="/patients"
              class="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1 self-start sm:self-auto"
            >
              <span>View Full Patients Directory</span>
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </NuxtLink>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr class="border-b border-slate-100 text-slate-400 uppercase tracking-wider font-semibold text-[11px]">
                  <th class="py-3 px-3">Patient Name</th>
                  <th class="py-3 px-3 font-mono">MRN</th>
                  <th class="py-3 px-3 font-mono">Assigned Bed</th>
                  <th class="py-3 px-3">Clinical Acuity</th>
                  <th class="py-3 px-3">Diagnosis / Findings</th>
                  <th class="py-3 px-3 font-mono">Live Vitals</th>
                  <th class="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr
                  v-for="p in wardPatients"
                  :key="p.id"
                  class="hover:bg-slate-50/70 transition-colors"
                >
                  <td class="py-3.5 px-3 font-bold text-slate-900">
                    <NuxtLink :to="`/patients/${p.id}`" class="hover:text-blue-600 transition-colors">
                      {{ p.fullName }}
                    </NuxtLink>
                    <span class="block text-[10px] text-slate-400 font-normal capitalize">
                      {{ p.gender.toLowerCase() }} · DOB: {{ p.dateOfBirth }}
                    </span>
                  </td>
                  <td class="py-3.5 px-3 font-mono font-medium text-slate-700 select-all">
                    {{ p.mrn }}
                  </td>
                  <td class="py-3.5 px-3 font-mono font-bold text-slate-800">
                    {{ p.assignedBed }}
                  </td>
                  <td class="py-3.5 px-3">
                    <span
                      class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase inline-block"
                      :class="getAcuityBadgeClass(p.acuity)"
                    >
                      {{ p.acuity }}
                    </span>
                  </td>
                  <td class="py-3.5 px-3 text-slate-700 max-w-xs truncate text-[11px]">
                    {{ p.diagnosis }}
                  </td>
                  <td class="py-3.5 px-3 font-mono text-[11px]">
                    <span v-if="p.vitals?.bp" class="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded mr-1">
                      {{ p.vitals.bp }}
                    </span>
                    <span v-if="p.vitals?.hr" class="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded mr-1">
                      {{ p.vitals.hr }} bpm
                    </span>
                    <span v-if="p.vitals?.spo2" class="bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded">
                      {{ p.vitals.spo2 }}%
                    </span>
                  </td>
                  <td class="py-3.5 px-3 text-right space-x-1.5 whitespace-nowrap">
                    <NuxtLink
                      :to="`/doctor/encounter?patientId=${p.id}`"
                      class="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-2xs inline-flex items-center gap-1"
                    >
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      <span>Encounter</span>
                    </NuxtLink>
                    <NuxtLink
                      :to="`/patients/${p.id}`"
                      class="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors shadow-2xs"
                    >
                      Chart →
                    </NuxtLink>
                  </td>
                </tr>
                <tr v-if="!loading && wardPatients.length === 0">
                  <td colspan="7" class="py-12 text-center text-slate-400">
                    No inpatients currently admitted to {{ wardName }}.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuth } from '~/composables/useAuth'
import { useUnit } from '~/composables/useUnit'
import { useAutoRefresh } from '~/composables/useAutoRefresh'

const auth = useAuth()
const unitApi = useUnit()

const successMessage = ref<string | null>(null)

const loading = computed(() => unitApi.loading.value)
const error = computed(() => unitApi.error.value)
const overview = computed(() => unitApi.overview.value)

const wardName = computed(() => auth.activeWard.value?.name || overview.value?.ward?.name || 'Cardiology Ward')
const wardCode = computed(() => auth.activeWard.value?.code || overview.value?.ward?.code || 'CARD')

const metrics = computed(() => {
  return (
    overview.value?.metrics || {
      totalWardInpatients: 0,
      totalAssignedStaff: 0,
      onDutyStaffCount: 0,
      todayAppointmentsCount: 0,
      activeSecurityAlertsCount: 0,
      criticalCount: 0,
      monitoringCount: 0,
      stableCount: 0,
      bedOccupancyRate: 0,
    }
  )
})

const onDutyStaff = computed(() => overview.value?.onDutyStaff || [])
const recentAlerts = computed(() => overview.value?.recentAlerts || [])
const wardPatients = computed(() => overview.value?.wardPatients || [])

const loadOverview = async () => {
  try {
    await unitApi.fetchOverview()
  } catch (err) {
    // Handled in composable
  }
}

const handleResolveAlert = async (id: string) => {
  try {
    await unitApi.resolveAlert(id)
    successMessage.value = 'Security alert marked as resolved.'
    await loadOverview()
  } catch (err: any) {
    alert(err.message || 'Failed to resolve alert')
  }
}

const getAcuityBadgeClass = (acuity: string) => {
  if (acuity === 'critical') return 'bg-red-100 text-red-800 border border-red-200'
  if (acuity === 'monitoring') return 'bg-amber-100 text-amber-800 border border-amber-200'
  return 'bg-emerald-100 text-emerald-800 border border-emerald-200'
}

const formatDateTime = (iso: string) => {
  if (!iso) return '-'
  const d = new Date(iso)
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Auto-refresh when ward changes, security alerts resolved, or every 15s in background
useAutoRefresh(() => loadOverview(), { interval: 15000 })
</script>
