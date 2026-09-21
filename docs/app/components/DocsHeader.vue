<template>
  <header class="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/90 backdrop-blur-md">
    <div class="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
      <!-- Logo & Brand -->
      <div class="flex items-center gap-6">
        <NuxtLink to="/" class="flex items-center gap-3 transition hover:opacity-90">
          <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white shadow-xs">
            <Icon name="lucide:shield-check" class="h-5 w-5" />
          </div>
          <div>
            <span class="font-brand text-lg font-bold tracking-tight text-slate-900">Avecinna</span>
            <span class="ml-2 rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">DOCS</span>
          </div>
        </NuxtLink>

        <!-- Main Nav Links -->
        <nav class="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          <NuxtLink to="/getting-started" class="transition hover:text-slate-900" active-class="text-blue-600 font-semibold">
            Getting Started
          </NuxtLink>
          <NuxtLink to="/core-security-engine/caac-authorization" class="transition hover:text-slate-900" active-class="text-blue-600 font-semibold">
            Security Engine
          </NuxtLink>
          <NuxtLink to="/cryptographic-audit-ledger/isolated-audit-db" class="transition hover:text-slate-900" active-class="text-blue-600 font-semibold">
            Merkle Audit
          </NuxtLink>
          <NuxtLink to="/operational-modes/mode-a-standalone-emr" class="transition hover:text-slate-900" active-class="text-blue-600 font-semibold">
            Modes & SDK
          </NuxtLink>
          <NuxtLink to="/api-reference/authentication-and-session" class="transition hover:text-slate-900" active-class="text-blue-600 font-semibold">
            API Reference
          </NuxtLink>
        </nav>
      </div>

      <!-- Action Items & Search -->
      <div class="flex items-center gap-3">
        <!-- Quick Search Placeholder -->
        <div class="relative hidden sm:block w-48 lg:w-64">
          <Icon name="lucide:search" class="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            v-model="searchQuery"
            placeholder="Search docs (e.g. CAAC)..."
            @keyup.enter="handleSearch"
            class="w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none transition"
          />
        </div>

        <!-- GitHub Repo Link -->
        <a
          href="https://github.com/vitalsdeck/avecinna"
          target="_blank"
          rel="noopener noreferrer"
          class="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
        >
          <Icon name="lucide:github" class="h-4 w-4" />
          <span class="hidden sm:inline">GitHub</span>
        </a>

        <!-- Mobile Menu Toggle Button -->
        <button
          @click="isMobileMenuOpen = !isMobileMenuOpen"
          class="rounded-lg p-2 text-slate-500 hover:bg-slate-100 md:hidden"
        >
          <Icon :name="isMobileMenuOpen ? 'lucide:x' : 'lucide:menu'" class="h-5 w-5" />
        </button>
      </div>
    </div>

    <!-- Mobile Navigation Drawer -->
    <div v-if="isMobileMenuOpen" class="border-t border-slate-200 bg-white px-4 py-3 md:hidden">
      <nav class="flex flex-col gap-2 text-sm font-medium text-slate-700">
        <NuxtLink to="/getting-started" class="py-1" @click="isMobileMenuOpen = false">Getting Started</NuxtLink>
        <NuxtLink to="/core-security-engine/caac-authorization" class="py-1" @click="isMobileMenuOpen = false">CAAC Security Engine</NuxtLink>
        <NuxtLink to="/cryptographic-audit-ledger/isolated-audit-db" class="py-1" @click="isMobileMenuOpen = false">Merkle Audit Ledger</NuxtLink>
        <NuxtLink to="/operational-modes/mode-a-standalone-emr" class="py-1" @click="isMobileMenuOpen = false">Operational Modes</NuxtLink>
        <NuxtLink to="/api-reference/authentication-and-session" class="py-1" @click="isMobileMenuOpen = false">API Reference</NuxtLink>
        <NuxtLink to="/compliance-and-governance/hipaa-security-matrix" class="py-1" @click="isMobileMenuOpen = false">HIPAA Matrix</NuxtLink>
      </nav>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const searchQuery = ref('')
const isMobileMenuOpen = ref(false)

function handleSearch() {
  if (!searchQuery.value.trim()) return
  const q = searchQuery.value.toLowerCase()
  if (q.includes('caac') || q.includes('permit') || q.includes('formula')) {
    router.push('/core-security-engine/caac-authorization')
  } else if (q.includes('dto') || q.includes('mask') || q.includes('redact')) {
    router.push('/core-security-engine/dto-masking')
  } else if (q.includes('audit') || q.includes('merkle') || q.includes('chain')) {
    router.push('/cryptographic-audit-ledger/isolated-audit-db')
  } else if (q.includes('sdk') || q.includes('mode c')) {
    router.push('/operational-modes/mode-c-embedded-sdk')
  } else if (q.includes('proxy') || q.includes('mode b') || q.includes('openmrs')) {
    router.push('/operational-modes/mode-b-reverse-proxy')
  } else if (q.includes('api') || q.includes('endpoint')) {
    router.push('/api-reference/authentication-and-session')
  } else {
    router.push('/getting-started/quick-start')
  }
}
</script>
