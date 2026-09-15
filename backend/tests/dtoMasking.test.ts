import { describe, it, expect } from 'vitest';
import { filterPatientRecordByRole } from '../src/services/dtoMasker.js';

describe('Phase 2 Role DTO Masking Security Tests (OWASP API3 Excessive Data Exposure)', () => {
  const mockRawPatient = {
    id: 'p-test-01',
    mrn: 'MRN-TEST-100',
    fullName: 'Test Patient',
    dateOfBirth: '1990-01-01',
    gender: 'FEMALE',
    patientType: 'INPATIENT',
    genotype: 'AA',
    bloodGroup: 'O+',
    primaryWardId: 'w-cardio',
    assignedBed: 'Bed-101',
    allergiesJson: ['Penicillin'],
    emergencySummaryJson: {
      vitals: { bp: '120/80', hr: 72 },
      allergies: ['Penicillin'],
      activeMedications: [{ name: 'Aspirin', dosage: '100mg' }],
    },
    fullRecordJson: {
      vitals: { bp: '120/80', hr: 72 },
      allergies: ['Penicillin'],
      activeMedications: [{ name: 'Aspirin', dosage: '100mg' }],
      clinicalNotes: [{ author: 'Dr. Okafor', note: 'Sensitive psychiatric and cardiac notes.', date: '2026-09-15' }],
      medicalHistory: ['Prior cardiac episode in 2022'],
    },
  };

  it('should return full clinical record for DOCTOR role', () => {
    const masked = filterPatientRecordByRole(mockRawPatient, 'DOCTOR');

    expect(masked.id).toBe('p-test-01');
    expect(masked.allergies).toBeDefined();
    expect(masked.clinicalNotes).toBeDefined();
    expect(masked.fullRecord).toBeDefined();
  });

  it('should mask clinical notes and long-term history for NURSE role', () => {
    const masked: any = filterPatientRecordByRole(mockRawPatient, 'NURSE');

    expect(masked.fullName).toBe('Test Patient');
    expect(masked.vitals).toBeDefined();
    expect(masked.activeMedications).toBeDefined();
    // Clinical notes and long-term history MUST be undefined for nurses
    expect(masked.clinicalNotes).toBeUndefined();
    expect(masked.fullRecord).toBeUndefined();
  });

  it('should restrict CLERK role strictly to demographic & bed assignment data', () => {
    const masked: any = filterPatientRecordByRole(mockRawPatient, 'CLERK');

    expect(masked.fullName).toBe('Test Patient');
    expect(masked.mrn).toBe('MRN-TEST-100');
    expect(masked.assignedBed).toBe('Bed-101');
    // Clinical fields MUST be undefined for clerks
    expect(masked.vitals).toBeUndefined();
    expect(masked.allergies).toBeUndefined();
    expect(masked.activeMedications).toBeUndefined();
    expect(masked.clinicalNotes).toBeUndefined();
  });

  it('should restrict PHARMACIST role strictly to medication history & allergies', () => {
    const masked: any = filterPatientRecordByRole(mockRawPatient, 'PHARMACIST');

    expect(masked.fullName).toBe('Test Patient');
    expect(masked.allergies).toBeDefined();
    expect(masked.activeMedications).toBeDefined();
    // Vitals and clinical notes MUST be undefined for pharmacists
    expect(masked.vitals).toBeUndefined();
    expect(masked.clinicalNotes).toBeUndefined();
  });
});
