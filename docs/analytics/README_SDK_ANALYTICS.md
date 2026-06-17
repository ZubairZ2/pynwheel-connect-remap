# SDK Map Analytics Documentation Index

**Last Updated:** 2026-06-10  
**Status:** Production-Ready  
**Idle Time:** 10 minutes (updated to match old maps analytics)

---

## 📚 Documentation Structure

This folder contains comprehensive documentation for the new SDK Map Analytics system. Choose the right doc for your needs:

### 1. **sdk_map_analytics_workplan.md** ← Start here for big picture
- **Best for:** Understanding the overall strategy and implementation phases
- **Topics:**
  - Core philosophy (SDK owns analytics, Rails stores it)
  - Problems solved vs old system
  - Architecture overview
  - Implementation phases (Phase 1–7)
  - Files to create/modify checklist
- **Read time:** 30 minutes
- **For:** Architects, project managers, developers planning

### 2. **SDK_MAP_ANALYTICS_DETAILED.md** ← Deep dive into mechanics
- **Best for:** Developers implementing, debugging, or extending analytics
- **Topics:**
  - Session lifecycle (6 steps with code examples)
  - Interaction tracking logic with timeline examples
  - Event capture and JSONB storage
  - Device context handling (first batch only)
  - Complete event inventory (50+ event types)
  - Data flow examples (detailed walk-throughs)
  - Database schema with sample data
  - SQL query examples for each metric
- **Read time:** 1 hour
- **For:** Backend developers, analytics engineers

### 3. **SDK_MAP_ANALYTICS_QUICK_REFERENCE.md** ← Handy cheat sheet
- **Best for:** Quick lookups, debugging, event type reference
- **Topics:**
  - ASCII diagrams of session lifecycle
  - Idle time behavior table
  - Event types quick lookup
  - Interaction counter rules
  - Metadata rules (accepted/rejected)
  - Device context fields
  - Common SQL queries (copy-paste ready)
  - Debugging tips
  - Configuration options
- **Read time:** 10 minutes
- **For:** QA, product, analytics team, quick reference

### 4. **SDK_MAP_ANALYTICS_CHANGELOG.md** ← Recent changes
- **Best for:** Understanding what changed and why
- **Topics:**
  - 2026-06-10: Idle time change (30 → 10 minutes)
  - Detailed before/after code
  - Impact assessment
  - Testing instructions
  - Backward compatibility notes
- **Read time:** 5 minutes
- **For:** Everyone, especially after updates

---

## 🚀 Quick Start

### For Analytics Dashboard Dev
1. Read: **sdk_map_analytics_workplan.md** (architecture overview)
2. Skim: **SDK_MAP_ANALYTICS_DETAILED.md** (schema section)
3. Use: **SDK_MAP_ANALYTICS_QUICK_REFERENCE.md** (SQL queries)

### For Backend Dev (implementing SDK)
1. Read: **sdk_map_analytics_workplan.md** (implementation phases)
2. Deep dive: **SDK_MAP_ANALYTICS_DETAILED.md** (complete section)
3. Reference: **SDK_MAP_ANALYTICS_QUICK_REFERENCE.md** (event types)

### For QA / Testing
1. Skim: **SDK_MAP_ANALYTICS_WORKPLAN.md** (to understand flow)
2. Use: **SDK_MAP_ANALYTICS_QUICK_REFERENCE.md** (debugging tips, event types)
3. Reference: **SDK_MAP_ANALYTICS_CHANGELOG.md** (what to test)

### For Product / Analytics
1. Read: **SDK_MAP_ANALYTICS_QUICK_REFERENCE.md** (metrics, queries)
2. Reference: **SDK_MAP_ANALYTICS_DETAILED.md** (when questions arise)

---

## 🎯 Key Concepts at a Glance

```
┌─────────────────────────────────────┐
│ USER LOADS MAP                      │
│ SDK generates UUID (session_id)     │
│ PynAnalytics starts, queues events  │
└────────────┬────────────────────────┘
             │
             ├─ Event: map_load
             ├─ Event: unit_marker_click  
             ├─ Event: bedroom_filter_click
             │
             ├─ 5 sec OR 20 events: BATCH POST
             │
             v
┌─────────────────────────────────────┐
│ POST /api/partner/maps/events       │
│ - session_id                        │
│ - client_type: web_map              │
│ - events: [...]                     │
│ - device_context (first time only)  │
└────────────┬────────────────────────┘
             │
             v
┌─────────────────────────────────────┐
│ SdkAnalyticsService#process_batch   │
│ - find_or_create_session            │
│ - increment_event counters          │
│ - merge metadata                    │
│ - update_interactions (10 min gate) │
│ - update_visited_pages              │
└────────────┬────────────────────────┘
             │
             v
┌─────────────────────────────────────┐
│ SdkSession Record (JSONB storage)   │
│                                     │
│ ├─ map_interactions: 1              │
│ ├─ events: {                        │
│ │   map_load_click: 1,              │
│ │   unit_marker_click: 1,           │
│ │   bedroom_filter_click: 1,        │
│ │   viewed_unit_id: ["456"]         │
│ │ }                                 │
│ ├─ device_context: {...}           │
│ ├─ start_datetime: 14:00:00         │
│ └─ end_datetime: (set by user close)│
└─────────────────────────────────────┘

IDLE SPLIT:
  If next event arrives 10+ min later:
  → Create NEW SdkSession (same session_id, different record)
  
SESSION END:
  User closes tab → map_session_end event → end_datetime set
```

---

## 📊 Data Model

### One SdkSession Record Contains

| Field | Type | Example | Purpose |
|---|---|---|---|
| `session_id` | UUID | "550e8400-..." | Browser-generated ID (unique per page load) |
| `client_type` | String | "web_map" | Device type (web_map, touch_map, ipad_map, mobile_app) |
| `map_interactions` | Integer | 2 | Deduped engagement count (1 per 10 min window) |
| `events` | JSONB | `{"unit_marker_click": 5, "viewed_unit_id": ["456"]}` | All event counters + metadata |
| `device_context` | JSONB | `{"device_type": "desktop", ...}` | Browser/device info (first batch only) |
| `visited_pages` | Array | `["Map main page", "Favorites page"]` | Pages navigated to |
| `start_datetime` | Timestamp | 2026-06-10 14:00:00 | Session start |
| `end_datetime` | Timestamp | 2026-06-10 14:10:40 | Session end (when user closes) |

### Example Query
```ruby
session = SdkSession.find(123)

session.map_interactions           # => 2 (engagement periods)
session.events["unit_marker_click"] # => 5 (raw clicks)
session.events["viewed_unit_id"]    # => ["456", "789"] (units viewed)
session.device_context["device_type"] # => "desktop"
```

---

## 🔧 Configuration

### Idle Time (Minutes)

**Default:** 10 minutes (same as old maps analytics)

**Set via environment variable:**
```bash
export IDLE_TIME_MAPS=10
```

**Used in:** `app/services/analytics/sdk_analytics_service.rb` line 162

**Effect:** When user is idle (no event for N minutes), next event creates a new session.

---

## 🗂️ File Reference

### Service Layer
- **`app/services/analytics/sdk_analytics_service.rb`**
  - Core analytics processor
  - Session lookup/create logic
  - Event increment, metadata merge, interaction update
  - Idle timeout check (line 162)

### Model
- **`app/models/sdk_session.rb`**
  - SdkSession AR model
  - Compat shims (e.g., `unit_marker_clicks` helper)

### Controller
- **`app/controllers/api/partner/maps/sdk_controller.rb`**
  - `track_events` action (POST /api/partner/maps/events)
  - Session token validation
  - Community loading

### SDK
- **`public/sdk/pyn-map-sdk.js`**
  - `PynAnalytics` module (event queue, batching, flushing)
  - Integrated into `PynMapSDKMethods.init()`

### Routes
- **`config/routes.rb`**
  - `post :events` inside `namespace :partner > namespace :maps`

### Database
- **`db/migrate/*_create_sdk_sessions.rb`**
  - Table creation with JSONB columns
  - GIN indexes on `events` and `device_context`

---

## 📈 Common Analytics Queries

### Session Count by Date
```sql
SELECT DATE(start_datetime), COUNT(*)
FROM sdk_sessions
WHERE community_id = :id AND client_type = 'web_map'
GROUP BY DATE(start_datetime);
```

### Total Unit Clicks
```sql
SELECT SUM((events->>'unit_marker_click')::int)
FROM sdk_sessions
WHERE community_id = :id;
```

### Top 5 Viewed Units
```sql
SELECT jsonb_array_elements(events->'viewed_unit_id'), COUNT(*)
FROM sdk_sessions
WHERE community_id = :id
GROUP BY 1 ORDER BY 2 DESC LIMIT 5;
```

### Device Breakdown
```sql
SELECT device_context->>'device_type', COUNT(*)
FROM sdk_sessions
WHERE community_id = :id
GROUP BY 1;
```

→ See **SDK_MAP_ANALYTICS_QUICK_REFERENCE.md** for more queries

---

## ✅ Changes Made (2026-06-10)

### Idle Time Update
- **File:** `app/services/analytics/sdk_analytics_service.rb` (line 162)
- **Change:** Default idle timeout 30 min → 10 min
- **Before:** `ENV.fetch("IDLE_TIME_MAPS", 30).to_i`
- **After:** `ENV.fetch("IDLE_TIME_MAPS", 10).to_i`
- **Reason:** Consistency with old TrackSession analytics system

### Documentation Added
1. **SDK_MAP_ANALYTICS_DETAILED.md** (1000+ lines)
2. **SDK_MAP_ANALYTICS_QUICK_REFERENCE.md** (300+ lines)
3. **SDK_MAP_ANALYTICS_CHANGELOG.md** (100+ lines)
4. **README_SDK_ANALYTICS.md** (this file)

---

## 🐛 Troubleshooting

### Sessions Not Appearing in DB?
→ See **SDK_MAP_ANALYTICS_QUICK_REFERENCE.md** → "Debugging Tips"

### Events Not Incrementing?
→ Check metadata validation rules in **SDK_MAP_ANALYTICS_QUICK_REFERENCE.md** → "Metadata Rules"

### Batch Not Sending?
→ Open DevTools Network tab, look for `POST /api/partner/maps/events`. See detailed explanation in **SDK_MAP_ANALYTICS_DETAILED.md** → "Step 3: Batch Flush"

### Interaction Counter Wrong?
→ Understand idle gate in **SDK_MAP_ANALYTICS_QUICK_REFERENCE.md** → "Interaction Counter Rules"

---

## 📞 Questions?

1. **"How do I add a new event?"** → **sdk_map_analytics_workplan.md** → "Extensibility"
2. **"What's the session lifecycle?"** → **SDK_MAP_ANALYTICS_DETAILED.md** → "Session Lifecycle"
3. **"How do I query interaction data?"** → **SDK_MAP_ANALYTICS_QUICK_REFERENCE.md** → "Common Analytics Queries"
4. **"Why did we change idle time?"** → **SDK_MAP_ANALYTICS_CHANGELOG.md** → "2026-06-10: Idle Time Standardization"

---

## 📝 Version History

| Date | Change | Files |
|---|---|---|
| 2026-06-10 | Idle time 30→10 min, docs added | sdk_analytics_service.rb, 3 new docs |
| [FUTURE] | [Next update] | TBD |

