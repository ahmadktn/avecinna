<template>
  <div class="min-h-screen bg-slate-50 flex font-sans select-none">
    <AppSidebar />

    <div class="flex-1 flex flex-col min-w-0">
      <AppNavbar @openWardSwitcher="showWardSwitcher = true" />

      <main class="flex-1 p-8 max-w-7xl w-full mx-auto space-y-8">
        <!-- Title Header -->
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-xl font-bold text-slate-900 tracking-tight">Security Dashboard</h1>
            <p class="text-xs text-slate-500 mt-1">Audit logs – all records access events</p>
          </div>

          <button
            @click="showAuditVerifierModal = true"
            class="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all shadow-xs"
          >
            <svg class="w-4 h-4 text-blue-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Verify Audit Ledger Integrity
          </button>
        </div>

        <!-- 4 KPI Stat Cards -->
        <div class="grid grid-cols-4 gap-6">
          <div class="bg-white border border-slate-200 rounded-xl px-6 py-5 shadow-2xs">
            <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Events</p>
            <p class="text-3xl font-bold text-slate-900 mt-2 font-mono">8</p>
            <p class="text-[11px] text-slate-400 mt-1 font-mono">Last 24H</p>
          </div>

          <div class="bg-white border border-slate-200 rounded-xl px-6 py-5 shadow-2xs">
            <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Break Glass uses</p>
            <p class="text-3xl font-bold text-amber-600 mt-2 font-mono">3</p>
            <p class="text-[11px] text-amber-700 mt-1 font-semibold flex items-center gap-1">
              <svg class="w-3.5 h-3.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Review recommended
            </p>
          </div>

          <div class="bg-white border border-slate-200 rounded-xl px-6 py-5 shadow-2xs">
            <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Flagged entries</p>
            <p class="text-3xl font-bold text-red-600 mt-2 font-mono">3</p>
            <p class="text-[11px] text-red-700 mt-1 font-semibold">require review</p>
          </div>

          <div class="bg-white border border-slate-200 rounded-xl px-6 py-5 shadow-2xs">
            <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active staff</p>
            <p class="text-3xl font-bold text-slate-900 mt-2 font-mono">7</p>
            <p class="text-[11px] text-slate-400 mt-1 font-mono">Currently logged in</p>
          </div>
        </div>

        <!-- Section Title & Filter Toolbar -->
        <div class="flex items-center justify-between pt-2">
          <h2 class="text-xs font-bold text-slate-500 uppercase tracking-wider">
            PATIENTS – CARDIOLOGY – 3W
          </h2>

          <div class="flex items-center gap-2">
            <button
              @click="filterFlagged = false"
              class="px-4 py-1.5 rounded-full text-xs font-semibold transition-all"
              :class="!filterFlagged ? 'bg-slate-900 text-white shadow-xs' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'"
            >
              All Events
            </button>
            <button
              @click="filterFlagged = true"
              class="px-4 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5"
              :class="filterFlagged ? 'bg-red-600 text-white shadow-xs' : 'bg-white text-red-600 hover:bg-red-50 border border-red-200'"
            >
              <span>Flagged Only</span>
              <span class="w-4 h-4 rounded-full bg-red-100 text-red-800 text-[10px] flex items-center justify-center font-bold">3</span>
            </button>
          </div>
        </div>

        <!-- Audit Log Stream Table -->
        <div class="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <table class="w-full text-left text-xs">
            <thead>
              <tr class="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider">
                <th class="px-6 py-3.5">STAFF MEMBER</th>
                <th class="px-6 py-3.5">PATIENT</th>
                <th class="px-6 py-3.5">ACTION</th>
                <th class="px-6 py-3.5">WARD</th>
                <th class="px-6 py-3.5 font-mono">TIME</th>
                <th class="px-6 py-3.5 text-right">STATUS</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 font-sans">
              <tr
                v-for="(event, idx) in displayedEvents"
                :key="idx"
                class="hover:bg-slate-50 transition-colors"
                :class="event.isFlagged ? 'bg-red-50/20' : ''"
              >
                <!-- Staff Member -->
                <td class="px-6 py-4">
                  <div class="flex items-center gap-2">
                    <span class="font-semibold text-slate-900">{{ event.staffName }}</span>
                    <RoleBadge :role="event.staffRole" />
                  </div>
                </td>

                <!-- Patient -->
                <td class="px-6 py-4 text-slate-700 font-medium">
                  {{ event.patientName }}
                </td>

                <!-- Action -->
                <td class="px-6 py-4">
                  <div v-if="event.isBreakGlass" class="text-amber-700 font-semibold flex items-center gap-1.5">
                    <svg class="w-4 h-4 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span>BREAK GLASS ACCESS</span>
                    <span class="text-slate-500 font-normal text-[11px]">“{{ event.justification }}”</span>
                  </div>
                  <span v-else class="text-slate-600 font-normal">
                    {{ event.actionText }}
                  </span>
                </td>

                <!-- Ward -->
                <td class="px-6 py-4 font-mono text-slate-600 text-xs">
                  {{ event.wardCode }}
                </td>

                <!-- Time -->
                <td class="px-6 py-4 font-mono text-slate-500 text-xs">
                  {{ event.timestamp }}
                </td>

                <!-- Status -->
                <td class="px-6 py-4 text-right">
                  <span v-if="event.isFlagged" class="bg-red-50 text-red-600 border border-red-200 px-3 py-1 rounded-full text-xs font-semibold">
                    Flagged
                  </span>
                  <span v-else class="text-slate-400 font-mono">-</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </main>
    </div>

    <!-- Modals -->
    <WardSwitcherModal :isOpen="showWardSwitcher" @close="showWardSwitcher = false" />
    <AuditVerifierModal :isOpen="showAuditVerifierModal" @close="showAuditVerifierModal = false" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const showWardSwitcher = ref(false)
const showAuditVerifierModal = ref(false)
const filterFlagged = ref(false)

const allEvents = [
  {
    staffName: 'Dr. Serlin Arslan',
    staffRole: 'DOCTOR',
    patientName: 'Yusuf Al-Rashid',
    isBreakGlass: true,
    justification: 'Patient transfer review - cardiac risk',
    actionText: 'BREAK GLASS ACCESS',
    wardCode: 'EMERGENCY - 1E',
    timestamp: '2026-03-03 08:14',
    isFlagged: true,
  },
  {
    staffName: 'Dr. Serlin Arslan',
    staffRole: 'NURSE',
    patientName: 'Mira Okonkwo',
    isBreakGlass: false,
    actionText: 'Record viewed',
    wardCode: 'CARDIOLOGY - 1W',
    timestamp: '2026-03-03 08:14',
    isFlagged: false,
  },
  {
    staffName: 'Dr. Serlin Arslan',
    staffRole: 'DOCTOR',
    patientName: 'Mira Okonkwo',
    isBreakGlass: false,
    actionText: 'Record viewed',
    wardCode: 'CARDIOLOGY - 1W',
    timestamp: '2026-03-03 08:14',
    isFlagged: false,
  },
  {
    staffName: 'Dr. Serlin Arslan',
    staffRole: 'CLERK',
    patientName: 'Mira Okonkwo',
    isBreakGlass: false,
    actionText: 'Record viewed',
    wardCode: 'CARDIOLOGY - 1W',
    timestamp: '2026-03-03 08:14',
    isFlagged: false,
  },
  {
    staffName: 'Dr. Serlin Arslan',
    staffRole: 'DOCTOR',
    patientName: 'Yusuf Al-Rashid',
    isBreakGlass: true,
    justification: 'Patient transfer review - cardiac risk',
    actionText: 'BREAK GLASS ACCESS',
    wardCode: 'EMERGENCY - 1E',
    timestamp: '2026-03-03 08:14',
    isFlagged: true,
  },
  {
    staffName: 'Dr. Serlin Arslan',
    staffRole: 'DOCTOR',
    patientName: 'Yusuf Al-Rashid',
    isBreakGlass: true,
    justification: 'Patient transfer review - cardiac risk',
    actionText: 'BREAK GLASS ACCESS',
    wardCode: 'EMERGENCY - 1E',
    timestamp: '2026-03-03 08:14',
    isFlagged: true,
  },
  {
    staffName: 'Dr. Serlin Arslan',
    staffRole: 'PHARMACIST',
    patientName: 'Mira Okonkwo',
    isBreakGlass: false,
    actionText: 'Record viewed',
    wardCode: 'CARDIOLOGY - 1W',
    timestamp: '2026-03-03 08:14',
    isFlagged: false,
  },
  {
    staffName: 'Dr. Serlin Arslan',
    staffRole: 'NURSE',
    patientName: 'Mira Okonkwo',
    isBreakGlass: false,
    actionText: 'Record viewed',
    wardCode: 'CARDIOLOGY - 1W',
    timestamp: '2026-03-03 08:14',
    isFlagged: false,
  },
]

const displayedEvents = computed(() => {
  if (filterFlagged.value) {
    return allEvents.filter(e => e.isFlagged)
  }
  return allEvents
})
</script>
