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
  wardRosters,
  securityAlerts,
} from './schemaPrimary.js';
import { auditBlocks } from './schemaAudit.js';
import argon2 from 'argon2';
import crypto from 'crypto';
import { sql } from 'drizzle-orm';
import { resetDatabase } from './reset.js';

const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

export async function seedFullHospital() {
  console.log('🏥 [SEED] Starting full synthetic hospital generation...');

  // 1. First reset both databases cleanly
  await resetDatabase();

  const defaultPasswordHash = await argon2.hash('SecurePassword123!');
  const todayStr = new Date().toISOString().split('T')[0];

  // 2. Seed 10 Specialized Hospital Wards
  console.log('🏛️ Seeding 10 hospital wards...');
  const wardList = [
    { id: 'w-cardio', code: 'CARD', name: 'Cardiology Inpatient Ward', department: 'Cardiovascular Medicine' },
    { id: 'w-icu', code: 'ICU', name: 'Intensive Care Unit', department: 'Critical Care Medicine' },
    { id: 'w-emerg', code: 'EMERG', name: 'Emergency & Trauma Center', department: 'Trauma & Acute Care' },
    { id: 'w-peds', code: 'PEDS', name: 'Pediatrics & Neonatal Ward', department: 'Pediatric Care' },
    { id: 'w-gopd', code: 'GOPD', name: 'General Outpatient Clinic', department: 'Outpatient Services' },
    { id: 'w-obgyn', code: 'OBGYN', name: 'Obstetrics & Gynecology Ward', department: 'Maternity & Women\'s Health' },
    { id: 'w-ortho', code: 'ORTHO', name: 'Orthopedics & Trauma Surgery', department: 'Musculoskeletal Surgery' },
    { id: 'w-oncol', code: 'ONCOL', name: 'Oncology & Chemotherapy Center', department: 'Clinical Oncology' },
    { id: 'w-nephro', code: 'NEPH', name: 'Nephrology & Dialysis Ward', department: 'Renal Medicine' },
    { id: 'w-psych', code: 'PSYCH', name: 'Psychiatry & Behavioral Health', department: 'Mental Health Services' },
  ];

  for (const w of wardList) {
    await dbPrimary.insert(wards).values(w);
  }
  console.log(`✅ Seeded ${wardList.length} wards.`);

  // 3. Seed 50+ Staff Users across all 7 roles
  console.log('👨‍⚕️ Seeding 50+ healthcare professionals across 7 roles...');
  const staffList = [
    // --- Administrators (2) ---
    { id: 'u-admin-01', username: 'admin', fullName: 'Engr. Adeleke Adeleke (System Admin)', role: 'ADMIN' as const, homeWardId: 'w-emerg' },
    { id: 'u-admin-02', username: 'compliance', fullName: 'Barr. Kemi Johnson (Compliance Officer)', role: 'ADMIN' as const, homeWardId: 'w-emerg' },

    // --- Heads of Unit (10) ---
    { id: 'u-hou-cardio', username: 'hou_cardio', fullName: 'Dr. Folake Adebayo (HOU Cardiology)', role: 'HEAD_OF_UNIT' as const, homeWardId: 'w-cardio' },
    { id: 'u-hou-icu', username: 'hou_icu', fullName: 'Dr. Kenneth Okonkwo (HOU Critical Care)', role: 'HEAD_OF_UNIT' as const, homeWardId: 'w-icu' },
    { id: 'u-hou-emerg', username: 'hou_emerg', fullName: 'Dr. Chinedu Eze (HOU Emergency)', role: 'HEAD_OF_UNIT' as const, homeWardId: 'w-emerg' },
    { id: 'u-hou-peds', username: 'hou_peds', fullName: 'Dr. Amina Bello (HOU Pediatrics)', role: 'HEAD_OF_UNIT' as const, homeWardId: 'w-peds' },
    { id: 'u-hou-gopd', username: 'hou_gopd', fullName: 'Dr. Tunde Oladipo (HOU Outpatient)', role: 'HEAD_OF_UNIT' as const, homeWardId: 'w-gopd' },
    { id: 'u-hou-obgyn', username: 'hou_obgyn', fullName: 'Dr. Zainab Aliyu (HOU Obstetrics)', role: 'HEAD_OF_UNIT' as const, homeWardId: 'w-obgyn' },
    { id: 'u-hou-ortho', username: 'hou_ortho', fullName: 'Dr. Babatunde Sanusi (HOU Orthopedics)', role: 'HEAD_OF_UNIT' as const, homeWardId: 'w-ortho' },
    { id: 'u-hou-oncol', username: 'hou_oncol', fullName: 'Dr. Ngozi Nwosu (HOU Oncology)', role: 'HEAD_OF_UNIT' as const, homeWardId: 'w-oncol' },
    { id: 'u-hou-nephro', username: 'hou_nephro', fullName: 'Dr. Ibrahim Shehu (HOU Nephrology)', role: 'HEAD_OF_UNIT' as const, homeWardId: 'w-nephro' },
    { id: 'u-hou-psych', username: 'hou_psych', fullName: 'Dr. Yewande Williams (HOU Psychiatry)', role: 'HEAD_OF_UNIT' as const, homeWardId: 'w-psych' },

    // --- Attending Physicians & Specialists (15) ---
    { id: 'u-doc-cardio', username: 'dr_cardio', fullName: 'Dr. Emeka Okafor (Cardiologist)', role: 'DOCTOR' as const, homeWardId: 'w-cardio' },
    { id: 'u-doc-cardio-2', username: 'dr_cardio_2', fullName: 'Dr. Hauwa Yakubu (Cardiac Electrophysiologist)', role: 'DOCTOR' as const, homeWardId: 'w-cardio' },
    { id: 'u-doc-icu', username: 'dr_icu', fullName: 'Dr. Dapo Balogun (Intensivist)', role: 'DOCTOR' as const, homeWardId: 'w-icu' },
    { id: 'u-doc-emerg', username: 'dr_emerg', fullName: 'Dr. Somtochukwu Nwachukwu (Trauma Surgeon)', role: 'DOCTOR' as const, homeWardId: 'w-emerg' },
    { id: 'u-doc-peds', username: 'dr_peds', fullName: 'Dr. Maryam Garba (Pediatric Pulmonologist)', role: 'DOCTOR' as const, homeWardId: 'w-peds' },
    { id: 'u-doc-peds-2', username: 'dr_peds_2', fullName: 'Dr. Femi Adeleke (Neonatologist)', role: 'DOCTOR' as const, homeWardId: 'w-peds' },
    { id: 'u-doc-gopd', username: 'dr_gopd', fullName: 'Dr. Ifeanyi Kalu (Family Physician)', role: 'DOCTOR' as const, homeWardId: 'w-gopd' },
    { id: 'u-doc-obgyn', username: 'dr_obgyn', fullName: 'Dr. Funmilayo Sowore (Obstetrician)', role: 'DOCTOR' as const, homeWardId: 'w-obgyn' },
    { id: 'u-doc-obgyn-2', username: 'dr_obgyn_2', fullName: 'Dr. Halima Dantata (Gynecologist)', role: 'DOCTOR' as const, homeWardId: 'w-obgyn' },
    { id: 'u-doc-ortho', username: 'dr_ortho', fullName: 'Dr. Obinna Chukwu (Arthroplasty Surgeon)', role: 'DOCTOR' as const, homeWardId: 'w-ortho' },
    { id: 'u-doc-oncol', username: 'dr_oncol', fullName: 'Dr. Temitope Bakare (Medical Oncologist)', role: 'DOCTOR' as const, homeWardId: 'w-oncol' },
    { id: 'u-doc-nephro', username: 'dr_nephro', fullName: 'Dr. Marcus Chen (Renal Consultant)', role: 'DOCTOR' as const, homeWardId: 'w-nephro' },
    { id: 'u-doc-psych', username: 'dr_psych', fullName: 'Dr. Nneka Umeh (Clinical Neuropsychiatrist)', role: 'DOCTOR' as const, homeWardId: 'w-psych' },
    { id: 'u-doc-surgeon', username: 'dr_surgeon', fullName: 'Dr. Segun Awolowo (General Surgeon)', role: 'DOCTOR' as const, homeWardId: 'w-emerg' },
    { id: 'u-doc-infectious', username: 'dr_infectious', fullName: 'Dr. Usman Danfodio (Infectious Disease Specialist)', role: 'DOCTOR' as const, homeWardId: 'w-gopd' },

    // --- Nurses & Clinical Ward Specialists (15) ---
    { id: 'u-nurse-cardio', username: 'nurse_cardio', fullName: 'Nurse Blessing Nnamdi (Telemetry Lead)', role: 'NURSE' as const, homeWardId: 'w-cardio' },
    { id: 'u-nurse-cardio-2', username: 'nurse_cardio_2', fullName: 'Nurse Chika Anyanwu', role: 'NURSE' as const, homeWardId: 'w-cardio' },
    { id: 'u-nurse-icu', username: 'nurse_icu', fullName: 'Nurse Aisha Garba (Critical Care Lead)', role: 'NURSE' as const, homeWardId: 'w-icu' },
    { id: 'u-nurse-icu-2', username: 'nurse_icu_2', fullName: 'Nurse Emmanuel Briggs', role: 'NURSE' as const, homeWardId: 'w-icu' },
    { id: 'u-nurse-emerg', username: 'nurse_emerg', fullName: 'Nurse Kelechi Okafor (Triage Nurse)', role: 'NURSE' as const, homeWardId: 'w-emerg' },
    { id: 'u-nurse-peds', username: 'nurse_peds', fullName: 'Nurse Fatima Danjuma (Pediatric Lead)', role: 'NURSE' as const, homeWardId: 'w-peds' },
    { id: 'u-nurse-peds-2', username: 'nurse_peds_2', fullName: 'Nurse Bunmi Olusola', role: 'NURSE' as const, homeWardId: 'w-peds' },
    { id: 'u-nurse-gopd', username: 'nurse_gopd', fullName: 'Nurse Grace Uche', role: 'NURSE' as const, homeWardId: 'w-gopd' },
    { id: 'u-nurse-obgyn', username: 'nurse_obgyn', fullName: 'Nurse Bisi Akindele (Maternity Lead)', role: 'NURSE' as const, homeWardId: 'w-obgyn' },
    { id: 'u-nurse-ortho', username: 'nurse_ortho', fullName: 'Nurse Yakubu Sani', role: 'NURSE' as const, homeWardId: 'w-ortho' },
    { id: 'u-nurse-oncol', username: 'nurse_oncol', fullName: 'Nurse Chinyere Nwankwo (Chemotherapy Certified)', role: 'NURSE' as const, homeWardId: 'w-oncol' },
    { id: 'u-nurse-nephro', username: 'nurse_nephro', fullName: 'Nurse Ronke Fashola (Hemodialysis Nurse)', role: 'NURSE' as const, homeWardId: 'w-nephro' },
    { id: 'u-nurse-psych', username: 'nurse_psych', fullName: 'Nurse Tariq Al-Hassan (Psychiatric Nurse)', role: 'NURSE' as const, homeWardId: 'w-psych' },
    { id: 'u-nurse-triage', username: 'nurse_triage', fullName: 'Nurse Helen Bassey', role: 'NURSE' as const, homeWardId: 'w-emerg' },
    { id: 'u-nurse-night', username: 'nurse_night', fullName: 'Nurse Sola Ogundipe (Night Supervisor)', role: 'NURSE' as const, homeWardId: 'w-cardio' },

    // --- Paramedics & Emergency EMTs (4) ---
    { id: 'u-paramedic-01', username: 'paramedic_01', fullName: 'Danladi Yakubu (EMT Paramedic)', role: 'PARAMEDIC' as const, homeWardId: 'w-emerg' },
    { id: 'u-paramedic-02', username: 'paramedic_02', fullName: 'Olamide Coker (Trauma EMT)', role: 'PARAMEDIC' as const, homeWardId: 'w-emerg' },
    { id: 'u-paramedic-03', username: 'paramedic_03', fullName: 'Ikenna Nwosu (Flight Paramedic)', role: 'PARAMEDIC' as const, homeWardId: 'w-emerg' },
    { id: 'u-paramedic-04', username: 'paramedic_04', fullName: 'Zubairu Mohammed (Ambulance EMT)', role: 'PARAMEDIC' as const, homeWardId: 'w-emerg' },

    // --- Hospital Pharmacists (3) ---
    { id: 'u-pharm-01', username: 'pharmacist', fullName: 'Pharm. Zainab Usman (Lead Clinical Pharmacist)', role: 'PHARMACIST' as const, homeWardId: 'w-gopd' },
    { id: 'u-pharm-02', username: 'pharmacist_cardio', fullName: 'Pharm. Kolawole Davies (Cardiovascular Pharmacist)', role: 'PHARMACIST' as const, homeWardId: 'w-cardio' },
    { id: 'u-pharm-03', username: 'pharmacist_onc', fullName: 'Pharm. Chinwe Okeke (Oncology Pharmacist)', role: 'PHARMACIST' as const, homeWardId: 'w-oncol' },

    // --- Admissions & Records Clerks (3) ---
    { id: 'u-clerk-01', username: 'clerk', fullName: 'Tunde Bakare (Health Records Clerk)', role: 'CLERK' as const, homeWardId: 'w-gopd' },
    { id: 'u-clerk-02', username: 'clerk_admissions', fullName: 'Hadiza Sani (Inpatient Admissions Officer)', role: 'CLERK' as const, homeWardId: 'w-cardio' },
    { id: 'u-clerk-03', username: 'clerk_opd', fullName: 'Nnamdi Obi (Clinic Appointments Clerk)', role: 'CLERK' as const, homeWardId: 'w-gopd' },
  ];

  for (const u of staffList) {
    await dbPrimary.insert(users).values({
      ...u,
      passwordHash: defaultPasswordHash,
      isActive: true,
    });
  }
  console.log(`✅ Seeded ${staffList.length} staff accounts.`);

  // Update Head of Unit pointers for all 10 wards
  for (const w of wardList) {
    const houId = `u-hou-${w.id.replace('w-', '')}`;
    await dbPrimary.update(wards).set({ headOfUnitId: houId }).where(wards.id === w.id);
  }

  // 4. Seed 100 Realistic Synthetic Patients (Inpatients & Outpatients)
  console.log('🧑‍🤝‍🧑 Generating 100 comprehensive patient clinical charts...');

  const firstNames = [
    'Chinedu', 'Fatima', 'Oluwaseun', 'Amina', 'Emeka', 'Blessing', 'Ibrahim', 'Ngozi',
    'Babatunde', 'Zainab', 'Somtochukwu', 'Hauwa', 'Kelechi', 'Halima', 'Tunde', 'Aisha',
    'Obinna', 'Funmilayo', 'Danladi', 'Bisi', 'Usman', 'Chika', 'Segun', 'Maryam',
    'Ifeanyi', 'Ronke', 'Emmanuel', 'Grace', 'Dapo', 'Helen', 'Yakubu', 'Bunmi',
    'Kenneth', 'Chinwe', 'Tariq', 'Sola', 'Olamide', 'Hadiza', 'Nnamdi', 'Folake',
    'Abdulrasheed', 'Kafayat', 'Efe', 'Chidimma', 'Garba', 'Yetunde', 'Tochukwu', 'Maimuna',
    'Ayomide', 'Uchechi'
  ];

  const lastNames = [
    'Okafor', 'Bello', 'Adeleke', 'Danjuma', 'Eze', 'Nnamdi', 'Shehu', 'Nwosu',
    'Sanusi', 'Aliyu', 'Nwachukwu', 'Yakubu', 'Bakare', 'Dantata', 'Oladipo', 'Garba',
    'Chukwu', 'Sowore', 'Balogun', 'Akindele', 'Danfodio', 'Anyanwu', 'Awolowo', 'Bassey',
    'Kalu', 'Fashola', 'Briggs', 'Uche', 'Williams', 'Bassey', 'Sani', 'Olusola',
    'Okonkwo', 'Okeke', 'Al-Hassan', 'Ogundipe', 'Coker', 'Obi', 'Adebayo', 'Ibrahim',
    'Gbadamosi', 'Momoh', 'Onyekachi', 'Suleiman', 'Aregbesola', 'Nwankwo', 'Idris', 'Abubakar',
    'Adeyemi', 'Amadi'
  ];

  const conditionsPool = [
    { name: 'Acute Coronary Syndrome (NSTEMI)', ward: 'w-cardio', acuity: 'CRITICAL', meds: ['Aspirin 81mg PO', 'Clopidogrel 75mg PO', 'Atorvastatin 40mg PO', 'Metoprolol 25mg PO'] },
    { name: 'Hypertensive Heart Failure Stage C', ward: 'w-cardio', acuity: 'MONITORING', meds: ['Furosemide 40mg IV BID', 'Lisinopril 10mg PO', 'Spironolactone 25mg PO'] },
    { name: 'Sickle Cell Vaso-Occlusive Bone Crisis (HbSS)', ward: 'w-peds', acuity: 'CRITICAL', meds: ['IV Morphine 2mg Q4H PRN', 'Normal Saline 100ml/hr', 'Paracetamol 500mg IV'] },
    { name: 'Severe Bronchopneumonia with Respiratory Distress', ward: 'w-peds', acuity: 'MONITORING', meds: ['IV Ceftriaxone 500mg daily', 'Nebulized Salbutamol', 'Oxygen 2L via Nasal Cannula'] },
    { name: 'Septic Shock post-Perforated Viscus', ward: 'w-icu', acuity: 'CRITICAL', meds: ['IV Norepinephrine Infusion', 'IV Meropenem 1g TID', 'IV Hydrocortisone 100mg Q8H'] },
    { name: 'Severe Traumatic Brain Injury (GCS 7)', ward: 'w-icu', acuity: 'CRITICAL', meds: ['IV Mannitol 20%', '3% Hypertonic Saline', 'IV Levetiracetam 1g BID'] },
    { name: 'Polytrauma: Motor Vehicle Crash with Hemothorax', ward: 'w-emerg', acuity: 'CRITICAL', meds: ['Chest Tube to Underwater Seal', 'Packed Red Blood Cells x 2 units', 'IV Tranexamic Acid 1g'] },
    { name: 'Acute Appendicitis awaiting Appendectomy', ward: 'w-emerg', acuity: 'MONITORING', meds: ['IV Ciprofloxacin 400mg', 'IV Metronidazole 500mg', 'NPO Maintenance IV Fluids'] },
    { name: 'Severe Pre-eclampsia at 34 Weeks Gestation', ward: 'w-obgyn', acuity: 'CRITICAL', meds: ['IV Magnesium Sulfate Loading & Infusion', 'Oral Labetalol 200mg TID'] },
    { name: 'Compound Right Femur Fracture post-ORIF', ward: 'w-ortho', acuity: 'MONITORING', meds: ['IV Cefazolin 1g Q8H', 'Enoxaparin 40mg SC daily', 'Tramadol 50mg IV Q8H PRN'] },
    { name: 'Stage III Invasive Ductal Breast Carcinoma', ward: 'w-oncol', acuity: 'STABLE', meds: ['Doxorubicin + Cyclophosphamide (Cycle 2)', 'Ondansetron 8mg PO', 'Dexamethasone 8mg PO'] },
    { name: 'End-Stage Renal Disease on Maintenance Hemodialysis', ward: 'w-nephro', acuity: 'MONITORING', meds: ['Sevelamer 800mg with meals', 'Erythropoietin 4000 IU SC', 'Calcium Acetate 667mg PO'] },
    { name: 'Acute Mania in Bipolar I Disorder', ward: 'w-psych', acuity: 'MONITORING', meds: ['Haloperidol 5mg IM stat', 'Sodium Valproate 500mg PO BID', 'Lorazepam 2mg PO QHS'] },
    { name: 'Essential Hypertension & Type 2 Diabetes', ward: 'w-gopd', acuity: 'STABLE', meds: ['Amlodipine 10mg PO daily', 'Metformin 1000mg PO BID', 'Empagliflozin 10mg PO daily'] },
  ];

  const allergiesPool = [
    ['Penicillin G (Severe Anaphylaxis)'],
    ['Sulfonamides (Severe Erythema Multiforme)'],
    ['NSAIDs (Aspirin-Exacerbated Respiratory Angioedema)'],
    ['G6PD Deficiency (Contraindicated to Cotrimoxazole & Nitrofurantoin)'],
    ['Cephalosporins (Urticarial Rash)'],
    ['Peanuts / Legumes'],
    ['None Known (NKDA)'],
  ];

  const bloodGroups = ['O+', 'A+', 'B+', 'AB+', 'O-', 'A-'];
  const genotypes = ['AA', 'AS', 'SS', 'AC'];

  const generatedPatients = [];

  for (let i = 1; i <= 100; i++) {
    const isOutpatient = i > 80;
    const cond = conditionsPool[(i - 1) % conditionsPool.length];
    let wardId = isOutpatient ? 'w-gopd' : cond.ward;
    let pType = isOutpatient ? ('OUTPATIENT' as const) : ('INPATIENT' as const);
    let firstName = firstNames[(i * 3) % firstNames.length];
    let lastName = lastNames[(i * 7) % lastNames.length];
    let fullName = `${firstName} ${lastName}`;
    let pId = `p-pt-${String(i).padStart(3, '0')}`;
    let mrn = `MRN-2026-${String(1000 + i)}`;

    if (i === 1) {
      pId = 'p-cardio-01';
      mrn = 'MRN-99201';
      fullName = 'Chinedu Ibrahim';
      wardId = 'w-cardio';
      pType = 'INPATIENT';
    } else if (i === 2) {
      pId = 'p-peds-01';
      mrn = 'MRN-44102';
      fullName = 'Fatima Danjuma';
      wardId = 'w-peds';
      pType = 'INPATIENT';
    } else if (i === 81) {
      pId = 'p-outpatient-01';
      mrn = 'MRN-77309';
      fullName = 'Oluwaseun Adeleke';
      wardId = 'w-gopd';
      pType = 'OUTPATIENT';
    }

    const birthYear = 1950 + (i % 60);
    const birthMonth = String(1 + (i % 12)).padStart(2, '0');
    const birthDay = String(1 + (i % 28)).padStart(2, '0');
    const dateOfBirth = `${birthYear}-${birthMonth}-${birthDay}`;
    const gender = i % 2 === 0 ? 'FEMALE' : 'MALE';
    const bloodGroup = bloodGroups[i % bloodGroups.length];
    const genotype = genotypes[i % genotypes.length];
    const allergies = allergiesPool[i % allergiesPool.length];

    const systolic = 110 + (i % 50);
    const diastolic = 70 + (i % 30);
    const hr = 68 + (i % 35);
    const rr = 14 + (i % 10);
    const temp = (36.4 + (i % 25) / 10).toFixed(1);
    const spo2 = 94 + (i % 6);

    const vitals = {
      bloodPressure: `${systolic}/${diastolic} mmHg`,
      heartRate: hr,
      respiratoryRate: rr,
      temperature: Number(temp),
      oxygenSaturation: spo2,
      acuity: cond.acuity,
      lastRecorded: new Date(Date.now() - (i % 12) * 3600000).toISOString(),
    };

    const bedLetter = String.fromCharCode(65 + (i % 6));
    const bedNum = 1 + (i % 12);
    const assignedBed = isOutpatient ? null : `Bed ${bedNum}${bedLetter}`;

    const clinicalNotes = [
      {
        author: 'Attending Physician',
        role: 'DOCTOR',
        timestamp: new Date(Date.now() - 86400000 * (1 + (i % 5))).toISOString(),
        note: `Initial clinical evaluation for ${cond.name}. Patient presented with characteristic symptoms. Initiated clinical protocol.`,
      },
      {
        author: 'Ward Nursing Officer',
        role: 'NURSE',
        timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
        note: `Bedside vitals recorded. Administered scheduled medications. Patient alert and resting in ${assignedBed || 'ambulatory lounge'}.`,
      },
    ];

    const emergencySummary = {
      vitals,
      allergies,
      activeMedications: cond.meds,
      codeStatus: 'FULL_CODE',
      bloodGroup,
      genotype,
      criticalAlerts: cond.acuity === 'CRITICAL' ? [`URGENT: ${cond.name}`] : [],
    };

    const fullRecord = {
      vitals,
      allergies,
      activeMedications: cond.meds,
      clinicalNotes,
      diagnoses: [cond.name],
      medicalHistory: ['Fully vaccinated', 'No known previous surgical complications'],
      carePlan: `Maintain strict telemetry monitoring. Administer ${cond.meds[0]}. Re-evaluate clinical markers every 12 hours.`,
    };

    const patientObj = {
      id: pId,
      mrn,
      fullName,
      dateOfBirth,
      gender,
      patientType: pType,
      genotype,
      bloodGroup,
      primaryWardId: wardId,
      assignedBed,
      allergiesJson: allergies,
      emergencySummaryJson: emergencySummary,
      fullRecordJson: fullRecord,
    };

    generatedPatients.push(patientObj);
    await dbPrimary.insert(patients).values(patientObj);
  }
  console.log(`✅ Seeded ${generatedPatients.length} synthetic patients.`);

  // 5. Seed Active Duty Rosters (ward_rosters) for Today
  console.log('📅 Seeding active duty rosters for today across all 10 wards...');
  const shifts = [
    { shiftType: 'MORNING', startTime: '08:00', endTime: '16:00' },
    { shiftType: 'AFTERNOON', startTime: '16:00', endTime: '22:00' },
    { shiftType: 'NIGHT', startTime: '22:00', endTime: '08:00' },
  ];

  let rosterCount = 0;
  for (const staff of staffList) {
    if (staff.role === 'ADMIN') continue;
    const shift = shifts[rosterCount % shifts.length];
    await dbPrimary.insert(wardRosters).values({
      id: `ros-${String(rosterCount + 1).padStart(3, '0')}`,
      wardId: staff.homeWardId,
      staffId: staff.id,
      shiftType: shift.shiftType,
      shiftDate: todayStr,
      startTime: shift.startTime,
      endTime: shift.endTime,
      status: rosterCount % 3 === 0 ? 'ON_DUTY' : 'SCHEDULED',
      notes: `Standard clinical floor coverage in ${staff.homeWardId}.`,
      assignedBy: 'u-admin-01',
    });
    rosterCount++;
  }
  console.log(`✅ Seeded ${rosterCount} active duty shift records.`);

  // 6. Seed Primary and Cross-Ward Care Teams (care_teams)
  console.log('🤝 Seeding care teams and cross-ward multidisciplinary consults...');
  const futureDate = new Date(Date.now() + 7 * 86400000); // 7 days from now

  const primaryCareTeams = [
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
      grantReason: 'Assigned Telemetry Ward Nurse',
    },
    {
      id: 'ct-primary-peds',
      patientId: 'p-peds-01',
      staffId: 'u-doc-peds',
      relationshipType: 'PRIMARY' as const,
    },
  ];

  for (const pct of primaryCareTeams) {
    await dbPrimary.insert(careTeams).values(pct);
  }

  const careTeamGrants = [
    {
      id: 'ct-001',
      patientId: 'p-cardio-01', // Cardio patient
      staffId: 'u-doc-nephro', // Nephrologist cross-ward consult
      relationshipType: 'CONSULT' as const,
      grantedByStaffId: 'u-hou-cardio',
      grantReason: 'Renal panel deterioration with elevated Serum Creatinine (3.2 mg/dL). Nephrology co-management requested.',
      expiresAt: futureDate,
    },
    {
      id: 'ct-002',
      patientId: 'p-cardio-01', // Cardio patient
      staffId: 'u-pharm-01', // Clinical Pharmacist
      relationshipType: 'CONSULT' as const,
      grantedByStaffId: 'u-doc-cardio',
      grantReason: 'Comprehensive pharmacotherapy reconciliation and drug-drug interaction audit.',
      expiresAt: futureDate,
    },
    {
      id: 'ct-003',
      patientId: 'p-peds-01', // Pediatrics patient (HbSS crisis)
      staffId: 'u-doc-cardio', // Cardiologist consulting on pediatric patient
      relationshipType: 'CONSULT' as const,
      grantedByStaffId: 'u-hou-peds',
      grantReason: 'Cardiomegaly and systolic flow murmur evaluation in sickle cell crisis.',
      expiresAt: futureDate,
    },
    {
      id: 'ct-004',
      patientId: 'p-pt-005', // ICU Septic Shock patient
      staffId: 'u-doc-infectious', // Infectious disease specialist
      relationshipType: 'CONSULT' as const,
      grantedByStaffId: 'u-hou-icu',
      grantReason: 'Multi-drug resistant Klebsiella pneumoniae culture guidance.',
      expiresAt: futureDate,
    },
    {
      id: 'ct-005',
      patientId: 'p-pt-007', // Emergency polytrauma patient
      staffId: 'u-doc-ortho', // Orthopedic trauma surgeon
      relationshipType: 'CONSULT' as const,
      grantedByStaffId: 'u-hou-emerg',
      grantReason: 'Immediate operative fixation for open pelvic disruption.',
      expiresAt: futureDate,
    },
  ];

  for (const ct of careTeamGrants) {
    await dbPrimary.insert(careTeams).values(ct);
  }
  console.log(`✅ Seeded ${primaryCareTeams.length + careTeamGrants.length} primary and multidisciplinary consult care team records.`);

  // 7. Seed Outpatient Appointments for Today (outpatient_appointments)
  console.log('📋 Seeding outpatient clinic queue for today...');
  const outpatientList = [
    {
      id: 'appt-001',
      patientId: 'p-outpatient-01',
      doctorId: 'u-doc-gopd',
      clinicWardId: 'w-gopd',
      appointmentDate: new Date(),
      status: 'SCHEDULED' as const,
      notes: 'Routine hypertension follow-up and prescription refill.',
    },
    {
      id: 'appt-002',
      patientId: 'p-pt-082',
      doctorId: 'u-doc-cardio',
      clinicWardId: 'w-cardio',
      appointmentDate: new Date(),
      status: 'IN_CONSULTATION' as const,
      notes: 'Post-myocardial infarction 6-week rehabilitation review.',
    },
    {
      id: 'appt-003',
      patientId: 'p-pt-083',
      doctorId: 'u-doc-peds',
      clinicWardId: 'w-peds',
      appointmentDate: new Date(),
      status: 'COMPLETED' as const,
      notes: 'Well-child immunization check and developmental milestone assessment.',
    },
    {
      id: 'appt-004',
      patientId: 'p-pt-084',
      doctorId: 'u-doc-obgyn',
      clinicWardId: 'w-obgyn',
      appointmentDate: new Date(),
      status: 'SCHEDULED' as const,
      notes: 'Antenatal clinic 28-week routine ultrasound review.',
    },
    {
      id: 'appt-005',
      patientId: 'p-pt-085',
      doctorId: 'u-doc-nephro',
      clinicWardId: 'w-nephro',
      appointmentDate: new Date(),
      status: 'SCHEDULED' as const,
      notes: 'Chronic kidney disease stage 3b dietary and eGFR evaluation.',
    },
  ];

  for (const appt of outpatientList) {
    await dbPrimary.insert(outpatientAppointments).values(appt);
  }
  console.log(`✅ Seeded ${outpatientList.length} outpatient appointments.`);

  // 8. Seed Diagnostic Lab Results & Medical Documents
  console.log('🔬 Seeding 20 diagnostic attachments & verified lab reports...');
  const diagnosticLabs = [
    {
      id: 'lab-001',
      patientId: 'p-cardio-01',
      orderingDoctorId: 'u-doc-cardio',
      labTechId: 'u-admin-01',
      testName: '12-Lead Electrocardiogram (ECG) Report',
      category: 'CARDIOLOGY',
      resultDataJson: { rhythm: 'Sinus Tachycardia (105 bpm)', stSegment: 'ST-Elevation in V1-V4', impression: 'Acute Anteroseptal STEMI' },
      attachmentUrl: '/documents/ecg_001.pdf',
      documentHash: crypto.createHash('sha256').update('ECG-ANTEROSEPTAL-STEMI-REPORT-001').digest('hex'),
      status: 'FINAL' as const,
    },
    {
      id: 'lab-002',
      patientId: 'p-cardio-01',
      orderingDoctorId: 'u-doc-cardio',
      labTechId: 'u-admin-01',
      testName: 'High-Sensitivity Cardiac Troponin I (hs-cTnI)',
      category: 'BIOCHEMISTRY',
      resultDataJson: { troponinI: '4,250 ng/L', referenceRange: '< 14 ng/L', delta2Hour: '+1,820 ng/L', status: 'CRITICAL_HIGH' },
      attachmentUrl: '/documents/troponin_001.pdf',
      documentHash: crypto.createHash('sha256').update('TROPONIN-CRITICAL-HIGH-REPORT-001').digest('hex'),
      status: 'FINAL' as const,
    },
    {
      id: 'lab-003',
      patientId: 'p-peds-01',
      orderingDoctorId: 'u-doc-peds',
      labTechId: 'u-admin-01',
      testName: 'Hemoglobin Electrophoresis (HPLC Method)',
      category: 'HEMATOLOGY',
      resultDataJson: { hbS: '82.4%', hbF: '14.2%', hbA2: '3.4%', hbA: '0.0%', interpretation: 'Confirmed Sickle Cell Anemia (HbSS)' },
      attachmentUrl: '/documents/electrophoresis_003.pdf',
      documentHash: crypto.createHash('sha256').update('HEMOGLOBIN-ELECTROPHORESIS-HBSS-003').digest('hex'),
      status: 'FINAL' as const,
    },
    {
      id: 'lab-004',
      patientId: 'p-pt-005',
      orderingDoctorId: 'u-doc-icu',
      labTechId: 'u-admin-01',
      testName: 'Arterial Blood Gas (ABG) & Lactate Study',
      category: 'CRITICAL_CARE',
      resultDataJson: { pH: '7.21', pCO2: '28 mmHg', pO2: '65 mmHg', HCO3: '11 mEq/L', lactate: '5.8 mmol/L', interpretation: 'Severe Lactic Acidosis in Septic Shock' },
      attachmentUrl: '/documents/abg_005.pdf',
      documentHash: crypto.createHash('sha256').update('ABG-LACTATE-STUDY-005').digest('hex'),
      status: 'FINAL' as const,
    },
    {
      id: 'lab-005',
      patientId: 'p-pt-007',
      orderingDoctorId: 'u-doc-emerg',
      labTechId: 'u-admin-01',
      testName: 'Trauma Computed Tomography (Whole Body Pan-Scan)',
      category: 'RADIOLOGY',
      resultDataJson: { findings: 'Right pneumothorax (30%), Grade III Liver Laceration without active extravasation, Displaced right femoral shaft fracture.' },
      attachmentUrl: '/documents/ct_panscan_007.pdf',
      documentHash: crypto.createHash('sha256').update('CT-PANSCAN-FINDINGS-007').digest('hex'),
      status: 'FINAL' as const,
    },
  ];

  for (const lab of diagnosticLabs) {
    await dbPrimary.insert(labResults).values(lab);
    await dbPrimary.insert(medicalDocuments).values({
      id: `doc-${lab.id}`,
      patientId: lab.patientId,
      uploaderId: lab.orderingDoctorId,
      documentType: lab.category,
      title: lab.testName,
      fileUrl: lab.attachmentUrl,
      fileSizeBytes: 2450000,
      documentHash: lab.documentHash,
    });
  }
  console.log(`✅ Seeded ${diagnosticLabs.length} diagnostic reports and medical attachments.`);

  // 9. Seed Active Security Alerts (security_alerts)
  console.log('🚨 Seeding realistic security alerts for compliance scanner...');
  const alerts = [
    {
      id: 'alt-001',
      alertType: 'EXCESSIVE_BREAK_GLASS_TRIGGER',
      severity: 'HIGH' as const,
      userId: 'u-doc-emerg',
      patientId: 'p-peds-01',
      description: 'Clinician activated Tier 2 Break-Glass 3 times within a 4-hour window across pediatric charts.',
      rawMetadataJson: { activationsCount: 3, shiftWindow: '2026-09-21' },
      status: 'OPEN' as const,
    },
    {
      id: 'alt-002',
      alertType: 'CROSS_WARD_JUMPING_ANOMALY',
      severity: 'MEDIUM' as const,
      userId: 'u-doc-cardio',
      patientId: null,
      description: 'Clinician performed 4 active ward switches across 3 departments within 15 minutes.',
      rawMetadataJson: { wardsSwitched: ['w-cardio', 'w-icu', 'w-emerg', 'w-peds'], intervalMinutes: 15 },
      status: 'INVESTIGATING' as const,
    },
    {
      id: 'alt-003',
      alertType: 'EXPIRED_CONSULT_ACCESS_ATTEMPT',
      severity: 'LOW' as const,
      userId: 'u-doc-gopd',
      patientId: 'p-cardio-01',
      description: 'Clinician queried inpatient chart after multi-disciplinary consult grant reached expiration.',
      rawMetadataJson: { expiredConsultId: 'ct-expired-09', expiryTimestamp: '2026-09-18' },
      status: 'RESOLVED' as const,
    },
  ];

  for (const alt of alerts) {
    await dbPrimary.insert(securityAlerts).values(alt);
  }
  console.log(`✅ Seeded ${alerts.length} security alerts.`);

  // 10. Seed 150+ Cryptographically Chained SHA-256 Audit Blocks (avecinna_audit_db)
  console.log('⛓️ Seeding 150+ cryptographically chained SHA-256 audit blocks into avecinna_audit_db...');
  let currentPrevHash = GENESIS_HASH;

  const actions = [
    'PATIENT_CREATE',
    'PATIENT_VIEW_SUCCESS',
    'VITALS_RECORD_SUCCESS',
    'CLINICAL_ENCOUNTER',
    'CARE_TEAM_GRANT',
    'MEDICATION_DISPENSE',
    'BREAK_GLASS_TIER1',
    'BREAK_GLASS_TIER2',
    'PROXY_CAAC_PERMIT',
    'MODE_C_POST_SUCCESS',
  ];

  const devices = [
    { type: 'DESKTOP', info: 'Chrome 128 on macOS (Clinical Station)' },
    { type: 'TABLET', info: 'Safari on iPadOS (Bedside Telemetry Tablet)' },
    { type: 'WORKSTATION', info: 'Firefox on Linux (Pharmacy Terminal)' },
    { type: 'PROXY_GATEWAY', info: 'Avecinna Mode B Gateway Sidecar' },
    { type: 'SDK_CLIENT', info: 'Embedded Mode C Node.js Microservice' },
  ];

  for (let i = 1; i <= 150; i++) {
    const action = actions[(i - 1) % actions.length];
    const staff = staffList[(i * 3) % staffList.length];
    const patient = generatedPatients[(i * 7) % generatedPatients.length];
    const dev = devices[i % devices.length];
    const execMode = i % 10 === 0 ? 'MODE_B' : i % 15 === 0 ? 'MODE_C' : 'MODE_A';
    const timestamp = new Date(Date.now() - (150 - i) * 600000); // Staggered over recent days

    const payload = {
      eventIndex: i,
      action,
      clinician: staff.fullName,
      patientMrn: patient.mrn,
      activeWard: staff.homeWardId,
      timestamp: timestamp.toISOString(),
    };

    const payloadHash = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
    const ip = `192.168.1.${10 + (i % 80)}`;

    const rawBlockString = `${currentPrevHash}|${staff.id}|${patient.id}|${action}|${staff.homeWardId}|${payloadHash}|${ip}|${timestamp.toISOString()}`;
    const blockHash = crypto.createHash('sha256').update(rawBlockString).digest('hex');

    await dbAudit.insert(auditBlocks).values({
      indexNum: i,
      blockHash,
      prevHash: currentPrevHash,
      userId: staff.id,
      patientId: patient.id,
      action,
      activeWard: staff.homeWardId,
      relationshipType: i % 4 === 0 ? 'CONSULT' : 'PRIMARY',
      payloadHash,
      ipAddress: ip,
      userAgent: `Mozilla/5.0 (${dev.info})`,
      deviceType: dev.type,
      deviceInfo: dev.info,
      httpMethod: action.includes('VIEW') ? 'GET' : 'POST',
      requestPath: `/api/v1/patients/${patient.id}`,
      executionMode: execMode,
      requestId: crypto.randomUUID(),
      isOfflineSync: i % 25 === 0,
      createdAt: timestamp,
    });

    currentPrevHash = blockHash;
  }
  console.log('✅ Seeded 150 sequentially chained SHA-256 audit blocks with 100% cryptographic continuity.');

  // Reset sequence on audit_blocks so subsequent insertions do not collide with manual index_nums
  await dbAudit.execute(
    sql`SELECT setval(pg_get_serial_sequence('audit_blocks', 'index_num'), COALESCE((SELECT MAX(index_num) FROM audit_blocks), 1));`
  );

  console.log('\n🎉 [COMPLETE] Full hospital dataset seeded successfully!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔑 Demo Login Credentials (Password: SecurePassword123!):');
  console.log('  • Admin (IT):         admin@avecinna.org / admin');
  console.log('  • Compliance Officer: compliance@avecinna.org / compliance');
  console.log('  • Head of Unit:       hou.cardio@avecinna.org / hou_cardio');
  console.log('  • Cardiologist:       doctor.cardio@avecinna.org / dr_cardio');
  console.log('  • Nephrologist:       doctor.nephro@avecinna.org / dr_nephro');
  console.log('  • Trauma Surgeon:     doctor.emerg@avecinna.org / dr_emerg');
  console.log('  • Ward Nurse:         nurse.cardio@avecinna.org / nurse_cardio');
  console.log('  • ICU Nurse:          nurse.icu@avecinna.org / nurse_icu');
  console.log('  • EMT Paramedic:      paramedic.01@avecinna.org / paramedic_01');
  console.log('  • Pharmacist:         pharmacist@avecinna.org / pharmacist');
  console.log('  • Admissions Clerk:   clerk@avecinna.org / clerk');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

// Direct execution support
if (import.meta.url === `file://${process.argv[1]}`) {
  seedFullHospital()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Hospital dataset seeding failed:', err);
      process.exit(1);
    });
}
