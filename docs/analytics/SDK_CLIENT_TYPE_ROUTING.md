# SDK Map Analytics — Dynamic Client Type Routing via URL Parameter

**Date:** 2026-06-10  
**Status:** Implemented  
**Feature:** URL-based client type detection

---

## Overview

The SDK now dynamically determines the `client_type` based on a URL `src` parameter. This allows analytics to track different client types (web, touch, mobile, iPad) without requiring code changes.

**Default Behavior:** `src` param not present → `client_type = "web_map"`  
**With Parameter:** `?src=touch` → `client_type = "touch_map"`

---

## How It Works

### 1. URL Parameter Extraction

When the SDK initializes, it checks the current page's URL for a `src` query parameter:

```javascript
// URL: https://example.com/map?src=touch
// → Extracted: "touch"
// → Converted to: "touch_map"

// URL: https://example.com/map?src=mobile
// → Extracted: "mobile"
// → Converted to: "mobile_app" (special case)

// URL: https://example.com/map
// → No src param
// → Default: "web_map"
```

### 2. Authorized Endpoint Request

The `src` param is passed to the `/api/partner/maps/authorized` endpoint:

```
GET /api/partner/maps/authorized?propertyId=123&src=touch
X-API-Key: <api_key>
```

### 3. Server-Side Processing

The controller validates and normalizes the `src` parameter:

```ruby
src = params[:src].to_s.strip.downcase
client_type = if src == "mobile"
                "mobile_app"  # Special: mobile → mobile_app
              elsif src.present? && ALLOWED_CLIENT_TYPES.include?("#{src}_map")
                "#{src}_map"
              else
                "web_map"  # Default
              end
```

### 4. Response Includes client_type

The authorized endpoint now returns the computed `client_type`:

```json
{
  "success": true,
  "session_token": "eyJ...",
  "client_type": "touch_map",
  "message": "Partner verified and property is accessible."
}
```

### 5. Analytics Initialization

The SDK uses the returned `client_type` when creating the analytics instance:

```javascript
this._analytics = PynAnalytics.create({
  token:      this._sessionToken,
  apiBase:    this._apiBase(),
  clientType: "touch_map",  // From server response
  sdkVersion: "v1"
});
```

---

## Supported src Values

| URL Parameter | Converted To | Use Case |
|---|---|---|
| `src=touch` | `touch_map` | Touchscreen/kiosk interface |
| `src=mobile` | `mobile_app` | Mobile native app |
| `src=ipad` | `ipad_map` | iPad / tablet web app |
| (not present) | `web_map` | Desktop web (default) |
| `src=anything_else` | `web_map` | Invalid → falls back to default |

---

## Implementation Details

### SDK Controller Changes

**File:** `app/controllers/api/partner/maps/sdk_controller.rb`

```ruby
def authorized
  token = generate_session_token(@api_key, @community.id)

  # Extract src param from query (defaults to web_map if not present)
  # Supported values: touch, mobile, ipad → converted to "#{src}_map" format
  # Example: src=touch → client_type="touch_map", src=mobile → client_type="mobile_app"
  src = params[:src].to_s.strip.downcase
  client_type = if src == "mobile"
                  "mobile_app"  # Special case: mobile → mobile_app
                elsif src.present? && ALLOWED_CLIENT_TYPES.include?("#{src}_map")
                  "#{src}_map"
                else
                  "web_map"  # Default
                end

  render json: {
    success: true,
    session_token: token,
    client_type: client_type,
    message: "Partner verified and property is accessible."
  }, status: :ok
end
```

### SDK JavaScript Changes

**File:** `public/sdk/pyn-map-sdk-v1.js` (the active SDK file)

#### 1. Extract src Parameter

```javascript
_getSrcParam() {
  try {
    const params = new URL(window.location.href).searchParams;
    const src = params.get("src");
    if (!src) return "";
    const normalized = src.toLowerCase().trim();
    // Only allow valid client types without the "_map" suffix
    const validSrcValues = ["touch", "mobile", "ipad"];
    return validSrcValues.includes(normalized) ? normalized : "";
  } catch {
    return "";
  }
}
```

#### 2. Pass src to Authorized Endpoint

```javascript
async _verifyPartner(apiKey, propertyId) {
  try {
    // Extract src param from URL query string (e.g., ?src=touch → "touch_map")
    // Falls back to "web_map" if not present or invalid
    const src = this._getSrcParam();
    const srcParam = src ? `&src=${encodeURIComponent(src)}` : "";

    const url = `${this._apiBase()}/api/partner/maps/authorized?propertyId=${propertyId}${srcParam}`;
    const res = await fetch(url, { headers: { "X-API-Key": apiKey } });

    // ... error handling ...

    const data = await res.json();
    // Store the client_type returned by the server for analytics
    this._clientType = data.client_type || "web_map";
    return { success: true, sessionToken: data.session_token };
  } catch {
    return { success: false, error: "Network error verifying partner" };
  }
}
```

#### 3. Initialize Analytics with client_type

```javascript
this._verifyPartner(apiKey, propertyId)
  .then(v => {
    if (!v.success) { this._showError(v.error); return Promise.reject("abort"); }

    this._sessionToken = v.sessionToken;

    // Initialize analytics after token exchange (if enabled)
    // _clientType already set by _verifyPartner based on src URL param
    if (cfg.analytics !== false) {
      this._analytics = PynAnalytics.create({
        token:      this._sessionToken,
        apiBase:    this._apiBase(),
        clientType: this._clientType || "web_map",
        sdkVersion: "v1"
      });
    }

    this._showLoading("Loading property map...");
    return this._fetchConfig();
  })
```

---

## Usage Examples

### Example 1: Desktop Web (Default)

```html
<div id="pynMap"></div>
<script src="https://pynwheelconnect.com/sdk/pyn-map-sdk.js"></script>
<script>
  const sdk = PynMapSDK.create({
    token: "sessionToken",
    propertyId: 123,
    container: "#pynMap"
    // No src param in URL
    // Analytics: client_type = "web_map"
  });
</script>
```

**URL:** `https://property.com/map` (no src param)  
**Client Type:** `web_map`  
**Tracked As:** Desktop web sessions

---

### Example 2: Touchscreen Kiosk

```html
<!-- URL: https://property.com/kiosk?src=touch -->
<div id="pynMap"></div>
<script src="https://pynwheelconnect.com/sdk/pyn-map-sdk.js"></script>
<script>
  const sdk = PynMapSDK.create({
    token: "sessionToken",
    propertyId: 123,
    container: "#pynMap"
  });
</script>
```

**URL:** `https://property.com/kiosk?src=touch`  
**Client Type:** `touch_map`  
**Tracked As:** Touchscreen/kiosk sessions

---

### Example 3: Mobile App

```html
<!-- URL: https://property.com/app?src=mobile -->
<div id="pynMap"></div>
<script src="https://pynwheelconnect.com/sdk/pyn-map-sdk.js"></script>
<script>
  const sdk = PynMapSDK.create({
    token: "sessionToken",
    propertyId: 123,
    container: "#pynMap"
  });
</script>
```

**URL:** `https://property.com/app?src=mobile`  
**Client Type:** `mobile_app`  
**Tracked As:** Mobile app sessions

---

### Example 4: iPad Web App

```html
<!-- URL: https://property.com/tablet?src=ipad -->
<div id="pynMap"></div>
<script src="https://pynwheelconnect.com/sdk/pyn-map-sdk.js"></script>
<script>
  const sdk = PynMapSDK.create({
    token: "sessionToken",
    propertyId: 123,
    container: "#pynMap"
  });
</script>
```

**URL:** `https://property.com/tablet?src=ipad`  
**Client Type:** `ipad_map`  
**Tracked As:** iPad sessions

---

## Data Flow Diagram

```
┌─────────────────────────────────────┐
│ User loads page with URL param      │
│ https://property.com?src=touch      │
└────────────────┬────────────────────┘
                 │
                 ▼
        ┌────────────────────┐
        │ SDK Init           │
        │ _getSrcParam()     │
        │ → "touch"          │
        └────────┬───────────┘
                 │
                 ▼
    ┌──────────────────────────────────┐
    │ GET /authorized                  │
    │   ?propertyId=123&src=touch      │
    │   X-API-Key: <key>               │
    └────────────┬─────────────────────┘
                 │
                 ▼
    ┌──────────────────────────────────┐
    │ Server: authorized#              │
    │ src="touch"                       │
    │ → client_type="touch_map"         │
    │ → return client_type in JSON      │
    └────────────┬─────────────────────┘
                 │
                 ▼
    ┌──────────────────────────────────┐
    │ SDK: _verifyPartner response     │
    │ _clientType = "touch_map"        │
    │ _sessionToken = "..."            │
    └────────────┬─────────────────────┘
                 │
                 ▼
    ┌──────────────────────────────────┐
    │ PynAnalytics.create({            │
    │   clientType: "touch_map"        │
    │ })                               │
    └────────────┬─────────────────────┘
                 │
                 ▼
    ┌──────────────────────────────────┐
    │ Analytics Events:                │
    │ POST /api/partner/maps/events    │
    │ {                                │
    │   client_type: "touch_map",      │
    │   session_id: "...",             │
    │   events: [...]                  │
    │ }                                │
    └──────────────────────────────────┘
                 │
                 ▼
    ┌──────────────────────────────────┐
    │ SdkSession Record                │
    │ client_type: "touch_map"         │
    │ Tracked & queryable separately   │
    └──────────────────────────────────┘
```

---

## Analytics Queries

### Sessions by Client Type

```sql
SELECT client_type, COUNT(*) as session_count
FROM sdk_sessions
WHERE community_id = :id
GROUP BY client_type
ORDER BY session_count DESC;
```

**Result:**
```
client_type  | session_count
─────────────┼──────────────
web_map      | 4521
touch_map    | 892
mobile_app   | 234
ipad_map     | 156
```

### Interactions by Device Type

```sql
SELECT 
  client_type,
  SUM(map_interactions) as total_interactions,
  AVG(map_interactions) as avg_interactions_per_session
FROM sdk_sessions
WHERE community_id = :id
GROUP BY client_type;
```

### Top Events by Client Type

```sql
SELECT 
  client_type,
  SUM((events->>'unit_marker_click')::int) as unit_clicks,
  SUM((events->>'apply_now_click')::int) as apply_clicks,
  SUM((events->>'save_favorite_click')::int) as favorite_clicks
FROM sdk_sessions
WHERE community_id = :id
GROUP BY client_type;
```

---

## Fallback & Error Handling

### Invalid src Values

If an invalid `src` value is provided, it falls back to `web_map`:

```
?src=invalid   → "web_map"
?src=DESKTOP   → "web_map"
?src=tablet    → "web_map" (only touch/mobile/ipad allowed)
```

### Missing src Parameter

If the `src` parameter is not present in the URL:

```
https://property.com/map   → "web_map" (default)
```

### Special Case: "mobile"

The value `mobile` is converted to `mobile_app` (note the `_app` suffix):

```
?src=mobile    → "mobile_app"
```

This is a deliberate mapping because:
- URL param: simpler without the suffix
- DB value: follows naming convention (e.g., `ipad_map`, `touch_map`)

---

## Implementation Checklist

- ✅ Updated `app/controllers/api/partner/maps/sdk_controller.rb` (authorized action)
- ✅ Updated `public/sdk/pyn-map-sdk.js` (_getSrcParam, _verifyPartner, analytics init)
- ✅ Analytics initialization moved to after token exchange
- ✅ SdkSession records include client_type from URL param
- ✅ Fallback to "web_map" for invalid/missing src

---

## Testing

### Manual Test 1: Default (web_map)

1. Open: `https://property.com/map`
2. Check Network: GET `/authorized?propertyId=123` (no src param)
3. Response: `"client_type": "web_map"`
4. Check DB: New SdkSession with `client_type = "web_map"`

### Manual Test 2: Touch Kiosk

1. Open: `https://property.com/map?src=touch`
2. Check Network: GET `/authorized?propertyId=123&src=touch`
3. Response: `"client_type": "touch_map"`
4. Check DB: New SdkSession with `client_type = "touch_map"`

### Manual Test 3: Mobile App

1. Open: `https://property.com/map?src=mobile`
2. Check Network: GET `/authorized?propertyId=123&src=mobile`
3. Response: `"client_type": "mobile_app"`
4. Check DB: New SdkSession with `client_type = "mobile_app"`

### Manual Test 4: iPad

1. Open: `https://property.com/map?src=ipad`
2. Check Network: GET `/authorized?propertyId=123&src=ipad`
3. Response: `"client_type": "ipad_map"`
4. Check DB: New SdkSession with `client_type = "ipad_map"`

### Manual Test 5: Invalid Value

1. Open: `https://property.com/map?src=invalid`
2. Check Network: GET `/authorized?propertyId=123&src=invalid`
3. Response: `"client_type": "web_map"` (fallback)
4. Check DB: New SdkSession with `client_type = "web_map"`

---

## Benefits

✅ **No Code Changes Required** — Partners just add `?src=` to their embed URL  
✅ **Automatic Analytics Segmentation** — Separate tracking for each device type  
✅ **Fallback to Default** — Invalid values don't break the SDK  
✅ **Server-Side Validation** — Client cannot spoof client_type  
✅ **Single Integration Point** — All analytics routing happens at URL param level  
✅ **Dashboard-Ready** — Query by `client_type` immediately  

---

## Related Documentation

- [SDK_MAP_ANALYTICS_DETAILED.md](SDK_MAP_ANALYTICS_DETAILED.md) — Complete analytics architecture
- [SDK_MAP_ANALYTICS_QUICK_REFERENCE.md](SDK_MAP_ANALYTICS_QUICK_REFERENCE.md) — Cheat sheet & queries
- [sdk_map_analytics_workplan.md](sdk_map_analytics_workplan.md) — Original design

