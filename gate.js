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

  /* Pure-JS SHA-256 — works on http:// where crypto.subtle is undefined. */
  function sha256Fallback(ascii) {
    function rightRotate(value, amount) {
      return (value >>> amount) | (value << (32 - amount));
    }
    var mathPow = Math.pow;
    var maxWord = mathPow(2, 32);
    var lengthProperty = "length";
    var i, j;
    var result = "";
    var words = [];
    var asciiBitLength = ascii[lengthProperty] * 8;
    var hash = sha256Fallback.h = sha256Fallback.h || [];
    var k = sha256Fallback.k = sha256Fallback.k || [];
    var primeCounter = k[lengthProperty];
    var isComposite = {};
    for (var candidate = 2; primeCounter < 64; candidate++) {
      if (!isComposite[candidate]) {
        for (i = 0; i < 313; i += candidate) isComposite[i] = candidate;
        hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
        k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
      }
    }
    ascii += "\x80";
    while (ascii[lengthProperty] % 64 - 56) ascii += "\x00";
    for (i = 0; i < ascii[lengthProperty]; i++) {
      j = ascii.charCodeAt(i);
      if (j >> 8) return "";
      words[i >> 2] |= j << ((3 - i) % 4) * 8;
    }
    words[words[lengthProperty]] = (asciiBitLength / maxWord) | 0;
    words[words[lengthProperty]] = asciiBitLength;
    for (j = 0; j < words[lengthProperty];) {
      var w = words.slice(j, j += 16);
      var oldHash = hash;
      hash = hash.slice(0, 8);
      for (i = 0; i < 64; i++) {
        var w15 = w[i - 15], w2 = w[i - 2];
        var a = hash[0], e = hash[4];
        var temp1 = hash[7]
          + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25))
          + ((e & hash[5]) ^ ((~e) & hash[6]))
          + k[i]
          + (w[i] = (i < 16) ? w[i] : (
              w[i - 16]
              + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3))
              + w[i - 7]
              + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))
            ) | 0
          );
        var temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22))
          + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
        hash = [(temp1 + temp2) | 0].concat(hash);
        hash[4] = (hash[4] + temp1) | 0;
      }
      for (i = 0; i < 8; i++) hash[i] = (hash[i] + oldHash[i]) | 0;
    }
    for (i = 0; i < 8; i++) {
      for (j = 3; j + 1; j--) {
        var b = (hash[i] >> (j * 8)) & 255;
        result += ((b < 16) ? "0" : "") + b.toString(16);
      }
    }
    return result;
  }

  function sha256hex(str) {
    if (window.crypto && crypto.subtle && typeof TextEncoder !== "undefined") {
      return crypto.subtle.digest("SHA-256", new TextEncoder().encode(str)).then(function (buf) {
        return Array.prototype.map.call(new Uint8Array(buf), function (b) {
          return ("0" + b.toString(16)).slice(-2);
        }).join("");
      }).catch(function () { return sha256Fallback(str); });
    }
    return Promise.resolve(sha256Fallback(str));
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
        '<h1>Coming Soon</h1>' +
        '<p class="prelaunch-sub">Private Beta</p>' +
        '<form id="prelaunchForm" class="prelaunch-form" autocomplete="off">' +
          '<label class="fl" for="prelaunchPw">Password</label>' +
          '<input id="prelaunchPw" type="password" name="password" autocomplete="current-password" required minlength="1" autocapitalize="none" autocorrect="off" spellcheck="false">' +
          '<div class="err" id="prelaunchErr" role="alert"></div>' +
          '<button class="btn btn-primary btn-big mw-hover" type="submit">Enter</button>' +
        '</form>' +
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
      var val = (input.value || "").trim().toLowerCase();
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
