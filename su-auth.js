/* Smart Upkeep Auth helpers — email/password via supabase-js CDN (or fetch fallback). */
(function (w) {
  "use strict";
  var CFG = w.SU_SUPABASE || {};
  var client = null;
  var ready = null;

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      if (document.querySelector('script[src="' + src + '"]')) { resolve(); return; }
      var s = document.createElement("script");
      s.src = src; s.async = true;
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error("Failed to load " + src)); };
      document.head.appendChild(s);
    });
  }

  function getClient() {
    if (client) return Promise.resolve(client);
    if (ready) return ready;
    ready = loadScript("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.1/dist/umd/supabase.min.js")
      .then(function () {
        if (!w.supabase || !w.supabase.createClient) throw new Error("supabase-js missing");
        client = w.supabase.createClient(CFG.url, CFG.anonKey, {
          auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: "su-auth" }
        });
        return client;
      });
    return ready;
  }

  function roleOf(user) {
    if (!user) return null;
    var r = (user.app_metadata && user.app_metadata.role) || (user.user_metadata && user.user_metadata.role) || "member";
    if (r === "operator") r = "ops";
    return r;
  }

  function homeForRole(role) {
    if (role === "tech") return "/tech/";
    if (role === "ops" || role === "admin") return "/console/";
    return "/member/";
  }

  async function signIn(email, password) {
    var sb = await getClient();
    var res = await sb.auth.signInWithPassword({ email: email, password: password });
    if (res.error) throw res.error;
    return res.data;
  }

  async function signOut() {
    var sb = await getClient();
    await sb.auth.signOut();
  }

  async function session() {
    var sb = await getClient();
    var res = await sb.auth.getSession();
    return (res.data && res.data.session) || null;
  }

  async function user() {
    var s = await session();
    return s && s.user;
  }

  async function requireRole(allowed, opts) {
    opts = opts || {};
    var u = await user();
    if (!u) {
      if (opts.redirect !== false) {
        var next = encodeURIComponent(location.pathname + location.search);
        location.href = (opts.loginUrl || "/login/") + "?next=" + next;
      }
      return null;
    }
    var role = roleOf(u);
    var ok = !allowed || allowed.indexOf(role) > -1 || (allowed.indexOf("operator") > -1 && role === "ops");
    if (!ok) {
      if (opts.redirect !== false) location.href = homeForRole(role);
      return null;
    }
    return u;
  }

  w.SUAuth = {
    getClient: getClient,
    signIn: signIn,
    signOut: signOut,
    session: session,
    user: user,
    roleOf: roleOf,
    homeForRole: homeForRole,
    requireRole: requireRole
  };
})(window);
