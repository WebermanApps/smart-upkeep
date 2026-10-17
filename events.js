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
  window.SUEvents = { emit: emit, all: load, on: on, clear: clear, KEY: KEY };
})();
