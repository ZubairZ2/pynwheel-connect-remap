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
  const formattedUnits = getFormattedBeansUnits();
  _3dConvertedArr = convertUnitsArr(
    { address: beansAddress },
    formattedUnits,
    true,
    true
  ).map((data, index) => {
    data.options.markers.display = true;
    data.options.onClickData = formattedUnits[index];
    return data;
  });

  beansWidget = new BeansMap();
  
  // -----
  let displayOptions = beans3DMapDisplayOptions();
  displayOptions.filteredRows = filterBeansUnitsIndices();
  // -----

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
    // forceHideFilters: true,
    showUnitShape: true,
    showUnitList: false,
    hideShadow: true,
    showCompass: true,
    showUnitShape: true,
    camera: generateCameraView(),
    initialPosition: {
      address: beansAddress,
    },
    unitShape: {
      fillOpacity: 0.5,
    },
    selectableUnitShape: {
      fillColor: toHexColor(map_marker_color),
      fillOpacity: 1.0,
      strokeWeight: 1.0,
      strokeOpacity: 1.0,
      strokeColor: "#ffffff",
    },
    selectedUnitShape: {
      fillColor: toHexColor(map_marker_color),
      fillOpacity: 1.0,
      strokeWeight: 1.0,
      strokeOpacity: 1.0,
      strokeColor: "#ffffff",
    },
  };
}

function getFormattedBeansUnits() {
  return total_units.map((a) => ({
    unitId: a.id,
    dataProviderId: a.data_attributes["data-unit-provider-id"],
    unit: a.marketing_name,
    name: a.marketing_name,
    floor: a.floor,
    bed: a.bedrooms,
    bath: a.bathrooms,
    sqft: a.square_feet,
    rent: a.market_rent,
  }));
}

function generateCameraView() {
  return {
    tilt: 65,
    heading: 265,
    position: {
      x: parseFloat(webCommunity.longitude),
      y: parseFloat(webCommunity.latitude),
      z: 120,
    },
  };
}

function reDrawBeansWidget() {
  if (_3dMapMode()) {
    renderChangedUnits();

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
