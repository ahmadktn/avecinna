<template>
  <div class="my-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs flex items-center justify-between">
    <div class="flex items-center gap-2 text-slate-700">
      <Icon name="lucide:book-open" class="h-4 w-4 text-blue-600" />
      <slot />
    </div>
    <a
      v-if="to"
      :href="to"
      :target="target || '_self'"
      class="inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-700 transition"
    >
      Read more
      <Icon name="lucide:arrow-right" class="h-3.5 w-3.5" />
    </a>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  to?: string
  target?: string
}>()
</script>
