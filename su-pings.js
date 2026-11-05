/* Smart Upkeep quote_request pings → public.pings (Command Center). */
(function (w) {
  "use strict";

  function itemMeta(id) {
    var P = w.SMART_UPKEEP_PRICING || {};
    var all = [].concat(P.addons || [], P.lastMinute || []);
    for (var i = 0; i < all.length; i++) if (all[i].id === id) return all[i];
    return { id: id, label: id };
  }

  function queueEv(ev) {
    try {
      var a = JSON.parse(localStorage.getItem("su.pendingQuotePings") || "[]");
      a.push(ev); localStorage.setItem("su.pendingQuotePings", JSON.stringify(a.slice(-50)));
    } catch (e) {}
  }

  async function flushQueue() {
    var a = [];
    try { a = JSON.parse(localStorage.getItem("su.pendingQuotePings") || "[]"); } catch (e) {}
    if (!a.length) return;
    localStorage.removeItem("su.pendingQuotePings");
    for (var i = 0; i < a.length; i++) {
      try { await insertQuoteRequest(a[i], true); } catch (e) { queueEv(a[i]); break; }
    }
  }

  async function insertQuoteRequest(ev, fromQueue) {
    var ids = (ev && ev.ids) || [];
    if (!ids.length) return [];
    if (!w.SUAuth) throw new Error("SUAuth missing");
    var sb = await w.SUAuth.getClient();
    var sess = await w.SUAuth.session();
    var user = sess && sess.user;
    if (!user) {
      if (!fromQueue) queueEv(ev);
      try { console.info("[su-pings] queued until sign-in", ev); } catch (e) {}
      return [];
    }
    var rows = [];
    var plan = null;
    try {
      var S = JSON.parse(localStorage.getItem("smartUpkeep.v1") || localStorage.getItem("su.state") || "{}");
      var tier = S.tier;
      var tiers = (w.SMART_UPKEEP_PRICING || {}).tiers || {};
      plan = (tiers[tier] && tiers[tier].label) || tier || null;
    } catch (e) {}
    for (var i = 0; i < ids.length; i++) {
      var meta = itemMeta(ids[i]);
      rows.push({
        kind: "quote_request",
        status: "open",
        member_id: user ? user.id : null,
        member_email: user ? user.email : null,
        member_name: user && user.user_metadata ? (user.user_metadata.full_name || null) : null,
        item_id: meta.id,
        item_label: meta.label || meta.id,
        plan: plan,
        notes: (ev && ev.ctx) || null,
        payload: { source: "member-flow", ids: ids, t: (ev && ev.t) || new Date().toISOString(), ctx: (ev && ev.ctx) || null }
      });
    }
    var res = await sb.from("pings").insert(rows).select();
    if (res.error) {
      console.warn("[su-pings] insert failed", res.error);
      throw res.error;
    }
    try { console.info("[su-pings] inserted", res.data); } catch (e) {}
    return res.data || [];
  }

  /* Hook the marketing funnel stub. */
  w.MWQuotePing = function (ev) {
    insertQuoteRequest(ev).catch(function (err) {
      try { console.warn("[su-pings] MWQuotePing error", err); } catch (e) {}
    });
  };

  /* Flush any queued quote pings after auth settles. */
  if (w.SUAuth && w.SUAuth.getClient) {
    w.SUAuth.getClient().then(function (sb) {
      sb.auth.onAuthStateChange(function (event) {
        if (event === "SIGNED_IN" || event === "INITIAL_SESSION") flushQueue();
      });
      flushQueue();
    }).catch(function () {});
  }

  w.SUPings = { insertQuoteRequest: insertQuoteRequest, flushQueue: flushQueue };
})(window);
