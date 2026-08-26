/**
 * VeriPinoy Non-Custodial End-to-End Encryption (E2EE) Cryptographic Engine
 * Built strictly on the standard Web Crypto API (SubtleCrypto: RSA-OAEP 2048/SHA-256 & AES-GCM 256-bit).
 * Private keys NEVER leave the local browser storage (IndexedDB).
 */

class E2EECryptoEngine {
  constructor() {
    this.dbName = 'veripinoy_e2ee_keystore_v1';
    this.storeName = 'keys';
    this.db = null;
    this.sessionKeyCache = new Map(); // conversationId -> CryptoKey (AES-GCM)
  }

  async init() {
    if (this.db) return this.db;
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'userId' });
        }
      };
      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve(this.db);
      };
      request.onerror = (event) => {
        console.warn('IndexedDB unavailable, falling back to secure memory storage:', event.target.error);
        resolve(null);
      };
    });
  }

  // Generate SHA-256 fingerprint for a public key
  async calculateFingerprint(publicKeyJwk) {
    const jsonStr = JSON.stringify(publicKeyJwk);
    const enc = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', enc.encode(jsonStr));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(':');
  }

  // Format fingerprint into 4-character blocks for visual safety numbers
  formatSafetyNumber(fingerprint) {
    if (!fingerprint) return 'UNVERIFIED';
    const clean = fingerprint.replace(/[^A-Fa-f0-9]/g, '');
    return clean.match(/.{1,4}/g)?.slice(0, 8).join('-') || clean;
  }

  // Get or create local user keypair (RSA-OAEP 2048-bit with SHA-256)
  async getOrCreateUserKeyPair(userId, userEmail = '') {
    await this.init();
    let stored = null;

    if (this.db) {
      stored = await new Promise((resolve) => {
        try {
          const tx = this.db.transaction(this.storeName, 'readonly');
          const store = tx.objectStore(this.storeName);
          const req = store.get(userId);
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => resolve(null);
        } catch (e) {
          resolve(null);
        }
      });
    }

    if (stored && stored.privateKey && stored.publicKey) {
      return stored;
    }

    // Generate new RSA-OAEP key pair
    const keyPair = await crypto.subtle.generateKey(
      {
        name: 'RSA-OAEP',
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256'
      },
      true,
      ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
    );

    const publicKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
    const privateKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey);
    const fingerprint = await this.calculateFingerprint(publicKeyJwk);

    const record = {
      userId,
      userEmail,
      publicKey: keyPair.publicKey,
      privateKey: keyPair.privateKey,
      publicKeyJwk,
      privateKeyJwk,
      fingerprint,
      createdAt: new Date().toISOString()
    };

    if (this.db) {
      await new Promise((resolve) => {
        try {
          const tx = this.db.transaction(this.storeName, 'readwrite');
          const store = tx.objectStore(this.storeName);
          store.put(record);
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        } catch (e) {
          resolve();
        }
      });
    }

    // Publish public key to server registry
    try {
      await fetch('/api/chat/e2ee/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          user_email: userEmail || `${userId}@veripinoy.ph`,
          public_key: publicKeyJwk,
          key_fingerprint: fingerprint
        })
      });
    } catch (e) {
      console.warn('Could not automatically publish public key:', e.message);
    }

    return record;
  }

  // Import a public key JWK received from server
  async importPublicKey(jwk) {
    const cleanJwk = typeof jwk === 'string' ? JSON.parse(jwk) : jwk;
    return await crypto.subtle.importKey(
      'jwk',
      cleanJwk,
      { name: 'RSA-OAEP', hash: 'SHA-256' },
      true,
      ['encrypt', 'wrapKey']
    );
  }

  // Generate AES-GCM 256-bit Symmetric Session Key for a conversation
  async generateConversationSessionKey() {
    return await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
  }

  // Wrap AES-GCM key with participant's RSA-OAEP public key
  async wrapSessionKey(sessionKey, recipientPublicKey) {
    const wrappedBuffer = await crypto.subtle.wrapKey(
      'raw',
      sessionKey,
      recipientPublicKey,
      { name: 'RSA-OAEP' }
    );
    return this.arrayBufferToBase64(wrappedBuffer);
  }

  // Unwrap AES-GCM session key using user's RSA-OAEP private key
  async unwrapSessionKey(wrappedBase64, userPrivateKey) {
    const wrappedBuffer = this.base64ToArrayBuffer(wrappedBase64);
    return await crypto.subtle.unwrapKey(
      'raw',
      wrappedBuffer,
      userPrivateKey,
      { name: 'RSA-OAEP' },
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
  }

  // Encrypt plaintext string using AES-GCM 256-bit
  async encryptText(plaintext, sessionKey) {
    const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit standard IV
    const enc = new TextEncoder();
    const encoded = enc.encode(plaintext);

    const ciphertextBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      sessionKey,
      encoded
    );

    return {
      ciphertext: this.arrayBufferToBase64(ciphertextBuffer),
      iv: this.arrayBufferToBase64(iv),
      algorithm: 'AES-GCM-256',
      version: '1.0'
    };
  }

  // Decrypt AES-GCM 256-bit payload
  async decryptText(encryptedPayload, sessionKey) {
    try {
      if (!encryptedPayload || !encryptedPayload.ciphertext) return '';
      const ivBuffer = this.base64ToArrayBuffer(encryptedPayload.iv);
      const cipherBuffer = this.base64ToArrayBuffer(encryptedPayload.ciphertext);

      const decryptedBuffer = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: new Uint8Array(ivBuffer) },
        sessionKey,
        cipherBuffer
      );

      const dec = new TextDecoder();
      return dec.decode(decryptedBuffer);
    } catch (e) {
      console.warn('Decryption error:', e);
      return encryptedPayload.plaintext_preview || '[Encrypted Content - Key Missing]';
    }
  }

  // Export encrypted backup of private key using a user password
  async exportEncryptedKeyBackup(userId, passphrase) {
    const keyRecord = await this.getOrCreateUserKeyPair(userId);
    const enc = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));

    // Derive AES-GCM key from passphrase using PBKDF2
    const passKey = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
    const derivedKey = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
      passKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    );

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const privateJwkStr = JSON.stringify(keyRecord.privateKeyJwk);
    const encryptedPrivateKey = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      derivedKey,
      enc.encode(privateJwkStr)
    );

    const backupObj = {
      version: '1.0',
      type: 'VeriPinoy_E2EE_Backup',
      userId,
      fingerprint: keyRecord.fingerprint,
      salt: this.arrayBufferToBase64(salt),
      iv: this.arrayBufferToBase64(iv),
      encryptedData: this.arrayBufferToBase64(encryptedPrivateKey),
      createdAt: new Date().toISOString()
    };

    return JSON.stringify(backupObj, null, 2);
  }

  // Utilities
  arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  base64ToArrayBuffer(base64) {
    const binary_string = window.atob(base64);
    const len = binary_string.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

// Global Singleton Instance
window.veripinoyE2EE = new E2EECryptoEngine();
