<template>
  <div class="space-y-5">
    <!-- Header -->
    <PageHeader
      title="Staff Account Management"
      :description="`${usersList.length} Registered Staff Accounts · ${activeCount} Active Clinicians`"
    >
      <template #actions>
        <button
          type="button"
          @click="loadData"
          :disabled="loading"
          class="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 shadow-2xs flex items-center gap-2 transition-all cursor-pointer"
        >
          <svg class="w-3.5 h-3.5 text-slate-500" :class="{ 'animate-spin': loading }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Refresh</span>
        </button>

        <button
          type="button"
          @click="showAddStaffModal = true"
          class="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-xs shrink-0 cursor-pointer"
        >
          <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
          </svg>
          <span>Create Staff Account</span>
        </button>
      </template>
    </PageHeader>

    <!-- Search & Filter Toolbar -->
    <FilterToolbar
      v-model="searchQuery"
      placeholder="Search staff by name or username..."
      :totalCount="usersList.length"
      :filteredCount="filteredUsers.length"
    >
      <template #filters>
        <div class="flex items-center gap-2 text-xs">
          <span class="text-slate-500 font-semibold">Role:</span>
          <select
            v-model="selectedRole"
            class="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">All Roles</option>
            <option value="DOCTOR">Doctor</option>
            <option value="NURSE">Nurse</option>
            <option value="PARAMEDIC">Paramedic</option>
            <option value="CLERK">Clerk</option>
            <option value="PHARMACIST">Pharmacist</option>
            <option value="HEAD_OF_UNIT">Head of Unit</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>

        <div class="flex items-center gap-2 text-xs">
          <span class="text-slate-500 font-semibold">Ward:</span>
          <select
            v-model="selectedWard"
            class="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">All Wards</option>
            <option v-for="w in wardsList" :key="w.id" :value="w.id">
              {{ w.name }} ({{ w.code }})
            </option>
          </select>
        </div>
      </template>
    </FilterToolbar>

    <!-- Error Alert -->
    <AlertBanner
      v-if="error"
      variant="error"
      :message="error"
      actionLabel="Retry"
      @action="loadData"
    />

        <!-- Staff Accounts Table -->
        <div class="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr class="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                  <th class="px-6 py-4">Clinician Name</th>
                  <th class="px-6 py-4">Role & Privileges</th>
                  <th class="px-6 py-4">Home Ward</th>
                  <th class="px-6 py-4">Status</th>
                  <th class="px-6 py-4 font-mono">Account ID</th>
                  <th class="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 font-sans">
                <tr
                  v-for="u in paginatedUsers"
                  :key="u.id"
                  class="hover:bg-slate-50/70 transition-colors"
                  :class="!u.isActive ? 'bg-slate-50/50 opacity-75' : ''"
                >
                  <!-- Name -->
                  <td class="px-6 py-4.5">
                    <div class="flex items-center gap-3.5">
                      <div class="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0 font-mono shadow-inner">
                        {{ getInitials(u.fullName || u.username) }}
                      </div>
                      <div>
                        <span class="font-bold text-slate-900 block text-sm">{{ u.fullName || u.username }}</span>
                        <span class="text-[11px] text-slate-400 font-mono">@{{ u.username }}</span>
                      </div>
                    </div>
                  </td>

                  <!-- Role -->
                  <td class="px-6 py-4.5">
                    <RoleBadge :role="u.role" />
                  </td>

                  <!-- Ward -->
                  <td class="px-6 py-4.5 font-mono text-slate-600 text-xs">
                    {{ getWardName(u.homeWardId) }}
                  </td>

                  <!-- Status -->
                  <td class="px-6 py-4.5">
                    <span
                      class="px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5"
                      :class="u.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'"
                    >
                      <span class="w-1.5 h-1.5 rounded-full" :class="u.isActive ? 'bg-emerald-600' : 'bg-slate-400'"></span>
                      {{ u.isActive ? 'Active' : 'Suspended' }}
                    </span>
                  </td>

                  <!-- Account ID -->
                  <td class="px-6 py-4.5 font-mono text-slate-500 text-[11px] select-all">
                    {{ u.id }}
                  </td>

                  <!-- Actions -->
                  <td class="px-6 py-4.5 text-right space-x-2">
                    <button
                      type="button"
                      @click="openEditModal(u)"
                      class="border border-slate-200 hover:bg-slate-100 bg-white px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 transition-all shadow-2xs cursor-pointer"
                    >
                      Edit
                    </button>

                    <button
                      v-if="u.isActive"
                      type="button"
                      @click="toggleStatus(u.id, false)"
                      class="border border-red-200 text-red-700 hover:bg-red-50 bg-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
                    >
                      Suspend
                    </button>

                    <button
                      v-else
                      type="button"
                      @click="toggleStatus(u.id, true)"
                      class="border border-emerald-200 text-emerald-700 hover:bg-emerald-50 bg-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
                    >
                      Restore
                    </button>
                  </td>
                </tr>

                <tr v-if="!loading && filteredUsers.length === 0">
                  <td colspan="6" class="py-16 text-center text-slate-400 space-y-2">
                    <svg class="w-10 h-10 text-slate-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <p class="font-bold text-slate-600">No staff accounts found matching filter criteria</p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination Footer -->
          <div class="px-6 py-4 bg-slate-50/70 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <span class="text-slate-500">
              Showing Page <strong class="text-slate-900">{{ currentPage }}</strong> of <strong class="text-slate-900">{{ totalPages || 1 }}</strong> ({{ filteredUsers.length }} matching accounts)
            </span>

            <div class="flex items-center gap-2">
              <button
                type="button"
                @click="currentPage--"
                :disabled="currentPage <= 1"
                class="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                &larr; Previous
              </button>

              <button
                type="button"
                @click="currentPage++"
                :disabled="currentPage >= totalPages"
                class="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Next &rarr;
              </button>
            </div>
          </div>
        </div>

    <!-- Add Staff Modal -->
    <AddStaffModal :isOpen="showAddStaffModal" @close="showAddStaffModal = false" @created="loadData" />

    <!-- Edit Staff Modal -->
    <div
      v-if="showEditModal && editingUser"
      @click.self="showEditModal = false"
      class="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
    >
      <div class="bg-white rounded-3xl max-w-xl w-full p-8 shadow-2xl border border-slate-200 relative my-8" role="dialog" aria-modal="true">
        <button
          type="button"
          @click="showEditModal = false"
          class="absolute top-6 right-6 text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div class="flex items-start gap-4 mb-6">
          <div class="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </div>
          <div>
            <h3 class="text-lg font-bold text-slate-900 tracking-tight">Edit Staff Account</h3>
            <p class="text-xs text-slate-500 mt-1">Update profile details, role privileges, assigned ward, or password for <strong class="text-slate-800">@{{ editingUser.username }}</strong>.</p>
          </div>
        </div>

        <form @submit.prevent="handleUpdateUser" class="space-y-4 text-xs">
          <div>
            <label class="block font-bold text-slate-700 mb-1.5">Full Name <span class="text-red-500">*</span></label>
            <input
              v-model="editForm.fullName"
              type="text"
              required
              class="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block font-bold text-slate-700 mb-1.5">Role Privileges <span class="text-red-500">*</span></label>
              <select
                v-model="editForm.role"
                required
                class="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:border-blue-500"
              >
                <option value="DOCTOR">Doctor</option>
                <option value="NURSE">Nurse</option>
                <option value="PARAMEDIC">Paramedic</option>
                <option value="CLERK">Clerk</option>
                <option value="PHARMACIST">Pharmacist</option>
                <option value="HEAD_OF_UNIT">Head of Unit</option>
                <option value="ADMIN">System Admin</option>
              </select>
            </div>

            <div>
              <label class="block font-bold text-slate-700 mb-1.5">Home Ward Assignment <span class="text-red-500">*</span></label>
              <select
                v-model="editForm.homeWardId"
                required
                class="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:border-blue-500"
              >
                <option v-for="w in wardsList" :key="w.id" :value="w.id">
                  {{ w.name }} ({{ w.code }})
                </option>
              </select>
            </div>
          </div>

          <div>
            <label class="block font-bold text-slate-700 mb-1.5">Reset Password (Leave blank to keep unchanged)</label>
            <input
              v-model="editForm.password"
              type="password"
              placeholder="Enter new password if resetting..."
              class="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:border-blue-500 font-mono"
            />
          </div>

          <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              @click="showEditModal = false"
              class="px-5 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="actionLoading"
              class="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <span v-if="actionLoading" class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              <span>Save Account Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAdmin } from '~/composables/useAdmin'
import type { User } from '~/composables/useAuth'

const admin = useAdmin()
const showAddStaffModal = ref(false)
const showEditModal = ref(false)
const editingUser = ref<User | null>(null)
const actionLoading = ref(false)

const searchQuery = ref('')
const selectedRole = ref('ALL')
const selectedWard = ref('ALL')

const currentPage = ref(1)
const itemsPerPage = 12

const usersList = admin.users
const wardsList = admin.wards
const loading = admin.loading
const error = admin.error

const editForm = ref({
  fullName: '',
  role: 'DOCTOR',
  homeWardId: '',
  password: '',
})

const activeCount = computed(() => usersList.value.filter(u => u.isActive).length)

const filteredUsers = computed(() => {
  const q = searchQuery.value.toLowerCase().trim()
  return usersList.value.filter((u) => {
    const matchesSearch =
      !q ||
      (u.fullName && u.fullName.toLowerCase().includes(q)) ||
      (u.username && u.username.toLowerCase().includes(q))
    if (!matchesSearch) return false

    if (selectedRole.value !== 'ALL' && u.role !== selectedRole.value) return false
    if (selectedWard.value !== 'ALL' && u.homeWardId !== selectedWard.value) return false

    return true
  })
})

const totalPages = computed(() => Math.ceil(filteredUsers.value.length / itemsPerPage) || 1)

const paginatedUsers = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  return filteredUsers.value.slice(start, start + itemsPerPage)
})

const loadData = async () => {
  try {
    await Promise.all([admin.fetchUsers(), admin.fetchWards()])
  } catch (err) {
    // Handled in composable
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

const getWardName = (wardId?: string) => {
  if (!wardId) return 'General'
  const match = wardsList.value.find((w) => w.id === wardId)
  return match ? `${match.name} (${match.code})` : wardId
}

const openEditModal = (u: User) => {
  editingUser.value = u
  editForm.value = {
    fullName: u.fullName,
    role: u.role,
    homeWardId: u.homeWardId || (wardsList.value[0]?.id || ''),
    password: '',
  }
  showEditModal.value = true
}

const handleUpdateUser = async () => {
  if (!editingUser.value) return
  actionLoading.value = true
  try {
    const payload: any = {
      fullName: editForm.value.fullName,
      role: editForm.value.role,
      homeWardId: editForm.value.homeWardId,
    }
    if (editForm.value.password) {
      payload.password = editForm.value.password
    }
    await admin.updateUser(editingUser.value.id, payload)
    showEditModal.value = false
  } catch (err) {
    // Handled in composable
  } finally {
    actionLoading.value = false
  }
}

const toggleStatus = async (id: string, isActive: boolean) => {
  try {
    await admin.toggleUserStatus(id, isActive)
  } catch (err) {
    // Handled in composable
  }
}
</script>

