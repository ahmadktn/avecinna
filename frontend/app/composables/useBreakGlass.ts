import { ref } from 'vue'
import { useApi } from './useApi'
import type { Patient } from './usePatients'

export interface Tier1BreakGlassResponse {
  tier: string
  message: string
  emergencySummary: Partial<Patient>
  auditBlockHash: string
}

export interface Tier2BreakGlassResponse {
  tier: string
  message: string
  patientRecord: Partial<Patient>
  alertId: string
  auditBlockHash: string
}

export const useBreakGlass = () => {
  const api = useApi()
  const loading = ref(false)
  const error = ref<string | null>(null)

  const triggerTier1 = async (patientId: string): Promise<Tier1BreakGlassResponse> => {
    loading.value = true
    error.value = null
    try {
      const res = await api.post<Tier1BreakGlassResponse>(`/patients/${patientId}/break-glass/tier1`)
      return res
    } catch (err: any) {
      error.value = err.message || 'Tier 1 Break-Glass request failed'
      throw err
    } finally {
      loading.value = false
    }
  }

  const triggerTier2 = async (patientId: string, justificationReason: string): Promise<Tier2BreakGlassResponse> => {
    if (!justificationReason || justificationReason.trim().length < 10) {
      const msg = 'Tier 2 Break-Glass requires a justification reason of at least 10 characters.'
      error.value = msg
      throw new Error(msg)
    }

    loading.value = true
    error.value = null
    try {
      const res = await api.post<Tier2BreakGlassResponse>(`/patients/${patientId}/break-glass/tier2`, {
        justificationReason,
      })
      return res
    } catch (err: any) {
      error.value = err.message || 'Tier 2 Break-Glass request failed'
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    triggerTier1,
    triggerTier2,
  }
}
