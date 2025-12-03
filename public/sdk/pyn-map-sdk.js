(function (global) {

  const PynMapSDK = {
    // ----------------------------------------------------
    // STATE
    // ----------------------------------------------------
    _initialized: false,
    config: null,
    container: null,
    activeMapId: null,

    data: {
      sitemap: null,
      floorplates: [],
      units: [],
      floorplans: []
    },

    unitsByMap: {},                // { [mapId]: unit[] }
    pointerIdsByMap: {},           // { [mapId]: string[] }
    unitsByPointerIdByMap: {},     // { [mapId]: { [pointerId]: unit } }
    svgCache: {},                  // { [mapId]: SVGElement }
    _lastHoverPid: null,           // last hovered pointer id (for debouncing)

    defaultStyles: {
      unitColors: {
        available: "#F9D648",
        leased: "#cccccc",
        model: "#F57396",
        notice: "#040304ff",
        missing: "#eecea5",
        hover: "#f94865ff"
      },
      unitLabels: {
        fontFamily: "Arial",
        fontSize: "11px",
        fontColor: "#000"
      }
    },

    // ----------------------------------------------------
    // INIT
    // ----------------------------------------------------
    init(cfg) {
      if (this._initialized) return;
      this._initialized = true;

      // 1) Base config first
      this.config = { ...cfg }; // shallow clone so we don't mutate caller's object

      // 2) Merge styles safely (optional)
      const baseStyles = this.defaultStyles;
      const cfgStyles = cfg.styles || {};

      this.config.styles = {
        ...baseStyles,
        ...cfgStyles,
        unitColors: {
          ...baseStyles.unitColors,
          ...(cfgStyles.unitColors || {})
        },
        unitLabels: {
          ...baseStyles.unitLabels,
          ...(cfgStyles.unitLabels || {})
        }
      };

      // 3) Rest of your existing init logic
      // this.config.defaultHighlightColor = cfg.defaultHighlightColor || "#F9D648";
      this.config.floor = cfg.floor != null ? String(cfg.floor) : null;
      this.activeMapId = cfg.mapId != null ? String(cfg.mapId) : null;

      // Callback hooks
      this.config.onUnitHover = typeof cfg.onUnitHover === "function" ? cfg.onUnitHover : null;
      this.config.onUnitClick = typeof cfg.onUnitClick === "function" ? cfg.onUnitClick : null;

      this.container = document.querySelector(cfg.container);
      if (!this.container) {
        console.error("PynMapSDK: Container not found:", cfg.container);
        return;
      }

      this._showLoading("Verifying partner...");

      if (!cfg.apiKey) return this._showError("API Key is required.");
      if (!cfg.propertyId) return this._showError("propertyId is required.");

      // VERIFY PARTNER → FETCH CONFIG → LOAD SVGs → BOOT
      this._verifyPartner(cfg.apiKey, cfg.propertyId)
        .then(v => {
          if (!v.success) return this._showError(v.error);
          this._showLoading("Loading property map...");
          return this._fetchConfig(cfg.propertyId, cfg.apiKey);
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
    async _verifyPartner(apiKey, propertyId) {
      try {
        const url = `${this._apiBase()}/api/partner/maps/authorized?propertyId=${propertyId}`;
        const res = await fetch(url, { headers: { "X-API-Key": apiKey } });

        if (!res.ok) {
          if (res.status === 401) return { success: false, error: "Invalid API Key" };
          if (res.status === 404) return { success: false, error: "Property not found" };
          return { success: false, error: "Partner verification failed" };
        }

        return { success: true };
      } catch {
        return { success: false, error: "Network error verifying partner" };
      }
    },

    async _fetchConfig(propertyId, apiKey) {
      try {
        const url = `${this._apiBase()}/api/partner/maps/fetch_data?propertyId=${propertyId}`;
        const res = await fetch(url, { headers: { "X-API-Key": apiKey } });

        if (!res.ok) {
          if (res.status === 401) return { success: false, error: "Invalid API Key" };
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
      this.data.sitemap = data.sitemap || null;
      this.data.floorplates = data.floorplates || [];
      this.data.floorplans = data.floorplans || [];
      this.data.units = data.units || [];

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
    // ----------------------------------------------------
    async _loadAllSVGs() {
      const entries = [];

      if (this.data.sitemap) {
        entries.push({
          mapId: String(this.data.sitemap.mapId),
          svgUrl: this.data.sitemap.svgUrl
        });
      }

      this.data.floorplates.forEach(fp => {
        entries.push({
          mapId: String(fp.mapId),
          svgUrl: fp.svgUrl
        });
      });

      await Promise.all(entries.map(m =>
        this._loadSVG(m.svgUrl).then(svg => {
          if (svg) this.svgCache[m.mapId] = svg;
        })
      ));
    },

    async _loadSVG(url) {
      try {
        const r = await fetch(url);
        if (!r.ok) return null;

        const txt = await r.text();
        const doc = new DOMParser().parseFromString(txt, "image/svg+xml");
        return doc.querySelector("svg");
      } catch {
        return null;
      }
    },


    // ----------------------------------------------------
    // RENDER MAPS
    // ----------------------------------------------------
    _renderMaps() {
      const c = this.container;
      c.innerHTML = "";
      c.style.position = "relative";

      Object.entries(this.svgCache).forEach(([mapId, svg]) => {
        const clone = svg.cloneNode(true);
        clone.setAttribute("data-map-id", mapId);
        clone.style.display = mapId === this.activeMapId ? "block" : "none";

        // Apply global text styles (once per SVG)
        this._applyGlobalLabelStyles(clone, this.config.styles.unitLabels);

        // AUTO SCALE SVG: fit inside whatever container partner gives
        clone.removeAttribute("width");
        clone.removeAttribute("height");
        clone.setAttribute("preserveAspectRatio", "xMidYMid meet");
        clone.style.width = "100%";
        clone.style.height = "100%";

        c.appendChild(clone);

        if (mapId === this.activeMapId) {
          this._enablePanZoom(clone);
        }
      });

      // Container should constrain the SVG
      c.style.overflow = "hidden";
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
        beforeZoom: function () { },
        onZoom: function () {
          // keep map roughly centered as user zooms
          this.center();
        }
      });

      // Ensure center on load
      svgEl._pz.fit();
      svgEl._pz.center();
    },


    // ----------------------------------------------------
    // FLOOR / MAP CHANGE
    // ----------------------------------------------------
    changeMap(mapId) {
      const id = String(mapId);
      if (!this._mapExists(id)) return;

      this.activeMapId = id;
      this._lastHoverPid = null; // reset hover state

      // Hide all maps
      const svgs = this.container.querySelectorAll("svg[data-map-id]");
      svgs.forEach(svg => {
        svg.style.display = "none";
      });

      // Show new active map
      const activeSvg = this.container.querySelector(`svg[data-map-id="${id}"]`);
      if (!activeSvg) return;

      activeSvg.style.display = "block";

      // Re-enable pan/zoom fresh each time
      this._enablePanZoom(activeSvg);

      // Always fit + center new map
      setTimeout(() => {
        if (activeSvg._pz) {
          activeSvg._pz.fit();
          activeSvg._pz.center();
        }
      }, 20);

      this._highlightAllUnits();
      this._bindUnitEvents();
    },

    changeFloor(floorNumber) {
      const fp = this._findFloorplateByFloor(floorNumber);

      if (!fp) {
        // No specific floorplate → just highlight everything on current map
        this._highlightAllUnits();
        return;
      }

      const floorMapId = String(fp.mapId);

      if (this.activeMapId === floorMapId) {
        // Same map, only change highlights
        this._highlightUnitsForFloor(floorNumber);
        return;
      }

      // Change map then highlight for that floor
      this.changeMap(floorMapId);
      setTimeout(() => {
        this._highlightUnitsForFloor(floorNumber);
      }, 30);
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

      // Click
      svg.addEventListener("click", (e) => {
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

    _unitStatus(unit) {
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
      const host = location.hostname;
      return host.startsWith("localhost") || host.startsWith("127")
        ? "http://localhost:3000"
        : "https://pynwheelconnect.com";
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
      }
    };
  }

})(window);