<template>
  <div class="min-h-screen bg-slate-50 font-sans">
    <AppSidebar />

    <div class="pl-56 flex flex-col min-h-screen">
      <AppNavbar @openWardSwitcher="showWardSwitcher = true" />

      <main class="flex-1 w-full px-8 py-6 space-y-5">
        <!-- Page Header -->
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div class="flex items-center gap-2">
              <NuxtLink to="/unit" class="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                </svg>
                <span>Unit Overview</span>
              </NuxtLink>
              <span class="text-slate-300">/</span>
              <span class="text-xs font-medium text-slate-500">Staff Management</span>
            </div>
            <h1 class="font-brand text-xl font-semibold text-slate-900 tracking-tight mt-1">Ward Staff Directory</h1>
            <p class="text-xs text-slate-500 mt-0.5">
              Supervise clinicians assigned to your ward, manage active accounts, and reassign departmental staff
            </p>
          </div>

          <div class="flex items-center gap-3">
            <button
              type="button"
              @click="loadStaff"
              :disabled="loading"
              class="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 shadow-2xs flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <svg class="w-3.5 h-3.5 text-slate-500" :class="{ 'animate-spin': loading }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Refresh</span>
            </button>

            <button
              type="button"
              @click="openReassignModal"
              class="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-xs shrink-0 cursor-pointer"
            >
              <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
              </svg>
              <span>Reassign / Add Clinician</span>
            </button>
          </div>
        </div>

        <!-- Notification / Toast Feedback -->
        <div
          v-if="toastMessage"
          class="p-4 rounded-xl text-xs flex items-center justify-between border transition-all"
          :class="toastType === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'"
        >
          <div class="flex items-center gap-2.5">
            <svg v-if="toastType === 'success'" class="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <svg v-else class="w-4 h-4 text-red-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span class="font-medium">{{ toastMessage }}</span>
          </div>
          <button @click="toastMessage = null" class="text-slate-400 hover:text-slate-600 cursor-pointer">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Filter & Search Toolbar -->
        <div class="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
          <div class="relative w-full md:w-80">
            <svg class="w-4 h-4 text-slate-400 absolute left-3.5 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              v-model="searchQuery"
              @input="onSearchInput"
              type="text"
              placeholder="Search staff by name or username..."
              class="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div class="flex items-center gap-3 w-full md:w-auto justify-end flex-wrap">
            <div class="flex items-center gap-2 text-xs">
              <span class="text-slate-500 font-semibold">Role:</span>
              <select
                v-model="selectedRole"
                @change="onFilterChange"
                class="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500"
              >
                <option value="ALL">All Roles</option>
                <option value="DOCTOR">Doctor</option>
                <option value="NURSE">Nurse</option>
                <option value="PARAMEDIC">Paramedic</option>
                <option value="PHARMACIST">Pharmacist</option>
                <option value="CLERK">Clerk</option>
                <option value="HEAD_OF_UNIT">Head of Unit</option>
              </select>
            </div>

            <div class="flex items-center gap-2 text-xs">
              <span class="text-slate-500 font-semibold">Status:</span>
              <select
                v-model="selectedStatus"
                @change="onFilterChange"
                class="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active Only</option>
                <option value="INACTIVE">Suspended Only</option>
              </select>
            </div>

            <div class="flex items-center gap-2 text-xs">
              <span class="text-slate-500 font-semibold">Per Page:</span>
              <select
                v-model="perPage"
                @change="onFilterChange"
                class="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500"
              >
                <option :value="10">10</option>
                <option :value="20">20</option>
                <option :value="50">50</option>
              </select>
            </div>

            <span class="bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-xl font-mono">
              {{ staffPagination.total }} Total Staff
            </span>
          </div>
        </div>

        <!-- Staff Table Card -->
        <div class="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <!-- Loading state -->
          <div v-if="loading && staffList.length === 0" class="p-12 text-center">
            <div class="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p class="text-xs text-slate-500 font-medium">Loading ward staff roster...</p>
          </div>

          <!-- Empty state -->
          <div v-else-if="staffList.length === 0" class="p-12 text-center space-y-3">
            <div class="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <p class="text-sm font-bold text-slate-700">No staff members found</p>
            <p class="text-xs text-slate-400 max-w-sm mx-auto">
              No clinicians match your current search and filter parameters. Try clearing your filters or reassigning a clinician to this ward.
            </p>
            <button
              type="button"
              @click="clearFilters"
              class="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
            >
              Clear Filters
            </button>
          </div>

          <!-- Table with data -->
          <div v-else class="overflow-x-auto">
            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr class="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                  <th class="px-6 py-4">Clinician</th>
                  <th class="px-6 py-4">Assigned Role</th>
                  <th class="px-6 py-4">Status</th>
                  <th class="px-6 py-4 font-mono">Staff ID</th>
                  <th class="px-6 py-4 text-right">Supervisory Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr
                  v-for="s in staffList"
                  :key="s.id"
                  class="hover:bg-slate-50/70 transition-colors"
                  :class="{ 'bg-slate-50/40 opacity-75': !s.isActive }"
                >
                  <td class="px-6 py-4">
                    <div class="flex items-center gap-3">
                      <div class="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0 font-mono shadow-inner">
                        {{ getInitials(s.fullName || s.username) }}
                      </div>
                      <div>
                        <p class="font-bold text-slate-900 text-xs">{{ s.fullName || s.username }}</p>
                        <p class="text-[11px] text-slate-400 font-mono">@{{ s.username }}</p>
                      </div>
                    </div>
                  </td>
                  <td class="px-6 py-4">
                    <RoleBadge :role="s.role" />
                  </td>
                  <td class="px-6 py-4">
                    <span
                      class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium"
                      :class="s.isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' : 'bg-slate-100 text-slate-600 border border-slate-200'"
                    >
                      <span class="w-1.5 h-1.5 rounded-full" :class="s.isActive ? 'bg-emerald-500' : 'bg-slate-400'"></span>
                      {{ s.isActive ? 'Active' : 'Suspended' }}
                    </span>
                  </td>
                  <td class="px-6 py-4 font-mono text-slate-500 text-[11px]">
                    {{ s.id.slice(0, 8) }}...
                  </td>
                  <td class="px-6 py-4 text-right">
                    <div class="flex items-center justify-end gap-2">
                      <!-- Assign Shift quick link -->
                      <NuxtLink
                        :to="`/unit/roster?search=${encodeURIComponent(s.fullName || s.username)}`"
                        class="px-3 py-1.5 rounded-lg border border-blue-400 text-blue-600 bg-white hover:bg-blue-50 font-semibold text-xs transition-colors cursor-pointer"
                      >
                        View Shifts
                      </NuxtLink>

                      <!-- Toggle Status button -->
                      <button
                        type="button"
                        @click="handleStatusToggle(s)"
                        :disabled="actionLoadingId === s.id"
                        class="px-3 py-1.5 rounded-lg font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
                        :class="s.isActive
                          ? 'border border-red-400 text-red-600 bg-white hover:bg-red-50'
                          : 'border border-emerald-400 text-emerald-600 bg-white hover:bg-emerald-50'"
                      >
                        <span v-if="actionLoadingId === s.id" class="animate-pulse">Updating...</span>
                        <span v-else>{{ s.isActive ? 'Suspend' : 'Restore' }}</span>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination Bar -->
          <div class="px-6 py-4 bg-slate-50/50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div class="text-xs text-slate-500 font-medium">
              Showing
              <span class="font-bold text-slate-800 font-mono">{{ startRecordIndex }}</span>
              to
              <span class="font-bold text-slate-800 font-mono">{{ endRecordIndex }}</span>
              of
              <span class="font-bold text-slate-800 font-mono">{{ staffPagination.total }}</span>
              clinicians
            </div>

            <div class="flex items-center gap-2">
              <button
                type="button"
                @click="changePage(currentPage - 1)"
                :disabled="currentPage <= 1 || loading"
                class="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                </svg>
                <span>Previous</span>
              </button>

              <div class="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold font-mono">
                Page {{ currentPage }} / {{ staffPagination.totalPages || 1 }}
              </div>

              <button
                type="button"
                @click="changePage(currentPage + 1)"
                :disabled="currentPage >= staffPagination.totalPages || loading"
                class="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <span>Next</span>
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>

    <!-- Reassign / Add Clinician Modal -->
    <div
      v-if="showReassignModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs"
    >
      <div class="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 sm:p-7 space-y-6">
        <div class="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h3 class="text-lg font-bold text-slate-900 tracking-tight">Reassign Clinician to Unit</h3>
            <p class="text-xs text-slate-500 mt-0.5">Search active hospital staff to transfer or assign to your ward</p>
          </div>
          <button
            type="button"
            @click="showReassignModal = false"
            class="w-8 h-8 rounded-xl bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Search Bar -->
        <div class="relative">
          <svg class="w-4 h-4 text-slate-400 absolute left-3.5 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            v-model="candidateSearchQuery"
            @input="onCandidateSearch"
            type="text"
            placeholder="Type doctor, nurse, or pharmacist name to search..."
            class="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        <!-- Candidate list -->
        <div class="max-h-72 overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-2xl">
          <div v-if="candidateLoading" class="p-8 text-center">
            <div class="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p class="text-xs text-slate-500">Searching hospital staff directory...</p>
          </div>

          <div v-else-if="candidates.length === 0" class="p-8 text-center text-xs text-slate-400">
            No clinicians found matching "{{ candidateSearchQuery }}".
          </div>

          <div
            v-for="c in candidates"
            :key="c.id"
            class="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
          >
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0 font-mono">
                {{ getInitials(c.fullName || c.username) }}
              </div>
              <div class="min-w-0">
                <p class="font-bold text-slate-900 text-xs truncate">{{ c.fullName || c.username }}</p>
                <div class="flex items-center gap-2 mt-0.5">
                  <RoleBadge :role="c.role" />
                  <span class="text-[10px] text-slate-400 font-medium">
                    Current: {{ c.wardName || 'Unassigned' }}
                  </span>
                </div>
              </div>
            </div>

            <div class="shrink-0">
              <span
                v-if="c.isCurrentWard"
                class="text-[11px] font-bold text-slate-400 px-3 py-1.5 rounded-lg bg-slate-100 block"
              >
                Already in Unit
              </span>
              <button
                v-else
                type="button"
                @click="handleReassignConfirm(c)"
                :disabled="reassigningId === c.id"
                class="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                <span v-if="reassigningId === c.id" class="animate-pulse">Reassigning...</span>
                <span v-else>Assign to Unit</span>
              </button>
            </div>
          </div>
        </div>

        <div class="flex justify-end pt-2">
          <button
            type="button"
            @click="showReassignModal = false"
            class="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>

    <!-- Ward Switcher Modal -->
    <WardSwitcherModal :isOpen="showWardSwitcher" @close="showWardSwitcher = false" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppSidebar from '~/components/AppSidebar.vue'
import AppNavbar from '~/components/AppNavbar.vue'
import WardSwitcherModal from '~/components/WardSwitcherModal.vue'
import RoleBadge from '~/components/RoleBadge.vue'
import { useUnit, type UnitStaffMember, type UnitCandidateMember } from '~/composables/useUnit'

const unit = useUnit()
const showWardSwitcher = ref(false)
const showReassignModal = ref(false)

const loading = computed(() => unit.loading.value)
const staffList = computed(() => unit.staff.value)
const staffPagination = computed(() => unit.staffPagination.value)

const searchQuery = ref('')
const selectedRole = ref('ALL')
const selectedStatus = ref('ALL')
const perPage = ref(10)
const currentPage = ref(1)

const actionLoadingId = ref<string | null>(null)
const reassigningId = ref<string | null>(null)
const candidateLoading = ref(false)
const candidates = ref<UnitCandidateMember[]>([])
const candidateSearchQuery = ref('')

const toastMessage = ref<string | null>(null)
const toastType = ref<'success' | 'error'>('success')

let searchTimeout: any = null
let candidateSearchTimeout: any = null

const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
  toastMessage.value = msg
  toastType.value = type
  setTimeout(() => {
    if (toastMessage.value === msg) {
      toastMessage.value = null
    }
  }, 4500)
}

const getInitials = (name: string) => {
  if (!name) return 'ST'
  const parts = name.split(' ')
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

const startRecordIndex = computed(() => {
  if (staffPagination.value.total === 0) return 0
  return (currentPage.value - 1) * perPage.value + 1
})

const endRecordIndex = computed(() => {
  return Math.min(currentPage.value * perPage.value, staffPagination.value.total)
})

const loadStaff = async () => {
  try {
    await unit.fetchStaff({
      page: currentPage.value,
      limit: perPage.value,
      role: selectedRole.value,
      status: selectedStatus.value,
      search: searchQuery.value,
    })
  } catch (err: any) {
    showToast(err.message || 'Failed to load staff roster', 'error')
  }
}

const onSearchInput = () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    currentPage.value = 1
    loadStaff()
  }, 350)
}

const onFilterChange = () => {
  currentPage.value = 1
  loadStaff()
}

const clearFilters = () => {
  searchQuery.value = ''
  selectedRole.value = 'ALL'
  selectedStatus.value = 'ALL'
  currentPage.value = 1
  loadStaff()
}

const changePage = (newPage: number) => {
  if (newPage < 1 || newPage > staffPagination.value.totalPages) return
  currentPage.value = newPage
  loadStaff()
}

const handleStatusToggle = async (s: UnitStaffMember) => {
  actionLoadingId.value = s.id
  const targetStatus = !s.isActive
  try {
    await unit.updateStaffStatus(s.id, targetStatus)
    showToast(
      `Staff member "${s.fullName || s.username}" account has been ${targetStatus ? 'restored' : 'suspended'}.`,
      'success'
    )
  } catch (err: any) {
    showToast(err.message || 'Failed to update staff status', 'error')
  } finally {
    actionLoadingId.value = null
  }
}

const openReassignModal = async () => {
  showReassignModal.value = true
  candidateSearchQuery.value = ''
  await loadCandidates()
}

const loadCandidates = async () => {
  candidateLoading.value = true
  try {
    const list = await unit.searchCandidates(candidateSearchQuery.value)
    candidates.value = list
  } catch (err: any) {
    showToast(err.message || 'Failed to search candidate clinicians', 'error')
  } finally {
    candidateLoading.value = false
  }
}

const onCandidateSearch = () => {
  clearTimeout(candidateSearchTimeout)
  candidateSearchTimeout = setTimeout(() => {
    loadCandidates()
  }, 300)
}

const handleReassignConfirm = async (c: UnitCandidateMember) => {
  reassigningId.value = c.id
  try {
    await unit.reassignStaff(c.id)
    showToast(`Clinician "${c.fullName || c.username}" reassigned to your unit successfully.`, 'success')
    showReassignModal.value = false
    await loadStaff()
  } catch (err: any) {
    showToast(err.message || 'Failed to reassign clinician', 'error')
  } finally {
    reassigningId.value = null
  }
}

onMounted(() => {
  loadStaff()
})
</script>
