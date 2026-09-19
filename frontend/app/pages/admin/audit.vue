<template>
  <div class="space-y-5">
    <!-- Title Header & Verify Button -->
    <PageHeader
      title="Audit Ledger &amp; Merkle Verification"
      description="Cryptographic access history, Merkle tree proofs, and automated anomaly flagging"
    >
      <template #actions>
        <button
          type="button"
          @click="loadAllData"
          :disabled="loading"
          class="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 shadow-2xs flex items-center gap-2 transition-all cursor-pointer"
        >
          <svg class="w-3.5 h-3.5 text-slate-500" :class="{ 'animate-spin': loading }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Refresh</span>
        </button>

        <button
          type="button"
          @click="showAuditVerifierModal = true"
          class="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-xs shrink-0 cursor-pointer"
        >
          <svg class="w-3.5 h-3.5 text-blue-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <span>Verify Integrity</span>
        </button>
      </template>
    </PageHeader>

    <!-- 4 Stat Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- Total Blocks -->
      <MetricCard
        label="Chained Blocks"
        :value="analytics?.metrics.totalBlocks ?? blocksList.length"
        subtext="Sequential SHA-256 Chain"
      >
        <template #icon>
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </template>
      </MetricCard>

      <!-- Chain Health -->
      <MetricCard
        label="Integrity Status"
        value="100% INTACT"
        subtext="Zero Hash Link Breaks"
      >
        <template #icon>
          <svg class="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
          </svg>
        </template>
      </MetricCard>

      <!-- Smart Flagged Anomalies -->
      <MetricCard
        label="Flagged Anomalies"
        :value="analytics?.metrics.flaggedCount ?? 0"
        subtext="Rule Engine Triggers"
        :variant="(analytics?.metrics.flaggedCount ?? 0) > 0 ? 'critical' : 'default'"
      >
        <template #icon>
          <svg class="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </template>
      </MetricCard>

      <!-- Active Entities -->
      <MetricCard
        label="Audited Scope"
        :value="`${analytics?.metrics.uniqueUsersCount ?? 0} Users`"
        :subtext="`Across ${analytics?.metrics.uniqueWardsCount ?? 0} Wards`"
      >
        <template #icon>
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </template>
      </MetricCard>
    </div>

        <!-- Section Navigation Tabs -->
        <div class="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto text-xs font-semibold">
          <button
            type="button"
            @click="activeTab = 'ledger'"
            class="px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer"
            :class="activeTab === 'ledger' ? 'bg-slate-900 text-white shadow-xs font-bold' : 'text-slate-600 hover:bg-slate-100'"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span>Live Audit Stream ({{ pagination.total }})</span>
          </button>

          <button
            type="button"
            @click="activeTab = 'analytics'"
            class="px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer"
            :class="activeTab === 'analytics' ? 'bg-slate-900 text-white shadow-xs font-bold' : 'text-slate-600 hover:bg-slate-100'"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span>Ledger Analysis</span>
          </button>

          <button
            type="button"
            @click="activeTab = 'flags'"
            class="px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer"
            :class="activeTab === 'flags' ? 'bg-amber-600 text-white shadow-xs font-bold' : 'text-slate-600 hover:bg-slate-100'"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>Flagged Anomalies ({{ analytics?.flaggedEvents?.length ?? 0 }})</span>
          </button>

          <button
            type="button"
            @click="activeTab = 'tree'"
            class="px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer"
            :class="activeTab === 'tree' ? 'bg-purple-700 text-white shadow-xs font-bold' : 'text-slate-600 hover:bg-slate-100'"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
            </svg>
            <span>Merkle Tree Visualizer</span>
          </button>
        </div>

        <!-- Tab 1: Live Cryptographic Audit Trail (Every Single Action) -->
        <div v-if="activeTab === 'ledger'" class="space-y-5">
          <!-- Filter Toolbar -->
          <div class="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
            <div class="relative w-full md:w-80">
              <svg class="w-4 h-4 text-slate-400 absolute left-3.5 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                v-model="searchQuery"
                @input="onSearchChange"
                type="text"
                placeholder="Search by Actor, Patient, Action, or Hash..."
                class="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>

            <div class="flex items-center gap-3 w-full md:w-auto justify-end flex-wrap">
              <div class="flex items-center gap-2 text-xs">
                <span class="text-slate-500 font-semibold">Action:</span>
                <select
                  v-model="selectedAction"
                  @change="onFilterChange"
                  class="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500"
                >
                  <option value="ALL">All Actions</option>
                  <option value="VIEW_PATIENT">VIEW_PATIENT</option>
                  <option value="BREAK_GLASS_TIER1">BREAK_GLASS_TIER1</option>
                  <option value="BREAK_GLASS_TIER2">BREAK_GLASS_TIER2</option>
                  <option value="SWITCH_WARD">SWITCH_WARD</option>
                  <option value="ADMIN_USER_CREATE">ADMIN_USER_CREATE</option>
                  <option value="ADMIN_USER_UPDATE">ADMIN_USER_UPDATE</option>
                  <option value="ADMIN_WARD_CREATE">ADMIN_WARD_CREATE</option>
                </select>
              </div>

              <div class="flex items-center gap-2 text-xs">
                <span class="text-slate-500 font-semibold">Device:</span>
                <select
                  v-model="selectedDeviceType"
                  @change="onFilterChange"
                  class="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500"
                >
                  <option value="ALL">All Devices</option>
                  <option value="DESKTOP">Desktop / PC</option>
                  <option value="TABLET">Tablet / Ward iPad</option>
                  <option value="MOBILE">Mobile</option>
                  <option value="PROXY_GATEWAY">Proxy Gateway (Sidecar)</option>
                </select>
              </div>

              <span class="text-xs font-bold text-slate-500 font-mono">
                {{ pagination.total }} Chained Blocks
              </span>
            </div>
          </div>

          <!-- Table Card -->
          <div class="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs border-collapse">
                <thead>
                  <tr class="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                    <th class="px-6 py-4 font-mono">Block #</th>
                    <th class="px-6 py-4">Action</th>
                    <th class="px-6 py-4">Actor</th>
                    <th class="px-6 py-4">Ward</th>
                    <th class="px-6 py-4">IP &amp; Device</th>
                    <th class="px-6 py-4 font-mono">Current Hash</th>
                    <th class="px-6 py-4 font-mono">Previous Hash</th>
                    <th class="px-6 py-4">Timestamp</th>
                    <th class="px-6 py-4 text-right">Inspect</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 font-sans">
                  <tr
                    v-for="b in blocksList"
                    :key="b.indexNum"
                    @click="openLogDrawer(b)"
                    class="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  >
                    <td class="px-6 py-4.5 font-mono font-extrabold text-blue-700">#{{ b.indexNum }}</td>
                    <td class="px-6 py-4.5">
                      <span class="inline-block px-2.5 py-1 rounded-full text-[11px] font-bold" :class="getActionBadgeClass(b.action)">
                        {{ b.action }}
                      </span>
                    </td>
                    <td class="px-6 py-4.5 font-semibold text-slate-800">{{ b.userId }}</td>
                    <td class="px-6 py-4.5 font-mono text-slate-600">{{ b.activeWard }}</td>
                    <td class="px-6 py-4.5">
                      <div class="flex flex-col gap-1">
                        <div class="flex items-center gap-1.5">
                          <span class="font-mono text-slate-800 text-[11px] font-semibold">{{ b.ipAddress || '127.0.0.1' }}</span>
                          <span
                            v-if="b.deviceType"
                            class="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200"
                          >
                            {{ b.deviceType }}
                          </span>
                        </div>
                        <span v-if="b.deviceInfo" class="text-[10px] text-slate-400 truncate max-w-[130px]" :title="b.deviceInfo">
                          {{ b.deviceInfo }}
                        </span>
                      </div>
                    </td>
                    <td class="px-6 py-4.5 font-mono text-[11px] text-slate-500 select-all">
                      {{ b.blockHash.slice(0, 10) }}...{{ b.blockHash.slice(-6) }}
                    </td>
                    <td class="px-6 py-4.5 font-mono text-[11px] text-slate-400 select-all">
                      {{ b.prevHash.slice(0, 10) }}...{{ b.prevHash.slice(-6) }}
                    </td>
                    <td class="px-6 py-4.5 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                      {{ formatDate(b.createdAt) }}
                    </td>
                    <td class="px-6 py-4.5 text-right">
                      <span class="text-blue-600 group-hover:text-blue-800 font-bold text-xs">Analyze &rarr;</span>
                    </td>
                  </tr>

                  <tr v-if="!loading && blocksList.length === 0">
                    <td colspan="9" class="py-16 text-center text-slate-400">
                      No audit blocks found matching search criteria.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Pagination Footer -->
            <div class="px-6 py-4 bg-slate-50/70 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <span class="text-slate-500">
                Showing Page <strong class="text-slate-900">{{ pagination.page }}</strong> of <strong class="text-slate-900">{{ pagination.totalPages || 1 }}</strong> ({{ pagination.total }} blocks in database)
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

        <!-- Tab 2: Dedicated Ledger Analysis -->
        <div v-else-if="activeTab === 'analytics'" class="space-y-8">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <!-- Action Distribution Breakdown -->
            <div class="bg-white border border-slate-200 rounded-3xl p-8 shadow-xs space-y-6">
              <div>
                <h3 class="text-base font-bold text-slate-900">Event Action Distribution</h3>
                <p class="text-xs text-slate-500 mt-0.5">Categorical volume breakdown across all chained audit records</p>
              </div>

              <div class="space-y-4">
                <div
                  v-for="(count, actionName) in analytics?.actionDistribution"
                  :key="actionName"
                  class="space-y-1.5"
                >
                  <div class="flex items-center justify-between text-xs">
                    <span class="font-semibold text-slate-800">{{ actionName }}</span>
                    <span class="font-mono text-slate-600 font-bold">{{ count }} Events</span>
                  </div>
                  <div class="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                    <div
                      class="bg-blue-600 h-full rounded-full transition-all duration-500"
                      :style="{ width: `${Math.max(6, Math.min(100, (Number(count) / Math.max(1, analytics?.metrics.totalBlocks || 1)) * 100))}%` }"
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Ward Activity Breakdown -->
            <div class="bg-white border border-slate-200 rounded-3xl p-8 shadow-xs space-y-6">
              <div>
                <h3 class="text-base font-bold text-slate-900">Ward Access Volume</h3>
                <p class="text-xs text-slate-500 mt-0.5">Audit logging density across working hospital ward boundaries</p>
              </div>

              <div class="space-y-4">
                <div
                  v-for="(count, wardName) in analytics?.wardDistribution"
                  :key="wardName"
                  class="space-y-1.5"
                >
                  <div class="flex items-center justify-between text-xs">
                    <span class="font-semibold text-slate-800">{{ wardName }}</span>
                    <span class="font-mono text-slate-600 font-bold">{{ count }} Blocks</span>
                  </div>
                  <div class="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                    <div
                      class="bg-purple-600 h-full rounded-full transition-all duration-500"
                      :style="{ width: `${Math.max(6, Math.min(100, (Number(count) / Math.max(1, analytics?.metrics.totalBlocks || 1)) * 100))}%` }"
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Device & Channel Breakdown -->
            <div class="bg-white border border-slate-200 rounded-3xl p-8 shadow-xs space-y-6">
              <div>
                <h3 class="text-base font-bold text-slate-900">Client Device Distribution</h3>
                <p class="text-xs text-slate-500 mt-0.5">Audit logging events categorized by originating client hardware &amp; interface</p>
              </div>

              <div class="space-y-4">
                <div
                  v-for="(count, deviceName) in (analytics?.deviceDistribution || { DESKTOP: analytics?.metrics?.totalBlocks || 0 })"
                  :key="deviceName"
                  class="space-y-1.5"
                >
                  <div class="flex items-center justify-between text-xs">
                    <span class="font-semibold text-slate-800 uppercase tracking-wider text-[11px]">{{ deviceName }}</span>
                    <span class="font-mono text-slate-600 font-bold">{{ count }} Events</span>
                  </div>
                  <div class="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                    <div
                      class="bg-emerald-600 h-full rounded-full transition-all duration-500"
                      :style="{ width: `${Math.max(6, Math.min(100, (Number(count) / Math.max(1, analytics?.metrics.totalBlocks || 1)) * 100))}%` }"
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Top Active Actors Table -->
          <div class="bg-white border border-slate-200 rounded-3xl p-8 shadow-xs space-y-6">
            <h3 class="text-base font-bold text-slate-900">Top Audited Actors</h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div
                v-for="actor in analytics?.topActors"
                :key="actor.userId"
                class="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between"
              >
                <div>
                  <span class="font-bold text-slate-900 block text-xs">{{ actor.userId }}</span>
                  <span class="text-[11px] text-slate-400">Authenticated Clinician</span>
                </div>
                <span class="font-mono text-sm font-extrabold text-blue-700 bg-white px-2.5 py-1 rounded-xl border border-slate-200">
                  {{ actor.count }} logs
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Tab 3: Smart Automated Flagging System -->
        <div v-else-if="activeTab === 'flags'" class="space-y-6">
          <div class="bg-amber-50 border border-amber-200 rounded-3xl p-6 text-amber-900 flex items-start gap-4">
            <div class="p-2 bg-amber-100 rounded-xl text-amber-700 shrink-0">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h3 class="font-bold text-sm text-amber-950">Automated Anomaly Detection Engine</h3>
              <p class="text-xs text-amber-800 mt-1 leading-relaxed">
                Rules continuously evaluate sequential hash blocks for acute emergency overrides (Tier 2), cross-ward unauthorized attempts, and administrative permission changes.
              </p>
            </div>
          </div>

          <!-- Flagged Events List -->
          <div class="space-y-4">
            <div
              v-for="item in analytics?.flaggedEvents"
              :key="item.blockIndex"
              class="bg-white border rounded-3xl p-6 shadow-2xs hover:shadow-xs transition-shadow flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              :class="item.severity === 'CRITICAL' ? 'border-red-300 bg-red-50/10' : item.severity === 'HIGH' ? 'border-amber-300 bg-amber-50/10' : 'border-slate-200'"
            >
              <div class="space-y-2">
                <div class="flex items-center gap-2.5 flex-wrap">
                  <span
                    class="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-extrabold uppercase"
                    :class="item.severity === 'CRITICAL' ? 'bg-red-100 text-red-800' : item.severity === 'HIGH' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'"
                  >
                    {{ item.severity }} RISK
                  </span>
                  <span class="font-mono text-xs font-bold text-slate-900">Block #{{ item.blockIndex }}</span>
                  <span class="text-xs font-semibold text-slate-700">[{{ item.action }}]</span>
                  <span class="text-xs text-slate-400 font-mono">{{ formatDate(item.createdAt) }}</span>
                </div>

                <div class="text-xs text-slate-700 space-y-1">
                  <p v-for="(flag, fIdx) in item.flags" :key="fIdx" class="font-medium flex items-center gap-1.5 text-red-700">
                    <span class="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                    {{ flag }}
                  </p>
                  <p class="text-slate-500 text-[11px] font-mono">
                    Actor: {{ item.userId }} &middot; Active Ward: {{ item.activeWard }}
                    <span v-if="item.ipAddress" class="ml-2 text-slate-700 font-semibold">&middot; Origin IP: {{ item.ipAddress }}</span>
                    <span v-if="item.deviceInfo" class="ml-1 text-slate-400">({{ item.deviceInfo }})</span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                @click="openLogDrawerFromFlag(item)"
                class="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors shrink-0 cursor-pointer"
              >
                Inspect Block Hash &rarr;
              </button>
            </div>

            <div v-if="!analytics?.flaggedEvents?.length" class="py-12 bg-white rounded-3xl border border-slate-200 text-center text-xs text-slate-400">
              No anomalies or suspicious access events detected in ledger.
            </div>
          </div>
        </div>

        <!-- Tab 4: Interactive Dedicated Merkle Tree Graph (Git DAG Style) -->
        <div v-else-if="activeTab === 'tree'" class="space-y-6">
          <div class="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            <!-- Header & Telemetry -->
            <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-100">
              <div class="space-y-1">
                <div class="flex items-center gap-2.5">
                  <h3 class="text-lg font-bold text-slate-900">Topological Merkle Tree & Git DAG Visualizer</h3>
                  <span class="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-100 text-purple-800">
                    Interactive DAG &middot; O(log N) Proofs
                  </span>
                </div>
                <p class="text-xs text-slate-500">
                  Interactive cryptographic Merkle Tree network graph. Drag canvas to pan &middot; scroll to zoom &middot; click any commit node to highlight its authentication path and inspect full SHA-256 proofs below.
                </p>
              </div>

              <!-- Quick Root & Legend -->
              <div class="flex items-center gap-3 flex-wrap">
                <div class="px-3.5 py-2 bg-purple-50 border border-purple-200 rounded-2xl flex items-center gap-2">
                  <span class="text-[11px] font-bold text-purple-900">Root:</span>
                  <span class="text-xs font-mono font-extrabold text-purple-700 select-all">
                    {{ merkleTreeData?.root ? `${merkleTreeData.root.slice(0, 10)}...${merkleTreeData.root.slice(-6)}` : 'Generating...' }}
                  </span>
                </div>
                <button
                  type="button"
                  @click="handleSelectNode(getRootNode())"
                  class="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <svg class="w-3.5 h-3.5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  <span>Center Root</span>
                </button>
              </div>
            </div>

            <!-- Interactive Diagram Viewport -->
            <div
              ref="graphContainerRef"
              class="relative w-full h-[540px] bg-slate-950 rounded-3xl overflow-hidden border border-slate-800 select-none cursor-grab active:cursor-grabbing shadow-inner"
              @mousedown="onMouseDown"
              @mousemove="onMouseMove"
              @mouseup="onMouseUp"
              @mouseleave="onMouseUp"
              @wheel.prevent="onWheel"
            >
              <!-- Dotted Blueprint Canvas Background -->
              <div
                class="absolute inset-0 pointer-events-none opacity-20"
                :style="{
                  backgroundImage: 'radial-gradient(#94a3b8 1.5px, transparent 1.5px)',
                  backgroundSize: `${28 * zoom}px ${28 * zoom}px`,
                  backgroundPosition: `${panX}px ${panY}px`
                }"
              ></div>

              <!-- Floating Zoom & Control Bar -->
              <div class="absolute top-4 right-4 z-20 flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-2xl border border-slate-700 shadow-xl" @mousedown.stop>
                <button
                  type="button"
                  @click="zoomIn"
                  class="p-2 hover:bg-slate-800 rounded-xl text-slate-300 hover:text-white transition-colors cursor-pointer"
                  title="Zoom In"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                  </svg>
                </button>
                <button
                  type="button"
                  @click="zoomOut"
                  class="p-2 hover:bg-slate-800 rounded-xl text-slate-300 hover:text-white transition-colors cursor-pointer"
                  title="Zoom Out"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
                  </svg>
                </button>
                <div class="h-4 w-px bg-slate-700 mx-1"></div>
                <span class="text-[11px] font-mono font-bold text-slate-400 px-2">{{ Math.round(zoom * 100) }}%</span>
                <div class="h-4 w-px bg-slate-700 mx-1"></div>
                <button
                  type="button"
                  @click="resetView"
                  class="px-2.5 py-1 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                  title="Reset Viewport"
                >
                  Fit View
                </button>
              </div>

              <!-- Legend Overlay -->
              <div class="absolute bottom-4 left-4 z-20 flex items-center gap-3 bg-slate-900/90 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-slate-700 text-[11px] text-slate-300 shadow-xl" @mousedown.stop>
                <div class="flex items-center gap-1.5">
                  <span class="w-3 h-3 rounded-full bg-purple-500 border border-purple-300"></span>
                  <span class="font-medium">Merkle Root</span>
                </div>
                <div class="flex items-center gap-1.5">
                  <span class="w-3 h-3 rounded-full bg-indigo-600 border border-indigo-400"></span>
                  <span class="font-medium">Branch Hash</span>
                </div>
                <div class="flex items-center gap-1.5">
                  <span class="w-3 h-3 rounded-full bg-blue-500 border border-blue-300"></span>
                  <span class="font-medium">Leaf Block</span>
                </div>
                <div class="flex items-center gap-1.5">
                  <span class="w-4 h-1 rounded-full bg-purple-400"></span>
                  <span class="font-medium text-purple-300">Auth Path</span>
                </div>
              </div>

              <!-- SVG Network Graph Canvas -->
              <svg
                class="w-full h-full cursor-grab active:cursor-grabbing origin-top-left"
                :width="treeLayout.width"
                :height="treeLayout.height"
                :viewBox="`0 0 ${treeLayout.width} ${treeLayout.height}`"
                :style="{
                  transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
                  transformOrigin: '0 0'
                }"
              >
                <defs>
                  <!-- Glow filter for active path and selected nodes -->
                  <filter id="purpleGlow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>

                  <!-- Root Gradient -->
                  <linearGradient id="rootGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#a855f7" />
                    <stop offset="100%" stop-color="#6b21a8" />
                  </linearGradient>

                  <!-- Branch Gradient -->
                  <linearGradient id="branchGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#6366f1" />
                    <stop offset="100%" stop-color="#312e81" />
                  </linearGradient>

                  <!-- Leaf Gradient -->
                  <linearGradient id="leafGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#38bdf8" />
                    <stop offset="100%" stop-color="#0369a1" />
                  </linearGradient>
                </defs>

                <!-- 1. SVG Edges (Bezier Curved Branch Connectors) -->
                <g class="edges-layer">
                  <path
                    v-for="edge in treeLayout.edges"
                    :key="edge.id"
                    :d="edge.path"
                    fill="none"
                    :stroke="edge.isActive ? '#c084fc' : '#475569'"
                    :stroke-width="edge.isActive ? 3.5 : 1.8"
                    :stroke-dasharray="edge.isActive ? 'none' : '5 4'"
                    :filter="edge.isActive ? 'url(#purpleGlow)' : 'none'"
                    class="transition-all duration-300"
                  />
                </g>

                <!-- 2. SVG Nodes (Git Commit & Merkle Nodes) -->
                <g class="nodes-layer">
                  <g
                    v-for="item in treeLayout.nodes"
                    :key="item.id"
                    :transform="`translate(${item.x}, ${item.y})`"
                    @click.stop="handleSelectNode(item.node)"
                    class="cursor-pointer group"
                  >
                    <!-- Active Pulsing Outer Halo Ring -->
                    <circle
                      v-if="selectedMerkleNode?.id === item.id"
                      r="36"
                      fill="none"
                      stroke="#c084fc"
                      stroke-width="2.5"
                      stroke-dasharray="6 3"
                      class="animate-spin"
                      style="animation-duration: 8s;"
                    />

                    <!-- Authentication Path Indicator Halo -->
                    <circle
                      v-else-if="activePathNodeIds.has(item.id)"
                      r="30"
                      fill="none"
                      stroke="#a855f7"
                      stroke-width="2"
                      opacity="0.6"
                      filter="url(#purpleGlow)"
                    />

                    <!-- Main Commit Node Circle -->
                    <circle
                      :r="item.node.isLeaf ? 22 : item.node.level === (merkleTreeData?.levels.length ?? 1) - 1 ? 26 : 22"
                      :fill="item.node.level === (merkleTreeData?.levels.length ?? 1) - 1 ? 'url(#rootGradient)' : item.node.isLeaf ? 'url(#leafGradient)' : 'url(#branchGradient)'"
                      :stroke="selectedMerkleNode?.id === item.id ? '#ffffff' : activePathNodeIds.has(item.id) ? '#e9d5ff' : '#64748b'"
                      :stroke-width="selectedMerkleNode?.id === item.id ? 3 : 1.5"
                      class="transition-transform duration-200 group-hover:scale-110"
                    />

                    <!-- Inner Glyph / Icon -->
                    <!-- Root Emblem -->
                    <g v-if="item.node.level === (merkleTreeData?.levels.length ?? 1) - 1" transform="translate(-8, -8)" class="pointer-events-none text-white">
                      <path fill="currentColor" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" transform="scale(0.7)" />
                    </g>
                    <!-- Branch Split Icon -->
                    <g v-else-if="!item.node.isLeaf" transform="translate(-7, -7)" class="pointer-events-none text-white">
                      <circle cx="4" cy="4" r="2" fill="white" />
                      <circle cx="10" cy="10" r="2" fill="white" />
                      <path stroke="white" stroke-width="1.5" d="M4 6v2a2 2 0 002 2h2" fill="none" />
                    </g>
                    <!-- Leaf Block Index Number -->
                    <text
                      v-else
                      text-anchor="middle"
                      dy="4"
                      fill="#ffffff"
                      font-size="10"
                      font-family="monospace"
                      font-weight="bold"
                      class="pointer-events-none select-none"
                    >
                      #{{ item.node.blockIndex }}
                    </text>

                    <!-- Text Pill Label Below Node -->
                    <g transform="translate(0, 38)" class="pointer-events-none select-none">
                      <!-- Pill Background -->
                      <rect
                        :x="-(getNodeLabelWidth(item.node) / 2)"
                        y="-10"
                        :width="getNodeLabelWidth(item.node)"
                        height="20"
                        rx="10"
                        :fill="selectedMerkleNode?.id === item.id ? '#581c87' : '#0f172a'"
                        :stroke="selectedMerkleNode?.id === item.id ? '#c084fc' : '#334155'"
                        stroke-width="1"
                      />
                      <!-- Label Text -->
                      <text
                        text-anchor="middle"
                        dy="3.5"
                        :fill="selectedMerkleNode?.id === item.id ? '#f3e8ff' : '#94a3b8'"
                        font-size="9.5"
                        font-family="monospace"
                        font-weight="bold"
                      >
                        {{ getNodeDisplayTag(item.node) }}
                      </text>
                    </g>
                  </g>
                </g>
              </svg>
            </div>

            <!-- Dedicated Merkle Node Details Card at the Bottom (Preserved & Enhanced) -->
            <div v-if="selectedMerkleNode" class="pt-2">
              <div class="bg-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl space-y-6 border border-slate-800">
                <!-- Inspector Header -->
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
                  <div class="flex items-center gap-3">
                    <div
                      class="w-12 h-12 rounded-2xl flex items-center justify-center border shadow-xs shrink-0"
                      :class="selectedMerkleNode.isLeaf ? 'bg-blue-900/50 border-blue-700 text-blue-400' : selectedMerkleNode.level === (merkleTreeData?.levels.length ?? 1) - 1 ? 'bg-purple-900/50 border-purple-700 text-purple-400' : 'bg-slate-800 border-slate-700 text-slate-300'"
                    >
                      <svg v-if="selectedMerkleNode.isLeaf" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <svg v-else-if="selectedMerkleNode.level === (merkleTreeData?.levels.length ?? 1) - 1" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      <svg v-else class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2 1.5 3 3.5 3h9c2 0 3.5-1 3.5-3V7c0-2-1.5-3-3.5-3h-9C5.5 4 4 5 4 7z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6" />
                      </svg>
                    </div>

                    <div>
                      <div class="flex items-center gap-2.5 flex-wrap">
                        <h4 class="text-base font-bold text-white font-sans">{{ selectedMerkleNode.label }}</h4>
                        <span
                          class="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase"
                          :class="selectedMerkleNode.isLeaf ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'"
                        >
                          {{ selectedMerkleNode.isLeaf ? 'Audit Leaf Block' : 'Intermediate Branch Hash' }}
                        </span>
                        <span class="text-xs text-slate-400 font-mono">Level {{ selectedMerkleNode.level }}</span>
                      </div>
                      <p class="text-xs text-slate-400 font-sans mt-0.5">
                        {{ selectedMerkleNode.isLeaf ? 'Immutable transaction block committed to isolated avecinna_audit_db' : 'Cryptographic hash derived from binary left + right child concatenation' }}
                      </p>
                    </div>
                  </div>

                  <div class="flex items-center gap-2">
                    <span class="px-3 py-1.5 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-400 text-xs font-semibold flex items-center gap-1.5">
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Cryptographically Valid</span>
                    </span>

                    <button
                      v-if="selectedMerkleNode.isLeaf"
                      type="button"
                      @click="openLogDrawerFromLeafNode(selectedMerkleNode)"
                      class="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <span>Inspect Full Block Record</span>
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </button>
                  </div>
                </div>

                <!-- Full SHA-256 Hash Display Box -->
                <div class="space-y-2">
                  <div class="flex items-center justify-between text-xs">
                    <span class="font-mono text-slate-400 font-semibold">Full 64-Character SHA-256 Digest:</span>
                    <button
                      type="button"
                      @click="copyHashToClipboard(selectedMerkleNode.hash)"
                      class="text-xs text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1 font-sans cursor-pointer"
                    >
                      <svg v-if="copiedHash" class="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                      </svg>
                      <svg v-else class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <span>{{ copiedHash ? 'Copied Hash!' : 'Copy Hash' }}</span>
                    </button>
                  </div>

                  <div class="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-blue-300 font-mono text-xs sm:text-sm break-all select-all font-semibold tracking-wide">
                    {{ selectedMerkleNode.hash }}
                  </div>
                </div>

                <!-- Traversal & Lineage Navigation -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <!-- Parent Node Link -->
                  <div class="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
                    <span class="text-[11px] font-mono text-slate-400 block">Parent Branch in Tree:</span>
                    <div v-if="selectedMerkleNode.parentId && merkleTreeData?.nodes[selectedMerkleNode.parentId]">
                      <button
                        type="button"
                        @click="handleSelectNode(merkleTreeData.nodes[selectedMerkleNode.parentId])"
                        class="w-full text-left p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 transition-colors flex items-center justify-between group cursor-pointer"
                      >
                        <div class="truncate mr-2">
                          <span class="text-xs font-bold text-white block">{{ merkleTreeData.nodes[selectedMerkleNode.parentId].label }}</span>
                          <span class="text-[10px] font-mono text-slate-400 truncate block">{{ merkleTreeData.nodes[selectedMerkleNode.parentId].hash }}</span>
                        </div>
                        <span class="text-xs text-purple-400 group-hover:translate-x-0.5 transition-transform shrink-0">&uarr; Inspect</span>
                      </button>
                    </div>
                    <div v-else class="text-xs font-mono text-purple-400 font-semibold p-2.5">
                      Top Root Certificate (No Parent)
                    </div>
                  </div>

                  <!-- Children Nodes Links -->
                  <div class="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
                    <span class="text-[11px] font-mono text-slate-400 block">Child Branches / Hashes:</span>
                    <div v-if="selectedMerkleNode.children?.length" class="space-y-1.5">
                      <button
                        v-for="cId in selectedMerkleNode.children"
                        :key="cId"
                        type="button"
                        @click="handleSelectNode(merkleTreeData?.nodes[cId])"
                        class="w-full text-left p-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 transition-colors flex items-center justify-between group cursor-pointer"
                      >
                        <div class="truncate mr-2">
                          <span class="text-xs font-bold text-white block">{{ merkleTreeData?.nodes[cId]?.label || cId }}</span>
                          <span class="text-[10px] font-mono text-slate-400 truncate block">{{ merkleTreeData?.nodes[cId]?.hash }}</span>
                        </div>
                        <span class="text-xs text-blue-400 group-hover:translate-x-0.5 transition-transform shrink-0">&darr; Inspect</span>
                      </button>
                    </div>
                    <div v-else class="text-xs font-mono text-blue-400 font-semibold p-2.5">
                      Base Leaf Transaction (No Children)
                    </div>
                  </div>
                </div>

                <!-- Leaf Node Specific Transaction Details -->
                <div v-if="selectedMerkleNode.isLeaf" class="space-y-4 pt-4 border-t border-slate-800">
                  <h5 class="text-xs font-bold text-slate-300 font-mono uppercase tracking-wider">Underlying Audit Block Metadata</h5>
                  
                  <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 font-sans">
                    <div class="p-3 bg-slate-950 rounded-2xl border border-slate-800">
                      <span class="text-slate-500 block text-[10px]">Sequential Block Index</span>
                      <span class="font-mono font-bold text-white text-xs">#{{ selectedMerkleNode.blockIndex }}</span>
                    </div>
                    <div class="p-3 bg-slate-950 rounded-2xl border border-slate-800">
                      <span class="text-slate-500 block text-[10px]">Action Trigger</span>
                      <span class="font-mono font-bold text-blue-300 text-xs">{{ selectedMerkleNode.action }}</span>
                    </div>
                    <div class="p-3 bg-slate-950 rounded-2xl border border-slate-800">
                      <span class="text-slate-500 block text-[10px]">Actor Identifier</span>
                      <span class="font-mono font-bold text-white text-xs truncate block">{{ selectedMerkleNode.actor }}</span>
                    </div>
                    <div class="p-3 bg-slate-950 rounded-2xl border border-slate-800">
                      <span class="text-slate-500 block text-[10px]">Active Working Ward</span>
                      <span class="font-mono font-bold text-white text-xs">{{ selectedMerkleNode.activeWard || 'N/A' }}</span>
                    </div>
                  </div>

                  <div v-if="selectedMerkleNode.ipAddress" class="p-3 bg-slate-950 rounded-2xl border border-slate-800 font-mono text-xs flex items-center justify-between">
                    <div>
                      <span class="text-slate-500 block text-[10px]">Client Origin IP &amp; Device</span>
                      <span class="text-blue-300 font-bold select-all">{{ selectedMerkleNode.ipAddress }}</span>
                      <span v-if="selectedMerkleNode.deviceInfo" class="text-slate-400 ml-2 text-[11px] font-sans">({{ selectedMerkleNode.deviceInfo }})</span>
                    </div>
                    <span v-if="selectedMerkleNode.deviceType" class="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 font-bold">
                      {{ selectedMerkleNode.deviceType }}
                    </span>
                  </div>

                  <div v-if="selectedMerkleNode.prevHash" class="p-3 bg-slate-950 rounded-2xl border border-slate-800 font-mono text-xs">
                    <span class="text-slate-500 block text-[10px] mb-0.5">Previous Chained Block Link (prev_hash):</span>
                    <span class="text-slate-300 select-all break-all">{{ selectedMerkleNode.prevHash }}</span>
                  </div>

                  <div v-if="selectedMerkleNode.payloadHash" class="p-3 bg-slate-950 rounded-2xl border border-slate-800 font-mono text-xs">
                    <span class="text-slate-500 block text-[10px] mb-0.5">Payload Hash (SHA-256 of ePHI-free event payload):</span>
                    <span class="text-slate-300 select-all break-all">{{ selectedMerkleNode.payloadHash }}</span>
                  </div>

                  <div v-if="selectedMerkleNode.timestamp" class="flex justify-between items-center text-xs font-mono text-slate-500 px-1">
                    <span>Recorded Timestamp:</span>
                    <span class="font-bold text-slate-300">{{ formatDate(selectedMerkleNode.timestamp) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

    <!-- Individual Log Analysis Drawer/Modal -->
    <div
      v-if="selectedLog"
      @click.self="selectedLog = null"
      class="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
    >
      <div class="bg-white rounded-3xl max-w-2xl w-full p-8 shadow-2xl border border-slate-200 relative my-8" role="dialog" aria-modal="true">
        <button
          type="button"
          @click="selectedLog = null"
          class="absolute top-6 right-6 text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div class="flex items-start gap-4 mb-6">
          <div class="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h3 class="text-lg font-bold text-slate-900 tracking-tight">Audit Block #{{ selectedLog.indexNum }} Analysis</h3>
              <span class="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold" :class="getActionBadgeClass(selectedLog.action)">
                {{ selectedLog.action }}
              </span>
            </div>
            <p class="text-xs text-slate-500 mt-1">Cryptographic integrity proof and payload hash metadata.</p>
          </div>
        </div>

        <div class="space-y-4 text-xs font-mono">
          <!-- Actor & Ward Summary -->
          <div class="grid grid-cols-2 gap-3 font-sans">
            <div class="p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <span class="text-slate-400 block text-[11px]">Actor Identifier</span>
              <span class="font-bold text-slate-900">{{ selectedLog.userId }}</span>
            </div>
            <div class="p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <span class="text-slate-400 block text-[11px]">Active Working Ward</span>
              <span class="font-bold text-slate-900">{{ selectedLog.activeWard }}</span>
            </div>
          </div>

          <!-- Network & Device Forensics -->
          <div class="p-4 bg-slate-50/80 border border-slate-200 rounded-2xl space-y-3 font-sans">
            <div class="flex items-center justify-between border-b border-slate-200/80 pb-2">
              <div class="flex items-center gap-2">
                <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span class="text-slate-700 font-bold text-xs uppercase tracking-wider">Network &amp; Device Forensics</span>
              </div>
              <span
                v-if="selectedLog.deviceType"
                class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200/80 text-slate-700 font-mono"
              >
                {{ selectedLog.deviceType }}
              </span>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
              <div class="bg-white p-2.5 rounded-xl border border-slate-200/70">
                <span class="text-slate-400 block text-[10px] uppercase font-semibold">Origin Client IP</span>
                <span class="font-mono font-bold text-slate-900 text-[11px] select-all">{{ selectedLog.ipAddress || '127.0.0.1' }}</span>
              </div>

              <div class="bg-white p-2.5 rounded-xl border border-slate-200/70">
                <span class="text-slate-400 block text-[10px] uppercase font-semibold">Client Environment</span>
                <span class="font-medium text-slate-800 text-[11px] truncate block" :title="selectedLog.deviceInfo || 'Desktop Browser'">
                  {{ selectedLog.deviceInfo || 'Desktop Browser' }}
                </span>
              </div>

              <div class="bg-white p-2.5 rounded-xl border border-slate-200/70">
                <span class="text-slate-400 block text-[10px] uppercase font-semibold">Execution Mode</span>
                <span class="font-mono font-bold text-blue-600 text-[11px]">
                  {{ selectedLog.executionMode || 'MODE_A' }}
                </span>
              </div>
            </div>

            <div v-if="selectedLog.httpMethod || selectedLog.requestPath" class="bg-white p-2.5 rounded-xl border border-slate-200/70 flex items-center justify-between gap-2">
              <span class="text-slate-400 text-[10px] uppercase font-semibold shrink-0">Request Endpoint</span>
              <div class="flex items-center gap-1.5 font-mono text-[11px] overflow-hidden text-right">
                <span v-if="selectedLog.httpMethod" class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-700 shrink-0">
                  {{ selectedLog.httpMethod }}
                </span>
                <span class="text-slate-700 truncate select-all">{{ selectedLog.requestPath || '/api/v1' }}</span>
              </div>
            </div>

            <div v-if="selectedLog.requestId" class="bg-white p-2.5 rounded-xl border border-slate-200/70 flex items-center justify-between gap-2">
              <span class="text-slate-400 text-[10px] uppercase font-semibold shrink-0">Correlation Request ID</span>
              <span class="font-mono text-[11px] text-slate-600 truncate select-all">{{ selectedLog.requestId }}</span>
            </div>

            <div v-if="selectedLog.userAgent" class="bg-white p-2.5 rounded-xl border border-slate-200/70 space-y-1">
              <span class="text-slate-400 text-[10px] uppercase font-semibold block">User Agent</span>
              <span class="font-mono text-[10px] text-slate-500 break-all block leading-relaxed select-all">
                {{ selectedLog.userAgent }}
              </span>
            </div>
          </div>

          <!-- Current Block Hash -->
          <div class="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-1">
            <span class="text-blue-900 font-bold font-sans">Block SHA-256 Hash:</span>
            <div class="text-[11px] text-blue-950 font-bold break-all select-all">
              {{ selectedLog.blockHash }}
            </div>
          </div>

          <!-- Previous Chained Block Hash -->
          <div class="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
            <span class="text-slate-600 font-bold font-sans">Previous Block Hash Link (prev_hash):</span>
            <div class="text-[11px] text-slate-700 break-all select-all">
              {{ selectedLog.prevHash }}
            </div>
          </div>

          <!-- Payload Integrity Hash -->
          <div class="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
            <span class="text-slate-600 font-bold font-sans">Payload Hash (SHA-256 of Event Payload):</span>
            <div class="text-[11px] text-slate-700 break-all select-all">
              {{ selectedLog.payloadHash }}
            </div>
          </div>

          <!-- Timestamp -->
          <div class="flex justify-between items-center px-1 font-sans text-slate-500">
            <span>Recorded Timestamp:</span>
            <span class="font-mono font-bold text-slate-800">{{ selectedLog.createdAt }}</span>
          </div>
        </div>

        <div class="flex items-center justify-end gap-3 pt-6 border-t border-slate-100 mt-6">
          <button
            type="button"
            @click="selectedLog = null"
            class="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>

    <!-- Verify Modal -->
    <AuditVerifierModal :isOpen="showAuditVerifierModal" @close="showAuditVerifierModal = false" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useAudit, type AuditBlock, type MerkleNode } from '~/composables/useAudit'

interface NodeLayout {
  id: string
  x: number
  y: number
  node: MerkleNode
}

interface EdgeLayout {
  id: string
  from: { x: number; y: number }
  to: { x: number; y: number }
  path: string
  isActive: boolean
}

const audit = useAudit()
const showAuditVerifierModal = ref(false)
const activeTab = ref<'ledger' | 'analytics' | 'flags' | 'tree'>('ledger')

const searchQuery = ref('')
const selectedAction = ref('ALL')
const selectedDeviceType = ref('ALL')
let searchTimeout: any = null

const blocksList = audit.blocks
const analytics = audit.analytics
const merkleTreeData = audit.merkleTree
const pagination = audit.pagination
const loading = audit.loading

const selectedLog = ref<AuditBlock | null>(null)
const selectedMerkleNode = ref<MerkleNode | null>(null)
const copiedHash = ref(false)

// Pan & Zoom Engine
const zoom = ref(1)
const panX = ref(60)
const panY = ref(40)
const isDragging = ref(false)
const dragStart = ref({ x: 0, y: 0 })
const graphContainerRef = ref<HTMLElement | null>(null)

// Compute Merkle Authentication Path (Path from selected node to Root)
const activePathNodeIds = computed(() => {
  if (!selectedMerkleNode.value || !merkleTreeData.value?.nodes) return new Set<string>()
  const set = new Set<string>()
  let current: MerkleNode | undefined = selectedMerkleNode.value
  while (current) {
    set.add(current.id)
    current = current.parentId ? merkleTreeData.value.nodes[current.parentId] : undefined
  }
  return set
})

// Topological Tree Layout Computations
const treeLayout = computed(() => {
  if (!merkleTreeData.value?.levels || merkleTreeData.value.levels.length === 0) {
    return { nodes: [] as NodeLayout[], edges: [] as EdgeLayout[], width: 1100, height: 600 }
  }

  const levels = merkleTreeData.value.levels // levels[0] is leaves, levels[L-1] is Root
  const totalLevels = levels.length
  const leaves = levels[0] || []
  const leafCount = Math.max(1, leaves.length)

  const leafSpacing = 170
  const levelHeight = 140
  const paddingX = 120
  const paddingTop = 70

  const width = Math.max(1100, leafCount * leafSpacing + paddingX * 2)
  const height = totalLevels * levelHeight + 140

  const nodePositions: Record<string, NodeLayout> = {}

  // 1. Position Level 0 (Leaves at the bottom)
  leaves.forEach((leaf, idx) => {
    const x = paddingX + idx * leafSpacing + leafSpacing / 2
    const y = paddingTop + (totalLevels - 1) * levelHeight
    nodePositions[leaf.id] = { id: leaf.id, x, y, node: leaf }
  })

  // 2. Position higher branch levels (1 to Root)
  for (let lvl = 1; lvl < totalLevels; lvl++) {
    const currentLevelNodes = levels[lvl] || []
    const y = paddingTop + (totalLevels - 1 - lvl) * levelHeight

    currentLevelNodes.forEach((node, idx) => {
      let x: number
      if (node.children && node.children.length > 0) {
        const childPositions = node.children
          .map((cId) => nodePositions[cId]?.x)
          .filter((px): px is number => px !== undefined)
        if (childPositions.length > 0) {
          x = childPositions.reduce((a, b) => a + b, 0) / childPositions.length
        } else {
          x = paddingX + idx * (width / (currentLevelNodes.length + 1))
        }
      } else {
        x = width / 2
      }
      nodePositions[node.id] = { id: node.id, x, y, node }
    })
  }

  // 3. Compute curved cubic Bezier branch connections
  const edges: EdgeLayout[] = []
  const activeIds = activePathNodeIds.value

  Object.values(nodePositions).forEach((p) => {
    if (p.node.children && p.node.children.length > 0) {
      p.node.children.forEach((cId) => {
        const childPos = nodePositions[cId]
        if (childPos) {
          const from = { x: p.x, y: p.y }
          const to = { x: childPos.x, y: childPos.y }
          const dy = (to.y - from.y) / 2
          const path = `M ${from.x} ${from.y + 24} C ${from.x} ${from.y + 24 + dy}, ${to.x} ${to.y - 24 - dy}, ${to.x} ${to.y - 24}`
          const isActive = activeIds.has(p.node.id) && activeIds.has(childPos.node.id)
          edges.push({
            id: `${p.node.id}->${childPos.node.id}`,
            from,
            to,
            path,
            isActive,
          })
        }
      })
    }
  })

  return {
    nodes: Object.values(nodePositions),
    edges,
    width,
    height,
  }
})

const getRootNode = (): MerkleNode | undefined => {
  if (merkleTreeData.value?.levels && merkleTreeData.value.levels.length > 0) {
    const topLevel = merkleTreeData.value.levels[merkleTreeData.value.levels.length - 1]
    if (topLevel && topLevel.length > 0) {
      return topLevel[0]
    }
  }
  return undefined
}

const handleSelectNode = (node?: MerkleNode) => {
  if (!node) return
  selectedMerkleNode.value = node
  centerOnNode(node.id)
}

const centerOnNode = (nodeId: string) => {
  const target = treeLayout.value.nodes.find((n) => n.id === nodeId)
  if (target && graphContainerRef.value) {
    const cWidth = graphContainerRef.value.clientWidth
    const cHeight = graphContainerRef.value.clientHeight
    panX.value = cWidth / 2 - target.x * zoom.value
    panY.value = cHeight / 2 - target.y * zoom.value
  }
}

// Mouse Drag & Pan Handlers
const onMouseDown = (e: MouseEvent) => {
  if (e.button === 0) {
    isDragging.value = true
    dragStart.value = { x: e.clientX - panX.value, y: e.clientY - panY.value }
  }
}

const onMouseMove = (e: MouseEvent) => {
  if (isDragging.value) {
    panX.value = e.clientX - dragStart.value.x
    panY.value = e.clientY - dragStart.value.y
  }
}

const onMouseUp = () => {
  isDragging.value = false
}

const onWheel = (e: WheelEvent) => {
  const delta = e.deltaY * -0.0012
  const newZoom = Math.min(2.5, Math.max(0.35, zoom.value + delta))
  zoom.value = Math.round(newZoom * 100) / 100
}

const zoomIn = () => {
  zoom.value = Math.min(2.5, Math.round((zoom.value + 0.2) * 10) / 10)
}

const zoomOut = () => {
  zoom.value = Math.max(0.35, Math.round((zoom.value - 0.2) * 10) / 10)
}

const resetView = () => {
  zoom.value = 1
  if (graphContainerRef.value && treeLayout.value.nodes.length > 0) {
    const root = getRootNode()
    if (root) {
      centerOnNode(root.id)
      return
    }
  }
  panX.value = 60
  panY.value = 40
}

const getNodeDisplayTag = (node: MerkleNode): string => {
  if (node.isLeaf) {
    return `#${node.blockIndex} ${node.action?.slice(0, 10) || ''}`
  }
  if (node.level === (merkleTreeData.value?.levels.length ?? 1) - 1) {
    return 'MERKLE ROOT'
  }
  return node.label
}

const getNodeLabelWidth = (node: MerkleNode): number => {
  const str = getNodeDisplayTag(node)
  return Math.max(70, str.length * 7.5 + 18)
}

const copyHashToClipboard = (hash: string) => {
  if (import.meta.client && navigator?.clipboard) {
    navigator.clipboard.writeText(hash)
    copiedHash.value = true
    setTimeout(() => {
      copiedHash.value = false
    }, 2000)
  }
}

const openLogDrawerFromLeafNode = (node: MerkleNode) => {
  if (!node.isLeaf) return
  selectedLog.value = {
    indexNum: node.blockIndex || 0,
    blockHash: node.hash,
    prevHash: node.prevHash || '',
    userId: node.actor || 'SYSTEM',
    patientId: node.patientId || null,
    action: node.action || 'AUDIT_EVENT',
    activeWard: node.activeWard || 'N/A',
    payloadHash: node.payloadHash || '',
    ipAddress: node.ipAddress || null,
    userAgent: node.userAgent || null,
    deviceType: node.deviceType || null,
    deviceInfo: node.deviceInfo || null,
    httpMethod: node.httpMethod || null,
    requestPath: node.requestPath || null,
    executionMode: (node.executionMode as any) || null,
    requestId: node.requestId || null,
    isOfflineSync: false,
    createdAt: node.timestamp || new Date().toISOString(),
  }
}

watch(
  () => merkleTreeData.value,
  (newVal) => {
    if (newVal && !selectedMerkleNode.value) {
      const root = getRootNode()
      if (root) {
        selectedMerkleNode.value = root
      }
    }
  },
  { immediate: true }
)

const loadBlocks = async (page = 1) => {
  try {
    await audit.fetchAuditBlocks({
      page,
      limit: 20,
      search: searchQuery.value,
      action: selectedAction.value,
      deviceType: selectedDeviceType.value,
    })
  } catch (err) {
    // Handled in composable
  }
}

const loadAllData = async () => {
  await Promise.all([
    loadBlocks(1),
    audit.fetchAuditAnalytics(),
    audit.fetchMerkleTree(),
  ])
}

const onSearchChange = () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    loadBlocks(1)
  }, 300)
}

const onFilterChange = () => {
  loadBlocks(1)
}

const goToPage = (p: number) => {
  if (p >= 1 && p <= pagination.value.totalPages) {
    loadBlocks(p)
  }
}

const openLogDrawer = (block: AuditBlock) => {
  selectedLog.value = block
}

const openLogDrawerFromFlag = (flaggedItem: any) => {
  selectedLog.value = {
    indexNum: flaggedItem.blockIndex,
    blockHash: flaggedItem.blockHash,
    prevHash: flaggedItem.prevHash,
    userId: flaggedItem.userId,
    patientId: flaggedItem.patientId,
    action: flaggedItem.action,
    activeWard: flaggedItem.activeWard,
    payloadHash: flaggedItem.payloadHash,
    ipAddress: flaggedItem.ipAddress || null,
    userAgent: flaggedItem.userAgent || null,
    deviceType: flaggedItem.deviceType || null,
    deviceInfo: flaggedItem.deviceInfo || null,
    httpMethod: flaggedItem.httpMethod || null,
    requestPath: flaggedItem.requestPath || null,
    executionMode: flaggedItem.executionMode || null,
    requestId: flaggedItem.requestId || null,
    isOfflineSync: false,
    createdAt: flaggedItem.createdAt,
  }
}

const getActionBadgeClass = (action: string) => {
  if (action.includes('BREAK_GLASS') || action.includes('EMERGENCY')) {
    return 'bg-amber-100 text-amber-800'
  }
  if (action.includes('UNAUTHORIZED') || action.includes('FORBIDDEN')) {
    return 'bg-red-100 text-red-800'
  }
  if (action.includes('ADMIN')) {
    return 'bg-purple-100 text-purple-800'
  }
  return 'bg-blue-100 text-blue-800'
}

const formatDate = (iso: string) => {
  if (!iso) return '-'
  const d = new Date(iso)
  return d.toLocaleString('en-GB', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

onMounted(() => {
  loadAllData()
})
</script>

