<template>
  <div class="min-h-screen bg-slate-950 flex items-center justify-center text-white text-xs">
    <div class="flex items-center gap-3">
      <div class="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      <span>Loading Avecinna EMR...</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '~/composables/useAuth'

const auth = useAuth()
const router = useRouter()

onMounted(async () => {
  await auth.initSession()
  if (!auth.isAuthenticated.value) {
    router.push('/login')
    return
  }

  switch (auth.role.value) {
    case 'ADMIN':
      router.push('/admin/dashboard')
      break
    case 'CLERK':
      router.push('/clerk/register')
      break
    case 'PHARMACIST':
      router.push('/pharmacy/prescriptions')
      break
    default:
      router.push('/patients')
      break
  }
})
</script>
