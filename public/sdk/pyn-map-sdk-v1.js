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
        return;
      }

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
      this.data.property    = data.property    || null;
      this.data.sitemap     = data.sitemap     || null;
      this.data.floorplates = data.floorplates || [];
      this.data.floorplans  = data.floorplans  || [];
      this.data.units       = data.units       || [];
      this.data.amenities   = data.amenities   || [];
      this.data.filters     = data.filters     || null;

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
      c.innerHTML = "";
      c.style.position = "relative";

      if (!this.activeMapId || !this._mapExists(this.activeMapId)) return;

      const svg = this.svgCache[this.activeMapId];
      if (!svg) return;

      const clone = svg.cloneNode(true);
      clone.setAttribute("data-map-id", this.activeMapId);
      clone.style.display = "block";

      this._applyGlobalLabelStyles(clone, this.config.styles.unitLabels);

      clone.removeAttribute("width");
      clone.removeAttribute("height");
      clone.setAttribute("preserveAspectRatio", "xMidYMid meet");
      clone.style.width  = "100%";
      clone.style.height = "100%";

      c.appendChild(clone);

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
     *   minSquareFeet  {number}  — keep units with square_feet >= this value
     *   maxPrice       {number}  — keep units with market_rent <= this value
     *
     * Example — build a filter UI from getFiltersData() then apply it:
     *   const units = PynMapSDK.getUnits({
     *     bedrooms:      "2",
     *     availability:  "0-30",
     *     minSquareFeet: 800,
     *     maxPrice:      1200
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
      if (filters.minSquareFeet != null) units = units.filter(u => parseInt(u.square_feet,  10) >= filters.minSquareFeet);
      if (filters.maxPrice      != null) units = units.filter(u => parseInt(u.market_rent,  10) <= filters.maxPrice);

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

      const styles = this.config?.styles || this.defaultStyles;
      const status = this._unitStatus(unit);

      el.style.fill = styles.unitColors[status] || styles.unitColors.available;
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

      const styles = this.config?.styles || this.defaultStyles;
      const units  = this.unitsByMap[this.activeMapId] || [];

      units.forEach(unit => {
        const pid = unit.pointerData?.id;
        if (!pid) return;

        const el = activeSvg.querySelector(`#${CSS.escape(pid)}`);
        if (!el) return;

        const status  = this._unitStatus(unit);
        el.style.fill = styles.unitColors[status] || styles.unitColors.available;

        const root = el.closest("g") || el;
        root.classList.add("pyn-highlight");
      });
    },

    _highlightUnitsForFloor(floorNumber) {
      const activeSvg = this._getActiveSvg();
      if (!activeSvg) return;

      this._clearUnitStyles();

      const styles = this.config.styles;
      const units  = (this.unitsByMap[this.activeMapId] || []).filter(
        u => String(u.floor) === String(floorNumber)
      );

      units.forEach(u => {
        const pid = u.pointerData?.id;
        if (!pid) return;

        const el = activeSvg.querySelector(`#${CSS.escape(String(pid))}`);
        if (!el) return;

        const status  = this._unitStatus(u);
        el.style.fill = styles.unitColors[status];

        const root = el.closest("g") || el;
        root.classList.add("pyn-highlight");
      });
    },

    highlightUnits(unitIds) {
      if (!unitIds) return;

      const activeSvg = this._getActiveSvg();
      if (!activeSvg) return;

      const ids   = Array.isArray(unitIds) ? unitIds.map(String) : [String(unitIds)];
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
        const el  = activeSvg.querySelector(`#${CSS.escape(pid)}`);
        if (!el) return;

        const status  = this._unitStatus(unit);
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

      const styles = this.config?.styles || this.defaultStyles;

      svg.addEventListener("mouseover", (e) => {
        const root = e.target.closest("[data-pyn-unit-pid]");
        if (!root) return;

        const pid = root.dataset.pynUnitPid;
        const el  = root.querySelector(`#${CSS.escape(pid)}`) || root;
        el.style.fill = styles.unitColors.hover;
      });

      svg.addEventListener("mouseout", (e) => {
        const root = e.target.closest("[data-pyn-unit-pid]");
        if (!root) return;

        const pid  = root.dataset.pynUnitPid;
        const unit = byPointer[pid];
        if (!unit) return;

        const status = this._unitStatus(unit);
        const el     = root.querySelector(`#${CSS.escape(pid)}`) || root;
        el.style.fill = styles.unitColors[status];
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
        top:           "12px",
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

      const minus = document.createElement("div");
      minus.innerText = "−";
      Object.assign(minus.style, btnStyle);
      minus.onclick = () => this.zoomOut();

      wrapper.appendChild(plus);
      wrapper.appendChild(minus);
      this.container.appendChild(wrapper);
    },

    _unitStatus(unit) {
      return "available";
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

    _apiBase() {
      if (this.config.environment === "staging") {
        return "https://pynwheel-staging.herokuapp.com";
      }
      // return "http://localhost:3000";
      return "https://pynwheelconnect.com"; // production
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
      zoomOut()                    { return PynMapSDK.zoomOut.call(PynMapSDK); }
    };
  }

})(window);
