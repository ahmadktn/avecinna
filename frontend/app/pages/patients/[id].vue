<template>
  <div class="min-h-screen bg-slate-50 flex font-sans">
    <AppSidebar />

    <div class="flex-1 flex flex-col min-w-0">
      <AppNavbar
        @openWardSwitcher="showWardSwitcher = true"
        @openBreakGlass="showBreakGlassModal = true"
      />

      <main class="flex-1 p-8 max-w-5xl w-full mx-auto space-y-6">
        <!-- Back Link -->
        <NuxtLink to="/patients" class="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Patients Directory
        </NuxtLink>

        <!-- Error State (Access Denied / CAAC Blocked) -->
        <div v-if="error" class="bg-red-50 border border-red-200 rounded-2xl p-8 text-center space-y-4">
          <div class="w-12 h-12 rounded-full bg-red-100 text-red-600 mx-auto flex items-center justify-center">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 class="text-base font-bold text-red-900">Access Denied by Context-Aware Access Control</h3>
          <p class="text-xs text-red-700 max-w-md mx-auto leading-relaxed">{{ error }}</p>
          <button
            @click="showBreakGlassModal = true"
            class="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium px-4 py-2 rounded-xl transition-colors shadow-xs"
          >
            Emergency Access (Break Glass)
          </button>
        </div>

        <!-- Admin Privacy Redaction Notice -->
        <AdminRedactionBanner v-if="role === 'ADMIN'" />

        <!-- Patient Content -->
        <div v-if="patient && !error" class="bg-white border border-slate-200 rounded-2xl p-8 shadow-xs space-y-6">
          <div class="flex items-center justify-between pb-6 border-b border-slate-200">
            <div>
              <div class="flex items-center gap-3">
                <h2 class="text-2xl font-bold text-slate-900 tracking-tight">{{ patient.fullName }}</h2>
                <StatusBadge type="stable" />
              </div>
              <p class="text-xs text-slate-500 font-mono mt-1">
                MRN: {{ patient.mrn }} · Bed: {{ patient.assignedBed || 'Bed 12B' }} · DOB: {{ patient.dateOfBirth }}
              </p>
            </div>
          </div>

          <!-- Content Details -->
          <div class="space-y-4 text-xs">
            <h3 class="font-bold text-slate-900 text-sm">Clinical Observations & Vitals</h3>
            <div class="grid grid-cols-3 gap-4">
              <div class="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
                <p class="text-slate-500">Blood Pressure</p>
                <p class="text-base font-bold text-slate-900 font-mono mt-1">{{ patient.vitals?.bp || '120/80' }}</p>
              </div>
              <div class="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
                <p class="text-slate-500">Heart Rate</p>
                <p class="text-base font-bold text-slate-900 font-mono mt-1">{{ patient.vitals?.hr || 72 }} bpm</p>
              </div>
              <div class="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
                <p class="text-slate-500">SpO2</p>
                <p class="text-base font-bold text-slate-900 font-mono mt-1">{{ patient.vitals?.spo2 || 98 }}%</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>

    <!-- Modals -->
    <WardSwitcherModal :isOpen="showWardSwitcher" @close="showWardSwitcher = false" />
    <BreakGlassModal :isOpen="showBreakGlassModal" :patientId="patientId" @close="showBreakGlassModal = false" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuth } from '~/composables/useAuth'
import { usePatients, type Patient } from '~/composables/usePatients'

const route = useRoute()
const auth = useAuth()
const patientsApi = usePatients()

const patientId = computed(() => route.params.id as string)
const role = computed(() => auth.role.value)
const patient = computed(() => patientsApi.currentPatient.value)
const error = computed(() => patientsApi.error.value)

const showWardSwitcher = ref(false)
const showBreakGlassModal = ref(false)

onMounted(async () => {
  try {
    await patientsApi.fetchPatientById(patientId.value)
  } catch (err) {
    // Handled in composable
  }
})
</script>
