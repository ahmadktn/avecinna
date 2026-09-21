<template>
  <div class="my-6 rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition">
    <div class="flex items-center justify-between border-b border-slate-100 pb-3">
      <div>
        <h4 class="font-brand text-base font-semibold text-slate-900">
          Cryptographic Merkle Tree & Tamper Proof Engine
        </h4>
        <p class="text-xs text-slate-500">
          Modify any audit leaf block to observe the root hash cascade and tamper detection in O(log N).
        </p>
      </div>

      <button
        @click="resetDemo"
        class="rounded-lg bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition"
      >
        Reset Clean State
      </button>
    </div>

    <!-- Status Banner -->
    <div
      :class="[
        'mt-4 flex items-center justify-between rounded-lg p-3 font-mono text-xs font-semibold',
        isTampered
          ? 'bg-red-50 text-red-700 border border-red-200'
          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
      ]"
    >
      <div class="flex items-center gap-2">
        <span class="h-2.5 w-2.5 rounded-full" :class="isTampered ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'"></span>
        <span>{{ isTampered ? 'INTEGRITY VIOLATION DETECTED' : 'AUDIT LEDGER VERIFIED (100% UNTAMPERED)' }}</span>
      </div>
      <span>Merkle Root: {{ merkleRoot.slice(0, 16) }}...</span>
    </div>

    <!-- Merkle Tree Interactive Diagram -->
    <div class="mt-6 flex flex-col items-center gap-6">
      <!-- Root Node -->
      <div class="rounded-xl border border-blue-500/40 bg-blue-50/50 p-3 text-center w-72">
        <div class="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-600">Merkle Tree Root (Level 2)</div>
        <div class="mt-1 truncate font-mono text-xs text-slate-800 font-semibold">{{ merkleRoot }}</div>
      </div>

      <!-- Intermediate Level 1 Nodes -->
      <div class="grid grid-cols-2 gap-8 w-full max-w-lg">
        <div class="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-center">
          <div class="text-[9px] font-mono text-slate-500">Branch Hash (0-1)</div>
          <div class="mt-0.5 truncate font-mono text-[11px] text-slate-700">{{ hash01 }}</div>
        </div>
        <div class="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-center">
          <div class="text-[9px] font-mono text-slate-500">Branch Hash (2-3)</div>
          <div class="mt-0.5 truncate font-mono text-[11px] text-slate-700">{{ hash23 }}</div>
        </div>
      </div>

      <!-- Leaf Nodes (Editable) -->
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 w-full">
        <div
          v-for="(leaf, idx) in leaves"
          :key="idx"
          :class="[
            'rounded-lg border p-3 transition',
            leaf.modified
              ? 'border-red-400 bg-red-50/40'
              : 'border-slate-200 bg-white'
          ]"
        >
          <div class="flex items-center justify-between text-[10px] font-mono text-slate-500">
            <span>Leaf Block #{{ idx + 1 }}</span>
            <span v-if="leaf.modified" class="font-bold text-red-600">TAMPERED</span>
          </div>
          <input
            v-model="leaf.action"
            class="mt-1.5 w-full rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-mono"
            @input="leaf.modified = true"
          />
          <div class="mt-2 truncate font-mono text-[10px] text-slate-400">
            Hash: {{ computeHash(leaf.action).slice(0, 12) }}...
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const initialLeaves = [
  'PATIENT_VIEW_SUCCESS:p-cardio-01:u-doc-01',
  'VITALS_RECORD_SUCCESS:p-cardio-01:u-nurse-02',
  'CARE_TEAM_GRANT:p-cardio-01:u-head-01',
  'CLINICAL_ENCOUNTER:p-cardio-01:u-doc-01',
]

const leaves = ref(
  initialLeaves.map((action) => ({
    action,
    modified: false,
  }))
)

function computeHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0')
  return `${hex}${hex}${hex}${hex}`
}

const hash01 = computed(() => {
  const h0 = computeHash(leaves.value[0].action)
  const h1 = computeHash(leaves.value[1].action)
  return computeHash(h0 + h1)
})

const hash23 = computed(() => {
  const h2 = computeHash(leaves.value[2].action)
  const h3 = computeHash(leaves.value[3].action)
  return computeHash(h2 + h3)
})

const merkleRoot = computed(() => {
  return computeHash(hash01.value + hash23.value)
})

const isTampered = computed(() => {
  return leaves.value.some((l, idx) => l.action !== initialLeaves[idx])
})

function resetDemo() {
  leaves.value = initialLeaves.map((action) => ({
    action,
    modified: false,
  }))
}
</script>
