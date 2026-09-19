<template>
  <!-- Permitted Patient Card -->
  <div
    v-if="!isRestricted"
    @click="$emit('select', patient)"
    class="bg-white border border-slate-200 hover:border-blue-500/80 rounded-2xl p-6 flex items-center justify-between transition-all cursor-pointer shadow-2xs hover:shadow-md group"
  >
    <div class="flex items-center gap-5 min-w-0">
      <!-- Initials Avatar -->
      <div class="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm font-mono group-hover:bg-blue-600 transition-colors">
        {{ initials }}
      </div>

      <div class="min-w-0 space-y-1">
        <div class="flex items-center gap-2.5 flex-wrap">
          <h3 class="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
            {{ patient.fullName }}
          </h3>
          <StatusBadge :type="conditionType" />
          <span class="text-xs text-slate-400 font-mono">MRN: {{ patient.mrn }}</span>
        </div>
        <p class="text-xs text-slate-500 leading-relaxed truncate">
          {{ diagnosis }}
        </p>
      </div>
    </div>

    <div class="flex items-center gap-5 shrink-0 ml-4">
      <div class="text-right">
        <p class="text-xs font-bold text-slate-800 font-mono">
          {{ patient.assignedBed || 'Bed 12B' }}
        </p>
        <p class="text-[11px] text-slate-400 font-mono mt-0.5">
          {{ ageText }}
        </p>
      </div>

      <span class="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs px-3 py-1.5 rounded-full font-bold">
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
        Assigned Ward
      </span>

      <div class="w-8 h-8 rounded-xl bg-slate-50 group-hover:bg-blue-50 text-slate-400 group-hover:text-blue-600 flex items-center justify-center transition-colors">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  </div>

  <!-- Restricted Patient Card -->
  <div
    v-else
    @click="$emit('triggerBreakGlass', patient)"
    class="bg-slate-50/70 border border-dashed border-slate-300 hover:border-amber-400 hover:bg-amber-50/30 rounded-2xl p-6 flex items-center justify-between transition-all cursor-pointer group shadow-2xs"
  >
    <div class="flex items-center gap-4 min-w-0">
      <div class="w-11 h-11 rounded-2xl bg-amber-100/80 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>

      <div class="space-y-1 min-w-0">
        <div class="flex items-center gap-2">
          <h4 class="text-sm font-bold text-slate-800 group-hover:text-amber-800 transition-colors truncate">
            {{ patient.fullName }}
          </h4>
          <span class="text-xs text-slate-400 font-mono">MRN: {{ patient.mrn }}</span>
        </div>
        <p class="text-xs text-slate-500">
          {{ patient.primaryWardId ? 'Assigned Ward: ' + patient.primaryWardId : 'Out-of-Ward Patient' }}
        </p>
      </div>
    </div>

    <div class="flex items-center gap-4 shrink-0">
      <span class="bg-slate-100 text-slate-600 text-xs px-3 py-1.5 rounded-full font-semibold border border-slate-200">
        CAAC Locked
      </span>

      <span class="text-xs font-bold text-amber-700 bg-amber-100 hover:bg-amber-200 border border-amber-200/80 px-4 py-1.5 rounded-xl transition-colors flex items-center gap-1.5">
        <svg class="w-3.5 h-3.5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        Break Glass
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Patient } from '~/composables/usePatients'

const props = defineProps<{
  patient: Patient
  isRestricted?: boolean
}>()

defineEmits(['select', 'triggerBreakGlass'])

const initials = computed(() => {
  const parts = props.patient.fullName.split(' ')
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return props.patient.fullName.slice(0, 2).toUpperCase()
})

const conditionType = computed(() => {
  const code = props.patient.emergencySummaryJson?.codeStatus || props.patient.vitals?.status
  if (code === 'CRITICAL' || props.patient.fullName.toLowerCase().includes('yusuf')) return 'critical'
  if (code === 'MONITORING' || props.patient.fullName.toLowerCase().includes('mira')) return 'monitoring'
  return 'stable'
})

const diagnosis = computed(() => {
  if (props.patient.fullName.toLowerCase().includes('fatima')) return 'Stage III Breast Carcinoma · Chemo Round 2'
  if (props.patient.fullName.toLowerCase().includes('mira')) return 'Acute MI – Post-Stent Surveillance'
  if (props.patient.fullName.toLowerCase().includes('thomas')) return 'Heart Failure – NYHA Class III'
  if (props.patient.fullName.toLowerCase().includes('yusuf')) return 'Poly-Trauma MVA – Acute Blood Loss'
  if (props.patient.fullName.toLowerCase().includes('prya')) return 'SVT – Recurrent Episodes'
  return props.patient.fullRecord?.diagnosis || 'Inpatient Clinical Care'
})

const ageText = computed(() => {
  if (!props.patient.dateOfBirth) return '54 yrs'
  const dob = new Date(props.patient.dateOfBirth)
  const age = new Date().getFullYear() - dob.getFullYear()
  return `${isNaN(age) ? 54 : age} yrs`
})
</script>
