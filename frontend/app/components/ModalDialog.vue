<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      @click.self="$emit('close')"
      class="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
    >
      <div
        class="bg-white rounded-2xl w-full p-8 shadow-2xl border border-slate-200 relative my-8"
        :class="maxWidthClass"
        role="dialog"
        aria-modal="true"
      >
        <!-- Modal Header -->
        <div class="flex items-start justify-between gap-4 mb-5">
          <div>
            <h3 class="font-brand text-lg font-bold text-slate-900 tracking-tight">{{ title }}</h3>
            <p v-if="description" class="font-body text-xs text-slate-500 mt-1 leading-relaxed">{{ description }}</p>
          </div>
          <button
            type="button"
            @click="$emit('close')"
            class="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
            aria-label="Close dialog"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Modal Body Content -->
        <div>
          <slot />
        </div>

        <!-- Optional Footer Actions Slot -->
        <div v-if="$slots.footer" class="mt-6 pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <slot name="footer" />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    isOpen: boolean
    title: string
    description?: string
    maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  }>(),
  {
    maxWidth: 'lg',
  }
)

defineEmits<{
  (e: 'close'): void
}>()

const maxWidthClass = computed(() => {
  switch (props.maxWidth) {
    case 'sm':
      return 'max-w-sm'
    case 'md':
      return 'max-w-md'
    case 'xl':
      return 'max-w-xl'
    case '2xl':
      return 'max-w-2xl'
    default:
      return 'max-w-lg'
  }
})
</script>
