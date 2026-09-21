import { dbPrimary } from './clientPrimary.js';
import { dbAudit } from './clientAudit.js';
import {
  wards,
  users,
  patients,
  careTeams,
  outpatientAppointments,
  labResults,
  medicalDocuments,
} from './schemaPrimary.js';
import { auditBlocks } from './schemaAudit.js';
import argon2 from 'argon2';
import crypto from 'crypto';
import { sql } from 'drizzle-orm';
import { parseSyntheaFhirBundle } from './syntheaParser.js';

async function seed() {
  console.log('🌱 Starting Avecinna System Seeding...');

  // 0. Ensure audit_blocks table exists on isolated audit database (avecinna_audit_db)
  await dbAudit.execute(sql`
    CREATE TABLE IF NOT EXISTS audit_blocks (
      index_num BIGSERIAL PRIMARY KEY,
      block_hash VARCHAR(64) NOT NULL UNIQUE,
      prev_hash VARCHAR(64) NOT NULL,
      user_id VARCHAR(36) NOT NULL,
      patient_id VARCHAR(36),
      action VARCHAR(50) NOT NULL,
      active_ward VARCHAR(36) NOT NULL,
      relationship_type VARCHAR(20),
      payload_hash VARCHAR(64) NOT NULL,
      ip_address VARCHAR(45),
      user_agent VARCHAR(500),
      device_type VARCHAR(30),
      device_info VARCHAR(150),
      http_method VARCHAR(10),
      request_path VARCHAR(255),
      execution_mode VARCHAR(20) DEFAULT 'MODE_A' NOT NULL,
      request_id VARCHAR(64),
      merkle_root VARCHAR(64),
      signature VARCHAR(256),
      is_offline_sync BOOLEAN DEFAULT FALSE NOT NULL,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    );
    ALTER TABLE audit_blocks ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45);
    ALTER TABLE audit_blocks ADD COLUMN IF NOT EXISTS user_agent VARCHAR(500);
    ALTER TABLE audit_blocks ADD COLUMN IF NOT EXISTS device_type VARCHAR(30);
    ALTER TABLE audit_blocks ADD COLUMN IF NOT EXISTS device_info VARCHAR(150);
    ALTER TABLE audit_blocks ADD COLUMN IF NOT EXISTS http_method VARCHAR(10);
    ALTER TABLE audit_blocks ADD COLUMN IF NOT EXISTS request_path VARCHAR(255);
    ALTER TABLE audit_blocks ADD COLUMN IF NOT EXISTS execution_mode VARCHAR(20) DEFAULT 'MODE_A';
    ALTER TABLE audit_blocks ADD COLUMN IF NOT EXISTS request_id VARCHAR(64);
    CREATE INDEX IF NOT EXISTS idx_audit_blocks_hash ON audit_blocks(block_hash);
    CREATE INDEX IF NOT EXISTS idx_audit_blocks_user ON audit_blocks(user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_blocks_ip ON audit_blocks(ip_address);
    CREATE INDEX IF NOT EXISTS idx_audit_blocks_action ON audit_blocks(action);
  `);

  // 1. Create Hospital Wards
  const wardList = [
    { id: 'w-cardio', code: 'CARD', name: 'Cardiology Ward', department: 'Cardiovascular Services' },
    { id: 'w-peds', code: 'PEDS', name: 'Pediatrics Ward', department: 'Pediatric Care' },
    { id: 'w-emerg', code: 'EMERG', name: 'Emergency Ward', department: 'Trauma & Acute Care' },
    { id: 'w-gopd', code: 'GOPD', name: 'General Outpatient Clinic', department: 'Outpatient Services' },
    { id: 'w-icu', code: 'ICU', name: 'Intensive Care Unit', department: 'Critical Care' },
  ];

  for (const w of wardList) {
    await dbPrimary.insert(wards).values(w).onConflictDoNothing();
  }
  console.log('✅ Wards seeded.');

  // 2. Create Staff Users (All 7 Roles)
  const defaultPasswordHash = await argon2.hash('SecurePassword123!');

  const userList = [
    {
      id: 'u-admin-01',
      username: 'admin',
      passwordHash: defaultPasswordHash,
      fullName: 'System Administrator (IT)',
      role: 'ADMIN' as const,
      homeWardId: 'w-emerg',
    },
    {
      id: 'u-hou-cardio',
      username: 'hou_cardio',
      passwordHash: defaultPasswordHash,
      fullName: 'Dr. Folake Adebayo (Head of Unit)',
      role: 'HEAD_OF_UNIT' as const,
      homeWardId: 'w-cardio',
    },
    {
      id: 'u-doc-cardio',
      username: 'dr_cardio',
      passwordHash: defaultPasswordHash,
      fullName: 'Dr. Emeka Okafor (Cardiologist)',
      role: 'DOCTOR' as const,
      homeWardId: 'w-cardio',
    },
    {
      id: 'u-doc-peds',
      username: 'dr_peds',
      passwordHash: defaultPasswordHash,
      fullName: 'Dr. Amina Bello (Pediatrician)',
      role: 'DOCTOR' as const,
      homeWardId: 'w-peds',
    },
    {
      id: 'u-nurse-cardio',
      username: 'nurse_cardio',
      passwordHash: defaultPasswordHash,
      fullName: 'Nurse Blessing Nnamdi',
      role: 'NURSE' as const,
      homeWardId: 'w-cardio',
    },
    {
      id: 'u-clerk-01',
      username: 'clerk',
      passwordHash: defaultPasswordHash,
      fullName: 'Tunde Bakare (Records Clerk)',
      role: 'CLERK' as const,
      homeWardId: 'w-gopd',
    },
    {
      id: 'u-pharm-01',
      username: 'pharmacist',
      passwordHash: defaultPasswordHash,
      fullName: 'Pharm. Zainab Usman',
      role: 'PHARMACIST' as const,
      homeWardId: 'w-cardio',
    },
  ];

  for (const u of userList) {
    await dbPrimary.insert(users).values(u).onConflictDoNothing();
  }
  console.log('✅ Users seeded.');

  // Update Head of Unit for Cardiology Ward
  await dbPrimary
    .update(wards)
    .set({ headOfUnitId: 'u-hou-cardio' })
    .where(wards.id === 'w-cardio');

  // 3. Seed Sample Synthea & Manual Patients
  const sampleSyntheaBundle = {
    resourceType: 'Bundle',
    entry: [
      {
        resource: {
          resourceType: 'Patient',
          name: [{ given: ['Chinedu'], family: 'Ibrahim' }],
          gender: 'male',
          birthDate: '1985-04-12',
          identifier: [{ value: '99201' }],
        },
      },
      {
        resource: {
          resourceType: 'AllergyIntolerance',
          code: { coding: [{ display: 'Penicillin' }] },
        },
      },
      {
        resource: {
          resourceType: 'Condition',
          code: { coding: [{ display: 'Hypertension Stage 2' }] },
        },
      },
    ],
  };

  const parsedSyntheaPatient = parseSyntheaFhirBundle(sampleSyntheaBundle);

  const patientList = [
    {
      id: 'p-cardio-01',
      mrn: 'MRN-99201',
      fullName: parsedSyntheaPatient.fullName,
      dateOfBirth: parsedSyntheaPatient.dateOfBirth,
      gender: parsedSyntheaPatient.gender,
      patientType: 'INPATIENT' as const,
      genotype: 'AA',
      bloodGroup: 'O+',
      primaryWardId: 'w-cardio',
      assignedBed: 'Bed-C102',
      allergiesJson: parsedSyntheaPatient.allergies,
      emergencySummaryJson: {
        vitals: parsedSyntheaPatient.vitals,
        allergies: parsedSyntheaPatient.allergies,
        activeMedications: parsedSyntheaPatient.activeMedications,
        codeStatus: 'FULL_CODE',
      },
      fullRecordJson: {
        vitals: parsedSyntheaPatient.vitals,
        allergies: parsedSyntheaPatient.allergies,
        activeMedications: parsedSyntheaPatient.activeMedications,
        clinicalNotes: parsedSyntheaPatient.clinicalNotes,
        medicalHistory: ['Hypertension diagnosed 2021', 'No prior cardiac surgeries'],
      },
    },
    {
      id: 'p-peds-01',
      mrn: 'MRN-44102',
      fullName: 'Fatima Danjuma',
      dateOfBirth: '2018-09-25',
      gender: 'FEMALE',
      patientType: 'INPATIENT' as const,
      genotype: 'AS',
      bloodGroup: 'A+',
      primaryWardId: 'w-peds',
      assignedBed: 'Ped-B04',
      allergiesJson: ['Sulfonamides'],
      emergencySummaryJson: {
        vitals: { bp: '95/60', hr: 95, spo2: 99 },
        allergies: ['Sulfonamides'],
        activeMedications: [{ name: 'Amoxicillin', dosage: '250mg' }],
        codeStatus: 'FULL_CODE',
      },
      fullRecordJson: {
        vitals: { bp: '95/60', hr: 95, spo2: 99 },
        allergies: ['Sulfonamides'],
        activeMedications: [{ name: 'Amoxicillin', dosage: '250mg' }],
        clinicalNotes: [{ author: 'Dr. Amina Bello', note: 'Pediatric fever evaluation.', date: new Date().toISOString() }],
      },
    },
    {
      id: 'p-outpatient-01',
      mrn: 'MRN-77309',
      fullName: 'Oluwaseun Adeleke',
      dateOfBirth: '1992-11-03',
      gender: 'MALE',
      patientType: 'OUTPATIENT' as const,
      genotype: 'AA',
      bloodGroup: 'B+',
      primaryWardId: 'w-gopd',
      allergiesJson: ['None Known'],
      emergencySummaryJson: {
        vitals: { bp: '118/75', hr: 70, spo2: 98 },
        allergies: ['None Known'],
        activeMedications: [],
      },
      fullRecordJson: {
        vitals: { bp: '118/75', hr: 70, spo2: 98 },
        allergies: ['None Known'],
        activeMedications: [],
        clinicalNotes: [{ author: 'Dr. Emeka Okafor', note: 'Outpatient general health checkup.', date: new Date().toISOString() }],
      },
    },
  ];

  for (const p of patientList) {
    await dbPrimary.insert(patients).values(p).onConflictDoNothing();
  }
  console.log('✅ Synthea & Inpatient/Outpatient records seeded.');

  // 4. Create Care Team Relationships
  const careTeamList = [
    {
      id: 'ct-primary-cardio',
      patientId: 'p-cardio-01',
      staffId: 'u-doc-cardio',
      relationshipType: 'PRIMARY' as const,
    },
    {
      id: 'ct-primary-cardio-nurse',
      patientId: 'p-cardio-01',
      staffId: 'u-nurse-cardio',
      relationshipType: 'PRIMARY' as const,
    },
    {
      id: 'ct-primary-peds',
      patientId: 'p-peds-01',
      staffId: 'u-doc-peds',
      relationshipType: 'PRIMARY' as const,
    },
  ];

  for (const ct of careTeamList) {
    await dbPrimary.insert(careTeams).values(ct).onConflictDoNothing();
  }
  console.log('✅ Care Teams seeded.');

  // 5. Seed Genesis Block in Isolated Audit DB (avecinna_audit_db)
  const genesisHash = '0000000000000000000000000000000000000000000000000000000000000000';
  const genesisPayloadHash = crypto.createHash('sha256').update('GENESIS_BLOCK').digest('hex');
  const blockHash = crypto.createHash('sha256').update(`GENESIS|${genesisHash}|${genesisPayloadHash}`).digest('hex');

  await dbAudit
    .insert(auditBlocks)
    .values({
      indexNum: 1,
      blockHash,
      prevHash: genesisHash,
      userId: 'SYSTEM_INIT',
      action: 'GENESIS_BLOCK_INITIALIZED',
      activeWard: 'SYSTEM',
      payloadHash: genesisPayloadHash,
    })
    .onConflictDoNothing();

  await dbAudit.execute(
    sql`SELECT setval(pg_get_serial_sequence('audit_blocks', 'index_num'), COALESCE((SELECT MAX(index_num) FROM audit_blocks), 1));`
  );

  console.log('✅ Isolated Audit DB Genesis Block created.');
  console.log('🎉 Seeding completed successfully!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
