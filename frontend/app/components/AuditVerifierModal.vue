<template>
  <div
    v-if="isOpen"
    @click.self="close"
    class="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
  >
    <div
      class="bg-white rounded-3xl max-w-xl w-full p-8 shadow-2xl border border-slate-200 relative my-8"
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

      <!-- Header -->
      <div class="flex items-start gap-4 mb-6">
        <div class="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100 shadow-xs">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <div>
          <h3 class="text-lg font-bold text-slate-900 tracking-tight">Cryptographic Ledger Inspector</h3>
          <p class="text-xs text-slate-500 mt-1 leading-relaxed">
            Real-time verification over sequential SHA-256 block hash chain and Merkle Tree Root in <code class="font-mono bg-slate-100 px-1 py-0.5 rounded text-[11px]">avecinna_audit_db</code>.
          </p>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="py-12 text-center text-slate-600 text-xs space-y-3">
        <div class="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p class="font-medium text-slate-800">Verifying sequential block hashes...</p>
        <p class="text-[11px] text-slate-400 font-mono">Traversing $O(1)$ Hash Chain & Computing $O(\log N)$ Binary Merkle Root</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-red-50 border border-red-200 text-red-700 p-5 rounded-2xl text-xs mb-6 space-y-2">
        <p class="font-bold flex items-center gap-1.5 text-sm">
          <svg class="w-4 h-4 text-red-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Verification Failed:
        </p>
        <p class="text-red-800">{{ error }}</p>
      </div>

      <!-- Result View -->
      <div v-else-if="result" class="space-y-6">
        <!-- Status Badge Container -->
        <div
          class="p-5 rounded-2xl border flex items-start gap-4"
          :class="result.valid ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950' : 'bg-red-50/80 border-red-200 text-red-950'"
        >
          <div
            class="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-xs"
            :class="result.valid ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'"
          >
            <svg v-if="result.valid" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
            </svg>
            <svg v-else class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>

          <div>
            <h4 class="font-bold text-sm">{{ result.valid ? '100% Cryptographically Intact' : 'CRITICAL TAMPERING DETECTED' }}</h4>
            <p class="text-xs mt-1 leading-relaxed opacity-90">{{ result.message }}</p>
          </div>
        </div>

        <!-- Metadata Cards -->
        <div class="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-xs space-y-4 font-mono">
          <div class="flex justify-between items-center pb-3 border-b border-slate-200 font-sans">
            <span class="text-slate-500 font-medium">Total Sequential Blocks Verified</span>
            <span class="font-bold text-slate-900 font-mono text-sm px-2.5 py-0.5 bg-white border border-slate-200 rounded-lg">
              {{ result.totalBlocks }} blocks
            </span>
          </div>

          <div>
            <div class="flex justify-between items-center mb-1.5 font-sans">
              <span class="text-slate-500 font-medium">Binary Merkle Tree Root Hash</span>
              <button
                type="button"
                @click="copyRootHash(result.merkleRoot)"
                class="text-[11px] text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span>{{ copied ? 'Copied!' : 'Copy Hash' }}</span>
              </button>
            </div>
            <div class="text-[11px] text-blue-800 break-all select-all font-mono font-bold bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
              {{ result.merkleRoot }}
            </div>
          </div>
        </div>
      </div>

      <!-- Footer Buttons -->
      <div class="mt-8 flex items-center justify-between pt-4 border-t border-slate-100">
        <button
          type="button"
          @click="runVerification"
          :disabled="loading"
          class="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-semibold transition-all shadow-xs flex items-center gap-2"
        >
          <span v-if="loading" class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
          <span>Re-verify Ledger</span>
        </button>
        <button
          type="button"
          @click="close"
          class="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue'
import { useAudit, type AuditVerificationResult } from '~/composables/useAudit'

const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits(['close'])

const audit = useAudit()
const result = ref<AuditVerificationResult | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
const copied = ref(false)

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && props.isOpen) {
    close()
  }
}

watch(
  () => props.isOpen,
  (newVal) => {
    if (typeof document !== 'undefined') {
      if (newVal) {
        document.body.style.overflow = 'hidden'
        window.addEventListener('keydown', handleKeyDown)
        if (!result.value) {
          runVerification()
        }
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

const copyRootHash = async (hash: string) => {
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    await navigator.clipboard.writeText(hash)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  }
}

const runVerification = async () => {
  loading.value = true
  error.value = null
  try {
    const res = await audit.verifyAuditLedger()
    result.value = res
  } catch (err: any) {
    error.value = err.message || 'Ledger verification failed'
  } finally {
    loading.value = false
  }
}

const close = () => {
  emit('close')
}
</script>
