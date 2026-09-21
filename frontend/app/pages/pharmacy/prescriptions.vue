<template>
  <div class="space-y-5">
    <!-- Header -->
    <PageHeader
      title="Pharmacy Dispensing &amp; Medication Safety Queue"
      description="Verify active prescription orders, screen contraindication alerts, and review patient allergy profiles"
    />

    <!-- Filter & Search Toolbar -->
    <FilterToolbar
      v-model="searchQuery"
      placeholder="Search by drug name, patient, or MRN..."
      :totalCount="orders.length"
      :filteredCount="filteredOrders.length"
    >
      <template #filters>
        <div class="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold w-full sm:w-auto overflow-x-auto">
          <button
            v-for="filter in ['all', 'PENDING', 'DISPENSED', 'FLAGGED']"
            :key="filter"
            @click="statusFilter = filter"
            class="px-3.5 py-1.5 rounded-lg capitalize transition-all shrink-0 cursor-pointer"
            :class="statusFilter === filter ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'"
          >
            {{ filter === 'all' ? 'All Orders' : filter }}
          </button>
        </div>
      </template>
    </FilterToolbar>

    <!-- Prescription Queue Table -->
    <SkeletonTable v-if="loading" :rows="4" />
    <div v-else class="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
              <thead>
                <tr class="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                  <th class="px-6 py-4">PATIENT</th>
                  <th class="px-6 py-4">PRESCRIPTION ORDER</th>
                  <th class="px-6 py-4">ALLERGY SCREENING</th>
                  <th class="px-6 py-4">ORDERING CLINICIAN</th>
                  <th class="px-6 py-4 text-right">DISPENSE ACTIONS</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 font-sans">
                <tr
                  v-for="(order, idx) in filteredOrders"
                  :key="idx"
                  class="hover:bg-slate-50/70 transition-colors"
                >
                  <td class="px-6 py-4.5">
                    <p class="font-bold text-slate-900 text-sm">{{ order.patientName }}</p>
                    <p class="text-[11px] text-slate-400 font-mono">{{ order.mrn }} · {{ order.ward }}</p>
                  </td>
                  <td class="px-6 py-4.5 font-mono">
                    <p class="text-slate-900 font-bold font-sans">{{ order.medication }}</p>
                    <p class="text-[11px] text-slate-500 font-mono">{{ order.dosage }} · Duration: {{ order.duration }}</p>
                  </td>
                  <td class="px-6 py-4.5">
                    <span
                      v-if="order.hasAllergyAlert"
                      class="bg-red-50 text-red-700 border border-red-200 px-3 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
                    >
                      <svg class="w-3.5 h-3.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span>ALERT: {{ order.allergyDetails }}</span>
                    </span>
                    <span v-else class="text-emerald-700 font-semibold bg-emerald-50 px-3 py-1 rounded-full text-[11px]">
                      No Known Allergies
                    </span>
                  </td>
                  <td class="px-6 py-4.5 text-slate-700 font-medium">
                    {{ order.doctorName }}
                  </td>
                  <td class="px-6 py-4.5 text-right space-x-2">
                    <template v-if="order.status === 'PENDING'">
                      <button
                        type="button"
                        @click="openDispenseModal(order)"
                        class="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold px-3.5 py-1.5 rounded-xl transition-all shadow-2xs cursor-pointer"
                      >
                        Dispense
                      </button>
                      <button
                        type="button"
                        @click="flagOrder(order)"
                        class="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
                      >
                        Flag
                      </button>
                    </template>
                    <span
                      v-else-if="order.status === 'DISPENSED'"
                      class="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-[11px] font-bold"
                    >
                      Dispensed
                    </span>
                    <span
                      v-else
                      class="bg-red-100 text-red-800 px-3 py-1 rounded-full text-[11px] font-bold"
                    >
                      Flagged for Review
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

    <!-- Dispense Confirmation Sub-Modal -->
    <div
      v-if="selectedOrderForDispense"
      @click.self="selectedOrderForDispense = null"
      class="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
    >
      <div class="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full p-5 sm:p-8 shadow-2xl border border-slate-200 relative max-h-[90vh] overflow-y-auto my-6 sm:my-8">
        <h3 class="text-lg font-bold text-slate-900 mb-1">Confirm Prescription Dispense</h3>
        <p class="text-xs text-slate-500 mb-6">Verify medication dosage and complete pharmacy handoff</p>

        <div class="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3 mb-6 text-xs">
          <div class="flex justify-between">
            <span class="text-slate-500">Patient:</span>
            <span class="font-bold text-slate-900">{{ selectedOrderForDispense.patientName }} ({{ selectedOrderForDispense.mrn }})</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-500">Medication:</span>
            <span class="font-bold text-blue-700 font-mono">{{ selectedOrderForDispense.medication }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-500">Dosage:</span>
            <span class="font-mono">{{ selectedOrderForDispense.dosage }}</span>
          </div>
        </div>

        <div class="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            @click="selectedOrderForDispense = null"
            class="px-5 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-xs text-center cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            @click="confirmDispense"
            class="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-xs flex items-center justify-center cursor-pointer"
          >
            Confirm & Log Dispense
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const searchQuery = ref('')
const statusFilter = ref('all')
const loading = ref(false)
const selectedOrderForDispense = ref<any | null>(null)

const orders = ref([
  {
    id: 'ord-1',
    patientName: 'Fatima Diallo',
    mrn: 'MRN-002916',
    ward: 'Oncology Ward (3W - 14B)',
    medication: 'Ciprofloxacin 500mg PO Q12H',
    dosage: '500mg Oral Twice Daily',
    duration: '7 Days',
    hasAllergyAlert: true,
    allergyDetails: 'Penicillin Anaphylaxis',
    doctorName: 'Dr. Serlin Arslan',
    status: 'PENDING',
  },
  {
    id: 'ord-2',
    patientName: 'Mira Okonkwo',
    mrn: 'MRN-002914',
    ward: 'Cardiology Ward (3W - 12A)',
    medication: 'Atorvastatin 40mg PO QPM',
    dosage: '40mg Nightly',
    duration: '30 Days',
    hasAllergyAlert: false,
    allergyDetails: '',
    doctorName: 'Dr. Serlin Arslan',
    status: 'PENDING',
  },
  {
    id: 'ord-3',
    patientName: 'Thomas Bergstorm',
    mrn: 'MRN-002915',
    ward: 'Cardiology Ward (3W - 10B)',
    medication: 'Furosemide 40mg IV BID',
    dosage: '40mg IV Twice Daily',
    duration: '5 Days',
    hasAllergyAlert: false,
    allergyDetails: '',
    doctorName: 'Dr. Serlin Arslan',
    status: 'DISPENSED',
  },
])

const filteredOrders = computed(() => {
  return orders.value.filter(o => {
    const q = searchQuery.value.toLowerCase().trim()
    const matchesSearch = !q || o.patientName.toLowerCase().includes(q) || o.mrn.toLowerCase().includes(q) || o.medication.toLowerCase().includes(q)
    if (!matchesSearch) return false
    if (statusFilter.value === 'all') return true
    return o.status === statusFilter.value
  })
})

const openDispenseModal = (order: any) => {
  selectedOrderForDispense.value = order
}

const confirmDispense = () => {
  if (selectedOrderForDispense.value) {
    selectedOrderForDispense.value.status = 'DISPENSED'
    selectedOrderForDispense.value = null
  }
}

const flagOrder = (order: any) => {
  order.status = 'FLAGGED'
}
</script>
