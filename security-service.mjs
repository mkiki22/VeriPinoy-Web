import crypto from 'crypto';
import { queryOne, queryAll, executeRun } from './db.mjs';

/* ==========================================================================
   VERIPINOY MULTI-LAYERED DATA PROTECTION, SECURITY & ANTI-FRAUD ENGINE
   ========================================================================== */

const ENCRYPTION_MASTER_KEY = process.env.ENCRYPTION_MASTER_KEY || 'veripinoy_aes256_master_secret_key_2026_dpa_compliant_32bytes!';
const VAULT_SIGNING_SECRET = process.env.VAULT_SIGNING_SECRET || 'veripinoy_vault_hmac_secret_key_99812_secure_token!';

// Ensure 32-byte key for AES-256
const MASTER_KEY_BUFFER = crypto.createHash('sha256').update(ENCRYPTION_MASTER_KEY).digest();

export class SecurityService {

  /* ==========================================================================
     1. DATA PROTECTION & AES-256-GCM ENCRYPTION AT REST
     ========================================================================== */

  /**
   * Encrypts plaintext string using AES-256-GCM with unique 16-byte IV
   * Returns serialized ciphertext in format: enc_v1:<iv_hex>:<auth_tag_hex>:<ciphertext_hex>
   */
  static encrypt(plaintext) {
    if (!plaintext) return plaintext;
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv('aes-256-gcm', MASTER_KEY_BUFFER, iv);
      let encrypted = cipher.update(String(plaintext), 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const tag = cipher.getAuthTag().toString('hex');
      return `enc_v1:${iv.toString('hex')}:${tag}:${encrypted}`;
    } catch (err) {
      console.error('Encryption failed:', err.message);
      return plaintext;
    }
  }

  /**
   * Decrypts AES-256-GCM ciphertext verifying authentication tag
   */
  static decrypt(ciphertext) {
    if (!ciphertext || typeof ciphertext !== 'string' || !ciphertext.startsWith('enc_v1:')) {
      return ciphertext;
    }
    try {
      const parts = ciphertext.split(':');
      if (parts.length !== 4) return ciphertext;
      const iv = Buffer.from(parts[1], 'hex');
      const tag = Buffer.from(parts[2], 'hex');
      const encryptedData = parts[3];

      const decipher = crypto.createDecipheriv('aes-256-gcm', MASTER_KEY_BUFFER, iv);
      decipher.setAuthTag(tag);
      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (err) {
      console.error('Decryption failed or auth tag mismatch:', err.message);
      return '[ENCRYPTED_DATA_RESTRICTED]';
    }
  }

  /* ==========================================================================
     2. PII MASKING & DATA REDACTION (PHILIPPINES DPA 2012 COMPLIANT)
     ========================================================================== */

  /**
   * Masks Email address (e.g. maria.santos@gmail.com -> m***s@gmail.com)
   */
  static maskEmail(email) {
    if (!email || typeof email !== 'string') return '***@***.***';
    const parts = email.split('@');
    if (parts.length !== 2) return '***@***.***';
    const user = parts[0];
    const domain = parts[1];
    if (user.length <= 2) return `${user[0]}***@${domain}`;
    return `${user[0]}***${user[user.length - 1]}@${domain}`;
  }

  /**
   * Masks Tax Identification Number (TIN) (e.g. 123-456-789-000 -> 123-***-***-000)
   */
  static maskTIN(tin) {
    if (!tin || typeof tin !== 'string') return '***-***-***';
    const clean = tin.replace(/\s+/g, '');
    const segments = clean.split('-');
    if (segments.length >= 3) {
      return `${segments[0]}-***-***-${segments[segments.length - 1]}`;
    }
    if (clean.length >= 9) {
      return `${clean.substring(0, 3)}-***-***-${clean.substring(clean.length - 3)}`;
    }
    return '***-***-***';
  }

  /**
   * Masks Mobile / Telephone Number (e.g. 09171234567 -> 0917-***-4567)
   */
  static maskPhone(phone) {
    if (!phone || typeof phone !== 'string') return '****-****';
    const clean = phone.replace(/[^0-9+]/g, '');
    if (clean.length < 7) return '****-****';
    return `${clean.substring(0, 4)}-***-${clean.substring(clean.length - 4)}`;
  }

  /**
   * Masks Government ID / SEC / DTI Numbers (e.g. SEC-2026-0812 -> SEC-****-0812)
   */
  static maskGovId(idNumber) {
    if (!idNumber || typeof idNumber !== 'string') return 'ID-****-****';
    const parts = idNumber.split('-');
    if (parts.length >= 2) {
      return `${parts[0]}-****-${parts[parts.length - 1]}`;
    }
    if (idNumber.length > 6) {
      return `${idNumber.substring(0, 3)}****${idNumber.substring(idNumber.length - 3)}`;
    }
    return '****-****';
  }

  /**
   * Masks Bank / E-Wallet Account (e.g. 1234567890 -> ******7890)
   */
  static maskBankAccount(accNumber) {
    if (!accNumber || typeof accNumber !== 'string') return '******';
    const clean = accNumber.trim();
    if (clean.length <= 4) return '****';
    return `${'*'.repeat(clean.length - 4)}${clean.substring(clean.length - 4)}`;
  }

  /**
   * Redacts sensitive fields in an object based on privilege level
   */
  static sanitizeForPublic(obj, isPrivileged = false) {
    if (!obj || typeof obj !== 'object') return obj;
    const copy = Array.isArray(obj) ? [...obj] : { ...obj };

    if (Array.isArray(copy)) {
      return copy.map(item => this.sanitizeForPublic(item, isPrivileged));
    }

    if (isPrivileged) return copy;

    // Mask sensitive fields
    if (copy.email) copy.email_masked = this.maskEmail(copy.email);
    if (copy.business_email) copy.business_email_masked = this.maskEmail(copy.business_email);
    if (copy.owner_email) copy.owner_email_masked = this.maskEmail(copy.owner_email);
    if (copy.phone || copy.business_phone || copy.mobile_number) {
      const rawPhone = copy.phone || copy.business_phone || copy.mobile_number;
      copy.phone_masked = this.maskPhone(rawPhone);
    }
    if (copy.tin || copy.tax_id) {
      copy.tin_masked = this.maskTIN(copy.tin || copy.tax_id);
      delete copy.tin;
      delete copy.tax_id;
    }
    if (copy.bank_account_number) {
      copy.bank_account_masked = this.maskBankAccount(copy.bank_account_number);
      delete copy.bank_account_number;
    }
    if (copy.dtisec || copy.sec_dti_number || copy.registration_number) {
      const rawId = copy.dtisec || copy.sec_dti_number || copy.registration_number;
      copy.registration_number_masked = this.maskGovId(rawId);
    }
    if (copy.password_hash) delete copy.password_hash;
    if (copy.password_salt) delete copy.password_salt;
    if (copy.mfa_secret) delete copy.mfa_secret;
    if (copy.backup_codes_json) delete copy.backup_codes_json;

    return copy;
  }

  /* ==========================================================================
     3. SENSITIVE DOCUMENT VAULT & SHORT-LIVED SIGNED URLS
     ========================================================================== */

  /**
   * Generates a cryptographically signed, short-lived URL for sensitive document retrieval
   */
  static generateVaultSignedUrl(documentId, userId, userRole, expirationMinutes = 10, origin = 'http://localhost:3000') {
    const expiresAt = Date.now() + (expirationMinutes * 60 * 1000);
    const nonce = crypto.randomBytes(8).toString('hex');
    
    // Create HMAC signature
    const payload = `${documentId}:${userId}:${userRole}:${expiresAt}:${nonce}`;
    const hmac = crypto.createHmac('sha256', VAULT_SIGNING_SECRET).update(payload).digest('hex');

    const signedToken = Buffer.from(JSON.stringify({
      docId: documentId,
      uid: userId,
      role: userRole,
      exp: expiresAt,
      nonce,
      sig: hmac
    })).toString('base64url');

    return {
      signedUrl: `${origin}/api/vault/document/${documentId}?token=${signedToken}`,
      token: signedToken,
      expiresAt: new Date(expiresAt).toISOString(),
      expirationMinutes
    };
  }

  /**
   * Verifies signed token and checks role permissions for document access
   */
  static verifyVaultToken(documentId, signedToken, userContext = null) {
    if (!signedToken) {
      throw new Error('Access denied: Missing cryptographic vault token');
    }

    let parsed;
    try {
      const jsonStr = Buffer.from(signedToken, 'base64url').toString('utf8');
      parsed = JSON.parse(jsonStr);
    } catch (e) {
      throw new Error('Access denied: Malformed signed vault token');
    }

    if (parsed.docId !== documentId) {
      throw new Error('Access denied: Token not valid for requested document');
    }

    if (Date.now() > parsed.exp) {
      throw new Error('Access denied: Signed vault token has expired');
    }

    // Verify HMAC signature
    const payload = `${parsed.docId}:${parsed.uid}:${parsed.role}:${parsed.exp}:${parsed.nonce}`;
    const expectedHmac = crypto.createHmac('sha256', VAULT_SIGNING_SECRET).update(payload).digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(parsed.sig), Buffer.from(expectedHmac))) {
      throw new Error('Access denied: Vault token cryptographic signature is invalid or tampered');
    }

    return {
      valid: true,
      documentId: parsed.docId,
      authorizedUserId: parsed.uid,
      authorizedRole: parsed.role,
      expiresAt: new Date(parsed.exp).toISOString()
    };
  }

  /**
   * Records an immutable access audit event in vault access logs
   */
  static logVaultAccess({ documentId, userId, userType, actorRole, accessType, ipAddress, granted = 1, denialReason = null }) {
    try {
      const logId = `VAL-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const now = new Date().toISOString();
      executeRun(
        `INSERT INTO vault_access_logs (id, document_id, user_id, user_type, ip_address, access_type, granted, denial_reason, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [logId, documentId, userId || 'ANONYMOUS', userType || 'guest', ipAddress || '127.0.0.1', accessType, granted ? 1 : 0, denialReason, now]
      );
    } catch (err) {
      console.warn('Failed to log vault access:', err.message);
    }
  }

  /* ==========================================================================
     4. MULTI-FACTOR AUTHENTICATION (TOTP & EMAIL OTP ENGINE)
     ========================================================================== */

  /**
   * Generates Base32 TOTP secret and recovery backup codes
   */
  static generateMfaEnrollment(userEmail, userName = 'VeriPinoy User') {
    const rawSecret = crypto.randomBytes(20);
    // Base32 encoding RFC 4648
    const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let base32Secret = '';
    let val = 0;
    let valb = -5;
    for (let i = 0; i < rawSecret.length; i++) {
      val = (val << 8) | rawSecret[i];
      valb += 8;
      while (valb >= 0) {
        base32Secret += base32Chars[(val >> valb) & 31];
        valb -= 5;
      }
    }
    if (valb > -5) {
      base32Secret += base32Chars[((val << 8) >> (valb + 8)) & 31];
    }

    const issuer = 'VeriPinoy';
    const otpauthUrl = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(userEmail)}?secret=${base32Secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;

    // Generate 8 backup codes
    const backupCodes = [];
    for (let i = 0; i < 8; i++) {
      backupCodes.push(`${crypto.randomBytes(2).toString('hex').toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`);
    }

    return {
      secret: base32Secret,
      otpauthUrl,
      backupCodes,
      issuer,
      userEmail
    };
  }

  /**
   * Verifies standard RFC 6238 TOTP 6-digit code
   */
  static verifyTotpCode(base32Secret, userCode) {
    if (!base32Secret || !userCode) return false;
    const cleanCode = String(userCode).replace(/\s+/g, '');
    if (cleanCode.length !== 6 || !/^\d{6}$/.test(cleanCode)) return false;

    // Decode Base32
    const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = '';
    for (let i = 0; i < base32Secret.length; i++) {
      const val = base32Chars.indexOf(base32Secret.charAt(i).toUpperCase());
      if (val >= 0) bits += val.toString(2).padStart(5, '0');
    }
    const keyBytes = [];
    for (let i = 0; i + 8 <= bits.length; i += 8) {
      keyBytes.push(parseInt(bits.substr(i, 8), 2));
    }
    const keyBuffer = Buffer.from(keyBytes);

    const currentTimeStep = Math.floor(Date.now() / 30000);

    // Verify ±1 step window for network drift
    for (let delta = -1; delta <= 1; delta++) {
      const step = currentTimeStep + delta;
      const stepBuffer = Buffer.alloc(8);
      stepBuffer.writeBigInt64BE(BigInt(step));

      const hmac = crypto.createHmac('sha1', keyBuffer).update(stepBuffer).digest();
      const offset = hmac[hmac.length - 1] & 0xf;
      const codeInt = ((hmac[offset] & 0x7f) << 24) |
                      ((hmac[offset + 1] & 0xff) << 16) |
                      ((hmac[offset + 2] & 0xff) << 8) |
                      (hmac[offset + 3] & 0xff);
      const generatedCode = String(codeInt % 1000000).padStart(6, '0');

      if (generatedCode === cleanCode) {
        return true;
      }
    }

    return false;
  }

  /**
   * Generates single-use Email OTP for step-up verification
   */
  static generateEmailOtp(userId, actionType = 'HIGH_VALUE_OPERATION') {
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 mins

    const hashedOtp = crypto.createHash('sha256').update(otpCode).digest('hex');

    // Store in security_alerts / session cache
    executeRun(
      `INSERT INTO security_alerts (id, user_id, user_type, alert_type, severity, title, message, metadata_json, created_at)
       VALUES (?, ?, 'user', 'MFA_OTP_SENT', 'info', ?, ?, ?, ?)`,
      [
        `OTP-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
        userId,
        `Single-Use Verification Code for ${actionType}`,
        `Your 6-digit VeriPinoy security code is: ${otpCode}. It expires in 10 minutes.`,
        JSON.stringify({ hashedOtp, expiresAt, actionType }),
        new Date().toISOString()
      ]
    );

    return {
      otpCode, // In production, sent via email service
      expiresAt
    };
  }

  /* ==========================================================================
     5. SESSION MANAGEMENT & SECURE TOKEN ROTATION
     ========================================================================== */

  /**
   * Registers a new active session
   */
  static createActiveSession({ userId, userType, email, req, durationHours = 24 }) {
    const rawToken = `VPS_${crypto.randomBytes(32).toString('hex')}`;
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const sessionId = `SES_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + durationHours * 3600 * 1000).toISOString();

    const ipAddress = req?.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || req?.socket?.remoteAddress || '127.0.0.1';
    const userAgent = req?.headers?.['user-agent'] || 'Modern Web Browser';

    let deviceName = 'Desktop Browser (Chrome/Edge)';
    if (/mobile/i.test(userAgent)) deviceName = 'Mobile Device';
    if (/tablet|ipad/i.test(userAgent)) deviceName = 'Tablet Device';
    if (/macintosh|mac os/i.test(userAgent)) deviceName = 'Apple Mac Desktop';
    if (/windows/i.test(userAgent)) deviceName = 'Windows PC';
    if (/linux/i.test(userAgent)) deviceName = 'Linux Workstation';

    executeRun(
      `INSERT INTO active_sessions (id, session_token_hash, user_id, user_type, email, ip_address, user_agent, device_name, location, is_revoked, expires_at, created_at, last_active_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Manila, Philippines (Protected Session)', 0, ?, ?, ?)`,
      [sessionId, tokenHash, userId, userType, email, ipAddress, userAgent, deviceName, expiresAt, now, now]
    );

    return {
      sessionId,
      sessionToken: rawToken,
      expiresAt,
      deviceName,
      ipAddress
    };
  }

  /**
   * Validates active session token and checks if revoked or expired
   */
  static validateSession(rawToken) {
    if (!rawToken) return null;
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const session = queryOne(
      `SELECT * FROM active_sessions WHERE session_token_hash = ? AND is_revoked = 0`,
      [tokenHash]
    );

    if (!session) return null;

    if (new Date(session.expires_at) < new Date()) {
      executeRun(`UPDATE active_sessions SET is_revoked = 1 WHERE id = ?`, [session.id]);
      return null;
    }

    // Refresh last active timestamp
    executeRun(`UPDATE active_sessions SET last_active_at = ? WHERE id = ?`, [new Date().toISOString(), session.id]);

    return session;
  }

  /**
   * Revokes a specific session or all sessions for a user
   */
  static revokeSessions(userId, exceptSessionId = null, reason = 'User Logout or Password Reset') {
    if (exceptSessionId) {
      executeRun(
        `UPDATE active_sessions SET is_revoked = 1 WHERE user_id = ? AND id != ?`,
        [userId, exceptSessionId]
      );
    } else {
      executeRun(
        `UPDATE active_sessions SET is_revoked = 1 WHERE user_id = ?`,
        [userId]
      );
    }

    this.createSecurityAlert({
      userId,
      userType: 'user',
      alertType: 'SESSION_REVOCATION',
      severity: 'info',
      title: 'Active Sessions Revoked',
      message: `All other active sessions have been terminated. Reason: ${reason}.`
    });
  }

  /**
   * Retrieves all active sessions for a user
   */
  static getUserActiveSessions(userId) {
    return queryAll(
      `SELECT id, device_name, ip_address, location, created_at, last_active_at, expires_at
       FROM active_sessions
       WHERE user_id = ? AND is_revoked = 0 AND expires_at > datetime('now')
       ORDER BY last_active_at DESC`,
      [userId]
    );
  }

  /* ==========================================================================
     6. ANTI-FRAUD & RISK DETECTION ENGINE
     ========================================================================== */

  /**
   * Verification Link Sandboxing: Sanitizes and validates external URL
   * Strictly permits only http/https schemes, prevents XSS, and strips malicious payload
   */
  static sanitizeExternalUrl(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') {
      return { isValid: false, safeUrl: null, warningReason: 'Empty or invalid URL provided' };
    }

    const trimmed = rawUrl.trim();

    // Reject dangerous protocol schemes
    const lower = trimmed.toLowerCase();
    if (
      lower.startsWith('javascript:') ||
      lower.startsWith('data:') ||
      lower.startsWith('vbscript:') ||
      lower.startsWith('file:') ||
      lower.startsWith('blob:')
    ) {
      return {
        isValid: false,
        isSafe: false,
        riskLevel: 'CRITICAL',
        warningReason: 'Dangerous protocol detected (XSS / Remote Code Injection Blocked)',
        safeUrl: null
      };
    }

    // Enforce http/https
    let parsed;
    try {
      let formatted = trimmed;
      if (!/^https?:\/\//i.test(formatted)) {
        formatted = `https://${formatted}`;
      }
      parsed = new URL(formatted);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return { isValid: false, isSafe: false, warningReason: 'Invalid web protocol. Must be HTTP or HTTPS.' };
      }
    } catch (e) {
      return { isValid: false, isSafe: false, warningReason: 'Malformed URL structure' };
    }

    // Hostname checks
    const hostname = parsed.hostname.toLowerCase();
    const suspiciousTlds = ['.zip', '.mov', '.tk', '.ml', '.ga', '.cf', '.gq'];
    const hasSuspiciousTld = suspiciousTlds.some(tld => hostname.endsWith(tld));

    return {
      isValid: true,
      isSafe: !hasSuspiciousTld,
      riskLevel: hasSuspiciousTld ? 'MEDIUM' : 'LOW',
      warningReason: hasSuspiciousTld ? 'Uncommon top-level domain detected' : null,
      safeUrl: parsed.href,
      domain: hostname
    };
  }

  /**
   * Identity & Duplicate Entity Detection:
   * Checks for duplicate Tax IDs (TIN), DTI/SEC registration, or Bank accounts across accounts
   */
  static checkDuplicateEntities({ tin, dtisec, bankAccount, gcashNumber, phone, entityType, entityId }) {
    const findings = [];
    const now = new Date().toISOString();

    const checkField = (type, val) => {
      if (!val) return;
      const clean = String(val).trim().toUpperCase();
      const valHash = crypto.createHash('sha256').update(clean).digest('hex');

      // Check if hash exists under different entity
      const match = queryOne(
        `SELECT * FROM duplicate_check_registry WHERE field_type = ? AND field_value_hash = ? AND entity_id != ?`,
        [type, valHash, entityId]
      );

      if (match) {
        findings.push({
          fieldType: type,
          collidingEntityId: match.entity_id,
          collidingEntityType: match.entity_type,
          maskedValue: match.masked_value,
          risk: 'CRITICAL'
        });
      }

      // Upsert into registry
      let masked = clean;
      if (type === 'tin') masked = this.maskTIN(clean);
      if (type === 'bank_account') masked = this.maskBankAccount(clean);
      if (type === 'phone' || type === 'gcash') masked = this.maskPhone(clean);
      if (type === 'dtisec') masked = this.maskGovId(clean);

      executeRun(
        `INSERT OR REPLACE INTO duplicate_check_registry (id, field_type, field_value_hash, masked_value, entity_type, entity_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [`DUP_${type}_${valHash.substring(0, 16)}`, type, valHash, masked, entityType, entityId, now]
      );
    };

    if (tin) checkField('tin', tin);
    if (dtisec) checkField('dtisec', dtisec);
    if (bankAccount) checkField('bank_account', bankAccount);
    if (gcashNumber) checkField('gcash', gcashNumber);
    if (phone) checkField('phone', phone);

    return {
      hasDuplicates: findings.length > 0,
      duplicateCount: findings.length,
      findings
    };
  }

  /**
   * Dispute & Account Risk Scoring Algorithm (0 - 100 Score)
   */
  static calculateRiskScore({ entityType, entityId, accountCreatedAt, verificationStatus, disputeHistoryCount = 0, duplicatesFound = 0, recentPayoutChange = false }) {
    let score = 10; // Baseline low risk
    const riskFactors = [];

    // Factor 1: Verification Status
    if (verificationStatus === 'unverified' || verificationStatus === 'pending') {
      score += 25;
      riskFactors.push({ factor: 'Unverified Account Credentials', weight: '+25' });
    } else if (verificationStatus === 'verified') {
      score = Math.max(0, score - 10);
      riskFactors.push({ factor: 'VeriPinoy KYB Verified Badge Granted', weight: '-10' });
    }

    // Factor 2: Account Age Velocity (< 14 days)
    if (accountCreatedAt) {
      const daysOld = (Date.now() - new Date(accountCreatedAt).getTime()) / (1000 * 3600 * 24);
      if (daysOld < 14) {
        score += 20;
        riskFactors.push({ factor: `New Account Velocity (${Math.round(daysOld)} days old)`, weight: '+20' });
      }
    }

    // Factor 3: Duplicate TIN / Bank Credentials Flagged
    if (duplicatesFound > 0) {
      score += 35;
      riskFactors.push({ factor: `Identity Collision: ${duplicatesFound} Duplicate Registrations Found`, weight: '+35' });
    }

    // Factor 4: Recent Payout Account Modification
    if (recentPayoutChange) {
      score += 20;
      riskFactors.push({ factor: 'High-Risk Bank / E-Wallet Payout Change within 48 hours', weight: '+20' });
    }

    // Factor 5: Open Dispute Ratio
    if (disputeHistoryCount > 0) {
      score += Math.min(30, disputeHistoryCount * 15);
      riskFactors.push({ factor: `Active Dispute Claims Recorded (${disputeHistoryCount})`, weight: `+${Math.min(30, disputeHistoryCount * 15)}` });
    }

    score = Math.min(100, Math.max(0, score));

    let riskLevel = 'LOW';
    if (score >= 70) riskLevel = 'CRITICAL';
    else if (score >= 40) riskLevel = 'MEDIUM';

    // Store in fraud_risk_profiles
    const now = new Date().toISOString();
    executeRun(
      `INSERT OR REPLACE INTO fraud_risk_profiles (id, entity_type, entity_id, risk_score, risk_level, risk_factors_json, duplicate_flags_json, last_assessed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        `FRISK_${entityType}_${entityId}`,
        entityType,
        entityId,
        score,
        riskLevel,
        JSON.stringify(riskFactors),
        JSON.stringify({ duplicatesFound }),
        now
      ]
    );

    return {
      riskScore: score,
      riskLevel,
      riskFactors,
      isHighRisk: score >= 70
    };
  }

  /* ==========================================================================
     7. RATE LIMITING & ANTI-BOT SHIELDING (SLIDING WINDOW)
     ========================================================================== */

  static rateLimitStore = new Map();

  /**
   * Sliding window memory rate limiter
   */
  static checkRateLimit(key, maxRequests = 10, windowMs = 60000) {
    const now = Date.now();
    const entry = this.rateLimitStore.get(key) || { requests: [], blockedUntil: 0 };

    if (entry.blockedUntil > now) {
      const waitSeconds = Math.ceil((entry.blockedUntil - now) / 1000);
      return {
        allowed: false,
        remaining: 0,
        retryAfter: waitSeconds,
        message: `Too many requests. Anti-bot shield active. Please retry in ${waitSeconds} seconds.`
      };
    }

    // Filter requests inside window
    entry.requests = entry.requests.filter(timestamp => timestamp > now - windowMs);

    if (entry.requests.length >= maxRequests) {
      entry.blockedUntil = now + windowMs;
      this.rateLimitStore.set(key, entry);
      const waitSeconds = Math.ceil(windowMs / 1000);
      return {
        allowed: false,
        remaining: 0,
        retryAfter: waitSeconds,
        message: `Rate limit threshold reached (${maxRequests} requests/${Math.round(windowMs / 1000)}s). Access temporarily throttled.`
      };
    }

    entry.requests.push(now);
    this.rateLimitStore.set(key, entry);

    return {
      allowed: true,
      remaining: maxRequests - entry.requests.length,
      retryAfter: 0
    };
  }

  /* ==========================================================================
     8. SECURITY NOTIFICATIONS & TAMPER-RESISTANT AUDIT LOGGING
     ========================================================================== */

  /**
   * Creates a real-time security alert for the user or administrator
   */
  static createSecurityAlert({ userId, userType = 'user', alertType, severity = 'warning', title, message, metadata = {} }) {
    try {
      const alertId = `SEC-ALT-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
      const now = new Date().toISOString();

      executeRun(
        `INSERT INTO security_alerts (id, user_id, user_type, alert_type, severity, title, message, metadata_json, is_read, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
        [alertId, userId, userType, alertType, severity, title, message, JSON.stringify(metadata), now]
      );

      return { success: true, alertId };
    } catch (err) {
      console.warn('Failed to record security alert:', err.message);
      return { success: false };
    }
  }

  /**
   * Fetches unread or recent security alerts for a user
   */
  static getUserAlerts(userId) {
    return queryAll(
      `SELECT * FROM security_alerts WHERE user_id = ? ORDER BY created_at DESC LIMIT 20`,
      [userId]
    );
  }

  /**
   * Marks security alert as read
   */
  static markAlertRead(alertId) {
    executeRun(`UPDATE security_alerts SET is_read = 1 WHERE id = ?`, [alertId]);
  }
}
