<template>
  <div class="space-y-6 animate-pulse">
    <!-- Profile Header Card Skeleton -->
    <div class="bg-white border border-slate-200/90 rounded-xl p-6 sm:p-8 shadow-2xs space-y-6">
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-slate-100 gap-4">
        <div class="flex items-center gap-4">
          <div class="w-16 h-16 rounded-xl bg-slate-200 shrink-0"></div>
          <div class="space-y-2">
            <div class="flex items-center gap-3">
              <div class="h-6 w-48 bg-slate-200 rounded-md"></div>
              <div class="h-5 w-28 bg-slate-100 rounded-full"></div>
            </div>
            <div class="flex items-center gap-4">
              <div class="h-3.5 w-24 bg-slate-100 rounded-md"></div>
              <div class="h-3.5 w-20 bg-slate-100 rounded-md"></div>
              <div class="h-3.5 w-16 bg-slate-100 rounded-md"></div>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <div class="h-9 w-28 bg-slate-100 rounded-xl"></div>
          <div class="h-9 w-32 bg-slate-200 rounded-xl"></div>
        </div>
      </div>

      <!-- Quick Metrics Grid -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div v-for="i in 4" :key="i" class="p-4 rounded-xl bg-slate-50 space-y-2">
          <div class="h-3 w-16 bg-slate-200 rounded-md"></div>
          <div class="h-5 w-24 bg-slate-300 rounded-md"></div>
        </div>
      </div>
    </div>

    <!-- Vitals & Triage Observations Grid Skeleton -->
    <div class="bg-white border border-slate-200/90 rounded-xl p-6 shadow-2xs space-y-4">
      <div class="flex items-center justify-between border-b border-slate-100 pb-3">
        <div class="h-4 w-40 bg-slate-200 rounded-md"></div>
        <div class="h-4 w-24 bg-slate-100 rounded-md"></div>
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div v-for="i in 6" :key="i" class="p-3.5 rounded-xl border border-slate-100 bg-slate-50 space-y-2 text-center">
          <div class="h-3 w-12 bg-slate-200 rounded-md mx-auto"></div>
          <div class="h-6 w-16 bg-slate-300 rounded-md mx-auto"></div>
        </div>
      </div>
    </div>

    <!-- Split Cards Skeleton (Clinical Notes vs Medications & Care Plan) -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2 bg-white border border-slate-200/90 rounded-xl p-6 shadow-2xs space-y-4">
        <div class="h-4 w-36 bg-slate-200 rounded-md"></div>
        <div class="space-y-3">
          <div class="p-4 rounded-xl bg-slate-50 space-y-2">
            <div class="h-3 w-28 bg-slate-200 rounded-md"></div>
            <div class="h-16 w-full bg-slate-100 rounded-md"></div>
          </div>
          <div class="p-4 rounded-xl bg-slate-50 space-y-2">
            <div class="h-3 w-28 bg-slate-200 rounded-md"></div>
            <div class="h-16 w-full bg-slate-100 rounded-md"></div>
          </div>
        </div>
      </div>

      <div class="bg-white border border-slate-200/90 rounded-xl p-6 shadow-2xs space-y-4">
        <div class="h-4 w-32 bg-slate-200 rounded-md"></div>
        <div class="space-y-2">
          <div v-for="i in 3" :key="i" class="p-3 rounded-lg bg-slate-50 flex items-center justify-between">
            <div class="space-y-1">
              <div class="h-3.5 w-24 bg-slate-200 rounded-md"></div>
              <div class="h-2.5 w-16 bg-slate-100 rounded-md"></div>
            </div>
            <div class="h-5 w-12 bg-slate-200 rounded-full"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
