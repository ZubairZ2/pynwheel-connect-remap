var zoomablePans = definedAndHasValue(zoomablePans) ? zoomablePans : {};

function getZoomPanKey(element) {
  if (!element || !element.tagName) return null;
  return `${element.tagName.toLowerCase()}-${element.id || 'no-id'}`;
}

function activateZoomPan(elem, centralizeElement = true, options = {}) {
  if (!elem) return;
  const key = getZoomPanKey(elem);

  if (!zoomablePans) zoomablePans = {};
  if (zoomablePans[key]) return;

  zoomablePans[key] = {
    instance: panzoom(elem, {
      minZoom: 0.5,
      maxZoom: 10.0,
      zoomSpeed: 0.009,
      bounds: true,
      boundsPadding: 0.1,
      ...options,
    }),
    elem: elem
  };

  setTimeout(() => {
    const inst = zoomablePans[key].instance.getTransform();
    zoomablePans[key].initial = {
      scale: inst.scale,
      x: inst.x,
      y: inst.y
    };
  }, 100);

  const touchEvents = ["touchstart", "touchmove", "touchend", "touchcancel"];

  touchEvents.forEach(evt =>
    elem.addEventListener(evt, touchHandler, true)
  );

  if (centralizeElement) zoomReset();

  const imgEl = elem.tagName.toLowerCase() === 'img' ? elem : elem.querySelector('img');
  if (imgEl && !imgEl.complete) {
    imgEl.addEventListener('load', () => moveZoomableImageToCenter(elem, true, false), { once: true });
  } else {
    setTimeout(() => {
      moveZoomableImageToCenter(elem, true, false);
    }, 0);
  }

  // Show/hide reset map button as zoom transforms happen
  zoomablePans[key].instance.on('transform', function () {
    updateResetMapBtn();
  });
}

function moveZoomableImageToCenter(elem, resetScale = true) {
  const key = getZoomPanKey(elem);
  const panObj = zoomablePans[key];
  if (!panObj) return;

  const instance = panObj.instance;
  const parent = elem.parentElement;
  if (!parent) return;

  // Use actual DOM sizes (natural for images, getBBox for SVG)
  let contentWidth, contentHeight;

  if (elem.tagName.toLowerCase() === "img") {
    contentWidth = elem.naturalWidth || elem.width;
    contentHeight = elem.naturalHeight || elem.height;
  } else if (elem.tagName.toLowerCase() === "svg") {
    const viewBox = elem.viewBox.baseVal;
    if (viewBox && viewBox.width && viewBox.height) {
      contentWidth = viewBox.width;
      contentHeight = viewBox.height;
    } else {
      const bbox = elem.getBBox();
      contentWidth = bbox.width;
      contentHeight = bbox.height;
    }
  } else {
    // fallback for divs or other elements
    contentWidth = elem.offsetWidth;
    contentHeight = elem.offsetHeight;
  }

  const parentWidth = parent.clientWidth;
  const parentHeight = parent.clientHeight;

  let scale = instance.getTransform().scale;

  if (resetScale) {
    const scaleX = parentWidth / contentWidth;
    const scaleY = parentHeight / contentHeight;
    // Fit the map to fill the parent; cap at 1 so we don't over-enlarge small images
    scale = Math.min(scaleX, scaleY, 1);
    instance.zoomAbs(0, 0, scale);
  }

  // Center relative to parent
  const x = (parentWidth - contentWidth * scale) / 2;
  const y = (parentHeight - contentHeight * scale) / 2;

  instance.moveTo(x, y);
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

function initAllZoomables() {
  let $zoomTargets;

  if (svgMode)
    $zoomTargets = $('#zoom-group-wrapper, .plot-image');
  else
    $zoomTargets = $('#zoom-group-wrapper > div, .plot-image');

  $zoomTargets.each(function () {
    const container = this;
    activateZoomPan(container);

    const viewArea = container.querySelector('#viewArea');

    if (
      viewArea &&
      typeof assetTracker !== 'undefined' &&
      assetTracker &&
      typeof assetTracker.addOrUpdateAsset === "function"
    ) {
      const asset = {
        id: "zoomable-" + (container.id || Math.random()),
        node: viewArea,
        url: viewArea.src || '',
        type: viewArea.tagName.toLowerCase(),
        completed: true
      };
      assetTracker.addOrUpdateAsset(asset, true);
    }
  });
}

function getCurrentZoomInstance() {
  const candidates = [
    document.getElementById("zoom-group-wrapper"),
    document.querySelector(".plot-image"),
    document.getElementById("map"),
  ];

  for (const elem of candidates) {
    if (!elem) continue;
    const key = getZoomPanKey(elem);
    if (zoomablePans[key]) return zoomablePans[key];
  }

  return null;
}

function getCurrentImageMapZoomInstance() {
  for (const key in zoomablePans) {
    const panObj = zoomablePans[key];
    if (!panObj?.instance) continue;

    const elem = panObj.elem;
    if (!elem) continue;

    // Check if the element is visible
    const rect = elem.getBoundingClientRect();
    const isVisible =
      rect.width > 0 &&
      rect.height > 0 &&
      rect.bottom >= 0 &&
      rect.right >= 0 &&
      rect.top <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.left <= (window.innerWidth || document.documentElement.clientWidth);

    if (isVisible) {
      return panObj;
    }
  }

  return null;
}

function getVisibleZoomableInstance() {
  let z = getCurrentZoomInstance();

  if (!z) {
    z = getCurrentImageMapZoomInstance()
  }

  return z?.instance;
}

var BUTTON_ZOOM_STEP = 1.3; // fixed zoom step for +/- buttons (independent of zoomSpeed)

function zoomInstanceByStep(inst, zoomIn) {
  if (!inst) return;
  const t = inst.getTransform();
  const owner = inst.mousewheel && inst.mousewheel.__owner;
  // Zoom toward the center of the visible owner element
  var cx, cy;
  try {
    // Try to find the owner element's bounding rect for center calculation
    const elem = document.querySelector('#zoom-group-wrapper, .plot-image');
    if (elem) {
      const rect = elem.parentElement ? elem.parentElement.getBoundingClientRect() : elem.getBoundingClientRect();
      cx = rect.width / 2;
      cy = rect.height / 2;
    } else {
      cx = window.innerWidth / 2;
      cy = window.innerHeight / 2;
    }
  } catch (e) {
    cx = window.innerWidth / 2;
    cy = window.innerHeight / 2;
  }
  const multiplier = zoomIn ? BUTTON_ZOOM_STEP : (1 / BUTTON_ZOOM_STEP);
  inst.smoothZoom(cx, cy, multiplier);
}

function bindGlobalZoomButtons() {
  $(".zoom-in-webpage").off("click").on("click", function () {
    zoomInstanceByStep(getVisibleZoomableInstance(), true);
  });

  $(".zoom-out-webpage").off("click").on("click", function () {
    zoomInstanceByStep(getVisibleZoomableInstance(), false);
  });

  $(".zoom-in").off("click").on("click", function (e) {
    const zoomContainer = $(e.currentTarget)
      .closest('.buttons')
      .siblings()
      .find('.plot-image')[0];

    if (!zoomContainer) return;

    const key = getZoomPanKey(zoomContainer);
    const inst = zoomablePans?.[key]?.instance;

    zoomInstanceByStep(inst, true);
  });

  $(".zoom-out").off("click").on("click", function (e) {
    const zoomContainer = $(e.currentTarget)
      .closest('.buttons')
      .siblings()
      .find('.plot-image')[0];

    if (!zoomContainer) return;

    const key = getZoomPanKey(zoomContainer);
    const inst = zoomablePans?.[key]?.instance;

    zoomInstanceByStep(inst, false);
  });

  $(".reset").off("click").on("click", function () {
    $(".divLoading").removeClass("hidden");
    window.location.reload();
  });

  $(".reset-map-btn").off("click").on("click", function (e) {
    e.preventDefault();
    zoomReset();
    $(".reset-map-btn").css("display", "none");
  });
}

function zoomReset() {
  for (const key in zoomablePans) {
    const obj = zoomablePans[key];
    if (!obj?.instance || !obj?.initial) continue;

    const elem = obj.elem;
    const rect = elem.getBoundingClientRect();
    const isVisible = rect.width > 0 && rect.height > 0;

    if (!isVisible) continue;

    const inst = obj.instance;
    const init = obj.initial;

    inst.zoomAbs(0, 0, init.scale);
    inst.moveTo(init.x, init.y);
  }
}

function updateResetMapBtn() {
  const panObj = getCurrentImageMapZoomInstance();
  if (!panObj) return;

  const inst = panObj.instance;
  const initial = panObj.initial;
  if (!inst || !initial) return;

  const currentScale = inst.getTransform().scale;
  const isZoomed = Math.abs(currentScale - initial.scale) > 0.01;

  $(".reset-map-btn").css("display", isZoomed ? "" : "none");
}

const preventZoomOutsideContainers = function (e) {
  const isZoomableArea = $(e.target).closest(
    '#zoom-group-wrapper, .plot-image, #zoomable, .image-map, .zoomable-map-container, #floorplan-image'
  ).length > 0;

  if (!isZoomableArea) {
    // Prevent zoom gesture
    if (e.ctrlKey || e.metaKey || (e.touches && e.touches.length > 1)) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  }
};

function disableOutsideZoomContainer() {
  document.addEventListener('wheel', preventZoomOutsideContainers, { passive: false, capture: true });
  document.addEventListener('touchstart', preventZoomOutsideContainers, { passive: false, capture: true });
  document.addEventListener('touchmove', preventZoomOutsideContainers, { passive: false, capture: true });
  document.addEventListener('gesturestart', preventZoomOutsideContainers, { passive: false, capture: true });
  document.addEventListener('gesturechange', preventZoomOutsideContainers, { passive: false, capture: true });
  document.addEventListener('gestureend', preventZoomOutsideContainers, { passive: false, capture: true });
}

function enableZoom() {
  initAllZoomables();
  bindGlobalZoomButtons()
}