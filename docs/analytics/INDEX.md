# SDK Map Analytics Documentation Index

**Location:** `/docs/analytics/`  
**Last Updated:** 2026-06-10  
**Status:** Production-Ready

---

## 📖 Documentation Files

### 1. **README_SDK_ANALYTICS.md** — START HERE
   - **Purpose:** Main entry point with links to all docs
   - **Content:** Quick links, concept overview, file references
   - **Best for:** First-time readers, quick navigation
   - **Read time:** 10 minutes

### 2. **SDK_MAP_ANALYTICS_DETAILED.md** — TECHNICAL DEEP DIVE
   - **Purpose:** Complete technical documentation
   - **Content:**
     - Session lifecycle (6 steps with code)
     - Interaction tracking with timelines
     - Event capture & JSONB storage
     - Device context handling
     - Complete event inventory (50+ types)
     - Database schema with examples
     - SQL query examples
     - Data flow walk-throughs
   - **Best for:** Developers, architects, technical staff
   - **Read time:** 1 hour

### 3. **SDK_MAP_ANALYTICS_QUICK_REFERENCE.md** — CHEAT SHEET
   - **Purpose:** Quick lookups and reference tables
   - **Content:**
     - Event types lookup
     - Interaction rules
     - Metadata rules (accepted/rejected)
     - Common SQL queries (copy-paste ready)
     - Debugging tips
     - Configuration options
   - **Best for:** QA, product team, quick reference
   - **Read time:** 10 minutes

### 4. **SDK_ANALYTICS_VISUAL_GUIDE.md** — DIAGRAMS & VISUALS
   - **Purpose:** Visual references and flowcharts
   - **Content:**
     - Complete session flow diagram
     - Interaction counting timeline
     - Event storage visualization
     - Session lifecycle states
     - Batch flushing triggers
     - Metadata validation pipeline
     - Device context flow
     - Session lookup logic
     - Data model diagram
     - Query pattern guide
     - Idle timeout visual
   - **Best for:** Visual learners, understanding concepts
   - **Read time:** 15 minutes

### 5. **SDK_MAP_ANALYTICS_CHANGELOG.md** — CHANGE HISTORY
   - **Purpose:** Track changes and updates
   - **Content:**
     - 2026-06-10: Idle time change (30 → 10 min)
     - Before/after code
     - Impact assessment
     - Testing instructions
     - Backward compatibility notes
   - **Best for:** Understanding recent changes, testing
   - **Read time:** 5 minutes

### 6. **SDK_CLIENT_TYPE_ROUTING.md** — DYNAMIC CLIENT TYPE VIA URL PARAM
   - **Purpose:** URL-based device type routing for analytics
   - **Content:**
     - How src URL parameter works
     - Mapping: touch/mobile/ipad → client_type
     - Implementation details (controller + SDK)
     - Usage examples for each device type
     - Data flow diagram
     - Analytics queries by client_type
     - Testing guide
   - **Best for:** Understanding device-specific tracking
   - **Read time:** 20 minutes

### 7. **sdk_map_analytics_workplan.md** — ARCHITECTURE & DESIGN
   - **Purpose:** Original architecture and implementation plan
   - **Content:**
     - Core philosophy
     - Problems solved
     - Architecture overview
     - Implementation phases
     - Event inventory
     - Extensibility guide
   - **Best for:** Understanding design decisions
   - **Read time:** 45 minutes

---

## 🎯 Quick Navigation by Role

### For Developers Implementing Analytics
1. Read: **README_SDK_ANALYTICS.md**
2. Deep dive: **SDK_MAP_ANALYTICS_DETAILED.md**
3. Reference: **SDK_MAP_ANALYTICS_QUICK_REFERENCE.md**
4. Visuals: **SDK_ANALYTICS_VISUAL_GUIDE.md**

### For QA / Testing
1. Skim: **README_SDK_ANALYTICS.md**
2. Reference: **SDK_MAP_ANALYTICS_QUICK_REFERENCE.md** (event types, metadata rules)
3. Check: **SDK_MAP_ANALYTICS_CHANGELOG.md** (what to test)
4. Debug: **SDK_ANALYTICS_VISUAL_GUIDE.md** (if stuck)

### For Product / Analytics Team
1. Read: **SDK_MAP_ANALYTICS_QUICK_REFERENCE.md** (metrics, queries)
2. Reference: **SDK_MAP_ANALYTICS_DETAILED.md** (when questions arise)
3. Visuals: **SDK_ANALYTICS_VISUAL_GUIDE.md** (concepts)

### For Architects / Project Managers
1. Read: **sdk_map_analytics_workplan.md** (design philosophy)
2. Skim: **README_SDK_ANALYTICS.md** (overview)
3. Reference: **SDK_MAP_ANALYTICS_DETAILED.md** (technical depth)

---

## 🔑 Key Concepts (TL;DR)

**Session:** One user's continuous engagement with the map
- Created on first event
- Split after 10 minutes of inactivity
- Ended when user closes tab
- Stored in `sdk_sessions` table

**Interaction:** Significant user action (unit click, apply, favorite)
- Counted max once per 10-minute window
- Prevents rapid clicks from inflating counter
- Stored in `map_interactions` column

**Event:** Any user action (click, hover, zoom, filter)
- All events counted
- Stored in `events` JSONB as key-value counters
- Example: `unit_marker_click: 5`

**Metadata:** Context for events (unit ID, floor, filter value)
- Key: snake_case, 1–50 chars
- Value: string (≤300 chars), number, or boolean
- Max 15 key-value pairs per event

**Device Context:** Browser/device info (device_type, viewport, referrer)
- Sent only in first batch (bandwidth optimization)
- Stored in `device_context` JSONB column

---

## 📊 All Events Captured

**Auto-captured by SDK (50+ events):**
- map_load, unit_marker (click/hover), zoom_in/out/refresh, floor_number
- map_3d, map_2d, floorplan_hover, amenity_marker (click/hover)
- map_session_end (user closing page)

**React-captured via sdk.capture():**
- Filters: bedroom_filter, pricing_filter, square_feet_filter, availability_filter
- Actions: apply_now, schedule_tour, virtual_tour
- Favorites: save_favorite, delete_favorite, clear_favorites, sent_favorite
- Navigation: view_saved, gallery_tab, floorplans_tab, etc.

---

## ⚙️ Configuration

**Idle Time (minutes):**
```bash
IDLE_TIME_MAPS=10  # Default (was 30, now matches old maps)
```

**Location:** `app/services/analytics/sdk_analytics_service.rb` line 162

---

## 🗂️ Related Files

**Service/Model:**
- `app/services/analytics/sdk_analytics_service.rb` (core logic)
- `app/models/sdk_session.rb` (model)

**Controller/Routes:**
- `app/controllers/api/partner/maps/sdk_controller.rb` (track_events action)
- `config/routes.rb` (POST /api/partner/maps/events)

**SDK:**
- `public/sdk/pyn-map-sdk.js` (PynAnalytics module)

**Database:**
- `db/migrate/*_create_sdk_sessions.rb` (table)
- `db/schema.rb` (schema)

---

## ❓ Common Questions

**Q: How do I add a new event?**
A: Add one `sdk.capture()` call in React or one line in SDK. No migrations needed.

**Q: Why was idle time changed to 10 minutes?**
A: Consistency with old TrackSession analytics system. See CHANGELOG.md.

**Q: How do I query interaction data?**
A: See SQL examples in QUICK_REFERENCE.md or DETAILED.md.

**Q: What's the metadata rule again?**
A: snake_case keys only, max 50 chars. Values: string (≤300), number, or boolean.

**Q: Can device_context be sent in every batch?**
A: Yes, optional. Sent in first batch by default, can re-send anytime (last-write-wins).

---

## 📝 Change History

| Date | Change | File |
|---|---|---|
| 2026-06-10 | Idle time 30→10 min, docs created | SDK_MAP_ANALYTICS_CHANGELOG.md |

---

## 💬 Support

- **Technical questions:** See DETAILED.md and VISUAL_GUIDE.md
- **Quick answers:** See QUICK_REFERENCE.md
- **Design rationale:** See sdk_map_analytics_workplan.md
- **Recent changes:** See SDK_MAP_ANALYTICS_CHANGELOG.md

