<template>
  <div
    v-if="isOpen"
    @click.self="$emit('close')"
    class="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
    role="dialog"
    aria-modal="true"
  >
    <div class="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative my-8 max-h-[90vh] overflow-y-auto space-y-6">
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
          <h3 class="text-lg font-bold text-slate-900 tracking-tight">Multi-Disciplinary Care Team & Consults</h3>
          <p class="text-xs text-slate-500 mt-0.5">
            Manage attending clinicians and grant CAAC consult access for <strong class="text-slate-800">{{ patientName || 'Patient' }}</strong>.
          </p>
        </div>
      </div>

      <!-- Feedback Alerts -->
      <div v-if="successMsg" class="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3.5 rounded-xl text-xs flex items-center justify-between">
        <span>{{ successMsg }}</span>
        <button type="button" @click="successMsg = null" class="font-bold cursor-pointer">✕</button>
      </div>

      <div v-if="errorMsg" class="bg-red-50 border border-red-200 text-red-700 p-3.5 rounded-xl text-xs flex items-center justify-between">
        <span>{{ errorMsg }}</span>
        <button type="button" @click="errorMsg = null" class="font-bold cursor-pointer">✕</button>
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
          No external care team consults granted. Primary ward staff have default CAAC access.
        </div>

        <div v-else class="space-y-2 max-h-48 overflow-y-auto pr-1">
          <div
            v-for="member in careTeamList"
            :key="member.id"
            class="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs hover:bg-slate-100/60 transition-colors"
          >
            <div class="min-w-0 space-y-0.5">
              <div class="flex items-center gap-2">
                <span class="font-bold text-slate-900 truncate">{{ member.staffName || member.staffUsername }}</span>
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
              type="button"
              @click="handleRevoke(member.id)"
              :disabled="actionLoading"
              class="text-xs font-semibold text-red-600 hover:text-red-800 bg-white hover:bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg transition-colors shrink-0 shadow-2xs cursor-pointer"
            >
              Revoke
            </button>
          </div>
        </div>
      </div>

      <!-- Add Clinicians Form (Supports Multi-Clinician Selection) -->
      <div class="border-t border-slate-100 pt-5 space-y-4">
        <div>
          <h4 class="text-xs font-bold text-slate-900 uppercase tracking-wider">Grant Consult Access to Clinicians</h4>
          <p class="text-[11px] text-slate-500">Select one or multiple doctors/specialists to add to this patient's care team.</p>
        </div>

        <form @submit.prevent="handleBatchGrant" class="space-y-4 text-xs">
          <!-- Multi-Clinician Selection Box -->
          <div class="space-y-1.5">
            <label class="block font-bold text-slate-700">
              Select Clinicians <span class="text-red-500">*</span>
              <span class="text-slate-400 font-normal font-mono ml-1">({{ selectedStaffIds.length }} selected)</span>
            </label>

            <!-- Clinician Chips List -->
            <div class="max-h-36 overflow-y-auto border border-slate-200 rounded-xl p-2.5 bg-slate-50 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label
                v-for="s in staffList"
                :key="s.id"
                class="flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-colors select-none"
                :class="selectedStaffIds.includes(s.id) ? 'bg-blue-50 border-blue-300 text-blue-900 font-bold' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100/70'"
              >
                <input
                  type="checkbox"
                  :value="s.id"
                  v-model="selectedStaffIds"
                  class="rounded text-blue-600 focus:ring-blue-500"
                />
                <div class="min-w-0 truncate">
                  <span class="block truncate">{{ s.fullName }}</span>
                  <span class="text-[10px] text-slate-400 font-mono font-normal">@{{ s.username }} · {{ s.role }}</span>
                </div>
              </label>
            </div>
          </div>

          <!-- Parameters: Relationship, Duration, Reason -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block font-bold text-slate-700 mb-1.5">Relationship / Role Type <span class="text-red-500">*</span></label>
              <select
                v-model="grantConfig.relationshipType"
                required
                class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:border-blue-500 font-medium"
              >
                <option value="CONSULT">CONSULT (Specialist Consultation)</option>
                <option value="ON_CALL">ON_CALL (Emergency Coverage)</option>
                <option value="PRIMARY">PRIMARY (Primary Attending)</option>
              </select>
            </div>

            <div>
              <label class="block font-bold text-slate-700 mb-1.5">Consult Duration <span class="text-red-500">*</span></label>
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
              placeholder="e.g. Multi-disciplinary pre-operative consult and clinical assessment"
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
              <span>Grant Consult Access ({{ selectedStaffIds.length }})</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useDoctor } from '~/composables/useDoctor'

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

const doctorApi = useDoctor()
const careTeamList = doctorApi.careTeam
const staffList = doctorApi.staffList
const loading = doctorApi.loading

const actionLoading = ref(false)
const successMsg = ref<string | null>(null)
const errorMsg = ref<string | null>(null)

const selectedStaffIds = ref<string[]>([])

const grantConfig = ref({
  relationshipType: 'CONSULT' as 'PRIMARY' | 'ON_CALL' | 'CONSULT' | 'OUTPATIENT_DOCTOR',
  durationHours: 24,
  grantReason: '',
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

    successMsg.value = `Successfully granted consult access to ${selectedStaffIds.value.length} clinician(s)!`
    selectedStaffIds.value = []
    grantConfig.value.grantReason = ''
    emit('updated')
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
  } catch (err: any) {
    errorMsg.value = err.message || 'Failed to revoke care team access'
  } finally {
    actionLoading.value = false
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
