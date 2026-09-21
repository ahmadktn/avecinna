<template>
  <div class="w-full flex flex-col items-center">
    <!-- Brand Header -->
    <div class="text-center mb-6 flex flex-col items-center">
      <div class="w-12 h-12 rounded-xl bg-slate-900 border border-slate-700/80 p-2 flex items-center justify-center shadow-xl shadow-blue-500/10 mb-3 ring-4 ring-blue-500/10">
        <img src="/avecinna icon.png" alt="Avecinna Icon" class="w-8 h-8 object-contain" />
      </div>
      <h1 class="font-brand text-2xl sm:text-3xl font-bold text-white tracking-tight">Avecinna EMR</h1>
      <p class="text-slate-400 text-xs sm:text-sm mt-1 font-medium">Context-Aware Zero-Trust Electronic Medical Record System</p>
    </div>

    <!-- Login Form Card -->
    <div class="bg-slate-900/95 border border-slate-800 rounded-2xl w-full max-w-xl p-5 sm:p-7 md:p-8 shadow-2xl backdrop-blur-xl">
      <!-- Backend Error Alert -->
      <div v-if="error" class="bg-red-950/80 border border-red-800/80 text-red-200 p-3.5 rounded-xl text-xs mb-5 flex items-start gap-3 shadow-lg animate-fadeIn">
        <svg class="w-5 h-5 text-red-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div class="space-y-0.5">
          <p class="font-semibold text-red-100">Authentication Failed</p>
          <p class="text-red-300 leading-relaxed">{{ error }}</p>
        </div>
      </div>

      <!-- Quick Role Switcher Grid -->
      <div class="mb-5">
        <div class="flex items-center justify-between mb-2">
          <label class="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">Select Demo Persona</label>
          <span class="text-[11px] text-blue-400 font-medium">7 Verified Roles</span>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <button
            v-for="persona in personas"
            :key="persona.username"
            type="button"
            @click="selectPersona(persona)"
            :class="[
              'p-2.5 rounded-xl text-xs font-medium border text-left transition-all duration-150 flex flex-col gap-0.5',
              selectedAccount === persona.username
                ? 'bg-blue-600/20 border-blue-500 text-blue-200 ring-2 ring-blue-500/20 shadow-md shadow-blue-500/10'
                : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
            ]"
          >
            <div class="flex items-center justify-between w-full">
              <span class="font-semibold text-white truncate text-xs">{{ persona.shortName }}</span>
              <span class="text-[9px] px-1.5 py-0.2 rounded bg-slate-700/60 text-slate-300 font-mono">{{ persona.wardCode }}</span>
            </div>
            <span class="text-[10px] text-slate-400 font-normal truncate">{{ persona.roleLabel }}</span>
          </button>
        </div>
      </div>

      <form @submit.prevent="handleLogin" class="space-y-4">
        <!-- Staff Account Details -->
        <div>
          <label class="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Username / Staff ID</label>
          <div class="relative">
            <input
              v-model="username"
              type="text"
              required
              class="w-full bg-slate-800/80 text-white placeholder-slate-500 border border-slate-700 rounded-xl px-4 py-2.5 pl-10 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-mono"
              placeholder="e.g. dr_cardio"
            />
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          </div>
        </div>

        <!-- Password Input -->
        <div>
          <div class="flex items-center justify-between mb-1.5">
            <label class="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">Password</label>
            <span class="text-[10px] font-mono text-slate-500">Default: SecurePassword123!</span>
          </div>
          <div class="relative">
            <input
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              required
              placeholder="Enter password..."
              class="w-full bg-slate-800/80 text-white placeholder-slate-500 border border-slate-700 rounded-xl px-4 py-2.5 pl-10 pr-10 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-mono"
            />
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <button
              type="button"
              @click="showPassword = !showPassword"
              class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 transition-colors"
            >
              <svg v-if="!showPassword" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Sign In Button -->
        <button
          type="submit"
          :disabled="loading"
          class="w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 text-white font-semibold text-sm py-3 rounded-xl transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 mt-3 hover:shadow-blue-600/30 active:scale-[0.99] cursor-pointer"
        >
          <span v-if="loading" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
          <span v-else class="flex items-center gap-2">
            Sign into Clinical Session
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </span>
        </button>
      </form>
    </div>

    <!-- Security Policy Callout Notice -->
    <div class="mt-6 bg-slate-900/60 border border-slate-800/60 rounded-xl p-4 w-full max-w-xl text-xs text-slate-400 flex items-start gap-3 backdrop-blur-md">
      <div class="p-2 rounded-lg bg-blue-500/10 text-blue-400 shrink-0">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      </div>
      <div class="space-y-0.5 leading-relaxed">
        <p class="font-semibold text-slate-200">Zero-Trust Context-Aware Access Control (CAAC)</p>
        <p class="text-slate-400 text-[11px]">
          Access is strictly evaluated by role, shift status, and patient ward association. All clinical events are appended to the physically isolated SHA-256 Merkle audit ledger.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAuth } from '~/composables/useAuth'

definePageMeta({
  layout: 'auth'
})

interface Persona {
  username: string
  shortName: string
  roleLabel: string
  wardCode: string
}

const personas: Persona[] = [
  { username: 'dr_cardio', shortName: 'Dr. Okafor', roleLabel: 'Cardiologist', wardCode: 'CARD' },
  { username: 'hou_cardio', shortName: 'Dr. Adebayo', roleLabel: 'Head of Unit', wardCode: 'CARD' },
  { username: 'nurse_cardio', shortName: 'Nurse Nnamdi', roleLabel: 'Telemetry Lead', wardCode: 'CARD' },
  // { username: 'pharmacist', shortName: 'Pharm. Usman', roleLabel: 'Pharmacist', wardCode: 'GOPD' },
  { username: 'clerk', shortName: 'T. Bakare', roleLabel: 'Records Clerk', wardCode: 'GOPD' },
  { username: 'paramedic_01', shortName: 'D. Yakubu', roleLabel: 'Paramedic EMT', wardCode: 'EMERG' },
  { username: 'admin', shortName: 'Sys Admin', roleLabel: 'Administrator', wardCode: 'IT' }
]

const auth = useAuth()
const selectedAccount = ref('dr_cardio')
const username = ref('dr_cardio')
const password = ref('SecurePassword123!')
const showPassword = ref(false)
const loading = ref(false)
const error = ref<string | null>(null)

const selectPersona = (p: Persona) => {
  selectedAccount.value = p.username
  username.value = p.username
  password.value = 'SecurePassword123!'
  error.value = null
}

const handleLogin = async () => {
  loading.value = true
  error.value = null
  try {
    await auth.login(username.value, password.value)
  } catch (err: any) {
    error.value = err.message || 'Invalid username or password'
  } finally {
    loading.value = false
  }
}
</script>

