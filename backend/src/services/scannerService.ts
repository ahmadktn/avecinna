import { dbPrimary } from '../db/clientPrimary.js';
import { securityAlerts } from '../db/schemaPrimary.js';
import crypto from 'crypto';

export interface AlertInput {
  alertType:
    | 'EXPIRED_CONSULT_ACCESS'
    | 'WARD_JUMP_SUSPICION'
    | 'CLERK_UNAUTHORIZED_VIEW'
    | 'EXCESSIVE_BREAK_GLASS'
    | 'ADMIN_CLINICAL_VIEW_ATTEMPT';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  userId?: string;
  patientId?: string;
  description: string;
  metadata?: any;
}

/**
 * Suspicious Access Rule Scanner Service
 * Automatically records security alerts in avecinna_primary_db for administrative review.
 */
export async function createSecurityAlert(input: AlertInput): Promise<string> {
  const alertId = crypto.randomUUID();

  await dbPrimary.insert(securityAlerts).values({
    id: alertId,
    alertType: input.alertType,
    severity: input.severity,
    userId: input.userId,
    patientId: input.patientId,
    description: input.description,
    rawMetadataJson: input.metadata || {},
    status: 'OPEN',
  });

  return alertId;
}
