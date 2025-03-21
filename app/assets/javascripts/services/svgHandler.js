var VALID_SVG_SHAPES = ["polyline", "rect", "polygon", "ellipse", "circle"];
var svgMode = definedAndHasValue(svgMode) ? svgMode : false;
var map_marker_color = definedAndHasValue(map_marker_color) ? "brown" : null;
var amenity_marker_color = definedAndHasValue(amenity_marker_color)
  ? amenity_marker_color
  : null;

function setSVG(container, svgElement, options) {
  const $svgElement = $(svgElement);

  if (svgElement.nodeName === "svg") {
    const { svgPosition = 0, floor = null } = options;
    const childrenArray = Array.from(container?.children || []);
    const attributes = {
      id: hasFloorplate() ? `viewArea-${floor}` : "viewArea",
      draggable: false,
      class: "viewArea",
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

          if (markable) svgShape.style.fill = map_marker_color;
        }
      }
    });

    $shapes.on("mouseleave", function () {
      $shapes.each(function () {
        if (toRgbColor(this.style.fill) === toRgbColor(map_marker_color)) {
          this.style.fill = "";
        }
      });
    });
  }

  if (options.setSVGImageHeight) setSvgOrImageHeight($(container).find("svg"));
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
    activateZoom: false,
    trackerAssetId: null,
    setSVGImageHeight: false,
    activateHoverEffect: false,
    trackerVisibilityCheck: false,
  }
) {
  const container = document.querySelector(dataSetSelector);
  const imageUrl = container?.dataset.svgUrl;

  if (!imageUrl?.endsWith(".svg")) return;

  const { tracker, activateZoom, trackerAssetId, trackerVisibilityCheck } = options;

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

    if (!response.ok)
      throw new Error(`Failed to fetch SVG: ${response.statusText}`);

    const svgText = await response.text();
    const svgElement = parseSVG(svgText);

    if (!svgElement) throw new Error("No <svg> element found in the response.");

    parsedSVGs.push(svgElement);
    setSVG(container, svgElement, options);

    if (tracker) {
      asset.node = svgElement;
      tracker.addOrUpdateAsset(asset, trackerVisibilityCheck);
    }
  } catch (error) {
    console.error("Error loading SVG:", error);
    asset.completed = false;
    tracker.setAssetError(asset, error.message);
  }

  if (activateZoom) activateZoomPan(container);
}

function setSvgOrImageHeight($image) {
  const image = $image[0];
  if (!image) return;

  const isSVG = image.tagName.toLowerCase() === "svg";
  const { width: imageOriginalWidth, height: imageOriginalHeight } = isSVG
    ? image.viewBox.baseVal.width + image.viewBox.baseVal.height === 0
      ? {
          width: parseInt(image.parentElement.dataset.width || 0),
          height: parseInt(image.parentElement.dataset.height || 0),
        }
      : image.viewBox.baseVal
    : {
        width: parseInt(image.dataset.width || 0),
        height: parseInt(image.dataset.height || 0),
      };

  const $imageParent = $image.parent();
  const $imageContainer = $("div#image-container");
  const imageContainer = $imageContainer[0];
  const webpageMainContainer = $(
    "div.map-body.map-container-center-align > .right-side"
  )[0];
  const $svgContainer = $("div#svg-container");

  let comparableContainerDimensions = { width: 0, height: 0 };

  if (isSVG && imageContainer) {
    const { width: parallelContainerWidth, height: parallelContainerHeight } =
      imageContainer.getBoundingClientRect();

    comparableContainerDimensions.width = parallelContainerWidth;
    comparableContainerDimensions.height = parallelContainerHeight;
  } else if (webpageMainContainer) {
    comparableContainerDimensions.width =
      webpageMainContainer.getBoundingClientRect().width;

    const footerHeight = Array.from($(".c-footer"))
      .find((footerElement) => isElementVisibleOnScreen(footerElement))
      ?.getBoundingClientRect().height;
    comparableContainerDimensions.height =
      webpageMainContainer.parentElement.getBoundingClientRect().height -
      (footerHeight || 0);
  } else {
    return;
  }

  const { width, height } = comparableContainerDimensions;

  if (isSVG && $svgContainer[0]) {
    $svgContainer.width(width);
    $svgContainer.height(height);
  } else {
    $imageContainer.width(width);
    $imageContainer.height(height);
  }

  const ratio =
    width > height
      ? height / (imageOriginalHeight || 1)
      : width / (imageOriginalWidth || 1);

  $imageParent.width(imageOriginalWidth * ratio);
  $imageParent.height(imageOriginalHeight * ratio);
}

function floorBasedData(data = []) {
  return hasFloorplate()
    ? data.filter(
        ({ floor }) =>
          floor === parseInt(current_floor) ||
          (!floor && ["object", "undefined"].includes(typeof floor))
      )
    : data;
}

function isCurrentFloorsSVG(svgElement) {
  if (hasFloorplate() && svgElement.parentElement) {
    const floorNum = parseInt(svgElement.parentElement.id.split("_").pop());
    return (
      (svgElement.id === `viewArea-${floorNum}` &&
        floorNum === parseInt(current_floor)) ||
      (parsedSVGs.length === 1 && svgElement.parentElement.id === "svg_map")
    );
  } else if (svgElement.id === "viewArea") {
    return true;
  }

  return false;
}

function getPointerIdAndSelector(pointerData, dataset) {
  let { tag = null, id = null, selector = null } = pointerData || {};
  if (!tag && dataset) {
    tag = dataset.tag || null;
    id = dataset.id || null;
    selector = dataset.selector || null;
  }
  return { id, selector: tag && id ? `${tag}#${id}` : selector };
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

function clickSecondLastChildOfGroup(blockParent) {
  const $secondLastChild = $(
    blockParent.children[blockParent.children.length - 2]
  );
  $secondLastChild.click();
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
  const amenityFillColor = amenity_marker_color || map_marker_color;

  if (fillOnHover) {
    return {
      fillAmenityBlock: () => {
        duplicateBlock.style.fill = amenityFillColor;
      },
      removeAmenityBlockFill: () => {
        duplicateBlock.style.fill = "";
      },
    };
  }

  duplicateBlock.setAttribute("fill", amenityFillColor);
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
  const isMobileView = mobileCheck();
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
      if (isMobileView && e.type === "mouseup") {
        e.preventDefault();
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

  if (isMobileView) return;

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

  const block = svgElement.querySelector(selector);
  if (!block) return;

  const { cloneClass } = options;
  try {
    const existingDuplicate = getDuplicateBlock(
      svgElement,
      selector,
      cloneClass,
      item.id
    );
    if (existingDuplicate) return;
  } catch (e) {
    console.error("Duplicate not found.", e);
  }

  block.style.fill = "";
  const blockParent = block.parentElement;
  const $blockParent = $(blockParent);
  $blockParent.css({
    "pointer-events": "all",
    cursor: "pointer",
  });

  const duplicateBlock = block.cloneNode(true);
  const $duplicateBlock = $(duplicateBlock);

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

  const isMobileView = mobileCheck();
  const { onclick, onmouseenter, onmouseleave } = options;
  let mouseupEvent, mouseenterEvent, mouseleaveEvent;

  const showModalOnClick = (e) => {
    if (
      duplicateBlock.getAttribute("data-target") &&
      (isMobileView || e.target.tagName !== duplicateBlock.tagName)
    )
      return clickSecondLastChildOfGroup(blockParent);
  };

  switch (cloneClass) {
    case "cloned-amenity":
      let showTooltip, hideTooltip;

      const showAmenityModal = onClickAmenityModal
        ? () => openAmenityViewerModal(rest, rest.galleries)
        : null;

      if (tooltip) {
        const { eventHandlers } = setupAmenityToolTip(block, rest, svgElement);
        showTooltip = eventHandlers.showTooltip;
        hideTooltip = eventHandlers.hideTooltip;
      }

      const { fillAmenityBlock, removeAmenityBlockFill } =
        setupAmenityFillHandlers(
          duplicateBlock,
          !isMobileView && fillAmenityOnHoverOnly
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
      duplicateBlock.setAttribute("fill", map_marker_color);

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
  const { cloneClass, updateStyles } = options;

  const floorData = floorBasedData(data);

  parsedSVGs.forEach((svgElement) => {
    $(`.${cloneClass}`, svgElement).addClass("hidden");

    if (!isCurrentFloorsSVG(svgElement)) return;

    floorData.forEach((item) => {
      processSvgBlock(svgElement, item, options);
    });
  });

  if (updateStyles) {
    $(".popup-title, .popup-arrow").css("background-color", map_marker_color);
  }
}

function getNormalizedMouseCoordinates(e, svgElement) {
  const rect = svgElement.getBoundingClientRect();
  const scale =
    window.mapPanZoom[getZoomPanKey(svgElement.parentElement)].getTransform()
      .scale;

  const mouseX = (e.clientX - rect.left) / scale;
  const mouseY = (e.clientY - rect.top) / scale;

  const point = svgElement.createSVGPoint();
  point.x = mouseX;
  point.y = mouseY;

  return point.matrixTransform(svgElement.getCTM().inverse());
}

function isPointNearLineSegment(point, p1, p2) {
  const x1 = p1.x,
    y1 = p1.y;
  const x2 = p2.x,
    y2 = p2.y;
  const px = point.x,
    py = point.y;

  const lineLengthSquared = (x2 - x1) ** 2 + (y2 - y1) ** 2;
  if (lineLengthSquared === 0) return false;

  const t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / lineLengthSquared;
  const closestX = x1 + t * (x2 - x1);
  const closestY = y1 + t * (y2 - y1);

  if (t < 0 || t > 1) return false;

  const dx = px - closestX;
  const dy = py - closestY;
  const distanceSquared = dx * dx + dy * dy;

  const tolerance = 2;
  return distanceSquared <= tolerance * tolerance;
}

function isPointInPolyline(point, polyline) {
  const polylinePoints = polyline.points;
  const n = polylinePoints.numberOfItems;

  for (let i = 0; i < n - 1; i++) {
    const p1 = polylinePoints.getItem(i);
    const p2 = polylinePoints.getItem(i + 1);

    if (isPointNearLineSegment(point, p1, p2)) {
      return true;
    }
  }

  return false;
}

function isPointInPolygon(point, polygon) {
  const polygonPoints = polygon.points;
  let inside = false;
  const n = polygonPoints.numberOfItems;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygonPoints.getItem(i).x,
      yi = polygonPoints.getItem(i).y;
    const xj = polygonPoints.getItem(j).x,
      yj = polygonPoints.getItem(j).y;
    const intersect =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }

  return inside;
}

function isPointInRect(point, rect) {
  const rectX = parseFloat(rect.getAttribute("x"));
  const rectY = parseFloat(rect.getAttribute("y"));
  const rectWidth = parseFloat(rect.getAttribute("width"));
  const rectHeight = parseFloat(rect.getAttribute("height"));

  return (
    point.x >= rectX &&
    point.x <= rectX + rectWidth &&
    point.y >= rectY &&
    point.y <= rectY + rectHeight
  );
}

function isPointInCircle(point, circle) {
  const cx = parseFloat(circle.getAttribute("cx"));
  const cy = parseFloat(circle.getAttribute("cy"));
  const r = parseFloat(circle.getAttribute("r"));

  const dx = point.x - cx;
  const dy = point.y - cy;

  return dx * dx + dy * dy <= r * r;
}

function isPointInEllipse(point, ellipse) {
  const cx = parseFloat(ellipse.getAttribute("cx"));
  const cy = parseFloat(ellipse.getAttribute("cy"));
  const rx = parseFloat(ellipse.getAttribute("rx"));
  const ry = parseFloat(ellipse.getAttribute("ry"));

  const dx = point.x - cx;
  const dy = point.y - cy;

  return (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1;
}

function getPolygonArea(polygon) {
  const polygonPoints = polygon.points;
  let area = 0;
  const n = polygonPoints.numberOfItems;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygonPoints.getItem(i).x,
      yi = polygonPoints.getItem(i).y;
    const xj = polygonPoints.getItem(j).x,
      yj = polygonPoints.getItem(j).y;
    area += xi * yj - xj * yi;
  }

  return Math.abs(area) / 2;
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
  const { shape, valid } = validated
    ? { shape: svgShape, valid: true }
    : getTheValidSVGShape(svgShape);

  const pointVerifierFunction =
    window[`isPointIn${capitalize(shape.tagName.toLowerCase())}`];
  return {
    svgShape: shape,
    markable:
      valid &&
      pointVerifierFunction &&
      pointVerifierFunction(svgPoint, shape) &&
      isVisibleSVGElement(shape) &&
      allSVGParentsVisible(shape),
  };
}

function getSvgClickedElementWithCenterPoint(svgParentSelector, e) {
  const svg = document.querySelector(`${svgParentSelector} > svg`);

  if (!svg) return {};

  const key = getZoomPanKey(svg.parentElement);
  const transform = mapPanZoom?.[key] ? mapPanZoom[key].getTransform() : {};
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

function setSvgPointersCoordinates() {
  setSvgCoordinates(units, {
    cloneClass: "cloned-unit",
    additionalClasses: ["marker"],
    onmouseenter: markerHoverEffect,
    onmouseleave: markerHoverEffectEnd,
    updateStyles: true,
  });
}

function setSvgAmenitiesCoordinates() {
  setSvgCoordinates(amenities, {
    cloneClass: "cloned-amenity",
    additionalClasses: ["slider-amenity", "amenityTooltip"],
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
