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
        onFavoriteChange: typeof cfg.onFavoriteChange === "function" ? cfg.onFavoriteChange : null,
        enable3DMap:      cfg.enable3DMap  === true,
        show3DMap:        cfg.show3DMap    === true,
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

      this._showLoading("Verifying partner...");

      if (!cfg.apiKey)      return this._showError("API Key is required.");
      if (!cfg.propertyId)  return this._showError("propertyId is required.");

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
          return this._loadAllSVGs();
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
      this._bindUnitEvents();

      if (this.config.floor) {
        this.changeFloor(this.config.floor);
      } else {
        this._highlightAllUnits();
      }

      if (this.config.enable3DMap && this.config.show3DMap) {
        this.switchTo3DMap();
      }
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

        return { success: true, data: await res.json() };
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
    async _loadAllSVGs() {
      const entries = [];

      if (this.data.sitemap) {
        entries.push({
          mapId:   String(this.data.sitemap.mapId),
          mapType: this.data.sitemap.mapType || "sitemap"
        });
      }

      this.data.floorplates.forEach(fp => {
        entries.push({
          mapId:   String(fp.mapId),
          mapType: fp.mapType || "floorplate"
        });
      });

      await Promise.all(entries.map(m =>
        this._loadSVG(m.mapId, m.mapType).then(svg => {
          if (svg) this.svgCache[m.mapId] = svg;
        })
      ));
    },

    /**
     * Fetch an SVG using the session token.
     * The request URL contains only opaque IDs — no storage URLs.
     */
    async _loadSVG(mapId, mapType) {
      try {
        const requestUrl =
          `${this._apiBase()}/api/partner/maps/fetch_svg_image` +
          `?map_id=${encodeURIComponent(mapId)}&map_type=${encodeURIComponent(mapType)}`;

        const response = await fetch(requestUrl, {
          headers: { "Authorization": `Bearer ${this._sessionToken}` }
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch SVG: ${response.status} ${response.statusText}`);
        }

        const svgText    = await response.text();
        const svgElement = this._parseSVG(svgText);

        if (!svgElement) {
          throw new Error("No <svg> element found in the response.");
        }

        return svgElement;
      } catch (error) {
        console.error("_loadSVG failed:", error);
        return null;
      }
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
      // Hide SVG when 3D mode is active
      clone.style.display = this._3dMode ? "none" : "block";

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
      c.style.overflow = "hidden";
    },


    // ----------------------------------------------------
    // PAN & ZOOM
    // ----------------------------------------------------
    _loadPanZoom() {
      return new Promise((resolve, reject) => {
        if (window.svgPanZoom) return resolve();

        const s    = document.createElement("script");
        s.src      = "https://cdn.jsdelivr.net/npm/svg-pan-zoom/dist/svg-pan-zoom.min.js";
        s.async    = true;
        s.onload   = resolve;
        s.onerror  = () => reject("Failed to load svg-pan-zoom");
        document.head.appendChild(s);
      });
    },

    _enablePanZoom(svgEl) {
      if (!window.svgPanZoom) return;

      if (svgEl._pz) {
        try { svgEl._pz.destroy(); } catch { }
      }

      svgEl._pz = svgPanZoom(svgEl, {
        zoomEnabled:          true,
        panEnabled:           true,
        controlIconsEnabled:  false,
        mouseWheelZoomEnabled: true,
        dblClickZoomEnabled:  false,
        fit:                  true,
        center:               true,
        contain:              true,
        viewportSelector:     null,
        minZoom:              0.5,
        maxZoom:              4,
        zoomScaleSensitivity: 0.15,
        beforeZoom:           function () { },
        onZoom:               function () { this.center(); }
      });

      svgEl._pz.fit();
      svgEl._pz.center();
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
        String(u.pointerData?.id) === id
      );

      if (!unit?.pointerData?.id) return;

      const pid = String(unit.pointerData.id);
      const el  = activeSvg.querySelector(`#${CSS.escape(pid)}`);
      if (!el) return;

      const styles    = this.config?.styles || this.defaultStyles;
      const fillColor = colorCode || styles.unitColors.hover || styles.unitColors.available;

      el.style.fill = fillColor;

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
        String(u.pointerData?.id) === id
      );

      if (!unit?.pointerData?.id) return;

      const pid    = String(unit.pointerData.id);
      const el     = activeSvg.querySelector(`#${CSS.escape(pid)}`);
      if (!el) return;

      el.style.fill = this._unitColor(unit);
    },

    zoomIn() {
      const svg = this._getActiveSvg();
      if (!svg || !svg._pz) return;
      svg._pz.zoom(Math.min(svg._pz.getZoom() * 1.25, 4));
    },

    zoomOut() {
      const svg = this._getActiveSvg();
      if (!svg || !svg._pz) return;
      svg._pz.zoom(Math.max(svg._pz.getZoom() / 1.25, 0.5));
    },

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

      // Hide SVG, show 3D wrapper
      const activeSvg = this._getActiveSvg();
      if (activeSvg) activeSvg.style.display = "none";
      if (this._3dWrapper) this._3dWrapper.style.display = "block";

      // Update toggle button label and hide zoom controls (irrelevant in 3D)
      if (this._3dToggleBtn) this._3dToggleBtn.innerText = "2D";
      if (this._zoomInBtn)   this._zoomInBtn.style.display  = "none";
      if (this._zoomOutBtn)  this._zoomOutBtn.style.display = "none";

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

      // Show SVG, hide 3D wrapper
      const activeSvg = this._getActiveSvg();
      if (activeSvg) activeSvg.style.display = "block";
      if (this._3dWrapper) this._3dWrapper.style.display = "none";

      // Update toggle button label and restore zoom controls
      if (this._3dToggleBtn) this._3dToggleBtn.innerText = "3D";
      if (this._zoomInBtn)   this._zoomInBtn.style.display  = "flex";
      if (this._zoomOutBtn)  this._zoomOutBtn.style.display = "flex";
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

      const initialMap     = cfg3d.defaultSatelliteView ? "SATELLITE" : "3D";
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
        hideShadow:        true,
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
      const cfg3d      = this.data.property?.beans3dConfig;
      const initialMap = cfg3d?.defaultSatelliteView ? "SATELLITE" : "3D";
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
        loadScript("https://js.arcgis.com/4.23/")
          .then(() => loadScript("https://www.beans.ai/mapswidget/js/mapswidget-1.0.4-speed.js"))
          .then(() => loadScript("https://www.beans.ai/mapswidget/client/utils.js"))
          .then(resolve)
          .catch(() => resolve()); // resolve anyway; caller checks typeof BeansMap
      });
    },

    // ----------------------------------------------------
    // FLOOR / MAP CHANGE
    // ----------------------------------------------------
    changeMap(mapId) {
      const id = String(mapId);
      if (!this._mapExists(id)) return;

      this.activeMapId   = id;
      this._lastHoverPid = null;

      this._renderMaps();
      this._highlightAllUnits();
      this._bindUnitEvents();
    },

    changeFloor(floorNumber) {
      if (this._3dMode) {
        this._beans3dFloor = floorNumber;
        const indices = floorNumber != null
          ? this._beans3dIndicesForFloor(floorNumber)
          : this._beans3dArr.map((_, i) => i);
        this._update3DFilter(indices);
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

      this.changeMap(floorMapId);
      setTimeout(() => { this._highlightUnitsForFloor(floorNumber); }, 30);
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
        const pid = unit.pointerData?.id;
        if (!pid) return;

        const el = activeSvg.querySelector(`#${CSS.escape(pid)}`);
        if (!el) return;

        el.style.fill = this._unitColor(unit);

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
        const pid = u.pointerData?.id;
        if (!pid) return;

        const el = activeSvg.querySelector(`#${CSS.escape(String(pid))}`);
        if (!el) return;

        el.style.fill = this._unitColor(u);

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

      const activeSvg = this._getActiveSvg();
      if (!activeSvg) return;
      const units = this.unitsByMap[this.activeMapId] || [];

      this._clearUnitStyles();

      ids.forEach(id => {
        const unit = units.find(u =>
          String(u.unitId) === id ||
          String(u.pointerData?.id) === id
        );

        if (!unit?.pointerData?.id) return;

        const pid = String(unit.pointerData.id);
        const el  = activeSvg.querySelector(`#${CSS.escape(pid)}`);
        if (!el) return;

        el.style.fill = this._unitColor(unit);

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
        const el = svg.querySelector(`#${CSS.escape(pid)}`);
        if (!el) return;

        const root = el.closest("g") || el;
        root.dataset.pynUnitPid = pid;
        root.style.cursor       = "pointer";
      });

      if (svg._pynEventsBound) return;
      svg._pynEventsBound = true;

      svg.addEventListener("mouseover", (e) => {
        const root = e.target.closest("[data-pyn-unit-pid]");
        if (!root) return;

        const pid  = root.dataset.pynUnitPid;
        const unit = byPointer[pid];
        if (!unit) return;

        const el = root.querySelector(`#${CSS.escape(pid)}`) || root;
        el.style.fill = this._unitHoverColor(unit);
      });

      svg.addEventListener("mouseout", (e) => {
        const root = e.target.closest("[data-pyn-unit-pid]");
        if (!root) return;

        const pid  = root.dataset.pynUnitPid;
        const unit = byPointer[pid];
        if (!unit) return;

        const el = root.querySelector(`#${CSS.escape(pid)}`) || root;
        el.style.fill = this._unitColor(unit);
      });

      svg.addEventListener("mouseover", (e) => {
        const root = e.target.closest("[data-pyn-unit-pid]");
        if (!root || !root.classList.contains("pyn-highlight")) return;

        const pid = root.dataset.pynUnitPid;
        if (!pid || this._lastHoverPid === pid) return;

        this._lastHoverPid = pid;

        const unit = byPointer[pid];
        if (!unit) return;

        if (this.config.onUnitHover) {
          this.config.onUnitHover(unit);
        }
      });

      svg.addEventListener("click", (e) => {
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
    // INTERNAL CLEARING
    // ----------------------------------------------------
    _clearUnitStyles() {
      const activeSvg = this._getActiveSvg();
      if (!activeSvg) return;

      const ids = this.pointerIdsByMap[this.activeMapId] || [];

      ids.forEach(pid => {
        const el = activeSvg.querySelector(`#${CSS.escape(pid)}`);
        if (!el) return;

        el.style.fill        = "";
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
        userSelect:      "none"
      };

      const plus = document.createElement("div");
      plus.innerText = "+";
      Object.assign(plus.style, btnStyle);
      plus.onclick = () => this.zoomIn();
      this._zoomInBtn = plus;

      const minus = document.createElement("div");
      minus.innerText = "−";
      Object.assign(minus.style, btnStyle);
      minus.onclick = () => this.zoomOut();
      this._zoomOutBtn = minus;

      // Hide zoom buttons immediately if already in 3D mode
      if (this._3dMode) {
        plus.style.display  = "none";
        minus.style.display = "none";
      }

      wrapper.appendChild(plus);
      wrapper.appendChild(minus);

      if (this.config.enable3DMap) {
        const toggle = document.createElement("div");
        toggle.className = "pyn-3d-toggle";
        toggle.innerText = this._3dMode ? "2D" : "3D";
        Object.assign(toggle.style, {
          ...btnStyle,
          fontSize:        "13px",
          letterSpacing:   "0.5px"
        });
        toggle.onclick = () => {
          if (this._3dMode) {
            this.switchTo2DMap();
          } else {
            this.switchTo3DMap();
          }
        };
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
     * Returns the full unit objects for all favorited units.
     * Populated at init time from fetch_data — no network call needed.
     * Same shape as getUnits() results.
     *
     * @returns {object[]}
     */
    getFavorites() {
      return (this.data.units || []).filter(u => u.isFavorite);
    },

    /**
     * Returns the shareable URL for this session's favorites page.
     * The URL is built server-side so the SDK stays decoupled from internal routing.
     *
     * @returns {Promise<{success: boolean, share_link: string|null}>}
     */
    async getShareFavoritesLink() {
      try {
        const res = await fetch(`${this._apiBase()}/api/partner/maps/get_share_favorites_link`, {
          headers: {
            "Authorization":    `Bearer ${this._sessionToken}`,
            "X-SDK-Session-Id": this._sdkSessionId
          }
        });

        if (!res.ok) return { success: false, share_link: null };

        const data = await res.json();
        return { success: true, share_link: data.share_link };
      } catch {
        return { success: false, share_link: null };
      }
    },

    /**
     * Removes all favorited units for the current session.
     * Clears the local Set, resets isFavorite on all unit objects,
     * and fires onFavoriteChange when the server confirms.
     *
     * @returns {Promise<{success: boolean}>}
     */
    async clearAllFavorites() {
      try {
        const res = await fetch(`${this._apiBase()}/api/partner/maps/clear_all_favorites`, {
          method: "DELETE",
          headers: {
            "Authorization":    `Bearer ${this._sessionToken}`,
            "X-SDK-Session-Id": this._sdkSessionId
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
     * Save one or more units as favorites.
     * Accepts a single unit ID or an array of unit IDs.
     * Updates the local Set and fires onFavoriteChange when the server confirms.
     *
     * @param {number|string|Array<number|string>} unitIds
     * @returns {Promise<{success: boolean, unit_ids: string[]}>}
     */
    async saveFavorite(unitIds) {
      const ids = (Array.isArray(unitIds) ? unitIds : [unitIds]).map(String);

      const body = new URLSearchParams();
      ids.forEach(id => body.append("unit_ids[]", id));

      try {
        const res = await fetch(`${this._apiBase()}/api/partner/maps/save_favorites`, {
          method: "POST",
          headers: {
            "Authorization":    `Bearer ${this._sessionToken}`,
            "X-SDK-Session-Id": this._sdkSessionId,
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
     * Remove one or more units from favorites.
     * Accepts a single unit ID or an array of unit IDs.
     * Updates the local Set and fires onFavoriteChange when the server confirms.
     *
     * @param {number|string|Array<number|string>} unitIds
     * @returns {Promise<{success: boolean, unit_ids: string[]}>}
     */
    async deleteFavorite(unitIds) {
      const ids = (Array.isArray(unitIds) ? unitIds : [unitIds]).map(String);

      const body = new URLSearchParams();
      ids.forEach(id => body.append("unit_ids[]", id));

      try {
        const res = await fetch(`${this._apiBase()}/api/partner/maps/delete_favorites`, {
          method: "DELETE",
          headers: {
            "Authorization":    `Bearer ${this._sessionToken}`,
            "X-SDK-Session-Id": this._sdkSessionId,
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

    _apiBase() {
      if (this.config.environment === "staging") {
        return "https://pynwheel-staging.herokuapp.com";
      }
      return "http://localhost:3000";
      // return "https://pynwheelconnect.com"; // production
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
      getFavorites()               { return PynMapSDK.getFavorites.call(PynMapSDK); },
      saveFavorite(unitIds)        { return PynMapSDK.saveFavorite.call(PynMapSDK, unitIds); },
      deleteFavorite(unitIds)      { return PynMapSDK.deleteFavorite.call(PynMapSDK, unitIds); },
      getShareFavoritesLink()      { return PynMapSDK.getShareFavoritesLink.call(PynMapSDK); },
      clearAllFavorites()          { return PynMapSDK.clearAllFavorites.call(PynMapSDK); },
      switchTo3DMap()              { return PynMapSDK.switchTo3DMap.call(PynMapSDK); },
      switchTo2DMap()              { return PynMapSDK.switchTo2DMap.call(PynMapSDK); }
    };
  }

})(window);
