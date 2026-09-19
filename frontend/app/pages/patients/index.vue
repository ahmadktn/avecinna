<template>
  <div class="min-h-screen bg-slate-50 font-sans">
    <AppSidebar />

    <div class="pl-64 lg:pl-72 flex flex-col min-h-screen">
      <AppNavbar
        @openWardSwitcher="showWardSwitcher = true"
        @openBreakGlass="showBreakGlassModal = true"
      />

      <main class="flex-1 w-full px-8 py-6 space-y-6">
        <!-- Error Banner -->
        <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl text-xs flex items-center justify-between shadow-2xs">
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

        <!-- Page Header -->
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs">
          <div>
            <div class="flex items-center gap-2.5">
              <h1 class="text-xl font-bold text-slate-900 tracking-tight">Patients Directory & Clinical Records</h1>
              <span class="bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 rounded-full text-xs font-semibold font-mono">
                Ward: {{ activeWardCode }}
              </span>
            </div>
            <p class="text-xs text-slate-500 mt-0.5">
              Context-Aware Access Control (CAAC) authorized roster for {{ activeWardName }}.
            </p>
          </div>

          <div class="flex items-center gap-3">
            <NuxtLink
              v-if="role === 'DOCTOR' || role === 'HEAD_OF_UNIT'"
              to="/doctor/encounter"
              class="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all shadow-xs cursor-pointer"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span>New Encounter</span>
            </NuxtLink>

            <button
              type="button"
              @click="showWardSwitcher = true"
              class="inline-flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-semibold px-4 py-2.5 rounded-xl transition-all shadow-2xs cursor-pointer"
            >
              <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              <span>Switch Ward</span>
            </button>
          </div>
        </div>

        <!-- 3 KPI Telemetry Summary Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div class="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs hover:shadow-xs transition-shadow">
            <div class="flex items-center justify-between text-slate-400 mb-2">
              <span class="text-xs font-bold uppercase tracking-wider text-slate-500">Authorized Inpatients</span>
              <div class="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
            <p class="text-2xl font-bold text-slate-900 font-mono">{{ patientsList.length }}</p>
            <p class="text-[11px] text-slate-400 mt-1">In {{ activeWardName }} ({{ activeWardCode }})</p>
          </div>

          <div class="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs hover:shadow-xs transition-shadow">
            <div class="flex items-center justify-between text-slate-400 mb-2">
              <span class="text-xs font-bold uppercase tracking-wider text-amber-700">Observation / Monitoring</span>
              <div class="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p class="text-2xl font-bold text-amber-600 font-mono">{{ monitoringCount }}</p>
            <p class="text-[11px] text-amber-700/80 mt-1">Telemetry watch protocol</p>
          </div>

          <div class="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs hover:shadow-xs transition-shadow">
            <div class="flex items-center justify-between text-slate-400 mb-2">
              <span class="text-xs font-bold uppercase tracking-wider text-red-700">Critical Acuity</span>
              <div class="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
            <p class="text-2xl font-bold text-red-600 font-mono">{{ criticalCount }}</p>
            <p class="text-[11px] text-red-700/80 mt-1">High vigilance care</p>
          </div>
        </div>

        <!-- Search & Filter Bar -->
        <div class="bg-white border border-slate-200/90 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xs">
          <!-- Search Input -->
          <div class="relative w-full sm:w-80">
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

          <!-- Status Filter Tabs -->
          <div class="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold w-full sm:w-auto overflow-x-auto">
            <button
              v-for="filter in ['all', 'stable', 'monitoring', 'critical']"
              :key="filter"
              @click="statusFilter = filter"
              class="px-3.5 py-1.5 rounded-lg capitalize transition-all shrink-0 cursor-pointer"
              :class="statusFilter === filter ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'"
            >
              {{ filter }}
            </button>
          </div>
        </div>

        <!-- Patients List / Table -->
        <div class="bg-white border border-slate-200/90 rounded-2xl shadow-2xs overflow-hidden">
          <div v-if="loading && patientsList.length === 0" class="p-12 text-center text-xs text-slate-400">
            <div class="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            Loading patient records...
          </div>

          <div v-else-if="filteredPatients.length === 0" class="p-12 text-center text-xs text-slate-400 space-y-1">
            <p class="font-medium text-slate-600">No patient records matching your criteria.</p>
            <p class="text-[11px] text-slate-400">Try adjusting your search query or status filter.</p>
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
                  <div class="flex items-center gap-2.5">
                    <NuxtLink :to="`/patients/${p.id}`" class="text-sm font-bold text-slate-900 hover:text-blue-600 truncate transition-colors">
                      {{ p.fullName }}
                    </NuxtLink>
                    <span class="text-[10px] px-2 py-0.5 rounded-md font-mono font-bold bg-slate-100 text-slate-700">
                      {{ p.assignedBed || 'Bed 01' }}
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

                  <!-- Telemetry Pill / Clinical Note Snippet -->
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
                    <span v-if="p.fullRecord?.diagnosis" class="text-slate-600 font-sans truncate max-w-xs text-[11px]">
                      Dx: {{ p.fullRecord.diagnosis }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Right Actions -->
              <div class="flex items-center gap-2 shrink-0 self-end md:self-center">
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
                class="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors shadow-2xs"
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
                class="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors shadow-2xs"
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuth } from '~/composables/useAuth'
import { usePatients, type Patient } from '~/composables/usePatients'

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
const statusFilter = ref('all')
const currentPage = ref(1)
const pageSize = 10

const showWardSwitcher = ref(false)
const showBreakGlassModal = ref(false)
const showCareTeamModal = ref(false)
const selectedPatientId = ref('')
const selectedPatientName = ref('')

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

const monitoringCount = computed(() => {
  return patientsList.value.filter((p) => getPatientAcuity(p) === 'monitoring').length
})

const criticalCount = computed(() => {
  return patientsList.value.filter((p) => getPatientAcuity(p) === 'critical').length
})

const filteredPatients = computed(() => {
  return patientsList.value.filter((p) => {
    const q = searchQuery.value.toLowerCase().trim()
    const matchesSearch =
      !q ||
      p.fullName.toLowerCase().includes(q) ||
      p.mrn.toLowerCase().includes(q) ||
      (p.assignedBed && p.assignedBed.toLowerCase().includes(q))

    if (!matchesSearch) return false

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

const loadData = async () => {
  try {
    await patientsApi.fetchPatients()
  } catch (err) {
    // Handled in composable
  }
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

const getAcuityBadge = (acuity: string) => {
  if (acuity === 'critical') return 'bg-red-100 text-red-700'
  if (acuity === 'monitoring') return 'bg-amber-100 text-amber-700'
  return 'bg-emerald-100 text-emerald-700'
}

onMounted(() => {
  loadData()
})
</script>
