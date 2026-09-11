# Pynwheel Map — Analytics Data Layer

Reference for PYN-1655. Two audiences, so it is in two halves: **Part 1** is the
schema and setup a client's web team needs (this is what goes to Jennifer for
Renu), **Part 2** is how it works on our side.

---

# Part 1 — For the client's web / analytics team

## What this is

The Pynwheel map emits its interactions to your page's Google Tag Manager data
layer. You wire them up once in your own GTM and own the reporting from there.
We never need your GA4 Measurement ID, your API secret, or any credential.

Every interaction arrives under **one event name**, `pynwheel_map`, and carries an
`action` field saying which interaction it was. So you build your GTM side once:
one custom-event trigger, one GA4 tag. When we add an interaction later, nothing
on your side changes.

## Step 1 — Add the relay snippet

The map runs inside an iframe, so it cannot write to your page's data layer
directly. It posts each interaction to the parent page instead. Add this once to
the page that hosts the iframe, above your GTM container snippet:

```html
<script>
  window.addEventListener("message", function (e) {
    // Security check. Replace with the exact origin Pynwheel gives you.
    if (e.origin !== "<PYNWHEEL_EMBED_ORIGIN>") return;
    if (!e.data || e.data.event !== "pynwheel_map") return;
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(e.data);
  });
</script>
```

The origin check is what stops another site injecting fake events into your
reporting. Ask us for the exact embed origin rather than guessing it, and do not
replace it with a wildcard.

If you embed the map directly rather than in an iframe, skip this step. The map
pushes to `window.dataLayer` itself in that case.

## Step 2 — GTM

1. **Trigger** — Custom Event, event name `pynwheel_map`. One trigger, all
   interactions.
2. **Tag** — GA4 Event. Send the `action` value as the event name, or send a
   fixed name and keep `action` as a parameter. Either works; the first gives
   you separate events in GA4 reports, the second keeps everything under one.
3. **Variables** — one Data Layer Variable per field you want to report on,
   from the table below.
4. **GA4 custom dimensions** — register each one as an event-scoped custom
   dimension in your GA4 property, or it will not appear in reports.

## Step 3 — The fields

Every push carries **all** of these keys. A field that does not apply to an
interaction is explicitly `null` rather than omitted, because GTM merges each
push into one persistent data layer and an omitted key would keep the previous
push's value.

### Always present

| Field | Meaning |
|---|---|
| `event` | Always `pynwheel_map`. |
| `action` | Which interaction. See the action list below. |
| `schema_version` | Version of this schema. Currently `1`. |
| `session_id` | One visit. Rotates after two minutes of inactivity. |
| `visitor_id` | Stable per browser. Lets you count people, not just visits. |
| `ts_iso` | When it happened, UTC, ISO 8601. |
| `company_id` | Pynwheel's id for the management company. |
| `property_id` | Pynwheel's id for the property. |
| `property_name` | The property's name. |
| `page_url` | The page hosting the map, not the iframe's own URL. |

### Present when the interaction involves them

| Field | Meaning |
|---|---|
| `unit_id` | The unit's id **from your data provider**, not Pynwheel's. |
| `unit_name` | The unit's marketing name, e.g. `A-203`. |
| `building` | Building name or number. |
| `floor_level` | Floor number. |
| `floor_plan_id` | The floor plan's id **from your data provider**. |
| `floor_plan_name` | e.g. `2 Bed / 2 Bath`. |
| `bedrooms`, `bathrooms`, `square_footage` | Floor plan attributes. |
| `link_label` | The button text the visitor actually saw, captured at click time. |
| `link_url` | Where the click sent them. |
| `link_index` | Which configured link slot it was: 1, 2 or 3. |
| `amenity_id`, `amenity_name` | For amenity interactions. |
| `filter_name`, `filter_value` | For filter interactions. |
| `favorite_state` | For save/unsave. |
| `shared_entity`, `share_target` | For shares. |

`link_index` is the link's configured slot, not its position on screen. A
property that leaves slot 1 empty still reports its slot 2 link as `2`, so adding
a link later never renumbers your historical data.

No personally identifying information is ever sent. IDs, labels, and property
attributes only.

### Example — Apply Now

```json
{
  "event": "pynwheel_map",
  "action": "apply_clicked",
  "schema_version": 1,
  "session_id": "0f8c…",
  "visitor_id": "b31a…",
  "ts_iso": "2026-09-09T12:33:40.115Z",
  "company_id": 10,
  "property_id": 34,
  "property_name": "Troubadour",
  "page_url": "https://www.example.com/properties/troubadour/",
  "unit_id": "A-203",
  "unit_name": "A-203",
  "building": "Building 4",
  "floor_level": 2,
  "floor_plan_id": "2233",
  "floor_plan_name": "2 Bed / 2 Bath",
  "bedrooms": 2,
  "bathrooms": 2,
  "square_footage": 950,
  "link_label": "Apply Now",
  "link_url": "https://apply.example.com/unit/A-203",
  "link_index": null,
  "amenity_id": null,
  "amenity_name": null,
  "filter_name": null,
  "filter_value": null,
  "favorite_state": null,
  "shared_entity": null,
  "share_target": null
}
```

Schedule a Tour is the identical payload with `action` of
`schedule_tour_clicked`, `link_label` of `Schedule a Tour`, and `link_index` of
`3`.

## Step 4 — Which actions you receive

Enabled per property by Pynwheel. Ask us to turn on any of these; it is a
configuration change on our side, not a code release, and takes effect on the
next page load.

| Action | Interaction |
|---|---|
| `apply_clicked` | Apply Now, on a unit or a student-housing space. |
| `schedule_tour_clicked` | The Schedule a Tour link. |
| `virtual_tour_clicked` | The 3D / virtual tour link. |
| `additional_link_clicked` | The second configurable link slot. |
| `unit_selected` | A unit marker or unit card. |
| `floor_plan_selected` | A floor plan card. |
| `amenity_selected` | An amenity marker or card. |
| `unit_favorited` | Saved or unsaved. |
| `share_clicked` | A share action. |
| `gallery_viewed` | The gallery was opened. |
| `map_filter_used` | Any filter was applied. |

A property that enables the data layer receives the four click-through CTAs at
the top of that table. Ask us for any of the others.

---

# Part 2 — Internals

## Where the pieces live

| Concern | File |
|---|---|
| The contract: names, actions, dimensions, limits | `app/services/analytics/map_event_contract.rb` |
| Its client-side mirror | `PYN_EVENT_CONTRACT` at the top of `public/sdk/pyn-map-sdk-v1.js` |
| Emission and fan-out to sinks | `PynAnalytics` in the same file |
| Which dimensions a React call site sends | `pynwheel-maps/src/analytics/dimensions.js` |
| Event name registry (React) | `pynwheel-maps/src/analytics/index.js` |
| Ingestion and storage | `app/services/analytics/sdk_analytics_service.rb` |
| The fact table | `app/models/sdk_event.rb` |
| Per-property config | `communities.map_analytics_settings` |

**The two contracts must be edited together.** `CONTRACT_VERSION` in the Ruby
file and `PYN_EVENT_CONTRACT.VERSION` in the JS are how they announce agreement,
and the value rides on every push as `schema_version`, so a client running a
stale cached SDK shows up in the data rather than having to be guessed at.

## The sink model

One `capture()` call fans out to every sink in `SINKS`:

- **BatchSink** — Pynwheel's own reporting. Queues, flushes every five seconds or
  every twenty events, keepalive flush on tab hide and unmount.
- **DataLayerSink** — the client's GTM. Immediate, no network of its own.

They have opposite latency requirements, which is why they are not one path: a
tag manager that learns about a click five seconds late has already lost the
pageview it belonged to. Adding an integration — Segment, a pixel, a second
endpoint — means adding one object to `SINKS` and changing no call site.

## Storage

Two tables, deliberately:

- **`sdk_sessions`** — per-session counters, visited pages, device context. What
  every existing analytics dashboard reads. Unchanged.
- **`sdk_events`** — one append-only row per meaningful interaction, with the
  dimensions in typed columns and the long tail in a `properties` JSONB.

Hover and lifecycle events never reach `sdk_events`. A marker hover fires on
every pointer pass and its only consumer is a count, which the session row
already has. `NON_DURABLE_TYPES` in the contract is where that is decided.

Contract dimensions are also kept **out** of the session's `events` bag. They are
per-event facts, and that bag is a per-session last-value hash, so folding them
in both loses them to the next event with the same key and grows a JSONB column
that every flush rewrites.

### What this replaced

`sdk_sessions.full_event` appended every raw event to a JSONB blob. Postgres
rewrites a row's whole TOASTed value on update, so a session's Nth flush rewrote
all N−1 earlier events and re-indexed the result through a GIN index. Nothing in
`app/` or `lib/` ever read the column.

It is no longer written, and its GIN index is dropped. The column itself is kept
for now so the migration stays reversible; a later migration can drop it once the
retained history has been exported or aged out.

A five-event batch now costs three queries: one session insert, one session
update, one `insert_all` for every durable event in the batch.

### Timestamps

`occurred_at` is never the raw client timestamp. A device with a wrong clock
would land its events outside every reporting window. Instead the batch's newest
event is anchored to server receipt time and the rest are placed at their true
offsets behind it, so ordering and spacing survive while skew does not. See
`MapEventContract.occurred_at_for`.

## Enabling a property

```ruby
Community.find(34).update!(map_analytics_settings: {
  "data_layer" => {
    "enabled" => true,
    "actions" => ["apply_clicked", "schedule_tour_clicked"],
    "target_origin" => "https://www.example.com"   # optional
  }
})
```

- `enabled` false, or the key absent, means the map emits nothing to the page.
- `actions` is validated against the contract on read. An unknown name is
  ignored, never trusted. Empty or absent falls back to the four click-through
  CTAs.
- `target_origin` narrows postMessage delivery to one host. Null broadcasts,
  which is the default: the payload has no PII, and the receiving page verifies
  our origin in its own relay snippet, which is the check that actually prevents
  forged events. A value that is not a usable `scheme://host` becomes null rather
  than a guess.

This is server-driven because `pyn-map-sdk-v1.js` is one file every client loads
from our CDN. A hardcoded list would make "expose one more event for one
property" a JS release and a cache bust for everyone.

## Adding a new tracked interaction

1. Add the event name to `pynwheel-maps/src/analytics/index.js`.
2. Call `track(E.YOUR_EVENT, "click", unitDims(unit, …))` at the call site. Use
   the builders in `dimensions.js`; do not hand-assemble a metadata bag.
3. It is now counted on the session and stored in `sdk_events` with no further
   work. It reaches no client data layer.
4. To publish it, add it to `ACTIONS` in **both** contract files and bump both
   version constants. Then name the action in a property's `map_analytics_settings`.

Adding a *dimension* additionally needs a column and one line in `DIMENSIONS`. A
metadata key that is not a dimension still arrives and is still stored, it just
lands in `properties` instead of a column, so a typo degrades to "queryable, but
slowly" rather than silently vanishing.

## The weekly per-property digest

Not built. The schema is shaped for it: `SdkEvent.daily_action_counts` and
`SdkEvent.top_units` are the two queries it needs, and
`idx_sdk_events_community_action_time` is the index they run on. It reuses these
exact event definitions rather than being a second tracking system.
