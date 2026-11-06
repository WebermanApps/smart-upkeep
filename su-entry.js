/* Soft auth badge for member/tech/console after unlock. Does not block prototype browsing. */
(function (w) {
  "use strict";
  function pathRole() {
    var p = location.pathname || "";
    if (p.indexOf("/tech") === 0) return "tech";
    if (p.indexOf("/console") === 0) return "ops";
    if (p.indexOf("/member") === 0) return "member";
    return null;
  }
  function mount(user) {
    if (document.getElementById("su-auth-badge")) return;
    var role = pathRole();
    /* Member app: Sign Out lives in More → Account only — no fixed bottom badge covering nav. */
    if (role === "member") return;
    var st = document.createElement("style");
    st.textContent = "#su-auth-badge{position:fixed;right:12px;bottom:12px;z-index:9998;font:600 13px Hind,system-ui,sans-serif}" +
      "#su-auth-badge a,#su-auth-badge span{display:inline-block;background:#fff;border:1px solid #d9d1c4;border-radius:999px;padding:8px 12px;color:#1a1a1a;text-decoration:none;box-shadow:0 6px 18px rgba(0,0,0,.06)}";
    document.head.appendChild(st);
    var box = document.createElement("div");
    box.id = "su-auth-badge";
    if (user) {
      var r = (w.SUAuth && w.SUAuth.roleOf(user)) || "";
      box.innerHTML = '<span>' + (user.email || "Signed in") + (r ? " · " + r : "") +
        ' · <a href="#" id="su-auth-out">Sign out</a></span>';
      document.body.appendChild(box);
      document.getElementById("su-auth-out").onclick = function (e) {
        e.preventDefault();
        w.SUAuth.signOut().then(function () { location.href = "/login/"; });
      };
    } else {
      var next = encodeURIComponent(location.pathname + location.search);
      box.innerHTML = '<a href="/login/?next=' + next + '">Sign in</a>';
      document.body.appendChild(box);
    }
  }
  function boot() {
    if (!w.SUAuth) return;
    w.SUAuth.user().then(mount).catch(function () { mount(null); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})(window);
