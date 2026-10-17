/* Smart Upkeep event layer (Oct 17 2026). ONE event format and ONE store that every app writes to and the operator console reads.
   Event: { id, type, app: "member"|"tech"|"site"|"ask"|"billing", member, tech, ts (ISO 8601), payload: {}, sample: bool }
   Store today: localStorage "su.events.v1" in this browser (cap 500, newest last) + a BroadcastChannel so an open console updates live.
   Later: swap send()/load() for a real backend (see console/README.md); the event format stays the same. */
(function () {
  var KEY = "su.events.v1", CAP = 500, bc = null;
  try { bc = new BroadcastChannel("su-events"); } catch (e) {}
  function load() { try { var a = JSON.parse(localStorage.getItem(KEY) || "[]"); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function save(a) { try { localStorage.setItem(KEY, JSON.stringify(a.slice(-CAP))); } catch (e) {} }
  function emit(type, app, o) {
    o = o || {};
    var ev = { id: "e" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), type: type, app: app || "site",
      member: o.member || null, tech: o.tech || null, ts: new Date().toISOString(), payload: o.payload || {}, sample: !!o.sample };
    var a = load(); a.push(ev); save(a);
    try { if (bc) bc.postMessage(ev); } catch (e) {}
    try { window.dispatchEvent(new CustomEvent("su:event", { detail: ev })); } catch (e) {}
    return ev;
  }
  function on(fn) {
    if (bc) bc.addEventListener("message", function (m) { fn(m.data); });
    window.addEventListener("storage", function (e) { if (e.key === KEY) fn(null); });
    window.addEventListener("su:event", function (e) { fn(e.detail); });
  }
  function clear() { save([]); try { if (bc) bc.postMessage(null); } catch (e) {} }
  /* TEST DATA partition (Oct 17 2026): the console's Load Test Data button writes a fake dataset here, in its OWN keys,
     so it never touches or evicts real events in su.events.v1. Remove Test Data deletes only these two keys. */
  var TKEY = "su.test.v1", TEKEY = "su.events.test.v1";
  function tget(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } }
  function tping() { try { if (bc) bc.postMessage(null); } catch (e) {} try { window.dispatchEvent(new CustomEvent("su:event", { detail: null })); } catch (e) {} }
  var test = {
    on: function () { try { return !!localStorage.getItem(TKEY); } catch (e) { return false; } },
    data: function () { return tget(TKEY); },
    events: function () { var a = tget(TEKEY); return Array.isArray(a) ? a : []; },
    load: function (ds) { var d = Object.assign({}, ds), ev = d.events || []; delete d.events; d.loadedAt = new Date().toISOString();
      try { localStorage.setItem(TKEY, JSON.stringify(d)); localStorage.setItem(TEKEY, JSON.stringify(ev)); } catch (e) { try { localStorage.removeItem(TKEY); localStorage.removeItem(TEKEY); } catch (x) {} return false; }
      tping(); return true; },
    clear: function () { try { localStorage.removeItem(TKEY); localStorage.removeItem(TEKEY); } catch (e) {} tping(); },
    KEY: TKEY, EVENTS_KEY: TEKEY };
  window.addEventListener("storage", function (e) { if (e.key === TKEY) try { window.dispatchEvent(new CustomEvent("su:event", { detail: null })); } catch (x) {} });
  window.SUEvents = { emit: emit, all: load, on: on, clear: clear, KEY: KEY, test: test };
})();
