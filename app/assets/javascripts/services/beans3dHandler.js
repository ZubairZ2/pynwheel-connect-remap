var enable3DMaps = definedAndHasValue(enable3DMaps) ? enable3DMaps : false;
var _3dSelectedItem = definedAndHasValue(_3dSelectedItem)
  ? _3dSelectedItem
  : null;
var _3dHoveredItem = definedAndHasValue(_3dHoveredItem) ? _3dHoveredItem : null;

var beansWidget = null;
var _3dSampleAmenities = [
  "SWIMMINGPOOL",
  "GYM",
  "BBQ",
  "SPA",
  "OFFICE",
  "ST",
  "EL",
  "EN",
];
var _3dConvertedUnitsArr = definedAndHasValue(_3dConvertedUnitsArr)
  ? _3dConvertedUnitsArr
  : [];
var _3dConvertedAmenitiesArr = definedAndHasValue(_3dConvertedAmenitiesArr)
  ? _3dConvertedAmenitiesArr
  : [];

var _3dConvertedArr = definedAndHasValue(_3dConvertedArr)
  ? _3dConvertedArr
  : [];

var beansAddress = "";
var map_marker_color = definedAndHasValue(map_marker_color)
  ? map_marker_color
  : "rgba(247, 0, 0, 0.61)";
var amenity_marker_color = definedAndHasValue(amenity_marker_color)
  ? amenity_marker_color
  : "#00bcd4";

var lastMouseInside = false;
var isMouseTrackerInitialized = false;

function initializeBeans3DMap() {
  beansAddress = formattedAddress(webCommunity);
  beansWidget = new BeansMap();

  _3dConvertedArr = setup3dArray();
  let displayOptions = beans3DMapDisplayOptions();
  displayOptions.filteredRows = filterBeansItemsIndices();

  try {
    beansWidget.render(
      "beanswidget",
      _beansApiKey,
      _3dConvertedArr,
      {
        userLocation: "MANUAL",
        hideNavigateButton: false,
        hideMyLocationButton: false,
      },
      displayOptions,
      {
        onSelect: (data) => {
          if (data?.type === "UNIT") {
            onUnitClick(data);
          } else if (data?.type === "AMENITY") {
            openAmenityViewerModal(data, data.galleries);
          }
        },
        onHover: (data, event, isAmenity) => {
          if (isAmenity) {
            const amenity = _3dConvertedAmenitiesArr.find(
              ({ options: { onClickData } = {} } = {}) =>
                onClickData.type === "AMENITY" &&
                onClickData.name.toLowerCase() === data.toLowerCase()
            );

            const { options: { onClickData } = {} } = amenity || {};
            if (!onClickData) return;

            if (_3dHoveredItem?.unitId === onClickData.unitId) return;
            clear3DPopup();

            _3dHoveredItem = onClickData;
            const { eventHandlers: { showTooltip } = {} } = onClickData;

            if (showTooltip) showTooltip(event);
            initializeMouseTrackerFor3DHoverExit();
            return;
          }

          if (_3dHoveredItem?.unitId === data.unitId) return;
          clear3DPopup();

          markerHoverEffect(event, data);
        },
      }
    );
  } catch (e) {
    console.error(e);
  }

  beansWidget.workingInstance = beansWorkingMapInstance();
}

function beans3DMapDisplayOptions() {
  return {
    propertyAddress: beansAddress,
    filteredRows: null,
    initialMap: "3D",
    hideBeansCard: true,
    hideFloorSelector: true,
    modernBeansCard: false,
    showUnitList: false,
    hideFilters: true,
    showUnitShape: true,
    showUnitList: false,
    hideShadow: true,
    showCompass: true,
    showUnitShape: true,
    // camera: generateCameraView(),
    initialPosition: {
      address: beansAddress,
    },
    initialZ: 180,
    initialTilt: 65,
    initialHeading: 0,
    unitShape: {
      fillOpacity: 0.5,
    },
    selectableUnitShape: {
      fillColor: toHexColor(map_marker_color),
      fillOpacity: 0.85,
      strokeColor: toHexColor(map_marker_color),
      strokeWeight: 0,
      strokeOpacity: 0,
    },
    selectedUnitShape: {
      fillColor: toHexColor(map_marker_color),
      fillOpacity: 1.0,
      strokeColor: toHexColor(map_marker_color),
      strokeWeight: 1,
      strokeOpacity: 1,
    },
    highlightOptions: {
      color: toHexColor(map_marker_color),
      haloOpacity: 0.9,
      fillOpacity: 1,
    },
  };
}

function getFormattedBeansUnits() {
  return total_units.map((unit) => {
    const transformedObject = getExecutableDataFunctionForObject(
      unit.data_attributes
    );
    const transformedData = transformedObject.data();
    return {
      unitId: unit.id,
      unitProviderId: transformedData.unitProviderId,
      providerUnitId: transformedData.unitProviderId,
      availabilityUrl: transformedData.availabilityUrl,
      leaseTerm: transformedData.leaseTerm,
      status: unit.unit_status,
      modelUnit: unit.model_unit,
      unit: unit.marketing_name,
      name: unit.marketing_name,
      type: "UNIT",
      floor: unit.floor,
      bed: unit.bedrooms,
      bath: unit.bathrooms,
      sqft: unit.square_feet,
      rent: unit.market_rent,
    };
  });
}

function getFormattedBeansAmenities() {
  if (!Array.isArray(amenities)) return [];

  return amenities.map((amenity) => {
    const { tooltip, eventHandlers } = setup3dAmenityToolTip(amenity);
    return {
      unitId: amenity.id,
      unit: amenity.name,
      name: amenity.name,
      type: "AMENITY",
      galleries: amenity.galleries,
      showName: amenity.show_name,
      imageUrl: amenity.image_url,
      floor: amenity.floor,
      tooltip,
      eventHandlers,
    };
  });
}

function setup3dArray() {
  const formattedUnits = getFormattedBeansUnits();
  const formattedAmenities = getFormattedBeansAmenities();
  const combinedArr = [...formattedUnits, ...formattedAmenities];

  const _3dArray = convertUnitsArr(
    { address: beansAddress },
    combinedArr,
    true,
    true
  );

  _3dConvertedUnitsArr = [];
  _3dConvertedAmenitiesArr = [];

  return _3dArray.map((data, index) => {
    const unitData = combinedArr[index];
    data.options.markers.display = true;
    data.options.onClickData = unitData;
    data.options.onPreviewData = null;
    // data.options.onPreviewTitle = unitData.name;
    // data.options.onPreviewContent = unitData.providerUnitId;
    let fillColor = toHexColor(map_marker_color);

    switch (unitData.type) {
      case "UNIT":
        fillColor = getUnitMarkerColor(unitData.status, unitData.modelUnit);
        _3dConvertedUnitsArr.push(data);
        break;
      case "AMENITY":
        if (amenity_marker_color) fillColor = toHexColor(amenity_marker_color);
        _3dConvertedAmenitiesArr.push(data);
    }

    data.options.unitShape = {
      fillColor: fillColor,
      fillOpacity: 0.85,
      strokeColor: fillColor,
      strokeOpacity: 0.9,
      strokeWeight: 1,
    };
    data.options.selectedUnitShape = {
      fillColor: fillColor,
      fillOpacity: 1,
      strokeColor: fillColor,
      strokeOpacity: 1,
      strokeWeight: 2,
    };
    return data;
  });
}

// function generateCameraView() {
//   return {
//     tilt: 65,
//     heading: 0,
//     position: {
//       // x: parseFloat(webCommunity.longitude),
//       // y: parseFloat(webCommunity.latitude),
//       // z: 0,
//     },
//   };
// }

function reDrawBeansWidget() {
  if (_3dMapMode()) {
    renderChangedUnits();
    disabled_enabled_anchors();

    if (beansWidget?.workingInstance) {
      let displayOptions = beans3DMapDisplayOptions();
      displayOptions.filteredRows = filterBeansItemsIndices();
      beansWidget.setDisplayOptions(displayOptions);
      beansWidget.redraw();
    } else {
      initializeBeans3DMap();
    }
  }
}

function filterBeansItemsIndices() {
  const filteredUnitIds = filterUnitsBasedOnCommunityType(units).map(
    ({ id }) => id
  );
  const filteredAmenitiesIds = filterAmenitiesBasedOnCommunityType(
    amenities
  ).map(({ id }) => id);

  const matchedData = (unitId, isAmenity = false) =>
    isAmenity
      ? filteredAmenitiesIds.includes(unitId)
      : filteredUnitIds.includes(unitId);

  const filteredItemsIndices = _3dConvertedArr.map(
    ({ options: { onClickData: { unitId, type } } = {} }, index) =>
      matchedData(unitId, type === "AMENITY") ? index : null
  );

  return filteredItemsIndices.filter((index) => index);
}

function filterBeansUnits() {
  const filteredUnitIds = filterUnitsBasedOnCommunityType(units).map(
    ({ id }) => id
  );
  const filteredUnits = _3dConvertedUnitsArr.filter(
    ({ options: { onClickData: { unitId } } = {} }) =>
      filteredUnitIds.includes(unitId)
  );
  return filteredUnits;
}

function filterBeansAmenities() {
  const filteredAmenitiesIds = filterAmenitiesBasedOnCommunityType(
    amenities
  ).map(({ id }) => id);

  const filteredAmenities = _3dConvertedAmenitiesArr.filter(
    ({ options: { onClickData: { unitId } } = {} }) =>
      filteredAmenitiesIds.includes(unitId)
  );
  return filteredAmenities;
}

function _3dMapMode() {
  return selectMap === "3d-map" && enable3DMaps;
}

function beansWorkingMapInstance() {
  let result = null;

  if (beansWidget) {
    if (beansWidget.banvasObj) {
      result = beansWidget.banvasObj;
    }
    if (beansWidget.esriObj) {
      result = beansWidget.esriObj;
    }
    if (beansWidget.mapboxObj) {
      result = beansWidget.mapboxObj;
    }
    if (beansWidget.googleObj) {
      result = beansWidget.googleObj;
    }
  }

  return result;
}

function get3dSelectedData() {
  if (_3dSelectedItem) {
    const { options: { onClickData } = {} } = _3dSelectedItem;
    return onClickData;
  }
}

function get3dElementIndexById(unitID, isAmenity = false) {
  if (!unitID) return -1;

  const matchType = isAmenity ? "AMENITY" : "UNIT";

  return _3dConvertedArr.findIndex(
    ({ options: { onClickData: { unitId, type } = {} } = {} }) =>
      type === matchType && unitId === unitID
  );
}

function createPolygon() {
  var pathArr = new Array();
  var pbounds = so.createBounds();

  if (
    so.unitPolygonsToExclude[ix].coordinates &&
    so.unitPolygonsToExclude[ix].coordinates.length > 0
  ) {
    for (
      var i = 0;
      i < so.unitPolygonsToExclude[ix].coordinates[0].length;
      i++
    ) {
      pathArr.push(so.unitPolygonsToExclude[ix].coordinates[0][i]);
      so.extendBounds(pbounds, so.unitPolygonsToExclude[ix].coordinates[0][i]);
    }
  }
  var featureStyle;
  if (filteredRows && !filteredRows.includes(ix)) {
    featureStyle = defaultUnitShape;
    if (so.displayOptions.unitShape) {
      featureStyle = { ...featureStyle, ...so.displayOptions.unitShape };
    }
  } else {
    featureStyle = defaultSelectedUnitShape;
    if (so.displayOptions.selectedUnitShape) {
      featureStyle = {
        ...featureStyle,
        ...so.displayOptions.selectedUnitShape,
      };
    }
  }

  var polygon = new BanvasPolygon({ map: so.map, paths: pathArr });
  polygon.setOptions(featureStyle);

  polygon.addListener(
    "click",
    (function (ix) {
      return () => {
        so.currentIx = ix;
        so.displayDataFor(ix);
        showClickData.bind(so)(ix);
      };
    })(ix)
  );
}

function toScreenFromLngLat(lng, lat, view, callback) {
  require(["esri/geometry/Point"], function (Point) {
    if (!view || !view.ready) {
      console.warn("SceneView not ready");
      callback(null);
      return;
    }

    const point = new Point({
      longitude: lng,
      latitude: lat,
      z: 0,
      spatialReference: view.spatialReference,
    });

    const screenPoint = view.toScreen(point);

    if (isNaN(screenPoint?.x) || isNaN(screenPoint?.y)) {
      console.warn("Invalid screen point projection");
      callback(null);
    } else {
      callback(screenPoint);
    }
  });
}

function isMouseInsideGeoShape(mouseEvent, geojson, view) {
  const geometry = geojson.geometry;
  const coordinates = geometry.coordinates;
  const type = geometry.type;
  const properties = geojson.properties || {};
  const point = getMapRelativeCoords(mouseEvent, view);

  const screenRings = coordinates[0]
    .map(([lng, lat]) => {
      const pt = new window.__esri.geometry.Point({
        longitude: lng,
        latitude: lat,
        spatialReference: view.spatialReference,
      });
      return view.toScreen(pt);
    })
    .filter((pt) => pt && typeof pt.x === "number" && typeof pt.y === "number");

  switch (type) {
    case "Polygon":
      return isPointInPolygon(point, screenRings);

    case "Polyline":
      for (let i = 0; i < screenRings.length - 1; i++) {
        if (
          isPointNearLineSegment(point, screenRings[i], screenRings[i + 1], 5)
        ) {
          return true;
        }
      }
      return false;

    case "Circle":
      const radius = properties.radius || 25;
      return isPointInCircle(point, screenRings[0], radius);

    case "Ellipse":
      const rx = properties.rx || 30;
      const ry = properties.ry || 15;
      return isPointInEllipse(point, screenRings[0], rx, ry);

    case "Rect":
      if (screenRings.length >= 2) {
        return isPointInRect(point, screenRings[0], screenRings[1]);
      }
      return false;

    default:
      return false;
  }
}

function initializeMouseTrackerFor3DHoverExit() {
  if (isMouseTrackerInitialized || !mouseTracker) return;
  isMouseTrackerInitialized = true;

  mouseTracker.onChange(({ x, y, event }) => {
    if (!_3dHoveredItem) return;

    const isAmenity = _3dHoveredItem?.type === "AMENITY";
    const convertedIndex = get3dElementIndexById(
      _3dHoveredItem?.unitId,
      isAmenity
    );

    if (convertedIndex < 0) {
      clear3DPopup();
      return;
    }

    const { geojson } =
      beansWidget.workingInstance.unitPolygonsToExclude[convertedIndex] || {};

    const inside =
      (isAmenity && !isDefined(geojson)) ||
      (geojson &&
        isMouseInsideGeoShape(
          event,
          geojson,
          beansWidget.workingInstance.mapView
        ));

    if (inside) {
      if (!lastMouseInside) {
        console.log("Mouse entered shape");
        lastMouseInside = true;
      }
    } else {
      console.log("Mouse exited shape");
      lastMouseInside = false;

      if (isAmenity && _3dHoveredItem?.eventHandlers?.hideTooltip) {
        _3dHoveredItem.eventHandlers.hideTooltip();
      }

      clear3DPopup();
    }
  });
}

function clear3DPopup() {
  if (!_3dHoveredItem) return;
  if (_3dHoveredItem.type === "AMENITY") {
    _3dHoveredItem.eventHandlers.hideTooltip();
  } else {
    $("#marker-popover").addClass("hidden");
    $(`#unit_${_3dHoveredItem.unitId}`).css("border", "none");
  }
  // if ($beansMarkerPopover) $beansMarkerPopover.removeClass("hidden");
  _3dHoveredItem = null;
}

function getMapRelativeCoords(event, view) {
  const rect = view.container.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

function _3dPositionTooltip(e, tooltip) {
  tooltip.style.position = "absolute";
  tooltip.style.left = `${e.x + 10}px`;
  tooltip.style.top = `${e.y + 20}px`;
  tooltip.style.visibility = "visible";
}

function setup3dAmenityToolTip(data) {
  const toolTipSpan = document.createElement("span");

  toolTipSpan.classList.add("amenityTooltipText");
  toolTipSpan.innerHTML = `
    <h2 style="display: ${data.show_name ? "block" : "none"}">
      ${data.name}
    </h2>
    <img src="${data.image_url}" alt="Image Title">
  `;

  document
    .getElementById("beanswidget")
    .insertAdjacentElement("afterend", toolTipSpan);

  return {
    tooltip: toolTipSpan,
    eventHandlers: {
      showTooltip: (e) => {
        const $beansMarkerPopover = $(
          "div.esri-ui-inner-container.esri-ui-manual-container > div.esri-component[role='presentation']"
        );

        $beansMarkerPopover.addClass("hidden");
        _3dPositionTooltip(e, toolTipSpan);
      },
      hideTooltip: () => {
        toolTipSpan.style.visibility = "hidden";
      },
    },
  };
}
