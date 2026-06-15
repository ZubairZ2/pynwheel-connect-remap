# Pynwheel SDK — Complete Security Architecture Redesign

## Why the Current Architecture Cannot Be Made Secure

The current SDK works like this:

```
Browser loads SDK
  → exchange API key for session token  (visible in network tab)
  → fetch_data returns ALL data in one JSON blob  (visible in network tab)
  → SDK renders SVG + populates unit panels from that blob
```

**The fundamental problem:** anything sent to the browser is readable.
Tokens, CORS headers, HTTPS, domain whitelisting — none of these hide a
response body. Anyone can open DevTools → Network → fetch_data → Preview
and read every unit, every price, every internal ID, and the Beans.ai API key.

The only real fix is to **stop sending sensitive data to the browser**.

---

## New Architecture: Server Holds Data, Browser Gets Render Instructions

### Core Principle

```
OLD:  Server → sends ALL data → Browser renders from it
NEW:  Browser → sends interaction events → Server → returns only display strings
```

The browser never receives raw pricing numbers, internal IDs, unit statuses,
data provider names, or third-party API keys. It only receives:

- A pre-colored SVG layer (which units to highlight, in what color)
- Formatted display strings ("$2,500/mo", "Available Now") — not raw numbers
- Opaque pointer IDs for hit-testing — not real unit database IDs
- A manifest describing map structure — no unit inventory

---

## Architecture Diagram

```
┌────────────────────────────────────────────────────────────────┐
│                      Partner Website                           │
│                                                                │
│   <script src="https://sdk.pynwheel.com/map.min.js">          │
│   PynMap.init({ apiKey: "pk_...", propertyId: "..." })        │
│                                                                │
│   SDK renders inside partner's <div> — all API calls go       │
│   to pynwheel.com, never to the partner's own origin          │
└───────────────────────────┬────────────────────────────────────┘
                            │  HTTPS only
                            ▼
┌────────────────────────────────────────────────────────────────┐
│                   Pynwheel API (Rails)                         │
│                                                                │
│  POST /sdk/v2/auth           httpOnly session cookie           │
│  GET  /sdk/v2/manifest       map structure, no unit data       │
│  GET  /sdk/v2/layer          pre-colored SVG overlay           │
│  GET  /sdk/v2/unit/:token    single unit display card          │
│  GET  /sdk/v2/filter         aggregated counts                 │
│  POST /sdk/v2/favorites/*    session-scoped favorites          │
│  GET  /sdk/v2/proxy/3d/*     Beans.ai proxy (key never leaves) │
└───────────────────────────┬────────────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────────────┐
│                Internal Data Layer (never reaches browser)     │
│                                                                │
│  PostgreSQL    unit inventory, pricing, availability           │
│  Redis         pre-computed layers, rate limit counters        │
│  S3            SVG source files (presigned, server-fetch only) │
│  Beans.ai      accessed server-side only, key never forwarded  │
└────────────────────────────────────────────────────────────────┘
```

---

## The Seven New Endpoints

### 1. `POST /sdk/v2/auth`
**Replaces:** `GET /api/partner/maps/authorized`

```
Request headers:
  X-API-Key: pk_live_...
  Origin:    https://partner.com          ← validated against allowed_domains

Response (no body):
  Set-Cookie: __pyn=<signed_jwt>; HttpOnly; Secure; SameSite=Strict; Max-Age=1200
  X-PYN-Session: <public_session_handle>  ← opaque, not the JWT
```

- Session token stored in **HttpOnly cookie** — JS cannot read it, never appears
  in network response body, invisible to `document.cookie`
- Cookie is **SameSite=Strict** → cannot be sent by cross-site requests (kills CSRF)
- `X-PYN-Session` is a short opaque reference the SDK uses to identify the session
  in subsequent requests — it is NOT the JWT, has no payload, cannot be decoded
- Token lifetime: **20 minutes**, silently refreshed by the SDK via a background call
- Origin header validated against `map_partners.allowed_domains` before issuing cookie

---

### 2. `GET /sdk/v2/manifest`
**Replaces:** the structural parts of `fetch_data`

```json
{
  "map": {
    "type": "floorplate",
    "floors": [1, 2, 3, 4, 5],
    "defaultFloor": 1
  },
  "branding": {
    "logoUrl": "https://cdn.pynwheel.com/logos/abc123.png",
    "theme": { "primaryColor": "#1A2B3C", "fontFamily": "Inter" }
  },
  "filters": {
    "bedrooms": ["Studio", "1 Bedroom", "2 Bedrooms"],
    "availability": ["Now", "This Month", "31–60 days"],
    "priceRange":   { "min": "$1,800", "max": "$4,200" },
    "sqftRange":    { "min": "450", "max": "1,200" }
  },
  "capabilities": {
    "show3d": true,
    "showCalculator": false,
    "showFavorites": true
  }
}
```

**What is NOT in manifest:**
- No unit IDs, unit numbers, or unit count
- No raw price numbers — only formatted display strings like `"$1,800"`
- No availability dates
- No data provider name (no "beans", no "Yardi", no "Entrata")
- No internal community ID in response body
- No SVG URLs

---

### 3. `GET /sdk/v2/layer?floor=1&filter[bedrooms]=2&filter[availability]=now`
**Replaces:** the unit rendering part of `fetch_data`

This is the key innovation. Instead of sending unit data, the server sends
a **pre-computed render instruction list** — just enough to paint the SVG:

```json
{
  "layer": [
    { "pid": "u_a3f9", "color": "#4CAF50", "opacity": 0.85 },
    { "pid": "u_b2d1", "color": "#4CAF50", "opacity": 0.85 },
    { "pid": "u_c7e2", "color": "#9E9E9E", "opacity": 0.40 }
  ],
  "summary": {
    "available": 12,
    "unavailable": 34,
    "model": 2
  }
}
```

**What `pid` is:** A session-scoped, short-lived, opaque pointer token:
```ruby
# Server generates per-layer, per-session
pid = Rails.application.message_verifier(:pyn_ptr_v1).generate({
  unit_id:    unit.id,
  session_id: session[:id],
  exp:        30.minutes.from_now.to_i
})
```

- `u_a3f9` is NOT the real unit ID — it is a **signed pointer token**
- It cannot be decoded without the server's secret key
- It expires in 30 minutes
- It is only valid for the session that requested the layer
- A different session gets different `pid` values for the same unit

The SDK maps SVG element selectors → `pid` values, applies colors.
No raw unit data in the browser at any point.

---

### 4. `GET /sdk/v2/unit/:pid`
**Replaces:** client-side unit detail panels populated from `fetch_data`

When a user clicks a unit, the SDK calls this with the `pid` from the layer:

```json
{
  "display": {
    "heading":      "2 Bed · 2 Bath · 987 sq ft",
    "availability": "Available Oct 1",
    "price":        "From $2,500/mo",
    "badge":        "Available",
    "image":        "https://cdn.pynwheel.com/units/signed_url_xyz.jpg",
    "buttons": [
      { "label": "Schedule Tour", "url": "https://...", "newTab": true },
      { "label": "Apply Now",     "url": "https://...", "newTab": true }
    ],
    "leaseOptions": [
      { "term": "6 months",  "price": "$2,750/mo" },
      { "term": "12 months", "price": "$2,500/mo" }
    ]
  }
}
```

**What is NOT returned:**
- No `unit_id` (database primary key)
- No `unit_status` (occupied / vacant / notice)
- No raw numbers — only formatted strings
- No `property_id` (data provider's internal code)
- No `floorplan_id`
- No `market_rent` as a number — only display string

The `pid` is validated server-side:
- Must match the session cookie (cross-session pid reuse fails)
- Must not be expired
- Unit must belong to the session's property
- Rate limited: 60 unit detail requests per session per minute

---

### 5. `GET /sdk/v2/filter?bedrooms=2&availability=now&sqft_min=600`
**Replaces:** client-side filter logic over the full unit array

Returns a new layer (same format as endpoint 3) with only the filtered units colored:

```json
{
  "layer": [ ... ],
  "summary": { "available": 5, "unavailable": 0, "model": 1 }
}
```

No raw data. Server applies the filter, server decides which units to highlight.

---

### 6. `POST /sdk/v2/favorites/*`
**Replaces:** existing favorites endpoints

Same behavior as today, but:
- No `X-SDK-Session-Id` header (session is already in HttpOnly cookie)
- No `X-Community-Id` header (community is in the session token, not client-provided)
- CSRF protected by `SameSite=Strict` cookie (no separate CSRF token needed)
- Favorites identified by `pid` list, not real `unit_ids`
- Server resolves `pid` → real unit ID on the server side

---

### 7. `GET /sdk/v2/proxy/3d/*`
**Replaces:** `beansApiKey` in `fetch_data` response

All Beans.ai calls are proxied server-side:

```ruby
# rails — sdk_controller.rb
def proxy_3d
  path = params[:path].to_s
  raise "invalid path" unless path.match?(%r{\A[\w\-/\.]+\z})

  resp = Faraday.get("https://www.beans.ai/#{path}") do |req|
    req.headers['Authorization'] = "Bearer #{ENV['BEANS_API_KEY']}"
  end

  render json: resp.body, status: resp.status
end
```

- `BEANS_API_KEY` is used only inside this server method
- Never appears in any response body
- Never appears in the SDK JS source
- The word "beans" does not need to appear anywhere in client-facing code —
  name the endpoint `/sdk/v2/proxy/3d` or `/sdk/v2/map3d`

---

## Session Cookie: Replacing the Bearer Token Flow

### Current (insecure)
```
1. Browser: GET /authorized  { X-API-Key: "pk_..." }
2. Server:  returns { session_token: "eyJ..." }  ← visible in network tab
3. Browser: stores token in localStorage           ← readable by any JS
4. Browser: GET /fetch_data  { Authorization: "Bearer eyJ..." }  ← visible
```

### New (secure)
```
1. Browser: POST /sdk/v2/auth  { X-API-Key: "pk_..." }
2. Server:  Set-Cookie: __pyn=<jwt>; HttpOnly; Secure; SameSite=Strict
            X-PYN-Session: op4q7r  ← opaque handle only, no payload
3. Browser: SDK stores only "op4q7r" in memory (not localStorage)
4. Browser: GET /sdk/v2/manifest  { X-PYN-Session: op4q7r }
            Cookie: __pyn=...  ← sent automatically by browser, not readable by JS
```

- The JWT never appears in any response body — only in a cookie header
- `document.cookie` cannot read it (HttpOnly)
- Network tab shows `Set-Cookie` header but the value is not readable by JS code
- `X-PYN-Session` is a meaningless opaque string tied to the JWT server-side
- No `Authorization` header on any request — nothing to scrape from request headers

---

## Response Payload Encryption (Defense-in-Depth)

Even after all the above, DevTools still shows response bodies. For the
`/sdk/v2/unit/:pid` endpoint (where formatted price strings appear), add
**session-bound AES-256-GCM encryption**:

### Key Exchange During Auth
```
1. SDK generates a fresh ECDH keypair on every page load (in memory)
2. Auth request includes SDK's public key:
   POST /sdk/v2/auth
   { publicKey: "MFkwEwY..." }  ← SDK's ephemeral public key

3. Server:
   a. Generates its own ephemeral ECDH keypair
   b. Derives shared secret: ECDH(server_private, sdk_public)
   c. Derives AES key: HKDF(shared_secret, session_id)
   d. Stores AES key server-side in Redis keyed by session_id
   e. Returns server's public key in response header:
      X-PYN-PK: "MFkwEwY..."  ← server's ephemeral public key

4. SDK:
   a. Derives same shared secret: ECDH(sdk_private, server_public)
   b. Derives same AES key: HKDF(shared_secret, session_id)
   c. Stores in JS memory only — never localStorage
```

### Encrypted Responses
```javascript
// Server encrypts unit detail response:
iv         = random 12 bytes
ciphertext = AES-256-GCM.encrypt(json_payload, session_aes_key, iv)
response   = { iv: base64(iv), data: base64(ciphertext) }

// SDK decrypts in memory:
plaintext  = AES-256-GCM.decrypt(data, session_aes_key, iv)
unit_card  = JSON.parse(plaintext)
// render unit_card — never stored, exists only while popup is open
```

**What this means in DevTools:**
```
Network → /sdk/v2/unit/u_a3f9 → Response:
{
  "iv":   "dGhpcyBpcyBhIHRlc3Q=",
  "data": "8K3mN2pL9xYzAbCdEfGhIjKlMnOpQrStUvWxYz..."
}
```
Even an authorized user opening DevTools sees only ciphertext. The only way
to decrypt it is to have the in-memory AES key, which is generated fresh on
every page load and never stored anywhere.

---

## SDK JS Obfuscation and Delivery

### Current
- `public/sdk/pyn-map-sdk-v1.js` — 3,038 lines of readable, commented source
- Variable names: `_sessionToken`, `_beans3dFloor`, `beansApiKey`
- Shipped directly from `public/` — no build step
- All logic visible to anyone who opens the file

### New Delivery Pipeline

```
Source: app/javascript/sdk/  (private, in Rails asset pipeline)
  └─ build step (esbuild / webpack):
       ├─ Minify (remove whitespace, shorten variable names)
       ├─ Obfuscate (javascript-obfuscator):
       │    - Rename: _sessionToken → a, _sdkSessionId → b, etc.
       │    - String encryption: "Authorization" → _0x4a2f("0x3")
       │    - Control flow flattening
       │    - Dead code injection
       └─ Output: public/sdk/map.min.js  (unreadable)
```

**What obfuscation provides:**
- Competitors cannot read the SDK logic or reverse-engineer the API structure
- Internal method names, endpoint paths, header names are not readable
- Not unbreakable — determined attacker can deobfuscate — but raises the cost significantly

**What it does NOT provide:**
- Not a replacement for server-side security
- Does not encrypt network requests
- Does not prevent DevTools use

**Recommended tools:**
- [javascript-obfuscator](https://github.com/javascript-obfuscator/javascript-obfuscator) — control flow flattening + string encryption
- esbuild for minification
- Source maps kept private (never shipped to `public/`)

---

## Removing "beans" from All Client-Facing Code

Search and replace every client-visible reference:

| Current (exposed) | Replace With | Where |
|-------------------|-------------|-------|
| `beansApiKey` in JSON response | Removed entirely | `sdk_payload_builder_service.rb:105` |
| `beans3dConfig` key in JSON | Renamed to `map3dConfig` or removed | `sdk_payload_builder_service.rb:103` |
| `enable_beans_svg` in JSON | Renamed to `enable_svg_mode` or removed | Response filter |
| `/api/partner/maps/` prefix | Renamed to `/sdk/v2/` | Routes |
| `PARTNER_RENT_API_KEY` etc in error messages | Generic error messages only | `base_controller.rb` |
| `beans` in Redis cache keys | Renamed to internal prefix | Cache service |
| `data_provider: "beans"` in response | Removed — data provider name never exposed | Response filter |

---

## HMAC Request Signing (Replay Prevention)

Every SDK request includes a request-specific HMAC signature, making
automated replay scraping significantly harder:

```javascript
// SDK generates on every request
const timestamp = Math.floor(Date.now() / 1000).toString();
const message   = `${method}:${path}:${timestamp}`;
const key       = await crypto.subtle.importKey("raw", sessionKeyBytes, ...);
const sig       = await crypto.subtle.sign("HMAC", key, encoder.encode(message));

headers['X-PYN-Sig'] = btoa(String.fromCharCode(...new Uint8Array(sig)));
headers['X-PYN-TS']  = timestamp;
```

```ruby
# Server validates
def validate_request_signature
  ts  = request.headers['X-PYN-TS'].to_i
  sig = request.headers['X-PYN-Sig']

  # Reject if timestamp is more than 30 seconds old (prevents replay)
  if (Time.now.to_i - ts).abs > 30
    return render_unauthorized("Request expired.")
  end

  message  = "#{request.method}:#{request.path}:#{ts}"
  expected = OpenSSL::HMAC.digest("SHA256", session_request_key, message)
  computed = Base64.decode64(sig)

  unless ActiveSupport::SecurityUtils.secure_compare(expected, computed)
    render_unauthorized("Invalid request signature.")
  end
end
```

**What this prevents:**
- A scraper cannot replay a captured `fetch_data` URL — the signature is time-bound
- Cannot batch-request all unit details — each request needs a fresh HMAC
- Cannot fake requests without the in-memory session key

---

## SVG Security: Expose Structure for Indexing, Hide Geometry

The SVG contains floor plan geometry (unit shapes, positions, dimensions).
A competitor can use these to understand a building's layout.

### What to Keep Accessible (for SEO / accessibility)
```html
<!-- Server-rendered accessible overlay — not the SVG geometry -->
<div class="pyn-accessible-content" aria-hidden="false" style="display:none">
  <h2>Luxury Apartments — Floor 3</h2>
  <ul>
    <li>2 Bedroom units available from $2,500/mo</li>
    <li>1 Bedroom units available from $1,800/mo</li>
  </ul>
</div>
```

This is rendered server-side in the pricing calculator or public page — **not in the SDK**.
Search engines index the text content. The SVG geometry is not indexed.

### What to Hide from the SVG
```ruby
# Before sending SVG to browser, strip all metadata attributes:
def sanitize_svg(svg_content)
  doc = Nokogiri::XML(svg_content)
  doc.xpath('//*[@data-unit-id]').each { |el| el.delete('data-unit-id') }
  doc.xpath('//*[@data-unit-name]').each { |el| el.delete('data-unit-name') }
  doc.xpath('//*[@id]').each { |el| el['id'] = "p#{Digest::SHA1.hexdigest(el['id'])[0..7]}" }
  doc.to_xml
end
```

IDs are replaced with short hashes — the SVG still functions (SDK uses hashed IDs),
but a competitor reading the SVG cannot identify which shape is "Unit 201" or
determine floor numbering from element IDs.

---

## Rate Limiting (Rack::Attack)

```ruby
# config/initializers/rack_attack.rb

# Auth endpoint: 10 new sessions per IP per hour
Rack::Attack.throttle('sdk/auth/ip', limit: 10, period: 3600) do |req|
  req.ip if req.path == '/sdk/v2/auth'
end

# Layer requests: 60/min per session (filter interactions)
Rack::Attack.throttle('sdk/layer/session', limit: 60, period: 60) do |req|
  req.get_header('HTTP_X_PYN_SESSION') if req.path.start_with?('/sdk/v2/layer')
end

# Unit detail: 30/min per session (prevents bulk unit enumeration)
Rack::Attack.throttle('sdk/unit/session', limit: 30, period: 60) do |req|
  req.get_header('HTTP_X_PYN_SESSION') if req.path.start_with?('/sdk/v2/unit/')
end

# 3D proxy: 20/min per session
Rack::Attack.throttle('sdk/proxy3d/session', limit: 20, period: 60) do |req|
  req.get_header('HTTP_X_PYN_SESSION') if req.path.start_with?('/sdk/v2/proxy/3d')
end

# Block IPs that hit 429 more than 5 times in 10 min (likely scraper)
Rack::Attack.blocklist('sdk/scraper/ip') do |req|
  Rack::Attack::Allow2Ban.filter(req.ip, maxretry: 5, findtime: 600, bantime: 3600) do
    req.path.start_with?('/sdk/v2/') && req.env['rack.attack.throttle_data']&.any?
  end
end
```

---

## Audit Logging

```ruby
# Every SDK API call is logged — non-blocking (async via ActiveJob)
class SdkAccessLog < ApplicationRecord
  # columns: action, community_id, session_handle, ip_address,
  #          origin, token_scope, response_code, duration_ms, created_at
end

# Detectable anomalies (background job runs every 5 min):
# - Same IP requesting > 500 unit details/hour (bulk enumeration)
# - Same session requesting units from multiple properties (token sharing)
# - Requests arriving without Origin header (direct API calls)
# - Sudden spike in 401s from an API key (key compromise detection)
```

---

## Performance & Memory Efficiency

The new architecture sends fewer bytes and makes fewer DB hits than the current
one — it is *faster*, not slower.

### Request Count Comparison

| Scenario | Current v1 | New v2 |
|----------|-----------|--------|
| Page load | 2 requests (auth + fetch_data) | 2 requests (auth + manifest) |
| Map render | +1 per floor SVG | +1 layer request (tiny JSON, not full SVG) |
| First SVG fetch | 1 SVG fetch | 1 SVG fetch (unchanged) |
| User clicks unit | 0 (data already in memory) | 1 unit detail request |
| User applies filter | 0 (JS filters in-memory array) | 1 layer request (replaces client filtering) |

Unit detail requests are new, but they are only triggered on explicit user
click — not on page load. A user who never clicks a unit makes zero extra
requests vs v1.

### Payload Size Comparison

| Payload | Current v1 | New v2 |
|---------|-----------|--------|
| `fetch_data` | 50 KB – 2 MB (all units) | Removed |
| `manifest` | N/A | ~2 KB fixed |
| `layer` (per floor) | N/A | ~15 bytes × unit_count (pre-computed) |
| `unit/:pid` | N/A | ~400 bytes per card (on click only) |

A 200-unit property today sends ~400 KB on every page load. With v2, a
visitor who never clicks a unit receives ~2 KB manifest + ~4 KB layer = **6 KB total**.
Only users who click units trigger additional calls, and each call is ~400 bytes.

### Redis Caching Strategy

The layer endpoint is the one called most often — it must be fast.

```ruby
# Layer cached per community + floor + filter hash
# Cache key: sdk_layer:v2:{community_id}:{floor}:{filter_sha}
#
# TTL: 5 minutes (units change infrequently; availability updates trigger invalidation)
# Average cached layer size: 15 bytes × 200 units = 3 KB — trivial Redis footprint
#
# Cache is INVALIDATED on:
#   - Unit availability/status change (ActiveRecord after_commit callback)
#   - Community settings change (color, filter config)

class LayerCacheService
  TTL = 5.minutes

  def self.fetch(community_id, floor, filter_hash, session_id, &block)
    base_key = "sdk_layer:v2:#{community_id}:#{floor}:#{filter_hash}"

    # Cached layer uses stable unit_ids — pids are injected at serve time
    cached_units = Rails.cache.fetch(base_key, expires_in: TTL, &block)

    # Swap real unit_ids for session-scoped pids AFTER cache hit (never cached)
    cached_units.map do |entry|
      entry.merge(pid: PointerTokenService.generate(entry[:unit_id], session_id))
            .except(:unit_id)   # real ID never leaves the server
    end
  end
end
```

**Key insight:** The color/filter computation (expensive) is cached by community+floor+filter.
The pid generation (cheap HMAC) happens after the cache hit, per-session. This means:

- Cache HIT rate is very high (same layer data for all visitors of the same property)
- Cache SIZE is tiny (no pids stored — they are ephemeral)
- Cache MISS cost is low (only color computation, no DB unit queries for repeated same-floor loads)

### Unit Detail: Served from Cache, Decrypted Per Session

```ruby
# Unit card JSON is cached unencrypted (it's just formatted display strings)
# Encryption happens at serve time from the cached plaintext
# Cache key: sdk_unit_card:v2:{unit_id}
# TTL: 15 minutes

class UnitCardCacheService
  TTL = 15.minutes

  def self.fetch_and_encrypt(unit_id, session_encryptor, &block)
    card_json = Rails.cache.fetch("sdk_unit_card:v2:#{unit_id}", expires_in: TTL, &block)
    # Encrypt the cached plaintext for this specific session
    session_encryptor.encrypt(card_json)
  end
end
```

- Unit card text is cached once, encrypted differently per session
- Cache HIT = one Redis GET + one AES encrypt (~0.1 ms each) — negligible
- DB is only hit on cache miss or after unit data changes

### Memory Footprint (Browser-Side)

The SDK keeps nothing in localStorage or sessionStorage:

| Data | v1 storage | v2 storage |
|------|-----------|-----------|
| Session token | localStorage (50-min) | JS memory only (cleared on page unload) |
| SVG files | localStorage (permanent) | JS Map (cleared on page unload) |
| Unit data | JS object (all units, ~1 MB) | Nothing (never sent to browser) |
| Layer pids | N/A | JS Map (per-floor, ~3 KB, cleared on floor change) |
| ECDH key | N/A | CryptoKey in memory (non-extractable) |

**Browser memory usage drops from ~1–5 MB (v1) to ~50–100 KB (v2).**

### ECDH Key Exchange: One-Time Cost

The ECDH key exchange during auth is ~2 ms on modern hardware (browser
`SubtleCrypto` is hardware-accelerated). It happens once per page load.
All subsequent requests use the derived AES key — AES-GCM encrypt/decrypt
is ~0.1 ms per operation.

### Auth Latency: Silent Background Refresh

Token TTL is 20 minutes. The SDK refreshes it silently 2 minutes before expiry:

```javascript
// No user-visible delay — refresh happens in the background
// while the user is still on the page
setTimeout(() => this._silentRefresh(), (TOKEN_TTL - 120) * 1000);
```

If the refresh fails (network error), the next user interaction triggers a
visible re-auth (~100 ms for the auth round-trip).

### Summary: v2 is Faster AND More Secure

| Metric | v1 | v2 |
|--------|----|----|
| Page load data transferred | 50 KB – 2 MB | ~6 KB |
| Browser memory used | 1–5 MB | ~100 KB |
| localStorage entries | 3–20 (tokens + SVGs) | 0 |
| DB queries per page load | Many (full unit fetch) | Manifest only (cached) |
| DB queries per unit click | 0 (already in memory) | 1 (if cache miss) |
| Unit data in DevTools | All units visible | Nothing (encrypted) |

---

## Migration Path (Breaking Change, Recommended Version Bump)

```
v1 (current):  /api/partner/maps/*  — insecure, all data in browser
v2 (new):      /sdk/v2/*           — secure, render-instruction model

Timeline:
  Week 1:  Deploy v2 endpoints alongside v1 (v1 still works)
  Week 2:  Release new SDK JS (map.min.js) pointing to v2
  Week 3:  Notify all partners to update their embed snippet
           <script src="sdk.min.js"> → <script src="map.min.js">
  Week 6:  Deprecate v1 — return 410 Gone
  Week 8:  Remove v1 code
```

Both versions share the same community data — only the API layer changes.

---

## Files to Create / Modify

| File | Action | Purpose |
|------|--------|---------|
| `config/routes.rb` | Add | `/sdk/v2/*` namespace |
| `app/controllers/sdk/v2/auth_controller.rb` | New | HttpOnly cookie issuance + domain validation |
| `app/controllers/sdk/v2/manifest_controller.rb` | New | Safe structural data only |
| `app/controllers/sdk/v2/layer_controller.rb` | New | Pre-colored render instructions + `pid` tokens |
| `app/controllers/sdk/v2/unit_controller.rb` | New | Per-unit display card (encrypted) |
| `app/controllers/sdk/v2/filter_controller.rb` | New | Server-side filter → new layer |
| `app/controllers/sdk/v2/proxy3d_controller.rb` | New | Beans.ai proxy |
| `app/controllers/sdk/v2/favorites_controller.rb` | New | Favorites via cookie session |
| `app/controllers/sdk/v2/base_controller.rb` | New | Cookie auth, HMAC sig validation, rate limit, audit log |
| `app/services/sdk/pointer_token_service.rb` | New | Generate/verify session-scoped `pid` tokens |
| `app/services/sdk/layer_builder_service.rb` | New | Build render instruction list (replaces SdkPayloadBuilderService) |
| `app/services/sdk/response_encryptor_service.rb` | New | ECDH key exchange + AES-256-GCM encryption |
| `app/services/sdk/svg_sanitizer_service.rb` | New | Strip unit metadata from SVG before delivery |
| `app/models/map_partner.rb` | Modify | Add `allowed_domains` array column |
| `app/models/sdk_access_log.rb` | New | Audit log model |
| `app/services/sdk_payload_builder_service.rb` | Modify | Remove `beansApiKey`, `beans3dConfig`, `unit_status`, raw prices |
| `config/application.rb` | Modify | CORS: replace `origins '*'` with dynamic allowlist |
| `config/initializers/rack_attack.rb` | New | Rate limiting rules |
| `app/javascript/sdk/` | New | New SDK source (private, build pipeline output) |
| `public/sdk/map.min.js` | Replace | Built, minified, obfuscated SDK |
| `Gemfile` | Modify | Add `rack-attack`, `faraday`, `nokogiri` (if not present) |
| `db/migrate/*_sdk_v2.rb` | New | `sdk_access_logs` table, `allowed_domains` on `map_partners` |

---

## What DevTools Shows After This Architecture

### Network Tab — Before
```
GET /api/partner/maps/fetch_data
Response (decoded gzip):
{
  "property": { "beans3dConfig": { "beansApiKey": "sk-live-xxxx" } },
  "units": [
    { "unitId": 1234, "market_rent": 2500, "unit_status": "Occupied", ... },
    ...hundreds more...
  ]
}
```

### Network Tab — After
```
POST /sdk/v2/auth
Response: (empty body)
Set-Cookie: __pyn=...; HttpOnly  ← JWT hidden in cookie

GET /sdk/v2/manifest
Response: { "map": {...}, "branding": {...}, "filters": {...} }
← no unit data, no prices as numbers, no internal IDs

GET /sdk/v2/layer?floor=1
Response: { "layer": [{"pid":"u_a3f9","color":"#4CAF50","opacity":0.85},...] }
← no unit IDs, no unit names, just colored pointers

GET /sdk/v2/unit/u_a3f9          ← user clicked a unit
Response: { "iv": "dGhpcyBp...", "data": "8K3mN2pL..." }
← AES-256-GCM encrypted, unreadable in DevTools
```

A competitor opening DevTools sees: a cookie they cannot read, a manifest with
no sensitive data, colored dot instructions, and encrypted ciphertext for unit
details. **There is nothing to scrape.**

---

*Last updated: 2026-06-15*
