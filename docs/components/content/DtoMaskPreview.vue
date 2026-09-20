<template>
  <div class="my-6 rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition dark:border-slate-800 dark:bg-slate-900">
    <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
      <div>
        <h4 class="font-brand text-base font-semibold text-slate-900 dark:text-slate-100">
          Server-Side Role DTO Masking (OWASP API3 Mitigation)
        </h4>
        <p class="text-xs text-slate-500 dark:text-slate-400">
          Select a clinician role to inspect the JSON response payload serialized by the backend.
        </p>
      </div>

      <!-- Role Selector Pills -->
      <div class="flex flex-wrap gap-1">
        <button
          v-for="r in roles"
          :key="r"
          @click="selectedRole = r"
          :class="[
            'rounded-md px-2.5 py-1 text-xs font-semibold transition',
            selectedRole === r
              ? 'bg-blue-600 text-white dark:bg-blue-500'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
          ]"
        >
          {{ r }}
        </button>
      </div>
    </div>

    <!-- Payload JSON Viewer -->
    <div class="mt-4">
      <div class="flex items-center justify-between text-xs font-mono text-slate-500 mb-1.5 dark:text-slate-400">
        <span>RESPONSE BODY (HTTP 200 OK)</span>
        <span class="text-emerald-600 dark:text-emerald-400 font-semibold">{{ policySummary }}</span>
      </div>
      <pre class="overflow-x-auto rounded-lg bg-slate-950 p-4 font-mono text-xs text-slate-200 leading-relaxed max-h-80">{{ formattedJson }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const roles = ['DOCTOR', 'NURSE', 'CLERK', 'PHARMACIST', 'ADMIN']
const selectedRole = ref('DOCTOR')

const rawRecord = {
  id: 'p-cardio-01',
  mrn: 'MRN-2026-0891',
  fullName: 'Eleanor Vance',
  dateOfBirth: '1968-04-12',
  gender: 'FEMALE',
  assignedBed: 'Bed 4B',
  primaryWardId: 'w-cardio',
  vitals: {
    bloodPressure: '138/88 mmHg',
    heartRate: 78,
    respiratoryRate: 16,
    temperature: 36.8,
    oxygenSaturation: 98,
  },
  activeMedications: [
    { name: 'Metoprolol Tartrate', dosage: '25mg BID', route: 'Oral' },
    { name: 'Atorvastatin', dosage: '40mg QPM', route: 'Oral' },
  ],
  allergies: ['Penicillin G (Severe Anaphylaxis)', 'Sulfa Drugs (Rash)'],
  clinicalNotes: [
    'Patient presented with acute retrosternal chest tightness radiating to left arm. ECG demonstrates normal sinus rhythm with non-specific ST changes.',
  ],
  diagnoses: ['Hypertensive Heart Disease', 'Coronary Artery Atherosclerosis'],
  carePlan: 'Continue cardiac telemetry monitoring. Schedule diagnostic echocardiogram.',
}

const policySummary = computed(() => {
  switch (selectedRole.value) {
    case 'DOCTOR':
      return 'FULL ACCESS: Complete clinical & diagnostic chart'
    case 'NURSE':
      return 'MASKED: Vitals, medications, allergies & care plan ONLY (notes/diagnoses redacted)'
    case 'CLERK':
      return 'MASKED: Demographics & bed assignment ONLY'
    case 'PHARMACIST':
      return 'MASKED: Active medications, prescriptions & allergy profile ONLY'
    case 'ADMIN':
      return 'STRICT REDACTION: Clinical data replaced with privacy restriction notices'
    default:
      return ''
  }
})

const formattedJson = computed(() => {
  let masked: any = {}

  if (selectedRole.value === 'DOCTOR') {
    masked = { ...rawRecord }
  } else if (selectedRole.value === 'NURSE') {
    masked = {
      id: rawRecord.id,
      mrn: rawRecord.mrn,
      fullName: rawRecord.fullName,
      assignedBed: rawRecord.assignedBed,
      primaryWardId: rawRecord.primaryWardId,
      vitals: rawRecord.vitals,
      activeMedications: rawRecord.activeMedications,
      allergies: rawRecord.allergies,
      carePlan: rawRecord.carePlan,
    }
  } else if (selectedRole.value === 'CLERK') {
    masked = {
      id: rawRecord.id,
      mrn: rawRecord.mrn,
      fullName: rawRecord.fullName,
      dateOfBirth: rawRecord.dateOfBirth,
      gender: rawRecord.gender,
      assignedBed: rawRecord.assignedBed,
      primaryWardId: rawRecord.primaryWardId,
    }
  } else if (selectedRole.value === 'PHARMACIST') {
    masked = {
      id: rawRecord.id,
      mrn: rawRecord.mrn,
      fullName: rawRecord.fullName,
      activeMedications: rawRecord.activeMedications,
      allergies: rawRecord.allergies,
    }
  } else if (selectedRole.value === 'ADMIN') {
    masked = {
      id: rawRecord.id,
      mrn: rawRecord.mrn,
      fullName: rawRecord.fullName,
      assignedBed: rawRecord.assignedBed,
      primaryWardId: rawRecord.primaryWardId,
      vitals: '[REDACTED - ADMIN PRIVACY RESTRICTION]',
      activeMedications: '[REDACTED - ADMIN PRIVACY RESTRICTION]',
      allergies: '[REDACTED - ADMIN PRIVACY RESTRICTION]',
      clinicalNotes: '[REDACTED - ADMIN PRIVACY RESTRICTION]',
      adminPrivacyNotice: 'System Administrators manage infrastructure and verify Merkle audit chains but are strictly prohibited from viewing patient clinical data.',
    }
  }

  return JSON.stringify(masked, null, 2)
})
</script>
