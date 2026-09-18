<template>
  <div class="min-h-screen bg-slate-50 flex font-sans select-none">
    <AppSidebar />

    <div class="flex-1 flex flex-col min-w-0">
      <AppNavbar @openWardSwitcher="showWardSwitcher = true" />

      <main class="flex-1 p-8 max-w-5xl w-full mx-auto space-y-6">
        <div>
          <h1 class="text-xl font-bold text-slate-900 tracking-tight">Outpatient Appointments & Clinic Scheduling</h1>
          <p class="text-xs text-slate-500 mt-1">Book outpatient consultation appointments and view clinic schedule</p>
        </div>

        <!-- Schedule Appointments Table -->
        <div class="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-xs font-bold text-slate-500 uppercase tracking-wider">Scheduled Outpatient Visits</h3>
            <span class="text-xs text-slate-400 font-mono">Today's Clinic Schedule</span>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead>
                <tr class="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <th class="px-4 py-3">PATIENT</th>
                  <th class="px-4 py-3">DOCTOR</th>
                  <th class="px-4 py-3">CLINIC WARD</th>
                  <th class="px-4 py-3">DATE & TIME</th>
                  <th class="px-4 py-3">STATUS</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr class="hover:bg-slate-50 transition-colors">
                  <td class="px-4 py-3 font-semibold text-slate-900">Mira Okonkwo (MRN-002914)</td>
                  <td class="px-4 py-3 text-slate-700">Dr. Serlin Arslan</td>
                  <td class="px-4 py-3 text-slate-600 font-mono">Cardiology Clinic (3W)</td>
                  <td class="px-4 py-3 text-slate-600 font-mono">2026-03-03 10:00 AM</td>
                  <td class="px-4 py-3">
                    <span class="bg-blue-50 text-blue-700 text-[10px] font-semibold px-2.5 py-1 rounded-full">
                      SCHEDULED
                    </span>
                  </td>
                </tr>
                <tr class="hover:bg-slate-50 transition-colors">
                  <td class="px-4 py-3 font-semibold text-slate-900">Thomas Bergstorm (MRN-002915)</td>
                  <td class="px-4 py-3 text-slate-700">Dr. Serlin Arslan</td>
                  <td class="px-4 py-3 text-slate-600 font-mono">Cardiology Clinic (3W)</td>
                  <td class="px-4 py-3 text-slate-600 font-mono">2026-03-03 11:30 AM</td>
                  <td class="px-4 py-3">
                    <span class="bg-amber-50 text-amber-700 text-[10px] font-semibold px-2.5 py-1 rounded-full">
                      IN_CONSULTATION
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>

    <WardSwitcherModal :isOpen="showWardSwitcher" @close="showWardSwitcher = false" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const showWardSwitcher = ref(false)
</script>
