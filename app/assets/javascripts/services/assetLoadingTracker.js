class AssetLoadingTracker {
  constructor({ loaderSelector = null, retry = 100, timeout = 60000 }) {
    this.recheckTime = retry || 100;
    this.timeoutTime = timeout || 60000;
    this.loader = loaderSelector ? $(loaderSelector) : null;
    this.isWatching = false;
    this.assetsList = [];
    this.visibleAssetsList = [];
    if (this.loader) {
      this.loader.removeClass("hidden");
    }
  }

  /**
   * Check if all registered assets have been loaded.
   * If a loader was provided, it will hide it once all assets are loaded.
   * @param {boolean} checkVisibility - Checks if asset is loaded and visible in DOM.
   */
  checkAssetsLoaded(checkVisibility = false) {
    return this.assetsList.every(({ node, url, type, completed }) => {
      if (checkVisibility && this.visibleAssetsList.length) {
        const visibleAsset = this.findDOMAssetByNode(node, true);
        completed = completed && visibleAsset.completed;
      }

      return (
        completed ||
        (node
          ? this.isAssetLoaded(node, type, checkVisibility)
          : url
          ? this.isAssetLoaded(url, type, checkVisibility)
          : false)
      );
    });
  }

  /**
   * Checks if an asset is fully loaded.
   * @param {SVGElement | HTMLImageElement | HTMLElement} node - The asset node (DOM element).
   * @returns {object} - Returns asset object { node: HTMLElement, url: string, type: string, conmpleted: boolean }.
   */
  findDOMAssetByNode(assetNode, inVisibleAssetsList = false) {
    if (!assetNode) return null;

    if (inVisibleAssetsList) {
      const index = this.assetsList.findIndex(({ node }) =>
        assetNode.isSameNode(node)
      );
      if (index > -1) return this.assetsList[index];
      else null;
    }

    const index = this.assetsList.findIndex(({ node }) =>
      assetNode.isSameNode(node)
    );
    if (index > -1) return this.assetsList[index];
  }

  /**
   * Checks if an asset is fully loaded.
   * @param {HTMLElement | string} asset - The asset node (DOM element) o'r URL.
   * @param {type} type - The asset type (img, svg, script, style, css).
   * @returns {boolean} - Returns true if the asset is fully loaded.
   */
  isAssetLoaded(asset, type, checkVisibility = false) {
    if (!asset) return false;

    let assetNode = null;
    let assetUrl = null;

    if (typeof asset === "string") {
      assetUrl = asset;
    } else if (asset instanceof SVGElement) {
      assetNode = asset;
      assetUrl = asset.parentElement?.dataset?.svgUrl;
    } else if (asset instanceof HTMLImageElement) {
      assetNode = asset;
      assetUrl = asset.src;
    } else if (asset instanceof HTMLElement) {
      assetNode = asset;
      assetUrl = asset.src || asset.href;
    }

    if (!assetNode && !assetUrl) return false;
    const listAsset = this.findDOMAssetByNode(assetNode);
    const visibleAsset = this.findDOMAssetByNode(
      checkVisibility && ["img", "svg"].includes(listAsset.type) && assetNode,
      true
    );

    if (assetNode) {
      if (!listAsset) return false;

      if (checkVisibility) {
        if (!visibleAsset) return false;

        if (visibleAsset.completed) return true;
      } else {
        if (listAsset.completed) return true;
      }
    }

    switch (assetNode ? listAsset.type : type) {
      case "img":
        listAsset.completed =
          assetNode instanceof HTMLImageElement && assetNode.complete;

        if (checkVisibility) {
          visibleAsset.completed =
            listAsset.completed && assetNode.naturalWidth > 0;

          return visibleAsset.completed;
        } else return listAsset.completed;

      case "svg":
        listAsset.completed =
          assetNode instanceof SVGElement &&
          assetNode.hasChildNodes() &&
          document.body.contains(assetNode);

        if (checkVisibility) {
          visibleAsset.completed =
            listAsset.completed &&
            assetNode.clientWidth > 0 &&
            assetNode.clientHeight > 0;

          return visibleAsset.completed;
        } else return listAsset.completed;

      case "script":
        return (listAsset.completed = assetUrl
          ? document.querySelector(`script[src="${assetUrl}"]`) !== null
          : false);

      case "style":
      case "css":
        return (listAsset.completed = assetUrl
          ? document.querySelector(`link[href="${assetUrl}"]`) !== null
          : false);

      default:
        console.warn(`Unsupported asset type: ${type}`);
        return false;
    }
  }

  /**
   * Watches asset loading and resolves the promise when all assets are loaded.
   * @returns {Promise} - Resolves when all assets are loaded, rejects if timeout is exceeded.
   */
  watchAssetsLoading({
    checkVisibility = false,
    timeout = this.timeoutTime,
    recheck = this.recheckTime,
  } = {}) {
    return new Promise((resolve, reject) => {
      if (this.isWatching) return;
      this.isWatching = true;

      const startTime = Date.now();

      const checkLoadingStatus = () => {
        if (this.checkAssetsLoaded(checkVisibility)) {
          this.isWatching = false;
          resolve({
            ok: true,
            message: "All assets have been successfully loaded!",
          });
        } else if (Date.now() - startTime >= timeout) {
          this.isWatching = false;
          reject({
            ok: false,
            message: "Timeout: Some assets did not load within the given time.",
          });
        } else {
          setTimeout(checkLoadingStatus, recheck);
        }
      };

      checkLoadingStatus();
    });
  }

  /**
   * Check if an asset is already in assetsList list.
   * @param {HTMLElement} assetNode - The DOM node of the asset.
   * @param {string} assetUrl - The URL of the asset.
   * @param {string} assetType - The type of the asset.
   * @returns {Object} { exists: Boolean, index: Number }
   */
  existsInAssets(assetNode, assetUrl, assetType, inVisibleAssetsList = false) {
    const index = (
      inVisibleAssetsList ? this.visibleAssetsList : this.assetsList
    ).findIndex(
      ({ node, url, type }) =>
        type === assetType && (node?.isSameNode(assetNode) || url === assetUrl)
    );
    return { exists: index > -1, index };
  }

  /**
   * Add an asset to the assetsList list.
   * @param {Object} asset - { node: HTMLElement, url: string, type: string }
   * @returns {boolean} return boolean status for added or not
   */
  addOrUpdateAsset(asset, inVisibleAssetsList = false) {
    const { node, url, type, completed } = asset;
    const { exists, index } = this.existsInAssets(node, url, type);

    if (inVisibleAssetsList) {
      if (exists) {
        const {
          exists: existsInVisisbleAssets,
          index: visibleAssetsListIndex,
        } = this.existsInAssets(node, url, type, true);

        if (existsInVisisbleAssets) {
          const existingAsset = this.visibleAssetsList[visibleAssetsListIndex];
          if (url) existingAsset.url = url;
          if (node) existingAsset.node = node;
          if (type) existingAsset.type = type;
          if (completed || completed === false)
            existingAsset.completed = completed;
        } else {
          this.visibleAssetsList.push({...this.assetsList[index], completed: false});
        }
      } else {
        this.assetsList.push(asset);
        this.visibleAssetsList.push(asset);
      }
    } else {
      if (exists) {
        const existingAsset = this.assetsList[index];
        if (url) existingAsset.url = url;
        if (node) existingAsset.node = node;
        if (type) existingAsset.type = type;
        if (completed || completed === false)
          existingAsset.completed = completed;
      } else {
        this.assetsList.push(asset);
      }
    }
  }

  /**
   * Clear all tracked assets.
   */
  clearAllAssetsLists() {
    this.assetsList = [];
    this.visibleAssetsList = [];
  }

  /**
   * Clear all visisble tracked assets.
   */
  clearVisibleAssetsList() {
    this.visibleAssetsList = [];
  }

  /**
   * Turn off the loader.
   */
  turnoffLoader() {
    if (this.loader) {
      this.loader.addClass("hidden");
    }
  }
}
