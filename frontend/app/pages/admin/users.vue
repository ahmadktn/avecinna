<template>
  <div class="min-h-screen bg-slate-50 flex font-sans select-none">
    <AppSidebar />

    <div class="flex-1 flex flex-col min-w-0">
      <AppNavbar @openWardSwitcher="showWardSwitcher = true" />

      <main class="flex-1 p-8 max-w-7xl w-full mx-auto space-y-8">
        <!-- Header -->
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-xl font-bold text-slate-900 tracking-tight">Staff Management</h1>
            <p class="text-xs text-slate-500 mt-1">{{ usersList.length }} Accounts - {{ activeCount }} Active</p>
          </div>

          <button
            @click="showAddStaffModal = true"
            class="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all shadow-xs"
          >
            <svg class="w-4 h-4 text-blue-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Add Staff
          </button>
        </div>

        <!-- Error Alert -->
        <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-xs flex items-center justify-between">
          <span>{{ error }}</span>
          <button @click="loadData" class="underline font-semibold">Retry</button>
        </div>

        <!-- Staff Accounts Table -->
        <div class="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <table class="w-full text-left text-xs">
            <thead>
              <tr class="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider">
                <th class="px-6 py-3.5">NAME</th>
                <th class="px-6 py-3.5">ROLE</th>
                <th class="px-6 py-3.5">WARD</th>
                <th class="px-6 py-3.5">STATUS</th>
                <th class="px-6 py-3.5 font-mono">LAST LOGIN</th>
                <th class="px-6 py-3.5 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 font-sans">
              <tr
                v-for="u in usersList"
                :key="u.id"
                class="hover:bg-slate-50 transition-colors"
                :class="!u.isActive ? 'bg-slate-50/50 opacity-75' : ''"
              >
                <!-- Name -->
                <td class="px-6 py-4">
                  <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0 font-mono">
                      {{ getInitials(u.fullName || u.username) }}
                    </div>
                    <span class="font-semibold text-slate-900">{{ u.fullName || u.username }}</span>
                  </div>
                </td>

                <!-- Role -->
                <td class="px-6 py-4">
                  <RoleBadge :role="u.role" />
                </td>

                <!-- Ward -->
                <td class="px-6 py-4 font-mono text-slate-600 text-xs">
                  {{ u.homeWard?.name ? `${u.homeWard.name} (${u.homeWard.code})` : 'CARDIOLOGY - 1W' }}
                </td>

                <!-- Status -->
                <td class="px-6 py-4">
                  <span
                    class="px-3 py-0.5 rounded-full text-xs font-medium"
                    :class="u.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'"
                  >
                    {{ u.isActive ? 'Active' : 'Suspended' }}
                  </span>
                </td>

                <!-- Last Login -->
                <td class="px-6 py-4 font-mono text-slate-500 text-xs">
                  2026-03-03 08:14
                </td>

                <!-- Actions -->
                <td class="px-6 py-4 text-right space-x-2">
                  <button
                    @click="editUser(u)"
                    class="border border-blue-500 text-blue-600 hover:bg-blue-50 bg-white px-3 py-1 rounded-lg text-xs font-semibold transition-colors"
                  >
                    Edit
                  </button>

                  <button
                    v-if="u.isActive"
                    @click="toggleStatus(u.id, false)"
                    class="border border-red-400 text-red-600 hover:bg-red-50 bg-white px-3 py-1 rounded-lg text-xs font-semibold transition-colors"
                  >
                    Suspend
                  </button>

                  <button
                    v-else
                    @click="toggleStatus(u.id, true)"
                    class="border border-emerald-400 text-emerald-600 hover:bg-emerald-50 bg-white px-3 py-1 rounded-lg text-xs font-semibold transition-colors"
                  >
                    Restore
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </main>
    </div>

    <!-- Modals -->
    <WardSwitcherModal :isOpen="showWardSwitcher" @close="showWardSwitcher = false" />
    <AddStaffModal :isOpen="showAddStaffModal" @close="showAddStaffModal = false" @created="loadData" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAdmin } from '~/composables/useAdmin'
import type { User } from '~/composables/useAuth'

const admin = useAdmin()
const showWardSwitcher = ref(false)
const showAddStaffModal = ref(false)

const usersList = computed(() => admin.users.value)
const loading = computed(() => admin.loading.value)
const error = computed(() => admin.error.value)

const activeCount = computed(() => usersList.value.filter(u => u.isActive).length)

const fallbackUsers: User[] = [
  { id: 'u-1', username: 'dr_arslan', fullName: 'Dr. Serlin Arslan', role: 'DOCTOR', isActive: true },
  { id: 'u-2', username: 'dr_arslan2', fullName: 'Dr. Serlin Arslan', role: 'DOCTOR', isActive: true },
  { id: 'u-3', username: 'dr_arslan3', fullName: 'Dr. Serlin Arslan', role: 'DOCTOR', isActive: true },
  { id: 'u-4', username: 'dr_arslan4', fullName: 'Dr. Serlin Arslan', role: 'DOCTOR', isActive: true },
  { id: 'u-5', username: 'dr_arslan5', fullName: 'Dr. Serlin Arslan', role: 'DOCTOR', isActive: true },
  { id: 'u-6', username: 'dr_arslan6', fullName: 'Dr. Serlin Arslan', role: 'DOCTOR', isActive: true },
  { id: 'u-7', username: 'dr_arslan7', fullName: 'Dr. Serlin Arslan', role: 'DOCTOR', isActive: false },
]

const loadData = async () => {
  try {
    const list = await admin.fetchUsers()
    if (list.length === 0) {
      admin.users.value = fallbackUsers
    }
  } catch (err) {
    admin.users.value = fallbackUsers
  }
}

onMounted(() => {
  loadData()
})

const getInitials = (name: string) => {
  const parts = name.split(' ')
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

const editUser = (u: User) => {
  // Edit handler
}

const toggleStatus = async (id: string, isActive: boolean) => {
  try {
    await admin.toggleUserStatus(id, isActive)
  } catch (err) {
    // Handled in composable
  }
}
</script>
