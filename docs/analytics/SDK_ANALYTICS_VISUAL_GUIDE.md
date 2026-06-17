# SDK Map Analytics — Visual Guide

Quick visual references for understanding the system.

---

## 1. Complete Session Flow

```
USER PERSPECTIVE                      SYSTEM PERSPECTIVE
┌──────────────┐                     
│ Opens page   │                     ┌─────────────────────┐
└───────┬──────┘                     │ SDK Init            │
        │                            │ - Generate UUID     │
        │                            │ - Start analytics   │
        ▼                            │ - Ready to capture  │
┌──────────────┐                     └─────────────────────┘
│ Map loads    │────────────────────▶ map_load event
│ (ready)      │                     (queued in memory)
└───────┬──────┘
        │
        ├─────┐                      ┌─────────────────────┐
        │     │                      │ Event Queueing      │
        ▼     │                      │ queue = [            │
    Clicks    │                      │   map_load_click,   │
    unit      │                      │   unit_marker_click,│
              │                      │   zoom_in_click     │
    Filters  │                      │ ]                   │
    by BR     │                      └─────────────────────┘
              │
    ~5 sec   │
    elapsed  │                       ┌─────────────────────┐
              │                       │ Batch HTTP POST     │
              ▼                       │ POST /events        │
         [FLUSH]◀──────────────────── │ + device_context    │
                                      │ (first time only)   │
              ▼                       └─────────────────────┘
        ┌──────────────┐              
        │ Continues    │              ┌─────────────────────┐
        │ using map    │              │ SdkAnalyticsService │
        │ + filtering  │              │ - Create session    │
        └───────┬──────┘              │ - Increment events  │
                │                     │ - Merge metadata    │
                │                     │ - Count interactions│
                │                     │ - Save to JSONB     │
                ▼                     └─────────────────────┘
        ┌──────────────┐              
        │ idles 10 min │              ┌─────────────────────┐
        └───────┬──────┘              │ Idle Check          │
                │                     │ updated_at 10+ ago? │
                │                     │ YES → NEW session   │
        ┌───────▼──────┐              └─────────────────────┘
        │ Clicks again │              
        └───────┬──────┘              ┌─────────────────────┐
                │                     │ SdkSession #2       │
                │                     │ (Same UUID,         │
                │                     │  different record)  │
                ▼                     └─────────────────────┘
        ┌──────────────┐              
        │ Closes tab   │              ┌─────────────────────┐
        └──────────────┘              │ sendBeacon fires    │
                                      │ map_session_end evt │
                                      │ + end_datetime set  │
                                      └─────────────────────┘
```

---

## 2. Interaction Counting Timeline

```
              Interaction Count Progression
              ================================

Time          Event                Interaction   Reason
                                   Counter
─────────────────────────────────────────────────────────────
14:00:05      unit_marker_click    0 → 1         First interaction
14:00:15      apply_now_click      1             (too soon, 10 sec)
14:00:25      zone_out_click       1             (only 20 sec total)
14:10:20      unit_marker_click    1 → 2         10 min 15 sec passed!
14:10:25      save_favorite_click  2             (only 5 sec from last)
14:20:30      zoom_in_click        2 → 3         Another 10+ min passed
─────────────────────────────────────────────────────────────

KEY: The idle gate counts max once per 10-minute period
     Fast clicks = same interaction period
     10+ min gap = new interaction period
```

---

## 3. Event Storage in JSONB

```
Raw Events Captured             →  Stored in DB (JSONB format)
════════════════════════════════════════════════════════════════

user_action                        {
  ↓ click unit (ID 456)              "unit_marker_click": 1,
  ↓ click unit (ID 789)              "unit_marker_click": 2,
  ↓ hover unit (ID 456)              "unit_marker_hover": 1,
  ↓ click zoom+                      "zoom_in_click": 1,
  ↓ filter bedroom=2                 "bedroom_filter_click": 1,
  ↓ click apply                      "apply_now_click": 1,
                                     
Metadata merged in:                "viewed_unit_id": [
  ↓ unit IDs from clicks             "456",
  ↓ bedroom filter value             "789"
  ↓ current floor                  ],
                                     "filter_bedroom": "2",
                                     "current_floor": "3"
                                   }
```

---

## 4. Session Lifecycle States

```
                  ┌─────────────────────┐
                  │  SdkSession Created │
                  │  start_datetime set │
                  └──────────┬──────────┘
                             │
                ┌────────────┼────────────┐
                │                        │
                ▼                        ▼
        ┌──────────────┐        ┌──────────────┐
        │ ACTIVE       │        │ IDLE_SPLIT   │
        │              │        │              │
        │ Receiving    │        │ 10+ min idle │
        │ events every │        │ → new session│
        │ 5 sec        │        │ (same UUID)  │
        └──────┬───────┘        └──────┬───────┘
               │                       │
               └───────────┬───────────┘
                           │
                  ┌────────▼────────┐
                  │ User closes tab │
                  │ or navigates    │
                  └────────┬────────┘
                           │
                  ┌────────▼────────┐
                  │ map_session_end │
                  │ event sent      │
                  └────────┬────────┘
                           │
                  ┌────────▼────────────────┐
                  │ ENDED                   │
                  │ end_datetime set        │
                  │ Session complete       │
                  └────────────────────────┘
```

---

## 5. Batch Flushing Triggers

```
            START
              │
              ▼
    ┌─────────────────────┐
    │ Event captured?     │
    │ queue.push(event)   │
    └──────────┬──────────┘
               │
    ┌──────────▼───────────┐
    │ Check flush trigger  │
    └──────────┬───────────┘
               │
       ┌───────┴───────┐
       │               │
    "5 sec"?      "20+ events"?
       │               │
    YES▼NO          YES▼NO
       │               │
       ▼               ▼
   [FLUSH]   ┌──────────────────┐
             │ Keep queuing     │
             │ Wait for trigger │
             └──────────┬───────┘
                        │
   ┌─────────────────┬──┘
   │                 │
   │ OR              │ OR
   │                 │
   │            ┌────▼─────────────────┐
   │            │ User closes tab?     │
   │            │ (visibilitychange)   │
   │            └────┬────────────────┘
   │                 │
   │            YES▼ NO
   │                 │
   ▼                 ▼
 [FLUSH]   ┌──────────────────┐
 (regular  │ Keep waiting for │
  fetch)   │ 5s OR 20 events  │
           └──────────────────┘

           YES▼ (user closes)
             │
           [FLUSH]
         (sendBeacon)
      
All flush methods:
  ▼ Execute SdkAnalyticsService#process_batch()
  ▼ Create/update SdkSession record
  ▼ Save to DB
```

---

## 6. Metadata Validation Pipeline

```
Raw Input                    Sanitization Pipeline           DB Storage
═════════════════════════════════════════════════════════════════════════

{ viewed_unit_id: "456" }  ──┐
                             │
{ unit_floor: 3 }           ├─▶ Check key format (a-z_) ───┐
                             │   Check value type           │
{ Is_Favorite: true }       │   (string, number, bool)      │
                             │   Truncate string to 300     │
{ config: { x: 1 } }        ├─▶ Max 15 keys per event      │
                             │                              ▼
    ... 12 more ...         ├─▶ Reject:                 ✓ ACCEPT
                             │   - CamelCase               - viewed_unit_id
                             │   - UPPERCASE              - unit_floor
                             │   - Objects/arrays as val   - stored_boolean
                             │   - 16th key                
                             │                          ✗ REJECT
                            ┴─▶ Reject:                    - Is_Favorite
                                - Is_Favorite              - config
                                - config                   - 16th key

Result in events JSONB:
{
  "viewed_unit_id": "456",
  "unit_floor": 3
}
```

---

## 7. Device Context (First Batch Only)

```
SDK Initialization            First Batch              Subsequent Batches
════════════════════════════════════════════════════════════════════════

Window dimensions          device_context: {          device_context: null
  ▼                          device_type: ...,        (omitted from payload)
User agent                    viewport_width: ...,    
  ▼                           viewport_height: ...,   
Referrer                       referrer: ...,         Every 5 sec:
  ▼                           user_agent: ...         - No device context
Current floor                }                        - Just events
  ▼                                                   - Saves bandwidth
PynAnalytics.create()  ─────▶ SDK sets              
   contextSent = true        contextSent = true   
                             (skip on future       Why? Device details
                              flushes)             rarely change during
                                                   session. Can re-send
                                                   in any batch if needed
                                                   (last-write-wins).
```

---

## 8. Session Lookup Logic

```
New Event Arrives
       │
       ▼
┌──────────────────────┐
│ Look for existing    │
│ SdkSession with:     │
│ - session_id="550e" │
│ - client_type="web" │
│ - community_id=456  │
└──────┬───────────────┘
       │
   Found?
    │ │
    │ NO  ──────────────▶ Create NEW SdkSession
    │
    YES
    │
    ▼
┌──────────────────────┐
│ Check if idle:       │
│ updated_at 10+ min   │
│ old?                 │
└──────┬───────────────┘
       │
   YES ──────────────▶ Idle timeout! Create NEW SdkSession
   │                 (same session_id UUID, new DB record)
   │
   NO
   │
   ▼
   ┌──────────────────────┐
   │ Reuse existing       │
   │ SdkSession           │
   │ - Process events     │
   │ - Update counters    │
   │ - Save               │
   └──────────────────────┘
```

---

## 9. Interaction Event Classification

```
All Events                           Interaction Events
════════════════════════════════════════════════════════════════

map_load_click                   ✗   NO
zoom_in_click                    ✗   NO (navigation)
zoom_out_click                   ✗   NO (navigation)
floor_number_click               ✗   NO (navigation)
map_3d_click                     ✗   NO (navigation)
unit_marker_hover                ✗   NO (passive viewing)
                                 
unit_marker_click                ✓   YES
apply_now_click                  ✓   YES
save_favorite_click              ✓   YES
sent_favorite_click              ✓   YES
unit_card_click                  ✓   YES
floor_plan_card_click            ✓   YES
amenity_card_click               ✓   YES
                                 
bedroom_filter_click             ✗   NO (navigation)
pricing_filter_click             ✗   NO (navigation)
availability_filter_click        ✗   NO (navigation)

PER CLIENT TYPE:
web_map:    unit_marker + apply + save + sent + cards + shares
touch_map:  unit_marker + apply + save + cards (no sent/shares)
ipad_map:   unit_marker + apply + appt + cards (targeted)
mobile_app: unit_marker + apply + save + cards (mobile specific)

Result: Only clicks on MEANINGFUL content count.
        Only 1 interaction counted per 10-minute window.
```

---

## 10. Complete Data Model

```
┌─────────────────────────────────────────────────┐
│ SdkSession (one row per engagement period)      │
├─────────────────────────────────────────────────┤
│ id:                          INTEGER PRIMARY    │
│ community_id:                INTEGER FK         │
│ client_type:                 VARCHAR            │
│   └─ "web_map"               (dropdown)         │
│   └─ "touch_map"             (dropdown)         │
│   └─ "ipad_map"              (dropdown)         │
│   └─ "mobile_app"            (dropdown)         │
│ session_id:                  VARCHAR UUID       │
│   └─ "550e8400-..."          (client-generated) │
│                                                  │
│ Timing:                                          │
│ ├─ start_datetime:           TIMESTAMP           │
│ ├─ end_datetime:             TIMESTAMP (nullable)
│ ├─ map_interactions:         INTEGER (counter)  │
│ └─ map_interactions_last_active: TIMESTAMP      │
│                                                  │
│ Event Data (JSONB):                             │
│ ├─ events:                   JSONB              │
│ │  ├─ "unit_marker_click": 5 (event counters) │
│ │  ├─ "zoom_in_click": 2                       │
│ │  ├─ "viewed_unit_id": ["456", "789"] (meta)  │
│ │  └─ "current_floor": "3" (meta)              │
│ │                                               │
│ ├─ device_context:           JSONB              │
│ │  ├─ "device_type": "desktop"                 │
│ │  ├─ "viewport_width": 1440                   │
│ │  ├─ "viewport_height": 900                   │
│ │  ├─ "referrer": "https://..."                │
│ │  └─ "user_agent": "Mozilla/5.0..."           │
│ │                                               │
│ ├─ visited_pages:            ARRAY              │
│ │  └─ ["Map main page", "Favorites page"]      │
│ │                                               │
│ ├─ partner:                  VARCHAR (nullable) │
│ ├─ sdk_version:              VARCHAR ("v1")     │
│ ├─ community_time_zone:      VARCHAR ("UTC")    │
│ │                                               │
│ Timestamps:                                      │
│ ├─ created_at:               TIMESTAMP          │
│ └─ updated_at:               TIMESTAMP          │
├─────────────────────────────────────────────────┤
│ Indexes:                                         │
│ ├─ (community_id, client_type, start_datetime) │
│ ├─ (session_id, community_id) UNIQUE           │
│ ├─ (partner, start_datetime)                    │
│ ├─ (events) using GIN         ← for JSONB      │
│ └─ (device_context) using GIN ← for JSONB      │
└─────────────────────────────────────────────────┘
```

---

## 11. Query Pattern Guide

```
Count total sessions:
  SELECT COUNT(*) FROM sdk_sessions
  WHERE community_id = :id

Sum total interactions:
  SELECT SUM(map_interactions) FROM sdk_sessions
  WHERE community_id = :id

Query JSONB counters:
  SELECT SUM((events->>'unit_marker_click')::int)
  FROM sdk_sessions WHERE community_id = :id

Extract JSONB arrays:
  SELECT jsonb_array_elements(events->'viewed_unit_id')
  FROM sdk_sessions WHERE community_id = :id

Extract JSONB scalar:
  SELECT device_context->>'device_type'
  FROM sdk_sessions WHERE community_id = :id

Group by JSONB value:
  SELECT device_context->>'device_type' as device, COUNT(*)
  FROM sdk_sessions GROUP BY 1

Filter by JSONB contains:
  SELECT * FROM sdk_sessions
  WHERE (events->>'map_3d_click')::int > 0
```

---

## 12. Idle Timeout Visual

```
Event Timeline                     Idle Check Result
════════════════════════════════════════════════════════════

14:00:05 → unit_click             map_interactions = 1
          map_int_last_active = 14:00:05
          
14:00:15 → apply_click            Diff = 10 sec
          Is 10 sec >= 10 min?    NO  ✗ Don't increment
          map_interactions = 1 (unchanged)
          
14:05:10 → zoom_in                Diff = 5 min
          Is 5 min >= 10 min?     NO  ✗ Don't increment
          map_interactions = 1 (unchanged)
          
14:10:20 → unit_click             Diff = 10 min 15 sec
          Is 10:15 >= 10 min?     YES ✓ Increment!
          map_interactions = 2
          map_int_last_active = 14:10:20
          
14:10:25 → save_favorite          Diff = 5 sec
          Is 5 sec >= 10 min?     NO  ✗ Don't increment
          map_interactions = 2 (unchanged)
          
14:20:35 → zoom_out               Diff = 10 min 15 sec
          Is 10:15 >= 10 min?     YES ✓ Increment!
          map_interactions = 3
          map_int_last_active = 14:20:35
          
Result: 3 interactions = 3 separate engagement windows
        Each 10+ minutes apart
```

---

## Summary

- **Sessions** track continuous engagement periods
- **Interactions** count significant user actions (max once per 10 min)
- **Events** capture all actions in JSONB counters
- **Device context** sent once per session (first batch)
- **Metadata** merged into events JSONB
- **Batching** every 5 sec or 20 events for efficiency
- **Idle split** creates new session after 10 min inactivity
- **JSONB queries** use PostgreSQL operators for analytics

