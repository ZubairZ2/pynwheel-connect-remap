var has_floorplate =
  typeof has_floorplate !== "undefined" ? has_floorplate : false;

const isSVG = () => {
  const svgSelector =
    has_floorplate === "true"
      ? `svg#viewArea-${current_floor}`
      : "svg#viewArea";
  return !!document.querySelector(svgSelector);
};

const activateZoomPan = (elem) => {
  const touchEvents = ["touchstart", "touchmove", "touchend", "touchcancel"];
  touchEvents.forEach((event) =>
    document.addEventListener(event, touchHandler, true)
  );

  window.mapPanZoom = panzoom(elem, {
    minZoom: 0.5,
    maxZoom: 3.0,
    bounds: true,
    boundsPadding: 0.3,
  });

  let scaleFactor = 1 / (mapPanZoom.getTransform()?.scale || 1);
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
    mapPanZoom.zoomInOut(189);
    scaleFactor = 1 / (mapPanZoom.getTransform()?.scale || 1);
    if (scaleFactor === previousScale) break;
    previousScale = scaleFactor;
  }

  mapPanZoom.moveTo(0, 0);
};

const touchHandler = (event) => {
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
};

const fetchSVG = async (
  dataSetSelector,
  options = { svgPosition: 0, activateZoom: false, floor: 0 }
) => {
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
};

const setPointersCoordinates = () => {
  setCoordinates(units, {
    cloneClass: "cloned-unit",
    additionalClasses: ["marker"],
    onClick: () => $("#unitModal").show(),
    updateStyles: true,
  });
};

const setAmenitiesCoordinates = () => {
  setCoordinates(amenities, {
    cloneClass: "cloned-amenity",
    additionalClasses: ["slider-amenity", "amenityTooltip"],
    onClick: (amenity) => openAmenityViewerModal(amenity, amenity.galleries),
    tooltip: true,
  });
};

const setCoordinates = (data, options) => {
  if (!parsedSVGs.length) return;
  const { cloneClass, tooltip, additionalClasses, onClick, updateStyles } =
    options;

  const floorData = floorBasedData(data);

  parsedSVGs.forEach((svgElement) => {
    $(`.${cloneClass}`, svgElement).addClass("hidden");

    if (!isCurrentFloorsSVG(svgElement)) return;

    floorData.forEach((item) => {
      const { pointer_data, data_attributes, ...rest } = item || {};
      const { tag = null, id = null } = pointer_data || {};

      const selector = tag && id ? `${tag}#${id}` : pointer_data.selector;
      if (!selector) return;

      const block = svgElement.querySelector(selector);
      if (!block) return;

      const existingDuplicate = svgElement.getElementById(`${selector}_cloned`);
      if (existingDuplicate) {
        $(existingDuplicate).removeClass("hidden");
      } else {
        const duplicateBlock = block.cloneNode(true);
        if (data_attributes) {
          Object.entries(data_attributes).forEach(([key, value]) =>
            duplicateBlock.setAttribute(key, value)
          );
        }
        duplicateBlock.setAttribute("id", `${id || selector}_cloned`);
        duplicateBlock.setAttribute("fill", map_marker_color);
        duplicateBlock.classList.add(cloneClass, ...(additionalClasses || []));

        $duplicateBlock = $(duplicateBlock);

        switch (cloneClass) {
          case "cloned-unit":
            $duplicateBlock
              .on("mouseenter", markerHoverEffect)
              .on("mouseleave", markerHoverEffectEnd);
            break;
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

              $duplicateBlock
                .on("mouseenter", () => amenityHoverEffect(toolTipSpan))
                .on("mouseleave", () => amenityHoverEffectEnd(toolTipSpan));
            }
            break;
        }

        $duplicateBlock.removeClass("hidden").on("click", () => onClick(rest));
        block.parentElement.appendChild(duplicateBlock);
      }
    });
  });

  if (updateStyles) {
    $(".popup-title, .popup-arrow").css("background-color", map_marker_color);
  }
};

const floorBasedData = (data = []) => {
  return has_floorplate === "true"
    ? data.filter(({ floor }) => floor === parseInt(current_floor))
    : data;
};

const isCurrentFloorsSVG = (svgElement) => {
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
};

const isPointInPolygon = (point, polygonPoints) => {
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
};

const isPointInRect = (point, rect) => {
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
};

const getPolygonArea = (polygonPoints) => {
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
};

const getSvgClickedElementWithCenterPoint = (svgParentSelector, e) => {
  const svg = document.querySelector(`${svgParentSelector} > svg`);

  if (!svg) return {};

  const transform = mapPanZoom ? mapPanZoom.getTransform() : {};
  const scaleFactor = 1 / (transform.scale || 1);

  const point = svg.createSVGPoint();
  point.x = e.clientX;
  point.y = e.clientY;

  const svgPoint = point.matrixTransform(svg.getScreenCTM().inverse());

  let resultingElement = Array.from(svg.querySelectorAll("rect")).filter(
    (rect) => isValidShape(rect) && isPointInRect(svgPoint, rect)
  )[0];
  const centerPoint = {};

  if (!resultingElement) {
    const polygons = Array.from(svg.querySelectorAll("polygon"))
      .filter(
        (polygon) =>
          isValidShape(polygon) && isPointInPolygon(svgPoint, polygon.points)
      )
      .map((polygon) => ({ polygon, area: getPolygonArea(polygon.points) }));

    if (polygons.length > 0) {
      resultingElement = polygons.sort((a, b) => a.area - b.area)[0].polygon;
    }
  }

  if (resultingElement) {
    const svgRect = svg.getBoundingClientRect();
    const elRect = resultingElement.getBoundingClientRect() || { x: 0, y: 0 };

    centerPoint.x = (elRect.x + elRect.width / 2 - svgRect.x) * scaleFactor;
    centerPoint.y = (elRect.y + elRect.height / 2 - svgRect.y) * scaleFactor;
  }

  return { element: resultingElement, centerPoint };
};

const getElementSelector = (element) => {
  if (!element) return null;

  const parent = element.parentElement;
  const nthChild = ` > ${element.tagName.toLowerCase()}:nth-child(${
    Array.from(parent.children).indexOf(element) + 1
  })`;
  return parent.id
    ? `${parent.tagName.toLowerCase()}#${parent.id}${nthChild}`
    : `${getElementSelector(parent)}${nthChild}`;
};

const parseSVG = (svgText) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, "image/svg+xml");
  return doc.querySelector("svg");
};

const setSVG = (container, svgElement, options) => {
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
};

const isValidShape = (shape) => {
  const parentElement = shape.parentElement;
  if (parentElement.tagName.toLowerCase() === "g") {
    if (
      parentElement.id?.toLowerCase().includes("amenities") ||
      parentElement.id?.toLowerCase().includes("units")
    )
      return true;
    return isValidShape(parentElement);
  }
  return false;
};
