import { ref, computed } from 'vue'
import { useAuth } from './useAuth'
import {
  deriveSessionKey,
  encryptData,
  decryptData,
  computeClientSha256,
} from '../utils/offlineCrypto'
import {
  putCachedPatient,
  getCachedPatient,
  getCachedPatientsByWard,
  getAllCachedPatients,
  enqueueAuditBlock,
  getPendingAuditBlocks,
  markAuditBlocksSynced,
  enqueueMutation,
  getPendingMutations,
  updateMutationStatus,
  type QueuedAuditBlock,
} from '../utils/offlineDatabase'

const isOnline = ref(typeof window !== 'undefined' ? window.navigator.onLine : true)
const isSyncing = ref(false)
const pendingAuditCount = ref(0)
const lastKnownTailHash = ref<string>('0000000000000000000000000000000000000000000000000000000000000000')

let cachedKey: CryptoKey | null = null
let cachedKeySecret = ''

export const useOfflineStorage = () => {
  const auth = useAuth()
  const config = useRuntimeConfig()
  const baseURL = config.public?.apiBaseUrl || 'http://localhost:4000/api/v1'

  // Ensure network listeners are active on client
  if (import.meta.client && typeof window !== 'undefined') {
    window.addEventListener('online', () => {
      isOnline.value = true
      refreshPendingCounts()
      triggerBackgroundSync()
    })
    window.addEventListener('offline', () => {
      isOnline.value = false
    })

    // Load last known online hash from local storage if available
    const savedTail = localStorage.getItem('avecinna_latest_audit_hash')
    if (savedTail) {
      lastKnownTailHash.value = savedTail
    }
  }

  const getEncryptionKey = async (): Promise<CryptoKey> => {
    const token = auth.token.value || (import.meta.client ? localStorage.getItem('avecinna_token') : null)
    const user = auth.user.value

    if (!token) {
      throw new Error('Authentication session token is required to derive offline encryption key.')
    }

    const salt = user ? `${user.id}:${user.homeWard?.id || 'default-ward'}` : 'avecinna-hospital-salt'
    const secretKeyIdentifier = `${token}:${salt}`

    if (cachedKey && cachedKeySecret === secretKeyIdentifier) {
      return cachedKey
    }

    cachedKey = await deriveSessionKey(token, salt)
    cachedKeySecret = secretKeyIdentifier
    return cachedKey
  }

  const refreshPendingCounts = async () => {
    if (!import.meta.client) return
    try {
      const pendingBlocks = await getPendingAuditBlocks()
      pendingAuditCount.value = pendingBlocks.length
    } catch {
      pendingAuditCount.value = 0
    }
  }

  // -------------------------------------------------------------
  // Encrypted Patient Caching (AES-GCM-256)
  // -------------------------------------------------------------

  const cachePatient = async (patient: any): Promise<void> => {
    if (!import.meta.client || !patient || !patient.id) return

    const key = await getEncryptionKey()
    const encrypted = await encryptData(patient, key)
    const recordHash = await computeClientSha256(patient)

    await putCachedPatient({
      patientId: patient.id,
      wardId: patient.primaryWardId || 'UNKNOWN',
      roleScope: auth.role.value || 'GUEST',
      encryptedData: encrypted.ciphertext,
      iv: encrypted.iv,
      recordHash,
      cachedAt: new Date().toISOString(),
    })
  }

  const getDecryptedPatient = async (patientId: string): Promise<any | null> => {
    if (!import.meta.client) return null

    const cached = await getCachedPatient(patientId)
    if (!cached) return null

    const key = await getEncryptionKey()
    const decrypted = await decryptData<any>(
      {
        ciphertext: cached.encryptedData,
        iv: cached.iv,
        algorithm: 'AES-GCM-256',
        encryptedAt: cached.cachedAt,
      },
      key
    )

    // Verify record hash integrity
    const computedHash = await computeClientSha256(decrypted)
    if (computedHash !== cached.recordHash) {
      throw new Error(`Data integrity violation: cached patient ${patientId} failed SHA-256 verification.`)
    }

    return decrypted
  }

  const getDecryptedWardPatients = async (wardId: string): Promise<any[]> => {
    if (!import.meta.client) return []

    const cachedList = await getCachedPatientsByWard(wardId)
    const key = await getEncryptionKey()
    const decryptedList: any[] = []

    for (const item of cachedList) {
      try {
        const p = await decryptData<any>(
          {
            ciphertext: item.encryptedData,
            iv: item.iv,
            algorithm: 'AES-GCM-256',
            encryptedAt: item.cachedAt,
          },
          key
        )
        decryptedList.push(p)
      } catch (err: any) {
        console.error(`Failed to decrypt cached patient ${item.patientId}:`, err)
      }
    }

    return decryptedList
  }

  // -------------------------------------------------------------
  // Offline Audit Block Creation & Chaining
  // -------------------------------------------------------------

  const recordOfflineAuditAction = async (input: {
    action: string
    patientId?: string
    payload: any
    activeWard?: string
  }): Promise<QueuedAuditBlock> => {
    const user = auth.user.value
    const userId = user?.id || 'UNKNOWN_OFFLINE_USER'
    const ward = input.activeWard || auth.activeWard.value?.id || 'OFFLINE_WARD'
    const timestamp = new Date().toISOString()

    const payloadHash = await computeClientSha256(input.payload || {})

    // Sequential chain link: prevHash is either last queued block or last known online head
    const pending = await getPendingAuditBlocks()
    const prevHash = pending.length > 0 ? pending[pending.length - 1].blockHash : lastKnownTailHash.value

    const rawString = `${prevHash}|${userId}|${input.patientId || ''}|${input.action}|${ward}|${payloadHash}|127.0.0.1|${timestamp}`
    const blockHash = await computeClientSha256(rawString)

    const queuedBlock: QueuedAuditBlock = {
      id: crypto.randomUUID ? crypto.randomUUID() : `offline-${Date.now()}-${Math.random()}`,
      blockHash,
      prevHash,
      userId,
      patientId: input.patientId || null,
      action: input.action,
      activeWard: ward,
      payload: input.payload,
      payloadHash,
      timestamp,
      ipAddress: '127.0.0.1',
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent.slice(0, 150) : 'Offline Client',
      syncStatus: 'PENDING',
    }

    await enqueueAuditBlock(queuedBlock)
    await refreshPendingCounts()

    return queuedBlock
  }

  // -------------------------------------------------------------
  // Background Sync: Dual-Parent Merkle Branch Reconnection
  // -------------------------------------------------------------

  const triggerBackgroundSync = async (): Promise<{
    syncedBlocksCount: number
    mergeNode: any | null
  }> => {
    if (!isOnline.value || isSyncing.value || !import.meta.client) {
      return { syncedBlocksCount: 0, mergeNode: null }
    }

    const pendingBlocks = await getPendingAuditBlocks()
    if (pendingBlocks.length === 0) {
      return { syncedBlocksCount: 0, mergeNode: null }
    }

    isSyncing.value = true

    try {
      const token = auth.token.value || localStorage.getItem('avecinna_token')
      if (!token) {
        throw new Error('Cannot sync offline audit branch: unauthenticated session.')
      }

      // Compute binary Merkle tree root of the offline branch
      const branchHashes = pendingBlocks.map((b) => b.blockHash)
      const branchRoot = await computeBranchMerkleRoot(branchHashes)
      const branchHeadHash = pendingBlocks[pendingBlocks.length - 1].blockHash

      const response = await $fetch<{
        message: string
        syncedBlocksCount: number
        mergeNode: any
      }>(`${baseURL}/audit/sync-offline-branch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: {
          branchHeadHash,
          branchRootHash: branchRoot,
          blocks: pendingBlocks.map((b) => ({
            blockHash: b.blockHash,
            prevHash: b.prevHash,
            userId: b.userId,
            patientId: b.patientId,
            action: b.action,
            activeWard: b.activeWard,
            payloadHash: b.payloadHash,
            payload: b.payload,
            timestamp: b.timestamp,
            ipAddress: b.ipAddress,
            userAgent: b.userAgent,
          })),
        },
      })

      // Mark all blocks as synced
      await markAuditBlocksSynced(pendingBlocks.map((b) => b.id))
      await refreshPendingCounts()

      if (response.mergeNode?.blockHash) {
        lastKnownTailHash.value = response.mergeNode.blockHash
        localStorage.setItem('avecinna_latest_audit_hash', response.mergeNode.blockHash)
      }

      return {
        syncedBlocksCount: response.syncedBlocksCount,
        mergeNode: response.mergeNode,
      }
    } finally {
      isSyncing.value = false
    }
  }

  // Binary Merkle Root computation helper
  const computeBranchMerkleRoot = async (hashes: string[]): Promise<string> => {
    if (hashes.length === 0) return '0000000000000000000000000000000000000000000000000000000000000000'
    let currentLevel = [...hashes]

    while (currentLevel.length > 1) {
      const nextLevel: string[] = []
      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i]
        const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : left
        const combined = await computeClientSha256(left + right)
        nextLevel.push(combined)
      }
      currentLevel = nextLevel
    }

    return currentLevel[0]
  }

  const setLatestOnlineHash = (hash: string) => {
    if (!hash) return
    lastKnownTailHash.value = hash
    if (import.meta.client) {
      localStorage.setItem('avecinna_latest_audit_hash', hash)
    }
  }

  return {
    isOnline: computed(() => isOnline.value),
    isSyncing: computed(() => isSyncing.value),
    pendingAuditCount: computed(() => pendingAuditCount.value),
    cachePatient,
    getDecryptedPatient,
    getDecryptedWardPatients,
    recordOfflineAuditAction,
    triggerBackgroundSync,
    setLatestOnlineHash,
    refreshPendingCounts,
  }
}
