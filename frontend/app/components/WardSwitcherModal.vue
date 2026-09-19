<template>
  <div
    v-if="isOpen"
    @click.self="close"
    class="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
  >
    <div
      class="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full p-5 sm:p-8 shadow-2xl border border-slate-200 relative my-6 sm:my-8 max-h-[90vh] overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <!-- Close X Button -->
      <button
        type="button"
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
        <div class="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        </div>
        <div>
          <h3 class="text-lg font-bold text-slate-900 tracking-tight">Switch Working Ward</h3>
          <p class="text-xs text-slate-500 mt-1 leading-relaxed">
            Changing your active ward dynamically updates Context-Aware Access Control (CAAC) authorization rules for in-ward patient records.
          </p>
        </div>
      </div>

      <!-- Error message -->
      <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl text-xs mb-6 flex items-start gap-2.5">
        <svg class="w-4 h-4 text-red-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>{{ error }}</span>
      </div>

      <!-- Loading State -->
      <div v-if="fetchingWards" class="py-12 flex flex-col items-center justify-center gap-3 text-slate-500 text-xs">
        <div class="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <span>Loading hospital wards...</span>
      </div>

      <!-- Ward Options List -->
      <div v-else-if="availableWards.length > 0" class="space-y-3 mb-8 max-h-72 overflow-y-auto pr-1">
        <div
          v-for="ward in availableWards"
          :key="ward.id"
          @click="selectWard(ward.id)"
          class="p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group"
          :class="isCurrentWard(ward.id) ? 'bg-blue-50/70 border-blue-500 ring-2 ring-blue-500/20 text-blue-950 shadow-sm' : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50/50 text-slate-800'"
        >
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <p class="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{{ ward.name }}</p>
              <span
                v-if="isCurrentWard(ward.id)"
                class="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full"
              >
                Current Active
              </span>
            </div>
            <p class="text-xs text-slate-500 font-mono">Ward Code: {{ ward.code }} | Department: {{ ward.department }}</p>
          </div>

          <div
            v-if="isCurrentWard(ward.id)"
            class="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div
            v-else
            class="w-6 h-6 rounded-full border border-slate-300 group-hover:border-blue-400 flex items-center justify-center shrink-0 transition-colors"
          >
            <svg class="w-3 h-3 text-transparent group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="py-8 text-center text-xs text-slate-500 bg-slate-50 rounded-2xl mb-6">
        No active wards found in database.
      </div>

      <!-- Modal Footer Actions -->
      <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
        <button
          type="button"
          @click="close"
          class="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useAuth, type Ward } from '~/composables/useAuth'
import { useAdmin } from '~/composables/useAdmin'

const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'switched', ward: Ward): void
}>()

const auth = useAuth()
const admin = useAdmin()

const activeWard = computed(() => auth.activeWard.value)
const availableWards = ref<Ward[]>([])
const fetchingWards = ref(false)
const loading = ref(false)
const error = ref<string | null>(null)

const isCurrentWard = (wardId: string) => {
  return activeWard.value !== null && activeWard.value.id === wardId
}

const loadWards = async () => {
  fetchingWards.value = true
  error.value = null
  try {
    const list = await admin.fetchWards()
    availableWards.value = list
  } catch (err: any) {
    error.value = err.message || 'Failed to load hospital wards from database'
  } finally {
    fetchingWards.value = false
  }
}

onMounted(() => {
  loadWards()
})

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
        if (availableWards.value.length === 0) {
          loadWards()
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

const close = () => {
  error.value = null
  emit('close')
}

const selectWard = async (wardId: string) => {
  if (activeWard.value && activeWard.value.id === wardId) {
    close()
    return
  }

  loading.value = true
  error.value = null
  try {
    const res = await auth.switchWard(wardId)
    emit('switched', res.activeWard)
    close()
  } catch (err: any) {
    error.value = err.message || 'Failed to switch working ward'
  } finally {
    loading.value = false
  }
}
</script>
