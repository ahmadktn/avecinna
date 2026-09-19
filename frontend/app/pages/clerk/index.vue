<template>
  <div class="space-y-5">
    <!-- Header & Quick Action -->
    <PageHeader
      title="Admissions & Reception Desk"
      description="Real-time hospital census, patient intake, clinic queue, and bed space telemetry"
    >
      <template #actions>
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
          <span>Register Patient</span>
        </NuxtLink>
      </template>
    </PageHeader>

    <!-- Error State -->
    <AlertBanner
      v-if="error"
      variant="error"
      :message="error"
      actionLabel="Retry"
      @action="loadData"
    />

    <!-- 4 Clean Stat KPI Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      <!-- Total Patients -->
      <MetricCard
        label="Total Registered"
        :value="overview?.metrics.totalPatients ?? '-'"
        :subtext="`${overview?.metrics.totalInpatients ?? 0} Inpatients · ${overview?.metrics.totalOutpatients ?? 0} Outpatients`"
      >
        <template #icon>
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </template>
      </MetricCard>

      <!-- Today's Queue -->
      <MetricCard
        label="Today's Clinic Queue"
        :value="overview?.metrics.todayAppointmentsCount ?? 0"
        :subtext="`${overview?.metrics.todayPendingConsultations ?? 0} Waiting · ${overview?.metrics.todayActiveConsultations ?? 0} In Consultation`"
      >
        <template #icon>
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </template>
      </MetricCard>

      <!-- Inpatient Ward Beds -->
      <MetricCard
        label="Admitted Inpatients"
        :value="overview?.metrics.totalInpatients ?? '-'"
        :subtext="`Allocated across ${overview?.metrics.totalWardsCount ?? 0} hospital units`"
      >
        <template #icon>
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </template>
      </MetricCard>

      <!-- Active Doctors -->
      <MetricCard
        label="Attending Clinicians"
        :value="overview?.metrics.activeDoctorsCount ?? '-'"
        subtext="Available for Outpatient Scheduling"
      >
        <template #icon>
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </template>
      </MetricCard>
    </div>

        <!-- 2 Column Section: Ward Bed Space & Today's Clinic Queue -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Ward Inpatient Census Breakdown -->
          <div class="bg-white border border-slate-200/80 rounded-xl p-6 shadow-2xs space-y-5">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-sm font-bold text-slate-900">Ward Inpatient Bed Census</h3>
                <p class="text-xs text-slate-500 mt-0.5">Assigned beds and occupancy across departments</p>
              </div>
              <NuxtLink
                to="/clerk/admissions"
                class="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
              >
                <span>Manage Beds</span>
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </NuxtLink>
            </div>

            <div class="space-y-4 pt-1">
              <div
                v-for="ward in overview?.wardCensus"
                :key="ward.id"
                class="space-y-1.5"
              >
                <div class="flex items-center justify-between text-xs">
                  <span class="font-medium text-slate-800">
                    {{ ward.name }} <span class="text-slate-400 font-mono">({{ ward.code }})</span>
                  </span>
                  <span class="font-mono text-slate-600">
                    {{ ward.assignedBedCount }} Beds · {{ ward.inpatientCount }} Inpatients
                  </span>
                </div>
                <div class="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    class="bg-blue-600 h-full rounded-full transition-all duration-500"
                    :style="{ width: `${Math.max(6, Math.min(100, (ward.inpatientCount / Math.max(1, overview?.metrics.totalInpatients || 1)) * 100))}%` }"
                  ></div>
                </div>
              </div>

              <div v-if="!overview?.wardCensus?.length" class="py-8 text-center text-xs text-slate-400">
                No ward census recorded.
              </div>
            </div>
          </div>

          <!-- Today's Live Consultation Queue -->
          <div class="bg-white border border-slate-200/80 rounded-xl p-6 shadow-2xs space-y-5">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-sm font-bold text-slate-900">Today's Consultation Schedule</h3>
                <p class="text-xs text-slate-500 mt-0.5">Live queue for attending physicians</p>
              </div>
              <NuxtLink
                to="/clerk/appointments"
                class="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
              >
                <span>Full Queue</span>
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </NuxtLink>
            </div>

            <div class="divide-y divide-slate-100">
              <div
                v-for="appt in overview?.todayAppointments"
                :key="appt.id"
                class="py-3 flex items-center justify-between gap-3 text-xs"
              >
                <div class="min-w-0">
                  <p class="font-bold text-slate-900 truncate">{{ appt.patientName }}</p>
                  <p class="text-[11px] text-slate-500">
                    <span class="font-mono text-slate-400">{{ appt.patientMrn }}</span> · {{ appt.doctorName }}
                  </p>
                </div>
                <div class="shrink-0 flex items-center gap-2">
                  <span
                    class="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase"
                    :class="getApptStatusClass(appt.status)"
                  >
                    {{ appt.status.replace('_', ' ') }}
                  </span>
                  <span class="font-mono text-slate-500 text-[11px]">
                    {{ formatTime(appt.appointmentDate) }}
                  </span>
                </div>
              </div>

              <div v-if="!overview?.todayAppointments?.length" class="py-8 text-center text-xs text-slate-400">
                No consultations scheduled for today.
              </div>
            </div>
          </div>
        </div>

        <!-- Recent Patient Registrations Table -->
        <div class="bg-white border border-slate-200/80 rounded-xl p-6 shadow-2xs space-y-5">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 class="text-sm font-bold text-slate-900">Recent Patient Intakes</h3>
              <p class="text-xs text-slate-500 mt-0.5">Most recently registered patients and assigned hospital units</p>
            </div>
            <NuxtLink
              to="/clerk/patients"
              class="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 self-start sm:self-auto"
            >
              <span>View All Patients</span>
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </NuxtLink>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr class="border-b border-slate-100 text-slate-400 uppercase tracking-wider font-semibold">
                  <th class="py-3 px-3">Patient Name</th>
                  <th class="py-3 px-3 font-mono">MRN</th>
                  <th class="py-3 px-3">Type</th>
                  <th class="py-3 px-3">Gender / DOB</th>
                  <th class="py-3 px-3">Ward</th>
                  <th class="py-3 px-3">Bed</th>
                  <th class="py-3 px-3">Registered</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr
                  v-for="p in overview?.recentRegistrations"
                  :key="p.id"
                  class="hover:bg-slate-50/60 transition-colors"
                >
                  <td class="py-3 px-3 font-bold text-slate-900">{{ p.fullName }}</td>
                  <td class="py-3 px-3 font-mono font-medium text-slate-700">{{ p.mrn }}</td>
                  <td class="py-3 px-3">
                    <span
                      class="px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase"
                      :class="p.patientType === 'INPATIENT' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-slate-100 text-slate-700'"
                    >
                      {{ p.patientType }}
                    </span>
                  </td>
                  <td class="py-3 px-3 text-slate-600 capitalize">
                    {{ p.gender.toLowerCase() }} · <span class="font-mono">{{ p.dateOfBirth }}</span>
                  </td>
                  <td class="py-3 px-3 text-slate-600 font-mono text-xs">
                    {{ p.primaryWardId || '-' }}
                  </td>
                  <td class="py-3 px-3 font-mono text-slate-800 font-medium">
                    {{ p.assignedBed || 'Unallocated' }}
                  </td>
                  <td class="py-3 px-3 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                    {{ formatDate(p.createdAt) }}
                  </td>
                </tr>
                <tr v-if="!overview?.recentRegistrations?.length">
                  <td colspan="7" class="py-8 text-center text-slate-400">No patient registrations recorded yet.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useClerk } from '~/composables/useClerk'

const clerk = useClerk()
const overview = clerk.overview
const loading = clerk.loading
const error = clerk.error

const loadData = async () => {
  try {
    await clerk.fetchOverview()
  } catch (err) {
    // Handled in composable
  }
}

onMounted(() => {
  loadData()
})

const getApptStatusClass = (status: string) => {
  if (status === 'SCHEDULED') return 'bg-blue-100 text-blue-800'
  if (status === 'IN_CONSULTATION') return 'bg-amber-100 text-amber-800'
  if (status === 'COMPLETED') return 'bg-emerald-100 text-emerald-800'
  return 'bg-slate-100 text-slate-600'
}

const formatTime = (iso: string) => {
  if (!iso) return '-'
  const d = new Date(iso)
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

const formatDate = (iso: string) => {
  if (!iso) return '-'
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric' })
}
</script>
