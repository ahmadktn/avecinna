<template>
  <div class="min-h-screen bg-slate-50 flex font-sans select-none">
    <AppSidebar />

    <div class="flex-1 flex flex-col min-w-0">
      <AppNavbar @openWardSwitcher="showWardSwitcher = true" />

      <main class="flex-1 p-8 max-w-7xl w-full mx-auto space-y-8">
        <div>
          <h1 class="text-xl font-bold text-slate-900 tracking-tight">Head of Unit Ward Supervision & Roster</h1>
          <p class="text-xs text-slate-500 mt-1">Supervise active ward staff, monitor shift schedules, and review security scanner alerts</p>
        </div>

        <div class="grid grid-cols-2 gap-6">
          <!-- Ward Staff Roster Table -->
          <div class="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div class="flex items-center justify-between">
              <h3 class="text-xs font-bold text-slate-500 uppercase tracking-wider">Ward Staff Roster</h3>
              <span class="text-xs text-slate-400 font-mono">Active Shift Monitoring</span>
            </div>

            <table class="w-full text-left text-xs">
              <thead>
                <tr class="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase">
                  <th class="px-4 py-3">STAFF MEMBER</th>
                  <th class="px-4 py-3">ROLE</th>
                  <th class="px-4 py-3 text-right">STATUS</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr v-for="s in staffList" :key="s.id" class="hover:bg-slate-50 transition-colors">
                  <td class="px-4 py-3 font-semibold text-slate-900">{{ s.fullName || s.username }}</td>
                  <td class="px-4 py-3"><RoleBadge :role="s.role" /></td>
                  <td class="px-4 py-3 text-right">
                    <span class="bg-emerald-100 text-emerald-800 text-[10px] font-semibold px-2.5 py-0.5 rounded-full">Active</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Ward Security Scanner Alerts -->
          <div class="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div class="flex items-center justify-between">
              <h3 class="text-xs font-bold text-slate-500 uppercase tracking-wider">Security Scanner Alerts</h3>
              <span class="text-xs text-amber-600 font-bold font-mono">High Priority</span>
            </div>

            <div class="space-y-3">
              <div v-for="alert in alertsList" :key="alert.id" class="p-4 bg-amber-50/60 border border-amber-200 rounded-xl text-xs space-y-1">
                <div class="flex items-center justify-between">
                  <span class="font-bold text-amber-900">{{ alert.alertType }}</span>
                  <span class="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded">{{ alert.severity }}</span>
                </div>
                <p class="text-amber-800 leading-relaxed">{{ alert.description }}</p>
                <p class="text-[10px] text-slate-400 font-mono pt-1">{{ alert.createdAt }}</p>
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
        description: 'Tier 2 Break-Glass activated by dr_cardio (DOCTOR) for patient MRN-002914. Justification: Acute cardiac triage.',
        createdAt: '2026-03-03 08:14',
      },
    ]
  }
}

onMounted(() => {
  loadUnitData()
})
</script>
