<template>
  <div class="bg-white border border-slate-200/90 rounded-xl p-6 shadow-2xs hover:shadow-xs transition-shadow">
    <div class="flex items-center justify-between text-slate-400 mb-2">
      <span class="font-body text-xs font-bold uppercase tracking-wider text-slate-500">{{ label }}</span>
      <div class="w-8 h-8 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
        <slot name="icon" />
      </div>
    </div>

    <p
      class="text-3xl font-bold font-mono tracking-tight"
      :class="variant === 'critical' ? 'text-red-600' : 'text-slate-900'"
    >
      {{ value }}
    </p>

    <p v-if="subtext" class="font-body text-xs text-slate-400 mt-1">
      {{ subtext }}
    </p>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    label: string
    value: string | number
    subtext?: string
    variant?: 'default' | 'critical'
  }>(),
  {
    variant: 'default',
  }
)
</script>
