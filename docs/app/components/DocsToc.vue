<template>
  <aside class="hidden xl:block w-60 shrink-0 py-6 pl-4 pr-6 overflow-y-auto">
    <div class="sticky top-24">
      <h5 class="flex items-center gap-2 font-brand text-xs font-bold uppercase tracking-wider text-slate-400">
        <Icon name="lucide:align-left" class="h-3.5 w-3.5 text-slate-400" />
        On This Page
      </h5>
      <ul class="mt-3 space-y-2 text-xs text-slate-600">
        <li v-for="link in tocLinks" :key="link.id">
          <a
            :href="`#${link.id}`"
            class="block truncate hover:text-blue-600 transition"
            :class="link.depth === 3 ? 'pl-3 text-slate-500' : 'font-medium'"
          >
            {{ link.text }}
          </a>
        </li>
      </ul>

      <!-- Community / Help Card -->
      <div class="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
        <h6 class="font-brand text-xs font-semibold text-slate-900">Need Help or Audit Proof?</h6>
        <p class="mt-1 text-[11px] text-slate-500 leading-relaxed">
          Inspect cryptographic inclusion proofs on the live admin workstation.
        </p>
        <a
          href="https://avecinna.vitalsdeck.com.ng/admin/audit"
          target="_blank"
          class="mt-2.5 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
        >
          Open Audit Explorer
          <Icon name="lucide:arrow-up-right" class="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const tocLinks = ref<{ id: string; text: string; depth: number }[]>([])

function extractHeadings() {
  if (typeof document === 'undefined') return
  const headings = Array.from(document.querySelectorAll('.docs-prose h2, .docs-prose h3'))
  tocLinks.value = headings.map((h) => {
    let id = h.id
    if (!id) {
      id = (h.textContent || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
      h.id = id
    }
    return {
      id,
      text: h.textContent || '',
      depth: h.tagName === 'H2' ? 2 : 3,
    }
  })
}

onMounted(() => {
  setTimeout(extractHeadings, 300)
})

watch(() => route.path, () => {
  setTimeout(extractHeadings, 300)
})
</script>
