<template>
  <div v-if="visible" class="bg-slate-900/5 border border-slate-200/80 rounded-2xl px-4 py-3 text-slate-700 flex items-center justify-between gap-4 transition-all">
    <div class="flex items-center gap-2.5 min-w-0">
      <div class="w-6 h-6 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center shrink-0">
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>
      <p class="text-xs text-slate-600 truncate">
        <strong class="text-slate-900 font-semibold">Privacy Restriction Active:</strong> Clinical health records (ePHI) are redacted server-side for System Administrators under HIPAA Minimum Necessary rules.
      </p>
    </div>
    <button
      type="button"
      @click="visible = false"
      class="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-200/50 transition-colors shrink-0"
      aria-label="Dismiss"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
const visible = ref(true)
</script>
