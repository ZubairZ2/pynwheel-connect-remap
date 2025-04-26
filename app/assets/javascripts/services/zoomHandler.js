function getZoomPanKey(element) {
  return `${element.tagName.toLowerCase()}-${element.id}`;
}

function activateZoomPan(elem, centralizeElement = true, options = {}) {
  const key = getZoomPanKey(elem);

  if (!window.mapPanZoom) window.mapPanZoom = {};
  if (window.mapPanZoom[key]) return;

  window.mapPanZoom[key] = panzoom(elem, {
    minZoom: 0.5,
    maxZoom: (mobileCheck() || $(window).width() <= 568) ? 10.0 : 5.0,
    bounds: true,
    boundsPadding: 0.3,
    ...options,
  });

  const touchEvents = ["touchstart", "touchmove", "touchend", "touchcancel"];
  touchEvents.forEach((event) =>
    elem.addEventListener(event, touchHandler, true)
  );

  if (centralizeElement) moveZoomableImageToCenter(elem);
}

function moveZoomableImageToCenter(
  elem,
  resetScale = true,
  resetPosition = false
) {
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
