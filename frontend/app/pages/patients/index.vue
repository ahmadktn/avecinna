<template>
  <div class="min-h-screen bg-slate-50 flex font-sans">
    <!-- Sidebar -->
    <AppSidebar />

    <!-- Main Layout Container -->
    <div class="flex-1 flex flex-col min-w-0">
      <!-- Navbar Header -->
      <AppNavbar
        @openWardSwitcher="showWardSwitcher = true"
        @openBreakGlass="triggerBreakGlassForTarget(null)"
      />

      <!-- Content Viewport -->
      <main class="flex-1 p-8 space-y-8 max-w-7xl w-full mx-auto">
        <!-- Error Banner -->
        <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-xs flex items-center justify-between">
          <span>{{ error }}</span>
          <button @click="loadData" class="underline font-semibold">Retry</button>
        </div>

        <!-- Admin Privacy Banner if Admin role -->
        <AdminRedactionBanner v-if="role === 'ADMIN'" />

        <!-- KPI Summary Cards Grid -->
        <div class="grid grid-cols-3 gap-6">
          <div class="bg-white border border-slate-200 rounded-xl px-6 py-5 shadow-2xs">
            <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Patients in Ward</p>
            <p class="text-3xl font-bold text-slate-900 mt-2 font-mono">{{ activePatientsCount }}</p>
          </div>

          <div class="bg-white border border-slate-200 rounded-xl px-6 py-5 shadow-2xs">
            <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Monitoring</p>
            <p class="text-3xl font-bold text-amber-600 mt-2 font-mono">{{ monitoringCount }}</p>
          </div>

          <div class="bg-white border border-slate-200 rounded-xl px-6 py-5 shadow-2xs">
            <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Critical</p>
            <p class="text-3xl font-bold text-red-600 mt-2 font-mono">{{ criticalCount }}</p>
          </div>
        </div>

        <!-- Section 1: Active Ward Patients -->
        <section class="space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="text-xs font-bold text-slate-500 uppercase tracking-wider">
              PATIENTS – {{ activeWardCode }}
            </h2>
            <span class="text-xs text-slate-400 font-mono">{{ activePatientsCount }} Admitted</span>
          </div>

          <!-- Empty State -->
          <div
            v-if="patientsList.length === 0"
            class="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400 text-sm shadow-2xs"
          >
            No patients in this ward
          </div>

          <!-- Patient Cards List -->
          <div v-else class="space-y-3">
            <PatientCard
              v-for="p in patientsList"
              :key="p.id"
              :patient="p"
              @select="openPatientDetail"
            />
          </div>
        </section>

        <!-- Section 2: Restricted Other Wards -->
        <section class="space-y-4 pt-4">
          <div class="flex items-center justify-between">
            <h2 class="text-xs font-bold text-slate-500 uppercase tracking-wider">
              OTHER WARDS – RESTRICTED
            </h2>
            <span class="text-xs text-slate-400">CAAC Protected</span>
          </div>

          <div class="space-y-3">
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
    primaryWardId: 'Cardiology - 3W',
    assignedBed: '3W - 14B',
  },
  {
    id: 'p-cardio-02',
    mrn: 'MRN-002915',
    fullName: 'Thomas Bergstorm',
    dateOfBirth: '1972-04-12',
    gender: 'MALE',
    primaryWardId: 'Cardiology - 3W',
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
