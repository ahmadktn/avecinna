<template>
  <div class="space-y-5">
    <!-- Header & Breadcrumb -->
    <PageHeader
      title="Hospital Patients Directory"
      description="Demographic census and bed assignments across all registered hospital wards"
    >
      <template #actions>
        <button
          type="button"
          @click="loadPatients"
          :disabled="loading"
          class="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 shadow-2xs flex items-center gap-2 transition-all cursor-pointer"
        >
          <svg class="w-3.5 h-3.5 text-slate-500" :class="{ 'animate-spin': loading }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Refresh</span>
        </button>
      </template>
    </PageHeader>

    <AdminRedactionBanner />

    <!-- Error Banner -->
    <AlertBanner
      v-if="error"
      variant="error"
      :message="error"
      actionLabel="Retry"
      @action="loadPatients"
    />

    <!-- Filter & Search Toolbar -->
    <FilterToolbar
      v-model="searchQuery"
      placeholder="Search by Patient Name or MRN..."
      :totalCount="pagination.total"
      @update:modelValue="onSearchChange"
    >
      <template #filters>
        <div class="flex items-center gap-2 text-xs">
          <span class="text-slate-500 font-semibold">Filter Ward:</span>
          <select
            v-model="selectedWard"
            @change="onWardFilterChange"
            class="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500 transition-all"
          >
            <option value="ALL">All Hospital Wards</option>
            <option v-for="w in wardsList" :key="w.id" :value="w.id">
              {{ w.name }} ({{ w.code }})
            </option>
          </select>
        </div>
      </template>
    </FilterToolbar>

        <!-- Patients Table Card -->
    <SkeletonTable v-if="loading && patientsList.length === 0" :rows="6" />
    <div v-else class="bg-white border border-slate-200/80 rounded-xl shadow-2xs overflow-hidden">
      <div class="overflow-x-auto">
            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr class="border-b border-slate-100 bg-slate-50/50 text-slate-400 uppercase tracking-wider font-semibold">
                  <th class="py-3.5 px-5">Patient Name</th>
                  <th class="py-3.5 px-5 font-mono">MRN</th>
                  <th class="py-3.5 px-5">Age / Sex</th>
                  <th class="py-3.5 px-5">Patient Type</th>
                  <th class="py-3.5 px-5">Ward Location</th>
                  <th class="py-3.5 px-5">Bed</th>
                  <th class="py-3.5 px-5">Admitted</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr
                  v-for="p in patientsList"
                  :key="p.id"
                  class="hover:bg-slate-50/60 transition-colors"
                >
                  <td class="py-4 px-5">
                    <div class="flex items-center gap-3">
                      <div class="w-8 h-8 rounded-xl bg-slate-800 text-white flex items-center justify-center font-bold text-xs font-mono shrink-0">
                        {{ getInitials(p.fullName) }}
                      </div>
                      <span class="text-sm font-semibold text-slate-900">{{ p.fullName }}</span>
                    </div>
                  </td>
                  <td class="py-4 px-5 font-mono font-semibold text-slate-900 select-all">{{ p.mrn }}</td>
                  <td class="py-4 px-5 text-slate-600">
                    {{ calculateAge(p.dateOfBirth) }} · <span class="capitalize">{{ p.gender?.toLowerCase() }}</span>
                  </td>
                  <td class="py-4 px-5">
                    <span
                      class="px-2.5 py-0.5 rounded-md text-[11px] font-semibold"
                      :class="p.patientType === 'INPATIENT' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-slate-100 text-slate-700'"
                    >
                      {{ p.patientType }}
                    </span>
                  </td>
                  <td class="py-4 px-5 font-medium text-slate-800">
                    {{ getWardName(p.primaryWardId) }}
                  </td>
                  <td class="py-4 px-5 font-mono text-slate-700 font-semibold">
                    <span v-if="p.assignedBed" class="bg-slate-100 px-2 py-0.5 rounded text-[11px] font-mono">{{ p.assignedBed }}</span>
                    <span v-else class="text-slate-400 font-sans font-normal text-xs">Outpatient</span>
                  </td>
                  <td class="py-4 px-5 text-slate-500 font-mono text-[11px]">
                    {{ formatDate(p.createdAt) }}
                  </td>
                </tr>

                <tr v-if="!loading && patientsList.length === 0">
                  <td colspan="7" class="py-16 text-center text-slate-400 space-y-2">
                    <svg class="w-10 h-10 text-slate-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <p class="font-bold text-slate-600">No patients matching criteria</p>
                    <p class="text-xs text-slate-400">Try adjusting your ward filter or search keywords.</p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination Footer -->
          <div class="px-6 py-4 bg-slate-50/70 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <span class="text-slate-500">
              Showing Page <strong class="text-slate-900">{{ pagination.page }}</strong> of <strong class="text-slate-900">{{ pagination.totalPages || 1 }}</strong> ({{ pagination.total }} total records)
            </span>

            <div class="flex items-center gap-2">
              <button
                type="button"
                @click="goToPage(pagination.page - 1)"
                :disabled="pagination.page <= 1 || loading"
                class="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                &larr; Previous
              </button>

              <button
                type="button"
                @click="goToPage(pagination.page + 1)"
                :disabled="pagination.page >= pagination.totalPages || loading"
                class="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Next &rarr;
              </button>
            </div>
          </div>
        </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAdmin } from '~/composables/useAdmin'
import { useAutoRefresh } from '~/composables/useAutoRefresh'

const admin = useAdmin()
const patientsList = admin.patients
const pagination = admin.pagination
const wardsList = admin.wards
const loading = admin.loading
const error = admin.error

const searchQuery = ref('')
const selectedWard = ref('ALL')
let searchTimeout: any = null

const loadPatients = async (page = 1) => {
  try {
    await admin.fetchAdminPatients({
      page,
      limit: 15,
      search: searchQuery.value,
      ward: selectedWard.value,
    })
  } catch (err) {
    // Handled in composable
  }
}

const onSearchChange = () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    loadPatients(1)
  }, 300)
}

const onWardFilterChange = () => {
  loadPatients(1)
}

const goToPage = (p: number) => {
  if (p >= 1 && p <= pagination.value.totalPages) {
    loadPatients(p)
  }
}

const getWardName = (wardId?: string) => {
  if (!wardId) return 'General Ward'
  const match = wardsList.value.find((w) => w.id === wardId)
  return match ? `${match.name} (${match.code})` : wardId
}

const getInitials = (name: string) => {
  if (!name) return 'PT'
  const parts = name.split(' ')
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

const calculateAge = (dobString: string) => {
  if (!dobString) return 'N/A'
  const dob = new Date(dobString)
  const age = new Date().getFullYear() - dob.getFullYear()
  return `${age} yrs`
}

const formatDate = (isoString: string) => {
  if (!isoString) return '-'
  return new Date(isoString).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

const loadData = async () => {
  if (wardsList.value.length === 0) {
    await admin.fetchWards()
  }
  await loadPatients(pagination.value.page || 1)
}

useAutoRefresh(() => loadData(), { interval: 20000 })
</script>
