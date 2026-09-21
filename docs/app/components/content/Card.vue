<template>
  <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-slate-300">
    <div v-if="icon || title" class="flex items-center gap-3 mb-2">
      <div v-if="icon" class="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
        <Icon :name="icon" class="h-4 w-4" />
      </div>
      <h4 v-if="title" class="font-brand text-sm font-semibold text-slate-900">{{ title }}</h4>
    </div>
    <div class="text-xs text-slate-600 leading-relaxed">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title?: string
  icon?: string
}>()
</script>
