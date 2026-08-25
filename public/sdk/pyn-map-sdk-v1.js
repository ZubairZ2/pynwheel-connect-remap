(function (global) {

  // ─────────────────────────────────────────────────────────────────────────────
  // PynAnalytics — internal analytics engine (batched, fire-and-forget)
  //
  // Session model:
  //   sdkSessionId  — stable localStorage UUID (user identity / favorites).
  //                   Never rotates. Sent as parent_sdk_session_id in every batch.
  //   sessionId     — short-lived analytics segment UUID. Rotated after 2 min of
  //                   inactivity so idle gaps produce clean separate DB rows.
  //
  // Visibility handling:
  //   tab hidden  → map_session_background (keepalive flush, session stays open)
  //   tab visible → map_session_active     (session continues)
  //   destroy()   → map_session_end        (true close, keepalive flush)
  // ─────────────────────────────────────────────────────────────────────────────
  var PynAnalytics = (function () {

    var IDLE_MS = 2 * 60 * 1000; // 2 minutes

    function create(opts) {
      var s = {
        // Reads the SDK's live session token on every flush, so a silent
        // re-auth is picked up automatically with no token to keep in sync.
        getToken:       opts.getToken,
        // Called when a flush is rejected (401) so the SDK can re-authenticate.
        onUnauthorized: opts.onUnauthorized,
        reauthInFlight: false,
        apiBase:      opts.apiBase,
        productSrc:   opts.productSrc  || 'web',
        partner:      opts.partner     || null,
        sdkVersion:   opts.sdkVersion  || 'v1',
        sdkSessionId: opts.sdkSessionId || null, // stable identity UUID
        sessionId:    _uuid(),                   // current analytics segment UUID
        queue:        [],
        contextSent:  false,
        dead:         false,
        timer:        null,
        idleTimer:    null,
        onHide:       null
      };

      s.timer = setInterval(function () { _flush(s, false); }, 5000);

      s.onHide = function () {
        if (document.visibilityState === 'hidden') {
          // Tab hidden — do not end session. Record background state and flush
          // immediately with keepalive so the event survives mobile tab switches
          // and home-button presses where the page may be frozen/killed.
          s.queue.push({ name: 'map_session_background', type: 'state', ts: Date.now() });
          _flush(s, true);
        } else if (document.visibilityState === 'visible') {
          // Tab returned — resume session and reset the idle timer.
          s.queue.push({ name: 'map_session_active', type: 'state', ts: Date.now() });
          _resetIdle(s);
        }
      };
      document.addEventListener('visibilitychange', s.onHide);

      _resetIdle(s);

      return {
        capture:   function (name, type, metadata) { _capture(s, name, type, metadata); },
        sessionId: function ()                      { return s.sessionId; },
        destroy:   function () {
          if (s.dead) return;
          s.dead = true;
          clearInterval(s.timer);
          clearTimeout(s.idleTimer);
          document.removeEventListener('visibilitychange', s.onHide);
          // True session end — map is being unmounted / closed.
          s.queue.push({ name: 'map_session_end', type: 'state', ts: Date.now() });
          _flush(s, true);
        }
      };
    }

    // Reset the 2-minute idle timer. Called on every captured event and on
    // tab-visible. When the timer fires:
    //   1. Cleanly close the current segment on the server (map_session_end).
    //   2. Rotate to a fresh segment UUID so the next event opens a new DB row.
    function _resetIdle(s) {
      clearTimeout(s.idleTimer);
      s.idleTimer = setTimeout(function () {
        if (s.dead) return;
        // End the current segment cleanly — server sets end_datetime on this UUID.
        s.queue.push({ name: 'map_session_idle', type: 'state', ts: Date.now() });
        s.queue.push({ name: 'map_session_end',  type: 'state', ts: Date.now() });
        _flush(s, false);
        // Rotate segment UUID — next event batch opens a fresh SdkSession row.
        s.sessionId   = _uuid();
        s.contextSent = false; // re-send device context with the new segment
      }, IDLE_MS);
    }

    function _capture(s, name, type, metadata) {
      if (s.dead) return;
      s.queue.push({ name: name, type: type || 'click', metadata: _sanitize(metadata), ts: Date.now() });
      if (s.queue.length >= 20) _flush(s, false);
      _resetIdle(s);
    }

    function _flush(s, beacon) {
      if (s.dead && !beacon) return; // allow final beacon flush when dead
      if (!s.queue.length) return;
      var events = s.queue.splice(0);
      var body   = {
        session_id:            s.sessionId,
        parent_sdk_session_id: s.sdkSessionId,
        product_src:           s.productSrc,
        events:                events
      };
      if (s.partner) body.partner = s.partner;
      if (!s.contextSent) body.device_context = _context(s);
      var url  = s.apiBase + '/api/partner/maps/events';
      var json = JSON.stringify(body);
      // sendBeacon always uses credentials:'include' (spec-mandated) which conflicts
      // with Access-Control-Allow-Origin:* and cannot send Authorization headers.
      // fetch + keepalive:true is the correct replacement for page-unload flushes.
      fetch(url, {
        method:      'POST',
        credentials: 'omit',
        keepalive:   !!beacon,
        headers:     { 'Authorization': 'Bearer ' + s.getToken(), 'Content-Type': 'application/json' },
        body:        json
      }).then(function (res) {
        // Token expired mid-session: trigger a re-auth. Analytics is best-effort,
        // so this batch is dropped — the next flush reads the fresh token via
        // getToken() and succeeds.
        if (res && res.status === 401) { _reauth(s); return; }
        s.contextSent = true;
      }).catch(function () {});
    }

    // Kick off a single re-auth; concurrent flushes share it via reauthInFlight.
    function _reauth(s) {
      if (s.reauthInFlight || !s.onUnauthorized) return;
      s.reauthInFlight = true;
      Promise.resolve(s.onUnauthorized())
        .catch(function () {})
        .then(function () { s.reauthInFlight = false; });
    }

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

    function _sanitize(meta) {
      if (!meta || typeof meta !== 'object') return {};
      var out = {}, n = 0;
      for (var k in meta) {
        if (n >= 15) break;
        if (!/^[a-z_]{1,50}$/.test(k)) continue;
        var v = meta[k];
        if (typeof v === 'string')  { out[k] = v.slice(0, 300); n++; }
        else if (typeof v === 'number' || typeof v === 'boolean') { out[k] = v; n++; }
      }
      return out;
    }

    function _uuid() {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
      });
    }

    return { create: create };
  })();

  const PynMapSDK = {
    // ----------------------------------------------------
    // STATE
    // ----------------------------------------------------
    _initialized: false,
    _sessionToken: null,          // short-lived token; replaces the API key after auth
    _apiKey: null,                // partner API key; kept in the closure-private object only, for silent re-auth
    _propertyId: null,            // property id; paired with _apiKey to re-verify when the token expires
    _reauthPromise: null,         // in-flight re-auth promise; dedupes concurrent 401 recoveries
    _productSrc: "web",           // product source from server response (src URL param); default "web"
    _partner: null,               // partner name from server response (partner URL param)
    _sdkSessionId: null,          // stable UUID persisted in localStorage; identifies this user's favorites session
    _analytics: null,             // PynAnalytics instance; null until auth completes
    _favorites: new Set(),          // Set of favorited unit IDs (strings)
    _favoriteAmenities: new Set(),  // Set of favorited amenity IDs (strings)
    _favoriteFloorplans: new Set(), // Set of favorited floorplan IDs (strings)
    _favoriteGalleryImages: new Set(), // Set of favorited gallery image IDs (strings)
    _galleryListPromise: null,      // in-flight getGalleryList() request
    _galleryListLoaded: false,      // true once fetched, so a property with no galleries is not refetched
    _galleryImagePromises: {},      // { [galleryId]: Promise } — one in-flight request per gallery
    _galleryImagesLoaded: new Set(),// gallery ids already fetched; a Set, not a flag, so a gallery whose
                                    // rows are all unrenderable is not refetched on every reopen
    _neighborhoodPromise: null,     // in-flight getNeighborhood() request; deduplicates concurrent calls
    _neighborhoodLoaded: false,     // true once fetched, so a property with no pins is not refetched forever
    _placesPromises: {},            // { [slug]: Promise } — one in-flight request per category
    _placesLoaded: new Set(),       // slugs already fetched; a Set, not a flag, so an empty
                                    // category is not refetched on every tab switch
    _neighborhoodLimited: false,    // last places request was cut short by the daily Google budget
    config: null,
    container: null,
    activeMapId: null,

    // 3D map state
    _3dMode:        false,
    _3dInitialized: false,
    _beansWidget:   null,
    _beans3dArr:    [],
    _beans3dFloor:  null,
    // 3D hover state — see the 3D HOVER section for how these fit together.
    _3dHoveredUnit:      null,
    _3dHoverOrigin:      null,   // where the hover began, viewport coords
    _3dPointer:          null,   // where the pointer is now, viewport coords
    _3dHoverMoveHandler: null,
    // Fallback only, for units with no polygon to test against: how far the
    // pointer may drift from where the hover began before it counts as having
    // left. Same value the CMS map uses.
    _3D_HOVER_EXIT_RADIUS_PX: 30,
    _3dWrapper:     null,
    _3dToggleBtn:   null,
    _zoomInBtn:     null,
    _zoomOutBtn:    null,
    _resetZoomBtn:  null,

    // Image map state (2D raster image mode, enable_svg_mode === false)
    _imgMapMode:    false,
    _imgActiveMapId: null,   // mapId of the currently-visible floorplate/sitemap

    // INTERNAL: Current map rendering type for analytics (updated on every map type switch)
    _currentMapType: 'svg',   // 'svg' | 'image' | '3d' — kept in sync with _3dMode/_imgMapMode


    // true when the caller explicitly passed styles.unitColors in config;
    // false means "use per-unit colors returned by the API"
    _userHasCustomColors: false,

    _beansPopupObserver: null,   // MutationObserver that suppresses the Esri popup

    // Beans-generated maps: a single static base-map image rendered as a
    // background layer, with the interactive sitemap/floorplate SVGs overlaid.
    _bgMapLayer:    null,        // Beans base-map <img> in the current render
    _zoomWrapper:   null,        // div holding base map + overlay; the panzoom target

    data: {
      property:   null,
      sitemap:    null,
      floorplates: [],
      units:       [],
      floorplans:  [],
      amenities:   [],
      filters:     null,
      gallery:     null,  // gallery config block from the map payload; see getGalleryConfig()
      galleryList: [],    // gallery summaries without images; populated by getGalleryList()
      galleryImages: {},  // { [galleryId]: image[] } — populated per gallery by getGalleryImages()
      neighborhood: [],   // curated pins; populated by getNeighborhood()
      neighborhoodPlaces: {}  // { [slug]: category } — live Google results, per category
    },

    unitsByMap: {},                // { [mapId]: unit[] }
    pointerIdsByMap: {},           // { [mapId]: string[] }
    unitsByPointerIdByMap: {},     // { [mapId]: { [pointerId]: unit } }
    svgCache: {},                  // { [mapId]: SVGElement }
    _svgLoadingPromises: {},       // { [mapId]: Promise } — deduplicates in-flight fetches
    _lastHoverPid: null,           // last hovered pointer id (for debouncing)
    
    defaultStyles: {
      unitColors: {
        available: "#F9D648",
        hover: "#d0a600ff"
      }
    },

    // ----------------------------------------------------
    // INIT
    // ----------------------------------------------------
    init(cfg) {
      if (this._initialized) return;
      this._initialized = true;

      // 1) Base config first — do NOT store the apiKey on this.config
      this.config = {
        container:        cfg.container,
        propertyId:       cfg.propertyId,
        environment:      cfg.environment || "production",
        showZoomControls: cfg.showZoomControls !== false,
        floor:            cfg.defaultFloor != null ? String(cfg.defaultFloor) : null,
        onUnitHover:      typeof cfg.onUnitHover      === "function" ? cfg.onUnitHover      : null,
        onUnitClick:      typeof cfg.onUnitClick      === "function" ? cfg.onUnitClick      : null,
        onAmenityHover:   typeof cfg.onAmenityHover   === "function" ? cfg.onAmenityHover   : null,
        onAmenityClick:   typeof cfg.onAmenityClick   === "function" ? cfg.onAmenityClick   : null,
        onFavoriteChange: typeof cfg.onFavoriteChange === "function" ? cfg.onFavoriteChange : null,
        onReady:          typeof cfg.onReady          === "function" ? cfg.onReady          : null,
        onError:          typeof cfg.onError          === "function" ? cfg.onError          : null,
        enable3DMap:          cfg.enable3DMap          != null ? cfg.enable3DMap          === true : null,
        show3DMap:            cfg.show3DMap            != null ? cfg.show3DMap            === true : null,
        defaultSatelliteView: cfg.defaultSatelliteView != null ? cfg.defaultSatelliteView === true : null,
        // "marketing" (default) or "ops" — controls which server-resolved color is used
        mapType:          cfg.mapType === "ops" ? "ops" : "marketing"
      };

      // Stable session ID persisted in localStorage so favorites survive page reloads.
      const lsKey = `pyn_sdk_session_${cfg.propertyId}`;
      this._sdkSessionId = localStorage.getItem(lsKey) || (() => {
        const id = (typeof crypto !== "undefined" && crypto.randomUUID)
          ? crypto.randomUUID()
          : Math.random().toString(36).slice(2) + Date.now().toString(36);
        localStorage.setItem(lsKey, id);
        return id;
      })();

      // 2) Merge styles safely
      const baseStyles = this.defaultStyles;
      const cfgStyles  = cfg.styles || {};
      this.config.styles = {
        ...baseStyles,
        ...cfgStyles,
        unitColors: { ...baseStyles.unitColors, ...(cfgStyles.unitColors || {}) },
        unitLabels:  { ...baseStyles.unitLabels,  ...(cfgStyles.unitLabels  || {}) }
      };

      // Track whether caller explicitly provided unit fill colors.
      // When false the SDK uses per-unit colors from the API response instead.
      this._userHasCustomColors = !!(cfg.styles?.unitColors);

      this.container = document.querySelector(cfg.container);
      if (!this.container) {
        console.error("PynMapSDK: Container not found:", cfg.container);
        return;
      }

      if (!cfg.apiKey)      return this._showError("API Key is required.");
      if (!cfg.propertyId)  return this._showError("propertyId is required.");

      const apiKey     = cfg.apiKey;
      const propertyId = cfg.propertyId;

      // Retain the credentials on the closure-private internal object (never on
      // the public window.PynMapSDK facade) so the SDK can silently re-verify
      // when a session token expires mid-session — e.g. a kiosk/lobby tab left
      // open past the 1-hour token life.
      this._apiKey     = apiKey;
      this._propertyId = propertyId;

      // Always extract src and partner from URL params early, regardless of token caching.
      // This ensures analytics always knows the source even on page refresh.
      this._productSrc = this._getSrcParam() ? this._normalizeProductSrc(this._getSrcParam()) : "web";
      this._partner = this._getPartnerParam() || null;

      // Start loading pan-zoom immediately — parallel with auth + data fetch.
      const panZoomReady = this._loadPanZoom();

      // Reuse a cached session token when available to skip the partner auth round-trip.
      const cachedTok = this._readCachedToken(propertyId);
      if (cachedTok) {
        this._sessionToken = cachedTok;
        this._startAnalytics();
        this._showLoading("Loading property map...");
      } else {
        this._showLoading("Verifying partner...");
      }

      const doAuth = cachedTok
        ? Promise.resolve({ success: true })
        : this._verifyPartner(apiKey, propertyId).then(v => {
            if (v.success) {
              this._applySession(v.sessionToken);
              this._startAnalytics();
            }
            return v;
          });

      doAuth
        .then(v => {
          if (!v?.success) return this._showError(v?.error || "Partner verification failed.", v?.code);
          return this._fetchConfig();
        })
        .then(r => {
          // A rejected session token must never surface to the user — the map
          // should silently start a fresh session instead. This covers both a
          // warm load with an expired cached token AND a cold load whose
          // freshly-issued token is rejected (e.g. the signing server rotated
          // its secret mid-deploy). Re-authenticate once, then retry the fetch.
          if (!r?.success && r?.error === "Session invalid or expired") {
            return this._reauthenticate().then(token => token ? this._fetchConfig() : r);
          }
          return r;
        })
        .then(r => {
          if (!r?.success) return this._showError(r?.error || "Config load error", r?.code);
          this._storeConfig(r.data);

          if (this._isImageMapMode()) {
            // Image map: no SVG to fetch — just need panzoom ready.
            return Promise.all([this._loadFontAwesome(), panZoomReady]);
          }

          this._showLoading("Loading SVG maps...");
          return Promise.all([this._loadActiveSVG(), panZoomReady]);
        })
        .then(result => {
          if (!result) return;

          if (this._isImageMapMode()) {
            return this._bootImageMap();
          }

          if (!this._hasAnyMap()) return this._showError("No maps found.");

          if (!this._mapExists(this.activeMapId)) {
            this.activeMapId = this._getDefaultMapId();
          }

          const boot = this._bootAfterSVGLoad();
          boot.then(() => this._prefetchRemainingMaps()).catch(() => {});
          return boot;
        })
        .catch((err) => {
          // Log the cause — the generic message alone makes boot failures
          // undiagnosable, especially on mobile where there's no console to open.
          console.error("PynMapSDK: init failed:", err);
          this._showError("Unexpected SDK error.");
        });
    },

    // ----------------------------------------------------
    // BOOT AFTER SVG LOAD
    // ----------------------------------------------------
    async _bootAfterSVGLoad() {
      this._renderMaps();
      this._plotSvgAmenities();
      this._bindUnitEvents();
      this._bindSvgAmenityEvents();

      if (this.config.floor) {
        await this.changeFloor(this.config.floor);
      } else {
        this._highlightAllUnits();
      }

      if (this.config.enable3DMap && this.config.show3DMap) {
        this.switchTo3DMap();
      }

      if (this._analytics) this._captureWithMapType('map_load');
      this.config.onReady?.();
    },

    // ----------------------------------------------------
    // ANALYTICS — PUBLIC + INTERNAL
    // ----------------------------------------------------

    // Return the current map rendering mode: 'svg' (2D SVG), 'image' (2D raster), '3d' (Beans).
    getMapType() {
      if (this._3dMode === true) return '3d';
      if (this._imgMapMode === true) return 'image';
      return 'svg';  // Default when both flags are false
    },

    // Update internal _currentMapType state. Called whenever map rendering type changes.
    _updateCurrentMapType() {
      this._currentMapType = this.getMapType();
    },

    // Internal: capture with map_type automatically injected.
    _captureWithMapType(name, type, metadata) {
      if (!this._analytics) return;
      const enhanced = Object.assign({}, metadata, { map_type: this.getMapType() });
      this._analytics.capture(name, type || 'click', enhanced);
    },

    // Called by React (or any host) to capture events that the SDK cannot
    // intercept internally (filters, CTAs, modal interactions).
    capture(name, type, metadata) {
      this._captureWithMapType(name, type, metadata);
    },

    _startAnalytics() {
      if (this._analytics) return;
      if (!this._sessionToken) return;
      this._analytics = PynAnalytics.create({
        getToken:       () => this._sessionToken,      // always the live token
        onUnauthorized: () => this._reauthenticate(),  // recover on an expired-token flush
        apiBase:      this._apiBase(),
        productSrc:   this._productSrc,
        partner:      this._partner,
        sdkVersion:   'v1',
        sdkSessionId: this._sdkSessionId  // stable localStorage UUID for journey linking
      });
    },

    // ----------------------------------------------------
    // PARTNER API CALLS
    // ----------------------------------------------------

    /**
     * One-time call with X-API-Key.
     * Returns { success, sessionToken } on success.
     * The session token is used for all subsequent calls.
     */
    async _verifyPartner(apiKey, propertyId) {
      try {
        const srcParam = this._getSrcParam() ? `&src=${encodeURIComponent(this._getSrcParam())}` : "";
        const partnerParam = this._getPartnerParam() ? `&partner=${encodeURIComponent(this._getPartnerParam())}` : "";

        const url = `${this._apiBase()}/api/partner/maps/authorized?propertyId=${propertyId}${srcParam}${partnerParam}`;
        const res = await fetch(url, { headers: { "X-API-Key": apiKey } });

        if (!res.ok) {
          // Surface the server-provided message when available (e.g. a 403
          // "This property is not enabled for the partner map.").
          let serverMsg = null;
          try { serverMsg = (await res.json())?.message || null; } catch {}

          if (res.status === 401) return { success: false, code: 401, error: serverMsg || "Invalid API Key" };
          if (res.status === 403) return { success: false, code: 403, error: serverMsg || "This property is not enabled for the partner map." };
          if (res.status === 404) return { success: false, code: 404, error: serverMsg || "Property not found" };
          return { success: false, code: res.status, error: serverMsg || "Partner verification failed" };
        }

        const data = await res.json();
        return { success: true, sessionToken: data.session_token };
      } catch {
        return { success: false, code: null, error: "Network error verifying partner" };
      }
    },

    /**
     * Silently re-verify the partner and swap in a fresh session token.
     * Used to recover from an expired/invalid token WITHOUT any user action —
     * e.g. a kiosk tab left open past the 1-hour token life.
     *
     * Concurrent callers (several runtime requests 401-ing at once) share a
     * single in-flight re-auth via _reauthPromise, so we never fire a burst of
     * duplicate /authorized calls. Resolves to the new token, or null if
     * re-auth is impossible or fails.
     */
    async _reauthenticate() {
      if (this._reauthPromise) return this._reauthPromise;
      if (!this._apiKey || !this._propertyId) return null;

      this._reauthPromise = (async () => {
        const v = await this._verifyPartner(this._apiKey, this._propertyId);
        if (!v.success) return null;
        this._applySession(v.sessionToken);
        return v.sessionToken;
      })();

      try {
        return await this._reauthPromise;
      } finally {
        this._reauthPromise = null;
      }
    },

    /**
     * fetch() wrapper for session-authenticated endpoints that transparently
     * recovers from an expired token. It injects the Authorization header, and
     * on a 401 it re-authenticates once and retries the request a single time
     * with the fresh token. The user never sees an expired-session failure.
     *
     * Callers pass every header EXCEPT Authorization (added here) and handle
     * the returned Response exactly as they would a normal fetch() result.
     */
    async _authorizedFetch(url, options = {}, _retried = false) {
      const opts = Object.assign({}, options);
      opts.headers = Object.assign({}, options.headers, {
        "Authorization": `Bearer ${this._sessionToken}`
      });

      const res = await fetch(url, opts);

      if (res.status === 401 && !_retried) {
        const newToken = await this._reauthenticate();
        // Re-run with the original options so the fresh token is re-injected.
        if (newToken) return this._authorizedFetch(url, options, true);
      }

      return res;
    },

    /**
     * Extract src URL parameter and normalize it.
     * src=touch → "touch", src=mobile → "mobile", src=ipad → "ipad"
     * Returns empty string if not present or invalid.
     */
    _getSrcParam() {
      try {
        const params = new URL(window.location.href).searchParams;
        const src = params.get("src");
        if (!src) return "";
        const normalized = src.toLowerCase().trim();
        const validSrcValues = ["touch", "mobile", "ipad"];
        return validSrcValues.includes(normalized) ? normalized : "";
      } catch {
        return "";
      }
    },

    /**
     * Normalize src param to product_src value for analytics.
     * touch → "touch_map", mobile → "mobile_app", ipad → "ipad_map"
     */
    _normalizeProductSrc(src) {
      if (!src) return "web";
      return src;
    },

    /**
     * Extract partner URL parameter.
     * Returns the partner name (e.g., "rent", "zillow") or empty string if not present.
     */
    _getPartnerParam() {
      try {
        const params = new URL(window.location.href).searchParams;
        const partner = params.get("partner");
        if (!partner) return "";
        const normalized = partner.toLowerCase().trim();
        return /^[a-z0-9_-]+$/.test(normalized) ? normalized : "";
      } catch {
        return "";
      }
    },

    // localStorage token cache — avoids the partner auth round-trip on warm loads.
    // Token is stored for 50 min; the server-side token expires at 60 min.
    _readCachedToken(propertyId) {
      try {
        const key = `pyn_tok_${propertyId}`;
        const tok = localStorage.getItem(key);
        const exp = parseInt(localStorage.getItem(`${key}_exp`) || '0');
        if (tok && Date.now() < exp) return tok;
        if (tok) { localStorage.removeItem(key); localStorage.removeItem(`${key}_exp`); }
      } catch {}
      return null;
    },

    _writeCachedToken(propertyId, token) {
      try {
        const key = `pyn_tok_${propertyId}`;
        localStorage.setItem(key, token);
        localStorage.setItem(`${key}_exp`, String(Date.now() + 50 * 60 * 1000));
      } catch {}
    },

    // Adopt a freshly-issued session token: hold it in memory and persist it to
    // the local cache. The single place session state is updated after auth.
    _applySession(token) {
      this._sessionToken = token;
      this._writeCachedToken(this._propertyId, token);
    },

    /**
     * Fetch map config using the session token (no API key, no propertyId in URL).
     * The backend resolves the property from the token.
     */
    async _fetchConfig() {
      try {
        // unit_grouping=spaces opts THIS SDK in to the student-housing rollup.
        // The server groups only when the property's toggle is on *and* a client
        // asks, so pyn-map-sdk.js (v0), which never sends it and has no concept
        // of a unit space, keeps receiving the flat payload it always did.
        const params = new URLSearchParams({ unit_grouping: "spaces" });
        if (this.config.mapType === "ops") params.set("map_type", "ops");
        const url = `${this._apiBase()}/api/partner/maps/fetch_data?${params}`;
        const res = await fetch(url, {
          headers: {
            "Authorization":    `Bearer ${this._sessionToken}`,
            "X-SDK-Session-Id": this._sdkSessionId
          }
        });

        if (!res.ok) {
          if (res.status === 401) return { success: false, error: "Session invalid or expired" };
          if (res.status === 404) return { success: false, error: "Property not found" };
          return { success: false, error: `Server error (${res.status})` };
        }

        const data = await res.json();
        return { success: true, data };
      } catch {
        return { success: false, error: "Network error loading config" };
      }
    },

    /**
     * Fetch the gallery list without images — names, counts, cover thumbs.
     * Same auth shape and same 404-is-normal handling as the other fetchers.
     */
    async _fetchGalleryList() {
      try {
        const res = await fetch(`${this._apiBase()}/api/partner/maps/fetch_gallery_list`, {
          headers: {
            "Authorization":    `Bearer ${this._sessionToken}`,
            "X-SDK-Session-Id": this._sdkSessionId
          }
        });

        if (!res.ok) return [];

        const data = await res.json();
        return data.galleries || [];
      } catch {
        return [];
      }
    },

    /**
     * Fetch one gallery's images. A 404 means the id is not this property's, or
     * the gallery feature is off — both resolve to an empty list rather than
     * rejecting, same as every other content fetcher here.
     */
    async _fetchGalleryImages(galleryId) {
      try {
        const query = `?gallery_id=${encodeURIComponent(galleryId)}`;
        const res = await fetch(`${this._apiBase()}/api/partner/maps/fetch_gallery_images${query}`, {
          headers: {
            "Authorization":    `Bearer ${this._sessionToken}`,
            "X-SDK-Session-Id": this._sdkSessionId
          }
        });

        if (!res.ok) return [];

        const data = await res.json();
        return data.images || [];
      } catch {
        return [];
      }
    },

    /**
     * Fetch the property's curated neighborhood pins. Same auth shape and same
     * 404-is-normal handling as the other content fetchers.
     */
    async _fetchNeighborhood() {
      try {
        const res = await fetch(`${this._apiBase()}/api/partner/maps/fetch_neighborhood`, {
          headers: {
            "Authorization":    `Bearer ${this._sessionToken}`,
            "X-SDK-Session-Id": this._sdkSessionId
          }
        });

        if (!res.ok) return [];

        const data = await res.json();
        return data.locations || [];
      } catch {
        return [];
      }
    },

    /**
     * Fetch live Google places. Pass a slug for one category, or nothing for
     * every category the property enabled.
     *
     * Resolves to { categories, limited }. `limited` true means the property
     * spent its daily Google budget — the host should keep showing curated
     * pins rather than treating it as an error.
     */
    async _fetchNeighborhoodPlaces(slug) {
      const empty = { categories: [], limited: false };

      try {
        const query = slug ? `?category=${encodeURIComponent(slug)}` : "";
        const res = await fetch(`${this._apiBase()}/api/partner/maps/fetch_neighborhood_places${query}`, {
          headers: {
            "Authorization":    `Bearer ${this._sessionToken}`,
            "X-SDK-Session-Id": this._sdkSessionId
          }
        });

        if (!res.ok) return empty;

        const data = await res.json();
        return { categories: data.categories || [], limited: !!data.limited };
      } catch {
        return empty;
      }
    },

    /**
     * Internal: normalise a category argument so hosts can pass "Dining",
     * "dining" or " Dining " interchangeably. Mirrors the server's slug rules.
     */
    _neighborhoodSlug(category) {
      return String(category || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
    },

    /**
     * Internal: file a fetched category into data.neighborhoodPlaces and mark
     * it loaded, so later reads are served from memory.
     *
     * Photo paths arrive relative, so one server-cached payload stays correct on
     * any environment. They are absolutised here because the host page is
     * normally on a different origin from the API — a relative path would
     * resolve against the partner's own domain and 404. Every other image URL
     * the SDK hands out is absolute; these should be no different.
     */
    _storeNeighborhoodPlaces(categories) {
      const base = this._apiBase();
      const absolutise = (url) => (url && url.charAt(0) === "/" ? base + url : url);

      (categories || []).forEach(category => {
        if (!category || !category.id) return;

        (category.places || []).forEach(place => {
          place.imageUrl = absolutise(place.imageUrl);
          place.thumbUrl = absolutise(place.thumbUrl);
        });

        this.data.neighborhoodPlaces[category.id] = category;
        this._placesLoaded.add(category.id);
      });
    },


    // ----------------------------------------------------
    // MAP DATA STORAGE
    // ----------------------------------------------------
    _storeConfig(data) {
      this.data.property      = data.property      || null;
      this.data.sitemap       = data.sitemap       || null;
      this.data.backgroundSvg = data.backgroundSvg || null;
      this.data.floorplates   = data.floorplates   || [];
      this.data.floorplans  = data.floorplans  || [];
      this.data.units       = data.units       || [];
      this.data.amenities   = data.amenities   || [];
      this.data.filters     = data.filters     || null;
      // Top-level block, not nested under property — see getGalleryConfig().
      this.data.gallery     = data.gallery     || null;

      // Hydrate favorites from the server response. Each item already has
      // isFavorite set by the server; build the local Sets from it.
      // gallery_image is skipped — its collection loads on demand, and
      // getGalleryImages() hydrates it the same way once it arrives.
      ["unit", "amenity", "floorplan"].forEach(type => this._hydrateFavorites(type));

      this._indexUnits();
      this._indexSpaceConfig();
      this._resolve3DConfig();
      this._applyThemeConfig();
    },

    _applyThemeConfig() {
      const theme = this.data.property?.themeConfig;
      if (!theme || !this.container) return;

      const c = theme.colors || {};
      const f = theme.fonts  || {};

      const vars = {
        "--pyn-primary":                   c.primary,
        "--pyn-primary-opacity":           c.primaryOpacity,
        "--pyn-main-font":                 c.mainFont,
        "--pyn-main-font-opacity":         c.mainFontOpacity,
        "--pyn-subtext":                   c.subtext,
        "--pyn-subtext-opacity":           c.subtextOpacity,
        "--pyn-stroke":                    c.strokeOutlines,
        "--pyn-stroke-opacity":            c.strokeOutlinesOpacity,
        "--pyn-light-bg":                  c.lightBackground,
        "--pyn-light-bg-opacity":          c.lightBackgroundOpacity,
        "--pyn-font-family":               f.family,
        "--pyn-base-font-size":            f.baseSize,
        "--pyn-heading-font-size":         f.headingSize
      };

      Object.entries(vars).forEach(([prop, val]) => {
        if (val != null) this.container.style.setProperty(prop, String(val));
      });

      if (c.primary) {
        const hex = c.primary.replace(/^#/, "");
        const r = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);
        const blend = (channel, alpha) => Math.round(channel * alpha + 255 * (1 - alpha)).toString(16).padStart(2, "0");
        this.container.style.setProperty("--pyn-primary-light-10", `#${blend(r, 0.1)}${blend(g, 0.1)}${blend(b, 0.1)}`);
        this.container.style.setProperty("--pyn-primary-light-20", `#${blend(r, 0.2)}${blend(g, 0.2)}${blend(b, 0.2)}`);
      }
    },

    _resolve3DConfig() {
      const cfg3d = this.data.property?.beans3dConfig;
      if (this.config.enable3DMap          === null) this.config.enable3DMap          = cfg3d?.enabled          === true;
      if (this.config.show3DMap            === null) this.config.show3DMap            = cfg3d?.show3dByDefault  === true;
      if (this.config.defaultSatelliteView === null) this.config.defaultSatelliteView = cfg3d?.defaultSatelliteView === true;
    },

    // The position a space does not carry, because it belongs to the door it is
    // drawn on (SdkPayloadBuilderService::SPACE_NEVER_KEYS). getUnitSpaces puts
    // these back so a caller still receives a complete unit.
    _POSITION_KEYS: ["x_plot", "y_plot", "pointerData", "mapId", "floor"],

    // Student housing: floorplans[].spaceConfig carries a finished tab set for the
    // pop-up -- one entry per space letter, each with its own availability count,
    // premium chips, rent and lease dates. Indexed once at load rather than looked
    // up per call, because the modal re-reads it on every tab click.
    //
    // Keyed by floorplanId as a String: the payload's floorplanId is a number and
    // callers routinely hold it as a string from a DOM attribute.
    _indexSpaceConfig() {
      this.spaceConfigByFloorplanId = {};

      // Indexed under both floor-plan id spaces the payload carries:
      //   floorplans[].floorplanId -> our primary key
      //   units[].floorplanId      -> the PMS's own id
      // A caller holding a unit only has the second one, so indexing on the
      // first alone silently resolved nothing.
      (this.data.floorplans || []).forEach(fp => {
        if (!fp || !fp.spaceConfig) return;

        this.spaceConfigByFloorplanId[String(fp.floorplanId)] = fp.spaceConfig;

        const providerId = fp.spaceConfig.providerFloorplanId;
        if (providerId != null && providerId !== "") {
          this.spaceConfigByFloorplanId[String(providerId)] = fp.spaceConfig;
        }
      });
    },

    _indexUnits() {
      this.unitsByMap             = {};
      this.pointerIdsByMap        = {};
      this.unitsByPointerIdByMap  = {};

      // Student housing (property.unitGrouping.mode === "spaces"): data.units
      // holds one unit per plotted position — a door — and the leasable bedrooms
      // ride inside it under `spaces`, each already a whole unit bar the position.
      //
      // The two tables below copy nothing: ids map to ids, and ids map to objects
      // already living in this.data.units. An earlier version eagerly merged
      // every space into a second array, which held the units payload twice in
      // memory for the sake of five position keys.
      this.unitById        = {};   // any unit id -> the door object in data.units
      this.baseIdBySpaceId = {};   // any unit id -> id of the unit actually drawn

      (this.data.units || []).forEach(u => {
        const baseId = String(u.unitId);
        this.unitById[baseId]        = u;
        this.baseIdBySpaceId[baseId] = baseId;

        if (Array.isArray(u.spaces)) {
          u.spaces.forEach(space => {
            const spaceId = String(space.unitId);
            this.unitById[spaceId]        = u;
            this.baseIdBySpaceId[spaceId] = baseId;
          });
        }

        const mapId = String(u.mapId);
        if (!this.unitsByMap[mapId])             this.unitsByMap[mapId]             = [];
        if (!this.pointerIdsByMap[mapId])        this.pointerIdsByMap[mapId]        = [];
        if (!this.unitsByPointerIdByMap[mapId])  this.unitsByPointerIdByMap[mapId]  = {};

        this.unitsByMap[mapId].push(u);

        // Several units can be plotted on one SVG shape. The first one becomes that
        // shape's representative — it owns the fill color, the hover tooltip and the
        // click payload — and its pointer id is registered once, so the shape is not
        // bound and re-filled once per co-plotted unit. Consumers that need the whole
        // co-plotted set resolve it from getUnits() by pointer id, mirroring the old
        // map's setUnitModalButtons.
        const pid = this._unitPid(u);
        if (pid && !this.unitsByPointerIdByMap[mapId][pid]) {
          this.pointerIdsByMap[mapId].push(pid);
          this.unitsByPointerIdByMap[mapId][pid] = u;
        }
      });
    },

    // ----------------------------------------------------
    // SVG LOADING
    // The real storage URL is never sent to the browser.
    // We pass only mapId + mapType; the server resolves the URL.
    // ----------------------------------------------------

    // Loads only the map that will be shown immediately, based on configured
    // floor > server default floor > sitemap > first floorplate.
    async _loadActiveSVG() {
      const floor = this.config.floor ?? this.data.property?.map?.defaultFloor;
      let primaryEntry = null;

      if (floor != null) {
        const fp = this._findFloorplateByFloor(String(floor));
        if (fp) primaryEntry = { mapId: String(fp.mapId), mapType: fp.mapType || "floorplate" };
      }

      if (!primaryEntry && this.data.sitemap) {
        primaryEntry = { mapId: String(this.data.sitemap.mapId), mapType: this.data.sitemap.mapType || "sitemap" };
      }

      if (!primaryEntry && this.data.floorplates.length > 0) {
        const fp = this.data.floorplates[0];
        primaryEntry = { mapId: String(fp.mapId), mapType: fp.mapType || "floorplate" };
      }

      if (primaryEntry) {
        const svg = await this._loadSVGIfNeeded(primaryEntry.mapId, primaryEntry.mapType);
        if (svg) this.svgCache[primaryEntry.mapId] = svg;
      }
    },

    // True when the property uses Beans-generated maps: a single static
    // background image with the interactive (transparent) sitemap/floorplate
    // SVGs overlaid on top.
    _isBeansSvg() {
      return this.data.property?.map?.isBeansSvg === true &&
             !!this.data.backgroundSvg?.imageUrl;
    },

    // Wraps the Beans base map and the interactive overlay in one pan/zoom group,
    // the way the CMS map does it (#zoom-group-wrapper in webpages/_svg_map).
    // Returns the wrapper for the caller to append.
    //
    // The two layers must never be fitted or transformed independently.
    //
    // The overlay stays IN FLOW and the base map is absolute inside the wrapper —
    // the same split the CMS map uses. That is what makes them agree without any
    // ancestor needing a definite height: the in-flow overlay gives the wrapper its
    // height, and the absolute base map resolves height:100% against that same
    // wrapper, so the two boxes are equal by construction. (Making both absolute
    // leaves the wrapper with no in-flow content, so it collapses to zero height on
    // an auto-height container and the map goes blank. Making both in-flow puts the
    // base map back on the container's height, which is the original mobile bug.)
    //
    // Panzoom is attached to the wrapper (see _enablePanZoom), not the SVG, so one
    // transform moves both layers and there is no matrix to mirror. The base map
    // and the floorplate/sitemap SVGs are exported with the same viewBox, so
    // object-fit:contain and preserveAspectRatio="xMidYMid meet" land on exactly
    // the same rect.
    _buildBeansZoomGroup(svgEl) {
      const wrapper = document.createElement("div");
      Object.assign(wrapper.style, {
        position: "relative",
        width: "100%", height: "100%",
        transformOrigin: "0 0"
      });

      const bgLayer = document.createElement("img");
      bgLayer.src = this.data.backgroundSvg.imageUrl;
      bgLayer.alt = "";
      bgLayer.setAttribute("draggable", "false");
      Object.assign(bgLayer.style, {
        position: "absolute",
        top: "0", left: "0",
        width: "100%", height: "100%",
        objectFit: "contain",
        pointerEvents: "none",
        zIndex: "0"
      });

      // In flow, so it sizes the wrapper; positioned only to sit above the base map.
      Object.assign(svgEl.style, {
        position: "relative",
        display: this._3dMode ? "none" : "block",
        width: "100%", height: "100%",
        zIndex: "1"
      });

      wrapper.appendChild(bgLayer);
      wrapper.appendChild(svgEl);

      this._bgMapLayer  = bgLayer;
      this._zoomWrapper = wrapper;
      return wrapper;
    },


    // Deduplicates concurrent fetches for the same map: if a load is already
    // in flight, callers await the same Promise instead of issuing a second request.
    async _loadSVGIfNeeded(mapId, mapType) {
      const id = String(mapId);
      if (this.svgCache[id]) return this.svgCache[id];

      if (!this._svgLoadingPromises[id]) {
        this._svgLoadingPromises[id] = this._loadSVG(id, mapType).then(svg => {
          if (svg) this.svgCache[id] = svg;
          delete this._svgLoadingPromises[id];
          return svg;
        });
      }

      return this._svgLoadingPromises[id];
    },

    // Returns a sessionStorage key versioned by updatedAt so a new SVG upload
    // produces a different key → cache miss → fresh fetch automatically.
    _svgCacheKey(mapId) {
      const id = String(mapId);
      if (this.data.sitemap && String(this.data.sitemap.mapId) === id) {
        return `pyn_svg_${id}_${this.data.sitemap.updatedAt || ''}`;
      }
      const fp = (this.data.floorplates || []).find(f => String(f.mapId) === id);
      return `pyn_svg_${id}_${fp?.updatedAt || ''}`;
    },

    async _loadSVG(mapId, mapType) {
      const cacheKey = this._svgCacheKey(mapId);

      // localStorage persists across tabs and sessions — versioned key ensures
      // a fresh fetch whenever the SVG is updated (updatedAt changes).
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) return this._parseSVG(cached);
      } catch {}

      try {
        const requestUrl =
          `${this._apiBase()}/api/partner/maps/fetch_svg_image` +
          `?map_id=${encodeURIComponent(mapId)}&map_type=${encodeURIComponent(mapType)}`;

        const response = await this._authorizedFetch(requestUrl, {
          cache: 'default'
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch SVG: ${response.status} ${response.statusText}`);
        }

        const svgText    = await response.text();
        const svgElement = this._parseSVG(svgText);

        if (!svgElement) {
          throw new Error("No <svg> element found in the response.");
        }

        // Store in localStorage. Remove any stale entry for this mapId first.
        try {
          const prefix = `pyn_svg_${mapId}_`;
          for (let i = localStorage.length - 1; i >= 0; i--) {
            const k = localStorage.key(i);
            if (k && k !== cacheKey && k.startsWith(prefix)) localStorage.removeItem(k);
          }
          localStorage.setItem(cacheKey, svgText);
        } catch {}

        return svgElement;
      } catch (error) {
        console.error("_loadSVG failed:", error);
        return null;
      }
    },

    // After the active map renders, silently pre-fetch every remaining floorplate
    // and sitemap in parallel so floor switches are instant.
    async _prefetchRemainingMaps() {
      const pending = [];

      if (this.data.sitemap) {
        const id = String(this.data.sitemap.mapId);
        if (!this.svgCache[id]) {
          pending.push({ mapId: id, mapType: this.data.sitemap.mapType || 'sitemap' });
        }
      }

      for (const fp of (this.data.floorplates || [])) {
        const id = String(fp.mapId);
        if (!this.svgCache[id]) {
          pending.push({ mapId: id, mapType: fp.mapType || 'floorplate' });
        }
      }

      await Promise.all(pending.map(async ({ mapId, mapType }) => {
        try {
          const svg = await this._loadSVGIfNeeded(mapId, mapType);
          if (svg) this.svgCache[mapId] = svg;
        } catch {}
      }));
    },

    _parseSVG(svgText) {
      const parser = new DOMParser();
      const doc    = parser.parseFromString(svgText, "image/svg+xml");
      return doc.querySelector("svg");
    },


    // ----------------------------------------------------
    // RENDER MAPS
    // ----------------------------------------------------
    _renderMaps() {
      const c = this.container;

      // Preserve the 3D wrapper element across re-renders so the widget survives
      const saved3d = this._3dWrapper;
      if (saved3d && saved3d.parentNode === c) c.removeChild(saved3d);

      c.innerHTML = "";
      c.style.position = "relative";
      this._bgMapLayer  = null;
      this._zoomWrapper = null;

      if (!this.activeMapId || !this._mapExists(this.activeMapId)) return;

      const svg = this.svgCache[this.activeMapId];
      if (!svg) return;

      const clone = svg.cloneNode(true);
      clone.setAttribute("data-map-id", this.activeMapId);
      // In 3D mode the SVG is hidden. display:none removes it from the touch-event
      // path (iOS Safari ignores pointer-events:none on large SVGs with forced CSS
      // height, e.g. height:100vh). The container height is maintained via a
      // minHeight lock set in switchTo3DMap() before the SVG is hidden.
      clone.style.display        = this._3dMode ? "none"   : "block";
      clone.style.visibility     = this._3dMode ? "hidden" : "visible";
      clone.style.pointerEvents  = this._3dMode ? "none"   : "";

      this._applyGlobalLabelStyles(clone, this.config.styles.unitLabels);

      clone.removeAttribute("width");
      clone.removeAttribute("height");
      clone.setAttribute("preserveAspectRatio", "xMidYMid meet");
      clone.style.width  = "100%";
      clone.style.height = "100%";

      // Beans maps get the base map + overlay wrapped in a single pan/zoom group,
      // mirroring the CMS map's #zoom-group-wrapper. See _buildBeansZoomGroup.
      if (this._isBeansSvg()) {
        const group = this._buildBeansZoomGroup(clone);
        // The group is what 3D mode hides, so it carries the SVG's display state.
        group.style.display = this._3dMode ? "none" : "block";
        c.appendChild(group);
      } else {
        c.appendChild(clone);
      }

      // Restore or create the 3D wrapper
      if (this.config.enable3DMap) {
        if (saved3d) {
          c.appendChild(saved3d);
          this._3dWrapper = saved3d;
        } else {
          const wrapper3d = document.createElement("div");
          Object.assign(wrapper3d.style, {
            position: "absolute",
            top: "0", left: "0", right: "0", bottom: "0",
            display: "none"
          });
          const beansDiv = document.createElement("div");
          beansDiv.id = "pyn-3d-map";
          beansDiv.style.width  = "100%";
          beansDiv.style.height = "100%";
          wrapper3d.appendChild(beansDiv);
          c.appendChild(wrapper3d);
          this._3dWrapper = wrapper3d;
        }
        // Sync 3D wrapper visibility to current mode
        this._3dWrapper.style.display = this._3dMode ? "block" : "none";
      }

      if (this.config.showZoomControls) {
        this._renderZoomControls();
      }

      this._enablePanZoom(clone);
      c.style.overflow   = "hidden";
    },


    // ----------------------------------------------------
    // PAN & ZOOM
    // ----------------------------------------------------
    _loadPanZoom() {
      return new Promise((resolve, reject) => {
        if (window.panzoom) return resolve();

        const s    = document.createElement("script");
        s.src      = "https://cdn.jsdelivr.net/npm/panzoom@9/dist/panzoom.min.js";
        s.async    = true;
        s.onload   = resolve;
        s.onerror  = () => reject("Failed to load panzoom");
        document.head.appendChild(s);
      });
    },

    _enablePanZoom(svgEl) {
      if (!window.panzoom) return;

      if (svgEl._pz) {
        try { svgEl._pz.dispose(); } catch { }
      }

      // Clean up any existing touch-move blocker before attaching a fresh one.
      if (svgEl._pzTouchBlocker) {
        svgEl.removeEventListener("touchmove", svgEl._pzTouchBlocker, true);
        svgEl._pzTouchBlocker = null;
      }

      // touch-action:none on the SVG lets panzoom own all touch gestures.
      // Do NOT set it on the parent container — that would cascade to the overlay
      // buttons (zoom controls, 3D toggle) and block iOS Safari click synthesis.
      svgEl.style.touchAction = "none";

      // Beans maps: drive the wrapper holding *both* layers rather than the SVG,
      // so the base map is moved by the same transform instead of a copied one.
      // panzoom binds its listeners to target.parentElement, which is the
      // container either way, so gesture handling is unchanged.
      const target = this._zoomWrapper && svgEl.parentElement === this._zoomWrapper
        ? this._zoomWrapper
        : svgEl;
      if (target !== svgEl) target.style.touchAction = "none";

      const pz = panzoom(target, {
        minZoom: 1,   // can't zoom below the default view
        maxZoom: 10,
        // Block mouse-drag pan when at default zoom (scale ≤ 1); allow when zoomed in.
        beforeMouseDown: () => (svgEl._pz ? svgEl._pz.getTransform().scale <= 1.01 : true),
      });

      // Everything else reaches the instance through the SVG, so alias it there.
      svgEl._pz  = pz;
      target._pz = pz;

      // Clamp position after every pan/zoom so the map content always covers the container.
      // We must use the *rendered content* bounds from the SVG viewBox, not the SVG element
      // bounds — preserveAspectRatio="xMidYMid meet" letterboxes the content inside the
      // element, so at scale=2 with tx=0 there can be blank SVG background at the top/bottom.
      let _svgClamping = false;
      const svgClamp = () => {
        if (_svgClamping) return;
        const pz = svgEl._pz;
        if (!pz) return;
        const t  = pz.getTransform();
        const pr = svgEl.parentElement;
        if (!pr) return;
        const cw = pr.clientWidth;
        const ch = pr.clientHeight;

        // Snap to default when back at base zoom.
        if (t.scale <= 1.01) {
          if (Math.abs(t.x) > 0.5 || Math.abs(t.y) > 0.5) {
            _svgClamping = true;
            pz.moveTo(0, 0);
            _svgClamping = false;
          }
          return;
        }

        // Compute rendered content rect inside the SVG element.
        // SVG preserveAspectRatio="xMidYMid meet" scales content to fit while preserving
        // aspect ratio, centering it — the blank margins are NOT part of the map.
        let cofX = 0, cofY = 0, cfW = cw, cfH = ch;
        const vb = svgEl.viewBox && svgEl.viewBox.baseVal;
        if (vb && vb.width > 0 && vb.height > 0) {
          const rs = Math.min(cw / vb.width, ch / vb.height);
          cfW  = vb.width  * rs;
          cfH  = vb.height * rs;
          cofX = (cw - cfW) / 2;
          cofY = (ch - cfH) / 2;
        }

        // After panzoom matrix(s,0,0,s,tx,ty) the content occupies
        //   x: [s*cofX + tx ,  s*(cofX+cfW) + tx]
        //   y: [s*cofY + ty ,  s*(cofY+cfH) + ty]
        // Clamp so content always covers [0,cw]×[0,ch].
        const maxX = -t.scale * cofX;
        const minX =  cw - t.scale * (cofX + cfW);
        const maxY = -t.scale * cofY;
        const minY =  ch - t.scale * (cofY + cfH);

        const x = minX > maxX ? (minX + maxX) / 2 : Math.min(maxX, Math.max(minX, t.x));
        const y = minY > maxY ? (minY + maxY) / 2 : Math.min(maxY, Math.max(minY, t.y));

        if (Math.abs(x - t.x) > 0.5 || Math.abs(y - t.y) > 0.5) {
          _svgClamping = true;
          pz.moveTo(x, y);
          _svgClamping = false;
        }
      };
      // svgEl._pz.on("pan",  svgClamp);
      svgEl._pz.on("zoom", svgClamp);

      // Block single-finger touch pan when at default zoom; let two-finger pinch-zoom through.
      const touchBlocker = (e) => {
        const scale = svgEl._pz ? svgEl._pz.getTransform().scale : 1;
        if (scale <= 1.01 && e.touches.length === 1) {
          e.stopImmediatePropagation();
        }
      };
      svgEl.addEventListener("touchmove", touchBlocker, { capture: true, passive: false });
      svgEl._pzTouchBlocker = touchBlocker;

      // Defer so the browser finishes layout before we read clientWidth/Height
      setTimeout(() => this._centerSvg(svgEl), 0);
    },

    _centerSvg(svgEl) {
      const pz = svgEl && svgEl._pz;
      if (!pz) return;
      // The SVG is width:100% height:100% with preserveAspectRatio="xMidYMid meet",
      // so the SVG renderer already fits and centers the content. Panzoom just needs
      // to sit at scale=1, translate=(0,0) — any other value shrinks the element
      // below its container and exposes the background.
      pz.zoomAbs(0, 0, 1);
      pz.moveTo(0, 0);
    },

    // ----------------------------------------------------
    // FLOORS (PUBLIC API)
    // ----------------------------------------------------

    /**
     * Returns a sorted array of floor objects derived from units.
     * Each object: { floor: Number, mapId: String, name: String }
     * `name` is what the floor should be labelled as: the floorplate's CMS
     * floor name when one was entered, otherwise the floor number.
     * Use with changeFloor(floor) or changeMap(mapId).
     */
    getFloors() {
      const seen = new Map(); // floor → floorplate mapId

      // Floors are derived EXCLUSIVELY from floorplate ranges, mirroring the old
      // map's `@floorplates.map { |f| f.floors }`. Units are never a source of
      // truth for floors — a unit with a stray/blank/unplotted floor (which
      // coerces to 0) must not conjure a phantom entry the property doesn't have.
      //
      // A range mirrors Floorplate#floors: a leading "-" single ("-1"), a span
      // ("1-5"), a comma list ("1,3,5"), or a single floor ("3").
      const floorsForRange = (raw) => {
        const range = String(raw == null ? "" : raw).trim();
        if (!range) return [];
        const out = [];
        if (range[0] === "-") {
          out.push(parseInt(range, 10));
        } else if (range.includes("-")) {
          let [min, max] = range.split("-").map(s => parseInt(s, 10));
          if (!isNaN(min) && !isNaN(max)) {
            if (min > max) [min, max] = [max, min];
            for (let f = min; f <= max; f++) out.push(f);
          }
        } else if (range.includes(",")) {
          range.split(",").forEach(s => {
            const f = parseInt(s, 10);
            if (!isNaN(f)) out.push(f);
          });
        } else {
          const f = parseInt(range, 10);
          if (!isNaN(f)) out.push(f);
        }
        return out;
      };

      const floorplateByMapId = new Map();

      (this.data.floorplates || []).forEach(fp => {
        const mapId = fp.mapId != null ? String(fp.mapId) : null;
        if (mapId != null) floorplateByMapId.set(mapId, fp);
        // First floorplate to declare a floor owns it.
        floorsForRange(fp.range).forEach(f => {
          if (!seen.has(f)) seen.set(f, mapId);
        });
      });

      // Floor labels come from the floorplate the floor resolves to, mirroring the
      // old map: the CMS floor name only wins when the "Add floor name" toggle is on
      // AND a name was actually entered; otherwise the floor number is the label.
      return [...seen.entries()]
        .sort(([a], [b]) => a - b)
        .map(([floor, mapId]) => {
          const fp        = mapId != null ? floorplateByMapId.get(String(mapId)) : null;
          const floorName = String(fp && fp.floorName != null ? fp.floorName : "").trim();
          const name      = (fp && fp.floorNameAdded && floorName) ? floorName : String(floor);
          return { floor, mapId, name };
        });
    },

    /**
     * Returns all floorplans for the property.
     * Each object: { floorplanId, name, bedrooms, bathrooms, market_rent, square_feet,
     *                description, availability_url, primaryImage, secondaryImage }
     */
    getFloorplans() {
      return (this.data.floorplans || []).slice();
    },

    /**
     * Returns all community amenities for the property.
     * Each object: { amenityId, name, description, amenityType, image, directionalText,
     *                additionalImages, additionalButtons }
     * additionalButtons carries the CMS "Video Link" / "Video Link Button Label" pair as
     * [{ label, url, openInNewTab }] — the same shape units and floorplans use — and is
     * an empty array when the amenity has no tour link.
     */
    getAmenities() {
      return (this.data.amenities || []).slice();
    },

    /**
     * Returns all units for the property.
     * Pass an optional filters object to narrow results:
     *
     *   // Existing filters
     *   floor        {number|string}  — exact floor match
     *   mapId        {number|string}  — exact map match
     *   floorplanId  {number|string}  — exact floorplan match
     *   bedrooms     {number|string}  — exact bedroom count ("0" = Studio)
     *   bathrooms    {number|string}  — exact bathroom count
     *   available    {boolean}        — unit availability flag
     *
     *   // Filters matching getFiltersData() option values
     *   availability   {string}  — window value from getFiltersData().availability
     *                              e.g. "now" | "0-30" | "31-60" | "61-90" | "91-120" | "121+"
     *   minPrice       {number}  — keep units with market_rent >= this value
     *   maxPrice       {number}  — keep units with market_rent <= this value
     *   minSquareFeet  {number}  — keep units with square_feet >= this value
     *   maxSquareFeet  {number}  — keep units with square_feet <= this value
     *
     * Example — build a filter UI from getFiltersData() then apply it:
     *   const units = PynMapSDK.getUnits({
     *     bedrooms:      "2",
     *     availability:  "0-30",
     *     minPrice:      800,
     *     maxPrice:      1200,
     *     minSquareFeet: 600,
     *     maxSquareFeet: 1000
     *   });
     *
     * On a grouped (student-housing) property each entry is one plotted position
     * standing for a whole apartment. Pass `{ includeSpaces: true }` as the
     * second argument to get every leasable bedroom instead:
     *   const beds = PynMapSDK.getUnits({ bedrooms: "4" }, { includeSpaces: true });
     */
    getUnits(filters, options) {
      let units = (this.data.units || []).slice();

      if (filters) {
        // On a grouped property a base unit stands for a whole apartment, so it
        // passes when ANY of its bedrooms would. The server precomputes that as
        // rollup fields (priceMin/priceMax, availabilityBuckets, …), so this
        // stays one comparison per position instead of a walk over every bed.
        if (filters.floor         != null) units = units.filter(u => String(u.floor)        === String(filters.floor));
        if (filters.mapId         != null) units = units.filter(u => String(u.mapId)        === String(filters.mapId));
        if (filters.floorplanId   != null) units = units.filter(u => String(u.floorplanId)  === String(filters.floorplanId));
        if (filters.bedrooms      != null) units = units.filter(u => String(u.bedrooms)     === String(filters.bedrooms));
        if (filters.bathrooms     != null) units = units.filter(u => String(u.bathrooms)    === String(filters.bathrooms));
        if (filters.available     != null) units = units.filter(u => u.available            === filters.available);
        if (filters.availability  != null) units = units.filter(u => this._unitMatchesAvailability(u, filters.availability));
        if (filters.minPrice      != null) units = units.filter(u => parseInt(this._unitPriceMax(u),  10) >= filters.minPrice);
        if (filters.maxPrice      != null) units = units.filter(u => parseInt(this._unitPriceMin(u),  10) <= filters.maxPrice);
        if (filters.minSquareFeet != null) units = units.filter(u => parseInt(this._unitSqftMax(u),   10) >= filters.minSquareFeet);
        if (filters.maxSquareFeet != null) units = units.filter(u => parseInt(this._unitSqftMin(u),   10) <= filters.maxSquareFeet);
      }

      // The map draws doors; a units list sells beds. Opt in to expand each
      // matching position into its individual bedrooms — complete unit objects,
      // ready to render through the same card a flat payload feeds.
      if (options && options.includeSpaces) {
        return units.reduce((out, u) => out.concat(this._spacesOrSelf(u)), []);
      }

      return units;
    },

    // Price and square-footage bounds for a unit. On a grouped property these are
    // the apartment's range, so a band that exists on a single bedroom still
    // matches; on a flat one they collapse to the unit's own single value.
    _unitPriceMin(u) { return u.priceMin != null ? u.priceMin : u.market_rent; },
    _unitPriceMax(u) { return u.priceMax != null ? u.priceMax : u.market_rent; },
    _unitSqftMin(u)  { return u.sqftMin  != null ? u.sqftMin  : u.square_feet; },
    _unitSqftMax(u)  { return u.sqftMax  != null ? u.sqftMax  : u.square_feet; },

    /**
     * True when `units` is rolled up by plotted position — one entry per door,
     * each carrying its leasable bedrooms under `spaces`. Student housing today.
     *
     * Branch on this rather than on any student-housing flag: it describes the
     * shape you have to read, so a conventional property that opts into the same
     * rollup later needs no second code path.
     */
    isGroupedProperty() {
      return this.data?.property?.unitGrouping?.mode === "spaces";
    },

    /**
     * The leasable bedrooms inside a unit, as complete unit objects, ordered by
     * marketing name the way the map's modal lists them.
     *
     * Accepts a base unit id or any space id, so a caller holding the bedroom a
     * visitor clicked gets the same group as one holding the door. Returns an
     * empty array for a conventional unit or an apartment with a single bedroom,
     * so callers can render a switcher on a plain truthy check.
     */
    getUnitSpaces(unitId) {
      const door   = this.getBaseUnit(unitId);
      const spaces = door && Array.isArray(door.spaces) ? door.spaces : null;
      if (!spaces) return [];

      // No network call and no second copy of the payload: the bedrooms are
      // already in `door.spaces`, whole but for the position they share with the
      // door. That position is put back here, on demand, for the one apartment
      // being asked about.
      const position = {};
      this._POSITION_KEYS.forEach(key => { position[key] = door[key]; });

      return spaces.map(space => Object.assign({}, space, position));
    },

    /**
     * The unit actually drawn on the map for the given id — itself for a
     * conventional unit, the door for a bedroom id.
     *
     * Anything that has to reach the map from an id that came back from outside
     * the SDK (a deep link, a saved favorite, an analytics event) goes through
     * here; a bedroom has no position of its own and would resolve to nothing.
     */
    getBaseUnit(unitId) {
      if (unitId == null) return null;
      return this.unitById?.[String(unitId)] || null;
    },

    /**
     * The space-letter tab set for a floor plan, or null when it has none.
     *
     * Each entry is a whole tab, already computed server-side:
     *   { letter, availableCount, totalCount, isPremium, premiumAmenities,
     *     rent, leaseStartDate, leaseEndDate, academicYear, applyUrl,
     *     representativeUnitId }
     *
     * Entries are objects so new fields can be added without a client release --
     * read the keys you know and ignore the rest.
     *
     * `representativeUnitId` may be null when every unit of that letter is leased
     * or hidden, so the payload carries none of them. The tab is still renderable;
     * it just has no unit to act on, and applyUrl falls back to the floor plan's.
     */
    getFloorplanSpaceConfig(floorplanId) {
      if (floorplanId == null) return null;
      return this.spaceConfigByFloorplanId?.[String(floorplanId)] || null;
    },

    /** Just the letters, e.g. ["A","B","C","D"]. Empty when there is no tab set. */
    getSpaceLetters(floorplanId) {
      const config = this.getFloorplanSpaceConfig(floorplanId);
      return config ? config.letters.map(entry => entry.letter) : [];
    },

    /**
     * Whether this property has any floor-plan tab set at all.
     *
     * The signal to route on: a host branches on the shape it has to render, never
     * on a vertical or a PMS. Distinct from isGroupedProperty(), which answers a
     * different question -- how to parse units[]. They are both true on a student
     * property today, and they diverge when the feed named no letters: the payload
     * is still rolled up, but there is no tab set, and the host falls back to its
     * ordinary unit detail view.
     */
    hasSpaceConfig() {
      return Object.keys(this.spaceConfigByFloorplanId || {}).length > 0;
    },

    /**
     * Returns true when a unit's available_date falls inside the given
     * availability window value (same ranges as getFiltersData().availability).
     */
    _unitMatchesAvailability(unit, value) {
      if (!unit.available) return false;

      const today = new Date(); today.setHours(0, 0, 0, 0);
      const date  = unit.available_date ? new Date(unit.available_date) : new Date(0);
      const d30   = new Date(today); d30.setDate(today.getDate() + 30);
      const d60   = new Date(today); d60.setDate(today.getDate() + 60);
      const d90   = new Date(today); d90.setDate(today.getDate() + 90);
      const d120  = new Date(today); d120.setDate(today.getDate() + 120);

      switch (value) {
        case "now":    return date <= today;
        case "0-30":   return date > today  && date <= d30;
        case "31-60":  return date >= d30   && date <= d60;
        case "61-90":  return date >= d60   && date <= d90;
        case "91-120": return date >= d90   && date <= d120;
        case "121+":   return date > d120;
        default:       return false;
      }
    },

    // The unit drawn on the active map for an id that may be a unit id, a
    // bedroom id from a grouped property, or a raw SVG pointer id.
    //
    // The bedroom case is why this exists: a space carries no plot data, so an id
    // arriving from outside the SDK — a deep link, a saved favorite, an analytics
    // event — would match nothing on the map without being resolved to its base
    // unit first.
    _findUnitOnActiveMap(unitId) {
      const id     = String(unitId);
      const baseId = this.baseIdBySpaceId?.[id] ?? id;
      const units  = this.unitsByMap[this.activeMapId] || [];

      return units.find(u =>
        String(u.unitId) === baseId ||
        String(u.id)     === baseId ||
        this._unitPid(u) === id
      );
    },

    // Ids as the map knows them: every bedroom id replaced by the id of the door
    // it is drawn on, de-duplicated so one apartment is painted once.
    _toBaseIds(ids) {
      const seen = new Set();
      ids.forEach(id => seen.add(this.baseIdBySpaceId?.[String(id)] ?? String(id)));
      return [...seen];
    },

    // ----------------------------------------------------
    // MANUAL SELECT / UNSELECT (PUBLIC API)
    // ----------------------------------------------------
    selectUnit(unitId, colorCode) {
      const activeSvg = this._getActiveSvg();
      if (!activeSvg) return;

      const unit = this._findUnitOnActiveMap(unitId);

      const pid = this._unitPid(unit);
      if (!pid) return;

      const sel = this._pointerSelector(unit.pointerData);
      if (!sel) return;
      const el  = activeSvg.querySelector(sel);
      if (!el) return;

      const styles    = this.config?.styles || this.defaultStyles;
      const fillColor = colorCode || styles.unitColors.hover || styles.unitColors.available;

      this._applyFill(el, fillColor);

      const root = el.closest("g") || el;
      root.classList.add("pyn-highlight");
    },

    unselectUnit(unitId) {
      const activeSvg = this._getActiveSvg();
      if (!activeSvg) return;

      const unit = this._findUnitOnActiveMap(unitId);

      const pid = this._unitPid(unit);
      if (!pid) return;

      const sel = this._pointerSelector(unit.pointerData);
      if (!sel) return;
      const el  = activeSvg.querySelector(sel);
      if (!el) return;

      this._applyFill(el, this._unitColor(unit));
    },

    zoomIn() {
      if (this._analytics) this._captureWithMapType('zoom_in');
      if (this._imgMapMode) {
        const w = this._getActiveImageWrapper();
        if (!w || !w._pz) return;
        const r = w.parentElement ? w.parentElement.getBoundingClientRect() : w.getBoundingClientRect();
        w._pz.smoothZoom(r.width / 2, r.height / 2, 1.25);
        return;
      }
      const svg = this._getActiveSvg();
      if (!svg || !svg._pz) return;
      const r = svg.parentElement ? svg.parentElement.getBoundingClientRect() : svg.getBoundingClientRect();
      svg._pz.smoothZoom(r.width / 2, r.height / 2, 1.25);
    },

    zoomOut() {
      if (this._analytics) this._captureWithMapType('zoom_out');
      if (this._imgMapMode) {
        const w = this._getActiveImageWrapper();
        if (!w || !w._pz) return;
        const r = w.parentElement ? w.parentElement.getBoundingClientRect() : w.getBoundingClientRect();
        w._pz.smoothZoom(r.width / 2, r.height / 2, 1 / 1.25);
        return;
      }
      const svg = this._getActiveSvg();
      if (!svg || !svg._pz) return;
      const r = svg.parentElement ? svg.parentElement.getBoundingClientRect() : svg.getBoundingClientRect();
      svg._pz.smoothZoom(r.width / 2, r.height / 2, 1 / 1.25);
    },

    resetZoom() {
      if (this._analytics) this._captureWithMapType('zoom_refresh');
      if (this._imgMapMode) {
        const w = this._getActiveImageWrapper();
        if (!w || !w._pz) return;
        w._pz.zoomAbs(0, 0, 1);
        w._pz.moveTo(0, 0);
        return;
      }
      const svg = this._getActiveSvg();
      if (!svg || !svg._pz) return;
      this._centerSvg(svg);
    },

    /**
     * No-op — kept for API compatibility.
     * Pan is now automatically enabled when the map is zoomed in (scale > 1)
     * and disabled at the default zoom level, with no external toggle needed.
     */
    setExpandedMode(_expanded) {},

    // ----------------------------------------------------
    // 3D MAP — PUBLIC API
    // ----------------------------------------------------

    /**
     * Switch to 3D map view (Beans.ai).
     * Hides the SVG map, shows the 3D widget.
     * Loads Beans.ai libraries on first call.
     * No-op if enable3DMap was not set in config.
     */
    async switchTo3DMap() {
      if (!this.config.enable3DMap) return;
      if (this._3dMode) return;

      this._3dMode = true;
      this._updateCurrentMapType();
      if (this._analytics) this._captureWithMapType('map_3d');

      // Inject style to hide ESRI attribution/presentation widgets in 3D mode
      if (!document.getElementById("pyn-esri-hide-style")) {
        const s = document.createElement("style");
        s.id = "pyn-esri-hide-style";
        s.textContent =
          "div.esri-ui-inner-container.esri-ui-manual-container>div.esri-component[role='presentation']," +
          "div.esri-ui-inner-container.esri-ui-manual-container>div.esri-component.esri-attribution.esri-widget{display:none!important}";
        document.head.appendChild(s);
      }

      // Hide SVG and show 3D wrapper.
      // We use display:none (not just visibility:hidden) because iOS Safari does not
      // reliably honour pointer-events:none on SVG elements when external CSS forces
      // a large intrinsic size (e.g. height:100vh !important). display:none removes
      // the SVG from the touch-event path entirely. We lock the container's minHeight
      // first so it doesn't collapse after the SVG leaves the layout flow.
      const activeSvg = this._getActiveSvg();
      if (activeSvg) {
        if (!this.container.style.minHeight) {
          const h = this.container.offsetHeight;
          if (h > 0) this.container.style.minHeight = h + "px";
        }
        activeSvg.style.display       = "none";
        activeSvg.style.visibility    = "hidden";
        activeSvg.style.pointerEvents = "none";
        // Dispose panzoom entirely so all its event listeners (including touchstart
        // handlers that call preventDefault()) are removed. pause() alone is not
        // reliable — some panzoom@9 builds call preventDefault() before the paused
        // check, which silently blocks click events on Beans 3D widget buttons.
        if (activeSvg._pz) { activeSvg._pz.dispose(); activeSvg._pz = null; }
        if (activeSvg._pzTouchBlocker) {
          activeSvg.removeEventListener("touchmove", activeSvg._pzTouchBlocker, true);
          activeSvg._pzTouchBlocker = null;
        }
      }
      // On Beans maps the base map is a sibling of the SVG inside the pan/zoom
      // group, so the whole group has to go — hiding the SVG alone would leave the
      // base map floating behind the 3D widget.
      if (this._zoomWrapper) this._zoomWrapper.style.display = "none";
      if (this._3dWrapper) this._3dWrapper.style.display = "block";

      // Update toggle button label and hide zoom controls (irrelevant in 3D)
      if (this._3dToggleBtn)  this._3dToggleBtn.innerText = "2D";
      if (this._zoomInBtn)    this._zoomInBtn.style.display   = "none";
      if (this._zoomOutBtn)   this._zoomOutBtn.style.display  = "none";
      if (this._resetZoomBtn) this._resetZoomBtn.style.display = "none";

      if (!this._3dInitialized) {
        await this._init3DMap();
      }
    },

    /**
     * Switch back to the 2D SVG map.
     * Reapplies any active floor filter.
     */
    switchTo2DMap() {
      if (!this._3dMode) return;
      // Drop any hover before the mode flag flips, so the consumer is told the
      // tooltip is gone and does not keep a 3D unit hovered on the 2D map.
      this._clear3DHover();
      this._3dMode = false;
      this._updateCurrentMapType();
      if (this._analytics) this._captureWithMapType('map_2d');

      // Remove ESRI hide style when leaving 3D mode
      const esriStyle = document.getElementById("pyn-esri-hide-style");
      if (esriStyle) esriStyle.remove();

      // Restore SVG visibility, hide 3D wrapper
      const activeSvg = this._getActiveSvg();
      if (activeSvg) {
        // "block", not "" — the UA default for <svg> is inline, which would stop it
        // sizing the Beans pan/zoom wrapper and collapse the map to zero height.
        activeSvg.style.display       = "block";
        activeSvg.style.visibility    = "visible";
        activeSvg.style.pointerEvents = "";
        // Release the container minHeight lock set when entering 3D mode.
        if (this.container.style.minHeight) this.container.style.minHeight = "";
        // Re-init panzoom (was disposed when entering 3D mode).
        if (!activeSvg._pz) this._enablePanZoom(activeSvg);
      }
      if (this._zoomWrapper) this._zoomWrapper.style.display = "block";
      if (this._3dWrapper) this._3dWrapper.style.display = "none";

      // Update toggle button label and restore zoom controls
      if (this._3dToggleBtn)  this._3dToggleBtn.innerText = "3D";
      if (this._zoomInBtn)    this._zoomInBtn.style.display    = "flex";
      if (this._zoomOutBtn)   this._zoomOutBtn.style.display   = "flex";
      if (this._resetZoomBtn) this._resetZoomBtn.style.display = "flex";
    },

    // ----------------------------------------------------
    // 3D MAP — INTERNAL
    // ----------------------------------------------------

    async _init3DMap() {
      // Rendering a second BeansMap into the same div leaves the first engine's
      // controls in the DOM but bound to an orphaned view — they look fine and do
      // nothing. Mirrors the `if (beansWidget) return` guard in beans3dHandler.js.
      if (this._beansWidget) return;

      const cfg3d = this.data.property?.beans3dConfig;
      if (!cfg3d?.enabled || !cfg3d?.beansApiKey) {
        console.warn("PynMapSDK: 3D map not configured for this property.");
        this.switchTo2DMap();
        return;
      }

      await this._load3DLibraries();

      if (typeof BeansMap === "undefined") {
        console.error("PynMapSDK: BeansMap library failed to load.");
        this.switchTo2DMap();
        return;
      }

      this._beans3dArr = this._buildBeans3dArr(this.data.units || [], cfg3d.mapConfig);

      this._beansWidget = new BeansMap();

      const satelliteView  = this.config.defaultSatelliteView != null ? this.config.defaultSatelliteView : cfg3d.defaultSatelliteView;
      const initialMap     = satelliteView ? "SATELLITE" : "3D";
      const allIndices     = this._beans3dArr.map((_, i) => i);
      const displayOptions = this._beans3dDisplayOptions(allIndices, initialMap, cfg3d);

      this._beansWidget.render(
        "pyn-3d-map",
        cfg3d.beansApiKey,
        this._beans3dArr,
        { userLocation: "MANUAL", hideNavigateButton: false, hideMyLocationButton: false },
        displayOptions,
        {
          onSelect: (data) => {
            this._hideBeansEsriPopup();
            if (data?.type !== "UNIT") return;
            const unit = this.getBaseUnit(data.unitId);
            if (unit) {
              if (this._analytics) this._captureWithMapType('unit_marker', 'click', { viewed_unit_id: String(unit.unitId ?? unit.id) });
              if (this.config.onUnitClick) this.config.onUnitClick(unit);
            }
          },
          onHover: (data) => {
            this._hideBeansEsriPopup();
            if (data?.type !== "UNIT") return;
            const unit = this.getBaseUnit(data.unitId);
            if (unit) this._on3DUnitHover(unit);
          }
        }
      );

      this._3dInitialized = true;

      // render() creates the provider engine synchronously, so claim it now even
      // though its mapView is still geocoding. Mirrors beans3dHandler.js, which
      // assigns workingInstance at the end of init rather than only on ready.
      this._beansWidget.workingInstance = this._beansWorkingInstance();

      // Bound here rather than inside the engine-ready poll below: if that poll
      // never resolves, hover exits must still work.
      this._bind3DHoverTracker();

      // Wait for the Beans map engine to be fully ready (mirrors beans3DHandler.js)
      const waitForEngine = setInterval(() => {
        const inst = this._beansWorkingInstance();
        if (inst?.mapView?.ready) {
          clearInterval(waitForEngine);
          this._beansWidget.workingInstance = inst;

          // Inject a permanent CSS rule to suppress Esri's built-in popup for the
          // lifetime of the page. This is the SDK equivalent of the CMS's global
          // .hidden { display: none !important } + $beansMarkerPopover.addClass("hidden")
          this._injectBeansPopupSuppressor();

          // Also watch for the popup being re-inserted by Esri after re-renders
          this._observeBeansEsriPopup();

          const container = inst.mapView?.container;
          if (container) {
            // Leaving the map is an unambiguous end to any hover.
            container.addEventListener("mouseleave", () => {
              this._hideBeansEsriPopup();
              this._clear3DHover();
            });
          }

          // ArcGIS SDK sets touch-action:none on its view container, which cascades
          // to all Beans UI buttons (satellite, shadow, etc.) and blocks iOS Safari
          // from synthesizing click events from touch sequences. Fix: listen for
          // touchend on the Beans container and manually fire .click() for taps on
          // Beans UI controls (not on the ESRI map canvas itself).
          this._bindBeansContainerTouch();

          // A floor picked while the engine was still geocoding only reaches the
          // map here — redrawing before mapView.ready renders against a view that
          // has no camera yet.
          if (this._beans3dFloor != null) {
            this._update3DFilter(this._beans3dIndicesForFloor(this._beans3dFloor));
          }
        }
      }, 300);
    },

    /** Returns the active map engine instance (esri / mapbox / google / banvas). */
    _beansWorkingInstance() {
      const w = this._beansWidget;
      if (!w) return null;
      return w.esriObj || w.mapboxObj || w.googleObj || w.banvasObj || null;
    },

    // Touch-tap synthesizer for Beans 3D UI controls.
    // ArcGIS sets touch-action:none on its view container after mount, which
    // cascades to sibling Beans UI elements (satellite button, shadow toggle, etc.)
    // and prevents the browser from synthesizing click events from touch taps.
    // We intercept touchend on the Beans container and manually dispatch .click()
    // for any tap that lands outside the ArcGIS canvas (so 3D navigation is unaffected).
    _bindBeansContainerTouch() {
      const el = document.getElementById("pyn-3d-map");
      if (!el || el._pynTouchBound) return;
      el._pynTouchBound = true;

      let _t = null;
      el.addEventListener("touchstart", e => {
        if (e.touches.length !== 1) { _t = null; return; }
        const t = e.touches[0];
        _t = { x: t.clientX, y: t.clientY, time: Date.now(), target: t.target };
      }, { passive: true });

      el.addEventListener("touchend", e => {
        if (!_t) return;
        const ch = e.changedTouches[0];
        const dx = ch.clientX - _t.x;
        const dy = ch.clientY - _t.y;
        const wasTap = (dx * dx + dy * dy) < 100 && (Date.now() - _t.time) < 300;
        const target = _t.target;
        _t = null;
        if (!wasTap) return;
        // Don't intercept taps on the 3D camera surface — those are for navigation.
        // esri-view-surface is the actual WebGL canvas layer; esri-ui contains the
        // Daylight panel, buttons, checkboxes etc. which DO need click synthesis.
        if (target.closest(".esri-view-surface, canvas")) return;
        // For all other Beans UI controls, prevent browser double-click and fire manually.
        e.preventDefault();
        target.click();
      }, { passive: false });
    },

    /**
     * Immediately hide any Esri popup Beans has rendered.
     * Uses display:none directly — the SDK has no global .hidden CSS class
     * unlike the CMS which defines .hidden { display:none !important }.
     */
    _hideBeansEsriPopup() {
      const sel = 'div.esri-ui-inner-container.esri-ui-manual-container > div.esri-component[role="presentation"]';
      document.querySelectorAll(sel).forEach(el => { el.style.display = "none"; });
    },

    /**
     * Inject a one-time <style> tag that permanently suppresses Esri's popup
     * for the lifetime of the page session. Equivalent to the CMS approach of
     * calling $beansMarkerPopover.addClass("hidden") where .hidden is display:none !important.
     */
    _injectBeansPopupSuppressor() {
      if (document.getElementById("pyn-beans-popup-suppressor")) return;
      const style = document.createElement("style");
      style.id = "pyn-beans-popup-suppressor";
      style.textContent = [
        'div.esri-ui-inner-container.esri-ui-manual-container > div.esri-component[role="presentation"]',
        '{ display: none !important; }'
      ].join(" ");
      document.head.appendChild(style);
    },

    /**
     * Watch for Esri re-inserting the popup after map re-renders and hide it
     * immediately. Uses MutationObserver on the map container.
     */
    _observeBeansEsriPopup() {
      const mapEl = document.getElementById("pyn-3d-map");
      if (!mapEl || this._beansPopupObserver) return;

      this._beansPopupObserver = new MutationObserver(() => {
        this._hideBeansEsriPopup();
      });

      this._beansPopupObserver.observe(mapEl, { childList: true, subtree: true });
    },

    _beans3dDisplayOptions(filteredIndices, initialMap, cfg3d) {
      const address = cfg3d?.propertyAddress || "";

      // A "beans-only" property has no 2D SVG maps — show the floor selector
      // so users can navigate floors. Mirrors: beanOnlyProperty in beans3DHandler.js
      const beanOnly = !this._hasAnyMap();

      const opts = {
        propertyAddress:   address,
        filteredRows:      filteredIndices ?? this._beans3dArr.map((_, i) => i),
        // The engine re-reads this whenever it resets its state (a re-render or
        // re-init), so the active floor has to live here too or the map quietly
        // goes back to stacking every floor layer.
        selectedFloor:     this._beans3dFloor == null ? "" : String(this._beans3dFloor),
        customConfigs:     {},
        initialMap:        initialMap || "3D",
        hideBeansCard:     true,
        hideFloorSelector: beanOnly ? false : true,
        modernBeansCard:   false,
        showUnitList:      false,
        hideFilters:       true,
        showUnitShape:     true,
        hideShadow:        false,
        showCompass:       true,
        initialZ:          180,
        initialTilt:       65,
        initialHeading:    0
      };

      // Always pass initialPosition when address is available —
      // an empty string crashes BeansEsri.afterSearch on geocoder result.
      if (address) opts.initialPosition = { address };
      return opts;
    },

    _buildBeans3dArr(units, mapConfig) {
      const mc = mapConfig || {};

      // Use the property's configured available color when the caller has not
      // provided explicit config colors — this mirrors the marketing map default.
      // For ops maps use the vacant (available) ops color from unitColors.
      const fillColor = this._userHasCustomColors
        ? (this.config.styles?.unitColors?.available || mc.default_polygon_color || "#3ca832")
        : (this.data.property?.unitColors?.availableColor || mc.default_polygon_color || "#3ca832");
      const address   = this.data.property?.beans3dConfig?.propertyAddress || "";

      // Raw format expected by convertUnitsArr (from utils.js).
      // Fields mirror getFormattedBeansUnits() in beans3DHandler.js.
      const rawUnits = units.map(u => ({
        unitId:          u.unitId,
        type:            "UNIT",
        unit:            u.unitNumber,
        name:            u.unitNumber,
        floor:           u.floor,
        bed:             u.bedrooms,
        bath:            u.bathrooms,
        sqft:            u.square_feet,
        rent:            u.market_rent,
        status:          u.unit_status,
        modelUnit:       u.model_unit,
        availabilityUrl: u.availability_url,
        leaseTerm:       u.lease_term,
        propertyId:      u.property_id
      }));

      // convertUnitsArr is loaded from utils.js alongside mapswidget.
      // It wraps each unit in the Beans { options: { onClickData, markers, … } }
      // envelope that beansWidget.render() requires.
      if (typeof convertUnitsArr !== "function") {
        console.warn("PynMapSDK: convertUnitsArr not available — utils.js may not have loaded.");
        return rawUnits; // fallback: widget will likely crash, but at least we tried
      }

      const converted = convertUnitsArr({ address }, rawUnits, true, true);

      return converted.map((data, i) => {
        const unitData = rawUnits[i];

        // Resolve per-unit fill color when dynamic colors are active.
        // Falls back to the property-level fillColor for custom-color mode.
        const unit = units[i];
        let unitFill = fillColor;
        if (!this._userHasCustomColors && unit) {
          const isOps    = this.config.mapType === "ops";
          const colorObj = isOps ? unit.opsColor : unit.color;
          if (colorObj?.color) unitFill = colorObj.color;
        }
        data.options              = data.options         || {};
        data.options.markers      = data.options.markers || {};
        data.options.markers.display    = true;
        data.options.markers.showLabel  = false;
        data.options.markers.tooltip    = false;
        data.options.onClickData        = unitData;
        data.options.onPreviewData      = null;
        data.options.hideCard           = true;
        data.options.showTooltip        = false;

        data.options.unitShape = {
          fillColor:     unitFill,
          fillOpacity:   0.85,
          strokeColor:   unitFill,
          strokeOpacity: 0.9,
          strokeWeight:  1
        };
        data.options.selectedUnitShape = {
          fillColor:     unitFill,
          fillOpacity:   1,
          strokeColor:   unitFill,
          strokeOpacity: 1,
          strokeWeight:  2
        };
        return data;
      });
    },

    /**
     * Draw only the given floor's layer, the way Beans' own floor selector does.
     *
     * filteredRows only controls which units are shown; the floor layers are
     * driven by the engine's `selectedFloor`, which the widget compares against
     * each polygon's floor when it renders (empty string means draw every floor,
     * which is why all layers stack up until this is set). redraw() re-renders
     * with dontUpdateSelectedFloor, so the value set here survives.
     *
     * Always a string: the widget's "show all floors" test is falsy-based, so
     * floor 0 as a number would read as "no floor selected".
     *
     * @param {number|string|null} floorNumber null shows every floor
     */
    _set3DSelectedFloor(floorNumber) {
      const engine = this._beans3DInstance();
      if (!engine) return;

      engine.selectedFloor = floorNumber == null ? "" : String(floorNumber);
    },

    _update3DFilter(indices) {
      if (!this._beansWidget || !this._3dInitialized) return;
      const cfg3d         = this.data.property?.beans3dConfig;
      const satelliteView = this.config.defaultSatelliteView != null ? this.config.defaultSatelliteView : cfg3d?.defaultSatelliteView;
      const initialMap    = satelliteView ? "SATELLITE" : "3D";
      const opts       = this._beans3dDisplayOptions(indices, initialMap, cfg3d);

      // Filters arriving before the engine finishes geocoding are dropped, not
      // re-initialized: _init3DMap's ready poll replays _beans3dFloor once the
      // view is live. Re-initializing here rendered a second map into the same
      // div and left the first one's controls orphaned.
      if (!this._beansWidget.workingInstance?.mapView?.ready) return;

      try {
        this._beansWidget.setDisplayOptions(opts);
        // setDisplayOptions swaps the options object wholesale and redraw() does
        // not recompute the floor, so the engine has to be told directly.
        // Mirrors reDrawBeansWidget in beans3dHandler.js.
        this._set3DSelectedFloor(this._beans3dFloor);
        this._beansWidget.redraw();
      } catch (e) {
        console.warn("PynMapSDK: Could not update 3D filter", e);
      }
    },

    // Items in _beans3dArr after convertUnitsArr have the shape
    // { options: { onClickData: { unitId, floor, … } } }.
    // Fall back to reading the field directly for the raw-unit fallback path.
    _beans3dItemData(item) {
      return item?.options?.onClickData ?? item;
    },

    // ----------------------------------------------------
    // 3D HOVER
    // ----------------------------------------------------
    //
    // Beans reports which unit the pointer is over, but it re-reports on nearly
    // every pointer move — including moves over open ground, where it keeps
    // naming the last unit — and it never reports the pointer leaving. So Beans
    // decides *which* unit, and we decide whether the pointer is still on it:
    // against the unit's own polygon where there is one, otherwise by distance
    // from where the hover began. Mirrors beans3dHandler.js in the CMS map.

    /** Beans says the pointer is over a unit. Start a hover unless it disagrees. */
    _on3DUnitHover(unit) {
      const unitId = String(unit.unitId ?? unit.id);

      // Ignore Beans repeating itself: this is what pins the hover origin to
      // where the hover began, rather than letting it follow the cursor.
      if (this._3dHoveredUnitId() === unitId) return;

      // Beans also nominates units the pointer is not over, so drop a nomination
      // the polygon rejects — otherwise the tooltip reappears off-shape as soon
      // as the tracker clears it.
      if (this._is3DPointerInsideUnit(unit) === false) {
        this._clear3DHover();
        return;
      }

      this._3dHoveredUnit = unit;
      this._3dHoverOrigin = this._3dPointer ? { ...this._3dPointer } : null;

      this._capture3DUnitHover(unitId);
      if (this.config?.onUnitHover) this.config.onUnitHover(unit);
    },

    /** End the current hover and tell the consumer the pointer has left. */
    _clear3DHover() {
      if (!this._3dHoveredUnit) return;

      this._3dHoveredUnit = null;
      this._3dHoverOrigin = null;
      // Cleared so re-entering the same unit counts as a fresh hover.
      this._lastHoverPid  = null;

      if (this.config?.onUnitHover) this.config.onUnitHover(null);
    },

    _3dHoveredUnitId() {
      const unit = this._3dHoveredUnit;
      return unit ? String(unit.unitId ?? unit.id) : null;
    },

    /** Analytics fires once per unit; the hover callback must fire on every entry. */
    _capture3DUnitHover(unitId) {
      if (unitId === this._lastHoverPid) return;
      this._lastHoverPid = unitId;
      if (this._analytics) {
        this._captureWithMapType('unit_marker', 'hover', { viewed_unit_id: unitId });
      }
    },

    /**
     * Track the pointer and end the hover once it leaves the unit.
     *
     * Keyed on mousemove only: a resting pointer fires no mousemove, so it can
     * never expire a hover. That is what keeps the tooltip up while the cursor
     * sits still on a shape.
     */
    _bind3DHoverTracker() {
      if (this._3dHoverMoveHandler) return;

      this._3dHoverMoveHandler = (event) => {
        this._3dPointer = { x: event.clientX, y: event.clientY };

        if (!this._3dHoveredUnit) return;

        // Beans can nominate before any move has been seen; pin the origin now
        // rather than leave the hover with nothing to measure against.
        if (!this._3dHoverOrigin) {
          this._3dHoverOrigin = { ...this._3dPointer };
          return;
        }

        if (this._has3DPointerLeftUnit(this._3dHoveredUnit)) this._clear3DHover();
      };

      document.addEventListener("mousemove", this._3dHoverMoveHandler, { passive: true });
    },

    _unbind3DHoverTracker() {
      if (!this._3dHoverMoveHandler) return;
      document.removeEventListener("mousemove", this._3dHoverMoveHandler);
      this._3dHoverMoveHandler = null;
    },

    /** The polygon decides where there is one; otherwise drift from the origin does. */
    _has3DPointerLeftUnit(unit) {
      const inside = this._is3DPointerInsideUnit(unit);
      if (inside !== null) return !inside;

      return this._3dPointerDrift() > this._3D_HOVER_EXIT_RADIUS_PX;
    },

    /** How far the pointer has moved from where the hover began. */
    _3dPointerDrift() {
      if (!this._3dPointer || !this._3dHoverOrigin) return 0;

      return Math.hypot(
        this._3dPointer.x - this._3dHoverOrigin.x,
        this._3dPointer.y - this._3dHoverOrigin.y
      );
    },

    /**
     * Is the pointer inside this unit's shape?
     * true / false, or null when the unit has no polygon to test against.
     */
    _is3DPointerInsideUnit(unit) {
      const ring = this._unit3DScreenRing(unit);
      if (!ring) return null;

      // toScreen returns container-relative coordinates, so put the pointer
      // (viewport coordinates) into that same space before testing.
      const rect = this._beans3DView().container.getBoundingClientRect();

      return this._isPointInPolygon(
        { x: this._3dPointer.x - rect.left, y: this._3dPointer.y - rect.top },
        ring
      );
    },

    /**
     * The engine the widget actually renders with.
     *
     * primaryObj first, because that is the one setDisplayOptions() and redraw()
     * act on. The widget picks it per property (ESRI / Mapbox / Google / Banvas),
     * so guessing at the engine objects instead lands on a different instance for
     * some properties — writes to it are then simply ignored by the redraw.
     */
    _beans3DInstance() {
      return (
        this._beansWidget?.primaryObj ||
        this._beansWidget?.workingInstance ||
        this._beansWorkingInstance()
      );
    },

    _beans3DView() {
      return this._beans3DInstance()?.mapView ?? null;
    },

    /** The unit's polygon, which Beans stores positionally against _beans3dArr. */
    _unit3DGeojson(unit) {
      const index = this._beans3dArr.findIndex(
        item => String(this._beans3dItemData(item)?.unitId) === String(unit?.unitId)
      );
      if (index < 0) return null;

      return this._beans3DInstance()?.unitPolygonsToExclude?.[index]?.geojson ?? null;
    },

    /**
     * The unit's polygon projected into screen space, or null when it cannot be
     * projected — callers must treat null as "unknown", never as "outside".
     * Ported from isMouseInsideGeoShape in beans3DHandler.js.
     */
    _unit3DScreenRing(unit) {
      const view  = this._beans3DView();
      const Point = window.__esri?.geometry?.Point;
      if (!view || !Point || !this._3dPointer) return null;

      const geometry = this._unit3DGeojson(unit)?.geometry;
      // Polygon: coordinates[0] is the outer ring. MultiPolygon: coordinates[0][0].
      const ring = geometry?.type === "Polygon"      ? geometry.coordinates?.[0]
                 : geometry?.type === "MultiPolygon" ? geometry.coordinates?.[0]?.[0]
                 : null;
      if (!Array.isArray(ring) || ring.length < 3) return null;

      const screenRing = [];
      for (const [longitude, latitude] of ring) {
        let screenPoint;
        try {
          screenPoint = view.toScreen(
            new Point({ longitude, latitude, spatialReference: view.spatialReference })
          );
        } catch {
          return null;
        }
        if (screenPoint && Number.isFinite(screenPoint.x) && Number.isFinite(screenPoint.y)) {
          screenRing.push(screenPoint);
        }
      }

      return screenRing.length >= 3 ? screenRing : null;
    },

    /** Ray casting; ported from isPointInPolygon in common_functions.js. */
    _isPointInPolygon(point, ring) {
      let inside = false;

      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const xi = ring[i].x, yi = ring[i].y;
        const xj = ring[j].x, yj = ring[j].y;

        const denom     = (yj - yi) || 1e-10;
        const intersect = (yi > point.y) !== (yj > point.y) &&
                          point.x < ((xj - xi) * (point.y - yi)) / denom + xi;

        if (intersect) inside = !inside;
      }

      return inside;
    },

    _beans3dIndicesForFloor(floorNumber) {
      return this._beans3dArr
        .map((item, i) => {
          const u = this._beans3dItemData(item);
          return String(u.floor) === String(floorNumber) ? i : null;
        })
        .filter(i => i !== null);
    },

    _beans3dIndicesForUnitIds(unitIds) {
      const ids = new Set(unitIds.map(String));
      return this._beans3dArr
        .map((item, i) => {
          const u = this._beans3dItemData(item);
          return ids.has(String(u.unitId)) ? i : null;
        })
        .filter(i => i !== null);
    },

    _load3DLibraries() {
      return new Promise(resolve => {
        if (typeof BeansMap !== "undefined") return resolve();

        const loadStyle = (href) => {
          if (document.querySelector(`link[href="${href}"]`)) return;
          const l = document.createElement("link");
          l.rel  = "stylesheet";
          l.href = href;
          document.head.appendChild(l);
        };

        const loadScript = (src) => new Promise((res, rej) => {
          if (document.querySelector(`script[src="${src}"]`)) return res();
          const s    = document.createElement("script");
          s.src      = src;
          s.async    = false;
          s.onload   = res;
          s.onerror  = rej;
          document.head.appendChild(s);
        });

        loadStyle("https://js.arcgis.com/4.27/esri/themes/light/main.css");
        loadStyle("https://www.beans.ai/mapswidget/css/mapswidget-1.0.4.css");

        // Load order matters: ArcGIS → mapswidget → utils (provides convertUnitsArr)
        loadScript("https://js.arcgis.com/4.27/")
          .then(() => loadScript("https://www.beans.ai/mapswidget/js/mapswidget-1.0.4-speed.js"))
          .then(() => loadScript("https://www.beans.ai/mapswidget/client/utils.js"))
          .then(resolve)
          .catch(() => resolve()); // resolve anyway; caller checks typeof BeansMap
      });
    },

    // ----------------------------------------------------
    // FLOOR / MAP CHANGE
    // ----------------------------------------------------
    async changeMap(mapId) {
      const id = String(mapId);

      if (!this._mapExists(id)) {
        const mapType = this._getMapTypeForId(id);
        if (!mapType) return;
        this._showLoading("Loading floor...");
        const svg = await this._loadSVGIfNeeded(id, mapType);
        if (!svg) return;
      }

      this.activeMapId   = id;
      this._lastHoverPid = null;

      this._renderMaps();
      this._plotSvgAmenities();
      this._highlightAllUnits();
      this._bindUnitEvents();
      this._bindSvgAmenityEvents();
    },

    async changeFloor(floorNumber) {
      if (this._analytics) this._captureWithMapType('floor_number', 'click', { floor: String(floorNumber) });
      if (this._3dMode) {
        this._beans3dFloor = floorNumber;
        const indices = floorNumber != null
          ? this._beans3dIndicesForFloor(floorNumber)
          : this._beans3dArr.map((_, i) => i);
        this._set3DSelectedFloor(floorNumber);
        this._update3DFilter(indices);
        return;
      }

      if (this._imgMapMode) {
        this._imageMapChangeFloor(floorNumber);
        return;
      }

      const fp = this._findFloorplateByFloor(floorNumber);

      if (!fp) {
        this._highlightAllUnits();
        return;
      }

      const floorMapId = String(fp.mapId);

      if (this.activeMapId === floorMapId) {
        this._highlightUnitsForFloor(floorNumber);
        return;
      }

      await this.changeMap(floorMapId);
      this._highlightUnitsForFloor(floorNumber);
    },


    // ----------------------------------------------------
    // HIGHLIGHT: UNITS
    // ----------------------------------------------------
    _highlightAllUnits() {
      const activeSvg = this._getActiveSvg();
      if (!activeSvg) return;

      this._clearUnitStyles();

      const units = this.unitsByMap[this.activeMapId] || [];

      units.forEach(unit => {
        const pid = this._unitPid(unit);
        if (!pid) return;

        const sel = this._pointerSelector(unit.pointerData);
        if (!sel) return;
        const el  = activeSvg.querySelector(sel);
        if (!el) return;

        this._applyFill(el, this._unitColor(unit));

        const root = el.closest("g") || el;
        root.classList.add("pyn-highlight");
      });
    },

    _highlightUnitsForFloor(floorNumber) {
      const activeSvg = this._getActiveSvg();
      if (!activeSvg) return;

      this._clearUnitStyles();

      const units = (this.unitsByMap[this.activeMapId] || []).filter(
        u => String(u.floor) === String(floorNumber)
      );

      units.forEach(u => {
        const pid = this._unitPid(u);
        if (!pid) return;

        const sel = this._pointerSelector(u.pointerData);
        if (!sel) return;
        const el  = activeSvg.querySelector(sel);
        if (!el) return;

        this._applyFill(el, this._unitColor(u));

        const root = el.closest("g") || el;
        root.classList.add("pyn-highlight");
      });
    },

    highlightUnits(unitIds) {
      if (!unitIds) return;

      // Callers filter at bedroom granularity on a grouped property, so the ids
      // arriving here can be spaces. Resolve them to the doors that are actually
      // drawn before any of the three render modes sees them — an apartment with
      // three matching bedrooms must still be painted once.
      const ids = this._toBaseIds(
        Array.isArray(unitIds) ? unitIds.map(String) : [String(unitIds)]
      );

      if (this._3dMode) {
        const indices = this._beans3dIndicesForUnitIds(ids);
        this._update3DFilter(indices);
        return;
      }

      if (this._imgMapMode) {
        this._imageMapHighlightUnits(ids);
        return;
      }

      const activeSvg = this._getActiveSvg();
      if (!activeSvg) return;
      const units = this.unitsByMap[this.activeMapId] || [];

      this._clearUnitStyles();

      ids.forEach(id => {
        const unit = units.find(u =>
          String(u.unitId) === id ||
          this._unitPid(u) === id
        );

        const pid = this._unitPid(unit);
        if (!pid) return;

        const sel = this._pointerSelector(unit.pointerData);
        if (!sel) return;
        const el  = activeSvg.querySelector(sel);
        if (!el) return;

        this._applyFill(el, this._unitColor(unit));

        const root = el.closest("g") || el;
        root.classList.add("pyn-highlight");
      });
    },

    /**
     * Highlight all units on the active map that belong to the given floorplan.
     * Units from other floorplans are dimmed to 0.3 opacity so the hovered
     * floorplan's units stand out clearly. pyn-highlight is removed from dimmed
     * units so their hover/click callbacks do not fire while another floorplan
     * is active.
     *
     * Call offFloorplanHover() to restore the default display state.
     *
     * @param {number|string} floorplanId
     */
    onFloorplanHover(floorplanId) {
      if (this._3dMode || this._imgMapMode) return;
      const activeSvg = this._getActiveSvg();
      if (!activeSvg) return;

      const id = String(floorplanId);
      if (this._analytics) this._captureWithMapType('floorplan', 'hover', { floorplan_id: id });

      // Resolve the floorplan name so we can fall back to name-matching for units
      // whose floorplanId is null but floorplanName is populated.
      const fp     = (this.data.floorplans || []).find(f => String(f.floorplanId) === id);
      const fpName = fp ? fp.name : null;

      const units = this.unitsByMap[this.activeMapId] || [];

      units.forEach(unit => {
        const pid = this._unitPid(unit);
        if (!pid) return;
        const sel = this._pointerSelector(unit.pointerData);
        if (!sel) return;
        const el = activeSvg.querySelector(sel);
        if (!el) return;
        const root = el.closest("[data-pyn-unit-pid]") || el.closest("g") || el;

        const matchById   = unit.floorplanId != null && String(unit.floorplanId) === id;
        const matchByName = fpName != null && unit.floorplanName != null && unit.floorplanName === fpName;
        const noData      = unit.floorplanId == null && !unit.floorplanName;

        if (matchById || matchByName || noData) {
          this._applyFill(el, this._unitColor(unit));
          el.style.opacity = "1";
          root.classList.add("pyn-highlight");
        } else {
          this._applyFill(el, this._unitColor(unit));
          el.style.opacity = "0.15";
          root.classList.remove("pyn-highlight");
        }
      });
    },

    /**
     * Restore all units on the active map to their default display state.
     * Call this after onFloorplanHover() when the cursor leaves the floorplan tile.
     */
    offFloorplanHover() {
      if (this._3dMode || this._imgMapMode) return;
      this._highlightAllUnits();
    },

    // ----------------------------------------------------
    // FAST UNIT EVENTS (DELEGATED)
    // ----------------------------------------------------
    _bindUnitEvents() {
      const svg = this._getActiveSvg();
      if (!svg) return;

      const mapId     = this.activeMapId;
      const byPointer = this.unitsByPointerIdByMap[mapId] || {};
      const pointerIds = this.pointerIdsByMap[mapId] || [];

      pointerIds.forEach(pid => {
        const unit = byPointer[pid];
        const sel  = this._pointerSelector(unit?.pointerData);
        const el   = svg.querySelector(sel);
        if (!el) return;

        const root = el.closest("g") || el;
        root.dataset.pynUnitPid = pid;
        root.style.cursor       = "pointer";
      });

      if (svg._pynEventsBound) return;
      svg._pynEventsBound = true;

      // Hover — only highlighted units respond visually and fire the callback.
      svg.addEventListener("mouseover", (e) => {
        const root = e.target.closest("[data-pyn-unit-pid]");
        if (!root || !root.classList.contains("pyn-highlight")) return;

        const pid  = root.dataset.pynUnitPid;
        const unit = byPointer[pid];
        if (!unit) return;

        const sel = this._pointerSelector(unit.pointerData);
        const el  = root.querySelector(sel) || root;
        this._applyFill(el, this._unitHoverColor(unit));

        if (pid !== this._lastHoverPid) {
          this._lastHoverPid = pid;
          if (this._analytics) this._captureWithMapType('unit_marker', 'hover', { viewed_unit_id: String(unit.unitId ?? unit.id ?? pid) });
          if (this.config.onUnitHover) this.config.onUnitHover(unit);
        }
      });

      svg.addEventListener("mouseout", (e) => {
        const root = e.target.closest("[data-pyn-unit-pid]");
        if (!root || !root.classList.contains("pyn-highlight")) return;

        const pid  = root.dataset.pynUnitPid;
        const unit = byPointer[pid];
        if (!unit) return;

        if (!root.contains(e.relatedTarget) && this._lastHoverPid === pid) {
          this._lastHoverPid = null;
        }

        const sel = this._pointerSelector(unit.pointerData);
        const el  = root.querySelector(sel) || root;
        this._applyFill(el, this._unitColor(unit));
      });

      // Touch support: tap to select
      let _touch = null;
      let _suppressNextClick = false;

      svg.addEventListener("touchstart", (e) => {
        if (e.touches.length !== 1) { _touch = null; return; }
        const t = e.touches[0];
        const root = t.target.closest("[data-pyn-unit-pid]");
        _touch = { x: t.clientX, y: t.clientY, time: Date.now(), root: root || null };
        if (root && root.classList.contains("pyn-highlight")) {
          const pid  = root.dataset.pynUnitPid;
          const unit = byPointer[pid];
          if (unit) {
            const sel = this._pointerSelector(unit.pointerData);
            const el  = root.querySelector(sel) || root;
            this._applyFill(el, this._unitHoverColor(unit));
          }
        }
      }, { passive: true });

      svg.addEventListener("touchend", (e) => {
        if (!_touch) return;
        const t = e.changedTouches[0];
        const dx = t.clientX - _touch.x;
        const dy = t.clientY - _touch.y;
        const wasTap = Math.sqrt(dx * dx + dy * dy) < 8 && (Date.now() - _touch.time) < 250;
        const root = _touch.root;
        _touch = null;

        if (!root) return;
        const pid  = root.dataset.pynUnitPid;
        const unit = byPointer[pid];
        if (!unit) return;

        const sel = this._pointerSelector(unit.pointerData);
        const el  = root.querySelector(sel) || root;
        this._applyFill(el, this._unitColor(unit));

        if (wasTap && root.classList.contains("pyn-highlight")) {
          _suppressNextClick = true;
          setTimeout(() => { _suppressNextClick = false; }, 500);
          if (this._analytics) this._captureWithMapType('unit_marker', 'click', { viewed_unit_id: String(unit.unitId ?? unit.id ?? pid) });
          if (this.config.onUnitClick) this.config.onUnitClick(unit);
        }
      }, { passive: true });

      svg.addEventListener("touchcancel", () => { _touch = null; }, { passive: true });

      // Click (desktop) — suppressed after a touch tap to avoid double-fire
      svg.addEventListener("click", (e) => {
        if (_suppressNextClick) return;

        const root = e.target.closest("[data-pyn-unit-pid]");
        if (!root || !root.classList.contains("pyn-highlight")) return;

        const pid = root.dataset.pynUnitPid;
        if (!pid) return;

        const unit = byPointer[pid];
        if (!unit) return;

        if (this._analytics) this._captureWithMapType('unit_marker', 'click', { viewed_unit_id: String(unit.unitId ?? unit.id ?? pid) });
        if (this.config.onUnitClick) {
          this.config.onUnitClick(unit);
        }
      });
    },


    // ----------------------------------------------------
    // SVG AMENITY PLOTTING
    // Mirrors the old svgHandler.js processSvgBlock / setSvgAmenitiesCoordinates:
    //   find the original SVG shape via pointer_data selector → clone it → fill with
    //   amenity color → tag clone with data-pyn-amenity-id for delegated events.
    // ----------------------------------------------------

    // Returns amenities that belong to the given mapId and have valid pointer_data.
    _svgAmenitiesForMap(mapId) {
      return (this.data.amenities || []).filter(a =>
        a.pointerData && String(a.floorplateId) === String(mapId)
      );
    },

    // Clone the original SVG shape for each amenity, fill with the amenity color,
    // and insert directly after the original element in the SVG.
    _plotSvgAmenities() {
      const svg = this._getActiveSvg();
      if (!svg) return;

      // Remove stale clones from a previous render.
      svg.querySelectorAll(".pyn-svg-amenity").forEach(el => el.remove());

      const amenities = this._svgAmenitiesForMap(this.activeMapId);

      amenities.forEach(amenity => {
        const sel = this._pointerSelector(amenity.pointerData);
        if (!sel) return;

        const original = svg.querySelector(sel);
        if (!original) return;

        const clone = original.cloneNode(true);
        clone.classList.add("pyn-svg-amenity");
        clone.setAttribute("id", `pyn_amenity_${amenity.amenityId}_cloned`);

        // Apply amenity fill color — override any inline style from the SVG source.
        const cfg   = amenity.colorConfig || {};
        const color = this._hexToRgba(cfg.color || "#888888", cfg.opacity ?? 1);
        clone.style.fill   = color;
        clone.style.cursor = "pointer";

        // Tag for delegated event lookup (stored as string to survive cloneNode).
        clone.dataset.pynAmenityId   = String(amenity.amenityId);
        clone.dataset.pynAmenityJson = JSON.stringify(amenity);

        // Insert after original so the clone renders on top.
        const next = original.nextSibling;
        if (next) {
          original.parentNode.insertBefore(clone, next);
        } else {
          original.parentNode.appendChild(clone);
        }
      });
    },

    // Delegated amenity events — hover, click, and touch-tap — all bound once on the SVG.
    _bindSvgAmenityEvents() {
      const svg = this._getActiveSvg();
      if (!svg || svg._pynAmenityEventsBound) return;
      svg._pynAmenityEventsBound = true;

      // Hover — visual brightness + callback.
      svg.addEventListener("mouseover", e => {
        const el = e.target.closest(".pyn-svg-amenity[data-pyn-amenity-id]");
        if (!el) return;
        el.style.filter = "brightness(1.25)";
        try {
          const amenity = JSON.parse(el.dataset.pynAmenityJson || "null");
          if (amenity) {
            if (this._analytics) this._captureWithMapType('amenity_marker', 'hover', { marker_id: String(amenity.amenityId || '') });
            if (this.config.onAmenityHover) this.config.onAmenityHover(amenity);
          }
        } catch {}
      });

      svg.addEventListener("mouseout", e => {
        const el = e.target.closest(".pyn-svg-amenity[data-pyn-amenity-id]");
        if (!el || el.contains(e.relatedTarget)) return;
        el.style.filter = "";
      });

      // Click (desktop).
      svg.addEventListener("click", e => {
        const el = e.target.closest(".pyn-svg-amenity[data-pyn-amenity-id]");
        if (!el) return;
        try {
          const amenity = JSON.parse(el.dataset.pynAmenityJson || "null");
          if (amenity) {
            if (this._analytics) this._captureWithMapType('amenity_marker', 'click', { marker_id: String(amenity.amenityId || '') });
            if (this.config.onAmenityClick) this.config.onAmenityClick(amenity);
          }
        } catch {}
      });

      // Touch tap (mobile).
      let _aTouch = null;
      svg.addEventListener("touchstart", e => {
        if (e.touches.length !== 1) { _aTouch = null; return; }
        const t = e.touches[0];
        const el = t.target.closest(".pyn-svg-amenity[data-pyn-amenity-id]");
        _aTouch = { x: t.clientX, y: t.clientY, time: Date.now(), el: el || null };
      }, { passive: true });

      svg.addEventListener("touchend", e => {
        if (!_aTouch) return;
        const t  = e.changedTouches[0];
        const dx = t.clientX - _aTouch.x;
        const dy = t.clientY - _aTouch.y;
        const wasTap = Math.sqrt(dx * dx + dy * dy) < 8 && (Date.now() - _aTouch.time) < 300;
        const el = _aTouch.el;
        _aTouch = null;
        if (!wasTap || !el) return;
        try {
          const amenity = JSON.parse(el.dataset.pynAmenityJson || "null");
          if (amenity) {
            if (this._analytics) this._captureWithMapType('amenity_marker', 'click', { marker_id: String(amenity.amenityId || '') });
            if (this.config.onAmenityClick) this.config.onAmenityClick(amenity);
          }
        } catch {}
      }, { passive: true });

      svg.addEventListener("touchcancel", () => { _aTouch = null; }, { passive: true });
    },

    // ----------------------------------------------------
    // INTERNAL CLEARING
    // ----------------------------------------------------
    _clearUnitStyles() {
      const activeSvg = this._getActiveSvg();
      if (!activeSvg) return;

      const ids = this.pointerIdsByMap[this.activeMapId] || [];

      const byPointer = this.unitsByPointerIdByMap[this.activeMapId] || {};

      ids.forEach(pid => {
        const unit = byPointer[pid];
        const sel  = this._pointerSelector(unit?.pointerData);
        const el   = activeSvg.querySelector(sel);
        if (!el) return;

        this._clearFill(el);
        el.style.stroke      = "";
        el.style.strokeWidth = "";
        el.style.removeProperty("opacity");

        const root = el.closest("[data-pyn-unit-pid]") || el.closest("g") || el;
        root.classList.remove("pyn-highlight");

        el.classList.remove("pyn-selected-unit");
        el.classList.remove("pyn-highlight");
      });
    },


    // ----------------------------------------------------
    // HELPERS
    // ----------------------------------------------------
    _renderZoomControls() {
      const old = this.container.querySelector(".pyn-zoom-controls");
      if (old) old.remove();

      const wrapper = document.createElement("div");
      wrapper.className = "pyn-zoom-controls";

      Object.assign(wrapper.style, {
        position:      "absolute",
        right:         "12px",
        top:           "22%",
        display:       "flex",
        flexDirection: "column",
        gap:           "6px",
        zIndex:        "999999"
      });

      const btnStyle = {
        width:           "34px",
        height:          "34px",
        background:      "#ffffff",
        borderRadius:    "6px",
        border:          "1px solid #ccc",
        display:         "flex",
        alignItems:      "center",
        justifyContent:  "center",
        fontSize:        "20px",
        fontWeight:      "bold",
        cursor:          "pointer",
        boxShadow:       "0 2px 5px rgba(0,0,0,0.15)",
        userSelect:      "none",
        touchAction:     "manipulation"
      };

      // panzoom's touchstart handler calls preventDefault() on the SVG, which blocks
      // click-synthesis from touch sequences for overlaid buttons. Use touchend to
      // fire actions directly so mobile taps always work.
      const bindBtn = (el, fn) => {
        el.onclick = fn;
        el.addEventListener("touchend", e => { e.preventDefault(); e.stopPropagation(); fn(); }, { passive: false });
      };

      const plus = document.createElement("div");
      plus.innerText = "+";
      Object.assign(plus.style, btnStyle);
      bindBtn(plus, () => this.zoomIn());
      this._zoomInBtn = plus;

      const minus = document.createElement("div");
      minus.innerText = "−";
      Object.assign(minus.style, btnStyle);
      bindBtn(minus, () => this.zoomOut());
      this._zoomOutBtn = minus;

      const reset = document.createElement("div");
      reset.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#444" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>`;
      Object.assign(reset.style, { ...btnStyle, fontSize: "16px" });
      bindBtn(reset, () => this.resetZoom());
      this._resetZoomBtn = reset;

      // Hide zoom buttons immediately if already in 3D mode
      if (this._3dMode) {
        plus.style.display  = "none";
        minus.style.display = "none";
        reset.style.display = "none";
      }

      wrapper.appendChild(plus);
      wrapper.appendChild(minus);
      wrapper.appendChild(reset);

      if (this.config.enable3DMap) {
        const toggle = document.createElement("div");
        toggle.className = "pyn-3d-toggle";
        toggle.innerText = this._3dMode ? "2D" : "3D";
        Object.assign(toggle.style, {
          ...btnStyle,
          fontSize:        "13px",
          letterSpacing:   "0.5px"
        });
        const toggleFn = () => { if (this._3dMode) this.switchTo2DMap(); else this.switchTo3DMap(); };
        bindBtn(toggle, toggleFn);
        this._3dToggleBtn = toggle;
        wrapper.appendChild(toggle);
      }

      this.container.appendChild(wrapper);
    },

    _unitStatus(unit) {
      return "available";
    },

    /**
     * Resolves the fill color for a unit.
     *
     * Priority:
     *   1. Caller explicitly passed `styles.unitColors` in config → use config (backward-compat).
     *   2. Otherwise → use the server-resolved color on the unit object:
     *        mapType "ops"        → unit.opsColor  { color, opacity }
     *        mapType "marketing"  → unit.color     { color, opacity }
     *      Both are pre-computed by sdk_controller respecting coloring_mode
     *      (by_property / by_floorplan) and unit status (model vs available).
     *   3. Final fallback → defaultStyles.unitColors.available.
     */
    // Applies fill to el and, when el is a <g>, to all descendant shapes.
    // Returns the lookup key for a unit: non-empty id, or selector as fallback.
    // Handles pointer_data where id is "" but selector is set.
    _unitPid(unit) {
      const pd = unit?.pointerData;
      if (!pd) return null;
      const id = pd.id;
      if (id !== undefined && id !== null && id !== '') return String(id);
      return pd.selector || null;
    },

    // Exact mirror of svgHandler.js getPointerIdAndSelector:
    // selector is overridden with tag#id ONLY when BOTH tag and id are truthy.
    // When id is "" (empty), tag && id is false → original selector is kept.
    _pointerSelector(pointerData) {
      const { tag = null, id = null, selector: raw = null } = pointerData || {};
      let selector = raw;

      if (tag && id) {
        selector = /^[0-9]/.test(id)
          ? `${tag}[id="${id}"]`
          : `${tag}#${CSS.escape(id)}`;
      }

      return selector || null;
    },

    // Mirrors svgHandler.js: use setProperty("important") so inline !important beats
    // any SVG-embedded <style> block rules (including #id-based !important rules).
    // When el is a <g>, propagate to all descendant shapes too.
    _applyFill(el, color) {
      el.style.setProperty("fill", color, "important");
      if (el.tagName && el.tagName.toLowerCase() === 'g') {
        el.querySelectorAll('path, polygon, rect, ellipse, circle').forEach(s => {
          s.style.setProperty("fill", color, "important");
        });
      }
    },

    _clearFill(el) {
      el.style.removeProperty("fill");
      if (el.tagName && el.tagName.toLowerCase() === 'g') {
        el.querySelectorAll('path, polygon, rect, ellipse, circle').forEach(s => {
          s.style.removeProperty("fill");
        });
      }
    },

    _unitColor(unit) {
      if (this._userHasCustomColors) {
        const styles = this.config.styles || this.defaultStyles;
        const status = this._unitStatus(unit);
        return styles.unitColors[status] || styles.unitColors.available;
      }

      const isOps    = this.config.mapType === "ops";
      const colorObj = isOps ? unit.opsColor : unit.color;

      if (colorObj?.color) {
        const op = colorObj.opacity ?? 1;
        return op < 1 ? this._hexToRgba(colorObj.color, op) : colorObj.color;
      }

      return (this.config.styles || this.defaultStyles).unitColors.available;
    },

    /**
     * Hover color for a unit — the unit's own color at 0.75 opacity.
     * Falls back to config styles.unitColors.hover when custom colors are set.
     */
    _unitHoverColor(unit) {
      if (this._userHasCustomColors) {
        return (this.config.styles || this.defaultStyles).unitColors.hover;
      }
      const isOps    = this.config.mapType === "ops";
      const colorObj = isOps ? unit.opsColor : unit.color;
      if (colorObj?.color) return this._lightenHex(colorObj.color, 0.35);
      return (this.config.styles || this.defaultStyles).unitColors.hover;
    },

    /**
     * Blend a hex color toward white by `factor` (0 = original, 1 = white).
     * Used for hover — brightens the unit's own color rather than dimming it.
     */
    _lightenHex(hex, factor) {
      const h  = hex.replace("#", "");
      const r  = Math.round(parseInt(h.slice(0, 2), 16) + (255 - parseInt(h.slice(0, 2), 16)) * factor);
      const g  = Math.round(parseInt(h.slice(2, 4), 16) + (255 - parseInt(h.slice(2, 4), 16)) * factor);
      const b  = Math.round(parseInt(h.slice(4, 6), 16) + (255 - parseInt(h.slice(4, 6), 16)) * factor);
      return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
    },

    /** Convert a 6-digit hex + opacity float to an rgba() string. */
    _hexToRgba(hex, opacity) {
      const h = hex.replace("#", "");
      const r = parseInt(h.slice(0, 2), 16);
      const g = parseInt(h.slice(2, 4), 16);
      const b = parseInt(h.slice(4, 6), 16);
      return `rgba(${r},${g},${b},${opacity})`;
    },

    _findFloorplateByFloor(floorNumber) {
      const fn = Number(floorNumber);
      if (isNaN(fn)) return null;

      for (const fp of this.data.floorplates) {
        const range = String(fp.range).trim();

        if (range.includes("-")) {
          const [min, max] = range.split("-").map(Number);
          if (fn >= min && fn <= max) return fp;
        } else {
          if (fn === Number(range)) return fp;
        }
      }

      return null;
    },

    _applyGlobalLabelStyles(svg, textStyles) {
      if (!svg || svg._pynTextStyled) return;

      const elements = svg.querySelectorAll("text, tspan");
      elements.forEach(el => {
        el.style.fontFamily   = textStyles?.fontFamily;
        el.style.fontSize     = textStyles?.fontSize;
        el.style.fill         = textStyles?.fontColor;
        el.style.pointerEvents = "none";
      });

      svg._pynTextStyled = true;
    },

    _getActiveSvg() {
      return this.container.querySelector(`svg[data-map-id="${this.activeMapId}"]`);
    },

    _mapExists(id)  { return !!this.svgCache[id]; },
    _hasAnyMap()    { return Object.keys(this.svgCache).length > 0; },

    _getDefaultMapId() {
      if (this.data.sitemap && this.svgCache[String(this.data.sitemap.mapId)])
        return String(this.data.sitemap.mapId);
      return Object.keys(this.svgCache)[0];
    },

    _getMapTypeForId(mapId) {
      const id = String(mapId);
      if (this.data.sitemap && String(this.data.sitemap.mapId) === id)
        return this.data.sitemap.mapType || "sitemap";
      const fp = this.data.floorplates.find(f => String(f.mapId) === id);
      return fp ? (fp.mapType || "floorplate") : null;
    },

    destroy() {
      this._initialized        = false;
      this._sessionToken       = null;
      this._apiKey             = null;
      this._propertyId         = null;
      this._reauthPromise      = null;
      this._favorites          = new Set();
      this._favoriteAmenities  = new Set();
      this._favoriteFloorplans = new Set();
      this._favoriteGalleryImages = new Set();
      this.config              = null;
      this.container           = null;
      this.activeMapId         = null;
      this._3dMode             = false;
      this._3dInitialized      = false;
      this._beansWidget        = null;
      this._beans3dArr         = [];
      this._beans3dFloor       = null;
      this._unbind3DHoverTracker();
      this._3dHoveredUnit      = null;
      this._3dHoverOrigin      = null;
      this._3dPointer          = null;
      this._3dWrapper          = null;
      this._3dToggleBtn        = null;
      this._zoomInBtn          = null;
      this._zoomOutBtn         = null;
      this._resetZoomBtn       = null;
      this._imgMapMode         = false;
      this._imgActiveMapId     = null;
      this._userHasCustomColors= false;
      this._bgMapLayer         = null;
      this._zoomWrapper        = null;
      if (this._beansPopupObserver) {
        this._beansPopupObserver.disconnect();
        this._beansPopupObserver = null;
      }
      this._galleryListPromise  = null;
      this._galleryListLoaded   = false;
      this._galleryImagePromises = {};
      this._galleryImagesLoaded  = new Set();
      this._neighborhoodPromise = null;
      this._neighborhoodLoaded  = false;
      this._placesPromises      = {};
      this._placesLoaded        = new Set();
      this._neighborhoodLimited = false;
      this.data                = { property: null, sitemap: null, backgroundSvg: null, floorplates: [], units: [], floorplans: [], amenities: [], filters: null, gallery: null, galleryList: [], galleryImages: {}, neighborhood: [], neighborhoodPlaces: {} };
      this.unitsByMap          = {};
      this.pointerIdsByMap     = {};
      this.unitsByPointerIdByMap = {};
      this._svgLoadingPromises = {};
      this._lastHoverPid       = null;
      // svgCache is intentionally preserved to avoid re-fetching on reinit
    },

    // Loading state is icon-only — the message is kept for assistive tech
    // (aria-label) but never rendered as visible text.
    _showLoading(msg) {
      this._injectSpinnerStyles();

      this.container.innerHTML = "";
      const spinner = document.createElement("div");
      spinner.className = "pyn-map-sdk-spinner";
      spinner.setAttribute("role", "status");
      spinner.setAttribute("aria-label", msg || "Loading");

      this.container.style.display        = "flex";
      this.container.style.alignItems     = "center";
      this.container.style.justifyContent = "center";
      this.container.appendChild(spinner);
    },

    _injectSpinnerStyles() {
      if (document.getElementById("pyn-map-sdk-spinner-styles")) return;
      const style = document.createElement("style");
      style.id = "pyn-map-sdk-spinner-styles";
      style.textContent =
        ".pyn-map-sdk-spinner{width:34px;height:34px;border:3px solid rgba(0,0,0,0.12);" +
        "border-top-color:#444;border-radius:50%;animation:pyn-map-sdk-spin .8s linear infinite;box-sizing:border-box}" +
        "@keyframes pyn-map-sdk-spin{to{transform:rotate(360deg)}}" +
        "@media (prefers-reduced-motion:reduce){.pyn-map-sdk-spinner{animation-duration:2.4s}}";
      document.head.appendChild(style);
    },

    _showError(msg, code)      {
      // Notify the caller's error handler. Returning false from onError
      // suppresses the SDK's default in-container error message so the
      // partner can render their own UI instead.
      let suppressDefault = false;
      if (this.config?.onError) {
        try {
          suppressDefault = this.config.onError({ message: msg, code: code != null ? code : null }) === false;
        } catch (e) {
          console.error("PynMapSDK: onError callback threw:", e);
        }
      }
      if (!suppressDefault) this._showStatus(msg, true);
    },

    _showStatus(text, isError) {
      this.container.innerHTML = "";
      const box = document.createElement("div");
      Object.assign(box.style, {
        background:   "#fff",
        padding:      "10px 18px",
        borderRadius: "6px",
        fontSize:     "14px",
        color:        isError ? "#b91c1c" : "#444",
        boxShadow:    "0 2px 6px rgba(0,0,0,0.1)"
      });
      box.innerText = text;

      this.container.style.display        = "flex";
      this.container.style.alignItems     = "center";
      this.container.style.justifyContent = "center";
      this.container.appendChild(box);
    },

    // ----------------------------------------------------
    // PUBLIC DATA ACCESSORS
    // ----------------------------------------------------

    /**
     * Returns the full property-level configuration object as received from
     * the server. Includes branding, map mode, unit display flags, marker
     * colours, legend settings, filter toggles, and more.
     *
     * Returns null if the SDK has not finished initialising yet.
     *
     * Example:
     *   const cfg = PynMapSDK.getPropertyConfig();
     *   console.log(cfg.branding.logoUrl);
     *   console.log(cfg.unitDisplay.displayRent);
     *   console.log(cfg.filters.showBedroomFilter);
     */
    getPropertyConfig() {
      return this.data.property || null;
    },

    /**
     * Returns filter options derived from the data loaded during fetch_data.
     * No extra network call — same pattern as getFloorplans() / getUnits().
     * Filter data is computed server-side and bundled into the single fetch_data response.
     *
     *   {
     *     bedrooms:      [{ label, value }],           // bedroom dropdown options
     *     availability:  [{ label, value }],           // availability dropdown options
     *     squareFootage: { min, max, values: [] },     // sq ft range slider data
     *     priceRange:    { min, max, values: [] },     // price range slider data
     *     visibility: {
     *       showBedroomFilter, showPricingFilter,
     *       showSquareFeetFilter, showAvailabilityFilter, showPropertiesFilter,
     *       showSortOptions
     *     },
     *     displayFlags: { displayRent, hideBedrooms, hideSquareFeet, hideAvailability }
     *   }
     *
     * Example:
     *   const filters = PynMapSDK.getFiltersData();
     *   if (filters.visibility.showBedroomFilter && !filters.displayFlags.hideBedrooms) {
     *     populateBedroomDropdown(filters.bedrooms);
     *   }
     *   if (filters.visibility.showSquareFeetFilter && !filters.displayFlags.hideSquareFeet) {
     *     initRangeSlider(filters.squareFootage.min, filters.squareFootage.max);
     *   }
     */
    getFiltersData() {
      return this.data.filters || null;
    },

    // ----------------------------------------------------
    // GALLERY (PUBLIC API)
    //
    // The gallery is the one collection not bundled into fetch_data: a property
    // can carry hundreds of images, and most visitors never open the panel.
    //
    // Whether to show a Gallery entry point at all comes from the map payload,
    // free of any network call:
    //
    //   const { enabled, pageName, imageCount } = PynMapSDK.getGalleryConfig();
    //   if (enabled && imageCount > 0) showGalleryTab(pageName);
    //
    // `enabled` is true only when the property has Pynwheel Touch on AND its own
    // gallery switch on.
    //
    // Content then comes in two steps, deliberately kept apart — the same shape
    // as the neighborhood's category rail and its per-category places:
    //
    //   getGalleryList()            names, photo counts, cover thumbs. A few
    //                               hundred bytes; draws the sidebar.
    //   getGalleryImages(galleryId) one gallery's images, memoised per id, so a
    //                               visitor who opens one gallery of five never
    //                               downloads the other four.
    //
    // Nothing fetches every image at once: a property can carry hundreds, and a
    // visitor opens one gallery at a time.
    // ----------------------------------------------------

    /**
     * The gallery list without any images: name, photo count, cover thumbnail.
     * Call it when the Gallery panel opens, then getGalleryImages() for whichever
     * gallery the visitor selects.
     *
     * `count` is exact — it comes from the same filter that drops unrenderable
     * rows, so the number beside a gallery always matches how many tiles
     * getGalleryImages() will return for it.
     *
     * Memoised for the life of the page, concurrent calls share one request, and
     * it never throws — any failure resolves to an empty array.
     *
     *   [{ id, title, count, coverUrl }]
     *
     * @param {{ force?: boolean }} [opts]
     * @returns {Promise<object[]>}
     */
    async getGalleryList({ force = false } = {}) {
      if (!force && this._galleryListLoaded) return this.data.galleryList;
      if (this._galleryListPromise) return this._galleryListPromise;

      // Fired here rather than on every call: reaching the network is what
      // marks a real visit, so re-renders reading the memo cost nothing.
      // 'gallery_view' is the name the server maps to the "Gallery view"
      // visited page, so it has to match exactly.
      if (this._analytics) this._captureWithMapType('gallery_view');

      this._galleryListPromise = this._fetchGalleryList()
        .then((galleries) => {
          this.data.galleryList   = galleries;
          this._galleryListLoaded = true;
          return galleries;
        })
        .finally(() => { this._galleryListPromise = null; });

      return this._galleryListPromise;
    },

    /**
     * One gallery's images, by the id getGalleryList() returned.
     *
     * Memoised per gallery, so switching back to a gallery already opened is
     * free, and concurrent calls for the same id share one request. Pass
     * { force: true } to refetch that gallery.
     *
     * Never throws: an unknown id, a gallery belonging to another property, or
     * any network failure all resolve to an empty array.
     *
     *   [{
     *     id, categoryId, type, name,
     *     url,               // full resolution — use in the lightbox
     *     thumbUrl,          // 640x360 — use in the grid (null for videos)
     *     posterUrl,         // video poster; may 404 on older uploads
     *     posterFallbackUrl, // swap to this on posterUrl's error event
     *     isVideo,
     *     isFavorite         // toggle with saveFavorite/deleteFavorite,
     *                        // passing type "gallery_image"
     *   }]
     *
     * @param {string|number} galleryId
     * @param {{ force?: boolean }} [opts]
     * @returns {Promise<object[]>}
     */
    async getGalleryImages(galleryId, { force = false } = {}) {
      const key = String(galleryId ?? "");
      if (!key) return [];

      if (!force && this._galleryImagesLoaded.has(key)) return this.data.galleryImages[key] || [];
      if (this._galleryImagePromises[key]) return this._galleryImagePromises[key];

      this._galleryImagePromises[key] = this._fetchGalleryImages(key)
        .then((images) => {
          this.data.galleryImages[key] = images;
          this._galleryImagesLoaded.add(key);
          // Favorited images arrive flagged by the server; fold them into the
          // local Set so isFavorite and the favorites count agree with the
          // rest of the SDK.
          this._hydrateFavorites("gallery_image");
          return images;
        })
        .finally(() => { delete this._galleryImagePromises[key]; });

      return this._galleryImagePromises[key];
    },

    // ----------------------------------------------------
    // NEIGHBORHOOD (PUBLIC API)
    //
    // Config arrives free with the map payload, so the host can render the tab,
    // centre the map and draw the category rail before any of this is called:
    //
    //   const { enabled, pageName, center, zoom, categories } =
    //     PynMapSDK.getNeighborhoodConfig();
    //   if (enabled) showNeighborhoodTab(pageName);
    //
    // Content comes from two independent sources, deliberately kept apart:
    //
    //   getNeighborhood()       curated pins the property entered in the CMS.
    //                           One indexed query — effectively instant.
    //   getNeighborhoodPlaces() live Google results. Server-cached for a day,
    //                           so this is cheap even on a cold page.
    //
    // Both item shapes are identical apart from `source` ("curated" | "google"),
    // so they can be concatenated and rendered by one component.
    // ----------------------------------------------------

    /**
     * The property's curated neighborhood pins.
     *
     * Memoised for the life of the page, concurrent calls share one request,
     * and it never throws — any failure resolves to an empty array.
     *
     *   [{
     *     id, title, address, lat, lng,
     *     category,        // stable slug, e.g. "dining" — filter on this
     *     categoryLabel,   // display string, e.g. "Dining"
     *     imageUrl,        // full size; null when the CMS has no photo
     *     thumbUrl,        // list-tile size
     *     distance,        // miles from the property
     *     travelTime,      // CMS free text ("8 min walk"), or null
     *     rating,          // or null — never a misleading 0
     *     source           // "curated"
     *   }]
     *
     * @param {{ force?: boolean }} [opts]
     * @returns {Promise<object[]>}
     */
    async getNeighborhood({ force = false } = {}) {
      if (!force && this._neighborhoodLoaded) return this.data.neighborhood;
      if (this._neighborhoodPromise) return this._neighborhoodPromise;

      // Fired here rather than on every call: reaching the network is what
      // marks a real visit, so re-renders reading the memo cost nothing.
      // 'neighborhood_view' is the name the server maps to the "Neighborhood
      // Page" visited page, so it has to match exactly.
      if (this._analytics) this._captureWithMapType('neighborhood_view');

      this._neighborhoodPromise = this._fetchNeighborhood()
        .then((locations) => {
          this.data.neighborhood   = locations;
          this._neighborhoodLoaded = true;
          return locations;
        })
        .finally(() => { this._neighborhoodPromise = null; });

      return this._neighborhoodPromise;
    },

    /**
     * Live Google places near the property.
     *
     * Called with no argument it returns every category the property enabled,
     * each with its `count` and `places` — one round trip, enough to render the
     * category rail with its badges and then switch tabs with no further
     * network use. Called with a category it returns just that one, fetching it
     * alone if the bulk call has not run.
     *
     * Memoised per category, so switching tabs back and forth is free, and a
     * category that genuinely has nothing nearby is not refetched every time.
     * Never throws.
     *
     *   {
     *     id, title, count,
     *     places: [{ ...same shape as getNeighborhood(), source: "google",
     *                userRatingsTotal, isOpenNow, priceLevel }]
     *   }
     *
     * Place photos come back as URLs on our own host — the Google key stays
     * server-side — and can be used directly as an <img src>.
     *
     * @param {string} [category] slug or CMS label; omit for all categories
     * @param {{ force?: boolean }} [opts]
     * @returns {Promise<object[]|object|null>} all categories, or the one asked for
     */
    async getNeighborhoodPlaces(category, { force = false } = {}) {
      const slug = this._neighborhoodSlug(category);

      return slug ? this._getPlacesCategory(slug, force) : this._getAllPlaces(force);
    },

    /**
     * True when the last places request came back short because the property
     * spent its daily Google budget. Curated pins are unaffected — the host
     * should keep showing them rather than reporting an error.
     *
     * @returns {boolean}
     */
    isNeighborhoodLimited() {
      return this._neighborhoodLimited;
    },

    /** Internal: every category, memoised under the shared "*" promise key. */
    async _getAllPlaces(force) {
      const configured = (this.data.property?.neighborhood?.categories || []).map(c => c.id);
      const allLoaded  = configured.length > 0 && configured.every(id => this._placesLoaded.has(id));

      if (!force && allLoaded) return configured.map(id => this.data.neighborhoodPlaces[id]);
      if (this._placesPromises["*"]) return this._placesPromises["*"];

      this._placesPromises["*"] = this._fetchNeighborhoodPlaces()
        .then(({ categories, limited }) => {
          this._storeNeighborhoodPlaces(categories);
          this._neighborhoodLimited = limited;
          return categories;
        })
        .finally(() => { delete this._placesPromises["*"]; });

      return this._placesPromises["*"];
    },

    /** Internal: one category, memoised under its own slug. */
    async _getPlacesCategory(slug, force) {
      if (!force && this._placesLoaded.has(slug)) return this.data.neighborhoodPlaces[slug] || null;
      if (this._placesPromises[slug]) return this._placesPromises[slug];

      if (this._analytics) this._captureWithMapType('neighborhood_category_view', 'click', { category: slug });

      this._placesPromises[slug] = this._fetchNeighborhoodPlaces(slug)
        .then(({ categories, limited }) => {
          this._storeNeighborhoodPlaces(categories);
          this._neighborhoodLimited = limited;
          return this.data.neighborhoodPlaces[slug] || null;
        })
        .finally(() => { delete this._placesPromises[slug]; });

      return this._placesPromises[slug];
    },

    // ----------------------------------------------------
    // PAGE CONFIG (PUBLIC API)
    //
    // One getter per optional page — Favorites, Gallery, Neighborhood — so a
    // host asks for what it is about to render instead of reaching into
    // getPropertyConfig() and knowing where each block lives:
    //
    //   const { enabled, pageName, count } = PynMapSDK.getFavoritesConfig();
    //   if (enabled) renderFavoritesTab(pageName, count);
    //
    // All three read the map payload, so they are synchronous, cost nothing,
    // and are safe to call on every render. The pages' contents come from
    // getGalleryImages(), getAllFavorites(), and getNeighborhood() respectively.
    // ----------------------------------------------------

    /**
     * Internal: one page's config block off the map payload, with defaults
     * filled in.
     *
     * Two things every caller would otherwise repeat: an object rather than
     * undefined before the payload lands (or against a server old enough not to
     * send the block), and `enabled` as a real boolean rather than whatever the
     * block happens to carry. Everything else the server sends passes straight
     * through, so a new field on a block reaches hosts without a change here.
     */
    _pageConfig(cfg, defaults) {
      if (!cfg) return { ...defaults };
      return { ...defaults, ...cfg, enabled: cfg.enabled !== false };
    },

    /**
     * The Favorites page: its CMS label and visibility, plus how many items are
     * currently favorited.
     *
     *   {
     *     enabled,   // CMS "Show this page" — false hides the page and its tab
     *     pageName,  // CMS "Page Name", verbatim — "MY PICKS" stays "MY PICKS"
     *     count      // badge number: units + amenities + floor plans + images
     *   }
     *
     * enabled/pageName are CMS-driven and change on reload with no deploy.
     *
     * `count` is live, not config — re-call this after saveFavorite /
     * deleteFavorite / clearAllFavorites to refresh a badge. It is already
     * correct on the first read for a returning visitor, since the payload
     * hydrates the favorites before onReady fires. Favorited gallery images
     * join the count only once getGalleryImages() has run, as that collection
     * loads on demand.
     *
     * Defaults to enabled with the label "Favorites" — the same thing the
     * server returns for a property whose CMS page was never opened, so a
     * missing block never costs a host its tab.
     */
    getFavoritesConfig() {
      return {
        ...this._pageConfig(this.data.property?.favorites, { enabled: true, pageName: "Favorites" }),
        count: this._FAVORITE_TYPES.reduce((sum, t) => sum + this._favState(t).set.size, 0)
      };
    },

    /**
     * The Gallery page.
     *
     *   {
     *     enabled,           // CMS gallery switch AND the Pynwheel Touch product toggle
     *     pageName,          // CMS label for the tab
     *     displayOnHomepage,
     *     imageCount         // 0 means the feature is on but nothing is uploaded —
     *                        // check it before offering the entry point
     *   }
     *
     * Defaults to disabled: unlike Favorites, a gallery a host cannot confirm
     * is one it should not advertise. Content comes from getGalleryList()
     * and getGalleryImages().
     */
    getGalleryConfig() {
      return this._pageConfig(this.data.gallery, {
        enabled:           false,
        pageName:          "Gallery",
        displayOnHomepage: false,
        imageCount:        0
      });
    },

    /**
     * The Neighborhood page — everything needed to draw the map and its
     * category rail before any content is fetched.
     *
     *   {
     *     enabled, pageName, displayOnHomepage,
     *     center: { lat, lng }, radius, zoom, address,
     *     listing, categories, locationCount,
     *     placesEnabled      // false when live Google results are off for this
     *                        // property; curated pins may still exist
     *   }
     *
     * Defaults to disabled, for the same reason as the gallery. Curated pins
     * come from getNeighborhood(), live results from getNeighborhoodPlaces().
     */
    getNeighborhoodConfig() {
      return this._pageConfig(this.data.property?.neighborhood, {
        enabled:           false,
        pageName:          "Neighborhood",
        displayOnHomepage: false,
        center:            null,
        radius:            null,
        zoom:              null,
        address:           null,
        listing:           null,
        categories:        [],
        locationCount:     0,
        placesEnabled:     false
      });
    },

    // ----------------------------------------------------
    // FAVORITES (PUBLIC API)
    // ----------------------------------------------------

    /**
     * Returns the stable session UUID stored in localStorage for this property.
     * Use this to build a shareable URL: append ?session_id=<value>&community_id=<id>
     * and pass those values back into the favorites methods on the receiving page.
     *
     * @returns {string}
     */
    getCurrentSessionId() {
      return this._sdkSessionId;
    },

    /**
     * Internal: resolves the local Set, data array, and id key for a favorite
     * "type" ("unit" | "amenity" | "floorplan" | "gallery_image"). Reads the Sets
     * live so it stays correct after re-hydration.
     */
    _favState(type) {
      switch (type) {
        case "amenity":
          return { set: this._favoriteAmenities,  list: this.data.amenities  || [], idKey: "amenityId" };
        case "floorplan":
          return { set: this._favoriteFloorplans, list: this.data.floorplans || [], idKey: "floorplanId" };
        case "gallery_image":
          // Images load one gallery at a time, so this covers every gallery the
          // visitor has opened so far and is empty until the first one arrives.
          return {
            set:   this._favoriteGalleryImages,
            list:  Object.values(this.data.galleryImages || {}).flat(),
            idKey: "id"
          };
        default:
          // Favorites are saved per leasable bedroom, never per door, so on a
          // grouped property this has to be the flat space list — a base unit's
          // id covers only its own bedroom, and hydrating from data.units would
          // drop every favorite saved on one of the others.
          return { set: this._favorites,          list: this._favouritableUnits(), idKey: "unitId" };
      }
    },

    // Every unit a visitor can favorite: the plotted units on a flat property,
    // the individual bedrooms on a grouped one.
    _favouritableUnits() {
      const units = this.data.units || [];
      if (!this.isGroupedProperty()) return units;

      // Reads `spaces` straight off each door rather than going through
      // getUnitSpaces: hydration only looks at unitId and isFavorite, so
      // rebuilding every bedroom with its door's position would allocate a copy
      // of the whole payload to read two fields.
      return units.reduce(
        (out, u) => out.concat(Array.isArray(u.spaces) ? u.spaces : [u]),
        []
      );
    },

    // A unit's bedrooms, or the unit itself when it has none. Note the explicit
    // length check: getUnitSpaces returns [] for an ungrouped unit, and [] is
    // truthy, so a `||` fallback here would silently drop the unit entirely.
    _spacesOrSelf(unit) {
      const spaces = this.getUnitSpaces(unit.unitId);
      return spaces.length ? spaces : [unit];
    },

    // Every favouritable collection, in the order the favorites screen lists them.
    _FAVORITE_TYPES: ["unit", "amenity", "floorplan", "gallery_image"],

    /**
     * Internal: rebuild one favorite Set from the isFavorite flags the server
     * already stamped on each item, so local state matches the payload without a
     * second request. Mutates the existing Set rather than replacing it, since
     * _favState hands out live references.
     */
    _hydrateFavorites(type) {
      const { set, list, idKey } = this._favState(type);
      set.clear();
      list.forEach(item => { if (item.isFavorite) set.add(String(item[idKey])); });
    },

    /**
     * Internal: emit a favorites analytics event.
     *
     * The names below are ones the server already recognises — 'save_favorite'
     * becomes the save_favorite_click key that INTERACTION_EVENTS counts, and
     * 'view_favorites' maps to the "Favorites page" visited-page entry — so they
     * must stay exactly as written.
     *
     * Metadata is scalars only: the analytics sanitiser silently drops arrays,
     * which is why the ids go over as a joined string.
     */
    _captureFavorite(name, favoriteType, ids) {
      if (!this._analytics) return;

      const meta = {};
      if (favoriteType) meta.favorite_type = favoriteType;
      if (ids?.length) {
        meta.favorite_ids   = ids.join(",");
        meta.favorite_count = ids.length;
      }

      this._captureWithMapType(name, "click", meta);
    },

    /**
     * Fetches the full objects for the favorited items of the given
     * community + session.  Pass your own communityId / sessionId to see your
     * own favorites, or a shared pair to display someone else's saved list.
     *
     * By default returns favorited units. Pass type "amenity" or "floorplan"
     * to get that collection instead.
     *
     * @param {string|number} communityId
     * @param {string}        sessionId
     * @param {"unit"|"amenity"|"floorplan"|"gallery_image"} [type="unit"]
     * @returns {Promise<object[]>}
     */
    async getFavorites(communityId, sessionId, type = "unit") {
      const all = await this.getAllFavorites(communityId, sessionId);
      if (type === "amenity")       return all.amenities;
      if (type === "floorplan")     return all.floorplans;
      if (type === "gallery_image") return all.galleryImages;
      return all.units;
    },

    /**
     * Fetches every favorited collection for the given community + session in a
     * single request.
     *
     * @param {string|number} communityId
     * @param {string}        sessionId
     * @returns {Promise<{units: object[], amenities: object[], floorplans: object[], galleryImages: object[]}>}
     */
    async getAllFavorites(communityId, sessionId) {
      const empty = { units: [], amenities: [], floorplans: [], galleryImages: [] };

      // Fired up front: opening the favorites screen is the visit, whether or
      // not the request behind it succeeds.
      this._captureFavorite("view_favorites");

      try {
        const mapTypeParam = this.config.mapType === "ops" ? "?map_type=ops" : "";
        const res = await this._authorizedFetch(`${this._apiBase()}/api/partner/maps/get_favorites${mapTypeParam}`, {
          headers: {
            "X-SDK-Session-Id": sessionId || this._sdkSessionId,
            "X-Community-Id":   String(communityId)
          }
        });
        if (!res.ok) return empty;
        const data = await res.json();
        return {
          units:         data.units          || [],
          amenities:     data.amenities      || [],
          floorplans:    data.floorplans     || [],
          galleryImages: data.gallery_images || []
        };
      } catch {
        return empty;
      }
    },

    /**
     * Removes ALL favorited items — units, amenities, floorplans, and gallery
     * images — for the given community + session in one shot. Clears every local Set, resets
     * isFavorite on all objects, and fires onFavoriteChange when the server
     * confirms (once per type that had favorites).
     *
     * @param {string|number} communityId
     * @param {string}        sessionId
     * @returns {Promise<{success: boolean}>}
     */
    async clearAllFavorites(communityId, sessionId) {
      try {
        const res = await this._authorizedFetch(`${this._apiBase()}/api/partner/maps/clear_all_favorites`, {
          method: "DELETE",
          headers: {
            "X-SDK-Session-Id": sessionId || this._sdkSessionId,
            "X-Community-Id":   String(communityId)
          }
        });

        if (!res.ok) return { success: false };

        this._captureFavorite("clear_favorites");

        this._FAVORITE_TYPES.forEach(type => {
          const { set, list } = this._favState(type);
          if (set.size === 0) return;
          set.clear();
          list.forEach(item => { item.isFavorite = false; });
          if (this.config.onFavoriteChange) {
            this.config.onFavoriteChange([], "cleared", [], type);
          }
        });

        return { success: true };
      } catch {
        return { success: false };
      }
    },

    /**
     * Save one or more items as favorites for the given community and session.
     * Accepts a single ID or an array of IDs.
     * Updates the local Set and fires onFavoriteChange when the server confirms.
     *
     * @param {number|string|Array<number|string>} itemIds
     * @param {string|number} communityId
     * @param {string}        sessionId
     * @param {"unit"|"amenity"|"floorplan"|"gallery_image"} [type="unit"]
     * @returns {Promise<{success: boolean, ids: string[], unit_ids: string[]}>}
     */
    async saveFavorite(itemIds, communityId, sessionId, type = "unit") {
      const { set, list, idKey } = this._favState(type);
      const ids = (Array.isArray(itemIds) ? itemIds : [itemIds]).map(String);

      const body = new URLSearchParams();
      ids.forEach(id => body.append("ids[]", id));
      body.append("type", type);

      try {
        const res = await this._authorizedFetch(`${this._apiBase()}/api/partner/maps/save_favorites`, {
          method: "POST",
          headers: {
            "X-SDK-Session-Id": sessionId || this._sdkSessionId,
            "X-Community-Id":   String(communityId),
            "Content-Type":     "application/x-www-form-urlencoded"
          },
          body
        });

        if (!res.ok) return { success: false, ids: [...set], unit_ids: [...set] };

        const data = await res.json();

        ids.forEach(id => {
          set.add(id);
          const item = list.find(x => String(x[idKey]) === id);
          if (item) item.isFavorite = true;
        });

        this._captureFavorite("save_favorite", type, ids);

        if (this.config.onFavoriteChange) {
          this.config.onFavoriteChange(ids, "saved", [...set], type);
        }

        const resolved = data.ids || data.unit_ids || [...set];
        return { success: true, ids: resolved, unit_ids: resolved };
      } catch {
        return { success: false, ids: [...set], unit_ids: [...set] };
      }
    },

    /**
     * Remove one or more items from favorites for the given community + session.
     * Accepts a single ID or an array of IDs.
     * Updates the local Set and fires onFavoriteChange when the server confirms.
     *
     * @param {number|string|Array<number|string>} itemIds
     * @param {string|number} communityId
     * @param {string}        sessionId
     * @param {"unit"|"amenity"|"floorplan"|"gallery_image"} [type="unit"]
     * @returns {Promise<{success: boolean, ids: string[], unit_ids: string[]}>}
     */
    async deleteFavorite(itemIds, communityId, sessionId, type = "unit") {
      const { set, list, idKey } = this._favState(type);
      const ids = (Array.isArray(itemIds) ? itemIds : [itemIds]).map(String);

      const body = new URLSearchParams();
      ids.forEach(id => body.append("ids[]", id));
      body.append("type", type);

      try {
        const res = await this._authorizedFetch(`${this._apiBase()}/api/partner/maps/delete_favorites`, {
          method: "DELETE",
          headers: {
            "X-SDK-Session-Id": sessionId || this._sdkSessionId,
            "X-Community-Id":   String(communityId),
            "Content-Type":     "application/x-www-form-urlencoded"
          },
          body
        });

        if (!res.ok) return { success: false, ids: [...set], unit_ids: [...set] };

        const data = await res.json();

        ids.forEach(id => {
          set.delete(id);
          const item = list.find(x => String(x[idKey]) === id);
          if (item) item.isFavorite = false;
        });

        this._captureFavorite("remove_favorite", type, ids);

        if (this.config.onFavoriteChange) {
          this.config.onFavoriteChange(ids, "deleted", [...set], type);
        }

        const resolved = data.ids || data.unit_ids || [...set];
        return { success: true, ids: resolved, unit_ids: resolved };
      } catch {
        return { success: false, ids: [...set], unit_ids: [...set] };
      }
    },

    /**
     * Sends a branded favorites email to the given address.
     * The backend fills in property name, logo, address, tour / apply links
     * from the session token — only the recipient email and favorites URL are
     * required from the caller.
     *
     * @param {string} userEmail    - Recipient email address
     * @param {string} favoritesUrl - Shareable URL pointing to the favorites list
     * @returns {Promise<{success: boolean, message: string}>}
     */
    async shareFavoritesEmail(userEmail, favoritesUrl) {
      const body = new URLSearchParams();
      body.append("email", userEmail);
      body.append("favorites_url", favoritesUrl);

      try {
        const res = await this._authorizedFetch(`${this._apiBase()}/api/partner/maps/share_favorites_email`, {
          method: "POST",
          headers: {
            "X-SDK-Session-Id": this._sdkSessionId,
            "Content-Type":     "application/x-www-form-urlencoded"
          },
          body
        });

        const data = await res.json();
        if (!res.ok) return { success: false, message: data.message || "Failed to send email." };

        this._captureFavorite("share_email");

        return { success: true, message: data.message || "Email sent successfully." };
      } catch {
        return { success: false, message: "Network error. Please try again." };
      }
    },

    // ─────────────────────────────────────────────────────────────────────────
    // IMAGE MAP SUBSYSTEM
    // Used when data.property.map.enableSvgMode === false.
    // Renders a raster image (PNG/JPG) and overlays absolutely-positioned
    // pin markers at (x_plot, y_plot) coordinates stored per unit/amenity.
    // Mirrors the behaviour of webpages.js for the old 2D image map.
    // ─────────────────────────────────────────────────────────────────────────

    _isImageMapMode() {
      return this.data.property?.map?.enableSvgMode === false;
    },

    // Load Font Awesome 5 CSS (needed for fas fa-map-marker-alt and fas fa-camera-retro).
    _loadFontAwesome() {
      return new Promise(resolve => {
        const FA = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css";
        if (document.querySelector(`link[href="${FA}"]`)) return resolve();
        const l = document.createElement("link");
        l.rel  = "stylesheet";
        l.href = FA;
        l.onload = resolve;
        l.onerror = resolve;
        document.head.appendChild(l);
      });
    },

    // Inject a single scoped <style> block for marker sizing via CSS custom properties.
    // All size values are driven by --pyn-pin-size / --pyn-cam-size on this.container.
    // Setting those two properties on resize is all that's needed — no per-marker DOM walk.
    _injectMarkerStyles() {
      if (document.getElementById("pyn-img-marker-styles")) return;
      const s = document.createElement("style");
      s.id = "pyn-img-marker-styles";
      s.textContent = [
        `.pyn-img-wrapper .pyn-unit-marker   { font-size: var(--pyn-pin-size, 24px); line-height: 1; }`,
        `.pyn-img-wrapper .pyn-marker-badge  { font-size: calc(var(--pyn-pin-size, 24px) * 0.3); }`,
        `.pyn-img-wrapper .pyn-camera-icon   { width: var(--pyn-cam-size, 15px); height: var(--pyn-cam-size, 15px); }`,
        `.pyn-img-wrapper .pyn-camera-icon i { font-size: calc(var(--pyn-cam-size, 20px) * 0.48); }`,
      ].join("\n");
      document.head.appendChild(s);
    },

    // Compute and apply --pyn-pin-size / --pyn-cam-size to the container.
    // Scale is a continuous function of container width against a 900px reference — no breakpoint jumps.
    _updateMarkerSizeVars() {
      const basePinPx  = parseFloat(this.data.property?.markerConfig?.unit_marker_font_size) || 24;
      const baseCamPx  = Math.round(basePinPx * 0.64);        // ~15px at default 24
      const containerW = this.container.offsetWidth || 900;
      const scale      = Math.min(1.0, Math.max(0.5, containerW / 900));
      const pinPx      = Math.max(14, Math.round(basePinPx * scale));
      const camPx      = Math.max(11, Math.round(baseCamPx * scale));
      this.container.style.setProperty("--pyn-pin-size", `${pinPx}px`);
      this.container.style.setProperty("--pyn-cam-size", `${camPx}px`);
    },

    // Boot sequence for image map mode.
    async _bootImageMap() {
      this._imgMapMode = true;
      this._updateCurrentMapType();
      this._injectMarkerStyles();
      this._renderImageMaps();
      this._bindImageMapEvents();

      const defaultFloor = this.config.floor ?? this.data.property?.map?.defaultFloor;
      if (defaultFloor != null) {
        this._imageMapChangeFloor(String(defaultFloor));
      } else {
        const id = this._getDefaultImageMapId();
        if (id) this._imageMapShowById(id);
      }

      if (this.config.enable3DMap && this.config.show3DMap) {
        this.switchTo3DMap();
      }

      this.config.onReady?.();
    },

    _getDefaultImageMapId() {
      if (this.data.floorplates.length > 0) return String(this.data.floorplates[0].mapId);
      if (this.data.sitemap) return String(this.data.sitemap.mapId);
      return null;
    },

    // Build one wrapper div per floorplate/sitemap. All hidden; _imageMapShowById reveals one.
    _renderImageMaps() {
      const c = this.container;
      c.innerHTML = "";
      c.style.position = "relative";
      c.style.overflow = "hidden";

      const maps = this.data.sitemap
        ? [{ mapId: String(this.data.sitemap.mapId), imageUrl: this.data.sitemap.imageUrl, imageWidth: this.data.sitemap.imageWidth, imageHeight: this.data.sitemap.imageHeight }]
        : (this.data.floorplates || []).map(fp => ({ mapId: String(fp.mapId), imageUrl: fp.imageUrl, imageWidth: fp.imageWidth, imageHeight: fp.imageHeight }));

      maps.forEach(m => {
        const wrapper = document.createElement("div");
        wrapper.className   = "pyn-img-wrapper";
        wrapper.dataset.imageMapId = m.mapId;
        Object.assign(wrapper.style, {
          position:    "relative",
          display:     "none",
          width:       "100%",
          height:      "100%",
          userSelect:  "none",
          touchAction: "none"
        });

        const img = document.createElement("img");
        img.className             = "pyn-map-image";
        img.src                   = m.imageUrl || "";
        img.dataset.actualWidth   = m.imageWidth  || 0;
        img.dataset.actualHeight  = m.imageHeight || 0;
        // Contain + center: scale the image as large as it fits within the
        // container on both axes (preserving aspect ratio) and center it, so
        // there's no top/bottom or left/right cropping.
        Object.assign(img.style, {
          display:       "block",
          position:      "absolute",
          top:           "50%",
          left:          "50%",
          transform:     "translate(-50%, -50%)",
          maxWidth:      "100%",
          maxHeight:     "100%",
          width:         "auto",
          height:        "auto",
          pointerEvents: "none",
          userSelect:    "none"
        });

        const mc = document.createElement("div");
        mc.className = "pyn-markers-container";
        // Spans the full container area; each marker is positioned in this
        // coordinate space using the contain scale + centering offset computed
        // in _adjustMarkersPositionForMapId, so they overlay the centered image.
        Object.assign(mc.style, {
          position:      "absolute",
          top:           "0",
          left:          "0",
          width:         "100%",
          height:        "100%",
          overflow:      "visible",
          pointerEvents: "none"
        });

        wrapper.appendChild(img);
        wrapper.appendChild(mc);
        c.appendChild(wrapper);

        // Render markers once the image dimensions are known.
        img.addEventListener("load", () => {
          this._renderMarkersForMapId(m.mapId);
          this._adjustMarkersPositionForMapId(m.mapId);
          this._enableImageMapPanZoom(wrapper);
        });

        if (img.complete && img.naturalWidth > 0) img.dispatchEvent(new Event("load"));
      });

      if (this.config.showZoomControls) this._renderZoomControls();
    },

    // Show one wrapper, hide all others; track as active.
    _imageMapShowById(mapId) {
      const id = String(mapId);
      this._imgActiveMapId = id;
      this.container.querySelectorAll(".pyn-img-wrapper").forEach(w => {
        w.style.display = w.dataset.imageMapId === id ? "block" : "none";
      });
    },

    // Floor switch: find the floorplate and show its wrapper.
    _imageMapChangeFloor(floorNumber) {
      if (!this.data.floorplates.length && this.data.sitemap) {
        this._imageMapShowById(String(this.data.sitemap.mapId));
        return;
      }
      const fp = this._findFloorplateByFloor(floorNumber);
      if (!fp) return;
      const id = String(fp.mapId);
      this._imageMapShowById(id);
      // Render markers now if they were deferred (wrapper was hidden on first load).
      const wrapper = this.container.querySelector(`[data-image-map-id="${id}"]`);
      if (!wrapper) return;
      const mc = wrapper.querySelector(".pyn-markers-container");
      if (mc && mc.children.length === 0) {
        this._renderMarkersForMapId(id);
        this._adjustMarkersPositionForMapId(id);
      }
    },

    // Render unit + amenity markers into the markers-container of one map.
    _renderMarkersForMapId(mapId) {
      const id      = String(mapId);
      const wrapper = this.container.querySelector(`[data-image-map-id="${id}"]`);
      if (!wrapper) return;
      const mc = wrapper.querySelector(".pyn-markers-container");
      if (!mc) return;

      const units     = this._imgUnitsForMap(id);
      const amenities = this._imgAmenitiesForMap(id);

      mc.innerHTML = this._buildUnitMarkersHTML(units) + this._buildAmenityMarkersHTML(amenities);
    },

    // Units belonging to a given map with a non-zero plot coordinate.
    _imgUnitsForMap(mapId) {
      return (this.data.units || []).filter(u =>
        String(u.mapId) === String(mapId) && (u.x_plot > 0 || u.y_plot > 0)
      );
    },

    // Amenities belonging to a given map.
    _imgAmenitiesForMap(mapId) {
      const isSitemap = !!this.data.sitemap && String(this.data.sitemap.mapId) === String(mapId);
      return (this.data.amenities || []).filter(a => {
        if (!(a.x_plot > 0 || a.y_plot > 0)) return false;
        // Sitemap amenities have no floorplateId; floorplate amenities have one.
        if (isSitemap) return !a.floorplateId;
        return String(a.floorplateId) === String(mapId);
      });
    },

    // Build HTML for all unit markers, grouping overlapping coords into one marker with a badge.
    // Font-size is NOT set inline — it's driven by --pyn-pin-size CSS variable (see _injectMarkerStyles).
    _buildUnitMarkersHTML(units) {
      // Group by coordinate key to detect overlapping units.
      const groups = {};
      units.forEach(unit => {
        const key = `${unit.x_plot}-${unit.y_plot}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(unit);
      });

      return Object.values(groups).map(group => {
        const rep      = group[0];
        // The badge says how many leasable things sit under this pin. On a
        // grouped property the co-plotted bedrooms have already been rolled into
        // one entry server-side, so the coordinate collision is gone and the
        // apartment's own spaceCount is what the number has to come from —
        // otherwise every student-housing pin would silently lose its badge.
        const count    = group.length > 1 ? group.length : (rep.spaceCount || 1);
        const color    = this._unitColor(rep);
        const unitIds  = group.map(u => u.unitId).join(",");
        const dataJson = JSON.stringify(rep).replace(/'/g, "&#39;");

        return `<div
          class="pyn-unit-marker${count > 1 ? " pyn-overlapping" : ""}"
          data-x-plot="${rep.x_plot}"
          data-y-plot="${rep.y_plot}"
          data-unit-id="${rep.unitId}"
          data-unit-ids="${unitIds}"
          data-unit-json='${dataJson}'
          style="position:absolute;left:${rep.x_plot}px;top:${rep.y_plot}px;transform:translate(-50%,-100%);cursor:pointer;pointer-events:all;z-index:10;"
        ><i class="fas fa-map-marker-alt" style="color:${color};pointer-events:none;"></i>${count > 1 ? `<span class="pyn-marker-badge" style="position:absolute;top:4px;left:50%;transform:translateX(-50%);color:white;font-weight:bold;pointer-events:none;">${count}</span>` : ""}</div>`;
      }).join("");
    },

    // Build HTML for all amenity markers.
    _buildAmenityMarkersHTML(amenities) {
      return amenities.map(a => {
        const cfg   = a.colorConfig || {};
        const color = this._hexToRgba(cfg.color || "#888888", cfg.opacity ?? 1);
        const aJson = JSON.stringify(a).replace(/'/g, "&#39;");

        return `<div
          class="pyn-amenity-marker"
          data-amenity-id="${a.amenityId}"
          data-x-plot="${a.x_plot}"
          data-y-plot="${a.y_plot}"
          data-floor="${a.floor || ""}"
          data-amenity-json='${aJson}'
          style="position:absolute;left:${a.x_plot}px;top:${a.y_plot}px;transform:translate(-50%,-50%);cursor:pointer;pointer-events:all;z-index:9;"
        ><span class="pyn-camera-icon" style="display:inline-flex;align-items:center;justify-content:center;border-radius:50%;background:white;border:2px solid ${color};box-shadow:0 1px 3px rgba(0,0,0,0.3);"><i class="fas fa-camera-retro" style="color:${color};pointer-events:none;"></i></span></div>`;
      }).join("");
    },

    // Scale all marker positions from original-image-pixel space to the
    // displayed (contained + centered) image, in the markers-container's
    // coordinate space (which spans the full container area).
    // Called after image load and on resize.
    //
    // Plot coords were authored against the original image (actualWidth ×
    // actualHeight). The image is rendered "contain": scaled by the smaller of
    // the width/height ratios so it fits within the area on both axes while
    // keeping its aspect ratio, then centered (letterbox margins on the
    // unconstrained axis). A marker therefore lands at:
    //   offset + plot * scale
    // where scale and offset are derived from the original image dimensions and
    // the rendered area — never from the image element's own box, so this stays
    // correct even when the wrapper is momentarily hidden during init.
    _adjustMarkersPositionForMapId(mapId) {
      const id      = String(mapId);
      const wrapper = this.container.querySelector(`[data-image-map-id="${id}"]`);
      if (!wrapper) return;

      const img = wrapper.querySelector("img.pyn-map-image");
      if (!img) return;

      const actualW = parseFloat(img.dataset.actualWidth)  || img.naturalWidth  || 0;
      const actualH = parseFloat(img.dataset.actualHeight) || img.naturalHeight || 0;
      if (!actualW || !actualH) return;

      // Rendered map area = the image's containing block (the wrapper, which is
      // 100% × 100% of the container). Fall back to the container itself if the
      // wrapper is hidden (clientWidth 0) at the moment this runs.
      const areaW = wrapper.clientWidth  || this.container.clientWidth  || 0;
      const areaH = wrapper.clientHeight || this.container.clientHeight || 0;
      if (!areaW || !areaH) return;

      // Contain scale + centering offset (matches the image's CSS sizing).
      const scale   = Math.min(areaW / actualW, areaH / actualH);
      const offsetX = (areaW - actualW * scale) / 2;
      const offsetY = (areaH - actualH * scale) / 2;

      const place = (m) => {
        const xp = parseFloat(m.dataset.xPlot);
        const yp = parseFloat(m.dataset.yPlot);
        m.style.left = `${offsetX + xp * scale}px`;
        m.style.top  = `${offsetY + yp * scale}px`;
      };

      wrapper.querySelectorAll(".pyn-unit-marker").forEach(place);
      wrapper.querySelectorAll(".pyn-amenity-marker").forEach(place);

      // Update CSS size variables — O(1), no per-marker DOM work needed.
      this._updateMarkerSizeVars();
    },

    // Apply panzoom to the image wrapper so the image + markers pan/zoom together.
    _enableImageMapPanZoom(wrapperEl) {
      if (!window.panzoom) return;
      if (wrapperEl._pz) { try { wrapperEl._pz.dispose(); } catch {} }

      if (wrapperEl._pzTouchBlocker) {
        wrapperEl.removeEventListener("touchmove", wrapperEl._pzTouchBlocker, true);
        wrapperEl._pzTouchBlocker = null;
      }

      wrapperEl.style.touchAction = "none";
      wrapperEl._pz = panzoom(wrapperEl, {
        minZoom:         1,   // can't zoom below the default view
        maxZoom:         10,
        filterKey:       () => false,
        beforeMouseDown: () => (wrapperEl._pz ? wrapperEl._pz.getTransform().scale <= 1.01 : true),
      });

      // Clamp so the image content always covers the container — no background gaps.
      let _imgClamping = false;
      const imgClamp = () => {
        if (_imgClamping) return;
        const pz = wrapperEl._pz;
        if (!pz) return;
        const t  = pz.getTransform();
        const pr = wrapperEl.parentElement;
        if (!pr) return;
        const cw = pr.clientWidth;
        const ch = pr.clientHeight;

        if (t.scale <= 1.01) {
          if (Math.abs(t.x) > 0.5 || Math.abs(t.y) > 0.5) {
            _imgClamping = true;
            pz.moveTo(0, 0);
            _imgClamping = false;
          }
          return;
        }

        // Image is contained and centered within the wrapper. Use its actual
        // rendered size and account for the centering offset ((container - image)/2)
        // so the cover bounds keep the image edges flush with the container.
        const img = wrapperEl.querySelector(".pyn-map-image");
        const iw  = img && img.clientWidth  > 0 ? img.clientWidth  : cw;
        const ih  = img && img.clientHeight > 0 ? img.clientHeight : ch;

        const maxX = -t.scale * (cw - iw) / 2;
        const minX = cw - t.scale * (cw + iw) / 2;
        const maxY = -t.scale * (ch - ih) / 2;
        const minY = ch - t.scale * (ch + ih) / 2;

        const x = minX > maxX ? (minX + maxX) / 2 : Math.min(maxX, Math.max(minX, t.x));
        const y = minY > maxY ? (minY + maxY) / 2 : Math.min(maxY, Math.max(minY, t.y));

        if (Math.abs(x - t.x) > 0.5 || Math.abs(y - t.y) > 0.5) {
          _imgClamping = true;
          pz.moveTo(x, y);
          _imgClamping = false;
        }
      };
      // wrapperEl._pz.on("pan",  imgClamp);
      wrapperEl._pz.on("zoom", imgClamp);

      const touchBlocker = (e) => {
        const scale = wrapperEl._pz ? wrapperEl._pz.getTransform().scale : 1;
        if (scale <= 1.01 && e.touches.length === 1) {
          e.stopImmediatePropagation();
        }
      };
      wrapperEl.addEventListener("touchmove", touchBlocker, { capture: true, passive: false });
      wrapperEl._pzTouchBlocker = touchBlocker;
    },

    _getActiveImageWrapper() {
      if (!this._imgActiveMapId) return null;
      return this.container.querySelector(`[data-image-map-id="${this._imgActiveMapId}"]`);
    },

    // Bind click, hover and touch events on the container (delegated).
    _bindImageMapEvents() {
      // Unit marker click. A badged marker stands for several co-plotted units, but
      // onUnitClick always reports exactly one unit — its representative, the same one
      // hover and touch report. Consumers resolve the rest of the group from
      // getUnits() by plot coordinate; handing them an array here instead would make
      // the callback's payload depend on how many units happen to share a pixel.
      this.container.addEventListener("click", e => {
        const marker = e.target.closest(".pyn-unit-marker");
        if (!marker || marker.style.display === "none") return;
        try {
          const unit = JSON.parse(marker.dataset.unitJson || "null");
          if (unit && this.config.onUnitClick) this.config.onUnitClick(unit);
        } catch {}
      });

      // Unit marker hover — visual highlight + callback
      this.container.addEventListener("mouseover", e => {
        const marker = e.target.closest(".pyn-unit-marker");
        if (!marker || marker.style.display === "none") return;
        marker.style.filter = "brightness(1.25) drop-shadow(0 2px 4px rgba(0,0,0,0.4))";
        try {
          const unit = JSON.parse(marker.dataset.unitJson || "null");
          if (unit && this.config.onUnitHover) this.config.onUnitHover(unit);
        } catch {}
      });

      this.container.addEventListener("mouseout", e => {
        const marker = e.target.closest(".pyn-unit-marker");
        if (!marker) return;
        marker.style.filter = "";
      });

      // Touch tap on unit markers
      let _imgTouch = null;
      this.container.addEventListener("touchstart", e => {
        if (e.touches.length !== 1) { _imgTouch = null; return; }
        const t = e.touches[0];
        _imgTouch = { x: t.clientX, y: t.clientY, time: Date.now(), target: t.target };
      }, { passive: true });

      // Touch tap — handles both unit markers and amenity markers in one listener
      this.container.addEventListener("touchend", e => {
        if (!_imgTouch) return;
        const t  = e.changedTouches[0];
        const dx = t.clientX - _imgTouch.x;
        const dy = t.clientY - _imgTouch.y;
        const wasTap = Math.sqrt(dx * dx + dy * dy) < 8 && (Date.now() - _imgTouch.time) < 300;
        const target = _imgTouch.target;
        _imgTouch = null;
        if (!wasTap) return;
        const marker = target.closest(".pyn-unit-marker");
        if (marker && marker.style.display !== "none") {
          try {
            const unit = JSON.parse(marker.dataset.unitJson || "null");
            if (unit && this.config.onUnitClick) this.config.onUnitClick(unit);
          } catch {}
          return;
        }
        const am = target.closest(".pyn-amenity-marker");
        if (am) {
          try {
            const amenity = JSON.parse(am.dataset.amenityJson || "null");
            if (amenity) {
              if (this._analytics) this._captureWithMapType('amenity_marker', 'click', { marker_id: String(amenity.amenityId || '') });
              if (this.config.onAmenityClick) this.config.onAmenityClick(amenity);
            }
          } catch {}
        }
      }, { passive: true });

      // Amenity click
      this.container.addEventListener("click", e => {
        const am = e.target.closest(".pyn-amenity-marker");
        if (!am) return;
        try {
          const amenity = JSON.parse(am.dataset.amenityJson || "null");
          if (amenity) {
            if (this._analytics) this._captureWithMapType('amenity_marker', 'click', { marker_id: String(amenity.amenityId || '') });
            if (this.config.onAmenityClick) this.config.onAmenityClick(amenity);
          }
        } catch {}
      });

      // Amenity hover
      this.container.addEventListener("mouseover", e => {
        const am = e.target.closest(".pyn-amenity-marker");
        if (!am) return;
        try {
          const amenity = JSON.parse(am.dataset.amenityJson || "null");
          if (amenity) {
            if (this._analytics) this._captureWithMapType('amenity_marker', 'hover', { marker_id: String(amenity.amenityId || '') });
            if (this.config.onAmenityHover) this.config.onAmenityHover(amenity);
          }
        } catch {}
      });

      // Recalculate marker positions on container resize.
      if (typeof ResizeObserver !== "undefined") {
        const ro = new ResizeObserver(() => {
          if (this._imgActiveMapId) this._adjustMarkersPositionForMapId(this._imgActiveMapId);
        });
        ro.observe(this.container);
      }
    },

    // Show only the supplied unit IDs; completely hide all others.
    _imageMapHighlightUnits(unitIds) {
      if (!this._imgActiveMapId) return;
      const wrapper = this.container.querySelector(`[data-image-map-id="${this._imgActiveMapId}"]`);
      if (!wrapper) return;
      const idSet = new Set(unitIds.map(String));
      wrapper.querySelectorAll(".pyn-unit-marker").forEach(m => {
        const ids = (m.dataset.unitIds || m.dataset.unitId || "").split(",");
        m.style.display = ids.some(id => idSet.has(id)) ? "" : "none";
      });
    },

    // ─── END IMAGE MAP SUBSYSTEM ──────────────────────────────────────────────

    _apiBase() {
      if (this.config.environment === "staging")
        return "https://pynwheel-staging.herokuapp.com";
      if (this.config.environment === "local")
        return "http://localhost:3000";
      return "https://pynwheelconnect.com";
    }
  };

  // ----------------------------------------------------
  // GLOBAL EXPOSED API
  // Only public methods are on window.PynMapSDK.
  // Internal state (including _sessionToken) is in the IIFE closure.
  // ----------------------------------------------------
  if (!global.PynMapSDK) {
    global.PynMapSDK = {
      init(cfg)                    { return PynMapSDK.init.call(PynMapSDK, cfg); },
      getPropertyConfig()          { return PynMapSDK.getPropertyConfig.call(PynMapSDK); },
      highlightUnits(unitIds)      { return PynMapSDK.highlightUnits.call(PynMapSDK, unitIds); },
      changeMap(mapId)             { return PynMapSDK.changeMap.call(PynMapSDK, mapId); },
      changeFloor(floorNumber)     { return PynMapSDK.changeFloor.call(PynMapSDK, floorNumber); },
      getFloors()                  { return PynMapSDK.getFloors.call(PynMapSDK); },
      getFloorplans()              { return PynMapSDK.getFloorplans.call(PynMapSDK); },
      getAmenities()               { return PynMapSDK.getAmenities.call(PynMapSDK); },
      getUnits(filters, options)   { return PynMapSDK.getUnits.call(PynMapSDK, filters, options); },
      isGroupedProperty()          { return PynMapSDK.isGroupedProperty.call(PynMapSDK); },
      getUnitSpaces(unitId)        { return PynMapSDK.getUnitSpaces.call(PynMapSDK, unitId); },
      getBaseUnit(unitId)          { return PynMapSDK.getBaseUnit.call(PynMapSDK, unitId); },
      hasSpaceConfig()             { return PynMapSDK.hasSpaceConfig.call(PynMapSDK); },
      getFloorplanSpaceConfig(fpId){ return PynMapSDK.getFloorplanSpaceConfig.call(PynMapSDK, fpId); },
      getSpaceLetters(fpId)        { return PynMapSDK.getSpaceLetters.call(PynMapSDK, fpId); },
      getFiltersData()             { return PynMapSDK.getFiltersData.call(PynMapSDK); },
      getGalleryList(opts)                  { return PynMapSDK.getGalleryList.call(PynMapSDK, opts); },
      getGalleryImages(galleryId, opts)     { return PynMapSDK.getGalleryImages.call(PynMapSDK, galleryId, opts); },
      getNeighborhood(opts)                 { return PynMapSDK.getNeighborhood.call(PynMapSDK, opts); },
      getNeighborhoodPlaces(category, opts) { return PynMapSDK.getNeighborhoodPlaces.call(PynMapSDK, category, opts); },
      isNeighborhoodLimited()               { return PynMapSDK.isNeighborhoodLimited.call(PynMapSDK); },
      selectUnit(unitId, colorCode){ return PynMapSDK.selectUnit.call(PynMapSDK, unitId, colorCode); },
      unselectUnit(unitId)         { return PynMapSDK.unselectUnit.call(PynMapSDK, unitId); },
      zoomIn()                     { return PynMapSDK.zoomIn.call(PynMapSDK); },
      zoomOut()                    { return PynMapSDK.zoomOut.call(PynMapSDK); },
      resetZoom()                  { return PynMapSDK.resetZoom.call(PynMapSDK); },
      getFavoritesConfig()                                  { return PynMapSDK.getFavoritesConfig.call(PynMapSDK); },
      getGalleryConfig()                                    { return PynMapSDK.getGalleryConfig.call(PynMapSDK); },
      getNeighborhoodConfig()                               { return PynMapSDK.getNeighborhoodConfig.call(PynMapSDK); },
      getCurrentSessionId()                                 { return PynMapSDK.getCurrentSessionId.call(PynMapSDK); },
      getFavorites(communityId, sessionId, type)            { return PynMapSDK.getFavorites.call(PynMapSDK, communityId, sessionId, type); },
      getAllFavorites(communityId, sessionId)               { return PynMapSDK.getAllFavorites.call(PynMapSDK, communityId, sessionId); },
      saveFavorite(itemIds, communityId, sessionId, type)   { return PynMapSDK.saveFavorite.call(PynMapSDK, itemIds, communityId, sessionId, type); },
      deleteFavorite(itemIds, communityId, sessionId, type) { return PynMapSDK.deleteFavorite.call(PynMapSDK, itemIds, communityId, sessionId, type); },
      clearAllFavorites(communityId, sessionId)             { return PynMapSDK.clearAllFavorites.call(PynMapSDK, communityId, sessionId); },
      shareFavoritesEmail(userEmail, favoritesUrl)          { return PynMapSDK.shareFavoritesEmail.call(PynMapSDK, userEmail, favoritesUrl); },
      onFloorplanHover(floorplanId){ return PynMapSDK.onFloorplanHover.call(PynMapSDK, floorplanId); },
      offFloorplanHover()          { return PynMapSDK.offFloorplanHover.call(PynMapSDK); },
      setExpandedMode(expanded)    { return PynMapSDK.setExpandedMode.call(PynMapSDK, expanded); },
      switchTo3DMap()              { return PynMapSDK.switchTo3DMap.call(PynMapSDK); },
      switchTo2DMap()              { return PynMapSDK.switchTo2DMap.call(PynMapSDK); },
      capture(name, type, meta)    { return PynMapSDK.capture.call(PynMapSDK, name, type, meta); },
      destroy()                    { return PynMapSDK.destroy.call(PynMapSDK); },
      get data()                   { return PynMapSDK.data; },
      get activeMapId()            { return PynMapSDK.activeMapId; }
    };
  }

})(window);
