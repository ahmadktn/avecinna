<template>
  <div
    :class="[
      'my-4 rounded-xl border p-4 text-xs leading-relaxed flex items-start gap-3',
      typeClasses
    ]"
  >
    <Icon :name="iconName" class="h-4 w-4 shrink-0 mt-0.5" />
    <div class="flex-1">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    type?: 'info' | 'success' | 'warning' | 'danger'
    icon?: string
  }>(),
  {
    type: 'info',
  }
)

const typeClasses = computed(() => {
  switch (props.type) {
    case 'success':
      return 'border-emerald-200 bg-emerald-50 text-emerald-900'
    case 'warning':
      return 'border-amber-200 bg-amber-50 text-amber-900'
    case 'danger':
      return 'border-red-200 bg-red-50 text-red-900'
    default:
      return 'border-blue-200 bg-blue-50 text-blue-900'
  }
})

const iconName = computed(() => {
  if (props.icon) return props.icon
  switch (props.type) {
    case 'success':
      return 'lucide:check-circle-2'
    case 'warning':
      return 'lucide:alert-triangle'
    case 'danger':
      return 'lucide:shield-alert'
    default:
      return 'lucide:info'
  }
})
</script>
