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

      <!-- Header -->
      <div class="flex items-start gap-4 mb-6">
        <div class="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100 shadow-xs">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
        </div>
        <div>
          <h3 class="text-lg font-bold text-slate-900 tracking-tight">Create Staff User Account</h3>
          <p class="text-xs text-slate-500 mt-1 leading-relaxed">
            Provision new clinician credentials, role privileges, and home ward assignment.
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

      <!-- Form Inputs -->
      <form @submit.prevent="handleSubmit" class="space-y-6 text-xs">
        <!-- Section 1: Credentials -->
        <div class="space-y-4">
          <h4 class="font-bold text-slate-900 uppercase tracking-wider text-[10px] text-slate-400">1. Account Credentials</h4>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Username <span class="text-red-500">*</span></label>
              <input
                v-model="form.username"
                type="text"
                required
                placeholder="e.g. dr_cardio_fellow"
                class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-mono"
              />
            </div>

            <div>
              <label class="block font-semibold text-slate-700 mb-1">Full Name <span class="text-red-500">*</span></label>
              <input
                v-model="form.fullName"
                type="text"
                required
                placeholder="e.g. Dr. Chidi Nnamdi"
                class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>
          </div>

          <div>
            <label class="block font-semibold text-slate-700 mb-1">Temporary Password <span class="text-red-500">*</span></label>
            <input
              v-model="form.password"
              type="password"
              required
              placeholder="Minimum 8 characters"
              class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
          </div>
        </div>

        <!-- Section 2: Hospital Role & Ward -->
        <div class="space-y-4 pt-4 border-t border-slate-100">
          <h4 class="font-bold text-slate-900 uppercase tracking-wider text-[10px] text-slate-400">2. Hospital Role & Assignment</h4>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Role Privilege <span class="text-red-500">*</span></label>
              <select
                v-model="form.role"
                required
                class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-blue-500 transition-all"
              >
                <option value="DOCTOR">Doctor (Clinical Full)</option>
                <option value="NURSE">Nurse (Vitals & Plan)</option>
                <option value="PARAMEDIC">Paramedic (Emergency)</option>
                <option value="CLERK">Clerk (Registration)</option>
                <option value="PHARMACIST">Pharmacist (Meds & Allergies)</option>
                <option value="HEAD_OF_UNIT">Head of Unit (Supervision)</option>
                <option value="ADMIN">System Admin (Settings)</option>
              </select>
            </div>

            <div>
              <label class="block font-semibold text-slate-700 mb-1">Home Ward <span class="text-red-500">*</span></label>
              <select
                v-model="form.homeWardId"
                required
                class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-blue-500 transition-all"
              >
                <option v-for="w in wardsList" :key="w.id" :value="w.id">
                  {{ w.name }} ({{ w.code }})
                </option>
              </select>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-end gap-3 pt-5 border-t border-slate-100">
          <button
            type="button"
            @click="close"
            class="px-5 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="loading"
            class="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white rounded-xl font-semibold transition-all shadow-xs flex items-center gap-2"
          >
            <span v-if="loading" class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            <span>{{ loading ? 'Creating...' : 'Create Account' }}</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useAdmin } from '~/composables/useAdmin'
import type { Ward, User } from '~/composables/useAuth'

const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'created', user: User): void
}>()

const admin = useAdmin()
const wardsList = ref<Ward[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

const form = ref({
  username: '',
  fullName: '',
  password: '',
  role: 'DOCTOR',
  homeWardId: '',
})

const loadWards = async () => {
  try {
    const list = await admin.fetchWards()
    wardsList.value = list
    if (list.length > 0 && !form.value.homeWardId) {
      form.value.homeWardId = list[0].id
    }
  } catch (err: any) {
    error.value = err.message || 'Failed to load hospital wards'
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
        if (wardsList.value.length === 0) {
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

const handleSubmit = async () => {
  loading.value = true
  error.value = null
  try {
    const res = await admin.createUser(form.value)
    emit('created', res)
    close()
  } catch (err: any) {
    error.value = err.message || 'Failed to create user account'
  } finally {
    loading.value = false
  }
}
</script>
