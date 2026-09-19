import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useApi } from './useApi'
import { triggerGlobalRefresh } from './useAutoRefresh'

export interface Ward {
  id: string
  code: string
  name: string
  department: string
  headOfUnitId?: string | null
}

export interface User {
  id: string
  username: string
  fullName: string
  role: 'DOCTOR' | 'NURSE' | 'PARAMEDIC' | 'CLERK' | 'PHARMACIST' | 'HEAD_OF_UNIT' | 'ADMIN'
  homeWardId?: string
  homeWard?: Ward
}

const user = ref<User | null>(null)
const activeWard = ref<Ward | null>(null)
const token = ref<string | null>(null)
const shiftEnd = ref<string | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

export const useAuth = () => {
  const api = useApi()
  const router = useRouter()

  const isAuthenticated = computed(() => !!token.value && !!user.value)
  const role = computed(() => user.value?.role)

  const initSession = async () => {
    if (!import.meta.client) return
    const savedToken = localStorage.getItem('avecinna_token')
    if (!savedToken) {
      user.value = null
      activeWard.value = null
      token.value = null
      return
    }

    token.value = savedToken
    loading.value = true
    error.value = null

    try {
      const res = await api.get<{
        user: User
        activeWard: Ward
        shiftStart: string
        shiftEnd: string
      }>('/auth/me')

      user.value = res.user
      activeWard.value = res.activeWard
      shiftEnd.value = res.shiftEnd
    } catch (err: any) {
      // Session expired or invalid
      logout()
    } finally {
      loading.value = false
    }
  }

  const login = async (usernameVal: string, passwordVal: string) => {
    loading.value = true
    error.value = null

    try {
      const res = await api.post<{
        token: string
        user: User
        activeWard: Ward
        shiftEnd: string
      }>('/auth/login', {
        username: usernameVal,
        password: passwordVal,
        deviceId: typeof window !== 'undefined' ? window.navigator.userAgent.slice(0, 150) : 'workstation-default',
      })

      token.value = res.token
      user.value = res.user
      activeWard.value = res.activeWard
      shiftEnd.value = res.shiftEnd

      if (import.meta.client) {
        localStorage.setItem('avecinna_token', res.token)
      }

      // Redirect based on role default
      switch (res.user.role) {
        case 'DOCTOR':
          router.push('/doctor')
          break
        case 'HEAD_OF_UNIT':
          router.push('/unit')
          break
        case 'ADMIN':
          router.push('/admin/dashboard')
          break
        case 'CLERK':
          router.push('/clerk')
          break
        case 'PHARMACIST':
          router.push('/pharmacy/prescriptions')
          break
        case 'NURSE':
        case 'PARAMEDIC':
          router.push('/nurse')
          break
        default:
          router.push('/patients')
          break
      }

      return res
    } catch (err: any) {
      error.value = err.message || 'Authentication failed'
      throw err
    } finally {
      loading.value = false
    }
  }

  const switchWard = async (targetWardId: string) => {
    loading.value = true
    error.value = null

    try {
      const res = await api.post<{
        message: string
        previousWardId: string
        activeWard: Ward
        auditBlockHash: string
      }>('/auth/switch-ward', { targetWardId })

      activeWard.value = res.activeWard
      triggerGlobalRefresh()
      return res
    } catch (err: any) {
      error.value = err.message || 'Failed to switch working ward'
      throw err
    } finally {
      loading.value = false
    }
  }

  const logout = () => {
    token.value = null
    user.value = null
    activeWard.value = null
    shiftEnd.value = null
    if (import.meta.client) {
      localStorage.removeItem('avecinna_token')
    }
    router.push('/login')
  }

  return {
    user,
    activeWard,
    token,
    shiftEnd,
    loading,
    error,
    isAuthenticated,
    role,
    initSession,
    login,
    switchWard,
    logout,
  }
}
