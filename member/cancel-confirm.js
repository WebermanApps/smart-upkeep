/* Smart Upkeep member cancel confirmation (Legal-approved success copy, Nov 11 2026).
   One record per member app (/member/, /member/brett/, /member/weberman/), saved in localStorage until a backend exists.
   Record: {id, date, type: "now" | "end", endDate, refund}. Refund = prepaid minus work done, from CL.billing; omitted when 0 or unknown. */
(function () {
  var SUB = /(cancel|profile|billing|help|notifications|sign-out)\/$/;
  function base() { var p = location.pathname.replace(/index\.html$/, ""); if (!/\/$/.test(p)) p += "/"; return p.replace(SUB, ""); }
  var KEY_REC = "su.cancelConfirm:" + base(), KEY_BILL = "su.billingSnap:" + base();
  function iso(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function fmt(s) { var d = new Date(s + "T12:00:00"); return isNaN(+d) ? "" : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
  function money(n) { return "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function num(v) { return typeof v === "number" && isFinite(v) ? v : null; }
  function get(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  /* Member home saves its billing source so the stand-alone cancel page can use the same amounts. */
  function amt(v) { if (typeof v === "number") return v; var n = parseFloat(String(v || "").replace(/[^0-9.]/g, "")); return isFinite(n) ? n : null; }
  /* extra.visits: the member's visit history; completed = dated today or earlier. invoices: what has been paid. */
  function saveBilling(CL, M, extra) {
    extra = extra || {};
    var b = (CL && CL.billing) || {}, plan = (CL && CL.plan) || {}, today = extra.today || new Date();
    var inv = (CL && (CL.invoices || b.invoices)) || extra.invoices || null, paid = null;
    if (inv && inv.length) { paid = 0; inv.forEach(function (x) { var a = amt(x && (x.amount != null ? x.amount : x.amt)); if (a != null) paid += a; }); }
    var done = null;
    if (extra.visits) done = extra.visits.filter(function (v) { var d = new Date(String(v.date) + "T12:00:00"); return !isNaN(+d) && d <= today && v.completed !== false; }).length;
    set(KEY_BILL, { kind: b.kind || plan.billing || (M && M.billing) || "", planCharge: num(b.planCharge), prepaidBalance: num(b.prepaidBalance),
      workDone: num(b.workDone != null ? b.workDone : b.workDoneAmount), nextCharge: b.nextCharge || (CL && CL.renewDate) || null,
      completedVisits: done, paid: paid });
  }
  function billing(CL, M) {
    var s = get(KEY_BILL) || {};
    if (!s.kind && M && M.billing) s.kind = M.billing;
    return s;
  }
  function isMonthly(kind) { return /^monthly\b/i.test(String(kind || "")); }
  /* Prepaid minus work done. prepaidBalance is the prepaid amount still unused (already net of completed work). */
  function refundOf(b) {
    if (num(b.prepaidBalance) != null) return b.prepaidBalance > 0 ? b.prepaidBalance : null;
    if (num(b.planCharge) != null && num(b.workDone) != null) { var r = b.planCharge - b.workDone; return r > 0 ? r : null; }
    return null;
  }
  /* Monthly: paid through the day before the next monthly charge. */
  function monthlyEnd(b, today) {
    var next = b.nextCharge ? new Date(b.nextCharge + "T12:00:00") : null;
    if (!next || isNaN(+next) || next <= today) {
      var m = String(b.kind || "").match(/on the (\d+)/i), day = m ? Math.max(1, Math.min(28, +m[1])) : today.getDate();
      next = new Date(today.getFullYear(), today.getMonth(), day, 12);
      if (next <= today) next = new Date(today.getFullYear(), today.getMonth() + 1, day, 12);
    }
    return iso(new Date(next.getFullYear(), next.getMonth(), next.getDate() - 1, 12));
  }
  function newId(d) {
    var A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", s = "", r = new Uint32Array(4);
    try { crypto.getRandomValues(r); } catch (e) { for (var i = 0; i < 4; i++) r[i] = Math.floor(Math.random() * 1e9); }
    for (var j = 0; j < 4; j++) s += A[r[j] % A.length];
    return "SU-" + String(d.getFullYear()).slice(2) + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0") + "-" + s;
  }
  function record() { return get(KEY_REC); }
  /* Confirm screen: prepaid/annual members get the refund rule line under "Cancel anytime, no fee." */
  function isPrepaid(M) { var b = get(KEY_BILL) || {}; return !isMonthly(b.kind || (M && M.billing) || ""); }
  function askHtml(M, tag) {
    tag = tag || "h2 class=\"bh\""; var close = tag.split(" ")[0];
    return "<" + tag + ">Cancel Your Membership?</" + close + "><p>Cancel anytime, no fee.</p>" + (isPrepaid(M) ? "<p>Any refund is prepaid minus work done.</p>" : "");
  }
  function complete(CL, M, today) {
    var have = record(); if (have) return have;
    today = today || new Date();
    var b = billing(CL, M), monthly = isMonthly(b.kind);
    /* Agreement 7.2: a monthly member with no completed visit (incl. the Starter Visit) cancels effective now with a full refund of everything paid. */
    var noVisit = monthly && b.completedVisits === 0;
    var rec = noVisit ? { id: newId(today), date: iso(today), type: "now", endDate: null, refund: num(b.paid) != null && b.paid > 0 ? b.paid : null, noVisit: true }
      : { id: newId(today), date: iso(today), type: monthly ? "end" : "now", endDate: monthly ? monthlyEnd(b, today) : null, refund: monthly ? null : refundOf(b) };
    set(KEY_REC, rec);
    return rec;
  }
  function successParas(rec) {
    var where = "You can view this confirmation anytime in the app under Profile &amp; Account.";
    if (rec.type === "end") return ["Your membership is cancelled and ends on " + esc(fmt(rec.endDate)) + ". You won't be charged after that. Confirmation #" + esc(rec.id) + ". " + where];
    var p = ["Your membership is cancelled. You won't be charged again. Cancelled on " + esc(fmt(rec.date)) + ", confirmation #" + esc(rec.id) + "."];
    if (num(rec.refund) != null && rec.refund > 0) p.push("Your refund of " + money(rec.refund) + " (prepaid minus work done) will go back to your original payment method.");
    p.push(where);
    return p;
  }
  function successBody(rec) { return successParas(rec).map(function (t) { return "<p>" + t + "</p>"; }).join(""); }
  function rowHtml() {
    var rec = record(); if (!rec) return "";
    var sub = rec.type === "end" ? "Cancelled on " + fmt(rec.date) + " · Ends " + fmt(rec.endDate) : "Cancelled on " + fmt(rec.date) + (num(rec.refund) != null && rec.refund > 0 ? " · Refund " + money(rec.refund) : "");
    return '<section class="card psec su-cc-sec"><h2 class="bh">Cancellation Confirmation</h2>' +
      '<div class="pi-row"><span class="pi-ic" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3.5" width="14" height="17" rx="2"/><path d="M8.5 8h7M8.5 12h7M8.5 16h4"/></svg></span>' +
      '<div class="grow"><div class="k">Confirmation #</div><div class="v su-cc-id">' + esc(rec.id) + '</div><div class="k2">' + esc(sub) + '</div></div></div></section>';
  }
  /* Branded, no black fills: terracotta accent on the cancelled card and confirmation id. */
  (function css() {
    if (document.getElementById("suCcCss")) return;
    var s = document.createElement("style"); s.id = "suCcCss";
    s.textContent = ".su-cc{border-left:4px solid #A8431F}.su-cc .su-cc-k{display:inline-block;margin:0 0 8px;padding:3px 10px;border-radius:999px;background:rgba(193,80,46,.12);color:#A8431F;font:700 12px/1.4 Hind,sans-serif;letter-spacing:.08em;text-transform:uppercase}" +
      ".su-cc h1,.su-cc .bh{border-left-color:#A8431F}.su-cc-sec{border-left-color:#A8431F!important}.su-cc-id{color:#A8431F;font-weight:700;letter-spacing:.02em}";
    (document.head || document.documentElement).appendChild(s);
  })();
  window.SUCancel = { complete: complete, record: record, successBody: successBody, successParas: successParas, rowHtml: rowHtml, saveBilling: saveBilling, isPrepaid: isPrepaid, askHtml: askHtml, _keys: [KEY_REC, KEY_BILL] };
})();
