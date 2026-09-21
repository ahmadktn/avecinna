<template>
  <div class="my-6 rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition">
    <div class="flex items-center justify-between border-b border-slate-100 pb-3">
      <div>
        <h4 class="font-brand text-base font-semibold text-slate-900">
          Interactive CAAC Engine Simulator
        </h4>
        <p class="text-xs text-slate-500">
          Simulate runtime 4-factor authorization decisions in real-time.
        </p>
      </div>
      <span
        :class="[
          'inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-xs font-semibold',
          decision.isPermitted
            ? 'bg-emerald-50 text-emerald-700'
            : 'bg-red-50 text-red-700'
        ]"
      >
        <span class="h-2 w-2 rounded-full" :class="decision.isPermitted ? 'bg-emerald-500' : 'bg-red-500'"></span>
        {{ decision.isPermitted ? 'PERMITTED (200 OK)' : 'DENIED (403 FORBIDDEN)' }}
      </span>
    </div>

    <!-- Interactive Inputs Grid -->
    <div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div>
        <label class="block text-xs font-medium text-slate-600">Clinician Role</label>
        <select
          v-model="role"
          class="mt-1 block w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none"
        >
          <option value="DOCTOR">DOCTOR (Physician)</option>
          <option value="NURSE">NURSE (Ward Nurse)</option>
          <option value="CLERK">CLERK (Ward Clerk)</option>
          <option value="PHARMACIST">PHARMACIST (Pharmacy)</option>
          <option value="HEAD_OF_UNIT">HEAD_OF_UNIT (Unit Chief)</option>
          <option value="ADMIN">ADMIN (System Administrator)</option>
        </select>
      </div>

      <div>
        <label class="block text-xs font-medium text-slate-600">Clinician Active Ward</label>
        <select
          v-model="activeWard"
          class="mt-1 block w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none"
        >
          <option value="w-cardio">w-cardio (Cardiology Ward)</option>
          <option value="w-icu">w-icu (Intensive Care Unit)</option>
          <option value="w-peds">w-peds (Pediatrics Ward)</option>
          <option value="w-opd">w-opd (Outpatient Clinic)</option>
        </select>
      </div>

      <div>
        <label class="block text-xs font-medium text-slate-600">Patient Assigned Ward</label>
        <select
          v-model="patientWard"
          class="mt-1 block w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none"
        >
          <option value="w-cardio">w-cardio (Cardiology Ward)</option>
          <option value="w-icu">w-icu (Intensive Care Unit)</option>
          <option value="w-peds">w-peds (Pediatrics Ward)</option>
          <option value="w-opd">w-opd (Outpatient Clinic)</option>
        </select>
      </div>
    </div>

    <!-- Toggle Switches -->
    <div class="mt-4 flex flex-wrap gap-4 border-t border-slate-100 pt-3">
      <label class="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
        <input type="checkbox" v-model="shiftActive" class="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
        Shift Active (Within Roster Window)
      </label>

      <label class="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
        <input type="checkbox" v-model="inCareTeam" class="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
        Assigned to Patient Care Team (Consult/MDT)
      </label>

      <label class="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
        <input type="checkbox" v-model="isOutpatientToday" class="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
        Outpatient Appointment Today
      </label>

      <label class="flex items-center gap-2 text-xs font-medium text-red-600 cursor-pointer font-semibold">
        <input type="checkbox" v-model="isBreakGlass" class="rounded border-red-300 text-red-600 focus:ring-red-500" />
        Break-Glass Emergency Active
      </label>
    </div>

    <!-- Result Box -->
    <div class="mt-4 rounded-lg bg-slate-50 p-3 font-mono text-xs text-slate-800 border border-slate-100">
      <div class="flex items-center justify-between text-slate-500 mb-1">
        <span>RELATIONSHIP EVALUATION</span>
        <span>FORMULA: Permit = RoleValid ∧ ShiftActive ∧ (Ward ∨ CareTeam ∨ OPD ∨ BreakGlass)</span>
      </div>
      <div>
        <span class="font-bold text-blue-600">Decision:</span> {{ decision.isPermitted ? 'PERMITTED' : 'DENIED' }} |
        <span class="font-bold text-blue-600">Relationship:</span> {{ decision.relationshipType || 'NONE' }} |
        <span class="font-bold text-blue-600">Audit Reason:</span> {{ decision.reason }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const role = ref('DOCTOR')
const activeWard = ref('w-cardio')
const patientWard = ref('w-cardio')
const shiftActive = ref(true)
const inCareTeam = ref(false)
const isOutpatientToday = ref(false)
const isBreakGlass = ref(false)

const decision = computed(() => {
  if (!shiftActive.value && !isBreakGlass.value) {
    return {
      isPermitted: false,
      relationshipType: null,
      reason: 'SHIFT_INACTIVE: Access requested outside scheduled roster window',
    }
  }

  if (isBreakGlass.value) {
    return {
      isPermitted: true,
      relationshipType: 'BREAK_GLASS',
      reason: 'Emergency Break-Glass protocol active with mandatory audit justification',
    }
  }

  if (activeWard.value === patientWard.value) {
    return {
      isPermitted: true,
      relationshipType: 'PRIMARY',
      reason: 'Active clinician ward matches patient assigned primary ward',
    }
  }

  if (inCareTeam.value) {
    return {
      isPermitted: true,
      relationshipType: 'CONSULT',
      reason: 'Clinician is active member of multidisciplinary care team',
    }
  }

  if (isOutpatientToday.value) {
    return {
      isPermitted: true,
      relationshipType: 'OUTPATIENT_DOCTOR',
      reason: 'Clinician is assigned consulting doctor for today appointment',
    }
  }

  return {
    isPermitted: false,
    relationshipType: null,
    reason: 'NO_WARD_OR_CARE_TEAM_RELATIONSHIP: Cross-ward access rejected (BOLA 403 Forbidden)',
  }
})
</script>
