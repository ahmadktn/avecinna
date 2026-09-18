<template>
  <div class="min-h-screen bg-slate-50 flex font-sans select-none">
    <AppSidebar />

    <div class="flex-1 flex flex-col min-w-0">
      <AppNavbar @openWardSwitcher="showWardSwitcher = true" />

      <main class="flex-1 p-8 max-w-6xl w-full mx-auto space-y-6">
        <div>
          <h1 class="text-xl font-bold text-slate-900 tracking-tight">Pharmacy Dispensing & Medication Safety Queue</h1>
          <p class="text-xs text-slate-500 mt-1">Verify active prescription orders, check drug interactions, and review patient allergy profiles</p>
        </div>

        <!-- Filter Tabs -->
        <div class="flex bg-slate-200/60 p-1 rounded-xl w-fit text-xs font-semibold">
          <button class="bg-white text-slate-900 px-4 py-2 rounded-lg shadow-2xs">Pending Dispense (3)</button>
          <button class="text-slate-600 hover:text-slate-900 px-4 py-2 rounded-lg transition-colors">Completed Orders</button>
          <button class="text-red-700 hover:text-red-800 px-4 py-2 rounded-lg transition-colors">Allergy Warnings Flagged</button>
        </div>

        <!-- Prescription Queue Table -->
        <div class="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <table class="w-full text-left text-xs">
            <thead>
              <tr class="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider">
                <th class="px-5 py-3">PATIENT</th>
                <th class="px-5 py-3">PRESCRIPTION ORDER</th>
                <th class="px-5 py-3">ALLERGY ALERTS</th>
                <th class="px-5 py-3">ORDERING DOCTOR</th>
                <th class="px-5 py-3 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 font-mono">
              <tr class="hover:bg-slate-50 transition-colors">
                <td class="px-5 py-4 font-sans font-semibold text-slate-900">
                  Fatima Diallo (MRN-002916)
                  <span class="block text-[11px] text-slate-500 font-normal">Oncology Ward (3W - 14B)</span>
                </td>
                <td class="px-5 py-4 text-slate-800 font-medium">
                  Ciprofloxacin 500mg PO Q12H
                  <span class="block text-[11px] text-slate-500">Duration: 7 Days</span>
                </td>
                <td class="px-5 py-4">
                  <span class="bg-red-50 text-red-700 border border-red-200 px-2.5 py-1 rounded-lg text-[10px] font-semibold font-sans">
                    SEVERE: Penicillin
                  </span>
                </td>
                <td class="px-5 py-4 text-slate-700 font-sans">Dr. Serlin Arslan</td>
                <td class="px-5 py-4 text-right font-sans space-x-2">
                  <button class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">
                    Verify & Dispense
                  </button>
                  <button class="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">
                    Flag Warning
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
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
