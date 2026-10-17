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
Types in use: visit.requested, visit.reschedule_requested, addon.ordered, plan.paused, message.sent, photo.added, settings.changed (member); tech.checkin, tech.checkout, photo.arrival, report.submitted, moisture.wet, inventory.logged, inventory.restocked, message.sent (tech); site.visit, scan.started, quote.generated, signup.completed, addon.clicked, waitlist.joined, alacarte_open (site); ask.question and ask.safety (Ask Anything, sample only for now); payment.failed (billing, sample only for now).

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

## Still placeholder
Payments (failed cards and prepaid balance), Ask Anything safety escalations, the route map (it's a drawn sketch, not real geo), arrival/report photos, and NPS/reviews. They need real systems behind them.
