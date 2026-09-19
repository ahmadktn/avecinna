<template>
  <div class="min-h-screen bg-slate-50 font-sans">
    <AppSidebar />

    <div class="pl-64 lg:pl-72 flex flex-col min-h-screen">
      <AppNavbar
        @openWardSwitcher="showWardSwitcher = true"
        @openBreakGlass="showBreakGlassModal = true"
      />

      <main class="flex-1 w-full px-8 py-6 space-y-6">
        <!-- Error Banner -->
        <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl text-xs flex items-center justify-between shadow-2xs">
          <div class="flex items-center gap-2.5">
            <svg class="w-4 h-4 text-red-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{{ error }}</span>
          </div>
          <button @click="loadAppointments" class="underline font-bold hover:text-red-900 cursor-pointer">Retry</button>
        </div>

        <!-- Clean Page Header -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 class="text-xl font-bold text-slate-900 tracking-tight">Outpatient Consultation Schedule</h1>
            <p class="text-xs text-slate-500 mt-0.5">
              Consultation queue and clinical encounters for <strong class="text-slate-800">{{ activeWardCode }}</strong>
            </p>
          </div>

          <NuxtLink
            to="/doctor/encounter"
            class="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all shadow-xs cursor-pointer"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span>Open Clinical Encounter</span>
          </NuxtLink>
        </div>

        <!-- Filters & Search Bar -->
        <div class="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-4">
          <!-- Search Box -->
          <div class="relative flex-1 max-w-sm">
            <svg class="w-4 h-4 text-slate-400 absolute left-3.5 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              v-model="searchQuery"
              @input="onSearchInput"
              type="text"
              placeholder="Search by patient name or MRN..."
              class="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div class="flex flex-wrap items-center gap-3">
            <!-- Date Filter -->
            <div class="flex items-center gap-2">
              <label class="text-xs font-semibold text-slate-500">Date:</label>
              <input
                v-model="selectedDate"
                @change="loadAppointments"
                type="date"
                class="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-blue-500"
              />
              <button
                v-if="selectedDate"
                @click="clearDate"
                class="text-xs text-slate-400 hover:text-slate-700 font-bold"
                title="Clear date filter"
              >
                ✕
              </button>
            </div>

            <!-- Status Tabs -->
            <div class="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold overflow-x-auto">
              <button
                v-for="st in ['all', 'SCHEDULED', 'IN_CONSULTATION', 'COMPLETED', 'CANCELLED']"
                :key="st"
                @click="setStatusFilter(st)"
                class="px-3 py-1.5 rounded-lg capitalize transition-all shrink-0 cursor-pointer"
                :class="statusFilter === st ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'"
              >
                {{ st === 'all' ? 'All' : st.replace('_', ' ').toLowerCase() }}
              </button>
            </div>
          </div>
        </div>

        <!-- Appointments Table -->
        <div class="bg-white border border-slate-200/90 rounded-2xl shadow-2xs overflow-hidden">
          <div v-if="loading && appointmentsList.length === 0" class="p-12 text-center text-xs text-slate-400">
            <div class="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            Loading consultation appointments...
          </div>

          <div v-else-if="appointmentsList.length === 0" class="p-12 text-center text-xs text-slate-400 space-y-1">
            <p class="font-medium text-slate-600">No consultation appointments found.</p>
            <p class="text-[11px] text-slate-400">Try adjusting your filters or date selection.</p>
          </div>

          <div v-else class="overflow-x-auto">
            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr class="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider">
                  <th class="px-5 py-3.5">Patient Details</th>
                  <th class="px-5 py-3.5">MRN & Gender</th>
                  <th class="px-5 py-3.5">Appointment Time</th>
                  <th class="px-5 py-3.5">Ward / Clinic</th>
                  <th class="px-5 py-3.5">Status</th>
                  <th class="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr
                  v-for="app in appointmentsList"
                  :key="app.id"
                  class="hover:bg-slate-50/80 transition-colors"
                >
                  <!-- Patient -->
                  <td class="px-5 py-4">
                    <div class="flex items-center gap-3">
                      <div class="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs font-mono shrink-0">
                        {{ getInitials(app.patientName) }}
                      </div>
                      <NuxtLink :to="`/patients/${app.patientId}`" class="font-bold text-slate-900 hover:text-blue-600 transition-colors">
                        {{ app.patientName }}
                      </NuxtLink>
                    </div>
                  </td>

                  <!-- MRN & Gender -->
                  <td class="px-5 py-4 font-mono text-slate-600">
                    <span class="font-bold text-slate-800">{{ app.patientMrn }}</span>
                    <span class="text-slate-400 ml-1.5" v-if="app.patientGender">({{ app.patientGender }})</span>
                  </td>

                  <!-- Appointment Time -->
                  <td class="px-5 py-4 font-mono text-slate-700">
                    <div class="font-bold">{{ formatDateTime(app.appointmentDate).date }}</div>
                    <div class="text-[11px] text-slate-400">{{ formatDateTime(app.appointmentDate).time }}</div>
                  </td>

                  <!-- Clinic / Ward -->
                  <td class="px-5 py-4 text-slate-700 font-mono">
                    <span class="bg-slate-100 px-2 py-0.5 rounded text-xs">
                      {{ app.wardCode || '3W' }}
                    </span>
                  </td>

                  <!-- Status -->
                  <td class="px-5 py-4">
                    <span
                      class="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full"
                      :class="getStatusBadgeClass(app.status)"
                    >
                      {{ app.status }}
                    </span>
                  </td>

                  <!-- Actions -->
                  <td class="px-5 py-4 text-right">
                    <div class="flex items-center justify-end gap-2">
                      <NuxtLink
                        :to="`/doctor/encounter?appointmentId=${app.id}&patientId=${app.patientId}`"
                        class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-xs transition-colors shadow-2xs inline-flex items-center gap-1.5 cursor-pointer"
                        title="Open consultation encounter"
                      >
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        <span>Encounter</span>
                      </NuxtLink>

                      <select
                        :value="app.status"
                        @change="handleStatusChange(app.id, ($event.target as HTMLSelectElement).value)"
                        class="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 focus:outline-none focus:border-blue-500 font-medium cursor-pointer"
                      >
                        <option value="SCHEDULED">Scheduled</option>
                        <option value="IN_CONSULTATION">In Consultation</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="CANCELLED">Cancelled</option>
                      </select>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination Footer -->
          <div class="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div>
              Showing <strong class="text-slate-800">{{ (pagination.page - 1) * pagination.limit + (appointmentsList.length > 0 ? 1 : 0) }}</strong> to
              <strong class="text-slate-800">{{ (pagination.page - 1) * pagination.limit + appointmentsList.length }}</strong> of
              <strong class="text-slate-800">{{ pagination.total }}</strong> consultation entries
            </div>

            <div class="flex items-center gap-2">
              <button
                type="button"
                @click="changePage(pagination.page - 1)"
                :disabled="pagination.page <= 1 || loading"
                class="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors shadow-2xs"
              >
                Previous
              </button>
              <span class="px-2 font-mono font-bold text-slate-700">
                {{ pagination.page }} / {{ pagination.totalPages || 1 }}
              </span>
              <button
                type="button"
                @click="changePage(pagination.page + 1)"
                :disabled="pagination.page >= pagination.totalPages || loading"
                class="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors shadow-2xs"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>

    <!-- Modals -->
    <WardSwitcherModal
      :isOpen="showWardSwitcher"
      @close="showWardSwitcher = false"
      @switched="loadAppointments"
    />

    <BreakGlassModal
      :isOpen="showBreakGlassModal"
      @close="showBreakGlassModal = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuth } from '~/composables/useAuth'
import { useClerk } from '~/composables/useClerk'

const auth = useAuth()
const clerkApi = useClerk()

const showWardSwitcher = ref(false)
const showBreakGlassModal = ref(false)

const searchQuery = ref('')
const selectedDate = ref('')
const statusFilter = ref('all')
const currentPage = ref(1)

const loading = computed(() => clerkApi.loading.value)
const error = computed(() => clerkApi.error.value)
const appointmentsList = computed(() => clerkApi.appointments.value)
const pagination = computed(() => clerkApi.pagination.value)

const activeWard = computed(() => auth.activeWard.value)
const activeWardCode = computed(() => activeWard.value?.code || '3W')

let searchTimeout: any = null

const loadAppointments = async () => {
  try {
    await clerkApi.fetchAppointments({
      page: currentPage.value,
      limit: 10,
      status: statusFilter.value,
      date: selectedDate.value || undefined,
      search: searchQuery.value || undefined,
    })
  } catch (err) {
    // Handled in composable
  }
}

const onSearchInput = () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    currentPage.value = 1
    loadAppointments()
  }, 300)
}

const setStatusFilter = (st: string) => {
  statusFilter.value = st
  currentPage.value = 1
  loadAppointments()
}

const clearDate = () => {
  selectedDate.value = ''
  currentPage.value = 1
  loadAppointments()
}

const changePage = (page: number) => {
  currentPage.value = page
  loadAppointments()
}

const handleStatusChange = async (id: string, newStatus: any) => {
  try {
    await clerkApi.updateAppointmentStatus(id, { status: newStatus })
    await loadAppointments()
  } catch (err: any) {
    alert(err.message || 'Failed to update status')
  }
}

const getInitials = (name: string) => {
  if (!name) return 'PT'
  const parts = name.split(' ')
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

const getStatusBadgeClass = (status: string) => {
  if (status === 'COMPLETED') return 'bg-emerald-100 text-emerald-800'
  if (status === 'IN_CONSULTATION') return 'bg-blue-100 text-blue-800'
  if (status === 'SCHEDULED') return 'bg-amber-100 text-amber-800'
  if (status === 'CANCELLED') return 'bg-slate-100 text-slate-600'
  return 'bg-slate-100 text-slate-700'
}

const formatDateTime = (isoString: string) => {
  if (!isoString) return { date: '', time: '' }
  const d = new Date(isoString)
  return {
    date: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    time: d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
  }
}

onMounted(() => {
  loadAppointments()
})
</script>
