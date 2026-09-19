<template>
  <div class="min-h-screen bg-slate-50 font-sans">
    <AppSidebar />

    <div class="pl-56 flex flex-col min-h-screen">
      <AppNavbar
        @openWardSwitcher="showWardSwitcher = true"
        @openBreakGlass="showBreakGlassModal = true"
      />

      <main class="flex-1 w-full px-8 py-6 space-y-5">
        <!-- Success Confirmation View -->
        <div
          v-if="encounterCompleted"
          class="bg-white border border-emerald-200 rounded-2xl p-8 sm:p-12 text-center space-y-5 shadow-xs max-w-2xl mx-auto my-8"
        >
          <div class="w-16 h-16 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <div class="space-y-1.5">
            <h2 class="font-brand text-xl font-semibold text-slate-900 tracking-tight">Clinical Encounter Signed & Cryptographically Recorded</h2>
            <p class="text-xs text-slate-500 max-w-md mx-auto">
              SOAP clinical notes, updated vital telemetry, active prescriptions, and lab orders have been committed to the patient record and logged to the Merkle audit ledger.
            </p>
          </div>

          <div class="flex items-center justify-center gap-3 pt-4">
            <NuxtLink
              :to="`/patients/${selectedPatientId}`"
              class="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors shadow-xs"
            >
              View Patient Full Record
            </NuxtLink>
            <button
              type="button"
              @click="resetEncounterForm"
              class="px-5 py-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
            >
              Start New Encounter
            </button>
          </div>
        </div>

        <!-- Encounter Workspace Form -->
        <div v-else class="space-y-5">
          <!-- Clean Page Header -->
          <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div class="flex items-center gap-2.5">
                <h1 class="font-brand text-xl font-semibold text-slate-900 tracking-tight">Clinical Encounter Workspace</h1>
                <span class="bg-slate-100 text-slate-700 text-[10px] font-semibold px-2 py-0.5 rounded-full font-mono">
                  SOAP & Rx
                </span>
              </div>
              <p class="text-xs text-slate-500 mt-0.5">
                Record diagnostic assessment, SOAP notes, telemetry, active medications, and diagnostic lab orders.
              </p>
            </div>

            <div class="flex items-center gap-2">
              <NuxtLink
                to="/doctor"
                class="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors shadow-2xs"
              >
                Back to Overview
              </NuxtLink>
            </div>
          </div>

          <!-- Error Alert -->
          <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl text-xs flex items-center justify-between">
            <span>{{ error }}</span>
            <button @click="error = null" class="font-bold">✕</button>
          </div>

          <form @submit.prevent="handleSubmitEncounter" class="space-y-6">
            <!-- Patient Selector Card -->
            <div class="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-4">
              <div class="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 class="text-xs font-bold text-slate-700 uppercase tracking-wider">Patient Selection & Identifiers</h3>
                <span class="text-xs text-slate-400 font-mono">CAAC Authorized</span>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-bold text-slate-700 mb-1.5">Select Patient <span class="text-red-500">*</span></label>
                  <select
                    v-model="selectedPatientId"
                    required
                    @change="onPatientChange"
                    class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-medium focus:outline-none focus:border-blue-500"
                  >
                    <option value="" disabled>Select patient from directory</option>
                    <option v-for="p in allPatients" :key="p.id" :value="p.id">
                      {{ p.fullName }} (MRN: {{ p.mrn }} · {{ p.assignedBed || p.patientType || 'Outpatient' }})
                    </option>
                  </select>
                </div>

                <div>
                  <label class="block text-xs font-bold text-slate-700 mb-1.5">Primary Clinical Diagnosis / ICD-10 <span class="text-red-500">*</span></label>
                  <input
                    v-model="diagnosis"
                    type="text"
                    required
                    placeholder="e.g. Essential Hypertension (I10) / Type 2 Diabetes Mellitus"
                    class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <!-- Vitals & Telemetry Card -->
            <div class="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-4">
              <div class="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 class="text-xs font-bold text-slate-700 uppercase tracking-wider">Live Vital Signs & Physiological Telemetry</h3>
                <span class="text-[11px] text-slate-400 font-mono">Clinical Observations</span>
              </div>

              <div class="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
                <div>
                  <label class="block text-[11px] font-semibold text-slate-600 mb-1">Blood Pressure</label>
                  <input
                    v-model="vitals.bp"
                    type="text"
                    placeholder="120/80"
                    class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label class="block text-[11px] font-semibold text-slate-600 mb-1">Heart Rate (bpm)</label>
                  <input
                    v-model.number="vitals.hr"
                    type="number"
                    placeholder="75"
                    class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label class="block text-[11px] font-semibold text-slate-600 mb-1">SpO2 Oxygen (%)</label>
                  <input
                    v-model.number="vitals.spo2"
                    type="number"
                    placeholder="98"
                    class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label class="block text-[11px] font-semibold text-slate-600 mb-1">Temperature (°C)</label>
                  <input
                    v-model="vitals.temperature"
                    type="text"
                    placeholder="36.8"
                    class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label class="block text-[11px] font-semibold text-slate-600 mb-1">Resp. Rate (/min)</label>
                  <input
                    v-model.number="vitals.respiratoryRate"
                    type="number"
                    placeholder="16"
                    class="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <!-- Structured SOAP Notes Card -->
            <div class="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-4">
              <div class="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 class="text-xs font-bold text-slate-700 uppercase tracking-wider">SOAP Clinical Documentation</h3>
                <span class="text-[11px] text-slate-400">Structured Medical Note</span>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <!-- Subjective -->
                <div class="space-y-1.5">
                  <label class="block font-bold text-slate-700">
                    S — Subjective (Chief Complaint & History)
                  </label>
                  <textarea
                    v-model="soapNotes.subjective"
                    rows="3"
                    placeholder="Patient reports presenting symptoms, duration, pain scale, and history of present illness..."
                    class="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-blue-500 leading-relaxed"
                  ></textarea>
                </div>

                <!-- Objective -->
                <div class="space-y-1.5">
                  <label class="block font-bold text-slate-700">
                    O — Objective (Physical Exam & Diagnostic Findings)
                  </label>
                  <textarea
                    v-model="soapNotes.objective"
                    rows="3"
                    placeholder="Physical examination findings, heart sounds, chest auscultation, telemetry observations..."
                    class="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-blue-500 leading-relaxed"
                  ></textarea>
                </div>

                <!-- Assessment -->
                <div class="space-y-1.5">
                  <label class="block font-bold text-slate-700">
                    A — Assessment (Clinical Differential & Synthesis)
                  </label>
                  <textarea
                    v-model="soapNotes.assessment"
                    rows="3"
                    placeholder="Clinical impression, disease progression, differential diagnoses ruled in/out..."
                    class="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-blue-500 leading-relaxed"
                  ></textarea>
                </div>

                <!-- Plan -->
                <div class="space-y-1.5">
                  <label class="block font-bold text-slate-700">
                    P — Plan (Therapeutic Regimen & Follow-up)
                  </label>
                  <textarea
                    v-model="soapNotes.plan"
                    rows="3"
                    placeholder="Pharmacotherapy regimen, patient education, dietary recommendations, next review date..."
                    class="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-blue-500 leading-relaxed"
                  ></textarea>
                </div>
              </div>
            </div>

            <!-- Active Prescriptions Builder Card -->
            <div class="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-4">
              <div class="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 class="text-xs font-bold text-slate-700 uppercase tracking-wider">Prescriptions & Pharmacotherapy (Rx)</h3>
                  <p class="text-[11px] text-slate-500">Order medications with dose, route, and dosing frequency.</p>
                </div>

                <button
                  type="button"
                  @click="addPrescriptionRow"
                  class="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200/80 text-slate-800 text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
                >
                  <svg class="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Add Medication</span>
                </button>
              </div>

              <div v-if="prescriptions.length === 0" class="py-5 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                No new prescriptions added for this encounter. Click "Add Medication" if indicated.
              </div>

              <div v-else class="space-y-3">
                <div
                  v-for="(rx, index) in prescriptions"
                  :key="index"
                  class="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs"
                >
                  <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div class="sm:col-span-2">
                      <label class="block text-[11px] font-bold text-slate-600 mb-1">Medication / Drug Name <span class="text-red-500">*</span></label>
                      <input
                        v-model="rx.medicationName"
                        type="text"
                        required
                        placeholder="e.g. Amoxicillin / Clavulanate"
                        class="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label class="block text-[11px] font-bold text-slate-600 mb-1">Dosage <span class="text-red-500">*</span></label>
                      <input
                        v-model="rx.dosage"
                        type="text"
                        required
                        placeholder="e.g. 625mg"
                        class="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label class="block text-[11px] font-bold text-slate-600 mb-1">Frequency <span class="text-red-500">*</span></label>
                      <select
                        v-model="rx.frequency"
                        required
                        class="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium focus:outline-none focus:border-blue-500"
                      >
                        <option value="OD">Once Daily (OD)</option>
                        <option value="BD">Twice Daily (BD)</option>
                        <option value="TDS">Three Times Daily (TDS)</option>
                        <option value="QDS">Four Times Daily (QDS)</option>
                        <option value="PRN">As Needed (PRN)</option>
                        <option value="STAT">Immediately (STAT)</option>
                      </select>
                    </div>
                  </div>

                  <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label class="block text-[11px] font-bold text-slate-600 mb-1">Route</label>
                      <select
                        v-model="rx.route"
                        class="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500"
                      >
                        <option value="Oral">Oral (PO)</option>
                        <option value="IV">Intravenous (IV)</option>
                        <option value="IM">Intramuscular (IM)</option>
                        <option value="SC">Subcutaneous (SC)</option>
                        <option value="Topical">Topical</option>
                        <option value="Inhalation">Inhalation</option>
                      </select>
                    </div>

                    <div>
                      <label class="block text-[11px] font-bold text-slate-600 mb-1">Duration</label>
                      <input
                        v-model="rx.duration"
                        type="text"
                        placeholder="e.g. 7 days"
                        class="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div class="sm:col-span-2 flex items-end justify-between gap-2">
                      <div class="flex-1">
                        <label class="block text-[11px] font-bold text-slate-600 mb-1">Instructions</label>
                        <input
                          v-model="rx.instructions"
                          type="text"
                          placeholder="e.g. Take after meals with full glass of water"
                          class="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <button
                        type="button"
                        @click="removePrescriptionRow(index)"
                        class="px-2.5 py-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg border border-red-200 transition-colors shrink-0 font-bold"
                        title="Remove medication"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Diagnostic Lab Orders Builder Card -->
            <div class="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-4">
              <div class="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 class="text-xs font-bold text-slate-700 uppercase tracking-wider">Laboratory & Diagnostic Orders</h3>
                  <p class="text-[11px] text-slate-500">Order pathology, microbiology, and biochemical investigation panels.</p>
                </div>

                <button
                  type="button"
                  @click="addLabOrderRow"
                  class="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200/80 text-slate-800 text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
                >
                  <svg class="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Add Lab Order</span>
                </button>
              </div>

              <div v-if="labOrders.length === 0" class="py-5 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                No diagnostic laboratory orders queued for this encounter.
              </div>

              <div v-else class="space-y-3">
                <div
                  v-for="(lab, index) in labOrders"
                  :key="index"
                  class="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs"
                >
                  <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div class="sm:col-span-2">
                      <label class="block text-[11px] font-bold text-slate-600 mb-1">Test Name / Panel <span class="text-red-500">*</span></label>
                      <input
                        v-model="lab.testName"
                        type="text"
                        required
                        placeholder="e.g. Full Blood Count (FBC) / Serum Electrolytes"
                        class="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label class="block text-[11px] font-bold text-slate-600 mb-1">Category <span class="text-red-500">*</span></label>
                      <select
                        v-model="lab.category"
                        required
                        class="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium focus:outline-none focus:border-blue-500"
                      >
                        <option value="Hematology">Hematology</option>
                        <option value="Biochemistry">Biochemistry</option>
                        <option value="Microbiology">Microbiology</option>
                        <option value="Immunology">Immunology</option>
                        <option value="Radiology">Radiology / Imaging</option>
                      </select>
                    </div>

                    <div>
                      <label class="block text-[11px] font-bold text-slate-600 mb-1">Priority</label>
                      <select
                        v-model="lab.priority"
                        class="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium focus:outline-none focus:border-blue-500"
                      >
                        <option value="ROUTINE">Routine</option>
                        <option value="URGENT">Urgent</option>
                        <option value="STAT">STAT (Emergency)</option>
                      </select>
                    </div>
                  </div>

                  <div class="flex items-center gap-2">
                    <div class="flex-1">
                      <label class="block text-[11px] font-bold text-slate-600 mb-1">Clinical Indication</label>
                      <input
                        v-model="lab.clinicalIndication"
                        type="text"
                        placeholder="e.g. Rule out bacteremia / monitor renal clearance"
                        class="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <button
                      type="button"
                      @click="removeLabOrderRow(index)"
                      class="px-2.5 py-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg border border-red-200 transition-colors shrink-0 font-bold self-end"
                      title="Remove lab order"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Submit Button & Disclaimer -->
            <div class="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
              <p class="text-[11px] text-slate-400 leading-relaxed">
                By signing and saving, you confirm these entries are clinical representations of today's encounter under your physician credentials.
              </p>

              <button
                type="submit"
                :disabled="submitting"
                class="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-semibold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer shrink-0"
              >
                <span v-if="submitting" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <span>Sign & Save Clinical Encounter</span>
              </button>
            </div>
          </form>
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
import { useRoute } from 'vue-router'
import { useDoctor } from '~/composables/useDoctor'
import { usePatients, type Patient } from '~/composables/usePatients'

const route = useRoute()
const doctorApi = useDoctor()
const patientsApi = usePatients()

const showWardSwitcher = ref(false)
const showBreakGlassModal = ref(false)

const submitting = ref(false)
const error = ref<string | null>(null)
const encounterCompleted = ref(false)

const allPatients = ref<Patient[]>([])
const selectedPatientId = ref('')
const appointmentId = ref<string | undefined>(undefined)

const diagnosis = ref('')
const vitals = ref({
  bp: '',
  hr: undefined as number | undefined,
  spo2: undefined as number | undefined,
  temperature: '',
  respiratoryRate: undefined as number | undefined,
})

const soapNotes = ref({
  subjective: '',
  objective: '',
  assessment: '',
  plan: '',
})

const prescriptions = ref<
  Array<{
    medicationName: string
    dosage: string
    frequency: string
    route: string
    duration: string
    instructions: string
  }>
>([])

const labOrders = ref<
  Array<{
    testName: string
    category: string
    priority: string
    clinicalIndication: string
  }>
>([])

const loadPatients = async () => {
  try {
    const list = await patientsApi.fetchPatients()
    allPatients.value = list

    // Check route query
    const qPatientId = route.query.patientId as string
    const qAppId = route.query.appointmentId as string
    if (qAppId) {
      appointmentId.value = qAppId
    }
    if (qPatientId) {
      selectedPatientId.value = qPatientId
      onPatientChange()
    }
  } catch (err: any) {
    error.value = err.message || 'Failed to load patients roster'
  }
}

const onPatientChange = () => {
  const p = allPatients.value.find((pt) => pt.id === selectedPatientId.value)
  if (p) {
    if (p.vitals) {
      vitals.value = {
        bp: p.vitals.bp || '',
        hr: p.vitals.hr || undefined,
        spo2: p.vitals.spo2 || undefined,
        temperature: p.vitals.temp || '',
        respiratoryRate: p.vitals.rr || undefined,
      }
    }
    if (p.fullRecord?.diagnosis) {
      diagnosis.value = p.fullRecord.diagnosis
    }
  }
}

const addPrescriptionRow = () => {
  prescriptions.value.push({
    medicationName: '',
    dosage: '',
    frequency: 'BD',
    route: 'Oral',
    duration: '5 days',
    instructions: '',
  })
}

const removePrescriptionRow = (idx: number) => {
  prescriptions.value.splice(idx, 1)
}

const addLabOrderRow = () => {
  labOrders.value.push({
    testName: '',
    category: 'Hematology',
    priority: 'ROUTINE',
    clinicalIndication: '',
  })
}

const removeLabOrderRow = (idx: number) => {
  labOrders.value.splice(idx, 1)
}

const handleSubmitEncounter = async () => {
  if (!selectedPatientId.value) {
    error.value = 'Please select a patient.'
    return
  }

  submitting.value = true
  error.value = null

  try {
    await doctorApi.recordEncounter({
      patientId: selectedPatientId.value,
      appointmentId: appointmentId.value,
      diagnosis: diagnosis.value,
      soapNotes: {
        subjective: soapNotes.value.subjective,
        objective: soapNotes.value.objective,
        assessment: soapNotes.value.assessment,
        plan: soapNotes.value.plan,
      },
      vitals: {
        bp: vitals.value.bp || undefined,
        hr: vitals.value.hr || undefined,
        spo2: vitals.value.spo2 || undefined,
        temperature: vitals.value.temperature || undefined,
        respiratoryRate: vitals.value.respiratoryRate || undefined,
      },
      prescriptions: prescriptions.value.filter((p) => p.medicationName.trim().length > 0),
      labOrders: labOrders.value.filter((l) => l.testName.trim().length > 0),
    })

    encounterCompleted.value = true
  } catch (err: any) {
    error.value = err.message || 'Failed to submit clinical encounter'
  } finally {
    submitting.value = false
  }
}

const resetEncounterForm = () => {
  encounterCompleted.value = false
  selectedPatientId.value = ''
  appointmentId.value = undefined
  diagnosis.value = ''
  vitals.value = { bp: '', hr: undefined, spo2: undefined, temperature: '', respiratoryRate: undefined }
  soapNotes.value = { subjective: '', objective: '', assessment: '', plan: '' }
  prescriptions.value = []
  labOrders.value = []
}

onMounted(() => {
  loadPatients()
})
</script>
