<template>
  <div class="min-h-screen bg-slate-50 font-sans">
    <!-- Sidebar -->
    <AppSidebar />

    <!-- Main Layout Container -->
    <div class="pl-64 lg:pl-72 flex flex-col min-h-screen">
      <!-- Navbar Header -->
      <AppNavbar
        @openWardSwitcher="showWardSwitcher = true"
        @openBreakGlass="triggerBreakGlassForTarget(null)"
      />

      <!-- Content Viewport -->
      <main class="flex-1 w-full px-8 py-8 space-y-8">
        <!-- Error Banner -->
        <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 p-5 rounded-2xl text-xs flex items-center justify-between shadow-2xs">
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

        <!-- KPI Summary Cards Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div class="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs hover:shadow-xs transition-shadow">
            <div class="flex items-center justify-between text-slate-400 mb-2">
              <span class="text-xs font-bold uppercase tracking-wider text-slate-500">In-Ward Patients</span>
              <div class="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
            <p class="text-3xl font-bold text-slate-900 font-mono">{{ activePatientsCount }}</p>
            <p class="text-xs text-slate-400 mt-1">Authorized for {{ activeWardCode }}</p>
          </div>

          <div class="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs hover:shadow-xs transition-shadow">
            <div class="flex items-center justify-between text-slate-400 mb-2">
              <span class="text-xs font-bold uppercase tracking-wider text-amber-700">Monitoring Required</span>
              <div class="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p class="text-3xl font-bold text-amber-600 font-mono">{{ monitoringCount }}</p>
            <p class="text-xs text-amber-700/80 mt-1">Frequent vital telemetry check</p>
          </div>

          <div class="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs hover:shadow-xs transition-shadow">
            <div class="flex items-center justify-between text-slate-400 mb-2">
              <span class="text-xs font-bold uppercase tracking-wider text-red-700">Critical Status</span>
              <div class="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
            <p class="text-3xl font-bold text-red-600 font-mono">{{ criticalCount }}</p>
            <p class="text-xs text-red-700/80 mt-1">Acute resuscitation protocol</p>
          </div>
        </div>

        <!-- Search & Filter Bar -->
        <div class="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xs">
          <!-- Search Input -->
          <div class="relative w-full sm:w-80">
            <svg class="w-4 h-4 text-slate-400 absolute left-3.5 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search by patient name or MRN..."
              class="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <!-- Status Filter Tabs -->
          <div class="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold w-full sm:w-auto overflow-x-auto">
            <button
              v-for="filter in ['all', 'stable', 'monitoring', 'critical']"
              :key="filter"
              @click="statusFilter = filter"
              class="px-3.5 py-1.5 rounded-lg capitalize transition-all shrink-0"
              :class="statusFilter === filter ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'"
            >
              {{ filter }}
            </button>
          </div>
        </div>

        <!-- Section 1: Active Ward Patients -->
        <section class="space-y-4">
          <div class="flex items-center justify-between px-1">
            <div class="flex items-center gap-2">
              <h2 class="text-xs font-bold text-slate-500 uppercase tracking-wider">
                INPATIENT ROSTER – {{ activeWardCode }}
              </h2>
              <span class="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {{ filteredPatients.length }} Patients
              </span>
            </div>
            <span class="text-xs text-slate-400 font-mono">CAAC Permitted</span>
          </div>

          <!-- Empty State -->
          <div
            v-if="filteredPatients.length === 0"
            class="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 text-xs shadow-2xs space-y-2"
          >
            <svg class="w-8 h-8 text-slate-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p class="font-medium text-slate-600">No patients matching current criteria</p>
            <p class="text-[11px] text-slate-400">Try adjusting your search query or status filter.</p>
          </div>

          <!-- Patient Cards List -->
          <div v-else class="space-y-3.5">
            <PatientCard
              v-for="p in filteredPatients"
              :key="p.id"
              :patient="p"
              @select="openPatientDetail"
            />
          </div>
        </section>

        <!-- Section 2: Restricted Other Wards -->
        <section class="space-y-4 pt-4">
          <div class="flex items-center justify-between px-1">
            <div class="flex items-center gap-2">
              <h2 class="text-xs font-bold text-slate-500 uppercase tracking-wider">
                OTHER HOSPITAL WARDS
              </h2>
              <span class="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                Restricted
              </span>
            </div>
            <span class="text-xs text-slate-400">Zero-Trust Protected</span>
          </div>

          <div class="space-y-3.5">
            <PatientCard
              v-for="p in restrictedPatients"
              :key="p.id"
              :patient="p"
              :isRestricted="true"
              @triggerBreakGlass="triggerBreakGlassForTarget"
            />
          </div>
        </section>
      </main>
    </div>

    <!-- Modals & Drawers -->
    <WardSwitcherModal
      :isOpen="showWardSwitcher"
      @close="showWardSwitcher = false"
      @switched="onWardSwitched"
    />

    <BreakGlassModal
      :isOpen="showBreakGlassModal"
      :patientId="selectedPatientId"
      @close="showBreakGlassModal = false"
      @unlocked="onBreakGlassUnlocked"
    />

    <PatientDetailDrawer
      :isOpen="showDetailDrawer"
      :patient="selectedPatient"
      @close="showDetailDrawer = false"
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

const patientsList = computed(() => patientsApi.patients.value)
const loading = computed(() => patientsApi.loading.value)
const error = computed(() => patientsApi.error.value)

const searchQuery = ref('')
const statusFilter = ref('all')

const showWardSwitcher = ref(false)
const showBreakGlassModal = ref(false)
const showDetailDrawer = ref(false)
const selectedPatientId = ref('')
const selectedPatient = ref<Patient | null>(null)

// Out-of-ward restricted mock structures matching screens design
const restrictedPatients = ref<Patient[]>([
  {
    id: 'p-cardio-01',
    mrn: 'MRN-002914',
    fullName: 'Mira Okonkwo',
    dateOfBirth: '1972-04-12',
    gender: 'FEMALE',
    primaryWardId: 'Cardiology (3W)',
    assignedBed: '3W - 14B',
  },
  {
    id: 'p-cardio-02',
    mrn: 'MRN-002915',
    fullName: 'Thomas Bergstorm',
    dateOfBirth: '1972-04-12',
    gender: 'MALE',
    primaryWardId: 'Cardiology (3W)',
    assignedBed: '3W - 14B',
  },
])

const activeWardCode = computed(() => activeWard.value?.code || '3W')
const activePatientsCount = computed(() => patientsList.value.length)

const monitoringCount = computed(() => {
  return patientsList.value.filter(p => p.fullName.toLowerCase().includes('mira')).length
})

const criticalCount = computed(() => {
  return patientsList.value.filter(p => p.fullName.toLowerCase().includes('yusuf')).length
})

const filteredPatients = computed(() => {
  return patientsList.value.filter(p => {
    // Search query match
    const q = searchQuery.value.toLowerCase().trim()
    const matchesSearch = !q || p.fullName.toLowerCase().includes(q) || p.mrn.toLowerCase().includes(q)

    // Status filter match
    if (!matchesSearch) return false
    if (statusFilter.value === 'all') return true
    if (statusFilter.value === 'critical') return p.fullName.toLowerCase().includes('yusuf')
    if (statusFilter.value === 'monitoring') return p.fullName.toLowerCase().includes('mira')
    if (statusFilter.value === 'stable') return !p.fullName.toLowerCase().includes('yusuf') && !p.fullName.toLowerCase().includes('mira')
    return true
  })
})

const loadData = async () => {
  try {
    await patientsApi.fetchPatients()
  } catch (err) {
    // Handled in composable
  }
}

onMounted(() => {
  loadData()
})

const onWardSwitched = () => {
  loadData()
}

const openPatientDetail = (patient: Patient) => {
  selectedPatient.value = patient
  showDetailDrawer.value = true
}

const triggerBreakGlassForTarget = (patient: Patient | null) => {
  selectedPatientId.value = patient?.id || 'p-cardio-01'
  showBreakGlassModal.value = true
}

const onBreakGlassUnlocked = (res: any) => {
  if (res.patientRecord) {
    selectedPatient.value = res.patientRecord as Patient
    showDetailDrawer.value = true
  }
}
</script>
