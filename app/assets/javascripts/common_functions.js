var has_floorplate =
  typeof has_floorplate !== "undefined" ? has_floorplate : false;
var svgMode = typeof svgMode !== "undefined" ? svgMode : false;

function activateZoomPan(elem) {
  const touchEvents = ["touchstart", "touchmove", "touchend", "touchcancel"];
  touchEvents.forEach((event) =>
    document.addEventListener(event, touchHandler, true)
  );

  const key = `${elem.tagName.toLowerCase()}-${elem.id}`;
  if (window.mapPanZoom && typeof window.mapPanZoom === "object")
    window.mapPanZoom[key] = panzoom(elem, {
      minZoom: 0.5,
      maxZoom: 3.0,
      bounds: true,
      boundsPadding: 0.3,
    });
  else
    window.mapPanZoom = {
      [key]: panzoom(elem, {
        minZoom: 0.5,
        maxZoom: 3.0,
        bounds: true,
        boundsPadding: 0.3,
      }),
    };

  let scaleFactor = 1 / (mapPanZoom[key].getTransform()?.scale || 1);
  let previousScale = 0;

  const $elem = $(elem);
  const $parentElem = $elem.parent();
  const [mapBoxWidth, mapBoxHeight] = [$elem.width(), $elem.height()];
  const [parentWidth, parentHeight] = [
    $parentElem.width(),
    $parentElem.height(),
  ];

  while (
    mapBoxWidth / scaleFactor > parentWidth ||
    mapBoxHeight / scaleFactor > parentHeight
  ) {
    mapPanZoom[key].zoomInOut(189);
    scaleFactor = 1 / (mapPanZoom[key].getTransform()?.scale || 1);
    if (scaleFactor === previousScale) break;
    previousScale = scaleFactor;
  }

  mapPanZoom[key].moveTo(0, 0);
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
  options = { svgPosition: 0, activateZoom: false, floor: 0 }
) {
  const container = document.querySelector(dataSetSelector);
  const imageUrl = container?.dataset.svgUrl;

  if (options.activateZoom) activateZoomPan(container);
  if (!imageUrl?.endsWith(".svg")) return;

  try {
    const response = await fetch(imageUrl);
    if (!response.ok)
      throw new Error(`Failed to fetch SVG: ${response.statusText}`);
    const svgText = await response.text();
    const svgElement = parseSVG(svgText);

    if (!svgElement) throw new Error("No <svg> element found in the response.");

    parsedSVGs.push(svgElement);
    setSVG(container, svgElement, options);
  } catch (error) {
    console.error("Error loading SVG:", error);
  }
}

function setPointersCoordinates() {
  setCoordinates(units, {
    cloneClass: "cloned-unit",
    additionalClasses: ["marker"],
    onclick: () => $("#unitModal").show(),
    onmouseenter: markerHoverEffect,
    onmouseleave: markerHoverEffectEnd,
    updateStyles: true,
  });
}

function setAmenitiesCoordinates() {
  setCoordinates(amenities, {
    cloneClass: "cloned-amenity",
    additionalClasses: ["slider-amenity", "amenityTooltip"],
    onclick: (amenity) => openAmenityViewerModal(amenity, amenity.galleries),
    onmouseenter: (toolTipSpan) => amenityHoverEffect(toolTipSpan),
    onmouseleave: (toolTipSpan) => amenityHoverEffectEnd(toolTipSpan),
    tooltip: true,
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
    ? data.filter(({ floor }) => floor === parseInt(current_floor))
    : data;
}

function isCurrentFloorsSVG(svgElement) {
  if (has_floorplate === "true" && svgElement.parentElement) {
    const floorNum = parseInt(svgElement.parentElement.id.split("_").pop());
    return (
      svgElement.id === `viewArea-${floorNum}` &&
      floorNum === parseInt(current_floor)
    );
  } else if (svgElement.id === "viewArea") {
    return true;
  }

  return false;
}

function processBlock(svgElement, item, options, dataset = null) {
  const { pointer_data = {}, data_attributes, ...rest } = item || {};
  let { tag = null, id = null, selector = null } = pointer_data || {};
  if (!tag && dataset) {
    tag = dataset.tag || null;
    id = dataset.id || null;
    selector = dataset.selector || null;
  }

  selector = tag && id ? `${tag}#${id}` : selector;
  if (!selector) return;

  const block = svgElement.querySelector(selector);
  if (!block) return;

  const { cloneClass, tooltip, additionalClasses } = options;
  let { onclick, onmouseenter, onmouseleave } = options;

  const clonedSelector = selector.endsWith("_cloned")
    ? selector
    : `${selector}_cloned`;
  const existingDuplicate = svgElement.getElementById(clonedSelector);

  // let clonedGroup = document.querySelector('g#cloned-units-amenitites');
  // if (!clonedGroup) {
  //   clonedGroup = document.createElement("g")
  //   clonedGroup.setAttribute('id', 'cloned-units-amenitites');
  //   svgElement.insertAdjacentElement('beforeend', clonedGroup);
  // }

  if (existingDuplicate) {
    $(existingDuplicate).removeClass("hidden");
  } else {
    const duplicateBlock = block.cloneNode(true);
    if (data_attributes) {
      Object.entries(data_attributes).forEach(([key, value]) => {
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
    duplicateBlock.setAttribute("id", `${id || selector}_cloned`);
    duplicateBlock.classList.add(cloneClass, ...(additionalClasses || []));

    block.style.fill = "";
    duplicateBlock.setAttribute("fill", map_marker_color);
    if (data_attributes) {
      const titleEl = document.createElement("title");
      titleEl.innerText =
        data_attributes["data-title"] || data_attributes["title"];
      duplicateBlock.appendChild(titleEl);
    }

    const $duplicateBlock = $(duplicateBlock);

    switch (cloneClass) {
      case "cloned-amenity":
        if (tooltip) {
          const { x, y } = block.getBoundingClientRect();
          const toolTipSpan = document.createElement("span");
          toolTipSpan.classList.add("amenityTooltipText");
          toolTipSpan.innerHTML = `
            <h2 style="display: ${rest.show_name ? "block" : "none"}">
              ${rest.name}
            </h2>
            <img src="${rest.image_url}" alt="Image Title">
          `;
          toolTipSpan.style.position = "absolute";
          toolTipSpan.style.top = `${y - 92}px`;
          toolTipSpan.style.left = `${x - 53}px`;
          svgElement.insertAdjacentElement("afterend", toolTipSpan);

          if (onmouseenter)
            $duplicateBlock.on("mouseenter", () => onmouseenter(toolTipSpan));
          if (onmouseleave)
            $duplicateBlock.on("mouseleave", () => onmouseleave(toolTipSpan));
        }

        if (onclick) $duplicateBlock.on("click", () => onclick(rest));

        break;
      default:
        if (onclick) $duplicateBlock.on("click", onclick);
        if (onmouseenter) $duplicateBlock.on("mouseenter", onmouseenter);
        if (onmouseleave) $duplicateBlock.on("mouseleave", onmouseleave);
        break;
    }

    $duplicateBlock.removeClass("hidden");

    block.parentElement.appendChild(duplicateBlock);
    moveTextGroupsToEnd(block.parentElement);
  }
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

function findByShape(svg, svgPoint, shape) {
  let result = null;

  switch (shape) {
    case "rect":
    case "circle":
    case "ellipse":
      // .reverse() is for getting the top most element
      result = Array.from(svg.querySelectorAll(shape))
        .reverse()
        .find(
          (svgShape) =>
            isValidShape(svgShape) &&
            window[`isPointIn${capitalize(shape)}`](svgPoint, svgShape)
        );
      break;
    case "polygon":
      const polygons = Array.from(svg.querySelectorAll("polygon"))
        .filter(
          (polygon) =>
            isValidShape(polygon) && isPointInPolygon(svgPoint, polygon)
        )
        .map((polygon) => ({ polygon, area: getPolygonArea(polygon) }));

      if (polygons.length > 0) {
        result = polygons.sort((a, b) => a.area - b.area).shift().polygon;
      }
  }

  return result;
}

function getSvgClickedElementWithCenterPoint(svgParentSelector, e) {
  const svg = document.querySelector(`${svgParentSelector} > svg`);

  if (!svg) return {};

  const key = `${svg.parentElement.tagName.toLowerCase()}-${
    svg.parentElement.id
  }`;
  const transform = mapPanZoom?.[key] ? mapPanZoom[key].getTransform() : {};
  const scaleFactor = 1 / (transform.scale || 1);

  const point = svg.createSVGPoint();
  point.x = e.clientX;
  point.y = e.clientY;

  const svgPoint = point.matrixTransform(svg.getScreenCTM().inverse());

  let resultingElement = findByShape(svg, svgPoint, "rect");

  if (!resultingElement) {
    resultingElement = findByShape(svg, svgPoint, "polygon");
  }

  if (!resultingElement) {
    resultingElement = findByShape(svg, svgPoint, "ellipse");
  }

  if (!resultingElement) {
    resultingElement = findByShape(svg, svgPoint, "circle");
  }

  const centerPoint = {};

  if (resultingElement) {
    const svgRect = svg.getBoundingClientRect();
    const elRect = resultingElement.getBoundingClientRect() || { x: 0, y: 0 };

    centerPoint.x = (elRect.x + elRect.width / 2 - svgRect.x) * scaleFactor;
    centerPoint.y = (elRect.y + elRect.height / 2 - svgRect.y) * scaleFactor;
  } else {
    $("#invalid-svg-shape").modal("show");
  }

  return { element: resultingElement, centerPoint };
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

  if (options.activateHoverEffect) {
    const $shapes = $(svgElement).find("polygon, rect, circle, ellipse");

    $shapes.on("mouseenter", function () {
      if (addmode && isValidShape(this)) this.style.fill = map_marker_color;
    });

    $shapes.on("mouseleave", function () {
      if (toRgbColor(this.style.fill) === toRgbColor(map_marker_color))
        this.style.fill = "";
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
  }
}

function isValidShape(shape) {
  const parentElement = shape.parentElement;
  if (parentElement.tagName.toLowerCase() === "g") {
    if (
      parentElement.id?.toLowerCase().startsWith("amenities") ||
      parentElement.id?.toLowerCase().startsWith("units")
    )
      return true;
    return isValidShape(parentElement);
  }
  return false;
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
