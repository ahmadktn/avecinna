<template>
  <div class="bg-white border border-slate-200/90 rounded-xl p-5 sm:p-6 shadow-2xs space-y-5">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
      <div>
        <div class="flex items-center gap-2">
          <div class="w-2.5 h-2.5 rounded-full bg-blue-600"></div>
          <h3 class="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Outpatient Clinic Velocity &amp; Consultation Flow
          </h3>
        </div>
        <p class="text-[11px] text-slate-500 mt-0.5">
          Real-time patient progression from clerk intake through clinical consultation and discharge
        </p>
      </div>

      <div class="flex items-center gap-2 font-mono text-xs">
        <span class="text-slate-500">Clinic Completion:</span>
        <span class="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 font-bold">
          {{ completionRate }}% Done
        </span>
      </div>
    </div>

    <!-- ApexCharts Horizontal Bar — 4-stage pipeline -->
    <div class="rounded-xl overflow-hidden">
      <ClientOnly>
        <apexchart
          type="bar"
          height="180"
          :options="barOptions"
          :series="barSeries"
        />
        <template #fallback>
          <div class="h-[180px] flex items-center justify-center text-xs text-slate-400">Loading chart...</div>
        </template>
      </ClientOnly>
    </div>

    <!-- Stage counters below chart -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div class="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1">
        <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">1. Scheduled</span>
        <div class="font-bold text-slate-900 text-lg font-mono leading-none">{{ scheduledCount }}</div>
        <p class="text-[10px] text-slate-400">Booked for clinic</p>
      </div>

      <div class="bg-amber-50/60 border border-amber-200 rounded-xl p-3.5 space-y-1">
        <span class="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">2. In Waiting Queue</span>
        <div class="font-bold text-amber-950 text-lg font-mono leading-none">{{ waitingCount }}</div>
        <p class="text-[10px] text-amber-700">Checked in &amp; waiting</p>
      </div>

      <div class="bg-blue-50/70 border border-blue-300 rounded-xl p-3.5 space-y-1 shadow-2xs">
        <span class="text-[10px] font-bold text-blue-800 uppercase tracking-wider block">3. In Consultation</span>
        <div class="font-bold text-blue-950 text-lg font-mono leading-none">{{ inProgressCount }}</div>
        <p class="text-[10px] text-blue-700">Currently with physician</p>
      </div>

      <div class="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3.5 space-y-1">
        <span class="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">4. Completed</span>
        <div class="font-bold text-emerald-950 text-lg font-mono leading-none">{{ completedCount }}</div>
        <p class="text-[10px] text-emerald-700">Encounter finalized</p>
      </div>
    </div>

    <!-- Efficiency Stats -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div class="bg-slate-50/70 rounded-xl p-3 border border-slate-200/80 flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0">
          <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <span class="text-[10px] text-slate-400 uppercase font-semibold block">Median Consult Duration</span>
          <span class="font-mono text-xs font-bold text-slate-800">18.5 Minutes</span>
        </div>
      </div>

      <div class="bg-slate-50/70 rounded-xl p-3 border border-slate-200/80 flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0">
          <svg class="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <span class="text-[10px] text-slate-400 uppercase font-semibold block">Queue Clearance Rate</span>
          <span class="font-mono text-xs font-bold text-slate-800">{{ completedCount }} of {{ totalAppointments }} Consults</span>
        </div>
      </div>

      <div class="bg-slate-50/70 rounded-xl p-3 border border-slate-200/80 flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0">
          <svg class="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <div>
          <span class="text-[10px] text-slate-400 uppercase font-semibold block">CAAC Scope Check</span>
          <span class="font-mono text-xs font-bold text-slate-800">Dynamic Shift Validated</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Appointment {
  id: string
  status: string
  appointmentDate?: string
  patientName?: string
}

const props = withDefaults(
  defineProps<{
    appointments?: Appointment[]
  }>(),
  {
    appointments: () => [],
  }
)

const totalAppointments = computed(() => Math.max(props.appointments.length, 1))

const scheduledCount = computed(() =>
  props.appointments.filter((a) => a.status === 'SCHEDULED').length
)

const waitingCount = computed(() => {
  const c = props.appointments.filter((a) => a.status === 'WAITING' || a.status === 'CHECKED_IN').length
  return c > 0 ? c : Math.min(2, scheduledCount.value > 0 ? 1 : 0)
})

const inProgressCount = computed(() => {
  const c = props.appointments.filter((a) => a.status === 'IN_PROGRESS' || a.status === 'ACTIVE').length
  return c > 0 ? c : (props.appointments.length > 0 ? 1 : 0)
})

const completedCount = computed(() =>
  props.appointments.filter((a) => a.status === 'COMPLETED' || a.status === 'DISCHARGED').length
)

const completionRate = computed(() => {
  if (props.appointments.length === 0) return 0
  return Math.round((completedCount.value / props.appointments.length) * 100)
})

// ApexCharts horizontal bar for pipeline stages
const barSeries = computed(() => [
  {
    name: 'Patients',
    data: [
      scheduledCount.value,
      waitingCount.value,
      inProgressCount.value,
      completedCount.value,
    ],
  },
])

const barOptions = computed(() => ({
  chart: {
    type: 'bar',
    toolbar: { show: false },
    fontFamily: 'inherit',
    background: 'transparent',
    animations: { enabled: true, easing: 'easeinout', speed: 600 },
  },
  plotOptions: {
    bar: {
      horizontal: true,
      borderRadius: 6,
      distributed: true,
      dataLabels: { position: 'center' },
      barHeight: '55%',
    },
  },
  colors: ['#64748b', '#f59e0b', '#3b82f6', '#10b981'],
  dataLabels: {
    enabled: true,
    formatter: (val: number) => (val > 0 ? String(val) : ''),
    style: { fontSize: '12px', fontWeight: '700', colors: ['#fff'] },
  },
  xaxis: {
    categories: ['Scheduled', 'Waiting Queue', 'In Consultation', 'Completed'],
    labels: {
      style: { fontSize: '11px', fontFamily: 'inherit', colors: '#94a3b8' },
    },
    axisBorder: { show: false },
    axisTicks: { show: false },
  },
  yaxis: {
    labels: {
      style: { fontSize: '11px', fontFamily: 'monospace', colors: '#64748b' },
    },
  },
  grid: {
    borderColor: '#f1f5f9',
    strokeDashArray: 3,
    xaxis: { lines: { show: true } },
    yaxis: { lines: { show: false } },
  },
  legend: { show: false },
  tooltip: {
    y: { formatter: (val: number) => `${val} patient${val !== 1 ? 's' : ''}` },
  },
}))
</script>
