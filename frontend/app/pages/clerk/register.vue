<template>
  <div class="min-h-screen bg-slate-50 font-sans">
    <AppSidebar />

    <div class="pl-64 lg:pl-72 flex flex-col min-h-screen">
      <AppNavbar @openWardSwitcher="showWardSwitcher = true" />

      <main class="flex-1 w-full px-8 py-8 space-y-8">
        <!-- Header Title -->
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Patient Registration & Ward Admission</h1>
            <p class="text-xs text-slate-500 mt-1">Register new inpatient or outpatient record and allocate bed assignment</p>
          </div>

          <button
            type="button"
            @click="fillDemoData"
            class="text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-4 py-2 rounded-xl transition-colors shrink-0 cursor-pointer"
          >
            Auto-fill Sample Data
          </button>
        </div>

        <!-- Success Toast -->
        <div v-if="successMessage" class="bg-emerald-50 border border-emerald-200 text-emerald-800 p-5 rounded-2xl text-xs flex items-center justify-between shadow-2xs">
          <div class="flex items-center gap-2.5">
            <div class="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span class="font-medium">{{ successMessage }}</span>
          </div>
          <button type="button" @click="successMessage = null" class="text-emerald-700 font-bold hover:text-emerald-900 cursor-pointer">Dismiss</button>
        </div>

        <!-- Error Alert -->
        <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 p-5 rounded-2xl text-xs flex items-center justify-between shadow-2xs">
          <div class="flex items-center gap-2.5">
            <svg class="w-4 h-4 text-red-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{{ error }}</span>
          </div>
          <button type="button" @click="error = null" class="text-red-700 font-bold hover:text-red-900 cursor-pointer">Dismiss</button>
        </div>

        <!-- Form Panel -->
        <div class="bg-white border border-slate-200/90 rounded-3xl p-8 lg:p-10 shadow-xs">
          <form @submit.prevent="handleRegister" class="space-y-8">
            <!-- Demographics Section -->
            <div class="space-y-4">
              <div class="flex items-center gap-2.5 pb-2 border-b border-slate-100">
                <div class="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h3 class="text-xs font-bold text-slate-500 uppercase tracking-wider">Patient Demographics</h3>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
                <div>
                  <label class="block font-bold text-slate-700 mb-1.5">Medical Record Number (MRN) <span class="text-red-500">*</span></label>
                  <input
                    v-model="form.mrn"
                    type="text"
                    required
                    placeholder="e.g. MRN-2026-9090"
                    class="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-semibold"
                  />
                </div>

                <div>
                  <label class="block font-bold text-slate-700 mb-1.5">Full Legal Name <span class="text-red-500">*</span></label>
                  <input
                    v-model="form.fullName"
                    type="text"
                    required
                    placeholder="e.g. Tunde Bakare"
                    class="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-semibold"
                  />
                </div>

                <div>
                  <label class="block font-bold text-slate-700 mb-1.5">Date of Birth <span class="text-red-500">*</span></label>
                  <input
                    v-model="form.dateOfBirth"
                    type="date"
                    required
                    class="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
                  />
                </div>

                <div>
                  <label class="block font-bold text-slate-700 mb-1.5">Gender <span class="text-red-500">*</span></label>
                  <select
                    v-model="form.gender"
                    required
                    class="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                  </select>
                </div>

                <div>
                  <label class="block font-bold text-slate-700 mb-1.5">Blood Group</label>
                  <input
                    v-model="form.bloodGroup"
                    type="text"
                    placeholder="e.g. O+"
                    class="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
                  />
                </div>

                <div>
                  <label class="block font-bold text-slate-700 mb-1.5">Genotype</label>
                  <input
                    v-model="form.genotype"
                    type="text"
                    placeholder="e.g. AA"
                    class="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
                  />
                </div>
              </div>
            </div>

            <!-- Admission Section -->
            <div class="space-y-4 pt-4">
              <div class="flex items-center gap-2.5 pb-2 border-b border-slate-100">
                <div class="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h3 class="text-xs font-bold text-slate-500 uppercase tracking-wider">Admission & Bed Assignment</h3>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-3 gap-5 text-xs">
                <div>
                  <label class="block font-bold text-slate-700 mb-1.5">Admission Type <span class="text-red-500">*</span></label>
                  <select
                    v-model="form.patientType"
                    required
                    class="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  >
                    <option value="INPATIENT">Inpatient (Ward Bed)</option>
                    <option value="OUTPATIENT">Outpatient (Clinic Visit)</option>
                  </select>
                </div>

                <div>
                  <label class="block font-bold text-slate-700 mb-1.5">Primary Ward Assignment <span class="text-red-500">*</span></label>
                  <select
                    v-model="form.primaryWardId"
                    required
                    class="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  >
                    <option value="w-cardio">Cardiology Ward (3W)</option>
                    <option value="w-icu">Intensive Care Unit (6C)</option>
                    <option value="w-oncol">Oncology Ward (5N)</option>
                    <option value="w-emerg">Emergency Department (1E)</option>
                  </select>
                </div>

                <div>
                  <label class="block font-bold text-slate-700 mb-1.5">Assigned Bed Number</label>
                  <input
                    v-model="form.assignedBed"
                    type="text"
                    placeholder="e.g. CARD-BED-12"
                    class="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono font-semibold"
                  />
                </div>
              </div>
            </div>

            <!-- Submit Button -->
            <div class="pt-6 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="submit"
                :disabled="loading"
                class="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white text-xs font-bold px-7 py-3 rounded-2xl transition-all shadow-xs flex items-center gap-2 cursor-pointer"
              >
                <span v-if="loading" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <span>{{ loading ? 'Processing Admission...' : 'Register & Admit Patient' }}</span>
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

const fillDemoData = () => {
  form.value = {
    mrn: `MRN-${Math.floor(100000 + Math.random() * 900000)}`,
    fullName: 'Emmanuel Adebayo',
    dateOfBirth: '1988-11-20',
    gender: 'MALE',
    patientType: 'INPATIENT',
    genotype: 'AA',
    bloodGroup: 'O+',
    primaryWardId: 'w-cardio',
    assignedBed: 'CARD-BED-08',
  }
}

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
