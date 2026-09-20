import { describe, it, expect } from 'vitest';
import {
  deriveSessionKey,
  encryptData,
  decryptData,
  computeClientSha256,
} from '../../frontend/app/utils/offlineCrypto';

describe('Phase 5: Web Crypto AES-GCM-256 Client Security Tests', () => {
  const masterSecret = 'sample-session-jwt-token-secret-string-xyz-123';
  const salt = 'u-doc-cardio:w-cardio';

  it('should derive an AES-GCM 256-bit CryptoKey from session secret and salt', async () => {
    const key = await deriveSessionKey(masterSecret, salt);
    expect(key).toBeDefined();
    expect(key.algorithm.name).toBe('AES-GCM');
    expect((key.algorithm as any).length).toBe(256);
  });

  it('should encrypt patient ePHI payload and produce valid ciphertext and 12-byte IV', async () => {
    const key = await deriveSessionKey(masterSecret, salt);
    const patientRecord = {
      id: 'p-cardio-01',
      fullName: 'Amina Bello',
      vitals: { hr: 78, bp: '118/76', spo2: 99 },
      allergies: ['Penicillin', 'Sulfa'],
    };

    const encrypted = await encryptData(patientRecord, key);
    expect(encrypted.ciphertext).toBeDefined();
    expect(encrypted.iv).toBeDefined();
    expect(encrypted.algorithm).toBe('AES-GCM-256');

    // Decode base64 IV and verify it is exactly 12 bytes (96-bit standard for GCM)
    const ivBytes = Buffer.from(encrypted.iv, 'base64');
    expect(ivBytes.length).toBe(12);

    // Decrypt and verify payload identity
    const decrypted = await decryptData<typeof patientRecord>(encrypted, key);
    expect(decrypted.id).toBe(patientRecord.id);
    expect(decrypted.fullName).toBe(patientRecord.fullName);
    expect(decrypted.vitals.hr).toBe(78);
    expect(decrypted.allergies).toEqual(['Penicillin', 'Sulfa']);
  });

  it('should throw an explicit error on ciphertext tampering (authentication tag failure)', async () => {
    const key = await deriveSessionKey(masterSecret, salt);
    const original = { sensitiveDiagnosis: 'Acute Myocardial Infarction' };
    const encrypted = await encryptData(original, key);

    // Tamper with ciphertext by corrupting bytes
    const buf = Buffer.from(encrypted.ciphertext, 'base64');
    buf[0] = buf[0] ^ 0xff; // flip bits
    const tamperedCiphertext = buf.toString('base64');

    const tamperedPayload = {
      ...encrypted,
      ciphertext: tamperedCiphertext,
    };

    await expect(decryptData(tamperedPayload, key)).rejects.toThrow(
      /cryptographic authentication tag mismatch or corrupted ciphertext/
    );
  });

  it('should compute deterministic SHA-256 hex string over JSON data', async () => {
    const data = { mrn: 'MRN-2026-CARD-001', ward: 'Cardiology' };
    const hash1 = await computeClientSha256(data);
    const hash2 = await computeClientSha256(data);
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });

  it('should strictly reject invalid inputs without silent fallbacks (Rule 7)', async () => {
    await expect(deriveSessionKey('', salt)).rejects.toThrow(/valid master session secret is required/);
    await expect(deriveSessionKey(masterSecret, '')).rejects.toThrow(/valid salt is required/);
    await expect(encryptData(null as any, {} as any)).rejects.toThrow(/Cannot encrypt empty or null/);
  });
});
