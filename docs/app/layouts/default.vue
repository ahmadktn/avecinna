<template>
  <div class="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
    <!-- Header -->
    <DocsHeader />

    <!-- Main 3-Column Layout Container -->
    <div class="mx-auto flex w-full max-w-7xl flex-1 px-4 sm:px-6 lg:px-8">
      <!-- Left Navigation Sidebar -->
      <DocsSidebar class="hidden lg:block" />

      <!-- Center Main Content -->
      <main class="flex-1 min-w-0 py-8 px-4 sm:px-8 lg:px-12 bg-white border-r border-slate-200 shadow-xs">
        <slot />
      </main>

      <!-- Right Table of Contents -->
      <DocsToc />
    </div>

    <!-- Footer -->
    <DocsFooter />
  </div>
</template>
