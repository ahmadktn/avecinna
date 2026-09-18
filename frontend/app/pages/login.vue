<template>
  <div class="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 font-sans select-none">
    <!-- Brand Header -->
    <div class="text-center mb-8 flex flex-col items-center">
      <div class="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg mb-3">
        <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
        </svg>
      </div>
      <h1 class="font-brand text-3xl font-bold text-white tracking-tight">Avecinna</h1>
      <p class="text-slate-400 text-xs mt-1">Clinical Records – Secure Access</p>
    </div>

    <!-- Login Form Card -->
    <div class="bg-slate-900 border border-slate-800/80 rounded-2xl w-full max-w-[420px] p-8 shadow-2xl">
      <!-- Backend Error Alert -->
      <div v-if="error" class="bg-red-950/80 border border-red-800/80 text-red-200 p-3.5 rounded-xl text-xs mb-6 flex items-start gap-2.5">
        <svg class="w-4 h-4 text-red-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>{{ error }}</span>
      </div>

      <form @submit.prevent="handleLogin" class="space-y-5">
        <!-- Staff Account Select Dropdown -->
        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-2">Staff Account</label>
          <select
            v-model="selectedAccount"
            @change="onAccountChange"
            class="w-full bg-slate-800 text-white border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors"
          >
            <option value="dr_cardio">Dr. Serlin Arslan - Doctor</option>
            <option value="nurse1">Nurse Amara Diop - Nurse</option>
            <option value="clerk1">Clerk Sofia Reyes - Clerk</option>
            <option value="pharm1">Pharm Reza Tehrani - Pharmacist</option>
            <option value="head1">Dr. Hakeem Nnadi - Head of Unit</option>
            <option value="admin1">Administrator - Admin</option>
          </select>
        </div>

        <!-- Password Input -->
        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-2">Password</label>
          <input
            v-model="password"
            type="password"
            required
            placeholder="Enter password..."
            class="w-full bg-slate-800 text-white placeholder-slate-500 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        <!-- Sign In Button -->
        <button
          type="submit"
          :disabled="loading"
          class="w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 text-white font-medium text-sm py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 mt-2"
        >
          <span v-if="loading" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
          <span v-else>Sign in</span>
        </button>
      </form>
    </div>

    <!-- Security Policy Callout Notice -->
    <div class="mt-6 bg-slate-900/60 border border-slate-800/60 rounded-xl p-4 w-full max-w-[420px] text-xs text-slate-400 flex items-start gap-3">
      <svg class="w-4 h-4 text-slate-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p class="leading-relaxed">
        Each staff member has an individual login. Shared accounts are prohibited — all access is logged and attributed.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAuth } from '~/composables/useAuth'

const auth = useAuth()
const selectedAccount = ref('dr_cardio')
const username = ref('dr_cardio')
const password = ref('SecurePassword123!')
const loading = ref(false)
const error = ref<string | null>(null)

const onAccountChange = () => {
  username.value = selectedAccount.value
  password.value = 'SecurePassword123!'
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
