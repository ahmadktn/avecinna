import { ref } from 'vue'
import { useApi } from './useApi'

export interface AuditVerificationResult {
  valid: boolean
  totalBlocks: number
  merkleRoot: string
  brokenBlockId: string | null
  message: string
}

export interface SecurityAlert {
  id: string
  alertType: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  userId?: string | null
  patientId?: string | null
  description: string
  rawMetadataJson?: any
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'FALSE_POSITIVE'
  createdAt: string
}

export const useAudit = () => {
  const api = useApi()
  const verificationResult = ref<AuditVerificationResult | null>(null)
  const alerts = ref<SecurityAlert[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const verifyAuditLedger = async () => {
    loading.value = true
    error.value = null
    try {
      const res = await api.post<AuditVerificationResult>('/audit/verify')
      verificationResult.value = res
      return res
    } catch (err: any) {
      error.value = err.message || 'Audit ledger verification failed'
      throw err
    } finally {
      loading.value = false
    }
  }

  const fetchSecurityAlerts = async () => {
    loading.value = true
    error.value = null
    try {
      const res = await api.get<{ alerts: SecurityAlert[] }>('/security/alerts')
      alerts.value = res.alerts
      return res.alerts
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch security alerts'
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateAlertStatus = async (id: string, status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'FALSE_POSITIVE') => {
    loading.value = true
    error.value = null
    try {
      const res = await api.patch<{ message: string; alert: SecurityAlert }>(`/security/alerts/${id}`, { status })
      await fetchSecurityAlerts()
      return res.alert
    } catch (err: any) {
      error.value = err.message || 'Failed to update alert status'
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    verificationResult,
    alerts,
    loading,
    error,
    verifyAuditLedger,
    fetchSecurityAlerts,
    updateAlertStatus,
  }
}
