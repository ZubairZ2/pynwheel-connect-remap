var isWebpage;
var selectMap;
var webCommunity;
var favoritesArr = [];
var image_width_2d;
var enable3DMaps;
var maxSelectedPrice;
var timer;
var modalPanZoom;
var responsiveModalPanZoom;
var currency = "$";
var real_page_provider_unit_id = null;
var currentUnitSelected = null;
var parsedSVGs = [];
var tries = 1;

var isMouseMoving = false;
var intervalId = null;
var timeoutId = null;
var units = null;
var total_units = null;
var amenities = null;
var showCurrentAvailabilityEnabled;
var multiCommunity;
var communityInactivated;
var opsMapMarkersEnabled;
var defaultSelectedFloor;
var debouncedShowMarkers;
var modalButtonsCounter = 0;
var isRightRailCardClicked = false;

var _3dConvertedArr = definedAndHasValue(_3dConvertedArr)
  ? _3dConvertedArr
  : [];
var _3dConvertedUnitsArr = definedAndHasValue(_3dConvertedUnitsArr)
  ? _3dConvertedUnitsArr
  : [];
var _3dConvertedAmenitiesArr = definedAndHasValue(_3dConvertedAmenitiesArr)
  ? _3dConvertedAmenitiesArr
  : [];

var _3dHoveredItem;
var beansWidget;

$(document).ready(function () {
  if (smallScreen()) {
    $(".c-footer.desktop-content").remove();
    if (extraSmallScreen()) $(".c-sidebar").addClass("sidebar-header-bar");
  } else {
    $(".c-footer.mobile-footer").remove();
  }

  if (!units) {
    const webPageUnits = $("#communityWebpagesData").data("units");
    if (webPageUnits) units = webPageUnits;
    if (!total_units && webPageUnits) total_units = webPageUnits;
  }

  if (!amenities) {
    const webPageAmenities = $("#communityWebpagesData").data("amenitiesData");
    if (webPageAmenities) amenities = webPageAmenities;
  }

  if (!amenities) {
    const webPageAmenities = $("#communityWebpagesData").data("amenitiesData");
    if (webPageAmenities) amenities = webPageAmenities;
  }

  webCommunity = $("#communityWebpagesData").data("community");
  _3dAmenities = $("#communityWebpagesData").data("amenities");
  _3dConfigurations = $("#communityWebpagesData").data("mapConfigurations");
  currency = $("#communityWebpagesData").data("currency");
  debouncedShowMarkers = debounce(showMarkers, 100);

  if (isDefined(webCommunity)) {
    selectMap = opsMapMarkersEnabled ? "3d-map" : "2d-map"; //webCommunity.web_map_type;
    enable3DMaps = webCommunity.enable_three_d_maps;
    
    if(enable3DMaps)
      initializeBeans3DMap();
  } else {
    console.error("webCommunity not loaded properly");
  }

  $("#zoomable a").on("touchstart", function (e) {
    e.stopImmediatePropagation();
  });

  if ($(".is-webpage")[0]) {
    isWebpage = true;
    activateWebpageZoom();
    bindWebpageEvents();
    activateModalImageZoom();
    activateResponsiveImageModalZoom();
  }

  // Analytics
  mapContainerClickEvents();
  trackingMapClickEvents();
  trackingMapHoverEvents();
  // Analytics End

  if(svgMode) {
    if (
      !(
        definedAndHasValue(assetTracker) &&
        assetTracker.isWatching &&
        assetTracker.loader
      )
    )
      $(".webPageLoader").addClass("hidden");
  }
});

function bindWebpageEvents() {
  $('[data-toggle="tooltip"]').tooltip({ trigger: "hover" });
  $(document).keydown(function (event) {
    if (
      event.ctrlKey == true &&
      (event.which == "61" ||
        event.which == "107" ||
        event.which == "173" ||
        event.which == "109" ||
        event.which == "187" ||
        event.which == "189")
    ) {
      event.preventDefault();
    }
  });

  // var windowWidth = $(window).width();
  if (selectMap !== "3d-map") {
    // handleViewportChange(windowWidth);
    const markerColor = isColorWhite(map_marker_color)
      ? "grey"
      : map_marker_color;

    $(".popup-title").css("background-color", markerColor);
    $(".popup-arrow").css("background-color", markerColor);

    $(".custom-select").change(() => {
      renderMapData();
      setSVGUnitsAmenitiesCoordinates();
    });
  }

  ////////////// Disable browser zoom for webpage  ends here ////////////////
  $("#clickme").click(function () {
    $("#clickme").html(
      $("#clickme").html() == "Select Filter" ? "Hide Filter" : "Select Filter"
    );
    var $slider = $(".mydiv");
    $slider.animate({
      left: parseInt($slider.css("left"), 10) == -331 ? 0 : -331,
    });
  });

  ////////////////////////////////////////////////
  $("#leasing-start-date-icon").click(function (event) {
    event.preventDefault();
    $("#leasing-start-date").focus();
  });

  ////////////////////////////////////////////////
  /* unit modal*/
  $("#unitModal").on("hidden.bs.modal", function (e) {
    isRightRailCardClicked = false;
    resetToDefaultZoom();
  });

  $("#unitModal").on("show.bs.modal", function (e) {
    showUnitModal(e);
  });

  $(".active-filter").click(function () {
    if ($(this).is(":checked")) {
      $(this).parent().addClass("active");
    } else {
      $(this).parent().removeClass("active");
      $("#select-all-filters-checkbox").prop("checked", false);
      $("#select-all-filters-checkbox").removeClass("active");
    }
    debouncedShowMarkers();
  });
  /////////////////////////////////////////

  $(".3d-map-option").click(function () {
    selectMap = "3d-map";
    display3DMap();
  });

  $(".2d-map-option").click(function () {
    selectMap = "2d-map";
    display2DMap();
  });

  $("#market_rent, #responsive_market_rent").change(function () {
    if (smallScreen()) return;

    maxPriceFilterChanged();
  });

  $("#square_feet, #responsive_square_feet").change(function () {
    if (smallScreen()) return;

    squareFootageFilterChanged();
  });

  $("#unit_bedroom, #responsive_unit_bedroom").change(function () {
    if (smallScreen()) return;
    bedroomFilterChanged();
  });

  $("#available_unit, #responsive_available_unit").change(function () {
    if (smallScreen()) return;
    availabilityFilterChanged();
  });

  $("#multi_communities, #responsive_multi_communities").change(function () {
    if (smallScreen()) return;
    multiPropertiesFilterChanged();
  });

  $("#lease_term").change(function () {
    var select = document.getElementById("lease_term");
    var option = select.options[select.selectedIndex];
    $("#unitModal")
      .find("#total-market-rent")
      .html(currency + option.dataset.leasePrice);
  });

  $("#select-all-filters-checkbox").click(function () {
    if ($(this).is(":checked")) {
      $(this).parent().addClass("active");
      $(".active-filter").each(function () {
        $(this).prop("checked", true);
        $(this).parent().addClass("active");
      });
    } else {
      $(this).parent().removeClass("active");
      $(".active-filter").each(function () {
        $(this).prop("checked", false);
        $(this).parent().removeClass("active");
      });
    }
    debouncedShowMarkers();
  });

  ///////////////////////////////////////////
  $(".floorplate-anchor").click(function (e) {
    e.stopPropagation();
    $selectedFloorElement = $(this);

    const changedFloor = $selectedFloorElement.attr("id");
    const $currentImageBox = $("#floorplate_" + changedFloor);

    $(".floorplate-image").parent().addClass("hidden");
    $currentImageBox.removeClass("hidden");
    const floorIsChanged = changeFloorNumber(
      $selectedFloorElement,
      changedFloor
    );

    if (floorIsChanged) {
      debouncedShowMarkers();
      // if (svgMode) 
      zoomReset();
      if (!_3dMapMode()) $currentImageBox.parent().removeClass("hidden");
      return;
    }
  });

  $(".filter-label").click(function () {
    $(this).parent().find("input").click();
  });
}

function changeFloorNumber($selectedFloorElement, changedFloor) {
  if (changedFloor != current_floor) {
    $("#" + changedFloor).addClass("selected");

    // $currentImageBox.parent().removeClass("hidden");
    $(".digits-list-item").removeClass("selected");
    $selectedFloorElement.parent().addClass("selected");

    current_floor = changedFloor;
    return true;
  } else {
    return false;
  }
}

function adjustImageMapMarkersPosition() {
  if (svgMode || _3dMapMode()) return;

  const actualImage = getActualImageDimensions();
  const stretchedImage = getStretchedImageDimensions();

  positionAllMarkers(
    ".marker",
    "unit-x-plot",
    "unit-y-plot",
    stretchedImage,
    actualImage
  );
  positionAllMarkers(
    ".amenity-marker",
    "amenity-x-plot",
    "amenity-y-plot",
    stretchedImage,
    actualImage,
    true
  );
}

function getContainerDimensions() {
  const parent = $(".floorplate-image").parent();
  return { width: parent.width(), height: parent.height() };
}

function getActualImageDimensions() {
  const { width = 0, height = 0 } = currentMapImage()?.dataset || {
    width: 0,
    height: 0,
  };

  return { width, height };
}

function getStretchedImageDimensions() {
  const { width = 0, height = 0 } =
    currentVisibleMapImage()?.getBoundingClientRect() || {
      width: 0,
      height: 0,
    };

  return { width, height };
}

function positionAllMarkers(
  selector,
  xAttr,
  yAttr,
  stretched,
  actual,
  show = false
) {
  $(selector).each(function () {
    const marker = $(this);
    const x_plot = parseFloat(marker.data(xAttr));
    const y_plot = parseFloat(marker.data(yAttr));

    if (hasFloorplate()) {
      show = show && validFloor(marker.data("floor"));
    }
    if (show) marker.removeClass("hidden");
    setMarkerPosition(marker, x_plot, y_plot, stretched, actual);
  });
}

function setMarkerPosition(marker, x_plot, y_plot, stretched, actual) {
  const ratio = getStretchRatio(
    stretched.width,
    stretched.height,
    actual.width,
    actual.height
  );

  const currentScale = currentVisibleMapImageScale();
  const left = (x_plot * ratio) / currentScale;
  const top = (y_plot * ratio) / currentScale;

  marker.css({ left, top });
}

function showUnitModal(event) {
  if(!_3dMapMode()) {
    setUnitModalButtons(event);
    resetToDefaultZoom();
  }
}

function activateWebpageZoom() {
  enableZoom();

  $(".reset-webpage").on("click", function (e) {
    $(".webPageLoader").removeClass("hidden");
  });
}

function activateModalImageZoom() {
  const $modalArea = $("#zoomable-modal-image");
  const modalArea = $modalArea[0];

  if (modalArea) {
    modalPanZoom = panzoom(modalArea, {
      bounds: true,
      boundsPadding: 0.4,
      contain: "automatic",
      smoothScroll: false,
      maxZoom: 5,
      minZoom: 1,
      zoomDoubleClickSpeed: 1,
      onTouch: function (e) {
        e.preventDefault();
        return false;
      },
    });

    $(".zoom-in-modal").on("click", function (e) {
      $modalArea.removeClass("transform-none");
      modalPanZoom.zoomInOut(187);
      $(".reset-modal").removeClass("hidden");
    });

    $(".zoom-out-modal").on("click", function (e) {
      $modalArea.removeClass("transform-none");
      modalPanZoom.zoomInOut(189);
    });

    $(".reset-modal").on("click", function (e) {
      resetToDefaultZoom();
      $(".reset-modal").addClass("hidden");
    });

    $("#zoomable-modal-image").on("wheel", function (e) {
      $(".reset-modal").removeClass("hidden");
      $modalArea.removeClass("transform-none");
    });
  }
}

function activateResponsiveImageModalZoom() {
  const $imageArea = $("#zoomable-modal-image-responsive");
  const imageArea = $imageArea[0];

  if (imageArea) {
    responsiveModalPanZoom = panzoom(imageArea, {
      bounds: true,
      boundsPadding: 0.4,
      contain: "automatic",
      smoothScroll: false,
      maxZoom: 5,
      minZoom: 1,
      zoomDoubleClickSpeed: 1,
      onTouch: function (e) {
        e.preventDefault();
        return false;
      },
    });

    $(".zoom-in-res-modal").on("click", function (e) {
      $imageArea.removeClass("transform-none");
      responsiveModalPanZoom.zoomInOut(187);
    });

    $(".zoom-out-res-modal").on("click", function (e) {
      $imageArea.removeClass("transform-none");
      responsiveModalPanZoom.zoomInOut(189);
    });

    $(".reset-res-modal").on("click", function (e) {
      $imageArea.addClass("transform-none");
    });

    $("#zoomable-modal-image-responsive").on("wheel", function (e) {
      $imageArea.removeClass("transform-none");
    });

    $("#zoomable-modal-image-responsive a").on("touchstart", function (e) {
      e.stopImmediatePropagation();
    });
  }
}

function Toggle_maps(e) {
  beansWidget.toggleMap();
}

function debounce(func, delay) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), delay);
  };
}

function multiPropertiesFilterChanged() {
  filterUnitsBasedOnMultiCommunity();
  
  if(multiCommunity)
    updateBedroomFilterDropDownList();
  
  updateMaxPriceFilterDropDownList();
  updateSquareFootageFilterDropdownList();
  updateAvailabilityFilterDropdownList();

  debouncedShowMarkers();
}

function bedroomFilterChanged() {
  filterUnitsBasedOnMultiCommunity();
  filterUnitsBasedOnBedroom();
  updateDropdownListValues();
  debouncedShowMarkers();
}

function availabilityFilterChanged() {
  filterUnitsBasedOnMultiCommunity();
  filterUnitsBasedOnBedroom();
  filterUnitsBasedOnAvailability();
  
  updateSquareFootageFilterDropdownList();
  filterUnitsBasedOnSqfeet();

  updateMaxPriceFilterDropDownList();
  filterUnitsBasedOnMarketRent();

  debouncedShowMarkers();
}

function squareFootageFilterChanged() {
  filterUnitsBasedOnMultiCommunity();
  filterUnitsBasedOnBedroom();
  filterUnitsBasedOnAvailability();
  filterUnitsBasedOnSqfeet();

  updateMaxPriceFilterDropDownList();
  filterUnitsBasedOnMarketRent();

  debouncedShowMarkers();
}

function maxPriceFilterChanged() {
  filterUnitsBasedOnSelectedFilters();
  debouncedShowMarkers();
}

function updateDropdownListValues() {
  updateSquareFootageFilterDropdownList();
  updateMaxPriceFilterDropDownList();
  updateAvailabilityFilterDropdownList();
}

function filterUnitsBasedOnSelectedFilters() {
  filterUnitsBasedOnMultiCommunity();
  filterUnitsBasedOnBedroom();
  filterUnitsBasedOnSqfeet();
  filterUnitsBasedOnMarketRent();
  filterUnitsBasedOnAvailability();
}

function filterUnitsBasedOnAvailability() {
  const unitAvailabilityValue = smallScreen()
    ? $("#responsive_available_unit").val()
    : $("#available_unit").val();

  if (unitAvailabilityValue) {
    const startingIndex = parseInt(unitAvailabilityValue.split("-")[0]);
    const endIndex = parseInt(unitAvailabilityValue.split("-")[1]);
    units = filterUnitsBasedOnDate(units, startingIndex, endIndex);
  }
}

function setAvailabilityFilterToNow() {
  if (!showCurrentAvailabilityEnabled) return;
  if ($("#available_unit").find("option[value=now]").length) {
    $("#available_unit").find("option[value=now]").prop("selected", true);
    $("#available_unit").val("now").change();
  }
  if ($("#responsive_available_unit").find("option[value=now]").length) {
    $("#responsive_available_unit")
      .find("option[value=now]")
      .prop("selected", true);
    $("#responsive_available_unit").val("now").change();
  }
}

function toDateOnly(date) {
  const d = new Date(date); // ensure it's a Date object
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function filterUnitsBasedOnDate(floorplateUnits, startIndex, endIndex) {
  const today = new Date();
  const currentDay = new Date(today).setDate(today.getDate() + 0);
  const startDay = new Date(today).setDate(today.getDate() + startIndex);
  const endDay = new Date(today).setDate(today.getDate() + endIndex);

  if (!startDay && !endDay)
    floorplateUnits = floorplateUnits.filter(
      (unit) => unit.available && toDateOnly(unit.available_date) <= toDateOnly(currentDay)
    );

  if (startDay)
    floorplateUnits = floorplateUnits.filter(
      (unit) => unit.available && toDateOnly(unit.available_date) >= toDateOnly(startDay)
    );

  if (endDay)
    floorplateUnits = floorplateUnits.filter(
      (unit) => unit.available && toDateOnly(unit.available_date) <= toDateOnly(endDay)
    );

  return floorplateUnits;
}

function filterBasedOnScreen(filterTag) {
  const webFilterId = "#".concat(filterTag); //works on web view
  const mobileFilterId = "#responsive_".concat(filterTag); //works on mobile view

  if (smallScreen()) {
    return parseInt($(mobileFilterId).val());
  } else return parseInt($(webFilterId).val());
}

function filterUnitsBasedOnSqfeet() {
  const sqFeet = filterBasedOnScreen("square_feet");

  if (sqFeet)
    units = units.filter((unit) => unit.square_feet >= sqFeet);
}

function filterUnitsBasedOnMarketRent() {
  const marketRent = filterBasedOnScreen("market_rent");

  if (marketRent)
    units = units.filter( (unit) => unit.market_rent <= marketRent);
}

function filterUnitsBasedOnBedroom() {
  const unitBedroom = filterBasedOnScreen("unit_bedroom");

  if(!multiCommunity)
    units = total_units;

  if (unitBedroom || unitBedroom === 0)
    units = units.filter((unit) => unit.bedrooms == unitBedroom);
}

function filterMultiCommunityBasedOnScreen(filterTag) {
  const webFilterId = "#".concat(filterTag); //works on web view
  const mobileFilterId = "#responsive_".concat(filterTag); //works on mobile view
  if (smallScreen()) {
    return $(mobileFilterId).val();
  } else return $(webFilterId).val();
}

function filterUnitsBasedOnMultiCommunity() {
  const propertyId = filterMultiCommunityBasedOnScreen("multi_communities");

  if(propertyId)
    units = total_units.filter((unit) => unit.property_id.trim() == propertyId.trim())
  else 
    units = total_units
}

function updateAvailabilityFilterDropdownList() {
  reInitializeDropDownList("available_unit");

  const unavailableUnits = units.filter((unit) => !unit.available);
  const unitsAvailableNow = filterUnitsBasedOnDate(units, NaN, NaN);
  const unitsAvailableUnder30Days = filterUnitsBasedOnDate(
    units,
    0,
    30
  );
  const unitsAvailableUnder60Days = filterUnitsBasedOnDate(
    units,
    31,
    60
  );
  const unitsAvailableUnder90Days = filterUnitsBasedOnDate(
    units,
    61,
    90
  );
  const unitsAvailableUnder120Days = filterUnitsBasedOnDate(
    units,
    91,
    120
  );
  const unitsAvailableAbove121Days = filterUnitsBasedOnDate(
    units,
    121,
    NaN
  );

  const unitGroups = [
    unitsAvailableNow,
    unitsAvailableUnder30Days,
    unitsAvailableUnder60Days,
    unitsAvailableUnder90Days,
    unitsAvailableUnder120Days,
  ];
  if (opsMapMarkersEnabled) {
    unitGroups.push(unavailableUnits);
  }
  if (units_availability_over_120_days || opsMapMarkersEnabled) {
    unitGroups.push(unitsAvailableAbove121Days);
  }

  const groupsWithUnits = unitGroups.filter((group) => group.length > 0);

  const webFilterId = "#".concat("available_unit"); //works on web view
  const mobileFilterId = "#responsive_".concat("available_unit"); //works on mobile view

  if (
    groupsWithUnits.length >= 2 ||
    (opsMapMarkersEnabled &&
      (unavailableUnits.length > 0 || unitsAvailableAbove121Days.length > 0))
  ) {
    $(webFilterId).append(`<option value=""> All </option>`);
    $(mobileFilterId).append(`<option value=""> All </option>`);
  }

  if (unitsAvailableNow && unitsAvailableNow.length > 0) {
    $(webFilterId).append(`<option value="now"> Now </option>`);
    $(mobileFilterId).append(`<option value="now"> Now </option>`);
  }

  if (unitsAvailableUnder30Days && unitsAvailableUnder30Days.length > 0) {
    $(webFilterId).append(
      `<option value="0-30"> In the next 30 days </option>`
    );
    $(mobileFilterId).append(
      `<option value="0-30"> In the next 30 days </option>`
    );
  }

  if (unitsAvailableUnder60Days && unitsAvailableUnder60Days.length > 0) {
    $(webFilterId).append(`<option value="31-60"> In 31-60 days </option>`);
    $(mobileFilterId).append(`<option value="31-60"> In 31-60 days </option>`);
  }

  if (unitsAvailableUnder90Days && unitsAvailableUnder90Days.length > 0) {
    $(webFilterId).append(`<option value="61-90"> In 61-90 days </option>`);
    $(mobileFilterId).append(`<option value="61-90"> In 61-90 days </option>`);
  }

  if (unitsAvailableUnder120Days && unitsAvailableUnder120Days.length > 0) {
    $(webFilterId).append(`<option value="91-120"> In 91-120 days </option>`);
    $(mobileFilterId).append(
      `<option value="91-120"> In 91-120 days </option>`
    );
  }

  if (
    units_availability_over_120_days &&
    unitsAvailableAbove121Days &&
    unitsAvailableAbove121Days.length > 0
  ) {
    $(webFilterId).append(`<option value="121-"> In 121+ days </option>`);
    $(mobileFilterId).append(`<option value="121-"> In 121+ days </option>`);
  }

  disableAvailabilityOptions();
}

function updateSquareFootageFilterDropdownList() {
  // floorplateUnits = filterUnitsBasedOnCommunityType(floorplateUnits);
  // var unitsSqFeet = floorplateUnits.map((unit) => unit.square_feet);
  var unitsSqFeet = units.map((unit) => unit.square_feet);
  var uniqueList = getUniqueAndSortedListSquareFeet(unitsSqFeet);
  // var maxValue = Math.max(...uniqueList);

  reInitializeDropDownList("square_feet");

  const webFilterId = "#".concat("square_feet"); //works on web view
  const mobileFilterId = "#responsive_".concat("square_feet"); //works on mobile view

  for (var i = 0; i < uniqueList.length; i++) {
    $(webFilterId).append(
      `<option value="${uniqueList[i]}"> ${uniqueList[i]} </option>`
    );
    $(mobileFilterId).append(
      `<option value="${uniqueList[i]}"> ${uniqueList[i]} </option>`
    );
  }

  disableSquareFeetOptions();
}

function disableSquareFeetOptions() {
  if ($("#square_feet option").length === 0) {
    $("#square_feet")
      .prop("disabled", true)
      .append('<option value="">No option available</option>');
  } else {
    $("#square_feet").prop("disabled", false);
  }

  if ($("#responsive_square_feet option").length === 0) {
    $("#responsive_square_feet")
      .prop("disabled", true)
      .append('<option value="">No option available</option>');
  } else {
    $("#responsive_square_feet").prop("disabled", false);
  }
}

function updateMaxPriceFilterDropDownList() {
  if (display_rent === "false") return;

  // floorplateUnits = filterUnitsBasedOnCommunityType(floorplateUnits);
  // var unitsMarketRent = floorplateUnits.map((unit) => unit.market_rent);
  var unitsMarketRent = units.map((unit) => unit.market_rent);

  var uniqueList = getUniqueAndSortedListMarketRent(unitsMarketRent);
  // var minValue = Math.min(...uniqueList);

  reInitializeDropDownList("market_rent");

  for (var i = 0; i < uniqueList.length; i++) {
    $("#market_rent").append(
      `<option value="${uniqueList[i]}"> ${uniqueList[i]} </option>`
    ); //works on web view
    $("#responsive_market_rent").append(
      `<option value="${uniqueList[i]}"> ${uniqueList[i]} </option>`
    ); //works on mobile view
  }

  disablePriceRentOptions();
}

function getUniqueUnitBedrooms(floorplateUnits) {
  if (!floorplateUnits || floorplateUnits.length === 0) return [];

  const unitBedrooms = [];

  floorplateUnits.forEach((unit) => {
    let bedroomNumber = parseInt(unit.bedrooms);
    if (isNaN(bedroomNumber)) return;

    if (bedroomNumber === 0) {
      unitBedrooms.push(["Studio", "0_bedrooms", 0]);
    } else if (bedroomNumber === 1) {
      unitBedrooms.push(["1 Bedroom", "1_bedroom", 1]);
    } else {
      unitBedrooms.push([
        `${bedroomNumber} Bedrooms`,
        `${bedroomNumber}_bedrooms`,
        bedroomNumber,
      ]);
    }
  });

  const uniqueList = Array.from(
    new Set(unitBedrooms.map((item) => JSON.stringify(item)))
  ).map((item) => JSON.parse(item));

  uniqueList.sort((a, b) => a[2] - b[2]);

  return uniqueList.map(([label, value]) => [label, value]);
}

function updateBedroomFilterDropDownList() {
  reInitializeDropDownList("unit_bedroom");

  const webFilterId = "#".concat("unit_bedroom"); //works on web view
  const mobileFilterId = "#responsive_".concat("unit_bedroom"); //works on mobile view

  const dropDownList = getUniqueUnitBedrooms(units);

  if (dropDownList.length >= 2) {
    $(webFilterId).append(`<option value=""> All </option>`);
    $(mobileFilterId).append(`<option value=""> All </option>`);
  }

  for (var i = 0; i < dropDownList.length; i++) {
    $(webFilterId).append(
      `<option value="${dropDownList[i][1]}"> ${dropDownList[i][0]} </option>`
    );

    $(mobileFilterId).append(
      `<option value="${dropDownList[i][1]}"> ${dropDownList[i][0]} </option>`
    );
  }
  if (dropDownList.length >= 2) {
    $(webFilterId).val("");
    $(mobileFilterId).val("");
  }

  disableBedroomOptions();
}

function disableBedroomOptions() {
  if ($("#unit_bedroom option").length === 0) {
    $("#unit_bedroom")
      .prop("disabled", true)
      .append('<option value="">No option available</option>');
  } else {
    $("#unit_bedroom").prop("disabled", false);
  }

  if ($("#responsive_unit_bedroom option").length === 0) {
    $("#responsive_unit_bedroom")
      .prop("disabled", true)
      .append('<option value="">No option available</option>');
  } else {
    $("#responsive_unit_bedroom").prop("disabled", false);
  }
}

function disablePriceRentOptions() {
  if ($("#market_rent option").length === 0) {
    $("#market_rent")
      .prop("disabled", true)
      .append('<option value="">No option available</option>');
  } else {
    $("#market_rent").prop("disabled", false);
  }

  if ($("#responsive_market_rent option").length === 0) {
    $("#responsive_market_rent")
      .prop("disabled", true)
      .append('<option value="">No option available</option>');
  } else {
    $("#responsive_market_rent").prop("disabled", false);
  }
}

function disableAvailabilityOptions() {
  if ($("#available_unit option").length === 0) {
    $("#available_unit")
      .prop("disabled", true)
      .append('<option value="">No option available</option>');
  } else {
    $("#available_unit").prop("disabled", false);
  }

  if ($("#responsive_available_unit option").length === 0) {
    $("#responsive_available_unit")
      .prop("disabled", true)
      .append('<option value="">No option available</option>');
  } else {
    $("#responsive_available_unit").prop("disabled", false);
  }
}

function filterUnitsBasedOnCommunityType(
  floorplateUnits,
  floor = current_floor
) {
  if (hasFloorplate()) {
    floorplateUnits = floorplateUnits.filter((unit) =>
      validFloor(unit.floor, floor)
    );
  }

  return floorplateUnits;
}

function filterAmenitiesBasedOnCommunityType(
  floorplateAmenities,
  floor = current_floor
) {
  if (hasFloorplate()) {
    floorplateAmenities = floorplateAmenities.filter(
      (amenity) =>
        validFloor(amenity.floor, floor) || !definedAndHasValue(amenity.floor)
    );
  }

  return floorplateAmenities;
}

function getUniqueAndSortedListSquareFeet(list) {
  return list
    .filter((x, i, a) => a.indexOf(x) === i)
    .sort(function (a, b) {
      return a - b;
    });
}

function getUniqueAndSortedListMarketRent(list) {
  return list
    .filter((x, i, a) => a.indexOf(x) === i)
    .sort(function (a, b) {
      return b - a;
    });
}

function reInitializeDropDownList(filter) {
  const webFilterId = "#".concat(filter); //works on web view
  const mobileFilterId = "#responsive_".concat(filter); //works on mobile view

  $(webFilterId).children().remove(); //works on web view
  $(mobileFilterId).children().remove(); //works on mobile view
}

function showMarkers() {
  console.log("Show Markers Called");
  $(".marker").addClass("hidden");
  $(".hidden-units").empty();

  const unitsToDisplay = filterUnitsBasedOnCommunityType(units);

  renderMapData();

  if (!_3dMapMode() && !svgMode) {
    const scope = currentMapImage()?.parentElement;
    if (!scope) return;

    const jsonObject = {};
    for (let i = 0; i < unitsToDisplay.length; i++) {
      const { id, x_plot, y_plot } = unitsToDisplay[i];
      const $markerEl = $("#m_" + id, scope);
      if ($markerEl.hasClass("overlapping-unit")) {
        $(".hidden-units").append(
          '<div class="hidden h-' +
            $markerEl.data("unit-x-plot") +
            "-" +
            $markerEl.data("unit-y-plot") +
            '" id="h-' +
            $markerEl.data("title") +
            '" data-title="' +
            $markerEl.data("title") +
            '" data-community-id="' +
            $markerEl.data("community-id") +
            '" data-unit-id="' +
            $markerEl.data("unit-id") +
            '" data-is-fav="' +
            $markerEl.data("is-fav") +
            '" data-provider="' +
            $markerEl.data("provider") +
            '" data-website="' +
            $markerEl.data("website") +
            '" data-community-property-id="' +
            $markerEl.data("community-property-id") +
            '" data-unit-provider-id="' +
            $markerEl.data("unit-provider-id") +
            '" data-floorplan-provider-id="' +
            $markerEl.data("floorplan-provider-id") +
            '" data-floorplan-name="' +
            $markerEl.data("floorplan-name") +
            '" data-unit-description="' +
            $markerEl.data("unit-description") +
            '" data-unit-lease-pricing="' +
            $markerEl.data("unit-lease-pricing") +
            '" data-unit-marketing-name="' +
            $markerEl.data("unit-marketing-name") +
            '" data-market-rent="' +
            $markerEl.data("market-rent") +
            '" data-square-feet="' +
            $markerEl.data("square-feet") +
            '" data-availability="' +
            $markerEl.data("availability") +
            '" data-available-date="' +
            $markerEl.data("available-date") +
            '" data-bedrooms="' +
            $markerEl.data("bedrooms") +
            '" data-bathrooms="' +
            $markerEl.data("bathrooms") +
            '" data-floorplan-image="' +
            $markerEl.data("floorplan-image") +
            '" data-availability-url="' +
            $markerEl.data("availability-url") +
            '" data-lease-term="' +
            $markerEl.data("lease-term") +
            '" data-unit-additional-fees="' +
            $markerEl.data("unit-additional-fees") +
            '"></div>'
        );

        const jsonObjectKey = `${x_plot}-${y_plot}`;

        if (jsonObject[jsonObjectKey]) {
          const overlappingUnits = jsonObject[jsonObjectKey];
          overlappingUnits.push(unitsToDisplay[i]);
          jsonObject[jsonObjectKey] = overlappingUnits;
        } else {
          jsonObject[jsonObjectKey] = [unitsToDisplay[i]];
        }
      } else {
        $markerEl.removeClass("hidden");
      }
    }

    for (const key in jsonObject) {
      const overlappingUnits = jsonObject[key];
      const $markerEl = $("#m_" + overlappingUnits[0]["id"], scope);

      $("span", $markerEl).html(
        overlappingUnits.length > 1 ? overlappingUnits.length : ""
      );
      $markerEl.removeClass("hidden");
    }
  }

  if(!isFloorplanMapEnabled())
    disabledEnabledAnchors();

  setMarkersSizeAndMargin(); //image mode only
  adjustImageMapMarkersPosition(); //image mode only
  setSVGUnitsAmenitiesCoordinates(); //svg mode only
  reDrawBeansWidget(); //beans mode only
}

function handleResize() {
  var url = new URL(window.location.href);
  var timestamp = new Date().getTime();
  if (url.searchParams.has("refresh")) {
    url.searchParams.set("refresh", timestamp);
  } else {
    url.searchParams.append("refresh", timestamp);
  }

  var newUrl = url.toString();

  window.location.href = newUrl;
}

function performHardRefresh() {
  if (performance.navigation.type === 0) {
    window.location.reload(true);
  }
}

function getFilteredUnits(units, type) {
  var new_units = [];

  if (type === "Price: Low to High" && display_rent === "true") {
    new_units = units.sort((a, b) => a["market_rent"] - b["market_rent"]);
  } else if (type === "Price: High to Low" && display_rent === "true") {
    new_units = units.sort((a, b) => b["market_rent"] - a["market_rent"]);
  } else if (type === "Sq Ft: More to Less") {
    new_units = units.sort((a, b) => b["square_feet"] - a["square_feet"]);
  } else if (type === "Sq Ft: Less to More") {
    new_units = units.sort((a, b) => a["square_feet"] - b["square_feet"]);
  } else if (type === "Availability: Soonest to Latest") {
    new_units = units.sort(
      (a, b) => new Date(a["available_date"]) - new Date(b["available_date"])
    );
  } else if (type === "Availability: Latest to Soonest") {
    new_units = units.sort(
      (a, b) => new Date(b["available_date"]) - new Date(a["available_date"])
    );
  } else {
    new_units = units;
  }

  return new_units;
}

function resetToDefaultZoom() {
  // for web
  modalPanZoom?.zoomAbs(0, 0, 1);
  modalPanZoom?.moveTo(0, 0);

  // for mobile
  responsiveModalPanZoom?.zoomAbs(0, 0, 1);
  responsiveModalPanZoom?.moveTo(0, 0);
}

function unitMarkerClick(unitId, event) {
  const markersSelector = svgMode ? ".cloned-unit" : ".unit_marker";

  if (event?.currentTarget) {
    event.preventDefault();
    $("#unitModal").show();
    return;
  }

  try {
    if (svgMode) {
      unitId = parseInt(unitId.replace("unit_", ""));
    } else {
      unitId = unitId.replace("unit_", "s_");
    }
  } catch (error) {
    unitId = unitId;
  }


  let image = currentMapImage()?.parentElement;
  const $scope = $(image);
  const $markers = $scope.find(markersSelector);
  
  for (const item of Array.from($markers)) {
    if (
      svgMode ? parseInt(item.dataset.unitId) === unitId : item.id === unitId
    ) {
      $(item).click();
      break;
    }
  }
}

function setImageMapMarkers() {
  if (svgMode || _3dMapMode()) return;

  $(".map-global-loader").removeClass("hidden");

  const floorsToLoad = hasFloorplate()
    ? floors.filter(f => f !== 'all')
    : [current_floor];

  let completedFloors = 0;

  function floorDone() {
    completedFloors++;

    if (completedFloors === floorsToLoad.length) {
      // Wait for next event loop + repaint
      setTimeout(() => {
        requestAnimationFrame(() => {
          bindUnitMarkerEvents();
          bindAmenityMarkerEvents();
          // resetMapData();
          resetFilters();
          $(".map-global-loader").addClass("hidden");
        });
      }, 0);
    }
  }

  floorsToLoad.forEach(floor => {
    const parent = document.getElementById(`floorplate_${floor}`) || document.getElementById('property-map');
    const imageEl = parent?.querySelector('img');

    if (!imageEl) {
      floorDone(); // no image found, skip
      return;
    }

    // Preload the image
    const preload = new Image();
    preload.src = imageEl.src;

    preload.onload = () => {
      renderMarkersForFloor(parent, floor);
      floorDone();
    };

    preload.onerror = () => {
      console.warn(`Image failed to load: ${imageEl.src}`);
      floorDone(); // proceed even on error
    };

    // If already cached
    if (preload.complete) {
      preload.onload(); // trigger manually
    }
  });
}

function renderMarkersForFloor(parent, floor) {
  const element = parent?.querySelector('.markers-container');

  renderUnitsAmenitiesMarkers(element, floor);
  
  if(!isFloorplanMapEnabled())
    disabledEnabledAnchors();

  setMarkersSizeAndMargin();
  adjustImageMapMarkersPosition();
}

function renderMapData() {
  const filteredUnits = filterUnitsBasedOnCommunityType(units);
  const sortType = document.getElementById("filter");
  let floorUnits = [];

  if(sortType)
    floorUnits = getFilteredUnits(filteredUnits, sortType?.value);
  else
    floorUnits = filteredUnits;

  renderUnitBoxes(floorUnits);
}

function renderUnitBoxes(floorUnits) {
  const element = document.getElementById("units-body");

  if (!element) return;

  element.innerHTML = "";

  if(isFloorplanMapEnabled())
    floorUnits = filterUniqueFloorplanList(floorUnits);

  const html = floorUnits.map((unit) => buildUnitBoxHTML(unit)).join("");
  element.innerHTML = html;

  unitBoxListHover();

  if(!isFloorplanMapEnabled()) {
    document.getElementById("unit-title-count").innerText = `${floorUnits.length} Units Found`;
  } else {
    const el = document.querySelector(".right-rail-card:first-child");
    if (el) {
      el.style.marginTop = "0px";
    }
  }
}

function filterUniqueFloorplanList(floorUnits) {
  return [
    ...new Map(
      floorUnits
        .filter(unit => unit.provider_floorplan_id) // keep only those with id
        .map(unit => [unit.provider_floorplan_id, unit]) // key by provider_floorplan_id
    ).values()
  ]
}

function bindUnitMarkerEvents() {
  function bindEventsTo(el) {
    el.parentElement.addEventListener('touchend', function(event) {
      event.stopPropagation();
      event.preventDefault();
      const unitId = getUnitIdFromElement(el.parentElement, event);
      unitMarkerClick(`unit_${unitId}`)
    });
  }

  document.querySelectorAll('.unit-marker').forEach(bindEventsTo);
  document.querySelectorAll('.unit_marker').forEach(bindEventsTo);
}

function getUnitIdFromElement(element, event) {
  const id = element?.dataset?.unitId || element?.getAttribute?.('data-unit-id');
  if (id) return id;

  const parentMarker = element.closest('.unit-marker, .unit_marker');
  return parentMarker?.dataset?.unitId || parentMarker?.getAttribute?.('data-unit-id');
}

function bindAmenityMarkerEvents() {
  function handleAmenityClick(event) {
    event.stopPropagation();
    event.preventDefault();

    const el = event.currentTarget;
    const amenityJson = el.getAttribute('data-amenity-json');
    if (!amenityJson) return;

    try {
      const amenity = JSON.parse(amenityJson);
      openAmenityViewerModal(amenity);
    } catch (e) {
      console.error('Invalid amenity JSON:', e);
    }
  }

  function bindEventsTo(el) {
    el.addEventListener('click', handleAmenityClick);
    el.addEventListener('touchend', handleAmenityClick);
  }

  document.querySelectorAll('.amenity-marker').forEach(bindEventsTo);
}

function renderUnitsAmenitiesMarkers(element, f) {
  const filteredUnits = filterUnitsBasedOnCommunityType(units, f);
  const unitsHtml = filteredUnits.map((unit) => buildUnitMarkerHTML(unit, f)).join("");

  const filteredAmenities = filterAmenitiesBasedOnCommunityType(amenities, f);
  const amenitiesHtml = filteredAmenities.map((amenity) => buildAmenityMarkerHTML(amenity, f)).join("");

  element.innerHTML = unitsHtml + amenitiesHtml;

  unitMarkerHover();
}

function buildUnitBoxHTML(unit) {
  let unitName = `Unit # ${
    (webCommunity?.is_sitemap && !webCommunity?.display_building
      ? unit["marketing_name"]
      : unit["building"]
      ? `${unit["building"]}-${unit["marketing_name"]}`
      : unit["marketing_name"])
  }`;


  if (isFloorplanMapEnabled())
    unitName = unit["floorplan_name"];

  return `
    <div
      class='right-rail-card'
      id='unit_${unit["id"]}'
      data-pointer-data='${JSON.stringify(unit["pointer_data"])}'
      data-floorplan-id='${unit["provider_floorplan_id"]}'
      data-unit-marketing-name='${unit["data_attributes"]["data-unit-marketing-name"]}'
    >
      <div class='image-styles'>
        ${floorplanColorBarHTML(unit)}
        ${floorplanAvailabilityBannerHTML(unit)}
        <a class='image_link' href='#' id="s_${unit["id"]}" onClick="onUnitClick(event)">
          <img src='${unit["floorplan_image"]}' class='image-image-styles' />
        </a>
      </div>
      <div class="unit-content">
        <div class='unit-details-section'>
          <p id='unit-detail-market-title'>
            <strong>${unitName}</strong>
          </p>
        </div>
        <div class='unit-details-section'>
          <p><i class='fa fa-bed'> &nbsp ${unit["bedrooms"]} Bed </i></p>
          <p><i class='fa fa-bath'> &nbsp ${unit["bathrooms"]} Bath </i></p>
          <p><i class='fa fa-building'> &nbsp ${unit["square_feet"]} Sq Ft </i></p>
        </div>
        ${
          !isFloorplanMapEnabled()
            ? `<div class='unit-details-section'>
                <p id='right-bar-unit-availability'>${get_unit_availability(unit)}</p>
                <p>${unitMarketRent(unit)}</p>
              </div>`
            : ``
        }
      </div>
    </div>
  `;
}

function floorplanColorBarHTML(unit) {
  if(!isFloorplanMapEnabled() && !checkFloorPlanColorMode()) return '';
  
  const floorplanColors = getMarkerColor(unit);
  return `<div class="floorplan-color-bar" style="background-color: ${floorplanColors};"></div>`;
}

function floorplanAvailabilityBannerHTML(unit) {
  if(!isFloorplanMapEnabled()) return '';
  const config = getFloorplanConfigObject(unit);
  let bannerText = "";
  let bannerColor = "";

  switch (config.availability_status) {
    case "limited_availability":
    case 1:
      bannerText = "Limited Availability";
      bannerColor = "#b5b5b5";
      break;
    case "almost_gone":
    case 2:
      bannerText = "Almost Gone";
      bannerColor = "#555555";
      break;
    case "sold_out":
    case 3:
      bannerText = "Sold Out";
      bannerColor = "#000000";
      break;
    default:
      return ""; 
  }

  return `<div class="floorplan-banner" style="background-color: ${bannerColor};">${bannerText}</div>`;
}

function buildUnitMarkerHTML(unit, f) {
  unitDataAttributes = unit.data_attributes;
  unitConfig = unitDataAttributes["data-config"]
  unitMargins = unitConfig["margins"]

  const floorplanColorsConfig = getFloorplanConfigObject(unit);
  const propertyColorsConfig = getPropertyConfigObject(unit);

  return `
    <a
      class="marker ui-draggable ui-draggable-handle unit-marker"
      id="m_${unit.id}"
      style="font-size: ${unitConfig["unit_marker_font_size"]}; position: absolute; left: ${unitDataAttributes["data-unit-x-plot"]}; top: ${unitDataAttributes["data-unit-y-plot"]}; cursor:pointer;"
      data-target="#unitModal"
      data-toggle="modal"
      data-unit-id="${unit.id}"
      data-unit-x-plot="${unitDataAttributes["data-unit-x-plot"]}"
      data-unit-y-plot="${unitDataAttributes["data-unit-y-plot"]}"
      data-floorplan-provider-id="${unitDataAttributes["data-floorplan-provider-id"]}"
      data-pointer-data="${unit.pointer_data}"
      data-floorplan-config=${floorplanColorsConfig ? JSON.stringify(floorplanColorsConfig) : ''}
      data-by-property-colors=${propertyColorsConfig ? JSON.stringify(propertyColorsConfig) : ''}
      data-color-by=${unitDataAttributes["data-color-by"]}
      data-community-id="${unitDataAttributes["data-community-id"]}"
      data-website="${unitDataAttributes["data-website"]}"
      data-provider="${unitDataAttributes["data-provider"]}"
      data-unit-provider-id="${unitDataAttributes["data-unit-provider-id"]}"
      data-unit-marketing-name="${unitDataAttributes["data-unit-marketing-name"]}"
      data-available-date="${unitDataAttributes["data-available-date"]}"
      data-market-rent="${unitDataAttributes["data-market-rent"]}"
      data-total-market-rent="${unitDataAttributes["data-total-market-rent"]}"
      data-title="${unitDataAttributes["data-title"]}"
      data-unit-virtual-tour-label="${unitDataAttributes["data-unit-virtual-tour-label"]}"
      data-unit-virtual-tour-url="${unitDataAttributes["data-unit-virtual-tour-url"]}"
      data-unit-link1-open-new-tab="${unitDataAttributes["data-unit-link1-open-new-tab"]}"
      data-additional-button-label="${unitDataAttributes["data-additional-button-label"]}"
      data-additional-button-url="${unitDataAttributes["data-additional-button-url"]}"
      data-unit-link2-open-new-tab="${unitDataAttributes["data-unit-link2-open-new-tab"]}"
      data-schedule-tour-label="${unitDataAttributes["data-schedule-tour-label"]}"
      data-schedule-tour-url="${unitDataAttributes["data-schedule-tour-url"]}"
      data-unit-link3-open-new-tab="${unitDataAttributes["data-unit-link3-open-new-tab"]}"
      data-availability-url="${unitDataAttributes["data-availability-url"]}"
      data-unit-lease-term="${unitDataAttributes["data-unit-lease-term"]}"
      data-unit-lease-pricing="${unitDataAttributes["data-unit-lease-pricing"]}"
      data-unit-additional-fees="${unitDataAttributes["data-unit-additional-fees"]}"
      data-unit-description="${unitDataAttributes["data-unit-description"]}"
      data-property-id="${unitDataAttributes["data-property-id"]}"
      data-unit-status="${unitDataAttributes["data-unit-status"]}"
      data-model-unit="${unitDataAttributes["data-model-unit"]}"
      data-is-fav="${unitDataAttributes["data-is-fav"]}"
      data-community-property-id="${unitDataAttributes["data-community-property-id"]}"
      data-floorplan-name="${unitDataAttributes["data-floorplan-name"]}"
      data-square-feet="${unitDataAttributes["data-square-feet"]}"
      data-availability="${unitDataAttributes["data-availability"]}"
      data-bedrooms="${unitDataAttributes["data-bedrooms"]}"
      data-bathrooms="${unitDataAttributes["data-bathrooms"]}"
      data-floorplan-image="${unitDataAttributes["data-floorplan-image"]}"
      data-floor="${unitDataAttributes["data-floor"]}"
      data-sold="${unitDataAttributes["data-sold"]}"
      data-available="${unitDataAttributes["data-available"]}"
      href="javascript:void(0)"
      tabindex="0"
    >
      <div
        id="s_${unit.id}"
        data-unit-id="${unit.id}"
        class="fas fa-map-marker-alt fa-map-marker-alt-responsive unit_marker"
        style="color: ${getUnitMarkerColor(unit)};"
      >
        <span style="position: absolute; left: ${unitMargins["span_size_y"]}; top: ${unitMargins["span_size_x"]}; font-size: ${unitMargins["span_size_x"]}"></span>
      </div>
    </a>
  `;
}

function buildAmenityMarkerHTML(amenity, f) {
  const amenityDataAttributes = amenity.data_attributes;
  const amenityConfig = amenity?.config?.amenity
  const amenityJsonString = JSON.stringify(amenity).replace(/'/g, "\\'");
  const amenityColor = hexToRgba(amenityConfig.color, amenityConfig.opacity)

  return`
    <a
      style="left: ${amenity.x_plot}px; top: ${amenity.y_plot}px; position: absolute;"
      class="a_${f} sitemap-amenity-marker amenity-marker slider-amenity amenityTooltip"
      id="a_${amenityDataAttributes["data-amenity-id"]}"
      data-amenity-id="${amenityDataAttributes["data-amenity-id"]}"
      data-amenity-x-plot="${amenity.x_plot}"
      data-amenity-y-plot="${amenity.y_plot}"
      data-floor=${amenityDataAttributes["data-amenity-id"]}
      data-amenity-json='${amenityJsonString}'
      href="javascript:void(0)"
    >
      <span
        class="camera-icon camera-icon-responsive"
        style="border: 2px solid ${amenityColor};"
      >
        <i
          class="fas fa-camera-retro"
          style="color: ${amenityColor};"
        ></i>
      </span>
      <span class="amenitytooltiptext">
        <h2 style="display: ${amenity.show_name ? "block": "none"}">${amenity.name}</h2>
        <img
          src="${amenity.image_url}"
          alt="${amenity.name}"
        >
      </span>
    </a>

  `;
}

function calculateActiveSlide() {
  const activeIndex = $(
    `#amenitySliderModal-${selectedAmenity.id} .slick-active`
  ).data("slick-index");
  const gallery =
    activeIndex > 0 ? selectedGalleries[activeIndex - 1] : selectedAmenity;

  updateHeaderAmenityName(gallery);
  videoLinkButtonVisibility(activeIndex);
}

function updateHeaderAmenityName(gallery) {
  $(`#amenitySliderModal-${selectedAmenity.id} .am-modal-title-div h4`).html(
    gallery.name
  );
}

function videoLinkButtonVisibility(activeIndex) {
  if (selectedAmenity.video_link)
    $(`#amenitySliderModal-${selectedAmenity.id} .am-modal-button-div`).css(
      "visibility",
      activeIndex > 0 ? "hidden" : ""
    );
  else
    $(`#amenitySliderModal-${selectedAmenity.id} .am-modal-button-div`).css(
      "visibility",
      "hidden"
    );
}

function bindCarousel(amenityID) {
  $(`#amenity-carousel-${amenityID}`).slick({
    dots: true,
    infinite: false,
    speed: 300,
    slidesToShow: 1,
    slidesToScroll: 1,
    adaptiveHeight: true,
  });

  $(`#amenity-carousel-${amenityID}`).slick("refresh");
  carouselArrowsControl();
}

function unbindCarousel(amenityID) {
  $(`#amenity-carousel-${amenityID}`).slick("unslick");
}

function carouselArrowsControl() {
  $(".slick-next").click(function () {
    calculateActiveSlide();
  });
  $(".slick-prev").click(function () {
    calculateActiveSlide();
  });
}

function openAmenityViewerModal(amenity) {
  selectedAmenity = amenity;
  selectedGalleries = amenity.galleries;
  
  $(`#amenitySliderModal-${amenity.id || amenity.unitId}`).modal("show");
  bindCarousel(amenity.id);
}

function closeAmenityViewerModal(amenityID) {
  selectedAmenity = null;
  selectedGalleries = [];
  $(`#amenitySliderModal-${amenityID}`).modal("close");
  unbindCarousel(amenityID);
}

function onUnitClick(e) {
  isRightRailCardClicked = true;

  if (_3dMapMode()) {
    if (e instanceof Event) {
      setUnitModalButtons(e);
    } else {
      isRightRailCardClicked = false;
      setUnitModalButtons(e.unitId);
    }

    if (_3dSelectedItem) {
      $("#unitModal").modal("show");
      return true;
    } else {
      if (beansWidget?.workingInstance) {
      }
      return false;
    }
  } else {
    const { id } = getUnitData(e.target);
    unitMarkerClick(id);
  }
}

function unitMarketRent(unit) {
  if (!unit.display_rent) return "";

  return `${currency}${ unit.market_rent}/month`;
}

// function highlightFloorplanMarkersData(elementsArray, floorplanId = null) {
//   elementsArray.forEach(el => {
//     if (!el) return;

//     // Store original fill once
//     if (!el.dataset.originalFill) {
//       el.dataset.originalFill = el.getAttribute('fill') || '';
//     }

//     // If no floorplanId (mouse leave) → restore all original colors
//     if (!floorplanId) {
//       el.style.fill = el.dataset.originalFill;
//       return;
//     }

//     // Otherwise, highlight only matching floorplan
//     const matches = el.dataset.floorplanProviderId === String(floorplanId);
//     el.style.fill = matches ? el.dataset.originalFill : "none";
//   });
// }

function highlightFloorplanMarkersData(elementsArray, floorplanId = null) {
  elementsArray.forEach(el => {
    if (!el || !el.dataset) return;

    // Store original fill once
    if (!el.dataset.originalFill) {
      el.dataset.originalFill = el.getAttribute('fill') || '';
    }

    // Store original opacity once
    if (!el.dataset.originalOpacity) {
      el.dataset.originalOpacity = el.style.opacity || '1';
    }

    // If no floorplanId (mouse leave) → restore original styles
    if (!floorplanId) {
      el.style.fill = el.dataset.originalFill;
      el.style.opacity = el.dataset.originalOpacity;
      return;
    }

    // Check if matches current floorplan
    const matches = el.dataset.floorplanProviderId === String(floorplanId);

    if (matches) {
      // Keep full color and opacity
      el.style.fill = el.dataset.originalFill;
      el.style.opacity = el.dataset.originalOpacity;
    } else {
      // Fade: use same color but reduce opacity (e.g., 0.2)
      el.style.fill = el.dataset.originalFill;
      el.style.opacity = '0.15'; // adjust fade level if needed
    }
  });
}

function unitBoxListHover() {
  let focused_marker;
  let markersArray = [];

  $("div.right-rail-card").hover(
    function (e) {
      let markerColor = map_marker_color;
      const { id, unitId, pointerData, unitMarketingName, floorplanId } = getUnitData(
        e.target
      );

      const _3dMode = _3dMapMode();

      if (_3dMode) {
        markersArray = _3dConvertedUnitsArr;
      } else {
        const markersSelector = svgMode ? "cloned-unit" : "marker";
        const $scope = $(currentVisibleMapImage()?.parentElement);
        const $allMarkers = $scope.find(`.${markersSelector}`);
        markersArray = Array.from($allMarkers);
      }

      for (const marker of markersArray) {
        let matchCondition = false;
        let _3dData = null;

        if (_3dMode) {
          const {
            options: { onClickData },
          } = marker;

          matchCondition =
            unitId === onClickData.unitId ||
            id === `unit_${onClickData.unitId}`;
          _3dData = onClickData;
        } else {
          matchCondition =
            unitId === marker.dataset.unitId ||
            id === `unit_${marker.dataset.unitId}` ||
            `${pointerData.id}_cloned` === marker.id ||
            pointerData.selector === marker.id;
        }
        if (
          svgMode && !_3dMode
            ? isVisibleSVGElement(marker) && matchCondition
            : matchCondition
        ) {
          let selectedMarker = marker;

          if (
            !_3dMode &&
            selectedMarker.classList.contains("overlapping-unit")
          ) {
            markersArray.forEach((findOverlappedMarker) => {
              if (
                selectedMarker.dataset.unitXPlot ===
                  findOverlappedMarker.dataset.unitXPlot &&
                selectedMarker.dataset.unitYPlot ===
                  findOverlappedMarker.dataset.unitYPlot &&
                !findOverlappedMarker.classList.contains("hidden")
              ) {
                selectedMarker = findOverlappedMarker;
              }
            });
          }

          if (_3dMode) {
            if(isFloorplanMapEnabled() || checkFloorPlanColorMode()) {
              markerColor = getMarkerColor(_3dData);
            } else {
              markerColor = getUnitMarkerColor(_3dData);
            }
          } else {
            if(isFloorplanMapEnabled() || checkFloorPlanColorMode()) {
              markerColor = getMarkerColor(selectedMarker.dataset);
            } else {
              markerColor = getUnitMarkerColor(selectedMarker.dataset);
            }
          }
            
          e.currentTarget.style.border = `3px solid ${markerColor}`;

          if (_3dMode) return;

          focused_marker = document.getElementById(selectedMarker.id);
          $(".popup-title, .popup-arrow").css("background-color", markerColor);
          $("#popover-marketing-unit").html(unitMarketingName);

          const position = selectedMarker.getBoundingClientRect();
          let [left, top] = [position.left, position.top];
          
          const $markerPopover = $("#marker-popover-unit");
          $markerPopover.removeClass("hidden");
          $markerPopover.css({
            visibility: "none",
          });

          const [popoverWidth, popoverHeight] = [
            $markerPopover.width(),
            $markerPopover.height(),
          ];

          let leftAdjustment = popoverWidth / 2;
          let topAdjustment = popoverHeight;

          if (svgMode) {
            const { screenX, screenY } = findRealTopCenter(selectedMarker);
            left = screenX;
            top = screenY;
          } else {
            // const markerIcon = selectedMarker.firstChild;
            const rect = selectedMarker.getBoundingClientRect();
            leftAdjustment += 0;
            topAdjustment += rect.height;
          }

          left = left - leftAdjustment;
          top = top - topAdjustment;

          if(!isFloorplanMapEnabled()) {
            $markerPopover.css({
              visibility: "visible",
              left: `${left}px`,
              top: `${top - (svgMode ? 0 : 30)}px`,
            });
          } else {
            if (svgMode) {
              highlightFloorplanMarkersData(markersArray, floorplanId);
            }
            // TODO: Hover effect for floorplans here
          }

          // if (matchCondition) break; // Turn it on if you want the exact match and not the top 1 in multiple units
        }
      }
    },
    function (e) {
      e.currentTarget.style.border = "none";
      if (focused_marker) {
        $("#marker-popover-unit").addClass("hidden");
      }

      // 🟢 Reset all markers to their original colors when hover ends
      if (svgMode) {
        highlightFloorplanMarkersData(markersArray, null);
      }
    }
  );
}

function markerHoverEffect(event, _3dData = null) {
  let $this;
  $(".right-rail-card").css("border", "none");

  if (_3dMapMode() && _3dData) {
    const unitData = units.find(({ id }) => id === _3dData.unitId);
    if (!unitData) {
      _3dHoveredItem = null;
      return;
    }

    _3dHoveredItem = _3dData;
    $this = getExecutableDataFunctionForObject(unitData.data_attributes);
  } else if (svgMode && event.currentTarget.tagName.toLowerCase() === "g") {
    const lastClonedElement = getLastClonedJQueryElement(event.currentTarget);
    if (
      !lastClonedElement ||
      lastClonedElement.classList.contains("cloned-amenity")
    )
      return;

    $this = $(lastClonedElement);
  } else {
    $this = $(event.currentTarget);
  }

  if (!$this) {
    console.error("No hovered element found.");
    return;
  }

  showUnitPopoverAndHighlightListUnit($this, event, _3dData);

  if ($this.data("is-fav") || favoritesArr.includes($this.data("unit-id"))) {
    $(".fav-heart").removeClass("hidden");
  } else {
    $(".fav-heart").addClass("hidden");
  }
  if(!isFloorplanMapEnabled())
    $("#popover-marketing-name").html($this.data("unit-marketing-name") + "</b>");
  
  $("#popover-floorplan").html($this.data("unit-description"));

  if (!canShowAdditionalFees($this.data("unit-additional-fees"))) {
    $("#popover-floorplan").html($this.data("unit-additional-fees"));
  }

  $("#popover-floorplan").html($this.data("unit-lease-pricing"));
  $("#popover-floorplan").html($this.data("floorplan-name"));
  if ($this.data("floorplan-image") != "") {
    $("#media-object").attr("src", $this.data("floorplan-image"));
  } else {
    $("#media-object").attr("src", "/assets/default.jpeg");
  }
  $("#popover-square-feet").html($this.data("square-feet"));
  $("#popover-bathrooms").html($this.data("bathrooms"));
  
  if ($("#popover-bathrooms").html() == "1") {
    $("#popover-bathrooms").siblings("small").html("Bathroom");
  } else {
    $("#popover-bathrooms").siblings("small").html("Bathrooms");
  }
  $("#popover-bedrooms").html($this.data("bedrooms"));
  if ($("#popover-bedrooms").html() == "1") {
    $("#popover-bedrooms").siblings("small").html("Bedroom");
  } else {
    $("#popover-bedrooms").siblings("small").html("Bedrooms");
  }

  setUnitHoverAvailability($this)
  setHoverMarketRent($this);
}

function setHoverMarketRent($this) {
  if(isFloorplanMapEnabled()) return;
  $("#popover-price").html(currency + $this.data("marketRent"));
}


function setUnitHoverAvailability($this) {
  if(isFloorplanMapEnabled()) {
    $("#hover-available-text").hide();
    return;
  }

  const $date = $("#popover-available-date");
  const $text = $("#hover-available-text");

  if ($this.data("sold")) {
    $date.html("");
    $text.html("Sold");
    return;
  }

  const isUnoccupied = $this.data("availability") === "Unoccupied";

  $text.html(isUnoccupied ? "Available" : "");
  $date.html(
    isUnoccupied
      ? formattedDateByRegion(webCommunity.country_code, $this.data("available-date"))
      : "Unavailable"
  );
}

function markerHoverEffectEnd(event, $3dDataElement = null) {
  let $this;

  const $markerPopup = $("#marker-popover");
  if (_3dMapMode() && $3dDataElement) {
    initializeMouseTrackerFor3DHoverExit();
    return;
  } else if (svgMode && event.currentTarget.tagName.toLowerCase() === "g") {
    const lastClonedElement = getLastClonedJQueryElement(event.currentTarget);
    if (
      !lastClonedElement ||
      lastClonedElement.classList.contains("cloned-amenity")
    )
      return;

    $this = $(lastClonedElement);
  } else {
    $this = $(event.currentTarget);
  }

  if (!$this) {
    console.error("No hovered element found.");
    return;
  }

  $markerPopup.addClass("hidden");
  $($("#unit_" + $this.data("unitId"))).css("border", "none");
}

function unitMarkerHover() {
  $(".marker").hover(markerHoverEffect, markerHoverEffectEnd);
  $(".cloned-unit").hover(markerHoverEffect, markerHoverEffectEnd);
}

function showUnitPopoverAndHighlightListUnit(
  $dataElement,
  event = null,
  _3dData = null
) {
  const markerColor = getUnitMarkerColor($dataElement.data());

  const unitElement = document.getElementById(
    "unit_" + $dataElement.data("unitId")
  );

  const scrollableParent = document.querySelector(".right-rail");

  if (unitElement && scrollableParent) {
    const parentHeight = scrollableParent.clientHeight;
    const elementHeight = unitElement.clientHeight;

    const scrollTop =
      unitElement.offsetTop -
      scrollableParent.offsetTop -
      parentHeight / 2 +
      elementHeight / 2;

    if(!isFloorplanMapEnabled()) {
      scrollableParent.scrollTo({
        top: scrollTop,
        behavior: "smooth",
      });
    }
  }

  const $markerPopup = $("#marker-popover");
  if (_3dMapMode()) {
    const { x, y } = mouseTracker.getPosition();
    const $beansMarkerPopover = $(
      "div.esri-ui-inner-container.esri-ui-manual-container > div.esri-component[role='presentation']"
    );

    $markerPopup.css({
      left: x + 20 + "px",
      top: y - 315 + "px",
    });

    $beansMarkerPopover.addClass("hidden");
    markerHoverEffectEnd(event, $dataElement, _3dData);
  } else {
    const $container = svgMode ? $("#svg-container") : $("#image-container");
    const left =
      parseInt(event.pageX) -
      parseInt($container.offset().left) +
      parseInt($container.scrollLeft());
    const top =
      parseInt(event.pageY) -
      parseInt($container.offset().top) +
      parseInt($container.scrollTop());

    const diffLeft = webCommunity["is_sitemap"] ? 25 : 115;
    $markerPopup.css({
      left: left + diffLeft + "px",
      top: top - 100 + "px",
    });
  }

  if (!smallScreen()) {
    $markerPopup.removeClass("hidden");
  }

  if(!isFloorplanMapEnabled()) {
    $($("#unit_" + $dataElement.data("unitId"))).css(
      "border",
      `3px solid ${markerColor}`
    );
  }
}

function getUnitData(targetElement) {
  if (targetElement.classList.contains("right-rail-card")) {
    return {
      id: targetElement.id,
      unitId: targetElement.dataset.unitId,
      pointerData: JSON.parse(targetElement.dataset.pointerData) || {},
      unitMarketingName: targetElement.dataset.unitMarketingName,
      floorplanId: targetElement.dataset.floorplanId
    };
  } else {
    let closestUnit = $(targetElement).closest(".right-rail-card");

    if (closestUnit.length > 0) {
      return {
        id: closestUnit[0].id,
        unitId: targetElement.dataset.unitId,
        pointerData: JSON.parse(closestUnit[0].dataset.pointerData) || {},
        unitMarketingName: closestUnit[0].dataset.unitMarketingName,
        floorplanId:closestUnit[0].dataset.floorplanId
      };
    } else {
      return { id: null, pointerData: {}, unitMarketingName: null };
    }
  }
}

function setUnitModalButtons(e) {
  const $unitButtons = $(".unit-buttons");
  $unitButtons.empty();
  $unitButtons.addClass("hidden");

  if (_3dMapMode() && !(typeof e === "number" || e instanceof Event)) {
    return;
  }

  let clickedUnit = null;
  let filteredUnits = [];

  const relatedTarget = e.relatedTarget;
  const $relatedTarget = $(relatedTarget);
  const relatedTargetSelector = _3dMapMode()
    ? ""
    : relatedTarget.id.replace("_cloned", "");

  if (_3dMapMode()) {
    if (e instanceof Event) {
      let $element = null;
      if (e.target.classList.contains(".right-rail-card"))
        $element = $(e.target);
      else 
        $element = $(e.target).closest(".right-rail-card");

      if ($element.length) {
        e = parseInt(
          $(e.target).closest(".right-rail-card")[0].id.replace("unit_", "")
        );
      }
    }
    
    clickedUnit = filterBeansUnits().find(
      ({ options: { onClickData: { unitId } } = {} }) => unitId === e
    );

    _3dSelectedItem = clickedUnit;
    if (!clickedUnit) return;


    const floorbasedUnits = filterUnitsBasedOnCommunityType(units);
    clickedUnit = floorbasedUnits.find( (unit) => unit.id === e);

    if (!clickedUnit) return;
    
    if (svgMode) {
      filteredUnits = floorbasedUnits.filter(
        ({ floor, pointer_data: { selector, x_plot, y_plot } = {} }) =>
          selector === clickedUnit.pointer_data.selector && x_plot === clickedUnit.pointer_data.x_plot && y_plot === clickedUnit.pointer_data.y_plot && floor === clickedUnit.floor && validFloor(floor)
      );
    } else {
      const [unitXPlot, unitYPlot] = [clickedUnit.x_plot, clickedUnit.y_plot];
      filteredUnits = floorbasedUnits.filter(
        ({ floor, x_plot, y_plot }) =>
          unitXPlot === x_plot && unitYPlot === y_plot && floor === clickedUnit.floor && validFloor(floor)
      );
    }

  } else if (svgMode) {
    clickedUnit = units.find(
      ({ id }) => id === parseInt(relatedTarget.dataset.unitId)
    );
    filteredUnits = units.filter(
      ({ floor, pointer_data: { id, selector } = {} }) =>
        (id === relatedTargetSelector || selector === relatedTargetSelector) &&
        validFloor(floor)
    );
  } else {
    clickedUnit = units.find(
      ({ id }) => parseInt($relatedTarget.attr("id").split("_")[1]) === id
    );
    if (!clickedUnit) {
      return;
    }
    const [unitXPlot, unitYPlot] = [clickedUnit.x_plot, clickedUnit.y_plot];

    filteredUnits = units.filter(
      ({ floor, x_plot, y_plot }) =>
        unitXPlot === x_plot && unitYPlot === y_plot && validFloor(floor)
    );
  }

  if (!clickedUnit) {
    return;
  }

  if (filteredUnits.length > 1) {
    $unitButtons.removeClass("hidden");
  }

    // SORT HERE 👇
  filteredUnits.sort((a, b) => {
    const aTitle = a?.data_attributes?.["data-title"] || "";
    const bTitle = b?.data_attributes?.["data-title"] || "";
    return aTitle.localeCompare(bTitle, undefined, { numeric: true });
  });


  filteredUnits.forEach((unit) => {
    if (unit && !validFloor(unit.floor)) return;
    setModalButton(unit.id === parseInt(clickedUnit.id), unit.data_attributes);
  });

  setModalAttributes($unitButtons.find(".btn-primary")[0]);
}

function setModalButton(primaryButtonStyle, dataAttributes) {
  let buttonDataAttributes = "";
  for (const key in dataAttributes) {
    buttonDataAttributes = `${buttonDataAttributes} ${key}="${dataAttributes[key]}"`;
  }

  $(".unit-buttons").append(
    getModalButtonHTML(
      dataAttributes["data-title"],
      primaryButtonStyle ? "btn-primary" : "btn-default",
      buttonDataAttributes
    )
  );
}

function getModalButtonHTML(title, buttonStyle, buttonDataAttributes) {
  return (
    '<button class="btn modal-unit-button ml-5 ' +
    buttonStyle +
    '" type="button" data-title="' +
    buttonDataAttributes +
    '" onclick="setUnitAttributes(this, event);">' +
    title +
    "</button>"
  );
}

function hasTouch() {
  return (
    "ontouchstart" in document.documentElement ||
    navigator.maxTouchPoints > 0 ||
    navigator.msMaxTouchPoints > 0
  );
}

function disabledEnabledAnchors() {
  var min_market_rent = 100000;
  var max_area = 0;

  for (var i = 0; i < floors.length; i++) {
    var floorplate_units = [];
    const floor = floors[i];

    if (validFloor(floor)) {
      $("#" + floor).addClass("selected");
    } else {
      $("#" + floor).removeClass("selected");
    }

    for (let j = 0; j < units.length; j++) {
      if (validFloor(units[j]["floor"], floor)) {
        floorplate_units.push(units[j]);
      }
    }

    var floorplate_amenities = [];
    for (let j = 0; j < amenities.length; j++) {
      if (validFloor(amenities[j]["floor"], floor)) {
        floorplate_amenities.push(amenities[j]);
      }
    }

    const unitToDisplay = filterUnitsBasedOnCommunityType(units, floor);
    if (unitToDisplay.length > 0 && floorplate_amenities.length > 0) {
      var min_rent_floorplate = Math.min.apply(
        Math,
        unitToDisplay.map(function (o) {
          return o.market_rent;
        })
      );
      var max_area_floorplate = Math.max.apply(
        Math,
        unitToDisplay.map(function (o) {
          return o.square_feet;
        })
      );
      if (min_rent_floorplate < min_market_rent)
        min_market_rent = min_rent_floorplate;
      if (max_area_floorplate > max_area) max_area = max_area_floorplate;
    }
    if (floorplate_units.length == 1) var str = " unit";
    else var str = " units";
    filtered_floorplate_units = floorplate_units; //overall_filtered_units(floorplate_units);
    $("#u_" + floor).html(filtered_floorplate_units.length.toString() + str);
  }
  $("#" + floors[0])
    .parent()
    .css("border-top", "1px solid #2b3537");

  if (floors.length > 0) {
    disable_rent_filter_options(min_market_rent);
    disable_area_filter_options(max_area);
    if (smallScreen() && !extraSmallScreen()) {
      $(".mobile-filter-mega-menu").addClass("filters-alignment");
    }
  } else {
    $(".custom-iframe-modeule").addClass("sitemap");
  }

  toggleAlert();
}

function toggleAlert() {
  const $alert = $(".alert");
  let currentFloorUnits = filterUnitsBasedOnCommunityType(units);
  let currentFloorAmenities = filterAmenitiesBasedOnCommunityType(amenities);

  if (currentFloorUnits.length == 0 && currentFloorAmenities.length != 0) {
    $alert.show();
    timer = setTimeout(function () {
      $alert.fadeOut("slow");
    }, 2000);
  } else if (
    currentFloorUnits.length == 0 &&
    currentFloorAmenities.length == 0
  ) {
    $alert.show();
    clearTimeout(timer);
  } else {
    $alert.hide();
  }
}

function change_units_view(evt, type) {
  if (type === "list_view") {
    $(".c-footer").hide();
  } else {
    $(".c-footer").show();
  }

  var i, tabcontent;
  tabcontent = document.getElementsByClassName("tabcontent");
  for (i = 0; i < tabcontent.length; i++) {
    tabcontent[i].style.display = "none";
  }

  const $tabNavLinks = $(".tablinks");
  $tabNavLinks.removeClass("active_unit_view");

  document.getElementsByClassName(type)[0].style.display = "block";
  $(evt.currentTarget.parentElement).addClass("active_unit_view");

  if (type === "list_view") {
    const $webpageMainContainer = $("div.map-body.map-container-center-align");
    const $unitsListContainer = $webpageMainContainer.find(".right-rail");
    const unitListContainerWidth = $unitsListContainer
      .find(".right-rail-title")
      .width();
    const $unitListHeader = $unitsListContainer.find(
      ".webpage-left-list-view-title.webpage-header"
    );

    $unitListHeader.css({
      width: unitListContainerWidth,
    });
    $unitListHeader.find("select").css({
      maxWidth: `${unitListContainerWidth - 30 /* padding */}px`,
    });
  } else if (!_3dMapMode()) zoomReset();
  
  adjustImageMapMarkersPosition();
}

function set_yardirentcafe_url(element) {
  let url = element.getAttribute("data-availability-url");
  if (!url) url = $(element).data("availability-url");

  if (_3dMapMode()) {
    const _3dData = get3dSelectedData();
    url = _3dData.availabilityUrl;
  }

  window.open(url, "_blank");
}

function set_psi_url(element) {
  let url = element.getAttribute("data-availability-url");

  if (_3dMapMode()) {
    const _3dData = get3dSelectedData();
    url = _3dData.availabilityUrl;
  }

  window.open(url, "_blank");
}

function formatDateLocal(date) {
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().split("T")[0];
}

function setAppFolioUrl(element) {
  var url = element.getAttribute("data-availability-url") 
  if (_3dMapMode()) {
    url =  _3dData.availabilityUrl
  }

  window.open(url, "_blank");
}

function set_resman_url(element) {
  var url = element.getAttribute("data-availability-url") 

  if (_3dMapMode()) {
    url =  _3dData.availabilityUrl
  }

  window.open(url, "_blank");
}

function set_realpagesvc_url(element) {
  real_page_provider_unit_id = $(element).data("unit-provider-id");

  setApplyNowURLDate(currentUnitSelected);
  real_page_provider_unit_id = parseInt(
    real_page_provider_unit_id.split("-")[0]
  );
  var url =
    apply_now_url +
    "?MoveInDate=" +
    $("#leasing-start-date").val() +
    "&UnitId=" +
    real_page_provider_unit_id +
    "&SearchUrl=" +
    redirect_url;

  if (_3dMapMode()) {
    apply_now_url = `/communities/${webCommunity.id}/webpages/apply_now`;
    redirect_url = `/communities/${webCommunity.id}/webpages`;
    date = new Date();
    const _3dData = get3dSelectedData();
    real_page_provider_unit_id = parseInt(_3dData.providerUnitId.split("-")[0]);
    url = url =
      apply_now_url +
      "?MoveInDate=" +
      date.toISOString().split("T")[0] +
      "&UnitId=" +
      real_page_provider_unit_id +
      "&SearchUrl=" +
      redirect_url;
  }

  window.open(url, "_blank");
}

function disable_rent_filter_options(min_rent) {
  min_rent = parseInt(min_rent);
  var select = document.getElementById("market_rent");
  
  if(!select) return;

  for (var i = 1; i < select.length; i++) {
    var option = select.options[i];
    var option_rent = option.value.split("-");
    var maximum_option_rent = parseFloat(option_rent[1]);
    if (min_rent >= maximum_option_rent)
      $("#market_rent option[value=" + min_rent + "]").show();
    // $("#market_rent option[value=" + option.value + "]").show()
    else $("#market_rent option[value=" + maximum_option_rent + "]").show();
    // $("#market_rent option[value=" + option.value + "]").show()
  }
}

function disable_area_filter_options(max_area) {
  var select = document.getElementById("square_feet");
  if(select) {
    for (var i = 1; i < select.length; i++) {
      var option = select.options[i];
      var option_area = option.value.split("-");
      var minimum_option_rent = parseFloat(option_area[0]);
      if (max_area <= minimum_option_rent)
        $("#square_feet option[value=" + option.value + "]").show();
      else $("#square_feet option[value=" + option.value + "]").show();
    }
  }
}

function canShowAdditionalFees(additional_fees) {
  return (
    additional_fees == "" ||
    additional_fees == undefined ||
    additional_fees == "undefined"
  );
}

function unitAdditionalFees(element) {
  const additional_fees = $(element).data("unit-additional-fees")
  hideFees();
  
  try {
    if (canShowAdditionalFees(additional_fees)) {
      $("#unitModal").find(".c-modal-sidebar-fees").hide();
    } else {
      $("#unitModal").find(".c-modal-sidebar-fees").show();
      $("#unitModal").find(".unit-additional-fees").html(additional_fees);
    }
  } catch (err) {
    $("#unitModal").find(".c-modal-sidebar-fees").hide();
  }
}

function showFees() {
  $(".unit-additional-fees").show();
  $(".show-fees").hide();
  $(".hide-fees").show();
}

function hideFees() {
  $(".unit-additional-fees").hide();
  $(".hide-fees").hide();
  $(".show-fees").show();
}

function adjustHeightForContentArea() {
  // if ($(".m-filters").css("display") === "none") {
  $("#overall-scroller").css({
    height: "max-content",
    "max-height": "25em",
    "overflow-y": "auto",
  });
  // } else {
  // $("#overall-scroller").css({
  //   height: "18em",
  //   "max-height": "25em",
  //   "overflow-y": "auto",
  // });
  // }
}

function setAvailabilityStatus(element) {
  if(isFloorplanMapEnabled()) {
    $('.availabilty-container-start').hide()
    return;
  }
  
  const $el = $(element);
  const $modal = $("#unitModal");

  const $availability = $modal.find("#availability");
  const $availableDate = $modal.find("#available-date");
  const $availableText = $modal.find("#available-text");

  if ($el.data("sold")) {
    $availability.html("Sold");
    $availableText.html("Unavailable");
    $availableDate.html("");
    return;
  }

  if ($el.data("available")) {
    $availability.html("Available");
    $availableText.html("Available");
    $availableDate.html(
      formattedDateByRegion(webCommunity.country_code, $el.data("available-date"))
    );
    return;
  }

  const isUnoccupied = $el.data("availability") === "Unoccupied";

  $availability.html(isUnoccupied ? "Available" : "Occupied");
  $availableText.html("Available");
  $availableDate.html(
    isUnoccupied
      ? formattedDateByRegion(webCommunity.country_code, $el.data("available-date"))
      : "Unavailable"
  );
}

function setFloorplanName(element) {
  const $el = $(element);
  const $modal = $("#unitModal");

  const $unitMarketingName = $modal.find("#unit-marketing-name");
  const $floorplanName = $modal.find("#floorplan-name");

  const floorplanName = $el.data("floorplan-name");
  const unitMarketingName = $el.data("unit-marketing-name");

  if (isFloorplanMapEnabled() && isRightRailCardClicked) {
    $unitMarketingName.html(floorplanName);
    $floorplanName.html("");
  } else {
    $unitMarketingName.html(unitMarketingName);
    $floorplanName.html(floorplanName);
  }
}

function setUnitMarketRent(element) {
  $("#unitModal #market-rent, #unitModal #total-market-rent")
    .html(currency + $(element).data("market-rent"));
}

function setUnitLeasePricing(element) {
  try {
    if (
      $(element).data("unit-lease-pricing") == "" ||
      $(element).data("unit-lease-pricing") == undefined
    ) {
      $("#unit-lease-pricing-text-li").hide();
      $("#leas-price-option").addClass("hidden");
      $("#unitModal")
        .find("#unit-lease-pricing")
        .html("No more prices are available");
    } else {
      $("#unit-lease-pricing-text-li").show();
      $("#leas-price-option").removeClass("hidden");
      ss = $(element).data("unit-lease-pricing").split(";");
      leaseTermPricingOptions(ss);
    }
  } catch (err) {
    $("#unit-lease-pricing-text-li").hide();
    $("#leas-price-option").addClass("hidden");
    $("#unitModal")
      .find("#unit-lease-pricing")
      .html("No more prices are available");
  }
}

function setUnitDescription(element) {
  try {
    scroller = document.getElementById("overall-scroller");
    if ($(element).data("unit-description") == "") {
      $("#unitModal").find("#unit-description").html("Not Available");
      $("#unitModal").find(".c-modal-sidebar-description").hide();
      scroller.style.overflowY = "";
    } else {
      $("#unitModal").find(".c-modal-sidebar-description").show();
      $("#unitModal")
        .find("#unit-description")
        .html($(element).data("unit-description"));
      $("#unit-description").addClass("description-text");
      scroller.style.overflowY = "auto";
    }
  } catch (err) {
    $("#unit-description-text-li").hide();
    $("#unitModal").find(".c-modal-sidebar-description").hide();
  }
}

function setUnitBedrooms(element) {
  $("#unitModal").find("#bedrooms").html($(element).data("bedrooms"));

  if ($("#unitModal").find("#bedrooms").html() == "1") {
    $("#unitModal")
      .find("#bedrooms")
      .parents()
      .siblings(".bedrooms")
      .html("Bedroom");
  } else {
    $("#unitModal")
      .find("#bedrooms")
      .parents()
      .siblings(".bedrooms")
      .html("Bedrooms");
  }
}

function setUnitBathrooms(element) {
  $("#unitModal").find("#bathrooms").html($(element).data("bathrooms"));
  
  if ($("#unitModal").find("#bathrooms").html() == "1") {
    $("#unitModal")
      .find("#bathrooms")
      .parents()
      .siblings(".bathrooms")
      .html("Bathroom");
  } else {
    $("#unitModal")
      .find("#bathrooms")
      .parents()
      .siblings(".bathrooms")
      .html("Bathrooms");
  }
}

function setUnitSquareFeet(element) {
  $("#unitModal").find("#square-feet").html($(element).data("square-feet"));
}

function setUnitFavourite(element) {
  const $el = $(element);
  const unitId = $el.data("unit-id");
  const communityId = $el.data("community-id");

  // Select the unit (if needed elsewhere)
  selectedUnit = units.find((u) => u.id === unitId);

  const isFav = $el.data("is-fav") || favoritesArr.includes(unitId);

  // Build URL & Icon
  const url = `/communities/${communityId}/webpages/${isFav ? "delete" : "save"}_favorite?unit_id=${unitId}`;
  const iconClass = isFav ? "fa fa-heart" : "far fa-heart";

  // Update favorite icon HTML
  $("#fav-icon-tag").html(
    `<a href="${url}" data-remote="true"><i class="${iconClass}"></i></a>`
  );

  // Rebind click handler
  $("#fav-icon-tag a")
    .off("click")
    .on("click", function () {
      const index = favoritesArr.indexOf(unitId);
      if (index === -1) {
        favoritesArr.push(unitId);
      } else {
        favoritesArr.splice(index, 1);
      }
    });
}

function setFloorplanImage(element) {
  const $el = $(element);
  const imgSrc = $el.data("floorplan-image") || "";
  const $modal = $("#unitModal");

  const defaultImg = "/assets/default.jpeg";
  const finalImg = imgSrc !== "" ? imgSrc : defaultImg;

  // Set images
  $modal.find("#floorplan-image").attr("src", finalImg);
  $modal.find("#responsive-floorplan-image").attr("src", finalImg);

  // Apply extra styles only for non-small screens and non-default image
  if (!smallScreen() && finalImg !== defaultImg) {
    $(".c-modal-sidebar-filters").addClass("c-modal-sidebar-filters-bottom");
    $(".c-m-iframe-content").addClass("c-m-iframe-content-bottom");
  }
}

function setDataProvider(element) {
  const $el = $(element);
  const dataProvider = $el.data("provider");

  if (dataProvider !== "realpagesvc") {
    const website = $el.data("website") || "";
    const uri = website.replace(/^https?:\/\//, "");

    $("#psi-anchor-tag").attr({
      "data-community-property-id": $el.data("community-property-id"),
      "data-website": website,
      "data-uri": uri,
      "data-unit-provider-id": $el.data("unit-provider-id"),
      "data-floorplan-provider-id": $el.data("floorplan-provider-id"),
      "data-lease-term": $el.data("lease-term"),
      "data-availability-url": element.getAttribute("data-availability-url"),
    });
  } else {
    $("#realpagesvc-anchor-tag").attr(
      "data-unit-provider-id",
      $el.data("unit-provider-id")
    );
  }

  if (dataProvider === "yardi" || dataProvider === "yardirentcafe") {
    $(".c-modal-footer").css({ "padding-bottom": 7 });
    $(".m-filters").hide();
  }
}

function handleFavIconVisibility() {
  if(isRightRailCardClicked && isFloorplanMapEnabled())
    $("#fav-icon-tag").css("visibility", "hidden");
  else
    $("#fav-icon-tag").css("visibility", "");
}

function setModalAttributes(element) {
  if (!element) {
    return;
  }

  currentUnitSelected = element;

  setUnitLeasePricing(element);
  setUnitDescription(element);
  unitAdditionalFees(element);

  modalButtonsCounter = 0;

  addVirtualTour(element);
  addAdditionalButtonURL(element);
  addScheduledTourURL(element);

  if(modalButtonsCounter > 2 && smallScreen())
    adjustButtonFontSize();
  
  setFloorplanName(element);
  setFloorplanBanner(element);
  setUnitSquareFeet(element);
  setUnitBathrooms(element);
  setUnitBedrooms(element);
  setAvailabilityStatus(element);
  setUnitMarketRent(element);
  setUnitFavourite(element);
  setFloorplanImage(element);
  setApplyNowURLDate(element);
  setDataProvider(element)
  handleApplyNowButtonVisibility(element);
  adjustHeightForContentArea();
  resetToDefaultZoom();
  controlUnitButtonsVisibility();
  handleFavIconVisibility();
}

function controlUnitButtonsVisibility() {
  if(isRightRailCardClicked && isFloorplanMapEnabled()) {
    $(".unit-buttons").addClass("hidden");
  }
}

function setFloorplanBanner(element) {
  if (!isFloorplanMapEnabled()) return;

  const unitId = $(element).data("unit-id");
  const unit = units.find(u => u.id === unitId);
  if (!unit) return;

  const isMobile = smallScreen();
  const wrapperSelector = isMobile ? ".modal-wrapper-mobile" : ".c-modal-wrapper";

  // Remove existing banners
  $(`${wrapperSelector} .floorplan-banner`).remove();

  // Prepend new banner
  const banner = floorplanAvailabilityBannerHTML(unit);
  
  $(wrapperSelector).prepend(banner);
}


function handleApplyNowButtonVisibility(element) {
  const url = element.getAttribute("data-availability-url");
  const dataProvider = $(element).data("provider");

  if (dataProvider === "psi") {
    if (url) {
      $("#psi-anchor-tag").show();
      // handleFloorplanApplyNowVisibility(element);
    }
    else $("#psi-anchor-tag").hide();
  }
}

function handleFloorplanApplyNowVisibility(element) {
  const $el = $(element);
  if(!isFloorplanMapEnabled()) return;

  const config = getFloorplanConfigObject(currentUnitSelected.dataset);

  if(config.availability_status ===  "sold_out")
    $("#psi-anchor-tag").hide();
  else
    $("#psi-anchor-tag").show();
}

function setApplyNowURLDate(element) {
  const availableDate = ($(element).data("available-date") == "Now") ? new Date() : (new Date($(element).data("available-date")))

  $("#leasing-start-date").datepicker(
    "setDate",
    availableDate
  );

  $("#leasing-start-date").datepicker("option", {
    dateFormat: "mm/dd/yy",
    minDate: availableDate,
  });
}

function openAmenity3DTourModal(amenity_obj) {
  url = amenity_obj.video_link;
  amenityRemoveFrame();

  if (url != null && url != "") {
    amenityAddFrame(url);
    $("#amenityVirtualTourModal")
      .find("#amenityVirtualName")
      .html(amenity_obj.name);
    $("#amenityVirtualTourModal").modal("show");
  } else {
    alert("Please check video link from amenity edit page");
  }
}

function amenityRemoveFrame() {
  $("#amenity-virtual-tour-ifram-container").empty();
}

function amenityAddFrame(src) {
  var ifrm = document.createElement("iframe");
  ifrm.setAttribute("src", src);
  ifrm.style.position = "absolute";
  ifrm.style.top = 0;
  ifrm.style.bottom = 0;
  ifrm.style.left = 0;
  ifrm.style.width = "100%";
  ifrm.style.height = "100%";
  ifrm.style.border = 0;

  $("#amenity-virtual-tour-ifram-container").append(ifrm);
}

function addScheduledTourURL(element) {
  removeScheduledTourFrame();
  const openInNewTab = $(element).data("unit-link3-open-new-tab");
  let label = $(element).data("schedule-tour-label");
  let unit_id = $(element).data("unit-id");
  let url =
    $(element).data("schedule-tour-url") ||
    $(element)
      .parents()
      .find("#unitModal")
      .parents()
      .find("#m_" + unit_id)
      .data("schedule-tour-url");
  if (url != null && url != "") {
    $(".scheduled-tour-btn").css("display", "block");
    $(".scheduled-tour-btn").html(label);
    $("#scheduledTourModal")
      .find("#unitName")
      .html($(element).data("unit-marketing-name"));
    addScheduledTourFrame("#scheduledTourModal", ".scheduled-tour-btn", openInNewTab, url);
    modalButtonsCounter += 1;
  } else {
    $(".scheduled-tour-btn").css("display", "none");
  }
}

function addAdditionalButtonURL(element) {
  removeAdditionalButtonFrame();
  const openInNewTab = $(element).data("unit-link2-open-new-tab");
  let label = $(element).data("additional-button-label");
  let unit_id = $(element).data("unit-id");
  let url =
    $(element).data("additional-button-url") ||
    $(element)
      .parents()
      .find("#unitModal")
      .parents()
      .find("#m_" + unit_id)
      .data("additional-button-url");
  if (url != null && url != "") {
    $(".additional-btn").css("display", "block");
    $(".additional-btn").html(label);
    $("#unitVirtualTourModal")
      .find("#unitName")
      .html($(element).data("unit-marketing-name"));
    addAdditionalButtonFrame("#additionalButtonModal", ".additional-btn", openInNewTab, url);
    modalButtonsCounter += 1;
  } else {
    $(".additional-btn").css("display", "none");
  }
}

function addVirtualTour(element) {
  removeFrame();
  const openInNewTab = $(element).data("unit-link1-open-new-tab");
  let label = $(element).data("unit-virtual-tour-label");
  let unit_id = $(element).data("unit-id");
  let url =
    $(element).data("unit-virtual-tour-url") ||
    $(element)
      .parents()
      .find("#unitModal")
      .parents()
      .find("#m_" + unit_id)
      .data("unit-virtual-tour-url");
  if (url != null && url != "") {
    $(".virtual-tour-btn").css("display", "block");
    $(".virtual-tour-btn").html(label);
    $("#unitVirtualTourModal")
      .find("#unitVirtualName")
      .html($(element).data("unit-marketing-name"));
    addFrame("#unitVirtualTourModal", ".virtual-tour-btn", openInNewTab, url);
    modalButtonsCounter += 1;
  } else {
    $(".virtual-tour-btn").css("display", "none");
  }
}

function adjustButtonFontSize() {
  $(".scheduled-tour-btn, .additional-btn, .virtual-tour-btn").css("font-size", "10px");
}


function removeFrame() {
  $("#virtual-tour-ifram-container").empty();
}

function removeAdditionalButtonFrame() {
  $("#additional-button-ifram-container").empty();
}

function removeScheduledTourFrame() {
  $("#scheduled-tour-ifram-container").empty();
}

function openLinkInNewTab(targetedModal, selector, openInNewTab, src) {
  const $el = $(selector);

  if (openInNewTab) {
    // Remove modal behavior
    $el.removeAttr("data-toggle");
    $el.removeAttr("data-target");

    // Open in new tab
    $el.attr("href", src);
    $el.attr("target", "_blank");

    return true; // skip iframe
  } else {
    // Restore modal behavior
    $el.removeAttr("href");
    $el.removeAttr("target");

    $el.attr("data-toggle", "modal");
    $el.attr("data-target", targetedModal); // must be data-target="#modalId"

    return false; // iframe mode
  }
}



function addFrame(targetedModal, selector, openInNewTab, src) {
  if (openLinkInNewTab(targetedModal, selector, openInNewTab, src)) return;
  var ifrm = document.createElement("iframe");
  ifrm.setAttribute("src", src);
  ifrm.style.position = "absolute";
  ifrm.style.top = 0;
  ifrm.style.bottom = 0;
  ifrm.style.left = 0;
  ifrm.style.width = "100%";
  ifrm.style.height = "100%";
  ifrm.style.border = 0;

  $("#virtual-tour-ifram-container").append(ifrm);
}

function addAdditionalButtonFrame(targetedModal, selector, openInNewTab, src) {
  if (openLinkInNewTab(targetedModal, selector, openInNewTab, src)) return;
  var ifrm = document.createElement("iframe");
  ifrm.setAttribute("src", src);
  ifrm.style.position = "absolute";
  ifrm.style.top = 0;
  ifrm.style.bottom = 0;
  ifrm.style.left = 0;
  ifrm.style.width = "100%";
  ifrm.style.height = "100%";
  ifrm.style.border = 0;

  $("#additional-button-ifram-container").append(ifrm);
}

function addScheduledTourFrame(targetedModal, selector, openInNewTab, src) {
  if (openLinkInNewTab(targetedModal, selector, openInNewTab, src)) return;
  var ifrm = document.createElement("iframe");
  ifrm.setAttribute("src", src);
  ifrm.style.position = "absolute";
  ifrm.style.top = 0;
  ifrm.style.bottom = 0;
  ifrm.style.left = 0;
  ifrm.style.width = "100%";
  ifrm.style.height = "100%";
  ifrm.style.border = 0;

  $("#scheduled-tour-ifram-container").append(ifrm);
}

function leaseTermPricingOptions(ss) {
  var lease = [];
  let first_lease_item = "";
  var lease_price_arr = [];
  var lease_months_arr = [];

  var collator = new Intl.Collator(undefined, {
    numeric: true,
    sensitivity: "base",
  });

  ss = ss.sort(collator.compare).reverse();

  for (var i = 0; i < ss.length - 1; i++) {
    var s = ss[i].split(":");
    var sp;
    if (s[2] && s[2] != "") {
      sp = s[2] + " - ";
    } else {
      sp = "";
    }

    if (s[1] && parseInt(s[1]) > 0) {
      lease.push(
        s[0] + " months " + sp + "<b>" + currency + s[1] + "<b>" + "<br>"
      );
      lease_price_arr.push(s[1]);
      lease_months_arr.push(s[0]);
    }
  }

  if (lease_price_arr.every((a) => a === lease_price_arr[0])) {
    const lease_months_arr_numbers = lease_months_arr.map((str) => {
      return Number(str);
    });
    const indexOfMinMonth = lease_months_arr_numbers.indexOf(
      Math.min(...lease_months_arr_numbers)
    );
    first_lease_item = lease[indexOfMinMonth];

    if (indexOfMinMonth > -1) {
      lease.splice(indexOfMinMonth, 1);
    }
  } else {
    const lease_price_arr_numbers = lease_price_arr.map((str) => {
      return Number(str);
    });
    const indexOfMinLease = lease_price_arr_numbers.indexOf(
      Math.min(...lease_price_arr_numbers)
    );
    first_lease_item = lease[indexOfMinLease];

    if (indexOfMinLease > -1) {
      lease.splice(indexOfMinLease, 1);
    }
  }

  var leaseTermOptions = "";

  for (let i = 0; i < lease_months_arr.length; ++i) {
    leaseTermOptions += `<option value="${
      lease_months_arr[i] + " months"
    }" data-lease-price="${lease_price_arr[i]}" >${
      lease_months_arr[i] + " months"
    }</option>`;
  }

  $("#unitModal").find("#unit-lease-pricing").html(lease);
  $("#unitModal").find("#first-unit-lease-pricing").html(first_lease_item);
  $("#unitModal").find("#lease_term").html(leaseTermOptions);
  $(
    `#lease_term option[value="${
      first_lease_item[0] + first_lease_item[1] + " months"
    }"]`
  ).attr("selected", true);
}

function setUnitAttributes(element, event = null) {
  $(".modal-unit-button").each(function () {
    $(this).removeClass("btn-primary");
    $(this).addClass("btn-default");
  });

  $(element).removeClass("btn-default");
  $(element).addClass("btn-primary");
  setModalAttributes(element);

  event?.stopImmediatePropagation();
}

function handleMapControl() {
  if (communityInactivated) return;

  if (_3dMapMode()) {
    display3DMap();
  } else display2DMap();
}

function resetMapData() {
  resetUnits();
  setWebpageContainerSize();
  filterUnitsBasedOnSelectedFilters();
  debouncedShowMarkers();
}

function toggleFloorDirection(is3d) {
  const track = document.querySelector(".floor-counts .slick-list .slick-track");
  if (!track) return;

  const allItem = track.querySelector('li.digits-list-item.hidden'); // "All" item
  if (!allItem) return;

  if (is3d) {
    // Bring last item ("All") to top
    track.insertBefore(allItem, track.firstElementChild);
  } else {
    // Move "All" back to end
    track.appendChild(allItem);
  }
}

function display3DMap() {
  if(!extraSmallScreen())
    toggleFloorDirection(true);

  $(".3d-map-option").addClass("hidden");
  $(".location-items").addClass("hidden");
  $(".plus-action").addClass("hidden");
  $(".minus-action").addClass("hidden");
  $(".image-map").addClass("hidden");
  $(".legend-item")
    .filter(function () {
      return (
        $(this).find("span.label").text().trim().toUpperCase() ===
        "MISSING DATA"
      );
    })
    .addClass("hidden");
  $("li.digits-list-item")
    .filter(function () {
      return $(this).find("#all").length;
    })
    .removeClass("hidden");
  $(".beans-map-container").removeClass("hidden");
  $("._3d-apply-filter-button").removeClass("hidden");
  $(".satelite-view-icon").removeClass("hidden");
  $(".2d-map-option").removeClass("hidden");
  $("a.floorplate-anchor#all").click();
  resetMapData();
}

function display2DMap() {
  if(!extraSmallScreen())
    toggleFloorDirection(false);
  
  $("._3d-apply-filter-button").addClass("hidden");
  $(".beans-map-container").addClass("hidden");
  $(".satelite-view-icon").addClass("hidden");
  $(".2d-map-option").addClass("hidden");
  $(".satelite-view-icon").addClass("hidden");
  $("li.digits-list-item")
    .filter(function () {
      return $(this).find("#all").length;
    })
    .addClass("hidden");
  $(".legend-item")
    .filter(function () {
      return (
        $(this).find("span.label").text().trim().toUpperCase() ===
        "MISSING DATA"
      );
    })
    .removeClass("hidden");
  $(".image-map").removeClass("hidden");
  $(".location-items").removeClass("hidden");
  $(".plus-action").removeClass("hidden");
  $(".minus-action").removeClass("hidden");
  $(".3d-map-option").removeClass("hidden");
  $("a.floorplate-anchor#" + defaultSelectedFloor).click();
  resetMapData();
}

function resetFilters(mobileTriggered = false) {
  units = total_units;

  if (multiCommunity) resetBasedOnMultiCommunities();
  else resetBasedOnBedroom();

  setAvailabilityFilterToNow();
  if (mobileTriggered && smallScreen()) $(".mobile-filter-mega-menu").slideToggle(); 
}

function resetBasedOnMultiCommunities() {
  $("#responsive_multi_communities").val(
    $("#responsive_multi_communities option:first").val()
  );
  $("#multi_communities").val($("#multi_communities option:first").val());

  // if (smallScreen()) $(".mobile-filter-mega-menu").slideToggle();

  multiPropertiesFilterChanged();
}

function resetBasedOnBedroom() {
  $("#responsive_unit_bedroom").val(
    $("#responsive_unit_bedroom option:first").val()
  );
  $("#unit_bedroom").val($("#unit_bedroom option:first").val());

  // if (smallScreen()) $(".mobile-filter-mega-menu").slideToggle();

  bedroomFilterChanged();
}

function applyFilters() {
  filterUnitsBasedOnSelectedFilters();
  debouncedShowMarkers();

  selected_market_rent = $("#responsive_market_rent option:selected").text();
  selected_square_feet = $("#responsive_square_feet option:selected").text();
  selected_available_unit = $(
    "#responsive_available_unit option:selected"
  ).text();
  selected_unit_bedrooms = $("#responsive_unit_bedroom option:selected").text();

  $("#max_price_responsive").html(currency + selected_market_rent);
  $("#sq_feet_responsive").html(selected_square_feet);
  $("#unit_availability").html(selected_available_unit);
  $("#bedroom_responsive").html(selected_unit_bedrooms);
  $(".mobile-filter-mega-menu").slideToggle();
}

function get_unit_availability(unit) {
  const todayDate = moment();
  let availableDateString = "";

  if (unit.sold) {
    availableDateString = "Unavailable:";
  } else if (unit.available && unit.available_date) {
    const availableDate = moment(unit.available_date, "YYYY-MM-DD");
    if (availableDate.isSameOrBefore(todayDate, "day")) {
      availableDateString = "Available: Now";
    } else {
      if (isDefined(webCommunity) && webCommunity.country_code) {
        availableDateString = `Available: ${formattedDateByRegion(
          webCommunity.country_code,
          availableDate.toDate()
        )}`;
      } else {
        availableDateString = `Available: ${formattedDateByRegion(
          "US",
          availableDate.toDate()
        )}`;
      }
    }
  } else {
    availableDateString = "Unavailable:";
  }

  return availableDateString;
}

/* --------------------------- Start-Webpages Analytics track Activities Section ---------------------------------------------*/

function updateActivityData(activityName, activityEvent) {
  const payload = {
    activity: {
      name: activityName,
      event: activityEvent,
    },
  };

  const community_id = $("#maps_community_id").val();
  if (community_id) {
    $.ajax({
      type: "POST",
      url: `/communities/${community_id}/webpages/activity_tracking`,
      data: JSON.stringify(payload),
      contentType: "application/json",
      success: function (response) {},
    });
  }
}

// Map Hover Events Tracking
function trackingMapHoverEvents() {
  amenityMarkerHoverEvent();
  unitMarkerHoverEvent();
  unitsListHoverEvent();
}

function amenityMarkerHoverEvent() {
  const markerSelector = svgMode ? "cloned-amenity" : "amenity-marker";
  $(`.${markerSelector}`)
    .off("mouseenter")
    .on("mouseenter", function () {
      updateActivityData(markerSelector, "hover");
    });
}

function unitMarkerHoverEvent() {
  const markerSelector = svgMode ? "cloned-unit" : "unit_marker";
  $(`.${markerSelector}`)
    .off("mouseenter")
    .on("mouseenter", function () {
      updateActivityData(markerSelector, "hover");
    });
}

function unitsListHoverEvent() {
  const markerSelector = svgMode ? "cloned-unit" : "unit_marker";
  $(document)
    .off("mouseenter", ".right-rail-card")
    .on("mouseenter", ".right-rail-card", function () {
      updateActivityData(markerSelector, "hover");
    });
}

// Map Click Events Tracking
function trackingMapClickEvents() {
  // new Methods
  amenityMarkerClickEvent();
  unitMarkerClickEvent();
  sortingFilterClickEvent();
  bedroomFilterClickEvent();
  pricingFilterClickEvent();
  squareFootageFilterClickEvent();
  availabilityFilterClickEvent();
  resetFilterClickEvent();
  viewSavedButtonClickEvent();
  scheduleTourButtonClickEvent();
  logoIconClickEvent();
  zoomInClickEvent();
  zoomOutClickEvent();
  zoomRefreshClickEvent();
  floorNumberClickEvent();
  clearAllFavoritesClickEvent();
  view3DTourClickEvent();
  shareFavoritesButtonClickEvent();
  applyNowClickEvent();
  modalUnitButtonsClickEvent();
  pricingMatrixClickEvents();
}

// New Activity Tracking Methods.
function amenityMarkerClickEvent() {
  const markerSelector = svgMode ? ".cloned-amenity" : ".amenity-marker";
  $(markerSelector)
    .off("click")
    .on("click", function () {
      updateActivityData("amenity_marker", "click");
    });
}

function unitMarkerClickEvent() {
  const markerSelector = svgMode ? "cloned-unit" : "unit_marker";
  $(`.${markerSelector}`)
    .off("click")
    .on("click", function () {
      updateActivityData(markerSelector, "click");
    });
}

function sortingFilterClickEvent() {
  $(document)
    .off("mousedown", "#filter")
    .on("mousedown", "#filter", function () {
      updateActivityData("sorting_filter", "click");
    });
}

function bedroomFilterClickEvent() {
  $(document)
    .off("mousedown", "#unit_bedroom")
    .on("mousedown", "#unit_bedroom", function () {
      updateActivityData("bedroom_filter", "click");
    });

  $(document)
    .off("mousedown", "#responsive_unit_bedroom")
    .on("mousedown", "#responsive_unit_bedroom", function () {
      updateActivityData("bedroom_filter", "click");
    });
}

function pricingFilterClickEvent() {
  $(document)
    .off("mousedown", "#market_rent")
    .on("mousedown", "#market_rent", function () {
      updateActivityData("pricing_filter", "click");
    });

  $(document)
    .off("mousedown", "#responsive_market_rent")
    .on("mousedown", "#responsive_market_rent", function () {
      updateActivityData("pricing_filter", "click");
    });
}

function squareFootageFilterClickEvent() {
  $(document)
    .off("mousedown", "#square_feet")
    .on("mousedown", "#square_feet", function () {
      updateActivityData("square_feet_filter", "click");
    });

  $(document)
    .off("mousedown", "#responsive_square_feet")
    .on("mousedown", "#responsive_square_feet", function () {
      updateActivityData("square_feet_filter", "click");
    });
}

function availabilityFilterClickEvent() {
  $(document)
    .off("mousedown", "#available_unit")
    .on("mousedown", "#available_unit", function () {
      updateActivityData("availability_filter", "click");
    });

  $(document)
    .off("mousedown", "#responsive_available_unit")
    .on("mousedown", "#responsive_available_unit", function () {
      updateActivityData("availability_filter", "click");
    });
}

function resetFilterClickEvent() {
  $(document)
    .off("click", ".reset-filter-button")
    .on("click", ".reset-filter-button", function () {
      updateActivityData("reset_filter", "click");
    });
}

function view3DTourClickEvent() {
  $(document)
    .off("click", ".virtual-tour-btn")
    .on("click", ".virtual-tour-btn", function () {
      updateActivityData("virtual_tour", "click");
    });
}

function modalUnitButtonsClickEvent() {
  $(document)
    .off("click", ".modal-unit-button")
    .on("click", ".modal-unit-button", function () {
      updateActivityData("unit_modal_buttons", "click");
    });
}

function pricingMatrixClickEvents() {
  $(document)
    .off("click", ".show-more")
    .on("click", ".show-more", function () {
      updateActivityData("open_pricing_matrix", "click");
    });
}

function viewSavedButtonClickEvent() {
  $(document)
    .off("click", ".view-saved-btn")
    .on("click", ".view-saved-btn", function () {
      updateActivityData("view_saved", "click");
    });
}

function scheduleTourButtonClickEvent() {
  $(document)
    .off("click", ".schedule-tour-btn")
    .on("click", ".schedule-tour-btn", function () {
      updateActivityData("schedule_tour", "click");
    });
}

function logoIconClickEvent() {
  $(document)
    .off("click", ".app-logo")
    .on("click", ".app-logo", function () {
      updateActivityData("logo", "click");
    });
}

function floorNumberClickEvent() {
  $(document)
    .off("click", ".slick-slide")
    .on("click", ".slick-slide", function () {
      updateActivityData("floor_number", "click");
    });
}

function zoomInClickEvent() {
  $(document)
    .off("click", ".plus-action")
    .on("click", ".plus-action", function () {
      updateActivityData("zoom_in", "click");
    });
}

function zoomOutClickEvent() {
  $(document)
    .off("click", ".minus-action")
    .on("click", ".minus-action", function () {
      updateActivityData("zoom_out", "click");
    });
}

function zoomRefreshClickEvent() {
  $(document)
    .off("click", ".refresh-action")
    .on("click", ".refresh-action", function () {
      updateActivityData("zoom_refresh", "click");
    });
}

function clearAllFavoritesClickEvent() {
  $(document)
    .off("click", ".clear-all")
    .on("click", ".clear-all", function () {
      updateActivityData("clear_favorites", "click");
    });
}

function shareFavoritesButtonClickEvent() {
  $(document)
    .off("click", ".share-favorite")
    .on("click", ".share-favorite", function () {
      updateActivityData("sent_favorite", "click");
    });
}

function applyNowClickEvent() {
  $(document)
    .off("click", ".apply_now")
    .on("click", ".apply_now", function () {
      updateActivityData("apply_now_count", "click");
    });
}

function mapContainerClickEvents() {
  $(".maps-analytics-container")
    .off("click")
    .on("click", function (event) {
      updateActivityData("other", "click");
    });

  $(".maps-analytics-container")
    .off("mousemove")
    .on("mousemove", function (event) {
      if (!isMouseMoving) {
        // Log the start of the mousemove
        isMouseMoving = true;

        // Log every 3 seconds while the mouse is moving
        intervalId = setInterval(() => {
          updateActivityData("other", "hover");
        }, 3000);
      }

      // Reset the timeout every time mousemove is triggered
      clearTimeout(timeoutId);

      timeoutId = setTimeout(() => {
        // Stop logging when mouse stops moving for 3 seconds
        clearInterval(intervalId);
        isMouseMoving = false;
      }, 3000); // Timeout to detect when the mouse stops moving
    });
}

function hasFloorplate() {
  return has_floorplate === "true";
}

function validFloor(floor, matchingFloor = current_floor) {
  return !hasFloorplate() || matchingFloor == floor || matchingFloor === "all";
}

async function fetchWebpageSVGAndSetCoordinates() {
  $(".webPageLoader").removeClass("hidden");

  $images = $("img.sitemap-image.floorplate-image");
  $images.each((_, img) => {
    const isFloorplate = hasFloorplate();
    const visibleCheck = isFloorplate
      ? img.id ===
        `f_${current_floor === "all" ? defaultSelectedFloor : current_floor}`
      : img.id === "property-map-image";

    const asset = {
      id: `image-${
        isFloorplate ? "floorplate-" + img.id.replace("f_", "") : "sitemap-1"
      }`,
      node: img,
      url: img.src,
      type: "img",
      completed: false,
    };
    assetTracker.addOrUpdateAsset(asset, visibleCheck);
  });

  if (hasFloorplate()) {
    const array = [];
    for (const floor of floors) {

      if (floor === "all") continue; // Skip 'all' floor
      array.push(
        fetchSVG(`#floorplate_${floor}`, {
          floor,
          loader: true,
          svgPosition: 0,
          tracker: assetTracker,
          setSVGImageHeight: true,
          trackerAssetId: `svg-floorplate-${floor}`,
          trackerVisibilityCheck: validFloor(floor)
        })
      );
    }
    await Promise.all(array);
  } else {
    await fetchSVG("#property-map", {
      loader: true,
      svgPosition: 1,
      tracker: assetTracker,
      setSVGImageHeight: true,
      trackerVisibilityCheck: true,
      trackerAssetId: `svg-sitemap-1`
    });
  }

  try {
    const result = await assetTracker.watchAssetsLoading({
      visibilityCheck: true,
    });

    if (result.ok) {
      handleMapControl();
      debouncedShowMarkers();
    } else {
      console.error(result.message);
    }
  } catch (error) {
    console.error(error);
  }

  resetFilters();
  assetTracker.clearAllAssetsLists();
  assetTracker.turnoffLoader();
  $(".webPageLoader").addClass("hidden");
}

function setSVGUnitsAmenitiesCoordinates() {
  if (_3dMapMode() || !svgMode) return;

  $(".cloned").parent("g").css({ cursor: "default" });
  setSvgUnitsCoordinates();
  setSvgAmenitiesCoordinates();
}

function setWebpageContainerSize() {
  const $wrapperBody = $(".c-wrapper");
  if ($wrapperBody.length === 0) return;
  $wrapperBody.css({
    width: "100%",
  });

  const totalWidth = parseFloat(
    getComputedStyle($wrapperBody[0].parentElement).width
  );

  const $mainBody = $wrapperBody.find(".c-body");
  const $webpageMainContainer = $("div.map-body.map-container-center-align");
  const $mapContainer = $webpageMainContainer.find(".right-side");
  const $beansMapContainer = $mapContainer.find(".beans-map-container");
  const $zoomableContainer = $mapContainer.find(
    ".image-map.zoomable-map-container"
  );
  const $unitsListContainer = $webpageMainContainer.find(".right-rail");
  const mapContainer = $mapContainer[0];
  const result = { width: 0, height: 0 };

  if (mapContainer) {
    const $containerHeader = $(".app-header");
    const headerHeight = $containerHeader.height() || 0;

    const $mapContainerFooter = $(".c-footer");
    const footerHeight = $mapContainerFooter.height()
      ? $mapContainerFooter.height() + (10 + 10) /* padding */
      : 0;

    const $tabHeader = $mainBody.find("#tab");
    const tabHeaderHeight = smallScreen()
      ? ($tabHeader.height() || 0) + 1 /* border-bottom */
      : 0;

    const $buttonsGroup = $wrapperBody.find(".header-buttons-groups");
    const tabButtonsGroupHeight =
      smallScreen() && $buttonsGroup[0]
        ? $buttonsGroup.height() + (10 + 7) /* padding */
        : 0;

    const $sidebar = $wrapperBody.find(".c-sidebar");

    const sidebar = hasFloorplate() && $sidebar[0];
    const sidebarExactHeight = $sidebar.height() || 0;
    const sidebarExactWidth = ($sidebar.width() || 0) + (2 + 2); /* padding */
    const sidebarHeightCondition = sidebar && extraSmallScreen();
    const sidebarWidthCondition = sidebar && !extraSmallScreen();
    const sidebarSize = {
      width: sidebarWidthCondition ? sidebarExactWidth : 0,
      height: sidebarHeightCondition ? sidebarExactHeight : 0,
    };

    $containerHeader.css({
      width: totalWidth - sidebarSize.width,
      left: sidebarSize.width,
    });

    if (extraSmallScreen()) {
      $sidebar.css({
        top: headerHeight + tabHeaderHeight,
      });
    }

    const mainBodyHeight =
      $wrapperBody.height() - (headerHeight + tabButtonsGroupHeight);
    const mainBodyWidth = totalWidth - sidebarSize.width;
    $mainBody.css({
      width: mainBodyWidth,
      height: mainBodyHeight,
      left: sidebarSize.width,
      top: 0,
    });

    const smallScreenElementsHeight = tabHeaderHeight + sidebarSize.height;

    const mainContainerHeight = mainBodyHeight - smallScreenElementsHeight;

    $webpageMainContainer.css({
      width: mainBodyWidth,
      height: mainContainerHeight,
      top: sidebarSize.height,
    });

    result.height = mainContainerHeight;
    result.width = $mapContainer.width();

    $mapContainer.css({
      height: result.height,
      width: result.width,
    });

    result.width = $mapContainer.width();

    $zoomableContainer.css({
      height: result.height - footerHeight,
      width: result.width,
      top: 0,
    });
    $beansMapContainer.css({
      height: result.height - footerHeight,
      width: result.width,
    });
    $mapContainerFooter.css({
      width: result.width,
      bottom: smallScreen() ? tabButtonsGroupHeight : 0,
    });

    $unitsListContainer.css({
      height: result.height,
    });

    if (smallScreen()) {
      $buttonsGroup.css({
        width: mainBodyWidth,
        left: sidebarSize.width,
      });
    }

    const unitListContainerWidth = $unitsListContainer
      .find(".right-rail-title")
      .width();
    const $unitListHeader = $unitsListContainer.find(
      ".webpage-left-list-view-title.webpage-header"
    );

    $unitListHeader.css({
      width: unitListContainerWidth,
    });
    $unitListHeader.find("select").css({
      maxWidth: `${unitListContainerWidth - 30 /* padding */}px`,
    });

    if (extraSmallScreen()) {
      $(".units-alert").css({
        top: 0,
      });
    }
    if (!smallScreen()) {
      $containerHeader.find(".app-logo").css({
        width: unitListContainerWidth + 22 /* padding */,
      });
    }
  }
}

function setMarkersSizeAndMargin() {
  if (svgMode || _3dMapMode()) return;

  const currentVisibleImage = currentVisibleMapImage();
  if (!currentVisibleImage) return;

  const scale = currentVisibleMapImageScale();
  const mainMarkerSize = extraSmallScreen()
    ? markerFontSize * 0.33
    : smallScreen()
    ? markerFontSize * 0.66
    : markerFontSize;

  const $marker = $(".unit_marker");
  const $markerSpans = $marker.children();
  const visibleMarker = Array.from($marker).find((m) =>
    isElementVisibleOnScreen(m)
  );

  $marker.css({
    fontSize: mainMarkerSize,
  });

  if (visibleMarker) {
    $markerSpans.css({
      fontSize: mainMarkerSize / 4,
    });
    const visibleSpan = Array.from($markerSpans).find((s) =>
      isElementVisibleOnScreen(s)
    );

    const { width, height } = visibleMarker.getBoundingClientRect();

    left_margin = width / 2 / scale;
    top_margin = height / scale;

    $marker.css({
      marginLeft: -left_margin,
      marginTop: -top_margin,
    });

    if (visibleSpan) {
      const { width: spanWidth, height: spanHeight } =
        visibleSpan.getBoundingClientRect();
      const number = parseInt(visibleSpan.innerText);

      if (number > 9) {
        $markerSpans.css({
          left: -(spanWidth / 2 / scale),
          top: -((spanHeight * 3) / scale),
        });
      } else {
        $markerSpans.css({
          left: -(spanWidth / 1.75 / scale),
          top: -((spanHeight * 3) / scale),
        });
      }
    }
  }

  const $amenityMarker = $(".amenity-marker");
  const $amenityMarkerSpans = $amenityMarker.find(
    "span.camera-icon.camera-icon-responsive"
  );
  const $amenityMarkerIcons = $amenityMarkerSpans.find("i");
  const visibleAmenityMarker = Array.from($amenityMarker).find((m) =>
    isElementVisibleOnScreen(m)
  );
  if (visibleAmenityMarker) {
    const spanSize =
      (extraSmallScreen() ? 0.25 : smallScreen() ? 0.5 : 0.75) * markerFontSize;
    $amenityMarkerSpans.css({
      maxWidth: spanSize,
      maxHeight: spanSize,
      border: `${
        extraSmallScreen() ? 1 : smallScreen() ? 1.5 : 2
      }px solid ${amenity_marker_color}`,
    });

    const cameraIconSpanSize = spanSize * 0.5;

    $amenityMarkerIcons.css({
      fontSize: cameraIconSpanSize,
    });

    const visibleSpan = Array.from($amenityMarkerSpans).find((s) =>
      isElementVisibleOnScreen(s)
    );
    const { width: spanWidth, height: spanHeight } =
      visibleSpan.getBoundingClientRect();
    amenity_left_margin = spanWidth / 2 / scale;
    amenity_top_margin = spanHeight / 2 / scale;
    $amenityMarker.css({
      marginLeft: -amenity_left_margin,
      marginTop: -amenity_top_margin,
    });
  }
}

function currentMapImage() {
  const parentSelector = hasFloorplate()
    ? `div#floorplate_${
        current_floor === "all" ? defaultSelectedFloor : current_floor
      }`
    : `div#property-map`;
  const currentVisibleImage = Array.from(
    document.querySelectorAll(
      `${parentSelector} > img, ${parentSelector} > svg`
    )
  )[0];

  return currentVisibleImage;
}

function currentVisibleMapImage() {
  const mapIMage = currentMapImage();
  const currentVisibleImage = isElementVisibleOnScreen(mapIMage)
    ? mapIMage
    : null;

  return currentVisibleImage;
}

function currentVisibleMapImageScale() {
  let scale = 1;
  const currentVisibleImage = currentVisibleMapImage();
  if (currentVisibleImage) {
    const zoomPanKey = getZoomPanKey(currentVisibleImage.parentElement);
    const zoomPanInstance = zoomablePans[zoomPanKey];
    if (zoomPanInstance) {
      scale = zoomPanInstance.instance.getTransform().scale;
    }
  }

  return scale;
}

function getUnitMarkerColor(unit) {
  if (!unit) {
    if (svgMode && !_3dMapMode() && opsMapMarkersEnabled) {
      return mapMarkerColors.missing || "#eecea5";
    }
    return "";
  }

  const unitCommunityId = unit.property_id || unit.propertyId || "";
  const unitStatus = unit.unit_status || unit.unitStatus || unit.status || "";
  let result = getCommunityBasedMarkerColor(unitCommunityId);

  if (opsMapMarkersEnabled) {
    if (isModelUnit(unit)) {
      result = mapMarkerColors.model || "#f57396";
    } else {
      switch (unitStatus.toLowerCase()) {
        case "occupied":
        case "occupied no notice":
        case "notice rented":
          result = mapMarkerColors.occupied || "#f2f2f2";
          break;
        case "occupied on notice":
        case "notice unrented":
          result = mapMarkerColors.occupied_on_notice || "#8545a1";
          break;
        case "vacant":
        case "available":
        case "unoccupied":
        case "vacant unrented not ready":
        case "vacant unrented ready":
          result = mapMarkerColors.vacant || "#d37474";
          break;
        case "vacant lease":
        case "vacant rented ready":
        case "vacant rented not ready":
          result = mapMarkerColors.vacant_leased || "#f9d648";
          break;
        default:
          result = map_marker_color;
          break;
      }
    }
  }

  if(isFloorplanMapEnabled() || checkFloorPlanColorMode()) {
    result = getMarkerColor(unit);
    return result;
  }

  return toHexColor(result);
}

function hexToRgba(hex, opacity = 1) {
  hex = hex.replace(/^#/, '');

  if (hex.length === 3) {
    hex = hex.split('').map(char => char + char).join('');
  }

  const bigint = parseInt(hex, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;

  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}


function isModelUnit(unit) {
  const modelUnit = unit.model_unit || unit.modelUnit || false;
  
  return typeof modelUnit === "boolean"
    ? modelUnit
    : typeof modelUnit === "string"
    ? modelUnit === "true"
    : false;
}

function getMarkerColor(unit) {
  const colorBy = unit.colorBy || unit.data_attributes['data-color-by'] || "by_floorplan";

  switch (colorBy) {
    case "by_floorplan":
      return getColorByFloorplan(unit);
    case "by_property":
      return getColorByProperty(unit);
    default:
      return map_marker_color || "#d37474";
  }
}

function getColorByFloorplan(unit) {
  const DEFAULT_COLOR = "#d37474";
  
  const config = getFloorplanConfigObject(unit);

  if (!config) return hexToRgba(DEFAULT_COLOR, 1);

  const isModel = isModelUnit(unit);
  const colorKey = isModel ? "model_units_color" : "available_units_color";
  const opacityKey = isModel ? "model_units_opacity" : "available_units_opacity";

  const color = config[colorKey] || DEFAULT_COLOR;
  const opacity = config[opacityKey] ?? 1; // using nullish coalescing for 0 handling

  return hexToRgba(color, opacity);
}

function getColorByProperty(unit) {
  const DEFAULT_COLOR = "#d37474";
  const config = getPropertyConfigObject(unit);

  if (!config) return hexToRgba(DEFAULT_COLOR, 1);

  const isModel = isModelUnit(unit);
  const colorKey = isModel ? "model_units_color" : "available_units_color";
  const opacityKey = isModel ? "model_units_opacity" : "available_units_opacity";

  const color = config[colorKey] || DEFAULT_COLOR;
  const opacity = config[opacityKey] ?? 1; // using nullish coalescing for 0 handling

  return hexToRgba(color, opacity);
}

function getPropertyConfigObject(unit) {
  const parseConfig = (config) => {
    if (!config) return null;
    return typeof config === "object" ? config : safeJsonParse(config);
  };

  return (
    parseConfig(unit.byPropertyColors) ||  
    parseConfig(unit.data_attributes?.["data-by-property-colors"]) ||
    null
  );
}

function getFloorplanConfigObject(unit) {
  const parseConfig = (config) => {
    if (!config) return null;
    return typeof config === "object" ? config : safeJsonParse(config);
  };

  return (
    parseConfig(unit.floorplanMapConfig) ||                                // case 1: existing key
    parseConfig(unit.floorplanConfig) ||                                   // case 2: matches your DOMStringMap
    parseConfig(unit.data_attributes?.["data-floorplan-map-config"]) ||    // case 3: dataset attribute
    null
  );
}

// Safe JSON parsing
function safeJsonParse(str) {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}


function getCommunityBasedMarkerColor(unitCommunityId) {
  if (!multiCommunity) {
    return map_marker_color || "#d37474";
  }

  const subCommunity = subCommunities.find((subCom) => {
    return (
      subCom &&
      subCom.property_id &&
      subCom.property_id.trim() === unitCommunityId.toString().trim()
    );
  });

  return subCommunity ? subCommunity.map_marker_color : map_marker_color;
}

function resetUnits() {
  units = total_units;
}

function isFloorplanMapEnabled() {
  return (
    (turnAvailabilityOn) && !opsMapMarkersEnabled
  );
}

function checkFloorPlanColorMode() {
  return (
    (isFloorPlanColorEnabled) && !opsMapMarkersEnabled
  );
}
