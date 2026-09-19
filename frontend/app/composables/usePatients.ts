import { ref } from 'vue'
import { useApi } from './useApi'

export interface Patient {
  id: string
  mrn: string
  fullName: string
  dateOfBirth: string
  gender: string
  patientType?: 'INPATIENT' | 'OUTPATIENT'
  genotype?: string | null
  bloodGroup?: string | null
  primaryWardId?: string | null
  assignedBed?: string | null
  allergies?: any
  vitals?: any
  activeMedications?: any
  clinicalNotes?: any
  medicalHistory?: any
  fullRecord?: any
  medicationHistory?: any
  adminPrivacyNotice?: string
  isTier1BreakGlass?: boolean
  relationshipType?: string
  isCareTeam?: boolean
  careTeamGrant?: any
}

export interface MedicalDocument {
  id: string
  patientId: string
  uploaderId: string
  documentType: string
  title: string
  fileUrl: string
  fileSizeBytes: number
  documentHash: string
  createdAt: string
}

export interface LabResult {
  id: string
  patientId: string
  orderingDoctorId: string
  labTechId?: string | null
  testName: string
  category: string
  resultDataJson: Record<string, any>
  attachmentUrl?: string | null
  documentHash: string
  status: 'PENDING' | 'PRELIMINARY' | 'FINAL' | 'AMENDED'
  createdAt: string
}

export const usePatients = () => {
  const api = useApi()
  const patients = ref<Patient[]>([])
  const currentPatient = ref<Patient | null>(null)
  const documents = ref<MedicalDocument[]>([])
  const labResults = ref<LabResult[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const fetchPatients = async (params: { scope?: string } = {}) => {
    loading.value = true
    error.value = null
    try {
      const query = new URLSearchParams()
      if (params.scope && params.scope !== 'all') {
        query.append('scope', params.scope)
      }
      const qs = query.toString() ? `?${query.toString()}` : ''
      const res = await api.get<{ activeWardId: string; count: number; patients: Patient[] }>(`/patients${qs}`)
      patients.value = res.patients
      return res.patients
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch patients directory'
      throw err
    } finally {
      loading.value = false
    }
  }

  const fetchPatientById = async (id: string) => {
    loading.value = true
    error.value = null
    try {
      const res = await api.get<{ patient: Patient; relationshipType?: string }>(`/patients/${id}`)
      currentPatient.value = res.patient
      return res.patient
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch patient details'
      throw err
    } finally {
      loading.value = false
    }
  }

  const registerPatient = async (payload: {
    mrn: string
    fullName: string
    dateOfBirth: string
    gender: string
    patientType?: 'INPATIENT' | 'OUTPATIENT'
    genotype?: string
    bloodGroup?: string
    primaryWardId: string
    assignedBed?: string
  }) => {
    loading.value = true
    error.value = null
    try {
      const res = await api.post<{ message: string; patient: Patient }>('/patients', payload)
      return res.patient
    } catch (err: any) {
      error.value = err.message || 'Failed to register patient'
      throw err
    } finally {
      loading.value = false
    }
  }

  const fetchDocuments = async (patientId: string) => {
    try {
      const res = await api.get<{ documents: MedicalDocument[] }>(`/patients/${patientId}/documents`)
      documents.value = res.documents
      return res.documents
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch medical documents'
      throw err
    }
  }

  const uploadDocument = async (
    patientId: string,
    payload: { documentType: string; title: string; fileContentBase64: string; fileUrl?: string }
  ) => {
    try {
      const res = await api.post<{ message: string; document: MedicalDocument }>(`/patients/${patientId}/documents`, payload)
      await fetchDocuments(patientId)
      return res.document
    } catch (err: any) {
      error.value = err.message || 'Failed to upload document'
      throw err
    }
  }

  const fetchLabResults = async (patientId: string) => {
    try {
      const res = await api.get<{ labResults: LabResult[] }>(`/patients/${patientId}/lab-results`)
      labResults.value = res.labResults
      return res.labResults
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch lab results'
      throw err
    }
  }

  const addLabResult = async (
    patientId: string,
    payload: {
      testName: string
      category: string
      resultDataJson: Record<string, any>
      attachmentBase64?: string
      status?: 'PENDING' | 'PRELIMINARY' | 'FINAL' | 'AMENDED'
    }
  ) => {
    try {
      const res = await api.post<{ message: string; labResult: LabResult }>(`/patients/${patientId}/lab-results`, payload)
      await fetchLabResults(patientId)
      return res.labResult
    } catch (err: any) {
      error.value = err.message || 'Failed to create lab result'
      throw err
    }
  }

  return {
    patients,
    currentPatient,
    documents,
    labResults,
    loading,
    error,
    fetchPatients,
    fetchPatientById,
    registerPatient,
    fetchDocuments,
    uploadDocument,
    fetchLabResults,
    addLabResult,
  }
}
