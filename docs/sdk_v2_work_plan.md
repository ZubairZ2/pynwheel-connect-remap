# Pynwheel Maps SDK — Security Architecture v2: Finalized Work Plan

## Threat Model Summary

**What an attacker sees today in DevTools:**

```
GET /api/partner/maps/fetch_data
Response: {
  "property": { "beans3dConfig": { "beansApiKey": "sk-live-xxxx" } },  ← 3rd-party API key
  "units": [
    { "unitId": 1001, "market_rent": "2500", "unit_status": "Occupied", ... },
    ...all 200 units...
  ]
}
```

Plus: the session token is in `localStorage` (readable by any injected JS), the `Authorization: Bearer` header is visible on every request, and the `X-SDK-Session-Id` UUID lets anyone else read or write someone's favorites.

**What they'll see after this work:**
```
POST /sdk/v2/auth       → empty body, HttpOnly cookie (unreadable)
GET  /sdk/v2/manifest   → branding, filter labels, no unit data
GET  /sdk/v2/layer      → colored dot instructions + opaque pids
GET  /sdk/v2/unit/u_a3f → { "iv": "...", "data": "..." }  ← AES-256-GCM ciphertext
```

Nothing to scrape, nothing to replay, nothing to reverse.

---

## Scope

Two repos, three deliverables:

| Repo | Work |
|------|------|
| `pynwheel` (Rails backend) | New `/sdk/v2/` endpoint namespace + services |
| `pynwheel` (Rails backend) | New SDK JS source in `app/javascript/sdk/` + build pipeline |
| `pynwheel-maps` (React frontend) | Update to consume v2 SDK interface |

---

## Phase 1 — Database & Configuration

### 1.1 Migration: `map_partners` domain allowlist

```ruby
# db/migrate/TIMESTAMP_add_allowed_domains_to_map_partners.rb
add_column :map_partners, :allowed_domains, :text, array: true, default: []
add_column :map_partners, :active, :boolean, default: true, null: false
```

**Why:** The origin header on each auth request must be validated against a known-good list. Without this, any site can embed the map using a stolen API key.

### 1.2 Migration: `sdk_access_logs` table

```ruby
create_table :sdk_access_logs do |t|
  t.string  :action,          null: false
  t.integer :community_id
  t.string  :session_handle
  t.string  :ip_address
  t.string  :origin
  t.integer :response_code
  t.integer :duration_ms
  t.timestamps
end
add_index :sdk_access_logs, [:community_id, :created_at]
add_index :sdk_access_logs, [:session_handle, :created_at]
```

### 1.3 Gemfile additions

```ruby
gem 'rack-attack'          # rate limiting
gem 'faraday'              # for Beans.ai proxy (likely already present)
```

### 1.4 Environment variables (add to `.env`)

```bash
BEANS_API_KEY=<moved here from anywhere it currently is>
PYN_SESSION_SECRET=<64-char random — separate from Rails secret_key_base>
PYN_PTR_SECRET=<64-char random — for pointer token signing>
```

---

## Phase 2 — Backend: Core Services

### 2.1 `app/services/sdk/pointer_token_service.rb`

Generates and verifies opaque `pid` values that map to real unit IDs server-side. The pid is a Rails `message_verifier` token — signed, expiring, session-scoped.

```ruby
module Sdk
  class PointerTokenService
    VERIFIER = Rails.application.message_verifier(:pyn_ptr_v1)
    TTL = 30.minutes

    def self.generate(unit_id, session_id)
      VERIFIER.generate(
        { u: unit_id, s: session_id, e: TTL.from_now.to_i },
        expires_in: TTL
      )
    end

    def self.verify!(pid, session_id)
      payload = VERIFIER.verify(pid)
      raise "expired" if payload[:e] < Time.now.to_i
      raise "session mismatch" if payload[:s] != session_id
      payload[:u]  # returns real unit_id
    end
  end
end
```

**Security properties:** Cannot be guessed. Cannot be reused across sessions. Cannot be used after 30 minutes. If someone intercepts a `pid`, it reveals nothing — it's opaque.

### 2.2 `app/services/sdk/response_encryptor_service.rb`

ECDH key exchange during auth, AES-256-GCM encryption for unit detail responses.

```ruby
module Sdk
  class ResponseEncryptorService
    # Called once during auth when SDK sends its ephemeral ECDH public key
    def self.derive_session_key(sdk_public_key_b64, session_id)
      server_keypair = OpenSSL::PKey::EC.generate("prime256v1")
      sdk_pubkey = OpenSSL::PKey::EC.new(Base64.decode64(sdk_public_key_b64))

      shared_secret = server_keypair.dh_compute_key(sdk_pubkey.public_key)
      aes_key = OpenSSL::PKCS5.pbkdf2_hmac(
        shared_secret, session_id, 1, 32, OpenSSL::Digest::SHA256.new
      )

      {
        aes_key: aes_key,                              # stored in Redis by session_id
        server_public_key: Base64.strict_encode64(
          server_keypair.public_key.to_der             # returned in X-PYN-PK header
        )
      }
    end

    # Called for each unit detail response
    def self.encrypt(json_string, aes_key_bytes)
      iv = OpenSSL::Random.random_bytes(12)
      cipher = OpenSSL::Cipher.new("aes-256-gcm").tap do |c|
        c.encrypt
        c.key = aes_key_bytes
        c.iv  = iv
      end
      ct  = cipher.update(json_string) + cipher.final
      tag = cipher.auth_tag
      {
        iv:   Base64.strict_encode64(iv),
        data: Base64.strict_encode64(ct + tag)
      }
    end
  end
end
```

### 2.3 `app/services/sdk/layer_builder_service.rb`

Builds the render instruction list — color per unit, no raw data.

```ruby
module Sdk
  class LayerBuilderService
    def self.build(community, floor, filters, session_id)
      cache_key = "sdk_layer:v2:#{community.id}:#{floor}:#{Digest::SHA256.hexdigest(filters.to_json)[0..15]}"

      # Cache: stores unit_id + color (never pids — pids are session-scoped)
      base_entries = Rails.cache.fetch(cache_key, expires_in: 5.minutes) do
        units = community.units.on_floor(floor).with_filters(filters)
        units.map { |u| { unit_id: u.id, color: resolve_color(u, community), opacity: resolve_opacity(u) } }
      end

      # Swap real IDs for session-scoped pids after cache hit
      layer = base_entries.map do |e|
        { pid: PointerTokenService.generate(e[:unit_id], session_id),
          color: e[:color], opacity: e[:opacity] }
      end

      available = base_entries.count { |e| e[:color] == community.unit_colors["availableColor"] }
      { layer: layer, summary: { available: available, total: base_entries.size } }
    end

    private

    def self.resolve_color(unit, community)
      return community.unit_colors["modelColor"]     if unit.is_model?
      return community.unit_colors["availableColor"] if unit.available?
      community.unit_colors["unavailableColor"] || "#9E9E9E"
    end

    def self.resolve_opacity(unit)
      unit.available? ? 1.0 : 0.4
    end
  end
end
```

### 2.4 `app/services/sdk/svg_sanitizer_service.rb`

Strip unit metadata from SVG before delivery.

```ruby
module Sdk
  class SvgSanitizerService
    def self.sanitize(svg_content)
      doc = Nokogiri::XML(svg_content)
      %w[data-unit-id data-unit-name data-unit-number data-floor].each do |attr|
        doc.xpath("//*[@#{attr}]").each { |el| el.delete(attr) }
      end
      doc.xpath('//*[@id]').each do |el|
        el['id'] = "p#{Digest::SHA1.hexdigest(el['id'])[0..7]}"
      end
      doc.to_xml
    end
  end
end
```

### 2.5 `app/services/sdk/unit_card_builder_service.rb`

Builds the unit display card — formatted strings only, no raw IDs or numbers.

```ruby
module Sdk
  class UnitCardBuilderService
    def self.build(unit, community)
      Rails.cache.fetch("sdk_unit_card:v2:#{unit.id}", expires_in: 15.minutes) do
        rent_display = unit.effective_rent.present? ?
          ActionController::Base.helpers.number_to_currency(unit.effective_rent, precision: 0) :
          "Contact for pricing"

        {
          display: {
            heading:      "#{bedrooms_label(unit)} · #{unit.bathrooms} Bath · #{unit.square_feet} sq ft",
            availability: availability_label(unit),
            price:        "From #{rent_display}/mo",
            badge:        unit.available? ? "Available" : "Not Available",
            image:        unit.primary_image_url,
            buttons:      build_buttons(unit, community)
          }
        }
      end
    end

    # No unit.id, no unit.market_rent raw number, no unit_status string in output
  end
end
```

---

## Phase 3 — Backend: `/sdk/v2/` Controllers

### 3.1 `app/controllers/sdk/v2/base_controller.rb`

```ruby
module Sdk
  module V2
    class BaseController < ActionController::API
      before_action :authenticate_session!
      before_action :validate_request_signature!
      after_action  :log_access

      private

      def authenticate_session!
        jwt = cookies.encrypted[:__pyn]
        return render_unauthorized("No session.") unless jwt

        payload = Rails.application.message_verifier(:pyn_session_v2).verify(jwt)
        return render_unauthorized("Session expired.") if payload[:exp] < Time.now.to_i

        @current_session = payload
        @community = Community.find_by(id: payload[:community_id])
        return render_unauthorized("Property not found.") unless @community
      rescue ActiveSupport::MessageVerifier::InvalidSignature
        render_unauthorized("Invalid session.")
      end

      def validate_request_signature!
        ts  = request.headers['X-PYN-TS'].to_i
        sig = request.headers['X-PYN-Sig']
        return render_unauthorized("Missing signature.") if sig.blank?
        return render_unauthorized("Request expired.")   if (Time.now.to_i - ts).abs > 30

        expected = OpenSSL::HMAC.digest("SHA256", session_request_key, "#{request.method}:#{request.path}:#{ts}")
        unless ActiveSupport::SecurityUtils.secure_compare(Base64.decode64(sig), expected)
          render_unauthorized("Invalid signature.")
        end
      end

      def session_request_key
        Redis.current.get("sdk_req_key:#{@current_session[:handle]}")
      end

      def render_unauthorized(msg)
        render json: { error: "Unauthorized" }, status: :unauthorized
      end

      def log_access
        SdkAccessLog.create_async(
          action:         "#{controller_name}##{action_name}",
          community_id:   @community&.id,
          session_handle: request.headers['X-PYN-Session'],
          ip_address:     request.remote_ip,
          origin:         request.headers['Origin'],
          response_code:  response.status
        )
      end
    end
  end
end
```

### 3.2 `app/controllers/sdk/v2/auth_controller.rb`

```ruby
module Sdk
  module V2
    class AuthController < ActionController::API
      # No authenticate_session! — this IS the auth endpoint

      def create
        api_key = request.headers['X-API-Key']
        origin  = request.headers['Origin']
        sdk_public_key = params[:publicKey]

        partner = MapPartner.active.find_by(api_key: api_key)
        return render_unauthorized("Invalid API key.") unless partner

        # Domain allowlist check
        unless origin.blank? || partner.allows_origin?(origin)
          return render json: { error: "Origin not allowed." }, status: :forbidden
        end

        community = Community.find(partner.community_id)
        session_id     = SecureRandom.hex(16)
        session_handle = SecureRandom.hex(6)

        # ECDH key exchange
        encryptor_data = Sdk::ResponseEncryptorService.derive_session_key(sdk_public_key, session_id)

        # Store AES key + request signing key in Redis (TTL matches session)
        Redis.current.setex("sdk_aes_key:#{session_id}",    1200, encryptor_data[:aes_key])
        Redis.current.setex("sdk_req_key:#{session_handle}", 1200, derive_request_key(encryptor_data[:aes_key]))
        Redis.current.setex("sdk_handle:#{session_handle}",  1200, session_id)

        # Build JWT
        jwt = Rails.application.message_verifier(:pyn_session_v2).generate({
          community_id:   community.id,
          session_id:     session_id,
          handle:         session_handle,
          exp:            20.minutes.from_now.to_i
        })

        # HttpOnly cookie — JS cannot read this
        cookies.encrypted[:__pyn] = {
          value:     jwt,
          httponly:  true,
          secure:    Rails.env.production?,
          same_site: :strict,
          expires:   20.minutes.from_now
        }

        response.headers['X-PYN-Session'] = session_handle
        response.headers['X-PYN-PK']      = encryptor_data[:server_public_key]

        head :no_content  # empty body — nothing to read in DevTools
      end

      private

      def derive_request_key(aes_key)
        OpenSSL::HMAC.digest("SHA256", aes_key, "request-signing-key")
      end

      def render_unauthorized(msg)
        render json: { error: "Unauthorized" }, status: :unauthorized
      end
    end
  end
end
```

### 3.3 `app/controllers/sdk/v2/manifest_controller.rb`

Returns only safe structural data — no units, no prices as raw numbers.

```ruby
module Sdk
  module V2
    class ManifestController < BaseController
      def show
        render json: {
          map: {
            type:         @community.map_type,
            floors:       @community.available_floors,
            defaultFloor: @community.default_floor
          },
          branding: {
            logoUrl: @community.logo_url,
            theme:   @community.theme_config
          },
          filters:      build_safe_filters,
          capabilities: {
            show3d:         @community.enable_3d_maps?,
            showCalculator: @community.calculator_config&.enabled?,
            showFavorites:  true
          }
        }
      end

      private

      def build_safe_filters
        units = @community.units
        {
          bedrooms:     @community.available_bedroom_labels,
          availability: ["Now", "This Month", "31–60 days", "61–90 days"],
          priceRange: {
            min: format_rent(units.minimum(:effective_rent)),
            max: format_rent(units.maximum(:effective_rent))
          },
          sqftRange: {
            min: units.minimum(:square_feet).to_s,
            max: units.maximum(:square_feet).to_s
          }
        }
      end

      def format_rent(cents)
        ActionController::Base.helpers.number_to_currency(cents, precision: 0)
      end
    end
  end
end
```

### 3.4 `app/controllers/sdk/v2/layer_controller.rb`

The key endpoint — returns render instructions, not data.

```ruby
module Sdk
  module V2
    class LayerController < BaseController
      def show
        floor   = params[:floor].to_i
        filters = params.permit(:bedrooms, :availability, :sqft_min, :sqft_max, :price_min, :price_max).to_h

        result = Sdk::LayerBuilderService.build(@community, floor, filters, @current_session[:session_id])
        render json: result
      end
    end
  end
end
```

### 3.5 `app/controllers/sdk/v2/units_controller.rb`

Per-click unit detail, AES-256-GCM encrypted.

```ruby
module Sdk
  module V2
    class UnitsController < BaseController
      def show
        pid = params[:pid]

        unit_id = Sdk::PointerTokenService.verify!(pid, @current_session[:session_id])
        unit    = @community.units.find(unit_id)

        card_json = Sdk::UnitCardBuilderService.build(unit, @community).to_json

        aes_key = Redis.current.get("sdk_aes_key:#{@current_session[:session_id]}")
        render json: Sdk::ResponseEncryptorService.encrypt(card_json, aes_key)
      rescue ActiveSupport::MessageVerifier::InvalidSignature, ActiveRecord::RecordNotFound
        render json: { error: "Invalid or expired pointer." }, status: :not_found
      end
    end
  end
end
```

### 3.6 `app/controllers/sdk/v2/proxy3d_controller.rb`

Beans.ai proxy — key never leaves the server.

```ruby
module Sdk
  module V2
    class Proxy3dController < BaseController
      def show
        path = params[:path].to_s
        raise ArgumentError, "invalid path" unless path.match?(%r{\A[\w\-/\.]+\z})

        resp = Faraday.get("https://www.beans.ai/#{path}") do |req|
          req.headers['Authorization'] = "Bearer #{ENV.fetch('BEANS_API_KEY')}"
        end

        render json: JSON.parse(resp.body), status: resp.status
      rescue ArgumentError
        render json: { error: "Invalid path." }, status: :bad_request
      end
    end
  end
end
```

### 3.7 `app/controllers/sdk/v2/favorites_controller.rb`

Favorites via HttpOnly cookie session — no client-supplied community ID or session ID.

```ruby
module Sdk
  module V2
    class FavoritesController < BaseController
      def index
        pids     = favorites_for_session
        unit_ids = pids.filter_map { |pid| Sdk::PointerTokenService.verify!(pid, @current_session[:session_id]) rescue nil }
        render json: { count: unit_ids.size, pids: pids }
      end

      def create
        pid     = params.require(:pid)
        unit_id = Sdk::PointerTokenService.verify!(pid, @current_session[:session_id])
        fav = Favorite.find_or_create_by(community_id: @community.id, session_id: @current_session[:session_id])
        fav.add_unit(unit_id)
        render json: { ok: true }
      end

      def destroy
        pid     = params.require(:pid)
        unit_id = Sdk::PointerTokenService.verify!(pid, @current_session[:session_id])
        fav = Favorite.find_by(community_id: @community.id, session_id: @current_session[:session_id])
        fav&.remove_unit(unit_id)
        render json: { ok: true }
      end
    end
  end
end
```

---

## Phase 4 — Routes

```ruby
# config/routes.rb — add inside the existing namespace block
namespace :sdk do
  namespace :v2 do
    post   'auth',           to: 'auth#create'
    post   'auth/refresh',   to: 'auth#refresh'
    get    'manifest',       to: 'manifest#show'
    get    'layer',          to: 'layer#show'
    get    'filter',         to: 'layer#show'     # alias — same logic
    get    'unit/:pid',      to: 'units#show',    constraints: { pid: /[^\/]+/ }
    resources 'favorites',   only: [:index, :create, :destroy]
    get    'proxy/3d/*path', to: 'proxy3d#show',  format: false
  end
end
```

---

## Phase 5 — Rate Limiting

```ruby
# config/initializers/rack_attack.rb

# Auth: 10 new sessions per IP per hour (prevents mass key-testing)
Rack::Attack.throttle('sdk/auth', limit: 10, period: 3600) do |req|
  req.ip if req.path == '/sdk/v2/auth' && req.post?
end

# Layer: 120/min per session handle (filter interactions are fast)
Rack::Attack.throttle('sdk/layer', limit: 120, period: 60) do |req|
  req.get_header('HTTP_X_PYN_SESSION') if req.path.start_with?('/sdk/v2/layer')
end

# Unit detail: 30/min per session (prevents pid enumeration)
Rack::Attack.throttle('sdk/unit', limit: 30, period: 60) do |req|
  req.get_header('HTTP_X_PYN_SESSION') if req.path.start_with?('/sdk/v2/unit/')
end

# 3D proxy: 20/min per session
Rack::Attack.throttle('sdk/3d', limit: 20, period: 60) do |req|
  req.get_header('HTTP_X_PYN_SESSION') if req.path.start_with?('/sdk/v2/proxy/')
end

# Scraper ban: IP that triggers 429 five times in 10 minutes → 1-hour ban
Rack::Attack.blocklist('sdk/scraper') do |req|
  Rack::Attack::Allow2Ban.filter(req.ip, maxretry: 5, findtime: 600, bantime: 3600) do
    req.path.start_with?('/sdk/v2/') && req.env['rack.attack.throttle_data']&.any?
  end
end

Rack::Attack.throttled_responder = lambda do |_env|
  [429, { 'Content-Type' => 'application/json' }, ['{"error":"Too many requests"}']]
end
```

---

## Phase 6 — New SDK JavaScript (`app/javascript/sdk/`)

New SDK source — built and obfuscated, output to `public/sdk/map.min.js`.

### Key changes from `pyn-map-sdk-v1.js`

| v1 (current) | v2 (new) |
|---|---|
| `localStorage.setItem('pyn_tok_X', sessionToken)` | Session lives in HttpOnly cookie — JS stores only the opaque handle in memory |
| `Authorization: Bearer <token>` on every request | No Authorization header — cookie sent automatically |
| `fetch_data` → full unit array in memory | No unit data in memory — units are pids only |
| `beansApiKey` used directly from response | All 3D calls go to `/sdk/v2/proxy/3d/` |
| No request signing | HMAC `X-PYN-Sig` on every request |
| Unit click → reads from in-memory array | Unit click → `GET /sdk/v2/unit/:pid` → decrypt response |

### Auth flow

```javascript
// In-memory only — never localStorage, never sessionStorage
let _sessionHandle = null;   // opaque, returned in X-PYN-Session header
let _sessionAesKey = null;   // CryptoKey — non-extractable, derived via ECDH

async function _authenticate(apiKey, propertyId) {
  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" }, false, ["deriveKey"]
  );
  const pubKeyDer = await crypto.subtle.exportKey("spki", keyPair.publicKey);
  const pubKeyB64 = btoa(String.fromCharCode(...new Uint8Array(pubKeyDer)));

  const resp = await fetch('/sdk/v2/auth', {
    method: 'POST',
    credentials: 'include',
    headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ propertyId, publicKey: pubKeyB64 })
  });

  if (!resp.ok) throw new Error('Auth failed');

  _sessionHandle = resp.headers.get('X-PYN-Session');
  const serverPubB64 = resp.headers.get('X-PYN-PK');

  const serverPubKeyDer = Uint8Array.from(atob(serverPubB64), c => c.charCodeAt(0));
  const serverPubKey = await crypto.subtle.importKey(
    "spki", serverPubKeyDer, { name: "ECDH", namedCurve: "P-256" }, false, []
  );
  _sessionAesKey = await crypto.subtle.deriveKey(
    { name: "ECDH", public: serverPubKey },
    keyPair.privateKey,
    { name: "AES-GCM", length: 256 },
    false,   // non-extractable — key cannot be exported
    ["decrypt"]
  );

  // Schedule silent refresh 2 min before expiry
  setTimeout(_silentRefresh, (20 * 60 - 120) * 1000);
}
```

### HMAC request signing

```javascript
async function _signedFetch(method, path, init = {}) {
  const ts  = Math.floor(Date.now() / 1000).toString();
  const msg = `${method}:${path}:${ts}`;
  const key = await crypto.subtle.importKey(
    "raw", _requestSigningKeyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig    = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)));

  return fetch(path, {
    ...init,
    credentials: 'include',
    headers: {
      ...(init.headers || {}),
      'X-PYN-Session': _sessionHandle,
      'X-PYN-TS':      ts,
      'X-PYN-Sig':     sigB64
    }
  });
}
```

### Unit detail decryption

```javascript
async function _fetchUnit(pid) {
  const resp        = await _signedFetch('GET', `/sdk/v2/unit/${pid}`);
  const { iv, data } = await resp.json();

  const ivBytes = Uint8Array.from(atob(iv),   c => c.charCodeAt(0));
  const ctBytes = Uint8Array.from(atob(data),  c => c.charCodeAt(0));

  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: ivBytes },
    _sessionAesKey,
    ctBytes
  );
  return JSON.parse(new TextDecoder().decode(plaintext));
}
```

### Build pipeline

```bash
# esbuild minify
npx esbuild app/javascript/sdk/index.js \
  --bundle --minify --target=es2020 \
  --outfile=public/sdk/map.min.js

# Obfuscate output
npx javascript-obfuscator public/sdk/map.min.js \
  --output public/sdk/map.min.js \
  --compact true \
  --control-flow-flattening true \
  --string-array true \
  --rotate-string-array true \
  --self-defending true
```

Source maps go to a **private** location — never to `public/`.

---

## Phase 7 — pynwheel-maps React Frontend Updates

### 7.1 Remove all localStorage token logic

```diff
- const lsKey = `pyn_tok_${propertyId}`;
- localStorage.setItem(lsKey, token);
```

The new SDK manages auth via HttpOnly cookie — the React app never sees or stores the token.

### 7.2 Remove sessionId parameter from favorites calls

The new favorites endpoints use the cookie session server-side. No `X-SDK-Session-Id` header.

```diff
- await sdk.saveFavorite([resolvedId], favoritesContextId, activeSessionId);
+ await sdk.saveFavorite([resolvedId], favoritesContextId);

- await sdk.deleteFavorite([resolvedId], favoritesContextId, activeSessionId);
+ await sdk.deleteFavorite([resolvedId], favoritesContextId);

- await sdk.getFavorites(contextIdForSdk, activeSessionId);
+ await sdk.getFavorites(contextIdForSdk);
```

### 7.3 Unit click handler — formatted card, not raw data

`getUnits()` no longer exists. Unit detail comes from the server on click. The SDK's `onUnitClick` callback now returns the formatted display card (already decrypted by the SDK).

```javascript
// MapView.jsx — update unit click handler
PynMapSDK.init({
  onUnitClick: async (displayCard) => {
    // displayCard is: { heading, availability, price, badge, image, buttons }
    // NOT: { unitId, market_rent, unit_status, ... }
    setSelectedUnit(displayCard);
  }
});
```

### 7.4 Remove all Beans.ai references

Remove any code that reads `beansApiKey` or `beans3dConfig` from the SDK. The 3D map works transparently via the proxy.

### 7.5 Shared favorites URL — server-side snapshot

The current implementation encodes unit IDs in the share URL. With pids (which expire and are session-scoped), share links must be server-stored:

- Server stores the share snapshot in Redis with a stable share token (72-hour TTL)
- Share URL: `https://pynwheelmap.com/?propertyId=X&share=<token>`
- On load: SDK fetches shared favorites from `/sdk/v2/favorites/shared/:token` — no session required for read-only shares
- **Behavior change:** Shared links expire after 72 hours (currently permanent)

---

## Phase 8 — Remove All "beans" References

| Location | Current | Replace with |
|---|---|---|
| `sdk_payload_builder_service.rb` | `beansApiKey` in response | Remove entirely |
| `sdk_payload_builder_service.rb` | `beans3dConfig` key | Remove (proxy handles it) |
| `sdk_payload_builder_service.rb` | `enable_beans_svg` | Rename to `enable_svg_mode` or remove |
| `pyn-map-sdk-v1.js` | `_beans3dFloor`, `beansApiKey` vars | Renamed to `_3dFloor` in v2 |
| Error messages in any controller | `PARTNER_RENT_API_KEY` etc | Generic: `"Authentication failed."` |
| Redis cache keys | `beans:*` | `sdk:*` |
| `data_provider` field in any response | `"beans"` | Remove — never expose provider name |

---

## Phase 9 — CORS Lockdown

```ruby
# config/initializers/cors.rb
Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    # SDK endpoints: restrict to registered partner origins
    origins do |source, _env|
      MapPartner.allows_origin?(source)
    end
    resource '/sdk/v2/*',
      headers:     :any,
      methods:     [:get, :post, :delete, :options],
      credentials: true,    # required for cookie-based auth
      expose:      ['X-PYN-Session', 'X-PYN-PK']
  end

  allow do
    # Admin/app endpoints: unchanged
    origins '*'
    resource '/api/v1/*', headers: :any, methods: :any
  end
end
```

The `credentials: true` + `SameSite=Strict` combination means:
- The HttpOnly cookie is sent automatically on SDK requests from allowed origins
- Cross-site requests (CSRF) cannot use the cookie due to SameSite=Strict
- JS on a non-whitelisted origin cannot make credentialed requests

---

## Migration Timeline

```
Week 1:  Phase 1–5   — Backend complete, v2 endpoints deployed (v1 still running)
Week 2:  Phase 6     — New SDK JS built and shipped as map.min.js
Week 3:  Phase 7     — pynwheel-maps frontend updated to v2 interface
Week 4:  Phase 8–9   — Remove "beans" references, lock CORS
Week 5:              — QA + partner testing window
Week 6:              — v1 endpoints → return 410 Gone
Week 8:              — Delete v1 code entirely
```

---

## File Checklist

### `pynwheel` (Rails)

| File | Action |
|---|---|
| `db/migrate/*_add_allowed_domains_to_map_partners.rb` | New |
| `db/migrate/*_create_sdk_access_logs.rb` | New |
| `app/controllers/sdk/v2/base_controller.rb` | New |
| `app/controllers/sdk/v2/auth_controller.rb` | New |
| `app/controllers/sdk/v2/manifest_controller.rb` | New |
| `app/controllers/sdk/v2/layer_controller.rb` | New |
| `app/controllers/sdk/v2/units_controller.rb` | New |
| `app/controllers/sdk/v2/proxy3d_controller.rb` | New |
| `app/controllers/sdk/v2/favorites_controller.rb` | New |
| `app/services/sdk/pointer_token_service.rb` | New |
| `app/services/sdk/layer_builder_service.rb` | New |
| `app/services/sdk/response_encryptor_service.rb` | New |
| `app/services/sdk/svg_sanitizer_service.rb` | New |
| `app/services/sdk/unit_card_builder_service.rb` | New |
| `app/models/sdk_access_log.rb` | New |
| `app/models/map_partner.rb` | Add `allows_origin?` method |
| `app/services/sdk_payload_builder_service.rb` | Strip `beansApiKey`, `beans3dConfig`, `unit_status`, raw prices |
| `config/routes.rb` | Add `namespace :sdk > namespace :v2` |
| `config/initializers/rack_attack.rb` | New |
| `config/initializers/cors.rb` | Restrict SDK endpoints to allowlisted origins |
| `app/javascript/sdk/index.js` (+ subfiles) | New (v2 SDK source) |
| `public/sdk/map.min.js` | Replace (built output) |
| `Gemfile` | Add `rack-attack` |
| `.env` | Add `BEANS_API_KEY`, `PYN_SESSION_SECRET`, `PYN_PTR_SECRET` |

### `pynwheel-maps` (React)

| File | Action |
|---|---|
| `index.html` | Update SDK script tag to `map.min.js` |
| `src/components/MapView/MapView.jsx` | Remove `getUnits()` call, update `onUnitClick` handler |
| `src/App.jsx` | Remove `sessionId` params from favorites calls, remove localStorage token logic |
| `src/config/env.config.js` | Remove `VITE_PYN_MAP_SDK_URL` (hardcode to CDN) |
| `.env.local` | **Rotate `VITE_PYN_MAP_API_KEY`** — current key is in git history and must be invalidated |

---

## What DevTools Shows After This Architecture

### Before
```
GET /api/partner/maps/fetch_data
Response: {
  "property": { "beans3dConfig": { "beansApiKey": "sk-live-xxxx" } },
  "units": [ { "unitId": 1234, "market_rent": 2500, "unit_status": "Occupied" }, ... ]
}
```

### After
```
POST /sdk/v2/auth
Response: (empty body)
Set-Cookie: __pyn=...; HttpOnly    ← JWT hidden in cookie, unreadable by JS

GET /sdk/v2/manifest
Response: { "map": {...}, "branding": {...}, "filters": {...} }
← no unit data, no prices as numbers, no internal IDs

GET /sdk/v2/layer?floor=1
Response: { "layer": [{"pid":"u_a3f9","color":"#4CAF50","opacity":0.85},...] }
← no unit IDs, no unit names, just colored pointers

GET /sdk/v2/unit/u_a3f9           ← user clicked a unit
Response: { "iv": "dGhpcyBp...", "data": "8K3mN2pL..." }
← AES-256-GCM encrypted, unreadable in DevTools
```

A competitor opening DevTools sees: a cookie they cannot read, a manifest with no sensitive data, colored dot instructions, and encrypted ciphertext for unit details. **There is nothing to scrape.**

---

## One Non-Negotiable Before Starting

The API key `VITE_PYN_MAP_API_KEY` in the `pynwheel-maps` `.env.local` is committed to git history. **Rotate it in the database before starting any other work.** Everything else can be phased in — this one is already leaked.

---

*Last updated: 2026-06-15*
