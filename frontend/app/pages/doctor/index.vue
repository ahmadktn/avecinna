<template>
  <div class="space-y-5">
    <!-- Error Banner -->
    <AlertBanner :message="error" @dismiss="doctorApi.error.value = null">
      <template #actions>
        <button @click="loadOverview" class="underline font-bold hover:text-red-900 cursor-pointer">Retry</button>
      </template>
    </AlertBanner>

    <!-- Clean Page Header -->
    <PageHeader
      title="Clinical Overview"
      :subtitle="`Ward: ${activeWardName} (${activeWardCode}) · Real-time patient telemetry & queue`"
    >
      <template #actions>
        <NuxtLink
          to="/doctor/encounter"
          class="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all shadow-xs cursor-pointer"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <span>New Encounter</span>
        </NuxtLink>
      </template>
    </PageHeader>

    <!-- 4 KPI Telemetry Cards Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      <MetricCard
        label="In-Ward Patients"
        :value="metrics.activeWardPatientsCount"
        :subtext="`Under ${activeWardCode} care`"
      >
        <template #icon>
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </template>
      </MetricCard>

      <MetricCard
        label="Active Consults"
        :value="metrics.careTeamConsultsCount"
        subtext="Multi-disciplinary grants"
      >
        <template #icon>
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </template>
      </MetricCard>

      <MetricCard
        label="Today's Schedule"
        :value="metrics.todayConsultationsCount"
        :subtext="`${metrics.todayPendingConsultations} pending · ${metrics.todayCompletedConsultations} done`"
      >
        <template #icon>
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
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
    </div>

        <!-- Focused Clinical Queue View with Clean Tab Switcher -->
        <div class="space-y-4">
          <!-- Clean Tabs Header -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div class="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              <button
                type="button"
                @click="activeTab = 'inpatients'"
                class="px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0"
                :class="activeTab === 'inpatients' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'"
              >
                <span>Inpatient Roster ({{ activeWardCode }})</span>
                <span
                  class="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold"
                  :class="activeTab === 'inpatients' ? 'bg-slate-800 text-slate-200' : 'bg-slate-200 text-slate-700'"
                >
                  {{ activeWardPatients.length }}
                </span>
              </button>

              <button
                type="button"
                @click="activeTab = 'consultations'"
                class="px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0"
                :class="activeTab === 'consultations' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'"
              >
                <span>Today's Consultations</span>
                <span
                  class="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold"
                  :class="activeTab === 'consultations' ? 'bg-slate-800 text-slate-200' : 'bg-slate-200 text-slate-700'"
                >
                  {{ todayAppointments.length }}
                </span>
              </button>
            </div>

            <NuxtLink
              v-if="activeTab === 'inpatients'"
              to="/patients"
              class="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
            >
              View Full Patients Directory →
            </NuxtLink>
            <NuxtLink
              v-else
              to="/doctor/consultations"
              class="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
            >
              Manage Full Consultation Schedule →
            </NuxtLink>
          </div>

          <!-- Tab Content 1: Inpatients List -->
          <div v-if="activeTab === 'inpatients'" class="bg-white border border-slate-200/90 rounded-xl shadow-2xs overflow-hidden">
            <div v-if="loading && activeWardPatients.length === 0" class="p-12 text-center text-xs text-slate-400">
              <div class="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              Loading inpatient telemetry...
            </div>

            <div v-else-if="activeWardPatients.length === 0" class="p-12 text-center text-xs text-slate-400 space-y-1">
              <p class="font-medium text-slate-600">No inpatients currently admitted to {{ activeWardName }}.</p>
              <p class="text-[11px] text-slate-400">Switch ward or check outpatient consultation schedule.</p>
            </div>

            <div v-else class="divide-y divide-slate-100">
              <div
                v-for="p in activeWardPatients"
                :key="p.id"
                class="p-5 hover:bg-slate-50/80 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div class="flex items-start gap-4 min-w-0">
                  <div class="w-11 h-11 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs font-mono shrink-0 shadow-2xs">
                    {{ getInitials(p.fullName) }}
                  </div>
                  <div class="min-w-0 space-y-1">
                    <div class="flex items-center gap-2.5">
                      <NuxtLink :to="`/patients/${p.id}`" class="text-sm font-bold text-slate-900 hover:text-blue-600 truncate transition-colors">
                        {{ p.fullName }}
                      </NuxtLink>
                      <span class="text-[10px] px-2 py-0.5 rounded-md font-mono font-bold bg-slate-100 text-slate-700">
                        {{ p.assignedBed || 'Bed 01' }}
                      </span>
                    </div>
                    <div class="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 font-mono">
                      <span>MRN: <strong class="text-slate-800">{{ p.mrn }}</strong></span>
                      <span>·</span>
                      <span>DOB: {{ p.dateOfBirth }}</span>
                      <span>·</span>
                      <span>Gender: {{ p.gender }}</span>
                    </div>
                    <!-- Vitals Telemetry Snippet -->
                    <div v-if="p.vitals" class="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-mono">
                      <span v-if="p.vitals.bp" class="bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100">
                        BP: {{ p.vitals.bp }}
                      </span>
                      <span v-if="p.vitals.hr" class="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-100">
                        HR: {{ p.vitals.hr }} bpm
                      </span>
                      <span v-if="p.vitals.spo2" class="bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-100">
                        SpO2: {{ p.vitals.spo2 }}%
                      </span>
                    </div>
                  </div>
                </div>

                <!-- Actions -->
                <div class="flex items-center gap-2 shrink-0 self-end md:self-center">
                  <button
                    type="button"
                    @click="openCareTeam(p)"
                    class="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 transition-colors cursor-pointer"
                    title="Manage care team & consults"
                  >
                    Care Team
                  </button>
                  <NuxtLink
                    :to="`/doctor/encounter?patientId=${p.id}`"
                    class="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <span>Encounter</span>
                  </NuxtLink>
                  <NuxtLink
                    :to="`/patients/${p.id}`"
                    class="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-2xs"
                  >
                    Chart →
                  </NuxtLink>
                </div>
              </div>
            </div>
          </div>

          <!-- Tab Content 2: Today's Consultations List -->
          <div v-else class="bg-white border border-slate-200/90 rounded-xl shadow-2xs overflow-hidden">
            <div v-if="loading && todayAppointments.length === 0" class="p-12 text-center text-xs text-slate-400">
              <div class="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              Loading consultation queue...
            </div>

            <div v-else-if="todayAppointments.length === 0" class="p-12 text-center text-xs text-slate-400 space-y-1">
              <p class="font-medium text-slate-600">No outpatient consultations scheduled for today.</p>
              <p class="text-[11px] text-slate-400">Clerk queue will assign booked patients here.</p>
            </div>

            <div v-else class="divide-y divide-slate-100">
              <div
                v-for="app in todayAppointments"
                :key="app.id"
                class="p-5 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div class="flex items-start gap-4 min-w-0">
                  <div class="w-11 h-11 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs font-mono shrink-0 shadow-2xs">
                    {{ getInitials(app.patientName) }}
                  </div>
                  <div class="min-w-0 space-y-1">
                    <div class="flex items-center gap-2.5">
                      <NuxtLink :to="`/patients/${app.patientId}`" class="text-sm font-bold text-slate-900 hover:text-blue-600 transition-colors">
                        {{ app.patientName }}
                      </NuxtLink>
                      <span
                        class="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
                        :class="getStatusBadgeClass(app.status)"
                      >
                        {{ app.status }}
                      </span>
                    </div>
                    <div class="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 font-mono">
                      <span>MRN: <strong class="text-slate-800">{{ app.patientMrn }}</strong></span>
                      <span>·</span>
                      <span>Time: {{ formatTime(app.appointmentDate) }}</span>
                      <span>·</span>
                      <span>Ward: {{ app.wardCode || activeWardCode }}</span>
                    </div>
                  </div>
                </div>

                <div class="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <NuxtLink
                    :to="`/doctor/encounter?appointmentId=${app.id}&patientId=${app.patientId}`"
                    class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <span>Start Encounter</span>
                  </NuxtLink>
                </div>
              </div>
            </div>
          </div>
        </div>

    <!-- Modals -->
    <CareTeamModal
      :isOpen="showCareTeamModal"
      :patientId="selectedPatientId"
      :patientName="selectedPatientName"
      @close="showCareTeamModal = false"
      @updated="loadOverview"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuth } from '~/composables/useAuth'
import { useDoctor } from '~/composables/useDoctor'
import type { Patient } from '~/composables/usePatients'

const auth = useAuth()
const doctorApi = useDoctor()

const activeTab = ref<'inpatients' | 'consultations'>('inpatients')

const showCareTeamModal = ref(false)
const selectedPatientId = ref('')
const selectedPatientName = ref('')

const loading = computed(() => doctorApi.loading.value)
const error = computed(() => doctorApi.error.value)
const overviewData = computed(() => doctorApi.overview.value)

const activeWard = computed(() => auth.activeWard.value)
const activeWardName = computed(() => activeWard.value?.name || overviewData.value?.activeWard?.name || 'General Ward')
const activeWardCode = computed(() => activeWard.value?.code || overviewData.value?.activeWard?.code || '3W')

const metrics = computed(() => {
  return overviewData.value?.metrics || {
    activeWardPatientsCount: 0,
    careTeamConsultsCount: 0,
    todayConsultationsCount: 0,
    todayPendingConsultations: 0,
    todayActiveConsultations: 0,
    todayCompletedConsultations: 0,
    stableCount: 0,
    monitoringCount: 0,
    criticalCount: 0,
  }
})

const activeWardPatients = computed(() => overviewData.value?.activeWardPatients || [])
const todayAppointments = computed(() => overviewData.value?.todayAppointments || [])

const loadOverview = async () => {
  try {
    await doctorApi.fetchOverview()
  } catch (err) {
    // Handled in composable
  }
}

onMounted(() => {
  loadOverview()
})

const onWardSwitched = () => {
  loadOverview()
}

const openCareTeam = (patient: Patient) => {
  selectedPatientId.value = patient.id
  selectedPatientName.value = patient.fullName
  showCareTeamModal.value = true
}

const getInitials = (name: string) => {
  if (!name) return 'PT'
  const parts = name.split(' ')
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

const getStatusBadgeClass = (status: string) => {
  if (status === 'COMPLETED') return 'bg-emerald-100 text-emerald-800'
  if (status === 'IN_CONSULTATION') return 'bg-blue-100 text-blue-800'
  if (status === 'SCHEDULED') return 'bg-amber-100 text-amber-800'
  if (status === 'CANCELLED') return 'bg-slate-100 text-slate-600'
  return 'bg-slate-100 text-slate-700'
}

const formatTime = (isoString: string) => {
  if (!isoString) return ''
  const d = new Date(isoString)
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}
</script>
