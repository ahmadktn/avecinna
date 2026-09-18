<template>
  <div class="min-h-screen bg-slate-50 flex font-sans select-none">
    <AppSidebar />

    <div class="flex-1 flex flex-col min-w-0">
      <AppNavbar @openWardSwitcher="showWardSwitcher = true" />

      <main class="flex-1 p-8 max-w-7xl w-full mx-auto space-y-8">
        <div>
          <h1 class="text-xl font-bold text-slate-900 tracking-tight">System Security Analytics & Access Insights</h1>
          <p class="text-xs text-slate-500 mt-1">Real-time metrics, emergency access usage trends, and CAAC decision distribution</p>
        </div>

        <AdminRedactionBanner />

        <!-- 4 KPI Stat Cards -->
        <div class="grid grid-cols-4 gap-6">
          <div class="bg-white border border-slate-200 rounded-xl px-6 py-5 shadow-2xs">
            <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Audit Events</p>
            <p class="text-3xl font-bold text-slate-900 mt-2 font-mono">1,284</p>
            <p class="text-[11px] text-slate-400 mt-1">Last 24 Hours</p>
          </div>

          <div class="bg-white border border-slate-200 rounded-xl px-6 py-5 shadow-2xs">
            <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Break-Glass Uses</p>
            <p class="text-3xl font-bold text-amber-600 mt-2 font-mono">3</p>
            <p class="text-[11px] text-amber-700 mt-1 font-semibold">⚠️ Review Recommended</p>
          </div>

          <div class="bg-white border border-slate-200 rounded-xl px-6 py-5 shadow-2xs">
            <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider">CAAC Blocked Access</p>
            <p class="text-3xl font-bold text-red-600 mt-2 font-mono">12</p>
            <p class="text-[11px] text-red-700 mt-1 font-semibold">Security Scanned</p>
          </div>

          <div class="bg-white border border-slate-200 rounded-xl px-6 py-5 shadow-2xs">
            <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Staff</p>
            <p class="text-3xl font-bold text-slate-900 mt-2 font-mono">18</p>
            <p class="text-[11px] text-slate-400 mt-1">Currently Logged In</p>
          </div>
        </div>

        <!-- Analytics Charts Grid -->
        <div class="grid grid-cols-2 gap-6">
          <!-- Chart 1: Security Event Trends -->
          <div class="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div class="flex items-center justify-between">
              <h3 class="text-xs font-bold text-slate-500 uppercase tracking-wider">Security Access Event Trends (24h)</h3>
              <span class="text-xs text-slate-400 font-mono">Real-time Log Stream</span>
            </div>

            <!-- CSS Bar Graph -->
            <div class="h-48 flex items-end justify-between gap-3 pt-6 border-b border-slate-100">
              <div class="flex-1 bg-blue-100 hover:bg-blue-200 rounded-t-lg transition-all h-[40%]" title="00:00 - 04:00"></div>
              <div class="flex-1 bg-blue-200 hover:bg-blue-300 rounded-t-lg transition-all h-[60%]" title="04:00 - 08:00"></div>
              <div class="flex-1 bg-blue-600 hover:bg-blue-700 rounded-t-lg transition-all h-[95%]" title="08:00 - 12:00"></div>
              <div class="flex-1 bg-blue-500 hover:bg-blue-600 rounded-t-lg transition-all h-[80%]" title="12:00 - 16:00"></div>
              <div class="flex-1 bg-amber-500 hover:bg-amber-600 rounded-t-lg transition-all h-[45%]" title="16:00 - 20:00"></div>
              <div class="flex-1 bg-blue-300 hover:bg-blue-400 rounded-t-lg transition-all h-[30%]" title="20:00 - 24:00"></div>
            </div>
            <div class="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>00:00</span>
              <span>04:00</span>
              <span>08:00</span>
              <span>12:00</span>
              <span>16:00</span>
              <span>20:00</span>
            </div>
          </div>

          <!-- Chart 2: CAAC Decision Distribution -->
          <div class="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div class="flex items-center justify-between">
              <h3 class="text-xs font-bold text-slate-500 uppercase tracking-wider">CAAC Authorization Ratio</h3>
              <span class="text-xs text-slate-400 font-mono">94.2% Permitted</span>
            </div>

            <div class="h-48 flex items-center justify-center">
              <div class="relative w-36 h-36 rounded-full border-[12px] border-emerald-500 flex items-center justify-center">
                <div class="text-center">
                  <p class="text-lg font-bold text-slate-900 font-mono">94.2%</p>
                  <p class="text-[10px] text-slate-400">Permitted</p>
                </div>
              </div>
            </div>

            <div class="flex justify-around text-xs font-medium">
              <span class="text-emerald-700">● Permitted: 1,210</span>
              <span class="text-red-600">● Denied: 74</span>
            </div>
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
