import { ref } from 'vue'
import { useApi } from './useApi'

export interface UnitWard {
  id: string
  code: string
  name: string
  department: string
}

export interface UnitMetrics {
  totalWardInpatients: number
  totalAssignedStaff: number
  onDutyStaffCount: number
  todayAppointmentsCount: number
  activeSecurityAlertsCount: number
  criticalCount: number
  monitoringCount: number
  stableCount: number
  bedOccupancyRate: number
}

export interface UnitPatient {
  id: string
  mrn: string
  fullName: string
  gender: string
  dateOfBirth: string
  assignedBed: string
  acuity: 'stable' | 'monitoring' | 'critical'
  vitals: {
    bp?: string
    hr?: number
    spo2?: number
    temp?: string
    rr?: number
  }
  diagnosis: string
}

export interface UnitStaffMember {
  id: string
  username: string
  fullName: string
  role: string
  isActive: boolean
  homeWardId?: string
  createdAt?: string
}

export interface UnitCandidateMember {
  id: string
  username: string
  fullName: string
  role: string
  isActive: boolean
  homeWardId?: string
  wardName?: string
  wardCode?: string
  isCurrentWard: boolean
}

export interface UnitRosterItem {
  id: string
  wardId: string
  staffId: string
  staffName: string
  staffUsername?: string
  staffRole?: string
  shiftType: 'DAY' | 'NIGHT' | 'ON_CALL' | 'WEEKEND'
  shiftDate: string
  startTime: string
  endTime: string
  status: 'SCHEDULED' | 'ON_DUTY' | 'COMPLETED' | 'ABSENT'
  notes?: string | null
  createdAt?: string
}

export interface SecurityAlert {
  id: string
  alertType: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  userId?: string | null
  patientId?: string | null
  description: string
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'FALSE_POSITIVE'
  createdAt: string
}

export const useUnit = () => {
  const api = useApi()
  const loading = ref(false)
  const error = ref<string | null>(null)

  const overview = ref<{
    ward: UnitWard
    metrics: UnitMetrics
    onDutyStaff: UnitRosterItem[]
    recentAlerts: SecurityAlert[]
    wardPatients: UnitPatient[]
  } | null>(null)

  const staff = ref<UnitStaffMember[]>([])
  const staffPagination = ref({ page: 1, limit: 10, total: 0, totalPages: 1 })

  const rosters = ref<UnitRosterItem[]>([])
  const rosterPagination = ref({ page: 1, limit: 15, total: 0, totalPages: 1 })
  const rosterSummary = ref({ totalShifts: 0, onDutyCount: 0, scheduledCount: 0, completedCount: 0 })

  const alerts = ref<SecurityAlert[]>([])

  const fetchOverview = async () => {
    loading.value = true
    error.value = null
    try {
      const res = await api.get<any>('/unit/overview')
      overview.value = res
      return res
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch unit overview telemetry'
      throw err
    } finally {
      loading.value = false
    }
  }

  const fetchStaff = async (params: { page?: number; limit?: number; role?: string; status?: string; search?: string } = {}) => {
    loading.value = true
    error.value = null
    try {
      const query = new URLSearchParams()
      if (params.page) query.append('page', String(params.page))
      if (params.limit) query.append('limit', String(params.limit))
      if (params.role && params.role !== 'ALL') query.append('role', params.role)
      if (params.status && params.status !== 'ALL') query.append('status', params.status)
      if (params.search && params.search.trim()) query.append('search', params.search.trim())

      const res = await api.get<{
        wardId: string
        staff: UnitStaffMember[]
        pagination: { page: number; limit: number; total: number; totalPages: number }
      }>(`/unit/staff?${query.toString()}`)

      staff.value = res.staff
      staffPagination.value = res.pagination
      return res
    } catch (err: any) {
      error.value = err.message || 'Failed to load unit staff roster'
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateStaffStatus = async (id: string, isActive: boolean) => {
    loading.value = true
    error.value = null
    try {
      const res = await api.patch<{ message: string; staff: UnitStaffMember }>(`/unit/staff/${id}/status`, { isActive })
      // Update in local list
      const idx = staff.value.findIndex((s) => s.id === id)
      if (idx !== -1) {
        staff.value[idx].isActive = isActive
      }
      return res.staff
    } catch (err: any) {
      error.value = err.message || 'Failed to update staff status'
      throw err
    } finally {
      loading.value = false
    }
  }

  const reassignStaff = async (staffId: string, wardId?: string) => {
    loading.value = true
    error.value = null
    try {
      const res = await api.post<{ message: string; staff: UnitStaffMember }>('/unit/staff/reassign', { staffId, wardId })
      return res.staff
    } catch (err: any) {
      error.value = err.message || 'Failed to reassign staff to unit'
      throw err
    } finally {
      loading.value = false
    }
  }

  const searchCandidates = async (search?: string) => {
    loading.value = true
    error.value = null
    try {
      const query = new URLSearchParams()
      if (search && search.trim()) query.append('search', search.trim())
      const res = await api.get<{ candidates: UnitCandidateMember[] }>(`/unit/staff/candidates?${query.toString()}`)
      return res.candidates
    } catch (err: any) {
      error.value = err.message || 'Failed to search hospital staff'
      throw err
    } finally {
      loading.value = false
    }
  }

  const fetchRoster = async (params: { page?: number; limit?: number; shiftType?: string; status?: string; date?: string; search?: string } = {}) => {
    loading.value = true
    error.value = null
    try {
      const query = new URLSearchParams()
      if (params.page) query.append('page', String(params.page))
      if (params.limit) query.append('limit', String(params.limit))
      if (params.shiftType && params.shiftType !== 'ALL') query.append('shiftType', params.shiftType)
      if (params.status && params.status !== 'ALL') query.append('status', params.status)
      if (params.date && params.date.trim()) query.append('date', params.date.trim())
      if (params.search && params.search.trim()) query.append('search', params.search.trim())

      const res = await api.get<{
        wardId: string
        rosters: UnitRosterItem[]
        pagination: { page: number; limit: number; total: number; totalPages: number }
        summary: { totalShifts: number; onDutyCount: number; scheduledCount: number; completedCount: number }
      }>(`/unit/roster?${query.toString()}`)

      rosters.value = res.rosters
      rosterPagination.value = res.pagination
      rosterSummary.value = res.summary
      return res
    } catch (err: any) {
      error.value = err.message || 'Failed to load ward shift roster'
      throw err
    } finally {
      loading.value = false
    }
  }

  const createRosterShift = async (payload: {
    staffId: string
    shiftType: string
    shiftDate: string
    startTime?: string
    endTime?: string
    notes?: string
  }) => {
    loading.value = true
    error.value = null
    try {
      const res = await api.post<{ message: string; roster: UnitRosterItem }>('/unit/roster', payload)
      return res.roster
    } catch (err: any) {
      error.value = err.message || 'Failed to assign duty shift'
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateRosterStatus = async (id: string, status: 'SCHEDULED' | 'ON_DUTY' | 'COMPLETED' | 'ABSENT') => {
    loading.value = true
    error.value = null
    try {
      const res = await api.patch<{ message: string; roster: UnitRosterItem }>(`/unit/roster/${id}/status`, { status })
      const idx = rosters.value.findIndex((r) => r.id === id)
      if (idx !== -1) {
        rosters.value[idx].status = status
      }
      return res.roster
    } catch (err: any) {
      error.value = err.message || 'Failed to update shift status'
      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteRosterShift = async (id: string) => {
    loading.value = true
    error.value = null
    try {
      const res = await api.delete<{ message: string; roster: UnitRosterItem }>(`/unit/roster/${id}`)
      rosters.value = rosters.value.filter((r) => r.id !== id)
      return res.roster
    } catch (err: any) {
      error.value = err.message || 'Failed to cancel shift assignment'
      throw err
    } finally {
      loading.value = false
    }
  }

  const fetchAlerts = async () => {
    loading.value = true
    error.value = null
    try {
      const res = await api.get<{ alerts: SecurityAlert[] }>('/unit/alerts')
      alerts.value = res.alerts
      return res.alerts
    } catch (err: any) {
      error.value = err.message || 'Failed to load security alerts'
      throw err
    } finally {
      loading.value = false
    }
  }

  const resolveAlert = async (id: string) => {
    loading.value = true
    error.value = null
    try {
      const res = await api.patch<{ message: string; alert: SecurityAlert }>(`/unit/alerts/${id}/resolve`, {})
      const idx = alerts.value.findIndex((a) => a.id === id)
      if (idx !== -1) {
        alerts.value[idx].status = 'RESOLVED'
      }
      return res.alert
    } catch (err: any) {
      error.value = err.message || 'Failed to resolve security alert'
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    overview,
    staff,
    staffPagination,
    rosters,
    rosterPagination,
    rosterSummary,
    alerts,
    fetchOverview,
    fetchStaff,
    updateStaffStatus,
    reassignStaff,
    searchCandidates,
    fetchRoster,
    createRosterShift,
    updateRosterStatus,
    deleteRosterShift,
    fetchAlerts,
    resolveAlert,
  }
}
