<template>
  <header class="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-12 py-3 sm:py-4 flex items-center justify-between gap-3">
    <!-- Left: Hamburger toggle (mobile only) + Context badge -->
    <div class="flex items-center gap-2.5 sm:gap-3 min-w-0">
      <!-- Mobile Menu Toggle Button -->
      <button
        type="button"
        @click="$emit('toggleSidebar')"
        class="lg:hidden p-1.5 -ml-1 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
        aria-label="Open navigation menu"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <!-- Admin Badge -->
      <div v-if="role === 'ADMIN'" class="flex items-center gap-1.5 sm:gap-2 text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-full px-2.5 sm:px-3 py-1 shrink-0">
        <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0"></span>
        <svg class="w-3.5 h-3.5 text-amber-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
        <span class="truncate max-w-[120px] sm:max-w-none">System Administration</span>
      </div>

      <!-- Clinical Active Ward Badge -->
      <div v-else class="flex items-center gap-1.5 sm:gap-2 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-2.5 sm:px-3 py-1 shrink-0 min-w-0">
        <span class="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shrink-0"></span>
        <svg class="w-3 h-3 text-blue-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span class="font-mono truncate max-w-[130px] sm:max-w-xs">{{ activeWardLabel }}</span>
      </div>
    </div>

    <!-- Right: Actions -->
    <div class="flex items-center gap-2 shrink-0">
      <!-- Network & Offline Encrypted Cache Status Indicator -->
      <div
        v-if="!isOnline"
        class="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-300 text-xs font-medium text-amber-800 shrink-0"
        title="Offline Mode: Clinical data is read from and written to client-side AES-GCM-256 encrypted IndexedDB"
      >
        <span class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
        <svg class="w-3.5 h-3.5 text-amber-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 4.243a9 9 0 01-2.828-5.657m0 0l2.828-2.829m-2.828 2.829L3 21m6.364-12.728a5 5 0 012.828-1.414m0 0l2.829 2.829" />
        </svg>
        <span class="font-medium hidden sm:inline">Offline (Encrypted Cache)</span>
        <span class="font-medium sm:hidden">Offline</span>
        <span v-if="pendingAuditCount > 0" class="ml-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-amber-200 text-amber-900">
          {{ pendingAuditCount }} queued
        </span>
      </div>

      <div
        v-else-if="isSyncing"
        class="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-xs font-medium text-blue-700 shrink-0"
      >
        <svg class="w-3.5 h-3.5 text-blue-600 animate-spin shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        <span class="font-medium hidden sm:inline">Syncing DAG Branch...</span>
        <span class="font-medium sm:hidden">Syncing...</span>
      </div>

      <div
        v-else-if="pendingAuditCount > 0"
        @click="triggerSync"
        class="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-xs font-medium text-emerald-800 cursor-pointer shrink-0 transition-colors"
        title="Click to merge offline audit blocks into central audit database"
      >
        <svg class="w-3.5 h-3.5 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <span class="hidden sm:inline">Sync Queue:</span>
        <span class="font-mono font-semibold">{{ pendingAuditCount }}</span>
      </div>

      <!-- Admin: Audit status pill -->
      <div v-if="role === 'ADMIN'" class="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium text-slate-600">
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
        <span class="hidden sm:inline">Audit: </span><strong class="text-emerald-700 font-mono">ONLINE</strong>
      </div>

      <!-- Clinical: Ward Switcher + Emergency -->
      <template v-else>
        <button
          type="button"
          @click="$emit('openWardSwitcher')"
          class="inline-flex items-center gap-1.5 sm:gap-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 text-xs font-medium px-2.5 sm:px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
        >
          <svg class="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          <span class="hidden sm:inline">Switch Ward</span>
          <span class="sm:hidden">Ward</span>
        </button>

        <!-- Ghost/outline emergency button — fills only when triggered -->
        <button
          type="button"
          @click="$emit('openBreakGlass')"
          class="inline-flex items-center gap-1.5 sm:gap-2 border border-amber-300 text-amber-700 bg-transparent hover:bg-amber-50 text-xs font-medium px-2.5 sm:px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
        >
          <svg class="w-3.5 h-3.5 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span class="hidden sm:inline">Break-Glass</span>
          <span class="sm:hidden">Emergency</span>
        </button>
      </template>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAuth } from '~/composables/useAuth'
import { useOfflineStorage } from '~/composables/useOfflineStorage'

defineEmits(['openWardSwitcher', 'openBreakGlass', 'toggleSidebar'])

const auth = useAuth()
const offlineStorage = useOfflineStorage()

const role = computed(() => auth.role.value)
const activeWard = computed(() => auth.activeWard.value)

const isOnline = computed(() => offlineStorage.isOnline.value)
const isSyncing = computed(() => offlineStorage.isSyncing.value)
const pendingAuditCount = computed(() => offlineStorage.pendingAuditCount.value)

const triggerSync = async () => {
  await offlineStorage.triggerBackgroundSync()
}

const activeWardLabel = computed(() => {
  if (!activeWard.value) return 'No ward selected'
  return `${activeWard.value.name} · ${activeWard.value.code}`
})
</script>
