<template>
  <div class="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-blue-500 selection:text-white">
    <!-- Mobile Backdrop Overlay -->
    <Transition
      enter-active-class="transition-opacity duration-300 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isMobileSidebarOpen"
        @click="isMobileSidebarOpen = false"
        class="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs lg:hidden"
        aria-hidden="true"
      />
    </Transition>

    <!-- Fixed Navigation Sidebar: Drawer on mobile (< lg), fixed on desktop (lg:) -->
    <AppSidebar
      :isMobileOpen="isMobileSidebarOpen"
      @close="isMobileSidebarOpen = false"
    />

    <!-- Main Content Shell with Responsive Sidebar Offset -->
    <div class="lg:pl-64 flex flex-col min-h-screen">
      <!-- Top Context Navbar -->
      <AppNavbar
        @toggleSidebar="isMobileSidebarOpen = !isMobileSidebarOpen"
        @openWardSwitcher="showWardSwitcher = true"
        @openBreakGlass="showBreakGlass = true"
      />

      <!-- Page Content View -->
      <main class="flex-1 w-full px-4 sm:px-6 md:px-8 lg:px-12 py-5 sm:py-6 lg:py-8 space-y-5">
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

const isMobileSidebarOpen = ref(false)
const showWardSwitcher = ref(false)
const showBreakGlass = ref(false)

const onWardSwitched = () => {
  showWardSwitcher.value = false
}
</script>
