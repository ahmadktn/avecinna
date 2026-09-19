<template>
  <div class="min-h-screen bg-slate-50 font-sans">
    <AppSidebar />

    <div class="pl-64 lg:pl-72 flex flex-col min-h-screen">
      <AppNavbar @openWardSwitcher="showWardSwitcher = true" />

      <main class="flex-1 w-full px-8 py-8 space-y-8">
        <div>
          <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Head of Unit Ward Supervision & Staff Roster</h1>
          <p class="text-xs text-slate-500 mt-1">Supervise active ward clinicians, monitor shift schedules, and review automated CAAC security scanner alerts</p>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <!-- Ward Staff Roster Table -->
          <div class="bg-white border border-slate-200 rounded-3xl p-8 shadow-xs space-y-6">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-xs font-bold text-slate-500 uppercase tracking-wider">Ward Staff Roster</h3>
                <p class="text-xs text-slate-400 mt-0.5">Cardiology Ward (3W)</p>
              </div>
              <span class="text-xs text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full font-bold">
                {{ staffList.length }} Clinicians on Duty
              </span>
            </div>

            <div class="overflow-hidden border border-slate-200 rounded-2xl">
              <table class="w-full text-left text-xs">
                <thead>
                  <tr class="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                    <th class="px-5 py-3.5">STAFF MEMBER</th>
                    <th class="px-5 py-3.5">ASSIGNED ROLE</th>
                    <th class="px-5 py-3.5 text-right">SHIFT STATUS</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  <tr v-for="s in staffList" :key="s.id" class="hover:bg-slate-50 transition-colors">
                    <td class="px-5 py-4 font-bold text-slate-900">{{ s.fullName || s.username }}</td>
                    <td class="px-5 py-4"><RoleBadge :role="s.role" /></td>
                    <td class="px-5 py-4 text-right">
                      <span class="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-3 py-1 rounded-full inline-flex items-center gap-1.5">
                        <span class="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                        Active Shift
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Ward Security Scanner Alerts -->
          <div class="bg-white border border-slate-200 rounded-3xl p-8 shadow-xs space-y-6">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-xs font-bold text-slate-500 uppercase tracking-wider">Security Scanner Alerts</h3>
                <p class="text-xs text-slate-400 mt-0.5">Automated CAAC anomaly detector</p>
              </div>
              <span class="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full font-bold">
                {{ alertsList.length }} Active Alert
              </span>
            </div>

            <div class="space-y-4">
              <div
                v-for="alert in alertsList"
                :key="alert.id"
                class="p-5 bg-amber-50/70 border border-amber-200 rounded-2xl text-xs space-y-2 shadow-2xs"
              >
                <div class="flex items-center justify-between">
                  <span class="font-bold text-amber-950 text-sm flex items-center gap-1.5">
                    <svg class="w-4 h-4 text-amber-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    {{ alert.alertType.replace(/_/g, ' ') }}
                  </span>
                  <span class="bg-amber-200 text-amber-900 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase">{{ alert.severity }}</span>
                </div>
                <p class="text-amber-900 leading-relaxed">{{ alert.description }}</p>
                <div class="flex items-center justify-between pt-2 border-t border-amber-200/60 text-[11px] text-amber-700">
                  <span class="font-mono font-medium">{{ alert.createdAt }}</span>
                  <button
                    type="button"
                    @click="acknowledgeAlert(alert.id)"
                    class="font-bold text-amber-900 hover:text-amber-950 underline cursor-pointer"
                  >
                    Acknowledge & Dismiss
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>

    <WardSwitcherModal :isOpen="showWardSwitcher" @close="showWardSwitcher = false" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useApi } from '~/composables/useApi'

const api = useApi()
const showWardSwitcher = ref(false)
const staffList = ref<any[]>([])
const alertsList = ref<any[]>([])

const loadUnitData = async () => {
  try {
    const staffRes = await api.get<{ staff: any[] }>('/unit/staff')
    staffList.value = staffRes.staff
  } catch (err) {
    staffList.value = [
      { id: 'u-1', fullName: 'Dr. Serlin Arslan', role: 'DOCTOR', isActive: true },
      { id: 'u-2', fullName: 'Nurse Amara Diop', role: 'NURSE', isActive: true },
      { id: 'u-3', fullName: 'Pharm Reza Tehrani', role: 'PHARMACIST', isActive: true },
    ]
  }

  try {
    const alertsRes = await api.get<{ alerts: any[] }>('/unit/alerts')
    alertsList.value = alertsRes.alerts
  } catch (err) {
    alertsList.value = [
      {
        id: 'alt-1',
        alertType: 'BREAK_GLASS_ACTIVATION',
        severity: 'HIGH',
        description: 'Tier 2 Break-Glass activated by dr_cardio (DOCTOR) for patient MRN-002914. Justification: Acute cardiac triage in resuscitation bay.',
        createdAt: '2026-03-03 08:14',
      },
    ]
  }
}

const acknowledgeAlert = (id: string) => {
  alertsList.value = alertsList.value.filter(a => a.id !== id)
}

onMounted(() => {
  loadUnitData()
})
</script>
