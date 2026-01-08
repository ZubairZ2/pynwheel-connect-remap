var VALID_SVG_SHAPES = [
  "path",
  "polyline",
  "rect",
  "polygon",
  "ellipse",
  "circle",
];
var DEFAULT_FILL_COLOR = "default-fill-color";
var svgMode = definedAndHasValue(svgMode) ? svgMode : false;

var map_marker_color = definedAndHasValue(map_marker_color)
  ? map_marker_color 
  : "#d37474";

var amenity_marker_color = definedAndHasValue(amenity_marker_color)
  ? amenity_marker_color
  : "#d37474";

function setSVG(container, svgElement, options) {
  const $svgElement = $(svgElement);

  if (svgElement.nodeName === "svg") {
    const { svgPosition = 0, floor = null } = options;
    const childrenArray = Array.from(container?.children || []);
    const attributes = {
      id: hasFloorplate() ? `viewArea-${floor}` : "viewArea",
      draggable: false,
      class: "viewArea floorplate-image sitemap-image map-image-align",
      "data-map_id": "map",
      name: "viewArea",
      position: "relative",
    };

    Object.entries(attributes).forEach(([key, value]) =>
      svgElement.setAttribute(key, value)
    );

    const svgIndex = childrenArray.findIndex(
      (el) => el.tagName.toLowerCase() === "svg" && el.id === attributes.id
    );
    const newChildren =
      svgIndex > -1
        ? [
            ...childrenArray.slice(0, svgIndex),
            svgElement,
            ...childrenArray.slice(svgIndex + 1),
          ]
        : [
            ...childrenArray.slice(0, svgPosition),
            svgElement,
            ...childrenArray.slice(svgPosition),
          ];
    container.innerHTML = "";
    container.append(...newChildren);
  }

  if (!mobileCheck() && options.activateHoverEffect) {
    const $shapes = $svgElement.find(
      [...VALID_SVG_SHAPES, "text"].join(", ") +
        ":not(.cloned-unit):not(.cloned-amenity)"
    );

    $shapes.on("mouseenter", function (e) {
      if (addmode) {
        const { shape, valid } = getTheValidSVGShape(this);
        if (valid) {
          const svgPoint = getNormalizedMouseCoordinates(e, svgElement);
          const { svgShape, markable } = getTheMarkabeSVGShape(
            shape,
            svgPoint,
            true
          );

          if (markable) {
            if (!svgShape.hasAttribute(DEFAULT_FILL_COLOR)) {
              svgShape.setAttribute(DEFAULT_FILL_COLOR, svgShape.style.fill);
            }
            svgShape.style.fill = map_marker_color;
          }
        }
      }
    });

    $shapes.on("mouseleave", function () {
      $shapes.each(function () {
        if (toRgbColor(this.style.fill) === toRgbColor(map_marker_color)) {
          this.style.fill = this.getAttribute(DEFAULT_FILL_COLOR);
        }
      });
    });
  }

  if (options.setSVGImageHeight) setSvgOrImageHeight($(container).find("svg"));
}


function uniquifySVGIds(svgElement, floorId) {
  if (!svgElement) return;

  const idMap = new Map();

  function isUnitsOrAmenities(el) {
    let node = el;

    while (node && node !== el.ownerSVGElement) {
      if (
        node.tagName === 'g' &&
        node.id &&
        /^(units|amenities)/i.test(node.id)
      ) {
        return true;
      }
      node = node.parentElement;
    }

    return false;
  }

  // Elements to skip (Units and Amenities groups + their children)
  // const skipSelectors = ["g#Units", "g#Units_", "g#Amenities", "#Units_ *", "#Units *", "#Amenities *"];

  // STEP 1: Find and rename all ids (except skipped ones)
  svgElement.querySelectorAll('[id]').forEach(el => {
    // Skip if inside Units or Amenities
    if (isUnitsOrAmenities(el)) return;

    const oldId = el.id;
    const newId = `${oldId}_${floorId}`;
    console.log(`Renaming id: ${oldId} → ${newId}`);
    idMap.set(oldId, newId);
    el.id = newId;
  });

  // STEP 2: Update all references
  svgElement.querySelectorAll('*').forEach(el => {
    // Skip updating references inside Units or Amenities
    if (isUnitsOrAmenities(el)) return;

    // Attributes with url(#id)
    ["fill", "stroke", "filter", "clip-path", "mask", "style"].forEach(attr => {
      if (el.hasAttribute(attr)) {
        let val = el.getAttribute(attr);
        idMap.forEach((newId, oldId) => {
          if (val && val.includes(`url(#${oldId})`)) {
            val = val.replace(new RegExp(`url\\(#${oldId}\\)`, "g"), `url(#${newId})`);
          }
        });
        el.setAttribute(attr, val);
      }
    });

    // href and xlink:href
    idMap.forEach((newId, oldId) => {
      // Normal href
      if (el.hasAttribute("href") && el.getAttribute("href") === `#${oldId}`) {
        el.setAttribute("href", `#${newId}`);
      }

      // xlink:href in namespace
      const XLINK_NS = "http://www.w3.org/1999/xlink";
      if (el.getAttributeNS(XLINK_NS, "href") === `#${oldId}`) {
        console.log(`Updating xlink:href on <${el.tagName}>: #${oldId} → #${newId}`);
        el.setAttributeNS(XLINK_NS, "xlink:href", `#${newId}`);
      }
    });
  });
}

function parseSVG(svgText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, "image/svg+xml");
  return doc.querySelector("svg");
}

async function fetchSVG(
  dataSetSelector,
  options = {
    floor: null,
    tracker: null,
    svgPosition: 0,
    trackerAssetId: null,
    setSVGImageHeight: false,
    activateHoverEffect: false,
    trackerVisibilityCheck: false
  }
) {
  const container = document.querySelector(dataSetSelector);
  let imageUrl = container?.dataset.svgUrl;

  if (!imageUrl?.endsWith(".svg")) return;

  const { tracker, trackerAssetId, trackerVisibilityCheck } =
    options;

  const asset = {
    id: trackerAssetId || `svg-${hasFloorplate() ? "floorplate" : "sitemap"}`,
    node: null,
    url: imageUrl,
    type: "svg",
    completed: false,
  };

  tracker?.addOrUpdateAsset(asset, trackerVisibilityCheck);

  try {
    const response = await fetch(imageUrl);
    // const response = await fetch(`/images/fetch_svg_image?svg_url=${imageUrl}`);

    if (!response.ok)
      throw new Error(`Failed to fetch SVG: ${response.statusText}`);

    const svgText = await response.text();
    const svgElement = parseSVG(svgText);

    if (!svgElement) throw new Error("No <svg> element found in the response.");

    const { floor = null } = options;
    if(hasFloorplate() && floor)
      uniquifySVGIds(svgElement, `f${floor}`);

    parsedSVGs.push(svgElement);
    setSVG(container, svgElement, options);

    if(fontFamily)
      updateSvgTextFontFamily(svgElement, fontFamily);
    
    if (tracker) {
      asset.node = svgElement;
      tracker.addOrUpdateAsset(asset, trackerVisibilityCheck);
    }
  } catch (error) {
    console.error("Error loading SVG:", error);
    asset.completed = false;
    tracker.setAssetError(asset, error.message);
  }

  enableZoom();
}

function setSvgOrImageHeight($svg) {
  const svg = $svg[0];
  if (!svg) return;

  // IMPORTANT: do NOT scale relative to original dimensions
  // We force SVG to fill its wrapper 100%
  const wrapper = svg.parentElement;

  const w = wrapper.clientWidth;
  const h = wrapper.clientHeight;

  svg.setAttribute("width", w);
  svg.setAttribute("height", h);

  // Align coordinate system with original SVG
  const vb = svg.viewBox.baseVal;
  if (vb && vb.width > 0 && vb.height > 0) {
    svg.setAttribute("viewBox", `0 0 ${vb.width} ${vb.height}`);
  }
}

function floorBasedData(data = []) {
  return hasFloorplate()
    ? data.filter(
        ({ floor }) =>
          validFloor(floor) ||
          (!floor && ["object", "undefined"].includes(typeof floor))
      )
    : data;
}

function isCurrentFloorsSVG(svgElement) {
  if (hasFloorplate() && svgElement.parentElement) {
    const floor = svgElement.parentElement.id.split("_").pop();

    return (
      (svgElement.id ===
        `viewArea-${floor === "all" ? defaultSelectedFloor : floor}` &&
        validFloor(floor)) ||
      (parsedSVGs.length === 1 && svgElement.parentElement.id === "svg_map")
    );
  } else if (svgElement.id === "viewArea") {
    return true;
  }

  return false;
}

// function getPointerIdAndSelector(pointerData, dataset) {
//   let { tag = null, id = null, selector = null } = pointerData || {};
//   if (!tag && dataset) {
//     tag = dataset.tag || null;
//     id = dataset.id || null;
//     selector = dataset.selector || null;
//   }
//   return { id, selector: tag && id ? `${tag}#${id}` : selector };
// }

function getPointerIdAndSelector(pointerData, dataset) {
  let { tag = null, id = null, selector = null } = pointerData || {};

  if (!tag && dataset) {
    tag = dataset.tag || null;
    id = dataset.id || null;
    selector = dataset.selector || null;
  }

  if (tag && id) {
    if (/^[0-9]/.test(id)) {
      selector = `${tag}[id="${id}"]`;
    } else {
      selector = `${tag}#${id}`;
    }
  }

  return { id, selector };
}

function getDuplicateBlock(svgElement, selector, cloneClass, itemId) {
  const clonedSelector = selector.endsWith("_cloned")
    ? selector
    : `${selector}_cloned`;
  const existingDuplicate =
    svgElement.getElementById(clonedSelector) ||
    svgElement.querySelector(clonedSelector);
  if (existingDuplicate) {
    switch (cloneClass) {
      case "cloned-unit":
        if (parseInt(existingDuplicate.dataset.unitId) === parseInt(itemId)) {
          $(existingDuplicate).removeClass("hidden");
          return existingDuplicate;
        }

        break;
      case "cloned-amenity":
        if (
          parseInt(existingDuplicate.dataset.amenityId) === parseInt(itemId)
        ) {
          $(existingDuplicate).removeClass("hidden");
          return existingDuplicate;
        }
    }
  }
  return null;
}

function applyDataAttributes(duplicateBlock, dataAttributes) {
  Object.entries(dataAttributes).forEach(([key, value]) => {
    if (key.includes("href") && value.includes("remove_")) {
      value = addSvgDeletionParamInURL(value);
    }
    duplicateBlock.setAttribute(key, value);
  });
}

function clickLastClonedElement(blockParent) {
  const lastClonedEl = getLastClonedJQueryElement(blockParent);
  if (lastClonedEl) $(lastClonedEl).click();
}

function positionTooltip(e, tooltip) {
  tooltip.style.position = "absolute";
  tooltip.style.left = `${e.offsetX + 10}px`;
  tooltip.style.top = `${e.offsetY + 20}px`;
  tooltip.style.visibility = "visible";
}

function setupAmenityToolTip(block, data, svgElement) {
  const toolTipSpan = document.createElement("span");

  toolTipSpan.classList.add("amenityTooltipText");
  toolTipSpan.innerHTML = `
    <h2 style="display: ${data.show_name ? "block" : "none"}">
      ${data.name}
    </h2>
    <img src="${data.image_url}" alt="Image Title">
  `;

  svgElement.insertAdjacentElement("afterend", toolTipSpan);

  return {
    tooltip: toolTipSpan,
    eventHandlers: {
      showTooltip: (e) => {
        positionTooltip(e, toolTipSpan, svgElement.parentElement);
      },
      hideTooltip: () => {
        toolTipSpan.style.visibility = "hidden";
      },
    },
  };
}

function setupAmenityFillHandlers(duplicateBlock, fillOnHover = false) {
  // const amenityFillColor = amenity_marker_color;

  // if (fillOnHover) {
  //   return {
  //     fillAmenityBlock: () => {
  //       if (!duplicateBlock.hasAttribute(DEFAULT_FILL_COLOR)) {
  //         duplicateBlock.setAttribute(
  //           DEFAULT_FILL_COLOR,
  //           duplicateBlock.style.fill
  //         );
  //       }
  //       duplicateBlock.style.fill = amenityFillColor;
  //     },
  //     removeAmenityBlockFill: () => {
  //       duplicateBlock.style.fill =
  //         duplicateBlock.getAttribute(DEFAULT_FILL_COLOR);
  //     },
  //   };
  // }

  duplicateBlock.setAttribute("fill", amenity_marker_color);
  return {};
}

function createMouseEventHandlers({
  onmouseEnter,
  onmouseLeave,
  onmouseUp,
} = {}) {
  return {
    mouseenterEvent: (e) => {
      (onmouseEnter || []).forEach((fn) => fn?.(e));
    },
    mouseleaveEvent: (e) => {
      (onmouseLeave || []).forEach((fn) => fn?.(e));
    },
    mouseupEvent: (e) => {
      (onmouseUp || []).forEach((fn) => fn?.(e));
    },
  };
}

function setupMouseEvents(
  blockParent,
  { events: { mouseupEvent, mouseenterEvent, mouseleaveEvent } = {} } = {}
) {
  const isMobileOrTabletView = isMobileOrTablet();
  const $blockParent = $(blockParent);

  if (mouseupEvent) {
    $blockParent.on("mousedown touchstart", function (e) {
      if (e.type === "touchstart") {
        this.clickStartX = e.touches[0].clientX;
        this.clickStartY = e.touches[0].clientY;
      } else {
        this.clickStartX = e.clientX;
        this.clickStartY = e.clientY;
      }
      this.clickStartTime = Date.now();
    });

    $blockParent.on("mouseup touchend", function (e) {
      if (
        (isMobileOrTabletView && e.type === "mouseup") ||
        (!isMobileOrTabletView && e.type === "touchend")
      ) {
        e.preventDefault();
        return;
      }

      if (e.isDefaultPrevented()) {
        return;
      }
      let touchEndX, touchEndY;

      if (e.type === "touchend") {
        touchEndX = e.changedTouches[0].clientX;
        touchEndY = e.changedTouches[0].clientY;
      } else {
        touchEndX = e.clientX;
        touchEndY = e.clientY;
      }

      const touchDuration = Date.now() - this.clickStartTime;
      const moveThreshold = 10;
      const timeThreshold = 300;

      e.preventDefault();

      if (
        Math.abs(touchEndX - this.clickStartX) < moveThreshold &&
        Math.abs(touchEndY - this.clickStartY) < moveThreshold &&
        touchDuration < timeThreshold
      ) {
        mouseupEvent(e);
      }
    });
  }

  if (isMobileOrTabletView) return;

  if (mouseenterEvent)
    $blockParent.on("mouseenter", function (e) {
      if (e.isDefaultPrevented()) return;
      e.preventDefault();
      mouseenterEvent(e);
    });

  if (mouseleaveEvent)
    $blockParent.on("mouseleave", function (e) {
      if (e.isDefaultPrevented()) return;
      e.preventDefault();
      mouseleaveEvent(e);
    });
}

function processSvgBlock(svgElement, item, options, dataset = null) {
  const { pointer_data = {}, data_attributes, ...rest } = item || {};
  const { id, selector } = getPointerIdAndSelector(pointer_data, dataset);
  if (!selector) return;

  let block;

  try {
    block = svgElement.querySelector(selector);
  } catch (e) {
    block = null;
    console.warn(`Invalid selector: ${selector}`, e);
    return;
  }

  if (!block) return;

  const { cloneClass } = options;
  const blockParent = block.parentElement;
  const $blockParent = $(blockParent);
  $blockParent.css({
    "pointer-events": "all",
    cursor: "pointer",
  });

  try {
    const existingDuplicate = getDuplicateBlock(
      svgElement,
      selector,
      cloneClass,
      item.id
    );
    if (existingDuplicate) {
      if (block.hasAttribute(DEFAULT_FILL_COLOR)) {
        block.style.fill = block.getAttribute(DEFAULT_FILL_COLOR);
      }
      return;
    }
  } catch (e) {
    console.warn("Duplicate not found.", e);
  }

  const duplicateBlock = block.cloneNode(true);
  if (block.hasAttribute(DEFAULT_FILL_COLOR)) {
    block.style.fill = block.getAttribute(DEFAULT_FILL_COLOR);
  }

  const $duplicateBlock = $(duplicateBlock);
  duplicateBlock.style.fill = "";

  if (data_attributes) {
    applyDataAttributes(duplicateBlock, data_attributes);
    const titleEl = document.createElement("title");
    titleEl.innerText =
      data_attributes["data-title"] || data_attributes["title"];
    duplicateBlock.appendChild(titleEl);
  }
  duplicateBlock.setAttribute("id", `${id || selector}_cloned`);

  const {
    tooltip,
    additionalClasses,
    fillAmenityOnHoverOnly,
    onClickAmenityModal,
  } = options;
  duplicateBlock.classList.add(cloneClass, ...(additionalClasses || []));

  const isMobileOrTabletView = isMobileOrTablet();
  const { onclick, onmouseenter, onmouseleave } = options;
  let mouseupEvent, mouseenterEvent, mouseleaveEvent;

  const showModalOnClick = (e) => {
    e.preventDefault();
    if (
      getDeviceType() === "desktop" &&
      e.target.tagName === duplicateBlock.tagName
    )
      return;
    return clickLastClonedElement(blockParent);
  };

  switch (cloneClass) {
    case "cloned-amenity":
      let showTooltip, hideTooltip;

      const showAmenityModal = onClickAmenityModal
        ? () => openAmenityViewerModal(rest)
        : null;

      if (tooltip) {
        const { eventHandlers } = setupAmenityToolTip(block, rest, svgElement);
        showTooltip = eventHandlers.showTooltip;
        hideTooltip = eventHandlers.hideTooltip;
      }

      const { fillAmenityBlock, removeAmenityBlockFill } =
        setupAmenityFillHandlers(
          duplicateBlock,
          !isMobileOrTabletView && fillAmenityOnHoverOnly
        );

      const amenityEventHandlers = createMouseEventHandlers({
        onmouseUp: [showModalOnClick, showAmenityModal, onclick],
        onmouseEnter: [showTooltip, fillAmenityBlock, onmouseenter],
        onmouseLeave: [hideTooltip, removeAmenityBlockFill, onmouseleave],
      });

      mouseupEvent = amenityEventHandlers.mouseupEvent;
      mouseenterEvent = amenityEventHandlers.mouseenterEvent;
      mouseleaveEvent = amenityEventHandlers.mouseleaveEvent;

      break;
    default:
      if (definedAndHasValue(isWebpage) && isWebpage) {
        duplicateBlock.setAttribute(
          "fill",
          getUnitMarkerColor(duplicateBlock.dataset)
        );
      } else {
        duplicateBlock.setAttribute("fill", map_marker_color);
      }

      const eventHandlers = createMouseEventHandlers({
        onmouseUp: [showModalOnClick, onclick],
      });

      mouseupEvent = eventHandlers.mouseupEvent;
      mouseenterEvent = onmouseenter;
      mouseleaveEvent = onmouseleave;

      break;
  }

  setupMouseEvents(blockParent, {
    events: {
      mouseupEvent,
      mouseenterEvent,
      mouseleaveEvent,
    },
  });

  const firstElementChild = blockParent.children[0];

  if (firstElementChild && firstElementChild.nextSibling) {
    blockParent.insertBefore(duplicateBlock, firstElementChild.nextSibling);
  } else {
    blockParent.appendChild(duplicateBlock);
  }
  $duplicateBlock.removeClass("hidden");
}

function setSvgCoordinates(data, options) {
  if (!parsedSVGs.length) return;
  const { cloneClass } = options;

  const floorData = floorBasedData(data);

  parsedSVGs.forEach((svgElement) => {
    $(`.${cloneClass}`, svgElement).addClass("hidden");

    if (!isCurrentFloorsSVG(svgElement)) return;

    if (isWebpage) {
      const $shapes = $(svgElement).find(
        [...VALID_SVG_SHAPES, "text"].join(", ") +
          ":not(.cloned-unit):not(.cloned-amenity)"
      );

      $shapes.each(function () {
        const { shape, valid } = getTheValidVisibleSVGShape(this);
        if (valid) {
          if (getValidShapeCategory(shape) !== "unit") return;

          if (!shape.hasAttribute(DEFAULT_FILL_COLOR)) {
            shape.setAttribute(DEFAULT_FILL_COLOR, shape.style.fill);
            const missingColor = getUnitMarkerColor(null);
            if (missingColor) shape.style.fill = missingColor;
          }
        }
      });
    }

    floorData.forEach((item) => {
      processSvgBlock(svgElement, item, options);
    });
  });
}

function getNormalizedMouseCoordinates(e, svgElement) {
  const rect = svgElement.getBoundingClientRect();
  const scale =
    zoomablePans[getZoomPanKey(svgElement.parentElement)].instance.getTransform().scale;

  const mouseX = (e.clientX - rect.left) / scale;
  const mouseY = (e.clientY - rect.top) / scale;

  const point = svgElement.createSVGPoint();
  point.x = mouseX;
  point.y = mouseY;

  return point.matrixTransform(svgElement.getCTM().inverse());
}

function isValidShape(shape, parent = false) {
  const shapeTag = shape.tagName.toLowerCase();
  if (VALID_SVG_SHAPES.includes(shapeTag) || parent) {
    const parentElement = shape.parentElement;
    const parentTag = parentElement.tagName.toLowerCase();
    const parentId = parentElement.id?.toLowerCase();

    if (parentTag === "g") {
      if (!parent) {
        const siblings = Array.from($(shape).siblings());
        const lastSibling = siblings[siblings.length - 1];
        const allSiblingsAreTextOrShape = siblings.every((sibling) => {
          const siblingSahpeName = sibling.tagName.toLowerCase();
          return siblingSahpeName === "text" || siblingSahpeName === shapeTag;
        });

        if (
          !allSiblingsAreTextOrShape ||
          lastSibling?.tagName?.toLowerCase() !== "text"
        )
          return false;
      } else if (
        parentId?.startsWith("amenities") ||
        parentId?.endsWith("amenities") ||
        parentId?.startsWith("units") ||
        parentId?.startsWith("amenity_outlines")
      )
        return true;
      else if (
        parentId?.includes("outlines") ||
        parentId?.includes("label") ||
        parentId?.includes("text") ||
        parentId?.includes("icon")
      )
        return false;

      return isValidShape(parentElement, true);
    }
  }

  return false;
}

function getValidShapeCategory(shape, parent = false) {
  const shapeTag = shape.tagName.toLowerCase();
  if (VALID_SVG_SHAPES.includes(shapeTag) || parent) {
    const parentElement = shape.parentElement;
    const parentTag = parentElement.tagName.toLowerCase();
    const parentId = parentElement.id?.toLowerCase();

    if (parentTag === "g") {
      if (parentId?.startsWith("units")) return "unit";
      else if (
        parentId?.startsWith("amenities") ||
        parentId?.endsWith("amenities") ||
        parentId?.startsWith("amenity_outlines")
      )
        return "amenity";
      else if (
        parentId?.includes("outlines") ||
        parentId?.includes("label") ||
        parentId?.includes("text") ||
        parentId?.includes("icon")
      )
        return null;

      return getValidShapeCategory(parentElement, true);
    }
  }

  return null;
}

function isVisibleSVGElement(svgElement) {
  return (
    svgElement.getAttribute("display") !== "none" &&
    window.getComputedStyle(svgElement).display !== "none" &&
    window.getComputedStyle(svgElement).visibility !== "hidden"
  );
}

function allSVGParentsVisible(svgElement) {
  const parentElement = svgElement.parentElement;
  if (parentElement.tagName.toLowerCase() === "svg") {
    return true;
  } else {
    return (
      isVisibleSVGElement(parentElement) && allSVGParentsVisible(parentElement)
    );
  }
}

function getTheValidSVGShape(svgShape) {
  let shapeName = svgShape.tagName.toLowerCase();
  if (
    shapeName === "tspan" &&
    svgShape.parentElement.tagName.toLowerCase() === "text"
  ) {
    shapeName = "text";
    svgShape = svgShape.parentElement;
  }
  const firstSiblingElement = Array.from($(svgShape).siblings())[0];

  if (
    shapeName === "text" &&
    VALID_SVG_SHAPES.includes(firstSiblingElement?.tagName.toLowerCase())
  )
    svgShape = firstSiblingElement;

  return { shape: svgShape, valid: isValidShape(svgShape) };
}

function getTheMarkabeSVGShape(svgShape, svgPoint, validated = false) {
  const { shape, valid } = getTheValidVisibleSVGShape(svgShape, validated);
  if (!valid) {
    return {
      svgShape: null,
      markable: false,
    };
  }

  const pointVerifierFunction =
    window[`isPointIn${capitalize(shape.tagName.toLowerCase())}`];
  return {
    svgShape: shape,
    markable:
      valid &&
      pointVerifierFunction &&
      pointVerifierFunction(svgPoint, shape)
  };
}

function getTheValidVisibleSVGShape(svgShape, validated = false) {
  const { shape, valid } = validated
    ? { shape: svgShape, valid: true }
    : getTheValidSVGShape(svgShape);

  return {
    shape,
    valid: valid && isVisibleSVGElement(shape) && allSVGParentsVisible(shape),
  };
}

function getSvgClickedElementWithCenterPoint(svgParentSelector, e) {
  const svg = document.querySelector(`${svgParentSelector} > svg`);

  if (!svg) return {};

  const key = getZoomPanKey(svg.parentElement);
  const transform = zoomablePans?.[key] ? zoomablePans[key].instance.getTransform() : {};
  const scaleFactor = 1 / (transform.scale || 1);

  const svgPoint = getNormalizedMouseCoordinates(e, svg);
  const targetElement = e.target;

  const { svgShape, markable } = getTheMarkabeSVGShape(targetElement, svgPoint);

  if (markable) {
    const svgRect = svg.getBoundingClientRect();
    const elRect = svgShape.getBoundingClientRect() || { x: 0, y: 0 };
    const centerPoint = {};

    centerPoint.x = (elRect.x + elRect.width / 2 - svgRect.x) * scaleFactor;
    centerPoint.y = (elRect.y + elRect.height / 2 - svgRect.y) * scaleFactor;
    return { element: svgShape, centerPoint };
  } else {
    $("#invalid-svg-shape").modal("show");
    return { element: null, centerPoint: {} };
  }
}

function getSvgElementSelector(element) {
  if (!element) return null;

  const parent = element.parentElement;
  const nthChild = ` > ${element.tagName.toLowerCase()}:nth-child(${
    Array.from(parent.children).indexOf(element) + 1
  })`;
  return parent.id
    ? `${parent.tagName.toLowerCase()}#${parent.id}${nthChild}`
    : `${getSvgElementSelector(parent)}${nthChild}`;
}

function moveSvgTextGroupsToEnd(parentElement) {
  const children = Array.from(parentElement.children);
  const textLabelGroupIndex = children.findIndex(
    (child) =>
      child.tagName.toLowerCase() === "g" &&
      (child.id.toLowerCase().includes("text") ||
        child.id.toLowerCase().includes("label"))
  );
  if (textLabelGroupIndex < 0) {
    return;
  }

  parentElement.replaceChildren(
    ...children.slice(0, textLabelGroupIndex),
    ...children.slice(textLabelGroupIndex + 1, children.length),
    children[textLabelGroupIndex]
  );
}

function setSvgUnitsCoordinates() {
  setSvgCoordinates(units, {
    cloneClass: "cloned-unit",
    additionalClasses: ["marker", "cloned"],
    onmouseenter: markerHoverEffect,
    onmouseleave: markerHoverEffectEnd,
    updateStyles: true,
  });
}

function setSvgAmenitiesCoordinates() {
  setSvgCoordinates(amenities, {
    cloneClass: "cloned-amenity",
    additionalClasses: ["slider-amenity", "amenityTooltip", "cloned"],
    fillAmenityOnHoverOnly: true,
    tooltip: true,
    onClickAmenityModal: true,
  });
}

function addSvgDeletionParamInURL(url) {
  if (!url) return url;

  let [mainUrl, queryParams = ""] = url.split("?");
  if (queryParams) {
    if (!queryParams.includes("svg_deletion=true"))
      queryParams = `${queryParams}&svg_deletion=true`;
  } else {
    queryParams = "svg_deletion=true";
  }

  return `${mainUrl}?${queryParams}`;
}

function getLastClonedJQueryElement(parentGroupElement) {
  const children = Array.from(parentGroupElement.children);

  const lastClonedEl = [...children].reverse().find((child) => {
    const classes = child.classList;
    return classes.contains("cloned") && !classes.contains("hidden");
  });

  if (lastClonedEl) {
    return lastClonedEl;
  } else {
    console.warn("No cloned element found");
    return;
  }
}

function updateSvgTextFontFamily(svgElement, fontFamily) {
  const elements = svgElement.querySelectorAll('text, tspan');
  elements.forEach(el => el.setAttribute('font-family', fontFamily));
}

