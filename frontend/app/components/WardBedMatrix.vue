<template>
  <div class="bg-white border border-slate-200/90 rounded-xl p-5 sm:p-6 shadow-2xs space-y-5">
    <!-- Header & Acuity Stats -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
      <div>
        <div class="flex items-center gap-2">
          <div class="w-2.5 h-2.5 rounded-full bg-blue-600"></div>
          <h3 class="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Ward Bedside Acuity Heatmap &amp; Census Matrix
          </h3>
        </div>
        <p class="text-[11px] text-slate-500 mt-0.5">
          Real-time bed occupancy and clinical acuity surveillance for {{ wardName }} ({{ wardCode }})
        </p>
      </div>

      <!-- Quick Acuity Counters -->
      <div class="flex flex-wrap items-center gap-2 text-[11px] font-mono">
        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 font-bold">
          <span class="w-2 h-2 rounded-full bg-rose-600 animate-pulse"></span>
          {{ criticalCount }} Critical
        </span>
        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 font-bold">
          <span class="w-2 h-2 rounded-full bg-amber-500"></span>
          {{ monitoringCount }} Monitoring
        </span>
        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold">
          <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
          {{ stableCount }} Stable
        </span>
        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-600 font-bold">
          <span class="w-2 h-2 rounded-full bg-slate-400"></span>
          {{ availableCount }} Available
        </span>
      </div>
    </div>

    <!-- Ward Capacity Multi-Segment Progress Bar -->
    <div class="space-y-1.5">
      <div class="flex items-center justify-between text-[11px] font-mono">
        <span class="text-slate-500">Bed Occupancy Rate: <strong class="text-slate-900">{{ occupancyRate }}%</strong></span>
        <span class="text-slate-500">{{ occupiedCount }} / {{ totalBedsCount }} Total Beds</span>
      </div>
      <div class="w-full h-2.5 bg-slate-100 rounded-full flex overflow-hidden">
        <div
          class="bg-rose-500 h-full transition-all duration-500"
          :style="{ width: `${(criticalCount / totalBedsCount) * 100}%` }"
          title="Critical Patients"
        ></div>
        <div
          class="bg-amber-400 h-full transition-all duration-500"
          :style="{ width: `${(monitoringCount / totalBedsCount) * 100}%` }"
          title="Monitoring Patients"
        ></div>
        <div
          class="bg-emerald-500 h-full transition-all duration-500"
          :style="{ width: `${(stableCount / totalBedsCount) * 100}%` }"
          title="Stable Patients"
        ></div>
      </div>
    </div>

    <!-- Interactive Bed Grid Matrix -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 pt-1">
      <div
        v-for="bed in bedSlots"
        :key="bed.bedLabel"
        class="rounded-xl border p-3.5 transition-all duration-200 flex flex-col justify-between relative group"
        :class="getBedCardClass(bed)"
      >
        <!-- Bed Header (Bed ID + Acuity Badge) -->
        <div class="flex items-center justify-between pb-2 border-b border-slate-100/80">
          <div class="flex items-center gap-1.5">
            <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span class="font-mono text-xs font-bold text-slate-800">{{ bed.bedLabel }}</span>
          </div>

          <span
            class="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
            :class="getAcuityBadgeClass(bed.acuity)"
          >
            {{ bed.acuity }}
          </span>
        </div>

        <!-- Bed Content: Occupied vs Available -->
        <div v-if="bed.patient" class="py-2.5 space-y-2">
          <div>
            <NuxtLink
              :to="`/patients/${bed.patient.id}`"
              class="font-brand text-xs font-bold text-slate-900 hover:text-blue-600 truncate block tracking-tight"
            >
              {{ bed.patient.fullName }}
            </NuxtLink>
            <span class="font-mono text-[10px] text-slate-400">MRN: {{ bed.patient.mrn }}</span>
          </div>

          <!-- Live Bedside Telemetry Chips -->
          <div class="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
            <span class="px-1.5 py-0.5 rounded bg-white/80 border border-slate-200 text-slate-700">
              SpO2: <strong :class="bed.patient.vitals?.spo2 && bed.patient.vitals.spo2 < 92 ? 'text-red-600' : 'text-slate-900'">{{ bed.patient.vitals?.spo2 || 98 }}%</strong>
            </span>
            <span class="px-1.5 py-0.5 rounded bg-white/80 border border-slate-200 text-slate-700">
              HR: <strong :class="bed.patient.vitals?.hr && bed.patient.vitals.hr > 110 ? 'text-red-600' : 'text-slate-900'">{{ bed.patient.vitals?.hr || 74 }}</strong>
            </span>
            <span class="px-1.5 py-0.5 rounded bg-white/80 border border-slate-200 text-slate-700">
              BP: {{ bed.patient.vitals?.bp || '120/80' }}
            </span>
          </div>
        </div>

        <!-- Available Bed State -->
        <div v-else class="py-5 text-center space-y-1">
          <span class="text-xs font-semibold text-slate-400">Vacant Bed Space</span>
          <p class="text-[10px] text-slate-400">Available for triage admission</p>
        </div>

        <!-- Bed Footer Actions -->
        <div v-if="bed.patient" class="pt-2 border-t border-slate-100/80 flex items-center justify-between gap-1.5">
          <button
            type="button"
            @click="$emit('recordVitals', bed.patient.id, bed.patient.fullName)"
            class="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            <span>Vitals</span>
          </button>

          <NuxtLink
            :to="`/patients/${bed.patient.id}`"
            class="text-[11px] font-semibold text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-0.5"
          >
            <span>Chart</span>
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface BedPatient {
  id: string
  fullName: string
  mrn: string
  assignedBed?: string | null
  vitals?: {
    bp?: string
    hr?: number
    spo2?: number
    temp?: string | number
  } | null
}

const props = withDefaults(
  defineProps<{
    patients: BedPatient[]
    wardName?: string
    wardCode?: string
    totalBeds?: number
  }>(),
  {
    wardName: 'General Ward',
    wardCode: 'GW',
    totalBeds: 12,
  }
)

defineEmits<{
  (e: 'recordVitals', patientId: string, patientName: string): void
}>()

const calculateAcuity = (p?: BedPatient | null): 'critical' | 'monitoring' | 'stable' | 'available' => {
  if (!p) return 'available'
  const hr = p.vitals?.hr
  const spo2 = p.vitals?.spo2
  if ((hr && (hr > 110 || hr < 50)) || (spo2 && spo2 < 92)) {
    return 'critical'
  }
  if ((hr && (hr > 95 || hr < 60)) || (spo2 && spo2 < 95)) {
    return 'monitoring'
  }
  return 'stable'
}

const totalBedsCount = computed(() => Math.max(props.totalBeds, props.patients.length || 8))

const bedSlots = computed(() => {
  const slots: Array<{
    bedLabel: string
    patient: BedPatient | null
    acuity: 'critical' | 'monitoring' | 'stable' | 'available'
  }> = []

  const assignedPatients = [...props.patients]

  for (let i = 1; i <= totalBedsCount.value; i++) {
    const pad = i < 10 ? `0${i}` : `${i}`
    const defaultLabel = `${props.wardCode}-BED-${pad}`

    // Check if patient specifically assigned to this bed label
    const patientIndex = assignedPatients.findIndex(
      (p) => p.assignedBed && p.assignedBed.toLowerCase().includes(pad)
    )

    let patient: BedPatient | null = null
    if (patientIndex !== -1) {
      patient = assignedPatients.splice(patientIndex, 1)[0]
    } else if (assignedPatients.length > 0) {
      patient = assignedPatients.shift() || null
    }

    const acuity = calculateAcuity(patient)
    slots.push({
      bedLabel: patient?.assignedBed || defaultLabel,
      patient,
      acuity,
    })
  }

  return slots
})

const occupiedCount = computed(() => bedSlots.value.filter((b) => b.patient !== null).length)
const availableCount = computed(() => totalBedsCount.value - occupiedCount.value)

const criticalCount = computed(() => bedSlots.value.filter((b) => b.acuity === 'critical').length)
const monitoringCount = computed(() => bedSlots.value.filter((b) => b.acuity === 'monitoring').length)
const stableCount = computed(() => bedSlots.value.filter((b) => b.acuity === 'stable').length)

const occupancyRate = computed(() => {
  if (totalBedsCount.value === 0) return 0
  return Math.round((occupiedCount.value / totalBedsCount.value) * 100)
})

const getBedCardClass = (bed: { acuity: string; patient: any }) => {
  if (!bed.patient) {
    return 'bg-slate-50/50 border-dashed border-slate-200 text-slate-400'
  }
  switch (bed.acuity) {
    case 'critical':
      return 'bg-rose-50/50 border-rose-300 shadow-2xs'
    case 'monitoring':
      return 'bg-amber-50/50 border-amber-300 shadow-2xs'
    case 'stable':
    default:
      return 'bg-emerald-50/30 border-emerald-200 shadow-2xs'
  }
}

const getAcuityBadgeClass = (acuity: string) => {
  switch (acuity) {
    case 'critical':
      return 'bg-rose-100 text-rose-800 border border-rose-200'
    case 'monitoring':
      return 'bg-amber-100 text-amber-800 border border-amber-200'
    case 'stable':
      return 'bg-emerald-100 text-emerald-800 border border-emerald-200'
    case 'available':
    default:
      return 'bg-slate-100 text-slate-500 border border-slate-200'
  }
}
</script>
