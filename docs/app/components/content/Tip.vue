<template>
  <div class="my-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-xs text-blue-900 leading-relaxed flex items-start gap-3">
    <Icon :name="icon || 'lucide:lightbulb'" class="h-4 w-4 shrink-0 mt-0.5 text-blue-600" />
    <div class="flex-1">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  icon?: string
}>()
</script>
