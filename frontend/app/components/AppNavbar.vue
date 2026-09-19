<template>
  <header class="sticky top-0 z-30 bg-white border-b border-slate-200 px-12 py-6 flex items-center justify-between">
    <!-- Left: Context badge -->
    <div class="flex items-center gap-3 min-w-0">
      <!-- Admin Badge -->
      <div v-if="role === 'ADMIN'" class="flex items-center gap-2 text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-full px-3 py-1 shrink-0">
        <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
        <svg class="w-3.5 h-3.5 text-amber-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
        <span>System Administration</span>
      </div>

      <!-- Clinical Active Ward Badge -->
      <div v-else class="flex items-center gap-2 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-3 py-1 shrink-0">
        <span class="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
        <svg class="w-3 h-3 text-blue-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span class="font-mono">{{ activeWardLabel }}</span>
      </div>
    </div>

    <!-- Right: Actions -->
    <div class="flex items-center gap-2 shrink-0">
      <!-- Admin: Audit status pill -->
      <div v-if="role === 'ADMIN'" class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium text-slate-600">
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
        <span>Audit: <strong class="text-emerald-700 font-mono">ONLINE</strong></span>
      </div>

      <!-- Clinical: Ward Switcher + Emergency -->
      <template v-else>
        <button
          type="button"
          @click="$emit('openWardSwitcher')"
          class="inline-flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
        >
          <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          <span>Switch Ward</span>
        </button>

        <!-- Ghost/outline emergency button — fills only when triggered -->
        <button
          type="button"
          @click="$emit('openBreakGlass')"
          class="inline-flex items-center gap-2 border border-amber-300 text-amber-700 bg-transparent hover:bg-amber-50 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
        >
          <svg class="w-3.5 h-3.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>Break-Glass</span>
        </button>
      </template>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAuth } from '~/composables/useAuth'

defineEmits(['openWardSwitcher', 'openBreakGlass'])

const auth = useAuth()

const role = computed(() => auth.role.value)
const activeWard = computed(() => auth.activeWard.value)

const activeWardLabel = computed(() => {
  if (!activeWard.value) return 'No ward selected'
  return `${activeWard.value.name} · ${activeWard.value.code}`
})
</script>
