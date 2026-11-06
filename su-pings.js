/* Smart Upkeep pings → public.pings (Command Center Ping Log).
   Kinds: quote_request, reschedule, change_plan, cancel_request, manage_extras, book_fix, message, urgent, refer_neighbor,
   tech_visit_start, tech_checkout, tech_time_off, tech_help. Signed-out actions queue in localStorage and flush on sign-in. */
(function (w) {
  "use strict";
  var QK = "su.pendingPings", OLDQ = "su.pendingQuotePings";

  function itemMeta(id) {
    var P = w.SMART_UPKEEP_PRICING || {};
    var all = [].concat(P.addons || [], P.lastMinute || []);
    for (var i = 0; i < all.length; i++) if (all[i].id === id) return all[i];
    return { id: id, label: id };
  }
  function appName() {
    var p = location.pathname || "";
    if (p.indexOf("/tech") === 0) return "tech";
    if (p.indexOf("/member") === 0) return "member";
    if (p.indexOf("/console") === 0) return "console";
    if (p.indexOf("/pilot") === 0) return "pilot";
    return "main";
  }
  function currentPlan() {
    try {
      var S = JSON.parse(localStorage.getItem("smartUpkeep.v1") || localStorage.getItem("su.state") || "{}");
      var tiers = (w.SMART_UPKEEP_PRICING || {}).tiers || {};
      return (tiers[S.tier] && tiers[S.tier].label) || S.tier || null;
    } catch (e) { return null; }
  }
  function readQ(k) { try { return JSON.parse(localStorage.getItem(k) || "[]"); } catch (e) { return []; } }
  function queue(job) {
    try { var a = readQ(QK); a.push(job); localStorage.setItem(QK, JSON.stringify(a.slice(-50))); } catch (e) {}
  }

  /* Generic insert. opts: {item_id, item_label, plan, notes, payload, rows:[...partial rows]} */
  async function ping(kind, opts, fromQueue) {
    opts = opts || {};
    if (!w.SUAuth) throw new Error("SUAuth missing");
    var job = { kind: kind, opts: opts, t: opts.t || new Date().toISOString(), app: opts.app || appName() };
    var sb = await w.SUAuth.getClient();
    var sess = await w.SUAuth.session();
    var user = sess && sess.user;
    if (!user) {
      if (!fromQueue) { opts.t = job.t; opts.app = job.app; queue(job); }
      try { console.info("[su-pings] queued until sign-in", job); } catch (e) {}
      return [];
    }
    var parts = opts.rows && opts.rows.length ? opts.rows : [{}];
    var rows = parts.map(function (r) {
      return {
        kind: kind, status: "open",
        member_id: user.id, member_email: user.email || null,
        member_name: (user.user_metadata && user.user_metadata.full_name) || null,
        item_id: r.item_id || opts.item_id || null,
        item_label: r.item_label || opts.item_label || null,
        plan: r.plan || opts.plan || currentPlan(),
        notes: r.notes || opts.notes || null,
        payload: Object.assign({ source: job.app + "-app", app: job.app, t: job.t, path: location.pathname + location.hash }, opts.payload || {}, r.payload || {})
      };
    });
    var res = await sb.from("pings").insert(rows).select();
    if (res.error) { console.warn("[su-pings] insert failed", res.error); throw res.error; }
    try { console.info("[su-pings] inserted", res.data); } catch (e) {}
    return res.data || [];
  }

  async function insertQuoteRequest(ev, fromQueue) {
    var ids = (ev && ev.ids) || [];
    if (!ids.length) return [];
    return ping("quote_request", {
      t: ev.t, notes: ev.ctx || null,
      payload: { source: "member-flow", ids: ids, ctx: ev.ctx || null },
      rows: ids.map(function (id) { var m = itemMeta(id); return { item_id: m.id, item_label: m.label || m.id }; })
    }, fromQueue);
  }

  async function flushQueue() {
    var old = readQ(OLDQ), a = readQ(QK);
    if (!old.length && !a.length) return;
    var sess = w.SUAuth && await w.SUAuth.session();
    if (!sess || !sess.user) return;
    localStorage.removeItem(OLDQ); localStorage.removeItem(QK);
    for (var i = 0; i < old.length; i++) { try { await insertQuoteRequest(old[i], true); } catch (e) { queue({ kind: "__quote", ev: old[i] }); } }
    for (var j = 0; j < a.length; j++) {
      try { if (a[j].kind === "__quote") await insertQuoteRequest(a[j].ev, true); else await ping(a[j].kind, a[j].opts, true); }
      catch (e) { queue(a[j]); }
    }
  }

  var last = {};
  function fire(kind, opts) {
    var k = kind + "|" + ((opts && (opts.item_id || opts.notes)) || "");
    if (last[k] && Date.now() - last[k] < 2500) return; /* ignore double taps */
    last[k] = Date.now();
    ping(kind, opts).catch(function (err) { try { console.warn("[su-pings] " + kind, err); } catch (e) {} });
  }

  w.MWQuotePing = function (ev) {
    insertQuoteRequest(ev).catch(function (err) { try { console.warn("[su-pings] MWQuotePing error", err); } catch (e) {} });
  };

  /* ---- UI hooks (capture phase: read state before page handlers mutate it) ---- */
  /* Change Plan + Manage Extras: member sheet confirms → SUPings.ping (not data-beta). */
  var BETA = {
    "Cancel Membership": ["cancel_request", "Cancel membership request"],
    "Book a Fix": ["book_fix", "Book a fix request"]
  };
  function txt(el) { return ((el && el.textContent) || "").replace(/\s+/g, " ").trim(); }
  document.addEventListener("click", function (e) {
    var t = e.target && e.target.closest ? e.target : null; if (!t) return;
    var b;
    if ((b = t.closest("[data-rs-apply]"))) {
      var RS = w.RS || {}, p = RS.pick || {}, N = w.NEXT || {};
      fire("reschedule", { item_id: "next_visit", item_label: "Reschedule next visit",
        notes: [p.date, p.win].filter(Boolean).join(" · ") || null,
        payload: { from: { date: N.date || null, win: N.win || null }, to: { date: p.date || null, win: p.win || null } } });
    } else if ((b = t.closest("[data-beta]")) && BETA[b.getAttribute("data-beta")]) {
      var m = BETA[b.getAttribute("data-beta")];
      fire(m[0], { item_label: m[1], payload: { button: b.getAttribute("data-beta") } });
    } else if ((b = t.closest("[data-aa-urgent]"))) {
      fire("urgent", { item_label: "Something urgent", payload: { button: "Something urgent" } });
    } else if ((b = t.closest("[data-qr]"))) {
      var q = b.getAttribute("data-qr");
      fire(/reschedul/i.test(q) ? "reschedule" : "message", { item_label: /reschedul/i.test(q) ? "Reschedule next visit" : "Member message", notes: q, payload: { quickReply: q } });
    } else if ((b = t.closest("[data-startvisit]"))) {
      fire("tech_visit_start", { item_id: b.getAttribute("data-startvisit"), item_label: "Visit started", payload: { visit: b.getAttribute("data-startvisit") } });
    } else if ((b = t.closest("[data-send]")) && !b.disabled) {
      fire("tech_checkout", { item_label: "Report sent and checked out" });
    } else if ((b = t.closest("[data-toast]"))) {
      var d = b.getAttribute("data-toast") || "";
      if (/time off/i.test(d)) fire("tech_time_off", { item_label: "Time off request", notes: txt(b) || null });
      else if (/help for technicians/i.test(d)) fire("tech_help", { item_label: "Tech needs help" });
    }
  }, true);
  /* Main-site Cancel Membership form (#cxF in app.js). */
  document.addEventListener("submit", function (e) {
    var f = e.target;
    if (f && f.id === "cxF") {
      var em = (document.getElementById("cxEmail") || {}).value || "";
      if (/^\S+@\S+\.\S+$/.test(em.trim())) fire("cancel_request", { item_label: "Cancel membership (online form)", notes: em.trim(), payload: { email: em.trim() } });
    }
  }, true);

  if (w.SUAuth && w.SUAuth.getClient) {
    w.SUAuth.getClient().then(function (sb) {
      sb.auth.onAuthStateChange(function (event) { if (event === "SIGNED_IN" || event === "INITIAL_SESSION") flushQueue(); });
      flushQueue();
    }).catch(function () {});
  }

  w.SUPings = { ping: ping, fire: fire, insertQuoteRequest: insertQuoteRequest, flushQueue: flushQueue };
})(window);
