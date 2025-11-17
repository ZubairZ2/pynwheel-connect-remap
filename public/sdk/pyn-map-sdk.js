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

    unitsByMap: {},
    pointerIdsByMap: {},
    svgCache: {},

    // ----------------------------------------------------
    // INIT
    // ----------------------------------------------------
    init(cfg) {
      if (this._initialized) return;
      this._initialized = true;

      this.config = cfg;
      this.config.defaultHighlightColor = cfg.defaultHighlightColor || "#F9D648";
      this.activeMapId = cfg.mapId ? String(cfg.mapId) : null;

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
      this._injectTooltip();
      this._highlightAllUnits();   // highlight units on initial map
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

      (this.data.units || []).forEach(u => {
        const mapId = String(u.mapId);

        if (!this.unitsByMap[mapId]) this.unitsByMap[mapId] = [];
        if (!this.pointerIdsByMap[mapId]) this.pointerIdsByMap[mapId] = [];

        this.unitsByMap[mapId].push(u);

        if (u.pointer_data?.id) {
          this.pointerIdsByMap[mapId].push(u.pointer_data.id);
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
        // AUTO SCALE SVG
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

        contain: true,                // ⭐ stays inside container
        viewportSelector: null,
        minZoom: 0.5,
        maxZoom: 4,

        zoomScaleSensitivity: 0.15,
        beforeZoom: function() {},

        onZoom: function() {
          this.center();
        }
      });

      // ⭐ Ensure center on load
      svgEl._pz.fit();
      svgEl._pz.center();
    },


    // ----------------------------------------------------
    // FLOOR CHANGE
    // ----------------------------------------------------

    changeMap(mapId) {
      const id = String(mapId);
      if (!this._mapExists(id)) return;

      this.activeMapId = id;

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

      // ⭐ Always fit + center new map
      setTimeout(() => {
        if (activeSvg._pz) {
          activeSvg._pz.fit();
          activeSvg._pz.center();
        }
      }, 20);

      this._highlightAllUnits();
    },

    // ----------------------------------------------------
    // HIGHLIGHT: ALL UNITS
    // ----------------------------------------------------
    _highlightAllUnits() {
      const activeSvg = this._getActiveSvg();
      if (!activeSvg) return;

      this._clearUnitStyles();

      const color = this.config.defaultHighlightColor;
      const units = this.unitsByMap[this.activeMapId] || [];

      units.forEach(u => {
        const id = u.pointer_data?.id;
        if (!id) return;

        const el = activeSvg.querySelector(`#${CSS.escape(id)}`);
        if (el) el.style.fill = color;
      });
    },

    // ----------------------------------------------------
    // HIGHLIGHT: UNITS
    // ----------------------------------------------------
    highlightUnits(unitIds) {
      if (!unitIds) return;

      const activeSvg = this._getActiveSvg();
      if (!activeSvg) return;

      // Normalize input → always array of strings
      const ids = Array.isArray(unitIds)
        ? unitIds.map(String)
        : [String(unitIds)];

      const units = this.unitsByMap[this.activeMapId] || [];

      // Clear previous highlight
      this._clearUnitStyles();

      ids.forEach(id => {
        const unit = units.find(
          u => String(u.assetId) === id || String(u.unitNumber) === id
        );

        if (!unit?.pointer_data?.id) return;

        const target = activeSvg.querySelector(
          `#${CSS.escape(unit.pointer_data.id)}`
        );
        if (!target) return;

        // Apply highlight color
        target.classList.add("pyn-highlight");
        target.style.fill = this.config.defaultHighlightColor;

        // Tooltip
        this._bindTooltip(
          target,
          unit.unitNumber || unit.marketing_name || "Unit"
        );
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
        el.classList.remove("pyn-selected-unit");
        el.classList.remove("pyn-highlight");
      });
    },

    // ----------------------------------------------------
    // TOOLTIP
    // ----------------------------------------------------
    _injectTooltip() {
      if (document.getElementById("pyn-tooltip")) return;

      const t = document.createElement("div");
      t.id = "pyn-tooltip";
      Object.assign(t.style, {
        position: "fixed",
        padding: "4px 8px",
        background: "rgba(0,0,0,0.8)",
        color: "#fff",
        fontSize: "12px",
        borderRadius: "4px",
        pointerEvents: "none",
        opacity: "0",
        transition: "opacity 0.15s",
        zIndex: 999999
      });
      document.body.appendChild(t);
    },

    _bindTooltip(target, label) {
      const tooltip = document.getElementById("pyn-tooltip");
      if (!tooltip) return;

      target.onmouseenter = () => {
        tooltip.textContent = label;
        tooltip.style.opacity = "1";
      };
      target.onmousemove = e => {
        tooltip.style.left = e.clientX + 10 + "px";
        tooltip.style.top = e.clientY + 10 + "px";
      };
      target.onmouseleave = () => {
        tooltip.style.opacity = "0";
      };
    },


    // ----------------------------------------------------
    // HELPERS
    // ----------------------------------------------------
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

  if (!window.PynMapSDK) {
    window.PynMapSDK = {
      init(cfg) {
        return PynMapSDK.init.call(PynMapSDK, cfg);
      },
      highlightUnits(ids) {
        return PynMapSDK.highlightUnits.call(PynMapSDK, ids);
      },
      changeFloor(id) {
        return PynMapSDK.changeMap.call(PynMapSDK, id);
      }
    };
  }

})(window);