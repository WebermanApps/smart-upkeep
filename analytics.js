/* Smart Upkeep GA4 (gtag.js). Measurement ID is public by design.
   Loaded in the plaintext <head> of every page shell; the pagelock copies head scripts into the unlocked page, so it runs again after unlock. */
(function () {
  var ID = "G-ZV7ED13YSJ";
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { dataLayer.push(arguments); };
  if (!document.querySelector('script[src*="googletagmanager.com/gtag/js"]')) {
    var s = document.createElement("script"); s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + ID; document.head.appendChild(s);
  }
  if (!window.__suGA) { window.__suGA = 1; gtag("js", new Date()); gtag("config", ID); }
  else if (window.__suGA === 1) { window.__suGA = 2; gtag("event", "page_view", { page_title: document.title, page_location: location.href, unlocked: true }); }
  /* SPA screen views (called from app.js go()) */
  window.suTrackScreen = function (name) { try { gtag("event", "screen_view", { screen_name: name, app_name: "smart-upkeep", page_path: location.pathname + "#" + name }); } catch (e) {} };
  /* Mirror SUEvents (events.js) into GA4: addon.clicked, quote.generated, signup.completed, etc. */
  if (!window.__suGAev) { window.__suGAev = 1;
    window.addEventListener("su:event", function (e) {
      var ev = e && e.detail; if (!ev || !ev.type || ev.sample) return;
      var p = { app: ev.app || "site" }, pl = ev.payload || {};
      Object.keys(pl).forEach(function (k) { var v = pl[k]; p[k] = Array.isArray(v) ? v.join(",") : (typeof v === "object" && v ? JSON.stringify(v) : v); });
      try { gtag("event", String(ev.type).replace(/[^A-Za-z0-9_]/g, "_").slice(0, 40), p); } catch (x) {}
    });
  }
})();
