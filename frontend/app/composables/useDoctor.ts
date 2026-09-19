import { ref } from 'vue'
import { useApi } from './useApi'
import type { Patient } from './usePatients'
import type { AppointmentItem } from './useClerk'

export interface DoctorOverviewMetrics {
  activeWardPatientsCount: number
  careTeamConsultsCount: number
  todayConsultationsCount: number
  todayPendingConsultations: number
  todayActiveConsultations: number
  todayCompletedConsultations: number
  stableCount: number
  monitoringCount: number
  criticalCount: number
}

export interface CareTeamMember {
  id: string
  patientId: string
  staffId: string
  staffName: string
  staffUsername?: string
  staffRole: string
  staffHomeWardId?: string
  relationshipType: 'PRIMARY' | 'ON_CALL' | 'CONSULT' | 'OUTPATIENT_DOCTOR'
  grantedByStaffId?: string | null
  grantReason?: string | null
  expiresAt?: string | null
  createdAt: string
}

export interface StaffItem {
  id: string
  username: string
  fullName: string
  role: string
  homeWardId: string
  isActive: boolean
}

export interface ClinicalEncounterPayload {
  patientId: string
  appointmentId?: string
  diagnosis?: string
  soapNotes?: {
    subjective?: string
    objective?: string
    assessment?: string
    plan?: string
  }
  vitals?: {
    bp?: string
    hr?: number
    spo2?: number
    temperature?: string
    respiratoryRate?: number
  }
  prescriptions?: Array<{
    medicationName: string
    dosage: string
    frequency: string
    route?: string
    duration?: string
    instructions?: string
  }>
  labOrders?: Array<{
    testName: string
    category: string
    priority?: string
    clinicalIndication?: string
  }>
}

export const useDoctor = () => {
  const api = useApi()
  const loading = ref(false)
  const error = ref<string | null>(null)

  const overview = ref<{
    activeWard: any
    metrics: DoctorOverviewMetrics
    todayAppointments: AppointmentItem[]
    activeWardPatients: Patient[]
  } | null>(null)

  const careTeam = ref<CareTeamMember[]>([])
  const staffList = ref<StaffItem[]>([])

  const fetchOverview = async () => {
    loading.value = true
    error.value = null
    try {
      const res = await api.get<any>('/doctor/overview')
      overview.value = res
      return res
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch clinical telemetry'
      throw err
    } finally {
      loading.value = false
    }
  }

  const fetchCareTeam = async (patientId: string) => {
    loading.value = true
    error.value = null
    try {
      const res = await api.get<{ patientId: string; count: number; careTeam: CareTeamMember[] }>(
        `/patients/${patientId}/care-teams`
      )
      careTeam.value = res.careTeam
      return res.careTeam
    } catch (err: any) {
      error.value = err.message || 'Failed to load patient care team'
      throw err
    } finally {
      loading.value = false
    }
  }

  const grantCareTeam = async (
    patientId: string,
    payload: {
      staffId: string
      relationshipType: 'PRIMARY' | 'ON_CALL' | 'CONSULT' | 'OUTPATIENT_DOCTOR'
      grantReason?: string
      durationHours?: number
    }
  ) => {
    loading.value = true
    error.value = null
    try {
      const res = await api.post<{ message: string; careTeamGrant: CareTeamMember }>(
        `/patients/${patientId}/care-teams`,
        payload
      )
      await fetchCareTeam(patientId)
      return res.careTeamGrant
    } catch (err: any) {
      error.value = err.message || 'Failed to grant care team consult'
      throw err
    } finally {
      loading.value = false
    }
  }

  const revokeCareTeam = async (patientId: string, careTeamId: string) => {
    loading.value = true
    error.value = null
    try {
      const res = await api.delete<{ message: string; revokedGrant: CareTeamMember }>(
        `/patients/${patientId}/care-teams/${careTeamId}`
      )
      await fetchCareTeam(patientId)
      return res.revokedGrant
    } catch (err: any) {
      error.value = err.message || 'Failed to revoke care team access'
      throw err
    } finally {
      loading.value = false
    }
  }

  const recordEncounter = async (payload: ClinicalEncounterPayload) => {
    loading.value = true
    error.value = null
    try {
      const res = await api.post<{
        message: string
        encounterId: string
        patient: Patient
        createdLabOrders: any[]
      }>('/doctor/encounters', payload)
      return res
    } catch (err: any) {
      error.value = err.message || 'Failed to record clinical encounter'
      throw err
    } finally {
      loading.value = false
    }
  }

  const fetchStaffList = async () => {
    try {
      const res = await api.get<{ users: StaffItem[] }>('/admin/users')
      staffList.value = res.users
      return res.users
    } catch (err) {
      // If non-admin, fallback to doctors endpoint
      try {
        const docRes = await api.get<{ doctors: any[] }>('/clerk/doctors')
        staffList.value = docRes.doctors.map((d) => ({
          id: d.id,
          username: d.username,
          fullName: d.fullName,
          role: d.role,
          homeWardId: d.homeWardId,
          isActive: true,
        }))
        return staffList.value
      } catch (e: any) {
        error.value = e.message || 'Failed to load staff list'
        throw e
      }
    }
  }

  return {
    loading,
    error,
    overview,
    careTeam,
    staffList,
    fetchOverview,
    fetchCareTeam,
    grantCareTeam,
    revokeCareTeam,
    recordEncounter,
    fetchStaffList,
  }
}
