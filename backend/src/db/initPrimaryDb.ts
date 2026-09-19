import { dbPrimary } from './clientPrimary.js';
import { sql } from 'drizzle-orm';
import argon2 from 'argon2';

export async function initPrimaryDb() {
  // 1. Create Enums if not exist
  await dbPrimary.execute(sql`
    DO $$ BEGIN
      CREATE TYPE user_role AS ENUM ('DOCTOR', 'NURSE', 'PARAMEDIC', 'CLERK', 'PHARMACIST', 'HEAD_OF_UNIT', 'ADMIN');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE patient_type AS ENUM ('INPATIENT', 'OUTPATIENT');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE appointment_status AS ENUM ('SCHEDULED', 'IN_CONSULTATION', 'COMPLETED', 'CANCELLED');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE relationship_type AS ENUM ('PRIMARY', 'ON_CALL', 'CONSULT', 'OUTPATIENT_DOCTOR');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE lab_status AS ENUM ('PENDING', 'PRELIMINARY', 'FINAL', 'AMENDED');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE alert_severity AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE alert_status AS ENUM ('OPEN', 'INVESTIGATING', 'RESOLVED', 'FALSE_POSITIVE');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  // 2. Create Tables & Indexes if not exist
  await dbPrimary.execute(sql`
    -- Wards
    CREATE TABLE IF NOT EXISTS wards (
      id VARCHAR(36) PRIMARY KEY,
      code VARCHAR(20) NOT NULL UNIQUE,
      name VARCHAR(100) NOT NULL,
      department VARCHAR(100) NOT NULL,
      head_of_unit_id VARCHAR(36),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );

    -- Users
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(36) PRIMARY KEY,
      username VARCHAR(50) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      full_name VARCHAR(100) NOT NULL,
      role user_role NOT NULL,
      home_ward_id VARCHAR(36) NOT NULL REFERENCES wards(id),
      is_active BOOLEAN DEFAULT TRUE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );

    -- Patients
    CREATE TABLE IF NOT EXISTS patients (
      id VARCHAR(36) PRIMARY KEY,
      mrn VARCHAR(30) NOT NULL UNIQUE,
      full_name VARCHAR(100) NOT NULL,
      date_of_birth DATE NOT NULL,
      gender VARCHAR(15) NOT NULL,
      patient_type patient_type DEFAULT 'INPATIENT' NOT NULL,
      genotype VARCHAR(10),
      blood_group VARCHAR(5),
      primary_ward_id VARCHAR(36) REFERENCES wards(id),
      assigned_bed VARCHAR(30),
      allergies_json JSON,
      emergency_summary_json JSON,
      full_record_json JSON,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );

    -- Outpatient Appointments
    CREATE TABLE IF NOT EXISTS outpatient_appointments (
      id VARCHAR(36) PRIMARY KEY,
      patient_id VARCHAR(36) NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      doctor_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      clinic_ward_id VARCHAR(36) NOT NULL REFERENCES wards(id),
      appointment_date TIMESTAMP NOT NULL,
      status appointment_status DEFAULT 'SCHEDULED' NOT NULL,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_outpatient_appts ON outpatient_appointments(patient_id, doctor_id, appointment_date);

    -- Care Teams
    CREATE TABLE IF NOT EXISTS care_teams (
      id VARCHAR(36) PRIMARY KEY,
      patient_id VARCHAR(36) NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      staff_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      relationship_type relationship_type NOT NULL,
      granted_by_staff_id VARCHAR(36) REFERENCES users(id),
      grant_reason TEXT,
      expires_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_care_teams_patient_staff ON care_teams(patient_id, staff_id);
    CREATE INDEX IF NOT EXISTS idx_care_teams_expiry ON care_teams(expires_at);

    -- Lab Results
    CREATE TABLE IF NOT EXISTS lab_results (
      id VARCHAR(36) PRIMARY KEY,
      patient_id VARCHAR(36) NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      ordering_doctor_id VARCHAR(36) NOT NULL REFERENCES users(id),
      lab_tech_id VARCHAR(36) REFERENCES users(id),
      test_name VARCHAR(100) NOT NULL,
      category VARCHAR(50) NOT NULL,
      result_data_json JSON,
      attachment_url VARCHAR(512),
      document_hash VARCHAR(64) NOT NULL,
      status lab_status DEFAULT 'FINAL' NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_lab_results_patient ON lab_results(patient_id);

    -- Medical Documents
    CREATE TABLE IF NOT EXISTS medical_documents (
      id VARCHAR(36) PRIMARY KEY,
      patient_id VARCHAR(36) NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      uploader_id VARCHAR(36) NOT NULL REFERENCES users(id),
      document_type VARCHAR(50) NOT NULL,
      title VARCHAR(150) NOT NULL,
      file_url VARCHAR(512) NOT NULL,
      file_size_bytes BIGINT NOT NULL,
      document_hash VARCHAR(64) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_med_docs_patient ON medical_documents(patient_id);

    -- Sessions
    CREATE TABLE IF NOT EXISTS sessions (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      active_ward_id VARCHAR(36) NOT NULL REFERENCES wards(id),
      auth_token VARCHAR(512) NOT NULL UNIQUE,
      shift_start TIMESTAMP NOT NULL,
      shift_end TIMESTAMP NOT NULL,
      ip_address VARCHAR(45),
      device_id VARCHAR(500) NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
    ALTER TABLE sessions ALTER COLUMN device_id TYPE VARCHAR(500);
    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(auth_token);

    -- Security Alerts
    CREATE TABLE IF NOT EXISTS security_alerts (
      id VARCHAR(36) PRIMARY KEY,
      alert_type VARCHAR(50) NOT NULL,
      severity alert_severity NOT NULL,
      user_id VARCHAR(36) REFERENCES users(id),
      patient_id VARCHAR(36) REFERENCES patients(id),
      description TEXT NOT NULL,
      raw_metadata_json JSON,
      status alert_status DEFAULT 'OPEN' NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );

    -- Ward Staff Rosters
    CREATE TABLE IF NOT EXISTS ward_rosters (
      id VARCHAR(36) PRIMARY KEY,
      ward_id VARCHAR(36) NOT NULL REFERENCES wards(id),
      staff_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      shift_type VARCHAR(20) NOT NULL DEFAULT 'DAY',
      shift_date VARCHAR(15) NOT NULL,
      start_time VARCHAR(10) NOT NULL DEFAULT '08:00',
      end_time VARCHAR(10) NOT NULL DEFAULT '20:00',
      status VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED',
      notes TEXT,
      assigned_by VARCHAR(36) REFERENCES users(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_ward_rosters_ward ON ward_rosters(ward_id, shift_date);
    CREATE INDEX IF NOT EXISTS idx_ward_rosters_staff ON ward_rosters(staff_id, shift_date);
  `);

  // 3. Ensure default wards exist
  await dbPrimary.execute(sql`
    INSERT INTO wards (id, code, name, department) VALUES
      ('w-cardio', 'CARD', 'Cardiology Ward', 'Cardiovascular Services'),
      ('w-peds', 'PEDS', 'Pediatrics Ward', 'Pediatric Care'),
      ('w-emerg', 'EMERG', 'Emergency Ward', 'Trauma & Acute Care'),
      ('w-gopd', 'GOPD', 'General Outpatient Clinic', 'Outpatient Services'),
      ('w-icu', 'ICU', 'Intensive Care Unit', 'Critical Care')
    ON CONFLICT (id) DO NOTHING;
  `);

  // 4. Ensure default staff users exist if users table is empty
  const userCountResult: any = await dbPrimary.execute(sql`SELECT COUNT(*) as count FROM users`);
  const count = Number(userCountResult[0]?.count || userCountResult.rows?.[0]?.count || 0);

  if (count === 0) {
    const passwordHash = await argon2.hash('SecurePassword123!');
    await dbPrimary.execute(sql`
      INSERT INTO users (id, username, password_hash, full_name, role, home_ward_id) VALUES
        ('u-admin-01', 'admin', ${passwordHash}, 'System Administrator (IT)', 'ADMIN', 'w-emerg'),
        ('u-hou-cardio', 'hou_cardio', ${passwordHash}, 'Dr. Folake Adebayo (Head of Unit)', 'HEAD_OF_UNIT', 'w-cardio'),
        ('u-doc-cardio', 'dr_cardio', ${passwordHash}, 'Dr. Emeka Okafor (Cardiologist)', 'DOCTOR', 'w-cardio'),
        ('u-doc-peds', 'dr_peds', ${passwordHash}, 'Dr. Amina Bello (Pediatrician)', 'DOCTOR', 'w-peds'),
        ('u-nurse-cardio', 'nurse_cardio', ${passwordHash}, 'Nurse Blessing Nnamdi', 'NURSE', 'w-cardio'),
        ('u-clerk-01', 'clerk', ${passwordHash}, 'Tunde Bakare (Records Clerk)', 'CLERK', 'w-gopd'),
        ('u-pharm-01', 'pharmacist', ${passwordHash}, 'Pharm. Zainab Usman', 'PHARMACIST', 'w-cardio')
      ON CONFLICT (id) DO NOTHING;
    `);
    console.log('✅ Default hospital staff and wards seeded successfully.');
  }
}
