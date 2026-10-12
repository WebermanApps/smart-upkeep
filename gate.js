/* Pre-launch password gate for smartupkeep.ai.
   Launch removal: set SMART_UPKEEP_PRICING.prelaunchGate.enabled = false
   in pricing-config.js, OR remove this script tag from index.html. */
(function () {
  "use strict";
  var P = window.SMART_UPKEEP_PRICING || {};
  var G = P.prelaunchGate || {};
  var KEY = G.storageKey || "smartUpkeep.gateUnlocked";
  var HASH = G.passwordSha256 || "";
  var pending = null;

  function ok() { window.__SU_GATE_OK = true; }
  function unlocked() {
    try { return !!HASH && localStorage.getItem(KEY) === HASH; } catch (e) { return false; }
  }

  window.SmartUpkeepAwaitGate = function (cb) {
    if (!G.enabled || unlocked()) { ok(); cb(); return; }
    pending = cb;
    show();
  };

  if (!G.enabled || unlocked()) { ok(); return; }

  function sha256hex(str) {
    if (window.crypto && crypto.subtle) {
      return crypto.subtle.digest("SHA-256", new TextEncoder().encode(str)).then(function (buf) {
        return Array.prototype.map.call(new Uint8Array(buf), function (b) {
          return ("0" + b.toString(16)).slice(-2);
        }).join("");
      });
    }
    return Promise.reject(new Error("Web Crypto unavailable"));
  }

  function show() {
    if (document.getElementById("prelaunchGate")) return;
    var el = document.createElement("div");
    el.id = "prelaunchGate";
    el.className = "prelaunch-gate";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-modal", "true");
    el.setAttribute("aria-label", "Private Beta Access");
    el.innerHTML =
      '<div class="prelaunch-inner">' +
        '<img class="prelaunch-logo" src="assets/A-roof-chevron.svg" alt="Smart Upkeep">' +
        '<p class="eyebrow">Smart Upkeep</p>' +
        '<h1>Coming Soon</h1>' +
        '<p class="prelaunch-sub">Private Beta</p>' +
        '<p class="muted small">Metro Detroit home maintenance membership. Enter the beta password to continue.</p>' +
        '<form id="prelaunchForm" class="prelaunch-form" autocomplete="off">' +
          '<label class="fl" for="prelaunchPw">Password</label>' +
          '<input id="prelaunchPw" type="password" name="password" autocomplete="current-password" required minlength="1">' +
          '<div class="err" id="prelaunchErr" role="alert"></div>' +
          '<button class="btn btn-primary btn-big mw-hover" type="submit">Enter Beta</button>' +
        '</form>' +
        '<p class="small muted prelaunch-foot">Built by Max Weberman</p>' +
      '</div>';
    document.body.appendChild(el);
    document.body.classList.add("gate-locked");
    var form = document.getElementById("prelaunchForm");
    var input = document.getElementById("prelaunchPw");
    var err = document.getElementById("prelaunchErr");
    setTimeout(function () { try { input.focus(); } catch (e) {} }, 50);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      err.textContent = "";
      var val = (input.value || "").trim();
      if (!val) { err.textContent = "Enter the password."; return; }
      sha256hex(val).then(function (hex) {
        if (hex !== HASH) {
          err.textContent = "That password did not match. Try again.";
          input.select();
          return;
        }
        try { localStorage.setItem(KEY, HASH); } catch (ex) {}
        ok();
        el.remove();
        document.body.classList.remove("gate-locked");
        if (typeof pending === "function") { var cb = pending; pending = null; cb(); }
      }).catch(function () {
        err.textContent = "Could not verify password in this browser.";
      });
    });
  }
})();
