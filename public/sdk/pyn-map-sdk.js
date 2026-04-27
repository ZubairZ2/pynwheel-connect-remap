(function (global) {

  const PynMapSDK = {
    // ----------------------------------------------------
    // STATE
    // ----------------------------------------------------
    _initialized: false,
    _sessionToken: null,          // short-lived token; replaces the API key after auth
    config: null,
    container: null,
    activeMapId: null,

    data: {
      sitemap: null,
      floorplates: [],
      units: [],
      floorplans: [],
      amenities: []
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
        onUnitHover:      typeof cfg.onUnitHover === "function" ? cfg.onUnitHover : null,
        onUnitClick:      typeof cfg.onUnitClick === "function" ? cfg.onUnitClick : null
      };

      // 2) Merge styles safely
      const baseStyles = this.defaultStyles;
      const cfgStyles  = cfg.styles || {};
      this.config.styles = {
        ...baseStyles,
        ...cfgStyles,
        unitColors: { ...baseStyles.unitColors, ...(cfgStyles.unitColors || {}) },
        unitLabels:  { ...baseStyles.unitLabels,  ...(cfgStyles.unitLabels  || {}) }
      };

      this.container = document.querySelector(cfg.container);
      if (!this.container) {
        console.error("PynMapSDK: Container not found:", cfg.container);
        return;
      }

      this._showLoading("Verifying partner...");

      if (!cfg.apiKey)     return this._showError("API Key is required.");
      if (!cfg.propertyId) return this._showError("propertyId is required.");

      // Pull the API key into a local variable only — it will NOT be
      // stored anywhere on the SDK object after _verifyPartner returns.
      const apiKey     = cfg.apiKey;
      const propertyId = cfg.propertyId;

      // VERIFY (one-time X-API-Key) → get session token → FETCH CONFIG → LOAD SVGs → BOOT
      this._verifyPartner(apiKey, propertyId)
        .then(v => {
          if (!v.success) return this._showError(v.error);

          // Store the short-lived token; the raw API key is now out of scope.
          this._sessionToken = v.sessionToken;

          this._showLoading("Loading property map...");
          return this._fetchConfig();
        })
        .then(r => {
          if (!r?.success) return this._showError(r?.error || "Config load error");
          this._storeConfig(r.data);
          this._showLoading("Loading SVG maps...");
          return this._loadActiveSVG();
        })
        .then(() => {
          if (!this._hasAnyMap()) return this._showError("No maps found.");

          if (!this._mapExists(this.activeMapId)) {
            this.activeMapId = this._getDefaultMapId();
          }

          return this._loadPanZoom()
            .then(() => this._bootAfterSVGLoad())
            .catch(() => this._bootAfterSVGLoad());
        })
        .catch(() => this._showError("Unexpected SDK error."));
    },

    // ----------------------------------------------------
    // BOOT AFTER SVG LOAD
    // ----------------------------------------------------
    _bootAfterSVGLoad() {
      this._renderMaps();

      // Bind events early (always!)
      this._bindUnitEvents();

      // If floor given → highlight floor first
      if (this.config.floor) {
        this.changeFloor(this.config.floor);
        return;
      }

      // Otherwise highlight all
      this._highlightAllUnits();
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

    /**
     * Fetch map config using the session token (no API key, no propertyId in URL).
     * The backend resolves the property from the token.
     */
    async _fetchConfig() {
      try {
        const url = `${this._apiBase()}/api/partner/maps/fetch_data`;
        const res = await fetch(url, {
          headers: { "Authorization": `Bearer ${this._sessionToken}` }
        });

        if (!res.ok) {
          if (res.status === 401) return { success: false, error: "Session invalid or expired" };
          if (res.status === 404) return { success: false, error: "Property not found" };
          return { success: false, error: `Server error (${res.status})` };
        }

        return { success: true, data: await res.json() };
      } catch {
        return { success: false, error: "Network error loading config" };
      }
    },


    // ----------------------------------------------------
    // MAP DATA STORAGE
    // ----------------------------------------------------
    _storeConfig(data) {
      this.data.sitemap     = data.sitemap     || null;
      this.data.floorplates = data.floorplates || [];
      this.data.floorplans  = data.floorplans  || [];
      this.data.units       = data.units       || [];
      this.data.amenities   = data.amenities   || [];

      this._indexUnits();
    },

    _indexUnits() {
      this.unitsByMap = {};
      this.pointerIdsByMap = {};
      this.unitsByPointerIdByMap = {};

      (this.data.units || []).forEach(u => {
        const mapId = String(u.mapId);
        if (!this.unitsByMap[mapId]) this.unitsByMap[mapId] = [];
        if (!this.pointerIdsByMap[mapId]) this.pointerIdsByMap[mapId] = [];
        if (!this.unitsByPointerIdByMap[mapId]) this.unitsByPointerIdByMap[mapId] = {};

        this.unitsByMap[mapId].push(u);

        const pid = u.pointerData?.id ? String(u.pointerData.id) : null;
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
    // Loads only the map that will be shown first:
    // config.floor > server defaultFloor > sitemap > floorplates[0]
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

    // Deduplicates concurrent fetches for the same map.
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

    /**
     * Fetch an SVG using the session token.
     * The request URL contains only opaque IDs — no storage URLs.
     */
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

    _parseSVG(svgText) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgText, "image/svg+xml");
      return doc.querySelector("svg");
    },


    // ----------------------------------------------------
    // RENDER MAPS
    // ----------------------------------------------------
    _renderMaps() {
      const c = this.container;
      c.innerHTML = "";               // remove any previous SVG + controls
      c.style.position = "relative";

      if (!this.activeMapId || !this._mapExists(this.activeMapId)) return;

      const svg = this.svgCache[this.activeMapId];
      if (!svg) return;

      const clone = svg.cloneNode(true);
      clone.setAttribute("data-map-id", this.activeMapId);
      clone.style.display = "block";

      // Apply global text styles (once per SVG)
      this._applyGlobalLabelStyles(clone, this.config.styles.unitLabels);

      // AUTO SCALE SVG: fit inside whatever container partner gives
      clone.removeAttribute("width");
      clone.removeAttribute("height");
      clone.setAttribute("preserveAspectRatio", "xMidYMid meet");
      clone.style.width = "100%";
      clone.style.height = "100%";

      c.appendChild(clone);

      if (this.config.showZoomControls) {
        this._renderZoomControls();
      }

      // Enable pan/zoom on the newly rendered SVG
      this._enablePanZoom(clone);

      // Container should constrain the SVG
      c.style.overflow   = "hidden";
      c.style.touchAction = "none"; // let svg-pan-zoom own all touch gestures
    },


    // ----------------------------------------------------
    // PAN & ZOOM
    // ----------------------------------------------------
    _loadPanZoom() {
      return new Promise((resolve, reject) => {
        if (window.svgPanZoom) return resolve();

        const s = document.createElement("script");
        s.src = "https://cdn.jsdelivr.net/npm/svg-pan-zoom/dist/svg-pan-zoom.min.js";
        s.async = true;
        s.onload = resolve;
        s.onerror = () => reject("Failed to load svg-pan-zoom");
        document.head.appendChild(s);
      });
    },

    _enablePanZoom(svgEl) {
      if (!window.svgPanZoom) return;

      if (svgEl._pz) {
        try { svgEl._pz.destroy(); } catch {}
      }

      svgEl._pz = svgPanZoom(svgEl, {
        zoomEnabled: true,
        panEnabled: true,
        controlIconsEnabled: false,
        mouseWheelZoomEnabled: true,
        dblClickZoomEnabled: false,

        fit: true,
        center: true,

        contain: true,                // stays inside container
        viewportSelector: null,
        minZoom: 0.5,
        maxZoom: 4,

        zoomScaleSensitivity: 0.15,
      });

      // touch-action:none on SVG + container stops browser from stealing gestures on any device
      svgEl.style.touchAction = "none";
      if (svgEl.parentNode) svgEl.parentNode.style.touchAction = "none";

      // Universal touch handler — drives svg-pan-zoom directly from raw touch events.
      // Works on iOS Safari, Android Chrome, iPad, Windows touchscreen, etc.
      // { passive:false } allows e.preventDefault() which blocks browser scroll / viewport pinch.
      (function attachTouchHandlers(el, pz) {
        const MIN_ZOOM = 0.5, MAX_ZOOM = 4;
        let touch1 = null;   // { x, y } of first finger at gesture start
        let startPan = null; // pan position at gesture start
        let startZoom = 1;   // zoom at gesture start
        let startDist = 0;   // pinch distance at gesture start

        function dist(a, b) {
          const dx = a.clientX - b.clientX, dy = a.clientY - b.clientY;
          return Math.sqrt(dx * dx + dy * dy);
        }

        el.addEventListener("touchstart", function(e) {
          e.preventDefault();
          if (e.touches.length === 1) {
            touch1   = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            startPan = pz.getPan();
          } else if (e.touches.length === 2) {
            touch1    = null;
            startDist = dist(e.touches[0], e.touches[1]);
            startZoom = pz.getZoom();
          }
        }, { passive: false });

        el.addEventListener("touchmove", function(e) {
          e.preventDefault();
          if (e.touches.length === 1 && touch1 && startPan) {
            // single-finger pan
            pz.pan({
              x: startPan.x + (e.touches[0].clientX - touch1.x),
              y: startPan.y + (e.touches[0].clientY - touch1.y),
            });
          } else if (e.touches.length === 2 && startDist > 0) {
            // two-finger pinch zoom
            const newDist  = dist(e.touches[0], e.touches[1]);
            const newZoom  = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, startZoom * (newDist / startDist)));
            pz.zoom(newZoom);
          }
        }, { passive: false });

        el.addEventListener("touchend", function(e) {
          if (e.touches.length === 0) {
            touch1 = null; startPan = null; startDist = 0;
          } else if (e.touches.length === 1) {
            // one finger lifted, remaining finger continues pan
            touch1   = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            startPan = pz.getPan();
            startDist = 0;
          }
        }, { passive: true });

        el.addEventListener("touchcancel", function() {
          touch1 = null; startPan = null; startDist = 0;
        }, { passive: true });

        // iOS Safari fires gesturestart/gesturechange for pinch at the browser level.
        // Cancelling them here lets our touchmove handler above drive the zoom instead.
        el.addEventListener("gesturestart",  function(e) { e.preventDefault(); }, { passive: false });
        el.addEventListener("gesturechange", function(e) { e.preventDefault(); }, { passive: false });
        el.addEventListener("gestureend",    function(e) { e.preventDefault(); }, { passive: false });
      }(svgEl, svgEl._pz));

      // Ensure center on load
      svgEl._pz.fit();
      svgEl._pz.center();
    },

        // ----------------------------------------------------
    // MANUAL SELECT / UNSELECT (PUBLIC API)
    // ----------------------------------------------------
    selectUnit(unitId, colorCode) {
      const activeSvg = this._getActiveSvg();
      if (!activeSvg) return;

      const id = String(unitId);
      const units = this.unitsByMap[this.activeMapId] || [];
      const unit = units.find(u =>
        String(u.unitId) === id ||
        String(u.id) === id ||
        String(u.pointerData?.id) === id
      );

      if (!unit?.pointerData?.id) return;

      const pid = String(unit.pointerData.id);
      const el = activeSvg.querySelector(`#${CSS.escape(pid)}`);
      if (!el) return;

      const styles = this.config?.styles || this.defaultStyles;
      const fillColor =
        colorCode ||
        styles.unitColors.hover ||
        styles.unitColors.available;

      el.style.fill = fillColor;

      const root = el.closest("g") || el;
      root.classList.add("pyn-highlight");
    },

    unselectUnit(unitId) {
      const activeSvg = this._getActiveSvg();
      if (!activeSvg) return;

      const id = String(unitId);
      const units = this.unitsByMap[this.activeMapId] || [];
      const unit = units.find(u =>
        String(u.unitId) === id ||
        String(u.id) === id ||
        String(u.pointerData?.id) === id
      );

      if (!unit?.pointerData?.id) return;

      const pid = String(unit.pointerData.id);
      const el = activeSvg.querySelector(`#${CSS.escape(pid)}`);
      if (!el) return;

      const styles = this.config?.styles || this.defaultStyles;
      const status = this._unitStatus(unit);

      // Restore original (status-based) color
      el.style.fill = styles.unitColors[status] || styles.unitColors.available;
      // Do NOT remove highlight, so hover + click still work
    },

    zoomIn() {
      const svg = this._getActiveSvg();
      if (!svg || !svg._pz) return;

      const currentZoom = svg._pz.getZoom();
      const newZoom = Math.min(currentZoom * 1.25, 4); // maxZoom
      svg._pz.zoom(newZoom);
    },

    zoomOut() {
      const svg = this._getActiveSvg();
      if (!svg || !svg._pz) return;

      const currentZoom = svg._pz.getZoom();
      const newZoom = Math.max(currentZoom / 1.25, 0.5); // minZoom
      svg._pz.zoom(newZoom);
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

      this.activeMapId = id;
      this._lastHoverPid = null;

      this._renderMaps();
      this._highlightAllUnits();
      this._bindUnitEvents();
    },

    async changeFloor(floorNumber) {
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

      const styles = this.config?.styles || this.defaultStyles;
      const units = this.unitsByMap[this.activeMapId] || [];

      units.forEach(unit => {
        const pid = unit.pointerData?.id;
        if (!pid) return;

        const el = activeSvg.querySelector(`#${CSS.escape(pid)}`);
        if (!el) return;

        const status = this._unitStatus(unit);
        el.style.fill = styles.unitColors[status] || styles.unitColors.available;

        // this._applyLabelTextStyles(el, styles.unitLabels);

        const root = el.closest("g") || el;
        root.classList.add("pyn-highlight");
      });
    },

    _highlightUnitsForFloor(floorNumber) {
      const activeSvg = this._getActiveSvg();
      if (!activeSvg) return;

      this._clearUnitStyles();

      const styles = this.config.styles;
      const units = (this.unitsByMap[this.activeMapId] || []).filter(
        u => String(u.floor) === String(floorNumber)
      );

      units.forEach(u => {
        const pid = u.pointerData?.id;
        if (!pid) return;

        const el = activeSvg.querySelector(`#${CSS.escape(String(pid))}`);
        if (!el) return;

        const status = this._unitStatus(u);
        el.style.fill = styles.unitColors[status];

        const root = el.closest("g") || el;
        root.classList.add("pyn-highlight");
      });
    },

    /**
     * Public: highlight one or many units by unitId.
     */

    highlightUnits(unitIds) {
      if (!unitIds) return;

      const activeSvg = this._getActiveSvg();
      if (!activeSvg) return;

      const ids = Array.isArray(unitIds)
        ? unitIds.map(String)
        : [String(unitIds)];

      const units = this.unitsByMap[this.activeMapId] || [];

      this._clearUnitStyles();

      const styles = this.config.styles;

      ids.forEach(id => {
        const unit = units.find(u =>
          String(u.unitId) === id ||
          String(u.pointerData?.id) === id
        );

        if (!unit?.pointerData?.id) return;

        const pid = String(unit.pointerData.id);
        const el = activeSvg.querySelector(`#${CSS.escape(pid)}`);
        if (!el) return;

        const status = this._unitStatus(unit);
        el.style.fill = styles.unitColors[status];

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

      const mapId = this.activeMapId;
      const byPointer = this.unitsByPointerIdByMap[mapId] || {};
      const pointerIds = this.pointerIdsByMap[mapId] || [];

      // 1) Mark "unit roots" once: we put data-pyn-unit-pid on the group (if any) or on the element itself.
      pointerIds.forEach(pid => {
        const el = svg.querySelector(`#${CSS.escape(pid)}`);
        if (!el) return;

        const root = el.closest("g") || el; // whole box area
        root.dataset.pynUnitPid = pid;
        root.style.cursor = "pointer";
      });

      // 2) Attach at most ONE set of listeners per SVG
      if (svg._pynEventsBound) return;
      svg._pynEventsBound = true;

      const styles = this.config?.styles || this.defaultStyles;

      svg.addEventListener("mouseover", (e) => {
        const root = e.target.closest("[data-pyn-unit-pid]");
        if (!root) return;

        const pid = root.dataset.pynUnitPid;
        const el = root.querySelector(`#${CSS.escape(pid)}`) || root;

        el.style.fill = styles.unitColors.hover;
      });

      svg.addEventListener("mouseout", (e) => {
        const root = e.target.closest("[data-pyn-unit-pid]");
        if (!root) return;

        const pid = root.dataset.pynUnitPid;
        const unit = byPointer[pid];
        if (!unit) return;

        // Clear hover debounce only when truly leaving the unit group,
        // not when moving between child elements within it.
        if (!root.contains(e.relatedTarget) && this._lastHoverPid === pid) {
          this._lastHoverPid = null;
        }

        const status = this._unitStatus(unit);
        const el = root.querySelector(`#${CSS.escape(pid)}`) || root;

        el.style.fill = styles.unitColors[status];
      });

      // Hover (using mouseover so it bubbles from children)
      svg.addEventListener("mouseover", (e) => {
        const root = e.target.closest("[data-pyn-unit-pid]");
        if (!root) return;

        if (!root.classList.contains("pyn-highlight")) return;

        const pid = root.dataset.pynUnitPid;
        if (!pid || this._lastHoverPid === pid) return;

        this._lastHoverPid = pid;

        const unit = byPointer[pid];
        if (!unit) return;

        if (this.config.onUnitHover) {
          this.config.onUnitHover(unit);
        }
      });

      // Touch support: tap to select + pinch handled by svg-pan-zoom
      let _touch = null;
      let _suppressNextClick = false;

      svg.addEventListener("touchstart", (e) => {
        if (e.touches.length !== 1) { _touch = null; return; }
        const t = e.touches[0];
        const root = t.target.closest("[data-pyn-unit-pid]");
        _touch = { x: t.clientX, y: t.clientY, time: Date.now(), root: root || null };
        if (root) {
          const pid = root.dataset.pynUnitPid;
          const el = root.querySelector(`#${CSS.escape(pid)}`) || root;
          el.style.fill = styles.unitColors.hover;
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
        const pid = root.dataset.pynUnitPid;
        const unit = byPointer[pid];
        if (!unit) return;

        const el = root.querySelector(`#${CSS.escape(pid)}`) || root;
        const status = this._unitStatus(unit);
        el.style.fill = styles.unitColors[status] || styles.unitColors.available;

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
        if (!root) return;

        if (!root.classList.contains("pyn-highlight")) return;

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
    // INTERNAL CLEARING
    // ----------------------------------------------------
    _clearUnitStyles() {
      const activeSvg = this._getActiveSvg();
      if (!activeSvg) return;

      const ids = this.pointerIdsByMap[this.activeMapId] || [];

      ids.forEach(pid => {
        const el = activeSvg.querySelector(`#${CSS.escape(pid)}`);
        if (!el) return;

        el.style.fill = "";
        el.style.stroke = "";
        el.style.strokeWidth = "";

        // remove highlight from polygon AND parent <g>
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
      // Remove old controls if re-rendered
      const old = this.container.querySelector(".pyn-zoom-controls");
      if (old) old.remove();

      const wrapper = document.createElement("div");
      wrapper.className = "pyn-zoom-controls";

      Object.assign(wrapper.style, {
        position: "absolute",
        right: "12px",
        top: "12px",
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        zIndex: "999999"
      });

      const btnStyle = {
        width: "34px",
        height: "34px",
        background: "#ffffff",
        borderRadius: "6px",
        border: "1px solid #ccc",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "20px",
        fontWeight: "bold",
        cursor: "pointer",
        boxShadow: "0 2px 5px rgba(0,0,0,0.15)",
        userSelect: "none"
      };

      // PLUS button
      const plus = document.createElement("div");
      plus.innerText = "+";
      Object.assign(plus.style, btnStyle);
      plus.onclick = () => this.zoomIn();

      // MINUS button
      const minus = document.createElement("div");
      minus.innerText = "−";
      Object.assign(minus.style, btnStyle);
      minus.onclick = () => this.zoomOut();

      wrapper.appendChild(plus);
      wrapper.appendChild(minus);

      this.container.appendChild(wrapper);
    },

    _unitStatus(_unit) {
      // if (unit.model_unit) return "model";
      // if (unit.available === false && unit.sold) return "leased";
      // if (unit.unit_status === "occupied_on_notice") return "notice";
      // if (unit.unit_status === "occupied") return "leased";
      // if (!unit.floorplan_name) return "missing";
      return "available";
    },

    _findFloorplateByFloor(floorNumber) {
      const fn = Number(floorNumber);
      if (isNaN(fn)) return null;

      for (const fp of this.data.floorplates) {
        const range = String(fp.range).trim(); // e.g. "1-4" or "3"

        if (range.includes("-")) {
          const [min, max] = range.split("-").map(Number);
          if (fn >= min && fn <= max) return fp;
        } else {
          if (fn === Number(range)) return fp;
        }
      }

      return null;
    },

    // _applyLabelTextStyles(el, textStyles) {
    //   const g = el.closest("g");
    //   if (!g) return;

    //   const texts = g.querySelectorAll("text");
    //   texts.forEach(t => {
    //     t.style.fontFamily = textStyles.fontFamily;
    //     t.style.fontSize = textStyles.fontSize;
    //     t.style.fill = textStyles.fontColor;
    //     t.style.pointerEvents = "none";
    //   });
    // },

    _applyGlobalLabelStyles(svg, textStyles) {
      if (!svg || svg._pynTextStyled) return;  // prevent re-running

      const elements = svg.querySelectorAll("text, tspan");
      elements.forEach(el => {
        el.style.fontFamily = textStyles.fontFamily;
        el.style.fontSize = textStyles.fontSize;
        el.style.fill = textStyles.fontColor;
        el.style.pointerEvents = "none"; // ensure labels don't block clicks
      });

      svg._pynTextStyled = true; // mark as styled
    },

    _getActiveSvg() {
      return this.container.querySelector(`svg[data-map-id="${this.activeMapId}"]`);
    },

    _mapExists(id) {
      return !!this.svgCache[id];
    },

    _hasAnyMap() {
      return Object.keys(this.svgCache).length > 0;
    },

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

    _showLoading(msg) {
      this._showStatus(msg, false);
    },

    _showError(msg) {
      this._showStatus(msg, true);
    },

    _showStatus(text, isError) {
      this.container.innerHTML = "";
      const box = document.createElement("div");
      Object.assign(box.style, {
        background: "#fff",
        padding: "10px 18px",
        borderRadius: "6px",
        fontSize: "14px",
        color: isError ? "#b91c1c" : "#444",
        boxShadow: "0 2px 6px rgba(0,0,0,0.1)"
      });
      box.innerText = text;

      this.container.style.display = "flex";
      this.container.style.alignItems = "center";
      this.container.style.justifyContent = "center";
      this.container.appendChild(box);
    },

    _apiBase() {
      if (this.config.environment  === "staging") {
        return "https://pynwheel-staging.herokuapp.com";
      }

      // return "http://localhost:3000";
      return "https://pynwheelconnect.com"; // production
    }
  };

  // ----------------------------------------------------
  // GLOBAL EXPOSED API
  // ----------------------------------------------------
  if (!global.PynMapSDK) {
    global.PynMapSDK = {
      init(cfg) {
        return PynMapSDK.init.call(PynMapSDK, cfg);
      },
      highlightUnits(unitIds) {
        return PynMapSDK.highlightUnits.call(PynMapSDK, unitIds);
      },
      changeMap(mapId) {
        return PynMapSDK.changeMap.call(PynMapSDK, mapId);
      },
      changeFloor(floorNumber) {
        return PynMapSDK.changeFloor.call(PynMapSDK, floorNumber);
      },
      selectUnit(unitId, colorCode) {
        return PynMapSDK.selectUnit.call(PynMapSDK, unitId, colorCode);
      },
      unselectUnit(unitId) {
        return PynMapSDK.unselectUnit.call(PynMapSDK, unitId);
      },
      zoomIn() {
        return PynMapSDK.zoomIn.call(PynMapSDK);
      },
      zoomOut() {
        return PynMapSDK.zoomOut.call(PynMapSDK);
      },
    };
  }

})(window);