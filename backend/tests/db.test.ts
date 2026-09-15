import { describe, it, expect } from 'vitest';
import { parseSyntheaFhirBundle } from '../src/db/syntheaParser.js';

describe('Phase 1 Foundation & Synthea Parser Unit Tests', () => {
  it('should correctly parse Synthea FHIR Patient Bundle into Avecinna schema', () => {
    const mockSyntheaBundle = {
      resourceType: 'Bundle',
      entry: [
        {
          resource: {
            resourceType: 'Patient',
            name: [{ given: ['Adebayo'], family: 'Okwu' }],
            gender: 'male',
            birthDate: '1982-06-15',
            identifier: [{ value: '88301' }],
          },
        },
        {
          resource: {
            resourceType: 'AllergyIntolerance',
            code: { coding: [{ display: 'Aspirin' }] },
          },
        },
        {
          resource: {
            resourceType: 'Observation',
            code: { coding: [{ display: 'Heart rate' }] },
            valueQuantity: { value: 78 },
          },
        },
      ],
    };

    const parsed = parseSyntheaFhirBundle(mockSyntheaBundle);

    expect(parsed.fullName).toBe('Adebayo Okwu');
    expect(parsed.gender).toBe('MALE');
    expect(parsed.dateOfBirth).toBe('1982-06-15');
    expect(parsed.allergies).toContain('Aspirin');
    expect(parsed.vitals.hr).toBe(78);
    expect(parsed.mrn).toContain('MRN-SYN-88301');
  });

  it('should generate valid fallbacks when Synthea bundle fields are missing', () => {
    const emptyBundle = { resourceType: 'Bundle', entry: [] };
    const parsed = parseSyntheaFhirBundle(emptyBundle);

    expect(parsed.fullName).toBe('Synthetic Patient');
    expect(parsed.allergies).toContain('No Known Drug Allergies (NKDA)');
    expect(parsed.vitals.bp).toBe('120/80');
    expect(parsed.genotype).toBeDefined();
    expect(parsed.bloodGroup).toBeDefined();
  });
});
