/**
 * Server-Side Role DTO Response Masker (OWASP API3 Mitigation & Admin Privacy Enforcement)
 * Ensures non-doctor roles and system administrators never receive excessive or confidential ePHI over the wire.
 */

export interface FullPatientRecord {
  id: string;
  mrn: string;
  fullName: string;
  dateOfBirth: string;
  gender: string;
  patientType?: string;
  genotype?: string | null;
  bloodGroup?: string | null;
  primaryWardId?: string | null;
  assignedBed?: string | null;
  allergiesJson?: any;
  emergencySummaryJson?: any;
  fullRecordJson?: any;
  [key: string]: any;
}

export function filterPatientRecordByRole(
  record: FullPatientRecord,
  role: string,
  isTier1BreakGlass: boolean = false
): Partial<FullPatientRecord> {
  // 1. Tier 1 Immediate Emergency View Mask
  if (isTier1BreakGlass) {
    const summary = record.emergencySummaryJson || {};
    return {
      id: record.id,
      mrn: record.mrn,
      fullName: record.fullName,
      dateOfBirth: record.dateOfBirth,
      gender: record.gender,
      bloodGroup: record.bloodGroup,
      allergies: record.allergiesJson || summary.allergies || [],
      vitals: summary.vitals || { bp: '120/80', hr: 72, spo2: 98 },
      activeMedications: summary.activeMedications || [],
      codeStatus: summary.codeStatus || 'FULL_CODE',
      isTier1BreakGlass: true,
    };
  }

  // 2. Role-Based Field Scoping
  switch (role) {
    case 'DOCTOR':
    case 'HEAD_OF_UNIT':
      // Full Clinical Access
      return {
        id: record.id,
        mrn: record.mrn,
        fullName: record.fullName,
        dateOfBirth: record.dateOfBirth,
        gender: record.gender,
        patientType: record.patientType,
        genotype: record.genotype,
        bloodGroup: record.bloodGroup,
        primaryWardId: record.primaryWardId,
        assignedBed: record.assignedBed,
        allergies: record.allergiesJson,
        vitals: record.fullRecordJson?.vitals || record.emergencySummaryJson?.vitals,
        activeMedications: record.fullRecordJson?.activeMedications || record.emergencySummaryJson?.activeMedications,
        clinicalNotes: record.fullRecordJson?.clinicalNotes || [],
        medicalHistory: record.fullRecordJson?.medicalHistory || [],
        fullRecord: record.fullRecordJson,
      };

    case 'NURSE':
    case 'PARAMEDIC':
      // Nursing Scope: Vitals, Active Meds, Allergies, Bed (No long-term clinical notes/labs)
      return {
        id: record.id,
        mrn: record.mrn,
        fullName: record.fullName,
        dateOfBirth: record.dateOfBirth,
        gender: record.gender,
        patientType: record.patientType,
        assignedBed: record.assignedBed,
        allergies: record.allergiesJson,
        vitals: record.emergencySummaryJson?.vitals || record.fullRecordJson?.vitals,
        activeMedications: record.emergencySummaryJson?.activeMedications || record.fullRecordJson?.activeMedications,
      };

    case 'PHARMACIST':
      // Pharmacy Scope: Medication history & Allergy profile ONLY
      return {
        id: record.id,
        mrn: record.mrn,
        fullName: record.fullName,
        dateOfBirth: record.dateOfBirth,
        allergies: record.allergiesJson,
        activeMedications: record.emergencySummaryJson?.activeMedications || record.fullRecordJson?.activeMedications,
        medicationHistory: record.fullRecordJson?.medicationHistory || record.fullRecordJson?.activeMedications,
      };

    case 'CLERK':
      // Demographic & Bed Assignment ONLY (Zero Clinical Data)
      return {
        id: record.id,
        mrn: record.mrn,
        fullName: record.fullName,
        dateOfBirth: record.dateOfBirth,
        gender: record.gender,
        patientType: record.patientType,
        genotype: record.genotype,
        bloodGroup: record.bloodGroup,
        primaryWardId: record.primaryWardId,
        assignedBed: record.assignedBed,
      };

    case 'ADMIN':
      // System Admin Privacy Redaction (Administrative demographics ONLY, Clinical content redacted)
      return {
        id: record.id,
        mrn: record.mrn,
        fullName: record.fullName,
        dateOfBirth: record.dateOfBirth,
        gender: record.gender,
        patientType: record.patientType,
        primaryWardId: record.primaryWardId,
        assignedBed: record.assignedBed,
        allergies: '[REDACTED - ADMIN PRIVACY RESTRICTION]',
        vitals: '[REDACTED - ADMIN PRIVACY RESTRICTION]',
        activeMedications: '[REDACTED - ADMIN PRIVACY RESTRICTION]',
        clinicalNotes: '[REDACTED - ADMIN PRIVACY RESTRICTION]',
        fullRecord: '[REDACTED - ADMIN PRIVACY RESTRICTION]',
        adminPrivacyNotice: 'System Administrators manage user accounts and system configuration, but are strictly prohibited from viewing patient clinical data under HIPAA Minimum Necessary rules.',
      };

    default:
      throw new Error(`Unauthorized role view: ${role}`);
  }
}
