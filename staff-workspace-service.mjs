import { queryAll, queryOne, executeRun } from './db.mjs';
import { hashPassword } from './db.mjs';

/* ==========================================================================
   STAFF ACCOUNT MANAGEMENT
   ========================================================================== */

export function listStaffAccounts() {
  const users = queryAll(`
    SELECT u.id, u.email, u.name, u.status, u.last_login, u.must_reset_password, u.mfa_status, u.created_at,
           r.id as roleId, r.name as roleName
    FROM admin_users u
    LEFT JOIN admin_user_roles ur ON u.id = ur.admin_user_id
    LEFT JOIN roles r ON ur.role_id = r.id
  `);

  return users.map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    roleId: u.roleId || 'auditor',
    roleName: u.roleName || 'Auditor',
    status: u.status,
    mustResetPassword: !!u.must_reset_password,
    requireMFA: u.mfa_status === 'enabled',
    lastLogin: u.last_login,
    createdAt: u.created_at
  }));
}

export function getStaffAccount(staffId) {
  const u = queryOne(`
    SELECT u.id, u.email, u.name, u.status, u.last_login, u.must_reset_password, u.mfa_status, u.created_at,
           r.id as roleId, r.name as roleName
    FROM admin_users u
    LEFT JOIN admin_user_roles ur ON u.id = ur.admin_user_id
    LEFT JOIN roles r ON ur.role_id = r.id
    WHERE u.id = ?
  `, [staffId]);

  if (!u) return null;

  return {
    id: u.id,
    name: u.name,
    email: u.email,
    roleId: u.roleId || 'auditor',
    roleName: u.roleName || 'Auditor',
    status: u.status,
    mustResetPassword: !!u.must_reset_password,
    requireMFA: u.mfa_status === 'enabled',
    lastLogin: u.last_login,
    createdAt: u.created_at
  };
}

export function findStaffByEmail(email) {
  return queryOne('SELECT id FROM admin_users WHERE LOWER(email) = LOWER(?)', [email]);
}

export function getStaffRole(staffId) {
  return queryOne('SELECT role_id FROM admin_user_roles WHERE admin_user_id = ?', [staffId]);
}

export function createStaffAccount({ name, email, password, roleId, requireMFA, mustResetPassword }) {
  const newId = `STF-${Math.floor(100 + Math.random() * 900)}`;
  const passHash = hashPassword(password).hash;
  const now = new Date().toISOString();

  executeRun(
    `INSERT INTO admin_users (id, email, password_hash, name, status, must_reset_password, mfa_status, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'active', ?, ?, ?, ?)`,
    [newId, email, passHash, name, mustResetPassword !== false ? 1 : 0, requireMFA ? 'enabled' : 'disabled', now, now]
  );

  executeRun('INSERT INTO admin_user_roles (admin_user_id, role_id) VALUES (?, ?)', [newId, roleId]);

  return { staffId: newId, name, email, roleId };
}

export function updateStaffAccount(staffId, { roleId, status, requireMFA, mustResetPassword }) {
  const now = new Date().toISOString();

  if (status) {
    executeRun('UPDATE admin_users SET status = ?, updated_at = ? WHERE id = ?', [status, now, staffId]);
  }
  if (requireMFA !== undefined) {
    executeRun('UPDATE admin_users SET mfa_status = ? WHERE id = ?', [requireMFA ? 'enabled' : 'disabled', staffId]);
  }
  if (mustResetPassword !== undefined) {
    executeRun('UPDATE admin_users SET must_reset_password = ? WHERE id = ?', [mustResetPassword ? 1 : 0, staffId]);
  }
  if (roleId) {
    executeRun('DELETE FROM admin_user_roles WHERE admin_user_id = ?', [staffId]);
    executeRun('INSERT INTO admin_user_roles (admin_user_id, role_id) VALUES (?, ?)', [staffId, roleId]);
  }
}

export function resetStaffPassword(staffId, newPassword) {
  const passHash = hashPassword(newPassword || 'VeriPinoyReset2026!').hash;
  const now = new Date().toISOString();

  executeRun(
    'UPDATE admin_users SET password_hash = ?, must_reset_password = 1, password_changed_at = ? WHERE id = ?',
    [passHash, now, staffId]
  );

  executeRun('DELETE FROM admin_sessions WHERE admin_user_id = ?', [staffId]);
}

/* ==========================================================================
   ROLE MANAGEMENT
   ========================================================================== */

export function listRoles() {
  const roles = queryAll('SELECT id, name, description, is_system_role FROM roles');

  return roles.map(r => {
    const permRows = queryAll('SELECT permission_code FROM role_permissions WHERE role_id = ?', [r.id]);
    return {
      id: r.id,
      name: r.name,
      isSystemRole: !!r.is_system_role,
      description: r.description,
      permissions: permRows.map(p => p.permission_code)
    };
  });
}

export function findRoleByIdOrName(id, name) {
  return queryOne('SELECT * FROM roles WHERE id = ? OR name = ?', [id, name]);
}

export function updateRole(roleId, { name, description, permissions }) {
  const now = new Date().toISOString();
  const existing = queryOne('SELECT * FROM roles WHERE id = ?', [roleId]);

  executeRun(
    'UPDATE roles SET name = ?, description = ?, updated_at = ? WHERE id = ?',
    [name, description || (existing ? existing.description : ''), now, roleId]
  );

  executeRun('DELETE FROM role_permissions WHERE role_id = ?', [roleId]);
  for (const pCode of permissions) {
    executeRun('INSERT INTO role_permissions (role_id, permission_code) VALUES (?, ?)', [roleId, pCode]);
  }
}

export function createRole({ id, name, description, permissions }) {
  const roleId = id || `role_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
  const now = new Date().toISOString();

  executeRun(
    'INSERT INTO roles (id, name, description, is_system_role, created_at, updated_at) VALUES (?, ?, ?, 0, ?, ?)',
    [roleId, name, description || 'Custom VeriPinoy staff role.', now, now]
  );

  for (const pCode of permissions) {
    executeRun('INSERT INTO role_permissions (role_id, permission_code) VALUES (?, ?)', [roleId, pCode]);
  }

  return roleId;
}

export function listPermissions() {
  return queryAll('SELECT code, name, category, description FROM permissions ORDER BY category, code');
}

/* ==========================================================================
   CASE MANAGEMENT & QUEUES
   ========================================================================== */

export function listCases({ type, queue, search, staffId }) {
  const kycRows = queryAll(`
    SELECT k.id, 'kyc' as type, k.applicant_name as title, k.applicant_name as applicantName,
           k.document_type as documentType, k.risk_level as riskLevel, k.verification_status as status,
           k.assigned_reviewer_id as assignedToId, u.name as assignedToName,
           k.initial_reviewer_id as initialReviewerId, k.escalated_by_id as escalatedById,
           k.submission_date as submittedAt, k.updated_at as updatedAt, k.reviewer_notes as notes
    FROM kyc_applications k
    LEFT JOIN admin_users u ON k.assigned_reviewer_id = u.id
  `);

  const kybRows = queryAll(`
    SELECT k.id, 'kyb' as type, k.legal_business_name as title, k.legal_business_name as applicantName,
           'SEC/DTI Business Filing' as documentType, k.risk_level as riskLevel, k.verification_status as status,
           k.assigned_reviewer_id as assignedToId, u.name as assignedToName,
           k.initial_reviewer_id as initialReviewerId, k.escalated_by_id as escalatedById,
           k.submission_date as submittedAt, k.updated_at as updatedAt, k.reviewer_notes as notes
    FROM kyb_applications k
    LEFT JOIN admin_users u ON k.assigned_reviewer_id = u.id
  `);

  const modRows = queryAll(`
    SELECT m.id, 'review' as type, ('Flagged Review ' || m.review_id) as title,
           ('Business ID ' || m.business_id) as applicantName,
           m.flag_reason as documentType, m.priority as riskLevel, m.case_status as status,
           m.assigned_reviewer_id as assignedToId, u.name as assignedToName,
           NULL as initialReviewerId, NULL as escalatedById,
           m.created_at as submittedAt, m.updated_at as updatedAt, '[]' as notes
    FROM review_moderation_cases m
    LEFT JOIN admin_users u ON m.assigned_reviewer_id = u.id
  `);

  let allCases = [...kycRows, ...kybRows, ...modRows];

  allCases = allCases.map(c => {
    let parsedNotes = [];
    try { parsedNotes = JSON.parse(c.notes || '[]'); } catch (e) { parsedNotes = []; }
    return { ...c, notes: parsedNotes };
  });

  if (type) {
    allCases = allCases.filter(c => c.type === type);
  }

  if (queue) {
    if (queue === 'assigned_to_me') {
      allCases = allCases.filter(c => c.assignedToId === staffId);
    } else if (queue === 'unassigned') {
      allCases = allCases.filter(c => !c.assignedToId && c.status !== 'completed' && c.status !== 'rejected');
    } else if (queue === 'in_progress') {
      allCases = allCases.filter(c => c.status === 'in_progress' || c.status === 'awaiting_docs');
    } else if (queue === 'completed') {
      allCases = allCases.filter(c => c.status === 'completed' || c.status === 'approved' || c.status === 'rejected');
    } else if (queue === 'escalated') {
      allCases = allCases.filter(c => c.status === 'escalated');
    }
  }

  if (search) {
    const q = search.toLowerCase();
    allCases = allCases.filter(c =>
      c.id.toLowerCase().includes(q) ||
      c.title.toLowerCase().includes(q) ||
      c.applicantName.toLowerCase().includes(q)
    );
  }

  return allCases;
}

export function getCaseDetail(caseId) {
  let item = null;
  let docs = [];

  if (caseId.startsWith('KYC-')) {
    const k = queryOne('SELECT * FROM kyc_applications WHERE id = ?', [caseId]);
    if (k) {
      const u = k.assigned_reviewer_id ? queryOne('SELECT name FROM admin_users WHERE id = ?', [k.assigned_reviewer_id]) : null;
      item = {
        id: k.id,
        type: 'kyc',
        title: `Individual Vendor KYC — ${k.applicant_name}`,
        applicantName: k.applicant_name,
        documentType: k.document_type,
        riskLevel: k.risk_level,
        status: k.verification_status,
        assignedToId: k.assigned_reviewer_id,
        assignedToName: u ? u.name : null,
        initialReviewerId: k.initial_reviewer_id,
        escalatedById: k.escalated_by_id,
        submittedAt: k.submission_date,
        updatedAt: k.updated_at,
        notes: JSON.parse(k.reviewer_notes || '[]')
      };
      const docRows = queryAll('SELECT * FROM kyc_documents WHERE kyc_application_id = ?', [caseId]);
      docs = docRows.map(d => ({ name: d.file_name, size: d.file_size, status: d.doc_status, id: d.id }));
    }
  } else if (caseId.startsWith('KYB-')) {
    const k = queryOne('SELECT * FROM kyb_applications WHERE id = ?', [caseId]);
    if (k) {
      const u = k.assigned_reviewer_id ? queryOne('SELECT name FROM admin_users WHERE id = ?', [k.assigned_reviewer_id]) : null;
      item = {
        id: k.id,
        type: 'kyb',
        title: `${k.legal_business_name} Filing`,
        applicantName: k.legal_business_name,
        documentType: `SEC/DTI ${k.registration_number}`,
        riskLevel: k.risk_level,
        status: k.verification_status,
        assignedToId: k.assigned_reviewer_id,
        assignedToName: u ? u.name : null,
        initialReviewerId: k.initial_reviewer_id,
        escalatedById: k.escalated_by_id,
        submittedAt: k.submission_date,
        updatedAt: k.updated_at,
        notes: JSON.parse(k.reviewer_notes || '[]')
      };
      const docRows = queryAll('SELECT * FROM kyb_documents WHERE kyb_application_id = ?', [caseId]);
      docs = docRows.map(d => ({ name: d.file_name, size: d.file_size, status: d.doc_status, id: d.id }));
    }
  } else if (caseId.startsWith('CASE-')) {
    const m = queryOne('SELECT * FROM review_moderation_cases WHERE id = ?', [caseId]);
    if (m) {
      const u = m.assigned_reviewer_id ? queryOne('SELECT name FROM admin_users WHERE id = ?', [m.assigned_reviewer_id]) : null;
      item = {
        id: m.id,
        type: 'review',
        title: `Flagged Review ${m.review_id} Moderation`,
        applicantName: `Merchant Complaint (Business #${m.business_id})`,
        documentType: m.flag_reason,
        riskLevel: m.priority,
        status: m.case_status,
        assignedToId: m.assigned_reviewer_id,
        assignedToName: u ? u.name : null,
        initialReviewerId: null,
        escalatedById: null,
        submittedAt: m.created_at,
        updatedAt: m.updated_at,
        notes: []
      };
      const evRows = queryAll('SELECT * FROM business_evidence WHERE moderation_case_id = ?', [caseId]);
      docs = evRows.map(e => ({ name: e.file_name, size: e.file_size, status: 'Submitted Evidence', id: e.id }));
    }
  }

  if (!item) return null;

  item.documents = docs;

  const historyRows = queryAll(`
    SELECT ca.*, u1.name as newReviewerName, u2.name as assignedByName, u3.name as previousReviewerName
    FROM case_assignments ca
    LEFT JOIN admin_users u1 ON ca.assigned_admin_id = u1.id
    LEFT JOIN admin_users u2 ON ca.assigned_by_id = u2.id
    LEFT JOIN admin_users u3 ON ca.previous_assignee_id = u3.id
    WHERE ca.case_id = ?
    ORDER BY ca.assignment_date DESC
  `, [caseId]);

  const history = historyRows.map(h => ({
    id: h.id,
    caseId: h.case_id,
    previousReviewerName: h.previousReviewerName || 'Unassigned',
    newReviewerName: h.newReviewerName || 'Unassigned',
    assignedByName: h.assignedByName || 'System',
    timestamp: h.assignment_date,
    reason: h.reassignment_reason
  }));

  return { case: item, history };
}

export function assignCase(caseId, { targetStaffId, reason, assignedById }) {
  const now = new Date().toISOString();
  const targetStaff = targetStaffId ? queryOne('SELECT * FROM admin_users WHERE id = ?', [targetStaffId]) : null;
  let prevReviewerId = null;

  if (caseId.startsWith('KYC-')) {
    const k = queryOne('SELECT assigned_reviewer_id FROM kyc_applications WHERE id = ?', [caseId]);
    if (!k) return { error: 'KYC Case not found', status: 404 };
    prevReviewerId = k.assigned_reviewer_id;
    executeRun(
      `UPDATE kyc_applications SET assigned_reviewer_id = ?, verification_status = 'in_progress', updated_at = ? WHERE id = ?`,
      [targetStaff ? targetStaff.id : null, now, caseId]
    );
  } else if (caseId.startsWith('KYB-')) {
    const k = queryOne('SELECT assigned_reviewer_id FROM kyb_applications WHERE id = ?', [caseId]);
    if (!k) return { error: 'KYB Case not found', status: 404 };
    prevReviewerId = k.assigned_reviewer_id;
    executeRun(
      `UPDATE kyb_applications SET assigned_reviewer_id = ?, verification_status = 'in_progress', updated_at = ? WHERE id = ?`,
      [targetStaff ? targetStaff.id : null, now, caseId]
    );
  } else if (caseId.startsWith('CASE-')) {
    const m = queryOne('SELECT assigned_reviewer_id FROM review_moderation_cases WHERE id = ?', [caseId]);
    if (!m) return { error: 'Moderation Case not found', status: 404 };
    prevReviewerId = m.assigned_reviewer_id;
    executeRun(
      `UPDATE review_moderation_cases SET assigned_reviewer_id = ?, case_status = 'in_progress', updated_at = ? WHERE id = ?`,
      [targetStaff ? targetStaff.id : null, now, caseId]
    );
  }

  const assignId = `AH-${Math.floor(5000 + Math.random() * 5000)}`;
  const caseType = caseId.startsWith('KYC-') ? 'kyc' : (caseId.startsWith('KYB-') ? 'kyb' : 'review');

  executeRun(
    `INSERT INTO case_assignments (id, case_id, case_type, assigned_admin_id, assigned_by_id, previous_assignee_id, reassignment_reason, assignment_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [assignId, caseId, caseType, targetStaff ? targetStaff.id : null, assignedById, prevReviewerId, reason || 'Routine queue allocation.', now]
  );

  return {
    caseType,
    targetStaffName: targetStaff ? targetStaff.name : 'Unassigned',
    reason: reason || 'Routine routing.'
  };
}

export function getCaseForAction(caseId) {
  let caseType = 'kyc';
  let initialReviewerId = null;
  let escalatedById = null;
  let currentRiskLevel = 'low';
  let notesArr = [];

  if (caseId.startsWith('KYC-')) {
    caseType = 'kyc';
    const k = queryOne('SELECT * FROM kyc_applications WHERE id = ?', [caseId]);
    if (!k) return { error: 'KYC Case not found', status: 404 };
    initialReviewerId = k.initial_reviewer_id;
    escalatedById = k.escalated_by_id;
    currentRiskLevel = k.risk_level;
    try { notesArr = JSON.parse(k.reviewer_notes || '[]'); } catch (e) { notesArr = []; }
  } else if (caseId.startsWith('KYB-')) {
    caseType = 'kyb';
    const k = queryOne('SELECT * FROM kyb_applications WHERE id = ?', [caseId]);
    if (!k) return { error: 'KYB Case not found', status: 404 };
    initialReviewerId = k.initial_reviewer_id;
    escalatedById = k.escalated_by_id;
    currentRiskLevel = k.risk_level;
    try { notesArr = JSON.parse(k.reviewer_notes || '[]'); } catch (e) { notesArr = []; }
  } else if (caseId.startsWith('CASE-')) {
    caseType = 'review';
  }

  return { caseType, initialReviewerId, escalatedById, currentRiskLevel, notesArr };
}

export function addCaseNote(caseId, caseType, notesArr, authorName, noteText) {
  const now = new Date().toISOString();
  notesArr.push({ author: authorName, text: noteText, timestamp: now });
  const updatedNotesJson = JSON.stringify(notesArr);

  if (caseType === 'kyc') {
    executeRun('UPDATE kyc_applications SET reviewer_notes = ?, updated_at = ? WHERE id = ?', [updatedNotesJson, now, caseId]);
  }
  if (caseType === 'kyb') {
    executeRun('UPDATE kyb_applications SET reviewer_notes = ?, updated_at = ? WHERE id = ?', [updatedNotesJson, now, caseId]);
  }
}

export function executeCaseDecision(caseId, caseType, { action, newStatus, initialReviewerId, escalatedById, notesArr, staffId }) {
  const now = new Date().toISOString();

  let finalStatus = 'in_progress';
  if (action === 'approve') finalStatus = 'completed';
  if (action === 'reject') finalStatus = 'rejected';
  if (action === 'request_info') finalStatus = 'awaiting_docs';
  if (action === 'escalate') finalStatus = 'escalated';
  if (newStatus) finalStatus = newStatus;

  const notesJson = JSON.stringify(notesArr);

  if (caseType === 'kyc') {
    const initRev = initialReviewerId || staffId;
    const escBy = action === 'escalate' ? staffId : escalatedById;
    executeRun(
      `UPDATE kyc_applications SET verification_status = ?, initial_reviewer_id = ?, escalated_by_id = ?, reviewer_notes = ?, decision_date = ?, updated_at = ? WHERE id = ?`,
      [finalStatus, initRev, escBy, notesJson, now, now, caseId]
    );
  } else if (caseType === 'kyb') {
    const initRev = initialReviewerId || staffId;
    const escBy = action === 'escalate' ? staffId : escalatedById;
    executeRun(
      `UPDATE kyb_applications SET verification_status = ?, initial_reviewer_id = ?, escalated_by_id = ?, reviewer_notes = ?, decision_date = ?, updated_at = ? WHERE id = ?`,
      [finalStatus, initRev, escBy, notesJson, now, now, caseId]
    );
  } else if (caseType === 'review') {
    executeRun(
      `UPDATE review_moderation_cases SET case_status = ?, resolved_by = ?, resolved_date = ?, updated_at = ? WHERE id = ?`,
      [finalStatus, staffId, now, now, caseId]
    );
  }

  return { finalStatus };
}

/* ==========================================================================
   SECURE DOCUMENT RETRIEVAL
   ========================================================================== */

export function getSecureDocument(docId) {
  let doc = queryOne('SELECT * FROM kyc_documents WHERE id = ?', [docId]);
  if (!doc) doc = queryOne('SELECT * FROM kyb_documents WHERE id = ?', [docId]);
  if (!doc) doc = queryOne('SELECT * FROM business_evidence WHERE id = ?', [docId]);
  return doc;
}
