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
  function getSvgClickedElementWithCenterPoint(svgParentSelector) {
    const svg = document.querySelector(`${svgParentSelector} > svg`);

    if (!svg) return {};

    const point = svg.createSVGPoint();
    point.x = e.clientX;
    point.y = e.clientY;

    const svgPoint = point.matrixTransform(svg.getScreenCTM().inverse());

    const resultingElement = Array.from(svg.querySelectorAll("rect")).filter(
      (rect) => isPointInRect(svgPoint, rect)
    )[0];
    const centerPoint = null;

    if (!resultingElement) {
      const polygons = Array.from(svg.querySelectorAll("polygon"))
        .filter((polygon) => isPointInPolygon(svgPoint, polygon.points))
        .map((polygon) => ({ polygon, area: getPolygonArea(polygon.points) }));

      if (polygons.length > 0) {
        resultingElement = polygons.sort((a, b) => a.area - b.area)[0].polygon;
      }
    }

    if (resultingElement) {
      const svgRect = svg.getBoundingClientRect();
      const parentRect = svg.offsetParent?.getBoundingClientRect() || {
        left: 0,
        top: 0,
      };

      centerPoint.x = centerPoint.x + svgRect.left - parentRect.left;
      centerPoint.y = centerPoint.y + svgRect.top - parentRect.top;
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
