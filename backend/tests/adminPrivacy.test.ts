import { describe, it, expect } from 'vitest';
import { filterPatientRecordByRole } from '../src/services/dtoMasker.js';

describe('Phase 2 System Admin Privacy Redaction Security Tests', () => {
  const mockRawPatient = {
    id: 'p-secret-01',
    mrn: 'MRN-CONF-999',
    fullName: 'Confidential Patient',
    dateOfBirth: '1975-08-20',
    gender: 'MALE',
    patientType: 'INPATIENT',
    primaryWardId: 'w-cardio',
    assignedBed: 'Bed-VIP-01',
    allergiesJson: ['Penicillin', 'Codeine'],
    emergencySummaryJson: {
      vitals: { bp: '140/90', hr: 88 },
      allergies: ['Penicillin'],
      activeMedications: [{ name: 'Metoprolol', dosage: '50mg' }],
    },
    fullRecordJson: {
      vitals: { bp: '140/90', hr: 88 },
      clinicalNotes: [{ author: 'Dr. Okafor', note: 'Highly confidential psychiatric diagnosis.', date: '2026-09-15' }],
    },
  };

  it('should STRICTLY REDACT all clinical data when System Admin (ADMIN) queries a patient record', () => {
    const masked: any = filterPatientRecordByRole(mockRawPatient, 'ADMIN');

    // Demographics and bed assignment ARE accessible to System Admin for administrative duties
    expect(masked.id).toBe('p-secret-01');
    expect(masked.mrn).toBe('MRN-CONF-999');
    expect(masked.fullName).toBe('Confidential Patient');
    expect(masked.assignedBed).toBe('Bed-VIP-01');

    // Clinical content MUST be explicitly redacted
    expect(masked.allergies).toBe('[REDACTED - ADMIN PRIVACY RESTRICTION]');
    expect(masked.vitals).toBe('[REDACTED - ADMIN PRIVACY RESTRICTION]');
    expect(masked.activeMedications).toBe('[REDACTED - ADMIN PRIVACY RESTRICTION]');
    expect(masked.clinicalNotes).toBe('[REDACTED - ADMIN PRIVACY RESTRICTION]');
    expect(masked.fullRecord).toBe('[REDACTED - ADMIN PRIVACY RESTRICTION]');
    expect(masked.adminPrivacyNotice).toContain('strictly prohibited from viewing patient clinical data');
  });
});
