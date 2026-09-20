/**
 * Web Crypto AES-GCM-256 Key Derivation & Cipher Module
 * Implements client-side encryption-at-rest for IndexedDB clinical cache (HIPAA § 164.312(a)(2)(iv)).
 * Adheres strictly to Zero-Trust and Rule 7 (explicit errors, zero silent fallbacks).
 */

export interface EncryptedPayload {
  ciphertext: string // Base64-encoded ciphertext + 128-bit authentication tag
  iv: string         // Base64-encoded 12-byte initialization vector
  algorithm: 'AES-GCM-256'
  encryptedAt: string
}

function getSubtleCrypto(): SubtleCrypto {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    return window.crypto.subtle
  }
  if (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.subtle) {
    return globalThis.crypto.subtle
  }
  throw new Error('Web Crypto API (SubtleCrypto) is not supported or accessible in this execution environment.')
}

function getRandomValues(array: Uint8Array): Uint8Array {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    return window.crypto.getRandomValues(array)
  }
  if (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.getRandomValues) {
    return globalThis.crypto.getRandomValues(array)
  }
  throw new Error('Web Crypto API getRandomValues is not available.')
}

function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  if (typeof btoa !== 'undefined') {
    return btoa(binary)
  }
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64')
  }
  throw new Error('Base64 encoding is not supported in this runtime environment.')
}

function base64ToArrayBuffer(base64: string): Uint8Array {
  if (!base64 || typeof base64 !== 'string') {
    throw new Error('Invalid base64 payload provided for decoding.')
  }
  if (typeof atob !== 'undefined') {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes
  }
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(base64, 'base64'))
  }
  throw new Error('Base64 decoding is not supported in this runtime environment.')
}

/**
 * Derives a 256-bit AES-GCM symmetric key from a master session secret and salt using PBKDF2 SHA-256.
 * @param masterSecret Clinician session token or secret seed
 * @param salt Clinician ID and ward-specific salt
 * @returns CryptoKey for AES-GCM-256
 */
export async function deriveSessionKey(masterSecret: string, salt: string): Promise<CryptoKey> {
  if (!masterSecret || typeof masterSecret !== 'string') {
    throw new Error('A valid master session secret is required for cryptographic key derivation.')
  }
  if (!salt || typeof salt !== 'string') {
    throw new Error('A valid salt is required for cryptographic key derivation.')
  }

  const subtle = getSubtleCrypto()
  const encoder = new TextEncoder()

  // 1. Import raw secret as PBKDF2 key material
  const keyMaterial = await subtle.importKey(
    'raw',
    encoder.encode(masterSecret),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  )

  // 2. Derive AES-GCM 256-bit key using 100,000 iterations of PBKDF2 with SHA-256
  const derivedKey = await subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode(salt),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )

  return derivedKey
}

/**
 * Encrypts arbitrary data (objects, strings) at rest using AES-GCM-256 with a unique random 12-byte IV.
 * @param data Data payload to encrypt
 * @param key AES-GCM CryptoKey
 * @returns EncryptedPayload with Base64 ciphertext and IV
 */
export async function encryptData<T>(data: T, key: CryptoKey): Promise<EncryptedPayload> {
  if (data === undefined || data === null) {
    throw new Error('Cannot encrypt empty or null data payload.')
  }
  if (!key) {
    throw new Error('A valid AES-GCM CryptoKey is required for encryption.')
  }

  const subtle = getSubtleCrypto()
  const encoder = new TextEncoder()

  // 1. Generate fresh 12-byte initialization vector
  const iv = getRandomValues(new Uint8Array(12))

  // 2. Serialize and encrypt data
  const rawBytes = encoder.encode(JSON.stringify(data))
  const ciphertextBuffer = await subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    rawBytes
  )

  return {
    ciphertext: arrayBufferToBase64(ciphertextBuffer),
    iv: arrayBufferToBase64(iv),
    algorithm: 'AES-GCM-256',
    encryptedAt: new Date().toISOString(),
  }
}

/**
 * Decrypts an EncryptedPayload using the provided AES-GCM-256 key.
 * Throws an explicit error if the authentication tag fails (tamper detection).
 * @param payload EncryptedPayload with ciphertext and IV
 * @param key AES-GCM CryptoKey
 * @returns Decrypted object of type T
 */
export async function decryptData<T>(payload: EncryptedPayload, key: CryptoKey): Promise<T> {
  if (!payload || !payload.ciphertext || !payload.iv) {
    throw new Error('Invalid EncryptedPayload: ciphertext and IV are required.')
  }
  if (!key) {
    throw new Error('A valid AES-GCM CryptoKey is required for decryption.')
  }

  const subtle = getSubtleCrypto()
  const decoder = new TextDecoder()

  const iv = base64ToArrayBuffer(payload.iv)
  const ciphertext = base64ToArrayBuffer(payload.ciphertext)

  try {
    const decryptedBuffer = await subtle.decrypt(
      {
        name: 'AES-GCM',
        iv,
      },
      key,
      ciphertext
    )

    const jsonString = decoder.decode(decryptedBuffer)
    return JSON.parse(jsonString) as T
  } catch (err: any) {
    throw new Error(`Decryption failed: cryptographic authentication tag mismatch or corrupted ciphertext. (${err.message})`)
  }
}

/**
 * Computes the SHA-256 hexadecimal hash string for data integrity validation.
 * @param data String or serializable object
 */
export async function computeClientSha256(data: any): Promise<string> {
  const subtle = getSubtleCrypto()
  const encoder = new TextEncoder()
  const content = typeof data === 'string' ? data : JSON.stringify(data)
  const hashBuffer = await subtle.digest('SHA-256', encoder.encode(content))
  const bytes = new Uint8Array(hashBuffer)
  let hex = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    hex += bytes[i].toString(16).padStart(2, '0')
  }
  return hex
}
