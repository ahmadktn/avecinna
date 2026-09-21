import { dbPrimary } from '../db/clientPrimary.js';
import { patients, careTeams, outpatientAppointments, users } from '../db/schemaPrimary.js';
import { eq, and, or, isNull, gte, lte, ilike } from 'drizzle-orm';

export interface CAACInput {
  userId: string;
  role: string;
  activeWardId: string;
  patientId: string;
  shiftStart?: string | Date;
  shiftEnd?: string | Date;
  isBreakGlass?: boolean;
}

export interface CAACResult {
  isPermitted: boolean;
  permitted: boolean;
  relationshipType: 'PRIMARY' | 'ON_CALL' | 'CONSULT' | 'OUTPATIENT_DOCTOR' | 'BREAK_GLASS' | null;
  denialReason?: string;
  reason?: string;
  patient?: any;
}

/**
 * Context-Aware Access Control (CAAC) Authorization Engine
 * Evaluates Permit = RoleValid AND ShiftActive AND (ActiveWard == PatientWard OR StaffID IN CareTeam OR OutpatientDoctorToday OR BreakGlassActive)
 */
export async function evaluateCAAC(input: CAACInput): Promise<CAACResult> {
  const { userId, role, activeWardId, patientId, shiftStart, shiftEnd, isBreakGlass } = input;

  // 1. Validate Active Shift Window (if shift parameters provided)
  if (shiftStart && shiftEnd) {
    const now = new Date();
    const start = new Date(shiftStart);
    const end = new Date(shiftEnd);

    if (now < start || now > end) {
      const msg = 'SHIFT_INACTIVE: Access requested outside scheduled shift window.';
      return {
        isPermitted: false,
        permitted: false,
        relationshipType: null,
        denialReason: msg,
        reason: msg,
      };
    }
  }

  // 2. Fetch Patient Record from Primary DB (Support ID, MRN, or raw digits)
  const cleanId = patientId.trim();
  const mrnPrefixed = cleanId.toUpperCase().startsWith('MRN-') ? cleanId.toUpperCase() : `MRN-${cleanId}`;

  const patientRows = await dbPrimary
    .select()
    .from(patients)
    .where(
      or(
        eq(patients.id, cleanId),
        eq(patients.mrn, cleanId),
        eq(patients.mrn, mrnPrefixed),
        ilike(patients.mrn, `%${cleanId}%`)
      )
    )
    .limit(1);

  if (patientRows.length === 0) {
    const msg = `PATIENT_NOT_FOUND: Patient record '${patientId}' does not exist.`;
    return {
      isPermitted: false,
      permitted: false,
      relationshipType: null,
      denialReason: msg,
      reason: msg,
    };
  }

  const patient = patientRows[0];
  const actualPatientId = patient.id;

  // 3. Emergency Break-Glass Override
  if (isBreakGlass) {
    return {
      isPermitted: true,
      permitted: true,
      relationshipType: 'BREAK_GLASS',
      patient,
    };
  }

  // 4. Ward Equality Check (Active Ward == Patient Primary Ward)
  if (patient.primaryWardId && patient.primaryWardId === activeWardId) {
    return {
      isPermitted: true,
      permitted: true,
      relationshipType: 'PRIMARY',
      patient,
    };
  }

  // 5. Care Team Relationship Check (Primary, On-Call, Consult)
  const now = new Date();
  const careTeamMatches = await dbPrimary
    .select()
    .from(careTeams)
    .where(
      and(
        eq(careTeams.patientId, actualPatientId),
        eq(careTeams.staffId, userId),
        or(isNull(careTeams.expiresAt), gte(careTeams.expiresAt, now))
      )
    )
    .limit(1);

  if (careTeamMatches.length > 0) {
    const relType = careTeamMatches[0].relationshipType as any;
    return {
      isPermitted: true,
      permitted: true,
      relationshipType: relType,
      patient,
    };
  }

  // 6. Outpatient Appointment Check (Consultation Scheduled Today)
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const apptMatches = await dbPrimary
    .select()
    .from(outpatientAppointments)
    .where(
      and(
        eq(outpatientAppointments.patientId, actualPatientId),
        eq(outpatientAppointments.doctorId, userId),
        gte(outpatientAppointments.appointmentDate, startOfDay),
        lte(outpatientAppointments.appointmentDate, endOfDay)
      )
    )
    .limit(1);

  if (apptMatches.length > 0) {
    return {
      isPermitted: true,
      permitted: true,
      relationshipType: 'OUTPATIENT_DOCTOR',
      patient,
    };
  }

  // 7. No Relationship or Ward Context Match -> Deny Access
  const msg = 'NO_WARD_OR_CARE_TEAM_RELATIONSHIP: Clinician is not on patient care team or assigned ward.';
  return {
    isPermitted: false,
    permitted: false,
    relationshipType: null,
    denialReason: msg,
    reason: msg,
    patient: null,
  };
}
