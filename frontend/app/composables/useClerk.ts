import { ref } from 'vue'
import { useApi } from './useApi'
import type { Patient } from './usePatients'

export interface WardCensusItem {
  id: string
  code: string
  name: string
  department: string
  inpatientCount: number
  assignedBedCount: number
}

export interface ClerkOverviewMetrics {
  totalPatients: number
  totalInpatients: number
  totalOutpatients: number
  todayAppointmentsCount: number
  todayPendingConsultations: number
  todayActiveConsultations: number
  todayCompletedConsultations: number
  activeDoctorsCount: number
  totalWardsCount: number
}

export interface AppointmentItem {
  id: string
  patientId: string
  patientName: string
  patientMrn: string
  patientGender?: string
  doctorId: string
  doctorName: string
  doctorUsername?: string
  clinicWardId: string
  wardName: string
  wardCode: string
  appointmentDate: string
  status: 'SCHEDULED' | 'IN_CONSULTATION' | 'COMPLETED' | 'CANCELLED'
  notes?: string | null
  createdAt?: string
}

export interface DoctorItem {
  id: string
  username: string
  fullName: string
  role: string
  homeWardId: string
  wardName?: string
  wardCode?: string
}

export interface ClerkPatientItem {
  id: string
  mrn: string
  fullName: string
  dateOfBirth: string
  gender: string
  patientType: 'INPATIENT' | 'OUTPATIENT'
  genotype?: string | null
  bloodGroup?: string | null
  primaryWardId?: string | null
  assignedBed?: string | null
  createdAt: string
  wardName?: string
  wardCode?: string
}

export interface WardItem {
  id: string
  code: string
  name: string
  department: string
}

export const useClerk = () => {
  const api = useApi()
  const loading = ref(false)
  const error = ref<string | null>(null)

  const overview = ref<{
    metrics: ClerkOverviewMetrics
    wardCensus: WardCensusItem[]
    todayAppointments: AppointmentItem[]
    recentRegistrations: ClerkPatientItem[]
  } | null>(null)

  const patients = ref<ClerkPatientItem[]>([])
  const appointments = ref<AppointmentItem[]>([])
  const doctors = ref<DoctorItem[]>([])
  const wards = ref<WardItem[]>([])
  const pagination = ref({ page: 1, limit: 15, total: 0, totalPages: 1 })

  const fetchOverview = async () => {
    loading.value = true
    error.value = null
    try {
      const res = await api.get<any>('/clerk/overview')
      overview.value = res
      return res
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch admissions overview telemetry'
      throw err
    } finally {
      loading.value = false
    }
  }

  const fetchPatients = async (params: { page?: number; limit?: number; search?: string; ward?: string; patientType?: string } = {}) => {
    loading.value = true
    error.value = null
    try {
      const query = new URLSearchParams()
      if (params.page) query.append('page', String(params.page))
      if (params.limit) query.append('limit', String(params.limit))
      if (params.search) query.append('search', params.search)
      if (params.ward && params.ward !== 'ALL') query.append('ward', params.ward)
      if (params.patientType && params.patientType !== 'ALL') query.append('patientType', params.patientType)

      const res = await api.get<{
        patients: ClerkPatientItem[]
        pagination: { page: number; limit: number; total: number; totalPages: number }
      }>(`/clerk/patients?${query.toString()}`)

      patients.value = res.patients
      pagination.value = res.pagination
      return res
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch patients directory'
      throw err
    } finally {
      loading.value = false
    }
  }

  const fetchAppointments = async (params: {
    page?: number
    limit?: number
    status?: string
    date?: string
    doctorId?: string
    wardId?: string
    search?: string
  } = {}) => {
    loading.value = true
    error.value = null
    try {
      const query = new URLSearchParams()
      if (params.page) query.append('page', String(params.page))
      if (params.limit) query.append('limit', String(params.limit))
      if (params.status && params.status !== 'all') query.append('status', params.status)
      if (params.date) query.append('date', params.date)
      if (params.doctorId && params.doctorId !== 'all') query.append('doctorId', params.doctorId)
      if (params.wardId && params.wardId !== 'all') query.append('wardId', params.wardId)
      if (params.search) query.append('search', params.search)

      const res = await api.get<{
        appointments: AppointmentItem[]
        pagination: { page: number; limit: number; total: number; totalPages: number }
      }>(`/appointments?${query.toString()}`)

      appointments.value = res.appointments
      pagination.value = res.pagination
      return res
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch consultation appointments'
      throw err
    } finally {
      loading.value = false
    }
  }

  const createAppointment = async (payload: {
    patientId: string
    doctorId: string
    clinicWardId: string
    appointmentDate: string
    notes?: string
  }) => {
    loading.value = true
    error.value = null
    try {
      const res = await api.post<{ message: string; appointment: AppointmentItem }>('/appointments', payload)
      return res.appointment
    } catch (err: any) {
      error.value = err.message || 'Failed to schedule consultation appointment'
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateAppointmentStatus = async (
    id: string,
    payload: { status: 'SCHEDULED' | 'IN_CONSULTATION' | 'COMPLETED' | 'CANCELLED'; notes?: string }
  ) => {
    loading.value = true
    error.value = null
    try {
      const res = await api.patch<{ message: string; appointment: AppointmentItem }>(`/appointments/${id}/status`, payload)
      return res.appointment
    } catch (err: any) {
      error.value = err.message || 'Failed to update appointment status'
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateBedAllocation = async (
    patientId: string,
    payload: { primaryWardId?: string; assignedBed?: string; patientType?: 'INPATIENT' | 'OUTPATIENT' }
  ) => {
    loading.value = true
    error.value = null
    try {
      const res = await api.patch<{ message: string; patient: ClerkPatientItem }>(
        `/clerk/patients/${patientId}/admission`,
        payload
      )
      return res.patient
    } catch (err: any) {
      error.value = err.message || 'Failed to update bed space allocation'
      throw err
    } finally {
      loading.value = false
    }
  }

  const fetchDoctors = async () => {
    try {
      const res = await api.get<{ doctors: DoctorItem[] }>('/clerk/doctors')
      doctors.value = res.doctors
      return res.doctors
    } catch (err: any) {
      error.value = err.message || 'Failed to load doctors list'
      throw err
    }
  }

  const fetchWards = async () => {
    try {
      const res = await api.get<{ wards: WardItem[] }>('/admin/wards')
      wards.value = res.wards
      return res.wards
    } catch (err: any) {
      error.value = err.message || 'Failed to load hospital wards'
      throw err
    }
  }

  return {
    loading,
    error,
    overview,
    patients,
    appointments,
    doctors,
    wards,
    pagination,
    fetchOverview,
    fetchPatients,
    fetchAppointments,
    createAppointment,
    updateAppointmentStatus,
    updateBedAllocation,
    fetchDoctors,
    fetchWards,
  }
}
