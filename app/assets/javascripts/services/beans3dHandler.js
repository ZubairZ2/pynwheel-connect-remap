var enable3DMaps = definedAndHasValue(enable3DMaps) ? enable3DMaps : false;
var _3dFilteredUnits = definedAndHasValue(_3dFilteredUnits)
  ? _3dFilteredUnits
  : [];
var _3dAmenities = definedAndHasValue(_3dAmenities) ? _3dAmenities : [];
var _3dSelectedUnit = definedAndHasValue(_3dSelectedUnit)
  ? _3dSelectedUnit
  : [];
var _3dFilteredAmenity = definedAndHasValue(_3dFilteredAmenity)
  ? _3dFilteredAmenity
  : [];
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
var _3dConvertedArr = definedAndHasValue(_3dConvertedArr)
  ? _3dConvertedArr
  : [];
var beansAddress = "";
var map_marker_color = definedAndHasValue(map_marker_color)
  ? map_marker_color
  : "rgba(247, 0, 0, 0.61)";

function initializeBeans3DMap() {
  beansAddress = formattedAddress(webCommunity);
  beansWidget = new BeansMap();

  _3dConvertedArr = setup3dArray();
  let displayOptions = beans3DMapDisplayOptions();
  displayOptions.filteredRows = filterBeansUnitsIndices();

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
      onSelect: (data) => onUnitClick(data),
      onHover: (data, event) => markerHoverEffect(event, data),
    }
  );

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
    hightlightOptions: {
      color: toHexColor(map_marker_color),
      haloOpacity: 0.9,
      fillOpacity: 1,
    },
  };
}

function getFormattedBeansUnits() {
  return total_units.map((a) => {
    const transformedObject = getExecutableDataFunctionForObject(
      a.data_attributes
    );
    const transformedData = transformedObject.data();
    return {
      unitId: a.id,
      unitProviderId: transformedData.unitProviderId,
      providerUnitId: transformedData.unitProviderId,
      availabilityUrl: transformedData.availabilityUrl,
      leaseTerm: transformedData.leaseTerm,
      status: a.unit_status,
      modelUnit: a.model_unit,
      unit: a.marketing_name,
      name: a.marketing_name,
      floor: a.floor,
      bed: a.bedrooms,
      bath: a.bathrooms,
      sqft: a.square_feet,
      rent: a.market_rent,
    };
  });
}

function setup3dArray() {
  const formattedUnits = getFormattedBeansUnits();

  const _3dArray = convertUnitsArr(
    { address: beansAddress },
    formattedUnits,
    true,
    true
  );

  return _3dArray.map((data, index) => {
    const unitData = formattedUnits[index];
    data.options.markers.display = true;
    data.options.onClickData = unitData;
    data.options.onPreviewData = null;
    // data.options.onPreviewTitle = unitData.name;
    // data.options.onPreviewContent = unitData.providerUnitId;
    const unitFillColor = getUnitMarkerColor(
      unitData.status,
      unitData.modelUnit
    );
    data.options.unitShape = {
      fillColor: unitFillColor,
      fillOpacity: 0.85,
      strokeColor: unitFillColor,
      strokeOpacity: 0.9,
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
      displayOptions.filteredRows = filterBeansUnitsIndices();
      beansWidget.setDisplayOptions(displayOptions);
      beansWidget.redraw();
    } else {
      initializeBeans3DMap();
    }
  }
}

function filterBeansUnitsIndices() {
  const filteredUnitIds = filterUnitsBasedOnCommunityType(units).map(
    ({ id }) => id
  );

  const filteredUnitsIndices = _3dConvertedArr.map(
    ({ options: { onClickData: { unitId } } = {} }, index) =>
      filteredUnitIds.includes(unitId) ? index : null
  );

  return filteredUnitsIndices.filter((index) => index);
}

function filterBeansUnits() {
  const filteredUnitIds = filterUnitsBasedOnCommunityType(units).map(
    ({ id }) => id
  );
  const filteredUnits = _3dConvertedArr.filter(
    ({ options: { onClickData: { unitId } } = {} }) =>
      filteredUnitIds.includes(unitId)
  );
  return filteredUnits;
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

function get3dSelectedUnitData() {
  if (_3dSelectedUnit) {
    const { options: { onClickData } = {} } = _3dSelectedUnit;
    return onClickData;
  }
}

function getUnitIndexById(unitID) {
  if (!unitID) return -1;

  return _3dConvertedArr.findIndex(
    ({ options: { onClickData: { unitId } = {} } = {} }) => unitId === unitID
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

  // Project coordinates to screen
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

  const dedupedScreenRings = screenRings.filter(
    (pt, i, arr) => i === 0 || pt.x !== arr[i - 1].x || pt.y !== arr[i - 1].y
  );

  if (dedupedScreenRings.length < 3) return false;

  // Determine shape and logic
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
