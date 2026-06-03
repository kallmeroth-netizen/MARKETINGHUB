// Supabase client seam — Phase 0.
// anon key is public-by-design (safe to commit). service_role key is never
// shipped to the browser or stored in git.
// Requires @supabase/supabase-js UMD (window.supabase) loaded before this file.
(function () {
  'use strict';

  const SUPABASE_URL = 'https://sepyfviepxlapexlgeqp.supabase.co';
  const ANON_KEY     = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlcHlmdmllcHhsYXBleGxnZXFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0OTQyNTQsImV4cCI6MjA5NTA3MDI1NH0.e4VHgDmY6D0q6Om-DcXWAT9_PJL_GbWXeVLhYJE7tIY';

  const client = window.supabase.createClient(SUPABASE_URL, ANON_KEY);

  async function getSession() {
    const { data } = await client.auth.getSession();
    return data.session;
  }

  // Role is embedded in the JWT by a custom access-token hook (Phase 2).
  // Returns null until auth is wired; check app_metadata (server-set) first.
  async function getRole() {
    const session = await getSession();
    if (!session) return null;
    return session.user?.app_metadata?.role
        ?? session.user?.user_metadata?.role
        ?? null;
  }

  window.NPData = {
    SUPABASE_URL,
    ANON_KEY,
    supabase: client,
    getSession,
    getRole,
  };
})();
