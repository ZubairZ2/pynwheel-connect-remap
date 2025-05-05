var has_floorplate = definedAndHasValue(has_floorplate)
  ? has_floorplate
  : false;
var assetTracker = definedAndHasValue(assetTracker) ? assetTracker : null;

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

function findRealTopCenter(svgShape) {
  const tag = svgShape.tagName.toLowerCase();
  let points = [];

  if (["polygon", "polyline"].includes(tag)) {
    const pointsString = svgShape.getAttribute("points");
    points = pointsString
      .trim()
      .split(/\s+/)
      .map((p) => {
        const [x, y] = p.split(",").map(Number);
        return { x, y };
      });
  } else if (tag === "rect") {
    const x = parseFloat(svgShape.getAttribute("x"));
    const y = parseFloat(svgShape.getAttribute("y"));
    const width = parseFloat(svgShape.getAttribute("width"));
    const height = parseFloat(svgShape.getAttribute("height"));
    points = [
      { x: x, y: y },
      { x: x + width, y: y },
      { x: x + width, y: y + height },
      { x: x, y: y + height },
    ];
  } else if (tag === "circle") {
    const cx = parseFloat(svgShape.getAttribute("cx"));
    const cy = parseFloat(svgShape.getAttribute("cy"));
    const r = parseFloat(svgShape.getAttribute("r"));
    points = [
      { x: cx - r, y: cy },
      { x: cx + r, y: cy },
      { x: cx, y: cy - r },
      { x: cx, y: cy + r },
    ];
  } else if (tag === "ellipse") {
    const cx = parseFloat(svgShape.getAttribute("cx"));
    const cy = parseFloat(svgShape.getAttribute("cy"));
    const rx = parseFloat(svgShape.getAttribute("rx"));
    const ry = parseFloat(svgShape.getAttribute("ry"));
    points = [
      { x: cx - rx, y: cy },
      { x: cx + rx, y: cy },
      { x: cx, y: cy - ry },
      { x: cx, y: cy + ry },
    ];
  } else {
    throw new Error("Unsupported shape for top center calculation");
  }

  points.sort((a, b) => a.y - b.y);

  const first = points[0];
  const second = points[1];

  const midX = (first.x + second.x) / 2;
  const midY = (first.y + second.y) / 2;

  const svg = svgShape.ownerSVGElement || svgShape;
  const ctm = svgShape.getScreenCTM();

  const point = svg.createSVGPoint();
  point.x = midX;
  point.y = midY;

  const screenPoint = point.matrixTransform(ctm);

  return {
    screenX: screenPoint.x,
    screenY: screenPoint.y,
  };
}

function getPolygonCenter(coordinates) {
  let x = 0,
    y = 0,
    totalPoints = 0;

  coordinates[0].forEach(([lng, lat]) => {
    x += lng;
    y += lat;
    totalPoints++;
  });

  return { lng: x / totalPoints, lat: y / totalPoints };
}

function getDeviceType() {
  var ua = navigator.userAgent || navigator.vendor || window.opera;
  if (navigator.userAgentData) {
    var platform = navigator.userAgentData.platform || "";
    var isMobileDevice = navigator.userAgentData.mobile;
    if (isMobileDevice === true) {
      return "phone";
    } else if (isMobileDevice === false) {
      if (platform.includes("Android")) {
        return "tablet";
      }
    }
  }

  ua = ua.toLowerCase();
  if (ua.indexOf("iphone") > -1 || ua.indexOf("ipod") > -1) {
    return "phone";
  }
  if (ua.indexOf("ipad") > -1) {
    return "tablet";
  }
  if (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) {
    return "tablet";
  }

  if (ua.indexOf("android") > -1) {
    if (ua.indexOf("silk") > -1 || ua.indexOf("kindle") > -1) {
      return ua.indexOf("mobile") > -1 ? "phone" : "tablet";
    }
    return ua.indexOf("mobile") > -1 ? "phone" : "tablet";
  }

  if (ua.indexOf("windows phone") > -1 || ua.indexOf("iemobile") > -1) {
    return "phone";
  }
  if (ua.indexOf("windows") > -1 && ua.indexOf("touch") > -1 && ua.indexOf("phone") === -1) {
    var touchPoints = navigator.maxTouchPoints || navigator.msMaxTouchPoints || 0;
    if (touchPoints > 1) {
      return "tablet";
    }
  }

  if (ua.indexOf("blackberry") > -1 || ua.indexOf("bb10") > -1 || ua.indexOf("rim tablet") > -1) {
    if (ua.indexOf("playbook") > -1 || ua.indexOf("rim tablet") > -1) {
      return "tablet";
    } else {
      return "phone";
    }
  }
  if (ua.indexOf("tablet") > -1 && ua.indexOf("android") == -1) {
    return "tablet";
  }
  if (ua.indexOf("symbian") > -1 || ua.indexOf("series40") > -1 || ua.indexOf("s60") > -1 || ua.indexOf("windows ce") > -1) {
    return "phone";
  }
  if (ua.indexOf("webos") > -1 && ua.indexOf("tablet") === -1) {
    return "phone";
  }
  if (ua.indexOf("hpwos") > -1 || ua.indexOf("touchpad") > -1) {
    return "tablet";
  }

  return "desktop";
}


function mobileCheck() {
  return getDeviceType() === "phone";
}

function tabletCheck() {
  return getDeviceType() === "tablet";
}

function iOSversion() {
  if (/iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream)
    return true;
  else return false;
}

function smallScreen() {
  return mobileCheck() || tabletCheck() || window.innerWidth <= 993;
}

function extraSmallScreen() {
  return mobileCheck() || window.innerWidth <= 568;
}

function isElementVisibleOnScreen(element) {
  if (!element) return false;

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

    return isElementVisible(element);
  } catch (e) {
    console.error("Not a valid HTML Element", e);
    return false;
  }
}

function isElementVisible(element) {
  if (!element) return false;

  try {
    const rect = element.getBoundingClientRect();

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

function capitalize(s) {
  return s && s[0].toUpperCase() + s.slice(1);
}

function trim(str) {
  if (str) str.replace(/^\s+|\s+$/gm, "");
  else return str;
}

function toKebabCase(str) {
  return str
    .replace(/([a-z])([A-Z])/g, "$1-$2")          // Handle camelCase
    .replace(/([A-Z]{2,})(?=[A-Z][a-z])/g, "$1-") // Split multi-letter acronyms followed by mixed case
    .replace(/[\s_]+/g, "-")                      // Replace spaces and underscores with hyphens
    .toLowerCase()                                // Convert to lowercase
    .replace(/-+/g, "-")                          // Collapse multiple hyphens
    .replace(/^-|-$/g, "");                       // Trim hyphens
}

function toCamelCase(str) {
  return toKebabCase(str)
    .split("-")
    .map((word, index) => (index === 0 ? word : capitalize(word)))
    .join("");
}

function isColorWhite(color) {
  return (
    color === "#ffffff" ||
    color === "#fff" ||
    color === "white" ||
    color === "rgb(255, 255, 255)" ||
    color === "rgba(255, 255, 255, 1)"
  );
}

function toRgbColor(color) {
  const tempElement = document.createElement("div");
  tempElement.style.color = color;
  document.body.appendChild(tempElement);

  const computedColor = window.getComputedStyle(tempElement).color;
  document.body.removeChild(tempElement); // Clean up

  return computedColor.startsWith("rgb") ? computedColor : null;
}

function rgbaToHex(rgba) {
  if (rgba) {
    var parts = rgba.substring(rgba.indexOf("(")).split(",");
    r = parseInt(trim(parts[0].substring(1)), 10);
    g = parseInt(trim(parts[1]), 10);
    b = parseInt(trim(parts[2]), 10);
    if (definedAndHasValue(parts[3])) {
      a = parseFloat(trim(parts[3].substring(0, parts[3].length - 1))).toFixed(
        2
      );
    }
    if (definedAndHasValue(a)) {
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

function toHexColor(color) {
  const rgb = toRgbColor(color);
  if (!rgb) return null;

  const parts = rgb.match(/\d+/g); // Extract numeric RGB parts
  if (!parts || parts.length < 3) return null;

  const r = parseInt(parts[0], 10).toString(16).padStart(2, "0");
  const g = parseInt(parts[1], 10).toString(16).padStart(2, "0");
  const b = parseInt(parts[2], 10).toString(16).padStart(2, "0");

  return `#${r}${g}${b}`;
}

function isDefined(value) {
  return typeof value !== "undefined";
}

function hasValue(value) {
  return value !== null;
}

function definedAndHasValue(value) {
  return isDefined(value) && value !== null;
}

function getStretchRatio(
  currentWidth,
  currentHeight,
  originalWidth,
  originalHeight
) {
  const widthRatio = currentWidth / (originalWidth || 1);
  const heightRatio = currentHeight / (originalHeight || 1);

  return Math.min(widthRatio, heightRatio);
}

function transformKeys(obj, transformKey = null, deepTransform = false) {
  if (typeof obj !== "object" || obj === null) return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => transformKeys(item, transformKey));
  }

  return Object.entries(obj).reduce((acc, [key, value]) => {
    const newKey = typeof transformKey === "function" ? transformKey(key) : key;
    acc[newKey] = deepTransform ? transformKeys(value, transformKey) : value;
    return acc;
  }, {});
}

function formattedAddress(obj) {
  if (!obj) return "";

  const { address, city, state } = obj;

  return [address, city, state]
    .filter((part) => part && part.trim() !== "")
    .map((part) => part.trim())
    .join(", ");
}

function getExecutableDataFunctionForObject(obj) {
  const transformedObject = transformKeys(obj, (key) => {
    return key.startsWith("data-") ? key.slice(5) : key;
  });

  const camelCasedObject = transformKeys(transformedObject, toCamelCase);
  const dataFunction = (key = "") => {
    if (key) {
      return transformedObject[key] || camelCasedObject[toCamelCase(key)];
    } else return camelCasedObject;
  };

  return { data: dataFunction };
}
