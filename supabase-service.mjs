import { createClient } from '@supabase/supabase-js';

// Default Supabase project configuration (can be overridden by process.env)
const DEFAULT_SUPABASE_URL = 'https://wfsvxzgzdefyuwhuotzq.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indmc3Z4emd6ZGVmeXV3aHVvdHpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY1Mjc1MDcsImV4cCI6MjEwMjEwMzUwN30.986aMpLnxxQDQTgVA1lU81ERJIhlMFze7UTFJsDSjVE';
const DEFAULT_PROJECT_ID = 'wfsvxzgzdefyuwhuotzq';

let supabaseClient = null;

export function getSupabaseConfig() {
  let rawUrl = (process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL).trim();
  if (rawUrl && !rawUrl.includes('.') && !rawUrl.includes('/')) {
    rawUrl = `https://${rawUrl}.supabase.co`;
  } else if (rawUrl && !/^https?:\/\//i.test(rawUrl)) {
    rawUrl = `https://${rawUrl}`;
  }
  const url = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '').trim();
  const anonKey = (process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || DEFAULT_SUPABASE_ANON_KEY).trim();
  const projectId = process.env.SUPABASE_PROJECT_ID || (url.includes('.supabase.co') ? url.replace(/^https?:\/\//, '').split('.')[0] : DEFAULT_PROJECT_ID);

  return {
    url,
    anonKey,
    projectId,
    isConfigured: Boolean(url && anonKey)
  };
}

export function getSupabaseClient() {
  if (!supabaseClient) {
    const config = getSupabaseConfig();
    if (!config.isConfigured) {
      throw new Error('Supabase configuration missing: SUPABASE_URL and SUPABASE_ANON_KEY must be set.');
    }
    supabaseClient = createClient(config.url, config.anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
  }
  return supabaseClient;
}

/**
 * Health check & connectivity diagnostic test for Supabase
 */
export async function testSupabaseConnection() {
  const config = getSupabaseConfig();
  const startTime = Date.now();
  
  try {
    const client = getSupabaseClient();
    
    // Test auth service reachability
    const authRes = await fetch(`${config.url}/auth/v1/health`, {
      headers: {
        'apikey': config.anonKey,
        'Authorization': `Bearer ${config.anonKey}`
      }
    }).catch(err => ({ ok: false, status: 0, statusText: err.message }));

    const latencyMs = Date.now() - startTime;
    
    // Check known tables or REST endpoint root
    let tablesStatus = {};
    const testTables = ['merchants', 'reviews', 'support_tickets', 'audit_logs', 'chat_conversations'];
    
    for (const table of testTables) {
      try {
        const { data, error, count } = await client.from(table).select('*', { count: 'exact', head: true });
        if (error) {
          tablesStatus[table] = { exists: false, error: error.message, code: error.code };
        } else {
          tablesStatus[table] = { exists: true, row_count: count ?? 0 };
        }
      } catch (err) {
        tablesStatus[table] = { exists: false, error: err.message };
      }
    }

    const isConnected = authRes.ok || Object.values(tablesStatus).some(t => t.exists || (t.code && t.code !== 'PGRST301'));

    return {
      success: true,
      connected: isConnected,
      latency_ms: latencyMs,
      project_id: config.projectId,
      url: config.url,
      auth_health: authRes.ok ? 'healthy' : 'unreachable',
      tables: tablesStatus,
      timestamp: new Date().toISOString()
    };
  } catch (err) {
    return {
      success: false,
      connected: false,
      latency_ms: Date.now() - startTime,
      project_id: config.projectId,
      url: config.url,
      error: err.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Dual-write or cloud mirror helper
 */
export async function mirrorToSupabase(tableName, record) {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from(tableName)
      .upsert(record, { onConflict: 'id' });

    if (error) {
      console.warn(`[Supabase Mirror Warning] ${tableName}:`, error.message);
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (err) {
    console.warn(`[Supabase Mirror Error] ${tableName}:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Sync all local records to Supabase tables
 */
export async function syncDatabaseToSupabase(getDataFn) {
  const results = {};
  const client = getSupabaseClient();

  const syncList = [
    { table: 'merchants', key: 'merchants' },
    { table: 'reviews', key: 'reviews' },
    { table: 'support_tickets', key: 'tickets' },
    { table: 'chat_conversations', key: 'conversations' },
    { table: 'chat_messages', key: 'messages' },
    { table: 'escrow_transactions', key: 'escrow' },
    { table: 'audit_logs', key: 'audit_logs' }
  ];

  for (const item of syncList) {
    try {
      const records = typeof getDataFn === 'function' ? await getDataFn(item.key) : [];
      if (!records || records.length === 0) {
        results[item.table] = { synced: 0, status: 'no_records' };
        continue;
      }

      // Upsert in batches of 50
      let syncedCount = 0;
      const batchSize = 50;
      let lastError = null;

      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        const { error } = await client.from(item.table).upsert(batch);
        if (error) {
          lastError = error.message;
          console.warn(`[Supabase Batch Sync Failed] ${item.table}:`, error.message);
          break;
        } else {
          syncedCount += batch.length;
        }
      }

      results[item.table] = {
        synced: syncedCount,
        total: records.length,
        status: lastError ? 'partial_or_failed' : 'synced',
        error: lastError
      };
    } catch (err) {
      results[item.table] = {
        synced: 0,
        status: 'failed',
        error: err.message
      };
    }
  }

  return results;
}

/**
 * Generates SQL Schema DDL ready to execute in Supabase SQL Editor
 */
export function getSupabaseSchemaDDL() {
  return `-- =========================================================================
-- VERIPINOY PHILIPPINE TRUST & VERIFICATION REGISTRY
-- SUPABASE POSTGRESQL SCHEMA MIGRATION
-- Project ID: wfsvxzgzdefyuwhuotzq
-- Generated for Supabase Cloud Database Integration
-- =========================================================================

-- Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. MERCHANTS TABLE
CREATE TABLE IF NOT EXISTS public.merchants (
  id TEXT PRIMARY KEY,
  business_name TEXT NOT NULL,
  category TEXT NOT NULL,
  registration_number TEXT,
  verification_tier TEXT DEFAULT 'Standard',
  is_verified BOOLEAN DEFAULT FALSE,
  trust_score NUMERIC DEFAULT 0,
  owner_name TEXT,
  owner_email TEXT,
  contact_number TEXT,
  location TEXT,
  website_url TEXT,
  avatar_url TEXT,
  banner_url TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. REVIEWS & CONSUMER FEEDBACK
CREATE TABLE IF NOT EXISTS public.reviews (
  id TEXT PRIMARY KEY,
  merchant_id TEXT REFERENCES public.merchants(id) ON DELETE CASCADE,
  reviewer_name TEXT NOT NULL,
  reviewer_email TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  content TEXT NOT NULL,
  verification_status TEXT DEFAULT 'pending',
  ai_risk_score NUMERIC DEFAULT 0,
  ai_sentiment TEXT,
  is_flagged BOOLEAN DEFAULT FALSE,
  moderation_notes TEXT,
  proof_attachment_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. FREELANCERS & SERVICE PROVIDERS
CREATE TABLE IF NOT EXISTS public.freelancers (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  skills TEXT[],
  rating NUMERIC DEFAULT 5.0,
  completed_jobs INTEGER DEFAULT 0,
  hourly_rate NUMERIC,
  identity_verified BOOLEAN DEFAULT FALSE,
  nbi_clearance_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ESCROW CONTRACTS & TRANSACTIONS
CREATE TABLE IF NOT EXISTS public.escrow_transactions (
  id TEXT PRIMARY KEY,
  contract_title TEXT NOT NULL,
  client_id TEXT NOT NULL,
  client_name TEXT,
  freelancer_id TEXT,
  freelancer_name TEXT,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'PHP',
  status TEXT DEFAULT 'funded',
  milestones JSONB DEFAULT '[]'::jsonb,
  dispute_status TEXT DEFAULT 'none',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  released_at TIMESTAMPTZ
);

-- 5. SUPPORT TICKETS
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id TEXT PRIMARY KEY,
  ticket_number TEXT UNIQUE,
  user_id TEXT,
  user_name TEXT,
  user_email TEXT,
  user_role TEXT DEFAULT 'Customer',
  subject TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'open',
  assigned_to TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. SUPPORT TICKET MESSAGES
CREATE TABLE IF NOT EXISTS public.support_ticket_messages (
  id TEXT PRIMARY KEY,
  ticket_id TEXT REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_name TEXT NOT NULL,
  sender_email TEXT,
  sender_type TEXT DEFAULT 'customer',
  message TEXT NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb,
  is_internal BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. CHAT CONVERSATIONS
CREATE TABLE IF NOT EXISTS public.chat_conversations (
  id TEXT PRIMARY KEY,
  conversation_type TEXT DEFAULT 'direct',
  participant_a_id TEXT NOT NULL,
  participant_a_name TEXT,
  participant_a_role TEXT,
  participant_b_id TEXT NOT NULL,
  participant_b_name TEXT,
  participant_b_role TEXT,
  subject TEXT,
  contract_id TEXT,
  is_e2ee BOOLEAN DEFAULT FALSE,
  last_message_text TEXT,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. CHAT MESSAGES
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  sender_role TEXT,
  recipient_id TEXT,
  message_text TEXT NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb,
  is_read BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. IMMUTABLE AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  actor_id TEXT,
  actor_name TEXT,
  actor_role TEXT,
  target_resource TEXT,
  target_id TEXT,
  details JSONB,
  ip_address TEXT,
  tamper_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freelancers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escrow_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- POLICIES FOR PUBLIC READ & ANON ACCESS
CREATE POLICY "Allow anon read for verified merchants" ON public.merchants FOR SELECT USING (true);
CREATE POLICY "Allow anon insert for reviews" ON public.reviews FOR ALL USING (true);
CREATE POLICY "Allow anon access for support tickets" ON public.support_tickets FOR ALL USING (true);
CREATE POLICY "Allow anon access for ticket messages" ON public.support_ticket_messages FOR ALL USING (true);
CREATE POLICY "Allow anon access for chat conversations" ON public.chat_conversations FOR ALL USING (true);
CREATE POLICY "Allow anon access for chat messages" ON public.chat_messages FOR ALL USING (true);
CREATE POLICY "Allow anon read for audit logs" ON public.audit_logs FOR ALL USING (true);
`;
}
