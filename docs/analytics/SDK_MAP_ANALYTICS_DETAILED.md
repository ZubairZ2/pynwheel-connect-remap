# SDK Map Analytics — Comprehensive Technical Documentation

**Last Updated:** 2026-06-10  
**Idle Time:** 10 minutes (same as old maps analytics)  
**Database Model:** `SdkSession` (JSONB-based)

---

## Table of Contents

1. [Core Concepts](#core-concepts)
2. [Session Lifecycle](#session-lifecycle)
3. [Interaction Tracking](#interaction-tracking)
4. [Event Capture](#event-capture)
5. [Device Context](#device-context)
6. [Complete Event Inventory](#complete-event-inventory)
7. [Data Flow Examples](#data-flow-examples)
8. [Database Schema](#database-schema)
9. [Analytics Queries](#analytics-queries)

---

## Core Concepts

### What is an SdkSession?

An **SdkSession** is a single user engagement instance with the SDK map. One session = one continuous period of map interaction.

**Session boundaries:**
- **Start:** User loads the page → SDK initializes → first event arrives at server
- **End:** User closes tab / navigates away → `visibilitychange=hidden` → `map_session_end` event sent
- **Idle split:** If user idles for 10 minutes without interacting, next event creates a NEW session (same `session_id` UUID, new DB record)

### Why Sessions Matter

Sessions allow you to:
- **Group related events** (all clicks in one user visit)
- **Calculate session duration** (time between `start_datetime` and `end_datetime`)
- **Track user journeys** (what pages visited, how many interactions)
- **Measure engagement** (sessions with vs without meaningful interactions)

---

## Session Lifecycle

### Step 1: SDK Initialization

```javascript
const sdk = PynMapSDK.create({
  token:      apiKey,
  propertyId: propertyId,
  container:  containerRef.current,
  // analytics: false  ← only if disabling
  clientType: 'web_map'  // or touch_map, ipad_map, mobile_app
});
```

At this point:
- SDK has a **session token** (from `_verifyPartner` exchange)
- SDK generates a **UUID** for analytics: `sessionId = crypto.randomUUID()`
- PynAnalytics is initialized with this token + sessionId

```javascript
this._analytics = PynAnalytics.create({
  token:      this._sessionToken,
  apiBase:    this._apiBase(),
  clientType: cfg.clientType || 'web_map',
  sdkVersion: 'v1',
  sessionId:  _uuid()  // ← Fresh UUID every page load
});
```

### Step 2: Events Queue in Memory

User interacts with map:

```javascript
// User clicks unit marker
this._analytics?.capture('unit_marker', 'click', { viewed_unit_id: '456' });

// This does NOT send immediately. Instead:
// 1. Event is queued in memory: s.queue.push({ name, type, metadata, ts })
// 2. Queue grows as user clicks more
// 3. When queue has 20+ items OR 5 seconds pass: _flush(s, false)
```

Queue structure:
```javascript
s.queue = [
  { name: "map_load",         type: "click", metadata: {},                  ts: 1234567890000 },
  { name: "unit_marker",      type: "click", metadata: { viewed_unit_id: "456" }, ts: 1234567891000 },
  { name: "zoom_in",          type: "click", metadata: {},                  ts: 1234567892000 },
  { name: "bedroom_filter",   type: "click", metadata: { filter_bedroom: "2" }, ts: 1234567893000 }
]
```

### Step 3: Batch Flush to Server

After 5 seconds OR queue full (20+ events), SDK sends **one HTTP POST**:

```javascript
POST /api/partner/maps/events
Authorization: Bearer <session_token>
Content-Type: application/json

{
  "session_id":   "550e8400-e29b-41d4-a716-446655440000",
  "client_type":  "web_map",
  "device_context": {                          // ← Only on FIRST flush
    "device_type":     "desktop",
    "viewport_width":  1440,
    "viewport_height": 900,
    "referrer":        "https://property.com",
    "sdk_version":     "v1",
    "user_agent":      "Mozilla/5.0..."
  },
  "events": [
    { "name": "map_load",       "type": "click", "ts": 1234567890000 },
    { "name": "unit_marker",    "type": "click", "ts": 1234567891000, "metadata": { "viewed_unit_id": "456" } },
    { "name": "zoom_in",        "type": "click", "ts": 1234567892000 },
    { "name": "bedroom_filter", "type": "click", "ts": 1234567893000, "metadata": { "filter_bedroom": "2" } }
  ]
}
```

**Key points:**
- `device_context` sent **only once** on first flush (SDK sets `contextSent = true` after)
- Subsequent flushes omit it (saves bandwidth)
- Each flush can have up to 100 events
- Fire-and-forget: failures are silently ignored (analytics must never break the map)

### Step 4: Server Processes Batch

`POST /api/partner/maps/events` → `SdkController#track_events`

```ruby
def track_events
  session_id  = params[:session_id].to_s.strip
  client_type = ALLOWED_CLIENT_TYPES.include?(params[:client_type]) ? params[:client_type] : "web_map"
  events      = Array(params[:events]).first(100)       # ← Hard cap: 100 events per batch
  context     = params[:device_context]

  Analytics::SdkAnalyticsService.new(
    community:   @community,
    client_type: client_type,
    session_id:  session_id,
    partner:     @session_api_key
  ).process_batch(events: events, device_context: context)

  head :no_content  # ← Always 204, even if processing fails
end
```

### Step 5: Analytics Service Processes Events

`SdkAnalyticsService#process_batch` does the heavy lifting:

```ruby
def process_batch(events:, device_context: nil)
  return if events.blank?

  session = nil

  events.each do |raw|
    name = raw["name"].to_s.strip
    type = raw["type"].to_s.presence || "click"
    meta = sanitize_metadata(raw["metadata"])

    # Handle session end
    if name == "map_session_end"
      (session || find_current_session)&.update_column(:end_datetime, now)
      next
    end

    # Find or create session
    session ||= name == "map_load" ? create_session : find_or_create_session
    next unless session

    # Process the event
    key = "#{name}_#{type}"                    # e.g., "unit_marker_click"
    increment_event(session, key)              # ← Increment events[key] counter
    merge_event_metadata(session, meta)        # ← Merge metadata into events
    update_interactions(session, key)          # ← Increment map_interactions if qualifies
    update_visited_pages(session, name)        # ← Add to visited_pages array
  end

  # Set device context once
  if session && device_context.present?
    session.device_context = sanitize_context(device_context)
  end

  session&.save
rescue StandardError => e
  Rails.logger.error("[SdkAnalyticsService#process_batch] #{e.class}: #{e.message}")
end
```

### Step 6: Session Lookup Logic

**First event in batch?**

```ruby
def find_or_create_session
  last = find_current_session
  return create_session unless last           # No previous session → create new
  session_idle?(last) ? create_session : last # Idle? Create new. Otherwise reuse.
end

def find_current_session
  SdkSession.where(
    community_id: @community.id,
    session_id:   @session_id,                # ← Exact UUID match
    client_type:  @client_type
  ).order(:created_at).last                   # ← Latest session with this UUID
end
```

**Idle check:**

```ruby
def session_idle?(session)
  session_idle_at?(session.updated_at&.in_time_zone(@timezone))
end

def session_idle_at?(dt)
  return false unless dt
  ((now.to_datetime - dt.to_datetime) * 24 * 60).to_i >= ENV.fetch("IDLE_TIME_MAPS", 10).to_i
end
```

**Timeline example:**

```
14:00:00 → Event batch arrives with session_id="550e8400..."
           find_current_session → null (first time)
           → create_session → new SdkSession record
           
14:00:05 → Event batch arrives with same session_id
           find_current_session → SdkSession (created at 14:00)
           session_idle?(session) → updated_at=14:00, now=14:00:05, diff=5 sec
           → 5 >= 10? NO → reuse session
           → session.updated_at = 14:00:05
           
14:10:15 → Event batch arrives with same session_id
           find_current_session → SdkSession (created at 14:00)
           session_idle?(session) → updated_at=14:00:05, now=14:10:15, diff=10 min 10 sec
           → 10 min 10 sec >= 10 min? YES → create NEW session
           → new SdkSession record (same session_id, different DB record)
```

### Step 7: User Leaves Page

User closes tab / navigates away → `visibilitychange=hidden` fires:

```javascript
document.addEventListener('visibilitychange', function () {
  if (document.visibilityState === 'hidden') {
    s.queue.push({ name: 'map_session_end', type: 'click', ts: Date.now() });
    _flush(s, true);  // ← Use sendBeacon for reliability
  }
});
```

**Why sendBeacon?**
- Regular `fetch()` may be cancelled if page unloads
- `navigator.sendBeacon()` guarantees delivery (browser holds the request until complete)
- Analytics is fire-and-forget, so `sendBeacon` is perfect

Server receives batch with `map_session_end` event:

```ruby
if name == "map_session_end"
  (session || find_current_session)&.update_column(:end_datetime, now)
  next
end
```

Session record now has:
```ruby
{
  start_datetime: 2026-06-10 14:00:00,
  end_datetime:   2026-06-10 14:10:20,  # ← Set by map_session_end event
  ...
}
```

---

## Interaction Tracking

### What Counts as an Interaction?

Interactions are **significant user actions** (not just passive viewing). Defined per client type:

```ruby
INTERACTION_EVENTS = {
  "web_map"    => %w[
    unit_marker_click apply_now_click save_favorite_click sent_favorite_click
    unit_card_click floor_plan_card_click amenity_card_click
    share_favorites_click tour_button_click
    share_email_click share_text_click share_whatsapp_click share_snapchat_click share_copy_click
  ].to_set,
  "touch_map"  => %w[
    unit_marker_click apply_now_click save_favorite_click
    unit_card_click floor_plan_card_click amenity_card_click
  ].to_set,
  "ipad_map"   => %w[
    unit_marker_click apply_now_click appointment_scheduled_click
    unit_card_click floor_plan_card_click
  ].to_set,
  "mobile_app" => %w[
    unit_marker_click apply_now_click save_favorite_click
    unit_card_click floor_plan_card_click amenity_card_click
  ].to_set,
}.freeze
DEFAULT_INTERACTION_EVENTS = %w[unit_marker_click apply_now_click unit_card_click].to_set.freeze
```

**Examples:**
- **Interaction:** `unit_marker_click` (user is actively exploring units)
- **Interaction:** `apply_now_click` (user is taking action)
- **NOT an interaction:** `map_load` (passive page load)
- **NOT an interaction:** `zoom_in` (passive map control)

### The Interaction Counter & Idle Gate

```ruby
def update_interactions(session, event_key)
  return unless interaction_event?(event_key)  # ← Is this an interaction event?
  
  last = session.map_interactions_last_active&.in_time_zone(@timezone)
  return if last && !session_idle_at?(last)    # ← Have 10 min passed since last interaction?
  
  session.map_interactions = (session.map_interactions || 0) + 1
  session.map_interactions_last_active = now
end
```

**Purpose of idle gate:** Prevent rapid-fire clicks from inflating the counter.

**Timeline example:**

```
14:00:00 → map_load event
           interaction_event?("map_load_click")? NO → skip
           
14:00:05 → unit_marker_click event
           interaction_event?("unit_marker_click")? YES
           last = nil (first time)
           → map_interactions = 1
           → map_interactions_last_active = 14:00:05
           
14:00:10 → apply_now_click event
           interaction_event?("apply_now_click")? YES
           last = 14:00:05, now = 14:00:10, diff = 5 sec
           → session_idle_at?(14:00:05)? Is 5 >= 10? NO
           → return (skip increment)
           → map_interactions stays = 1
           
14:10:20 → unit_marker_click event
           interaction_event?("unit_marker_click")? YES
           last = 14:00:05, now = 14:10:20, diff = 10 min 15 sec
           → session_idle_at?(14:00:05)? Is 10 min 15 sec >= 10 min? YES
           → map_interactions = 2
           → map_interactions_last_active = 14:10:20
           
Result: 2 interactions = user engaged in 2 separate time blocks
```

### Reading Interaction Data

```ruby
session = SdkSession.find(123)

session.map_interactions                 # => 2 (number of engagement periods)
session.map_interactions_last_active     # => 2026-06-10 14:10:20 (last interaction time)
session.events["unit_marker_click"]      # => 5 (total unit clicks, unfiltered)
```

---

## Event Capture

### Event Structure

Every event has:

```javascript
{
  name:     String,           // e.g., "unit_marker", "zoom_in", "bedroom_filter"
  type:     String,           // e.g., "click", "hover", "scroll" (default: "click")
  ts:       Number,           // JavaScript timestamp in ms
  metadata: Object (optional) // Custom key-value pairs
}
```

Stored on server as:

```ruby
events = {
  "unit_marker_click" => 5,                           # ← event key = name_type
  "zoom_in_click" => 2,
  "bedroom_filter_click" => 1,
  "viewed_unit_id" => ["456", "789"],                 # ← metadata fields
  "filter_bedroom" => "2"
}
```

### How Events Are Incremented

```ruby
def increment_event(session, key)
  counts = session.events || {}
  counts[key] = (counts[key] || 0) + 1
  session.events = counts
end
```

**Example:**

```
Batch 1:
  Event: { name: "unit_marker", type: "click" }
  → key = "unit_marker_click"
  → events["unit_marker_click"] = 0 + 1 = 1

Batch 2:
  Event: { name: "unit_marker", type: "click" }
  → key = "unit_marker_click"
  → events["unit_marker_click"] = 1 + 1 = 2

Batch 3:
  Event: { name: "zoom_in", type: "click" }
  → key = "zoom_in_click"
  → events["zoom_in_click"] = 0 + 1 = 1

Final state:
  events = {
    "unit_marker_click" => 2,
    "zoom_in_click" => 1
  }
```

### How Metadata Is Merged

Metadata is passed with events to provide **context**:

```javascript
sdk.capture('unit_marker', 'click', { viewed_unit_id: '456' });
```

Server receives:

```json
{
  "name": "unit_marker",
  "type": "click",
  "metadata": { "viewed_unit_id": "456" }
}
```

Sanitized and merged into `events`:

```ruby
def merge_event_metadata(session, metadata)
  return if metadata.blank?
  current = session.events || {}
  metadata.each do |k, v|
    # Arrays: accumulate unique values (e.g., viewed_unit_ids)
    # Scalars: last-write-wins (e.g., current_floor)
    current[k] = v.is_a?(Array) ? ((current[k] || []) + v).uniq : v
  end
  session.events = current
end
```

**Example:**

```
Initial events = { "unit_marker_click" => 1 }

Batch with metadata:
  { "viewed_unit_id": ["456"] }
  
After merge:
  events = {
    "unit_marker_click" => 1,
    "viewed_unit_id" => ["456"]
  }

Later batch with same key (array accumulates):
  { "viewed_unit_id": ["789"] }
  
After merge:
  events = {
    "unit_marker_click" => 1,
    "viewed_unit_id" => ["456", "789"]  ← Unique values only
  }

Later batch with scalar (last-write-wins):
  { "current_floor": "3" }
  
After merge:
  events = {
    "unit_marker_click" => 1,
    "viewed_unit_id" => ["456", "789"],
    "current_floor": "3"
  }
```

### Metadata Sanitization

**Rules:**
- Key: Must match `/^[a-z_]{1,50}$/` (lowercase letters, underscores, 1–50 chars)
- Value: String ≤ 300 chars, or Number/Boolean
- Max: 15 key-value pairs per event

```ruby
def sanitize_metadata(meta)
  return {} unless meta.is_a?(Hash)
  out = {}
  meta.each do |k, v|
    break if out.size >= 15                    # ← Hard stop at 15 keys
    key = k.to_s
    next unless key.match?(/\A[a-z_]{1,50}\z/) # ← Validate key format
    next unless [String, Integer, Float, TrueClass, FalseClass].include?(v.class)
    out[key] = v.is_a?(String) ? v.slice(0, 300) : v  # ← Cap strings at 300 chars
  end
  out
end
```

**Examples:**

| Input | Result | Reason |
|---|---|---|
| `{ viewed_unit_id: "456" }` | ✓ Accept | Valid snake_case, string |
| `{ unit_floor: 3 }` | ✓ Accept | Valid snake_case, number |
| `{ is_favorite: true }` | ✓ Accept | Valid snake_case, boolean |
| `{ viewedUnitId: "456" }` | ✗ Reject | CamelCase, not snake_case |
| `{ VIEWED_UNIT_ID: "456" }` | ✗ Reject | UPPERCASE, not lowercase |
| `{ viewed_unit_id: 123, ... 14 more keys }` | ✓ Accept (15 max) | Limit 15 keys |
| `{ viewed_unit_id: { nested: "obj" } }` | ✗ Reject | Object not allowed |

---

## Device Context

### What Is Device Context?

Device context is **metadata about the device and browser** where the map is being viewed. Captured once on page load, sent in the first batch.

```ruby
ALLOWED_CONTEXT_KEYS = %w[
  device_type viewport_width viewport_height referrer
  user_agent sdk_version os_name os_version
  kiosk_id device_uuid app_version
].freeze
```

### How It's Captured

On SDK initialization, after token exchange:

```javascript
function _context(s) {
  var w = window.innerWidth;
  return {
    device_type:     w < 768 ? 'mobile' : w < 1024 ? 'tablet' : 'desktop',
    viewport_width:  window.innerWidth,
    viewport_height: window.innerHeight,
    referrer:        document.referrer || '',
    sdk_version:     s.sdkVersion,
    user_agent:      (navigator.userAgent || '').slice(0, 200)
  };
}
```

### When It's Sent

Device context is included **only in the first batch**:

```javascript
function _flush(s, beacon) {
  var body = {
    session_id:  s.sessionId,
    client_type: s.clientType,
    events:      events
  };

  if (!s.contextSent) {
    body.device_context = _context(s);  // ← Only first flush
  }

  // ... send via fetch or sendBeacon
  
  s.contextSent = true;  // ← Mark as sent, skip on future flushes
}
```

### Example Device Context Payload

```json
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "client_type": "web_map",
  "device_context": {
    "device_type": "desktop",
    "viewport_width": 1440,
    "viewport_height": 900,
    "referrer": "https://property-search.com",
    "sdk_version": "v1",
    "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36..."
  },
  "events": [...]
}
```

### Stored in Database

```ruby
session.device_context # =>
{
  "device_type" => "desktop",
  "viewport_width" => 1440,
  "viewport_height" => 900,
  "referrer" => "https://property-search.com",
  "sdk_version" => "v1",
  "user_agent" => "Mozilla/5.0..."
}
```

### Why Only Once?

Bandwidth optimization. Device context rarely changes during a session. If you need updated context, just pass it in a future batch and it will be merged (scalar last-write-wins rule).

---

## Complete Event Inventory

### Auto-Captured Events (SDK Internal)

These are captured automatically by the SDK. **Zero React code needed.**

| Event Key | Event Type | Trigger | Metadata | Example |
|---|---|---|---|---|
| `map_load` | click | Map finishes loading, before `onReady` callback | — | Load complete |
| `unit_marker` | click | User clicks unit marker on map | `viewed_unit_id` | Unit ID 456 clicked |
| `unit_marker` | hover | User hovers over unit marker | `viewed_unit_id` | Unit ID 456 hovered |
| `amenity_marker` | click | User clicks amenity marker | `marker_id` | Amenity ID clicked |
| `amenity_marker` | hover | User hovers over amenity marker | `marker_id` | Amenity ID hovered |
| `zoom_in` | click | User clicks zoom-in button or calls `sdk.zoomIn()` | — | Zoom increased |
| `zoom_out` | click | User clicks zoom-out button or calls `sdk.zoomOut()` | — | Zoom decreased |
| `zoom_refresh` | click | User calls `sdk.resetZoom()` | — | Zoom reset |
| `floor_number` | click | User changes floor via `sdk.changeFloor()` | `floor` | Floor "3" selected |
| `map_3d` | click | User switches to 3D map | — | 3D view activated |
| `map_2d` | click | User switches back to 2D map | — | 2D view activated |
| `floorplan` | hover | User hovers over floorplan item | `floorplan_id` | Floorplan hovered |
| `map_session_end` | click | Page hides / user closes tab | — | Session ending |

### React-Captured Events (sdk.capture() calls)

These are **manually captured by React** for UI events the SDK can't see.

| Event Key | Event Type | Trigger | Metadata | Example |
|---|---|---|---|---|
| `bedroom_filter` | click | User selects bedroom filter | `filter_bedroom` | "2" selected |
| `pricing_filter` | click | User selects price filter | `filter_price_max` | "$2000" selected |
| `square_feet_filter` | click | User selects sqft filter | `filter_sqft` | "1000" selected |
| `availability_filter` | click | User selects availability filter | `filter_availability` | "Available" selected |
| `sorting_filter` | click | User selects sort option | — | Sorted by price |
| `reset_filter` | click | User resets all filters | — | Filters cleared |
| `apply_now` | click | User clicks "Apply Now" button | `applied_to_unit_id` | Applied to unit 456 |
| `schedule_tour` | click | User schedules a tour | — | Tour scheduled |
| `virtual_tour` | click | User starts virtual tour | — | Virtual tour started |
| `save_favorite` | click | User favorited a unit | `favorited_unit_id` | Favorited unit 456 |
| `delete_favorite` | click | User unfavorited a unit | — | Unfavorited |
| `clear_favorites` | click | User clears all favorites | — | All favorites cleared |
| `sent_favorite` | click | User shares favorites | — | Favorites shared |
| `view_saved` | click | User views saved/favorites page | — | Favorites page viewed |
| `logo` | click | User clicks logo | — | Logo clicked |
| `gallery_tab` | click | User switches to gallery tab | — | Gallery view opened |
| `floorplans_tab` | click | User switches to floorplans tab | — | Floorplans view opened |
| `unit_modal_buttons` | click | User clicks buttons in unit modal | — | Modal action taken |
| `open_pricing_matrix` | click | User opens pricing matrix | — | Pricing matrix opened |
| `calculate_btn` | click | User clicks calculator button | — | Calculator used |
| `right_rail_card` | hover | User hovers over right rail card (throttled 3s) | — | Card hovered |
| `right_rail` | scroll | User scrolls right rail (throttled 3s) | — | Right rail scrolled |

### Event Key Format

Every stored event uses the format: **`{name}_{type}`**

```
Examples:
  unit_marker_click       (name=unit_marker, type=click)
  unit_marker_hover       (name=unit_marker, type=hover)
  zoom_in_click           (name=zoom_in, type=click)
  bedroom_filter_click    (name=bedroom_filter, type=click)
```

---

## Complete Data Flow Examples

### Example 1: Simple User Session

**Timeline:**

```
14:00:00 → User loads property website
           SDK init → sessionId = "550e8400-..."
           PynAnalytics starts
           
14:00:02 → map_load fires automatically
           queue = [{ name: "map_load", type: "click", ts: ... }]
           
14:00:05 → User hovers over unit marker
           queue += [{ name: "unit_marker", type: "hover", metadata: { viewed_unit_id: "456" }, ts: ... }]
           
14:00:07 → User clicks unit marker
           queue += [{ name: "unit_marker", type: "click", metadata: { viewed_unit_id: "456" }, ts: ... }]
           
14:00:10 → 5 seconds elapsed
           _flush() sends batch with device_context (first flush)
           
           POST /api/partner/maps/events
           {
             session_id: "550e8400-...",
             client_type: "web_map",
             device_context: {
               device_type: "desktop",
               viewport_width: 1440,
               ...
             },
             events: [
               { name: "map_load", type: "click", ts: ... },
               { name: "unit_marker", type: "hover", metadata: { viewed_unit_id: "456" }, ts: ... },
               { name: "unit_marker", type: "click", metadata: { viewed_unit_id: "456" }, ts: ... }
             ]
           }
           
           Server processes:
           - find_or_create_session → SdkSession created (session_id="550e8400", client_type="web_map")
           - Event 1: increment_event → events["map_load_click"] = 1
           - Event 1: interaction_event?("map_load_click") → NO (map_load not in INTERACTION_EVENTS)
           - Event 2: increment_event → events["unit_marker_hover"] = 1
           - Event 2: interaction_event?("unit_marker_hover") → NO (hover not in INTERACTION_EVENTS... wait, it IS!)
           - Actually, "unit_marker_hover" IS in INTERACTION_EVENTS? Let me check...
           - No, only the click variant is: "unit_marker_click"
           - So Event 2: skip interaction increment
           - Event 3: increment_event → events["unit_marker_click"] = 1
           - Event 3: interaction_event?("unit_marker_click") → YES
           - update_interactions → map_interactions = 1, map_interactions_last_active = 14:00:10
           - merge_event_metadata → events["viewed_unit_id"] = ["456"]
           - device_context saved
           
           DB Result:
           SdkSession {
             session_id: "550e8400-...",
             client_type: "web_map",
             start_datetime: 2026-06-10 14:00:10,
             end_datetime: nil,
             map_interactions: 1,
             map_interactions_last_active: 2026-06-10 14:00:10,
             events: {
               "map_load_click" => 1,
               "unit_marker_hover" => 1,
               "unit_marker_click" => 1,
               "viewed_unit_id" => ["456"]
             },
             device_context: {
               device_type: "desktop",
               viewport_width: 1440,
               ...
             },
             visited_pages: ["Map main page"]
           }
           
14:00:15 → User clicks "Apply Now" button
           React calls: sdk.capture('apply_now', 'click', { applied_to_unit_id: '456' })
           queue += [{ name: "apply_now", type: "click", metadata: { applied_to_unit_id: "456" }, ts: ... }]
           
14:00:20 → 5 seconds elapsed
           _flush() sends batch WITHOUT device_context (already sent)
           
           Server processes:
           - find_or_create_session → SdkSession exists, updated_at=14:00:10, now=14:00:20, diff=10 sec
           - session_idle?(session) → 10 >= 10 min? NO → reuse session
           - Event 1: increment_event → events["apply_now_click"] = 1
           - Event 1: interaction_event?("apply_now_click") → YES
           - update_interactions → last=14:00:10, now=14:00:20, diff=10 sec
           - session_idle_at?(14:00:10) → 10 >= 10? NO → return (skip increment)
           - map_interactions stays = 1
           
           DB Result:
           events: {
             "map_load_click" => 1,
             "unit_marker_hover" => 1,
             "unit_marker_click" => 1,
             "apply_now_click" => 1,
             "viewed_unit_id" => ["456"],
             "applied_to_unit_id" => "456"
           }
           
14:10:30 → User clicks another unit marker
           queue += [{ name: "unit_marker", type: "click", metadata: { viewed_unit_id: "789" }, ts: ... }]
           
14:10:35 → 5 seconds elapsed
           _flush() sends batch
           
           Server processes:
           - find_or_create_session → SdkSession exists, updated_at=14:00:20, now=14:10:35, diff=10 min 15 sec
           - session_idle?(session) → 10 min 15 sec >= 10 min? YES → create NEW session!
           
           NEW SdkSession created:
           session_id: "550e8400-..." (same UUID)
           start_datetime: 2026-06-10 14:10:35
           events: {
             "unit_marker_click" => 1,
             "viewed_unit_id" => ["789"]
           }
           map_interactions: 1
           map_interactions_last_active: 2026-06-10 14:10:35
           
14:10:40 → User closes tab
           visibilitychange=hidden fires
           queue = [{ name: "map_session_end", type: "click", ts: ... }]
           sendBeacon sends final batch
           
           Server processes:
           - map_session_end event detected
           - (session || find_current_session)&.update_column(:end_datetime, now)
           - Sets end_datetime on the NEW session (14:10:35 - started)
           
           DB Result:
           SdkSession #1 (idle split):
           {
             session_id: "550e8400-...",
             start_datetime: 2026-06-10 14:00:10,
             end_datetime: nil,  ← Never got map_session_end (old session)
             map_interactions: 1,
             events: { ... }
           }
           
           SdkSession #2 (idle split):
           {
             session_id: "550e8400-...",
             start_datetime: 2026-06-10 14:10:35,
             end_datetime: 2026-06-10 14:10:40,
             map_interactions: 1,
             events: { "unit_marker_click" => 1, "viewed_unit_id" => ["789"] }
           }
```

### Example 2: User Leaves and Comes Back

**Timeline:**

```
14:00:00 → User loads page
           sessionId = "550e8400-..."
           
14:00:10 → Batch sent, SdkSession created
           
14:10:40 → User closes tab → map_session_end sent
           end_datetime set
           
--- User comes back 1 hour later ---

15:15:00 → User loads same page
           SDK re-initializes
           sessionId = "a1b2c3d4-..." ← NEW UUID!
           PynAnalytics starts fresh
           
15:15:05 → map_load and first click sent
           
           Server processes:
           - find_current_session → looks for (community, session_id="a1b2c3d4-", client_type="web_map")
           - No match (different UUID)
           - create_session → NEW SdkSession record (completely separate)
           
           DB Result:
           SdkSession #3:
           {
             session_id: "a1b2c3d4-..." ← Different UUID
             start_datetime: 2026-06-10 15:15:05,
             ...
           }
```

---

## Database Schema

### Table: `sdk_sessions`

```sql
CREATE TABLE sdk_sessions (
  id                              BIGINT PRIMARY KEY,
  community_id                    INTEGER NOT NULL,
  client_type                     VARCHAR NOT NULL,     -- "web_map", "touch_map", "ipad_map", "mobile_app"
  session_id                      VARCHAR NOT NULL,     -- UUID generated by SDK
  partner                         VARCHAR,              -- Partner name (if applicable)
  sdk_version                     VARCHAR DEFAULT "v1",
  community_time_zone             VARCHAR DEFAULT "UTC",
  start_datetime                  TIMESTAMP,            -- Session start
  end_datetime                    TIMESTAMP,            -- Session end (set by map_session_end event)
  map_interactions                INTEGER DEFAULT 0,    -- Dedup'd interaction counter
  map_interactions_last_active    TIMESTAMP,            -- Last interaction timestamp
  visited_pages                   TEXT[] DEFAULT [],    -- Array of page names visited
  events                          JSONB DEFAULT {},     -- All events and metadata
  device_context                  JSONB DEFAULT {},     -- Device/browser info (first batch only)
  created_at                      TIMESTAMP,
  updated_at                      TIMESTAMP,
  
  CONSTRAINT fk_community FOREIGN KEY (community_id) REFERENCES communities(id),
  UNIQUE(session_id, community_id)
);

-- Indexes
CREATE INDEX idx_sdk_sessions_community_client_start 
  ON sdk_sessions(community_id, client_type, start_datetime);

CREATE INDEX idx_sdk_sessions_session_community 
  ON sdk_sessions(session_id, community_id) UNIQUE;

CREATE INDEX idx_sdk_sessions_partner_start 
  ON sdk_sessions(partner, start_datetime);

CREATE INDEX idx_sdk_sessions_events 
  ON sdk_sessions USING GIN(events);

CREATE INDEX idx_sdk_sessions_device_context 
  ON sdk_sessions USING GIN(device_context);
```

### Sample Row

```ruby
SdkSession.find(12345).inspect
# =>
# #<SdkSession
#   id: 12345,
#   community_id: 456,
#   client_type: "web_map",
#   session_id: "550e8400-e29b-41d4-a716-446655440000",
#   partner: "zillow",
#   sdk_version: "v1",
#   community_time_zone: "America/Los_Angeles",
#   start_datetime: 2026-06-10 14:00:10 PDT,
#   end_datetime: 2026-06-10 14:10:40 PDT,
#   map_interactions: 2,
#   map_interactions_last_active: 2026-06-10 14:10:35 PDT,
#   visited_pages: ["Map main page", "Favorites page"],
#   events: {
#     "map_load_click" => 1,
#     "unit_marker_click" => 5,
#     "apply_now_click" => 1,
#     "save_favorite_click" => 2,
#     "zoom_in_click" => 3,
#     "bedroom_filter_click" => 2,
#     "viewed_unit_id" => ["456", "789", "012"],
#     "filter_bedroom" => "2",
#     "current_floor" => "3"
#   },
#   device_context: {
#     "device_type" => "desktop",
#     "viewport_width" => 1440,
#     "viewport_height" => 900,
#     "referrer" => "https://property-search.com",
#     "sdk_version" => "v1",
#     "user_agent" => "Mozilla/5.0..."
#   },
#   created_at: 2026-06-10 14:00:10 PDT,
#   updated_at: 2026-06-10 14:10:40 PDT
# >
```

---

## Analytics Queries

### Common Queries for Dashboards

#### Total Sessions by Date

```sql
SELECT DATE(start_datetime) as date, COUNT(*) as session_count
FROM sdk_sessions
WHERE community_id = :id AND client_type = 'web_map'
GROUP BY DATE(start_datetime)
ORDER BY date DESC;
```

#### Total Interactions by Date

```sql
SELECT DATE(start_datetime) as date, SUM(map_interactions) as total_interactions
FROM sdk_sessions
WHERE community_id = :id AND client_type = 'web_map'
GROUP BY DATE(start_datetime)
ORDER BY date DESC;
```

#### Average Session Duration (in minutes)

```sql
SELECT AVG(EXTRACT(EPOCH FROM (COALESCE(end_datetime, updated_at) - start_datetime)) / 60) as avg_duration_minutes
FROM sdk_sessions
WHERE community_id = :id AND client_type = 'web_map'
  AND end_datetime IS NOT NULL;
```

#### Total Unit Clicks

```sql
SELECT SUM((events->>'unit_marker_click')::int) as total_clicks
FROM sdk_sessions
WHERE community_id = :id AND client_type = 'web_map';
```

#### Device Breakdown

```sql
SELECT device_context->>'device_type' as device_type, COUNT(*) as session_count
FROM sdk_sessions
WHERE community_id = :id AND client_type = 'web_map'
GROUP BY device_context->>'device_type'
ORDER BY session_count DESC;
```

#### Top 5 Most Viewed Unit IDs

```sql
SELECT 
  jsonb_array_elements(events->'viewed_unit_id') as unit_id,
  COUNT(*) as view_count
FROM sdk_sessions
WHERE community_id = :id AND client_type = 'web_map'
GROUP BY unit_id
ORDER BY view_count DESC
LIMIT 5;
```

#### Referrer Breakdown

```sql
SELECT 
  device_context->>'referrer' as referrer,
  COUNT(*) as session_count
FROM sdk_sessions
WHERE community_id = :id AND client_type = 'web_map'
GROUP BY device_context->>'referrer'
ORDER BY session_count DESC;
```

#### Sessions with High Engagement (3+ interactions)

```sql
SELECT COUNT(*) as highly_engaged_sessions
FROM sdk_sessions
WHERE community_id = :id 
  AND client_type = 'web_map'
  AND map_interactions >= 3;
```

#### Bounce Rate (sessions with no interactions)

```sql
SELECT 
  COUNT(*) as total_sessions,
  SUM(CASE WHEN map_interactions = 0 THEN 1 ELSE 0 END) as bounced,
  ROUND(SUM(CASE WHEN map_interactions = 0 THEN 1 ELSE 0 END)::numeric / COUNT(*) * 100, 2) as bounce_rate_pct
FROM sdk_sessions
WHERE community_id = :id AND client_type = 'web_map';
```

#### Filter Usage

```sql
SELECT 
  SUM((events->>'bedroom_filter_click')::int) as bedroom_filters,
  SUM((events->>'pricing_filter_click')::int) as price_filters,
  SUM((events->>'availability_filter_click')::int) as availability_filters
FROM sdk_sessions
WHERE community_id = :id AND client_type = 'web_map';
```

#### 3D Map Usage

```sql
SELECT COUNT(*) as sessions_using_3d
FROM sdk_sessions
WHERE community_id = :id 
  AND client_type = 'web_map'
  AND (events->>'map_3d_click')::int > 0;
```

#### Client Type Comparison

```sql
SELECT 
  client_type,
  COUNT(*) as session_count,
  SUM(map_interactions) as total_interactions,
  AVG(map_interactions) as avg_interactions
FROM sdk_sessions
WHERE community_id = :id
GROUP BY client_type
ORDER BY session_count DESC;
```

---

## Key Takeaways

| Concept | Key Point |
|---|---|
| **Session** | One continuous user engagement with the map. New session if idle 10+ min or UUID changes. |
| **Interaction** | A meaningful action (unit click, apply now, etc.). Counted max once per 10-min period. |
| **Event** | Raw action (any click, hover, zoom). All events counted, stored in JSONB. |
| **Event Key** | Format: `{name}_{type}` (e.g., `unit_marker_click`). Incremented per occurrence. |
| **Metadata** | Context for events (unit ID, floor, filter value). Merged into events JSONB. |
| **Device Context** | Browser/device info. Sent once per session in first batch. |
| **Batch Flush** | Every 5 seconds OR when queue reaches 20 events. Max 100 per batch. |
| **Idle Gate** | Prevents rapid clicks from inflating interaction counter. Threshold: 10 minutes. |
| **JSONB Storage** | All events, metadata, and context stored in JSONB. Queries use PostgreSQL operators. |
| **Fire-and-Forget** | Analytics never breaks the map. Failures silently ignored. |

