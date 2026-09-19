<template>
  <div class="min-h-screen bg-slate-50 font-sans">
    <AppSidebar />

    <div class="pl-64 lg:pl-72 flex flex-col min-h-screen">
      <AppNavbar />

      <main class="flex-1 w-full px-8 py-8 space-y-6">
        <!-- Header -->
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 class="text-2xl font-extrabold text-slate-900 tracking-tight">Hospital Patient Directory</h1>
            <p class="text-xs text-slate-500 mt-1 font-medium">
              Administrative patient census, bed allocation, and clinic intake registry
            </p>
          </div>

          <div class="flex items-center gap-3">
            <button
              type="button"
              @click="loadPatients"
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
              <span>Register Patient</span>
            </NuxtLink>
          </div>
        </div>

        <!-- Search & Filter Toolbar -->
        <div class="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
          <div class="relative w-full md:w-80">
            <svg class="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              v-model="searchQuery"
              @input="debouncedSearch"
              type="text"
              placeholder="Search by patient name or MRN..."
              class="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div class="flex items-center gap-3 w-full md:w-auto justify-end flex-wrap">
            <div class="flex items-center gap-2 text-xs">
              <span class="text-slate-500 font-semibold">Type:</span>
              <select
                v-model="selectedType"
                @change="loadPatients"
                class="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500"
              >
                <option value="ALL">All Types</option>
                <option value="INPATIENT">Inpatient</option>
                <option value="OUTPATIENT">Outpatient</option>
              </select>
            </div>

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
              {{ pagination.total }} Patients
            </span>
          </div>
        </div>

        <!-- Error Alert -->
        <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl text-xs flex items-center justify-between shadow-2xs">
          <span>{{ error }}</span>
          <button @click="loadPatients" class="underline font-bold hover:text-red-900 cursor-pointer">Retry</button>
        </div>

        <!-- Patients Table -->
        <div class="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr class="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                  <th class="px-5 py-3.5">Patient Name</th>
                  <th class="px-5 py-3.5 font-mono">MRN</th>
                  <th class="px-5 py-3.5">Admission Type</th>
                  <th class="px-5 py-3.5">Gender & DOB</th>
                  <th class="px-5 py-3.5">Ward Location</th>
                  <th class="px-5 py-3.5 font-mono">Assigned Bed</th>
                  <th class="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 font-sans">
                <tr
                  v-for="p in patientsList"
                  :key="p.id"
                  class="hover:bg-slate-50/70 transition-colors"
                >
                  <!-- Name -->
                  <td class="px-5 py-3.5 font-bold text-slate-900">
                    {{ p.fullName }}
                    <span v-if="p.bloodGroup || p.genotype" class="block text-[11px] font-mono text-slate-400 font-normal">
                      {{ p.bloodGroup || '-' }} · {{ p.genotype || '-' }}
                    </span>
                  </td>

                  <!-- MRN -->
                  <td class="px-5 py-3.5 font-mono text-xs font-semibold text-slate-700 select-all">
                    {{ p.mrn }}
                  </td>

                  <!-- Admission Type -->
                  <td class="px-5 py-3.5">
                    <span
                      class="px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase inline-block"
                      :class="p.patientType === 'INPATIENT' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-slate-100 text-slate-700'"
                    >
                      {{ p.patientType }}
                    </span>
                  </td>

                  <!-- Gender / DOB -->
                  <td class="px-5 py-3.5 text-slate-600 capitalize">
                    {{ p.gender.toLowerCase() }} · <span class="font-mono">{{ p.dateOfBirth }}</span>
                  </td>

                  <!-- Ward -->
                  <td class="px-5 py-3.5 text-slate-700 font-medium">
                    {{ p.wardName ? `${p.wardName} (${p.wardCode})` : (p.primaryWardId || 'Unassigned') }}
                  </td>

                  <!-- Bed -->
                  <td class="px-5 py-3.5 font-mono text-xs font-medium text-slate-800">
                    <span v-if="p.assignedBed" class="bg-slate-100 px-2 py-0.5 rounded text-slate-900 font-mono">
                      {{ p.assignedBed }}
                    </span>
                    <span v-else class="text-slate-400 italic">None</span>
                  </td>

                  <!-- Actions -->
                  <td class="px-5 py-3.5 text-right space-x-2 whitespace-nowrap">
                    <button
                      type="button"
                      @click="openQueueModal(p)"
                      class="border border-purple-200 text-purple-700 hover:bg-purple-50 bg-white px-2.5 py-1 rounded-xl text-xs font-semibold transition-all shadow-2xs cursor-pointer"
                    >
                      + Queue
                    </button>
                    <button
                      type="button"
                      @click="openBedModal(p)"
                      class="border border-slate-200 hover:bg-slate-100 bg-white px-2.5 py-1 rounded-xl text-xs font-semibold text-slate-700 transition-all shadow-2xs cursor-pointer"
                    >
                      Bed / Ward
                    </button>
                  </td>
                </tr>

                <tr v-if="!loading && patientsList.length === 0">
                  <td colspan="7" class="py-16 text-center text-slate-400 space-y-2">
                    <svg class="w-10 h-10 text-slate-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <p class="font-bold text-slate-600">No patients found matching filter criteria</p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination Footer -->
          <div class="px-5 py-3.5 bg-slate-50/70 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <span class="text-slate-500">
              Showing Page <strong class="text-slate-900">{{ pagination.page }}</strong> of <strong class="text-slate-900">{{ pagination.totalPages || 1 }}</strong> ({{ pagination.total }} total registered patients)
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

    <!-- Quick Bed Allocation Modal -->
    <div
      v-if="showBedModal && activePatient"
      @click.self="showBedModal = false"
      class="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
    >
      <div class="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl border border-slate-200 relative my-8">
        <h3 class="text-lg font-bold text-slate-900 mb-1">Update Bed & Ward Assignment</h3>
        <p class="text-xs text-slate-500 mb-6">Allocate bed space or transfer <strong class="text-slate-800">{{ activePatient.fullName }}</strong> ({{ activePatient.mrn }}).</p>

        <form @submit.prevent="handleSaveBed" class="space-y-4 text-xs">
          <div>
            <label class="block font-bold text-slate-700 mb-1.5">Admission Type <span class="text-red-500">*</span></label>
            <select
              v-model="bedForm.patientType"
              required
              class="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:border-blue-500"
            >
              <option value="INPATIENT">Inpatient (Ward Bed)</option>
              <option value="OUTPATIENT">Outpatient (Clinic)</option>
            </select>
          </div>

          <div>
            <label class="block font-bold text-slate-700 mb-1.5">Assigned Ward <span class="text-red-500">*</span></label>
            <select
              v-model="bedForm.primaryWardId"
              required
              class="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:border-blue-500"
            >
              <option v-for="w in wardsList" :key="w.id" :value="w.id">
                {{ w.name }} ({{ w.code }})
              </option>
            </select>
          </div>

          <div>
            <label class="block font-bold text-slate-700 mb-1.5">Assigned Bed Number</label>
            <input
              v-model="bedForm.assignedBed"
              type="text"
              placeholder="e.g. CARD-BED-04"
              class="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:border-blue-500 font-mono font-semibold"
            />
          </div>

          <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              @click="showBedModal = false"
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
              <span>Save Bed Assignment</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Quick Queue Booking Modal -->
    <div
      v-if="showQueueModal && activePatient"
      @click.self="showQueueModal = false"
      class="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
    >
      <div class="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl border border-slate-200 relative my-8">
        <h3 class="text-lg font-bold text-slate-900 mb-1">Add to Consultation Queue</h3>
        <p class="text-xs text-slate-500 mb-6">Schedule consultation slot for <strong class="text-slate-800">{{ activePatient.fullName }}</strong> ({{ activePatient.mrn }}).</p>

        <form @submit.prevent="handleSaveQueue" class="space-y-4 text-xs">
          <div>
            <label class="block font-bold text-slate-700 mb-1.5">Attending Doctor <span class="text-red-500">*</span></label>
            <select
              v-model="queueForm.doctorId"
              required
              class="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:border-blue-500 font-medium"
            >
              <option v-for="d in doctorsList" :key="d.id" :value="d.id">
                {{ d.fullName }} ({{ d.wardName || d.role }})
              </option>
            </select>
          </div>

          <div>
            <label class="block font-bold text-slate-700 mb-1.5">Clinic Ward Location <span class="text-red-500">*</span></label>
            <select
              v-model="queueForm.clinicWardId"
              required
              class="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:border-blue-500"
            >
              <option v-for="w in wardsList" :key="w.id" :value="w.id">
                {{ w.name }} ({{ w.code }})
              </option>
            </select>
          </div>

          <div>
            <label class="block font-bold text-slate-700 mb-1.5">Appointment Date & Time <span class="text-red-500">*</span></label>
            <input
              v-model="queueForm.appointmentDate"
              type="datetime-local"
              required
              class="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:border-blue-500 font-mono"
            />
          </div>

          <div>
            <label class="block font-bold text-slate-700 mb-1.5">Consultation Notes / Reason</label>
            <input
              v-model="queueForm.notes"
              type="text"
              placeholder="e.g. Routine follow-up, chest discomfort"
              class="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              @click="showQueueModal = false"
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
              <span>Confirm Consultation Slot</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useClerk, type ClerkPatientItem } from '~/composables/useClerk'

const clerk = useClerk()
const patientsList = clerk.patients
const pagination = clerk.pagination
const loading = clerk.loading
const error = clerk.error
const wardsList = clerk.wards
const doctorsList = clerk.doctors

const searchQuery = ref('')
const selectedType = ref('ALL')
const selectedWard = ref('ALL')

const showBedModal = ref(false)
const showQueueModal = ref(false)
const activePatient = ref<ClerkPatientItem | null>(null)
const actionLoading = ref(false)

const bedForm = ref({
  patientType: 'INPATIENT' as 'INPATIENT' | 'OUTPATIENT',
  primaryWardId: '',
  assignedBed: '',
})

const queueForm = ref({
  doctorId: '',
  clinicWardId: '',
  appointmentDate: '',
  notes: '',
})

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
    search: searchQuery.value,
    ward: selectedWard.value,
    patientType: selectedType.value,
  })
}

const changePage = (p: number) => {
  pagination.value.page = p
  loadPatients()
}

onMounted(async () => {
  await Promise.all([clerk.fetchWards(), clerk.fetchDoctors()])
  loadPatients()
})

const openBedModal = (p: ClerkPatientItem) => {
  activePatient.value = p
  bedForm.value = {
    patientType: p.patientType,
    primaryWardId: p.primaryWardId || (wardsList.value[0]?.id || ''),
    assignedBed: p.assignedBed || '',
  }
  showBedModal.value = true
}

const handleSaveBed = async () => {
  if (!activePatient.value) return
  actionLoading.value = true
  try {
    await clerk.updateBedAllocation(activePatient.value.id, bedForm.value)
    showBedModal.value = false
    await loadPatients()
  } catch (err) {
    // Handled in composable
  } finally {
    actionLoading.value = false
  }
}

const openQueueModal = (p: ClerkPatientItem) => {
  activePatient.value = p
  const now = new Date()
  now.setMinutes(now.getMinutes() + 15)
  const isoLocal = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16)

  queueForm.value = {
    doctorId: doctorsList.value[0]?.id || '',
    clinicWardId: p.primaryWardId || (wardsList.value[0]?.id || ''),
    appointmentDate: isoLocal,
    notes: '',
  }
  showQueueModal.value = true
}

const handleSaveQueue = async () => {
  if (!activePatient.value) return
  actionLoading.value = true
  try {
    await clerk.createAppointment({
      patientId: activePatient.value.id,
      doctorId: queueForm.value.doctorId,
      clinicWardId: queueForm.value.clinicWardId,
      appointmentDate: new Date(queueForm.value.appointmentDate).toISOString(),
      notes: queueForm.value.notes,
    })
    showQueueModal.value = false
  } catch (err) {
    // Handled in composable
  } finally {
    actionLoading.value = false
  }
}
</script>
