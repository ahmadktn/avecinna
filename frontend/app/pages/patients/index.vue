<template>
  <div class="min-h-screen bg-slate-50 font-sans">
    <AppSidebar />

    <div class="pl-56 flex flex-col min-h-screen">
      <AppNavbar
        @openWardSwitcher="showWardSwitcher = true"
        @openBreakGlass="showBreakGlassModal = true"
      />

      <main class="flex-1 w-full px-8 py-6 space-y-5">
        <!-- Error Banner -->
        <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-xs flex items-center justify-between shadow-2xs">
          <div class="flex items-center gap-2.5">
            <svg class="w-4 h-4 text-red-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{{ error }}</span>
          </div>
          <button @click="loadData" class="underline font-bold hover:text-red-900 cursor-pointer">Retry</button>
        </div>

        <!-- Admin Privacy Banner if Admin role -->
        <AdminRedactionBanner v-if="role === 'ADMIN'" />

        <!-- Clean Page Header -->
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div class="flex items-center gap-2.5">
              <h1 class="font-brand text-xl font-semibold text-slate-900 tracking-tight">Patients Directory</h1>
              <span class="bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 rounded-full text-xs font-semibold font-mono">
                Ward: {{ activeWardCode }}
              </span>
            </div>
            <p class="text-xs text-slate-500 mt-0.5">
              Context-Aware Access Control (CAAC) authorized roster for {{ activeWardName }} and active Care Team consults.
            </p>
          </div>

          <div class="flex items-center gap-3">
            <button
              v-if="role === 'NURSE' || role === 'PARAMEDIC' || role === 'DOCTOR' || role === 'HEAD_OF_UNIT'"
              type="button"
              @click="openVitalsModal()"
              class="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-xs cursor-pointer"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Record Vitals</span>
            </button>

            <NuxtLink
              v-if="role === 'DOCTOR' || role === 'HEAD_OF_UNIT'"
              to="/doctor/encounter"
              class="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-xs cursor-pointer"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span>New Encounter</span>
            </NuxtLink>
          </div>
        </div>

        <!-- 4 KPI Telemetry Summary Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div class="bg-white border border-slate-200/90 rounded-xl p-5 shadow-2xs hover:shadow-xs transition-shadow">
            <div class="flex items-center justify-between text-slate-400 mb-2">
              <span class="text-xs font-bold uppercase tracking-wider text-slate-500">Authorized Inpatients</span>
              <div class="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
            <p class="text-2xl font-bold text-slate-900 font-mono">{{ wardCount }}</p>
            <p class="text-[11px] text-slate-400 mt-1">In {{ activeWardName }} ({{ activeWardCode }})</p>
          </div>

          <div class="bg-white border border-slate-200/90 rounded-xl p-5 shadow-2xs hover:shadow-xs transition-shadow">
            <div class="flex items-center justify-between text-slate-400 mb-2">
              <span class="text-xs font-bold uppercase tracking-wider text-slate-500">Care Team Consults</span>
              <div class="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
            </div>
            <p class="text-2xl font-bold text-slate-900 font-mono">{{ careTeamCount }}</p>
            <p class="text-[11px] text-slate-400 mt-1">Cross-ward grants</p>
          </div>

          <div class="bg-white border border-slate-200/90 rounded-xl p-5 shadow-2xs hover:shadow-xs transition-shadow">
            <div class="flex items-center justify-between text-slate-400 mb-2">
              <span class="text-xs font-bold uppercase tracking-wider text-slate-500">Monitoring</span>
              <div class="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p class="text-2xl font-bold text-slate-900 font-mono">{{ monitoringCount }}</p>
            <p class="text-[11px] text-slate-400 mt-1">Telemetry watch protocol</p>
          </div>

          <div class="bg-white border border-slate-200/90 rounded-xl p-5 shadow-2xs hover:shadow-xs transition-shadow">
            <div class="flex items-center justify-between text-slate-400 mb-2">
              <span class="text-xs font-bold uppercase tracking-wider text-slate-500">Critical Acuity</span>
              <div class="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
            <p class="text-2xl font-bold text-red-600 font-mono">{{ criticalCount }}</p>
            <p class="text-[11px] text-red-600/80 mt-1">High vigilance care</p>
          </div>
        </div>

        <!-- Search & Filter Controls -->
        <div class="bg-white border border-slate-200/90 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-2xs">
          <!-- Search Input -->
          <div class="relative w-full md:w-80">
            <svg class="w-4 h-4 text-slate-400 absolute left-3.5 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search by patient name, MRN, or bed..."
              class="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div class="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <!-- Scope Filter Tabs (Ward vs Care Team) -->
            <div class="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                @click="setScopeFilter('all')"
                class="px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                :class="scopeFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'"
              >
                All Permitted
              </button>
              <button
                type="button"
                @click="setScopeFilter('ward')"
                class="px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                :class="scopeFilter === 'ward' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'"
              >
                Ward Inpatients
              </button>
              <button
                type="button"
                @click="setScopeFilter('care_team')"
                class="px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5"
                :class="scopeFilter === 'care_team' ? 'bg-white text-purple-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'"
              >
                <span>Care Team</span>
                <span v-if="careTeamCount > 0" class="w-4 h-4 rounded-full bg-purple-100 text-purple-800 text-[10px] flex items-center justify-center font-mono">
                  {{ careTeamCount }}
                </span>
              </button>
            </div>

            <!-- Acuity Filter Tabs -->
            <div class="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold overflow-x-auto">
              <button
                v-for="filter in ['all', 'stable', 'monitoring', 'critical']"
                :key="filter"
                @click="statusFilter = filter"
                class="px-3 py-1.5 rounded-lg capitalize transition-all shrink-0 cursor-pointer"
                :class="statusFilter === filter ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'"
              >
                {{ filter }}
              </button>
            </div>
          </div>
        </div>

        <!-- Patients List / Table -->
        <div class="bg-white border border-slate-200/90 rounded-xl shadow-2xs overflow-hidden">
          <div v-if="loading && patientsList.length === 0" class="p-12 text-center text-xs text-slate-400">
            <div class="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            Loading patient records...
          </div>

          <div v-else-if="filteredPatients.length === 0" class="p-12 text-center text-xs text-slate-400 space-y-1">
            <p class="font-medium text-slate-600">No patient records matching your criteria.</p>
            <p class="text-[11px] text-slate-400">Try adjusting your search query, scope, or status filter.</p>
          </div>

          <div v-else class="divide-y divide-slate-100">
            <div
              v-for="p in paginatedPatients"
              :key="p.id"
              class="p-5 hover:bg-slate-50/80 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <!-- Left Details -->
              <div class="flex items-start gap-4 min-w-0">
                <div class="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm font-mono shrink-0 shadow-2xs">
                  {{ getInitials(p.fullName) }}
                </div>

                <div class="min-w-0 space-y-1">
                  <div class="flex flex-wrap items-center gap-2">
                    <NuxtLink :to="`/patients/${p.id}`" class="text-sm font-bold text-slate-900 hover:text-blue-600 truncate transition-colors">
                      {{ p.fullName }}
                    </NuxtLink>
                    <span class="text-[10px] px-2 py-0.5 rounded-md font-mono font-bold bg-slate-100 text-slate-700">
                      {{ p.assignedBed || 'Bed 01' }}
                    </span>

                    <!-- Scope / Care Team Badge -->
                    <span
                      v-if="p.isCareTeam || p.relationshipType === 'CONSULT' || p.relationshipType === 'CARE_TEAM'"
                      class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1"
                    >
                      <svg class="w-3 h-3 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      <span>Care Team Consult</span>
                    </span>
                    <span
                      v-else
                      class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200"
                    >
                      Primary Ward
                    </span>

                    <span
                      class="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
                      :class="getAcuityBadge(getPatientAcuity(p))"
                    >
                      {{ getPatientAcuity(p) }}
                    </span>
                  </div>

                  <div class="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 font-mono">
                    <span>MRN: <strong class="text-slate-800">{{ p.mrn }}</strong></span>
                    <span>·</span>
                    <span>DOB: {{ p.dateOfBirth }}</span>
                    <span>·</span>
                    <span>Gender: {{ p.gender }}</span>
                    <span v-if="p.genotype">· Genotype: {{ p.genotype }}</span>
                    <span v-if="p.bloodGroup">· Blood Group: {{ p.bloodGroup }}</span>
                  </div>

                  <!-- Telemetry Pill / Nursing Care Plan Snippet -->
                  <div class="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-mono">
                    <span v-if="p.vitals?.bp" class="bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded">
                      BP: {{ p.vitals.bp }}
                    </span>
                    <span v-if="p.vitals?.hr" class="bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded">
                      HR: {{ p.vitals.hr }} bpm
                    </span>
                    <span v-if="p.vitals?.spo2" class="bg-purple-50 text-purple-700 border border-purple-100 px-2 py-0.5 rounded">
                      SpO2: {{ p.vitals.spo2 }}%
                    </span>
                    <span v-if="p.vitals?.temp" class="bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                      {{ p.vitals.temp }}°C
                    </span>
                    <span v-if="p.fullRecord?.diagnosis" class="text-slate-600 font-sans truncate max-w-xs text-[11px]">
                      Dx: {{ p.fullRecord.diagnosis }}
                    </span>
                    <span v-else-if="p.fullRecord?.nursingCarePlan || p.nursingCarePlan" class="text-slate-600 font-sans truncate max-w-xs text-[11px]">
                      Plan: {{ p.fullRecord?.nursingCarePlan || p.nursingCarePlan }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Right Actions -->
              <div class="flex flex-wrap items-center gap-2 shrink-0 self-end md:self-center">
                <button
                  v-if="role === 'NURSE' || role === 'PARAMEDIC' || role === 'DOCTOR' || role === 'HEAD_OF_UNIT'"
                  type="button"
                  @click="openVitalsModal(p.id, p.fullName)"
                  class="px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                  title="Record bedside vital signs"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Record Vitals</span>
                </button>

                <button
                  type="button"
                  @click="openCareTeam(p)"
                  class="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 transition-colors cursor-pointer"
                  title="Manage care team & consults"
                >
                  Care Team
                </button>

                <NuxtLink
                  v-if="role === 'DOCTOR' || role === 'HEAD_OF_UNIT'"
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
                  class="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-2xs flex items-center gap-1 cursor-pointer"
                >
                  <span>Full Chart</span>
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                  </svg>
                </NuxtLink>
              </div>
            </div>
          </div>

          <!-- Pagination Controls -->
          <div class="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div>
              Showing <strong class="text-slate-800">{{ (currentPage - 1) * pageSize + (filteredPatients.length > 0 ? 1 : 0) }}</strong> to
              <strong class="text-slate-800">{{ Math.min(currentPage * pageSize, filteredPatients.length) }}</strong> of
              <strong class="text-slate-800">{{ filteredPatients.length }}</strong> patients
            </div>

            <div class="flex items-center gap-2">
              <button
                type="button"
                @click="currentPage--"
                :disabled="currentPage <= 1"
                class="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
              >
                Previous
              </button>
              <span class="px-2 font-mono font-bold text-slate-700">
                {{ currentPage }} / {{ totalPages || 1 }}
              </span>
              <button
                type="button"
                @click="currentPage++"
                :disabled="currentPage >= totalPages"
                class="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>

    <!-- Modals -->
    <WardSwitcherModal
      :isOpen="showWardSwitcher"
      @close="showWardSwitcher = false"
      @switched="loadData"
    />

    <BreakGlassModal
      :isOpen="showBreakGlassModal"
      :patientId="selectedPatientId"
      @close="showBreakGlassModal = false"
    />

    <CareTeamModal
      :isOpen="showCareTeamModal"
      :patientId="selectedPatientId"
      :patientName="selectedPatientName"
      @close="showCareTeamModal = false"
      @updated="loadData"
    />

    <!-- Bedside Vitals Observation Modal -->
    <RecordVitalsModal
      :isOpen="showVitalsModal"
      :patientId="vitalsPatientId"
      :patientName="vitalsPatientName"
      :patientsList="patientsList"
      @close="showVitalsModal = false"
      @saved="handleVitalsSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuth } from '~/composables/useAuth'
import { usePatients, type Patient } from '~/composables/usePatients'

const route = useRoute()
const auth = useAuth()
const patientsApi = usePatients()

const role = computed(() => auth.role.value)
const activeWard = computed(() => auth.activeWard.value)
const activeWardName = computed(() => activeWard.value?.name || 'General Ward')
const activeWardCode = computed(() => activeWard.value?.code || '3W')

const patientsList = computed(() => patientsApi.patients.value)
const loading = computed(() => patientsApi.loading.value)
const error = computed(() => patientsApi.error.value)

const searchQuery = ref('')
const scopeFilter = ref<string>((route.query.scope as string) || 'all')
const statusFilter = ref('all')
const currentPage = ref(1)
const pageSize = 10

const showWardSwitcher = ref(false)
const showBreakGlassModal = ref(false)
const showCareTeamModal = ref(false)
const selectedPatientId = ref('')
const selectedPatientName = ref('')

// Bedside Vitals Modal state
const showVitalsModal = ref(false)
const vitalsPatientId = ref('')
const vitalsPatientName = ref('')

const getPatientAcuity = (p: Patient): 'stable' | 'monitoring' | 'critical' => {
  const hr = p.vitals?.hr
  const spo2 = p.vitals?.spo2
  if ((hr && (hr > 110 || hr < 50)) || (spo2 && spo2 < 92)) {
    return 'critical'
  }
  if ((hr && (hr > 95 || hr < 60)) || (spo2 && spo2 < 95)) {
    return 'monitoring'
  }
  return 'stable'
}

const wardCount = computed(() => {
  return patientsList.value.filter((p) => !p.isCareTeam && p.relationshipType !== 'CONSULT').length
})

const careTeamCount = computed(() => {
  return patientsList.value.filter((p) => p.isCareTeam || p.relationshipType === 'CONSULT' || p.relationshipType === 'CARE_TEAM').length
})

const monitoringCount = computed(() => {
  return patientsList.value.filter((p) => getPatientAcuity(p) === 'monitoring').length
})

const criticalCount = computed(() => {
  return patientsList.value.filter((p) => getPatientAcuity(p) === 'critical').length
})

const filteredPatients = computed(() => {
  return patientsList.value.filter((p) => {
    // 1. Search filter
    const q = searchQuery.value.toLowerCase().trim()
    const matchesSearch =
      !q ||
      p.fullName.toLowerCase().includes(q) ||
      p.mrn.toLowerCase().includes(q) ||
      (p.assignedBed && p.assignedBed.toLowerCase().includes(q))

    if (!matchesSearch) return false

    // 2. Scope filter
    if (scopeFilter.value === 'ward') {
      if (p.isCareTeam || p.relationshipType === 'CONSULT') return false
    } else if (scopeFilter.value === 'care_team') {
      if (!p.isCareTeam && p.relationshipType !== 'CONSULT' && p.relationshipType !== 'CARE_TEAM') return false
    }

    // 3. Status/Acuity filter
    const acuity = getPatientAcuity(p)
    if (statusFilter.value === 'all') return true
    return acuity === statusFilter.value
  })
})

const totalPages = computed(() => Math.ceil(filteredPatients.value.length / pageSize))

const paginatedPatients = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredPatients.value.slice(start, start + pageSize)
})

const setScopeFilter = (scope: string) => {
  scopeFilter.value = scope
  currentPage.value = 1
}

const loadData = async () => {
  try {
    await patientsApi.fetchPatients({ scope: 'all' })
  } catch (err) {
    // Handled in composable
  }
}

const openCareTeam = (patient: Patient) => {
  selectedPatientId.value = patient.id
  selectedPatientName.value = patient.fullName
  showCareTeamModal.value = true
}

const openVitalsModal = (patientId?: string, patientName?: string) => {
  vitalsPatientId.value = patientId || ''
  vitalsPatientName.value = patientName || ''
  showVitalsModal.value = true
}

const handleVitalsSaved = () => {
  loadData()
}

const getInitials = (name: string) => {
  if (!name) return 'PT'
  const parts = name.split(' ')
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

const getAcuityBadge = (acuity: string) => {
  if (acuity === 'critical') return 'bg-red-100 text-red-700'
  if (acuity === 'monitoring') return 'bg-amber-100 text-amber-700'
  return 'bg-emerald-100 text-emerald-700'
}

watch(
  () => route.query.scope,
  (newScope) => {
    if (newScope && typeof newScope === 'string') {
      scopeFilter.value = newScope
    }
  }
)

onMounted(() => {
  loadData()
})
</script>
