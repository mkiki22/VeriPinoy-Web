import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const DB_FILE = path.join(process.cwd(), 'veripinoy.db');

let db = null;

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

/* Save SQLite Database file to disk atomically */
export function saveDatabase() {
  if (!db) return;
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    const tempFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tempFile, buffer);
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    console.error("Error saving database to disk:", err.message);
  }
}

/* Initialize Database Schema & Seed Data */
export async function initDatabase() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_FILE)) {
    try {
      const fileBuffer = fs.readFileSync(DB_FILE);
      if (!fileBuffer || fileBuffer.length === 0) {
        throw new Error("Database file is empty");
      }
      db = new SQL.Database(fileBuffer);
      db.run('PRAGMA integrity_check;');
    } catch (e) {
      console.warn("Existing db file corrupted or invalid, creating fresh database:", e.message);
      try { fs.unlinkSync(DB_FILE); } catch (_) {}
      db = new SQL.Database();
    }
  } else {
    db = new SQL.Database();
  }

  // Enable Foreign Keys
  db.run('PRAGMA foreign_keys = ON;');

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
      review_status TEXT DEFAULT 'published', -- published, hidden, under_review, removed
      flagged_status INTEGER DEFAULT 0,
      flag_reason TEXT,
      flagged_by_business INTEGER DEFAULT 0,
      flagged_date TEXT,
      official_response TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
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

  /* CREATE INDEXES FOR PERFORMANCE */
  db.run(`CREATE INDEX IF NOT EXISTS idx_active_sessions_hash ON active_sessions(session_token_hash);`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_active_sessions_user ON active_sessions(user_id);`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_sec_alerts_user ON security_alerts(user_id);`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_vault_docs_entity ON vault_documents(entity_id);`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_dup_registry_hash ON duplicate_check_registry(field_value_hash);`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_kyc_apps_status ON kyc_applications(verification_status);`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_kyb_apps_status ON kyb_applications(verification_status);`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_reviews_biz ON customer_reviews(business_id);`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_admin_id);`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_case_assign_case ON case_assignments(case_id);`);

  /* ==========================================================================
     SEED INITIAL MASTER DATA IF TABLES ARE EMPTY
     ========================================================================== */
  seedDatabaseIfEmpty();

  saveDatabase();
  console.log('VeriPinoy Database Backend initialized successfully with SQLite.');
}

/* Query Wrappers for sql.js */
function sanitizeParams(params = []) {
  return params.map(p => (p === undefined ? null : p));
}

export function queryAll(sqlStr, params = []) {
  const stmt = db.prepare(sqlStr);
  stmt.bind(sanitizeParams(params));
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

export function queryOne(sqlStr, params = []) {
  const rows = queryAll(sqlStr, params);
  return rows.length > 0 ? rows[0] : null;
}

export function executeRun(sqlStr, params = []) {
  db.run(sqlStr, sanitizeParams(params));
  saveDatabase();
}

/* Seeding Master Data */
function seedDatabaseIfEmpty() {
  const userCheck = queryOne('SELECT COUNT(*) as count FROM admin_users');
  const freelancerCheck = queryOne('SELECT COUNT(*) as count FROM freelancer_profiles');

  const now = new Date().toISOString();

  // Always ensure all pricing plans and aliases are seeded/updated
  seedPricingPlans(now);
  seedSecurityData(now);

  if (!freelancerCheck || freelancerCheck.count === 0) {
    seedFreelancerData(now);
  }

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
    { code: 'kyb.approve', name: 'Approve KYB', category: 'KYB Business Verification', description: 'Grant Tatak Pinoy verified badge to business' },
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
      reviewer_notes: JSON.stringify([{ author: 'Elena Reyes (Senior KYB Auditor)', text: 'SEC Certificate and 2026 Makati Mayor Permit fully cross-referenced against LGU database. BIR 2303 TIN 402-918-204-000 active. Tatak Pinoy verified merchant badge granted.', timestamp: now }]),
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
    { id: 'NOTIF-KYB-102', recipient_type: 'business', recipient_id: '3', type: 'permit_expiry_warning', title: '⏰ Annual Mayor\'s Permit Renewal Notice', message: 'Makati LGU Mayor\'s Permit renewal window is approaching (valid through Dec 31, 2026). Upload early to retain continuous Tatak Pinoy badge.', link: '#m-panel-kyb' },
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
        'Tatak Pinoy, Tatak Sigurado Gold Badge',
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
      description: 'Official Tatak Pinoy KYB Business Badge, business verification page, customer review & claim management.',
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
        'Tatak Pinoy, Tatak Sigurado Gold Badge',
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
  const check = queryOne('SELECT COUNT(*) as count FROM freelancer_profiles');
  if (check && check.count > 0) return;

  /* PORTAL USERS SEED DATA */
  const custPass = hashPassword('Password123!');
  const bizPass = hashPassword('Password123!');
  const frPass = hashPassword('Password123!');

  // Seed Customer User & Profile
  executeRun(
    `INSERT INTO users (id, email, password_hash, full_name, mobile_number, user_type, account_status, email_verified, created_at, updated_at)
     VALUES ('USR-CUST-1001', 'customer@veripinoy.ph', ?, 'Maria Clara De Los Santos', '09171234567', 'customer', 'active', 1, ?, ?)`,
    [custPass.hash, now, now]
  );

  executeRun(
    `INSERT INTO customer_profiles (id, user_id, first_name, last_name, country, kyc_status, created_at, updated_at)
     VALUES ('CUST-1001', 'USR-CUST-1001', 'Maria Clara', 'De Los Santos', 'Philippines', 'unverified', ?, ?)`,
    [now, now]
  );

  // Seed Business User, Business & Business Team
  executeRun(
    `INSERT INTO users (id, email, password_hash, full_name, mobile_number, user_type, account_status, email_verified, created_at, updated_at)
     VALUES ('USR-BIZ-2001', 'owner@manilabakery.ph', ?, 'Juan Dela Cruz', '09189876543', 'business', 'active', 1, ?, ?)`,
    [bizPass.hash, now, now]
  );

  executeRun(
    `INSERT INTO businesses (id, user_id, business_name, business_email, business_phone, business_type, industry, country, business_address, website, social_media, authorized_representative, account_status, verification_status, rating, review_count, created_at, updated_at)
     VALUES ('BIZ-2001', 'USR-BIZ-2001', 'Manila Artisan Bakery & Cafe', 'contact@manilabakery.ph', '09189876543', 'Corporation', 'Food & Dining', 'Philippines', '123 Katipunan Ave, Quezon City', 'https://manilabakery.ph', '@manilabakery', 'Juan Dela Cruz', 'active', 'verified', 4.9, 128, ?, ?)`,
    [now, now]
  );

  executeRun(
    `INSERT INTO business_users (id, business_id, user_id, name, email, role, status, created_at, updated_at)
     VALUES ('BUSR-1', 'BIZ-2001', 'USR-BIZ-2001', 'Juan Dela Cruz', 'owner@manilabakery.ph', 'owner', 'active', ?, ?)`,
    [now, now]
  );

  executeRun(
    `INSERT INTO business_users (id, business_id, user_id, name, email, role, status, created_at, updated_at)
     VALUES ('BUSR-2', 'BIZ-2001', 'USR-BIZ-2002', 'Ana Reyes', 'manager@manilabakery.ph', 'admin', 'active', ?, ?)`,
    [now, now]
  );

  executeRun(
    `INSERT INTO business_users (id, business_id, user_id, name, email, role, status, created_at, updated_at)
     VALUES ('BUSR-3', 'BIZ-2001', 'USR-BIZ-2003', 'Carlos Tan', 'staff@manilabakery.ph', 'staff', 'active', ?, ?)`,
    [now, now]
  );

  // Seed Freelancer User
  executeRun(
    `INSERT INTO users (id, email, password_hash, full_name, mobile_number, user_type, account_status, email_verified, created_at, updated_at)
     VALUES ('USER-FR-10284', 'freelancer@marcoreyes.dev', ?, 'Marco Antonio Reyes', '09191112233', 'freelancer', 'active', 1, ?, ?)`,
    [frPass.hash, now, now]
  );

  /* FREELANCER PROFILES SEED DATA */
  executeRun(
    `INSERT INTO freelancer_profiles (id, user_id, full_name, professional_name, profile_photo, professional_category, skills, location, years_of_experience, portfolio_links, website_social_links, verification_status, kyc_verification_status, date_verified, profile_status, created_at, updated_at)
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
    `INSERT INTO freelancer_verifications (id, freelancer_id, kyc_application_id, reviewer_id, reviewer_notes, verification_status, submitted_at, reviewed_at)
     VALUES ('FR-VER-8801', 'VP-FR-10284', 'KYC-10452', 'STF-107', 'Philippine National ID verified. Portfolio links and identity matched successfully.', 'approved', ?, ?)`,
    [now, now]
  );

  /* FREELANCER ENGAGEMENTS */
  executeRun(
    `INSERT INTO freelancer_engagements (id, freelancer_id, client_identifier, project_name, project_description, contract_ref, agreed_amount, currency, payment_terms, start_date, expected_completion_date, completion_status, payment_status, supporting_documents, created_at, updated_at)
     VALUES ('ENG-901', 'VP-FR-10284', 'ABC Company (Metro Manila Retail)', 'E-Commerce Web Portal Development', 'Full-stack online store with inventory synchronization, payment gateway integration, and customer order management.', 'CTR-2026-8819', 50000, 'PHP', '50% upfront / 50% upon milestone completion', '2026-07-01', '2026-07-30', 'delivered', 'in_dispute', ?, ?, ?)`,
    [
      JSON.stringify([{ name: 'Statement_of_Work_SOW_Signed.pdf', path: '/docs/SOW_ABC_Company.pdf' }]),
      now,
      now
    ]
  );

  executeRun(
    `INSERT INTO freelancer_engagements (id, freelancer_id, client_identifier, project_name, project_description, contract_ref, agreed_amount, currency, payment_terms, start_date, expected_completion_date, completion_status, payment_status, supporting_documents, created_at, updated_at)
     VALUES ('ENG-902', 'VP-FR-10284', 'Nexus Digital Media Inc', 'Mobile Fintech App UI & Secure API Architecture', 'React Native mobile application frontend paired with high-concurrency Node.js REST APIs and real-time transaction ledger.', 'CTR-2026-9042', 85000, 'PHP', 'Milestone-based (3 Milestones)', '2026-08-01', '2026-09-15', 'in_progress', 'partially_paid', ?, ?, ?)`,
    [
      JSON.stringify([{ name: 'Master_Services_Agreement_MSA.pdf', path: '/docs/MSA_Nexus_Digital.pdf' }]),
      now,
      now
    ]
  );

  executeRun(
    `INSERT INTO freelancer_engagements (id, freelancer_id, client_identifier, project_name, project_description, contract_ref, agreed_amount, currency, payment_terms, start_date, expected_completion_date, completion_status, payment_status, supporting_documents, created_at, updated_at)
     VALUES ('ENG-903', 'VP-FR-10284', 'Bahay Kubo Enterprise', 'Cloud Inventory Synchronization Engine', 'Automated webhook engine syncing POS terminal orders with cloud inventory databases and automated supplier re-orders.', 'CTR-2026-9110', 35000, 'PHP', 'Hourly rate (₱1,500/hr) capped at ₱35,000', '2026-08-10', '2026-08-28', 'in_progress', 'invoiced', ?, ?, ?)`,
    [
      JSON.stringify([{ name: 'Inventory_Sync_Spec_Signed.pdf', path: '/docs/Spec_BahayKubo.pdf' }]),
      now,
      now
    ]
  );

  /* FREELANCER MILESTONES */
  executeRun(
    `INSERT INTO freelancer_milestones (id, engagement_id, freelancer_id, milestone_title, milestone_description, amount, currency, due_date, status, created_at, updated_at)
     VALUES ('MLS-901-1', 'ENG-901', 'VP-FR-10284', 'Milestone 1: Database Architecture & Core API Wireframes', 'Database ERD schemas, secure API routing, and backend auth integration.', 25000, 'PHP', '2026-07-15', 'paid', ?, ?)`,
    [now, now]
  );

  executeRun(
    `INSERT INTO freelancer_milestones (id, engagement_id, freelancer_id, milestone_title, milestone_description, amount, currency, due_date, status, created_at, updated_at)
     VALUES ('MLS-901-2', 'ENG-901', 'VP-FR-10284', 'Milestone 2: Payment Gateway, Storefront Delivery & UAT Signoff', 'Final store delivery, payment gateway testing, and signed UAT.', 25000, 'PHP', '2026-07-30', 'disputed', ?, ?)`,
    [now, now]
  );

  executeRun(
    `INSERT INTO freelancer_milestones (id, engagement_id, freelancer_id, milestone_title, milestone_description, amount, currency, due_date, status, created_at, updated_at)
     VALUES ('MLS-902-1', 'ENG-902', 'VP-FR-10284', 'Milestone 1: UI Component Design System & State Management', 'High-fidelity Figma implementation, reusable tokenized UI components, and state store architecture.', 30000, 'PHP', '2026-08-10', 'paid', ?, ?)`,
    [now, now]
  );

  executeRun(
    `INSERT INTO freelancer_milestones (id, engagement_id, freelancer_id, milestone_title, milestone_description, amount, currency, due_date, status, created_at, updated_at)
     VALUES ('MLS-902-2', 'ENG-902', 'VP-FR-10284', 'Milestone 2: Secure API Integration & Deliverable Testing', 'REST API client endpoints, OAuth2 token refresh, and integration test suite.', 35000, 'PHP', '2026-08-25', 'pending_review', ?, ?)`,
    [now, now]
  );

  executeRun(
    `INSERT INTO freelancer_milestones (id, engagement_id, freelancer_id, milestone_title, milestone_description, amount, currency, due_date, status, created_at, updated_at)
     VALUES ('MLS-902-3', 'ENG-902', 'VP-FR-10284', 'Milestone 3: Production Deployment, CI/CD Pipeline & Audit Logs', 'Cloud Run deployment pipeline, SSL pinning, and DPA audit log compliance.', 20000, 'PHP', '2026-09-15', 'in_progress', ?, ?)`,
    [now, now]
  );

  /* FREELANCER WORK LOGS */
  executeRun(
    `INSERT INTO freelancer_work_logs (id, freelancer_id, engagement_id, milestone_id, log_type, title, description, hours_logged, hourly_rate, total_amount, deliverable_links, attachments, status, reviewer_feedback, reviewed_by, reviewed_at, invoice_id, created_at, updated_at)
     VALUES ('WLOG-101', 'VP-FR-10284', 'ENG-902', 'MLS-902-1', 'milestone', 'Completed UI Component Design System & Navigation Engine', 'Built responsive screens, dark/light theme tokens, and biometric login authentication screen flows.', 0, 0, 30000, ?, ?, 'paid', 'Excellent execution and clean codebase. Approved for payment release.', 'Nexus Reviewer (Sarah Lim)', '2026-08-12 11:30:00', 'INV-FR-301', ?, ?)`,
    [
      JSON.stringify(['https://github.com/marcoreyes-dev/nexus-fintech-ui', 'https://nexus-demo-staging.app.ph']),
      JSON.stringify(['ui_design_spec_v1.pdf', 'component_tokens_export.json']),
      now,
      now
    ]
  );

  executeRun(
    `INSERT INTO freelancer_work_logs (id, freelancer_id, engagement_id, milestone_id, log_type, title, description, hours_logged, hourly_rate, total_amount, deliverable_links, attachments, status, reviewer_feedback, reviewed_by, reviewed_at, invoice_id, created_at, updated_at)
     VALUES ('WLOG-102', 'VP-FR-10284', 'ENG-902', 'MLS-902-2', 'milestone', 'Implemented Encrypted API Endpoints & Transaction Engine', 'Completed AES-256 payload encryption, webhook listeners, and comprehensive automated test suites.', 0, 0, 35000, ?, ?, 'pending_review', NULL, NULL, NULL, NULL, ?, ?)`,
    [
      JSON.stringify(['https://github.com/marcoreyes-dev/nexus-fintech-core/pull/18', 'https://api-staging.nexus.ph/docs']),
      JSON.stringify(['api_security_audit_results.pdf', 'postman_collection_v2.json']),
      now,
      now
    ]
  );

  executeRun(
    `INSERT INTO freelancer_work_logs (id, freelancer_id, engagement_id, milestone_id, log_type, title, description, hours_logged, hourly_rate, total_amount, deliverable_links, attachments, status, reviewer_feedback, reviewed_by, reviewed_at, invoice_id, created_at, updated_at)
     VALUES ('WLOG-103', 'VP-FR-10284', 'ENG-903', NULL, 'hourly', 'Real-Time Webhook Synchronization & POS Queue Worker', 'Engineered robust retry backoff algorithms for POS intermittent network drops and SQLite transaction syncing.', 16, 1500, 24000, ?, ?, 'approved', 'Verified POS load test results. Approved for invoice generation.', 'Bahay Kubo Tech Lead', '2026-08-18 16:00:00', 'INV-FR-303', ?, ?)`,
    [
      JSON.stringify(['https://github.com/marcoreyes-dev/bahay-kubo-sync/tree/main/workers']),
      JSON.stringify(['pos_sync_architecture_diagram.pdf', 'load_stress_benchmark.csv']),
      now,
      now
    ]
  );

  executeRun(
    `INSERT INTO freelancer_work_logs (id, freelancer_id, engagement_id, milestone_id, log_type, title, description, hours_logged, hourly_rate, total_amount, deliverable_links, attachments, status, reviewer_feedback, reviewed_by, reviewed_at, invoice_id, created_at, updated_at)
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
    `INSERT INTO freelancer_invoices (id, freelancer_id, engagement_id, milestone_id, work_log_ids, invoice_number, client_identifier, client_email, amount, currency, due_date, status, payment_method, paid_at, receipt_number, notes, history, created_at, updated_at)
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
    `INSERT INTO freelancer_invoices (id, freelancer_id, engagement_id, milestone_id, work_log_ids, invoice_number, client_identifier, client_email, amount, currency, due_date, status, payment_method, paid_at, receipt_number, notes, history, created_at, updated_at)
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
    `INSERT INTO freelancer_invoices (id, freelancer_id, engagement_id, milestone_id, work_log_ids, invoice_number, client_identifier, client_email, amount, currency, due_date, status, payment_method, paid_at, receipt_number, notes, history, created_at, updated_at)
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
    `INSERT INTO freelancer_payments (id, engagement_id, invoice_id, amount, currency, payment_date, payment_method, proof_file, status, created_at)
     VALUES ('PAY-FR-801', 'ENG-902', 'INV-FR-301', 30000, 'PHP', '2026-08-15 14:30:00', 'GCash Direct Gateway', '/receipts/RCP-2026-9901.pdf', 'confirmed', ?)`,
    [now]
  );

  /* FREELANCER DISPUTE */
  executeRun(
    `INSERT INTO freelancer_disputes (id, freelancer_id, client_identifier, engagement_id, dispute_category, amount_disputed, currency, description, contract_evidence, case_status, assigned_reviewer_id, reviewer_notes, resolution, resolution_date, created_at, updated_at)
     VALUES ('FR-DISP-401', 'VP-FR-10284', 'ABC Company', 'ENG-901', 'Non-payment', 25000, 'PHP', 'Final 50% completion payment milestone past due by 12 days after successful store delivery, bug clearance, and signed UAT.', '/docs/SOW_ABC_Company.pdf', 'Client Responded', 'STF-107', 'Client uploaded bank transfer receipt inquiry. Reviewer inspecting timestamp match.', NULL, NULL, ?, ?)`,
    [now, now]
  );

  /* CLIENT RESPONSE */
  executeRun(
    `INSERT INTO client_responses (id, dispute_id, client_identifier, response_text, payment_proof_info, submitted_at)
     VALUES ('CR-1002', 'FR-DISP-401', 'ABC Company', 'We acknowledge delivery of the website. Remaining ₱25,000 balance is currently being processed by accounting following our standard 15-day vendor payment cycle.', 'Bank voucher ref #BDO-992015 issued August 10', ?)`,
    [now]
  );

  /* FREELANCER EVIDENCE */
  executeRun(
    `INSERT INTO freelancer_evidence (id, case_id, uploader_type, uploader_id, file_name, file_type, file_size, description, file_storage_path, access_history, created_at)
     VALUES ('EVI-701', 'FR-DISP-401', 'freelancer', 'VP-FR-10284', 'Signed_UAT_Signoff_Receipt.pdf', 'application/pdf', '1.2 MB', 'User Acceptance Testing (UAT) signoff document signed by ABC Company project manager.', '/private/EVI-701.pdf', '[]', ?)`,
    [now]
  );

  /* FREELANCER INVOICE & PAYMENT */
  executeRun(
    `INSERT INTO freelancer_invoices (id, freelancer_id, engagement_id, invoice_number, amount, currency, due_date, status, notes, created_at)
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
      risk_factors: [{ factor: 'Tatak Pinoy KYB Verified Badge Granted', weight: '-10' }, { factor: 'Active Bank & DTI Clean History', weight: '0' }],
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
