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

export interface AuditBlock {
  indexNum: number
  blockHash: string
  prevHash: string
  userId: string
  patientId?: string | null
  action: string
  activeWard: string
  relationshipType?: string | null
  payloadHash: string
  merkleRoot?: string | null
  signature?: string | null
  isOfflineSync: boolean
  createdAt: string
}

export interface MerkleNode {
  id: string
  hash: string
  shortHash: string
  level: number
  label: string
  isLeaf: boolean
  blockIndex?: number
  action?: string
  actor?: string
  patientId?: string | null
  activeWard?: string
  payloadHash?: string
  prevHash?: string
  timestamp?: string
  children?: string[]
  parentId?: string
}

export interface MerkleTreeHierarchy {
  root: string
  totalLeaves: number
  levels: MerkleNode[][]
  nodes: Record<string, MerkleNode>
}

export interface AuditLedgerAnalytics {
  verification: {
    valid: boolean
    status: string
    totalBlocks: number
    merkleRoot: string
    brokenBlockId: string | null
  }
  metrics: {
    totalBlocks: number
    flaggedCount: number
    uniqueUsersCount: number
    uniqueWardsCount: number
  }
  actionDistribution: Record<string, number>
  wardDistribution: Record<string, number>
  topActors: Array<{ userId: string; count: number }>
  timeline: Array<{ date: string; count: number }>
  flaggedEvents: Array<{
    blockIndex: number
    blockHash: string
    prevHash: string
    userId: string
    patientId?: string | null
    action: string
    activeWard: string
    payloadHash: string
    createdAt: string
    flags: string[]
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  }>
}

export const useAudit = () => {
  const api = useApi()
  const verificationResult = ref<AuditVerificationResult | null>(null)
  const alerts = ref<SecurityAlert[]>([])
  const blocks = ref<AuditBlock[]>([])
  const analytics = ref<AuditLedgerAnalytics | null>(null)
  const merkleTree = ref<MerkleTreeHierarchy | null>(null)
  const pagination = ref({ page: 1, limit: 20, total: 0, totalPages: 1 })
  const loading = ref(false)
  const error = ref<string | null>(null)

  const verifyAuditLedger = async () => {
    loading.value = true
    error.value = null
    try {
      const res = await api.post<AuditVerificationResult>('/audit/verify', {})
      verificationResult.value = res
      return res
    } catch (err: any) {
      error.value = err.message || 'Audit ledger verification failed'
      throw err
    } finally {
      loading.value = false
    }
  }

  const fetchAuditBlocks = async (params?: { page?: number; limit?: number; search?: string; action?: string; ward?: string }) => {
    loading.value = true
    error.value = null
    try {
      const q = new URLSearchParams()
      if (params?.page) q.append('page', String(params.page))
      if (params?.limit) q.append('limit', String(params.limit))
      if (params?.search) q.append('search', params.search)
      if (params?.action && params.action !== 'ALL') q.append('action', params.action)
      if (params?.ward && params.ward !== 'ALL') q.append('ward', params.ward)

      const endpoint = `/audit/blocks?${q.toString()}`
      const res = await api.get<{ blocks: AuditBlock[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>(endpoint)
      blocks.value = res.blocks
      pagination.value = res.pagination
      return res
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch audit ledger blocks'
      throw err
    } finally {
      loading.value = false
    }
  }

  const fetchAuditAnalytics = async () => {
    loading.value = true
    error.value = null
    try {
      const res = await api.get<AuditLedgerAnalytics>('/audit/analytics')
      analytics.value = res
      return res
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch audit ledger analytics'
      throw err
    } finally {
      loading.value = false
    }
  }

  const fetchMerkleTree = async () => {
    loading.value = true
    error.value = null
    try {
      const res = await api.get<MerkleTreeHierarchy>('/audit/merkle-tree')
      merkleTree.value = res
      return res
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch Merkle tree hierarchy'
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
    blocks,
    analytics,
    merkleTree,
    pagination,
    loading,
    error,
    verifyAuditLedger,
    fetchAuditBlocks,
    fetchAuditAnalytics,
    fetchMerkleTree,
    fetchSecurityAlerts,
    updateAlertStatus,
  }
}

