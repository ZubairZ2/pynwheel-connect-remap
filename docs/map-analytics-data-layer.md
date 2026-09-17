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
`action` field naming what was clicked, such as `101A_clicked` or
`Apply_Now_clicked`. So you build your GTM side once: one custom-event trigger,
one GA4 tag. When we add an interaction later, nothing on your side changes.

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
2. **Tag** — GA4 Event with the fixed event name `pynwheel_map`, and `action`
   sent as a parameter. Do not use `action` as the GA4 event name. GA4 event
   names must start with a letter and stay under 40 characters, and an action
   like `101A_clicked` breaks the first rule. GA4 drops such events without an
   error.
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
| `action` | What was clicked, then `_clicked`. See "How `action` is worded" below. |
| `session_id` | One visit. Rotates after two minutes of inactivity. |
| `ts_iso` | When it happened, UTC, ISO 8601. |
| `company_id` | Pynwheel's id for the management company. |
| `company_name` | The management company's name. |
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
| `amenity_id`, `amenity_name` | For amenity interactions. `floor_level` is the amenity's floor. |
| `filter_name`, `filter_value` | For filter interactions. |
| `favorite_state` | `saved` or `deleted`. |
| `shared_entity`, `share_target` | For shares, e.g. `favorites` and `email`. |

A unit interaction always carries its floor plan's fields too. A favourite
carries the fields of whatever was saved: a unit, a floor plan or an amenity.

All ids are strings. `bedrooms`, `bathrooms`, `square_footage` and
`floor_level` are numbers.

### How `action` is worded

The name of the clicked thing, with spaces turned into underscores and anything
other than letters, digits and underscores removed, then `_clicked`.

| Interaction | `action` |
|---|---|
| Apply Now, or any CMS link | The button text: `Apply_Now_clicked`, `3D_Tour_clicked` |
| A unit | Its name: unit `101-A` gives `101A_clicked` |
| A floor plan | Its name: `2 Bed / 2 Bath` gives `2_Bed_2_Bath_clicked` |
| An amenity | Its name: `Rooftop Pool` gives `Rooftop_Pool_clicked` |
| Saving or removing a favourite | `101A_favorite_saved_clicked`, `101A_favorite_deleted_clicked` |
| Sharing favourites | `Share_favorites_clicked`, `Share_favorites_email_clicked` |
| Opening the gallery | `Gallery_clicked` |
| A filter | `bedrooms_2_clicked` |

To report on a *kind* of interaction rather than one unit, filter on the fields
instead of on `action`: every unit click has a `unit_name`, every favourite a
`favorite_state`.

No personally identifying information is ever sent. IDs, labels, and property
attributes only.

### Example — Apply Now

```json
{
  "event": "pynwheel_map",
  "action": "Apply_Now_clicked",
  "session_id": "0f8c…",
  "ts_iso": "2026-09-09T12:33:40.115Z",
  "company_id": "10",
  "company_name": "Example Management",
  "property_id": "34",
  "property_name": "Troubadour",
  "page_url": "https://www.example.com/properties/troubadour/",
  "link_label": "Apply Now",
  "link_url": "https://apply.example.com/unit/A-203",
  "unit_id": "4455613-4814590",
  "unit_name": "A-203",
  "building": "Building 4",
  "floor_level": 2,
  "floor_plan_id": "2233",
  "floor_plan_name": "2 Bed / 2 Bath",
  "bedrooms": 2,
  "bathrooms": 2,
  "square_footage": 950,
  "amenity_id": null,
  "amenity_name": null,
  "filter_name": null,
  "filter_value": null,
  "favorite_state": null,
  "shared_entity": null,
  "share_target": null
}
```

Schedule a Tour is the identical payload with `link_label` of
`Schedule a Tour`, so `action` is `Schedule_a_Tour_clicked`.

## Step 4 — Which actions you receive

Enabled per property by Pynwheel. Ask us to turn on any of these; it is a
configuration change on our side, not a code release, and takes effect on the
next page load. These are our names for each kind of interaction. The `action`
you receive is worded as above.

| Kind | Interaction |
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
| The contract: names, actions, wording, published fields, dimensions, limits | `app/services/analytics/map_event_contract.rb` |
| The engine that applies it | `PYN_EVENT_CONTRACT` at the top of `public/sdk/pyn-map-sdk-v1.js` |
| Filling in unit, floor plan and amenity details from an id | `_analyticsDims` in the same file |
| Emission and fan-out to sinks | `PynAnalytics` in the same file |
| Click-time facts a React call site sends | `pynwheel-maps/src/analytics/dimensions.js` |
| Event name registry (React) | `pynwheel-maps/src/analytics/index.js` |
| Ingestion and storage | `app/services/analytics/sdk_analytics_service.rb` |
| The fact table | `app/models/sdk_event.rb` |
| Per-property config | `communities.map_analytics_settings` |

**There is one contract, and it is the Ruby one.** It reaches the SDK inside the
property payload as `property.analytics.contract`, only for a property that
publishes. The SDK keeps no copy. It used to keep a hand-edited mirror, which
drifted: it keyed map-marker clicks as `unit_marker_click` while the SDK
captured them as `unit_marker`, so no marker click was ever published.

The contract also checks itself at boot. An action in `ACTIONS` without a
`PUBLISHED_ACTIONS` entry, or the reverse, raises when the class loads.

## Two names for every interaction

- **The stable action**, such as `unit_selected`. Stored in
  `sdk_events.action`, named in a property's allowlist, and shown on the CMS
  screen. It never depends on free text.
- **The worded action**, such as `101A_clicked`. Built by the SDK from the
  `subject` in `PUBLISHED_ACTIONS`, and sent only to a client's data layer.

`sdk_events.name` keeps the internal event name, such as `unit_marker`.

## Where the details come from

A call site sends the id of what was clicked. `_analyticsDims` in the SDK looks
that id up in the map payload and fills in the rest before either sink sees the
event, so `sdk_events` stores exactly what a client receives.

| The call site sends | The SDK fills in |
|---|---|
| `unit_id`, `viewed_unit_id`, or a unit favourite's `favorited_id` | Unit ids and name, building, floor, and the unit's floor plan |
| `floorplan_id`, or a floor plan favourite's `favorited_id` | Floor plan ids and name, bedrooms, bathrooms, size |
| `amenity_id`, `marker_id`, or an amenity favourite's `favorited_id` | Amenity id and name, and its floor |

Values the SDK resolves replace the call site's. Where nothing resolves, as on
the shared-favorites screen, the call site's values stand. Click-time facts such
as `link_label` are never replaced. Fixed per-event values, such as
`favorite_state` for `save_favorite`, come from `_ANALYTICS_EVENT_DIMS`.

The SDK's own favourite API reports saves and removals as
`favorite_save_confirmed` and `favorite_remove_confirmed`. The visitor's click is
`save_favorite` or `delete_favorite`, captured by the host. Emitting
`save_favorite` from both counted and published every save twice.

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
    "actions" => ["apply_clicked", "schedule_tour_clicked"],   # stable actions
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
2. Call `track(E.YOUR_EVENT, "click", { unit_id })` at the call site, or
   `floorplan_id` / `amenity_id`. The SDK fills in the rest. Send click-time
   facts, such as a button's label, with the builders in `dimensions.js`.
3. It is now counted on the session and stored in `sdk_events` with full
   details. It reaches no client data layer.
4. To publish it, add one line to `ACTIONS` and one entry to
   `PUBLISHED_ACTIONS` in `map_event_contract.rb`, and bump `CONTRACT_VERSION`.
   It appears on the CMS screen, off until a property ticks it. No SDK release.

For example, to publish the pricing calculator:

```ruby
# ACTIONS
"calculate_modal_open" => "calculator_opened",

# PUBLISHED_ACTIONS: gives "101A_calculator_clicked"
"calculator_opened" => {
  label: "The pricing calculator was opened", subject: %w[unit_name =calculator]
},
```

A new published *field* is one line in `PUBLISHED_FIELDS`. Only published
events are clicks; hovers never publish.

Adding a *dimension* additionally needs a column and one line in `DIMENSIONS`. A
metadata key that is not a dimension still arrives and is still stored, it just
lands in `properties` instead of a column, so a typo degrades to "queryable, but
slowly" rather than silently vanishing.

## The weekly per-property digest

Not built. The schema is shaped for it: `SdkEvent.daily_action_counts` and
`SdkEvent.top_units` are the two queries it needs, and
`idx_sdk_events_community_action_time` is the index they run on. It reuses these
exact event definitions rather than being a second tracking system.
