<template>
  <div class="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-blue-500 selection:text-white">
    <!-- Fixed Navigation Sidebar (224px w-56) -->
    <AppSidebar />

    <!-- Main Content Shell with Sidebar Offset -->
    <div class="pl-56 flex flex-col min-h-screen">
      <!-- Top Context Navbar -->
      <AppNavbar
        @openWardSwitcher="showWardSwitcher = true"
        @openBreakGlass="showBreakGlass = true"
      />

      <!-- Page Content View -->
      <main class="flex-1 w-full px-14 py-8 space-y-5">
        <slot />
      </main>
    </div>

    <!-- Global Layout Modals -->
    <WardSwitcherModal
      :isOpen="showWardSwitcher"
      @close="showWardSwitcher = false"
      @switched="onWardSwitched"
    />
    <BreakGlassModal
      :isOpen="showBreakGlass"
      @close="showBreakGlass = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const showWardSwitcher = ref(false)
const showBreakGlass = ref(false)

const onWardSwitched = () => {
  showWardSwitcher.value = false
}
</script>
