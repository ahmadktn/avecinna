<template>
  <div class="docs-prose">
    <div v-if="page">
      <ContentRenderer :value="page" />
    </div>
    <div v-else class="py-16 text-center">
      <h2 class="font-brand text-xl font-bold text-slate-900">Page Not Found</h2>
      <p class="mt-2 text-sm text-slate-500">The requested documentation page could not be located.</p>
      <NuxtLink to="/" class="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700">
        Back to Documentation Home
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()

const { data: page } = await useAsyncData(route.path, () => {
  return queryCollection('content').path(route.path).first()
})

useHead({
  title: page.value?.title ? `${page.value.title} — Avecinna Docs` : 'Avecinna Docs',
  meta: [
    {
      name: 'description',
      content: page.value?.description || 'Context-Aware Secure Electronic Medical Records (EMR) Documentation',
    },
  ],
})
</script>
