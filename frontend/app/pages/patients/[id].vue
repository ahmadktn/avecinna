<template>
  <div class="space-y-5">
        <!-- Back Link & Action Bar -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <NuxtLink
            to="/patients"
            class="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-blue-600 transition-colors bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-2xs w-fit"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to Patients Directory</span>
          </NuxtLink>

          <div class="flex flex-wrap items-center gap-2">
            <!-- Record Vitals (Nurses & Clinicians) -->
            <button
              v-if="patient && !error && (role === 'NURSE' || role === 'PARAMEDIC' || role === 'DOCTOR' || role === 'HEAD_OF_UNIT')"
              type="button"
              @click="showVitalsModal = true"
              class="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-xs cursor-pointer"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Record Bedside Vitals</span>
            </button>

            <!-- Care Team Consults -->
            <button
              v-if="patient && !error"
              type="button"
              @click="showCareTeamModal = true"
              class="inline-flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-2xs cursor-pointer"
            >
              <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span>Care Team & Consults</span>
            </button>

            <!-- Doctor Encounter Link -->
            <NuxtLink
              v-if="patient && !error && (role === 'DOCTOR' || role === 'HEAD_OF_UNIT')"
              :to="`/doctor/encounter?patientId=${patient.id}`"
              class="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-xs cursor-pointer"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span>Record Encounter</span>
            </NuxtLink>

            <!-- Emergency Break-Glass Unlock -->
            <button
              v-if="error"
              @click="showBreakGlassModal = true"
              class="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-sm cursor-pointer"
            >
              <svg class="w-4 h-4 text-amber-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>Emergency Break-Glass Unlock</span>
            </button>
          </div>
        </div>

        <!-- Error / Access Restricted State -->
        <div v-if="error" class="bg-amber-50/80 border border-amber-200 rounded-2xl p-8 text-center space-y-4 shadow-2xs">
          <div class="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 mx-auto flex items-center justify-center shadow-xs">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div class="space-y-2">
            <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
              <span>CAAC Policy Restriction</span>
            </div>
            <h3 class="text-base font-bold text-slate-900">Access Restricted — Action Logged</h3>
            <p class="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
              {{ error || "You are not assigned to this patient's care team. This unauthorized access attempt has been sealed into the immutable audit ledger. Use emergency access if immediate clinical resuscitation is required." }}
            </p>
          </div>
          <div>
            <button
              @click="showBreakGlassModal = true"
              class="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all shadow-xs cursor-pointer"
            >
              <svg class="w-4 h-4 text-amber-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>Emergency Access</span>
            </button>
          </div>
        </div>

        <!-- Skeleton Loading State -->
        <SkeletonPatientDetail v-if="loading && !patient && !error" />

        <!-- Patient Full Chart Record -->
        <div v-if="patient && !error" class="space-y-5">
          <!-- Profile Header Card -->
          <div class="bg-white border border-slate-200/90 rounded-xl p-6 sm:p-8 shadow-2xs space-y-6">
            <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-slate-100 gap-4">
              <div class="flex items-center gap-4">
                <div class="w-16 h-16 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xl font-mono shadow-xs">
                  {{ initials }}
                </div>
                <div class="space-y-1">
                  <div class="flex flex-wrap items-center gap-3">
                    <h2 class="font-brand text-2xl font-semibold text-slate-900 tracking-tight">{{ patient.fullName }}</h2>

                    <!-- Relationship / Scope Badge -->
                    <span
                      v-if="patient.isCareTeam || relationshipType === 'CONSULT' || patient.relationshipType === 'CONSULT'"
                      class="text-xs font-bold px-3 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1.5"
                    >
                      <svg class="w-3.5 h-3.5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      <span>Care Team Consult</span>
                    </span>
                    <span
                      v-else
                      class="text-xs font-bold px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200"
                    >
                      Primary Ward Inpatient
                    </span>

                    <span
                      class="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full"
                      :class="getAcuityBadge(patientAcuity)"
                    >
                      {{ patientAcuity }}
                    </span>
                  </div>

                  <div class="flex flex-wrap items-center gap-2.5 text-xs text-slate-500 font-mono">
                    <span>MRN: <strong class="text-slate-800">{{ patient.mrn }}</strong></span>
                    <span>·</span>
                    <span>Bed: <strong class="text-slate-800">{{ patient.assignedBed || 'Bed 01' }}</strong></span>
                    <span>·</span>
                    <span>DOB: {{ patient.dateOfBirth }}</span>
                    <span>·</span>
                    <span>Gender: {{ patient.gender }}</span>
                  </div>
                </div>
              </div>

              <div class="flex flex-wrap items-center gap-2">
                <span class="bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-xl text-xs font-bold font-mono">
                  {{ patient.patientType || 'INPATIENT' }}
                </span>
                <span v-if="patient.genotype" class="bg-slate-100 text-slate-700 px-3 py-1 rounded-xl text-xs font-bold font-mono">
                  Genotype: {{ patient.genotype }}
                </span>
                <span v-if="patient.bloodGroup" class="bg-slate-100 text-slate-700 px-3 py-1 rounded-xl text-xs font-bold font-mono">
                  Blood: {{ patient.bloodGroup }}
                </span>
              </div>
            </div>

            <!-- Vitals Telemetry Grid -->
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <h3 class="font-bold text-slate-500 text-xs uppercase tracking-wider">Live Physiological Telemetry</h3>
                <button
                  v-if="role === 'NURSE' || role === 'PARAMEDIC' || role === 'DOCTOR' || role === 'HEAD_OF_UNIT'"
                  type="button"
                  @click="showVitalsModal = true"
                  class="text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span>Update Bedside Observations</span>
                </button>
              </div>

              <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
                <div class="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center">
                  <p class="text-slate-500 text-[11px] font-semibold">Blood Pressure</p>
                  <p class="text-xl font-bold text-slate-900 font-mono mt-1">{{ patient.vitals?.bp || '120/80' }}</p>
                  <span class="text-[10px] text-emerald-600 font-bold mt-1 inline-block">mmHg</span>
                </div>
                <div class="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center">
                  <p class="text-slate-500 text-[11px] font-semibold">Heart Rate</p>
                  <p class="text-xl font-bold text-slate-900 font-mono mt-1">{{ patient.vitals?.hr || 72 }}</p>
                  <span class="text-[10px] text-emerald-600 font-bold mt-1 inline-block">bpm</span>
                </div>
                <div class="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center">
                  <p class="text-slate-500 text-[11px] font-semibold">SpO2 Oxygen</p>
                  <p class="text-xl font-bold text-slate-900 font-mono mt-1">{{ patient.vitals?.spo2 || 98 }}%</p>
                  <span class="text-[10px] text-emerald-600 font-bold mt-1 inline-block">Room Air</span>
                </div>
                <div class="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center">
                  <p class="text-slate-500 text-[11px] font-semibold">Temperature</p>
                  <p class="text-xl font-bold text-slate-900 font-mono mt-1">{{ patient.vitals?.temp || '36.8' }}°C</p>
                  <span class="text-[10px] text-emerald-600 font-bold mt-1 inline-block">Normothermic</span>
                </div>
                <div class="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center">
                  <p class="text-slate-500 text-[11px] font-semibold">Resp. Rate</p>
                  <p class="text-xl font-bold text-slate-900 font-mono mt-1">{{ patient.vitals?.rr || 16 }}</p>
                  <span class="text-[10px] text-emerald-600 font-bold mt-1 inline-block">/min</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Dynamic Physiological Trajectory & NEWS2 Clinical Warning Chart -->
          <VitalsTrendChart
            v-if="patient.vitals || patient.fullRecord?.vitals"
            :vitals="patient.vitals || patient.fullRecord?.vitals"
            :patientName="patient.fullName"
          />

          <!-- Nursing Care Plan Banner (if present or if role is Nurse/Paramedic) -->
          <div
            v-if="patient.nursingCarePlan || patient.fullRecord?.nursingCarePlan || role === 'NURSE' || role === 'PARAMEDIC'"
            class="bg-white border border-purple-200/90 rounded-xl p-6 shadow-2xs space-y-3"
          >
            <div class="flex items-center justify-between pb-2 border-b border-purple-100">
              <div class="flex items-center gap-2.5">
                <div class="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h4 class="font-bold text-purple-950 uppercase tracking-wider text-xs">Nursing Care Plan & Bedside Orders</h4>
              </div>
              <span class="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                Active Nursing Protocol
              </span>
            </div>
            <p class="text-slate-700 leading-relaxed text-xs">
              {{ patient.nursingCarePlan || patient.fullRecord?.nursingCarePlan || '4-hourly vital signs surveillance, fluid intake/output balance monitoring, pressure ulcer prevention repositioning Q2H, and fall risk precautions.' }}
            </p>
          </div>

          <!-- Clinical Diagnosis & Allergies -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <!-- Diagnosis Card -->
            <div class="bg-white border border-slate-200/90 rounded-xl p-6 shadow-2xs space-y-3">
              <h4 class="font-bold text-slate-700 uppercase tracking-wider">Clinical Diagnosis & Findings</h4>
              <p class="text-slate-800 leading-relaxed text-sm">
                {{ patient.fullRecord?.diagnosis || 'Inpatient clinical surveillance and vital signs monitoring.' }}
              </p>
            </div>

            <!-- Allergies Card -->
            <div class="bg-white border border-slate-200/90 rounded-xl p-6 shadow-2xs space-y-3">
              <h4 class="font-bold text-slate-700 uppercase tracking-wider">Known Allergies & Adverse Reactions</h4>
              <div v-if="allergyList.length === 0" class="text-slate-400 italic">
                No known drug allergies or contraindications recorded (NKDA).
              </div>
              <div v-else class="flex flex-wrap gap-2">
                <span
                  v-for="(al, i) in allergyList"
                  :key="i"
                  class="bg-red-50 text-red-700 border border-red-200 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5"
                >
                  <svg class="w-3.5 h-3.5 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>{{ al }}</span>
                </span>
              </div>
            </div>
          </div>

          <!-- Active Prescriptions / Medication Regimen -->
          <div class="bg-white border border-slate-200/90 rounded-xl p-6 shadow-2xs space-y-4">
            <div class="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 class="text-xs font-bold text-slate-700 uppercase tracking-wider">Active Prescriptions & Pharmacotherapy</h3>
              <span class="text-xs font-mono text-slate-400">{{ activeMedicationsList.length }} Medications</span>
            </div>

            <div v-if="activeMedicationsList.length === 0" class="py-6 text-center text-xs text-slate-400">
              No active prescriptions currently on file for this patient.
            </div>

            <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div
                v-for="(med, idx) in activeMedicationsList"
                :key="idx"
                class="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs"
              >
                <div class="flex items-center justify-between">
                  <span class="font-bold text-slate-900 text-sm">{{ med.medicationName || med.name }}</span>
                  <span class="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded font-mono">
                    {{ med.dosage }} · {{ med.frequency }}
                  </span>
                </div>
                <div class="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 font-mono">
                  <span v-if="med.route">Route: {{ med.route }}</span>
                  <span v-if="med.duration">· Duration: {{ med.duration }}</span>
                </div>
                <p v-if="med.instructions" class="text-[11px] text-slate-600 italic">
                  "{{ med.instructions }}"
                </p>
              </div>
            </div>
          </div>

          <!-- Clinical History / SOAP Encounters Timeline (Physicians & Heads of Unit) -->
          <div
            v-if="role === 'DOCTOR' || role === 'HEAD_OF_UNIT'"
            class="bg-white border border-slate-200/90 rounded-xl p-6 shadow-2xs space-y-4"
          >
            <div class="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 class="text-xs font-bold text-slate-700 uppercase tracking-wider">Clinical Notes & Encounters</h3>
              <span class="text-xs font-mono text-slate-400">Physician Notes</span>
            </div>

            <div v-if="clinicalHistoryList.length === 0" class="py-6 text-center text-xs text-slate-400">
              No previous clinical encounters recorded.
            </div>

            <div v-else class="space-y-4">
              <div
                v-for="(note, idx) in clinicalHistoryList"
                :key="idx"
                class="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs"
              >
                <div class="flex items-center justify-between pb-2 border-b border-slate-200/60">
                  <div class="flex items-center gap-2">
                    <span class="font-bold text-slate-900">{{ note.doctorName || 'Attending Physician' }}</span>
                    <span v-if="note.diagnosis" class="bg-slate-200 text-slate-800 text-[10px] font-bold px-2 py-0.5 rounded">
                      {{ note.diagnosis }}
                    </span>
                  </div>
                  <span class="text-slate-400 font-mono text-[11px]">{{ formatTimestamp(note.timestamp) }}</span>
                </div>

                <!-- Structured SOAP Box -->
                <div v-if="note.soap" class="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  <div v-if="note.soap.subjective" class="space-y-0.5">
                    <span class="font-bold text-slate-700 uppercase text-[10px]">Subjective:</span>
                    <p class="text-slate-600 leading-relaxed">{{ note.soap.subjective }}</p>
                  </div>
                  <div v-if="note.soap.objective" class="space-y-0.5">
                    <span class="font-bold text-slate-700 uppercase text-[10px]">Objective:</span>
                    <p class="text-slate-600 leading-relaxed">{{ note.soap.objective }}</p>
                  </div>
                  <div v-if="note.soap.assessment" class="space-y-0.5">
                    <span class="font-bold text-slate-700 uppercase text-[10px]">Assessment:</span>
                    <p class="text-slate-600 leading-relaxed">{{ note.soap.assessment }}</p>
                  </div>
                  <div v-if="note.soap.plan" class="space-y-0.5">
                    <span class="font-bold text-slate-700 uppercase text-[10px]">Plan:</span>
                    <p class="text-slate-600 leading-relaxed">{{ note.soap.plan }}</p>
                  </div>
                </div>
                <div v-else-if="note.note" class="text-slate-700 leading-relaxed">
                  {{ note.note }}
                </div>
              </div>
            </div>
          </div>

          <!-- Diagnostic Lab Results & Documents Section -->
          <div class="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-4">
            <div class="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 class="text-xs font-bold text-slate-700 uppercase tracking-wider">Laboratory Investigations & Reports</h3>
              <span class="text-xs font-mono text-slate-400">{{ labResults.length }} Lab Tests</span>
            </div>

            <div v-if="labResults.length === 0" class="py-6 text-center text-xs text-slate-400">
              No lab results on file.
            </div>

            <div v-else class="divide-y divide-slate-100">
              <div
                v-for="lab in labResults"
                :key="lab.id"
                class="py-3.5 flex items-center justify-between gap-4 text-xs"
              >
                <div class="space-y-0.5">
                  <div class="flex items-center gap-2">
                    <span class="font-bold text-slate-900">{{ lab.testName }}</span>
                    <span class="bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded font-mono">
                      {{ lab.category }}
                    </span>
                  </div>
                  <p class="text-[11px] font-mono text-slate-400">Hash: {{ lab.documentHash.slice(0, 16) }}... · {{ formatTimestamp(lab.createdAt) }}</p>
                </div>

                <span
                  class="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full"
                  :class="lab.status === 'FINAL' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'"
                >
                  {{ lab.status }}
                </span>
              </div>
          </div>
        </div>
      </div>

    <!-- Modals -->
    <BreakGlassModal :isOpen="showBreakGlassModal" :patientId="patientId" @close="showBreakGlassModal = false" @unlocked="handleDataUpdated" />
    <CareTeamModal
      :isOpen="showCareTeamModal"
      :patientId="patientId"
      :patientName="patient?.fullName"
      :patientWardId="patient?.primaryWardId"
      @close="showCareTeamModal = false"
      @updated="handleDataUpdated"
    />

    <!-- Bedside Vitals Observation Modal -->
    <RecordVitalsModal
      :isOpen="showVitalsModal"
      :patientId="patientId"
      :patientName="patient?.fullName"
      @close="showVitalsModal = false"
      @saved="handleDataUpdated"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuth } from '~/composables/useAuth'
import { usePatients } from '~/composables/usePatients'
import { useAutoRefresh, triggerGlobalRefresh } from '~/composables/useAutoRefresh'
import VitalsTrendChart from '~/components/VitalsTrendChart.vue'

const route = useRoute()
const auth = useAuth()
const patientsApi = usePatients()

const patientId = computed(() => route.params.id as string)
const role = computed(() => auth.role.value)
const patient = computed(() => patientsApi.currentPatient.value)
const error = computed(() => patientsApi.error.value)
const labResults = computed(() => patientsApi.labResults.value)
const relationshipType = ref<string | null>(null)

const showBreakGlassModal = ref(false)
const showCareTeamModal = ref(false)
const showVitalsModal = ref(false)

const initials = computed(() => {
  if (!patient.value) return 'PT'
  const parts = patient.value.fullName.split(' ')
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return patient.value.fullName.slice(0, 2).toUpperCase()
})

const patientAcuity = computed<'stable' | 'monitoring' | 'critical'>(() => {
  if (!patient.value) return 'stable'
  const hr = patient.value.vitals?.hr
  const spo2 = patient.value.vitals?.spo2
  if ((hr && (hr > 110 || hr < 50)) || (spo2 && spo2 < 92)) {
    return 'critical'
  }
  if ((hr && (hr > 95 || hr < 60)) || (spo2 && spo2 < 95)) {
    return 'monitoring'
  }
  return 'stable'
})

const allergyList = computed<string[]>(() => {
  if (!patient.value) return []
  if (Array.isArray(patient.value.allergies)) return patient.value.allergies
  if (patient.value.allergies?.allergies) return patient.value.allergies.allergies
  return []
})

const activeMedicationsList = computed<any[]>(() => {
  if (!patient.value) return []
  if (Array.isArray(patient.value.activeMedications)) return patient.value.activeMedications
  if (patient.value.fullRecord?.activeMedications) return patient.value.fullRecord.activeMedications
  return []
})

const clinicalHistoryList = computed<any[]>(() => {
  if (!patient.value) return []
  if (Array.isArray(patient.value.clinicalNotes)) return patient.value.clinicalNotes
  if (patient.value.fullRecord?.clinicalHistory) return patient.value.fullRecord.clinicalHistory
  return []
})

const loadPatientData = async () => {
  try {
    const [ptRes] = await Promise.all([
      patientsApi.fetchPatientById(patientId.value),
      patientsApi.fetchLabResults(patientId.value).catch(() => []),
    ])
    if ((ptRes as any)?.relationshipType) {
      relationshipType.value = (ptRes as any).relationshipType
    }
  } catch (err) {
    // Handled in composable
  }
}

const getAcuityBadge = (acuity: string) => {
  if (acuity === 'critical') return 'bg-red-100 text-red-700'
  if (acuity === 'monitoring') return 'bg-amber-100 text-amber-700'
  return 'bg-emerald-100 text-emerald-700'
}

const formatTimestamp = (iso: string) => {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const handleDataUpdated = () => {
  loadPatientData()
  triggerGlobalRefresh()
}

// Auto-refresh when ward changes, break-glass unlocks, or every 20s in background
useAutoRefresh(() => loadPatientData(), { interval: 20000 })
</script>
