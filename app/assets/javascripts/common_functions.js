var VALID_SVG_SHAPES = ["polygon", "rect", "ellipse", "circle"];

var has_floorplate =
  typeof has_floorplate !== "undefined" ? has_floorplate : false;
var svgMode = typeof svgMode !== "undefined" ? svgMode : false;
var map_marker_color = typeof map_marker_color !== "undefined" ? "brown" : null;
var amenity_marker_color =
  typeof amenity_marker_color !== "undefined" ? amenity_marker_color : null;

function mobileCheck() {
  let check = false;
  (function (a) {
    if (
      /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(
        a
      ) ||
      /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(
        a.substr(0, 4)
      )
    )
      check = true;
  })(navigator.userAgent || navigator.vendor || window.opera);
  return check;
}

function isElementVisibleOnScreen(element) {
  try {
    const rect = element.getBoundingClientRect();
    const viewportWidth =
      window.innerWidth || document.documentElement.clientWidth;
    const viewportHeight =
      window.innerHeight || document.documentElement.clientHeight;

    const isInViewport =
      rect.right > 0 &&
      rect.bottom > 0 &&
      rect.left < viewportWidth &&
      rect.top < viewportHeight;

    if (!isInViewport) return false;

    const hasSize = rect.width > 0 && rect.height > 0;

    const computedStyle = window.getComputedStyle(element);
    const isVisible =
      computedStyle.display !== "none" &&
      computedStyle.visibility !== "hidden" &&
      parseFloat(computedStyle.opacity) > 0;

    return hasSize && isVisible;
  } catch (e) {
    console.error("Not a valid HTML Element", e);
    return false;
  }
}

function setSvgOrImageHeight($image) {
  const image = $image[0];
  if (!image) return;
  const isSVG = image.tagName.toLowerCase() === "svg";

  const { width: imageOriginalWidth, height: imageOriginalHeight } = isSVG
    ? image.viewBox.baseVal
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

function getZoomPanKey(element) {
  return `${element.tagName.toLowerCase()}-${element.id}`;
}

function activateZoomPan(elem, options = {}) {
  const touchEvents = ["touchstart", "touchmove", "touchend", "touchcancel"];
  touchEvents.forEach((event) =>
    document.addEventListener(event, touchHandler, true)
  );

  const key = getZoomPanKey(elem);

  if (!window.mapPanZoom) window.mapPanZoom = {};

  window.mapPanZoom[key] = panzoom(elem, {
    minZoom: 0.5,
    maxZoom: 3.0,
    bounds: true,
    boundsPadding: 0.3,
    ...options,
  });

  moveZoomableImageToCenter(elem);
}

function moveZoomableImageToCenter(elem, resetScale = true, resetPosition = false) {
  if (!elem) return;
  const key = getZoomPanKey(elem);

  const panInstance = window.mapPanZoom[key];
  if (!panInstance) return;

  const $elem = $(elem);
  const $parentElem = $elem.parent();
  const mapBoxWidth = $elem.width();
  const mapBoxHeight = $elem.height();
  const parentWidth = $parentElem.width();
  const parentHeight = $parentElem.height();

  let scaleFactor;

  if (resetScale) {
    const scaleX = parentWidth / (mapBoxWidth || 1);
    const scaleY = parentHeight / (mapBoxHeight || 1);
    scaleFactor = Math.min(scaleX, scaleY, 1);
    panInstance.zoomAbs(0, 0, scaleFactor);
  } else {
    scaleFactor = panInstance.getTransform().scale;
  }

  if (resetPosition) {
    panInstance.moveTo(0, 0);
  } else {
    const elemTransformedWidth = mapBoxWidth * scaleFactor;
    const elemTransformedHeight = mapBoxHeight * scaleFactor;
    const centerX = (parentWidth - elemTransformedWidth) / 2;
    const centerY = (parentHeight - elemTransformedHeight) / 2;
  
    panInstance.moveTo(centerX, centerY);
  }
}

function touchHandler(event) {
  const touch = event.changedTouches[0];
  const eventType = {
    touchstart: "mousedown",
    touchmove: "mousemove",
    touchend: "mouseup",
  }[event.type];

  const simulatedEvent = new MouseEvent(eventType, {
    bubbles: true,
    cancelable: true,
    view: window,
    screenX: touch.screenX,
    screenY: touch.screenY,
    clientX: touch.clientX,
    clientY: touch.clientY,
  });

  touch.target.dispatchEvent(simulatedEvent);
}

async function fetchSVG(
  dataSetSelector,
  options = {
    floor: 0,
    svgPosition: 0,
    activateZoom: false,
    turnoffLoader: false,
    setSVGImageHeight: false,
    activateHoverEffect: false,
  }
) {
  const container = document.querySelector(dataSetSelector);
  const imageUrl = container?.dataset.svgUrl;

  if (!imageUrl?.endsWith(".svg")) return;

  try {
    $(".svgLoader").removeClass("hidden");
    const response = await fetch(imageUrl);

    $(".svgLoader").removeClass("hidden");
    if (!response.ok)
      throw new Error(`Failed to fetch SVG: ${response.statusText}`);
    const svgText = await response.text();

    $(".svgLoader").removeClass("hidden");
    const svgElement = parseSVG(svgText);

    if (!svgElement) throw new Error("No <svg> element found in the response.");

    parsedSVGs.push(svgElement);
    setSVG(container, svgElement, options);
    if (options.turnoffLoader) {
      $(".svgLoader").addClass("hidden");
    }
  } catch (error) {
    console.error("Error loading SVG:", error);
    if (options.turnoffLoader) {
      $(".svgLoader").addClass("hidden");
    }
  }

  if (options.activateZoom) activateZoomPan(container);
}

function setPointersCoordinates() {
  setCoordinates(units, {
    cloneClass: "cloned-unit",
    additionalClasses: ["marker"],
    onmouseenter: markerHoverEffect,
    onmouseleave: markerHoverEffectEnd,
    updateStyles: true,
  });
}

function setAmenitiesCoordinates() {
  setCoordinates(amenities, {
    cloneClass: "cloned-amenity",
    additionalClasses: ["slider-amenity", "amenityTooltip"],
    fillAmenityOnHoverOnly: true,
    tooltip: true,
    onClickAmenityModal: true,
  });
}

function setCoordinates(data, options) {
  if (!parsedSVGs.length) return;
  const { cloneClass, updateStyles } = options;

  const floorData = floorBasedData(data);

  parsedSVGs.forEach((svgElement) => {
    $(`.${cloneClass}`, svgElement).addClass("hidden");

    if (!isCurrentFloorsSVG(svgElement)) return;

    floorData.forEach((item) => {
      processBlock(svgElement, item, options);
    });
  });

  if (updateStyles) {
    $(".popup-title, .popup-arrow").css("background-color", map_marker_color);
  }
}

function floorBasedData(data = []) {
  return has_floorplate === "true"
    ? data.filter(
        ({ floor }) =>
          floor === parseInt(current_floor) ||
          (!floor && ["object", "undefined"].includes(typeof floor))
      )
    : data;
}

function isCurrentFloorsSVG(svgElement) {
  if (has_floorplate === "true" && svgElement.parentElement) {
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

function processBlock(svgElement, item, options, dataset = null) {
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

  // let clonedGroup = document.querySelector('g#cloned-units-amenitites');
  // if (!clonedGroup) {
  //   clonedGroup = document.createElement("g")
  //   clonedGroup.setAttribute('id', 'cloned-units-amenitites');
  //   svgElement.insertAdjacentElement('beforeend', clonedGroup);
  // }

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
      let [mainUrl, queryParams = ""] = value.split("?");
      if (queryParams) {
        if (!queryParams.includes("svg_deletion=true"))
          queryParams = `${queryParams}&svg_deletion=true`;
      } else queryParams = "svg_deletion=true";

      value = `${mainUrl}?${queryParams}`;
    }
    duplicateBlock.setAttribute(key, value);
  });
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

function positionTooltip(e, tooltip) {
  tooltip.style.position = "absolute";
  tooltip.style.left = `${e.offsetX + 10}px`;
  tooltip.style.top = `${e.offsetY + 20}px`;
  tooltip.style.visibility = "visible";
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

function clickSecondLastChildOfGroup(blockParent) {
  const $secondLastChild = $(
    blockParent.children[blockParent.children.length - 2]
  );
  $secondLastChild.click();
}

function moveTextGroupsToEnd(parentElement) {
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
  if (VALID_SVG_SHAPES.includes(shape.tagName.toLowerCase()) || parent) {
    const parentElement = shape.parentElement;
    const parentTag = parentElement.tagName.toLowerCase();
    const parentId = parentElement.id?.toLowerCase();

    if (parentTag === "g") {
      if (!parent) {
        const siblings = Array.from($(shape).siblings());
        const lastSibling = siblings[siblings.length - 1];

        if (lastSibling?.tagName?.toLowerCase() !== "text") return false;
      } else if (
        parentId?.startsWith("amenities") ||
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

  const point = svg.createSVGPoint();
  point.x = e.clientX;
  point.y = e.clientY;

  const svgPoint = point.matrixTransform(svg.getScreenCTM().inverse());
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

function getElementSelector(element) {
  if (!element) return null;

  const parent = element.parentElement;
  const nthChild = ` > ${element.tagName.toLowerCase()}:nth-child(${
    Array.from(parent.children).indexOf(element) + 1
  })`;
  return parent.id
    ? `${parent.tagName.toLowerCase()}#${parent.id}${nthChild}`
    : `${getElementSelector(parent)}${nthChild}`;
}

function parseSVG(svgText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, "image/svg+xml");
  return doc.querySelector("svg");
}

function setSVG(container, svgElement, options) {
  const { svgPosition = 0, floor = 0 } = options;
  const childrenArray = Array.from(container?.children || []);

  const attributes = {
    id: has_floorplate === "true" ? `viewArea-${floor}` : "viewArea",
    draggable: false,
    class: "viewArea",
    "data-map_id": "map",
    name: "viewArea",
    position: "relative",
  };

  Object.entries(attributes).forEach(([key, value]) =>
    svgElement.setAttribute(key, value)
  );

  const $svgElement = $(svgElement);
  if (!mobileCheck() && options.activateHoverEffect) {
    const $shapes = $svgElement.find(
      [...VALID_SVG_SHAPES, "text"].join(", ") +
        ":not(.cloned-unit):not(.cloned-amenity)"
    );

    $shapes.on("mouseenter", function (e) {
      if (addmode) {
        const { shape, valid } = getTheValidSVGShape(this);
        if (valid) {
          const point = svgElement.createSVGPoint();
          point.x = e.clientX;
          point.y = e.clientY;

          const svgPoint = point.matrixTransform(
            svgElement.getScreenCTM().inverse()
          );

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
  if (svgElement.nodeName === "svg") {
    container.innerHTML = "";
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
    container.append(...newChildren);
    if (options.setSVGImageHeight)
      setSvgOrImageHeight($(container).find("svg"));
  }
}

function toRgbColor(color) {
  const tempElement = document.createElement("div");
  tempElement.style.color = color;
  document.body.appendChild(tempElement);

  const computedColor = window.getComputedStyle(tempElement).color;
  document.body.removeChild(tempElement); // Clean up

  return computedColor.startsWith("rgb") ? computedColor : null;
}

function capitalize(s) {
  return s && s[0].toUpperCase() + s.slice(1);
}

function trim(str) {
  if (typeof str !== "undefined") {
    return str.replace(/^\s+|\s+$/gm, "");
  }
}

function rgbaToHex(rgba) {
  if (typeof rgba !== "undefined") {
    var parts = rgba.substring(rgba.indexOf("(")).split(",");
    r = parseInt(trim(parts[0].substring(1)), 10);
    g = parseInt(trim(parts[1]), 10);
    b = parseInt(trim(parts[2]), 10);
    if (typeof parts[3] !== "undefined") {
      a = parseFloat(trim(parts[3].substring(0, parts[3].length - 1))).toFixed(
        2
      );
    }
    if (typeof a !== "undefined") {
      return (
        "#" +
        r.toString(16) +
        g.toString(16) +
        b.toString(16) +
        (a * 255).toString(16).substring(0, 2)
      );
    }
  }
}
