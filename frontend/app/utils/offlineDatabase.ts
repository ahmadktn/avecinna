/**
 * IndexedDB Client Storage Engine (`avecina_offline_db`)
 * Stores encrypted patient records (AES-GCM-256) and offline audit blocks awaiting sync.
 * Zero hardcoded fallbacks; returns explicit errors or null when items are not present.
 */

export interface CachedPatientRecord {
  patientId: string
  wardId: string
  roleScope: string
  encryptedData: string
  iv: string
  recordHash: string
  cachedAt: string
}

export interface QueuedAuditBlock {
  id: string
  blockHash: string
  prevHash: string
  userId: string
  patientId?: string | null
  action: string
  activeWard: string
  payload: any
  payloadHash: string
  timestamp: string
  ipAddress?: string
  userAgent?: string
  syncStatus: 'PENDING' | 'SYNCED' | 'FAILED'
}

export interface QueuedMutation {
  id: string
  endpoint: string
  method: 'POST' | 'PUT' | 'PATCH'
  body: any
  createdAt: string
  status: 'PENDING' | 'SYNCED' | 'FAILED'
  retryCount: number
}

const DB_NAME = 'avecina_offline_db'
const DB_VERSION = 1

const STORE_PATIENTS = 'patients_cache'
const STORE_AUDIT_QUEUE = 'audit_queue'
const STORE_MUTATIONS = 'offline_mutations'

let dbInstance: IDBDatabase | null = null

function getIndexedDB(): IDBFactory {
  if (typeof window !== 'undefined' && window.indexedDB) {
    return window.indexedDB
  }
  throw new Error('IndexedDB is not supported or accessible in this environment.')
}

export function openOfflineDatabase(): Promise<IDBDatabase> {
  if (dbInstance) {
    return Promise.resolve(dbInstance)
  }

  return new Promise((resolve, reject) => {
    try {
      const idb = getIndexedDB()
      const request = idb.open(DB_NAME, DB_VERSION)

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result

        // 1. Encrypted Patients Cache Store
        if (!db.objectStoreNames.contains(STORE_PATIENTS)) {
          const patientStore = db.createObjectStore(STORE_PATIENTS, { keyPath: 'patientId' })
          patientStore.createIndex('idx_wardId', 'wardId', { unique: false })
          patientStore.createIndex('idx_cachedAt', 'cachedAt', { unique: false })
        }

        // 2. Offline Audit Queue Store
        if (!db.objectStoreNames.contains(STORE_AUDIT_QUEUE)) {
          const auditStore = db.createObjectStore(STORE_AUDIT_QUEUE, { keyPath: 'id' })
          auditStore.createIndex('idx_syncStatus', 'syncStatus', { unique: false })
          auditStore.createIndex('idx_timestamp', 'timestamp', { unique: false })
          auditStore.createIndex('idx_blockHash', 'blockHash', { unique: true })
        }

        // 3. Offline Clinical Mutations Store
        if (!db.objectStoreNames.contains(STORE_MUTATIONS)) {
          const mutationStore = db.createObjectStore(STORE_MUTATIONS, { keyPath: 'id' })
          mutationStore.createIndex('idx_status', 'status', { unique: false })
          mutationStore.createIndex('idx_createdAt', 'createdAt', { unique: false })
        }
      }

      request.onsuccess = (event: Event) => {
        dbInstance = (event.target as IDBOpenDBRequest).result
        resolve(dbInstance)
      }

      request.onerror = (event: Event) => {
        const err = (event.target as IDBOpenDBRequest).error
        reject(new Error(`Failed to open IndexedDB "${DB_NAME}": ${err?.message || 'Unknown IDB error'}`))
      }

      request.onblocked = () => {
        reject(new Error(`IndexedDB "${DB_NAME}" upgrade was blocked by another open tab.`))
      }
    } catch (e: any) {
      reject(e)
    }
  })
}

// -------------------------------------------------------------
// Patients Cache Operations
// -------------------------------------------------------------

export async function putCachedPatient(record: CachedPatientRecord): Promise<void> {
  const db = await openOfflineDatabase()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PATIENTS, 'readwrite')
    const store = tx.objectStore(STORE_PATIENTS)
    const request = store.put(record)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(new Error(`Failed to store patient ${record.patientId} in offline cache: ${request.error?.message}`))
  })
}

export async function getCachedPatient(patientId: string): Promise<CachedPatientRecord | null> {
  const db = await openOfflineDatabase()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PATIENTS, 'readonly')
    const store = tx.objectStore(STORE_PATIENTS)
    const request = store.get(patientId)

    request.onsuccess = () => {
      resolve(request.result || null)
    }
    request.onerror = () => reject(new Error(`Failed to read patient ${patientId} from offline cache: ${request.error?.message}`))
  })
}

export async function getCachedPatientsByWard(wardId: string): Promise<CachedPatientRecord[]> {
  const db = await openOfflineDatabase()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PATIENTS, 'readonly')
    const store = tx.objectStore(STORE_PATIENTS)
    const index = store.index('idx_wardId')
    const request = index.getAll(wardId)

    request.onsuccess = () => {
      resolve(request.result || [])
    }
    request.onerror = () => reject(new Error(`Failed to list ward patients from offline cache: ${request.error?.message}`))
  })
}

export async function getAllCachedPatients(): Promise<CachedPatientRecord[]> {
  const db = await openOfflineDatabase()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PATIENTS, 'readonly')
    const store = tx.objectStore(STORE_PATIENTS)
    const request = store.getAll()

    request.onsuccess = () => {
      resolve(request.result || [])
    }
    request.onerror = () => reject(new Error(`Failed to list all cached patients: ${request.error?.message}`))
  })
}

// -------------------------------------------------------------
// Offline Audit Queue Operations
// -------------------------------------------------------------

export async function enqueueAuditBlock(block: QueuedAuditBlock): Promise<void> {
  const db = await openOfflineDatabase()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_AUDIT_QUEUE, 'readwrite')
    const store = tx.objectStore(STORE_AUDIT_QUEUE)
    const request = store.put(block)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(new Error(`Failed to enqueue audit block ${block.blockHash}: ${request.error?.message}`))
  })
}

export async function getPendingAuditBlocks(): Promise<QueuedAuditBlock[]> {
  const db = await openOfflineDatabase()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_AUDIT_QUEUE, 'readonly')
    const store = tx.objectStore(STORE_AUDIT_QUEUE)
    const index = store.index('idx_syncStatus')
    const request = index.getAll('PENDING')

    request.onsuccess = () => {
      // Sort sequentially by timestamp
      const sorted = (request.result || []).sort((a: QueuedAuditBlock, b: QueuedAuditBlock) =>
        a.timestamp.localeCompare(b.timestamp)
      )
      resolve(sorted)
    }
    request.onerror = () => reject(new Error(`Failed to fetch pending audit blocks: ${request.error?.message}`))
  })
}

export async function markAuditBlocksSynced(ids: string[]): Promise<void> {
  if (ids.length === 0) return
  const db = await openOfflineDatabase()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_AUDIT_QUEUE, 'readwrite')
    const store = tx.objectStore(STORE_AUDIT_QUEUE)

    let completed = 0
    ids.forEach((id) => {
      const getReq = store.get(id)
      getReq.onsuccess = () => {
        const item = getReq.result
        if (item) {
          item.syncStatus = 'SYNCED'
          store.put(item)
        }
        completed++
        if (completed === ids.length) {
          resolve()
        }
      }
      getReq.onerror = () => reject(new Error(`Failed to update sync status for block ${id}`))
    })
  })
}

export async function clearSyncedAuditBlocks(): Promise<number> {
  const db = await openOfflineDatabase()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_AUDIT_QUEUE, 'readwrite')
    const store = tx.objectStore(STORE_AUDIT_QUEUE)
    const index = store.index('idx_syncStatus')
    const request = index.getAllKeys('SYNCED')

    request.onsuccess = () => {
      const keys = request.result || []
      keys.forEach((key) => store.delete(key))
      resolve(keys.length)
    }
    request.onerror = () => reject(new Error(`Failed to clear synced audit blocks: ${request.error?.message}`))
  })
}

// -------------------------------------------------------------
// Offline Mutations Store Operations
// -------------------------------------------------------------

export async function enqueueMutation(mutation: QueuedMutation): Promise<void> {
  const db = await openOfflineDatabase()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_MUTATIONS, 'readwrite')
    const store = tx.objectStore(STORE_MUTATIONS)
    const request = store.put(mutation)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(new Error(`Failed to enqueue offline mutation: ${request.error?.message}`))
  })
}

export async function getPendingMutations(): Promise<QueuedMutation[]> {
  const db = await openOfflineDatabase()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_MUTATIONS, 'readonly')
    const store = tx.objectStore(STORE_MUTATIONS)
    const index = store.index('idx_status')
    const request = index.getAll('PENDING')

    request.onsuccess = () => {
      const sorted = (request.result || []).sort((a: QueuedMutation, b: QueuedMutation) =>
        a.createdAt.localeCompare(b.createdAt)
      )
      resolve(sorted)
    }
    request.onerror = () => reject(new Error(`Failed to fetch pending mutations: ${request.error?.message}`))
  })
}

export async function updateMutationStatus(id: string, status: 'SYNCED' | 'FAILED'): Promise<void> {
  const db = await openOfflineDatabase()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_MUTATIONS, 'readwrite')
    const store = tx.objectStore(STORE_MUTATIONS)
    const getReq = store.get(id)

    getReq.onsuccess = () => {
      const item = getReq.result
      if (item) {
        item.status = status
        store.put(item)
      }
      resolve()
    }
    getReq.onerror = () => reject(new Error(`Failed to update mutation ${id} status: ${getReq.error?.message}`))
  })
}
