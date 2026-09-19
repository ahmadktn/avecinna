<template>
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
    <div class="min-w-0">
      <div class="flex items-center gap-2.5 sm:gap-3 flex-wrap">
        <h1 class="font-brand text-xl font-semibold text-slate-900 tracking-tight">{{ title }}</h1>
        <slot name="badge" />
      </div>
      <p v-if="subtitle || description" class="font-body text-xs text-slate-500 mt-1 leading-relaxed">{{ subtitle || description }}</p>
    </div>

    <div v-if="$slots.actions" class="flex items-center gap-2 sm:gap-3 flex-wrap shrink-0">
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  subtitle?: string
  description?: string
}>()
</script>
