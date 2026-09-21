<template>
  <span
    :class="[
      'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide mr-1.5 mb-1.5',
      badgeClasses
    ]"
  >
    <slot />
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    type?: 'info' | 'success' | 'warning' | 'danger'
  }>(),
  {
    type: 'info',
  }
)

const badgeClasses = computed(() => {
  switch (props.type) {
    case 'success':
      return 'bg-emerald-50 text-emerald-700 border border-emerald-200'
    case 'warning':
      return 'bg-amber-50 text-amber-700 border border-amber-200'
    case 'danger':
      return 'bg-red-50 text-red-700 border border-red-200'
    default:
      return 'bg-blue-50 text-blue-700 border border-blue-200'
  }
})
</script>
