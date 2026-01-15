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
  setTimeout(() => {
    moveZoomableImageToCenter(elem, true, false);
  }, 0);
}

// function moveZoomableImageToCenter(elem, resetScale = true, resetPosition = false) {
//   if (!elem) return;

//   const key = getZoomPanKey(elem);
//   const panObj = zoomablePans[key];
//   if (!panObj) return;

//   const instance = panObj.instance;

//   // The REAL zoom target inside container
//   const inner = elem.querySelector('#viewArea') || elem.querySelector('svg') ||  elem.querySelector('img');
//   if (!inner) return;

//   const $inner = $(inner);
//   const $parent = $(elem);

//   const realWidth = $inner.width();
//   const realHeight = $inner.height();
//   const parentWidth = $parent.width();
//   const parentHeight = $parent.height();

//   let scaleFactor;

//   if (resetScale) {
//     const scaleX = parentWidth / (realWidth || 1);
//     const scaleY = parentHeight / (realHeight || 1);
//     scaleFactor = Math.min(scaleX, scaleY, 1);
//     instance.zoomAbs(0, 0, scaleFactor);
//   } else {
//     scaleFactor = instance.getTransform().scale;
//   }

//   if (resetPosition) {
//     instance.moveTo(0, 0);
//   } else {
//     const transformedWidth = realWidth * scaleFactor;
//     const transformedHeight = realHeight * scaleFactor;

//     const centerX = (parentWidth - transformedWidth) / 2;
//     const centerY = (parentHeight - transformedHeight) / 2;

//     instance.moveTo(centerX, centerY);
//   }
// }

function moveZoomableImageToCenter(elem, resetScale = true) {
  const key = getZoomPanKey(elem);
  const panObj = zoomablePans[key];
  if (!panObj) return;

  const instance = panObj.instance;

  const parent = elem.parentElement;
  if (!parent) return;

  const contentRect = elem.getBoundingClientRect();
  const parentRect = parent.getBoundingClientRect();

  let scale = instance.getTransform().scale;

  if (resetScale) {
    const scaleX = parentRect.width / contentRect.width;
    const scaleY = parentRect.height / contentRect.height;
    scale = Math.min(scaleX, scaleY, 1);
    instance.zoomAbs(0, 0, scale);
  }

  const x = (parentRect.width - contentRect.width * scale) / 2;
  const y = (parentRect.height - contentRect.height * scale) / 2;

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

/************************************************************
 UNIVERSAL ZOOM INITIALIZER
 Works for:
 - .plot-image (image-based maps)
 - #svg_map.plot-image (SVG-based maps)
 - #map.plot-image
 - #zoom-group-wrapper (group SVG zoom)
*************************************************************/

function initAllZoomables() {
  let $zoomTargets;

  if(svgMode)
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

  /***********************************************
   * 1. GLOBAL ZOOM BUTTONS (webpage header)
   ***********************************************/
  $(".zoom-in-webpage").off("click").on("click", function () {
    const z = getCurrentZoomInstance();
    z?.instance?.zoomInOut(187);
  });

  $(".zoom-out-webpage").off("click").on("click", function () {
    const z = getCurrentZoomInstance();
    z?.instance?.zoomInOut(189);
  });


  /***********************************************
   * 2. LOCAL ZOOM BUTTONS (inside .buttons div)
   ***********************************************/
  $(".zoom-in").off("click").on("click", function (e) {
    const zoomContainer = $(e.currentTarget)
      .closest('.buttons')
      .siblings()
      .find('.plot-image')[0];

    if (!zoomContainer) return;

    const key = getZoomPanKey(zoomContainer);
    const inst = zoomablePans?.[key]?.instance;

    inst?.zoomInOut(187);
  });

  $(".zoom-out").off("click").on("click", function (e) {
    const zoomContainer = $(e.currentTarget)
      .closest('.buttons')
      .siblings()
      .find('.plot-image')[0];

    if (!zoomContainer) return;

    const key = getZoomPanKey(zoomContainer);
    const inst = zoomablePans?.[key]?.instance;

    inst?.zoomInOut(189);
  });


  /***********************************************
   * 3. RESET BUTTON (inside .buttons div)
   ***********************************************/
  $(".reset").off("click").on("click", function () {
    $(".divLoading").removeClass("hidden");
    window.location.reload();
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