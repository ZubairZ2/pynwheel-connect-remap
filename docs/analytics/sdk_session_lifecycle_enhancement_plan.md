# SDK Session Lifecycle Enhancement Plan

**Branch:** `sdk-map-analytics`
**Date:** 2026-06-16

---

## Overview

Two enhancements to the SDK analytics session lifecycle:

1. **Tab-switch resilience** — switching tabs should not end a session; use background/active state events instead.
2. **2-minute idle session rotation** — after 2 minutes of inactivity, rotate to a fresh analytics segment UUID while preserving the user's stable identity UUID.

---

## Current State

### Identifiers in play

| Identifier | Storage | Lifetime | Purpose |
|---|---|---|---|
| `pyn_sdk_session_{propertyId}` | localStorage | Permanent per property | Favorites / user identity |
| `PynAnalytics.sessionId` | JS memory | Per page load | Analytics session ID sent to server |
| `sdk_sessions.session_id` | DB | One row per analytics UUID | Server-side session record |

### Current session end triggers

1. `visibilitychange → hidden` fires `map_session_end` + keepalive flush immediately
2. Server-side: gap > `IDLE_TIME_MAPS` (default 10 min) between events triggers a new session row

### Current problems

**Tab switch kills session prematurely.** Every tab switch fires `map_session_end`. User returns to the map but analytics show session ended — gap in data.

**Idle rotation causes duplicate key constraint violation.** The unique index `[:session_id, :community_id]` prevents two `SdkSession` rows with the same `session_id`. When server-side idle logic calls `create_session` with the same `@session_id` UUID, it crashes. This is a latent bug — only avoided in practice if the gap is long enough that the original session ID is never reused.

---

## Proposed Architecture

### Core principle: two-tier identity

```
sdk_session_id (localStorage UUID)   ← stable, never rotates, user identity
    └── analytics_segment_id (memory UUID)  ← rotates on idle, one SdkSession row each
```

The `sdk_session_id` is the "parent" linking all activity windows for one user. The `analytics_segment_id` (currently `PynAnalytics.sessionId`) is the short-lived key that maps to exactly one `SdkSession` row.

---

## Changes

### 1. DB Migration

```ruby
# New migration: add parent link + fix broken unique index
remove_index  :sdk_sessions, name: "idx_sdk_sessions_session_community"
add_column    :sdk_sessions, :parent_sdk_session_id, :string
add_index     :sdk_sessions, [:session_id, :community_id, :start_datetime],
              name: "idx_sdk_sessions_session_community_date"
add_index     :sdk_sessions, [:parent_sdk_session_id, :start_datetime],
              name: "idx_sdk_sessions_parent_date"
```

**Why drop the unique index?** The same `sdk_session_id` user can now have multiple segment rows (one per activity window). Uniqueness must be on `session_id` (segment UUID) alone — which is already guaranteed by `_uuid()` generating a new random UUID per segment.

Column semantics after migration:

| Column | Stores |
|---|---|
| `session_id` | `analytics_segment_id` — short-lived, one per activity window |
| `parent_sdk_session_id` | Stable localStorage `sdk_session_id` — links all segments |

---

### 2. JS — `PynAnalytics` (`pyn-map-sdk-v1.js`)

#### 2a. Replace visibility handler

**Before (line 24):**
```js
s.onHide = function () {
  if (document.visibilityState === 'hidden') {
    s.queue.push({ name: 'map_session_end', type: 'click', ts: Date.now() });
    _flush(s, true);
  }
};
document.addEventListener('visibilitychange', s.onHide);
```

**After:**
```js
s.onHide = function () {
  if (document.visibilityState === 'hidden') {
    s.queue.push({ name: 'map_session_background', type: 'state', ts: Date.now() });
    _flush(s, true);   // keepalive — needed for mobile tab switch / home button
  } else if (document.visibilityState === 'visible') {
    s.queue.push({ name: 'map_session_active', type: 'state', ts: Date.now() });
    // no keepalive — page is already visible
  }
};
document.addEventListener('visibilitychange', s.onHide);
```

`map_session_end` is now **only** sent from `destroy()` (map unmount / component teardown).

#### 2b. Add client-side idle rotation

New fields added to the analytics state object `s`:

```js
s.sdkSessionId = opts.sdkSessionId;   // stable localStorage UUID passed in from PynMapSDK
s.idleTimer    = null;
s.idleMs       = 2 * 60 * 1000;       // 2 minutes
```

New internal function:

```js
function _resetIdle(s) {
  clearTimeout(s.idleTimer);
  s.idleTimer = setTimeout(function () {
    // Mark current segment ended
    s.queue.push({ name: 'map_session_idle', type: 'state', ts: Date.now() });
    _flush(s, false);
    // Rotate to a fresh analytics segment UUID — next event starts a new SdkSession row
    s.sessionId = _uuid();
  }, s.idleMs);
}
```

Call `_resetIdle(s)` at the end of `_capture(s, ...)` to reset the timer on every event.

Clear idle timer in `destroy()`:

```js
destroy: function () {
  s.dead = true;
  clearInterval(s.timer);
  clearTimeout(s.idleTimer);
  document.removeEventListener('visibilitychange', s.onHide);
  // Fire true session end
  s.queue.push({ name: 'map_session_end', type: 'state', ts: Date.now() });
  _flush(s, true);
}
```

#### 2c. Add `parent_sdk_session_id` to batch payload

```js
function _flush(s, beacon) {
  if (s.dead || !s.queue.length) return;
  var events = s.queue.splice(0);
  var body = {
    session_id:            s.sessionId,
    parent_sdk_session_id: s.sdkSessionId,   // NEW
    product_src:           s.productSrc,
    events:                events
  };
  // ... rest unchanged
}
```

#### 2d. Pass `sdkSessionId` into `PynAnalytics.create()`

In `PynMapSDK._startAnalytics()` (line 360):

```js
this._analytics = PynAnalytics.create({
  token:        this._sessionToken,
  apiBase:      this._apiBase(),
  productSrc:   this._productSrc,
  partner:      this._partner,
  sdkVersion:   'v1',
  sdkSessionId: this._sdkSessionId    // NEW — stable localStorage UUID
});
```

---

### 3. Rails — `SdkController` (`api/partner/maps/sdk_controller.rb`)

In `track_events`, read the new param and pass it to the service:

```ruby
def track_events
  session_id            = params[:session_id].to_s.strip
  parent_sdk_session_id = params[:parent_sdk_session_id].to_s.strip.presence
  partner               = params[:partner].to_s.strip.presence
  product_src           = params[:product_src].to_s.strip.presence || "web"
  events                = Array(params[:events]).first(100)
  context               = params[:device_context]&.permit!

  Analytics::SdkAnalyticsService.new(
    community:             @community,
    client_type:           product_src,
    session_id:            session_id,
    parent_sdk_session_id: parent_sdk_session_id,   # NEW
    partner:               partner,
    product:               product_src
  ).process_batch(events: events, device_context: context)

  head :no_content
end
```

---

### 4. Rails — `SdkAnalyticsService`

#### 4a. Accept `parent_sdk_session_id` in initializer

```ruby
def initialize(community:, client_type:, session_id:, partner:,
               parent_sdk_session_id: nil, sdk_version: "v1", product: "web")
  # ...existing...
  @parent_sdk_session_id = parent_sdk_session_id
end
```

#### 4b. Store in `create_session`

```ruby
def create_session
  SdkSession.create!(
    # ...existing fields...
    parent_sdk_session_id: @parent_sdk_session_id
  )
end
```

#### 4c. Simplify `find_or_create_session`

Since the client now rotates the `session_id` UUID on idle, the server no longer needs to split sessions based on a time gap. A fresh UUID = a fresh row. Keep `session_idle?` as a safety fallback only (it won't be hit in normal flow):

```ruby
def find_or_create_session
  last = find_current_session
  return create_session unless last
  # Safety net only: server-side idle check (normally handled client-side)
  session_idle?(last) ? create_session : last.tap { |s| s.updated_at = now }
end
```

#### 4d. New state events are just tracked events

`map_session_background`, `map_session_active`, and `map_session_idle` are stored in `events` JSONB like any other event. No special handling needed. The existing `store_full_event` records timestamps for duration calculations.

---

### 5. `SdkSession` model

```ruby
# app/models/sdk_session.rb
belongs_to :community

# NEW: all segments for one user journey
scope :for_parent_session, ->(id) { where(parent_sdk_session_id: id) }

# Duration of background time calculable from full_event["map_session_background"] / ["map_session_active"] arrays
```

---

## Session Lifecycle After Changes

```
User opens map
  → PynAnalytics.create() generates segment UUID A
  → map_load event → SdkSession row created (session_id=A, parent=SDK_UUID)

User switches tab
  → visibilitychange hidden → map_session_background event (keepalive flush)
  → (session row stays open, no end_datetime set)

User returns to tab
  → visibilitychange visible → map_session_active event
  → idle timer resets
  → same session row continues

User sits idle for 2 minutes
  → idle timer fires → map_session_idle event → flush
  → segment UUID rotates to B (in memory only)

User interacts again
  → next event sends session_id=B, parent=SDK_UUID
  → new SdkSession row created (session_id=B, parent=SDK_UUID)
  → both rows linked via parent_sdk_session_id

User closes map (destroy() called)
  → map_session_end event + keepalive flush
  → end_datetime set on current segment row
```

---

## Analytics Query Patterns

**Single segment session:**
```sql
SELECT * FROM sdk_sessions WHERE session_id = '<segment_uuid>';
```

**Full user journey (all segments):**
```sql
SELECT * FROM sdk_sessions
WHERE parent_sdk_session_id = '<localStorage_uuid>'
ORDER BY start_datetime;
```

**Background time per segment** (from `full_event` JSONB):
- `full_event['map_session_background']` array → timestamps when tab was hidden
- `full_event['map_session_active']` array → timestamps when tab returned
- Calculate sum of `(active.ts - background.ts)` pairs

---

## What Does Not Change

- `pyn_sdk_session_{propertyId}` localStorage key and its role for favorites
- Session token (Bearer) lifecycle — still 50 min client cache / 60 min server expiry
- Event batching cadence (5 sec interval, flush at 20 events)
- All existing event names and their tracking logic
- Analytics dashboard queries — existing `session_id` queries still work per-segment; new `parent_sdk_session_id` queries available for journey-level reporting
