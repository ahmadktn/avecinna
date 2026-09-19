import { ref } from 'vue'
import { useApi } from './useApi'
import type { User, Ward } from './useAuth'

export interface AdminOverviewData {
  metrics: {
    totalPatients: number
    totalWards: number
    totalStaff: number
    activeStaff: number
    totalAuditBlocks: number
    openSecurityAlerts: number
    totalSecurityAlerts: number
  }
  roleBreakdown: Record<string, number>
  wardsWithCensus: Array<{
    id: string
    code: string
    name: string
    department: string
    headOfUnitId?: string | null
    patientCount: number
    staffCount: number
  }>
  recentAuditLogs: Array<{
    indexNum: number
    blockHash: string
    prevHash: string
    userId: string
    patientId?: string | null
    action: string
    activeWard: string
    payloadHash: string
    createdAt: string
  }>
}

export interface AdminPatient {
  id: string
  mrn: string
  fullName: string
  dateOfBirth: string
  gender: string
  patientType: string
  genotype?: string
  bloodGroup?: string
  primaryWardId?: string
  assignedBed?: string
  createdAt: string
}

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

export const useAdmin = () => {
  const api = useApi()
  const users = ref<User[]>([])
  const wards = ref<Ward[]>([])
  const overview = ref<AdminOverviewData | null>(null)
  const patients = ref<AdminPatient[]>([])
  const pagination = ref<PaginationMeta>({ page: 1, limit: 15, total: 0, totalPages: 1 })
  const loading = ref(false)
  const error = ref<string | null>(null)

  const fetchOverview = async () => {
    loading.value = true
    error.value = null
    try {
      const res = await api.get<AdminOverviewData>('/admin/overview')
      overview.value = res
      return res
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch system overview telemetry'
      throw err
    } finally {
      loading.value = false
    }
  }

  const fetchAdminPatients = async (params?: { page?: number; limit?: number; search?: string; ward?: string }) => {
    loading.value = true
    error.value = null
    try {
      const q = new URLSearchParams()
      if (params?.page) q.append('page', String(params.page))
      if (params?.limit) q.append('limit', String(params.limit))
      if (params?.search) q.append('search', params.search)
      if (params?.ward && params.ward !== 'ALL') q.append('ward', params.ward)

      const endpoint = `/admin/patients?${q.toString()}`
      const res = await api.get<{ patients: AdminPatient[]; pagination: PaginationMeta }>(endpoint)
      patients.value = res.patients
      pagination.value = res.pagination
      return res
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch hospital patients list'
      throw err
    } finally {
      loading.value = false
    }
  }

  const fetchUsers = async () => {
    loading.value = true
    error.value = null
    try {
      const res = await api.get<{ users: User[] }>('/admin/users')
      users.value = res.users
      return res.users
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch staff accounts'
      throw err
    } finally {
      loading.value = false
    }
  }

  const createUser = async (payload: {
    username: string
    password: string
    fullName: string
    role: string
    homeWardId: string
  }) => {
    loading.value = true
    error.value = null
    try {
      const res = await api.post<{ message: string; user: User }>('/admin/users', payload)
      await fetchUsers()
      return res.user
    } catch (err: any) {
      error.value = err.message || 'Failed to create staff account'
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateUser = async (id: string, payload: Partial<User & { password?: string }>) => {
    loading.value = true
    error.value = null
    try {
      const res = await api.put<{ message: string; user: User }>(`/admin/users/${id}`, payload)
      await fetchUsers()
      return res.user
    } catch (err: any) {
      error.value = err.message || 'Failed to update staff account'
      throw err
    } finally {
      loading.value = false
    }
  }

  const toggleUserStatus = async (id: string, isActive: boolean) => {
    loading.value = true
    error.value = null
    try {
      const res = await api.patch<{ message: string; user: Partial<User> }>(`/admin/users/${id}/status`, { isActive })
      await fetchUsers()
      return res.user
    } catch (err: any) {
      error.value = err.message || 'Failed to toggle account active status'
      throw err
    } finally {
      loading.value = false
    }
  }

  const fetchWards = async () => {
    loading.value = true
    error.value = null
    try {
      const res = await api.get<{ wards: Ward[] }>('/admin/wards')
      wards.value = res.wards
      return res.wards
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch hospital wards'
      throw err
    } finally {
      loading.value = false
    }
  }

  const createWard = async (payload: { code: string; name: string; department: string; headOfUnitId?: string }) => {
    loading.value = true
    error.value = null
    try {
      const res = await api.post<{ message: string; ward: Ward }>('/admin/wards', payload)
      await fetchWards()
      return res.ward
    } catch (err: any) {
      error.value = err.message || 'Failed to create hospital ward'
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateWard = async (id: string, payload: { name?: string; department?: string; headOfUnitId?: string | null }) => {
    loading.value = true
    error.value = null
    try {
      const res = await api.put<{ message: string; ward: Ward }>(`/admin/wards/${id}`, payload)
      await fetchWards()
      return res.ward
    } catch (err: any) {
      error.value = err.message || 'Failed to update hospital ward'
      throw err
    } finally {
      loading.value = false
    }
  }

  const assignStaffToWard = async (wardId: string, userId: string) => {
    loading.value = true
    error.value = null
    try {
      const res = await api.post<{ message: string; user: User }>(`/admin/wards/${wardId}/assign-staff`, { userId })
      await fetchUsers()
      await fetchWards()
      return res.user
    } catch (err: any) {
      error.value = err.message || 'Failed to assign staff to ward'
      throw err
    } finally {
      loading.value = false
    }
  }

  const downloadReport = async (type: string, format: string) => {
    loading.value = true
    error.value = null
    try {
      const config = useRuntimeConfig()
      const baseURL = config.public?.apiBaseUrl || 'http://localhost:4000/api/v1'
      const token = import.meta.client ? localStorage.getItem('avecinna_token') : null

      const res = await fetch(`${baseURL}/admin/reports/export?type=${type}&format=${format}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        throw new Error(errJson.message || `Failed to export report (${res.status})`)
      }

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `avecinna_${type}_export.${format === 'csv' ? 'csv' : 'json'}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (err: any) {
      error.value = err.message || 'Failed to download report'
      throw err
    } finally {
      loading.value = false
    }
  }

  const exportReportUrl = (type: string, format: string) => {
    const config = useRuntimeConfig()
    const baseURL = config.public?.apiBaseUrl || 'http://localhost:4000/api/v1'
    return `${baseURL}/admin/reports/export?type=${type}&format=${format}`
  }

  return {
    users,
    wards,
    overview,
    patients,
    pagination,
    loading,
    error,
    fetchOverview,
    fetchAdminPatients,
    fetchUsers,
    createUser,
    updateUser,
    toggleUserStatus,
    fetchWards,
    createWard,
    updateWard,
    assignStaffToWard,
    downloadReport,
    exportReportUrl,
  }
}

