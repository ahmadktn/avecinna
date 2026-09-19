<template>
  <span
    class="inline-flex items-center justify-center font-medium rounded-full px-2.5 py-0.5 text-xs transition-colors"
    :class="badgeStyle"
  >
    {{ text }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  type?: 'stable' | 'monitoring' | 'critical' | 'active' | 'suspended' | 'assigned' | 'breakglass' | 'flagged' | string
  label?: string
}>()

const text = computed(() => {
  if (props.label) return props.label
  switch (props.type?.toLowerCase()) {
    case 'stable':
      return 'Stable'
    case 'monitoring':
      return 'Monitoring'
    case 'critical':
      return 'Critical'
    case 'active':
      return 'Active'
    case 'suspended':
      return 'Suspended'
    case 'assigned':
      return 'Assigned ward'
    case 'breakglass':
      return 'Break Glass access'
    case 'flagged':
      return 'Flagged'
    default:
      return props.type || 'Normal'
  }
})

const badgeStyle = computed(() => {
  switch (props.type?.toLowerCase()) {
    case 'stable':
    case 'active':
    case 'assigned':
      return 'bg-emerald-100 text-emerald-800'
    case 'monitoring':
    case 'breakglass':
      return 'bg-amber-100 text-amber-800'
    case 'critical':
    case 'flagged':
      return 'bg-red-100 text-red-800'
    case 'suspended':
      return 'bg-slate-100 text-slate-600'
    default:
      return 'bg-slate-100 text-slate-700'
  }
})
</script>
