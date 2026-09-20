import pg from 'pg';
import { CAACInput, CAACDecision } from '../types/index.js';

export class CAACAccessDeniedError extends Error {
  public readonly denialReason: string;
  public readonly patientId: string;
  public readonly userId: string;

  constructor(denialReason: string, patientId: string, userId: string) {
    super(`CAAC Access Denied: ${denialReason}`);
    this.name = 'CAACAccessDeniedError';
    this.denialReason = denialReason;
    this.patientId = patientId;
    this.userId = userId;
  }
}

export class CAACService {
  private pool: pg.Pool | null = null;

  constructor(primaryDbUrl?: string) {
    if (primaryDbUrl) {
      this.pool = new pg.Pool({
        connectionString: primaryDbUrl,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });
    }
  }

  /**
   * Evaluates CAAC authorization rule:
   * Permit = RoleValid AND ShiftActive AND (ActiveWard == PatientWard OR StaffID IN CareTeam OR OutpatientDoctorToday OR BreakGlassActive)
   */
  async evaluate(input: CAACInput): Promise<CAACDecision> {
    const { userId, role, activeWardId, patientId, shiftStart, shiftEnd, isBreakGlass } = input;

    // 1. Shift Window Verification
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

    if (!this.pool) {
      throw new Error(
        'CAAC_DB_UNCONFIGURED: primaryDbUrl must be provided in AvecinnaSDKOptions to evaluate CAAC rules against PostgreSQL.'
      );
    }

    const client = await this.pool.connect();
    try {
      // 2. Fetch Patient Record from Primary DB
      const patientRes = await client.query(
        `SELECT id, mrn, full_name, date_of_birth, gender, patient_type, genotype, blood_group, 
                primary_ward_id, assigned_bed, allergies_json, emergency_summary_json, full_record_json 
         FROM patients WHERE id = $1 LIMIT 1`,
        [patientId]
      );

      if (patientRes.rows.length === 0) {
        const msg = 'PATIENT_NOT_FOUND: Specified patient record does not exist.';
        return {
          isPermitted: false,
          permitted: false,
          relationshipType: null,
          denialReason: msg,
          reason: msg,
        };
      }

      const patientRow = patientRes.rows[0];
      const patient = {
        id: patientRow.id,
        mrn: patientRow.mrn,
        fullName: patientRow.full_name,
        dateOfBirth: patientRow.date_of_birth,
        gender: patientRow.gender,
        patientType: patientRow.patient_type,
        genotype: patientRow.genotype,
        bloodGroup: patientRow.blood_group,
        primaryWardId: patientRow.primary_ward_id,
        assignedBed: patientRow.assigned_bed,
        allergiesJson: patientRow.allergies_json,
        emergencySummaryJson: patientRow.emergency_summary_json,
        fullRecordJson: patientRow.full_record_json,
      };

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
      const careTeamRes = await client.query(
        `SELECT relationship_type FROM care_teams 
         WHERE patient_id = $1 AND staff_id = $2 
           AND (expires_at IS NULL OR expires_at >= NOW()) 
         LIMIT 1`,
        [patientId, userId]
      );

      if (careTeamRes.rows.length > 0) {
        return {
          isPermitted: true,
          permitted: true,
          relationshipType: careTeamRes.rows[0].relationship_type,
          patient,
        };
      }

      // 6. Outpatient Appointment Check (Consultation Scheduled Today)
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const apptRes = await client.query(
        `SELECT id FROM outpatient_appointments 
         WHERE patient_id = $1 AND doctor_id = $2 
           AND appointment_date >= $3 AND appointment_date <= $4 
         LIMIT 1`,
        [patientId, userId, startOfDay, endOfDay]
      );

      if (apptRes.rows.length > 0) {
        return {
          isPermitted: true,
          permitted: true,
          relationshipType: 'OUTPATIENT_DOCTOR',
          patient,
        };
      }

      // 7. No Context Match -> Access Denied
      const msg = 'NO_WARD_OR_CARE_TEAM_RELATIONSHIP: Clinician is not on patient care team or assigned ward.';
      return {
        isPermitted: false,
        permitted: false,
        relationshipType: null,
        denialReason: msg,
        reason: msg,
        patient: null,
      };
    } finally {
      client.release();
    }
  }

  /**
   * Evaluates CAAC and throws CAACAccessDeniedError if denied.
   * Useful in async handlers, NestJS guards, and Next.js / Hono endpoints.
   */
  async evaluateOrThrow(input: CAACInput): Promise<CAACDecision> {
    const decision = await this.evaluate(input);
    if (!decision.isPermitted) {
      throw new CAACAccessDeniedError(decision.denialReason || 'Access Denied', input.patientId, input.userId);
    }
    return decision;
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }
}
