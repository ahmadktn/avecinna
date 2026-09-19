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
      return data
    } catch (err: any) {
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
