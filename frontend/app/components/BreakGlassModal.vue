<template>
  <div
    v-if="isOpen"
    @click.self="close"
    class="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
  >
    <div
      class="bg-white rounded-2xl sm:rounded-3xl max-w-xl w-full p-5 sm:p-8 shadow-2xl border border-slate-200 relative my-6 sm:my-8 max-h-[90vh] overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <!-- Close X Button -->
      <button
        @click="close"
        class="absolute top-6 right-6 text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition-colors"
        aria-label="Close modal"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <!-- Modal Header -->
      <div class="flex items-start gap-4 mb-6">
        <div class="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200 shadow-xs">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>

        <div>
          <div class="flex items-center gap-2">
            <h3 class="text-lg font-bold text-slate-900 tracking-tight">Emergency Access (Break-Glass)</h3>
            <span class="bg-amber-100 text-amber-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">Protocol</span>
          </div>
          <p class="text-xs text-slate-500 mt-1 leading-relaxed">
            Override Context-Aware Access Control (CAAC) restrictions for acute out-of-ward patient resuscitation & triage.
          </p>
        </div>
      </div>

      <!-- Tab Selectors -->
      <div class="flex bg-slate-100 p-1.5 rounded-2xl mb-6">
        <button
          type="button"
          @click="activeTab = 'tier1'"
          class="flex-1 text-xs font-semibold py-2.5 px-4 rounded-xl transition-all"
          :class="activeTab === 'tier1' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'"
        >
          Tier 1 (Instant Summary)
        </button>
        <button
          type="button"
          @click="activeTab = 'tier2'"
          class="flex-1 text-xs font-semibold py-2.5 px-4 rounded-xl transition-all"
          :class="activeTab === 'tier2' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'"
        >
          Tier 2 (Full Unlock)
        </button>
      </div>

      <!-- Error Banner -->
      <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl text-xs mb-6 flex items-start gap-2.5">
        <svg class="w-4 h-4 text-red-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>{{ error }}</span>
      </div>

      <!-- Tier 1 Content -->
      <div v-if="activeTab === 'tier1'" class="space-y-6">
        <div class="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-4 text-xs text-blue-900 leading-relaxed flex items-start gap-3">
          <svg class="w-5 h-5 text-blue-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p>
            Tier 1 provides immediate 0-delay access to critical emergency fields (demographics, blood group, allergies, vitals, code status) for acute patients without full chart access.
          </p>
        </div>

        <div v-if="tier1Result" class="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-xs space-y-3">
          <div class="flex items-center justify-between pb-3 border-b border-slate-200">
            <span class="font-bold text-slate-900">Emergency Summary Data</span>
            <span class="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">Retrieved</span>
          </div>
          <div class="grid grid-cols-2 gap-3 font-mono">
            <div class="p-3 bg-white rounded-xl border border-slate-200">
              <span class="text-slate-400 block text-[11px] font-sans">MRN</span>
              <span class="font-bold text-slate-900">{{ tier1Result.emergencySummary.mrn }}</span>
            </div>
            <div class="p-3 bg-white rounded-xl border border-slate-200">
              <span class="text-slate-400 block text-[11px] font-sans">Blood Group</span>
              <span class="font-bold text-red-600">{{ tier1Result.emergencySummary.bloodGroup || 'O+' }}</span>
            </div>
            <div class="p-3 bg-white rounded-xl border border-slate-200">
              <span class="text-slate-400 block text-[11px] font-sans">Code Status</span>
              <span class="font-bold text-slate-900">{{ tier1Result.emergencySummary.codeStatus || 'FULL CODE' }}</span>
            </div>
            <div class="p-3 bg-white rounded-xl border border-slate-200">
              <span class="text-slate-400 block text-[11px] font-sans">Audit Block Hash</span>
              <span class="text-blue-700 text-[11px] truncate block">{{ tier1Result.auditBlockHash.slice(0, 14) }}...</span>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            @click="close"
            class="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Close
          </button>
          <button
            type="button"
            @click="handleTier1"
            :disabled="loading"
            class="bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-semibold text-xs px-6 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-2"
          >
            <span v-if="loading" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            <span>{{ loading ? 'Processing...' : 'Fetch Instant Summary' }}</span>
          </button>
        </div>
      </div>

      <!-- Tier 2 Content -->
      <div v-if="activeTab === 'tier2'" class="space-y-6">
        <div class="bg-amber-50 border border-amber-200 text-amber-900 p-4 rounded-2xl text-xs leading-relaxed flex items-start gap-3">
          <svg class="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <span class="font-bold block mb-1">High-Audit Security Warning</span>
            Activating Tier 2 Break-Glass generates an immutable audit block in <code class="font-mono bg-amber-100 px-1 py-0.5 rounded text-[11px]">avecinna_audit_db</code> and triggers an immediate high-priority alert to the Head of Unit.
          </div>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 mb-2">
            Mandatory Clinical Justification <span class="text-red-500">*</span>
          </label>
          <textarea
            v-model="justificationReason"
            rows="4"
            placeholder="e.g. Acute cardiac arrest in trauma bay requiring urgent full history, contraindication check, and prior ECG scans."
            class="w-full bg-slate-50 border border-slate-300 rounded-2xl p-4 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all leading-relaxed"
          ></textarea>
          <div class="flex justify-between items-center text-[11px] text-slate-400 mt-1.5 px-1">
            <span>Minimum 10 characters required</span>
            <span :class="justificationReason.length >= 10 ? 'text-emerald-600 font-semibold' : 'text-slate-400'">
              {{ justificationReason.length }} characters
            </span>
          </div>
        </div>

        <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            @click="close"
            class="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            @click="handleTier2"
            :disabled="loading || justificationReason.length < 10"
            class="bg-amber-600 hover:bg-amber-700 active:bg-amber-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-xs px-6 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-2"
          >
            <span v-if="loading" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            <span>{{ loading ? 'Unlocking Chart...' : 'Confirm Tier 2 Full Unlock' }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue'
import { useBreakGlass, type Tier1BreakGlassResponse, type Tier2BreakGlassResponse } from '~/composables/useBreakGlass'
import { triggerGlobalRefresh } from '~/composables/useAutoRefresh'

const props = defineProps<{
  isOpen: boolean
  patientId: string
}>()

const emit = defineEmits(['close', 'unlocked'])

const breakGlass = useBreakGlass()
const activeTab = ref<'tier1' | 'tier2'>('tier1')
const justificationReason = ref('')
const tier1Result = ref<Tier1BreakGlassResponse | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && props.isOpen) {
    close()
  }
}

watch(
  () => props.isOpen,
  (open) => {
    if (typeof document !== 'undefined') {
      if (open) {
        document.body.style.overflow = 'hidden'
        window.addEventListener('keydown', handleKeyDown)
      } else {
        document.body.style.overflow = ''
        window.removeEventListener('keydown', handleKeyDown)
      }
    }
  }
)

onUnmounted(() => {
  if (typeof document !== 'undefined') {
    document.body.style.overflow = ''
    window.removeEventListener('keydown', handleKeyDown)
  }
})

const close = () => {
  error.value = null
  justificationReason.value = ''
  tier1Result.value = null
  emit('close')
}

const handleTier1 = async () => {
  loading.value = true
  error.value = null
  try {
    const res = await breakGlass.triggerTier1(props.patientId)
    tier1Result.value = res
    triggerGlobalRefresh()
  } catch (err: any) {
    error.value = err.message || 'Tier 1 Break-Glass failed'
  } finally {
    loading.value = false
  }
}

const handleTier2 = async () => {
  loading.value = true
  error.value = null
  try {
    const res: Tier2BreakGlassResponse = await breakGlass.triggerTier2(props.patientId, justificationReason.value)
    emit('unlocked', res)
    triggerGlobalRefresh()
    close()
  } catch (err: any) {
    error.value = err.message || 'Tier 2 Break-Glass failed'
  } finally {
    loading.value = false
  }
}
</script>
