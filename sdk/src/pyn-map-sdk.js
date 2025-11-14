(function (global) {

  const PynMapSDK = {
    _initialized: false,
    config: {},
    container: null,

    /******************************************************
     * 1) INITIALIZE SDK
     ******************************************************/
    create(config) {
      if (this._initialized) return;
      this._initialized = true;

      this.config = config;

      this.container = document.querySelector(config.container);
      if (!this.container) {
        console.error("PynMapSDK: container not found:", config.container);
        return;
      }

      this._showLoading();

      this._verifyPartner()
        .then(result => {
          if (!result.success) {
            this._showError(result.error);
            return null;
          }
          return this._loadSVG(result.svgUrl);
        })
        .then(svgEl => {
          if (svgEl) this._renderSVG(svgEl);
        })
        .catch(() => {
          this._showError("Unexpected SDK error.");
        });
    },

    /******************************************************
     * 2) VERIFY PARTNER (API KEY + MAP ID)
     ******************************************************/
    async _verifyPartner() {
      const { apiKey, propertyId, mapId } = this.config;

      try {
        const url =
          `${this._apiBase()}/sdk/authorized/${propertyId}/config` +
          `?api_key=${apiKey}&map_id=${mapId}`;

        const res = await fetch(url);

        if (res.status === 401)
          return { success: false, error: "Invalid API Key." };

        if (res.status === 404)
          return { success: false, error: "Config route not found (404)." };

        if (!res.ok)
          return { success: false, error: `Server Error (${res.status})` };

        const json = await res.json();

        if (!json.svgUrl)
          return { success: false, error: "No SVG URL returned from server." };

        return { success: true, svgUrl: json.svgUrl };

      } catch {
        return { success: false, error: "Network error contacting server." };
      }
    },

    /******************************************************
     * 3) LOAD SVG
     ******************************************************/
    async _loadSVG(svgUrl) {
      try {
        const res = await fetch(svgUrl);

        if (!res.ok) {
          this._showError(`SVG failed to load (${res.status})`);
          return null;
        }

        const text = await res.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, "image/svg+xml");
        return doc.querySelector("svg");

      } catch {
        this._showError("Network error loading SVG.");
        return null;
      }
    },

    /******************************************************
     * 4) RENDER SVG
     ******************************************************/
    _renderSVG(svgEl) {
      this.container.innerHTML = "";
      this.container.appendChild(svgEl);
    },

    /******************************************************
     * HELPERS
     ******************************************************/
    _apiBase() {
      const host = location.hostname;
      if (host === "localhost" || host === "127.0.0.1")
        return "http://localhost:3000";

      return "https://pynwheelconnect.com";
    },

    _showLoading() {
      this.container.textContent = "Loading map...";
    },

    _showError(msg) {
      this.container.textContent = `Error: ${msg}`;
    }
  };

  // expose globally
  global.PynMapSDK = PynMapSDK;

})(window);