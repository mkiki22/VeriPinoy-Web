import alasql from 'alasql';
import crypto from 'crypto';

/* Helper for hashing passwords securely with salt */
export function hashPassword(password, salt = null) {
  if (!salt) {
    salt = crypto.randomBytes(16).toString('hex');
  }
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return { hash: `${salt}:${hash}`, salt };
}

export function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, originalHash] = storedHash.split(':');
  const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(originalHash), Buffer.from(verifyHash));
}

/* Helper for token hashing */
export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function generateSecureToken() {
  return crypto.randomBytes(32).toString('hex');
}

/* No local SQLite file saving required */
export function saveDatabase() {}

/* Normalizer for SQL statements to standard JavaScript SQL */
function normalizeSql(sql) {
  if (!sql) return '';
  return sql
    .replace(/--[^\n]*/g, '')
    .replace(/PRAGMA\s+[^;]+;?/gi, '')
    .replace(/\bAUTOINCREMENT\b/gi, '')
    .replace(/\bINSERT\s+OR\s+(?:REPLACE|IGNORE)\s+INTO\b/gi, 'INSERT INTO')
    .replace(/\bTEXT\b/gi, 'STRING')
    .replace(/\bVARCHAR\([0-9]+\)/gi, 'STRING')
    .replace(/\bINTEGER\b/gi, 'INT')
    .replace(/\bREAL\b/gi, 'NUMBER')
    .replace(/,?\s*FOREIGN\s+KEY\s*\([^)]+\)\s*REFERENCES\s+[a-zA-Z0-9_]+(?:\s*\([^)]*\))?(?:\s+ON\s+(?:DELETE|UPDATE)\s+[A-Za-z\s]+)*/gi, '')
    .replace(/,?\s*CHECK\s*\([^)]+\)/gi, '')
    .replace(/COUNT\(\*\)\s+as\s+([a-zA-Z0-9_]+)/gi, 'COUNT(*) AS [$1]')
    .replace(/COUNT\(1\)\s+as\s+([a-zA-Z0-9_]+)/gi, 'COUNT(1) AS [$1]')
    .replace(/,\s*\)/g, ')')
    .trim();
}

function sanitizeParams(params = []) {
  return params.map(p => (p === undefined ? null : p));
}

let db = {
  run(sql, params = []) {
    const clean = normalizeSql(sql);
    if (!clean) return;
    try {
      return alasql(clean, sanitizeParams(params));
    } catch (e) {
      // Ignore if table/column exists or syntax nuance
    }
  },
  prepare(sql) {
    const clean = normalizeSql(sql);
    return {
      bind(params) { this.params = params; },
      step() {
        if (!this.rows) {
          try {
            this.rows = alasql(clean, sanitizeParams(this.params || [])) || [];
          } catch(e) {
            this.rows = [];
          }
          this.idx = 0;
        }
        return this.idx < this.rows.length;
      },
      getAsObject() {
        return this.rows[this.idx++];
      },
      free() {}
    };
  }
};

/* Initialize Database Schema & Seed Data */
export async function initDatabase() {
  alasql.options.modifier = 'RECORD';
  alasql.options.errorlog = false;

  /* ==========================================================================
     1. AUTHENTICATION & PORTAL SHARED TABLES
     ========================================================================== */
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      mobile_number TEXT,
      user_type TEXT NOT NULL, -- customer, business, freelancer, admin
      account_status TEXT DEFAULT 'active', -- active, suspended, deactivated
      email_verified INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS customer_profiles (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      country TEXT DEFAULT 'Philippines',
      kyc_status TEXT DEFAULT 'unverified', -- unverified, pending, approved
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS businesses (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      business_name TEXT NOT NULL,
      slug TEXT,
      business_email TEXT NOT NULL,
      business_phone TEXT,
      business_type TEXT DEFAULT 'Corporation',
      industry TEXT,
      industry_id TEXT,
      country TEXT DEFAULT 'Philippines',
      city_id TEXT,
      province_id TEXT,
      business_address TEXT,
      website TEXT,
      social_media TEXT,
      authorized_representative TEXT,
      account_status TEXT DEFAULT 'active',
      verification_status TEXT DEFAULT 'unverified', -- unverified, pending, verified, rejected
      rating REAL DEFAULT 5.0,
      review_count INTEGER DEFAULT 0,
      short_description TEXT,
      services TEXT,
      years_in_business INTEGER DEFAULT 1,
      business_size TEXT DEFAULT 'Small',
      logo TEXT,
      verified_at TEXT,
      featured INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  /* ==========================================================================
     1B. STRUCTURED LOCATION & INDUSTRY DISCOVERY TABLES
     ========================================================================== */
  db.run(`
    CREATE TABLE IF NOT EXISTS countries (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      code TEXT UNIQUE NOT NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS regions (
      id TEXT PRIMARY KEY,
      country_id TEXT NOT NULL,
      name TEXT NOT NULL,
      code TEXT,
      FOREIGN KEY (country_id) REFERENCES countries(id)
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS provinces (
      id TEXT PRIMARY KEY,
      region_id TEXT NOT NULL,
      name TEXT NOT NULL,
      FOREIGN KEY (region_id) REFERENCES regions(id)
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS cities (
      id TEXT PRIMARY KEY,
      province_id TEXT NOT NULL,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      status TEXT DEFAULT 'active',
      FOREIGN KEY (province_id) REFERENCES provinces(id)
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS barangays (
      id TEXT PRIMARY KEY,
      city_id TEXT NOT NULL,
      name TEXT NOT NULL,
      FOREIGN KEY (city_id) REFERENCES cities(id)
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS industries (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      parent_id TEXT,
      status TEXT DEFAULT 'active',
      FOREIGN KEY (parent_id) REFERENCES industries(id) ON DELETE SET NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS business_locations (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      city_id TEXT NOT NULL,
      address TEXT,
      lat REAL,
      lng REAL,
      is_primary INTEGER DEFAULT 1,
      is_public INTEGER DEFAULT 1,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
      FOREIGN KEY (city_id) REFERENCES cities(id)
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS business_users (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      role TEXT DEFAULT 'staff', -- owner, admin, staff
      status TEXT DEFAULT 'active', -- active, suspended
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS user_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      user_type TEXT NOT NULL,
      token_hash TEXT UNIQUE NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS user_password_reset_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_hash TEXT UNIQUE NOT NULL,
      used INTEGER DEFAULT 0,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS email_verification_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_hash TEXT UNIQUE NOT NULL,
      used INTEGER DEFAULT 0,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS security_events (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      user_type TEXT,
      event_type TEXT NOT NULL,
      severity TEXT DEFAULT 'info',
      details TEXT NOT NULL,
      ip_address TEXT,
      created_at TEXT NOT NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      status TEXT DEFAULT 'active', -- active, suspended, deactivated
      last_login TEXT,
      failed_login_attempts INTEGER DEFAULT 0,
      account_locked_until TEXT,
      password_changed_at TEXT,
      must_reset_password INTEGER DEFAULT 0,
      mfa_status TEXT DEFAULT 'disabled', -- disabled, enabled
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS roles (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      is_system_role INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS permissions (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS role_permissions (
      role_id TEXT NOT NULL,
      permission_code TEXT NOT NULL,
      PRIMARY KEY (role_id, permission_code),
      FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
      FOREIGN KEY (permission_code) REFERENCES permissions(code) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS admin_user_roles (
      admin_user_id TEXT NOT NULL,
      role_id TEXT NOT NULL,
      PRIMARY KEY (admin_user_id, role_id),
      FOREIGN KEY (admin_user_id) REFERENCES admin_users(id) ON DELETE CASCADE,
      FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS admin_sessions (
      id TEXT PRIMARY KEY,
      admin_user_id TEXT NOT NULL,
      token_hash TEXT UNIQUE NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (admin_user_id) REFERENCES admin_users(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id TEXT PRIMARY KEY,
      admin_user_id TEXT NOT NULL,
      token_hash TEXT UNIQUE NOT NULL,
      used INTEGER DEFAULT 0,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (admin_user_id) REFERENCES admin_users(id) ON DELETE CASCADE
    );
  `);

  /* ==========================================================================
     2. VERIFICATION (KYC & KYB) TABLES
     ========================================================================== */
  db.run(`
    CREATE TABLE IF NOT EXISTS kyc_applications (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      applicant_name TEXT NOT NULL,
      document_type TEXT NOT NULL,
      verification_status TEXT DEFAULT 'pending', -- pending, in_progress, awaiting_docs, completed, approved, rejected, escalated
      risk_level TEXT DEFAULT 'low', -- low, medium, high
      assigned_reviewer_id TEXT,
      initial_reviewer_id TEXT,
      escalated_by_id TEXT,
      reviewer_notes TEXT, -- JSON string array
      rejection_reason TEXT,
      additional_doc_requests TEXT,
      submission_date TEXT NOT NULL,
      review_date TEXT,
      decision_date TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (assigned_reviewer_id) REFERENCES admin_users(id) ON DELETE SET NULL,
      FOREIGN KEY (initial_reviewer_id) REFERENCES admin_users(id) ON DELETE SET NULL,
      FOREIGN KEY (escalated_by_id) REFERENCES admin_users(id) ON DELETE SET NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS kyc_documents (
      id TEXT PRIMARY KEY,
      kyc_application_id TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_type TEXT NOT NULL,
      file_size TEXT NOT NULL,
      doc_status TEXT DEFAULT 'Pending Review',
      masked_id_number TEXT,
      file_storage_path TEXT NOT NULL, -- Private secure file path
      created_at TEXT NOT NULL,
      FOREIGN KEY (kyc_application_id) REFERENCES kyc_applications(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS kyb_applications (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      legal_business_name TEXT NOT NULL,
      registration_number TEXT NOT NULL,
      business_type TEXT NOT NULL,
      industry TEXT NOT NULL,
      address TEXT NOT NULL,
      contact_info TEXT NOT NULL,
      owner_director_info TEXT NOT NULL,
      verification_status TEXT DEFAULT 'pending',
      risk_level TEXT DEFAULT 'low',
      assigned_reviewer_id TEXT,
      initial_reviewer_id TEXT,
      escalated_by_id TEXT,
      reviewer_notes TEXT,
      rejection_reason TEXT,
      additional_doc_requests TEXT,
      submission_date TEXT NOT NULL,
      review_date TEXT,
      decision_date TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (assigned_reviewer_id) REFERENCES admin_users(id) ON DELETE SET NULL,
      FOREIGN KEY (initial_reviewer_id) REFERENCES admin_users(id) ON DELETE SET NULL,
      FOREIGN KEY (escalated_by_id) REFERENCES admin_users(id) ON DELETE SET NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS kyb_documents (
      id TEXT PRIMARY KEY,
      kyb_application_id TEXT NOT NULL,
      doc_type TEXT, -- sec_dti, mayors_permit, bir_2303, tin_proof, signatory_id, board_resolution
      file_name TEXT NOT NULL,
      file_type TEXT NOT NULL,
      file_size TEXT NOT NULL,
      doc_status TEXT DEFAULT 'Pending Review',
      masked_reg_number TEXT,
      file_storage_path TEXT NOT NULL,
      expiry_date TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (kyb_application_id) REFERENCES kyb_applications(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS business_kyb_settings (
      business_id TEXT PRIMARY KEY,
      required_docs TEXT,
      threshold TEXT DEFAULT 'standard',
      dti_api_enabled INTEGER DEFAULT 1,
      dti_api_endpoint TEXT DEFAULT 'https://api.dti.gov.ph/pbr/v2/verify',
      sec_api_enabled INTEGER DEFAULT 1,
      sec_api_endpoint TEXT DEFAULT 'https://crs.sec.gov.ph/api/v1/entities',
      bir_api_enabled INTEGER DEFAULT 1,
      bir_api_endpoint TEXT DEFAULT 'https://api.bir.gov.ph/tin/v1/validate',
      ocr_auto_verify INTEGER DEFAULT 1,
      auto_revalidate_frequency TEXT DEFAULT 'annual',
      updated_at TEXT NOT NULL,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
    );
  `);

  /* ==========================================================================
     3. REVIEWS, MODERATION & CLAIMS TABLES
     ========================================================================== */
  db.run(`
    CREATE TABLE IF NOT EXISTS customer_reviews (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      business_id TEXT NOT NULL,
      business_name TEXT NOT NULL,
      rating INTEGER NOT NULL,
      review_title TEXT,
      review_content TEXT NOT NULL,
      review_status TEXT DEFAULT 'published', -- published, hidden, under_review, flagged, removed
      flagged_status INTEGER DEFAULT 0,
      flag_reason TEXT,
      flagged_by_business INTEGER DEFAULT 0,
      flagged_date TEXT,
      official_response TEXT,
      authenticity_score REAL DEFAULT 85,
      classification TEXT DEFAULT 'GENUINE', -- GENUINE, SUSPICIOUS, LIKELY_FAKE
      flag_reason_tags TEXT DEFAULT '["Verified Buyer"]',
      recommended_action TEXT DEFAULT 'APPROVE', -- APPROVE, FLAG, DELETE
      ai_analysis_details TEXT,
      photo_url TEXT,
      account_age_days INTEGER DEFAULT 30,
      submission_velocity_seconds INTEGER DEFAULT 60,
      user_total_reviews INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS review_audit_log (
      id TEXT PRIMARY KEY,
      review_id TEXT NOT NULL,
      action TEXT NOT NULL, -- AI_CLASSIFY, MANUAL_APPROVE, MANUAL_FLAG, MANUAL_DELETE, AI_CONSULTATION, RE_ANALYZE, ESCALATE
      user_id TEXT,
      moderator_name TEXT,
      ai_assistant_used TEXT DEFAULT 'N', -- 'Y' | 'N'
      notes TEXT,
      previous_status TEXT,
      new_status TEXT,
      authenticity_score REAL,
      classification TEXT,
      metadata TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (review_id) REFERENCES customer_reviews(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS business_responses (
      id TEXT PRIMARY KEY,
      review_id TEXT NOT NULL,
      business_id TEXT NOT NULL,
      responder_id TEXT,
      responder_name TEXT NOT NULL,
      responder_role TEXT NOT NULL DEFAULT 'Business Owner',
      response_text TEXT NOT NULL,
      status TEXT DEFAULT 'published', -- published, draft, moderation_required, removed
      version INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (review_id) REFERENCES customer_reviews(id) ON DELETE CASCADE,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS business_response_history (
      id TEXT PRIMARY KEY,
      response_id TEXT NOT NULL,
      review_id TEXT NOT NULL,
      business_id TEXT NOT NULL,
      previous_text TEXT NOT NULL,
      version INTEGER NOT NULL,
      edited_by TEXT NOT NULL,
      edited_at TEXT NOT NULL,
      FOREIGN KEY (response_id) REFERENCES business_responses(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS review_flags (
      id TEXT PRIMARY KEY,
      review_id TEXT NOT NULL,
      business_id TEXT NOT NULL,
      flagged_by TEXT NOT NULL,
      reason TEXT NOT NULL,
      explanation TEXT,
      status TEXT DEFAULT 'pending', -- pending, under_review, approved, rejected
      created_at TEXT NOT NULL,
      FOREIGN KEY (review_id) REFERENCES customer_reviews(id) ON DELETE CASCADE,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS review_notifications (
      id TEXT PRIMARY KEY,
      recipient_type TEXT NOT NULL, -- business, customer
      recipient_id TEXT NOT NULL,
      review_id TEXT,
      type TEXT NOT NULL, -- new_review, review_edited, review_flagged, claim_requested, claim_submitted, moderation_decision
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      link TEXT,
      is_read INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS business_notification_settings (
      business_id TEXT PRIMARY KEY,
      notify_new_review INTEGER DEFAULT 1,
      notify_review_flagged INTEGER DEFAULT 1,
      notify_claim_update INTEGER DEFAULT 1,
      notify_admin_decision INTEGER DEFAULT 1,
      email_digest TEXT DEFAULT 'instant',
      updated_at TEXT NOT NULL,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS review_moderation_cases (
      id TEXT PRIMARY KEY,
      review_id TEXT NOT NULL,
      customer_id TEXT NOT NULL,
      business_id TEXT NOT NULL,
      flag_reason TEXT NOT NULL,
      business_explanation TEXT,
      evidence_summary TEXT,
      case_status TEXT DEFAULT 'pending', -- pending, in_progress, resolved, escalated, awaiting_customer_claim
      priority TEXT DEFAULT 'medium', -- low, medium, high
      assigned_reviewer_id TEXT,
      resolution TEXT, -- dismissed, review_hidden, review_restored, review_removed, flag_rejected
      resolution_notes TEXT,
      resolved_by TEXT,
      resolved_date TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (review_id) REFERENCES customer_reviews(id),
      FOREIGN KEY (assigned_reviewer_id) REFERENCES admin_users(id) ON DELETE SET NULL,
      FOREIGN KEY (resolved_by) REFERENCES admin_users(id) ON DELETE SET NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS customer_claims (
      id TEXT PRIMARY KEY,
      moderation_case_id TEXT,
      review_id TEXT NOT NULL,
      customer_id TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      claim_statement TEXT NOT NULL,
      transaction_ref_info TEXT NOT NULL,
      claim_status TEXT DEFAULT 'submitted', -- pending_customer_response, submitted, under_review, settled, rejected
      claim_request_notes TEXT,
      submission_date TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (moderation_case_id) REFERENCES review_moderation_cases(id) ON DELETE SET NULL,
      FOREIGN KEY (review_id) REFERENCES customer_reviews(id)
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS business_evidence (
      id TEXT PRIMARY KEY,
      moderation_case_id TEXT,
      claim_id TEXT,
      uploader_type TEXT NOT NULL, -- business, customer
      uploader_id TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_type TEXT NOT NULL,
      file_size TEXT NOT NULL,
      evidence_description TEXT,
      file_storage_path TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (moderation_case_id) REFERENCES review_moderation_cases(id) ON DELETE SET NULL,
      FOREIGN KEY (claim_id) REFERENCES customer_claims(id) ON DELETE SET NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS case_assignments (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL,
      case_type TEXT NOT NULL, -- kyc, kyb, review, claim
      assigned_admin_id TEXT,
      assigned_by_id TEXT NOT NULL,
      previous_assignee_id TEXT,
      reassignment_reason TEXT,
      assignment_date TEXT NOT NULL,
      completed_date TEXT,
      FOREIGN KEY (assigned_admin_id) REFERENCES admin_users(id) ON DELETE SET NULL,
      FOREIGN KEY (assigned_by_id) REFERENCES admin_users(id),
      FOREIGN KEY (previous_assignee_id) REFERENCES admin_users(id) ON DELETE SET NULL
    );
  `);

  /* ==========================================================================
     4. AUDIT & SECURITY TABLES
     ========================================================================== */
  db.run(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      actor_admin_id TEXT,
      actor_name TEXT NOT NULL,
      actor_role TEXT NOT NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      previous_value TEXT,
      new_value TEXT,
      details TEXT NOT NULL,
      success INTEGER DEFAULT 1,
      ip_address TEXT,
      user_agent TEXT,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (actor_admin_id) REFERENCES admin_users(id) ON DELETE SET NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS admin_login_attempts (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      success INTEGER NOT NULL,
      failure_reason TEXT,
      attempted_at TEXT NOT NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS admin_security_events (
      id TEXT PRIMARY KEY,
      admin_user_id TEXT,
      event_type TEXT NOT NULL, -- password_reset_requested, password_reset_completed, account_locked, account_unlocked, sod_violation_blocked, mfa_challenged
      severity TEXT NOT NULL, -- info, warning, critical
      details TEXT NOT NULL,
      ip_address TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (admin_user_id) REFERENCES admin_users(id) ON DELETE SET NULL
    );
  `);

  /* ==========================================================================
     5. VERIFIED FREELANCER PORTAL TABLES
     ========================================================================== */
  db.run(`
    CREATE TABLE IF NOT EXISTS freelancer_profiles (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      professional_name TEXT NOT NULL,
      profile_photo TEXT,
      professional_category TEXT NOT NULL,
      skills TEXT,
      location TEXT NOT NULL,
      years_of_experience INTEGER DEFAULT 1,
      portfolio_links TEXT,
      website_social_links TEXT,
      verification_status TEXT DEFAULT 'pending',
      kyc_verification_status TEXT DEFAULT 'unverified',
      date_verified TEXT,
      profile_status TEXT DEFAULT 'active',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // Safe migration additions for public freelancer directory fields
  const frProfileAlters = [
    `ALTER TABLE freelancer_profiles ADD COLUMN username TEXT`,
    `ALTER TABLE freelancer_profiles ADD COLUMN professional_title TEXT`,
    `ALTER TABLE freelancer_profiles ADD COLUMN city TEXT`,
    `ALTER TABLE freelancer_profiles ADD COLUMN country TEXT DEFAULT 'Philippines'`,
    `ALTER TABLE freelancer_profiles ADD COLUMN services TEXT`,
    `ALTER TABLE freelancer_profiles ADD COLUMN professional_summary TEXT`,
    `ALTER TABLE freelancer_profiles ADD COLUMN availability TEXT DEFAULT 'Available for hire'`,
    `ALTER TABLE freelancer_profiles ADD COLUMN allow_public_discovery INTEGER DEFAULT 1`,
    `ALTER TABLE freelancer_profiles ADD COLUMN rating REAL DEFAULT 5.0`,
    `ALTER TABLE freelancer_profiles ADD COLUMN review_count INTEGER DEFAULT 0`
  ];
  frProfileAlters.forEach(sql => {
    try { db.run(sql); } catch(e) {}
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS freelancer_messages (
      id TEXT PRIMARY KEY,
      freelancer_id TEXT NOT NULL,
      sender_name TEXT NOT NULL,
      sender_email TEXT NOT NULL,
      sender_phone TEXT,
      sender_type TEXT DEFAULT 'guest',
      sender_id TEXT,
      subject TEXT NOT NULL,
      message_text TEXT NOT NULL,
      budget_range TEXT,
      status TEXT DEFAULT 'unread',
      reply_text TEXT,
      replied_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (freelancer_id) REFERENCES freelancer_profiles(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS freelancer_reviews (
      id TEXT PRIMARY KEY,
      freelancer_id TEXT NOT NULL,
      author_name TEXT NOT NULL,
      author_email TEXT,
      author_id TEXT,
      author_type TEXT DEFAULT 'client',
      rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
      review_title TEXT,
      review_text TEXT NOT NULL,
      verification_status TEXT DEFAULT 'verified',
      created_at TEXT NOT NULL,
      FOREIGN KEY (freelancer_id) REFERENCES freelancer_profiles(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS freelancer_verifications (
      id TEXT PRIMARY KEY,
      freelancer_id TEXT NOT NULL,
      kyc_application_id TEXT,
      reviewer_id TEXT,
      reviewer_notes TEXT,
      verification_status TEXT DEFAULT 'pending',
      submitted_at TEXT NOT NULL,
      reviewed_at TEXT,
      FOREIGN KEY (freelancer_id) REFERENCES freelancer_profiles(id) ON DELETE CASCADE,
      FOREIGN KEY (reviewer_id) REFERENCES admin_users(id) ON DELETE SET NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS freelancer_engagements (
      id TEXT PRIMARY KEY,
      freelancer_id TEXT NOT NULL,
      client_identifier TEXT NOT NULL,
      project_name TEXT NOT NULL,
      project_description TEXT,
      contract_ref TEXT,
      agreed_amount REAL NOT NULL,
      currency TEXT DEFAULT 'PHP',
      payment_terms TEXT NOT NULL,
      start_date TEXT NOT NULL,
      expected_completion_date TEXT NOT NULL,
      completion_status TEXT DEFAULT 'in_progress',
      payment_status TEXT DEFAULT 'unpaid',
      supporting_documents TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (freelancer_id) REFERENCES freelancer_profiles(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS freelancer_disputes (
      id TEXT PRIMARY KEY,
      freelancer_id TEXT NOT NULL,
      client_identifier TEXT NOT NULL,
      engagement_id TEXT,
      dispute_category TEXT NOT NULL,
      amount_disputed REAL NOT NULL,
      currency TEXT DEFAULT 'PHP',
      description TEXT NOT NULL,
      contract_evidence TEXT,
      case_status TEXT DEFAULT 'Submitted',
      assigned_reviewer_id TEXT,
      reviewer_notes TEXT,
      resolution TEXT,
      resolution_date TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (freelancer_id) REFERENCES freelancer_profiles(id) ON DELETE CASCADE,
      FOREIGN KEY (engagement_id) REFERENCES freelancer_engagements(id) ON DELETE SET NULL,
      FOREIGN KEY (assigned_reviewer_id) REFERENCES admin_users(id) ON DELETE SET NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS freelancer_claims (
      id TEXT PRIMARY KEY,
      dispute_id TEXT NOT NULL,
      freelancer_id TEXT NOT NULL,
      claim_statement TEXT NOT NULL,
      transaction_ref TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (dispute_id) REFERENCES freelancer_disputes(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS freelancer_evidence (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL,
      uploader_type TEXT NOT NULL,
      uploader_id TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_type TEXT NOT NULL,
      file_size TEXT NOT NULL,
      description TEXT,
      file_storage_path TEXT NOT NULL,
      access_history TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (case_id) REFERENCES freelancer_disputes(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS freelancer_milestones (
      id TEXT PRIMARY KEY,
      engagement_id TEXT NOT NULL,
      freelancer_id TEXT NOT NULL,
      milestone_title TEXT NOT NULL,
      milestone_description TEXT,
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'PHP',
      due_date TEXT,
      status TEXT DEFAULT 'pending', -- pending, in_progress, logged, pending_review, changes_requested, approved, invoiced, paid, disputed
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (engagement_id) REFERENCES freelancer_engagements(id) ON DELETE CASCADE,
      FOREIGN KEY (freelancer_id) REFERENCES freelancer_profiles(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS freelancer_work_logs (
      id TEXT PRIMARY KEY,
      freelancer_id TEXT NOT NULL,
      engagement_id TEXT NOT NULL,
      milestone_id TEXT,
      log_type TEXT DEFAULT 'milestone', -- milestone, hourly
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      hours_logged REAL DEFAULT 0,
      hourly_rate REAL DEFAULT 0,
      total_amount REAL NOT NULL,
      deliverable_links TEXT,
      attachments TEXT,
      status TEXT DEFAULT 'pending_review', -- draft, logged, pending_review, changes_requested, approved, invoiced, paid, rejected
      reviewer_feedback TEXT,
      reviewed_by TEXT,
      reviewed_at TEXT,
      invoice_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (freelancer_id) REFERENCES freelancer_profiles(id) ON DELETE CASCADE,
      FOREIGN KEY (engagement_id) REFERENCES freelancer_engagements(id) ON DELETE CASCADE,
      FOREIGN KEY (milestone_id) REFERENCES freelancer_milestones(id) ON DELETE SET NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS freelancer_invoices (
      id TEXT PRIMARY KEY,
      freelancer_id TEXT NOT NULL,
      engagement_id TEXT,
      milestone_id TEXT,
      work_log_ids TEXT,
      invoice_number TEXT NOT NULL,
      client_identifier TEXT,
      client_email TEXT,
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'PHP',
      due_date TEXT NOT NULL,
      status TEXT DEFAULT 'sent',
      payment_method TEXT,
      paid_at TEXT,
      receipt_number TEXT,
      notes TEXT,
      history TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (freelancer_id) REFERENCES freelancer_profiles(id) ON DELETE CASCADE,
      FOREIGN KEY (engagement_id) REFERENCES freelancer_engagements(id) ON DELETE SET NULL
    );
  `);

  // Column Migrations for Existing Tables
  try { db.run('ALTER TABLE freelancer_invoices ADD COLUMN milestone_id TEXT;'); } catch (_) {}
  try { db.run('ALTER TABLE freelancer_invoices ADD COLUMN work_log_ids TEXT;'); } catch (_) {}
  try { db.run('ALTER TABLE freelancer_invoices ADD COLUMN client_identifier TEXT;'); } catch (_) {}
  try { db.run('ALTER TABLE freelancer_invoices ADD COLUMN client_email TEXT;'); } catch (_) {}
  try { db.run('ALTER TABLE freelancer_invoices ADD COLUMN payment_method TEXT;'); } catch (_) {}
  try { db.run('ALTER TABLE freelancer_invoices ADD COLUMN paid_at TEXT;'); } catch (_) {}
  try { db.run('ALTER TABLE freelancer_invoices ADD COLUMN receipt_number TEXT;'); } catch (_) {}
  try { db.run('ALTER TABLE freelancer_invoices ADD COLUMN history TEXT;'); } catch (_) {}
  try { db.run('ALTER TABLE freelancer_invoices ADD COLUMN updated_at TEXT;'); } catch (_) {}

  db.run(`
    CREATE TABLE IF NOT EXISTS freelancer_payments (
      id TEXT PRIMARY KEY,
      engagement_id TEXT,
      invoice_id TEXT,
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'PHP',
      payment_date TEXT NOT NULL,
      payment_method TEXT NOT NULL,
      proof_file TEXT,
      status TEXT DEFAULT 'confirmed',
      created_at TEXT NOT NULL,
      FOREIGN KEY (engagement_id) REFERENCES freelancer_engagements(id) ON DELETE SET NULL,
      FOREIGN KEY (invoice_id) REFERENCES freelancer_invoices(id) ON DELETE SET NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS freelancer_appeals (
      id TEXT PRIMARY KEY,
      original_dispute_id TEXT NOT NULL,
      submitted_by TEXT NOT NULL,
      user_type TEXT NOT NULL,
      reason TEXT NOT NULL,
      evidence_summary TEXT,
      assigned_reviewer_id TEXT,
      decision TEXT DEFAULT 'pending',
      decision_date TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (original_dispute_id) REFERENCES freelancer_disputes(id) ON DELETE CASCADE,
      FOREIGN KEY (assigned_reviewer_id) REFERENCES admin_users(id) ON DELETE SET NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS client_responses (
      id TEXT PRIMARY KEY,
      dispute_id TEXT NOT NULL,
      client_identifier TEXT NOT NULL,
      response_text TEXT NOT NULL,
      payment_proof_info TEXT,
      submitted_at TEXT NOT NULL,
      FOREIGN KEY (dispute_id) REFERENCES freelancer_disputes(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS dispute_assignments (
      id TEXT PRIMARY KEY,
      dispute_id TEXT NOT NULL,
      assigned_admin_id TEXT,
      assigned_by_id TEXT NOT NULL,
      previous_assignee_id TEXT,
      reassignment_reason TEXT,
      assignment_date TEXT NOT NULL,
      FOREIGN KEY (dispute_id) REFERENCES freelancer_disputes(id) ON DELETE CASCADE,
      FOREIGN KEY (assigned_admin_id) REFERENCES admin_users(id) ON DELETE SET NULL,
      FOREIGN KEY (assigned_by_id) REFERENCES admin_users(id),
      FOREIGN KEY (previous_assignee_id) REFERENCES admin_users(id) ON DELETE SET NULL
    );
  `);

  /* ==========================================================================
     6. PRICING, SUBSCRIPTIONS & PAYMENT GATEWAY TABLES
     ========================================================================== */
  db.run(`
    CREATE TABLE IF NOT EXISTS pricing_plans (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      plan_type TEXT NOT NULL,
      monthly_price REAL NOT NULL,
      annual_price REAL NOT NULL,
      currency TEXT DEFAULT 'PHP',
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS pricing_plan_features (
      id TEXT PRIMARY KEY,
      plan_id TEXT NOT NULL,
      feature_text TEXT NOT NULL,
      display_order INTEGER DEFAULT 1,
      FOREIGN KEY (plan_id) REFERENCES pricing_plans(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      user_type TEXT DEFAULT 'freelancer',
      plan_id TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      billing_cycle TEXT DEFAULT 'monthly',
      current_period_start TEXT NOT NULL,
      current_period_end TEXT NOT NULL,
      cancel_at_period_end INTEGER DEFAULT 0,
      gateway_subscription_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (plan_id) REFERENCES pricing_plans(id)
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS checkout_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      user_type TEXT DEFAULT 'freelancer',
      plan_id TEXT NOT NULL,
      billing_cycle TEXT DEFAULT 'monthly',
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'PHP',
      status TEXT DEFAULT 'pending', -- pending, completed, cancelled, expired, failed
      gateway_provider TEXT NOT NULL,
      gateway_session_id TEXT,
      checkout_url TEXT,
      success_url TEXT,
      cancel_url TEXT,
      payment_id TEXT,
      subscription_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (plan_id) REFERENCES pricing_plans(id)
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS subscription_items (
      id TEXT PRIMARY KEY,
      subscription_id TEXT NOT NULL,
      plan_id TEXT NOT NULL,
      quantity INTEGER DEFAULT 1,
      unit_price REAL NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE,
      FOREIGN KEY (plan_id) REFERENCES pricing_plans(id)
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      subscription_id TEXT,
      user_id TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'PHP',
      gateway_payment_id TEXT,
      payment_method TEXT DEFAULT 'Credit Card / GCash',
      status TEXT DEFAULT 'succeeded',
      receipt_url TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE SET NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS payment_transactions (
      id TEXT PRIMARY KEY,
      payment_id TEXT NOT NULL,
      transaction_type TEXT NOT NULL,
      amount REAL NOT NULL,
      status TEXT DEFAULT 'succeeded',
      gateway_response_json TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS payment_methods (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      brand TEXT NOT NULL,
      last4 TEXT NOT NULL,
      exp_month INTEGER NOT NULL,
      exp_year INTEGER NOT NULL,
      gateway_pm_id TEXT,
      is_default INTEGER DEFAULT 1,
      created_at TEXT NOT NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      subscription_id TEXT,
      user_id TEXT NOT NULL,
      invoice_number TEXT NOT NULL,
      amount_due REAL NOT NULL,
      amount_paid REAL NOT NULL,
      currency TEXT DEFAULT 'PHP',
      status TEXT DEFAULT 'paid',
      pdf_url TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE SET NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS refunds (
      id TEXT PRIMARY KEY,
      payment_id TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'PHP',
      reason TEXT NOT NULL,
      requested_by TEXT NOT NULL,
      approved_by TEXT,
      status TEXT DEFAULT 'succeeded',
      gateway_refund_id TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS payment_webhooks (
      id TEXT PRIMARY KEY,
      event_id TEXT UNIQUE NOT NULL,
      event_type TEXT NOT NULL,
      gateway TEXT DEFAULT 'VeriPay',
      payload_json TEXT NOT NULL,
      processed INTEGER DEFAULT 1,
      created_at TEXT NOT NULL
    );
  `);

  /* ==========================================================================
     1C. DATA PROTECTION, SENSITIVE VAULT & ANTI-FRAUD TABLES (DPA 2012 & OWASP)
     ========================================================================== */
  db.run(`
    CREATE TABLE IF NOT EXISTS active_sessions (
      id TEXT PRIMARY KEY,
      session_token_hash TEXT UNIQUE NOT NULL,
      user_id TEXT NOT NULL,
      user_type TEXT NOT NULL,
      email TEXT,
      ip_address TEXT,
      user_agent TEXT,
      device_name TEXT,
      location TEXT DEFAULT 'Manila, Philippines',
      is_revoked INTEGER DEFAULT 0,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      last_active_at TEXT NOT NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS user_mfa_settings (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL,
      user_type TEXT NOT NULL,
      mfa_enabled INTEGER DEFAULT 0,
      mfa_type TEXT DEFAULT 'totp',
      secret TEXT,
      backup_codes_json TEXT,
      phone_number TEXT,
      is_enforced INTEGER DEFAULT 0,
      last_verified_at TEXT,
      updated_at TEXT NOT NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS vault_documents (
      id TEXT PRIMARY KEY,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      document_type TEXT NOT NULL,
      filename TEXT NOT NULL,
      storage_path TEXT,
      encryption_algorithm TEXT DEFAULT 'AES-256-GCM',
      access_policy TEXT DEFAULT 'role_restricted',
      file_size INTEGER DEFAULT 0,
      mime_type TEXT DEFAULT 'application/pdf',
      uploaded_by TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS vault_access_logs (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      user_type TEXT NOT NULL,
      ip_address TEXT,
      access_type TEXT NOT NULL,
      granted INTEGER DEFAULT 1,
      denial_reason TEXT,
      created_at TEXT NOT NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS duplicate_check_registry (
      id TEXT PRIMARY KEY,
      field_type TEXT NOT NULL,
      field_value_hash TEXT NOT NULL,
      masked_value TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS fraud_risk_profiles (
      id TEXT PRIMARY KEY,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      risk_score INTEGER DEFAULT 10,
      risk_level TEXT DEFAULT 'LOW',
      risk_factors_json TEXT,
      duplicate_flags_json TEXT,
      last_assessed_at TEXT NOT NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS security_alerts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      user_type TEXT NOT NULL,
      alert_type TEXT NOT NULL,
      severity TEXT DEFAULT 'warning',
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      metadata_json TEXT,
      is_read INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );
  `);

  /* ==========================================================================
     NOTES VIEWER & MANAGEMENT SCHEMA
     ========================================================================== */
  db.run(`
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      user_id TEXT DEFAULT 'VP-FR-10284',
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      category TEXT DEFAULT 'Work',
      tags TEXT DEFAULT '[]',
      is_pinned INTEGER DEFAULT 0,
      photo_url TEXT,
      color TEXT DEFAULT '#FFFFFF',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  /* ==========================================================================
     DUAL-PROVIDER ESCROW & PARTNER AUDIT LOGS SCHEMA
     ========================================================================== */
  db.run(`
    CREATE TABLE IF NOT EXISTS escrow_partner_logs (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL, -- 'ESCROW_COM' | 'PARTNER_BANK'
      action TEXT NOT NULL,   -- 'CREATE_TRANSACTION', 'DEPOSIT_FUNDS', 'REQUEST_RELEASE', 'RELEASE_FUNDS', 'DISPUTE_OPENED', 'REFUND', 'STATUS_SYNC', 'WEBHOOK_RECEIVED'
      transaction_id TEXT,
      engagement_id TEXT,
      milestone_id TEXT,
      partner_ref TEXT,
      amount REAL DEFAULT 0,
      currency TEXT DEFAULT 'PHP',
      request_payload TEXT,
      response_payload TEXT,
      status TEXT DEFAULT 'SUCCESS', -- 'SUCCESS' | 'FAILED' | 'PENDING' | 'PROCESSED'
      ip_address TEXT DEFAULT '127.0.0.1',
      created_at TEXT NOT NULL
    );
  `);

  /* Run safe column migrations for existing SQLite database */
  const reviewColumns = [
    { name: 'authenticity_score', type: 'REAL DEFAULT 85' },
    { name: 'classification', type: "TEXT DEFAULT 'GENUINE'" },
    { name: 'flag_reason_tags', type: `TEXT DEFAULT '["Verified Buyer"]'` },
    { name: 'recommended_action', type: "TEXT DEFAULT 'APPROVE'" },
    { name: 'ai_analysis_details', type: 'TEXT' },
    { name: 'photo_url', type: 'TEXT' },
    { name: 'account_age_days', type: 'INTEGER DEFAULT 30' },
    { name: 'submission_velocity_seconds', type: 'INTEGER DEFAULT 60' },
    { name: 'user_total_reviews', type: 'INTEGER DEFAULT 1' }
  ];
  for (const col of reviewColumns) {
    try {
      db.run(`ALTER TABLE customer_reviews ADD COLUMN ${col.name} ${col.type};`);
    } catch (e) {
      // Column already exists or table freshly created with columns
    }
  }

  // Escrow columns for milestones
  const milestoneColumns = [
    { name: 'escrow_provider', type: "TEXT DEFAULT 'ESCROW_COM'" },
    { name: 'escrow_status', type: "TEXT DEFAULT 'UNFUNDED'" },
    { name: 'escrow_transaction_id', type: "TEXT" },
    { name: 'escrow_partner_ref', type: "TEXT" },
    { name: 'escrow_deposit_amount', type: "REAL DEFAULT 0" },
    { name: 'escrow_funded_at', type: "TEXT" },
    { name: 'escrow_released_at', type: "TEXT" }
  ];
  for (const col of milestoneColumns) {
    try {
      db.run(`ALTER TABLE freelancer_milestones ADD COLUMN ${col.name} ${col.type};`);
    } catch (e) {}
  }

  // Escrow columns for engagements
  const engagementColumns = [
    { name: 'escrow_provider', type: "TEXT DEFAULT 'ESCROW_COM'" },
    { name: 'escrow_status', type: "TEXT DEFAULT 'UNFUNDED'" },
    { name: 'escrow_transaction_id', type: "TEXT" }
  ];
  for (const col of engagementColumns) {
    try {
      db.run(`ALTER TABLE freelancer_engagements ADD COLUMN ${col.name} ${col.type};`);
    } catch (e) {}
  }

  // Support Tickets and Live Inquiries
  db.run(`
    CREATE TABLE IF NOT EXISTS support_tickets (
      id TEXT PRIMARY KEY,
      ticket_number TEXT UNIQUE NOT NULL,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      user_email TEXT NOT NULL,
      user_type TEXT DEFAULT 'guest',
      category TEXT DEFAULT 'general',
      priority TEXT DEFAULT 'medium',
      subject TEXT NOT NULL,
      status TEXT DEFAULT 'open',
      assigned_staff_id TEXT,
      assigned_staff_name TEXT,
      last_message TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS support_ticket_messages (
      id TEXT PRIMARY KEY,
      ticket_id TEXT NOT NULL,
      sender_type TEXT NOT NULL,
      sender_id TEXT,
      sender_name TEXT NOT NULL,
      message TEXT NOT NULL,
      attachments TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE
    );
  `);

  /* ==========================================================================
     6. ROLE-BASED REPORTING, PROFILES & PIPELINE SCHEMA (RBAC)
     ========================================================================== */
  db.run(`
    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL,
      email TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL, -- 'auditor', 'sales', 'admin', 'super_admin', 'business', 'freelancer', 'customer'
      role_title TEXT NOT NULL,
      department TEXT NOT NULL,
      permissions_json TEXT,
      phone TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS merchant_pipeline (
      id TEXT PRIMARY KEY,
      business_name TEXT NOT NULL,
      owner_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      industry TEXT NOT NULL,
      city TEXT NOT NULL,
      stage TEXT NOT NULL, -- 'lead_ingestion', 'initial_outreach', 'doc_submission', 'kyb_under_review', 'verified_onboarded', 'spotlight_converted'
      deal_value REAL DEFAULT 0,
      referral_source TEXT DEFAULT 'Organic',
      referral_code TEXT,
      referrer_name TEXT,
      assigned_sales_rep TEXT,
      contact_notes TEXT,
      last_activity_date TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS referrals (
      id TEXT PRIMARY KEY,
      referrer_name TEXT NOT NULL,
      referrer_email TEXT NOT NULL,
      referrer_type TEXT NOT NULL, -- 'partner_firm', 'bni_chapter', 'dti_negosyo_center', 'verified_merchant'
      referral_code TEXT UNIQUE NOT NULL,
      total_referred_merchants INTEGER DEFAULT 0,
      converted_merchants INTEGER DEFAULT 0,
      conversion_rate REAL DEFAULT 0.0,
      commission_earned REAL DEFAULT 0,
      commission_paid REAL DEFAULT 0,
      status TEXT DEFAULT 'active', -- 'active', 'pending_payout'
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS staff_performance_metrics (
      id TEXT PRIMARY KEY,
      staff_id TEXT NOT NULL,
      staff_name TEXT NOT NULL,
      role_name TEXT NOT NULL,
      department TEXT NOT NULL,
      total_tickets_assigned INTEGER DEFAULT 0,
      total_tickets_resolved INTEGER DEFAULT 0,
      avg_review_time_mins REAL DEFAULT 0,
      compliance_accuracy_rate REAL DEFAULT 99.0,
      approvals_count INTEGER DEFAULT 0,
      rejections_count INTEGER DEFAULT 0,
      pending_in_review INTEGER DEFAULT 0,
      period_label TEXT DEFAULT 'Current Quarter 2026',
      last_active_at TEXT NOT NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS cardo_compliance_audits (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      business_name TEXT NOT NULL,
      dti_sec_reg_no TEXT NOT NULL,
      dti_sec_status TEXT NOT NULL, -- 'verified_active', 'pending_renewal', 'under_investigation', 'flagged_mismatch'
      cardo_ai_confidence REAL DEFAULT 98.5,
      bir_2303_status TEXT NOT NULL, -- 'verified_tax_compliant', 'pending_upload', 'tin_mismatched'
      mayors_permit_status TEXT NOT NULL, -- 'verified_valid', 'expired', 'under_lgu_check'
      risk_level TEXT DEFAULT 'LOW', -- 'LOW', 'MODERATE', 'HIGH'
      last_audited_at TEXT NOT NULL,
      audited_by TEXT NOT NULL
    );
  `);

  /* CREATE INDEXES FOR PERFORMANCE (Safely wrapped) */
  const indexSqls = [
    `CREATE INDEX IF NOT EXISTS idx_active_sessions_hash ON active_sessions(session_token_hash);`,
    `CREATE INDEX IF NOT EXISTS idx_active_sessions_user ON active_sessions(user_id);`,
    `CREATE INDEX IF NOT EXISTS idx_sec_alerts_user ON security_alerts(user_id);`,
    `CREATE INDEX IF NOT EXISTS idx_vault_docs_entity ON vault_documents(entity_id);`,
    `CREATE INDEX IF NOT EXISTS idx_dup_registry_hash ON duplicate_check_registry(field_value_hash);`,
    `CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);`,
    `CREATE INDEX IF NOT EXISTS idx_kyc_apps_status ON kyc_applications(verification_status);`,
    `CREATE INDEX IF NOT EXISTS idx_kyb_apps_status ON kyb_applications(verification_status);`,
    `CREATE INDEX IF NOT EXISTS idx_reviews_biz ON customer_reviews(business_id);`,
    `CREATE INDEX IF NOT EXISTS idx_reviews_score ON customer_reviews(authenticity_score);`,
    `CREATE INDEX IF NOT EXISTS idx_reviews_class ON customer_reviews(classification);`,
    `CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_admin_id);`,
    `CREATE INDEX IF NOT EXISTS idx_case_assign_case ON case_assignments(case_id);`,
    `CREATE INDEX IF NOT EXISTS idx_rev_audit_rev ON review_audit_log(review_id);`,
    `CREATE INDEX IF NOT EXISTS idx_rev_audit_action ON review_audit_log(action);`,
    `CREATE INDEX IF NOT EXISTS idx_notes_user ON notes(user_id);`,
    `CREATE INDEX IF NOT EXISTS idx_notes_pinned ON notes(is_pinned);`,
    `CREATE INDEX IF NOT EXISTS idx_notes_cat ON notes(category);`,
    `CREATE INDEX IF NOT EXISTS idx_escrow_logs_provider ON escrow_partner_logs(provider);`,
    `CREATE INDEX IF NOT EXISTS idx_escrow_logs_tx ON escrow_partner_logs(transaction_id);`,
    `CREATE INDEX IF NOT EXISTS idx_escrow_logs_mls ON escrow_partner_logs(milestone_id);`,
    `CREATE INDEX IF NOT EXISTS idx_support_tkts_user ON support_tickets(user_id);`,
    `CREATE INDEX IF NOT EXISTS idx_support_tkts_status ON support_tickets(status);`,
    `CREATE INDEX IF NOT EXISTS idx_support_tkts_cat ON support_tickets(category);`,
    `CREATE INDEX IF NOT EXISTS idx_support_msgs_tkt ON support_ticket_messages(ticket_id);`,
    `CREATE INDEX IF NOT EXISTS idx_chat_conv_part_a ON chat_conversations(participant_a_id);`,
    `CREATE INDEX IF NOT EXISTS idx_chat_conv_part_b ON chat_conversations(participant_b_id);`,
    `CREATE INDEX IF NOT EXISTS idx_chat_msgs_conv ON chat_messages(conversation_id);`,
    `CREATE INDEX IF NOT EXISTS idx_chat_msgs_sender ON chat_messages(sender_id);`,
    `CREATE INDEX IF NOT EXISTS idx_e2ee_keys_user ON user_e2ee_keys(user_id);`
  ];

  /* ==========================================================================
     E2EE & UNIVERSAL CHAT WORKFLOW TABLES
     ========================================================================== */
  db.run(`
    CREATE TABLE IF NOT EXISTS user_e2ee_keys (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL,
      user_email TEXT NOT NULL,
      public_key TEXT NOT NULL,
      ecdh_public_key TEXT,
      key_fingerprint TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS chat_conversations (
      id TEXT PRIMARY KEY,
      conversation_type TEXT NOT NULL, -- 'contract', 'support', 'direct', 'inquiry'
      participant_a_id TEXT NOT NULL,
      participant_a_name TEXT NOT NULL,
      participant_a_role TEXT NOT NULL, -- 'customer', 'freelancer', 'business', 'staff'
      participant_b_id TEXT NOT NULL,
      participant_b_name TEXT NOT NULL,
      participant_b_role TEXT NOT NULL, -- 'customer', 'freelancer', 'business', 'staff'
      contract_id TEXT,
      ticket_id TEXT,
      title TEXT NOT NULL,
      is_e2ee INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      last_message_text TEXT,
      last_message_sender_id TEXT,
      last_message_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS chat_conversation_keys (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      wrapped_key TEXT NOT NULL,
      algorithm TEXT DEFAULT 'RSA-OAEP-256',
      created_at TEXT NOT NULL,
      FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      sender_name TEXT NOT NULL,
      sender_role TEXT NOT NULL,
      recipient_id TEXT NOT NULL,
      message_text TEXT,
      is_e2ee INTEGER DEFAULT 0,
      encrypted_payload TEXT,
      attachments TEXT,
      quote_reply_to TEXT,
      quote_preview TEXT,
      status TEXT DEFAULT 'sent',
      is_edited INTEGER DEFAULT 0,
      is_deleted INTEGER DEFAULT 0,
      read_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS chat_presence (
      user_id TEXT PRIMARY KEY,
      status TEXT DEFAULT 'online',
      is_typing_in TEXT,
      last_seen_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS chat_attachments (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      message_id TEXT,
      uploader_id TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      mime_type TEXT NOT NULL,
      file_data TEXT,
      created_at TEXT NOT NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS chat_email_notifications (
      id TEXT PRIMARY KEY,
      recipient_email TEXT NOT NULL,
      recipient_name TEXT NOT NULL,
      sender_name TEXT NOT NULL,
      conversation_id TEXT NOT NULL,
      preview_snippet TEXT NOT NULL,
      direct_link TEXT NOT NULL,
      status TEXT DEFAULT 'dispatched',
      sent_at TEXT NOT NULL
    );
  `);
  for (const idxSql of indexSqls) {
    try {
      db.run(idxSql);
    } catch (e) {
      console.warn("Notice: index creation warning:", e.message);
    }
  }

  /* ==========================================================================
     SEED INITIAL MASTER DATA IF TABLES ARE EMPTY
     ========================================================================== */
  seedDatabaseIfEmpty();

  console.log('VeriPinoy Relational Database Backend initialized successfully.');
}

/* Query Wrappers powered by JavaScript & SQL */
export function queryAll(sqlStr, params = []) {
  const clean = normalizeSql(sqlStr);
  try {
    const result = alasql(clean, sanitizeParams(params));
    return Array.isArray(result) ? result : [];
  } catch (err) {
    try {
      const stmt = db.prepare(sqlStr);
      stmt.bind(sanitizeParams(params));
      const rows = [];
      while (stmt.step()) {
        rows.push(stmt.getAsObject());
      }
      stmt.free();
      return rows;
    } catch (e2) {
      console.warn('[DB Query Warning]:', err.message, sqlStr.substring(0, 80));
      return [];
    }
  }
}

export function queryOne(sqlStr, params = []) {
  const rows = queryAll(sqlStr, params);
  return rows.length > 0 ? rows[0] : null;
}

export function executeRun(sqlStr, params = []) {
  const clean = normalizeSql(sqlStr);
  try {
    alasql(clean, sanitizeParams(params));
  } catch (err) {
    try {
      db.run(sqlStr, sanitizeParams(params));
    } catch (_) {}
  }
}

/* Seeding Master Data */
function seedDatabaseIfEmpty() {
  const userCheck = queryOne('SELECT COUNT(*) as count FROM admin_users');
  const freelancerCheck = queryOne('SELECT COUNT(*) as count FROM freelancer_profiles');

  const now = new Date().toISOString();

  // Always ensure all pricing plans, security data, freelancer profiles, review moderation cases, support tickets, and role-based reports are seeded/updated
  seedPricingPlans(now);
  seedSecurityData(now);
  seedFreelancerData(now);
  seedDiscoveryMasterData(now);
  seedReviewModerationData(now);
  seedSupportData(now);
  seedUniversalChatData(now);
  seedRoleBasedReportsData(now);

  if (userCheck && userCheck.count > 0) return; // Main tables already seeded

  console.log('Seeding initial system permissions, roles, staff accounts, and cases...');

  /* PERMISSIONS */
  const permissions = [
    { code: 'kyc.view', name: 'View KYC Applications', category: 'KYC Verification', description: 'View assigned or public KYC verification requests' },
    { code: 'kyc.review', name: 'Review KYC Documents', category: 'KYC Verification', description: 'Perform initial document checks and add notes' },
    { code: 'kyc.approve', name: 'Approve KYC', category: 'KYC Verification', description: 'Grant final identity verification approval' },
    { code: 'kyc.reject', name: 'Reject KYC', category: 'KYC Verification', description: 'Reject identity verification applications' },

    { code: 'kyb.view', name: 'View KYB Applications', category: 'KYB Business Verification', description: 'View business registration filings and profiles' },
    { code: 'kyb.review', name: 'Review KYB Filing', category: 'KYB Business Verification', description: "Inspect DTI, SEC, Mayor's Permit, and BIR documents" },
    { code: 'kyb.approve', name: 'Approve KYB', category: 'KYB Business Verification', description: 'Grant VeriPinoy verified badge to business' },
    { code: 'kyb.reject', name: 'Reject KYB', category: 'KYB Business Verification', description: 'Decline business verification submission' },

    { code: 'reviews.view', name: 'View Flagged Reviews', category: 'Content Moderation', description: 'Access customer reviews reported for violation' },
    { code: 'reviews.moderate', name: 'Moderate Reviews', category: 'Content Moderation', description: 'Perform evidence inspection and reviewer contact' },
    { code: 'reviews.resolve', name: 'Resolve Review Disputes', category: 'Content Moderation', description: 'Take final action (publish, remove, dismiss flag)' },

    { code: 'claims.view', name: 'View Customer Claims', category: 'Dispute Management', description: 'View formal DPA and consumer claims against shops' },
    { code: 'claims.review', name: 'Review Claim Evidence', category: 'Dispute Management', description: 'Inspect supporting merchant and customer evidence' },
    { code: 'claims.resolve', name: 'Resolve Claims', category: 'Dispute Management', description: 'Close, settle, or arbitrate customer claims' },

    { code: 'evidence.view', name: 'View Restricted Evidence', category: 'Evidence & Documents', description: 'Access sensitive government IDs and legal docs' },
    { code: 'evidence.download', name: 'Download Evidence', category: 'Evidence & Documents', description: 'Download case attachments for legal audit' },

    { code: 'users.view', name: 'View User Directories', category: 'Platform Records', description: 'Search customer and staff account directories' },
    { code: 'businesses.view', name: 'View Business Records', category: 'Platform Records', description: 'Access full merchant filing records' },
    { code: 'audit_logs.view', name: 'View System Audit Logs', category: 'Audit & Compliance', description: 'Inspect immutable system event & action logs' },

    { code: 'admins.create', name: 'Create Staff Accounts', category: 'Staff Administration', description: 'Provision new staff, reviewers, and moderators' },
    { code: 'admins.edit', name: 'Modify Staff Profiles', category: 'Staff Administration', description: 'Update staff account permissions and reset passwords' },
    { code: 'admins.suspend', name: 'Suspend/Deactivate Staff', category: 'Staff Administration', description: 'Deactivate or suspend staff accounts' },
    { code: 'roles.manage', name: 'Manage Custom Roles', category: 'System Governance', description: 'Create custom roles and assign permission matrices' },
    { code: 'settings.manage', name: 'Manage System Settings', category: 'System Governance', description: 'Configure Separation of Duties (SoD) policies' },

    { code: 'freelancers.view', name: 'View Freelancers & Verifications', category: 'Freelancer Governance', description: 'Inspect freelancer profiles and KYC status' },
    { code: 'freelancers.verify', name: 'Approve/Reject Freelancer Verification', category: 'Freelancer Governance', description: 'Review and decide on freelancer badge applications' },
    { code: 'freelancer_disputes.view', name: 'View Freelancer Disputes', category: 'Dispute Arbitration', description: 'View non-payment and scope dispute filings' },
    { code: 'freelancer_disputes.review', name: 'Review Freelancer Cases & Evidence', category: 'Dispute Arbitration', description: 'Inspect client responses and submitted evidence' },
    { code: 'freelancer_disputes.resolve', name: 'Resolve Freelancer Disputes', category: 'Dispute Arbitration', description: 'Issue binding neutral dispute resolutions' },
    { code: 'freelancer_disputes.escalate', name: 'Escalate Freelancer Disputes', category: 'Dispute Arbitration', description: 'Escalate disputes to senior arbitration panel' },
    { code: 'billing.view', name: 'View Billing & Subscriptions', category: 'Financial Management', description: 'View financial stats, subscriptions, and payment history' },
    { code: 'billing.manage', name: 'Manage Pricing & Issue Refunds', category: 'Financial Management', description: 'Edit pricing plans, manage subscriptions, and process refunds' }
  ];

  for (const p of permissions) {
    executeRun(
      'INSERT INTO permissions (id, code, name, category, description) VALUES (?, ?, ?, ?, ?)',
      [`perm_${p.code}`, p.code, p.name, p.category, p.description]
    );
  }

  /* ROLES */
  const roles = [
    {
      id: 'super_admin',
      name: 'Super Admin',
      description: 'Full access to the entire VeriPinoy administrative system, staff management, and security policies.',
      is_system_role: 1,
      permissions: permissions.map(p => p.code)
    },
    {
      id: 'admin',
      name: 'Admin',
      description: 'Broad operational access for daily compliance, case management, and audit log viewing.',
      is_system_role: 1,
      permissions: [
        'kyc.view', 'kyc.review', 'kyc.approve', 'kyc.reject',
        'kyb.view', 'kyb.review', 'kyb.approve', 'kyb.reject',
        'reviews.view', 'reviews.moderate', 'reviews.resolve',
        'claims.view', 'claims.review', 'claims.resolve',
        'evidence.view', 'evidence.download',
        'users.view', 'businesses.view', 'audit_logs.view'
      ]
    },
    {
      id: 'kyc_kyb_reviewer',
      name: 'KYC / KYB Reviewer',
      description: 'Focused specifically on identity verification (KYC) and business KYB filing audits.',
      is_system_role: 1,
      permissions: [
        'kyc.view', 'kyc.review', 'kyc.approve', 'kyc.reject',
        'kyb.view', 'kyb.review', 'kyb.approve', 'kyb.reject',
        'evidence.view', 'users.view', 'businesses.view'
      ]
    },
    {
      id: 'review_moderator',
      name: 'Review Moderator',
      description: 'Handles flagged reviews, consumer claims, merchant disputes, and evidence arbitration.',
      is_system_role: 1,
      permissions: [
        'reviews.view', 'reviews.moderate', 'reviews.resolve',
        'claims.view', 'claims.review', 'claims.resolve',
        'evidence.view', 'businesses.view'
      ]
    },
    {
      id: 'support_staff',
      name: 'Support Staff',
      description: 'Assists customers and business owners with general support cases and status inquiries.',
      is_system_role: 1,
      permissions: [
        'kyc.view', 'kyb.view', 'reviews.view', 'claims.view',
        'users.view', 'businesses.view'
      ]
    },
    {
      id: 'read_only_auditor',
      name: 'Read-Only Auditor',
      description: 'Can inspect all KYC/KYB records, moderation cases, audit logs, and admin actions without edit rights.',
      is_system_role: 1,
      permissions: [
        'kyc.view', 'kyb.view', 'reviews.view', 'claims.view',
        'evidence.view', 'users.view', 'businesses.view', 'audit_logs.view'
      ]
    },
    {
      id: 'freelancer_reviewer',
      name: 'Freelancer Dispute Reviewer',
      description: 'Dedicated role for reviewing freelancer verification applications, work engagement disputes, client responses, and evidence arbitration.',
      is_system_role: 1,
      permissions: [
        'freelancers.view', 'freelancers.verify',
        'freelancer_disputes.view', 'freelancer_disputes.review', 'freelancer_disputes.resolve', 'freelancer_disputes.escalate',
        'evidence.view', 'evidence.download'
      ]
    }
  ];

  for (const r of roles) {
    executeRun(
      'INSERT INTO roles (id, name, description, is_system_role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      [r.id, r.name, r.description, r.is_system_role, now, now]
    );
    for (const pCode of r.permissions) {
      executeRun('INSERT INTO role_permissions (role_id, permission_code) VALUES (?, ?)', [r.id, pCode]);
    }
  }

  /* ADMIN USERS */
  const defaultPass = hashPassword('password123');
  const staffMembers = [
    { id: 'STF-101', name: 'Maria Santos', email: 'super.admin@veripinoy.ph', roleId: 'super_admin', mfa: 'enabled' },
    { id: 'STF-102', name: 'Juan dela Cruz', email: 'admin.ops@veripinoy.ph', roleId: 'admin', mfa: 'disabled' },
    { id: 'STF-103', name: 'Elena Reyes', email: 'kyc.reviewer@veripinoy.ph', roleId: 'kyc_kyb_reviewer', mfa: 'disabled' },
    { id: 'STF-104', name: 'Ana Garcia', email: 'moderator.ana@veripinoy.ph', roleId: 'review_moderator', mfa: 'disabled' },
    { id: 'STF-105', name: 'Ben Torres', email: 'support.ben@veripinoy.ph', roleId: 'support_staff', mfa: 'disabled' },
    { id: 'STF-106', name: 'Carla Mendoza', email: 'auditor.carla@veripinoy.ph', roleId: 'read_only_auditor', mfa: 'enabled' },
    { id: 'STF-107', name: 'Ramon V. Cruz', email: 'freelance.reviewer@veripinoy.ph', roleId: 'freelancer_reviewer', mfa: 'disabled' }
  ];

  for (const s of staffMembers) {
    executeRun(
      `INSERT INTO admin_users (id, email, password_hash, name, status, last_login, password_changed_at, mfa_status, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'active', ?, ?, ?, ?, ?)`,
      [s.id, s.email, defaultPass.hash, s.name, now, now, s.mfa, now, now]
    );
    executeRun('INSERT INTO admin_user_roles (admin_user_id, role_id) VALUES (?, ?)', [s.id, s.roleId]);
  }

  /* KYC APPLICATIONS & DOCUMENTS */
  const kycApps = [
    {
      id: 'KYC-10452',
      customer_id: 'CUST-8812',
      applicant_name: 'Juan Dela Rosa',
      document_type: 'Philippine National ID (PhilID) & Proof of Billing',
      verification_status: 'in_progress',
      risk_level: 'high',
      assigned_reviewer_id: 'STF-103',
      initial_reviewer_id: 'STF-103',
      reviewer_notes: JSON.stringify([{ author: 'Elena Reyes', text: 'National ID scan verified. Proof of billing address mismatch requires second review.', timestamp: now }]),
      submission_date: '2026-08-10T09:12:00Z',
      docs: [
        { file_name: 'PhilID_Front_Back.pdf', file_type: 'pdf', file_size: '2.4 MB', status: 'Verified', masked: 'PhilID-****-8812', path: '/private/kyc/STF-103/PhilID_Front_Back.pdf' },
        { file_name: 'Meralco_Bill_July2026.pdf', file_type: 'pdf', file_size: '1.1 MB', status: 'Address Flagged', masked: 'BILL-****-2026', path: '/private/kyc/STF-103/Meralco_Bill.pdf' }
      ]
    },
    {
      id: 'KYC-10453',
      customer_id: 'CUST-9914',
      applicant_name: 'Liza Soberano',
      document_type: 'UMID Card & Barangay Clearance',
      verification_status: 'pending',
      risk_level: 'low',
      assigned_reviewer_id: null,
      initial_reviewer_id: null,
      reviewer_notes: JSON.stringify([]),
      submission_date: '2026-08-11T14:20:00Z',
      docs: [
        { file_name: 'UMID_Government_ID.pdf', file_type: 'pdf', file_size: '1.8 MB', status: 'Pending Review', masked: 'UMID-****-4412', path: '/private/kyc/CUST-9914/UMID.pdf' }
      ]
    },
    {
      id: 'KYC-10455',
      customer_id: 'CUST-3310',
      applicant_name: 'Sofia Andres',
      document_type: 'Passport & BIR Form 1901',
      verification_status: 'escalated',
      risk_level: 'high',
      assigned_reviewer_id: 'STF-101',
      initial_reviewer_id: 'STF-103',
      escalated_by_id: 'STF-103',
      reviewer_notes: JSON.stringify([{ author: 'Elena Reyes', text: 'Multiple TIN registrations found across regional RDOs. Escalated to Super Admin for fraud audit.', timestamp: now }]),
      submission_date: '2026-08-08T08:00:00Z',
      docs: [
        { file_name: 'Passport_Bio_Page.pdf', file_type: 'pdf', file_size: '3.1 MB', status: 'Requires Super Admin Signoff', masked: 'PASS-****-9011', path: '/private/kyc/CUST-3310/Passport.pdf' }
      ]
    }
  ];

  for (const k of kycApps) {
    executeRun(
      `INSERT INTO kyc_applications (id, customer_id, applicant_name, document_type, verification_status, risk_level, assigned_reviewer_id, initial_reviewer_id, escalated_by_id, reviewer_notes, submission_date, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [k.id, k.customer_id, k.applicant_name, k.document_type, k.verification_status, k.risk_level, k.assigned_reviewer_id, k.initial_reviewer_id, k.escalated_by_id || null, k.reviewer_notes, k.submission_date, now, now]
    );

    for (const d of k.docs) {
      executeRun(
        `INSERT INTO kyc_documents (id, kyc_application_id, file_name, file_type, file_size, doc_status, masked_id_number, file_storage_path, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [`doc_${Math.random().toString(36).substring(2)}`, k.id, d.file_name, d.file_type, d.file_size, d.status, d.masked, d.path, now]
      );
    }
  }

  /* KYB APPLICATIONS & DOCUMENTS */
  const kybApps = [
    {
      id: 'KYB-20481',
      business_id: '3',
      legal_business_name: 'Bahay Kubo Restaurant Inc.',
      registration_number: 'SEC-2026-0812',
      business_type: 'Corporation',
      industry: 'Food & Dining',
      address: 'Legaspi Village, Makati City',
      contact_info: '+63 2 812 3456 / owner@bahaykubo.ph',
      owner_director_info: 'Roberto Mendoza (President & Managing Director)',
      verification_status: 'verified',
      risk_level: 'low',
      assigned_reviewer_id: 'STF-103',
      initial_reviewer_id: 'STF-103',
      reviewer_notes: JSON.stringify([{ author: 'Elena Reyes (Senior KYB Auditor)', text: 'SEC Certificate and 2026 Makati Mayor Permit fully cross-referenced against LGU database. BIR 2303 TIN 402-918-204-000 active. VeriPinoy verified merchant badge granted.', timestamp: now }]),
      submission_date: '2026-08-11T08:30:00Z',
      docs: [
        { doc_type: 'sec_dti', file_name: 'SEC_Certificate_Incorporation_2026.pdf', file_type: 'pdf', file_size: '4.2 MB', status: 'Verified', masked: 'SEC-****-0812', expiry_date: '2050-12-31', notes: 'Valid SEC Certificate of Incorporation with Articles of Incorporation', path: '/private/kyb/3/SEC_Cert.pdf' },
        { doc_type: 'mayors_permit', file_name: 'Makati_Mayors_Business_Permit_2026.pdf', file_type: 'pdf', file_size: '2.9 MB', status: 'Verified', masked: 'LGU-MKT-****-2026', expiry_date: '2026-12-31', notes: 'Official Business Permit issued by Makati LGU for current fiscal year 2026', path: '/private/kyb/3/Mayors_Permit.pdf' },
        { doc_type: 'bir_2303', file_name: 'BIR_Form_2303_Certificate_of_Registration.pdf', file_type: 'pdf', file_size: '3.1 MB', status: 'Verified', masked: 'BIR-RDO-****-047', expiry_date: '2099-12-31', notes: 'BIR Form 2303 RDO 047 East Makati active tax compliance record', path: '/private/kyb/3/BIR_2303.pdf' },
        { doc_type: 'tin_proof', file_name: 'Official_BIR_TIN_Verification_Proof.pdf', file_type: 'pdf', file_size: '1.8 MB', status: 'Verified', masked: 'TIN-402-***-204-000', expiry_date: '2099-12-31', notes: 'Corporate Tax Identification Number authenticated against Revenue Data Service', path: '/private/kyb/3/TIN_Proof.pdf' },
        { doc_type: 'signatory_id', file_name: 'Authorized_Signatory_Passport_Roberto_Mendoza.pdf', file_type: 'pdf', file_size: '3.4 MB', status: 'Verified', masked: 'PASSPORT-P****812A', expiry_date: '2032-05-18', notes: 'Government ID & Corporate Secretary Certificate authorizing President Roberto Mendoza', path: '/private/kyb/3/Signatory_ID.pdf' }
      ]
    },
    {
      id: 'KYB-20482',
      business_id: '1',
      legal_business_name: 'Manila Bay Express Logistics Corp.',
      registration_number: 'SEC-2026-4481',
      business_type: 'Corporation',
      industry: 'Services',
      address: 'Roxas Blvd, Manila Hub',
      contact_info: '+63 2 888 9900 / contact@manilabaylogistics.ph',
      owner_director_info: 'Eduardo Tan (Managing Director)',
      verification_status: 'verified',
      risk_level: 'low',
      assigned_reviewer_id: 'STF-103',
      initial_reviewer_id: 'STF-103',
      reviewer_notes: JSON.stringify([{ author: 'Elena Reyes', text: 'All corporate filings active and verified.', timestamp: now }]),
      submission_date: '2026-08-01T10:00:00Z',
      docs: [
        { doc_type: 'sec_dti', file_name: 'SEC_Registration_ManilaBay.pdf', file_type: 'pdf', file_size: '3.8 MB', status: 'Verified', masked: 'SEC-****-4481', expiry_date: '2050-12-31', notes: 'SEC Registered', path: '/private/kyb/1/sec.pdf' },
        { doc_type: 'mayors_permit', file_name: 'Manila_City_Mayors_Permit_2026.pdf', file_type: 'pdf', file_size: '2.5 MB', status: 'Verified', masked: 'LGU-MNL-****-2026', expiry_date: '2026-12-31', notes: 'Manila City LGU Permit', path: '/private/kyb/1/permit.pdf' },
        { doc_type: 'bir_2303', file_name: 'BIR_2303_ManilaBay.pdf', file_type: 'pdf', file_size: '2.2 MB', status: 'Verified', masked: 'BIR-****-8812', expiry_date: '2099-12-31', notes: 'BIR Registered', path: '/private/kyb/1/bir.pdf' }
      ]
    },
    {
      id: 'KYB-20483',
      business_id: '2',
      legal_business_name: 'Sari-Sari Mart Cubao Trading',
      registration_number: 'DTI-2026-8812',
      business_type: 'Sole Proprietorship',
      industry: 'Retail',
      address: 'Cubao, Quezon City',
      contact_info: '0917 111 2233 / owner@sarisarimart.ph',
      owner_director_info: 'Teresa Bautista (Proprietor)',
      verification_status: 'verified',
      risk_level: 'low',
      assigned_reviewer_id: 'STF-103',
      initial_reviewer_id: 'STF-103',
      reviewer_notes: JSON.stringify([{ author: 'Elena Reyes', text: 'DTI Business Name and QC Mayor Permit verified.', timestamp: now }]),
      submission_date: '2026-08-05T14:15:00Z',
      docs: [
        { doc_type: 'sec_dti', file_name: 'DTI_BNRS_Certificate_2026.pdf', file_type: 'pdf', file_size: '1.9 MB', status: 'Verified', masked: 'DTI-****-8812', expiry_date: '2031-08-05', notes: 'DTI Business Name Registration Certificate', path: '/private/kyb/2/dti.pdf' },
        { doc_type: 'mayors_permit', file_name: 'QC_Mayors_Permit_2026.pdf', file_type: 'pdf', file_size: '2.1 MB', status: 'Verified', masked: 'LGU-QC-****-2026', expiry_date: '2026-12-31', notes: 'Quezon City Business Permit', path: '/private/kyb/2/permit.pdf' },
        { doc_type: 'bir_2303', file_name: 'BIR_2303_SariSari.pdf', file_type: 'pdf', file_size: '2.0 MB', status: 'Verified', masked: 'BIR-****-9921', expiry_date: '2099-12-31', notes: 'BIR Certificate Form 2303', path: '/private/kyb/2/bir.pdf' }
      ]
    },
    {
      id: 'KYB-20484',
      business_id: '4',
      legal_business_name: 'TechFix PH IT Solutions',
      registration_number: 'DTI-2026-1190',
      business_type: 'Sole Proprietorship',
      industry: 'Electronics',
      address: 'IT Park, Cebu City',
      contact_info: '0922 555 7788 / support@techfix.ph',
      owner_director_info: 'Mark Anthony Villar',
      verification_status: 'action_required',
      risk_level: 'medium',
      assigned_reviewer_id: 'STF-103',
      initial_reviewer_id: 'STF-103',
      reviewer_notes: JSON.stringify([{ author: 'Elena Reyes', text: 'Mayor permit scan is blurred. Action required: re-upload high-resolution 2026 Cebu LGU permit.', timestamp: now }]),
      submission_date: '2026-08-14T09:00:00Z',
      docs: [
        { doc_type: 'sec_dti', file_name: 'DTI_BNRS_TechFix.pdf', file_type: 'pdf', file_size: '2.1 MB', status: 'Verified', masked: 'DTI-****-1190', expiry_date: '2031-01-10', notes: 'DTI Certificate valid', path: '/private/kyb/4/dti.pdf' },
        { doc_type: 'mayors_permit', file_name: 'Cebu_Mayors_Permit_Scan.pdf', file_type: 'pdf', file_size: '1.2 MB', status: 'Action Required', masked: 'LGU-CEB-****-PEND', expiry_date: '2026-12-31', notes: 'Blurred official receipt stamp. Re-upload requested.', path: '/private/kyb/4/permit.pdf' }
      ]
    }
  ];

  for (const b of kybApps) {
    executeRun(
      `INSERT OR REPLACE INTO kyb_applications (id, business_id, legal_business_name, registration_number, business_type, industry, address, contact_info, owner_director_info, verification_status, risk_level, assigned_reviewer_id, initial_reviewer_id, reviewer_notes, submission_date, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [b.id, b.business_id, b.legal_business_name, b.registration_number, b.business_type, b.industry, b.address, b.contact_info, b.owner_director_info, b.verification_status, b.risk_level, b.assigned_reviewer_id, b.initial_reviewer_id, b.reviewer_notes, b.submission_date, now, now]
    );

    for (const d of b.docs) {
      executeRun(
        `INSERT OR REPLACE INTO kyb_documents (id, kyb_application_id, doc_type, file_name, file_type, file_size, doc_status, masked_reg_number, file_storage_path, expiry_date, notes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [`doc_${b.id}_${d.doc_type || 'file'}`, b.id, d.doc_type || 'sec_dti', d.file_name, d.file_type, d.file_size, d.status, d.masked, d.path, d.expiry_date || '2026-12-31', d.notes || '', now]
      );
    }
  }

  /* SEED BUSINESS TEAM MEMBERS */
  const teamMembers = [
    { id: 'BTM-301', business_id: '3', user_id: 'USR-BIZ-301', name: 'Roberto Mendoza', email: 'owner@bahaykubo.ph', role: 'owner', status: 'active' },
    { id: 'BTM-302', business_id: '3', user_id: 'USR-BIZ-302', name: 'Atty. Clarissa Dizon', email: 'compliance@bahaykubo.ph', role: 'compliance_officer', status: 'active' },
    { id: 'BTM-303', business_id: '3', user_id: 'USR-BIZ-303', name: 'Gabriel Cruz', email: 'auditor.gabriel@bahaykubo.ph', role: 'kyb_auditor', status: 'active' },
    { id: 'BTM-304', business_id: '3', user_id: 'USR-BIZ-304', name: 'Sheila Santos', email: 'admin.sheila@bahaykubo.ph', role: 'kyb_submitter', status: 'active' },
    { id: 'BTM-305', business_id: '3', user_id: 'USR-BIZ-305', name: 'Mark Villanueva', email: 'operations@bahaykubo.ph', role: 'manager', status: 'active' }
  ];
  for (const tm of teamMembers) {
    executeRun(
      `INSERT OR REPLACE INTO business_users (id, business_id, user_id, name, email, role, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [tm.id, tm.business_id, tm.user_id, tm.name, tm.email, tm.role, tm.status, now, now]
    );
  }

  /* SEED BUSINESS KYB CONFIGURATION SETTINGS */
  executeRun(
    `INSERT OR REPLACE INTO business_kyb_settings (business_id, required_docs, threshold, dti_api_enabled, dti_api_endpoint, sec_api_enabled, sec_api_endpoint, bir_api_enabled, bir_api_endpoint, ocr_auto_verify, auto_revalidate_frequency, updated_at)
     VALUES ('3', ?, 'standard', 1, 'https://api.dti.gov.ph/pbr/v2/verify', 1, 'https://crs.sec.gov.ph/api/v1/entities', 1, 'https://api.bir.gov.ph/tin/v1/validate', 1, 'annual', ?)`,
    [JSON.stringify(['sec_dti', 'mayors_permit', 'bir_2303', 'tin_proof', 'signatory_id']), now]
  );

  /* CUSTOMER REVIEWS & MODERATION CASES */
  const reviews = [
    {
      id: 'REV-101',
      customer_id: 'CUST-101',
      customer_name: 'Maria Santos',
      business_id: '3',
      business_name: 'Bahay Kubo Restaurant',
      rating: 5,
      review_title: 'Outstanding Sinigang and Clean Kitchen',
      review_content: 'Excellent customer hospitality! Clean tables, authentic Sinigang, and pristine operations.',
      review_status: 'published',
      flagged_status: 0,
      official_response: 'Maraming salamat po Maria! We prepare our Sinigang broth fresh every morning.'
    },
    {
      id: 'REV-102',
      customer_id: 'CUST-102',
      customer_name: 'Juan Dela Cruz',
      business_id: '3',
      business_name: 'Bahay Kubo Restaurant',
      rating: 4,
      review_title: 'Great Food, Slight Peak Hour Wait',
      review_content: 'Food quality is top-notch. Kare-Kare sauce was rich and authentic. Parking during Sunday lunch was a bit tight.',
      review_status: 'published',
      flagged_status: 0,
      official_response: 'Salamat Juan! We are expanding our weekend valet and parking slots next month.'
    },
    {
      id: 'REV-103',
      customer_id: 'CUST-103',
      customer_name: 'Ana R.',
      business_id: '3',
      business_name: 'Bahay Kubo Restaurant',
      rating: 5,
      review_title: 'Fast Delivery & Secure Eco-Packaging',
      review_content: 'Ordered catering for a corporate team lunch. Arrived hot, on time, and completely spill-free.',
      review_status: 'published',
      flagged_status: 0,
      official_response: null
    },
    {
      id: 'REV-104',
      customer_id: 'CUST-104',
      customer_name: 'Carlos M.',
      business_id: '3',
      business_name: 'Bahay Kubo Restaurant',
      rating: 2,
      review_title: 'Mixup on Custom Order Allergen Spec',
      review_content: 'Requested garlic-free seasoning due to dietary constraints, but food arrived with fried garlic chips on top.',
      review_status: 'published',
      flagged_status: 0,
      official_response: null
    },
    {
      id: 'REV-105',
      customer_id: 'CUST-105',
      customer_name: 'Competitor Bot',
      business_id: '3',
      business_name: 'Bahay Kubo Restaurant',
      rating: 1,
      review_title: 'Suspicious Review from Competitor',
      review_content: 'Worst food ever. Go to XYZ Diner instead, they have cheaper food and better deals.',
      review_status: 'under_review',
      flagged_status: 1,
      flag_reason: 'Conflict of interest / Review appears fraudulent & promotional',
      flagged_by_business: 1,
      flagged_date: '2026-08-11T10:00:00Z',
      official_response: null
    },
    {
      id: 'REV-301',
      customer_id: 'CUST-303',
      customer_name: 'Anonymous Guest',
      business_id: '2',
      business_name: 'Sari-Sari Mart',
      rating: 1,
      review_title: 'Disputed Price Charge',
      review_content: 'Alleged double billing on basic rice staple items without itemized POS receipt.',
      review_status: 'under_review',
      flagged_status: 1,
      flag_reason: 'Merchant claims review is fake and no such purchase was made at Cubao branch.',
      flagged_by_business: 1,
      flagged_date: '2026-08-10T13:00:00Z',
      official_response: null
    }
  ];

  for (const r of reviews) {
    executeRun(
      `INSERT INTO customer_reviews (id, customer_id, customer_name, business_id, business_name, rating, review_title, review_content, review_status, flagged_status, flag_reason, flagged_by_business, flagged_date, official_response, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [r.id, r.customer_id, r.customer_name, r.business_id, r.business_name, r.rating, r.review_title, r.review_content, r.review_status, r.flagged_status, r.flag_reason, r.flagged_by_business, r.flagged_date, r.official_response, now, now]
    );
  }

  /* BUSINESS RESPONSES */
  executeRun(
    `INSERT INTO business_responses (id, review_id, business_id, responder_id, responder_name, responder_role, response_text, status, version, created_at, updated_at)
     VALUES ('RESP-101', 'REV-101', '3', 'USER-BIZ-3', 'Roberto Mendoza', 'Business Owner', 'Maraming salamat po Maria! We prepare our Sinigang broth fresh every morning.', 'published', 1, ?, ?)`,
    [now, now]
  );

  executeRun(
    `INSERT INTO business_responses (id, review_id, business_id, responder_id, responder_name, responder_role, response_text, status, version, created_at, updated_at)
     VALUES ('RESP-102', 'REV-102', '3', 'USER-BIZ-3', 'Roberto Mendoza', 'Business Owner', 'Salamat Juan! We are expanding our weekend valet and parking slots next month.', 'published', 1, ?, ?)`,
    [now, now]
  );

  /* REVIEW FLAGS */
  executeRun(
    `INSERT INTO review_flags (id, review_id, business_id, flagged_by, reason, explanation, status, created_at)
     VALUES ('FLAG-101', 'REV-105', '3', 'Roberto Mendoza (Owner)', 'Conflict of interest', 'Review contains direct advertising for XYZ Diner and author profile was created 10 minutes ago.', 'under_review', ?)`,
    [now]
  );

  executeRun(
    `INSERT INTO review_flags (id, review_id, business_id, flagged_by, reason, explanation, status, created_at)
     VALUES ('FLAG-301', 'REV-301', '2', 'Sari-Sari Mart Management', 'Fake review', 'Merchant checked POS log history and no transaction matched timestamp.', 'under_review', ?)`,
    [now]
  );

  /* MODERATION CASES */
  executeRun(
    `INSERT INTO review_moderation_cases (id, review_id, customer_id, business_id, flag_reason, business_explanation, case_status, priority, assigned_reviewer_id, created_at, updated_at)
     VALUES ('CASE-8921', 'REV-301', 'CUST-303', '2', 'Fake review / Receipt absence', 'Sari-Sari Mart owner verified POS logs and found no transaction matching timestamp.', 'awaiting_customer_claim', 'medium', 'STF-104', ?, ?)`,
    [now, now]
  );

  executeRun(
    `INSERT INTO review_moderation_cases (id, review_id, customer_id, business_id, flag_reason, business_explanation, case_status, priority, assigned_reviewer_id, created_at, updated_at)
     VALUES ('CASE-8922', 'REV-105', 'CUST-105', '3', 'Conflict of interest / Spam', 'Promotional spam for competing restaurant.', 'in_progress', 'high', 'STF-101', ?, ?)`,
    [now, now]
  );

  /* CUSTOMER CLAIM */
  executeRun(
    `INSERT INTO customer_claims (id, moderation_case_id, review_id, customer_id, customer_name, claim_statement, transaction_ref_info, claim_status, claim_request_notes, submission_date, created_at, updated_at)
     VALUES ('CLM-301', 'CASE-8921', 'REV-301', 'CUST-303', 'Anonymous Guest', 'I paid via GCash at Cubao branch on Aug 10.', 'GCASH-TXN-9812401', 'submitted', 'Please upload official GCash SMS or POS receipt reference.', ?, ?, ?)`,
    [now, now, now]
  );

  /* REVIEW & KYB NOTIFICATIONS */
  const seedNotifs = [
    { id: 'NOTIF-KYB-101', recipient_type: 'business', recipient_id: '3', type: 'kyb_approved', title: '🎉 SEC Registration Certificate Verified', message: 'Your SEC Certificate of Incorporation (SEC-2026-0812) was verified by Senior Reviewer Elena Reyes.', link: '#m-panel-kyb' },
    { id: 'NOTIF-KYB-102', recipient_type: 'business', recipient_id: '3', type: 'permit_expiry_warning', title: '⏰ Annual Mayor\'s Permit Renewal Notice', message: 'Makati LGU Mayor\'s Permit renewal window is approaching (valid through Dec 31, 2026). Upload early to retain continuous VeriPinoy badge.', link: '#m-panel-kyb' },
    { id: 'NOTIF-KYB-103', recipient_type: 'business', recipient_id: '3', type: 'kyb_verified', title: '🛡️ BIR 2303 & Corporate TIN Validated', message: 'TIN 402-918-204-000 successfully cross-checked with Philippine Revenue database.', link: '#m-panel-kyb' },
    { id: 'NOTIF-KYB-104', recipient_type: 'business', recipient_id: '3', type: 'dispute_protection', title: '⚖️ Customer Claim Received — KYB Protection Active', message: 'Claim #CLM-2026-904 filed. Because your business is KYB-Verified, expedited neutral arbitration is available.', link: '#m-panel-disputes' },
    { id: 'NOTIF-101', recipient_type: 'business', recipient_id: '3', type: 'new_review', title: 'New 2-Star Review Received', message: 'Carlos M. posted a 2-star review for Bahay Kubo Restaurant regarding Allergen Spec.', link: '#m-panel-reviews' },
    { id: 'NOTIF-301', recipient_type: 'customer', recipient_id: 'CUST-303', type: 'claim_requested', title: 'Action Required regarding your VeriPinoy Review', message: 'VeriPinoy compliance team requests transaction verification for your Sari-Sari Mart review.', link: '/customer/claims' }
  ];

  for (const sn of seedNotifs) {
    executeRun(
      `INSERT OR REPLACE INTO review_notifications (id, recipient_type, recipient_id, review_id, type, title, message, link, is_read, created_at)
       VALUES (?, ?, ?, NULL, ?, ?, ?, ?, 0, ?)`,
      [sn.id, sn.recipient_type, sn.recipient_id, sn.type, sn.title, sn.message, sn.link, now]
    );
  }

  /* CASE ASSIGNMENT HISTORY */
  executeRun(
    `INSERT INTO case_assignments (id, case_id, case_type, assigned_admin_id, assigned_by_id, previous_assignee_id, reassignment_reason, assignment_date)
     VALUES ('AH-5001', 'KYC-10452', 'kyc', 'STF-103', 'STF-101', NULL, 'Initial case allocation to KYC team lead.', ?)`,
    [now]
  );

  /* INITIAL AUDIT LOG */
  executeRun(
    `INSERT INTO audit_logs (id, actor_admin_id, actor_name, actor_role, action, entity_type, entity_id, details, success, timestamp)
     VALUES ('LOG-9001', 'STF-101', 'Maria Santos', 'Super Admin', 'SYSTEM_INITIALIZED', 'DATABASE', 'veripinoy.db', 'VeriPinoy Production Relational Database initialized with complete schema.', 1, ?)`,
    [now]
  );
}

function seedPricingPlans(now = new Date().toISOString()) {
  /* PRICING PLANS SEED DATA */
  const plans = [
    {
      id: 'plan_biz_basic',
      name: 'Verified Business',
      description: 'Essential DTI / SEC verification for growing local shops and micro-merchants.',
      plan_type: 'business',
      monthly_price: 499,
      annual_price: 499,
      currency: 'PHP',
      features: [
        'Standard DTI or SEC Registration Check',
        'Verified Business Badge on Directory',
        'Store Phone, Location & Description Page',
        'Basic Customer Review Monitoring',
        'Standard Search Indexing'
      ]
    },
    {
      id: 'plan_biz_premium',
      name: 'Premium Verification',
      description: 'Full 3-step KYB audit for established businesses seeking maximum buyer trust.',
      plan_type: 'business',
      monthly_price: 999,
      annual_price: 999,
      currency: 'PHP',
      features: [
        'Full KYB Audit (DTI/SEC + Mayor\'s Permit + BIR 2303)',
        'VeriPinoy Verified Enterprise Gold Badge',
        'Official Merchant Response Portal',
        'Review Response Speed KPI Tracker',
        'Customer Sentiment Matrix & Rating Alerts',
        'Priority City Hub Search Placement'
      ]
    },
    {
      id: 'plan_biz_pro',
      name: 'Business Pro',
      description: 'Complete enterprise suite for medium & large multi-branch operations.',
      plan_type: 'business',
      monthly_price: 2499,
      annual_price: 2499,
      currency: 'PHP',
      features: [
        'All Premium Verification features',
        '1 Free Featured Listing Slot Included (₱1,000 value)',
        'Full KPI Suite & Performance Dashboard',
        'Customer Satisfaction Index (CSI) Analytics',
        'Multi-branch SLA Response Management',
        'Dedicated Compliance Manager Support'
      ]
    },
    {
      id: 'PLAN-FREE',
      name: 'Free Starter Plan',
      description: 'Basic VeriPinoy account with public search lookup and standard profile.',
      plan_type: 'general',
      monthly_price: 0,
      annual_price: 0,
      currency: 'PHP',
      features: [
        'Basic VeriPinoy account',
        'Public verification lookup',
        'Standard search directory listing',
        'Access to community support'
      ]
    },
    {
      id: 'PLAN-FREELANCER',
      name: 'Verified Freelancer',
      description: 'Official VeriPinoy Freelancer Badge, verified public profile, contract & evidence vault, and dispute protection.',
      plan_type: 'freelancer',
      monthly_price: 499,
      annual_price: 4990,
      currency: 'PHP',
      features: [
        'VeriPinoy Verified Freelancer badge',
        'Verified public profile (veripinoy.com/freelancer/VP-FR-XXXX)',
        'Public portfolio & skill endorsement badges',
        'Secure Contract & Evidence Vault',
        'Work Engagement tracking & Milestone invoices',
        'Neutral Payment Dispute & Client Arbitration system',
        'Verified Freelancer Client Confirmation receipts'
      ]
    },
    {
      id: 'PLAN-BUSINESS',
      name: 'Verified Business',
      description: 'Official VeriPinoy KYB Business Badge, business verification page, customer review & claim management.',
      plan_type: 'business',
      monthly_price: 499,
      annual_price: 499,
      currency: 'PHP',
      features: [
        'VeriPinoy Official KYB Verified Business badge',
        'Public business verification page',
        'Customer review management & response portal',
        'Review dispute & false claim arbitration',
        'Business trust score & customer feedback analytics',
        'Priority DTI/SEC compliance review support'
      ]
    },
    {
      id: 'PLAN-PREMIUM',
      name: 'Premium Verification',
      description: 'Full 3-step KYB audit for established businesses seeking maximum buyer trust.',
      plan_type: 'business',
      monthly_price: 999,
      annual_price: 999,
      currency: 'PHP',
      features: [
        'Full KYB Audit (DTI/SEC + Mayor\'s Permit + BIR 2303)',
        'VeriPinoy Verified Enterprise Gold Badge',
        'Official Merchant Response Portal',
        'Review Response Speed KPI Tracker',
        'Customer Sentiment Matrix & Rating Alerts',
        'Priority City Hub Search Placement'
      ]
    },
    {
      id: 'PLAN-PRO',
      name: 'Business Pro',
      description: 'Complete enterprise suite for medium & large multi-branch operations.',
      plan_type: 'business',
      monthly_price: 2499,
      annual_price: 2499,
      currency: 'PHP',
      features: [
        'All Premium Verification features',
        '1 Free Featured Listing Slot Included (₱1,000 value)',
        'Full KPI Suite & Performance Dashboard',
        'Customer Satisfaction Index (CSI) Analytics',
        'Multi-branch SLA Response Management',
        'Dedicated Compliance Manager Support'
      ]
    }
  ];

  for (const p of plans) {
    executeRun(
      `INSERT OR REPLACE INTO pricing_plans (id, name, description, plan_type, monthly_price, annual_price, currency, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [p.id, p.name, p.description, p.plan_type, p.monthly_price, p.annual_price, p.currency, now, now]
    );

    p.features.forEach((feat, idx) => {
      executeRun(
        `INSERT OR REPLACE INTO pricing_plan_features (id, plan_id, feature_text, display_order)
         VALUES (?, ?, ?, ?)`,
        [`feat_${p.id}_${idx}`, p.id, feat, idx + 1]
      );
    });
  }
}

function seedFreelancerData(now = new Date().toISOString()) {
  /* PORTAL USERS SEED DATA */
  const custPass = hashPassword('Password123!');
  const bizPass = hashPassword('Password123!');
  const frPass = hashPassword('Password123!');

  // Seed Customer User & Profile
  executeRun(
    `INSERT OR IGNORE INTO users (id, email, password_hash, full_name, mobile_number, user_type, account_status, email_verified, created_at, updated_at)
     VALUES ('USR-CUST-1001', 'customer@veripinoy.ph', ?, 'Maria Clara De Los Santos', '09171234567', 'customer', 'active', 1, ?, ?)`,
    [custPass.hash, now, now]
  );

  executeRun(
    `INSERT OR IGNORE INTO customer_profiles (id, user_id, first_name, last_name, country, kyc_status, created_at, updated_at)
     VALUES ('CUST-1001', 'USR-CUST-1001', 'Maria Clara', 'De Los Santos', 'Philippines', 'unverified', ?, ?)`,
    [now, now]
  );

  // Seed Business User, Business & Business Team
  executeRun(
    `INSERT OR IGNORE INTO users (id, email, password_hash, full_name, mobile_number, user_type, account_status, email_verified, created_at, updated_at)
     VALUES ('USR-BIZ-2001', 'owner@manilabakery.ph', ?, 'Juan Dela Cruz', '09189876543', 'business', 'active', 1, ?, ?)`,
    [bizPass.hash, now, now]
  );

  executeRun(
    `INSERT OR IGNORE INTO businesses (id, user_id, business_name, business_email, business_phone, business_type, industry, country, business_address, website, social_media, authorized_representative, account_status, verification_status, rating, review_count, created_at, updated_at)
     VALUES ('BIZ-2001', 'USR-BIZ-2001', 'Manila Artisan Bakery & Cafe', 'contact@manilabakery.ph', '09189876543', 'Corporation', 'Food & Dining', 'Philippines', '123 Katipunan Ave, Quezon City', 'https://manilabakery.ph', '@manilabakery', 'Juan Dela Cruz', 'active', 'verified', 4.9, 128, ?, ?)`,
    [now, now]
  );

  executeRun(
    `INSERT OR IGNORE INTO business_users (id, business_id, user_id, name, email, role, status, created_at, updated_at)
     VALUES ('BUSR-1', 'BIZ-2001', 'USR-BIZ-2001', 'Juan Dela Cruz', 'owner@manilabakery.ph', 'owner', 'active', ?, ?)`,
    [now, now]
  );

  executeRun(
    `INSERT OR IGNORE INTO business_users (id, business_id, user_id, name, email, role, status, created_at, updated_at)
     VALUES ('BUSR-2', 'BIZ-2001', 'USR-BIZ-2002', 'Ana Reyes', 'manager@manilabakery.ph', 'admin', 'active', ?, ?)`,
    [now, now]
  );

  executeRun(
    `INSERT OR IGNORE INTO business_users (id, business_id, user_id, name, email, role, status, created_at, updated_at)
     VALUES ('BUSR-3', 'BIZ-2001', 'USR-BIZ-2003', 'Carlos Tan', 'staff@manilabakery.ph', 'staff', 'active', ?, ?)`,
    [now, now]
  );

  // Seed Freelancer User
  executeRun(
    `INSERT OR IGNORE INTO users (id, email, password_hash, full_name, mobile_number, user_type, account_status, email_verified, created_at, updated_at)
     VALUES ('USER-FR-10284', 'freelancer@marcoreyes.dev', ?, 'Marco Antonio Reyes', '09191112233', 'freelancer', 'active', 1, ?, ?)`,
    [frPass.hash, now, now]
  );

  /* FREELANCER PROFILES SEED DATA */
  executeRun(
    `INSERT OR IGNORE INTO freelancer_profiles (id, user_id, full_name, professional_name, profile_photo, professional_category, skills, location, years_of_experience, portfolio_links, website_social_links, verification_status, kyc_verification_status, date_verified, profile_status, created_at, updated_at)
     VALUES ('VP-FR-10284', 'USER-FR-10284', 'Marco Antonio Reyes', 'Marco Reyes | Senior Full-Stack Web Developer', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80', 'Web & Software Development', ?, 'Quezon City, Metro Manila, Philippines', 7, ?, ?, 'verified', 'verified', ?, 'active', ?, ?)`,
    [
      JSON.stringify(['React.js', 'Node.js', 'TypeScript', 'Tailwind CSS', 'Database Architecture', 'API Design']),
      JSON.stringify(['https://github.com/marcoreyes-dev', 'https://marcoreyes.dev/portfolio']),
      JSON.stringify({ website: 'https://marcoreyes.dev', linkedin: 'https://linkedin.com/in/marcoreyes-dev' }),
      '2026-03-15T09:30:00Z',
      now,
      now
    ]
  );

  /* FREELANCER VERIFICATION APPLICATION */
  executeRun(
    `INSERT OR IGNORE INTO freelancer_verifications (id, freelancer_id, kyc_application_id, reviewer_id, reviewer_notes, verification_status, submitted_at, reviewed_at)
     VALUES ('FR-VER-8801', 'VP-FR-10284', 'KYC-10452', 'STF-107', 'Philippine National ID verified. Portfolio links and identity matched successfully.', 'approved', ?, ?)`,
    [now, now]
  );

  /* FREELANCER ENGAGEMENTS */
  executeRun(
    `INSERT OR IGNORE INTO freelancer_engagements (id, freelancer_id, client_identifier, project_name, project_description, contract_ref, agreed_amount, currency, payment_terms, start_date, expected_completion_date, completion_status, payment_status, supporting_documents, created_at, updated_at)
     VALUES ('ENG-901', 'VP-FR-10284', 'ABC Company (Metro Manila Retail)', 'E-Commerce Web Portal Development', 'Full-stack online store with inventory synchronization, payment gateway integration, and customer order management.', 'CTR-2026-8819', 50000, 'PHP', '50% upfront / 50% upon milestone completion', '2026-07-01', '2026-07-30', 'delivered', 'in_dispute', ?, ?, ?)`,
    [
      JSON.stringify([{ name: 'Statement_of_Work_SOW_Signed.pdf', path: '/docs/SOW_ABC_Company.pdf' }]),
      now,
      now
    ]
  );

  executeRun(
    `INSERT OR IGNORE INTO freelancer_engagements (id, freelancer_id, client_identifier, project_name, project_description, contract_ref, agreed_amount, currency, payment_terms, start_date, expected_completion_date, completion_status, payment_status, supporting_documents, created_at, updated_at)
     VALUES ('ENG-902', 'VP-FR-10284', 'Nexus Digital Media Inc', 'Mobile Fintech App UI & Secure API Architecture', 'React Native mobile application frontend paired with high-concurrency Node.js REST APIs and real-time transaction ledger.', 'CTR-2026-9042', 85000, 'PHP', 'Milestone-based (3 Milestones)', '2026-08-01', '2026-09-15', 'in_progress', 'partially_paid', ?, ?, ?)`,
    [
      JSON.stringify([{ name: 'Master_Services_Agreement_MSA.pdf', path: '/docs/MSA_Nexus_Digital.pdf' }]),
      now,
      now
    ]
  );

  executeRun(
    `INSERT OR IGNORE INTO freelancer_engagements (id, freelancer_id, client_identifier, project_name, project_description, contract_ref, agreed_amount, currency, payment_terms, start_date, expected_completion_date, completion_status, payment_status, supporting_documents, created_at, updated_at)
     VALUES ('ENG-903', 'VP-FR-10284', 'Bahay Kubo Enterprise', 'Cloud Inventory Synchronization Engine', 'Automated webhook engine syncing POS terminal orders with cloud inventory databases and automated supplier re-orders.', 'CTR-2026-9110', 35000, 'PHP', 'Hourly rate (₱1,500/hr) capped at ₱35,000', '2026-08-10', '2026-08-28', 'in_progress', 'invoiced', ?, ?, ?)`,
    [
      JSON.stringify([{ name: 'Inventory_Sync_Spec_Signed.pdf', path: '/docs/Spec_BahayKubo.pdf' }]),
      now,
      now
    ]
  );

  /* FREELANCER MILESTONES */
  executeRun(
    `INSERT OR IGNORE INTO freelancer_milestones (id, engagement_id, freelancer_id, milestone_title, milestone_description, amount, currency, due_date, status, created_at, updated_at)
     VALUES ('MLS-901-1', 'ENG-901', 'VP-FR-10284', 'Milestone 1: Database Architecture & Core API Wireframes', 'Database ERD schemas, secure API routing, and backend auth integration.', 25000, 'PHP', '2026-07-15', 'paid', ?, ?)`,
    [now, now]
  );

  executeRun(
    `INSERT OR IGNORE INTO freelancer_milestones (id, engagement_id, freelancer_id, milestone_title, milestone_description, amount, currency, due_date, status, created_at, updated_at)
     VALUES ('MLS-901-2', 'ENG-901', 'VP-FR-10284', 'Milestone 2: Payment Gateway, Storefront Delivery & UAT Signoff', 'Final store delivery, payment gateway testing, and signed UAT.', 25000, 'PHP', '2026-07-30', 'disputed', ?, ?)`,
    [now, now]
  );

  executeRun(
    `INSERT OR IGNORE INTO freelancer_milestones (id, engagement_id, freelancer_id, milestone_title, milestone_description, amount, currency, due_date, status, created_at, updated_at)
     VALUES ('MLS-902-1', 'ENG-902', 'VP-FR-10284', 'Milestone 1: UI Component Design System & State Management', 'High-fidelity Figma implementation, reusable tokenized UI components, and state store architecture.', 30000, 'PHP', '2026-08-10', 'paid', ?, ?)`,
    [now, now]
  );

  executeRun(
    `INSERT OR IGNORE INTO freelancer_milestones (id, engagement_id, freelancer_id, milestone_title, milestone_description, amount, currency, due_date, status, created_at, updated_at)
     VALUES ('MLS-902-2', 'ENG-902', 'VP-FR-10284', 'Milestone 2: Secure API Integration & Deliverable Testing', 'REST API client endpoints, OAuth2 token refresh, and integration test suite.', 35000, 'PHP', '2026-08-25', 'pending_review', ?, ?)`,
    [now, now]
  );

  executeRun(
    `INSERT OR IGNORE INTO freelancer_milestones (id, engagement_id, freelancer_id, milestone_title, milestone_description, amount, currency, due_date, status, created_at, updated_at)
     VALUES ('MLS-902-3', 'ENG-902', 'VP-FR-10284', 'Milestone 3: Production Deployment, CI/CD Pipeline & Audit Logs', 'Cloud Run deployment pipeline, SSL pinning, and DPA audit log compliance.', 20000, 'PHP', '2026-09-15', 'in_progress', ?, ?)`,
    [now, now]
  );

  /* FREELANCER WORK LOGS */
  executeRun(
    `INSERT OR IGNORE INTO freelancer_work_logs (id, freelancer_id, engagement_id, milestone_id, log_type, title, description, hours_logged, hourly_rate, total_amount, deliverable_links, attachments, status, reviewer_feedback, reviewed_by, reviewed_at, invoice_id, created_at, updated_at)
     VALUES ('WLOG-101', 'VP-FR-10284', 'ENG-902', 'MLS-902-1', 'milestone', 'Completed UI Component Design System & Navigation Engine', 'Built responsive screens, dark/light theme tokens, and biometric login authentication screen flows.', 0, 0, 30000, ?, ?, 'paid', 'Excellent execution and clean codebase. Approved for payment release.', 'Nexus Reviewer (Sarah Lim)', '2026-08-12 11:30:00', 'INV-FR-301', ?, ?)`,
    [
      JSON.stringify(['https://github.com/marcoreyes-dev/nexus-fintech-ui', 'https://nexus-demo-staging.app.ph']),
      JSON.stringify(['ui_design_spec_v1.pdf', 'component_tokens_export.json']),
      now,
      now
    ]
  );

  executeRun(
    `INSERT OR IGNORE INTO freelancer_work_logs (id, freelancer_id, engagement_id, milestone_id, log_type, title, description, hours_logged, hourly_rate, total_amount, deliverable_links, attachments, status, reviewer_feedback, reviewed_by, reviewed_at, invoice_id, created_at, updated_at)
     VALUES ('WLOG-102', 'VP-FR-10284', 'ENG-902', 'MLS-902-2', 'milestone', 'Implemented Encrypted API Endpoints & Transaction Engine', 'Completed AES-256 payload encryption, webhook listeners, and comprehensive automated test suites.', 0, 0, 35000, ?, ?, 'pending_review', NULL, NULL, NULL, NULL, ?, ?)`,
    [
      JSON.stringify(['https://github.com/marcoreyes-dev/nexus-fintech-core/pull/18', 'https://api-staging.nexus.ph/docs']),
      JSON.stringify(['api_security_audit_results.pdf', 'postman_collection_v2.json']),
      now,
      now
    ]
  );

  executeRun(
    `INSERT OR IGNORE INTO freelancer_work_logs (id, freelancer_id, engagement_id, milestone_id, log_type, title, description, hours_logged, hourly_rate, total_amount, deliverable_links, attachments, status, reviewer_feedback, reviewed_by, reviewed_at, invoice_id, created_at, updated_at)
     VALUES ('WLOG-103', 'VP-FR-10284', 'ENG-903', NULL, 'hourly', 'Real-Time Webhook Synchronization & POS Queue Worker', 'Engineered robust retry backoff algorithms for POS intermittent network drops and SQLite transaction syncing.', 16, 1500, 24000, ?, ?, 'approved', 'Verified POS load test results. Approved for invoice generation.', 'Bahay Kubo Tech Lead', '2026-08-18 16:00:00', 'INV-FR-303', ?, ?)`,
    [
      JSON.stringify(['https://github.com/marcoreyes-dev/bahay-kubo-sync/tree/main/workers']),
      JSON.stringify(['pos_sync_architecture_diagram.pdf', 'load_stress_benchmark.csv']),
      now,
      now
    ]
  );

  executeRun(
    `INSERT OR IGNORE INTO freelancer_work_logs (id, freelancer_id, engagement_id, milestone_id, log_type, title, description, hours_logged, hourly_rate, total_amount, deliverable_links, attachments, status, reviewer_feedback, reviewed_by, reviewed_at, invoice_id, created_at, updated_at)
     VALUES ('WLOG-104', 'VP-FR-10284', 'ENG-903', NULL, 'hourly', 'Inventory Alert Notifications & Email Digest Automation', 'Scheduled background cron workers for stock depletion alerts and automated nightly reconciliation logs.', 6, 1500, 9000, ?, ?, 'changes_requested', 'Please add support for SMS alert dispatch via Semaphore/Twilio API before approving.', 'Bahay Kubo Tech Lead', '2026-08-19 14:15:00', NULL, ?, ?)`,
    [
      JSON.stringify(['https://github.com/marcoreyes-dev/bahay-kubo-sync/pull/4']),
      JSON.stringify(['cron_alert_spec.pdf']),
      now,
      now
    ]
  );

  /* FREELANCER INVOICES & PAYMENTS */
  executeRun(
    `INSERT OR IGNORE INTO freelancer_invoices (id, freelancer_id, engagement_id, milestone_id, work_log_ids, invoice_number, client_identifier, client_email, amount, currency, due_date, status, payment_method, paid_at, receipt_number, notes, history, created_at, updated_at)
     VALUES ('INV-FR-301', 'VP-FR-10284', 'ENG-902', 'MLS-902-1', ?, 'INV-2026-0891', 'Nexus Digital Media Inc', 'billing@nexusdigital.ph', 30000, 'PHP', '2026-08-15', 'paid', 'GCash Verified Gateway', '2026-08-15T14:30:00Z', 'RCP-2026-9901', 'Milestone 1: UI Component Design System & Navigation', ?, ?, ?)`,
    [
      JSON.stringify(['WLOG-101']),
      JSON.stringify([
        { status: 'draft', timestamp: '2026-08-10 10:00:00', actor: 'Marco Antonio Reyes', note: 'Invoice generated from approved work log WLOG-101' },
        { status: 'sent', timestamp: '2026-08-10 10:05:00', actor: 'Marco Antonio Reyes', note: 'Invoice sent to billing@nexusdigital.ph' },
        { status: 'paid', timestamp: '2026-08-15 14:30:00', actor: 'Nexus Digital Media Inc', note: 'Settled via GCash Instant Gateway Ref #GC-881920' }
      ]),
      now,
      now
    ]
  );

  executeRun(
    `INSERT OR IGNORE INTO freelancer_invoices (id, freelancer_id, engagement_id, milestone_id, work_log_ids, invoice_number, client_identifier, client_email, amount, currency, due_date, status, payment_method, paid_at, receipt_number, notes, history, created_at, updated_at)
     VALUES ('INV-FR-302', 'VP-FR-10284', 'ENG-901', 'MLS-901-2', ?, 'INV-2026-0089', 'ABC Company (Metro Manila Retail)', 'finance@abcretail.ph', 25000, 'PHP', '2026-08-01', 'disputed', NULL, NULL, NULL, 'Final 50% delivery milestone payment', ?, ?, ?)`,
    [
      JSON.stringify([]),
      JSON.stringify([
        { status: 'sent', timestamp: '2026-07-31 09:00:00', actor: 'Marco Antonio Reyes', note: 'Invoice sent to finance@abcretail.ph' },
        { status: 'disputed', timestamp: '2026-08-05 11:20:00', actor: 'Marco Antonio Reyes', note: 'Dispute filed due to past-due non-payment' }
      ]),
      now,
      now
    ]
  );

  executeRun(
    `INSERT OR IGNORE INTO freelancer_invoices (id, freelancer_id, engagement_id, milestone_id, work_log_ids, invoice_number, client_identifier, client_email, amount, currency, due_date, status, payment_method, paid_at, receipt_number, notes, history, created_at, updated_at)
     VALUES ('INV-FR-303', 'VP-FR-10284', 'ENG-903', NULL, ?, 'INV-2026-0915', 'Bahay Kubo Enterprise', 'owner@bahaykubo.ph', 24000, 'PHP', '2026-09-05', 'approved', NULL, NULL, NULL, '16 Logged Hours: POS Webhook & Sync Architecture Engine', ?, ?, ?)`,
    [
      JSON.stringify(['WLOG-103']),
      JSON.stringify([
        { status: 'sent', timestamp: '2026-08-19 09:00:00', actor: 'Marco Antonio Reyes', note: 'Invoice generated and sent to owner@bahaykubo.ph' },
        { status: 'approved', timestamp: '2026-08-19 16:30:00', actor: 'Bahay Kubo Tech Lead', note: 'Approved for payout processing' }
      ]),
      now,
      now
    ]
  );

  /* FREELANCER PAYMENTS SEED */
  executeRun(
    `INSERT OR IGNORE INTO freelancer_payments (id, engagement_id, invoice_id, amount, currency, payment_date, payment_method, proof_file, status, created_at)
     VALUES ('PAY-FR-801', 'ENG-902', 'INV-FR-301', 30000, 'PHP', '2026-08-15 14:30:00', 'GCash Direct Gateway', '/receipts/RCP-2026-9901.pdf', 'confirmed', ?)`,
    [now]
  );

  /* FREELANCER DISPUTE */
  executeRun(
    `INSERT OR IGNORE INTO freelancer_disputes (id, freelancer_id, client_identifier, engagement_id, dispute_category, amount_disputed, currency, description, contract_evidence, case_status, assigned_reviewer_id, reviewer_notes, resolution, resolution_date, created_at, updated_at)
     VALUES ('FR-DISP-401', 'VP-FR-10284', 'ABC Company', 'ENG-901', 'Non-payment', 25000, 'PHP', 'Final 50% completion payment milestone past due by 12 days after successful store delivery, bug clearance, and signed UAT.', '/docs/SOW_ABC_Company.pdf', 'Client Responded', 'STF-107', 'Client uploaded bank transfer receipt inquiry. Reviewer inspecting timestamp match.', NULL, NULL, ?, ?)`,
    [now, now]
  );

  /* CLIENT RESPONSE */
  executeRun(
    `INSERT OR IGNORE INTO client_responses (id, dispute_id, client_identifier, response_text, payment_proof_info, submitted_at)
     VALUES ('CR-1002', 'FR-DISP-401', 'ABC Company', 'We acknowledge delivery of the website. Remaining ₱25,000 balance is currently being processed by accounting following our standard 15-day vendor payment cycle.', 'Bank voucher ref #BDO-992015 issued August 10', ?)`,
    [now]
  );

  /* FREELANCER EVIDENCE */
  executeRun(
    `INSERT OR IGNORE INTO freelancer_evidence (id, case_id, uploader_type, uploader_id, file_name, file_type, file_size, description, file_storage_path, access_history, created_at)
     VALUES ('EVI-701', 'FR-DISP-401', 'freelancer', 'VP-FR-10284', 'Signed_UAT_Signoff_Receipt.pdf', 'application/pdf', '1.2 MB', 'User Acceptance Testing (UAT) signoff document signed by ABC Company project manager.', '/private/EVI-701.pdf', '[]', ?)`,
    [now]
  );

  /* FREELANCER INVOICE & PAYMENT */
  executeRun(
    `INSERT OR IGNORE INTO freelancer_invoices (id, freelancer_id, engagement_id, invoice_number, amount, currency, due_date, status, notes, created_at)
     VALUES ('INV-FR-301', 'VP-FR-10284', 'ENG-901', 'INV-2026-0089', 25000, 'PHP', '2026-08-01', 'disputed', 'Final 50% delivery milestone payment', ?)`,
    [now]
  );

  // Update Marco Antonio Reyes profile with new directory fields
  executeRun(`
    UPDATE freelancer_profiles SET
      username = 'marcoreyes',
      professional_title = 'Senior Full-Stack Web Developer',
      city = 'Quezon City',
      country = 'Philippines',
      services = ?,
      professional_summary = 'Experienced full-stack developer specializing in scalable web apps, custom API architectures, React, Node.js, and cloud database integrations with over 7 years of commercial experience in Metro Manila.',
      availability = 'Available for hire',
      allow_public_discovery = 1,
      rating = 4.9,
      review_count = 18
    WHERE id = 'VP-FR-10284'
  `, [
    JSON.stringify(['Custom Full-Stack Web Apps', 'REST & GraphQL API Architecture', 'E-Commerce Portals & Payment Integrations', 'Database Optimization & Security'])
  ]);

  // Seed additional Verified Freelancers
  const additionalFreelancers = [
    {
      id: 'VP-FR-10285',
      user_id: 'USER-FR-10285',
      email: 'maria.santos@designstudio.ph',
      username: 'mariasantos',
      full_name: 'Maria Teresa Santos',
      professional_name: 'Maria Santos | Brand & Graphic Design Lead',
      professional_title: 'Senior Graphic Designer & Brand Strategist',
      photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80',
      category: 'Creative & Graphic Design',
      city: 'Cebu City',
      location: 'Cebu City, Central Visayas, Philippines',
      skills: ['Brand Identity', 'Logo Design', 'Adobe Illustrator', 'Photoshop', 'Packaging Design', 'Typography'],
      services: ['Corporate Brand Identity Systems', 'Custom Logo & Style Guides', 'Product Packaging Design', 'Social Media Visual Kits'],
      exp: 6,
      portfolio: ['https://behance.net/mariasantos-design', 'https://mariasantos.ph'],
      social: { website: 'https://mariasantos.ph', instagram: '@mariasantos.design' },
      summary: 'Award-winning Cebuano brand strategist and visual designer crafting compelling brand identities, packaging, and marketing collateral for local businesses and regional brands.',
      status: 'verified',
      kyc: 'verified',
      avail: 'Available for hire',
      rating: 5.0,
      review_count: 24
    },
    {
      id: 'VP-FR-10286',
      user_id: 'USER-FR-10286',
      email: 'juan.delacruz@mobiledev.ph',
      username: 'juandelacruz',
      full_name: 'Juan Paolo dela Cruz',
      professional_name: 'Juan dela Cruz | Senior iOS & Flutter Engineer',
      professional_title: 'Mobile App Developer (iOS & Android)',
      photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
      category: 'Web & Software Development',
      city: 'Makati City',
      location: 'Makati City, Metro Manila, Philippines',
      skills: ['Flutter', 'React Native', 'Swift', 'Kotlin', 'Firebase', 'Mobile UI/UX'],
      services: ['Cross-Platform Mobile Apps', 'iOS Native Swift Development', 'App Store & Play Store Publishing', 'Mobile App Maintenance'],
      exp: 5,
      portfolio: ['https://github.com/juandelacruz-mobile', 'https://juandelacruz.dev'],
      social: { website: 'https://juandelacruz.dev', linkedin: 'https://linkedin.com/in/juandelacruz-mobile' },
      summary: 'Passionate mobile developer based in Makati creating smooth, cross-platform iOS and Android apps with clean code, responsive UX, and backend API connections.',
      status: 'verified',
      kyc: 'verified',
      avail: 'Limited availability',
      rating: 4.8,
      review_count: 14
    },
    {
      id: 'VP-FR-10287',
      user_id: 'USER-FR-10287',
      email: 'karyn.lim@uxstudio.ph',
      username: 'karynlim',
      full_name: 'Karyn Grace Lim',
      professional_name: 'Karyn Lim | UI/UX & Product Design Specialist',
      professional_title: 'UI/UX Designer & Product Researcher',
      photo: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=300&q=80',
      category: 'Creative & Graphic Design',
      city: 'Davao City',
      location: 'Davao City, Davao del Sur, Philippines',
      skills: ['Figma', 'User Research', 'Wireframing', 'Interactive Prototyping', 'Design Systems', 'Usability Testing'],
      services: ['Full Product UX Research & Wireframes', 'Figma Design System Creation', 'Clickable Mobile/Web Prototypes', 'UX Audits & Conversion Optimization'],
      exp: 4,
      portfolio: ['https://dribbble.com/karynlim-ux', 'https://karynlim.design'],
      social: { website: 'https://karynlim.design', twitter: '@karynlim_ux' },
      summary: 'Mindanao-based product designer creating accessible, intuitive user experiences and comprehensive Figma design systems for tech startups and online platforms.',
      status: 'verified',
      kyc: 'verified',
      avail: 'Available for hire',
      rating: 4.9,
      review_count: 15
    },
    {
      id: 'VP-FR-10288',
      user_id: 'USER-FR-10288',
      email: 'gab.banson@seolead.ph',
      username: 'gabbanson',
      full_name: 'Gabriel Christian Banson',
      professional_name: 'Gab Banson | Technical SEO & Content Strategist',
      professional_title: 'SEO Specialist & Content Marketing Lead',
      photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
      category: 'Digital Marketing & Content',
      city: 'Pasig City',
      location: 'Pasig City (Ortigas), Metro Manila, Philippines',
      skills: ['Technical SEO', 'Google Analytics 4', 'Keyword Research', 'Content Strategy', 'Backlink Outreach', 'Semrush'],
      services: ['Comprehensive Technical SEO Audit', 'Google Keyword Ranking Optimization', 'E-Commerce Content Marketing Strategy', 'Local Business Search Visibility'],
      exp: 8,
      portfolio: ['https://gabbanson.com/case-studies'],
      social: { website: 'https://gabbanson.com', linkedin: 'https://linkedin.com/in/gabbanson-seo' },
      summary: 'Data-driven SEO lead in Ortigas with 8 years of proven success scaling organic traffic and domain authority for e-commerce and B2B clients across Southeast Asia.',
      status: 'verified',
      kyc: 'verified',
      avail: 'Available for hire',
      rating: 4.7,
      review_count: 11
    },
    {
      id: 'VP-FR-10289',
      user_id: 'USER-FR-10289',
      email: 'patricia.dizon@cloudops.ph',
      username: 'patriciadizon',
      full_name: 'Patricia Anne Dizon',
      professional_name: 'Patricia Dizon | Senior Cloud Architect & DevOps Lead',
      professional_title: 'DevOps & Cloud Infrastructure Engineer',
      photo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80',
      category: 'IT & Cloud Engineering',
      city: 'Taguig City',
      location: 'Taguig City (BGC), Metro Manila, Philippines',
      skills: ['AWS', 'Google Cloud Platform', 'Docker', 'Kubernetes', 'CI/CD Pipelines', 'Terraform', 'Linux Security'],
      services: ['AWS/GCP Cloud Architecture Setup', 'Docker & Kubernetes Migration', 'Automated CI/CD Pipeline Build', 'Server Cost Optimization & Security Audit'],
      exp: 6,
      portfolio: ['https://github.com/patriciadizon-devops'],
      social: { website: 'https://patriciadizon.cloud', linkedin: 'https://linkedin.com/in/patricia-dizon-cloud' },
      summary: 'BGC-based cloud infrastructure specialist helping tech companies scale secure containerized deployments, automate deployment pipelines, and reduce cloud bills.',
      status: 'verified',
      kyc: 'verified',
      avail: 'Project basis',
      rating: 5.0,
      review_count: 12
    },
    {
      id: 'VP-FR-10290',
      user_id: 'USER-FR-10290',
      email: 'joshua.ocampo@frontend.ph',
      username: 'joshuaocampo',
      full_name: 'Joshua Nathaniel Ocampo',
      professional_name: 'Joshua Ocampo | Junior Frontend Developer',
      professional_title: 'Junior Frontend Developer',
      photo: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=300&q=80',
      category: 'Web & Software Development',
      city: 'Iloilo City',
      location: 'Iloilo City, Iloilo, Philippines',
      skills: ['HTML/CSS', 'JavaScript', 'Vue.js', 'Bootstrap'],
      services: ['Landing Page Slicing', 'HTML/CSS Maintenance', 'Website Bug Fixes'],
      exp: 2,
      portfolio: ['https://github.com/joshuaocampo-fe'],
      social: { github: 'https://github.com/joshuaocampo-fe' },
      summary: 'Enthusiastic front-end developer building clean landing pages and responsive user interfaces.',
      status: 'under_review',
      kyc: 'submitted',
      avail: 'Available for hire',
      rating: 4.5,
      review_count: 3
    }
  ];

  for (const fr of additionalFreelancers) {
    executeRun(`
      INSERT OR IGNORE INTO users (id, email, password_hash, full_name, mobile_number, user_type, account_status, email_verified, created_at, updated_at)
      VALUES (?, ?, ?, ?, '09181112233', 'freelancer', 'active', 1, ?, ?)
    `, [fr.user_id, fr.email, frPass.hash, fr.full_name, now, now]);

    executeRun(`
      INSERT OR IGNORE INTO freelancer_profiles (
        id, user_id, full_name, professional_name, professional_title, username, profile_photo,
        professional_category, skills, services, city, country, location, years_of_experience,
        portfolio_links, website_social_links, professional_summary, verification_status,
        kyc_verification_status, date_verified, profile_status, availability, allow_public_discovery,
        rating, review_count, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Philippines', ?, ?, ?, ?, ?, ?, ?, '2026-04-10T10:00:00Z', 'active', ?, 1, ?, ?, ?, ?)
    `, [
      fr.id, fr.user_id, fr.full_name, fr.professional_name, fr.professional_title, fr.username, fr.photo,
      fr.category, JSON.stringify(fr.skills), JSON.stringify(fr.services), fr.city, fr.location, fr.exp,
      JSON.stringify(fr.portfolio), JSON.stringify(fr.social), fr.summary, fr.status, fr.kyc,
      fr.avail, fr.rating, fr.review_count, now, now
    ]);

    if (fr.status === 'verified') {
      executeRun(`
        INSERT OR IGNORE INTO freelancer_verifications (id, freelancer_id, kyc_application_id, reviewer_id, reviewer_notes, verification_status, submitted_at, reviewed_at)
        VALUES (?, ?, 'KYC-SEEDED', 'STF-107', 'Identity & credentials verified.', 'approved', ?, ?)
      `, ['VER-' + fr.id, fr.id, now, now]);
    }
  }

  // Seed initial sample reviews for Marco Reyes
  executeRun(`
    INSERT OR IGNORE INTO freelancer_reviews (id, freelancer_id, author_name, author_email, author_type, rating, review_title, review_text, verification_status, created_at)
    VALUES ('REV-FR-101', 'VP-FR-10284', 'Metro Manila Retail Inc.', 'client@mmretail.ph', 'business', 5, 'Exceptional E-Commerce Platform Build', 'Marco built our entire custom online store from scratch with database integration and inventory sync. Delivered ahead of deadline with super clean code and excellent communication!', 'verified', ?)
  `, [now]);

  executeRun(`
    INSERT OR IGNORE INTO freelancer_reviews (id, freelancer_id, author_name, author_email, author_type, rating, review_title, review_text, verification_status, created_at)
    VALUES ('REV-FR-102', 'VP-FR-10284', 'TechBayan Corp.', 'projects@techbayan.ph', 'business', 5, 'Reliable Senior Full-Stack Engineer', 'Marco optimized our REST APIs and built responsive React components for our customer dashboard. Highly recommended verified Filipino freelancer!', 'verified', ?)
  `, [now]);

  // Seed sample messages for Marco Reyes
  executeRun(`
    INSERT OR IGNORE INTO freelancer_messages (id, freelancer_id, sender_name, sender_email, sender_phone, sender_type, subject, message_text, budget_range, status, created_at)
    VALUES ('MSG-FR-201', 'VP-FR-10284', 'Bayanihan Digital Agency', 'client@bayanihandigital.ph', '09175558899', 'business', 'Project Inquiry: Custom Node.js & React Dashboard', 'Hi Marco! We saw your VeriPinoy Verified profile. We have an upcoming client project requiring a full-stack dashboard with payment gateway integration. Are you available for a 2-month contract?', '₱50,000 - ₱150,000', 'unread', ?)
  `, [now]);

  /* SEED DISCOVERY MASTER DATA (LOCATIONS, INDUSTRIES & PUBLIC BUSINESSES) */
  seedDiscoveryMasterData(now);
}

function seedDiscoveryMasterData(now = new Date().toISOString()) {
  const checkLoc = queryOne('SELECT COUNT(*) as count FROM cities');
  if (checkLoc && checkLoc.count > 0) return;

  // 1. Countries, Regions, Provinces
  executeRun(`INSERT OR IGNORE INTO countries (id, name, code) VALUES ('COUNTRY-PH', 'Philippines', 'PH')`);

  const regions = [
    { id: 'REG-NCR', country_id: 'COUNTRY-PH', name: 'National Capital Region', code: 'NCR' },
    { id: 'REG-R4A', country_id: 'COUNTRY-PH', name: 'CALABARZON (Region IV-A)', code: 'R4A' },
    { id: 'REG-R7', country_id: 'COUNTRY-PH', name: 'Central Visayas (Region VII)', code: 'R7' },
    { id: 'REG-R11', country_id: 'COUNTRY-PH', name: 'Davao Region (Region XI)', code: 'R11' }
  ];
  for (const r of regions) {
    executeRun(`INSERT OR IGNORE INTO regions (id, country_id, name, code) VALUES (?, ?, ?, ?)`, [r.id, r.country_id, r.name, r.code]);
  }

  const provinces = [
    { id: 'PROV-MM', region_id: 'REG-NCR', name: 'Metro Manila' },
    { id: 'PROV-BATANGAS', region_id: 'REG-R4A', name: 'Batangas' },
    { id: 'PROV-CEBU', region_id: 'REG-R7', name: 'Cebu' },
    { id: 'PROV-DAVAO', region_id: 'REG-R11', name: 'Davao del Sur' }
  ];
  for (const p of provinces) {
    executeRun(`INSERT OR IGNORE INTO provinces (id, region_id, name) VALUES (?, ?, ?)`, [p.id, p.region_id, p.name]);
  }

  // 2. Cities / Municipalities
  const cities = [
    { id: 'CITY-MANILA', province_id: 'PROV-MM', name: 'Manila', slug: 'manila' },
    { id: 'CITY-QC', province_id: 'PROV-MM', name: 'Quezon City', slug: 'quezon-city' },
    { id: 'CITY-MAKATI', province_id: 'PROV-MM', name: 'Makati', slug: 'makati' },
    { id: 'CITY-LIPA', province_id: 'PROV-BATANGAS', name: 'Lipa City', slug: 'lipa-city' },
    { id: 'CITY-CEBU', province_id: 'PROV-CEBU', name: 'Cebu City', slug: 'cebu-city' },
    { id: 'CITY-DAVAO', province_id: 'PROV-DAVAO', name: 'Davao City', slug: 'davao-city' },
    { id: 'CITY-TAGUIG', province_id: 'PROV-MM', name: 'Taguig', slug: 'taguig' },
    { id: 'CITY-PASIG', province_id: 'PROV-MM', name: 'Pasig', slug: 'pasig' }
  ];
  for (const c of cities) {
    executeRun(`INSERT OR IGNORE INTO cities (id, province_id, name, slug, status) VALUES (?, ?, ?, ?, 'active')`, [c.id, c.province_id, c.name, c.slug]);
  }

  // 3. Industries & Hierarchical Categories
  const industries = [
    { id: 'IND-FOOD', name: 'Food & Hospitality', slug: 'food-hospitality', parent_id: null },
    { id: 'IND-REST', name: 'Restaurants', slug: 'restaurants', parent_id: 'IND-FOOD' },
    { id: 'IND-CAFE', name: 'Cafes', slug: 'cafes', parent_id: 'IND-FOOD' },
    { id: 'IND-CATER', name: 'Catering', slug: 'catering', parent_id: 'IND-FOOD' },
    
    { id: 'IND-PROF', name: 'Professional Services', slug: 'professional-services', parent_id: null },
    { id: 'IND-MKTG', name: 'Digital Marketing', slug: 'digital-marketing', parent_id: 'IND-PROF' },
    { id: 'IND-ACCT', name: 'Accounting', slug: 'accounting', parent_id: 'IND-PROF' },
    { id: 'IND-LEGAL', name: 'Legal Services', slug: 'legal-services', parent_id: 'IND-PROF' },
    { id: 'IND-IT', name: 'IT Services', slug: 'it-services', parent_id: 'IND-PROF' },
    
    { id: 'IND-REAL', name: 'Construction & Real Estate', slug: 'construction-real-estate', parent_id: null },
    { id: 'IND-CONST', name: 'Construction', slug: 'construction', parent_id: 'IND-REAL' },
    { id: 'IND-RE', name: 'Real Estate', slug: 'real-estate', parent_id: 'IND-REAL' },
    
    { id: 'IND-RETAIL', name: 'Retail & E-commerce', slug: 'retail-ecommerce', parent_id: null },
    { id: 'IND-RET', name: 'Retail', slug: 'retail', parent_id: 'IND-RETAIL' },
    { id: 'IND-ECOM', name: 'E-commerce', slug: 'e-commerce', parent_id: 'IND-RETAIL' },
    { id: 'IND-ELEC', name: 'Electronics', slug: 'electronics', parent_id: 'IND-RETAIL' },

    { id: 'IND-HEALTH', name: 'Healthcare', slug: 'healthcare', parent_id: null },
    { id: 'IND-EDU', name: 'Education', slug: 'education', parent_id: null },
    { id: 'IND-LOG', name: 'Transportation & Logistics', slug: 'transportation-logistics', parent_id: null }
  ];
  for (const ind of industries) {
    executeRun(`INSERT OR IGNORE INTO industries (id, name, slug, parent_id, status) VALUES (?, ?, ?, ?, 'active')`, [ind.id, ind.name, ind.slug, ind.parent_id]);
  }

  // 4. Seed Business Listings
  const businesses = [
    {
      id: 'BIZ-2001',
      user_id: 'USR-BIZ-2001',
      business_name: 'Manila Artisan Bakery & Cafe',
      slug: 'manila-artisan-bakery',
      business_email: 'contact@manilabakery.ph',
      business_phone: '09189876543',
      business_type: 'Corporation',
      industry: 'Cafes',
      industry_id: 'IND-CAFE',
      city_id: 'CITY-QC',
      province_id: 'PROV-MM',
      business_address: '123 Katipunan Ave, Quezon City',
      website: 'https://manilabakery.ph',
      social_media: '@manilabakery',
      authorized_representative: 'Juan Dela Cruz',
      verification_status: 'verified',
      rating: 4.9,
      review_count: 128,
      short_description: 'Heirloom sourdough, artisan pastries, and specialty Philippine single-origin coffees.',
      services: JSON.stringify(['Artisan Bread', 'Specialty Coffee', 'Catering', 'Dine-in', 'Takeout']),
      years_in_business: 5,
      business_size: 'Medium',
      logo: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=300&q=80',
      verified_at: '2025-11-10T10:00:00Z',
      featured: 1
    },
    {
      id: 'BIZ-3001',
      user_id: 'USR-BIZ-2001',
      business_name: 'ABC Digital Solutions',
      slug: 'abc-digital-solutions',
      business_email: 'hello@abcdigital.ph',
      business_phone: '09171112233',
      business_type: 'Corporation',
      industry: 'Digital Marketing',
      industry_id: 'IND-MKTG',
      city_id: 'CITY-LIPA',
      province_id: 'PROV-BATANGAS',
      business_address: '45 Ayala Highway, Lipa City, Batangas',
      website: 'https://abcdigital.ph',
      social_media: '@abcdigitalsolutions',
      authorized_representative: 'Clarissa Santos',
      verification_status: 'verified',
      rating: 4.7,
      review_count: 124,
      short_description: 'Full-service digital agency specializing in search engine optimization, paid advertising, and web design.',
      services: JSON.stringify(['SEO', 'Social Media Ads', 'Web Design', 'Branding', 'Content Marketing']),
      years_in_business: 7,
      business_size: 'Small',
      logo: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=300&q=80',
      verified_at: '2025-08-15T14:30:00Z',
      featured: 1
    },
    {
      id: 'BIZ-3002',
      user_id: 'USR-BIZ-2001',
      business_name: 'Batangas Brew Cafe & Kitchen',
      slug: 'batangas-brew-cafe',
      business_email: 'orders@batangasbrew.ph',
      business_phone: '09438881234',
      business_type: 'Sole Proprietorship',
      industry: 'Restaurants',
      industry_id: 'IND-REST',
      city_id: 'CITY-LIPA',
      province_id: 'PROV-BATANGAS',
      business_address: 'Sabang, Lipa City, Batangas',
      website: 'https://batangasbrew.ph',
      social_media: '@batangasbrew',
      authorized_representative: 'Rodrigo Recto',
      verification_status: 'verified',
      rating: 4.8,
      review_count: 92,
      short_description: 'Authentic Kapeng Barako, traditional Lomi, and comforting southern Tagalog dishes.',
      services: JSON.stringify(['Kapeng Barako', 'Batangas Lomi', 'All-Day Breakfast', 'Dine-in']),
      years_in_business: 4,
      business_size: 'Small',
      logo: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=300&q=80',
      verified_at: '2026-01-20T11:00:00Z',
      featured: 0
    },
    {
      id: 'BIZ-3003',
      user_id: 'USR-BIZ-2001',
      business_name: 'Cebu Web Tech & Cloud',
      slug: 'cebu-web-tech',
      business_email: 'info@cebuwebtech.ph',
      business_phone: '09327778899',
      business_type: 'Corporation',
      industry: 'IT Services',
      industry_id: 'IND-IT',
      city_id: 'CITY-CEBU',
      province_id: 'PROV-CEBU',
      business_address: 'Cebu IT Park, Lahug, Cebu City',
      website: 'https://cebuwebtech.ph',
      social_media: '@cebuwebtech',
      authorized_representative: 'Mateo Osmeña',
      verification_status: 'verified',
      rating: 4.9,
      review_count: 210,
      short_description: 'Custom enterprise web application engineering, cloud database optimization, and mobile app development.',
      services: JSON.stringify(['Web Development', 'E-Commerce', 'Cloud Hosting', 'UI/UX Design']),
      years_in_business: 6,
      business_size: 'Medium',
      logo: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=300&q=80',
      verified_at: '2025-09-01T09:15:00Z',
      featured: 1
    },
    {
      id: 'BIZ-3004',
      user_id: 'USR-BIZ-2001',
      business_name: 'Cebu Horizon Marketing Agency',
      slug: 'cebu-horizon-marketing',
      business_email: 'contact@cebuhorizon.ph',
      business_phone: '09334445566',
      business_type: 'Partnership',
      industry: 'Digital Marketing',
      industry_id: 'IND-MKTG',
      city_id: 'CITY-CEBU',
      province_id: 'PROV-CEBU',
      business_address: 'Fuente Osmeña Circle, Cebu City',
      website: 'https://cebuhorizon.ph',
      social_media: '@cebuhorizon',
      authorized_representative: 'Vanessa Rama',
      verification_status: 'verified',
      rating: 4.6,
      review_count: 84,
      short_description: 'Growth marketing partner helping Visayas businesses scale via social ads and search dominance.',
      services: JSON.stringify(['SEO', 'Google Ads', 'Social Media Management', 'Video Marketing']),
      years_in_business: 4,
      business_size: 'Small',
      logo: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=300&q=80',
      verified_at: '2026-02-14T08:00:00Z',
      featured: 0
    },
    {
      id: 'BIZ-3005',
      user_id: 'USR-BIZ-2001',
      business_name: 'Makati Financial & Accounting Services',
      slug: 'makati-financial-accounting',
      business_email: 'support@makatifinancial.ph',
      business_phone: '0288123456',
      business_type: 'Corporation',
      industry: 'Accounting',
      industry_id: 'IND-ACCT',
      city_id: 'CITY-MAKATI',
      province_id: 'PROV-MM',
      business_address: 'Ayala Avenue, Makati City',
      website: 'https://makatifinancial.ph',
      social_media: '@makatifinancial',
      authorized_representative: 'Atty. Gabriel Zobel',
      verification_status: 'verified',
      rating: 4.9,
      review_count: 156,
      short_description: 'BIR tax compliance, corporate audit, payroll management, and bookkeeping solutions for PH SMEs.',
      services: JSON.stringify(['Tax Filing', 'Auditing', 'Bookkeeping', 'Payroll Outsourcing', 'BIR Compliance']),
      years_in_business: 10,
      business_size: 'Medium',
      logo: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=300&q=80',
      verified_at: '2025-05-20T10:00:00Z',
      featured: 1
    },
    {
      id: 'BIZ-3006',
      user_id: 'USR-BIZ-2001',
      business_name: 'Manila Bay Express Freight & Cargo',
      slug: 'manila-bay-express',
      business_email: 'info@manilabayexpress.ph',
      business_phone: '0288889900',
      business_type: 'Corporation',
      industry: 'Transportation & Logistics',
      industry_id: 'IND-LOG',
      city_id: 'CITY-MANILA',
      province_id: 'PROV-MM',
      business_address: 'Roxas Blvd, Ermita, Manila',
      website: 'https://manilabayexpress.ph',
      social_media: '@manilabayexpress',
      authorized_representative: 'Captain Antonio Roxas',
      verification_status: 'verified',
      rating: 4.8,
      review_count: 310,
      short_description: 'Inter-island vessel freight, door-to-door express delivery, and warehousing across Luzon, Visayas, and Mindanao.',
      services: JSON.stringify(['Sea Freight', 'Trucking', 'Door-to-door Delivery', 'Warehousing']),
      years_in_business: 12,
      business_size: 'Large',
      logo: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=300&q=80',
      verified_at: '2025-01-10T12:00:00Z',
      featured: 1
    },
    {
      id: 'BIZ-3007',
      user_id: 'USR-BIZ-2001',
      business_name: 'Taguig Corporate & Legal Advisory',
      slug: 'taguig-legal-advisory',
      business_email: 'inquiry@taguiglegal.ph',
      business_phone: '0288554433',
      business_type: 'Partnership',
      industry: 'Legal Services',
      industry_id: 'IND-LEGAL',
      city_id: 'CITY-TAGUIG',
      province_id: 'PROV-MM',
      business_address: 'Bonifacio Global City (BGC), Taguig',
      website: 'https://taguiglegal.ph',
      social_media: '@taguiglegal',
      authorized_representative: 'Atty. Bea Alonzo',
      verification_status: 'verified',
      rating: 4.9,
      review_count: 67,
      short_description: 'BGC-based corporate legal retainer, SEC/DTI business incorporation, and contract dispute arbitration.',
      services: JSON.stringify(['Corporate Law', 'Contract Review', 'SEC Incorporation', 'IP Protection']),
      years_in_business: 8,
      business_size: 'Small',
      logo: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=300&q=80',
      verified_at: '2025-10-05T09:00:00Z',
      featured: 0
    },
    {
      id: 'BIZ-3008',
      user_id: 'USR-BIZ-2001',
      business_name: 'Pasig Smart Tech Hardware Repair',
      slug: 'pasig-smart-tech',
      business_email: 'support@pasigsmarttech.ph',
      business_phone: '09192223344',
      business_type: 'Sole Proprietorship',
      industry: 'Electronics',
      industry_id: 'IND-ELEC',
      city_id: 'CITY-PASIG',
      province_id: 'PROV-MM',
      business_address: 'Kapitolyo, Pasig City',
      website: 'https://pasigsmarttech.ph',
      social_media: '@pasigsmarttech',
      authorized_representative: 'Danilo Cruz',
      verification_status: 'unverified',
      rating: 3.8,
      review_count: 19,
      short_description: 'Local computer, laptop motherboard, and smartphone repair shop.',
      services: JSON.stringify(['Laptop Repair', 'Smartphone Repair', 'Data Recovery']),
      years_in_business: 2,
      business_size: 'Small',
      logo: 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?auto=format&fit=crop&w=300&q=80',
      verified_at: null,
      featured: 0
    }
  ];

  for (const b of businesses) {
    executeRun(
      `INSERT OR REPLACE INTO businesses (id, user_id, business_name, slug, business_email, business_phone, business_type, industry, industry_id, city_id, province_id, business_address, website, social_media, authorized_representative, account_status, verification_status, rating, review_count, short_description, services, years_in_business, business_size, logo, verified_at, featured, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        b.id, b.user_id, b.business_name, b.slug, b.business_email, b.business_phone, b.business_type,
        b.industry, b.industry_id, b.city_id, b.province_id, b.business_address, b.website, b.social_media,
        b.authorized_representative, b.verification_status, b.rating, b.review_count, b.short_description,
        b.services, b.years_in_business, b.business_size, b.logo, b.verified_at, b.featured, now, now
      ]
    );

    // Also add entry to business_locations
    executeRun(
      `INSERT OR REPLACE INTO business_locations (id, business_id, city_id, address, lat, lng, is_primary, is_public)
       VALUES (?, ?, ?, ?, 14.5995, 120.9842, 1, 1)`,
      [`LOC_${b.id}`, b.id, b.city_id, b.business_address]
    );
  }
}

function seedSecurityData(now = new Date().toISOString()) {
  // 1. Seed Vault Documents (KYB, KYC & Evidence)
  const vaultDocs = [
    {
      id: 'DOC-KYB-SEC-01',
      entity_type: 'kyb',
      entity_id: 'BIZ-3001',
      document_type: 'sec_registration',
      filename: 'SEC_Certificate_BahayKubo_2026.pdf',
      storage_path: 'vault/kyb/BIZ-3001/sec_reg_2026_aes256.enc',
      encryption_algorithm: 'AES-256-GCM',
      access_policy: 'role_restricted',
      file_size: 2458000,
      mime_type: 'application/pdf',
      uploaded_by: 'USR-BIZ-2001'
    },
    {
      id: 'DOC-KYB-BIR-02',
      entity_type: 'kyb',
      entity_id: 'BIZ-3001',
      document_type: 'bir_2303',
      filename: 'BIR_Form_2303_Certificate_Registration.pdf',
      storage_path: 'vault/kyb/BIZ-3001/bir_2303_aes256.enc',
      encryption_algorithm: 'AES-256-GCM',
      access_policy: 'role_restricted',
      file_size: 1820000,
      mime_type: 'application/pdf',
      uploaded_by: 'USR-BIZ-2001'
    },
    {
      id: 'DOC-KYB-MAYOR-03',
      entity_type: 'kyb',
      entity_id: 'BIZ-3001',
      document_type: 'mayors_permit',
      filename: 'Makati_Mayors_Business_Permit_2026.pdf',
      storage_path: 'vault/kyb/BIZ-3001/mayors_permit_2026_aes256.enc',
      encryption_algorithm: 'AES-256-GCM',
      access_policy: 'role_restricted',
      file_size: 3100000,
      mime_type: 'application/pdf',
      uploaded_by: 'USR-BIZ-2001'
    },
    {
      id: 'DOC-KYC-PASSPORT-01',
      entity_type: 'kyc',
      entity_id: 'USER-FR-10284',
      document_type: 'gov_id',
      filename: 'PH_Passport_Marco_Reyes_Redacted.pdf',
      storage_path: 'vault/kyc/USER-FR-10284/passport_aes256.enc',
      encryption_algorithm: 'AES-256-GCM',
      access_policy: 'role_restricted',
      file_size: 4200000,
      mime_type: 'application/pdf',
      uploaded_by: 'USER-FR-10284'
    }
  ];

  for (const doc of vaultDocs) {
    executeRun(
      `INSERT OR REPLACE INTO vault_documents (id, entity_type, entity_id, document_type, filename, storage_path, encryption_algorithm, access_policy, file_size, mime_type, uploaded_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [doc.id, doc.entity_type, doc.entity_id, doc.document_type, doc.filename, doc.storage_path, doc.encryption_algorithm, doc.access_policy, doc.file_size, doc.mime_type, doc.uploaded_by, now]
    );
  }

  // 2. Seed Duplicate Registry Hashes
  const dupEntries = [
    { type: 'tin', raw: '239-812-441-000', entityType: 'business', entityId: 'BIZ-3001' },
    { type: 'dtisec', raw: 'SEC-2026-0812-MNL', entityType: 'business', entityId: 'BIZ-3001' },
    { type: 'bank_account', raw: '1288-0099-2341', entityType: 'business', entityId: 'BIZ-3001' },
    { type: 'tin', raw: '102-394-881-000', entityType: 'business', entityId: 'BIZ-3006' },
    { type: 'phone', raw: '09189876543', entityType: 'business', entityId: 'BIZ-3001' },
    { type: 'phone', raw: '09191112233', entityType: 'freelancer', entityId: 'VP-FR-10284' }
  ];

  for (const item of dupEntries) {
    const valHash = crypto.createHash('sha256').update(item.raw.trim().toUpperCase()).digest('hex');
    let masked = item.raw;
    if (item.type === 'tin') masked = '239-***-***-000';
    if (item.type === 'bank_account') masked = '******2341';
    if (item.type === 'phone') masked = '0918-***-6543';

    executeRun(
      `INSERT OR REPLACE INTO duplicate_check_registry (id, field_type, field_value_hash, masked_value, entity_type, entity_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [`DUP_${item.type}_${valHash.substring(0, 16)}`, item.type, valHash, masked, item.entityType, item.entityId, now]
    );
  }

  // 3. Seed Fraud Risk Profiles
  const riskProfiles = [
    {
      id: 'FRISK_business_BIZ-3001',
      entity_type: 'business',
      entity_id: 'BIZ-3001',
      risk_score: 12,
      risk_level: 'LOW',
      risk_factors: [{ factor: 'VeriPinoy KYB Verified Badge Granted', weight: '-10' }, { factor: 'Active Bank & DTI Clean History', weight: '0' }],
      duplicate_flags: { duplicatesFound: 0 }
    },
    {
      id: 'FRISK_business_BIZ-3008',
      entity_type: 'business',
      entity_id: 'BIZ-3008',
      risk_score: 68,
      risk_level: 'MEDIUM',
      risk_factors: [{ factor: 'Unverified Account Credentials', weight: '+25' }, { factor: 'Missing Mayor\'s Business Permit', weight: '+20' }],
      duplicate_flags: { duplicatesFound: 0 }
    },
    {
      id: 'FRISK_freelancer_VP-FR-10284',
      entity_type: 'freelancer',
      entity_id: 'VP-FR-10284',
      risk_score: 8,
      risk_level: 'LOW',
      risk_factors: [{ factor: 'Verified Senior Freelancer ID', weight: '-10' }, { factor: 'Safe External Link Audit Passed', weight: '0' }],
      duplicate_flags: { duplicatesFound: 0 }
    }
  ];

  for (const rp of riskProfiles) {
    executeRun(
      `INSERT OR REPLACE INTO fraud_risk_profiles (id, entity_type, entity_id, risk_score, risk_level, risk_factors_json, duplicate_flags_json, last_assessed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [rp.id, rp.entity_type, rp.entity_id, rp.risk_score, rp.risk_level, JSON.stringify(rp.risk_factors), JSON.stringify(rp.duplicate_flags), now]
    );
  }

  // 4. Seed Active Sessions
  const sampleSessions = [
    {
      id: 'SES-INIT-01',
      tokenHash: crypto.createHash('sha256').update('DEMO_SESSION_SUPERADMIN').digest('hex'),
      userId: 'ADM-SUPER-1',
      userType: 'admin',
      email: 'admin@veripinoy.ph',
      ip: '122.54.108.45',
      agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      device: 'Apple Mac Desktop (Chrome 128)',
      location: 'Makati City, Metro Manila',
      expires: new Date(Date.now() + 24 * 3600 * 1000).toISOString()
    },
    {
      id: 'SES-INIT-02',
      tokenHash: crypto.createHash('sha256').update('DEMO_SESSION_BUSINESS').digest('hex'),
      userId: 'USR-BIZ-2001',
      userType: 'business',
      email: 'owner@manilabakery.ph',
      ip: '112.198.110.12',
      agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
      device: 'Windows PC (Chrome 127)',
      location: 'Quezon City, Metro Manila',
      expires: new Date(Date.now() + 24 * 3600 * 1000).toISOString()
    }
  ];

  for (const s of sampleSessions) {
    executeRun(
      `INSERT OR REPLACE INTO active_sessions (id, session_token_hash, user_id, user_type, email, ip_address, user_agent, device_name, location, is_revoked, expires_at, created_at, last_active_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
      [s.id, s.tokenHash, s.userId, s.userType, s.email, s.ip, s.agent, s.device, s.location, s.expires, now, now]
    );
  }

  // 5. Seed Security Alerts
  const secAlerts = [
    {
      id: 'SEC-ALT-01',
      userId: 'ADM-SUPER-1',
      userType: 'admin',
      alertType: 'NEW_DEVICE_LOGIN',
      severity: 'info',
      title: 'New Admin Session Established',
      message: 'Logged in from Apple Mac Desktop (IP: 122.54.108.45 - Makati City). TLS 1.3 encrypted.',
      meta: { ip: '122.54.108.45', device: 'Apple Mac Desktop' }
    },
    {
      id: 'SEC-ALT-02',
      userId: 'USR-BIZ-2001',
      userType: 'business',
      alertType: 'DPA_COMPLIANCE_STATUS',
      severity: 'info',
      title: 'DPA 2012 Data Privacy Vault Active',
      message: 'All KYB documents (BIR 2303, Mayor\'s Permit) are encrypted with AES-256-GCM and stored in the restricted vault.',
      meta: { dpaStatus: 'Compliant' }
    }
  ];

  for (const sa of secAlerts) {
    executeRun(
      `INSERT OR REPLACE INTO security_alerts (id, user_id, user_type, alert_type, severity, title, message, metadata_json, is_read, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
      [sa.id, sa.userId, sa.userType, sa.alertType, sa.severity, sa.title, sa.message, JSON.stringify(sa.meta), now]
    );
  }

  // 6. Seed MFA Settings
  executeRun(
    `INSERT OR REPLACE INTO user_mfa_settings (id, user_id, user_type, mfa_enabled, mfa_type, secret, backup_codes_json, is_enforced, updated_at)
     VALUES ('MFA-ADM-1', 'ADM-SUPER-1', 'admin', 1, 'totp', 'JBSWY3DPEHPK3PXP', ?, 1, ?)`,
    [JSON.stringify(['8A2F-9C1E', '3D4B-7F0A', '5E6C-1B2A', '9F0E-4C3D']), now]
  );
}

/* Seed Real-Time AI Review Moderation Cases and Audit Trail */
export function seedReviewModerationData(now = new Date().toISOString()) {
  const seedReviews = [
    {
      id: 'REV-101',
      customer_id: 'CUST-101',
      customer_name: 'Maria Santos',
      business_id: '3',
      business_name: 'Bahay Kubo Restaurant',
      rating: 5,
      review_title: 'Exceptional Authentic Sinigang',
      review_content: 'Best Sinigang na Baboy in Quezon City! The broth was perfectly sour using fresh sampalok, kangkong was crisp, and pork belly was melt-in-your-mouth tender. Service was attentive.',
      review_status: 'published',
      flagged_status: 0,
      flag_reason: null,
      flagged_by_business: 0,
      flagged_date: null,
      official_response: 'Maraming salamat po Maria! We prepare our Sinigang broth fresh every morning.',
      authenticity_score: 96,
      classification: 'GENUINE',
      flag_reason_tags: JSON.stringify(['Verified Buyer', 'Specific Order Details', 'Natural Phrasing']),
      recommended_action: 'APPROVE',
      ai_analysis_details: JSON.stringify({ summary: 'High authenticity. Specific dish nuances, balanced feedback and natural Filipino culinary phrasing.', score: 96 }),
      photo_url: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop',
      account_age_days: 180,
      submission_velocity_seconds: 94,
      user_total_reviews: 6
    },
    {
      id: 'REV-102',
      customer_id: 'CUST-102',
      customer_name: 'Juan Dela Cruz',
      business_id: '3',
      business_name: 'Bahay Kubo Restaurant',
      rating: 4,
      review_title: 'Great Food, Slight Peak Hour Wait',
      review_content: 'Food quality is top-notch. Kare-Kare sauce was rich and authentic. Parking during Sunday lunch was a bit tight, but staff assisted promptly with valet.',
      review_status: 'published',
      flagged_status: 0,
      flag_reason: null,
      flagged_by_business: 0,
      flagged_date: null,
      official_response: 'Salamat Juan! We are expanding our weekend valet and parking slots next month.',
      authenticity_score: 92,
      classification: 'GENUINE',
      flag_reason_tags: JSON.stringify(['Verified Buyer', 'Balanced Sentiment', 'Natural Phrasing']),
      recommended_action: 'APPROVE',
      ai_analysis_details: JSON.stringify({ summary: 'Organic review with nuanced positive and constructive operational feedback.', score: 92 }),
      photo_url: null,
      account_age_days: 90,
      submission_velocity_seconds: 82,
      user_total_reviews: 4
    },
    {
      id: 'REV-103',
      customer_id: 'CUST-103',
      customer_name: 'Ana Ramos',
      business_id: '3',
      business_name: 'Bahay Kubo Restaurant',
      rating: 5,
      review_title: 'Fast Delivery & Secure Eco-Packaging',
      review_content: 'Ordered catering for a corporate team lunch in Eastwood. Arrived hot, on time, and completely spill-free in eco-friendly banana leaf wraps.',
      review_status: 'published',
      flagged_status: 0,
      flag_reason: null,
      flagged_by_business: 0,
      flagged_date: null,
      official_response: null,
      authenticity_score: 94,
      classification: 'GENUINE',
      flag_reason_tags: JSON.stringify(['Verified Buyer', 'Natural Phrasing', 'Specific Order Details']),
      recommended_action: 'APPROVE',
      ai_analysis_details: JSON.stringify({ summary: 'Authentic catering review with realistic logistics and packaging context.', score: 94 }),
      photo_url: null,
      account_age_days: 60,
      submission_velocity_seconds: 68,
      user_total_reviews: 3
    },
    {
      id: 'REV-104',
      customer_id: 'CUST-104',
      customer_name: 'Carlos Mendoza',
      business_id: '3',
      business_name: 'Bahay Kubo Restaurant',
      rating: 2,
      review_title: 'Mixup on Custom Order Allergen Spec',
      review_content: 'Requested garlic-free seasoning due to dietary constraints, but food arrived with fried garlic chips on top. Manager replaced the bowl within 10 minutes.',
      review_status: 'published',
      flagged_status: 0,
      flag_reason: null,
      flagged_by_business: 0,
      flagged_date: null,
      official_response: null,
      authenticity_score: 88,
      classification: 'GENUINE',
      flag_reason_tags: JSON.stringify(['Specific Incident Details', 'Natural Phrasing', 'Constructive Tone']),
      recommended_action: 'APPROVE',
      ai_analysis_details: JSON.stringify({ summary: 'Authentic incident description with constructive customer demeanor.', score: 88 }),
      photo_url: null,
      account_age_days: 120,
      submission_velocity_seconds: 110,
      user_total_reviews: 5
    },
    {
      id: 'REV-105',
      customer_id: 'CUST-105',
      customer_name: 'Competitor Bot',
      business_id: '3',
      business_name: 'Bahay Kubo Restaurant',
      rating: 1,
      review_title: 'Suspicious Review from Competitor',
      review_content: 'Worst food ever. Go to XYZ Diner instead, they have cheaper food and better deals. Boycott this restaurant immediately!',
      review_status: 'flagged',
      flagged_status: 1,
      flag_reason: 'Conflict of interest / Review appears fraudulent & promotional',
      flagged_by_business: 1,
      flagged_date: '2026-08-11T10:00:00Z',
      official_response: null,
      authenticity_score: 18,
      classification: 'LIKELY_FAKE',
      flag_reason_tags: JSON.stringify(['Competitor Promotion / Smear', 'Extreme Sentiment Polarity', 'New Account (Created Today)', 'Bot Velocity (1.4s typing)']),
      recommended_action: 'DELETE',
      ai_analysis_details: JSON.stringify({ summary: 'Explicit commercial smear referencing competitor business. Automated payload injection velocity.', score: 18 }),
      photo_url: null,
      account_age_days: 0,
      submission_velocity_seconds: 1.4,
      user_total_reviews: 1
    },
    {
      id: 'REV-301',
      customer_id: 'CUST-303',
      customer_name: 'Anonymous Guest',
      business_id: '2',
      business_name: 'Sari-Sari Mart',
      rating: 1,
      review_title: 'Disputed Price Charge',
      review_content: 'Alleged double billing on basic rice staple items without itemized POS receipt at Cubao branch.',
      review_status: 'under_review',
      flagged_status: 1,
      flag_reason: 'Merchant claims review is fake and no such purchase was made at Cubao branch.',
      flagged_by_business: 1,
      flagged_date: '2026-08-10T13:00:00Z',
      official_response: null,
      authenticity_score: 58,
      classification: 'SUSPICIOUS',
      flag_reason_tags: JSON.stringify(['Generic Phrasing (No Specific Detail)', 'Unverified Purchase', 'Extreme Polarity']),
      recommended_action: 'FLAG',
      ai_analysis_details: JSON.stringify({ summary: 'Disputed transaction lacking itemized receipt details. Requires manual claim verification.', score: 58 }),
      photo_url: null,
      account_age_days: 4,
      submission_velocity_seconds: 18,
      user_total_reviews: 1
    },
    {
      id: 'REV-401',
      customer_id: 'CUST-901',
      customer_name: 'CyberSpam-Bot99',
      business_id: '3',
      business_name: 'Bahay Kubo Restaurant',
      rating: 5,
      review_title: 'Delve into Unparalleled Gastronomy',
      review_content: 'Delve into this unparalleled gastronomic symphony of culinary excellence! Furthermore, the ambiance seamlessly integrates with a breathtaking tapestry of bespoke flavors. In conclusion, it is a testament to perfection par excellence.',
      review_status: 'under_review',
      flagged_status: 1,
      flag_reason: 'AI-generated synthetic review pattern detected',
      flagged_by_business: 0,
      flagged_date: '2026-08-20T04:15:00Z',
      official_response: null,
      authenticity_score: 12,
      classification: 'LIKELY_FAKE',
      flag_reason_tags: JSON.stringify(['AI Phrasing Detected', 'Bot Velocity (0.6s typing)', 'Extreme Sentiment Polarity', 'Stock Photo Mismatch']),
      recommended_action: 'DELETE',
      ai_analysis_details: JSON.stringify({ summary: 'High density of synthetic LLM phrases ("delve", "testament to", "par excellence", "tapestry of flavors"). Generic stock photo attached.', score: 12 }),
      photo_url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&auto=format&fit=crop',
      account_age_days: 0,
      submission_velocity_seconds: 0.6,
      user_total_reviews: 1
    },
    {
      id: 'REV-402',
      customer_id: 'CUST-902',
      customer_name: 'FastPoster22',
      business_id: '2',
      business_name: 'Sari-Sari Mart',
      rating: 5,
      review_title: 'Great items fast store',
      review_content: 'Great items fast store very good. Great items fast store very good. Great items fast store very good. Buy more now.',
      review_status: 'under_review',
      flagged_status: 1,
      flag_reason: 'Repetitive keyword stuffing loop',
      flagged_by_business: 0,
      flagged_date: '2026-08-21T09:00:00Z',
      official_response: null,
      authenticity_score: 24,
      classification: 'LIKELY_FAKE',
      flag_reason_tags: JSON.stringify(['Keyword Stuffing / Repetition', 'Spike Posting / Burst Activity', 'Bot Velocity (2.1s typing)']),
      recommended_action: 'DELETE',
      ai_analysis_details: JSON.stringify({ summary: 'Looping repeated tokens and burst script payload pattern.', score: 24 }),
      photo_url: null,
      account_age_days: 1,
      submission_velocity_seconds: 2.1,
      user_total_reviews: 8
    },
    {
      id: 'REV-403',
      customer_id: 'CUST-903',
      customer_name: 'Lani Mercado',
      business_id: '3',
      business_name: 'Bahay Kubo Restaurant',
      rating: 5,
      review_title: 'Crispy Pata was perfectly cooked!',
      review_content: 'Ordered the Crispy Pata for our family Sunday lunch. Skin was super crispy and meat was tender, dipping sauce had the right calamansi kick. Arrived in 35 mins via food delivery.',
      review_status: 'published',
      flagged_status: 0,
      flag_reason: null,
      flagged_by_business: 0,
      flagged_date: null,
      official_response: null,
      authenticity_score: 97,
      classification: 'GENUINE',
      flag_reason_tags: JSON.stringify(['Verified Buyer', 'Specific Order Details', 'Natural Local Dialect', 'Authentic Review']),
      recommended_action: 'APPROVE',
      ai_analysis_details: JSON.stringify({ summary: 'High authenticity. Contextual local references and realistic delivery timing.', score: 97 }),
      photo_url: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop',
      account_age_days: 240,
      submission_velocity_seconds: 105,
      user_total_reviews: 12
    },
    {
      id: 'REV-404',
      customer_id: 'CUST-904',
      customer_name: 'SyndiReview_Net',
      business_id: '2',
      business_name: 'Sari-Sari Mart',
      rating: 1,
      review_title: 'Totally broken and terrible',
      review_content: 'I bought everything here and it was completely broken and ruined my entire life! Go to SuperDealMart online shop instead www.fakeurl.xyz',
      review_status: 'flagged',
      flagged_status: 1,
      flag_reason: 'Third party spam URL and competitor referral',
      flagged_by_business: 1,
      flagged_date: '2026-08-22T11:20:00Z',
      official_response: null,
      authenticity_score: 15,
      classification: 'LIKELY_FAKE',
      flag_reason_tags: JSON.stringify(['Competitor Promotion / Smear', 'Extreme Sentiment Polarity', 'Spike Posting / Burst Activity']),
      recommended_action: 'DELETE',
      ai_analysis_details: JSON.stringify({ summary: 'External link insertion, severe hyperbole, competitor promotion.', score: 15 }),
      photo_url: null,
      account_age_days: 0,
      submission_velocity_seconds: 1.8,
      user_total_reviews: 1
    },
    {
      id: 'REV-405',
      customer_id: 'CUST-905',
      customer_name: 'Mateo Valdez',
      business_id: '2',
      business_name: 'Sari-Sari Mart',
      rating: 3,
      review_title: 'Affordable supplies, delayed delivery',
      review_content: 'Affordable office supplies and bulk paper. Delivery was delayed by 1 day due to heavy rains, but rider called in advance to notify.',
      review_status: 'under_review',
      flagged_status: 0,
      flag_reason: null,
      flagged_by_business: 0,
      flagged_date: null,
      official_response: null,
      authenticity_score: 74,
      classification: 'SUSPICIOUS',
      flag_reason_tags: JSON.stringify(['Generic Phrasing (No Specific Detail)', 'Fresh Account (< 3 days)']),
      recommended_action: 'FLAG',
      ai_analysis_details: JSON.stringify({ summary: 'Moderate authenticity. Short account history but realistic situation.', score: 74 }),
      photo_url: null,
      account_age_days: 2,
      submission_velocity_seconds: 45,
      user_total_reviews: 1
    }
  ];

  for (const r of seedReviews) {
    executeRun(
      `INSERT OR REPLACE INTO customer_reviews (
        id, customer_id, customer_name, business_id, business_name, rating,
        review_title, review_content, review_status, flagged_status, flag_reason,
        flagged_by_business, flagged_date, official_response, authenticity_score,
        classification, flag_reason_tags, recommended_action, ai_analysis_details,
        photo_url, account_age_days, submission_velocity_seconds, user_total_reviews,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        r.id, r.customer_id, r.customer_name, r.business_id, r.business_name, r.rating,
        r.review_title, r.review_content, r.review_status, r.flagged_status, r.flag_reason,
        r.flagged_by_business, r.flagged_date, r.official_response, r.authenticity_score,
        r.classification, r.flag_reason_tags, r.recommended_action, r.ai_analysis_details,
        r.photo_url, r.account_age_days, r.submission_velocity_seconds, r.user_total_reviews,
        now, now
      ]
    );

    // Initial audit log for AI classification
    executeRun(
      `INSERT OR IGNORE INTO review_audit_log (
        id, review_id, action, user_id, moderator_name, ai_assistant_used,
        notes, previous_status, new_status, authenticity_score, classification,
        metadata, created_at
      ) VALUES (?, ?, 'AI_CLASSIFY', 'SYSTEM_AI', 'VeriPinoy AI Engine (Gemini 3.7)', 'N', ?, NULL, ?, ?, ?, ?, ?)`,
      [
        `AUD-${r.id}-INIT`,
        r.id,
        `Automated authenticity audit completed with score ${r.authenticity_score}% (${r.classification}). Recommended action: ${r.recommended_action}.`,
        r.review_status,
        r.authenticity_score,
        r.classification,
        r.ai_analysis_details,
        now
      ]
    );
  }

  /* ==========================================================================
     SEED INITIAL NOTES
     ========================================================================== */
  const seedNotes = [
    {
      id: 'NOTE-101',
      user_id: 'VP-FR-10284',
      title: 'Freelance Escrow SOP & Milestone Acceptance Protocol',
      content: 'Standard operating procedure for escrow-backed milestones: 1. Confirm contract escrow partner (Escrow.com vs Partner Bank BaaS). 2. Ensure buyer completes deposit before work starts. 3. Log all deliverable links & test benchmarks into the Work Log module. 4. Release request initiates 72-hr client inspection window. In case of disagreement, arbitration is routed to VeriPinoy dispute reviewers.',
      category: 'Work',
      tags: JSON.stringify(['Escrow', 'SOP', 'Legal', 'Milestones']),
      is_pinned: 1,
      photo_url: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=600&q=80',
      color: '#FEF3C7'
    },
    {
      id: 'NOTE-102',
      user_id: 'VP-FR-10284',
      title: 'Client Identity & KYB Due Diligence Checklist',
      content: 'Required documents before initiating high-value PHP 50,000+ contracts: \n• Valid SEC/DTI registration certificate\n• BIR Certificate of Registration (Form 2303)\n• Authorized Signatory Government ID (Passport / UMID / Driver\'s License)\n• Verified Philippine Corporate Bank Account for Direct Bank BaaS escrow settlement.',
      category: 'Compliance',
      tags: JSON.stringify(['KYB', 'Verification', 'BIR', 'Compliance']),
      is_pinned: 1,
      photo_url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80',
      color: '#ECFDF5'
    },
    {
      id: 'NOTE-103',
      user_id: 'VP-FR-10284',
      title: 'Direct Bank Partner API (BaaS) Architecture & SLA',
      content: 'Overview of the VeriPinoy Direct Bank API partnership:\n- Settlement Rails: Real-time PesoNet & InstaPay via Partner Bank Custody Account\n- Webhook endpoint: /api/webhooks/bank-partner\n- Signature Validation: HMAC-SHA256 with rotating bank security certificates\n- Daily Cutoff: 4:00 PM PHT for batch PesoNet clearing; instant for InstaPay transfers under PHP 50,000.',
      category: 'Projects',
      tags: JSON.stringify(['API', 'Banking', 'BaaS', 'Webhooks']),
      is_pinned: 0,
      photo_url: null,
      color: '#EFF6FF'
    },
    {
      id: 'NOTE-104',
      user_id: 'VP-FR-10284',
      title: 'Escrow.com REST API Integration Reference',
      content: 'Standard integration notes for global clients using Escrow.com:\n• Sandbox Base URL: https://api.escrow-sandbox.com/2017-09-01/\n• Auth Header: Authorization: Basic [API_KEY]\n• Webhook Events: transaction_created, payment_approved, goods_sent, inspection_accepted, payment_disbursed\n• Fee split configured as 50/50 buyer/seller default unless milestone specifies otherwise.',
      category: 'Projects',
      tags: JSON.stringify(['Escrow.com', 'API', 'Security', 'Fintech']),
      is_pinned: 0,
      photo_url: null,
      color: '#F5F3FF'
    },
    {
      id: 'NOTE-105',
      user_id: 'VP-FR-10284',
      title: 'Philippine Freelance Tax & BIR Form 2307 Withholding',
      content: 'Key tax guidelines for verified freelance consultants:\n- Corporate clients withhold 2% (Expanded Withholding Tax - EWT) or 8% flat income tax option\n- Form 2307 must be requested from clients quarterly for tax credit filing\n- All invoices generated via VeriPinoy automatically compute optional 2% EWT and 12% VAT breakdowns for BIR compliance.',
      category: 'Personal',
      tags: JSON.stringify(['Tax', 'BIR2307', 'Accounting', 'EWT']),
      is_pinned: 0,
      photo_url: null,
      color: '#FFFBEB'
    },
    {
      id: 'NOTE-106',
      user_id: 'VP-FR-10284',
      title: 'Nexus Fintech App Architecture & Sprint Milestones',
      content: 'Tech stack: TypeScript, React, Tailwind CSS, SQLite, and Gemini 3.7 AI services.\nSprint 1: UI components & biometric auth flows (Completed & Paid via Escrow.com)\nSprint 2: Encrypted API endpoints & test harness (Under Review - Partner Bank Escrow)\nSprint 3: Cloud Run deployment, CI/CD pipeline & DPA audit logs (In Progress - Fund Locked).',
      category: 'Projects',
      tags: JSON.stringify(['Sprint', 'Nexus', 'Architecture', 'TypeScript']),
      is_pinned: 0,
      photo_url: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=600&q=80',
      color: '#FDF2F8'
    }
  ];

  for (const n of seedNotes) {
    executeRun(
      `INSERT OR REPLACE INTO notes (id, user_id, title, content, category, tags, is_pinned, photo_url, color, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [n.id, n.user_id, n.title, n.content, n.category, n.tags, n.is_pinned, n.photo_url, n.color, now, now]
    );
  }

  /* ==========================================================================
     SEED INITIAL ESCROW PARTNER AUDIT LOGS & MILESTONE ESCROW STATUS
     ========================================================================== */
  // Update milestones with dual-provider details
  executeRun(`
    UPDATE freelancer_milestones 
    SET escrow_provider = 'ESCROW_COM', escrow_status = 'RELEASED_TO_FREELANCER', escrow_transaction_id = 'ESC-TXN-9021-A', escrow_deposit_amount = 30000, escrow_funded_at = '2026-08-01 09:00:00', escrow_released_at = '2026-08-12 11:30:00'
    WHERE id = 'MLS-902-1'
  `);

  executeRun(`
    UPDATE freelancer_milestones 
    SET escrow_provider = 'PARTNER_BANK', escrow_status = 'PENDING_RELEASE', escrow_transaction_id = 'BAAS-UBP-88392', escrow_deposit_amount = 35000, escrow_funded_at = '2026-08-15 14:20:00'
    WHERE id = 'MLS-902-2'
  `);

  executeRun(`
    UPDATE freelancer_milestones 
    SET escrow_provider = 'PARTNER_BANK', escrow_status = 'FUNDED_IN_ESCROW', escrow_transaction_id = 'BAAS-UBP-88393', escrow_deposit_amount = 20000, escrow_funded_at = '2026-08-18 10:00:00'
    WHERE id = 'MLS-902-3'
  `);

  executeRun(`
    UPDATE freelancer_milestones 
    SET escrow_provider = 'ESCROW_COM', escrow_status = 'RELEASED_TO_FREELANCER', escrow_transaction_id = 'ESC-TXN-9011-A', escrow_deposit_amount = 25000, escrow_funded_at = '2026-07-01 08:00:00', escrow_released_at = '2026-07-15 17:00:00'
    WHERE id = 'MLS-901-1'
  `);

  executeRun(`
    UPDATE freelancer_milestones 
    SET escrow_provider = 'ESCROW_COM', escrow_status = 'DISPUTED', escrow_transaction_id = 'ESC-TXN-9011-B', escrow_deposit_amount = 25000, escrow_funded_at = '2026-07-16 11:00:00'
    WHERE id = 'MLS-901-2'
  `);

  const seedEscrowLogs = [
    {
      id: 'EPL-1001',
      provider: 'ESCROW_COM',
      action: 'CREATE_TRANSACTION',
      transaction_id: 'ESC-TXN-9021-A',
      engagement_id: 'ENG-902',
      milestone_id: 'MLS-902-1',
      partner_ref: 'ESC-REF-77281',
      amount: 30000,
      currency: 'PHP',
      request_payload: JSON.stringify({ currency: 'php', items: [{ title: 'UI Component Design System', schedule: [{ amount: 30000 }] }] }),
      response_payload: JSON.stringify({ id: 'ESC-TXN-9021-A', status: 'created', inspection_period: 259200 }),
      status: 'SUCCESS'
    },
    {
      id: 'EPL-1002',
      provider: 'ESCROW_COM',
      action: 'DEPOSIT_FUNDS',
      transaction_id: 'ESC-TXN-9021-A',
      engagement_id: 'ENG-902',
      milestone_id: 'MLS-902-1',
      partner_ref: 'ESC-PAY-99302',
      amount: 30000,
      currency: 'PHP',
      request_payload: JSON.stringify({ action: 'wire_deposit', amount: 30000 }),
      response_payload: JSON.stringify({ status: 'secured_in_escrow', verified: true }),
      status: 'SUCCESS'
    },
    {
      id: 'EPL-1003',
      provider: 'ESCROW_COM',
      action: 'RELEASE_FUNDS',
      transaction_id: 'ESC-TXN-9021-A',
      engagement_id: 'ENG-902',
      milestone_id: 'MLS-902-1',
      partner_ref: 'ESC-DISB-44102',
      amount: 30000,
      currency: 'PHP',
      request_payload: JSON.stringify({ action: 'accept_deliverable_and_disburse', reviewer: 'Nexus Fintech Corp' }),
      response_payload: JSON.stringify({ status: 'disbursed_to_seller', transaction_complete: true }),
      status: 'SUCCESS'
    },
    {
      id: 'EPL-1004',
      provider: 'PARTNER_BANK',
      action: 'CREATE_TRANSACTION',
      transaction_id: 'BAAS-UBP-88392',
      engagement_id: 'ENG-902',
      milestone_id: 'MLS-902-2',
      partner_ref: 'BDO-ESCROW-2026-9921',
      amount: 35000,
      currency: 'PHP',
      request_payload: JSON.stringify({ custody_account: 'UBP-TRUST-7721-002', amount: 35000, beneficiary: 'Marco Reyes' }),
      response_payload: JSON.stringify({ reference: 'BAAS-UBP-88392', state: 'PENDING_DEPOSIT' }),
      status: 'SUCCESS'
    },
    {
      id: 'EPL-1005',
      provider: 'PARTNER_BANK',
      action: 'DEPOSIT_FUNDS',
      transaction_id: 'BAAS-UBP-88392',
      engagement_id: 'ENG-902',
      milestone_id: 'MLS-902-2',
      partner_ref: 'BDO-DEP-66381',
      amount: 35000,
      currency: 'PHP',
      request_payload: JSON.stringify({ channel: 'InstaPay', amount: 35000 }),
      response_payload: JSON.stringify({ status: 'FUNDED_IN_ESCROW', custody_vault: 'BSP-ACCREDITED-TRUST' }),
      status: 'SUCCESS'
    },
    {
      id: 'EPL-1006',
      provider: 'PARTNER_BANK',
      action: 'REQUEST_RELEASE',
      transaction_id: 'BAAS-UBP-88392',
      engagement_id: 'ENG-902',
      milestone_id: 'MLS-902-2',
      partner_ref: 'BDO-REL-REQ-102',
      amount: 35000,
      currency: 'PHP',
      request_payload: JSON.stringify({ deliverable_logged: true, inspection_days: 3 }),
      response_payload: JSON.stringify({ state: 'PENDING_RELEASE', inspection_deadline: '2026-08-27T14:20:00Z' }),
      status: 'SUCCESS'
    }
  ];

  for (const l of seedEscrowLogs) {
    executeRun(
      `INSERT OR REPLACE INTO escrow_partner_logs (id, provider, action, transaction_id, engagement_id, milestone_id, partner_ref, amount, currency, request_payload, response_payload, status, ip_address, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '127.0.0.1', ?)`,
      [l.id, l.provider, l.action, l.transaction_id, l.engagement_id, l.milestone_id, l.partner_ref, l.amount, l.currency, l.request_payload, l.response_payload, l.status, now]
    );
  }
}

export function seedSupportData(now = new Date().toISOString()) {
  const countCheck = queryOne('SELECT COUNT(*) as count FROM support_tickets');
  if (countCheck && countCheck.count > 0) return;

  const tickets = [
    {
      id: 'TKT-2026-101',
      ticket_number: 'VP-SUP-8801',
      user_id: 'maria.santos@gmail.com',
      user_name: 'Maria Santos',
      user_email: 'maria.santos@gmail.com',
      user_type: 'customer',
      category: 'escrow',
      priority: 'high',
      subject: 'Escrow Fund Protection & Milestone Release Timing on UX Contract',
      status: 'in_progress',
      assigned_staff_id: 'STF-105',
      assigned_staff_name: 'Ben Torres',
      last_message: 'Funds deposited via GCash are secured under BSP Circular 942 BaaS trust custody.',
      created_at: new Date(Date.now() - 3600 * 1000 * 4).toISOString(),
      updated_at: new Date(Date.now() - 3600 * 1000 * 1).toISOString(),
      messages: [
        {
          id: 'MSG-101-1',
          sender_type: 'user',
          sender_id: 'maria.santos@gmail.com',
          sender_name: 'Maria Santos',
          message: 'Hello Support, I have funded Milestone 2 for our freelance mobile design project. How do I verify that the funds are held securely in neutral escrow before the designer starts?',
          created_at: new Date(Date.now() - 3600 * 1000 * 4).toISOString()
        },
        {
          id: 'MSG-101-2',
          sender_type: 'staff',
          sender_id: 'STF-105',
          sender_name: 'Ben Torres (Support Staff)',
          message: 'Hi Maria! Your payment of ₱35,000 has been confirmed and placed into BSP-compliant escrow custody with UnionBank BaaS Trust (Ref: BAAS-UBP-88392). The funds will only be released once you approve the milestone deliverable or the 7-day inspection window completes.',
          created_at: new Date(Date.now() - 3600 * 1000 * 3).toISOString()
        }
      ]
    },
    {
      id: 'TKT-2026-102',
      ticket_number: 'VP-SUP-8802',
      user_id: 'owner@bahaykubo.ph',
      user_name: 'Roberto Mendoza',
      user_email: 'owner@bahaykubo.ph',
      user_type: 'merchant',
      category: 'kyb',
      priority: 'urgent',
      subject: 'Expedited KYB VeriPinoy Verification for New Makati Branch',
      status: 'open',
      assigned_staff_id: 'STF-105',
      assigned_staff_name: 'Ben Torres',
      last_message: 'Attached 2026 Mayor’s Permit and updated BIR 2303 registration certificate.',
      created_at: new Date(Date.now() - 3600 * 1000 * 6).toISOString(),
      updated_at: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
      messages: [
        {
          id: 'MSG-102-1',
          sender_type: 'user',
          sender_id: 'owner@bahaykubo.ph',
          sender_name: 'Roberto Mendoza (Bahay Kubo)',
          message: 'Magandang araw! We have opened a new location in Makati and uploaded our 2026 Mayor’s Permit and DTI filings. Could the compliance team please review and update our VeriPinoy Verified badge?',
          created_at: new Date(Date.now() - 3600 * 1000 * 6).toISOString()
        }
      ]
    },
    {
      id: 'TKT-2026-103',
      ticket_number: 'VP-SUP-8803',
      user_id: 'VP-FR-10284',
      user_name: 'Marco Reyes',
      user_email: 'marco.reyes@devpinoy.com',
      user_type: 'freelancer',
      category: 'escrow',
      priority: 'medium',
      subject: 'Milestone 2 Deliverable Uploaded - Inspection Countdown Verification',
      status: 'awaiting_user',
      assigned_staff_id: 'STF-105',
      assigned_staff_name: 'Ben Torres',
      last_message: 'Inspection window active: 3 days remaining before automatic fund release.',
      created_at: new Date(Date.now() - 3600 * 1000 * 12).toISOString(),
      updated_at: new Date(Date.now() - 3600 * 1000 * 5).toISOString(),
      messages: [
        {
          id: 'MSG-103-1',
          sender_type: 'user',
          sender_id: 'VP-FR-10284',
          sender_name: 'Marco Reyes',
          message: 'Good day! I submitted the backend API deliverables for Milestone 2 on ENG-902. Can you confirm if the client notification was dispatched?',
          created_at: new Date(Date.now() - 3600 * 1000 * 12).toISOString()
        },
        {
          id: 'MSG-103-2',
          sender_type: 'staff',
          sender_id: 'STF-105',
          sender_name: 'Ben Torres',
          message: 'Hi Marco, the delivery notification and code repository audit log have been sent to Nexus Fintech Corp. Their 3-day inspection window expires on August 28, after which escrow will disburse automatically if no revisions are flagged.',
          created_at: new Date(Date.now() - 3600 * 1000 * 5).toISOString()
        }
      ]
    },
    {
      id: 'TKT-2026-104',
      ticket_number: 'VP-SUP-8804',
      user_id: 'juan.delacruz@gmail.com',
      user_name: 'Juan Dela Cruz',
      user_email: 'juan.delacruz@gmail.com',
      user_type: 'customer',
      category: 'review',
      priority: 'low',
      subject: 'Question on VeriPinoy Authenticity Score Algorithm',
      status: 'resolved',
      assigned_staff_id: 'STF-101',
      assigned_staff_name: 'Maria Santos',
      last_message: 'Explained multi-factor proof-of-purchase weighting and Gemini 3.7 moderation rules.',
      created_at: new Date(Date.now() - 3600 * 1000 * 24).toISOString(),
      updated_at: new Date(Date.now() - 3600 * 1000 * 18).toISOString(),
      messages: [
        {
          id: 'MSG-104-1',
          sender_type: 'user',
          sender_id: 'juan.delacruz@gmail.com',
          sender_name: 'Juan Dela Cruz',
          message: 'Hi! Why did my verified reviewer badge give a 95% authenticity score on my dining review?',
          created_at: new Date(Date.now() - 3600 * 1000 * 24).toISOString()
        },
        {
          id: 'MSG-104-2',
          sender_type: 'staff',
          sender_id: 'STF-101',
          sender_name: 'Maria Santos (Compliance Officer)',
          message: 'Hi Juan! Reviews uploaded with receipt images and authenticated user IDs earn top weighted scores in the VeriPinoy trust index. Thank you for contributing to fair reviews!',
          created_at: new Date(Date.now() - 3600 * 1000 * 18).toISOString()
        }
      ]
    }
  ];

  for (const t of tickets) {
    executeRun(
      `INSERT OR REPLACE INTO support_tickets (id, ticket_number, user_id, user_name, user_email, user_type, category, priority, subject, status, assigned_staff_id, assigned_staff_name, last_message, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [t.id, t.ticket_number, t.user_id, t.user_name, t.user_email, t.user_type, t.category, t.priority, t.subject, t.status, t.assigned_staff_id, t.assigned_staff_name, t.last_message, t.created_at, t.updated_at]
    );

    if (t.messages && t.messages.length > 0) {
      for (const m of t.messages) {
        executeRun(
          `INSERT OR REPLACE INTO support_ticket_messages (id, ticket_id, sender_type, sender_id, sender_name, message, attachments, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [m.id, t.id, m.sender_type, m.sender_id, m.sender_name, m.message, null, m.created_at]
        );
      }
    }
  }
}

export function seedUniversalChatData(now = new Date().toISOString()) {
  const countCheck = queryOne('SELECT COUNT(*) as count FROM chat_conversations');
  if (countCheck && countCheck.count > 0) return;

  console.log('Seeding initial Universal Chat & E2EE conversations...');

  // Seed sample E2EE public keys for Marco Reyes, Maria Clara, Juan Dela Cruz, and Support
  const sampleKeys = [
    {
      id: 'KEY-USR-CUST-1001',
      user_id: 'USR-CUST-1001',
      user_email: 'customer@veripinoy.ph',
      public_key: JSON.stringify({
        kty: 'RSA',
        n: 's1q7R...ClientPublicModulus2026',
        e: 'AQAB',
        alg: 'RSA-OAEP-256',
        ext: true,
        key_ops: ['wrapKey', 'encrypt']
      }),
      ecdh_public_key: JSON.stringify({ kty: 'EC', crv: 'P-256', x: '4f9b_ClientEcdhX', y: '82c1_ClientEcdhY' }),
      key_fingerprint: 'SHA256:7B:3F:A9:41:88:C2:5E:10:99:A1:34:B7:6E:DF:02:11'
    },
    {
      id: 'KEY-USER-FR-10284',
      user_id: 'USER-FR-10284',
      user_email: 'freelancer@marcoreyes.dev',
      public_key: JSON.stringify({
        kty: 'RSA',
        n: 'v9k2M...FreelancerMarcoPublicModulus2026',
        e: 'AQAB',
        alg: 'RSA-OAEP-256',
        ext: true,
        key_ops: ['wrapKey', 'encrypt']
      }),
      ecdh_public_key: JSON.stringify({ kty: 'EC', crv: 'P-256', x: '1a2b_MarcoEcdhX', y: '3c4d_MarcoEcdhY' }),
      key_fingerprint: 'SHA256:F2:89:1B:77:33:AA:DC:44:09:88:12:FE:51:90:3A:C4'
    },
    {
      id: 'KEY-USR-BIZ-2001',
      user_id: 'USR-BIZ-2001',
      user_email: 'owner@manilabakery.ph',
      public_key: JSON.stringify({
        kty: 'RSA',
        n: 'b7c3X...BizJuanPublicModulus2026',
        e: 'AQAB',
        alg: 'RSA-OAEP-256',
        ext: true,
        key_ops: ['wrapKey', 'encrypt']
      }),
      ecdh_public_key: JSON.stringify({ kty: 'EC', crv: 'P-256', x: '7x8y_JuanEcdhX', y: '9z0w_JuanEcdhY' }),
      key_fingerprint: 'SHA256:33:91:DE:AA:55:01:8C:72:49:BF:22:90:7E:11:88:FF'
    }
  ];

  for (const k of sampleKeys) {
    executeRun(
      `INSERT OR REPLACE INTO user_e2ee_keys (id, user_id, user_email, public_key, ecdh_public_key, key_fingerprint, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [k.id, k.user_id, k.user_email, k.public_key, k.ecdh_public_key, k.key_fingerprint, now, now]
    );
  }

  // Seed sample Presences
  const presences = [
    { user_id: 'USER-FR-10284', status: 'online', is_typing_in: null },
    { user_id: 'USR-CUST-1001', status: 'online', is_typing_in: null },
    { user_id: 'USR-BIZ-2001', status: 'away', is_typing_in: null },
    { user_id: 'USER-FR-10285', status: 'online', is_typing_in: null },
    { user_id: 'STF-105', status: 'online', is_typing_in: null },
    { user_id: 'guest', status: 'online', is_typing_in: null }
  ];
  for (const p of presences) {
    executeRun(
      `INSERT OR REPLACE INTO chat_presence (user_id, status, is_typing_in, last_seen_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
      [p.user_id, p.status, p.is_typing_in, now, now]
    );
  }

  // Seed sample Conversations & Messages
  const t0 = Date.now();
  const sampleConvs = [
    {
      id: 'CONV-CONTRACT-001',
      conversation_type: 'contract',
      participant_a_id: 'USR-CUST-1001',
      participant_a_name: 'Maria Clara De Los Santos',
      participant_a_role: 'customer',
      participant_b_id: 'USER-FR-10284',
      participant_b_name: 'Marco Antonio Reyes',
      participant_b_role: 'freelancer',
      contract_id: 'ENG-902',
      ticket_id: null,
      title: 'Fintech Mobile UI/UX & Design System (ENG-902)',
      is_e2ee: 1,
      last_message_text: '🔒 [End-to-End Encrypted Message]',
      last_message_sender_id: 'USER-FR-10284',
      last_message_at: new Date(t0 - 1000 * 60 * 5).toISOString(),
      messages: [
        {
          id: 'MSG-001-1',
          sender_id: 'USR-CUST-1001',
          sender_name: 'Maria Clara De Los Santos',
          sender_role: 'customer',
          recipient_id: 'USER-FR-10284',
          message_text: null,
          is_e2ee: 1,
          encrypted_payload: JSON.stringify({
            ciphertext: 'qR82x+9/MariaInitialRequirementSpec/UI2026/GCM==',
            iv: 'kX8z019AaBbC==',
            algorithm: 'AES-GCM',
            plaintext_preview: 'Hi Marco! Milestone 2 has been funded into UnionBank escrow (₱35,000). Are the high-fidelity Figma components ready for review?',
            version: '1.0'
          }),
          attachments: null,
          quote_reply_to: null,
          quote_preview: null,
          created_at: new Date(t0 - 1000 * 60 * 25).toISOString()
        },
        {
          id: 'MSG-001-2',
          sender_id: 'USR-CUST-1001',
          sender_name: 'Maria Clara De Los Santos',
          sender_role: 'customer',
          recipient_id: 'USER-FR-10284',
          message_text: null,
          is_e2ee: 1,
          encrypted_payload: JSON.stringify({
            ciphertext: '91KxL/GroupedWithinTwoMinutesSpecRequirement/GCM==',
            iv: '3aB89100ZzYx==',
            algorithm: 'AES-GCM',
            plaintext_preview: 'Specifically looking for the VeriPinoy QR checkout flow and dark mode tokens.',
            version: '1.0'
          }),
          attachments: null,
          quote_reply_to: null,
          quote_preview: null,
          created_at: new Date(t0 - 1000 * 60 * 24).toISOString() // Grouped! (1 min apart)
        },
        {
          id: 'MSG-001-3',
          sender_id: 'USER-FR-10284',
          sender_name: 'Marco Antonio Reyes',
          sender_role: 'freelancer',
          recipient_id: 'USR-CUST-1001',
          message_text: null,
          is_e2ee: 1,
          encrypted_payload: JSON.stringify({
            ciphertext: '77aA89/MarcoReplyReadyWithFigmaDeliverables/GCM==',
            iv: '99xZ1020BbCc==',
            algorithm: 'AES-GCM',
            plaintext_preview: 'Magandang araw Maria! Yes, all 42 screen states and design tokens have been finalized. I have attached the complete Milestone 2 PDF specification and inspection bundle.',
            version: '1.0'
          }),
          attachments: JSON.stringify([
            {
              id: 'ATT-001',
              name: 'VeriPinoy_Fintech_Design_System_M2.pdf',
              size: 4280000,
              type: 'application/pdf',
              url: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=600&q=80',
              is_image: false
            }
          ]),
          quote_reply_to: 'MSG-001-1',
          quote_preview: JSON.stringify({
            sender_name: 'Maria Clara De Los Santos',
            snippet: 'Hi Marco! Milestone 2 has been funded into UnionBank escrow (₱35,000)...'
          }),
          created_at: new Date(t0 - 1000 * 60 * 15).toISOString()
        },
        {
          id: 'MSG-001-4',
          sender_id: 'USER-FR-10284',
          sender_name: 'Marco Antonio Reyes',
          sender_role: 'freelancer',
          recipient_id: 'USR-CUST-1001',
          message_text: null,
          is_e2ee: 1,
          encrypted_payload: JSON.stringify({
            ciphertext: '44zZ/LoggedMilestoneReadyForEscrowDisburse/GCM==',
            iv: '12xY8890AaBb==',
            algorithm: 'AES-GCM',
            plaintext_preview: 'Work log submitted! You can inspect the deliverable and trigger the escrow release once approved.',
            version: '1.0'
          }),
          attachments: JSON.stringify([
            {
              id: 'ATT-002',
              name: 'QR_Checkout_Interactive_Mockup.png',
              size: 1840000,
              type: 'image/png',
              url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80',
              is_image: true
            }
          ]),
          quote_reply_to: null,
          quote_preview: null,
          created_at: new Date(t0 - 1000 * 60 * 5).toISOString()
        }
      ]
    },
    {
      id: 'CONV-INQUIRY-002',
      conversation_type: 'inquiry',
      participant_a_id: 'USR-BIZ-2001',
      participant_a_name: 'Juan Dela Cruz (Manila Bakery)',
      participant_a_role: 'business',
      participant_b_id: 'USER-FR-10285',
      participant_b_name: 'Maria Teresa Santos',
      participant_b_role: 'freelancer',
      contract_id: null,
      ticket_id: null,
      title: 'VeriPinoy Packaging & Brand Identity Inquiry',
      is_e2ee: 0,
      last_message_text: 'I would love to help! Let me prepare a custom proposal and quote for your 3 product lines.',
      last_message_sender_id: 'USER-FR-10285',
      last_message_at: new Date(t0 - 1000 * 60 * 45).toISOString(),
      messages: [
        {
          id: 'MSG-002-1',
          sender_id: 'USR-BIZ-2001',
          sender_name: 'Juan Dela Cruz (Manila Bakery)',
          sender_role: 'business',
          recipient_id: 'USER-FR-10285',
          message_text: 'Good day Maria! We saw your verified freelancer profile on VeriPinoy. We need artisanal packaging designs for our traditional Ensaymada gift boxes with BIR and VeriPinoy QR verification.',
          is_e2ee: 0,
          encrypted_payload: null,
          attachments: null,
          quote_reply_to: null,
          quote_preview: null,
          created_at: new Date(t0 - 1000 * 60 * 60).toISOString()
        },
        {
          id: 'MSG-002-2',
          sender_id: 'USER-FR-10285',
          sender_name: 'Maria Teresa Santos',
          sender_role: 'freelancer',
          recipient_id: 'USR-BIZ-2001',
          message_text: 'I would love to help! Let me prepare a custom proposal and quote for your 3 product lines.',
          is_e2ee: 0,
          encrypted_payload: null,
          attachments: null,
          quote_reply_to: null,
          quote_preview: null,
          created_at: new Date(t0 - 1000 * 60 * 45).toISOString()
        }
      ]
    },
    {
      id: 'CONV-SUPPORT-003',
      conversation_type: 'support',
      participant_a_id: 'USR-CUST-1001',
      participant_a_name: 'Maria Clara De Los Santos',
      participant_a_role: 'customer',
      participant_b_id: 'STF-105',
      participant_b_name: 'Ben Torres (Support Staff)',
      participant_b_role: 'staff',
      contract_id: null,
      ticket_id: 'TKT-2026-101',
      title: 'Escrow Fund Protection & Milestone Release (VP-SUP-8801)',
      is_e2ee: 0,
      last_message_text: 'Your payment of ₱35,000 has been secured in BSP-compliant trust custody with UnionBank BaaS.',
      last_message_sender_id: 'STF-105',
      last_message_at: new Date(t0 - 1000 * 60 * 90).toISOString(),
      messages: [
        {
          id: 'MSG-003-1',
          sender_id: 'USR-CUST-1001',
          sender_name: 'Maria Clara De Los Santos',
          sender_role: 'customer',
          recipient_id: 'STF-105',
          message_text: 'Hello Support, how does the 7-day deliverable inspection countdown work for escrow fund disbursement on contract ENG-902?',
          is_e2ee: 0,
          encrypted_payload: null,
          attachments: null,
          quote_reply_to: null,
          quote_preview: null,
          created_at: new Date(t0 - 1000 * 60 * 120).toISOString()
        },
        {
          id: 'MSG-003-2',
          sender_id: 'STF-105',
          sender_name: 'Ben Torres (Support Staff)',
          sender_role: 'staff',
          recipient_id: 'USR-CUST-1001',
          message_text: 'Hi Maria! Your payment of ₱35,000 has been secured in BSP-compliant trust custody with UnionBank BaaS. You have 7 days to review deliverables before funds auto-disburse, or you can approve release immediately.',
          is_e2ee: 0,
          encrypted_payload: null,
          attachments: null,
          quote_reply_to: null,
          quote_preview: null,
          created_at: new Date(t0 - 1000 * 60 * 90).toISOString()
        }
      ]
    }
  ];

  for (const c of sampleConvs) {
    executeRun(
      `INSERT OR REPLACE INTO chat_conversations (
        id, conversation_type, participant_a_id, participant_a_name, participant_a_role,
        participant_b_id, participant_b_name, participant_b_role, contract_id, ticket_id,
        title, is_e2ee, status, last_message_text, last_message_sender_id, last_message_at,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?)`,
      [
        c.id, c.conversation_type, c.participant_a_id, c.participant_a_name, c.participant_a_role,
        c.participant_b_id, c.participant_b_name, c.participant_b_role, c.contract_id, c.ticket_id,
        c.title, c.is_e2ee, c.last_message_text, c.last_message_sender_id, c.last_message_at,
        now, now
      ]
    );

    if (c.messages && c.messages.length > 0) {
      for (const m of c.messages) {
        executeRun(
          `INSERT OR REPLACE INTO chat_messages (
            id, conversation_id, sender_id, sender_name, sender_role, recipient_id,
            message_text, is_e2ee, encrypted_payload, attachments, quote_reply_to,
            quote_preview, status, is_edited, is_deleted, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'read', 0, 0, ?, ?)`,
          [
            m.id, c.id, m.sender_id, m.sender_name, m.sender_role, m.recipient_id,
            m.message_text, m.is_e2ee, m.encrypted_payload, m.attachments,
            m.quote_reply_to, m.quote_preview, m.created_at, m.created_at
          ]
        );
      }
    }
  }
}

export function getSupportTickets(filters = {}) {
  let sql = 'SELECT * FROM support_tickets WHERE 1=1';
  const params = [];

  if (filters.status && filters.status !== 'all') {
    sql += ' AND status = ?';
    params.push(filters.status);
  }
  if (filters.category && filters.category !== 'all') {
    sql += ' AND category = ?';
    params.push(filters.category);
  }
  if (filters.priority && filters.priority !== 'all') {
    sql += ' AND priority = ?';
    params.push(filters.priority);
  }
  if (filters.user_id) {
    sql += ' AND (user_id = ? OR user_email = ?)';
    params.push(filters.user_id, filters.user_id);
  }
  if (filters.search) {
    sql += ' AND (subject LIKE ? OR ticket_number LIKE ? OR user_name LIKE ? OR user_email LIKE ?)';
    const searchPattern = `%${filters.search}%`;
    params.push(searchPattern, searchPattern, searchPattern, searchPattern);
  }

  sql += ' ORDER BY updated_at DESC';
  return queryAll(sql, params);
}

export function getSupportTicketById(id) {
  const ticket = queryOne('SELECT * FROM support_tickets WHERE id = ? OR ticket_number = ?', [id, id]);
  if (!ticket) return null;

  const messages = queryAll('SELECT * FROM support_ticket_messages WHERE ticket_id = ? ORDER BY created_at ASC', [ticket.id]);
  return { ...ticket, messages };
}

export function createSupportTicket({ user_id, user_name, user_email, user_type = 'guest', category = 'general', priority = 'medium', subject, initial_message }) {
  const id = `TKT-${Date.now().toString().slice(-6)}`;
  const ticket_number = `VP-SUP-${Math.floor(1000 + Math.random() * 9000)}`;
  const now = new Date().toISOString();

  executeRun(
    `INSERT INTO support_tickets (id, ticket_number, user_id, user_name, user_email, user_type, category, priority, subject, status, assigned_staff_id, assigned_staff_name, last_message, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', 'STF-105', 'Ben Torres', ?, ?, ?)`,
    [id, ticket_number, user_id || 'guest', user_name || 'Guest User', user_email || 'guest@veripinoy.ph', user_type, category, priority, subject, initial_message || subject, now, now]
  );

  if (initial_message) {
    const msgId = `MSG-${Date.now()}-${Math.floor(Math.random()*1000)}`;
    executeRun(
      `INSERT INTO support_ticket_messages (id, ticket_id, sender_type, sender_id, sender_name, message, created_at)
       VALUES (?, ?, 'user', ?, ?, ?, ?)`,
      [msgId, id, user_id || 'guest', user_name || 'Guest User', initial_message, now]
    );
  }

  return getSupportTicketById(id);
}

export function addSupportTicketMessage({ ticket_id, sender_type = 'staff', sender_id, sender_name, message, attachments = null }) {
  const ticket = queryOne('SELECT * FROM support_tickets WHERE id = ? OR ticket_number = ?', [ticket_id, ticket_id]);
  if (!ticket) throw new Error('Ticket not found');

  const msgId = `MSG-${Date.now()}-${Math.floor(Math.random()*1000)}`;
  const now = new Date().toISOString();

  executeRun(
    `INSERT INTO support_ticket_messages (id, ticket_id, sender_type, sender_id, sender_name, message, attachments, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [msgId, ticket.id, sender_type, sender_id || 'staff', sender_name || 'Support Staff', message, attachments, now]
  );

  executeRun(
    `UPDATE support_tickets SET last_message = ?, updated_at = ?, status = CASE WHEN status = 'closed' THEN 'open' ELSE status END WHERE id = ?`,
    [message, now, ticket.id]
  );

  return getSupportTicketById(ticket.id);
}

export function updateSupportTicket(id, { status, priority, category, assigned_staff_id, assigned_staff_name }) {
  const ticket = queryOne('SELECT * FROM support_tickets WHERE id = ? OR ticket_number = ?', [id, id]);
  if (!ticket) throw new Error('Ticket not found');

  const now = new Date().toISOString();
  const nextStatus = status || ticket.status;
  const nextPriority = priority || ticket.priority;
  const nextCategory = category || ticket.category;
  const nextStaffId = assigned_staff_id !== undefined ? assigned_staff_id : ticket.assigned_staff_id;
  const nextStaffName = assigned_staff_name !== undefined ? assigned_staff_name : ticket.assigned_staff_name;

  executeRun(
    `UPDATE support_tickets SET status = ?, priority = ?, category = ?, assigned_staff_id = ?, assigned_staff_name = ?, updated_at = ? WHERE id = ?`,
    [nextStatus, nextPriority, nextCategory, nextStaffId, nextStaffName, now, ticket.id]
  );

  return getSupportTicketById(ticket.id);
}

/* ==========================================================================
   E2EE CRYPTOGRAPHIC KEY REGISTRY & EXCHANGE
   ========================================================================== */
export function getUserE2EEKey(userIdOrEmail) {
  return queryOne(
    `SELECT * FROM user_e2ee_keys WHERE user_id = ? OR user_email = ?`,
    [userIdOrEmail, userIdOrEmail]
  );
}

export function upsertUserE2EEKey({ user_id, user_email, public_key, ecdh_public_key = null, key_fingerprint }) {
  const existing = queryOne(`SELECT id FROM user_e2ee_keys WHERE user_id = ?`, [user_id]);
  const now = new Date().toISOString();
  if (existing) {
    executeRun(
      `UPDATE user_e2ee_keys SET public_key = ?, ecdh_public_key = ?, key_fingerprint = ?, updated_at = ? WHERE user_id = ?`,
      [public_key, ecdh_public_key, key_fingerprint, now, user_id]
    );
    return queryOne(`SELECT * FROM user_e2ee_keys WHERE user_id = ?`, [user_id]);
  } else {
    const id = `KEY-${Date.now()}-${Math.floor(Math.random()*10000)}`;
    executeRun(
      `INSERT INTO user_e2ee_keys (id, user_id, user_email, public_key, ecdh_public_key, key_fingerprint, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, user_id, user_email, public_key, ecdh_public_key, key_fingerprint, now, now]
    );
    return queryOne(`SELECT * FROM user_e2ee_keys WHERE id = ?`, [id]);
  }
}

export function getConversationKeys(conversationId, userId = null) {
  if (userId) {
    return queryAll(`SELECT * FROM chat_conversation_keys WHERE conversation_id = ? AND user_id = ?`, [conversationId, userId]);
  }
  return queryAll(`SELECT * FROM chat_conversation_keys WHERE conversation_id = ?`, [conversationId]);
}

export function upsertConversationKey({ conversation_id, user_id, wrapped_key, algorithm = 'RSA-OAEP-256' }) {
  const existing = queryOne(
    `SELECT id FROM chat_conversation_keys WHERE conversation_id = ? AND user_id = ?`,
    [conversation_id, user_id]
  );
  const now = new Date().toISOString();
  if (existing) {
    executeRun(
      `UPDATE chat_conversation_keys SET wrapped_key = ?, algorithm = ? WHERE id = ?`,
      [wrapped_key, algorithm, existing.id]
    );
    return queryOne(`SELECT * FROM chat_conversation_keys WHERE id = ?`, [existing.id]);
  } else {
    const id = `CK-${Date.now()}-${Math.floor(Math.random()*10000)}`;
    executeRun(
      `INSERT INTO chat_conversation_keys (id, conversation_id, user_id, wrapped_key, algorithm, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, conversation_id, user_id, wrapped_key, algorithm, now]
    );
    return queryOne(`SELECT * FROM chat_conversation_keys WHERE id = ?`, [id]);
  }
}

/* ==========================================================================
   UNIVERSAL CHAT & CONVERSATION THREADS
   ========================================================================== */
export function getConversationsForUser(userIdOrEmail, role = null, typeFilter = null) {
  if (!userIdOrEmail) {
    return [];
  }

  let sql;
  let params = [];

  // For Admin or Staff: can view all threads or support threads if requested
  if (role === 'admin' || role === 'staff') {
    if (userIdOrEmail === 'ALL' || userIdOrEmail === 'all') {
      sql = `
        SELECT c.*,
          (SELECT COUNT(*) FROM chat_messages m WHERE m.conversation_id = c.id AND m.status != 'read' AND m.sender_id != 'staff') as unread_count
        FROM chat_conversations c
        WHERE 1=1
      `;
    } else {
      sql = `
        SELECT c.*,
          (SELECT COUNT(*) FROM chat_messages m WHERE m.conversation_id = c.id AND m.status != 'read' AND m.sender_id != ?) as unread_count
        FROM chat_conversations c
        WHERE (c.participant_a_id = ? OR c.participant_b_id = ? OR c.participant_a_role = 'staff' OR c.participant_b_role = 'staff' OR c.conversation_type = 'support')
      `;
      params = [userIdOrEmail, userIdOrEmail, userIdOrEmail];
    }
  } else {
    // STRICT ISOLATION FOR CUSTOMERS / FREELANCERS / BUSINESS OWNERS:
    // Only return threads where the user is an explicit participant (participant_a_id or participant_b_id)
    sql = `
      SELECT c.*,
        (SELECT COUNT(*) FROM chat_messages m WHERE m.conversation_id = c.id AND m.status != 'read' AND m.sender_id != ?) as unread_count
      FROM chat_conversations c
      WHERE (c.participant_a_id = ? OR c.participant_b_id = ?)
    `;
    params = [userIdOrEmail, userIdOrEmail, userIdOrEmail];
  }

  if (typeFilter && typeFilter !== 'all') {
    sql += ` AND c.conversation_type = ?`;
    params.push(typeFilter);
  }

  sql += ` ORDER BY c.last_message_at DESC`;
  const list = queryAll(sql, params);
  
  return list.map(conv => {
    let contractMeta = null;
    let ticketMeta = null;
    if (conv.contract_id) {
      contractMeta = queryOne(`SELECT * FROM freelancer_engagements WHERE id = ?`, [conv.contract_id]);
      if (contractMeta) {
        const milestones = queryAll(`SELECT * FROM freelancer_milestones WHERE engagement_id = ? ORDER BY created_at ASC`, [conv.contract_id]);
        const escrowLogs = queryAll(`SELECT * FROM escrow_partner_logs WHERE transaction_id = ? OR milestone_id IN (SELECT id FROM freelancer_milestones WHERE engagement_id = ?)`, [contractMeta.id, contractMeta.id]);
        contractMeta.milestones = milestones;
        contractMeta.escrow_logs = escrowLogs;
      }
    }
    if (conv.ticket_id) {
      ticketMeta = queryOne(`SELECT * FROM support_tickets WHERE id = ? OR ticket_number = ?`, [conv.ticket_id, conv.ticket_id]);
    }
    return {
      ...conv,
      thread_id: conv.id,
      participants: [conv.participant_a_id, conv.participant_b_id],
      contract_meta: contractMeta,
      ticket_meta: ticketMeta
    };
  });
}

export function getConversationById(convId) {
  const conv = queryOne(`SELECT * FROM chat_conversations WHERE id = ?`, [convId]);
  if (!conv) return null;
  let contractMeta = null;
  let ticketMeta = null;
  if (conv.contract_id) {
    contractMeta = queryOne(`SELECT * FROM freelancer_engagements WHERE id = ?`, [conv.contract_id]);
    if (contractMeta) {
      contractMeta.milestones = queryAll(`SELECT * FROM freelancer_milestones WHERE engagement_id = ? ORDER BY created_at ASC`, [conv.contract_id]);
      contractMeta.escrow_logs = queryAll(`SELECT * FROM escrow_partner_logs WHERE transaction_id = ?`, [contractMeta.id]);
    }
  }
  if (conv.ticket_id) {
    ticketMeta = queryOne(`SELECT * FROM support_tickets WHERE id = ? OR ticket_number = ?`, [conv.ticket_id, conv.ticket_id]);
  }
  return {
    ...conv,
    thread_id: conv.id,
    participants: [conv.participant_a_id, conv.participant_b_id],
    contract_meta: contractMeta,
    ticket_meta: ticketMeta
  };
}

export function createConversation({
  id = null,
  conversation_type = 'direct',
  participant_a_id,
  participant_a_name,
  participant_a_role = 'customer',
  participant_b_id,
  participant_b_name,
  participant_b_role = 'freelancer',
  contract_id = null,
  ticket_id = null,
  title = 'Direct Conversation',
  is_e2ee = 0
}) {
  const convId = id || `CONV-${Date.now()}-${Math.floor(Math.random()*10000)}`;
  const now = new Date().toISOString();
  
  executeRun(
    `INSERT INTO chat_conversations (
      id, conversation_type, participant_a_id, participant_a_name, participant_a_role,
      participant_b_id, participant_b_name, participant_b_role, contract_id, ticket_id,
      title, is_e2ee, status, last_message_text, last_message_sender_id, last_message_at,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?)`,
    [
      convId, conversation_type, participant_a_id, participant_a_name, participant_a_role,
      participant_b_id, participant_b_name, participant_b_role, contract_id, ticket_id,
      title, is_e2ee ? 1 : 0, 'Conversation started', participant_a_id, now, now, now
    ]
  );

  return getConversationById(convId);
}

export function getConversationMessages(conversationId, limit = 100) {
  const msgs = queryAll(
    `SELECT * FROM chat_messages WHERE conversation_id = ? ORDER BY created_at ASC LIMIT ?`,
    [conversationId, limit]
  );
  return msgs.map(m => {
    let attachments = [];
    let quote_preview = null;
    let encrypted_payload = null;
    try { if (m.attachments) attachments = JSON.parse(m.attachments); } catch(e) {}
    try { if (m.quote_preview) quote_preview = JSON.parse(m.quote_preview); } catch(e) {}
    try { if (m.encrypted_payload) encrypted_payload = JSON.parse(m.encrypted_payload); } catch(e) {}
    return {
      ...m,
      thread_id: m.conversation_id,
      attachments,
      quote_preview,
      encrypted_payload
    };
  });
}

export function addChatMessage({
  id = null,
  conversation_id,
  sender_id,
  sender_name,
  sender_role = 'customer',
  recipient_id,
  message_text = null,
  is_e2ee = 0,
  encrypted_payload = null,
  attachments = null,
  quote_reply_to = null,
  quote_preview = null
}) {
  const msgId = id || `MSG-${Date.now()}-${Math.floor(Math.random()*10000)}`;
  const now = new Date().toISOString();

  const attachmentsStr = attachments ? (typeof attachments === 'string' ? attachments : JSON.stringify(attachments)) : null;
  const quotePreviewStr = quote_preview ? (typeof quote_preview === 'string' ? quote_preview : JSON.stringify(quote_preview)) : null;
  const encryptedPayloadStr = encrypted_payload ? (typeof encrypted_payload === 'string' ? encrypted_payload : JSON.stringify(encrypted_payload)) : null;

  executeRun(
    `INSERT INTO chat_messages (
      id, conversation_id, sender_id, sender_name, sender_role, recipient_id,
      message_text, is_e2ee, encrypted_payload, attachments, quote_reply_to,
      quote_preview, status, is_edited, is_deleted, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'sent', 0, 0, ?, ?)`,
    [
      msgId, conversation_id, sender_id, sender_name, sender_role, recipient_id,
      is_e2ee ? null : message_text, is_e2ee ? 1 : 0, encryptedPayloadStr, attachmentsStr,
      quote_reply_to, quotePreviewStr, now, now
    ]
  );

  const displaySnippet = is_e2ee ? '🔒 [End-to-End Encrypted Message]' : (message_text || (attachmentsStr ? '📎 Sent an attachment' : 'New message'));

  executeRun(
    `UPDATE chat_conversations SET last_message_text = ?, last_message_sender_id = ?, last_message_at = ?, updated_at = ? WHERE id = ?`,
    [displaySnippet, sender_id, now, now, conversation_id]
  );

  const inserted = queryOne(`SELECT * FROM chat_messages WHERE id = ?`, [msgId]);
  let parsedAtt = [];
  let parsedQuote = null;
  let parsedEnc = null;
  try { if (inserted.attachments) parsedAtt = JSON.parse(inserted.attachments); } catch(e) {}
  try { if (inserted.quote_preview) parsedQuote = JSON.parse(inserted.quote_preview); } catch(e) {}
  try { if (inserted.encrypted_payload) parsedEnc = JSON.parse(inserted.encrypted_payload); } catch(e) {}

  return {
    ...inserted,
    attachments: parsedAtt,
    quote_preview: parsedQuote,
    encrypted_payload: parsedEnc
  };
}

export function updateChatMessage(messageId, { message_text, is_edited = 1, is_deleted = 0, encrypted_payload = null }) {
  const existing = queryOne(`SELECT * FROM chat_messages WHERE id = ?`, [messageId]);
  if (!existing) throw new Error('Message not found');

  const now = new Date().toISOString();
  const nextEncStr = encrypted_payload ? (typeof encrypted_payload === 'string' ? encrypted_payload : JSON.stringify(encrypted_payload)) : existing.encrypted_payload;

  executeRun(
    `UPDATE chat_messages SET
      message_text = ?,
      is_edited = ?,
      is_deleted = ?,
      encrypted_payload = ?,
      updated_at = ?
     WHERE id = ?`,
    [is_deleted ? 'This message was deleted' : (existing.is_e2ee ? null : (message_text || existing.message_text)), is_deleted ? 0 : is_edited, is_deleted ? 1 : 0, nextEncStr, now, messageId]
  );

  const updated = queryOne(`SELECT * FROM chat_messages WHERE id = ?`, [messageId]);
  let parsedAtt = [];
  let parsedQuote = null;
  let parsedEnc = null;
  try { if (updated.attachments) parsedAtt = JSON.parse(updated.attachments); } catch(e) {}
  try { if (updated.quote_preview) parsedQuote = JSON.parse(updated.quote_preview); } catch(e) {}
  try { if (updated.encrypted_payload) parsedEnc = JSON.parse(updated.encrypted_payload); } catch(e) {}

  return {
    ...updated,
    attachments: parsedAtt,
    quote_preview: parsedQuote,
    encrypted_payload: parsedEnc
  };
}

export function markConversationRead(conversationId, readerId) {
  const now = new Date().toISOString();
  executeRun(
    `UPDATE chat_messages SET status = 'read', read_at = ? WHERE conversation_id = ? AND sender_id != ? AND status != 'read'`,
    [now, conversationId, readerId]
  );
  return { success: true };
}

/* ==========================================================================
   PRESENCE & TYPING INDICATORS
   ========================================================================== */
export function updateUserPresence(userId, status = 'online', isTypingIn = null) {
  const existing = queryOne(`SELECT user_id FROM chat_presence WHERE user_id = ?`, [userId]);
  const now = new Date().toISOString();
  if (existing) {
    executeRun(
      `UPDATE chat_presence SET status = ?, is_typing_in = ?, last_seen_at = ?, updated_at = ? WHERE user_id = ?`,
      [status, isTypingIn, now, now, userId]
    );
  } else {
    executeRun(
      `INSERT INTO chat_presence (user_id, status, is_typing_in, last_seen_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
      [userId, status, isTypingIn, now, now]
    );
  }
  return queryOne(`SELECT * FROM chat_presence WHERE user_id = ?`, [userId]);
}

export function getAllUserPresences() {
  return queryAll(`SELECT * FROM chat_presence`);
}

export function getUserPresence(userId) {
  const p = queryOne(`SELECT * FROM chat_presence WHERE user_id = ?`, [userId]);
  return p || { user_id: userId, status: 'online', is_typing_in: null, last_seen_at: new Date().toISOString() };
}

/* ==========================================================================
   ATTACHMENTS & EMAIL FALLBACK NOTIFICATIONS
   ========================================================================== */
export function saveChatAttachment({ id = null, conversation_id, message_id = null, uploader_id, file_name, file_size, mime_type, file_data }) {
  const attId = id || `ATT-${Date.now()}-${Math.floor(Math.random()*10000)}`;
  const now = new Date().toISOString();
  executeRun(
    `INSERT INTO chat_attachments (id, conversation_id, message_id, uploader_id, file_name, file_size, mime_type, file_data, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [attId, conversation_id, message_id, uploader_id, file_name, file_size, mime_type, file_data, now]
  );
  return queryOne(`SELECT * FROM chat_attachments WHERE id = ?`, [attId]);
}

export function getChatAttachment(id) {
  return queryOne(`SELECT * FROM chat_attachments WHERE id = ?`, [id]);
}

export function logEmailFallbackNotification({
  recipient_email,
  recipient_name,
  sender_name,
  conversation_id,
  preview_snippet,
  direct_link
}) {
  const id = `NOTIF-${Date.now()}-${Math.floor(Math.random()*10000)}`;
  const now = new Date().toISOString();
  executeRun(
    `INSERT INTO chat_email_notifications (id, recipient_email, recipient_name, sender_name, conversation_id, preview_snippet, direct_link, status, sent_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'dispatched', ?)`,
    [id, recipient_email, recipient_name, sender_name, conversation_id, preview_snippet, direct_link, now]
  );
  return queryOne(`SELECT * FROM chat_email_notifications WHERE id = ?`, [id]);
}

export function getDispatchedEmailNotifications(limit = 20) {
  return queryAll(`SELECT * FROM chat_email_notifications ORDER BY sent_at DESC LIMIT ?`, [limit]);
}

/* ==========================================================================
   ROLE-BASED REPORTING & ANALYTICS SEEDING & HELPER FUNCTIONS
   ========================================================================== */

export function seedRoleBasedReportsData(now = new Date().toISOString()) {
  /* 1. SEED PROFILES TABLE (RBAC) */
  const profilesSeed = [
    {
      id: 'PROF-AUD-001',
      user_id: 'STAFF-ADM-001',
      email: 'auditor.santos@veripinoy.ph',
      full_name: 'Auditor Roberto Santos',
      role: 'auditor',
      role_title: 'Senior Compliance & Regulatory Auditor',
      department: 'Compliance & Security Directorate',
      permissions_json: JSON.stringify(['audit_logs.view', 'compliance.view', 'security.audit', 'cardo.inspect', 'reports.auditor']),
      phone: '+63 917 882 1920',
      status: 'active'
    },
    {
      id: 'PROF-SALES-001',
      user_id: 'STAFF-SALES-001',
      email: 'sales.lead@veripinoy.ph',
      full_name: 'Camille Dizon',
      role: 'sales',
      role_title: 'Commercial Pipeline & Merchant Growth Lead',
      department: 'Sales & Merchant Acquisition',
      permissions_json: JSON.stringify(['pipeline.view', 'merchants.acquire', 'conversions.view', 'referrals.track', 'reports.sales']),
      phone: '+63 918 554 3912',
      status: 'active'
    },
    {
      id: 'PROF-ADM-001',
      user_id: 'ADM-OPS-001',
      email: 'admin.ops@veripinoy.ph',
      full_name: 'Maria Elena Ramos',
      role: 'admin',
      role_title: 'Platform Operations Administrator',
      department: 'Operations Directorate',
      permissions_json: JSON.stringify(['system.overview', 'staff.track', 'reports.view', 'audit.view', 'sales.view', 'reports.admin']),
      phone: '+63 920 441 8731',
      status: 'active'
    },
    {
      id: 'PROF-SUPER-001',
      user_id: 'ADM-SUPER-001',
      email: 'admin.director@veripinoy.ph',
      full_name: 'Director Alejandro Cruz',
      role: 'super_admin',
      role_title: 'Super Administrator & Executive Director',
      department: 'Executive Directorate',
      permissions_json: JSON.stringify(['*']),
      phone: '+63 917 111 9000',
      status: 'active'
    },
    {
      id: 'PROF-CUST-001',
      user_id: 'USR-CUST-1001',
      email: 'customer@veripinoy.ph',
      full_name: 'Maria Clara De Los Santos',
      role: 'customer',
      role_title: 'Verified Customer & Reviewer',
      department: 'Public Registry',
      permissions_json: JSON.stringify(['reviews.create', 'businesses.view']),
      phone: '+63 917 332 9901',
      status: 'active'
    },
    {
      id: 'PROF-BIZ-001',
      user_id: 'USR-BIZ-2001',
      email: 'owner@manilabakery.ph',
      full_name: 'Juan Dela Cruz',
      role: 'business',
      role_title: 'Verified Merchant Owner',
      department: 'Business Registry',
      permissions_json: JSON.stringify(['business.manage', 'reviews.reply']),
      phone: '+63 917 555 1234',
      status: 'active'
    },
    {
      id: 'PROF-FR-001',
      user_id: 'USER-FR-10284',
      email: 'freelancer@marcoreyes.dev',
      full_name: 'Marco Antonio Reyes',
      role: 'freelancer',
      role_title: 'Senior Web & Blockchain Specialist',
      department: 'Freelancer Pro Registry',
      permissions_json: JSON.stringify(['freelancer.profile', 'escrow.milestones']),
      phone: '+63 919 777 4412',
      status: 'active'
    }
  ];

  for (const p of profilesSeed) {
    executeRun(
      `INSERT OR REPLACE INTO profiles (id, user_id, email, full_name, role, role_title, department, permissions_json, phone, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [p.id, p.user_id, p.email, p.full_name, p.role, p.role_title, p.department, p.permissions_json, p.phone, p.status, now, now]
    );
  }

  /* 2. SEED SENSITIVE AUDIT LOGS (Status changes, user deletions, verification approvals, security checks) */
  const auditLogsSeed = [
    {
      id: 'LOG-AUD-1001',
      actor_admin_id: 'STAFF-ADM-001',
      actor_name: 'Auditor Roberto Santos',
      actor_role: 'Auditor',
      action: 'STATUS_CHANGE',
      entity_type: 'BUSINESS_KYB',
      entity_id: 'BIZ-2001',
      previous_value: 'PENDING_AUDIT',
      new_value: 'VERIFIED_ACTIVE',
      details: 'Changed merchant status from PENDING_AUDIT to VERIFIED_ACTIVE following automated DTI C.A.R.D.O. registry match.',
      success: 1,
      ip_address: '112.198.102.44',
      user_agent: 'VeriPinoy-AuditorDesk/v2.4',
      timestamp: '2026-08-28 14:32:00'
    },
    {
      id: 'LOG-AUD-1002',
      actor_admin_id: 'ADM-OPS-001',
      actor_name: 'Maria Elena Ramos',
      actor_role: 'Admin',
      action: 'USER_DELETION',
      entity_type: 'FRAUD_ACCOUNT',
      entity_id: 'USR-FRAUD-991',
      previous_value: 'QUARANTINED',
      new_value: 'DELETED',
      details: 'Quarantined astroturfing bot user account permanently deleted and IP cluster blacklisted under Anti-Fraud Rule AF-812.',
      success: 1,
      ip_address: '120.28.188.19',
      user_agent: 'VeriPinoy-AdminHub/v2.4',
      timestamp: '2026-08-27 09:15:20'
    },
    {
      id: 'LOG-AUD-1003',
      actor_admin_id: 'STAFF-ADM-001',
      actor_name: 'Auditor Roberto Santos',
      actor_role: 'Auditor',
      action: 'VERIFICATION_APPROVAL',
      entity_type: 'FREELANCER_PRO',
      entity_id: 'USER-FR-10284',
      previous_value: 'SUBMITTED',
      new_value: 'VERIFIED_PRO',
      details: 'Approved Pro Freelancer verification and NBI biometric compliance clearance for Marco Antonio Reyes.',
      success: 1,
      ip_address: '112.198.102.44',
      user_agent: 'VeriPinoy-AuditorDesk/v2.4',
      timestamp: '2026-08-26 16:45:10'
    },
    {
      id: 'LOG-AUD-1004',
      actor_admin_id: 'ADM-SUPER-001',
      actor_name: 'Director Alejandro Cruz',
      actor_role: 'Super Admin',
      action: 'SECURITY_POLICY_UPDATE',
      entity_type: 'MFA_POLICY',
      entity_id: 'MFA-POL-01',
      previous_value: 'OPTIONAL_FOR_STAFF',
      new_value: 'MANDATORY_ENFORCED',
      details: 'Mandatory hardware MFA and FIDO2 policy enforced for all staff members handling DTI/SEC tax vaults.',
      success: 1,
      ip_address: '175.176.48.91',
      user_agent: 'VeriPinoy-ExecutivePortal/v2.4',
      timestamp: '2026-08-25 11:20:00'
    },
    {
      id: 'LOG-AUD-1005',
      actor_admin_id: 'STAFF-ADM-001',
      actor_name: 'Auditor Roberto Santos',
      actor_role: 'Auditor',
      action: 'STATUS_CHANGE',
      entity_type: 'BUSINESS_KYB',
      entity_id: 'BIZ-2003',
      previous_value: 'AWAITING_DOCS',
      new_value: 'UNDER_REVIEW',
      details: "Cebu Coastal Logistics Mayor's Permit status marked Validated with Cebu City LGU registry database.",
      success: 1,
      ip_address: '112.198.102.44',
      user_agent: 'VeriPinoy-AuditorDesk/v2.4',
      timestamp: '2026-08-24 10:05:44'
    },
    {
      id: 'LOG-AUD-1006',
      actor_admin_id: 'ADM-OPS-001',
      actor_name: 'Maria Elena Ramos',
      actor_role: 'Admin',
      action: 'ESCROW_DISPUTE_RESOLVE',
      entity_type: 'ESCROW_DISPUTE',
      entity_id: 'DISP-9021',
      previous_value: 'OPEN_MEDIATION',
      new_value: 'RESOLVED_SPLIT',
      details: 'Resolved Escrow Milestone dispute with 50/50 mutual mediated settlement under BSP Circular 942 consumer guidelines.',
      success: 1,
      ip_address: '120.28.188.19',
      user_agent: 'VeriPinoy-AdminHub/v2.4',
      timestamp: '2026-08-23 15:30:12'
    },
    {
      id: 'LOG-AUD-1007',
      actor_admin_id: 'STAFF-ADM-001',
      actor_name: 'Auditor Roberto Santos',
      actor_role: 'Auditor',
      action: 'VAULT_ACCESS_INSPECT',
      entity_type: 'ENCRYPTED_DOC',
      entity_id: 'DOC-BIR-8812',
      previous_value: 'ENCRYPTED_REST',
      new_value: 'INSPECTED_DECRYPTED',
      details: 'Inspected AES-256 encrypted BIR Form 2303 certificate for Manila Artisan Bakery (TIN 241-998-102-000).',
      success: 1,
      ip_address: '112.198.102.44',
      user_agent: 'VeriPinoy-AuditorDesk/v2.4',
      timestamp: '2026-08-22 08:44:21'
    },
    {
      id: 'LOG-AUD-1008',
      actor_admin_id: 'ADM-SUPER-001',
      actor_name: 'Director Alejandro Cruz',
      actor_role: 'Super Admin',
      action: 'ROLE_PERMISSION_UPDATE',
      entity_type: 'RBAC_ROLE',
      entity_id: 'ROLE-SALES-01',
      previous_value: 'PIPELINE_READ_ONLY',
      new_value: 'PIPELINE_EXPORT_PERMITTED',
      details: 'Updated Sales Team permission matrix to include live conversion analytics export and merchant attribution tracking.',
      success: 1,
      ip_address: '175.176.48.91',
      user_agent: 'VeriPinoy-ExecutivePortal/v2.4',
      timestamp: '2026-08-21 13:10:00'
    },
    {
      id: 'LOG-AUD-1009',
      actor_admin_id: 'CARDO-AI-ENGINE',
      actor_name: 'C.A.R.D.O. Automated Engine',
      actor_role: 'System AI',
      action: 'DATA_INTEGRITY_CHECK',
      entity_type: 'CRYPTO_LEDGER',
      entity_id: 'LEDGER-ROOT-2026',
      previous_value: 'UNCHECKED',
      new_value: '100%_INTEGRITY_VERIFIED',
      details: 'Cryptographic SHA-256 merkle audit chain validated with 100% integrity across 1,482 historical state transitions.',
      success: 1,
      ip_address: '10.0.0.1',
      user_agent: 'CARDO-Core/v3.1-AI',
      timestamp: '2026-08-20 00:00:00'
    },
    {
      id: 'LOG-AUD-1010',
      actor_admin_id: 'ADM-OPS-001',
      actor_name: 'Maria Elena Ramos',
      actor_role: 'Admin',
      action: 'STATUS_CHANGE',
      entity_type: 'BUSINESS_KYB',
      entity_id: 'BIZ-2004',
      previous_value: 'SUSPENDED_REVIEW',
      new_value: 'VERIFIED_ACTIVE',
      details: 'Re-activated Davao Agri-Tech Ventures after LGU validation of updated Mayor Permit and SEC Annual Report.',
      success: 1,
      ip_address: '120.28.188.19',
      user_agent: 'VeriPinoy-AdminHub/v2.4',
      timestamp: '2026-08-19 11:18:32'
    }
  ];

  for (const log of auditLogsSeed) {
    executeRun(
      `INSERT OR REPLACE INTO audit_logs (id, actor_admin_id, actor_name, actor_role, action, entity_type, entity_id, previous_value, new_value, details, success, ip_address, user_agent, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [log.id, log.actor_admin_id, log.actor_name, log.actor_role, log.action, log.entity_type, log.entity_id, log.previous_value, log.new_value, log.details, log.success, log.ip_address, log.user_agent, log.timestamp]
    );
  }

  /* 3. SEED C.A.R.D.O. COMPLIANCE AUDITS */
  const cardoSeed = [
    {
      id: 'CARDO-AUD-01',
      business_id: 'BIZ-2001',
      business_name: 'Manila Artisan Bakery & Cafe',
      dti_sec_reg_no: 'DTI-NCR-8829104',
      dti_sec_status: 'verified_active',
      cardo_ai_confidence: 99.4,
      bir_2303_status: 'verified_tax_compliant',
      mayors_permit_status: 'verified_valid',
      risk_level: 'LOW',
      last_audited_at: '2026-08-28 14:30:00',
      audited_by: 'C.A.R.D.O. AI + Auditor Santos'
    },
    {
      id: 'CARDO-AUD-02',
      business_id: 'BIZ-2002',
      business_name: 'TechCraft Solutions Philippines',
      dti_sec_reg_no: 'SEC-CS202109841',
      dti_sec_status: 'verified_active',
      cardo_ai_confidence: 98.8,
      bir_2303_status: 'verified_tax_compliant',
      mayors_permit_status: 'verified_valid',
      risk_level: 'LOW',
      last_audited_at: '2026-08-27 10:12:00',
      audited_by: 'C.A.R.D.O. AI'
    },
    {
      id: 'CARDO-AUD-03',
      business_id: 'BIZ-2003',
      business_name: 'Cebu Coastal Logistics Corp.',
      dti_sec_reg_no: 'SEC-CS201948102',
      dti_sec_status: 'verified_active',
      cardo_ai_confidence: 97.2,
      bir_2303_status: 'verified_tax_compliant',
      mayors_permit_status: 'verified_valid',
      risk_level: 'LOW',
      last_audited_at: '2026-08-26 15:40:00',
      audited_by: 'C.A.R.D.O. AI + Auditor Santos'
    },
    {
      id: 'CARDO-AUD-04',
      business_id: 'BIZ-2004',
      business_name: 'Davao Agri-Tech Ventures',
      dti_sec_reg_no: 'DTI-R11-309182',
      dti_sec_status: 'verified_active',
      cardo_ai_confidence: 96.5,
      bir_2303_status: 'verified_tax_compliant',
      mayors_permit_status: 'verified_valid',
      risk_level: 'LOW',
      last_audited_at: '2026-08-25 09:25:00',
      audited_by: 'C.A.R.D.O. AI'
    },
    {
      id: 'CARDO-AUD-05',
      business_id: 'BIZ-2005',
      business_name: 'Pampanga Culinary Express Inc.',
      dti_sec_reg_no: 'SEC-CS202301948',
      dti_sec_status: 'pending_renewal',
      cardo_ai_confidence: 84.1,
      bir_2303_status: 'verified_tax_compliant',
      mayors_permit_status: 'under_lgu_check',
      risk_level: 'MODERATE',
      last_audited_at: '2026-08-24 16:10:00',
      audited_by: 'C.A.R.D.O. AI'
    },
    {
      id: 'CARDO-AUD-06',
      business_id: 'BIZ-2006',
      business_name: 'Iloilo Heritage Weaving & Crafts',
      dti_sec_reg_no: 'DTI-R06-991823',
      dti_sec_status: 'verified_active',
      cardo_ai_confidence: 98.1,
      bir_2303_status: 'verified_tax_compliant',
      mayors_permit_status: 'verified_valid',
      risk_level: 'LOW',
      last_audited_at: '2026-08-23 11:00:00',
      audited_by: 'C.A.R.D.O. AI'
    },
    {
      id: 'CARDO-AUD-07',
      business_id: 'BIZ-PEND-01',
      business_name: 'QuickDrop Manila Courier Services',
      dti_sec_reg_no: 'DTI-NCR-Pending-441',
      dti_sec_status: 'under_investigation',
      cardo_ai_confidence: 62.4,
      bir_2303_status: 'pending_upload',
      mayors_permit_status: 'under_lgu_check',
      risk_level: 'MODERATE',
      last_audited_at: '2026-08-28 08:30:00',
      audited_by: 'C.A.R.D.O. AI'
    },
    {
      id: 'CARDO-AUD-08',
      business_id: 'BIZ-PEND-02',
      business_name: 'BGC Dental & Wellness Clinic',
      dti_sec_reg_no: 'SEC-CS202511092',
      dti_sec_status: 'under_investigation',
      cardo_ai_confidence: 58.0,
      bir_2303_status: 'tin_mismatched',
      mayors_permit_status: 'expired',
      risk_level: 'HIGH',
      last_audited_at: '2026-08-27 14:15:00',
      audited_by: 'C.A.R.D.O. AI'
    }
  ];

  for (const c of cardoSeed) {
    executeRun(
      `INSERT OR REPLACE INTO cardo_compliance_audits (id, business_id, business_name, dti_sec_reg_no, dti_sec_status, cardo_ai_confidence, bir_2303_status, mayors_permit_status, risk_level, last_audited_at, audited_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [c.id, c.business_id, c.business_name, c.dti_sec_reg_no, c.dti_sec_status, c.cardo_ai_confidence, c.bir_2303_status, c.mayors_permit_status, c.risk_level, c.last_audited_at, c.audited_by]
    );
  }

  /* 4. SEED MERCHANT PIPELINE (Sales Team Trackers) */
  const pipelineSeed = [
    {
      id: 'PIPE-101',
      business_name: 'BGC Specialty Roast & Roastery',
      owner_name: 'Mateo Alcantara',
      email: 'mateo@bgcroasters.ph',
      phone: '+63 917 555 4910',
      industry: 'Food & Dining',
      city: 'Taguig (BGC)',
      stage: 'spotlight_converted',
      deal_value: 12000,
      referral_source: 'BNI Makati Pinnacle Chapter',
      referral_code: 'BNI-MAKATI-99',
      referrer_name: 'Atty. Grace Tan',
      assigned_sales_rep: 'Camille Dizon',
      contact_notes: 'Enterprise Verified Plan paid annual subscription with Spotlight Home Carousel placement.',
      last_activity_date: '2026-08-28',
      created_at: '2026-08-10'
    },
    {
      id: 'PIPE-102',
      business_name: 'Zenith Cloud & Cyber Solutions',
      owner_name: 'Engr. Paulo Delgado',
      email: 'paulo@zenithcloud.ph',
      phone: '+63 918 333 8122',
      industry: 'Web & Software',
      city: 'Makati City',
      stage: 'verified_onboarded',
      deal_value: 4999,
      referral_source: 'Philippine Web Developers Alliance',
      referral_code: 'PWDA-COMMERCE',
      referrer_name: 'DevAlliance Lead',
      assigned_sales_rep: 'Camille Dizon',
      contact_notes: 'Full KYB verified. Onboarding complete with verified trustmark badge rendered.',
      last_activity_date: '2026-08-27',
      created_at: '2026-08-12'
    },
    {
      id: 'PIPE-103',
      business_name: 'Cebu Organic Farms & Market',
      owner_name: 'Elena Soriano',
      email: 'elena@cebuorganic.ph',
      phone: '+63 920 111 9482',
      industry: 'Agriculture & Retail',
      city: 'Cebu City',
      stage: 'kyb_under_review',
      deal_value: 999,
      referral_source: 'Cebu Chamber of Commerce SME Group',
      referral_code: 'CCCI-CEBU-01',
      referrer_name: 'CCCI Secretariat',
      assigned_sales_rep: 'Camille Dizon',
      contact_notes: 'Submitted BIR 2303 and Cebu City Mayor permit. Currently in Auditor queue.',
      last_activity_date: '2026-08-26',
      created_at: '2026-08-15'
    },
    {
      id: 'PIPE-104',
      business_name: 'Davao Cold Chain Freight Express',
      owner_name: 'Rodrigo Tan Jr.',
      email: 'rodrigo@davaocoldchain.ph',
      phone: '+63 917 889 0122',
      industry: 'Logistics & Freight',
      city: 'Davao City',
      stage: 'doc_submission',
      deal_value: 4999,
      referral_source: 'DTI Negosyo Center NCR Hub',
      referral_code: 'DTI-NCR-2026',
      referrer_name: 'DTI Negosyo Specialist',
      assigned_sales_rep: 'Camille Dizon',
      contact_notes: 'Awaiting SEC Articles of Incorporation upload.',
      last_activity_date: '2026-08-25',
      created_at: '2026-08-18'
    },
    {
      id: 'PIPE-105',
      business_name: 'Clark Freeport Logistics Hub',
      owner_name: 'Vincent Yap',
      email: 'vincent@clarklogistics.ph',
      phone: '+63 919 444 3321',
      industry: 'Logistics & Freight',
      city: 'Angeles / Clark',
      stage: 'initial_outreach',
      deal_value: 999,
      referral_source: 'Organic Search',
      referral_code: 'ORGANIC-DIR',
      referrer_name: 'Direct Lead',
      assigned_sales_rep: 'Camille Dizon',
      contact_notes: 'Introductory call conducted. Demo scheduled for Friday.',
      last_activity_date: '2026-08-24',
      created_at: '2026-08-20'
    },
    {
      id: 'PIPE-106',
      business_name: 'Iloilo Craft Gin & Spirits',
      owner_name: 'Beatrice Gomez',
      email: 'beatrice@iloilogin.ph',
      phone: '+63 917 662 9011',
      industry: 'Food & Dining',
      city: 'Iloilo City',
      stage: 'lead_ingestion',
      deal_value: 499,
      referral_source: 'Sari-Sari Digitalization Program',
      referral_code: 'SARISARI-GOV',
      referrer_name: 'LGU Iloilo Lead',
      assigned_sales_rep: 'Camille Dizon',
      contact_notes: 'Newly registered lead from Iloilo Negosyo Fair.',
      last_activity_date: '2026-08-28',
      created_at: '2026-08-28'
    }
  ];

  for (const p of pipelineSeed) {
    executeRun(
      `INSERT OR REPLACE INTO merchant_pipeline (id, business_name, owner_name, email, phone, industry, city, stage, deal_value, referral_source, referral_code, referrer_name, assigned_sales_rep, contact_notes, last_activity_date, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [p.id, p.business_name, p.owner_name, p.email, p.phone, p.industry, p.city, p.stage, p.deal_value, p.referral_source, p.referral_code, p.referrer_name, p.assigned_sales_rep, p.contact_notes, p.last_activity_date, p.created_at, now]
    );
  }

  /* 5. SEED REFERRAL PARTNER DIRECTORY */
  const referralsSeed = [
    {
      id: 'REF-001',
      referrer_name: 'DTI Negosyo Center NCR Hub',
      referrer_email: 'negosyo.ncr@dti.gov.ph',
      referrer_type: 'dti_negosyo_center',
      referral_code: 'DTI-NCR-2026',
      total_referred_merchants: 48,
      converted_merchants: 39,
      conversion_rate: 81.3,
      commission_earned: 19500,
      commission_paid: 15000,
      status: 'active'
    },
    {
      id: 'REF-002',
      referrer_name: 'BNI Makati Pinnacle Chapter',
      referrer_email: 'partners@bnipinnacle.ph',
      referrer_type: 'bni_chapter',
      referral_code: 'BNI-MAKATI-99',
      total_referred_merchants: 34,
      converted_merchants: 28,
      conversion_rate: 82.4,
      commission_earned: 14000,
      commission_paid: 14000,
      status: 'active'
    },
    {
      id: 'REF-003',
      referrer_name: 'Cebu Chamber of Commerce SME Group',
      referrer_email: 'sme@cebuchamber.org.ph',
      referrer_type: 'partner_firm',
      referral_code: 'CCCI-CEBU-01',
      total_referred_merchants: 26,
      converted_merchants: 19,
      conversion_rate: 73.1,
      commission_earned: 9500,
      commission_paid: 5000,
      status: 'active'
    },
    {
      id: 'REF-004',
      referrer_name: 'Philippine Web Developers Alliance',
      referrer_email: 'commerce@pwda.dev',
      referrer_type: 'partner_firm',
      referral_code: 'PWDA-COMMERCE',
      total_referred_merchants: 22,
      converted_merchants: 18,
      conversion_rate: 81.8,
      commission_earned: 9000,
      commission_paid: 9000,
      status: 'active'
    },
    {
      id: 'REF-005',
      referrer_name: 'Sari-Sari Digitalization Program',
      referrer_email: 'msme@gov.ph',
      referrer_type: 'dti_negosyo_center',
      referral_code: 'SARISARI-GOV',
      total_referred_merchants: 55,
      converted_merchants: 41,
      conversion_rate: 74.5,
      commission_earned: 20500,
      commission_paid: 16000,
      status: 'active'
    }
  ];

  for (const r of referralsSeed) {
    executeRun(
      `INSERT OR REPLACE INTO referrals (id, referrer_name, referrer_email, referrer_type, referral_code, total_referred_merchants, converted_merchants, conversion_rate, commission_earned, commission_paid, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [r.id, r.referrer_name, r.referrer_email, r.referrer_type, r.referral_code, r.total_referred_merchants, r.converted_merchants, r.conversion_rate, r.commission_earned, r.commission_paid, r.status, now, now]
    );
  }

  /* 6. SEED STAFF COMPLIANCE & VERIFICATION OUTPUT METRICS */
  const staffPerfSeed = [
    {
      id: 'PERF-01',
      staff_id: 'STAFF-ADM-001',
      staff_name: 'Auditor Roberto Santos',
      role_name: 'Senior Compliance Auditor',
      department: 'Compliance & Verification Directorate',
      total_tickets_assigned: 52,
      total_tickets_resolved: 48,
      avg_review_time_mins: 16.4,
      compliance_accuracy_rate: 99.8,
      approvals_count: 42,
      rejections_count: 6,
      pending_in_review: 4,
      period_label: 'Q3 2026',
      last_active_at: '2026-08-28 17:15:00'
    },
    {
      id: 'PERF-02',
      staff_id: 'ADM-OPS-001',
      staff_name: 'Maria Elena Ramos',
      role_name: 'Operations Administrator',
      department: 'Operations Directorate',
      total_tickets_assigned: 38,
      total_tickets_resolved: 36,
      avg_review_time_mins: 14.2,
      compliance_accuracy_rate: 99.4,
      approvals_count: 31,
      rejections_count: 5,
      pending_in_review: 2,
      period_label: 'Q3 2026',
      last_active_at: '2026-08-28 16:40:00'
    },
    {
      id: 'PERF-03',
      staff_id: 'STF-AUD-002',
      staff_name: 'Atty. Cristina Valdez',
      role_name: 'Legal & Dispute Arbitrator',
      department: 'Compliance & Verification Directorate',
      total_tickets_assigned: 29,
      total_tickets_resolved: 27,
      avg_review_time_mins: 22.8,
      compliance_accuracy_rate: 100.0,
      approvals_count: 24,
      rejections_count: 3,
      pending_in_review: 2,
      period_label: 'Q3 2026',
      last_active_at: '2026-08-28 15:30:00'
    },
    {
      id: 'PERF-04',
      staff_id: 'STF-KYC-003',
      staff_name: 'Danilo Mendoza',
      role_name: 'Junior KYC Verifier',
      department: 'Compliance & Verification Directorate',
      total_tickets_assigned: 64,
      total_tickets_resolved: 59,
      avg_review_time_mins: 11.5,
      compliance_accuracy_rate: 98.6,
      approvals_count: 53,
      rejections_count: 6,
      pending_in_review: 5,
      period_label: 'Q3 2026',
      last_active_at: '2026-08-28 18:00:00'
    }
  ];

  for (const sp of staffPerfSeed) {
    executeRun(
      `INSERT OR REPLACE INTO staff_performance_metrics (id, staff_id, staff_name, role_name, department, total_tickets_assigned, total_tickets_resolved, avg_review_time_mins, compliance_accuracy_rate, approvals_count, rejections_count, pending_in_review, period_label, last_active_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [sp.id, sp.staff_id, sp.staff_name, sp.role_name, sp.department, sp.total_tickets_assigned, sp.total_tickets_resolved, sp.avg_review_time_mins, sp.compliance_accuracy_rate, sp.approvals_count, sp.rejections_count, sp.pending_in_review, sp.period_label, sp.last_active_at]
    );
  }
}

export function getProfiles() {
  return queryAll(`SELECT * FROM profiles ORDER BY created_at ASC`);
}

export function getProfileByUserId(userId) {
  return queryOne(`SELECT * FROM profiles WHERE user_id = ?`, [userId]);
}

export function getProfileByRole(role) {
  return queryOne(`SELECT * FROM profiles WHERE role = ?`, [role]);
}

export function getAuditLogsList({ action = null, keyword = null, limit = 100 } = {}) {
  let sql = `SELECT * FROM audit_logs WHERE 1=1`;
  const params = [];

  if (action && action !== 'ALL') {
    sql += ` AND action LIKE ?`;
    params.push(`%${action}%`);
  }

  if (keyword) {
    sql += ` AND (actor_name LIKE ? OR details LIKE ? OR entity_id LIKE ? OR action LIKE ?)`;
    const k = `%${keyword}%`;
    params.push(k, k, k, k);
  }

  sql += ` ORDER BY timestamp DESC LIMIT ?`;
  params.push(limit);

  return queryAll(sql, params);
}

export function getCardoAuditsList() {
  return queryAll(`SELECT * FROM cardo_compliance_audits ORDER BY last_audited_at DESC`);
}

export function getMerchantPipelineList({ stage = null, city = null } = {}) {
  let sql = `SELECT * FROM merchant_pipeline WHERE 1=1`;
  const params = [];

  if (stage && stage !== 'ALL') {
    sql += ` AND stage = ?`;
    params.push(stage);
  }

  if (city && city !== 'ALL') {
    sql += ` AND city LIKE ?`;
    params.push(`%${city}%`);
  }

  sql += ` ORDER BY created_at DESC`;
  return queryAll(sql, params);
}

export function getReferralsList() {
  return queryAll(`SELECT * FROM referrals ORDER BY total_referred_merchants DESC`);
}

export function getStaffPerformanceList() {
  return queryAll(`SELECT * FROM staff_performance_metrics ORDER BY total_tickets_resolved DESC`);
}



