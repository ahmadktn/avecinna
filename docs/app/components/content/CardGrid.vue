<template>
  <div class="my-6">
    <div v-if="$slots.title" class="mb-3 font-brand text-sm font-semibold text-slate-900">
      <slot name="title" />
    </div>
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <slot name="root" />
      <slot />
    </div>
  </div>
</template>
