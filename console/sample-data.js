/* SAMPLE DATA ONLY for the operator console. Fake people, fake addresses, fake numbers. No real traction.
   Seed events use the same format as ../events.js and are marked sample:true. Times are relative to "now" so the board always looks current. */
(function () {
  var now = Date.now(), m = 60000, h = 60 * m, d = 24 * h;
  function t(ago) { return new Date(now - ago).toISOString(); }
  var MEMBERS = [
    { id: "m1", name: "Jordan Sample", addr: "2573 Wickfield Rd, West Bloomfield", tier: "gold", status: "Active", health: "1 to recheck", next: "Dec 8 to 12", credits: 1, since: "Apr 2026" },
    { id: "m2", name: "Avery Example", addr: "100 Sample St, Royal Oak", tier: "gold", status: "Active", health: "All good", next: "Today", credits: 0, since: "May 2026" },
    { id: "m3", name: "Blake Demo", addr: "200 Example Ave, Troy", tier: "silver", status: "Active", health: "All good", next: "Today", credits: 0, since: "Jun 2026" },
    { id: "m4", name: "Casey Test", addr: "300 Demo Ct, Birmingham", tier: "platinum", status: "Active", health: "Watch: attic", next: "Today", credits: 2, since: "Apr 2026" },
    { id: "m5", name: "Devon Placeholder", addr: "400 Sample Rd, Ferndale", tier: "silver", status: "Paused", health: "All good", next: "Paused", credits: 0, since: "Jul 2026" },
    { id: "m6", name: "Emery Mock", addr: "500 Example Ln, Berkley", tier: "gold", status: "Cancel Pending", health: "All good", next: "None", credits: 0, since: "May 2026" },
    { id: "m7", name: "Finley Sample", addr: "600 Demo Dr, Clawson", tier: "platinum", status: "Active", health: "1 to recheck", next: "Oct 22", credits: 1, since: "Aug 2026" },
    { id: "m8", name: "Gray Example", addr: "700 Test Blvd, Southfield", tier: "silver", status: "Active", health: "All good", next: "Nov 3", credits: 0, since: "Sep 2026" }];
  var TECHS = [
    { id: "t1", name: "Alex Sample", certs: ["EPA Section 608", "EPA Lead-Safe RRP", "OSHA 10", "CPR and First Aid"], van: "Van 1" },
    { id: "t2", name: "Sam Demo", certs: ["EPA Section 608", "OSHA 10"], van: "Van 2" },
    { id: "t3", name: "Riley Test", certs: ["OSHA 10", "CPR and First Aid"], van: "Van 3" }];
  var ROUTES = [
    { tech: "Alex Sample", stops: [["Avery Example", "100 Sample St, Royal Oak", "9:00", "Done"], ["Blake Demo", "200 Example Ave, Troy", "11:30", "On Site"], ["Casey Test", "300 Demo Ct, Birmingham", "2:30", "Next"]] },
    { tech: "Sam Demo", stops: [["Finley Sample", "600 Demo Dr, Clawson", "10:00", "Done"], ["Gray Example", "700 Test Blvd, Southfield", "1:00", "Late"]] }];
  var LOW = [["Furnace filters 16x25x1 (case)", 1, 4], ["Nitrile gloves (100)", 0, 2], ["Fridge water filters (assorted)", 2, 6]];
  var LAWN = [["Blake Demo", "Troy", "Measured from above", "Quote ready"], ["Hollis Sample", "Novi", "Waiting for measure", "New"]];
  var WAIT = ["48170", "48197", "48105", "48170"];
  var E = [];
  function ev(ago, type, app, member, tech, payload) { E.push({ id: "s" + E.length, type: type, app: app, member: member, tech: tech, ts: t(ago), payload: payload || {}, sample: true }); }
  ev(12 * m, "ask.safety", "ask", "Casey Test", null, { kind: "Gas smell", text: "I smell gas near the water heater", triage: "Urgent", handoff: true, answer: "Leave the home now and call 911 or the gas company." });
  ev(40 * m, "moisture.wet", "tech", "Avery Example", "Alex Sample", { area: "Basement corner", reading: 24 });
  ev(55 * m, "checkin.missed", "tech", "Gray Example", "Sam Demo", { stop: "700 Test Blvd, Southfield", window: "1:00" });
  ev(3 * h, "payment.failed", "billing", "Emery Mock", null, { reason: "Card declined", amount: "Sample" });
  ev(20 * m, "visit.requested", "member", "Finley Sample", null, { label: "Request a Visit", note: "Dripping under kitchen sink", urgent: true });
  ev(9 * h, "tech.checkin", "tech", "Avery Example", "Alex Sample", { stop: "100 Sample St, Royal Oak" });
  ev(8.95 * h, "photo.arrival", "tech", "Avery Example", "Alex Sample", { stop: "100 Sample St, Royal Oak" });
  ev(7.6 * h, "report.submitted", "tech", "Avery Example", "Alex Sample", { visit: "Fall Visit", tasksDone: 9, minutes: 74, notes: "Filter changed. Recheck next visit", moisture: [{ area: "Basement corner", reading: 24, band: "wet" }, { area: "Kitchen sink", reading: 12, band: "dry" }] });
  ev(7.55 * h, "tech.checkout", "tech", "Avery Example", "Alex Sample", { stop: "100 Sample St, Royal Oak" });
  ev(6.5 * h, "tech.checkin", "tech", "Blake Demo", "Alex Sample", { stop: "200 Example Ave, Troy" });
  ev(8 * h, "report.submitted", "tech", "Finley Sample", "Sam Demo", { visit: "Monthly Check-In", tasksDone: 6, minutes: 41, notes: "All systems normal", moisture: [{ area: "Hall bath", reading: 17, band: "watch" }] });
  ev(2 * h, "message.sent", "member", "Jordan Sample", null, { channel: "sms", text: "Can the tech look at our garage door too?", triage: "Question", responded: 18 });
  ev(5 * h, "ask.question", "ask", "Blake Demo", null, { text: "How often should I flush my water heater?", triage: "Question", answer: "Once a year; it is part of your plan.", responded: 0 });
  ev(26 * h, "message.sent", "member", "Casey Test", null, { channel: "mail", text: "Can we move the winter visit to the second week?", triage: "Booking", responded: 42 });
  ev(30 * h, "visit.reschedule_requested", "member", "Casey Test", null, { visit: "Winter Visit" });
  ev(28 * h, "addon.ordered", "member", "Jordan Sample", null, { addon: "Exterior Window Washing" });
  ev(2 * d, "plan.paused", "member", "Devon Placeholder", null, { plan: "Essentials" });
  ev(4 * h, "inventory.logged", "tech", null, "Alex Sample", { item: "Furnace filters 16x25x1" });
  ev(3.5 * h, "inventory.restock_requested", "tech", null, "Sam Demo", { item: "Nitrile gloves (100)", auto: true });
  ev(5 * h, "schedule.changed", "tech", "Gray Example", "Sam Demo", { from: "11:00", to: "1:00" });
  ev(6 * h, "waitlist.joined", "site", null, null, { zip: "48170" });
  ev(1.2 * d, "waitlist.joined", "site", null, null, { zip: "48197" });
  [1, 2, 3, 5, 8, 13, 20, 26].forEach(function (k, i) { ev(k * h, "site.visit", "site", null, null, {}); if (i % 2 === 0) ev(k * h - 5 * m, "scan.started", "site", null, null, {}); if (i % 3 === 0) ev(k * h - 9 * m, "quote.generated", "site", null, null, { tier: "Plus" }); });
  ev(1.5 * d, "signup.completed", "site", "Gray Example", null, { plan: "Essentials", yardSign: true });
  ev(1.4 * d, "addon.clicked", "site", null, null, { addon: "windows" });
  ev(30 * m, "addon.clicked", "site", null, null, { addon: "radon" });
  window.SU_SAMPLE = { MEMBERS: MEMBERS, TECHS: TECHS, ROUTES: ROUTES, LOW: LOW, LAWN: LAWN, WAIT: WAIT, EVENTS: E,
    REVENUE: { refundsDue: 1, failedCards: 1 }, METRICS: { retention: "Sample: 7 of 8 active or paused", nps: "Placeholder (no reviews yet)" } };
})();
