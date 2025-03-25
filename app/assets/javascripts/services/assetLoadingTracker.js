class AssetLoadingTracker {
  timeoutTime = 60000;
  recheckTime = 300;
  loader = null;
  isWatching = false;
  assetsList = [];
  visibleAssetsList = [];
  visibleAssetsTypes = ["img", "svg"];

  constructor({ loaderSelector = null, retry = null, timeout = null }) {
    this.recheckTime = retry || this.recheckTime;
    this.timeoutTime = timeout === 0 ? Infinity : timeout || this.timeoutTime;
    this.loader = loaderSelector ? $(loaderSelector) : null;
    if (this.loader) {
      this.loader.removeClass("hidden");
    }
  }

  /**
   * Checks if an asset exists in assets list.
   * @param {string} assetId - The asset id (Unique identifier).
   * @returns {object} - Returns asset object { node: HTMLElement, url: string, type: string, conmpleted: boolean } or null if not found.
   */
  findDOMAssetById(assetId, inVisibleAssetsList = false) {
    if (!assetId) return null;

    if (inVisibleAssetsList) {
      const nodeIndex = this.assetsList.findIndex(({ id }) => assetId === id);
      if (nodeIndex > -1) return this.assetsList[nodeIndex];
      else null;
    }

    const nodeIndex = this.assetsList.findIndex(({ id }) => assetId === id);
    if (nodeIndex > -1) return this.assetsList[nodeIndex];
  }

  /**
   * Checks if an asset exists in assets list.
   * @param {SVGElement | HTMLImageElement | HTMLElement} assetNode - The asset node (DOM element).
   * @param {string} assetId - The asset id (Unique identifier).
   * @returns {object} - Returns asset object { node: HTMLElement, url: string, type: string, conmpleted: boolean } or null if not found.
   */
  findDOMAssetByNodeAndId(assetNode, assetId, inVisibleAssetsList = false) {
    if (!assetNode || !assetId) return null;

    if (inVisibleAssetsList) {
      const nodeIndex = this.assetsList.findIndex(
        ({ node, id }) => assetNode.isSameNode(node) && assetId === id
      );
      if (nodeIndex > -1) return this.assetsList[nodeIndex];
      else null;
    }

    const nodeIndex = this.assetsList.findIndex(
      ({ node, id }) => assetNode.isSameNode(node) && assetId === id
    );
    if (nodeIndex > -1) return this.assetsList[nodeIndex];
  }

  /**
   * Checks if an asset exists in assets list.
   * @param {string} assetUrl - The asset url.
   * @param {string} assetId - The asset id (Unique identifier).
   * @returns {object} - Returns asset object { node: HTMLElement, url: string, type: string, conmpleted: boolean } or null if not found.
   */
  findDOMAssetByUrlAndId(assetUrl, assetId, inVisibleAssetsList = false) {
    if (!assetUrl || !assetId) return null;

    if (inVisibleAssetsList) {
      const nodeIndex = this.assetsList.findIndex(
        ({ url, id }) => assetUrl === url && assetId === id
      );
      if (nodeIndex > -1) return this.assetsList[nodeIndex];
      else null;
    }

    const nodeIndex = this.assetsList.findIndex(
      ({ url, id }) => assetUrl === url && assetId === id
    );
    if (nodeIndex > -1) return this.assetsList[nodeIndex];
  }

  /**
   * Sets an error message for an asset and marks it as incomplete.
   * @param {Object} asset - The asset object to update.
   * @param {string} errorMessage - The error message to associate with the asset.
   */
  setAssetError(asset, errorMessage) {
    if (asset) {
      asset.error = errorMessage;
      asset.completed = false;
    }
  }

  /**
   * Check if all registered assets have been loaded.
   * If a loader was provided, it will hide it once all assets are loaded.
   * If any asset has an error, it will throw an error with the error message.
   * @param {boolean} checkVisibility - Checks if asset is loaded and visible in DOM.
   * @returns {boolean} - Returns true if the asset is fully loaded, otherwise throws an error if an asset has an error, or returns false.
   * @throws {Error} - Throws an error if any asset has an associated error (e.g., failed to load).
   */
  checkAssetsLoaded(checkVisibility = false) {
    return this.assetsList.every(({ id, node, url, type, completed, error }) => {
      const nodeCheck = id && node;
      const urlCheck = id && url;

      // If an asset has an error, throw the error message
      if (error) throw new Error(error);

      if (checkVisibility && this.visibleAssetsList.length) {
        const visibleAsset = nodeCheck
          ? this.findDOMAssetByNodeAndId(node, id, true)
          : urlCheck
          ? this.findDOMAssetByUrlAndId(url, id, true)
          : id
          ? this.findDOMAssetById(id, true)
          : null;
        completed = completed && visibleAsset?.completed;
      }

      const nodeURLCheck = nodeCheck || urlCheck;
      return (
        completed ||
        (nodeURLCheck
          ? this.isAssetLoaded(nodeURLCheck, id, type, checkVisibility)
          : false)
      );
    });
  }

  /**
   * Checks if an asset is fully loaded.
   * @param {HTMLElement | string} asset - The asset node (DOM element) or URL.
   * @param {string} assetId - The asset id (Unique identifier).
   * @param {type} type - The asset type (img, svg, script, style, css).
   * @param {boolean} checkVisibility - Checks if asset is loaded and visible in DOM.
   * @returns {boolean} - Returns true if the asset is fully loaded, otherwise logs an error and returns false.
   */
  isAssetLoaded(asset, assetId, type, checkVisibility = false) {
    if (!asset || !assetId) return false;

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

    const nodeCheck = assetId && assetNode;
    const urlCheck = assetId && assetUrl;

    if (!nodeCheck && !urlCheck) return false;
    const listAsset = nodeCheck
      ? this.findDOMAssetByNodeAndId(nodeCheck, assetId)
      : urlCheck
      ? this.findDOMAssetByUrlAndId(urlCheck, assetId)
      : null;

    if (listAsset) {
      if (listAsset.completed) return true;
    } else return false;

    const isVisibleAssetType = this.visibleAssetsTypes.includes(listAsset.type);
    if (isVisibleAssetType) {
      if (!assetNode) return false;
    }

    const visibleAsset =
      checkVisibility && isVisibleAssetType
        ? nodeCheck
          ? this.findDOMAssetByNodeAndId(nodeCheck, assetId, true)
          : urlCheck
          ? this.findDOMAssetByUrlAndId(urlCheck, assetId, true)
          : null
        : null;

    if (checkVisibility) {
      if (visibleAsset) {
        if (visibleAsset.completed) return true;
      } else return false;
    }

    // If the asset has an error, throw the error message
    if (listAsset.error) {
      throw new Error(listAsset.error);
    }

    // Normal asset loading checks for different asset types
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
          ? hasValue(document.querySelector(`script[src="${assetUrl}"]`))
          : false);

      case "style":
      case "css":
        return (listAsset.completed = assetUrl
          ? hasValue(document.querySelector(`link[href="${assetUrl}"]`))
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
    timeout = null,
    recheck = null,
  } = {}) {
    const timeoutDuration =
      timeout === 0 ? Infinity : timeout || this.timeoutTime;
    const retryIn = recheck || this.recheckTime;

    return new Promise((resolve, reject) => {
      if (this.isWatching) return;
      this.isWatching = true;

      const startTime = Date.now();

      const checkLoadingStatus = () => {
        try {
          if (this.checkAssetsLoaded(checkVisibility)) {
            this.isWatching = false;
            resolve({
              ok: true,
              message: "All assets have been successfully loaded!",
            });
          } else if (Date.now() - startTime >= timeoutDuration) {
            this.isWatching = false;
            reject({
              ok: false,
              message:
                "Timeout: Some assets did not load within the given time.",
            });
          } else {
            setTimeout(checkLoadingStatus, retryIn);
          }
        } catch (error) {
          this.isWatching = false;
          reject({
            ok: false,
            message: error.message,
          });
        }
      };

      checkLoadingStatus();
    });
  }

  /**
   * Check if an asset is already in assetsList list.
   * @param {HTMLElement} assetNode - The DOM node of the asset.
   * @param {string} assetUrl - The URL of the asset.
   * @param {string} assetId - The asset id (Unique identifier).
   * @param {string} assetType - The type of the asset.
   * @param {boolean} inVisibleAssetsList - find in visible assets list.
   * @returns {Object} { exists: Boolean, index: Number }
   */
  existsInAssets(
    assetNode,
    assetUrl,
    assetId,
    assetType,
    inVisibleAssetsList = false
  ) {
    const index = (
      inVisibleAssetsList ? this.visibleAssetsList : this.assetsList
    ).findIndex(
      ({ id, node, url, type }) =>
        id === assetId &&
        type === assetType &&
        (node?.isSameNode(assetNode) || url === assetUrl)
    );
    return { exists: index > -1, index };
  }

  /**
   * Add an asset to the assetsList list.
   * @param {Object} asset - { node: HTMLElement, url: string, type: string }
   * @returns {boolean} return boolean status for added or not
   */
  addOrUpdateAsset(asset, inVisibleAssetsList = false) {
    const { id, node, url, type, completed } = asset;
    if (!id || !node & !url) return false;
    const { exists, index: assetIndex } = this.existsInAssets(
      node,
      url,
      id,
      type
    );

    if (inVisibleAssetsList) {
      if (exists) {
        const {
          exists: existsInVisisbleAssets,
          index: visibleAssetsListIndex,
        } = this.existsInAssets(node, url, id, type, true);

        if (existsInVisisbleAssets) {
          const existingAsset = this.visibleAssetsList[visibleAssetsListIndex];
          if (url) existingAsset.url = url;
          if (node) existingAsset.node = node;
          if (completed || completed === false)
            existingAsset.completed = completed;
        } else {
          this.visibleAssetsList.push({
            ...this.assetsList[assetIndex],
            completed: false,
          });
        }
      } else {
        if (node instanceof HTMLImageElement) {
          node.onerror = () => {
            this.setAssetError(this.findDOMAssetByNodeAndId(node, id), "Image failed to load.");
          };
        }
        this.assetsList.push(asset);
        this.visibleAssetsList.push(asset);
      }
    } else {
      if (exists) {
        const existingAsset = this.assetsList[assetIndex];
        if (url) existingAsset.url = url;
        if (node) existingAsset.node = node;
        if (completed || completed === false)
          existingAsset.completed = completed;
      } else {
        if (node instanceof HTMLImageElement) {
          node.onerror = () => {
            this.setAssetError(this.findDOMAssetByNodeAndId(node, id), "Image failed to load.");
          };
        }
        this.assetsList.push(asset);
      }
    }
  }

  /**
   * Add an asset to the assetsList list.
   * @param {Object} asset - { node: HTMLElement, url: string, type: string }
   * @returns {boolean} return boolean status for added or not
   */
  deleteAsset(asset, inVisibleAssetListOnly = false) {
    const { id, node, url, type } = asset;
    if (!id || !node & !url) return false;
    const { exists, index: assetIndex } = this.existsInAssets(
      node,
      url,
      id,
      type
    );

    if (exists) {
      if (inVisibleAssetListOnly) {
        const {
          exists: existsInVisisbleAssets,
          index: visibleAssetsListIndex,
        } = this.existsInAssets(node, url, id, type, true);
        if (existsInVisisbleAssets)
          this.visibleAssetsList.splice(visibleAssetsListIndex, 1);
      } else {
        this.assetsList.splice(assetIndex, 1);
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
