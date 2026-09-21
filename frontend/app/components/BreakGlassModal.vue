<template>
  <div
    v-if="isOpen"
    @click.self="close"
    class="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
  >
    <div
      class="bg-white rounded-2xl sm:rounded-3xl max-w-xl w-full p-5 sm:p-7 shadow-2xl border border-slate-200 relative my-6 sm:my-8 max-h-[90vh] overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <!-- Close X Button -->
      <button
        @click="close"
        class="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
        aria-label="Close modal"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <!-- Modal Header -->
      <div class="flex items-center gap-3 mb-5">
        <div class="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200 shadow-xs">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>

        <div>
          <h3 class="text-base font-bold text-slate-900 tracking-tight">Emergency Break-Glass</h3>
        </div>
      </div>

      <!-- Target Patient Selection (when opened from global navbar) -->
      <div v-if="!props.patientId" class="mb-5 space-y-1.5">
        <label class="block text-xs font-bold text-slate-700">
          Target Patient ID / MRN <span class="text-red-500">*</span>
        </label>
        <input
          v-model="targetPatientId"
          type="text"
          placeholder="Enter Patient ID or MRN (e.g. MRN-99201)"
          class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-amber-500"
        />
      </div>

      <!-- Tab Selectors -->
      <div class="flex bg-slate-100 p-1.5 rounded-2xl mb-5">
        <button
          type="button"
          @click="activeTab = 'tier1'"
          class="flex-1 text-xs font-semibold py-2 px-3 rounded-xl transition-all cursor-pointer"
          :class="activeTab === 'tier1' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'"
        >
          Tier 1: Instant Resuscitation
        </button>
        <button
          type="button"
          @click="activeTab = 'tier2'"
          class="flex-1 text-xs font-semibold py-2 px-3 rounded-xl transition-all cursor-pointer"
          :class="activeTab === 'tier2' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'"
        >
          Tier 2: Full Record Unlock
        </button>
      </div>

      <!-- Error Banner -->
      <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 p-3.5 rounded-2xl text-xs mb-5 flex items-start gap-2.5">
        <svg class="w-4 h-4 text-red-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>{{ error }}</span>
      </div>

      <!-- TIER 1 CONTENT (Instant Resuscitation Telemetry) -->
      <div v-if="activeTab === 'tier1'" class="space-y-4">
        <!-- Tier 1 Result Telemetry Card -->
        <div v-if="tier1Result" class="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4">
          <!-- Patient Identity & Blood Group -->
          <div class="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200">
            <div>
              <h4 class="font-bold text-slate-900 text-sm">{{ tier1Result.emergencySummary.fullName || 'Patient Emergency Summary' }}</h4>
              <p class="text-xs text-slate-500 font-mono">
                MRN: <strong class="text-slate-800">{{ tier1Result.emergencySummary.mrn }}</strong> · DOB: {{ tier1Result.emergencySummary.dateOfBirth }} · Gender: {{ tier1Result.emergencySummary.gender }}
              </p>
            </div>
            <div class="flex items-center gap-2">
              <span class="bg-red-100 text-red-700 font-bold font-mono text-xs px-2.5 py-1 rounded-lg border border-red-200">
                Blood: {{ tier1Result.emergencySummary.bloodGroup || 'O+' }}
              </span>
              <span class="bg-slate-900 text-white font-bold font-mono text-xs px-2.5 py-1 rounded-lg">
                {{ tier1Result.emergencySummary.codeStatus || 'FULL CODE' }}
              </span>
            </div>
          </div>

          <!-- Bedside Physiological Vitals Grid -->
          <div class="space-y-1.5">
            <span class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Bedside Physiological Vitals</span>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div class="bg-white p-2.5 rounded-xl border border-slate-200 text-center">
                <span class="text-[10px] font-bold text-slate-400 block uppercase">Blood Pressure</span>
                <span class="text-sm font-bold font-mono text-slate-900">{{ tier1Result.emergencySummary.vitals?.bp || '120/80' }}</span>
              </div>
              <div class="bg-white p-2.5 rounded-xl border border-slate-200 text-center">
                <span class="text-[10px] font-bold text-slate-400 block uppercase">Heart Rate</span>
                <span class="text-sm font-bold font-mono" :class="Number(tier1Result.emergencySummary.vitals?.hr) > 100 ? 'text-red-600' : 'text-slate-900'">
                  {{ tier1Result.emergencySummary.vitals?.hr || '72' }} <span class="text-[10px] font-normal text-slate-400">bpm</span>
                </span>
              </div>
              <div class="bg-white p-2.5 rounded-xl border border-slate-200 text-center">
                <span class="text-[10px] font-bold text-slate-400 block uppercase">Oxygen (SpO2)</span>
                <span class="text-sm font-bold font-mono" :class="Number(tier1Result.emergencySummary.vitals?.spo2) < 95 ? 'text-amber-600' : 'text-slate-900'">
                  {{ tier1Result.emergencySummary.vitals?.spo2 || '98' }}%
                </span>
              </div>
              <div class="bg-white p-2.5 rounded-xl border border-slate-200 text-center">
                <span class="text-[10px] font-bold text-slate-400 block uppercase">Temperature</span>
                <span class="text-sm font-bold font-mono text-slate-900">{{ tier1Result.emergencySummary.vitals?.temp || '37.0' }}°C</span>
              </div>
            </div>
          </div>

          <!-- Severe Allergies Ribbon -->
          <div class="space-y-1.5">
            <span class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Critical Allergies &amp; Contraindications</span>
            <div class="p-2.5 bg-red-50/70 border border-red-200 rounded-xl flex flex-wrap items-center gap-2">
              <template v-if="parsedTier1Allergies.length > 0">
                <span
                  v-for="(allergy, idx) in parsedTier1Allergies"
                  :key="idx"
                  class="bg-red-100 text-red-800 border border-red-300 px-2 py-0.5 rounded-lg text-xs font-bold flex items-center gap-1.5"
                >
                  <svg class="w-3.5 h-3.5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>{{ allergy }}</span>
                </span>
              </template>
              <span v-else class="text-xs text-slate-600 italic">No known documented lethal drug allergies (NKDA)</span>
            </div>
          </div>

          <!-- Active Emergency Medications -->
          <div v-if="parsedTier1Meds.length > 0" class="space-y-1.5">
            <span class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Current Active Medications</span>
            <div class="p-2.5 bg-white border border-slate-200 rounded-xl flex flex-wrap gap-2">
              <span
                v-for="(med, idx) in parsedTier1Meds"
                :key="idx"
                class="bg-slate-100 text-slate-800 text-xs px-2.5 py-1 rounded-lg font-mono font-medium"
              >
                {{ typeof med === 'string' ? med : (med.name || med.medication || JSON.stringify(med)) }}
              </span>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-between pt-3 border-t border-slate-100 gap-3">
          <button
            v-if="tier1Result"
            type="button"
            @click="activeTab = 'tier2'"
            class="text-xs font-bold text-amber-700 hover:text-amber-800 transition-colors cursor-pointer"
          >
            <span>Escalate to Tier 2 (Full Chart) &rarr;</span>
          </button>
          <div v-else></div>

          <div class="flex items-center gap-2">
            <button
              type="button"
              @click="close"
              class="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              {{ tier1Result ? 'Done' : 'Cancel' }}
            </button>
            <button
              v-if="!tier1Result"
              type="button"
              @click="handleTier1"
              :disabled="loading"
              class="bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-semibold text-xs px-5 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer"
            >
              <span v-if="loading" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              <span>{{ loading ? 'Loading...' : 'Display Emergency Summary' }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- TIER 2 CONTENT (Full Record Unlock) -->
      <div v-if="activeTab === 'tier2'" class="space-y-4">
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1.5">
            Clinical Justification <span class="text-red-500">*</span>
          </label>
          <textarea
            v-model="justificationReason"
            rows="3"
            placeholder="Enter clinical reason (e.g. Acute emergency resuscitation in trauma bay)."
            class="w-full bg-slate-50 border border-slate-300 rounded-2xl p-3.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 transition-all leading-relaxed"
          ></textarea>

          <div class="flex justify-between items-center text-[11px] text-slate-400 mt-1 px-1">
            <span>Minimum 10 characters required</span>
            <span :class="justificationReason.length >= 10 ? 'text-emerald-600 font-semibold' : 'text-slate-400'">
              {{ justificationReason.length }} characters
            </span>
          </div>
        </div>

        <div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            @click="close"
            class="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            @click="handleTier2"
            :disabled="loading || justificationReason.length < 10"
            class="bg-amber-600 hover:bg-amber-700 active:bg-amber-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-xs px-5 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer"
          >
            <span v-if="loading" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            <span>{{ loading ? 'Unlocking...' : 'Confirm Full Unlock & Open Chart' }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useBreakGlass, type Tier1BreakGlassResponse, type Tier2BreakGlassResponse } from '~/composables/useBreakGlass'
import { triggerGlobalRefresh } from '~/composables/useAutoRefresh'

const props = withDefaults(
  defineProps<{
    isOpen: boolean
    patientId?: string
  }>(),
  {
    patientId: '',
  }
)

const emit = defineEmits(['close', 'unlocked'])

const router = useRouter()
const breakGlass = useBreakGlass()
const activeTab = ref<'tier1' | 'tier2'>('tier1')
const targetPatientId = ref(props.patientId || '')
const justificationReason = ref('')
const tier1Result = ref<Tier1BreakGlassResponse | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

const parsedTier1Allergies = computed<string[]>(() => {
  if (!tier1Result.value?.emergencySummary) return []
  const al = (tier1Result.value.emergencySummary as any).allergies
  if (Array.isArray(al)) return al
  if (al?.allergies && Array.isArray(al.allergies)) return al.allergies
  if (typeof al === 'string') return [al]
  return []
})

const parsedTier1Meds = computed<any[]>(() => {
  if (!tier1Result.value?.emergencySummary) return []
  const meds = (tier1Result.value.emergencySummary as any).activeMedications
  if (Array.isArray(meds)) return meds
  return []
})

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && props.isOpen) {
    close()
  }
}

watch(
  () => props.patientId,
  (val) => {
    targetPatientId.value = val || ''
  }
)

watch(
  () => props.isOpen,
  (open) => {
    if (typeof document !== 'undefined') {
      if (open) {
        targetPatientId.value = props.patientId || ''
        tier1Result.value = null
        error.value = null
        document.body.style.overflow = 'hidden'
        window.addEventListener('keydown', handleKeyDown)
      } else {
        // Instant revocation on modal close: wipe all retrieved data
        tier1Result.value = null
        error.value = null
        document.body.style.overflow = ''
        window.removeEventListener('keydown', handleKeyDown)
      }
    }
  }
)

onUnmounted(() => {
  tier1Result.value = null
  if (typeof document !== 'undefined') {
    document.body.style.overflow = ''
    window.removeEventListener('keydown', handleKeyDown)
  }
})

// Instant access revocation: completely clears retrieved emergency data from memory
const close = () => {
  tier1Result.value = null
  error.value = null
  justificationReason.value = ''
  emit('close')
}

const handleTier1 = async () => {
  const pid = targetPatientId.value || props.patientId
  if (!pid) {
    error.value = 'Target Patient ID or MRN is required.'
    return
  }
  loading.value = true
  error.value = null
  try {
    const res = await breakGlass.triggerTier1(pid)
    tier1Result.value = res
    triggerGlobalRefresh()
  } catch (err: any) {
    error.value = err.message || 'Emergency request failed'
  } finally {
    loading.value = false
  }
}

const handleTier2 = async () => {
  const pid = targetPatientId.value || props.patientId
  if (!pid) {
    error.value = 'Target Patient ID or MRN is required.'
    return
  }
  loading.value = true
  error.value = null
  try {
    const res: Tier2BreakGlassResponse = await breakGlass.triggerTier2(pid, justificationReason.value)
    emit('unlocked', res)
    triggerGlobalRefresh()
    close()
    // Navigate immediately to patient profile
    router.push(`/patients/${pid}`)
  } catch (err: any) {
    error.value = err.message || 'Tier 2 unlock failed'
  } finally {
    loading.value = false
  }
}
</script>
