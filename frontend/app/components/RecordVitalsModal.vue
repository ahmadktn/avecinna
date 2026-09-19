<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs"
  >
    <div class="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-5 sm:p-7 space-y-5 max-h-[90vh] overflow-y-auto my-6 sm:my-8">
      <!-- Modal Header -->
      <div class="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h3 class="text-lg font-bold text-slate-900 tracking-tight">Record Bedside Vital Signs</h3>
          <p class="text-xs text-slate-500 mt-0.5">
            Log physiological observations to patient chart with isolated cryptographic audit verification
          </p>
        </div>
        <button
          type="button"
          @click="closeModal"
          class="w-8 h-8 rounded-xl bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Error message -->
      <div v-if="submitError" class="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs flex items-center gap-2">
        <svg class="w-4 h-4 text-red-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>{{ submitError }}</span>
      </div>

      <form @submit.prevent="handleSaveVitals" class="space-y-4 text-xs">
        <!-- Patient Selector (if not pre-provided) -->
        <div v-if="!patientId" class="space-y-1.5">
          <label class="block font-bold text-slate-700 uppercase tracking-wider text-[11px]">
            Select Patient <span class="text-red-500">*</span>
          </label>
          <select
            v-model="selectedId"
            required
            class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500 font-medium"
          >
            <option value="" disabled>Choose an admitted inpatient...</option>
            <option v-for="p in patientsList" :key="p.id" :value="p.id">
              {{ p.fullName }} ({{ p.assignedBed || 'Bed 01' }}) — MRN: {{ p.mrn }}
            </option>
          </select>
        </div>
        <div v-else class="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between">
          <div class="space-y-0.5">
            <span class="text-[10px] font-bold uppercase text-slate-400">Target Patient</span>
            <p class="text-xs font-bold text-slate-800">{{ patientName || 'Patient' }}</p>
          </div>
          <span class="font-mono text-[11px] text-slate-500 bg-white border border-slate-200 px-2.5 py-1 rounded-lg">
            ID: {{ patientId.slice(0, 10) }}...
          </span>
        </div>

        <!-- Vitals Input Grid -->
        <div class="grid grid-cols-2 gap-3.5">
          <div class="space-y-1.5">
            <label class="block font-bold text-slate-700 uppercase tracking-wider text-[11px]">
              Blood Pressure (mmHg)
            </label>
            <input
              v-model="vitalsForm.bp"
              type="text"
              placeholder="e.g. 120/80"
              class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div class="space-y-1.5">
            <label class="block font-bold text-slate-700 uppercase tracking-wider text-[11px]">
              Heart Rate (bpm)
            </label>
            <input
              v-model.number="vitalsForm.hr"
              type="number"
              min="30"
              max="250"
              placeholder="e.g. 72"
              class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div class="space-y-1.5">
            <label class="block font-bold text-slate-700 uppercase tracking-wider text-[11px]">
              SpO2 Oxygen (%)
            </label>
            <input
              v-model.number="vitalsForm.spo2"
              type="number"
              min="50"
              max="100"
              placeholder="e.g. 98"
              class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div class="space-y-1.5">
            <label class="block font-bold text-slate-700 uppercase tracking-wider text-[11px]">
              Temperature (°C)
            </label>
            <input
              v-model="vitalsForm.temp"
              type="text"
              placeholder="e.g. 36.8"
              class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div class="space-y-1.5">
            <label class="block font-bold text-slate-700 uppercase tracking-wider text-[11px]">
              Respiratory Rate (/min)
            </label>
            <input
              v-model.number="vitalsForm.rr"
              type="number"
              min="6"
              max="60"
              placeholder="e.g. 16"
              class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div class="space-y-1.5">
            <label class="block font-bold text-slate-700 uppercase tracking-wider text-[11px]">
              Blood Glucose (mg/dL)
            </label>
            <input
              v-model="vitalsForm.bloodGlucose"
              type="text"
              placeholder="e.g. 110"
              class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <!-- Clinical Notes / Bedside Observations -->
        <div class="space-y-1.5">
          <label class="block font-bold text-slate-700 uppercase tracking-wider text-[11px]">
            Clinical Observation Notes
          </label>
          <textarea
            v-model="vitalsForm.notes"
            rows="2"
            placeholder="Patient alert and oriented x3, resting comfortably, IV infusion patent..."
            class="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-blue-500 resize-none font-sans"
          ></textarea>
        </div>

        <!-- Form Actions -->
        <div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            @click="closeModal"
            class="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="submitting || (!patientId && !selectedId)"
            class="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white font-semibold text-xs transition-colors shadow-xs flex items-center gap-2 cursor-pointer"
          >
            <svg v-if="submitting" class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <span>{{ submitting ? 'Saving Observation...' : 'Commit Bedside Vitals' }}</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useNurse } from '~/composables/useNurse'

const props = defineProps<{
  isOpen: boolean
  patientId?: string
  patientName?: string
  patientsList?: Array<{ id: string; fullName: string; assignedBed?: string; mrn: string }>
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'saved', observation: any): void
}>()

const nurseApi = useNurse()

const selectedId = ref(props.patientId || '')
const submitting = ref(false)
const submitError = ref<string | null>(null)

const vitalsForm = ref({
  bp: '120/80',
  hr: 72,
  spo2: 98,
  temp: '36.8',
  rr: 16,
  bloodGlucose: '',
  notes: '',
})

watch(
  () => props.patientId,
  (newVal) => {
    if (newVal) selectedId.value = newVal
  }
)

const closeModal = () => {
  submitError.value = null
  emit('close')
}

const handleSaveVitals = async () => {
  const targetPatientId = props.patientId || selectedId.value
  if (!targetPatientId) {
    submitError.value = 'Please select a patient'
    return
  }

  submitting.value = true
  submitError.value = null

  try {
    const res = await nurseApi.recordVitals({
      patientId: targetPatientId,
      bp: vitalsForm.value.bp || undefined,
      hr: vitalsForm.value.hr ? Number(vitalsForm.value.hr) : undefined,
      spo2: vitalsForm.value.spo2 ? Number(vitalsForm.value.spo2) : undefined,
      temp: vitalsForm.value.temp || undefined,
      rr: vitalsForm.value.rr ? Number(vitalsForm.value.rr) : undefined,
      bloodGlucose: vitalsForm.value.bloodGlucose || undefined,
      notes: vitalsForm.value.notes || undefined,
    })

    emit('saved', res)
    closeModal()
  } catch (err: any) {
    submitError.value = err.message || 'Failed to record vital signs observation'
  } finally {
    submitting.value = false
  }
}
</script>
