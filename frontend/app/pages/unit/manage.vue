<template>
  <div class="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
    <div class="text-center space-y-2">
      <div class="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
      <p class="text-xs text-slate-500 font-medium">Redirecting to Unit Overview...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

onMounted(() => {
  router.replace('/unit')
})
</script>
