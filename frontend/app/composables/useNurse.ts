import { ref } from 'vue'
import { useApi } from './useApi'

export interface NurseWard {
  id: string
  code: string
  name: string
  department: string
}

export interface NurseMetrics {
  wardInpatientsCount: number
  myCareTeamCount: number
  criticalCount: number
  monitoringCount: number
  stableCount: number
  bedOccupancyRate: number
  isShiftActive: boolean
}

export interface NurseShift {
  shiftType: string
  startTime: string
  endTime: string
  status: string
  notes?: string
}

export interface NursePatientItem {
  id: string
  mrn: string
  fullName: string
  gender: string
  dateOfBirth: string
  assignedBed: string
  patientType?: string
  acuity: 'stable' | 'monitoring' | 'critical'
  vitals?: {
    bp?: string
    hr?: number
    spo2?: number
    temp?: string
    rr?: number
    bloodGlucose?: string
  }
  diagnosis?: string
  allergies?: any
  activeMedications?: any
  relationshipType?: string
  isCareTeam?: boolean
  careTeamGrant?: any
}

export interface CareTeamAssignmentItem {
  careTeamId: string
  patientId: string
  relationshipType: string
  grantReason?: string
  expiresAt?: string | null
  patientName: string
  patientMrn: string
  assignedBed?: string
  patientWardId?: string
  wardName?: string
  wardCode?: string
}

export interface NurseOverviewData {
  activeWard: NurseWard
  metrics: NurseMetrics
  todayShift: NurseShift
  wardPatients: NursePatientItem[]
  careTeamPatients: CareTeamAssignmentItem[]
}

export const useNurse = () => {
  const api = useApi()
  const loading = ref(false)
  const error = ref<string | null>(null)
  const overview = ref<NurseOverviewData | null>(null)

  const fetchOverview = async () => {
    loading.value = true
    error.value = null
    try {
      const res = await api.get<NurseOverviewData>('/nurse/overview')
      overview.value = res
      return res
    } catch (err: any) {
      error.value = err.message || 'Failed to load nursing station telemetry'
      throw err
    } finally {
      loading.value = false
    }
  }

  const recordVitals = async (payload: {
    patientId: string
    bp?: string
    hr?: number
    spo2?: number
    temp?: string
    rr?: number
    bloodGlucose?: string
    notes?: string
  }) => {
    loading.value = true
    error.value = null
    try {
      const res = await api.post<{
        message: string
        observation: any
        patient: any
      }>('/nurse/vitals', payload)
      return res
    } catch (err: any) {
      error.value = err.message || 'Failed to record vital signs observation'
      throw err
    } finally {
      loading.value = false
    }
  }

  const fetchMyAssignments = async () => {
    loading.value = true
    error.value = null
    try {
      const res = await api.get<{ count: number; assignments: CareTeamAssignmentItem[] }>('/care-teams/my-assignments')
      return res.assignments
    } catch (err: any) {
      error.value = err.message || 'Failed to load care team assignments'
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    overview,
    fetchOverview,
    recordVitals,
    fetchMyAssignments,
  }
}
