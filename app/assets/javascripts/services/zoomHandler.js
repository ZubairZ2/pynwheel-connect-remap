var zoomablePans = definedAndHasValue(zoomablePans) ? zoomablePans : {};

function getZoomPanKey(element) {
  return `${element.tagName.toLowerCase()}-${element.id}`;
}

function activateZoomPan(elem, centralizeElement = true, options = {}) {
  if (!elem) return;
  const key = getZoomPanKey(elem);

  if (!zoomablePans) zoomablePans = {};
  if (zoomablePans[key]) return;

  zoomablePans[key] = {
    instance: panzoom(elem, {
      minZoom: 0.5,
      maxZoom: mobileCheck() || $(window).width() <= 568 ? 10.0 : 5.0,
      bounds: true,
      boundsPadding: 0.3,
      ...options,
    }),
    elem: elem
  };

  // ⭐ MUST BE ADDED — store initial transform after DOM settles
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
}

function moveZoomableImageToCenter(elem, resetScale = true, resetPosition = false) {
  if (!elem) return;

  const key = getZoomPanKey(elem);
  const panObj = zoomablePans[key];
  if (!panObj) return;

  const instance = panObj.instance;

  // The REAL zoom target inside container
  const inner = elem.querySelector('#viewArea') || elem.querySelector('svg');
  if (!inner) return;

  const $inner = $(inner);
  const $parent = $(elem);

  const realWidth = $inner.width();
  const realHeight = $inner.height();
  const parentWidth = $parent.width();
  const parentHeight = $parent.height();

  let scaleFactor;

  if (resetScale) {
    const scaleX = parentWidth / (realWidth || 1);
    const scaleY = parentHeight / (realHeight || 1);
    scaleFactor = Math.min(scaleX, scaleY, 1);
    instance.zoomAbs(0, 0, scaleFactor);
  } else {
    scaleFactor = instance.getTransform().scale;
  }

  if (resetPosition) {
    instance.moveTo(0, 0);
  } else {
    const transformedWidth = realWidth * scaleFactor;
    const transformedHeight = realHeight * scaleFactor;

    const centerX = (parentWidth - transformedWidth) / 2;
    const centerY = (parentHeight - transformedHeight) / 2;

    instance.moveTo(centerX, centerY);
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

/************************************************************
 UNIVERSAL ZOOM INITIALIZER
 Works for:
 - .plot-image (image-based maps)
 - #svg_map.plot-image (SVG-based maps)
 - #map.plot-image
 - #zoom-group-wrapper (group SVG zoom)
*************************************************************/

function initAllZoomables() {
  const $zoomTargets = $('.plot-image, #zoom-group-wrapper');

  $zoomTargets.each(function () {
    const container = this;
    activateZoomPan(container);

    const viewArea = container.querySelector('#viewArea');
    if (viewArea && typeof assetTracker !== 'undefined') {
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


/************************************************************
 GET ACTIVE ZOOM INSTANCE (used by zoom buttons)
*************************************************************/
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


/************************************************************
 UNIFIED ZOOM BUTTONS
*************************************************************/
function bindGlobalZoomButtons() {
  $(".zoom-in-webpage").on("click", function () {
    const z = getCurrentZoomInstance();
    z?.instance?.zoomInOut(187);
  });

  $(".zoom-out-webpage").on("click", function () {
    const z = getCurrentZoomInstance();
    z?.instance?.zoomInOut(189);
  });
}


/************************************************************
 UNIVERSAL ZOOM RESET
*************************************************************/
function zoomReset() {
  const obj = getCurrentZoomInstance();
  if (!obj || !obj.initial) return;

  const inst = obj.instance;
  const init = obj.initial;

  inst.zoomAbs(0, 0, init.scale);
  inst.moveTo(init.x, init.y);
}

/************************************************************
 UNIVERSAL ZOOM ENABLER
*************************************************************/
function enableZoom() {
  initAllZoomables();
  bindGlobalZoomButtons()
}