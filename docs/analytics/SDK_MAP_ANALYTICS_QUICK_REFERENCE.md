# SDK Map Analytics — Quick Reference Guide

**Status:** Production  
**Idle Time:** 10 minutes (same as old maps analytics)  
**Default Client Type:** web_map

---

## Session Lifecycle at a Glance

```
User loads page
    ↓
SDK generates UUID (session_id)
    ↓
Page load fires → "map_load_click" event queued
    ↓
User interacts (click, filter, etc)
    ↓
Queue grows → Every 5 sec OR 20 events: batch HTTP POST
    ↓
Server creates/updates SdkSession record
    ↓
10 min idle → Next event creates NEW session (same UUID, new record)
    ↓
User closes tab → "map_session_end" event → end_datetime set
```

---

## Idle Time Behavior

| Scenario | Idle Check | Result |
|---|---|---|
| User clicks, then clicks 5 sec later | `5 < 10 min` | Same session |
| User clicks, then clicks 10 min 1 sec later | `10 min 1 sec >= 10 min` | NEW session (idle split) |
| User closes tab and reopens 1 hour later | Different `sessionId` UUID | NEW session (fresh page load) |
| User closes tab via `visibilitychange` event | — | Current session gets `end_datetime` |

---

## Event Types Quick Lookup

### Auto-Captured (No React Code)
- `map_load_click` — Page loaded
- `unit_marker_click` — User clicked unit
- `unit_marker_hover` — User hovered unit
- `zoom_in_click`, `zoom_out_click`, `zoom_refresh_click`
- `floor_number_click` — Changed floor
- `map_3d_click`, `map_2d_click` — Switched view
- `floorplan_hover` — Hovered floorplan
- `map_session_end_click` — Page closing

### React-Captured (sdk.capture() calls)
- `bedroom_filter_click`, `pricing_filter_click`, `availability_filter_click`
- `apply_now_click` — User applied to unit
- `save_favorite_click` — User favorited unit
- `sent_favorite_click` — User shared favorites
- `schedule_tour_click`, `virtual_tour_click`
- `gallery_tab_click`, `floorplans_tab_click`
- `view_saved_click` — Viewed favorites page

---

## Interaction Counter Rules

**Only these events count toward `map_interactions`:**

```ruby
web_map: [
  "unit_marker_click", "apply_now_click", "save_favorite_click", 
  "sent_favorite_click", "unit_card_click", "floor_plan_card_click", 
  "amenity_card_click", "share_favorites_click", "tour_button_click"
]
```

**Increment only if:**
1. Event is in the interaction set for the client type
2. 10+ minutes have passed since last interaction (idle gate)

**Example:**
- 14:00:05 → Unit click → `map_interactions = 1`
- 14:00:15 → Apply click → `map_interactions = 1` (too soon, only 10 sec)
- 14:10:20 → Unit click → `map_interactions = 2` (10 min 15 sec elapsed)

---

## Event Storage Format

All events stored as JSONB counters:

```ruby
events = {
  "map_load_click" => 1,
  "unit_marker_click" => 5,
  "apply_now_click" => 2,
  "viewed_unit_id" => ["456", "789"],      # Metadata (array accumulates)
  "filter_bedroom" => "2",                  # Metadata (scalar last-write-wins)
  "current_floor" => "3"
}
```

**Query examples:**
```sql
-- Total unit clicks
SELECT SUM((events->>'unit_marker_click')::int) FROM sdk_sessions WHERE ...

-- Unit IDs viewed
SELECT jsonb_array_elements(events->'viewed_unit_id') FROM sdk_sessions WHERE ...
```

---

## Metadata Rules

✅ **Accepted:**
- Key: snake_case, 1–50 chars
- Value: string (≤300 chars), number, or boolean
- Max 15 key-value pairs per event

❌ **Rejected:**
- CamelCase keys: `viewedUnitId` → ✗
- UPPERCASE keys: `VIEWED_UNIT_ID` → ✗
- Objects: `{ nested: {} }` → ✗
- Arrays in keys → ✗

---

## Device Context (First Batch Only)

Sent automatically in **first batch**, then skipped:

```json
{
  "device_type": "desktop",        // auto-detected: desktop|tablet|mobile
  "viewport_width": 1440,
  "viewport_height": 900,
  "referrer": "https://property.com",
  "sdk_version": "v1",
  "user_agent": "Mozilla/5.0..."
}
```

**Query example:**
```sql
SELECT device_context->>'device_type' AS device, COUNT(*)
FROM sdk_sessions GROUP BY device_context->>'device_type';
```

---

## Batch Flushing Logic

| Trigger | Behavior |
|---|---|
| 5 seconds elapsed | `_flush(false)` via `fetch()` |
| 20+ events queued | `_flush(false)` immediately |
| Page closing (`visibilitychange=hidden`) | `_flush(true)` via `sendBeacon()` + add `map_session_end` event |
| Page unload/error | Fire-and-forget: failures ignored |

**Why `sendBeacon` on close?**
- Regular fetch may be cancelled on page unload
- sendBeacon guarantees delivery to server

---

## Common Analytics Queries

### Total Sessions Today
```ruby
SdkSession.where(community_id: @id, client_type: 'web_map')
  .where('start_datetime > ?', Date.today.beginning_of_day)
  .count
```

### Avg Interactions Per Session
```ruby
SdkSession.where(community_id: @id, client_type: 'web_map')
  .average(:map_interactions)
```

### Bounce Rate (0 interactions)
```ruby
total = SdkSession.where(community_id: @id, client_type: 'web_map').count
bounced = SdkSession.where(community_id: @id, client_type: 'web_map', map_interactions: 0).count
rate = (bounced.to_f / total * 100).round(2)
```

### Top Units Viewed
```sql
SELECT jsonb_array_elements(events->'viewed_unit_id')::text AS unit_id, COUNT(*) AS views
FROM sdk_sessions
WHERE community_id = :id AND client_type = 'web_map'
GROUP BY unit_id
ORDER BY views DESC LIMIT 10;
```

### Device Breakdown
```ruby
SdkSession.where(community_id: @id, client_type: 'web_map')
  .group("device_context->>'device_type'")
  .count
```

---

## Debugging Tips

### Session Not Appearing in DB?

1. **Check batch sent:** Open browser DevTools → Network → Look for `POST /api/partner/maps/events`
2. **Check session token valid:** 204 response = success. 401 = token expired.
3. **Check community_id matches:** Session token scoped to one property
4. **Check idle time:** If 10+ min passed, might be separate session

### Events Not Incrementing?

1. **Check event name format:** Must be `snake_case`
2. **Check type provided:** Default is `click`, explicit types are `hover`, `scroll`, etc.
3. **Check metadata sanitization:** Key must be snake_case, max 50 chars. Value string max 300 chars.
4. **Check max 15 metadata keys:** Exceeded 15 per event? Silently truncated.

### Metadata Missing?

1. **Check first batch:** Device context sent only in first batch (intentional)
2. **Check merge rules:** Arrays accumulate, scalars last-write-wins
3. **Check JSONB query syntax:** Use `events->>'key'` for text, `events->'key'` for array

---

## Configuration

### Dynamic Client Type via URL Parameter

**Feature:** Use `?src=` URL parameter to set device type for analytics

Supported values:
```
?src=touch   → client_type = "touch_map"    (kiosk/touchscreen)
?src=mobile  → client_type = "mobile_app"   (mobile native app)
?src=ipad    → client_type = "ipad_map"     (iPad/tablet)
(no src)     → client_type = "web_map"      (default, desktop web)
```

**Examples:**
```
https://property.com/map              → web_map (default)
https://property.com/map?src=touch    → touch_map
https://property.com/app?src=mobile   → mobile_app
https://property.com/tablet?src=ipad  → ipad_map
```

**Why?** No code changes needed — just add `?src=` to your embed URL and analytics automatically segments by device type.

See: [SDK_CLIENT_TYPE_ROUTING.md](SDK_CLIENT_TYPE_ROUTING.md) for complete details.

### Idle Time (Minutes)

Default: **10 minutes** (same as old maps analytics)

Set via environment variable:
```bash
IDLE_TIME_MAPS=15  # Override to 15 minutes
```

Service code:
```ruby
ENV.fetch("IDLE_TIME_MAPS", 10).to_i  # Falls back to 10 if not set
```

### Disable Analytics (Optional)

```javascript
const sdk = PynMapSDK.create({
  token: apiKey,
  propertyId: propertyId,
  analytics: false  // Disables analytics for this session
});
```

---

## Migration from Old TrackSession

| Old (TrackSession) | New (SdkSession) | Why |
|---|---|---|
| 3 endpoints per action | 1 batch endpoint | Efficiency, reduced latency |
| Named columns | JSONB key-value | Flexibility, zero migrations for new events |
| Server-side session ID (cookie) | Client-side UUID | Ownership, privacy |
| 30+ React `track()` calls | SDK auto-captures + few `sdk.capture()` | Less code, less bugs |
| Separate analytics token | Reuses SDK session token | Simplicity, single auth |
| IDLE_TIME_MAPS = 30 min (default) | IDLE_TIME_MAPS = 10 min (same as old maps) | Consistency |

---

## File References

- **Service:** `app/services/analytics/sdk_analytics_service.rb`
- **Model:** `app/models/sdk_session.rb`
- **Controller:** `app/controllers/api/partner/maps/sdk_controller.rb` (action: `track_events`)
- **Routes:** `config/routes.rb` (namespace: `api/partner/maps`, route: `post :events`)
- **SDK:** `public/sdk/pyn-map-sdk.js` (class: `PynAnalytics`)
- **Full Docs:** `docs/SDK_MAP_ANALYTICS_DETAILED.md`

