<template>
  <div class="bg-white border border-slate-200/90 rounded-xl shadow-2xs overflow-hidden animate-pulse">
    <!-- Top Table Header / Search Bar Placeholder -->
    <div v-if="showHeader" class="p-4 border-b border-slate-100 flex items-center justify-between gap-4">
      <div class="h-4 w-48 bg-slate-200 rounded-md"></div>
      <div class="h-8 w-32 bg-slate-100 rounded-lg"></div>
    </div>

    <!-- Rows List -->
    <div class="divide-y divide-slate-100">
      <div
        v-for="r in rows"
        :key="r"
        class="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <!-- Left details with Avatar -->
        <div class="flex items-center gap-4 min-w-0 flex-1">
          <div v-if="showAvatar" class="w-12 h-12 rounded-2xl bg-slate-200 shrink-0"></div>
          <div class="space-y-2 flex-1">
            <div class="flex items-center gap-2">
              <div class="h-4 w-40 bg-slate-200 rounded-md"></div>
              <div class="h-4 w-16 bg-slate-100 rounded-full"></div>
            </div>
            <div class="flex items-center gap-3">
              <div class="h-3 w-24 bg-slate-100 rounded-md"></div>
              <div class="h-3 w-32 bg-slate-100 rounded-md"></div>
              <div class="h-3 w-20 bg-slate-100 rounded-md"></div>
            </div>
          </div>
        </div>

        <!-- Right action / badges placeholder -->
        <div class="flex items-center gap-3 shrink-0">
          <div class="h-7 w-20 bg-slate-100 rounded-lg"></div>
          <div class="h-7 w-24 bg-slate-200 rounded-lg"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    rows?: number
    showHeader?: boolean
    showAvatar?: boolean
  }>(),
  {
    rows: 5,
    showHeader: false,
    showAvatar: true,
  }
)
</script>
