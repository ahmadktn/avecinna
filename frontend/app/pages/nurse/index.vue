<template>
  <div class="space-y-5">
    <!-- Error Banner -->
    <AlertBanner :message="error" @dismiss="nurse.error.value = null">
      <template #actions>
        <button @click="loadOverview" class="underline font-bold hover:text-red-900 cursor-pointer">Retry</button>
      </template>
    </AlertBanner>

    <!-- Success Toast -->
    <AlertBanner type="success" :message="successMsg" @dismiss="successMsg = null" />

    <!-- Station Header -->
    <PageHeader
      title="Nursing Station & Ward Overview"
      :subtitle="`Real-time physiological telemetry, patient census, and multidisciplinary care team assignments for ${activeWardName}.`"
    >
      <template #badge>
        <span class="bg-purple-50 text-purple-700 border border-purple-200 px-2.5 py-0.5 rounded-full text-xs font-semibold font-mono">
          Ward: {{ activeWardCode }}
        </span>
      </template>

      <template #actions>
        <NuxtLink
          to="/patients?scope=care_team"
          class="inline-flex items-center gap-2 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 text-xs font-semibold px-4 py-2.5 rounded-xl transition-all shadow-2xs cursor-pointer"
        >
          <svg class="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <span>Care Team Patients ({{ metrics.myCareTeamCount }})</span>
        </NuxtLink>

        <button
          type="button"
          @click="openVitalsModal()"
          class="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all shadow-xs cursor-pointer"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          <span>Record Observation</span>
        </button>
      </template>
    </PageHeader>

    <!-- 4 KPI Telemetry Summary Cards Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      <MetricCard
        label="Ward Inpatients"
        :value="metrics.wardInpatientsCount"
        :subtext="`Bed Occupancy: ${metrics.bedOccupancyRate}%`"
      >
        <template #icon>
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </template>
      </MetricCard>

      <MetricCard
        label="My Care Team Consults"
        :value="metrics.myCareTeamCount"
        subtext="Direct nurse assignments"
      >
        <template #icon>
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </template>
      </MetricCard>

      <MetricCard
        label="Monitoring Watch"
        :value="metrics.monitoringCount"
        subtext="Observation telemetry protocol"
      >
        <template #icon>
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </template>
      </MetricCard>

      <MetricCard
        label="Critical Acuity"
        :value="metrics.criticalCount"
        :subtext="`${metrics.criticalCount} requiring urgent stabilization`"
        :variant="metrics.criticalCount > 0 ? 'critical' : 'default'"
      >
        <template #icon>
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </template>
      </MetricCard>
    </div>

        <!-- Two-Column Section: Care Team Assignments & Current Shift Details -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Left (2 Cols): My Care Team Consults & Coverage -->
          <div class="lg:col-span-2 bg-white border border-slate-200/90 rounded-xl p-6 shadow-2xs space-y-4">
            <div class="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 class="text-xs font-bold text-slate-700 uppercase tracking-wider">My Active Care Team Consults</h3>
                <p class="text-[11px] text-slate-500">Patients across wards where you are authorized as part of their clinical care team</p>
              </div>
              <NuxtLink
                to="/patients?scope=care_team"
                class="text-xs font-semibold text-purple-700 hover:text-purple-800 transition-colors flex items-center gap-1"
              >
                <span>View Full List</span>
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </NuxtLink>
            </div>

            <div v-if="loading && careTeamPatients.length === 0" class="py-8 text-center text-xs text-slate-400">
              Loading care team assignments...
            </div>

            <div v-else-if="careTeamPatients.length === 0" class="py-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              No active cross-ward care team assignments. You have full access to all {{ activeWardName }} inpatients.
            </div>

            <div v-else class="divide-y divide-slate-100">
              <div
                v-for="ct in careTeamPatients"
                :key="ct.careTeamId"
                class="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-slate-50/60 transition-colors rounded-xl px-2"
              >
                <div class="min-w-0 space-y-1">
                  <div class="flex items-center gap-2">
                    <NuxtLink :to="`/patients/${ct.patientId}`" class="font-bold text-slate-900 hover:text-blue-600 truncate text-xs">
                      {{ ct.patientName }}
                    </NuxtLink>
                    <span class="text-[10px] font-bold px-2 py-0.5 rounded-md font-mono bg-purple-50 text-purple-700 border border-purple-200">
                      {{ ct.relationshipType }}
                    </span>
                    <span class="text-[10px] text-slate-500 font-mono">
                      {{ ct.wardName || 'Ward' }} · {{ ct.assignedBed || 'Bed 01' }}
                    </span>
                  </div>
                  <p class="text-[11px] text-slate-500 truncate">
                    <span>MRN: <strong class="font-mono text-slate-700">{{ ct.patientMrn }}</strong></span>
                    <span v-if="ct.grantReason" class="ml-2 text-slate-400">· Reason: {{ ct.grantReason }}</span>
                  </p>
                </div>

                <div class="shrink-0 flex items-center gap-2">
                  <button
                    type="button"
                    @click="openVitalsModal(ct.patientId, ct.patientName)"
                    class="px-3 py-1.5 rounded-lg border border-emerald-300 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-100 font-semibold text-xs transition-colors cursor-pointer"
                  >
                    Vitals
                  </button>
                  <NuxtLink
                    :to="`/patients/${ct.patientId}`"
                    class="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors shadow-2xs flex items-center gap-1 cursor-pointer"
                  >
                    <span>Chart</span>
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </NuxtLink>
                </div>
              </div>
            </div>
          </div>

          <!-- Right (1 Col): Shift & Station Information -->
          <div class="bg-white border border-slate-200/90 rounded-xl p-6 shadow-2xs space-y-5">
            <div class="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 class="text-xs font-bold text-slate-700 uppercase tracking-wider">Shift &amp; Duty Status</h3>
                <p class="text-[11px] text-slate-500">Active ward roster schedule</p>
              </div>
              <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                On Duty
              </span>
            </div>

            <div class="space-y-3.5 text-xs">
              <div class="flex items-center justify-between py-1 border-b border-slate-100">
                <span class="text-slate-500">Shift Type:</span>
                <span class="font-bold text-slate-800 font-mono">{{ todayShift.shiftType || 'DAY' }} SHIFT</span>
              </div>
              <div class="flex items-center justify-between py-1 border-b border-slate-100">
                <span class="text-slate-500">Duty Window:</span>
                <span class="font-mono text-slate-700 font-bold">{{ todayShift.startTime || '07:00' }} – {{ todayShift.endTime || '19:00' }}</span>
              </div>
              <div class="flex items-center justify-between py-1 border-b border-slate-100">
                <span class="text-slate-500">Assigned Station:</span>
                <span class="font-bold text-slate-800">{{ activeWardName }}</span>
              </div>
              <div class="flex items-center justify-between py-1 border-b border-slate-100">
                <span class="text-slate-500">CAAC Policy:</span>
                <span class="text-emerald-700 font-semibold">Active &amp; Authorized</span>
              </div>
              <div class="pt-1">
                <p class="text-[11px] text-slate-400 font-medium leading-relaxed">
                  {{ todayShift.notes || 'Routine inpatient vital sign surveillance, medication administration, and care plan management.' }}
                </p>
              </div>
            </div>

            <div class="pt-2">
              <NuxtLink
                to="/nurse/profile"
                class="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
              >
                <span>View Nurse Profile &amp; Credentials</span>
              </NuxtLink>
            </div>
          </div>
        </div>

        <!-- Inpatient Bed Census Table -->
        <div class="bg-white border border-slate-200/90 rounded-xl p-6 shadow-2xs space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 class="text-xs font-bold text-slate-700 uppercase tracking-wider">Ward Inpatient Bed Census</h3>
              <p class="text-[11px] text-slate-500">Physiological vitals monitoring and bedside nursing observations in {{ activeWardName }}</p>
            </div>
            <NuxtLink
              to="/patients?scope=ward"
              class="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1"
            >
              <span>View All {{ metrics.wardInpatientsCount }} Inpatients</span>
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </NuxtLink>
          </div>

          <div v-if="loading && wardPatients.length === 0" class="py-12 text-center text-xs text-slate-400">
            <div class="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            Loading inpatient telemetry...
          </div>

          <div v-else-if="wardPatients.length === 0" class="py-12 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">
            No patients currently admitted to this ward.
          </div>

          <div v-else class="overflow-x-auto">
            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr class="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                  <th class="px-5 py-3.5">Bed / Patient</th>
                  <th class="px-5 py-3.5">Acuity</th>
                  <th class="px-5 py-3.5">Blood Pressure</th>
                  <th class="px-5 py-3.5">Heart Rate</th>
                  <th class="px-5 py-3.5">SpO2 Oxygen</th>
                  <th class="px-5 py-3.5">Temperature</th>
                  <th class="px-5 py-3.5 text-right">Bedside Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 font-sans">
                <tr
                  v-for="p in wardPatients"
                  :key="p.id"
                  class="hover:bg-slate-50/80 transition-colors"
                >
                  <td class="px-5 py-4">
                    <div class="flex items-center gap-3">
                      <div class="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0 font-mono shadow-inner">
                        {{ getInitials(p.fullName) }}
                      </div>
                      <div class="min-w-0">
                        <div class="flex items-center gap-2">
                          <NuxtLink :to="`/patients/${p.id}`" class="font-bold text-slate-900 hover:text-blue-600 transition-colors text-xs">
                            {{ p.fullName }}
                          </NuxtLink>
                          <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 font-bold text-slate-700">
                            {{ p.assignedBed || 'Bed 01' }}
                          </span>
                        </div>
                        <p class="text-[11px] text-slate-400 font-mono">MRN: {{ p.mrn }} · {{ p.gender }}, {{ p.dateOfBirth }}</p>
                      </div>
                    </div>
                  </td>

                  <td class="px-5 py-4">
                    <span
                      class="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full inline-block"
                      :class="getAcuityBadge(p.acuity)"
                    >
                      {{ p.acuity }}
                    </span>
                  </td>

                  <td class="px-5 py-4 font-mono">
                    <span class="font-bold text-slate-800">{{ p.vitals?.bp || '120/80' }}</span>
                    <span class="text-[10px] text-slate-400 ml-1">mmHg</span>
                  </td>

                  <td class="px-5 py-4 font-mono">
                    <span
                      class="font-bold"
                      :class="(p.vitals?.hr || 72) > 100 ? 'text-amber-600' : 'text-slate-800'"
                    >
                      {{ p.vitals?.hr || 72 }}
                    </span>
                    <span class="text-[10px] text-slate-400 ml-1">bpm</span>
                  </td>

                  <td class="px-5 py-4 font-mono">
                    <span
                      class="font-bold"
                      :class="(p.vitals?.spo2 || 98) < 95 ? 'text-red-600 font-extrabold' : 'text-slate-800'"
                    >
                      {{ p.vitals?.spo2 || 98 }}%
                    </span>
                  </td>

                  <td class="px-5 py-4 font-mono">
                    <span class="font-bold text-slate-800">{{ p.vitals?.temp || '36.8' }}°C</span>
                  </td>

                  <td class="px-5 py-4 text-right">
                    <div class="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        @click="openVitalsModal(p.id, p.fullName)"
                        class="px-3 py-1.5 rounded-lg border border-emerald-300 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-100 font-semibold text-xs transition-colors cursor-pointer"
                      >
                        Record Vitals
                      </button>
                      <NuxtLink
                        :to="`/patients/${p.id}`"
                        class="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors shadow-2xs flex items-center gap-1 cursor-pointer"
                      >
                        <span>Chart</span>
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                        </svg>
                      </NuxtLink>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

    <!-- Bedside Vitals Observation Modal -->
    <div
      v-if="showVitalsModal"
      @click.self="showVitalsModal = false"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/60 backdrop-blur-xs overflow-y-auto"
    >
      <div class="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-5 sm:p-7 space-y-5 max-h-[90vh] overflow-y-auto my-6 sm:my-8">
        <div class="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h3 class="text-lg font-bold text-slate-900 tracking-tight">Record Bedside Vital Signs</h3>
            <p class="text-xs text-slate-500 mt-0.5">Log physiological observations directly to patient chart with audit verification</p>
          </div>
          <button
            type="button"
            @click="showVitalsModal = false"
            class="w-8 h-8 rounded-xl bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form @submit.prevent="handleSaveVitals" class="space-y-4 text-xs">
          <!-- Patient Selector (if not preselected) -->
          <div v-if="!modalPatientId" class="space-y-1.5">
            <label class="block font-bold text-slate-700 uppercase tracking-wider text-[11px]">
              Select Patient <span class="text-red-500">*</span>
            </label>
            <select
              v-model="vitalsForm.patientId"
              required
              class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500 font-medium"
            >
              <option value="" disabled>Choose an admitted inpatient...</option>
              <option v-for="p in wardPatients" :key="p.id" :value="p.id">
                {{ p.fullName }} ({{ p.assignedBed || 'Bed 01' }}) — MRN: {{ p.mrn }}
              </option>
            </select>
          </div>

          <div v-else class="p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center justify-between">
            <div>
              <span class="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">Recording For</span>
              <p class="font-bold text-slate-900 text-xs">{{ modalPatientName }}</p>
            </div>
            <span class="text-[11px] font-mono text-blue-700 bg-white px-2 py-0.5 rounded border border-blue-200">
              Active Bedside
            </span>
          </div>

          <!-- Vitals Inputs Grid -->
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label class="block font-bold text-slate-700 mb-1 text-[11px]">Blood Pressure</label>
              <input
                v-model="vitalsForm.bp"
                type="text"
                placeholder="120/80"
                class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label class="block font-bold text-slate-700 mb-1 text-[11px]">Heart Rate (bpm)</label>
              <input
                v-model="vitalsForm.hr"
                type="number"
                placeholder="72"
                class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label class="block font-bold text-slate-700 mb-1 text-[11px]">SpO2 Oxygen (%)</label>
              <input
                v-model="vitalsForm.spo2"
                type="number"
                placeholder="98"
                class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label class="block font-bold text-slate-700 mb-1 text-[11px]">Temperature (°C)</label>
              <input
                v-model="vitalsForm.temp"
                type="text"
                placeholder="36.8"
                class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label class="block font-bold text-slate-700 mb-1 text-[11px]">Resp. Rate (/min)</label>
              <input
                v-model="vitalsForm.rr"
                type="number"
                placeholder="16"
                class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label class="block font-bold text-slate-700 mb-1 text-[11px]">Glucose (mmol/L)</label>
              <input
                v-model="vitalsForm.bloodGlucose"
                type="text"
                placeholder="5.4"
                class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <!-- Nursing Observations Notes -->
          <div class="space-y-1">
            <label class="block font-bold text-slate-700 text-[11px]">Clinical Nursing Observations</label>
            <input
              v-model="vitalsForm.notes"
              type="text"
              placeholder="e.g. Patient resting quietly in bed, no respiratory distress..."
              class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
            />
          </div>

          <!-- Actions -->
          <div class="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              @click="showVitalsModal = false"
              class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors cursor-pointer text-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="savingVitals"
              class="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <span v-if="savingVitals" class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              <span>Save &amp; Sign Observation</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useNurse } from '~/composables/useNurse'

const nurse = useNurse()

const showVitalsModal = ref(false)

const modalPatientId = ref<string | null>(null)
const modalPatientName = ref<string | null>(null)
const savingVitals = ref(false)
const successMsg = ref<string | null>(null)

const loading = computed(() => nurse.loading.value)
const error = computed(() => nurse.error.value)
const overview = computed(() => nurse.overview.value)

const activeWard = computed(() => overview.value?.activeWard)
const activeWardName = computed(() => activeWard.value?.name || 'Cardiology Ward')
const activeWardCode = computed(() => activeWard.value?.code || 'CARD')

const metrics = computed(() => overview.value?.metrics || {
  wardInpatientsCount: 0,
  myCareTeamCount: 0,
  criticalCount: 0,
  monitoringCount: 0,
  stableCount: 0,
  bedOccupancyRate: 0,
  isShiftActive: true,
})

const todayShift = computed(() => overview.value?.todayShift || {
  shiftType: 'DAY',
  startTime: '07:00',
  endTime: '19:00',
  status: 'ON_DUTY',
  notes: 'Ward Nursing Shift',
})

const wardPatients = computed(() => overview.value?.wardPatients || [])
const careTeamPatients = computed(() => overview.value?.careTeamPatients || [])

const vitalsForm = ref({
  patientId: '',
  bp: '',
  hr: undefined as number | undefined,
  spo2: undefined as number | undefined,
  temp: '',
  rr: undefined as number | undefined,
  bloodGlucose: '',
  notes: '',
})

const getInitials = (name?: string) => {
  if (!name) return 'PT'
  const parts = name.split(' ')
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

const getAcuityBadge = (acuity?: string) => {
  switch (acuity) {
    case 'critical': return 'bg-red-100 text-red-800 border border-red-200'
    case 'monitoring': return 'bg-amber-100 text-amber-800 border border-amber-200'
    case 'stable': return 'bg-emerald-100 text-emerald-800 border border-emerald-200'
    default: return 'bg-slate-100 text-slate-700'
  }
}

const loadOverview = async () => {
  try {
    await nurse.fetchOverview()
  } catch (err: any) {
    // Handled in composable
  }
}

const openVitalsModal = (patientId?: string, patientName?: string) => {
  if (patientId) {
    modalPatientId.value = patientId
    modalPatientName.value = patientName || 'Patient'
    vitalsForm.value.patientId = patientId
  } else {
    modalPatientId.value = null
    modalPatientName.value = null
    vitalsForm.value.patientId = wardPatients.value.length > 0 ? wardPatients.value[0].id : ''
  }
  vitalsForm.value.bp = ''
  vitalsForm.value.hr = undefined
  vitalsForm.value.spo2 = undefined
  vitalsForm.value.temp = ''
  vitalsForm.value.rr = undefined
  vitalsForm.value.bloodGlucose = ''
  vitalsForm.value.notes = ''
  showVitalsModal.value = true
}

const handleSaveVitals = async () => {
  const pid = modalPatientId.value || vitalsForm.value.patientId
  if (!pid) return

  savingVitals.value = true
  try {
    await nurse.recordVitals({
      patientId: pid,
      bp: vitalsForm.value.bp || undefined,
      hr: vitalsForm.value.hr ? Number(vitalsForm.value.hr) : undefined,
      spo2: vitalsForm.value.spo2 ? Number(vitalsForm.value.spo2) : undefined,
      temp: vitalsForm.value.temp || undefined,
      rr: vitalsForm.value.rr ? Number(vitalsForm.value.rr) : undefined,
      bloodGlucose: vitalsForm.value.bloodGlucose || undefined,
      notes: vitalsForm.value.notes || undefined,
    })
    successMsg.value = 'Vital signs observation recorded and appended to patient chart!'
    showVitalsModal.value = false
    await loadOverview()
  } catch (err: any) {
    // Error is set in composable
  } finally {
    savingVitals.value = false
  }
}

onMounted(() => {
  loadOverview()
})
</script>
