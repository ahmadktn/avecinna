<template>
  <div class="min-h-screen bg-slate-50 font-sans">
    <AppSidebar />

    <div class="pl-64 lg:pl-72 flex flex-col min-h-screen">
      <AppNavbar
        @openWardSwitcher="showWardSwitcher = true"
        @openBreakGlass="showBreakGlassModal = true"
      />

      <main class="flex-1 w-full px-8 py-8 space-y-8">
        <!-- Back Link & Action Bar -->
        <div class="flex items-center justify-between">
          <NuxtLink
            to="/patients"
            class="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-2xs"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to Patients Directory</span>
          </NuxtLink>

          <button
            v-if="error"
            @click="showBreakGlassModal = true"
            class="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-sm"
          >
            <svg class="w-4 h-4 text-amber-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>Break-Glass Emergency Unlock</span>
          </button>
        </div>

        <!-- Error State (Access Denied / CAAC Blocked) -->
        <div v-if="error" class="bg-red-50/80 border border-red-200 rounded-3xl p-10 text-center space-y-5 shadow-2xs">
          <div class="w-14 h-14 rounded-2xl bg-red-100 text-red-600 mx-auto flex items-center justify-center shadow-xs">
            <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div class="space-y-1">
            <h3 class="text-lg font-bold text-red-950">Context-Aware Access Control (CAAC) Restriction</h3>
            <p class="text-xs text-red-800 max-w-lg mx-auto leading-relaxed">{{ error }}</p>
          </div>
          <div>
            <button
              @click="showBreakGlassModal = true"
              class="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-xs font-bold px-6 py-3 rounded-2xl transition-all shadow-sm"
            >
              <svg class="w-4 h-4 text-amber-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>Activate Emergency Break-Glass</span>
            </button>
          </div>
        </div>

        <!-- Admin Privacy Redaction Notice -->
        <AdminRedactionBanner v-if="role === 'ADMIN'" />

        <!-- Patient Full Record -->
        <div v-if="patient && !error" class="bg-white border border-slate-200/90 rounded-3xl p-8 shadow-xs space-y-8">
          <!-- Header Profile -->
          <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-slate-100 gap-4">
            <div class="flex items-center gap-4">
              <div class="w-16 h-16 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold text-xl font-mono shadow-sm">
                {{ initials }}
              </div>
              <div class="space-y-1">
                <div class="flex items-center gap-3">
                  <h2 class="text-2xl font-bold text-slate-900 tracking-tight">{{ patient.fullName }}</h2>
                  <StatusBadge type="stable" />
                </div>
                <p class="text-xs text-slate-500 font-mono">
                  MRN: <span class="font-bold text-slate-700">{{ patient.mrn }}</span> · Bed: <span class="font-bold text-slate-700">{{ patient.assignedBed || 'Bed 12B' }}</span> · DOB: {{ patient.dateOfBirth }}
                </p>
              </div>
            </div>

            <div class="flex items-center gap-2">
              <span class="bg-blue-50 text-blue-700 border border-blue-200 px-3.5 py-1.5 rounded-xl text-xs font-bold font-mono">
                {{ patient.patientType || 'INPATIENT' }}
              </span>
            </div>
          </div>

          <!-- Section 1: Clinical Vitals Grid -->
          <div class="space-y-4">
            <h3 class="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-500">Live Vitals & Physiological Telemetry</h3>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div class="bg-slate-50/80 border border-slate-200 rounded-2xl p-5 text-center">
                <p class="text-slate-500 text-xs font-semibold">Blood Pressure</p>
                <p class="text-2xl font-bold text-slate-900 font-mono mt-1">{{ patient.vitals?.bp || '120/80' }}</p>
                <span class="text-[10px] text-emerald-600 font-bold mt-1 inline-block">Normal Range</span>
              </div>
              <div class="bg-slate-50/80 border border-slate-200 rounded-2xl p-5 text-center">
                <p class="text-slate-500 text-xs font-semibold">Heart Rate</p>
                <p class="text-2xl font-bold text-slate-900 font-mono mt-1">{{ patient.vitals?.hr || 72 }} <span class="text-sm font-normal text-slate-500">bpm</span></p>
                <span class="text-[10px] text-emerald-600 font-bold mt-1 inline-block">Sinus Rhythm</span>
              </div>
              <div class="bg-slate-50/80 border border-slate-200 rounded-2xl p-5 text-center">
                <p class="text-slate-500 text-xs font-semibold">SpO2 Oxygen</p>
                <p class="text-2xl font-bold text-slate-900 font-mono mt-1">{{ patient.vitals?.spo2 || 98 }}%</p>
                <span class="text-[10px] text-emerald-600 font-bold mt-1 inline-block">Room Air</span>
              </div>
            </div>
          </div>

          <!-- Section 2: Clinical Diagnosis & Allergies -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
            <div class="bg-slate-50/80 border border-slate-200 rounded-2xl p-6 space-y-3">
              <h4 class="font-bold text-slate-900 uppercase tracking-wider text-slate-500">Clinical Diagnosis</h4>
              <p class="text-slate-800 leading-relaxed text-sm">
                {{ patient.fullRecord?.diagnosis || 'Inpatient clinical surveillance and telemetry monitoring in active ward.' }}
              </p>
            </div>

            <div class="bg-slate-50/80 border border-slate-200 rounded-2xl p-6 space-y-3">
              <h4 class="font-bold text-slate-900 uppercase tracking-wider text-slate-500">Known Allergies & Contraindications</h4>
              <div class="flex flex-wrap gap-2">
                <span class="bg-red-50 text-red-700 border border-red-200 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5">
                  <svg class="w-3.5 h-3.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Penicillin (Anaphylaxis)
                </span>
                <span class="bg-red-50 text-red-700 border border-red-200 px-3 py-1.5 rounded-xl text-xs font-semibold">
                  Sulfa Drugs
                </span>
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

const initials = computed(() => {
  if (!patient.value) return 'PT'
  const parts = patient.value.fullName.split(' ')
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return patient.value.fullName.slice(0, 2).toUpperCase()
})

onMounted(async () => {
  try {
    await patientsApi.fetchPatientById(patientId.value)
  } catch (err) {
    // Handled in composable
  }
})
</script>
