<template>
  <div class="space-y-5">
    <!-- Header & Add Ward Button -->
    <PageHeader
      title="Hospital Wards &amp; Clinical Units"
      description="Departmental structure, active inpatient capacity, Head of Unit supervision, and staff assignments"
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
          @click="openCreateWardModal"
          class="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-2 transition-all cursor-pointer"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          <span>Register New Ward</span>
        </button>
      </template>
    </PageHeader>

    <!-- Error Banner -->
    <AlertBanner
      v-if="error"
      variant="error"
      :message="error"
      actionLabel="Retry"
      @action="loadData"
    />

    <!-- Search Toolbar -->
    <FilterToolbar
      v-model="searchQuery"
      placeholder="Search by Ward Name, Code, or Department..."
      :totalCount="wardsList.length"
      :filteredCount="filteredWards.length"
    />

        <!-- Wards Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div
            v-for="w in filteredWards"
            :key="w.id"
            class="bg-white border border-slate-200/80 rounded-xl p-6 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between space-y-5"
          >
            <div class="space-y-4">
              <!-- Top Row: Code & Dept -->
              <div class="flex items-start justify-between gap-3">
                <div>
                  <span class="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200 mb-1">
                    {{ w.code }}
                  </span>
                  <h3 class="text-base font-bold text-slate-900">{{ w.name }}</h3>
                  <p class="text-xs text-slate-400 mt-0.5">Department: <span class="text-slate-600 font-medium">{{ w.department }}</span></p>
                </div>
                <div class="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
              </div>

              <!-- Supervisor Section -->
              <div class="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <div>
                  <span class="text-[10px] uppercase font-semibold text-slate-400 block tracking-wider">Head of Unit</span>
                  <span class="font-semibold text-slate-900">{{ getHeadOfUnitName(w.headOfUnitId) }}</span>
                </div>
                <button
                  type="button"
                  @click="openEditWardModal(w)"
                  class="text-xs text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
                >
                  Change
                </button>
              </div>
            </div>

            <!-- Stats & Action Buttons -->
            <div class="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
              <span class="text-slate-500 font-mono font-medium"><strong>{{ getStaffCount(w.id) }}</strong> Staff</span>

              <div class="flex items-center gap-2">
                <button
                  type="button"
                  @click="openAssignStaffModal(w)"
                  class="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  + Staff
                </button>
                <button
                  type="button"
                  @click="openEditWardModal(w)"
                  class="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  title="Edit Ward Details"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

    <!-- 1. Create Ward Modal -->
    <div
      v-if="showCreateModal"
      @click.self="showCreateModal = false"
      class="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
    >
      <div class="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl border border-slate-200 relative my-8" role="dialog" aria-modal="true">
        <button
          type="button"
          @click="showCreateModal = false"
          class="absolute top-6 right-6 text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div class="flex items-start gap-4 mb-6">
          <div class="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div>
            <h3 class="text-lg font-bold text-slate-900 tracking-tight">Register New Hospital Ward</h3>
            <p class="text-xs text-slate-500 mt-1">Add a new operational ward or clinical department to the system.</p>
          </div>
        </div>

        <form @submit.prevent="handleCreateWard" class="space-y-4 text-xs">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block font-bold text-slate-700 mb-1.5">Ward Code <span class="text-red-500">*</span></label>
              <input
                v-model="createForm.code"
                type="text"
                required
                placeholder="e.g. NEURO, 4W, ICU"
                class="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:border-blue-500 uppercase font-mono font-bold"
              />
            </div>
            <div>
              <label class="block font-bold text-slate-700 mb-1.5">Ward Name <span class="text-red-500">*</span></label>
              <input
                v-model="createForm.name"
                type="text"
                required
                placeholder="e.g. Neurology Inpatient Ward"
                class="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label class="block font-bold text-slate-700 mb-1.5">Department Name <span class="text-red-500">*</span></label>
            <input
              v-model="createForm.department"
              type="text"
              required
              placeholder="e.g. Neuroscience & Spine Center"
              class="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label class="block font-bold text-slate-700 mb-1.5">Head of Unit Clinician (Optional)</label>
            <select
              v-model="createForm.headOfUnitId"
              class="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:border-blue-500"
            >
              <option value="">-- No Head of Unit Assigned --</option>
              <option v-for="doc in seniorClinicians" :key="doc.id" :value="doc.id">
                {{ doc.fullName }} ({{ doc.role }})
              </option>
            </select>
          </div>

          <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              @click="showCreateModal = false"
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
              <span>Register Ward</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- 2. Edit Ward Modal -->
    <div
      v-if="showEditModal && editingWard"
      @click.self="showEditModal = false"
      class="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
    >
      <div class="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl border border-slate-200 relative my-8" role="dialog" aria-modal="true">
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
          <div class="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
          <div>
            <h3 class="text-lg font-bold text-slate-900 tracking-tight">Edit Ward Details & Head of Unit</h3>
            <p class="text-xs text-slate-500 mt-1">Update ward metadata or assign leadership supervision.</p>
          </div>
        </div>

        <form @submit.prevent="handleUpdateWard" class="space-y-4 text-xs">
          <div>
            <label class="block font-bold text-slate-700 mb-1.5">Ward Name <span class="text-red-500">*</span></label>
            <input
              v-model="editForm.name"
              type="text"
              required
              class="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label class="block font-bold text-slate-700 mb-1.5">Department Name <span class="text-red-500">*</span></label>
            <input
              v-model="editForm.department"
              type="text"
              required
              class="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label class="block font-bold text-slate-700 mb-1.5">Head of Unit Clinician</label>
            <select
              v-model="editForm.headOfUnitId"
              class="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:border-blue-500"
            >
              <option value="">-- No Head of Unit Assigned --</option>
              <option v-for="doc in seniorClinicians" :key="doc.id" :value="doc.id">
                {{ doc.fullName }} ({{ doc.role }})
              </option>
            </select>
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
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- 3. Assign Staff Modal -->
    <div
      v-if="showAssignModal && selectedWardForAssign"
      @click.self="showAssignModal = false"
      class="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
    >
      <div class="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl border border-slate-200 relative my-8" role="dialog" aria-modal="true">
        <button
          type="button"
          @click="showAssignModal = false"
          class="absolute top-6 right-6 text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div class="flex items-start gap-4 mb-6">
          <div class="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <div>
            <h3 class="text-lg font-bold text-slate-900 tracking-tight">Assign Staff Member to Ward</h3>
            <p class="text-xs text-slate-500 mt-1">Assign a clinician or staff account to <strong class="text-slate-800">{{ selectedWardForAssign.name }} ({{ selectedWardForAssign.code }})</strong>.</p>
          </div>
        </div>

        <form @submit.prevent="handleAssignStaff" class="space-y-4 text-xs">
          <div>
            <label class="block font-bold text-slate-700 mb-1.5">Select Staff Account <span class="text-red-500">*</span></label>
            <select
              v-model="assignStaffUserId"
              required
              class="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-slate-900 focus:outline-none focus:border-blue-500"
            >
              <option value="">-- Choose Clinician / Staff --</option>
              <option v-for="u in staffList" :key="u.id" :value="u.id">
                {{ u.fullName }} ({{ u.role }}) - Current: {{ getWardName(u.homeWardId) }}
              </option>
            </select>
          </div>

          <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              @click="showAssignModal = false"
              class="px-5 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="actionLoading || !assignStaffUserId"
              class="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <span v-if="actionLoading" class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              <span>Confirm Assignment</span>
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
import type { Ward, User } from '~/composables/useAuth'

const admin = useAdmin()
const wardsList = admin.wards
const staffList = admin.users
const loading = admin.loading
const error = admin.error
const actionLoading = ref(false)

const searchQuery = ref('')
const showCreateModal = ref(false)
const showEditModal = ref(false)
const showAssignModal = ref(false)

const editingWard = ref<Ward | null>(null)
const selectedWardForAssign = ref<Ward | null>(null)
const assignStaffUserId = ref('')

const createForm = ref({
  code: '',
  name: '',
  department: '',
  headOfUnitId: '',
})

const editForm = ref({
  name: '',
  department: '',
  headOfUnitId: '',
})

const loadData = async () => {
  try {
    await Promise.all([admin.fetchWards(), admin.fetchUsers()])
  } catch (err) {
    // Handled in composable
  }
}

const filteredWards = computed(() => {
  const q = searchQuery.value.toLowerCase().trim()
  if (!q) return wardsList.value
  return wardsList.value.filter(
    (w) =>
      w.name.toLowerCase().includes(q) ||
      w.code.toLowerCase().includes(q) ||
      w.department.toLowerCase().includes(q)
  )
})

const seniorClinicians = computed(() => {
  return staffList.value.filter(
    (u) => u.role === 'DOCTOR' || u.role === 'HEAD_OF_UNIT'
  )
})

const getHeadOfUnitName = (houId?: string | null) => {
  if (!houId) return 'None Assigned'
  const match = staffList.value.find((u) => u.id === houId)
  return match ? match.fullName : houId
}

const getStaffCount = (wardId: string) => {
  return staffList.value.filter((u) => u.homeWardId === wardId).length
}

const getWardName = (wardId?: string) => {
  if (!wardId) return 'None'
  const match = wardsList.value.find((w) => w.id === wardId)
  return match ? match.name : wardId
}

const openCreateWardModal = () => {
  createForm.value = { code: '', name: '', department: '', headOfUnitId: '' }
  showCreateModal.value = true
}

const handleCreateWard = async () => {
  actionLoading.value = true
  try {
    await admin.createWard(createForm.value)
    showCreateModal.value = false
  } catch (err) {
    // Handled in composable
  } finally {
    actionLoading.value = false
  }
}

const openEditWardModal = (w: Ward) => {
  editingWard.value = w
  editForm.value = {
    name: w.name,
    department: w.department,
    headOfUnitId: w.headOfUnitId || '',
  }
  showEditModal.value = true
}

const handleUpdateWard = async () => {
  if (!editingWard.value) return
  actionLoading.value = true
  try {
    await admin.updateWard(editingWard.value.id, editForm.value)
    showEditModal.value = false
  } catch (err) {
    // Handled in composable
  } finally {
    actionLoading.value = false
  }
}

const openAssignStaffModal = (w: Ward) => {
  selectedWardForAssign.value = w
  assignStaffUserId.value = ''
  showAssignModal.value = true
}

const handleAssignStaff = async () => {
  if (!selectedWardForAssign.value || !assignStaffUserId.value) return
  actionLoading.value = true
  try {
    await admin.assignStaffToWard(selectedWardForAssign.value.id, assignStaffUserId.value)
    showAssignModal.value = false
  } catch (err) {
    // Handled in composable
  } finally {
    actionLoading.value = false
  }
}

onMounted(() => {
  loadData()
})
</script>
