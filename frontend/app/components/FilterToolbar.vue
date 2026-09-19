<template>
  <div class="bg-white border border-slate-200/90 rounded-xl p-4 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
    <!-- Search Bar -->
    <div v-if="searchable" class="relative w-full md:w-80">
      <svg class="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        :value="modelValue"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        type="text"
        :placeholder="placeholder || 'Search records...'"
        class="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 transition-colors"
      />
    </div>

    <!-- Filters & Tabs Slot -->
    <div class="flex items-center gap-3 w-full md:w-auto justify-end flex-wrap">
      <slot name="filters" />

      <!-- Count Badge -->
      <span v-if="countLabel" class="bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold px-3 py-1.5 rounded-xl shrink-0">
        {{ countLabel }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    modelValue?: string
    searchable?: boolean
    placeholder?: string
    countLabel?: string
  }>(),
  {
    searchable: true,
  }
)

defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()
</script>
