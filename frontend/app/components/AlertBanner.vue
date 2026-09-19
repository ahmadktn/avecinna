<template>
  <div
    v-if="message"
    class="p-4 rounded-xl text-xs flex items-center justify-between shadow-2xs"
    :class="alertClasses"
  >
    <div class="flex items-center gap-2.5 min-w-0">
      <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <!-- Error icon -->
        <path v-if="resolvedType === 'error'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        <!-- Success icon -->
        <path v-else-if="resolvedType === 'success'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        <!-- Info/Warning icon -->
        <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span class="truncate font-medium">{{ message }}</span>
    </div>

    <div class="flex items-center gap-3 shrink-0 ml-3">
      <slot name="actions" />
      <button
        v-if="dismissible"
        type="button"
        @click="$emit('dismiss')"
        class="font-bold underline cursor-pointer hover:opacity-80"
      >
        Dismiss
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    type?: 'error' | 'success' | 'warning' | 'info'
    variant?: 'error' | 'success' | 'warning' | 'info'
    message: string | null
    dismissible?: boolean
  }>(),
  {
    dismissible: true,
  }
)

defineEmits<{
  (e: 'dismiss'): void
}>()

const resolvedType = computed(() => props.variant || props.type || 'error')

const alertClasses = computed(() => {
  switch (resolvedType.value) {
    case 'success':
      return 'bg-emerald-50 border border-emerald-200 text-emerald-800'
    case 'warning':
      return 'bg-amber-50 border border-amber-200 text-amber-800'
    case 'info':
      return 'bg-blue-50 border border-blue-200 text-blue-800'
    default:
      return 'bg-red-50 border border-red-200 text-red-700'
  }
})
</script>
