<template>
  <div :class="`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${count} gap-4 animate-pulse`">
    <div
      v-for="i in count"
      :key="i"
      class="bg-white border border-slate-200/90 rounded-xl p-6 shadow-2xs space-y-3"
    >
      <div class="flex items-center justify-between">
        <div class="h-3 w-28 bg-slate-200 rounded-md"></div>
        <div class="w-8 h-8 rounded-xl bg-slate-100 shrink-0"></div>
      </div>
      <div class="h-8 w-16 bg-slate-200 rounded-md"></div>
      <div class="h-2.5 w-36 bg-slate-100 rounded-md"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    count?: number
  }>(),
  {
    count: 4,
  }
)
</script>
