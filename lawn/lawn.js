(function () {
  "use strict";
  var $ = function (s) { return document.querySelector(s); };
  var SQM2SQFT = 10.7639;
  var COLORS = { lawn: "#D4A017", drive: "#05668D", house: "#C1502E" };
  var map, layers = [], freq = "weekly", counter = { lawn: 0, drive: 0, house: 0 };
  var LAWN_NAMES = ["Front Lawn", "Back Lawn", "Side Lawn"];

  function initMap() {
    if (map) return;
    map = L.map("map", { zoomControl: true, maxZoom: 21, tap: true });
    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
      maxZoom: 21, maxNativeZoom: 19,
      attribution: "Powered by Esri | Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community"
    }).addTo(map);
    map.attributionControl.setPrefix('<a href="https://leafletjs.com">Leaflet</a>');
    map.pm.setGlobalOptions({ allowSelfIntersection: false, snappable: false });
    map.on("pm:create", function (e) { register(e.layer, pendingDrawType || "lawn"); pendingDrawType = null; });
  }
  var pendingDrawType = null, edited = false, starterToken = 0;

  function nameFor(type) {
    counter[type]++;
    if (type === "lawn") return LAWN_NAMES[counter.lawn - 1] || ("Lawn Area " + counter.lawn);
    if (type === "drive") return counter.drive > 1 ? "Driveway " + counter.drive : "Driveway";
    return counter.house > 1 ? "Skip Area " + counter.house : "House";
  }

  function register(layer, type) {
    var c = COLORS[type];
    layer.setStyle({ color: c, weight: 3, fillColor: c, fillOpacity: type === "lawn" ? 0.28 : 0.45, dashArray: type === "lawn" ? null : "6 5" });
    var item = { layer: layer, type: type, name: nameFor(type) };
    layers.push(item);
    layer.addTo(map);
    layer.pm.enable({ allowSelfIntersection: false });
    layer.on("pm:edit pm:markerdragend pm:vertexadded pm:vertexremoved", function () { edited = true; recalc(); });
    layer.bindTooltip(item.name, { permanent: false, direction: "center" });
    recalc();
    return item;
  }

  function rectAround(lat, lng, wM, hM) {
    var dLat = (hM / 2) / 111320, dLng = (wM / 2) / (111320 * Math.cos(lat * Math.PI / 180));
    return L.polygon([[lat + dLat, lng - dLng], [lat + dLat, lng + dLng], [lat - dLat, lng + dLng], [lat - dLat, lng - dLng]]);
  }

  function toFeature(layer) { return layer.toGeoJSON(); }
  function unionAll(fs) {
    if (!fs.length) return null;
    if (fs.length === 1) return fs[0];
    try { return turf.union(turf.featureCollection(fs)); } catch (e) { return fs[0]; }
  }
  function areaFt(f) { return f ? turf.area(f) * SQM2SQFT : 0; }

  function recalc() {
    var lawns = [], skips = [], drives = [];
    layers.forEach(function (it) {
      var f = toFeature(it.layer);
      it.sqft = Math.round(areaFt(f));
      (it.type === "lawn" ? lawns : skips).push(f);
      if (it.type === "drive") drives.push(f);
    });
    var U = unionAll(lawns), E = unionAll(skips), net = areaFt(U);
    if (U && E) { try { var x = turf.intersect(turf.featureCollection([U, E])); net -= areaFt(x); } catch (e) {} }
    net = Math.max(0, Math.round(net / 10) * 10);
    $("#sqft").textContent = net.toLocaleString();
    renderAreas(Math.round(areaFt(unionAll(drives))));
    renderQuote(net);
  }

  function renderAreas(driveFt) {
    var ul = $("#areas"); ul.innerHTML = "";
    layers.forEach(function (it, i) {
      var li = document.createElement("li");
      li.innerHTML = '<span class="dot" style="background:' + COLORS[it.type] + '"></span><span class="nm">' + it.name +
        (it.type === "lawn" ? "" : ' <em>(Not Mowed)</em>') + '</span><span class="ft">' + it.sqft.toLocaleString() +
        ' Sq Ft</span><button class="x mw-hover" type="button" aria-label="Remove ' + it.name + '">Remove</button>';
      li.querySelector(".x").onclick = function () { edited = true; map.removeLayer(it.layer); layers.splice(i, 1); recalc(); };
      li.querySelector(".nm").onclick = function () { map.fitBounds(it.layer.getBounds(), { maxZoom: 21 }); };
      ul.appendChild(li);
    });
    if (driveFt > 0) {
      var li = document.createElement("li"); li.className = "note";
      li.textContent = "Driveway Measured: " + driveFt.toLocaleString() + " Sq Ft (Saved For Snow Clearing Quotes Later)";
      ul.appendChild(li);
    }
  }

  var lastQuote = null;
  function renderQuote(sqft) {
    var q = window.suLawnQuote(sqft, freq), btn = $("#addPlan");
    if (sqft < window.SU_LAWN_PRICING.minSqFt) {
      $("#perCut").textContent = "—"; $("#priceNote").textContent = "Outline At Least 500 Sq Ft Of Lawn To See A Price.";
      btn.disabled = true; lastQuote = null; return;
    }
    btn.disabled = false;
    $("#perCut").textContent = "$" + q.perCut;
    $("#priceNote").textContent = (freq === "weekly"
      ? "About " + q.cuts + " Weekly Cuts · Est. $" + (q.perCut * q.cuts).toLocaleString() + " / Season · Billed Per Cut, Skip Anytime"
      : "One Visit · Overgrown Lawns Welcome") + (q.custom ? " · Over 1 Acre, We'll Confirm On Site" : "");
    lastQuote = { sqft: sqft, freq: freq, perCut: q.perCut, cuts: q.cuts };
  }

  function starter(lat, lng) {
    layers.forEach(function (it) { map.removeLayer(it.layer); });
    layers = []; counter = { lawn: 0, drive: 0, house: 0 };
    map.setView([lat, lng], 20);
    register(rectAround(lat, lng, 24, 40), "lawn");
    register(rectAround(lat, lng, 12, 11), "house");
    edited = false; var token = ++starterToken;
    $("#hint").textContent = "Drag The Corner Dots To Match Your Grass. Tap A Midpoint To Add A Corner.";
    findBuilding(lat, lng).then(function (bld) {
      if (bld && !edited && token === starterToken) {
        layers.forEach(function (it) { map.removeLayer(it.layer); });
        layers = []; counter = { lawn: 0, drive: 0, house: 0 };
        var b = bld.getBounds(), padLat = 12 / 111320, padLng = 9 / (111320 * Math.cos(lat * Math.PI / 180));
        register(L.polygon([[b.getNorth() + padLat, b.getWest() - padLng], [b.getNorth() + padLat, b.getEast() + padLng],
          [b.getSouth() - padLat, b.getEast() + padLng], [b.getSouth() - padLat, b.getWest() - padLng]]), "lawn");
        register(bld, "house");
        map.fitBounds(layers[0].layer.getBounds(), { padding: [24, 24], maxZoom: 19 });
        $("#hint").textContent = "We Found Your House Outline. Drag The Lawn Corners To Match Your Grass.";
      }
    });
  }

  function findBuilding(lat, lng) {
    var q = '[out:json][timeout:7];way(around:30,' + lat + ',' + lng + ')[building];out geom;';
    var ctl = new AbortController(); setTimeout(function () { ctl.abort(); }, 8000);
    return fetch("https://overpass-api.de/api/interpreter?data=" + encodeURIComponent(q), { signal: ctl.signal })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        var pt = turf.point([lng, lat]), best = null, bestD = 1e9;
        (d.elements || []).forEach(function (w) {
          if (!w.geometry || w.geometry.length < 4) return;
          var ring = w.geometry.map(function (g) { return [g.lon, g.lat]; });
          var poly = turf.polygon([ring]), a = turf.area(poly);
          if (a < 40 || a > 1500) return;
          var dist = turf.booleanPointInPolygon(pt, poly) ? 0 : turf.distance(pt, turf.centroid(poly));
          if (dist < bestD) { bestD = dist; best = w; }
        });
        return best ? L.polygon(best.geometry.map(function (g) { return [g.lat, g.lon]; })) : null;
      }).catch(function () { return null; });
  }

  function geocode(q) {
    // Nominatim first (best US house-number matches); one request per submit, per the usage policy.
    var n = "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=us&viewbox=-84.2,43.0,-82.4,41.9&q=" + encodeURIComponent(q);
    return fetch(n, { headers: { "Accept-Language": "en" } }).then(function (r) { return r.json(); }).then(function (d) {
      if (!d[0]) throw 0;
      return { lat: +d[0].lat, lng: +d[0].lon };
    }).catch(function () {
      var ph = "https://photon.komoot.io/api/?limit=5&lat=42.48&lon=-83.2&q=" + encodeURIComponent(q);
      return fetch(ph).then(function (r) { return r.json(); }).then(function (d) {
        var f = (d.features || []).filter(function (x) { return x.properties.housenumber || x.properties.osm_key === "building"; })[0] || (d.features || [])[0];
        if (!f) throw new Error("none");
        return { lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0] };
      });
    });
  }

  var busy = false;
  function go(addr) {
    if (busy || !addr) return;
    busy = true; $("#addrMsg").textContent = "Finding Your Home…";
    geocode(addr).then(function (p) {
      $("#addrMsg").textContent = "";
      $("#measure").hidden = false; initMap(); map.invalidateSize();
      starter(p.lat, p.lng);
      $("#measure").scrollIntoView({ behavior: "smooth", block: "start" });
    }).catch(function () {
      $("#addrMsg").textContent = "We Couldn't Find That Address. Try Adding City And ZIP.";
    }).then(function () { setTimeout(function () { busy = false; }, 1100); });
  }

  $("#addrForm").addEventListener("submit", function (e) { e.preventDefault(); go($("#addr").value.trim()); });
  document.querySelectorAll("[data-add]").forEach(function (b) {
    b.addEventListener("click", function () {
      var t = b.getAttribute("data-add"), c = map.getCenter(); edited = true;
      var off = (layers.length % 3 - 1) * 4 / 111320;
      register(t === "drive" ? rectAround(c.lat + off, c.lng, 5, 14) : t === "house" ? rectAround(c.lat + off, c.lng, 6, 6) : rectAround(c.lat + off, c.lng, 14, 10), t);
      $("#hint").textContent = "New Shape Added In The Middle Of The Map. Drag Its Corners Into Place.";
    });
  });
  $("#resetBtn").addEventListener("click", function () { var c = map.getCenter(); starter(c.lat, c.lng); });
  document.querySelectorAll(".seg").forEach(function (b) {
    b.addEventListener("click", function () {
      document.querySelectorAll(".seg").forEach(function (o) { o.classList.remove("on"); o.setAttribute("aria-checked", "false"); });
      b.classList.add("on"); b.setAttribute("aria-checked", "true"); freq = b.getAttribute("data-f"); recalc();
    });
  });
  $("#addPlan").addEventListener("click", function () {
    if (!lastQuote) return;
    try { localStorage.setItem("smartUpkeep.lawnAddon", JSON.stringify(Object.assign({ addedAt: Date.now() }, lastQuote))); } catch (e) {}
    $("#planMsg").textContent = "Added To Your Plan (Demo): " + (lastQuote.freq === "weekly" ? "Weekly Mowing" : "One-Time Mowing") + " At $" + lastQuote.perCut + " / Cut.";
  });
  $("#shareBtn").addEventListener("click", function () {
    var data = { title: "Smart Upkeep Lawn Quote", text: "Get A Lawn Mowing Quote In A Minute", url: location.origin + location.pathname };
    if (navigator.share) { navigator.share(data).catch(function () {}); return; }
    (navigator.clipboard ? navigator.clipboard.writeText(data.url) : Promise.reject()).then(function () { $("#shareMsg").textContent = "Link Copied"; },
      function () { $("#shareMsg").textContent = data.url; });
  });

  var qp = new URLSearchParams(location.search).get("a");
  if (qp) $("#addr").value = qp;
  (window.SmartUpkeepAwaitGate || function (cb) { cb(); })(function () { if (qp) go(qp); });
  var gl = document.querySelector("#prelaunchGate .prelaunch-logo"); if (gl) gl.src = "../assets/A-roof-chevron.svg";
})();
