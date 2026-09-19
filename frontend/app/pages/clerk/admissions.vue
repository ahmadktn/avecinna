<template>
  <div class="min-h-screen bg-slate-50 font-sans">
    <AppSidebar />

    <div class="pl-56 flex flex-col min-h-screen">
      <AppNavbar />

      <main class="flex-1 w-full px-8 py-8 space-y-5">
        <!-- Header -->
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 class="font-brand text-xl font-semibold text-slate-900 tracking-tight">Inpatient Bed Space Allocation</h1>
            <p class="text-xs text-slate-500 mt-1">
              Manage inpatient ward assignments, bed reallocation, transfers, and bed occupancy telemetry
            </p>
          </div>

          <div class="flex items-center gap-3">
            <button
              type="button"
              @click="loadData"
              :disabled="loading"
              class="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 shadow-2xs flex items-center gap-2 transition-all cursor-pointer"
            >
              <svg class="w-3.5 h-3.5 text-slate-500" :class="{ 'animate-spin': loading }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Refresh</span>
            </button>

            <NuxtLink
              to="/clerk/register"
              class="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-xs shrink-0 cursor-pointer"
            >
              <svg class="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
              </svg>
              <span>Admit Inpatient</span>
            </NuxtLink>
          </div>
        </div>

        <!-- Success Toast -->
        <div v-if="successMessage" class="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl text-xs flex items-center justify-between shadow-2xs">
          <div class="flex items-center gap-2.5">
            <svg class="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
            </svg>
            <span>{{ successMessage }}</span>
          </div>
          <button type="button" @click="successMessage = null" class="text-emerald-700 font-bold hover:text-emerald-900 cursor-pointer">Dismiss</button>
        </div>

        <!-- Summary KPI Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div class="bg-white border border-slate-200/90 rounded-xl p-6 shadow-2xs">
            <div class="flex items-center justify-between text-slate-400 mb-2">
              <span class="text-xs font-bold uppercase tracking-wider text-slate-500">Total Inpatients</span>
              <div class="w-8 h-8 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
            <p class="text-3xl font-bold text-slate-900 font-mono">{{ totalInpatients }}</p>
            <p class="text-xs text-slate-400 mt-1">Currently admitted across all units</p>
          </div>

          <div class="bg-white border border-slate-200/90 rounded-xl p-6 shadow-2xs">
            <div class="flex items-center justify-between text-slate-400 mb-2">
              <span class="text-xs font-bold uppercase tracking-wider text-slate-500">Allocated Beds</span>
              <div class="w-8 h-8 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
            </div>
            <p class="text-3xl font-bold text-slate-900 font-mono">{{ allocatedBedsCount }}</p>
            <p class="text-xs text-slate-400 mt-1">{{ unallocatedCount }} awaiting specific bed number</p>
          </div>

          <div class="bg-white border border-slate-200/90 rounded-xl p-6 shadow-2xs">
            <div class="flex items-center justify-between text-slate-400 mb-2">
              <span class="text-xs font-bold uppercase tracking-wider text-slate-500">Hospital Wards</span>
              <div class="w-8 h-8 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
            </div>
            <p class="text-3xl font-bold text-slate-900 font-mono">{{ wardsList.length }}</p>
            <p class="text-xs text-slate-400 mt-1">Active clinical departments</p>
          </div>
        </div>

        <!-- Search & Filter Toolbar -->
        <div class="bg-white border border-slate-200/90 rounded-xl p-4 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
          <div class="relative w-full md:w-80">
            <svg class="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              v-model="searchQuery"
              @input="debouncedSearch"
              type="text"
              placeholder="Search inpatient by name, MRN, or bed..."
              class="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div class="flex items-center gap-3 w-full md:w-auto justify-end flex-wrap">
            <div class="flex items-center gap-2 text-xs">
              <span class="text-slate-500 font-semibold">Ward:</span>
              <select
                v-model="selectedWard"
                @change="loadPatients"
                class="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500"
              >
                <option value="ALL">All Wards</option>
                <option v-for="w in wardsList" :key="w.id" :value="w.id">
                  {{ w.name }} ({{ w.code }})
                </option>
              </select>
            </div>

            <span class="bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold px-3 py-1.5 rounded-xl">
              {{ pagination.total }} Inpatients
            </span>
          </div>
        </div>

        <!-- Error Alert -->
        <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-xs flex items-center justify-between shadow-2xs">
          <span>{{ error }}</span>
          <button @click="loadData" class="underline font-bold hover:text-red-900 cursor-pointer">Retry</button>
        </div>

        <!-- Inpatient Bed Allocation Table -->
        <div class="bg-white border border-slate-200/90 rounded-xl overflow-hidden shadow-2xs">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr class="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                  <th class="px-5 py-3.5">Inpatient Name</th>
                  <th class="px-5 py-3.5 font-mono">MRN</th>
                  <th class="px-5 py-3.5">Ward Department</th>
                  <th class="px-5 py-3.5 font-mono">Assigned Bed</th>
                  <th class="px-5 py-3.5">Admission Date</th>
                  <th class="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 font-sans">
                <tr
                  v-for="p in patientsList"
                  :key="p.id"
                  class="hover:bg-slate-50/70 transition-colors"
                >
                  <!-- Patient Name -->
                  <td class="px-5 py-3.5 font-bold text-slate-900">
                    {{ p.fullName }}
                    <span class="block text-[11px] text-slate-400 capitalize font-normal">
                      {{ p.gender.toLowerCase() }} · DOB: {{ p.dateOfBirth }}
                    </span>
                  </td>

                  <!-- MRN -->
                  <td class="px-5 py-3.5 font-mono font-medium text-slate-700 select-all">
                    {{ p.mrn }}
                  </td>

                  <!-- Ward -->
                  <td class="px-5 py-3.5 text-slate-800 font-medium">
                    {{ p.wardName ? `${p.wardName} (${p.wardCode})` : (p.primaryWardId || 'Unassigned') }}
                  </td>

                  <!-- Bed -->
                  <td class="px-5 py-3.5">
                    <span
                      v-if="p.assignedBed"
                      class="px-2.5 py-0.5 rounded-md font-mono font-bold text-xs bg-slate-100 text-slate-900 border border-slate-200 inline-block"
                    >
                      {{ p.assignedBed }}
                    </span>
                    <span v-else class="text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md text-[11px] font-bold">
                      Unallocated
                    </span>
                  </td>

                  <!-- Admission Date -->
                  <td class="px-5 py-3.5 font-mono text-slate-500 text-xs whitespace-nowrap">
                    {{ formatDate(p.createdAt) }}
                  </td>

                  <!-- Actions -->
                  <td class="px-5 py-3.5 text-right space-x-2 whitespace-nowrap">
                    <button
                      type="button"
                      @click="openTransferModal(p)"
                      class="border border-slate-200 hover:bg-slate-100 bg-white px-2.5 py-1 rounded-xl text-xs font-semibold text-slate-700 transition-all shadow-2xs cursor-pointer"
                    >
                      Reallocate / Transfer
                    </button>
                  </td>
                </tr>

                <tr v-if="!loading && patientsList.length === 0">
                  <td colspan="6" class="py-16 text-center text-slate-400 space-y-2">
                    <svg class="w-10 h-10 text-slate-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <p class="font-bold text-slate-600">No admitted inpatients found matching criteria</p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination Footer -->
          <div class="px-5 py-3.5 bg-slate-50/70 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <span class="text-slate-500">
              Showing Page <strong class="text-slate-900">{{ pagination.page }}</strong> of <strong class="text-slate-900">{{ pagination.totalPages || 1 }}</strong> ({{ pagination.total }} inpatients)
            </span>

            <div class="flex items-center gap-2">
              <button
                type="button"
                @click="changePage(pagination.page - 1)"
                :disabled="pagination.page <= 1"
                class="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                &larr; Previous
              </button>

              <button
                type="button"
                @click="changePage(pagination.page + 1)"
                :disabled="pagination.page >= pagination.totalPages"
                class="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Next &rarr;
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>

    <!-- Reallocate / Ward Transfer Modal -->
    <div
      v-if="showTransferModal && activePatient"
      @click.self="showTransferModal = false"
      class="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
    >
      <div class="bg-white rounded-2xl max-w-lg w-full p-8 shadow-2xl border border-slate-200 relative my-8">
        <h3 class="text-lg font-bold text-slate-900 mb-1">Inpatient Bed Transfer & Ward Assignment</h3>
        <p class="text-xs text-slate-500 mb-6">Update ward location or assign new bed space for <strong class="text-slate-800">{{ activePatient.fullName }}</strong> ({{ activePatient.mrn }}).</p>

        <form @submit.prevent="handleSaveTransfer" class="space-y-4 text-xs">
          <div>
            <label class="block font-bold text-slate-700 mb-1.5">Assigned Hospital Ward <span class="text-red-500">*</span></label>
            <select
              v-model="transferForm.primaryWardId"
              required
              class="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:border-blue-500"
            >
              <option v-for="w in wardsList" :key="w.id" :value="w.id">
                {{ w.name }} ({{ w.code }}) - {{ w.department }}
              </option>
            </select>
          </div>

          <div>
            <label class="block font-bold text-slate-700 mb-1.5">Assigned Bed Number <span class="text-red-500">*</span></label>
            <input
              v-model="transferForm.assignedBed"
              type="text"
              required
              placeholder="e.g. ICU-BED-02"
              class="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:border-blue-500 font-mono font-semibold"
            />
          </div>

          <div>
            <label class="block font-bold text-slate-700 mb-1.5">Status Option</label>
            <select
              v-model="transferForm.patientType"
              class="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:border-blue-500"
            >
              <option value="INPATIENT">Keep Inpatient Admission</option>
              <option value="OUTPATIENT">Discharge / Convert to Outpatient</option>
            </select>
          </div>

          <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              @click="showTransferModal = false"
              class="px-5 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="actionLoading"
              class="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <span v-if="actionLoading" class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              <span>Confirm Bed Reallocation</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useClerk, type ClerkPatientItem } from '~/composables/useClerk'

const clerk = useClerk()
const patientsList = clerk.patients
const pagination = clerk.pagination
const wardsList = clerk.wards
const loading = clerk.loading
const error = clerk.error

const searchQuery = ref('')
const selectedWard = ref('ALL')
const showTransferModal = ref(false)
const activePatient = ref<ClerkPatientItem | null>(null)
const actionLoading = ref(false)
const successMessage = ref<string | null>(null)

const transferForm = ref({
  primaryWardId: '',
  assignedBed: '',
  patientType: 'INPATIENT' as 'INPATIENT' | 'OUTPATIENT',
})

const totalInpatients = computed(() => pagination.value.total)
const allocatedBedsCount = computed(() => patientsList.value.filter((p) => p.assignedBed && p.assignedBed.trim()).length)
const unallocatedCount = computed(() => patientsList.value.filter((p) => !p.assignedBed || !p.assignedBed.trim()).length)

let searchTimeout: any = null
const debouncedSearch = () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    loadPatients()
  }, 300)
}

const loadPatients = async () => {
  await clerk.fetchPatients({
    page: pagination.value.page,
    limit: 15,
    patientType: 'INPATIENT',
    ward: selectedWard.value,
    search: searchQuery.value,
  })
}

const loadData = async () => {
  await clerk.fetchWards()
  await loadPatients()
}

const changePage = (p: number) => {
  pagination.value.page = p
  loadPatients()
}

onMounted(() => {
  loadData()
})

const openTransferModal = (p: ClerkPatientItem) => {
  activePatient.value = p
  transferForm.value = {
    primaryWardId: p.primaryWardId || (wardsList.value[0]?.id || ''),
    assignedBed: p.assignedBed || '',
    patientType: p.patientType,
  }
  showTransferModal.value = true
}

const handleSaveTransfer = async () => {
  if (!activePatient.value) return
  actionLoading.value = true
  try {
    await clerk.updateBedAllocation(activePatient.value.id, transferForm.value)
    showTransferModal.value = false
    successMessage.value = `Bed allocation updated for ${activePatient.value.fullName}!`
    await loadPatients()
  } catch (err) {
    // Handled in composable
  } finally {
    actionLoading.value = false
  }
}

const formatDate = (iso: string) => {
  if (!iso) return '-'
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric' })
}
</script>
