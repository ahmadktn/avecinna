<template>
  <div class="space-y-5">
    <!-- Header Title & Action -->
    <PageHeader
      title="Outpatient Consultation Queue"
      description="Schedule clinic appointments, manage queue check-ins, and grant outpatient CAAC permits"
    >
      <template #actions>
        <button
          type="button"
          @click="loadAppointments"
          :disabled="loading"
          class="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 shadow-2xs flex items-center gap-2 transition-all cursor-pointer"
        >
          <svg class="w-3.5 h-3.5 text-slate-500" :class="{ 'animate-spin': loading }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Refresh</span>
        </button>

        <button
          type="button"
          @click="openBookingModal"
          class="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-xs shrink-0 cursor-pointer"
        >
          <svg class="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
          </svg>
          <span>Add to Queue</span>
        </button>
      </template>
    </PageHeader>

    <!-- Success Toast -->
    <AlertBanner
      v-if="successMessage"
      variant="success"
      :message="successMessage"
      @dismiss="successMessage = null"
    />

    <!-- Filter & Search Toolbar -->
    <FilterToolbar
      v-model="searchQuery"
      placeholder="Search patient, MRN, or doctor..."
      :totalCount="pagination.total"
      @update:modelValue="debouncedSearch"
    >
      <template #filters>
        <div class="flex items-center gap-2 text-xs">
          <span class="text-slate-500 font-semibold">Doctor:</span>
          <select
            v-model="selectedDoctor"
            @change="loadAppointments"
            class="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Doctors</option>
            <option v-for="d in doctorsList" :key="d.id" :value="d.id">
              {{ d.fullName }}
            </option>
          </select>
        </div>

        <!-- Status Filter Tabs -->
        <div class="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold overflow-x-auto">
          <button
            v-for="filter in ['all', 'SCHEDULED', 'IN_CONSULTATION', 'COMPLETED', 'CANCELLED']"
            :key="filter"
            @click="setStatusFilter(filter)"
            class="px-3 py-1.5 rounded-lg capitalize transition-all shrink-0 cursor-pointer"
            :class="statusFilter === filter ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'"
          >
            {{ filter === 'all' ? 'All' : filter.replace('_', ' ').toLowerCase() }}
          </button>
        </div>
      </template>
    </FilterToolbar>

    <!-- Error Alert -->
    <AlertBanner
      v-if="error"
      variant="error"
      :message="error"
      actionLabel="Retry"
      @action="loadAppointments"
    />

        <!-- Schedule Appointments Table -->
        <div class="bg-white border border-slate-200/90 rounded-xl overflow-hidden shadow-2xs">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr class="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                  <th class="px-5 py-3.5">Patient Name</th>
                  <th class="px-5 py-3.5 font-mono">MRN</th>
                  <th class="px-5 py-3.5">Attending Clinician</th>
                  <th class="px-5 py-3.5">Clinic / Ward</th>
                  <th class="px-5 py-3.5 font-mono">Slot Time</th>
                  <th class="px-5 py-3.5">Status</th>
                  <th class="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 font-sans">
                <tr
                  v-for="appt in appointmentsList"
                  :key="appt.id"
                  class="hover:bg-slate-50/70 transition-colors"
                >
                  <td class="px-5 py-3.5 font-bold text-slate-900">
                    {{ appt.patientName }}
                    <span v-if="appt.notes" class="block text-[11px] text-slate-400 font-normal italic">
                      {{ appt.notes }}
                    </span>
                  </td>
                  <td class="px-5 py-3.5 font-mono text-slate-600 font-medium select-all">
                    {{ appt.patientMrn }}
                  </td>
                  <td class="px-5 py-3.5 text-slate-800 font-medium">
                    {{ appt.doctorName }}
                  </td>
                  <td class="px-5 py-3.5 text-slate-700 font-mono text-xs">
                    {{ appt.wardName }} ({{ appt.wardCode }})
                  </td>
                  <td class="px-5 py-3.5 font-mono text-slate-600 text-xs whitespace-nowrap">
                    {{ formatDateTime(appt.appointmentDate) }}
                  </td>
                  <td class="px-5 py-3.5">
                    <span
                      class="text-[10px] font-bold px-2.5 py-0.5 rounded-md uppercase inline-block"
                      :class="getApptStatusBadge(appt.status)"
                    >
                      {{ appt.status.replace('_', ' ') }}
                    </span>
                  </td>
                  <td class="px-5 py-3.5 text-right space-x-1.5 whitespace-nowrap">
                    <button
                      v-if="appt.status === 'SCHEDULED'"
                      type="button"
                      @click="handleUpdateStatus(appt.id, 'IN_CONSULTATION')"
                      class="border border-amber-200 text-amber-800 hover:bg-amber-50 bg-white px-2.5 py-1 rounded-xl text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                    >
                      Check-In
                    </button>
                    <button
                      v-if="appt.status === 'IN_CONSULTATION'"
                      type="button"
                      @click="handleUpdateStatus(appt.id, 'COMPLETED')"
                      class="border border-emerald-200 text-emerald-800 hover:bg-emerald-50 bg-white px-2.5 py-1 rounded-xl text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                    >
                      Complete
                    </button>
                    <button
                      v-if="appt.status === 'SCHEDULED' || appt.status === 'IN_CONSULTATION'"
                      type="button"
                      @click="handleUpdateStatus(appt.id, 'CANCELLED')"
                      class="border border-red-200 text-red-700 hover:bg-red-50 bg-white px-2.5 py-1 rounded-xl text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                  </td>
                </tr>

                <tr v-if="!loading && appointmentsList.length === 0">
                  <td colspan="7" class="py-16 text-center text-slate-400 space-y-2">
                    <svg class="w-10 h-10 text-slate-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p class="font-bold text-slate-600">No consultation appointments found</p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination Footer -->
          <div class="px-5 py-3.5 bg-slate-50/70 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <span class="text-slate-500">
              Showing Page <strong class="text-slate-900">{{ pagination.page }}</strong> of <strong class="text-slate-900">{{ pagination.totalPages || 1 }}</strong> ({{ pagination.total }} total consultations)
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

    <!-- Book Appointment Sub-Modal -->
    <div
      v-if="showBookingModal"
      @click.self="showBookingModal = false"
      class="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
    >
      <div class="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full p-5 sm:p-8 shadow-2xl border border-slate-200 relative max-h-[90vh] overflow-y-auto my-6 sm:my-8">
        <h3 class="text-lg font-bold text-slate-900 mb-1">Schedule Outpatient Consultation</h3>
        <p class="text-xs text-slate-500 mb-6">Allocate specialist slot and grant same-day outpatient CAAC permit</p>

        <form @submit.prevent="handleCreateAppointment" class="space-y-4 text-xs">
          <div>
            <label class="block font-bold text-slate-700 mb-1.5">Select Patient <span class="text-red-500">*</span></label>
            <select
              v-model="bookingForm.patientId"
              required
              class="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:border-blue-500"
            >
              <option v-for="p in allPatients" :key="p.id" :value="p.id">
                {{ p.fullName }} ({{ p.mrn }})
              </option>
            </select>
          </div>

          <div>
            <label class="block font-bold text-slate-700 mb-1.5">Attending Doctor <span class="text-red-500">*</span></label>
            <select
              v-model="bookingForm.doctorId"
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
              v-model="bookingForm.clinicWardId"
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
              v-model="bookingForm.appointmentDate"
              type="datetime-local"
              required
              class="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:border-blue-500 font-mono"
            />
          </div>

          <div>
            <label class="block font-bold text-slate-700 mb-1.5">Clinical Reason / Notes</label>
            <input
              v-model="bookingForm.notes"
              type="text"
              placeholder="e.g. Follow-up consultation, ECG review"
              class="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div class="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              @click="showBookingModal = false"
              class="px-5 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-center cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="actionLoading"
              class="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-xs flex items-center justify-center gap-2 cursor-pointer"
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
import { ref } from 'vue'
import { useClerk } from '~/composables/useClerk'
import { useAutoRefresh, triggerGlobalRefresh } from '~/composables/useAutoRefresh'

const clerk = useClerk()
const appointmentsList = clerk.appointments
const pagination = clerk.pagination
const doctorsList = clerk.doctors
const wardsList = clerk.wards
const allPatients = clerk.patients
const loading = clerk.loading
const error = clerk.error

const showBookingModal = ref(false)
const searchQuery = ref('')
const statusFilter = ref('all')
const selectedDoctor = ref('all')
const actionLoading = ref(false)
const successMessage = ref<string | null>(null)

const bookingForm = ref({
  patientId: '',
  doctorId: '',
  clinicWardId: '',
  appointmentDate: '',
  notes: '',
})

let searchTimeout: any = null
const debouncedSearch = () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    loadAppointments()
  }, 300)
}

const setStatusFilter = (st: string) => {
  statusFilter.value = st
  pagination.value.page = 1
  loadAppointments()
}

const loadAppointments = async () => {
  await clerk.fetchAppointments({
    page: pagination.value.page,
    limit: 15,
    status: statusFilter.value,
    doctorId: selectedDoctor.value,
    search: searchQuery.value,
  })
}

const changePage = (p: number) => {
  pagination.value.page = p
  loadAppointments()
}

const loadInitialData = async () => {
  if (doctorsList.value.length === 0 || wardsList.value.length === 0) {
    await Promise.all([
      clerk.fetchDoctors(),
      clerk.fetchWards(),
      clerk.fetchPatients({ limit: 100 }),
    ])
  }
  await loadAppointments()
}

// Auto-refresh queue when ward changes or every 20s in background
useAutoRefresh(() => loadInitialData(), { interval: 20000 })

const openBookingModal = () => {
  const now = new Date()
  now.setMinutes(now.getMinutes() + 15)
  const isoLocal = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16)

  bookingForm.value = {
    patientId: allPatients.value[0]?.id || '',
    doctorId: doctorsList.value[0]?.id || '',
    clinicWardId: wardsList.value[0]?.id || '',
    appointmentDate: isoLocal,
    notes: '',
  }
  showBookingModal.value = true
}

const handleCreateAppointment = async () => {
  actionLoading.value = true
  try {
    await clerk.createAppointment({
      patientId: bookingForm.value.patientId,
      doctorId: bookingForm.value.doctorId,
      clinicWardId: bookingForm.value.clinicWardId,
      appointmentDate: new Date(bookingForm.value.appointmentDate).toISOString(),
      notes: bookingForm.value.notes,
    })
    showBookingModal.value = false
    successMessage.value = 'Consultation slot confirmed and added to live queue!'
    await loadAppointments()
    triggerGlobalRefresh()
  } catch (err: any) {
    // Handled in composable
  } finally {
    actionLoading.value = false
  }
}

const handleUpdateStatus = async (id: string, status: 'SCHEDULED' | 'IN_CONSULTATION' | 'COMPLETED' | 'CANCELLED') => {
  try {
    await clerk.updateAppointmentStatus(id, { status })
    await loadAppointments()
    triggerGlobalRefresh()
  } catch (err) {
    // Handled in composable
  }
}

const getApptStatusBadge = (status: string) => {
  if (status === 'SCHEDULED') return 'bg-blue-50 text-blue-700 border border-blue-200'
  if (status === 'IN_CONSULTATION') return 'bg-amber-50 text-amber-800 border border-amber-200'
  if (status === 'COMPLETED') return 'bg-emerald-50 text-emerald-800 border border-emerald-200'
  return 'bg-slate-100 text-slate-600'
}

const formatDateTime = (iso: string) => {
  if (!iso) return '-'
  const d = new Date(iso)
  return d.toLocaleString('en-GB', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>
