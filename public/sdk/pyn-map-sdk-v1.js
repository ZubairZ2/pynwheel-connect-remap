(function (global) {

  const PynMapSDK = {
    // ----------------------------------------------------
    // STATE
    // ----------------------------------------------------
    _initialized: false,
    _sessionToken: null,          // short-lived token; replaces the API key after auth
    _sdkSessionId: null,          // stable UUID persisted in localStorage; identifies this user's favorites session
    _favorites: new Set(),        // Set of favorited unit IDs (strings)
    config: null,
    container: null,
    activeMapId: null,

    // 3D map state
    _3dMode:        false,
    _3dInitialized: false,
    _beansWidget:   null,
    _beans3dArr:    [],
    _beans3dFloor:  null,
    _3dWrapper:     null,
    _3dToggleBtn:   null,
    _zoomInBtn:     null,
    _zoomOutBtn:    null,
    _resetZoomBtn:  null,

    // Image map state (2D raster image mode, enable_svg_mode === false)
    _imgMapMode:    false,
    _imgActiveMapId: null,   // mapId of the currently-visible floorplate/sitemap


    // true when the caller explicitly passed styles.unitColors in config;
    // false means "use per-unit colors returned by the API"
    _userHasCustomColors: false,

    _beansPopupObserver: null,   // MutationObserver that suppresses the Esri popup

    data: {
      property:   null,
      sitemap:    null,
      floorplates: [],
      units:       [],
      floorplans:  [],
      amenities:   [],
      filters:     null
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

      // API key is local-only — never stored on the SDK object.
      const apiKey     = cfg.apiKey;
      const propertyId = cfg.propertyId;

      // Start loading pan-zoom immediately — parallel with auth + data fetch.
      const panZoomReady = this._loadPanZoom();

      // Reuse a cached session token when available to skip the partner auth round-trip.
      const cachedTok = this._readCachedToken(propertyId);
      if (cachedTok) {
        this._sessionToken = cachedTok;
        this._showLoading("Loading property map...");
      } else {
        this._showLoading("Verifying partner...");
      }

      const doAuth = cachedTok
        ? Promise.resolve({ success: true })
        : this._verifyPartner(apiKey, propertyId).then(v => {
            if (v.success) {
              this._sessionToken = v.sessionToken;
              this._writeCachedToken(propertyId, v.sessionToken);
            }
            return v;
          });

      doAuth
        .then(v => {
          if (!v?.success) return this._showError(v?.error || "Partner verification failed.");
          return this._fetchConfig();
        })
        .then(r => {
          // Expired cached token — clear, re-authenticate once, then retry.
          if (!r?.success && r?.error === "Session invalid or expired" && cachedTok) {
            this._clearCachedToken(propertyId);
            return this._verifyPartner(apiKey, propertyId).then(v => {
              if (!v.success) return v;
              this._sessionToken = v.sessionToken;
              this._writeCachedToken(propertyId, v.sessionToken);
              return this._fetchConfig();
            });
          }
          return r;
        })
        .then(r => {
          if (!r?.success) return this._showError(r?.error || "Config load error");
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
        .catch(() => this._showError("Unexpected SDK error."));
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

      this.config.onReady?.();
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
        const url = `${this._apiBase()}/api/partner/maps/authorized?propertyId=${propertyId}`;
        const res = await fetch(url, { headers: { "X-API-Key": apiKey } });

        if (!res.ok) {
          if (res.status === 401) return { success: false, error: "Invalid API Key" };
          if (res.status === 404) return { success: false, error: "Property not found" };
          return { success: false, error: "Partner verification failed" };
        }

        const data = await res.json();
        return { success: true, sessionToken: data.session_token };
      } catch {
        return { success: false, error: "Network error verifying partner" };
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

    _clearCachedToken(propertyId) {
      try {
        const key = `pyn_tok_${propertyId}`;
        localStorage.removeItem(key);
        localStorage.removeItem(`${key}_exp`);
      } catch {}
    },

    /**
     * Fetch map config using the session token (no API key, no propertyId in URL).
     * The backend resolves the property from the token.
     */
    async _fetchConfig() {
      try {
        const mapTypeParam = this.config.mapType === "ops" ? "?map_type=ops" : "";
        const url = `${this._apiBase()}/api/partner/maps/fetch_data${mapTypeParam}`;
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


    // ----------------------------------------------------
    // MAP DATA STORAGE
    // ----------------------------------------------------
    _storeConfig(data) {
      this.data.property    = data.property    || null;
      this.data.sitemap     = data.sitemap     || null;
      this.data.floorplates = data.floorplates || [];
      this.data.floorplans  = data.floorplans  || [];
      this.data.units       = data.units       || [];
      this.data.amenities   = data.amenities   || [];
      this.data.filters     = data.filters     || null;

      // Hydrate favorites from the server response.
      // Each unit already has isFavorite set by the server; build the local Set from it.
      this._favorites = new Set(
        this.data.units
          .filter(u => u.isFavorite)
          .map(u => String(u.unitId))
      );

      this._indexUnits();
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
        "--pyn-primary-light-10":          c.primaryLight10,
        "--pyn-primary-light-10-opacity":  c.primaryLight10Opacity,
        "--pyn-primary-light-20":          c.primaryLight20,
        "--pyn-primary-light-20-opacity":  c.primaryLight20Opacity,
        "--pyn-main-font":                 c.mainFont,
        "--pyn-main-font-opacity":         c.mainFontOpacity,
        "--pyn-subtext":                   c.subtext,
        "--pyn-subtext-opacity":           c.subtextOpacity,
        "--pyn-icon-bg":                   c.iconBackground,
        "--pyn-icon-bg-opacity":           c.iconBackgroundOpacity,
        "--pyn-stroke":                    c.strokeOutlines,
        "--pyn-stroke-opacity":            c.strokeOutlinesOpacity,
        "--pyn-light-bg":                  c.lightBackground,
        "--pyn-light-bg-opacity":          c.lightBackgroundOpacity,
        "--pyn-label-yellow":              c.labelYellow,
        "--pyn-label-yellow-opacity":      c.labelYellowOpacity,
        "--pyn-label-orange":              c.labelOrange,
        "--pyn-label-orange-opacity":      c.labelOrangeOpacity,
        "--pyn-label-coral":               c.labelCoral,
        "--pyn-label-coral-opacity":       c.labelCoralOpacity,
        "--pyn-font-family":               f.family,
        "--pyn-base-font-size":            f.baseSize,
        "--pyn-heading-font-size":         f.headingSize
      };

      Object.entries(vars).forEach(([prop, val]) => {
        if (val != null) this.container.style.setProperty(prop, String(val));
      });
    },

    _resolve3DConfig() {
      const cfg3d = this.data.property?.beans3dConfig;
      if (this.config.enable3DMap          === null) this.config.enable3DMap          = cfg3d?.enabled          === true;
      if (this.config.show3DMap            === null) this.config.show3DMap            = cfg3d?.show3dByDefault  === true;
      if (this.config.defaultSatelliteView === null) this.config.defaultSatelliteView = cfg3d?.defaultSatelliteView === true;
    },

    _indexUnits() {
      this.unitsByMap             = {};
      this.pointerIdsByMap        = {};
      this.unitsByPointerIdByMap  = {};

      (this.data.units || []).forEach(u => {
        const mapId = String(u.mapId);
        if (!this.unitsByMap[mapId])             this.unitsByMap[mapId]             = [];
        if (!this.pointerIdsByMap[mapId])        this.pointerIdsByMap[mapId]        = [];
        if (!this.unitsByPointerIdByMap[mapId])  this.unitsByPointerIdByMap[mapId]  = {};

        this.unitsByMap[mapId].push(u);

        const pid = this._unitPid(u);
        if (pid) {
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

        const response = await fetch(requestUrl, {
          headers: { "Authorization": `Bearer ${this._sessionToken}` },
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

      c.appendChild(clone);

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

      svgEl._pz = panzoom(svgEl, {
        minZoom: 1,   // can't zoom below the default view
        maxZoom: 10,
        // Block mouse-drag pan when at default zoom (scale ≤ 1); allow when zoomed in.
        beforeMouseDown: () => (svgEl._pz ? svgEl._pz.getTransform().scale <= 1.01 : true),
      });

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
      svgEl._pz.on("pan",  svgClamp);
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
     * Each object: { floor: Number, mapId: String }
     * Use with changeFloor(floor) or changeMap(mapId).
     */
    getFloors() {
      const seen  = new Map(); // floor → mapId

      (this.data.units || []).forEach(u => {
        const f = Number(u.floor);
        if (isNaN(f) || u.floor == null || u.floor === "") return;
        if (!seen.has(f)) seen.set(f, u.mapId != null ? String(u.mapId) : null);
      });

      return [...seen.entries()]
        .sort(([a], [b]) => a - b)
        .map(([floor, mapId]) => ({ floor, mapId }));
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
     * Each object: { amenityId, name, description, amenityType, image, directionalText, additionalImages }
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
     */
    getUnits(filters) {
      let units = (this.data.units || []).slice();

      if (!filters) return units;

      if (filters.floor         != null) units = units.filter(u => String(u.floor)        === String(filters.floor));
      if (filters.mapId         != null) units = units.filter(u => String(u.mapId)        === String(filters.mapId));
      if (filters.floorplanId   != null) units = units.filter(u => String(u.floorplanId)  === String(filters.floorplanId));
      if (filters.bedrooms      != null) units = units.filter(u => String(u.bedrooms)     === String(filters.bedrooms));
      if (filters.bathrooms     != null) units = units.filter(u => String(u.bathrooms)    === String(filters.bathrooms));
      if (filters.available     != null) units = units.filter(u => u.available            === filters.available);
      if (filters.availability  != null) units = units.filter(u => this._unitMatchesAvailability(u, filters.availability));
      if (filters.minPrice      != null) units = units.filter(u => parseInt(u.market_rent,  10) >= filters.minPrice);
      if (filters.maxPrice      != null) units = units.filter(u => parseInt(u.market_rent,  10) <= filters.maxPrice);
      if (filters.minSquareFeet != null) units = units.filter(u => parseInt(u.square_feet,  10) >= filters.minSquareFeet);
      if (filters.maxSquareFeet != null) units = units.filter(u => parseInt(u.square_feet,  10) <= filters.maxSquareFeet);

      return units;
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

    // ----------------------------------------------------
    // MANUAL SELECT / UNSELECT (PUBLIC API)
    // ----------------------------------------------------
    selectUnit(unitId, colorCode) {
      const activeSvg = this._getActiveSvg();
      if (!activeSvg) return;

      const id    = String(unitId);
      const units = this.unitsByMap[this.activeMapId] || [];
      const unit  = units.find(u =>
        String(u.unitId) === id ||
        String(u.id)     === id ||
        this._unitPid(u) === id
      );

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

      const id    = String(unitId);
      const units = this.unitsByMap[this.activeMapId] || [];
      const unit  = units.find(u =>
        String(u.unitId) === id ||
        String(u.id)     === id ||
        this._unitPid(u) === id
      );

      const pid = this._unitPid(unit);
      if (!pid) return;

      const sel = this._pointerSelector(unit.pointerData);
      if (!sel) return;
      const el  = activeSvg.querySelector(sel);
      if (!el) return;

      this._applyFill(el, this._unitColor(unit));
    },

    zoomIn() {
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
      this._3dMode = false;

      // Remove ESRI hide style when leaving 3D mode
      const esriStyle = document.getElementById("pyn-esri-hide-style");
      if (esriStyle) esriStyle.remove();

      // Restore SVG visibility, hide 3D wrapper
      const activeSvg = this._getActiveSvg();
      if (activeSvg) {
        activeSvg.style.display       = "";
        activeSvg.style.visibility    = "visible";
        activeSvg.style.pointerEvents = "";
        // Release the container minHeight lock set when entering 3D mode.
        if (this.container.style.minHeight) this.container.style.minHeight = "";
        // Re-init panzoom (was disposed when entering 3D mode).
        if (!activeSvg._pz) this._enablePanZoom(activeSvg);
      }
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
            const unit = (this.data.units || []).find(
              u => String(u.unitId) === String(data.unitId)
            );
            if (unit && this.config.onUnitClick) this.config.onUnitClick(unit);
          },
          onHover: (data) => {
            this._hideBeansEsriPopup();
            if (data?.type !== "UNIT") return;
            const unit = (this.data.units || []).find(
              u => String(u.unitId) === String(data.unitId)
            );
            if (unit && this.config.onUnitHover) this.config.onUnitHover(unit);
          }
        }
      );

      this._3dInitialized = true;

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
            container.addEventListener("mouseleave", () => this._hideBeansEsriPopup());
          }

          // ArcGIS SDK sets touch-action:none on its view container, which cascades
          // to all Beans UI buttons (satellite, shadow, etc.) and blocks iOS Safari
          // from synthesizing click events from touch sequences. Fix: listen for
          // touchend on the Beans container and manually fire .click() for taps on
          // Beans UI controls (not on the ESRI map canvas itself).
          this._bindBeansContainerTouch();
        }
      }, 300);

      // Apply any pending floor filter
      if (this._beans3dFloor != null) {
        this._update3DFilter(this._beans3dIndicesForFloor(this._beans3dFloor));
      }
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

    _update3DFilter(indices) {
      if (!this._beansWidget || !this._3dInitialized) return;
      const cfg3d         = this.data.property?.beans3dConfig;
      const satelliteView = this.config.defaultSatelliteView != null ? this.config.defaultSatelliteView : cfg3d?.defaultSatelliteView;
      const initialMap    = satelliteView ? "SATELLITE" : "3D";
      const opts       = this._beans3dDisplayOptions(indices, initialMap, cfg3d);
      try {
        if (this._beansWidget.workingInstance) {
          this._beansWidget.setDisplayOptions(opts);
          this._beansWidget.redraw();
        } else {
          // Engine not ready yet — re-init mirrors reDrawBeansWidget in beans3DHandler.js
          this._init3DMap();
        }
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
      if (this._3dMode) {
        this._beans3dFloor = floorNumber;
        const indices = floorNumber != null
          ? this._beans3dIndicesForFloor(floorNumber)
          : this._beans3dArr.map((_, i) => i);
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

      const ids = Array.isArray(unitIds) ? unitIds.map(String) : [String(unitIds)];

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
          if (amenity && this.config.onAmenityHover) this.config.onAmenityHover(amenity);
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
          if (amenity && this.config.onAmenityClick) this.config.onAmenityClick(amenity);
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
          if (amenity && this.config.onAmenityClick) this.config.onAmenityClick(amenity);
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

        const root = el.closest("g") || el;
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
      this._favorites          = new Set();
      this.config              = null;
      this.container           = null;
      this.activeMapId         = null;
      this._3dMode             = false;
      this._3dInitialized      = false;
      this._beansWidget        = null;
      this._beans3dArr         = [];
      this._beans3dFloor       = null;
      this._3dWrapper          = null;
      this._3dToggleBtn        = null;
      this._zoomInBtn          = null;
      this._zoomOutBtn         = null;
      this._resetZoomBtn       = null;
      this._imgMapMode         = false;
      this._imgActiveMapId     = null;
      this._userHasCustomColors= false;
      if (this._beansPopupObserver) {
        this._beansPopupObserver.disconnect();
        this._beansPopupObserver = null;
      }
      this.data                = { property: null, sitemap: null, floorplates: [], units: [], floorplans: [], amenities: [], filters: null };
      this.unitsByMap          = {};
      this.pointerIdsByMap     = {};
      this.unitsByPointerIdByMap = {};
      this._svgLoadingPromises = {};
      this._lastHoverPid       = null;
      // svgCache is intentionally preserved to avoid re-fetching on reinit
    },

    _showLoading(msg)          { this._showStatus(msg, false); },
    _showError(msg)            { this._showStatus(msg, true);  },

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
     *       showSquareFeetFilter, showAvailabilityFilter, showPropertiesFilter
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
     * Fetches the full unit objects for the favorited units of the given
     * community + session.  Pass your own communityId / sessionId to see your
     * own favorites, or a shared pair to display someone else's saved units.
     *
     * @param {string|number} communityId
     * @param {string}        sessionId
     * @returns {Promise<object[]>}
     */
    async getFavorites(communityId, sessionId) {
      try {
        const mapTypeParam = this.config.mapType === "ops" ? "?map_type=ops" : "";
        const res = await fetch(`${this._apiBase()}/api/partner/maps/get_favorites${mapTypeParam}`, {
          headers: {
            "Authorization":    `Bearer ${this._sessionToken}`,
            "X-SDK-Session-Id": sessionId || this._sdkSessionId,
            "X-Community-Id":   String(communityId)
          }
        });
        if (!res.ok) return [];
        const data = await res.json();
        return data.units || [];
      } catch {
        return [];
      }
    },

    /**
     * Removes all favorited units for the given community and session.
     * Clears the local Set, resets isFavorite on all unit objects,
     * and fires onFavoriteChange when the server confirms.
     *
     * @param {string|number} communityId
     * @param {string}        sessionId
     * @returns {Promise<{success: boolean}>}
     */
    async clearAllFavorites(communityId, sessionId) {
      try {
        const res = await fetch(`${this._apiBase()}/api/partner/maps/clear_all_favorites`, {
          method: "DELETE",
          headers: {
            "Authorization":    `Bearer ${this._sessionToken}`,
            "X-SDK-Session-Id": sessionId || this._sdkSessionId,
            "X-Community-Id":   String(communityId)
          }
        });

        if (!res.ok) return { success: false };

        this._favorites.clear();
        (this.data.units || []).forEach(u => { u.isFavorite = false; });

        if (this.config.onFavoriteChange) {
          this.config.onFavoriteChange([], "cleared", []);
        }

        return { success: true };
      } catch {
        return { success: false };
      }
    },

    /**
     * Save one or more units as favorites for the given community and session.
     * Accepts a single unit ID or an array of unit IDs.
     * Updates the local Set and fires onFavoriteChange when the server confirms.
     *
     * @param {number|string|Array<number|string>} unitIds
     * @param {string|number} communityId
     * @param {string}        sessionId
     * @returns {Promise<{success: boolean, unit_ids: string[]}>}
     */
    async saveFavorite(unitIds, communityId, sessionId) {
      const ids = (Array.isArray(unitIds) ? unitIds : [unitIds]).map(String);

      const body = new URLSearchParams();
      ids.forEach(id => body.append("unit_ids[]", id));

      try {
        const res = await fetch(`${this._apiBase()}/api/partner/maps/save_favorites`, {
          method: "POST",
          headers: {
            "Authorization":    `Bearer ${this._sessionToken}`,
            "X-SDK-Session-Id": sessionId || this._sdkSessionId,
            "X-Community-Id":   String(communityId),
            "Content-Type":     "application/x-www-form-urlencoded"
          },
          body
        });

        if (!res.ok) return { success: false, unit_ids: [...this._favorites] };

        const data = await res.json();

        ids.forEach(id => {
          this._favorites.add(id);
          const unit = (this.data.units || []).find(u => String(u.unitId) === id);
          if (unit) unit.isFavorite = true;
        });

        if (this.config.onFavoriteChange) {
          this.config.onFavoriteChange(ids, "saved", [...this._favorites]);
        }

        return { success: true, unit_ids: data.unit_ids || [...this._favorites] };
      } catch {
        return { success: false, unit_ids: [...this._favorites] };
      }
    },

    /**
     * Remove one or more units from favorites for the given community and session.
     * Accepts a single unit ID or an array of unit IDs.
     * Updates the local Set and fires onFavoriteChange when the server confirms.
     *
     * @param {number|string|Array<number|string>} unitIds
     * @param {string|number} communityId
     * @param {string}        sessionId
     * @returns {Promise<{success: boolean, unit_ids: string[]}>}
     */
    async deleteFavorite(unitIds, communityId, sessionId) {
      const ids = (Array.isArray(unitIds) ? unitIds : [unitIds]).map(String);

      const body = new URLSearchParams();
      ids.forEach(id => body.append("unit_ids[]", id));

      try {
        const res = await fetch(`${this._apiBase()}/api/partner/maps/delete_favorites`, {
          method: "DELETE",
          headers: {
            "Authorization":    `Bearer ${this._sessionToken}`,
            "X-SDK-Session-Id": sessionId || this._sdkSessionId,
            "X-Community-Id":   String(communityId),
            "Content-Type":     "application/x-www-form-urlencoded"
          },
          body
        });

        if (!res.ok) return { success: false, unit_ids: [...this._favorites] };

        const data = await res.json();

        ids.forEach(id => {
          this._favorites.delete(id);
          const unit = (this.data.units || []).find(u => String(u.unitId) === id);
          if (unit) unit.isFavorite = false;
        });

        if (this.config.onFavoriteChange) {
          this.config.onFavoriteChange(ids, "deleted", [...this._favorites]);
        }

        return { success: true, unit_ids: data.unit_ids || [...this._favorites] };
      } catch {
        return { success: false, unit_ids: [...this._favorites] };
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
        const res = await fetch(`${this._apiBase()}/api/partner/maps/share_favorites_email`, {
          method: "POST",
          headers: {
            "Authorization":    `Bearer ${this._sessionToken}`,
            "X-SDK-Session-Id": this._sdkSessionId,
            "Content-Type":     "application/x-www-form-urlencoded"
          },
          body
        });

        const data = await res.json();
        if (!res.ok) return { success: false, message: data.message || "Failed to send email." };
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
        Object.assign(img.style, {
          display:       "block",
          width:         "100%",
          height:        "auto",
          pointerEvents: "none",
          userSelect:    "none"
        });

        const mc = document.createElement("div");
        mc.className = "pyn-markers-container";
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
        const count    = group.length;
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

    // Scale all marker positions from image-pixel space to displayed-pixel space.
    // Called after image load and on resize.
    _adjustMarkersPositionForMapId(mapId) {
      const id      = String(mapId);
      const wrapper = this.container.querySelector(`[data-image-map-id="${id}"]`);
      if (!wrapper) return;

      const ratio = this._computeStretchRatio(id, wrapper);

      wrapper.querySelectorAll(".pyn-unit-marker").forEach(m => {
        m.style.left = `${parseFloat(m.dataset.xPlot) * ratio}px`;
        m.style.top  = `${parseFloat(m.dataset.yPlot) * ratio}px`;
      });

      wrapper.querySelectorAll(".pyn-amenity-marker").forEach(m => {
        m.style.left = `${parseFloat(m.dataset.xPlot) * ratio}px`;
        m.style.top  = `${parseFloat(m.dataset.yPlot) * ratio}px`;
      });

      // Update CSS size variables — O(1), no per-marker DOM work needed.
      this._updateMarkerSizeVars();
    },

    // Returns the ratio of displayed image size to actual (stored) image size.
    // Mirrors webpages.js getStretchRatio: Math.min(widthRatio, heightRatio).
    _computeStretchRatio(mapId, wrapper) {
      const w   = wrapper || this.container.querySelector(`[data-image-map-id="${mapId}"]`);
      if (!w) return 1;
      const img = w.querySelector("img.pyn-map-image");
      if (!img) return 1;

      const dW = img.offsetWidth;
      const dH = img.offsetHeight;
      const aW = parseFloat(img.dataset.actualWidth)  || dW;
      const aH = parseFloat(img.dataset.actualHeight) || dH;
      if (!aW || !aH) return 1;

      return Math.min(dW / aW, dH / aH);
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

        // Image is width:100% at top of wrapper — no horizontal offset.
        // Use the image's actual rendered height (may be less than container height).
        const img = wrapperEl.querySelector(".pyn-map-image");
        const cfH = img && img.clientHeight > 0 ? img.clientHeight : ch;
        const cfW = cw;

        const maxX = 0;
        const minX = cw - t.scale * cfW;
        const maxY = 0;
        const minY = ch - t.scale * cfH;

        const x = minX > maxX ? (minX + maxX) / 2 : Math.min(maxX, Math.max(minX, t.x));
        const y = minY > maxY ? (minY + maxY) / 2 : Math.min(maxY, Math.max(minY, t.y));

        if (Math.abs(x - t.x) > 0.5 || Math.abs(y - t.y) > 0.5) {
          _imgClamping = true;
          pz.moveTo(x, y);
          _imgClamping = false;
        }
      };
      wrapperEl._pz.on("pan",  imgClamp);
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
      // Unit marker click
      this.container.addEventListener("click", e => {
        const marker = e.target.closest(".pyn-unit-marker");
        if (!marker || marker.style.display === "none") return;
        const unitIds = (marker.dataset.unitIds || "").split(",").filter(Boolean);
        if (unitIds.length > 1) {
          const units = unitIds
            .map(id => (this.data.units || []).find(u => String(u.unitId) === id))
            .filter(Boolean);
          if (this.config.onUnitClick) this.config.onUnitClick(units.length === 1 ? units[0] : units);
        } else {
          try {
            const unit = JSON.parse(marker.dataset.unitJson || "null");
            if (unit && this.config.onUnitClick) this.config.onUnitClick(unit);
          } catch {}
        }
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
            if (amenity && this.config.onAmenityClick) this.config.onAmenityClick(amenity);
          } catch {}
        }
      }, { passive: true });

      // Amenity click
      this.container.addEventListener("click", e => {
        const am = e.target.closest(".pyn-amenity-marker");
        if (!am) return;
        try {
          const amenity = JSON.parse(am.dataset.amenityJson || "null");
          if (amenity && this.config.onAmenityClick) this.config.onAmenityClick(amenity);
        } catch {}
      });

      // Amenity hover
      this.container.addEventListener("mouseover", e => {
        const am = e.target.closest(".pyn-amenity-marker");
        if (!am) return;
        try {
          const amenity = JSON.parse(am.dataset.amenityJson || "null");
          if (amenity && this.config.onAmenityHover) this.config.onAmenityHover(amenity);
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
      getUnits(filters)            { return PynMapSDK.getUnits.call(PynMapSDK, filters); },
      getFiltersData()             { return PynMapSDK.getFiltersData.call(PynMapSDK); },
      selectUnit(unitId, colorCode){ return PynMapSDK.selectUnit.call(PynMapSDK, unitId, colorCode); },
      unselectUnit(unitId)         { return PynMapSDK.unselectUnit.call(PynMapSDK, unitId); },
      zoomIn()                     { return PynMapSDK.zoomIn.call(PynMapSDK); },
      zoomOut()                    { return PynMapSDK.zoomOut.call(PynMapSDK); },
      resetZoom()                  { return PynMapSDK.resetZoom.call(PynMapSDK); },
      getCurrentSessionId()                           { return PynMapSDK.getCurrentSessionId.call(PynMapSDK); },
      getFavorites(communityId, sessionId)            { return PynMapSDK.getFavorites.call(PynMapSDK, communityId, sessionId); },
      saveFavorite(unitIds, communityId, sessionId)   { return PynMapSDK.saveFavorite.call(PynMapSDK, unitIds, communityId, sessionId); },
      deleteFavorite(unitIds, communityId, sessionId) { return PynMapSDK.deleteFavorite.call(PynMapSDK, unitIds, communityId, sessionId); },
      clearAllFavorites(communityId, sessionId)       { return PynMapSDK.clearAllFavorites.call(PynMapSDK, communityId, sessionId); },
      shareFavoritesEmail(userEmail, favoritesUrl)    { return PynMapSDK.shareFavoritesEmail.call(PynMapSDK, userEmail, favoritesUrl); },
      setExpandedMode(expanded)    { return PynMapSDK.setExpandedMode.call(PynMapSDK, expanded); },
      switchTo3DMap()              { return PynMapSDK.switchTo3DMap.call(PynMapSDK); },
      switchTo2DMap()              { return PynMapSDK.switchTo2DMap.call(PynMapSDK); },
      destroy()                    { return PynMapSDK.destroy.call(PynMapSDK); },
      get data()                   { return PynMapSDK.data; },
      get activeMapId()            { return PynMapSDK.activeMapId; }
    };
  }

})(window);
