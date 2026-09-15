import { describe, it, expect, beforeAll } from 'vitest';
import { evaluateCAAC } from '../src/services/caacEngine.js';

describe('Phase 2 CAAC Authorization Engine Security Tests (OWASP API1 BOLA/IDOR)', () => {
  const shiftStart = new Date(Date.now() - 3600000).toISOString(); // 1 hour ago
  const shiftEnd = new Date(Date.now() + 36000000).toISOString(); // 10 hours from now

  it('should PERMIT access when clinician active ward matches patient primary ward', async () => {
    const result = await evaluateCAAC({
      userId: 'u-doc-cardio',
      role: 'DOCTOR',
      activeWardId: 'w-cardio',
      patientId: 'p-cardio-01',
      shiftStart,
      shiftEnd,
    });

    expect(result.isPermitted).toBe(true);
    expect(result.relationshipType).toBe('PRIMARY');
    expect(result.patient).toBeDefined();
    expect(result.patient.id).toBe('p-cardio-01');
  });

  it('should DENY access (BOLA 403) when doctor attempts to access a patient in another ward without a care team consult', async () => {
    // Dr. Cardio attempting to access Pediatrics patient p-peds-01 while active ward is Cardiology
    const result = await evaluateCAAC({
      userId: 'u-doc-cardio',
      role: 'DOCTOR',
      activeWardId: 'w-cardio',
      patientId: 'p-peds-01',
      shiftStart,
      shiftEnd,
    });

    expect(result.isPermitted).toBe(false);
    expect(result.relationshipType).toBeNull();
    expect(result.denialReason).toContain('NO_WARD_OR_CARE_TEAM_RELATIONSHIP');
  });

  it('should DENY access when request is made outside scheduled shift window', async () => {
    const expiredShiftStart = new Date(Date.now() - 72000000).toISOString(); // 20 hours ago
    const expiredShiftEnd = new Date(Date.now() - 36000000).toISOString(); // 10 hours ago

    const result = await evaluateCAAC({
      userId: 'u-doc-cardio',
      role: 'DOCTOR',
      activeWardId: 'w-cardio',
      patientId: 'p-cardio-01',
      shiftStart: expiredShiftStart,
      shiftEnd: expiredShiftEnd,
    });

    expect(result.isPermitted).toBe(false);
    expect(result.denialReason).toContain('SHIFT_INACTIVE');
  });

  it('should PERMIT Break-Glass emergency access regardless of ward membership', async () => {
    const result = await evaluateCAAC({
      userId: 'u-doc-cardio',
      role: 'DOCTOR',
      activeWardId: 'w-cardio',
      patientId: 'p-peds-01',
      isBreakGlass: true,
    });

    expect(result.isPermitted).toBe(true);
    expect(result.relationshipType).toBe('BREAK_GLASS');
  });
});
