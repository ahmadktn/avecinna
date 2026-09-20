export interface ApiError {
  error?: string
  message: string
  statusCode?: number
}

export const useApi = () => {
  const config = useRuntimeConfig()
  const baseURL = config.public?.apiBaseUrl || 'http://localhost:4000/api/v1'

  const getHeaders = (extraHeaders: Record<string, string> = {}, hasBody = false) => {
    const headers: Record<string, string> = {
      ...extraHeaders,
    }

    if (hasBody && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json'
    }

    if (import.meta.client) {
      const token = localStorage.getItem('avecinna_token')
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
    }

    return headers
  }

  const request = async <T>(endpoint: string, options: any = {}): Promise<T> => {
    const hasBody = options.body !== undefined && options.body !== null
    const headers = getHeaders(options.headers || {}, hasBody)
    const url = endpoint.startsWith('http') ? endpoint : `${baseURL}${endpoint}`

    try {
      const data = await $fetch<T>(url, {
        ...options,
        headers,
      })

      // Transparently cache patient responses in AES-GCM-256 encrypted IndexedDB when online
      if (import.meta.client && options.method === 'GET' || !options.method) {
        try {
          const offline = useOfflineStorage()
          if ((data as any)?.patient) {
            offline.cachePatient((data as any).patient)
          } else if (Array.isArray((data as any)?.patients)) {
            for (const p of (data as any).patients) {
              offline.cachePatient(p)
            }
          }
        } catch (cacheErr) {
          // Non-blocking cache update
        }
      }

      return data
    } catch (err: any) {
      const isNetworkFailure =
        (typeof window !== 'undefined' && !window.navigator.onLine) ||
        err.message?.includes('Failed to fetch') ||
        err.message?.includes('NetworkError') ||
        err.statusCode === 503

      // If offline and requesting patient data, attempt fallback to local AES-GCM encrypted IndexedDB
      if (import.meta.client && isNetworkFailure && (options.method === 'GET' || !options.method)) {
        const offline = useOfflineStorage()

        // Single patient query: /patients/:id
        const patientMatch = endpoint.match(/\/patients\/([a-zA-Z0-9_-]+)/)
        if (patientMatch && patientMatch[1]) {
          const patientId = patientMatch[1]
          const cachedPatient = await offline.getDecryptedPatient(patientId)

          if (cachedPatient) {
            // Record offline view audit block in local DAG queue
            await offline.recordOfflineAuditAction({
              action: 'OFFLINE_PATIENT_VIEW',
              patientId,
              payload: { patientId, role: cachedPatient.roleScope || 'CLINICIAN' },
            })

            return {
              patient: cachedPatient,
              relationshipType: 'OFFLINE_CACHE',
              isOfflineCache: true,
            } as unknown as T
          } else {
            const errOffline = new Error(
              `Patient record (${patientId}) is not available in local encrypted cache. Connect to the hospital network to retrieve chart.`
            ) as Error & { statusCode?: number }
            errOffline.statusCode = 503
            throw errOffline
          }
        }
      }

      const responseData = err.data || err.response?._data
      const message = responseData?.message || responseData?.error || err.message || 'An unexpected network error occurred'
      const errorObj = new Error(message) as Error & { statusCode?: number }
      errorObj.statusCode = err.statusCode || err.response?.status || 500
      throw errorObj
    }
  }

  return {
    get: <T>(endpoint: string, options: any = {}) => request<T>(endpoint, { ...options, method: 'GET' }),
    post: <T>(endpoint: string, body?: any, options: any = {}) => request<T>(endpoint, { ...options, method: 'POST', body }),
    put: <T>(endpoint: string, body?: any, options: any = {}) => request<T>(endpoint, { ...options, method: 'PUT', body }),
    patch: <T>(endpoint: string, body?: any, options: any = {}) => request<T>(endpoint, { ...options, method: 'PATCH', body }),
    delete: <T>(endpoint: string, options: any = {}) => request<T>(endpoint, { ...options, method: 'DELETE' }),
  }
}
