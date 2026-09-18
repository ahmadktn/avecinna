<template>
  <div class="min-h-screen bg-slate-50 flex font-sans select-none">
    <AppSidebar />

    <div class="flex-1 flex flex-col min-w-0">
      <AppNavbar @openWardSwitcher="showWardSwitcher = true" />

      <main class="flex-1 p-8 max-w-4xl w-full mx-auto space-y-6">
        <!-- Header Title -->
        <div>
          <h1 class="text-xl font-bold text-slate-900 tracking-tight">Patient Registration & Ward Admission</h1>
          <p class="text-xs text-slate-500 mt-1">Register new inpatient or outpatient record and allocate bed assignment</p>
        </div>

        <!-- Success Toast -->
        <div v-if="successMessage" class="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl text-xs flex items-center justify-between">
          <div class="flex items-center gap-2">
            <svg class="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <span>{{ successMessage }}</span>
          </div>
          <button @click="successMessage = null" class="text-emerald-700 font-bold">Dismiss</button>
        </div>

        <!-- Error Alert -->
        <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-xs flex items-center justify-between">
          <span>{{ error }}</span>
          <button @click="error = null" class="text-red-700 font-bold">Dismiss</button>
        </div>

        <!-- Form Panel -->
        <div class="bg-white border border-slate-200 rounded-2xl p-8 shadow-xs">
          <form @submit.prevent="handleRegister" class="space-y-6">
            <!-- Demographics Section -->
            <div>
              <h3 class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Patient Demographics</h3>
              <div class="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <label class="block font-semibold text-slate-700 mb-1">Medical Record Number (MRN) <span class="text-red-500">*</span></label>
                  <input
                    v-model="form.mrn"
                    type="text"
                    required
                    placeholder="e.g. MRN-2026-9090"
                    class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label class="block font-semibold text-slate-700 mb-1">Full Name <span class="text-red-500">*</span></label>
                  <input
                    v-model="form.fullName"
                    type="text"
                    required
                    placeholder="e.g. Tunde Bakare"
                    class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label class="block font-semibold text-slate-700 mb-1">Date of Birth <span class="text-red-500">*</span></label>
                  <input
                    v-model="form.dateOfBirth"
                    type="date"
                    required
                    class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label class="block font-semibold text-slate-700 mb-1">Gender <span class="text-red-500">*</span></label>
                  <select
                    v-model="form.gender"
                    required
                    class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-blue-500"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                  </select>
                </div>

                <div>
                  <label class="block font-semibold text-slate-700 mb-1">Blood Group</label>
                  <input
                    v-model="form.bloodGroup"
                    type="text"
                    placeholder="e.g. O+"
                    class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label class="block font-semibold text-slate-700 mb-1">Genotype</label>
                  <input
                    v-model="form.genotype"
                    type="text"
                    placeholder="e.g. AA"
                    class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>
            </div>

            <!-- Admission Section -->
            <div class="pt-4 border-t border-slate-200">
              <h3 class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Admission & Ward Allocation</h3>
              <div class="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <label class="block font-semibold text-slate-700 mb-1">Patient Type <span class="text-red-500">*</span></label>
                  <select
                    v-model="form.patientType"
                    required
                    class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-blue-500"
                  >
                    <option value="INPATIENT">Inpatient</option>
                    <option value="OUTPATIENT">Outpatient</option>
                  </select>
                </div>

                <div>
                  <label class="block font-semibold text-slate-700 mb-1">Primary Ward Assignment <span class="text-red-500">*</span></label>
                  <select
                    v-model="form.primaryWardId"
                    required
                    class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-blue-500"
                  >
                    <option value="w-cardio">Cardiology Ward (3W)</option>
                    <option value="w-icu">Intensive Care Unit (6C)</option>
                    <option value="w-oncol">Oncology Ward (5N)</option>
                    <option value="w-emerg">Emergency Department (1E)</option>
                  </select>
                </div>

                <div>
                  <label class="block font-semibold text-slate-700 mb-1">Assigned Bed Number</label>
                  <input
                    v-model="form.assignedBed"
                    type="text"
                    placeholder="e.g. CARD-BED-12"
                    class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>
            </div>

            <!-- Submit Button -->
            <div class="pt-4 border-t border-slate-200 flex justify-end">
              <button
                type="submit"
                :disabled="loading"
                class="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold px-6 py-2.5 rounded-xl transition-all shadow-xs"
              >
                <span v-if="loading">Processing Admission...</span>
                <span v-else>Register & Admit Patient</span>
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>

    <WardSwitcherModal :isOpen="showWardSwitcher" @close="showWardSwitcher = false" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { usePatients } from '~/composables/usePatients'

const patientsApi = usePatients()
const showWardSwitcher = ref(false)
const loading = ref(false)
const error = ref<string | null>(null)
const successMessage = ref<string | null>(null)

const form = ref({
  mrn: 'MRN-2026-9090',
  fullName: '',
  dateOfBirth: '1985-06-15',
  gender: 'MALE',
  patientType: 'INPATIENT' as 'INPATIENT' | 'OUTPATIENT',
  genotype: 'AA',
  bloodGroup: 'O+',
  primaryWardId: 'w-cardio',
  assignedBed: 'CARD-BED-12',
})

const handleRegister = async () => {
  loading.value = true
  error.value = null
  successMessage.value = null
  try {
    const p = await patientsApi.registerPatient(form.value)
    successMessage.value = `Patient ${p.fullName} (${p.mrn}) registered and admitted successfully!`
    form.value.fullName = ''
  } catch (err: any) {
    error.value = err.message || 'Failed to register patient'
  } finally {
    loading.value = false
  }
}
</script>
