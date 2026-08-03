/* ============================================================
   np-data.js — Supabase auth + data seam (white-label)
   ------------------------------------------------------------
   Ported from the original single-tenant seam, adapted so each
   brand points at THEIR OWN Supabase project. The URL + anon key
   come from the active brand config (window.Brand) instead of
   hard-coded constants — nothing tenant-specific is committed.

   Public API mirrors the original so ported pages need no changes:
     NPData.supabase           (client, or null if not configured)
     NPData.getSession()
     NPData.getRole()
     NPData.guardPage(roles)
     NPData.signIn(email, pw)
     NPData.signUp(email, pw)  ← NEW: first-admin bootstrap for the wizard
     NPData.signOut()
     NPData.isConfigured()

   Requires @supabase/supabase-js UMD (window.supabase) + brand-config.js
   loaded before this file.
   ============================================================ */
(function () {
  'use strict';

  var brand = (window.Brand && window.Brand.get()) || {};
  var sb = brand.supabase || {};
  var SUPABASE_URL = sb.url || '';
  var ANON_KEY     = sb.anonKey || '';

  var client = null;
  if (SUPABASE_URL && ANON_KEY && window.supabase) {
    client = window.supabase.createClient(SUPABASE_URL, ANON_KEY, {
      auth: { flowType: 'implicit' },
    });
  }

  function isConfigured() { return !!client; }

  async function getSession() {
    if (!client) return null;
    var res = await client.auth.getSession();
    return res.data.session;
  }

  // Role comes from app_metadata (custom access-token hook) with a DB
  // fallback so pages work before the hook is registered.
  async function getRole() {
    var session = await getSession();
    if (!session) return null;
    var jwtRole = (session.user && session.user.app_metadata && session.user.app_metadata.role)
               || (session.user && session.user.user_metadata && session.user.user_metadata.role)
               || null;
    if (jwtRole) return jwtRole;
    var res = await client.from('users').select('role').eq('id', session.user.id).single();
    return (res.data && res.data.role) || null;
  }

  // Redirect to index.html unless a valid session with an allowed role exists.
  // Admin always passes. A shared temporary guest pass (sessionStorage flag)
  // is honored for pages that allow 'guest'.
  async function guardPage(allowedRoles) {
    if (sessionStorage.getItem('wl_guest') === '1') {
      if (allowedRoles.indexOf('guest') !== -1) return;
      window.location.href = 'index.html';
      return;
    }
    var session = await getSession();
    if (!session) { window.location.href = 'index.html'; return; }
    var role = await getRole();
    if (role === 'admin') return;
    if (allowedRoles.indexOf(role) !== -1) return;
    window.location.href = 'index.html';
  }

  async function signIn(email, password) {
    if (!client) return { error: { message: 'Backend not configured. Run setup first.' } };
    return client.auth.signInWithPassword({ email: email, password: password });
  }

  // First-admin bootstrap used by the setup wizard. On the brand's own
  // Supabase this creates the very first account; role assignment to 'admin'
  // is completed server-side (trigger / SQL) per the README backend notes.
  async function signUp(email, password) {
    if (!client) return { error: { message: 'Enter your Supabase URL + anon key first.' } };
    return client.auth.signUp({
      email: email,
      password: password,
      options: { data: { role: 'admin' } }
    });
  }

  async function signOut() {
    sessionStorage.removeItem('wl_guest');
    if (client) await client.auth.signOut();
    window.location.href = 'index.html';
  }

  window.NPData = {
    SUPABASE_URL: SUPABASE_URL,
    ANON_KEY: ANON_KEY,
    supabase: client,
    isConfigured: isConfigured,
    getSession: getSession,
    getRole: getRole,
    guardPage: guardPage,
    signIn: signIn,
    signUp: signUp,
    signOut: signOut,
  };
})();
