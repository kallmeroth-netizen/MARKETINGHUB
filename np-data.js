// Supabase client seam — Phase 0 / Phase 2 auth.
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

  // Role comes from app_metadata (set by custom access-token hook, Phase 2).
  // Falls back to a DB lookup so the page works before the hook is registered
  // in the Supabase Dashboard (hook registration is a Peter action).
  async function getRole() {
    const session = await getSession();
    if (!session) return null;
    const jwtRole = session.user?.app_metadata?.role
                 ?? session.user?.user_metadata?.role
                 ?? null;
    if (jwtRole) return jwtRole;
    const { data } = await client.from('users').select('role').eq('id', session.user.id).single();
    return data?.role ?? null;
  }

  // Redirect to index.html if no valid session or role not in allowedRoles.
  // Admin always passes regardless of allowedRoles.
  // Call early in each page's script (after np-data.js loads).
  async function guardPage(allowedRoles) {
    const session = await getSession();
    if (!session) { window.location.href = 'index.html'; return; }
    const role = await getRole();
    if (role === 'admin') return;
    if (allowedRoles.includes(role)) return;
    window.location.href = 'index.html';
  }

  // Sign in with email + password. Returns the Supabase auth response.
  async function signIn(email, password) {
    return client.auth.signInWithPassword({ email, password });
  }

  // Sign out and return to the login page.
  async function signOut() {
    await client.auth.signOut();
    window.location.href = 'index.html';
  }

  window.NPData = {
    SUPABASE_URL,
    ANON_KEY,
    supabase: client,
    getSession,
    getRole,
    guardPage,
    signIn,
    signOut,
  };
})();
