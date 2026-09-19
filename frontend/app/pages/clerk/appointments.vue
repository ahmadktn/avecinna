<template>
  <div class="min-h-screen bg-slate-50 font-sans">
    <AppSidebar />

    <div class="pl-64 lg:pl-72 flex flex-col min-h-screen">
      <AppNavbar @openWardSwitcher="showWardSwitcher = true" />

      <main class="flex-1 w-full px-8 py-8 space-y-8">
        <!-- Header Title & Action -->
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Outpatient Appointments & Clinic Scheduling</h1>
            <p class="text-xs text-slate-500 mt-1">Book outpatient consultation slots, verify daily clinic roster, and manage check-ins</p>
          </div>

          <button
            type="button"
            @click="showBookingModal = true"
            class="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold px-5 py-3 rounded-2xl transition-all shadow-xs shrink-0 cursor-pointer"
          >
            <svg class="w-4 h-4 text-blue-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
            </svg>
            <span>Book Consultation Slot</span>
          </button>
        </div>

        <!-- Filter & Search Toolbar -->
        <div class="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xs">
          <!-- Search input -->
          <div class="relative w-full sm:w-80">
            <svg class="w-4 h-4 text-slate-400 absolute left-3.5 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search by patient, MRN, or doctor..."
              class="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <!-- Status Filter Tabs -->
          <div class="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold w-full sm:w-auto overflow-x-auto">
            <button
              v-for="filter in ['all', 'SCHEDULED', 'IN_CONSULTATION', 'COMPLETED']"
              :key="filter"
              @click="statusFilter = filter"
              class="px-3.5 py-1.5 rounded-lg capitalize transition-all shrink-0"
              :class="statusFilter === filter ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'"
            >
              {{ filter === 'all' ? 'All Slots' : filter.replace('_', ' ') }}
            </button>
          </div>
        </div>

        <!-- Schedule Appointments Table -->
        <div class="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
          <table class="w-full text-left text-xs">
            <thead>
              <tr class="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <th class="px-6 py-4">PATIENT & MRN</th>
                <th class="px-6 py-4">ATTENDING CLINICIAN</th>
                <th class="px-6 py-4">CLINIC / WARD</th>
                <th class="px-6 py-4 font-mono">APPOINTMENT TIME</th>
                <th class="px-6 py-4 text-right">STATUS</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 font-sans">
              <tr
                v-for="(appt, idx) in filteredAppointments"
                :key="idx"
                class="hover:bg-slate-50/70 transition-colors"
              >
                <td class="px-6 py-4.5 font-bold text-slate-900">
                  {{ appt.patientName }}
                  <span class="block text-[11px] text-slate-400 font-mono font-normal">{{ appt.mrn }}</span>
                </td>
                <td class="px-6 py-4.5 text-slate-800 font-medium">
                  {{ appt.doctorName }}
                </td>
                <td class="px-6 py-4.5 font-mono text-slate-600 text-xs">
                  {{ appt.clinicWard }}
                </td>
                <td class="px-6 py-4.5 font-mono text-slate-500 text-xs">
                  {{ appt.dateTime }}
                </td>
                <td class="px-6 py-4.5 text-right">
                  <span
                    class="text-[10px] font-bold px-3 py-1 rounded-full uppercase inline-block"
                    :class="appt.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-800' : appt.status === 'IN_CONSULTATION' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'"
                  >
                    {{ appt.status.replace('_', ' ') }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </main>
    </div>

    <!-- Book Appointment Sub-Modal -->
    <div
      v-if="showBookingModal"
      @click.self="showBookingModal = false"
      class="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
    >
      <div class="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl border border-slate-200 relative my-8">
        <h3 class="text-lg font-bold text-slate-900 mb-1">Schedule Outpatient Consultation</h3>
        <p class="text-xs text-slate-500 mb-6">Allocate specialist slot and grant temporary same-day outpatient CAAC permit</p>

        <form @submit.prevent="handleCreateAppointment" class="space-y-4 text-xs">
          <div>
            <label class="block font-bold text-slate-700 mb-1">Patient Full Name <span class="text-red-500">*</span></label>
            <input
              v-model="bookingForm.patientName"
              type="text"
              required
              placeholder="e.g. Mira Okonkwo"
              class="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:border-blue-500 font-medium"
            />
          </div>

          <div>
            <label class="block font-bold text-slate-700 mb-1">Patient MRN <span class="text-red-500">*</span></label>
            <input
              v-model="bookingForm.mrn"
              type="text"
              required
              placeholder="e.g. MRN-002914"
              class="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:border-blue-500 font-mono"
            />
          </div>

          <div>
            <label class="block font-bold text-slate-700 mb-1">Attending Doctor <span class="text-red-500">*</span></label>
            <select
              v-model="bookingForm.doctorName"
              required
              class="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:border-blue-500 font-medium"
            >
              <option value="Dr. Serlin Arslan">Dr. Serlin Arslan (Cardiology)</option>
              <option value="Dr. Hakeem Nnadi">Dr. Hakeem Nnadi (Head of Unit)</option>
              <option value="Dr. Fatima Bello">Dr. Fatima Bello (Oncology)</option>
            </select>
          </div>

          <div>
            <label class="block font-bold text-slate-700 mb-1">Appointment Date & Time <span class="text-red-500">*</span></label>
            <input
              v-model="bookingForm.dateTime"
              type="text"
              required
              placeholder="e.g. 2026-03-03 02:00 PM"
              class="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:border-blue-500 font-mono"
            />
          </div>

          <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              @click="showBookingModal = false"
              class="px-5 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-xs"
            >
              Confirm Appointment
            </button>
          </div>
        </form>
      </div>
    </div>

    <WardSwitcherModal :isOpen="showWardSwitcher" @close="showWardSwitcher = false" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const showWardSwitcher = ref(false)
const showBookingModal = ref(false)
const searchQuery = ref('')
const statusFilter = ref('all')

const appointments = ref([
  {
    patientName: 'Mira Okonkwo',
    mrn: 'MRN-002914',
    doctorName: 'Dr. Serlin Arslan',
    clinicWard: 'Cardiology Clinic (3W)',
    dateTime: '2026-03-03 10:00 AM',
    status: 'SCHEDULED',
  },
  {
    patientName: 'Thomas Bergstorm',
    mrn: 'MRN-002915',
    doctorName: 'Dr. Serlin Arslan',
    clinicWard: 'Cardiology Clinic (3W)',
    dateTime: '2026-03-03 11:30 AM',
    status: 'IN_CONSULTATION',
  },
  {
    patientName: 'Fatima Diallo',
    mrn: 'MRN-002916',
    doctorName: 'Dr. Fatima Bello',
    clinicWard: 'Oncology Clinic (5N)',
    dateTime: '2026-03-03 09:15 AM',
    status: 'COMPLETED',
  },
])

const bookingForm = ref({
  patientName: '',
  mrn: '',
  doctorName: 'Dr. Serlin Arslan',
  clinicWard: 'Cardiology Clinic (3W)',
  dateTime: '2026-03-03 02:00 PM',
  status: 'SCHEDULED',
})

const filteredAppointments = computed(() => {
  return appointments.value.filter(a => {
    const q = searchQuery.value.toLowerCase().trim()
    const matchesSearch = !q || a.patientName.toLowerCase().includes(q) || a.mrn.toLowerCase().includes(q) || a.doctorName.toLowerCase().includes(q)
    if (!matchesSearch) return false
    if (statusFilter.value === 'all') return true
    return a.status === statusFilter.value
  })
})

const handleCreateAppointment = () => {
  appointments.value.push({ ...bookingForm.value })
  showBookingModal.value = false
  bookingForm.value.patientName = ''
  bookingForm.value.mrn = ''
}
</script>
