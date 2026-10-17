# Smart Upkeep Operator Console

URL: https://smartupkeep.ai/console/ (behind the same password gate as the rest of the site).

## How data flows today (prototype)
- Every app loads `/events.js`, which exposes `window.SUEvents`.
- Apps call `SUEvents.emit(type, app, { member, tech, payload })`. That writes one event to localStorage (`su.events.v1`, capped at 500 events) and broadcasts it on the `su-events` BroadcastChannel.
- The console reads `SUEvents.all()` and merges it with `console/sample-data.js` (seed events marked `sample: true`, all fake names). It re-renders on `SUEvents.on(...)`, so an open console tab updates live.
- Because it's localStorage, this only works in **one browser**. Nothing leaves the device.

## Event format (keep this when you add a backend)
```json
{ "id": "e…", "type": "visit.requested", "app": "member|tech|site|ask|billing",
  "member": "Jordan Sample", "tech": null, "ts": "2026-10-17T03:40:00.000Z",
  "payload": { }, "sample": false }
```
Types in use: visit.requested, visit.reschedule_requested, addon.ordered, plan.paused, message.sent, photo.added, settings.changed (member); tech.checkin, tech.checkout, photo.arrival, report.submitted, moisture.wet, inventory.logged, inventory.restocked, message.sent (tech); site.visit, scan.started, quote.generated, signup.completed, addon.clicked, waitlist.joined, alacarte_open (site); tech.enroute (tech, Navigate); ask.question and ask.safety (Ask Anything, sample only for now); payment.failed (billing, sample only for now).

## Swapping to Supabase later
1. Create the table `events (id text primary key, type text, app text, member text, tech text, ts timestamptz default now(), payload jsonb, sample bool default false)`. Turn on Row Level Security: apps may insert, and only staff may select.
2. In `events.js`, keep the same `emit/all/on/clear` API:
   - `emit` → `supabase.from('events').insert(ev)`
   - `all` → `select * order by ts desc limit 500` (cache it, since the console calls `all()` synchronously; or make render async)
   - `on(fn)` → `supabase.channel('events').on('postgres_changes', {event:'INSERT', schema:'public', table:'events'}, p => fn(p.new)).subscribe()`
3. Stop loading `sample-data.js` in production, or load it only with `?sample=1`.
4. Member and tech identities come from auth (`member_id`/`tech_id` columns) instead of the fixed sample names.

## Swapping to Firebase later
Same idea with Firestore: `addDoc(collection(db,'events'), ev)` for emit, `query(orderBy('ts','desc'), limit(500))` for all, and `onSnapshot` for on. Lock writes and reads down with security rules.

## House photo rule
Always show the member's real house, using the best available photo (a clear, well-lit front exterior). Fall back to the drawn house only when no good photo exists or the photo fails to load. Member records carry `photo` (URL) and `photoSource` (where it came from). The console Members list shows a thumbnail, member detail shows a banner, and the tech app's job card and Driving To view follow the same rule. With a real backend, store the chosen photo per home (for example a `homes.photo_url` column) and keep the drawn house as the default.

## Still placeholder
Payments (failed cards and prepaid balance), Ask Anything safety escalations, the route map (it's a drawn sketch, not real geo), arrival/report photos, and NPS/reviews. They need real systems behind them.

## Test Data (Demo Mode)
- **What it is:** 100 fake members (made-up names, `@example.com` emails, `555-01xx` phones), 3 fake techs and a year of plans, visits, routes and van stock, all flagged `test: true`. Every member sits at a real, public residential address (from OpenStreetMap) so maps and routes behave like the real thing. These are not customers. Do not contact anyone at these addresses.
- **Turn it on:** in the console, tap **Load Test Data**. A **TEST DATA** banner appears, and the dashboards, Members list (search, county/plan/status filters, A to Z sort), member profile drawer, Routes view (pick a day or tap Busiest Day; stops in drive order, grouped by area, with a drawn map from real coordinates and a Materials Needed vs On Van check) and job cards all read the test set. Sample data is hidden while test data is on. Live events still show.
- **Turn it off:** tap **Remove Test Data** in the banner or the toolbar. This deletes only the test keys.
- **Storage:** `events.js` (`SUEvents.test`) keeps test data in its own localStorage keys, `su.test.v1` and `su.events.test.v1`. It never writes to `su.events.v1`, so real events are never overwritten or pushed out by the 500-event cap.
- **Build-out pages:**
  - Client 1, 2 and 3: `/member/?client=1`, `/member/?client=2` and `/member/?client=3`. These work without loading anything.
  - Any loaded test member: `/member/?test=T001` through `T100`.
  - Tech Dash 1, 2 and 3: `/tech/?dash=1`, `/tech/?dash=2` and `/tech/?dash=3` (Oakland, Macomb and Wayne routes). Add `&day=YYYY-MM-DD` to open a specific route day.
- **Where the data lives:** inline in these page-locked HTML files only. No separate data file ships. The master JSON/CSV, data sources and the generator are in the private ops repo (`smartupkeep-ops/test-data/`).
- **House photos (Client 1-3):** chosen by the photo rule: gather every listing photo AND the Street View view, then pick the clearest, best-lit, unobstructed front exterior. Photos are embedded as data URIs inside the locked pages (addresses are sensitive), never as public files.
  - Client 1 (5439 Deerfield Village Dr): listing photo, Realcomp MLS 61025956 via Redfin, photo 50 of 65. Daylight, straight-on, whole brick front with entry and garage, nothing in the way. The twilight hero shot is darker, the other exterior angles are partly hidden by trees, and Street View has a front-yard tree across the house.
  - Client 2 (3153 Belinda Dr): listing photo, Realcomp MLS 21612924 via Redfin (the only listing photo). Sunny, sharp, whole front in view. Street View is late winter with bare trees and flat light.
  - Client 3 (493 Buckingham Rd): Google Street View **embed** (keyless iframe, cropped to hide controls, captioned "Street View © Google"; no static copy saved, per Google's terms). The only front listing photo is snowy, overcast and 512 px; Street View is summer and sunny.
  - Shown on the member header (Client 1-3), the tech job card and the Driving To view, and the console member drawer. Other test homes show the drawn house.
  - The three client addresses were re-pointed from interpolated OSM house numbers to the nearest real parcels (verified on Redfin). The other 97 homes are not re-checked.
- **Tech headshots:** wired to `assets/tech-dana-whitmore.jpg`, `assets/tech-luis-ferreira.jpg`, `assets/tech-keon-atwater.jpg` (400x400) in Tech Dash 1-3 (avatar and top bar) and the console Techs list, with initials until the files are added.

## Accent Colours (Max, Oct 17)
Light mode only, exact brand hexes from `assets/brand-tokens.css`:
- Tech pages (tech app, Tech Dash 1-3): lagoon `#05668D`.
- Member pages (member app, Client 1-3): terracotta `#C1502E`, deep `#A8431F`.
- Console: a 3 px lagoon-to-terracotta gradient line under the header and test banner; tech rows and route cards get a lagoon edge, member rows a terracotta edge; Techs/Routes headings lagoon, Members heading terracotta-deep.

## Back Buttons (Brand Rule R104)
Every Back button returns to wherever the user came from: `history.back()` when there is same-site history, then a same-origin `document.referrer` or a trusted same-origin `from=` param, then the fixed fallback. FAQ's Back pill uses this (`data-back`). Member "‹ Visits" / "‹ Profile", tech stepper controls and the main site's Back pill (in-app screen stack) are in-app navigation and stay as they are. The console "‹" is a route-day control, not a Back button.

## Pull To Refresh
Every page includes the one shared `ptr.js` (the main page's code): home and quote flow, member app (Client 1-3), tech app (Tech Dash 1-3), console, FAQ, lawn, watch and the in-person form. Pulls that start on cards, inputs, swipe rows or dialogs are ignored by design.

## Offline Sign-Up Forms (Legal, Oct 17)
- `forms/in-person/`: printable in-person / door / event form with the bold 3-day cancel statement next to the signature and two Notice of Cancellation copies. Locked, `noindex`, not linked from any page. Draft, pending Michigan attorney review.
- The outbound phone script lives in the private ops repo (`sales/phone-sales-script.md`).
- The online form has no 3-day notice; it has the auto-renewal terms, a separate consent box before any charge, and the one-step online cancel page (`/#cancel`).
