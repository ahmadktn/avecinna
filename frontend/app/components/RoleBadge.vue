<template>
  <span
    class="inline-flex items-center justify-center font-medium rounded-full px-2.5 py-0.5 text-xs transition-colors"
    :class="badgeClass"
  >
    {{ label }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  role?: string | null
}>()

const label = computed(() => {
  switch (props.role) {
    case 'DOCTOR':
      return 'Doctor'
    case 'NURSE':
      return 'Nurse'
    case 'PARAMEDIC':
      return 'Paramedic'
    case 'CLERK':
      return 'Clerk'
    case 'PHARMACIST':
      return 'Pharmacist'
    case 'HEAD_OF_UNIT':
      return 'Head of Unit'
    case 'ADMIN':
      return 'Admin'
    default:
      return props.role || 'Staff'
  }
})

const badgeClass = computed(() => {
  switch (props.role) {
    case 'DOCTOR':
      return 'bg-blue-50 text-blue-700 border border-blue-200/60'
    case 'HEAD_OF_UNIT':
      return 'bg-purple-50 text-purple-700 border border-purple-200/60'
    case 'ADMIN':
      return 'bg-slate-900 text-white font-semibold'
    case 'PHARMACIST':
      return 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
    case 'NURSE':
    case 'PARAMEDIC':
    case 'CLERK':
    default:
      return 'bg-slate-100 text-slate-700 border border-slate-200/60'
  }
})
</script>
