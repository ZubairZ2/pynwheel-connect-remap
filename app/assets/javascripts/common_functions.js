var has_floorplate;
if (typeof has_floorplate === "undefined") {
  has_floorplate = false;
}

window.isSVG = function isSVG() {
  return (
    (has_floorplate?.toString() === "true" &&
      !!document.querySelector(`svg#viewArea-${current_floor}`)) ||
    !!document.querySelector("svg#viewArea")
  );
};

window.activateZoomPan = function activateZoomPan(elem) {
  document.addEventListener("touchstart", touchHandler, true);
  document.addEventListener("touchmove", touchHandler, true);
  document.addEventListener("touchend", touchHandler, true);
  document.addEventListener("touchcancel", touchHandler, true);
  window.mapPanZoom = panzoom(elem, {
    minZoom: 0.5,
    maxZoom: 3.0,
    bounds: true,
    boundsPadding: 0.3,
  });
  var transform = mapPanZoom ? mapPanZoom.getTransform() : {};
  var scaleFactor = 1 / (transform.scale || 1);
  var previous_scale = 0;

  const jQueryElem = $(elem);
  let mapBoxWidth = jQueryElem.width();
  let mapBoxHeight = jQueryElem.height();

  const jQueryParentElem = jQueryElem.parent();
  let mapBoxParentWidth = jQueryParentElem.width();
  let mapBoxParentHeight = jQueryParentElem.height();
  while (
    mapBoxWidth / scaleFactor > mapBoxParentWidth ||
    mapBoxHeight / scaleFactor > mapBoxParentHeight
  ) {
    mapPanZoom.zoomInOut(189);
    transform = mapPanZoom ? mapPanZoom.getTransform() : {};
    scaleFactor = 1 / (transform.scale || 1);
    if (scaleFactor === previous_scale) {
      break;
    }
    previous_scale = scaleFactor;
  }
  mapPanZoom.moveTo(0, 0);
};

window.touchHandler = function touchHandler(event) {
  var touch = event.changedTouches[0];

  var simulatedEvent = document.createEvent("MouseEvent");
  simulatedEvent.initMouseEvent(
    { touchstart: "mousedown", touchmove: "mousemove", touchend: "mouseup" },
    [event.type],
    true,
    true,
    window,
    1,
    touch.screenX,
    touch.screenY,
    touch.clientX,
    touch.clientY,
    false,
    false,
    false,
    false,
    0,
    null
  );

  touch.target.dispatchEvent(simulatedEvent);
};

window.fetchSVG = async function fetchSVG(
  dataSetSelector,
  options = { svgPosition: 0, activateZoom: false, floor: 0 }
) {
  const container = document.querySelector(dataSetSelector);
  const imageUrl = container?.dataset.svgUrl;

  if (imageUrl && imageUrl.endsWith(".svg")) {
    await fetch(imageUrl)
      .then((response) => response.text())
      .then((svgText) => {
        const svgElement = parseSVG(svgText);
        if (svgElement) {
          parsedSVGs.push(svgElement);
          setSVG(container, svgElement, options);
        } else {
          console.error("Error: No <svg> element found in the response.");
        }
      })
      .catch((error) => console.error("Error loading SVG:", error));
  }

  if (options.activateZoom) {
    activateZoomPan(container);
  }
};

window.setPointersCoordinates = function setPointersCoordinates() {
  if (!parsedSVGs.length) return;

  let floorBasedUnits = units;

  parsedSVGs.forEach((svgElement) => {
    $(".cloned-unit", svgElement).each(function () {
      $(this).addClass("hidden");
    });

    let floorNum = null;

    if (has_floorplate?.toString() === "true" && svgElement.parentElement) {
      const splittedSvgParentId = svgElement.parentElement.id.split("_");
      floorNum = parseInt(splittedSvgParentId[splittedSvgParentId.length - 1]);

      if (
        svgElement.id !== `viewArea-${floorNum}` ||
        floorNum !== parseInt(current_floor)
      )
        return;

      floorBasedUnits = units.filter(({ floor }) => floor === floorNum);
    }

    if (!floorBasedUnits?.length) return;

    floorBasedUnits.forEach(({ pointer_data, data_attributes }) => {
      let { tag, id, selector } = pointer_data || {};
      if (tag && (id || selector)) {
        hash_operator = "#";
        if (id) selector = `${tag}${hash_operator}${id}`;
        const block = svgElement.querySelector(selector);
        const existingDuplicate = svgElement.querySelector(
          id ? `${selector}_cloned` : `${selector}.cloned-unit`
        );

        if (existingDuplicate) {
          $(existingDuplicate).removeClass("hidden");
        } else {
          const duplicateBlock = block.cloneNode(true);

          for (const key in data_attributes) {
            duplicateBlock.setAttribute(key, data_attributes[key]);
          }
          duplicateBlock.setAttribute(
            "id",
            `${id ? block.id : selector}_cloned`
          );
          console.log(map_marker_color);

          duplicateBlock.setAttribute("fill", map_marker_color);
          const jqueryEl = $(duplicateBlock);
          jqueryEl.addClass("cloned-unit");
          jqueryEl.removeClass("hidden");
          jqueryEl.on("click", () => {
            $("#unitModal").show();
          });
          jqueryEl.on("mouseenter", markerHoverEffect);
          jqueryEl.on("mouseleave", markerHoverEffectEnd);
          block.parentElement.appendChild(duplicateBlock);
        }
      }
    });
  });

  $(".popup-title").css("background-color", map_marker_color);
  $(".popup-arrow").css("background-color", map_marker_color);
};

window.setAmenitiesCoordinates = function setAmenitiesCoordinates() {
  if (!parsedSVGs.length) return;

  let floorBasedAmenities = amenities;

  parsedSVGs.forEach((svgElement) => {
    let floorNum = null;

    if (has_floorplate?.toString() === "true" && svgElement.parentElement) {
      const splittedSvgParentId = svgElement.parentElement.id.split("_");
      floorNum = parseInt(splittedSvgParentId[splittedSvgParentId.length - 1]);

      if (
        svgElement.id !== `viewArea-${floorNum}` ||
        floorNum !== parseInt(current_floor)
      )
        return;

      floorBasedAmenities = amenities.filter(({ floor }) => floor === floorNum);
    }
    if (!floorBasedAmenities?.length) return;

    floorBasedAmenities.forEach((amenity) => {
      const { pointer_data: pointerData } = amenity || {};
      let { tag, id, selector } = pointerData || {};
      if (tag && (id || selector)) {
        hash_operator = "#";
        if (id) selector = `${tag}${hash_operator}${id}`;
        const block = svgElement.querySelector(selector);
        const existingDuplicate = svgElement.getElementById(
          `${selector}_cloned`
        );

        if (existingDuplicate) {
          $(existingDuplicate).removeClass("hidden");
        } else {
          const duplicateBlock = block.cloneNode(true);

          duplicateBlock.setAttribute(
            "id",
            `${id ? block.id : selector}_cloned`
          );
          console.log(map_marker_color);

          duplicateBlock.setAttribute("fill", map_marker_color);
          duplicateBlock.classList.add(
            "cloned-amenity",
            "slider-amenity",
            "amenityTooltip"
          );

          // split in two rounds
          block.parentElement.appendChild(duplicateBlock);

          const { x, y } = block.getBoundingClientRect();
          const toolTipSpan = document.createElement("span");
          toolTipSpan.classList.add("amenityTooltipText");
          toolTipSpan.innerHTML = `
            <h2 style="display: ${amenity.show_name ? "block" : "none"}">${
            amenity.name
          }</h2>
            <img src="${amenity.image_url}" alt="Image Title">
          `;
          svgElement.insertAdjacentElement("afterend", toolTipSpan);
          toolTipSpan.style.position = "absolute";
          toolTipSpan.style.top = y - 92;
          toolTipSpan.style.left = x - 53;

          const jqueryEl = $(duplicateBlock);
          jqueryEl.on("click", () => {
            openAmenityViewerModal(amenity, amenity.galleries);
          });
          jqueryEl.on("mouseenter", (_e) => amenityHoverEffect(toolTipSpan));
          jqueryEl.on("mouseleave", (_e) => amenityHoverEffectEnd(toolTipSpan));
        }
      }
    });
  });
};

window.isPointInPolygon = function isPointInPolygon(point, polygonPoints) {
  let x = point.x,
    y = point.y;
  let inside = false;
  let n = polygonPoints.numberOfItems;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    let xi = polygonPoints.getItem(i).x,
      yi = polygonPoints.getItem(i).y;
    let xj = polygonPoints.getItem(j).x,
      yj = polygonPoints.getItem(j).y;

    let intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }

  return inside;
};

window.isPointInRect = function isPointInRect(point, rect) {
  let x = point.x,
    y = point.y;
  let rectX = parseFloat(rect.getAttribute("x"));
  let rectY = parseFloat(rect.getAttribute("y"));
  let rectWidth = parseFloat(rect.getAttribute("width"));
  let rectHeight = parseFloat(rect.getAttribute("height"));

  return (
    x >= rectX &&
    x <= rectX + rectWidth &&
    y >= rectY &&
    y <= rectY + rectHeight
  );
};

window.getPolygonArea = function getPolygonArea(polygonPoints) {
  let area = 0;
  let n = polygonPoints.numberOfItems;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    let xi = polygonPoints.getItem(i).x,
      yi = polygonPoints.getItem(i).y;
    let xj = polygonPoints.getItem(j).x,
      yj = polygonPoints.getItem(j).y;
    area += xi * yj - xj * yi;
  }
  return Math.abs(area) / 2;
};

window.getSvgClickedElementWithCenterPoint =
  function getSvgClickedElementWithCenterPoint(svgParentSelector, e) {
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

window.getElementSelector = function getElementSelector(element) {
  if (!element) return null;

  const parent = element.parentElement;
  const nthChild = ` > ${element.tagName.toLowerCase()}:nth-child(${
    Array.from(parent.children).indexOf(element) + 1
  })`;
  if (parent.id) {
    const tag = parent.tagName?.toLowerCase();
    return `${tag}#${parent.id}${nthChild}`;
  } else {
    return `${getElementSelector(element)}${nthChild}`;
  }
};

function parseSVG(svgText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, "image/svg+xml");
  return doc.querySelector("svg");
}

function setSVG(container, svgElement, options) {
  let { svgPosition = 0, floor = 0 } = options;
  let childrenArray = Array.from(container?.children || []);

  const attributes = {
    id: "viewArea",
    draggable: false,
    class: "viewArea",
    "data-map_id": "map",
    name: "viewArea",
    position: "relative",
  };

  if (has_floorplate?.toString() === "true") {
    attributes.id = `viewArea-${floor}`;
  }

  const svgIndex = childrenArray.findIndex(
    (el) => el.tagName.toLowerCase() === "svg" && el.id === attributes.id
  );

  for (const key in attributes) {
    svgElement.setAttribute(key, attributes[key]);
  }

  if (svgElement.nodeName === "svg") {
    container.innerHTML = "";
    if (svgIndex > -1) {
      childrenArray[svgIndex] = svgElement;
    } else {
      const arr = [];
      while (svgPosition > 0) {
        arr.push(childrenArray.shift());
        svgPosition--;
      }

      childrenArray = [...arr, svgElement, ...childrenArray];
    }
    container.append(...childrenArray);
  }
}

function isValidShape(shape) {
  const parentElement = shape.parentElement;
  if (parentElement.tagName.toLowerCase() === "g") {
    if (
      parentElement.id?.toLowerCase().includes("amenities") ||
      parentElement.id?.toLowerCase().includes("units")
    )
      return true;
    else return isValidShape(parentElement);
  }

  return false;
}
