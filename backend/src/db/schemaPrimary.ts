import {
  pgTable,
  varchar,
  text,
  boolean,
  timestamp,
  json,
  bigint,
  date,
  pgEnum,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// Enums for Primary DB
export const roleEnum = pgEnum('user_role', [
  'DOCTOR',
  'NURSE',
  'PARAMEDIC',
  'CLERK',
  'PHARMACIST',
  'HEAD_OF_UNIT',
  'ADMIN',
]);

export const patientTypeEnum = pgEnum('patient_type', ['INPATIENT', 'OUTPATIENT']);

export const appointmentStatusEnum = pgEnum('appointment_status', [
  'SCHEDULED',
  'IN_CONSULTATION',
  'COMPLETED',
  'CANCELLED',
]);

export const careTeamRelationshipEnum = pgEnum('relationship_type', [
  'PRIMARY',
  'ON_CALL',
  'CONSULT',
  'OUTPATIENT_DOCTOR',
]);

export const labStatusEnum = pgEnum('lab_status', ['PENDING', 'PRELIMINARY', 'FINAL', 'AMENDED']);

export const alertSeverityEnum = pgEnum('alert_severity', ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);

export const alertStatusEnum = pgEnum('alert_status', [
  'OPEN',
  'INVESTIGATING',
  'RESOLVED',
  'FALSE_POSITIVE',
]);

// 1. Wards Table
export const wards = pgTable('wards', {
  id: varchar('id', { length: 36 }).primaryKey(),
  code: varchar('code', { length: 20 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  department: varchar('department', { length: 100 }).notNull(),
  headOfUnitId: varchar('head_of_unit_id', { length: 36 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 2. Users Table
export const users = pgTable('users', {
  id: varchar('id', { length: 36 }).primaryKey(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  fullName: varchar('full_name', { length: 100 }).notNull(),
  role: roleEnum('role').notNull(),
  homeWardId: varchar('home_ward_id', { length: 36 }).notNull().references(() => wards.id),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 3. Patients Table
export const patients = pgTable('patients', {
  id: varchar('id', { length: 36 }).primaryKey(),
  mrn: varchar('mrn', { length: 30 }).notNull().unique(),
  fullName: varchar('full_name', { length: 100 }).notNull(),
  dateOfBirth: date('date_of_birth').notNull(),
  gender: varchar('gender', { length: 15 }).notNull(),
  patientType: patientTypeEnum('patient_type').default('INPATIENT').notNull(),
  genotype: varchar('genotype', { length: 10 }),
  bloodGroup: varchar('blood_group', { length: 5 }),
  primaryWardId: varchar('primary_ward_id', { length: 36 }).references(() => wards.id),
  assignedBed: varchar('assigned_bed', { length: 30 }),
  allergiesJson: json('allergies_json'),
  emergencySummaryJson: json('emergency_summary_json'),
  fullRecordJson: json('full_record_json'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 4. Outpatient Appointments Table
export const outpatientAppointments = pgTable(
  'outpatient_appointments',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    patientId: varchar('patient_id', { length: 36 })
      .notNull()
      .references(() => patients.id, { onDelete: 'cascade' }),
    doctorId: varchar('doctor_id', { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    clinicWardId: varchar('clinic_ward_id', { length: 36 })
      .notNull()
      .references(() => wards.id),
    appointmentDate: timestamp('appointment_date').notNull(),
    status: appointmentStatusEnum('status').default('SCHEDULED').notNull(),
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_outpatient_appts').on(table.patientId, table.doctorId, table.appointmentDate),
  ]
);

// 5. Care Teams Table
export const careTeams = pgTable(
  'care_teams',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    patientId: varchar('patient_id', { length: 36 })
      .notNull()
      .references(() => patients.id, { onDelete: 'cascade' }),
    staffId: varchar('staff_id', { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    relationshipType: careTeamRelationshipEnum('relationship_type').notNull(),
    grantedByStaffId: varchar('granted_by_staff_id', { length: 36 }).references(() => users.id),
    grantReason: text('grant_reason'),
    expiresAt: timestamp('expires_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_care_teams_patient_staff').on(table.patientId, table.staffId),
    index('idx_care_teams_expiry').on(table.expiresAt),
  ]
);

// 6. Lab Results Table
export const labResults = pgTable(
  'lab_results',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    patientId: varchar('patient_id', { length: 36 })
      .notNull()
      .references(() => patients.id, { onDelete: 'cascade' }),
    orderingDoctorId: varchar('ordering_doctor_id', { length: 36 })
      .notNull()
      .references(() => users.id),
    labTechId: varchar('lab_tech_id', { length: 36 }).references(() => users.id),
    testName: varchar('test_name', { length: 100 }).notNull(),
    category: varchar('category', { length: 50 }).notNull(),
    resultDataJson: json('result_data_json'),
    attachmentUrl: varchar('attachment_url', { length: 512 }),
    documentHash: varchar('document_hash', { length: 64 }).notNull(),
    status: labStatusEnum('status').default('FINAL').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('idx_lab_results_patient').on(table.patientId)]
);

// 7. Medical Documents Table
export const medicalDocuments = pgTable(
  'medical_documents',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    patientId: varchar('patient_id', { length: 36 })
      .notNull()
      .references(() => patients.id, { onDelete: 'cascade' }),
    uploaderId: varchar('uploader_id', { length: 36 })
      .notNull()
      .references(() => users.id),
    documentType: varchar('document_type', { length: 50 }).notNull(),
    title: varchar('title', { length: 150 }).notNull(),
    fileUrl: varchar('file_url', { length: 512 }).notNull(),
    fileSizeBytes: bigint('file_size_bytes', { mode: 'number' }).notNull(),
    documentHash: varchar('document_hash', { length: 64 }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('idx_med_docs_patient').on(table.patientId)]
);

// 8. Sessions Table
export const sessions = pgTable(
  'sessions',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    userId: varchar('user_id', { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    activeWardId: varchar('active_ward_id', { length: 36 })
      .notNull()
      .references(() => wards.id),
    authToken: varchar('auth_token', { length: 512 }).notNull().unique(),
    shiftStart: timestamp('shift_start').notNull(),
    shiftEnd: timestamp('shift_end').notNull(),
    ipAddress: varchar('ip_address', { length: 45 }),
    deviceId: varchar('device_id', { length: 100 }).notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [uniqueIndex('idx_sessions_token').on(table.authToken)]
);

// 9. Security Alerts Table
export const securityAlerts = pgTable('security_alerts', {
  id: varchar('id', { length: 36 }).primaryKey(),
  alertType: varchar('alert_type', { length: 50 }).notNull(),
  severity: alertSeverityEnum('severity').notNull(),
  userId: varchar('user_id', { length: 36 }).references(() => users.id),
  patientId: varchar('patient_id', { length: 36 }).references(() => patients.id),
  description: text('description').notNull(),
  rawMetadataJson: json('raw_metadata_json'),
  status: alertStatusEnum('status').default('OPEN').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 10. Ward Staff Rosters Table
export const wardRosters = pgTable(
  'ward_rosters',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    wardId: varchar('ward_id', { length: 36 })
      .notNull()
      .references(() => wards.id),
    staffId: varchar('staff_id', { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    shiftType: varchar('shift_type', { length: 20 }).notNull().default('DAY'),
    shiftDate: varchar('shift_date', { length: 15 }).notNull(),
    startTime: varchar('start_time', { length: 10 }).notNull().default('08:00'),
    endTime: varchar('end_time', { length: 10 }).notNull().default('20:00'),
    status: varchar('status', { length: 20 }).notNull().default('SCHEDULED'),
    notes: text('notes'),
    assignedBy: varchar('assigned_by', { length: 36 }).references(() => users.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_ward_rosters_ward').on(table.wardId, table.shiftDate),
    index('idx_ward_rosters_staff').on(table.staffId, table.shiftDate),
  ]
);
