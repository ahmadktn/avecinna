<template>
  <div
    v-if="isOpen"
    @click.self="$emit('close')"
    class="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
    role="dialog"
    aria-modal="true"
  >
    <div class="bg-white rounded-2xl sm:rounded-3xl max-w-2xl w-full p-5 sm:p-8 shadow-2xl border border-slate-200 relative my-6 sm:my-8 max-h-[90vh] overflow-y-auto space-y-6">
      <!-- Close Button -->
      <button
        type="button"
        @click="$emit('close')"
        class="absolute top-6 right-6 text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <!-- Clean Header -->
      <div class="flex items-start gap-4">
        <div class="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <div class="pr-8">
          <h3 class="text-lg font-bold text-slate-900 tracking-tight">Multi-Disciplinary Care Team &amp; Consults</h3>
          <p class="text-xs text-slate-500 mt-0.5">
            Assign doctors, nurses, and clinical specialists to provide authorized CAAC care for <strong class="text-slate-800">{{ patientName || 'Patient' }}</strong>.
          </p>
        </div>
      </div>

      <!-- Feedback Alerts -->
      <div v-if="successMsg" class="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3.5 rounded-xl text-xs flex items-center justify-between">
        <span>{{ successMsg }}</span>
        <button type="button" @click="successMsg = null" class="text-emerald-700 hover:text-emerald-900 cursor-pointer p-0.5">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div v-if="errorMsg" class="bg-red-50 border border-red-200 text-red-700 p-3.5 rounded-xl text-xs flex items-center justify-between">
        <span>{{ errorMsg }}</span>
        <button type="button" @click="errorMsg = null" class="text-red-700 hover:text-red-900 cursor-pointer p-0.5">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Current Active Care Team Section -->
      <div class="space-y-3">
        <div class="flex items-center justify-between pb-2 border-b border-slate-100">
          <span class="text-xs font-bold text-slate-700 uppercase tracking-wider">Active Care Team Members</span>
          <span class="text-xs font-mono text-slate-400">{{ careTeamList.length }} Assigned</span>
        </div>

        <div v-if="loading && careTeamList.length === 0" class="py-6 text-center text-xs text-slate-400">
          Loading care team members...
        </div>

        <div v-else-if="careTeamList.length === 0" class="py-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          No external care team members assigned. Primary ward doctors and nurses have default CAAC access.
        </div>

        <div v-else class="space-y-2 max-h-48 overflow-y-auto pr-1">
          <div
            v-for="member in careTeamList"
            :key="member.id"
            class="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs hover:bg-slate-100/60 transition-colors"
          >
            <div class="min-w-0 space-y-0.5">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="font-bold text-slate-900 truncate">{{ member.staffName || member.staffUsername }}</span>
                <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase" :class="getRoleBadge(member.staffRole)">
                  {{ formatRole(member.staffRole) }}
                </span>
                <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase" :class="getRelationshipBadge(member.relationshipType)">
                  {{ member.relationshipType }}
                </span>
              </div>
              <p class="text-[11px] text-slate-500 font-mono">
                <span v-if="member.grantReason" class="text-slate-600 italic">"{{ member.grantReason }}"</span>
                <span v-if="member.expiresAt"> · Expires: {{ formatExpiry(member.expiresAt) }}</span>
                <span v-else> · Permanent</span>
              </p>
            </div>

            <button
              v-if="canManageCareTeam"
              type="button"
              @click="handleRevoke(member.id)"
              :disabled="actionLoading"
              class="text-xs font-semibold text-red-600 hover:text-red-800 bg-white hover:bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg transition-colors shrink-0 shadow-2xs cursor-pointer"
            >
              Revoke
            </button>
          </div>
        </div>

        <!-- Clean Close Action for Read-Only Roles -->
        <div v-if="!canManageCareTeam" class="flex justify-end pt-3 border-t border-slate-100">
          <button
            type="button"
            @click="$emit('close')"
            class="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-xs transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>

      <!-- Add Clinicians Form (Doctors & Unit Heads Only) -->
      <div v-if="canManageCareTeam" class="border-t border-slate-100 pt-5 space-y-4">
        <div>
          <h4 class="text-xs font-bold text-slate-900 uppercase tracking-wider">Assign Doctors &amp; Nurses to Care Team</h4>
          <p class="text-[11px] text-slate-500">Select attending doctors, bedside/specialist nurses, or clinical pharmacists.</p>
        </div>

        <form @submit.prevent="handleBatchGrant" class="space-y-4 text-xs">
          <!-- Role Filter Tabs + Search -->
          <div class="space-y-2">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <!-- Filter Pills -->
              <div class="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs font-semibold text-slate-600">
                <button
                  type="button"
                  @click="roleFilter = 'ALL'"
                  class="px-2.5 py-1 rounded-md transition-all cursor-pointer"
                  :class="roleFilter === 'ALL' ? 'bg-white text-slate-900 shadow-2xs' : 'hover:text-slate-900'"
                >
                  All Staff ({{ staffList.length }})
                </button>
                <button
                  type="button"
                  @click="roleFilter = 'DOCTOR'"
                  class="px-2.5 py-1 rounded-md transition-all cursor-pointer"
                  :class="roleFilter === 'DOCTOR' ? 'bg-white text-blue-700 shadow-2xs font-bold' : 'hover:text-slate-900'"
                >
                  Doctors ({{ doctorCount }})
                </button>
                <button
                  type="button"
                  @click="roleFilter = 'NURSE'"
                  class="px-2.5 py-1 rounded-md transition-all cursor-pointer"
                  :class="roleFilter === 'NURSE' ? 'bg-white text-emerald-700 shadow-2xs font-bold' : 'hover:text-slate-900'"
                >
                  Nurses ({{ nurseCount }})
                </button>
                <button
                  type="button"
                  @click="roleFilter = 'PHARMACIST'"
                  class="px-2.5 py-1 rounded-md transition-all cursor-pointer"
                  :class="roleFilter === 'PHARMACIST' ? 'bg-white text-amber-700 shadow-2xs font-bold' : 'hover:text-slate-900'"
                >
                  Pharmacy ({{ pharmacyCount }})
                </button>
              </div>

              <span class="text-slate-500 font-mono text-[11px]">
                {{ selectedStaffIds.length }} selected
              </span>
            </div>

            <!-- Search input -->
            <input
              v-model="staffSearch"
              type="text"
              placeholder="Search by name, role, or ward..."
              class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
          </div>

          <!-- Multi-Staff Selection Box -->
          <div class="space-y-1.5">
            <div class="max-h-44 overflow-y-auto border border-slate-200 rounded-xl p-2.5 bg-slate-50 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label
                v-for="s in filteredStaffList"
                :key="s.id"
                class="flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-colors select-none"
                :class="selectedStaffIds.includes(s.id) ? 'bg-blue-50 border-blue-300 text-blue-900 font-bold' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100/70'"
              >
                <input
                  type="checkbox"
                  :value="s.id"
                  v-model="selectedStaffIds"
                  class="rounded text-blue-600 focus:ring-blue-500 shrink-0"
                />
                <div class="min-w-0 truncate space-y-0.5">
                  <div class="flex items-center gap-1.5 truncate">
                    <span class="block truncate font-medium">{{ s.fullName }}</span>
                  </div>
                  <div class="flex items-center gap-1 text-[10px] font-mono font-normal text-slate-500 truncate">
                    <span class="px-1 py-0.2 rounded uppercase font-bold text-[9px]" :class="getRoleBadge(s.role)">{{ formatRole(s.role) }}</span>
                    <span v-if="s.homeWardName">· {{ s.homeWardName }}</span>
                  </div>
                </div>
              </label>

              <div v-if="filteredStaffList.length === 0" class="col-span-full py-4 text-center text-slate-400 text-xs">
                No staff members matching criteria.
              </div>
            </div>
          </div>

          <!-- Parameters: Relationship, Duration, Reason -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block font-bold text-slate-700 mb-1.5">Care Team Relationship <span class="text-red-500">*</span></label>
              <select
                v-model="grantConfig.relationshipType"
                required
                class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-blue-500 font-medium"
              >
                <option value="CONSULT">CONSULT (Specialist / Liaison Consult)</option>
                <option value="PRIMARY">PRIMARY (Primary Attending / Primary Nurse)</option>
                <option value="ON_CALL">ON_CALL (Emergency / Shift Coverage)</option>
              </select>
            </div>

            <div>
              <label class="block font-bold text-slate-700 mb-1.5">Authorization Duration <span class="text-red-500">*</span></label>
              <select
                v-model.number="grantConfig.durationHours"
                required
                class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-blue-500 font-mono"
              >
                <option :value="12">12 Hours (Single Shift)</option>
                <option :value="24">24 Hours (Standard Consult)</option>
                <option :value="48">48 Hours (Extended Coverage)</option>
                <option :value="72">72 Hours (3 Days)</option>
                <option :value="168">7 Days (Full Week)</option>
                <option :value="0">Permanent (No Expiry)</option>
              </select>
            </div>
          </div>

          <div>
            <label class="block font-bold text-slate-700 mb-1.5">Clinical Indication / Reason <span class="text-red-500">*</span></label>
            <input
              v-model="grantConfig.grantReason"
              type="text"
              required
              placeholder="e.g. Multi-disciplinary pre-operative consult, bedside wound care, or medication therapy review"
              class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div class="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              @click="$emit('close')"
              class="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
            >
              Close
            </button>
            <button
              type="submit"
              :disabled="actionLoading || selectedStaffIds.length === 0"
              class="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-semibold shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <span v-if="actionLoading" class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              <span>Grant Access ({{ selectedStaffIds.length }})</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useAuth } from '~/composables/useAuth'
import { useDoctor } from '~/composables/useDoctor'
import { triggerGlobalRefresh } from '~/composables/useAutoRefresh'

interface Props {
  isOpen: boolean
  patientId: string
  patientName?: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  updated: []
}>()

const auth = useAuth()
const doctorApi = useDoctor()
const careTeamList = doctorApi.careTeam
const staffList = doctorApi.staffList
const loading = doctorApi.loading

const canManageCareTeam = computed(() =>
  ['DOCTOR', 'HEAD_OF_UNIT', 'ADMIN'].includes(auth.user.value?.role || '')
)

const actionLoading = ref(false)
const successMsg = ref<string | null>(null)
const errorMsg = ref<string | null>(null)

const selectedStaffIds = ref<string[]>([])
const roleFilter = ref<'ALL' | 'DOCTOR' | 'NURSE' | 'PHARMACIST'>('ALL')
const staffSearch = ref('')

const grantConfig = ref({
  relationshipType: 'CONSULT' as 'PRIMARY' | 'ON_CALL' | 'CONSULT' | 'OUTPATIENT_DOCTOR',
  durationHours: 24,
  grantReason: '',
})

// Counts
const doctorCount = computed(() => staffList.value.filter((s) => s.role === 'DOCTOR' || s.role === 'HEAD_OF_UNIT').length)
const nurseCount = computed(() => staffList.value.filter((s) => s.role === 'NURSE').length)
const pharmacyCount = computed(() => staffList.value.filter((s) => s.role === 'PHARMACIST').length)

// Filtered Staff List
const filteredStaffList = computed(() => {
  let list = staffList.value

  if (roleFilter.value === 'DOCTOR') {
    list = list.filter((s) => s.role === 'DOCTOR' || s.role === 'HEAD_OF_UNIT')
  } else if (roleFilter.value === 'NURSE') {
    list = list.filter((s) => s.role === 'NURSE')
  } else if (roleFilter.value === 'PHARMACIST') {
    list = list.filter((s) => s.role === 'PHARMACIST')
  }

  if (staffSearch.value.trim()) {
    const q = staffSearch.value.toLowerCase()
    list = list.filter(
      (s) =>
        s.fullName?.toLowerCase().includes(q) ||
        s.username?.toLowerCase().includes(q) ||
        s.role?.toLowerCase().includes(q) ||
        s.homeWardName?.toLowerCase().includes(q) ||
        s.homeWardCode?.toLowerCase().includes(q)
    )
  }

  return list
})

const loadCareTeam = async () => {
  if (!props.patientId) return
  try {
    await doctorApi.fetchCareTeam(props.patientId)
  } catch (err: any) {
    errorMsg.value = err.message || 'Failed to load care team'
  }
}

watch(
  () => props.isOpen,
  async (open) => {
    if (open && props.patientId) {
      successMsg.value = null
      errorMsg.value = null
      selectedStaffIds.value = []
      staffSearch.value = ''
      roleFilter.value = 'ALL'
      await Promise.all([doctorApi.fetchStaffList(), loadCareTeam()])
    }
  }
)

const handleBatchGrant = async () => {
  if (selectedStaffIds.value.length === 0) return
  actionLoading.value = true
  errorMsg.value = null
  successMsg.value = null

  try {
    for (const staffId of selectedStaffIds.value) {
      await doctorApi.grantCareTeam(props.patientId, {
        staffId,
        relationshipType: grantConfig.value.relationshipType,
        grantReason: grantConfig.value.grantReason,
        durationHours: grantConfig.value.durationHours,
      })
    }

    successMsg.value = `Successfully granted care team access to ${selectedStaffIds.value.length} clinician(s)!`
    selectedStaffIds.value = []
    grantConfig.value.grantReason = ''
    emit('updated')
    triggerGlobalRefresh()
  } catch (err: any) {
    errorMsg.value = err.message || 'Failed to grant care team access'
  } finally {
    actionLoading.value = false
  }
}

const handleRevoke = async (careTeamId: string) => {
  actionLoading.value = true
  errorMsg.value = null
  successMsg.value = null
  try {
    await doctorApi.revokeCareTeam(props.patientId, careTeamId)
    successMsg.value = 'Care team consult access revoked.'
    emit('updated')
    triggerGlobalRefresh()
  } catch (err: any) {
    errorMsg.value = err.message || 'Failed to revoke care team access'
  } finally {
    actionLoading.value = false
  }
}

const formatRole = (role?: string) => {
  if (!role) return 'Staff'
  if (role === 'HEAD_OF_UNIT') return 'Unit Head'
  return role.charAt(0) + role.slice(1).toLowerCase()
}

const getRoleBadge = (role?: string) => {
  switch (role) {
    case 'DOCTOR':
    case 'HEAD_OF_UNIT':
      return 'bg-blue-100 text-blue-800'
    case 'NURSE':
      return 'bg-emerald-100 text-emerald-800'
    case 'PHARMACIST':
      return 'bg-amber-100 text-amber-800'
    default:
      return 'bg-slate-100 text-slate-700'
  }
}

const getRelationshipBadge = (rel: string) => {
  if (rel === 'PRIMARY') return 'bg-blue-100 text-blue-800'
  if (rel === 'ON_CALL') return 'bg-amber-100 text-amber-800'
  if (rel === 'CONSULT') return 'bg-purple-100 text-purple-800'
  return 'bg-slate-100 text-slate-700'
}

const formatExpiry = (iso: string) => {
  if (!iso) return 'Permanent'
  const d = new Date(iso)
  return d.toLocaleString('en-GB', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>
