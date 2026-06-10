# SDK Map Analytics — Change Log

## 2026-06-10: Idle Time Standardization

### Change
Updated idle time threshold for new SDK map analytics from **30 minutes → 10 minutes** to match old maps analytics behavior.

### Files Modified
- `app/services/analytics/sdk_analytics_service.rb` (line 162)

### Before
```ruby
ENV.fetch("IDLE_TIME_MAPS", 30).to_i  # Default 30 minutes
```

### After
```ruby
ENV.fetch("IDLE_TIME_MAPS", 10).to_i  # Default 10 minutes (same as old maps)
```

### Impact
- **Session Splitting:** Users idle for 10+ minutes will now create a new session (instead of 30+ min)
- **Interaction Counting:** Interactions can now be counted every 10 minutes instead of 30
- **Historical Data:** Not retroactively applied; only affects new events going forward
- **No DB Changes:** Pure service configuration, no migrations needed

### Rationale
Consistency with existing TrackSession analytics system, which uses 10-minute idle timeout. Users typically engage in focused ~10-minute browsing sessions. Shorter idle window better reflects actual user engagement patterns.

---

## Documentation Added

### 1. **SDK_MAP_ANALYTICS_DETAILED.md** (comprehensive)
- **Audience:** Developers, architects
- **Content:** 
  - Complete session lifecycle with code examples
  - Interaction tracking logic with timeline examples
  - Event capture and storage (JSONB)
  - Device context handling
  - Complete event inventory (auto vs React-captured)
  - Data flow walk-throughs
  - Database schema with sample row
  - SQL query examples for dashboards
- **Length:** ~1000 lines

### 2. **SDK_MAP_ANALYTICS_QUICK_REFERENCE.md** (handy)
- **Audience:** Analytics team, product managers, QA
- **Content:**
  - Session lifecycle at a glance (ASCII diagram)
  - Idle time behavior table
  - Event types lookup (auto vs manual)
  - Interaction counter rules with example
  - Metadata rules (accepted/rejected)
  - Device context cheat sheet
  - Common SQL queries
  - Debugging tips
  - Configuration options
- **Length:** ~300 lines

### 3. **This Changelog**
- Historical record of changes
- Impact assessment
- Migration notes

---

## How They Work Together

```
sdk_map_analytics_workplan.md
├─ High-level architecture
├─ Implementation phases
└─ Event types inventory

SDK_MAP_ANALYTICS_DETAILED.md
├─ Deep dive: session lifecycle
├─ Interaction logic with examples
├─ Event capture & JSONB storage
├─ Device context
├─ Database schema
├─ SQL query examples
└─ Complete data flow walk-through

SDK_MAP_ANALYTICS_QUICK_REFERENCE.md
├─ Cheat sheets
├─ Event types table
├─ Idle behavior rules
├─ Metadata rules
├─ Common queries
└─ Debugging tips
```

---

## Key Concepts Summary

### Session
- One continuous user engagement with map
- Created on first event or when idle 10+ min
- Ends when user closes tab (via `map_session_end` event)
- Stored in `sdk_sessions` table

### Interaction
- Significant user action (unit click, apply, etc.)
- Counted max once per 10-minute window (idle gate)
- Stored in `map_interactions` column
- Used to measure engagement (not raw event volume)

### Event
- Any trackable action (click, hover, zoom, filter)
- All events stored in JSONB `events` column
- Stored as key-value counters: `unit_marker_click: 5`
- Metadata merged into events: `viewed_unit_id: [456, 789]`

### Batch
- Collection of events queued in browser
- Sent every 5 seconds OR when 20+ events queued
- Max 100 events per batch
- Device context sent only in first batch

### Device Context
- Browser/device metadata (device type, viewport, referrer, user agent)
- Set once per session in first batch
- Stored in `device_context` JSONB column
- Queried via JSONB operators for dashboards

---

## Configuration Reference

### Environment Variable
```bash
IDLE_TIME_MAPS=10  # Minutes of inactivity before session split (default: 10)
```

Used in:
- `app/services/analytics/sdk_analytics_service.rb`
- `app/services/analytics/maps_analytics_service.rb` (old analytics)

---

## Testing the Change

### Verify Idle Time Change
```ruby
# In Rails console
service = Analytics::SdkAnalyticsService.new(
  community: Community.find(1),
  client_type: 'web_map',
  session_id: 'test-uuid',
  partner: 'test'
)

# Check idle threshold
dt = 10.minutes.ago
service.send(:session_idle_at?, dt)  # => true (10 min = idle)

dt = 9.minutes.ago
service.send(:session_idle_at?, dt)  # => false (9 min = not idle)
```

### Test Session Split
1. Load map, interact (triggers first batch)
2. Wait 10+ minutes without closing tab
3. Interact again (triggers new batch)
4. Check DB: Should have 2 SdkSession records with same session_id but different start_datetime

---

## Related Files

| File | Purpose |
|---|---|
| `app/models/sdk_session.rb` | SdkSession model + compat shims |
| `app/services/analytics/sdk_analytics_service.rb` | Core analytics service (includes idle timeout) |
| `app/controllers/api/partner/maps/sdk_controller.rb` | API endpoint: POST /api/partner/maps/events |
| `public/sdk/pyn-map-sdk.js` | PynAnalytics module (batching, flushing) |
| `config/routes.rb` | Route definition for analytics endpoint |

---

## Backward Compatibility

✅ **Fully compatible with existing integrations**
- No breaking changes
- No database migrations
- No API contract changes
- Pure service config change

---

## Future Considerations

- [ ] Add metrics for session split frequency (how often idle timeout triggers)
- [ ] Dashboard widget for "engagement frequency" (interactions per 10 min)
- [ ] Compare device types for idle behavior (mobile vs desktop)
- [ ] A/B test idle timeout (10 vs 15 vs 20 min)
- [ ] Add session quality metric (interaction density)

