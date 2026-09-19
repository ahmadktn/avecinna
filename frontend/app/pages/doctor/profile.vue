<template>
  <div class="min-h-screen bg-slate-50 font-sans">
    <AppSidebar />

    <div class="pl-56 flex flex-col min-h-screen">
      <AppNavbar
        @openWardSwitcher="showWardSwitcher = true"
        @openBreakGlass="showBreakGlassModal = true"
      />

      <main class="flex-1 w-full px-8 py-6 space-y-5">
        <!-- Page Header -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 class="font-brand text-xl font-semibold text-slate-900 tracking-tight">Physician Profile & Credentials</h1>
            <p class="text-xs text-slate-500 mt-0.5">
              Review active clinical authorization parameters and manage personal credentials.
            </p>
          </div>

          <div class="flex items-center gap-2">
            <span class="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full text-xs font-semibold">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Active Clinical Shift
            </span>
          </div>
        </div>

        <!-- Feedback Alert Messages -->
        <div v-if="successMsg" class="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl text-xs flex items-center justify-between shadow-2xs">
          <div class="flex items-center gap-2.5">
            <svg class="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <span>{{ successMsg }}</span>
          </div>
          <button @click="successMsg = null" class="font-bold text-emerald-800 hover:text-emerald-950">✕</button>
        </div>

        <div v-if="errorMsg" class="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-xs flex items-center justify-between shadow-2xs">
          <div class="flex items-center gap-2.5">
            <svg class="w-4 h-4 text-red-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{{ errorMsg }}</span>
          </div>
          <button @click="errorMsg = null" class="font-bold text-red-800 hover:text-red-950">✕</button>
        </div>

        <!-- Profile Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Left Column: Identity Card -->
          <div class="bg-white border border-slate-200/90 rounded-xl p-6 shadow-2xs space-y-6">
            <div class="flex items-center gap-4 pb-5 border-b border-slate-100">
              <div class="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-xl font-mono shadow-md shadow-blue-900/20">
                {{ initials }}
              </div>
              <div class="space-y-0.5 min-w-0">
                <h3 class="text-base font-bold text-slate-900 truncate">{{ user?.fullName || 'Dr. Physician' }}</h3>
                <p class="text-xs font-mono text-slate-500 truncate">@{{ user?.username }}</p>
                <div class="pt-1">
                  <RoleBadge :role="user?.role || 'DOCTOR'" />
                </div>
              </div>
            </div>

            <!-- Shift & Ward Details -->
            <div class="space-y-3.5 text-xs">
              <div class="flex items-center justify-between py-1.5 border-b border-slate-100">
                <span class="text-slate-500">Home Department Ward:</span>
                <span class="font-bold text-slate-800 font-mono">{{ homeWardName }} ({{ homeWardCode }})</span>
              </div>

              <div class="flex items-center justify-between py-1.5 border-b border-slate-100">
                <span class="text-slate-500">Active Working Ward:</span>
                <span class="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded font-mono">{{ activeWardName }} ({{ activeWardCode }})</span>
              </div>

              <div class="flex items-center justify-between py-1.5 border-b border-slate-100">
                <span class="text-slate-500">Shift Status:</span>
                <span class="font-bold text-emerald-700">Active (Authorized)</span>
              </div>

              <div class="flex items-center justify-between py-1.5 border-b border-slate-100">
                <span class="text-slate-500">Shift Window:</span>
                <span class="font-mono text-slate-700 font-bold">12-Hour On-Duty</span>
              </div>

              <div class="flex items-center justify-between py-1.5">
                <span class="text-slate-500">Security Identity:</span>
                <span class="font-mono text-slate-700">Zero-Trust JWT</span>
              </div>
            </div>
          </div>

          <!-- Right Column (2 Cols): Edit Profile & Change Password Forms -->
          <div class="lg:col-span-2 space-y-6">
            <!-- 1. Update Personal Info Form -->
            <div class="bg-white border border-slate-200/90 rounded-xl p-6 shadow-2xs space-y-5">
              <div class="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 class="text-xs font-bold text-slate-700 uppercase tracking-wider">Physician Information</h3>
                  <p class="text-[11px] text-slate-500">Update your clinical display name on medical charts and encounters.</p>
                </div>
              </div>

              <form @submit.prevent="handleUpdateProfile" class="space-y-4 text-xs">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label class="block font-bold text-slate-700 mb-1.5">Username</label>
                    <input
                      :value="user?.username"
                      disabled
                      type="text"
                      class="w-full bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-500 font-mono cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label class="block font-bold text-slate-700 mb-1.5">Full Clinical Name <span class="text-red-500">*</span></label>
                    <input
                      v-model="profileForm.fullName"
                      type="text"
                      required
                      placeholder="e.g. Dr. Emeka Okafor"
                      class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-blue-500 font-medium"
                    />
                  </div>
                </div>

                <div class="flex justify-end pt-2">
                  <button
                    type="submit"
                    :disabled="savingProfile"
                    class="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl font-semibold shadow-xs flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <span v-if="savingProfile" class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>Save Name Changes</span>
                  </button>
                </div>
              </form>
            </div>

            <!-- 2. Change Password Form (Argon2) -->
            <div class="bg-white border border-slate-200/90 rounded-xl p-6 shadow-2xs space-y-5">
              <div class="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 class="text-xs font-bold text-slate-700 uppercase tracking-wider">Account Password & Security</h3>
                  <p class="text-[11px] text-slate-500">Update your login password hashed with Argon2id cryptographic algorithm.</p>
                </div>
              </div>

              <form @submit.prevent="handleChangePassword" class="space-y-4 text-xs">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label class="block font-bold text-slate-700 mb-1.5">New Password <span class="text-red-500">*</span></label>
                    <input
                      v-model="passwordForm.newPassword"
                      type="password"
                      required
                      minlength="8"
                      placeholder="Minimum 8 characters"
                      class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label class="block font-bold text-slate-700 mb-1.5">Confirm New Password <span class="text-red-500">*</span></label>
                    <input
                      v-model="passwordForm.confirmPassword"
                      type="password"
                      required
                      placeholder="Re-enter new password"
                      class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div class="flex justify-end pt-2">
                  <button
                    type="submit"
                    :disabled="savingPassword"
                    class="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white rounded-xl font-semibold shadow-xs flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <span v-if="savingPassword" class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>Update Password</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>

    <!-- Modals -->
    <WardSwitcherModal :isOpen="showWardSwitcher" @close="showWardSwitcher = false" />
    <BreakGlassModal :isOpen="showBreakGlassModal" @close="showBreakGlassModal = false" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuth } from '~/composables/useAuth'
import { useApi } from '~/composables/useApi'

const auth = useAuth()
const api = useApi()

const showWardSwitcher = ref(false)
const showBreakGlassModal = ref(false)

const user = computed(() => auth.user.value)
const activeWard = computed(() => auth.activeWard.value)

const homeWardName = computed(() => user.value?.homeWard?.name || 'General Ward')
const homeWardCode = computed(() => user.value?.homeWard?.code || '3W')
const activeWardName = computed(() => activeWard.value?.name || homeWardName.value)
const activeWardCode = computed(() => activeWard.value?.code || homeWardCode.value)

const savingProfile = ref(false)
const savingPassword = ref(false)
const successMsg = ref<string | null>(null)
const errorMsg = ref<string | null>(null)

const profileForm = ref({
  fullName: '',
})

const passwordForm = ref({
  newPassword: '',
  confirmPassword: '',
})

const initials = computed(() => {
  const name = user.value?.fullName || user.value?.username || 'DR'
  const parts = name.split(' ')
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
})

onMounted(() => {
  if (user.value?.fullName) {
    profileForm.value.fullName = user.value.fullName
  }
})

const handleUpdateProfile = async () => {
  if (!profileForm.value.fullName) return
  savingProfile.value = true
  errorMsg.value = null
  successMsg.value = null

  try {
    const res = await api.patch<{ message: string; user: any }>('/auth/profile', {
      fullName: profileForm.value.fullName,
    })

    if (auth.user.value) {
      auth.user.value.fullName = res.user.fullName
      localStorage.setItem('avecinna_user', JSON.stringify(auth.user.value))
    }

    successMsg.value = 'Full clinical name updated successfully!'
  } catch (err: any) {
    errorMsg.value = err.message || 'Failed to update profile'
  } finally {
    savingProfile.value = false
  }
}

const handleChangePassword = async () => {
  if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    errorMsg.value = 'Passwords do not match.'
    return
  }

  if (passwordForm.value.newPassword.length < 8) {
    errorMsg.value = 'Password must be at least 8 characters long.'
    return
  }

  savingPassword.value = true
  errorMsg.value = null
  successMsg.value = null

  try {
    await api.patch('/auth/profile', {
      newPassword: passwordForm.value.newPassword,
    })

    successMsg.value = 'Password updated successfully!'
    passwordForm.value.newPassword = ''
    passwordForm.value.confirmPassword = ''
  } catch (err: any) {
    errorMsg.value = err.message || 'Failed to change password'
  } finally {
    savingPassword.value = false
  }
}
</script>
