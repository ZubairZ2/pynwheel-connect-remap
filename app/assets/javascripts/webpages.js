var selectMap;
var webCommunity;
var _3dFilteredUnits;
var _3dAmenities;
var _3dSelectedUnit;
var _3dFilteredAmenity;
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
var favoritesArr = [];
var defaultMapType;
var _3dUnitsToBeSelected;
var enable3DMaps;
var image_width_2d;
var maxSelectedPrice;
var timer;
var currency = "$";
var real_page_provider_unit_id = null;
var currentUnitSelected = null;
var parsedSVGs = [];

var isMouseMoving = false;
var intervalId = null;
var timeoutId = null;
var units = null;
var total_units = null;
var amenities = null;
var communityInactivated = definedAndHasValue(communityInactivated)
  ? communityInactivated
  : false;

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

  if (isDefined(webCommunity)) {
    selectMap = webCommunity.web_map_type;
    enable3DMaps = webCommunity.enable_three_d_maps;
    defaultMapType = webCommunity.web_map_type;

    if (selectMap === "3d-map" && enable3DMaps) {
      _3dUnitsToBeSelected = filterUnitsBasedOnCommunityType(units); //select_units_according_to_filters(units)
      selected_units = _3dMapViewMarker();

      beansWidget.initMap(
        `${webCommunity.address}, ${webCommunity.city}, ${webCommunity.state}`,
        _beansApiKey,
        {
          "click-popup-listener": polygonClickPopup,
          "default-polygon-color":
            _3dConfigurations && _3dConfigurations.default_polygon_color
              ? _3dConfigurations.default_polygon_color
              : "#3ca832",
          "selected-polygon-color":
            _3dConfigurations && _3dConfigurations.selected_polygon_color
              ? _3dConfigurations.selected_polygon_color
              : "#5ca904",
          "selected-unit-color":
            _3dConfigurations && _3dConfigurations.selected_unit_color
              ? _3dConfigurations.selected_unit_color
              : "#5ca904",
          "default-polygon-opacity":
            _3dConfigurations && _3dConfigurations.default_polygon_opacity
              ? _3dConfigurations.default_polygon_opacity
              : 0.5,
          "selected-polygon-opacity":
            _3dConfigurations && _3dConfigurations.selected_polygon_opacity
              ? _3dConfigurations.selected_polygon_opacity
              : 0.8,
          "unit-color":
            _3dConfigurations && _3dConfigurations.unit_color
              ? _3dConfigurations.unit_color
              : "#202",
          "poi-color":
            _3dConfigurations && _3dConfigurations.poi_color
              ? _3dConfigurations.poi_color
              : "#008000",
          "selected-units": selected_units,
          "faded-polygon-opacity":
            _3dConfigurations && _3dConfigurations.faded_polygon_opacity
              ? _3dConfigurations.faded_polygon_opacity
              : 0.3,
          "show-unit-numbers": _3dConfigurations
            ? _3dConfigurations.show_unit_numbers
            : true,
          "hide-floors": _3dConfigurations
            ? _3dConfigurations.hide_floors
            : true,
        }
      );
    }
    renderChangedUnits();
    handleMapControl();
  } else {
    console.error("webCommunity not loaded properly");
  }

  $("#zoomable a").on("touchstart", function (e) {
    e.stopImmediatePropagation();
  });

  if (selectMap === "3d-map" && enable3DMaps) {
    _3dMapViewMarkers();
  }

  if ($(".is-webpage")[0]) {
    bindWebpageEvents();
    activateWebpageZoom();
    activateModalImageZoom();
    activateResponsiveImageModalZoom();
  }

  // Analytics
  mapContainerClickEvents();
  trackingMapClickEvents();
  trackingMapHoverEvents();
  // Analytics End

  if (
    !(
      definedAndHasValue(assetTracker) &&
      assetTracker.isWatching &&
      assetTracker.loader
    )
  )
    $(".webPageLoader").addClass("hidden");
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
    resetToDefaultZoom();
  });

  $("#unitModal").on("show.bs.modal", function (event) {
    resetToDefaultZoom();
    if (selectMap === "3d-map" && enable3DMaps) {
      _3dUnitModalDisplay();
    } else {
      setUnitModalButtons(event);
    }
  });

  $(".active-filter").click(function () {
    if ($(this).is(":checked")) {
      $(this).parent().addClass("active");
    } else {
      $(this).parent().removeClass("active");
      $("#select-all-filters-checkbox").prop("checked", false);
      $("#select-all-filters-checkbox").removeClass("active");
    }
    showMarkers();
  });

  /////////////////////////////////////////
  $(".3d-map-option").click(function () {
    selectMap = "3d-map";
    display3DMap();
  });

  $(".2d-map-option").click(function () {
    selectMap = "2d-map";
    display2DMap();
    if (defaultMapType != "3d-map") {
      showMarkers();
    }
  });

  $("#market_rent, #responsive_market_rent").change(function () {
    maxPriceFilterFilterChanged();
  });

  $("#square_feet, #responsive_square_feet").change(function () {
    squareFootageFilterChanged();
  });

  $("#unit_bedroom, #responsive_unit_bedroom").change(function () {
    bedroomFilterChanged();
  });

  $("#available_unit, #responsive_available_unit").change(function () {
    availabilityFilterChanged();
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

    showMarkers();
  });

  ///////////////////////////////////////////
  $(".floorplate-anchor").click(function (e) {
    e.stopPropagation();

    var floor_for_showing_image = $(this).attr("id");
    const $currentImageBox = $("#floorplate_" + floor_for_showing_image);

    $(".floorplate-image").parent().addClass("hidden");
    $currentImageBox.removeClass("hidden");

    if (floor_for_showing_image != current_floor) {
      $(".alert").hide();
      $("#" + floor_for_showing_image).addClass("selected");

      $currentImageBox.parent().removeClass("hidden");
      $(".digits-list-item").removeClass("selected");
      $(this).parent().addClass("selected");

      current_floor = floor_for_showing_image;
      populate_current_units();

      if ($(this).hasClass("only-amenity")) {
        $(".alert").show();
        timer = setTimeout(function () {
          $(".alert").fadeOut("slow");
        }, 2000);
      } else if ($(this).hasClass("no-units")) {
        $(".alert").show();
        clearTimeout(timeoutId);
        clearTimeout(timer);
      } else $(".alert").hide();
    }

    showMarkers();
  });

  $(".filter-label").click(function () {
    $(this).parent().find("input").click();
  });
}

function displayOverlayText() {
  let instruction = localStorage.getItem(
    `webpagesInstruction${webCommunity.id}`
  );

  if (!instruction) {
    $("#webpages-overlay").show();
  }
}

function hideOverlayText() {
  $("#webpages-overlay").hide();
  localStorage.setItem(`webpagesInstruction${webCommunity.id}`, true);
}

function _3dMapViewMarker() {
  let _3dUnitsMarketingNames = getUnitsToBeSelected();
  let cleanedNames = clean3DMarkers(_3dUnitsMarketingNames);
  return cleanedNames + "," + _3dSampleAmenities.join();
}

function getUnitsToBeSelected() {
  return _3dUnitsToBeSelected.map((a) => a.marketing_name);
}

function adjustImageMapMarkersPosition() {
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
      show = show && current_floor == marker.data("floor");
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

function activateWebpageZoom() {
  $(".reset-webpage").on("click", function (e) {
    $(".webPageLoader").removeClass("hidden");
    window.location.reload(true);
  });

  $(".zoom-in-webpage").on("click", function (e) {
    let zoomElement = null;
    const $images = $(".floorplate-image");
    const images = Array.from($images);

    for (const image of images) {
      if (isElementVisibleOnScreen(image)) {
        const key = getZoomPanKey(image.parentElement);
        zoomElement = window.mapPanZoom[key];
        break;
      }
    }
    zoomElement?.zoomInOut(187);
  });

  $(".zoom-out-webpage").on("click", function (e) {
    let zoomElement = null;
    const $images = $(".floorplate-image");
    const images = Array.from($images);

    for (const image of images) {
      if (isElementVisibleOnScreen(image)) {
        const key = getZoomPanKey(image.parentElement);
        zoomElement = window.mapPanZoom[key];
        break;
      }
    }
    zoomElement?.zoomInOut(189);
  });

  $("#zoomable-modal-image a").on("touchstart", function (e) {
    e.stopImmediatePropagation();
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

function polygonClickPopup(feature) {
  let htmlToDisplay;

  if (_3dSampleAmenities.includes(feature.properties.display_text)) {
    htmlToDisplay = amenityHTMLToDisplay(feature.properties);
  } else {
    htmlToDisplay = unitHTMLToDisplay(feature.properties);
  }

  return htmlToDisplay;
}

function unitHTMLToDisplay(unit) {
  let unitName = unit.display_text;
  let unitFloor = unit.floor;

  _3dSelectedUnit = set3DSelectedUnit(unitName, unitFloor);

  if (_3dSelectedUnit) $("#unitModal").modal("show");

  return `<strong>Name: ${unitName}</strong>`;
}

function amenityHTMLToDisplay(amenity) {
  let htmlToDisplay = amenity.display_text;

  _3dFilteredAmenity = _3dGetAmenityImageURL(amenity.display_text);

  if (
    _3dFilteredAmenity &&
    _3dFilteredAmenity.image &&
    _3dFilteredAmenity.image.url
  ) {
    $("#3DAmenityName").html(htmlToDisplay);
    $("#_3DAmenityImage").attr("src", _3dFilteredAmenity.image.url);
    $("#3DAmenityModal").modal("show");
  }

  return htmlToDisplay;
}

function _3dGetAmenityImageURL(amenityName) {
  return _3dAmenities.filter((a) => a.name === amenityName)[0];
}

function Toggle_maps(e) {
  beansWidget.toggleMap();
}

function bedroomFilterChanged() {
  filterUnitsBasedOnBedroom();
  updateDropdownListValues();
  showMarkers();
}

function maxPriceFilterFilterChanged() {
  filterUnitsBasedOnSelectedFilters();
  showMarkers();
}

function squareFootageFilterChanged() {
  filterUnitsBasedOnBedroom();
  filterUnitsBasedOnSqfeet();

  updateMaxPriceFilterDropDownList(units);
  filterUnitsBasedOnMarketRent();
  showMarkers();
}

function availabilityFilterChanged() {
  filterUnitsBasedOnBedroom();
  filterUnitsBasedOnAvailability();

  updateSquareFootageFilterDropdownList(units);
  filterUnitsBasedOnSqfeet();

  updateMaxPriceFilterDropDownList(units);
  filterUnitsBasedOnMarketRent();
  showMarkers();
}

function updateDropdownListValues() {
  updateMaxPriceFilterDropDownList(units);
  updateSquareFootageFilterDropdownList(units);
  updateAvailabilitFilterDropdownList(units);
}

function filterUnitsBasedOnSelectedFilters() {
  filterUnitsBasedOnBedroom();
  filterUnitsBasedOnSqfeet();
  filterUnitsBasedOnMarketRent();
  filterUnitsBasedOnAvailability();
}

function filterUnitsBasedOnAvailability() {
  unitAvailabilityValue =
    $("#available_unit").val() || $("#responsive_available_unit").val();

  if (unitAvailabilityValue) {
    const startingIndex = parseInt(unitAvailabilityValue.split("-")[0]);
    const endIndex = parseInt(unitAvailabilityValue.split("-")[1]);
    units = filterUnitsBasedOnDate(units, startingIndex, endIndex);
  }
}

function filterUnitsBasedOnDate(floorplateUnits, startIndex, endIndex) {
  const today = new Date();
  const currentDay = new Date(today).setDate(today.getDate() + 0);
  const startDay = new Date(today).setDate(today.getDate() + startIndex);
  const endDay = new Date(today).setDate(today.getDate() + endIndex);
  floorplateUnits = filterUnitsBasedOnCommunityType(floorplateUnits);

  if (!startDay && !startDay)
    floorplateUnits = floorplateUnits.filter(
      (unit) => new Date(unit.available_date) <= currentDay
    );

  if (startDay)
    floorplateUnits = floorplateUnits.filter(
      (unit) => new Date(unit.available_date) >= startDay
    );

  if (endDay)
    floorplateUnits = floorplateUnits.filter(
      (unit) => new Date(unit.available_date) <= endDay
    );

  return floorplateUnits;
}

function filterBasedOnScreen(filterTag) {
  const webFilterId = "#".concat(filterTag); //works on web view
  const mobileFilterId = "#responsive_".concat(filterTag); //works on mobile view

  if (current_width <= 993) {
    return parseInt($(mobileFilterId).val());
  } else return parseInt($(webFilterId).val());
}

function filterUnitsBasedOnSqfeet() {
  const sqFeet = filterBasedOnScreen("square_feet");

  if (sqFeet) units = units.filter((unit) => unit.square_feet >= sqFeet);
}

function filterUnitsBasedOnMarketRent() {
  const marketRent = filterBasedOnScreen("market_rent");

  if (marketRent)
    units = units.filter((unit) => unit.market_rent <= marketRent);
}

function filterUnitsBasedOnBedroom() {
  $(".alert").hide();

  units = total_units;
  const unitBedroom = filterBasedOnScreen("unit_bedroom");

  if (unitBedroom || unitBedroom === 0)
    units = units.filter((unit) => unit.bedrooms == unitBedroom);
}

function updateAvailabilitFilterDropdownList() {
  reInitializeDropDownList("available_unit");

  const unitsAvailableNow = filterUnitsBasedOnDate(units, NaN, NaN);
  const unitsAvailableUnder30Days = filterUnitsBasedOnDate(units, 0, 30);
  const unitsAvailableUnder60Days = filterUnitsBasedOnDate(units, 31, 60);
  const unitsAvailableUnder90Days = filterUnitsBasedOnDate(units, 61, 90);
  const unitsAvailableUnder120Days = filterUnitsBasedOnDate(units, 91, 120);

  const webFilterId = "#".concat("available_unit"); //works on web view
  const mobileFilterId = "#responsive_".concat("available_unit"); //works on mobile view

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

  if (units_availability_over_120_days === "true") {
    const unitsAvailableAbove121Days = filterUnitsBasedOnDate(units, 121, NaN);
    if (unitsAvailableAbove121Days && unitsAvailableAbove121Days.length > 0) {
      $(webFilterId).append(`<option value="121-"> In 121+ days </option>`);
      $(mobileFilterId).append(`<option value="121-"> In 121+ days </option>`);
    }
  }
}

function updateSquareFootageFilterDropdownList(floorplateUnits) {
  floorplateUnits = filterUnitsBasedOnCommunityType(floorplateUnits);
  var unitsSqFeet = floorplateUnits.map((unit) => unit.square_feet);
  var uniqueList = getUniqueAndSortedListSquareFeet(unitsSqFeet);
  var maxValue = Math.max(...uniqueList);

  reInitializeDropDownList("square_feet");

  for (var i = 0; i < uniqueList.length; i++) {
    $("#square_feet").append(
      `<option value="${uniqueList[i]}"> ${uniqueList[i]} </option>`
    ); //works on web view
    $("#responsive_square_feet").append(
      `<option value="${uniqueList[i]}"> ${uniqueList[i]} </option>`
    ); //works on mobile view
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

function updateMaxPriceFilterDropDownList(floorplateUnits) {
  if (display_rent === "false") return;

  floorplateUnits = filterUnitsBasedOnCommunityType(floorplateUnits);
  var unitsMarketRent = floorplateUnits.map((unit) => unit.market_rent);
  var uniqueList = getUniqueAndSortedListMarketRent(unitsMarketRent);
  var minValue = Math.min(...uniqueList);

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

function filterUnitsBasedOnCommunityType(floorplateUnits) {
  if (hasFloorplate()) {
    floorplateUnits = floorplateUnits.filter(
      (unit) => unit.floor == current_floor
    );
  }

  return floorplateUnits;
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

  if (!(filter == "square_feet" || filter == "market_rent")) {
    $(webFilterId).append(`<option value=""> All </option>`); //works on web view
    $(mobileFilterId).append(`<option value=""> All </option>`); //works on mobile view
  }
}

function showMarkers() {
  $(".marker").addClass("hidden");
  $(".hidden-units").empty();

  const unitsToDisplay = filterUnitsBasedOnCommunityType(units);

  renderChangedUnits();
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

  if (svgMode) {
    setSVGUnitsAmenitiesCoordinates();
  } else {
    adjustImageMapMarkersPosition();
  }

  setMarkersSizeAndMargin();
  disabled_enabled_anchors();
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

function populate_current_units() {
  $(".marker").addClass("hidden");
  current_units = [];

  if (hasFloorplate()) {
    $(".amenity-marker").addClass("hidden"); // first hidding all amenity markers
    $(".a_" + current_floor).removeClass("hidden"); // showing amenity markers on current floorplate
    updateDropdownListValues();

    for (var i = 0; i < units.length; i++) {
      if (units[i]["floor"] == current_floor) {
        current_units.push(units[i]);
      }
    }
  } else {
    for (var i = 0; i < units.length; i++) {
      current_units.push(units[i]);
    }
  }

  showMarkers();
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
  modalPanZoom.zoomAbs(0, 0, 1);
  modalPanZoom.moveTo(0, 0);

  // for mobile
  responsiveModalPanZoom.zoomAbs(0, 0, 1);
  responsiveModalPanZoom.moveTo(0, 0);
}

function click_marker_tag(unitId, { pointerId, selector } = {}) {
  const markersSelector = svgMode ? ".cloned-unit" : ".unit_marker";

  if (svgMode) {
    unitId = parseInt(unitId.replace("unit_", ""));
  } else {
    unitId = unitId.replace("unit_", "s_");
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

function renderChangedUnits() {
  var element = document.getElementById("units-body");

  if (element == null) return;
  element.innerHTML = "";

  filtered_units = filterUnitsBasedOnCommunityType(units);

  sortType = document.getElementById("filter");
  floorUnits = getFilteredUnits(filtered_units, sortType.value);
  document.getElementById("unit-title-count").innerHTML =
    floorUnits.length + " " + "Units Found";
  filtered_units.forEach((unit) => {
    var unit_details_div = `
      <div
        class='left-side-30-units'
        id='unit_${unit["id"]}'
        data-pointer-data='${JSON.stringify(unit["pointer_data"])}'
        data-unit-marketing-name='${
          unit["data_attributes"]["data-unit-marketing-name"]
        }'
      >
        <div class='image-styles'>
          <a class='image_link'
            href='#'
            id="s_${unit["id"]}"
            onClick=onUnitClick(event)
          >
            <img src=${unit["floorplan_image"]} class='image-image-styles' />
          </a>
        </div>
        <div class='unit-details-section'>
          <p id='unit-detail-market-title'>
            Unit # ${
              webCommunity &&
              webCommunity["is_sitemap"] &&
              !webCommunity["display_building"]
                ? unit["marketing_name"]
                : unit["building"]
                ? unit["building"] + "-" + unit["marketing_name"]
                : unit["marketing_name"]
            }
          </p>
        </div>
        <div class='unit-details-section'>
          <p>
            <i class='fa.fa-bed'> &nbsp ${unit["bedrooms"]} Bed </i>
          </p>
          <p>
            <i class='fa.fa-bath'> &nbsp ${unit["bathrooms"]} Bath </i>
          </p>
          <p>
            <i class='fa.fa-building'> &nbsp ${unit["square_feet"]} Sq Ft </i>
          </p>
        </div>
        <div class='unit-details-section'>
          <p id='right-bar-unit-availability'>
            ${get_unit_availability(unit)}
          </p>
          <p>
            ${unitMarketRent(unit)}
          </p>
        </div>
      </div>
    `;

    element.innerHTML += unit_details_div;
  });

  unitListHover();
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

function openAmenityViewerModal(amenity, galleries) {
  selectedAmenity = amenity;
  selectedGalleries = galleries;
  $(`#amenitySliderModal-${amenity.id}`).modal("show");
  bindCarousel(amenity.id);
}

function closeAmenityViewerModal(amenityID) {
  selectedAmenity = null;
  selectedGalleries = [];
  $(`#amenitySliderModal-${amenityID}`).modal("close");
  unbindCarousel(amenityID);
}

function onUnitClick(e) {
  const { id } = getUnitData(e.target);
  click_marker_tag(id);
}

function unitMarketRent(unit) {
  return unit["display_rent"] ? `${currency + unit["market_rent"]}/month` : "";
}

function unitListHover() {
  let focused_marker;

  $("div.left-side-30-units").hover(
    function (e) {
      const { id, pointerData, unitMarketingName } = getUnitData(e.target);
      const markersSelector = svgMode ? "cloned-unit" : "marker";
      const $scope = $(currentVisibleMapImage()?.parentElement);
      const $allMarkers = $scope.find(`.${markersSelector}`);
      const markersArray = Array.from($allMarkers);

      e.currentTarget.style.border = `3px solid ${map_marker_color}`;

      markersArray.forEach((marker) => {
        const matchCondition =
          id === `unit_${marker.dataset.unitId}` ||
          `${pointerData.id}_cloned` === marker.id ||
          pointerData.selector === marker.id;
        if (
          svgMode
            ? isVisibleSVGElement(marker) && matchCondition
            : matchCondition
        ) {
          let selectedMarker = marker;
          if (selectedMarker.classList.contains("overlapping-unit")) {
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

          focused_marker = document.getElementById(selectedMarker.id);
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
            const markerIcon = selectedMarker.firstChild;
            const rect = markerIcon.getBoundingClientRect();
            leftAdjustment += 0;
            topAdjustment += rect.height;
          }

          left = left - leftAdjustment;
          top = top - topAdjustment;

          $markerPopover.css({
            visibility: "visible",
            left: `${left}px`,
            top: `${top}px`,
          });
        }
      });
    },
    function (e) {
      e.currentTarget.style.border = "none";
      if (focused_marker) {
        $("#marker-popover-unit").addClass("hidden");
      }
    }
  );
}

function markerHoverEffect(event) {
  let $this = $(event.currentTarget);

  if (svgMode && event.currentTarget.tagName.toLowerCase() === "g") {
    const lastClonedElement = getLastClonedJQueryElement(event.currentTarget);
    if (
      !lastClonedElement ||
      lastClonedElement.classList.contains("cloned-amenity")
    )
      return;

    $this = $(lastClonedElement);
  }

  if ($this.data("is-fav") || favoritesArr.includes($this.data("unit-id"))) {
    $(".fav-heart").removeClass("hidden");
  } else {
    $(".fav-heart").addClass("hidden");
  }
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

  if ($this.data("sold")) {
    $("#popover-available-date").html("");
    $("#hover-available-text").html("Sold");
  } else {
    $("#hover-available-text").html("Available");
    // $('#popover-available-date').html($this.data('available-date'));
    $("#popover-available-date").html(
      formattedDateByRegion(
        webCommunity.country_code,
        $this.data("available-date")
      )
    );
  }

  $("#popover-price").html(currency + $this.data("market-rent"));

  const unitElement = document.getElementById("unit_" + $this.data("unitId"));
  const scrollableParent = document.querySelector(".left-side");

  if (unitElement && scrollableParent) {
    const parentHeight = scrollableParent.clientHeight;
    const elementHeight = unitElement.clientHeight;
    const scrollTop =
      unitElement.offsetTop -
      scrollableParent.offsetTop -
      parentHeight / 2 +
      elementHeight / 2;

    scrollableParent.scrollTo({
      top: scrollTop,
      behavior: "smooth",
    });
  }

  const $container = svgMode ? $("#svg-container") : $("#image-container");
  var new_dx =
    parseInt(event.pageX) -
    parseInt($container.offset().left) +
    parseInt($container.scrollLeft());
  var new_dy =
    parseInt(event.pageY) -
    parseInt($container.offset().top) +
    parseInt($container.scrollTop());

  const diffLeft = webCommunity["is_sitemap"] ? 25 : 115;
  $("#marker-popover").css({
    left: new_dx + diffLeft + "px",
    top: new_dy - 100 + "px",
  });
  if (window.innerWidth >= 768) {
    $("#marker-popover").removeClass("hidden");
  }
  $($("#unit_" + $this.data("unitId"))).css(
    "border",
    `5px solid ${map_marker_color}`
  );
}

function markerHoverEffectEnd(event) {
  let $this = $(event.currentTarget);
  if (svgMode && event.currentTarget.tagName.toLowerCase() === "g") {
    const lastClonedElement = getLastClonedJQueryElement(event.currentTarget);
    if (
      !lastClonedElement ||
      lastClonedElement.classList.contains("cloned-amenity")
    )
      return;

    $this = $(lastClonedElement);
  }

  $("#marker-popover").addClass("hidden");
  $($("#unit_" + $this.data("unitId"))).css("border", "none");
}

function unitMarkerHover() {
  $(".marker").hover(markerHoverEffect, markerHoverEffectEnd);
  $(".cloned-unit").hover(markerHoverEffect, markerHoverEffectEnd);
}

function getUnitData(targetElement) {
  if (targetElement.classList.contains("left-side-30-units")) {
    return {
      id: targetElement.id,
      pointerData: JSON.parse(targetElement.dataset.pointerData) || {},
      unitMarketingName: targetElement.dataset.unitMarketingName,
    };
  } else {
    let closestUnit = $(targetElement).closest(".left-side-30-units");

    if (closestUnit.length > 0) {
      return {
        id: closestUnit[0].id,
        pointerData: JSON.parse(closestUnit[0].dataset.pointerData) || {},
        unitMarketingName: closestUnit[0].dataset.unitMarketingName,
      };
    } else {
      return { id: null, pointerData: {}, unitMarketingName: null };
    }
  }
}

function setUnitModalButtons(event) {
  const $unitButtons = $(".unit-buttons");
  $unitButtons.empty();
  $unitButtons.addClass("hidden");

  const relatedTarget = event.relatedTarget;
  const $relatedTarget = $(relatedTarget);
  const relatedTargetSelector = relatedTarget.id.replace("_cloned", "");

  if (svgMode) {
    const filteredUnits = units.filter(
      ({ floor, pointer_data: { id, selector } = {} }) =>
        (id === relatedTargetSelector || selector === relatedTargetSelector) &&
        (!hasFloorplate() || parseInt(current_floor) === floor)
    );

    if (filteredUnits.length > 1) {
      filteredUnits.forEach(function (unit) {
        if (hasFloorplate() && unit.floor != parseInt(current_floor)) {
          return;
        }

        result = "";
        for (const key in unit.data_attributes) {
          result = `${result} ${key}="${unit.data_attributes[key]}"`;
        }

        if (unit.id === parseInt(relatedTarget.dataset.unitId)) {
          button_style = "btn-primary";
        } else {
          button_style = "btn-default";
        }

        $unitButtons.removeClass("hidden");
        $unitButtons.append(
          '<button class="btn modal-unit-button ml-5 ' +
            button_style +
            '" type="button" ' +
            result +
            ' onclick="setUnitAttributes(this, event)">' +
            unit.data_attributes["data-title"] +
            "</button>"
        );
      });
    }

    setModalAttributes(relatedTarget);
    return;
  }

  const unitXPlot = $relatedTarget.data("unit-x-plot");
  const unitYPlot = $relatedTarget.data("unit-y-plot");

  const $hiddeUnitElements = $(".h-" + unitXPlot + "-" + unitYPlot);
  if ($hiddeUnitElements.length > 1) {
    $hiddeUnitElements.each(function () {
      const targetId = $relatedTarget.attr("id");
      const $this = $(this);
      const underneathUnitId = $this.data().unitId;
      let buttonStyle = "";

      if (parseInt(targetId.split("_")[1]) == underneathUnitId) {
        buttonStyle = "btn-primary";
      } else {
        buttonStyle = "btn-default";
      }
      $unitButtons.removeClass("hidden");
      $unitButtons.append(
        '<button class="btn modal-unit-button ml-5 ' +
          buttonStyle +
          '" type="button" data-title="' +
          $this.data("title") +
          '" data-community-id="' +
          $this.data("community-id") +
          '" data-unit-id="' +
          $this.data("unit-id") +
          '" data-is-fav="' +
          $this.data("is-fav") +
          '" data-provider="' +
          $this.data("provider") +
          '" data-website="' +
          $this.data("website") +
          '" data-community-property-id="' +
          $this.data("community-property-id") +
          '" data-unit-provider-id="' +
          $this.data("unit-provider-id") +
          '" data-floorplan-provider-id="' +
          $this.data("floorplan-provider-id") +
          '" data-floorplan-name="' +
          $this.data("floorplan-name") +
          '" data-unit-description="' +
          $this.data("unit-description") +
          '" data-unit-marketing-name="' +
          $this.data("unit-marketing-name") +
          '" data-market-rent="' +
          $this.data("market-rent") +
          '" data-square-feet="' +
          $this.data("square-feet") +
          '" data-availability="' +
          $this.data("availability") +
          '" data-available-date="' +
          $this.data("available-date") +
          '" data-availability-url="' +
          $this.data("availability-url") +
          '" data-bedrooms="' +
          $this.data("bedrooms") +
          '" data-bathrooms="' +
          $this.data("bathrooms") +
          '" data-floorplan-image="' +
          $this.data("floorplan-image") +
          '" data-lease-term="' +
          $this.data("lease-term") +
          '" data-unit-lease-pricing="' +
          $this.data("unit-lease-pricing") +
          '" data-unit-additional-fees="' +
          $this.data("unit-additional-fees") +
          '" onclick="setUnitAttributes(this, event);">' +
          $this.data("title") +
          "</button>"
      );
    });
  }

  setModalAttributes(relatedTarget);
}

function hasTouch() {
  return (
    "ontouchstart" in document.documentElement ||
    navigator.maxTouchPoints > 0 ||
    navigator.msMaxTouchPoints > 0
  );
}

function disabled_enabled_anchors() {
  var min_market_rent = 100000;
  var max_area = 0;
  for (var i = 0; i < floors.length; i++) {
    var floorplate_units = [];

    if (floors[i] == current_floor) {
      $("#" + floors[i]).addClass("selected");
    } else {
      $("#" + floors[i]).removeClass("selected");
    }

    for (let j = 0; j < units.length; j++) {
      if (units[j]["floor"] == floors[i]) {
        floorplate_units.push(units[j]);
      }
    }

    var floorplate_amenities = [];
    for (let j = 0; j < amenities.length; j++) {
      if (amenities[j]["floor"] == floors[i]) {
        floorplate_amenities.push(amenities[j]);
      }
    }

    const unitToDisplay = filterUnitsBasedOnCommunityType(units);
    if (unitToDisplay.length == 0 && floorplate_amenities.length != 0) {
      $("#" + floors[i]).addClass("only-amenity");
      if ($("#" + floors[i]).hasClass("selected")) {
        $(".alert").show();
        timer = setTimeout(function () {
          $(".alert").fadeOut("slow");
        }, 2000);
      }
    } else if (unitToDisplay.length == 0 && floorplate_amenities.length == 0) {
      $("#" + floors[i]).addClass("no-units");
      if ($("#" + floors[i]).hasClass("selected")) {
        $(".alert").show();
        clearTimeout(timeoutId);
      }
    } else {
      $("#" + floors[i]).removeClass("no-units");
      $("#" + floors[i]).removeClass("only-amenity");
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
    $("#u_" + floors[i]).html(
      filtered_floorplate_units.length.toString() + str
    );
  }
  $("#" + floors[0])
    .parent()
    .css("border-top", "1px solid #2b3537");
  if (floors.length > 0) {
    disable_rent_filter_options(min_market_rent);
    disable_area_filter_options(max_area);
    if ($(window).width() <= 993 && $(window).width() >= 568) {
      $(".mobile-filter-mega-menu").addClass("filters-alignment");
    }
  } else {
    $(".custom-iframe-modeule").addClass("sitemap");
    if (units.length == 0 && amenities.length != 0) {
      $(".alert").show();
      timer = setTimeout(function () {
        $(".alert").fadeOut("slow");
      }, 2000);
    } else if (units.length == 0 && amenities.length == 0) {
      $(".alert").show();
      clearTimeout(timeoutId);
    } else {
      $(".alert").hide();
    }
  }
}

function change_units_view(evt, type) {
  if (type === "list_view") {
    const plusIcon = document.getElementsByClassName(
      "zoom-controls zooming-content-h"
    )?.[0];
    if (plusIcon) {
      plusIcon.style.visibility = "hidden";
    }

    const minusIcon = document.getElementsByClassName(
      "zoom-controls zooming-content-h"
    )?.[1];
    if (minusIcon) {
      minusIcon.style.visibility = "hidden";
    }

    $(".c-footer").hide();
  } else {
    const plusIcon = document.getElementsByClassName(
      "zoom-controls zooming-content-h"
    )?.[0];
    if (plusIcon) {
      plusIcon.style.visibility = "visible";
    }

    const minusIcon = document.getElementsByClassName(
      "zoom-controls zooming-content-h"
    )?.[1];
    if (minusIcon) {
      minusIcon.style.visibility = "visible";
    }

    $(".c-footer").show();
    if (smallScreen()) {
      $(".c-footer").css({
        display: "flex",
        "justify-content": "center",
      });
    }
  }

  var i, tabcontent, tablinks;
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
    const $unitsListContainer = $webpageMainContainer.find(".left-side");
    const unitListContainerWidth = $unitsListContainer
      .find(".left-side-title")
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
  } else {
    moveZoomableImageToCenter(currentMapImage());
    adjustImageMapMarkersPosition();
  }
}

function set_yardirentcafe_url(element) {
  // var url = $(element).data('availability-url');
  let url = element.getAttribute("data-availability-url");

  if (selectMap === "3d-map" && enable3DMaps) {
    url = _3dSelectedUnit.availability_url;
  }

  window.open(url, "_blank");
}

function set_psi_url(element) {
  let url = element.getAttribute("data-availability-url");

  if (selectMap === "3d-map" && enable3DMaps) {
    url = _3dSelectedUnit.availability_url;
  }

  window.open(url, "_blank");
}

function set_resman_url(element) {
  setApplyNowURLDate(currentUnitSelected);
  leaseTerm = $("#unitModal").find("#lease_term").val().split(" months")[0];
  date = new Date($("#leasing-start-date").val());
  var url =
    element.getAttribute("data-availability-url") +
    "&leaseTerm=" +
    leaseTerm +
    "&moveInDate=" +
    date.toISOString().split("T")[0];

  if (selectMap === "3d-map" && enable3DMaps) {
    date = new Date();
    url =
      _3dSelectedUnit.availability_url +
      "&leaseTerm=" +
      _3dSelectedUnit.lease_term +
      "&moveInDate=" +
      date.toISOString().split("T")[0];
  }

  window.open(url, "_blank");
}

function set_realpagesvc_url(element) {
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

  if (selectMap === "3d-map" && enable3DMaps) {
    apply_now_url = `/communities/${webCommunity.id}/webpages/apply_now`;
    redirect_url = `/communities/${webCommunity.id}/webpages`;
    date = new Date();
    real_page_provider_unit_id = parseInt(
      _3dSelectedUnit.provider_unit_id.split("-")[0]
    );
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
  for (var i = 1; i < select.length; i++) {
    var option = select.options[i];
    var option_area = option.value.split("-");
    var minimum_option_rent = parseFloat(option_area[0]);
    if (max_area <= minimum_option_rent)
      $("#square_feet option[value=" + option.value + "]").show();
    else $("#square_feet option[value=" + option.value + "]").show();
  }
}

function canShowAdditionalFees(additional_fees) {
  return (
    additional_fees == "" ||
    additional_fees == undefined ||
    additional_fees == "undefined"
  );
}

function unitAdditionalFees(additional_fees) {
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
  if ($(".m-filters").css("display") === "none") {
    $("#overall-scroller").css({
      height: "25em",
      "max-height": "25em",
      "overflow-y": "auto",
    });
  } else {
    $("#overall-scroller").css({
      height: "18em",
      "max-height": "25em",
      "overflow-y": "auto",
    });
  }
}

function setModalAttributes(element) {
  currentUnitSelected = element;

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

  unitAdditionalFees($(element).data("unit-additional-fees"));
  addVirtualTour(element);

  $("#unitModal")
    .find("#unit-marketing-name")
    .html($(element).data("unit-marketing-name"));
  $("#unitModal")
    .find("#floorplan-name")
    .html($(element).data("floorplan-name"));
  $("#unitModal").find("#square-feet").html($(element).data("square-feet"));
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

  if ($(element).data("sold")) {
    $("#unitModal").find("#availability").html("Sold");
    $("#unitModal").find("#available-date").html("");
    $("#unitModal").find("#available-text").html("Unavailable");
  } else {
    if ($(element).data("available")) {
      $("#unitModal").find("#availability").html("Available");
      $("#unitModal").find("#available-text").html("Available");

      // $('#unitModal').find('#available-date').html($(element).data('available-date'));
      $("#available-date").html(
        formattedDateByRegion(
          webCommunity.country_code,
          $(element).data("available-date")
        )
      );
    } else {
      $("#unitModal")
        .find("#availability")
        .html(
          $(element).data("availability") == "Unoccupied"
            ? "Available"
            : "Occupied"
        );
      $("#unitModal").find("#available-text").html("Available");

      // $('#unitModal').find('#available-date').html($(element).data('available-date'));
      $("#unitModal").find(
        $("#available-date").html(
          formattedDateByRegion(
            webCommunity.country_code,
            $(element).data("available-date")
          )
        )
      );
    }
  }

  $("#unitModal")
    .find("#market-rent")
    .html(currency + $(element).data("market-rent"));
  $("#unitModal")
    .find("#total-market-rent")
    .html(currency + $(element).data("market-rent"));

  ///////////////////////////////////////////
  real_page_provider_unit_id = $(element).data("unit-provider-id");
  var unit_id = $(element).data("unit-id");
  selectedUnit = units.filter((a) => a.id === $(element).data("unit-id"))[0];
  if (
    $(element).data("is-fav") ||
    favoritesArr.includes($(element).data("unit-id"))
  ) {
    var community_id = $(element).data("community-id");
    var url =
      "/communities/" +
      community_id +
      "/webpages/delete_favorite?unit_id=" +
      unit_id;
    var html =
      '<a href="' +
      url +
      '" data-remote="true"><i class="fa fa-heart"></i></a>';
    $("#fav-icon-tag").html(html);
  } else {
    var community_id = $(element).data("community-id");
    var url =
      "/communities/" +
      community_id +
      "/webpages/save_favorite?unit_id=" +
      unit_id;
    var html =
      '<a href="' +
      url +
      '" data-remote="true"><i class="far fa-heart"></i></a>';
    $("#fav-icon-tag").html(html);
  }
  $("#fav-icon-tag a")
    .unbind("click")
    .bind("click", function (e) {
      var unit_id = $(element).data("unit-id");
      if (favoritesArr.indexOf(unit_id) === -1) {
        favoritesArr.push(unit_id);
      } else {
        var favIndex = favoritesArr.indexOf($(element).data("unit-id"));
        favoritesArr.splice(favIndex, 1);
      }
    });
  /////////////////////////////////////////
  if ($(element).data("floorplan-image") != "") {
    $("#unitModal")
      .find("#floorplan-image")
      .attr("src", $(element).data("floorplan-image"));
    $("#unitModal")
      .find("#responsive-floorplan-image")
      .attr("src", $(element).data("floorplan-image"));
    if (
      current_width > 767 &&
      $(element).data("floorplan-image") != "/assets/default.jpeg"
    ) {
      $(".c-modal-sidebar-filters").addClass("c-modal-sidebar-filters-bottom");
      $(".c-m-iframe-content").addClass("c-m-iframe-content-bottom");
    }
  } else {
    $("#unitModal")
      .find("#floorplan-image")
      .attr("src", "/assets/default.jpeg");
    $("#unitModal")
      .find("#responsive-floorplan-image")
      .attr("src", $(element).data("floorplan-image"));
  }

  setApplyNowURLDate(element);
  var dataProvider = $(element).data("provider");
  //////////////////////////////////////////
  if (dataProvider != "realpagesvc") {
    var website = $(element).data("website");
    var uri = website.replace(/^https?\:\/\//, "");
    $("#psi-anchor-tag").attr(
      "data-community-property-id",
      $(element).data("community-property-id")
    );
    $("#psi-anchor-tag").attr("data-website", website);
    $("#psi-anchor-tag").attr("data-uri", uri);
    $("#psi-anchor-tag").attr(
      "data-unit-provider-id",
      $(element).data("unit-provider-id")
    );
    $("#psi-anchor-tag").attr(
      "data-floorplan-provider-id",
      $(element).data("floorplan-provider-id")
    );
    $("#psi-anchor-tag").attr("data-lease-term", $(element).data("lease-term"));
    $("#psi-anchor-tag").attr(
      "data-availability-url",
      element.getAttribute("data-availability-url")
    );
  } else if (dataProvider === "realpagesvc") {
    $("#realpagesvc-anchor-tag").attr(
      "data-unit-provider-id",
      $(element).data("unit-provider-id")
    );
  }

  if (dataProvider == "yardi" || dataProvider == "yardirentcafe") {
    // $('#floorplan-image').css({"max-width": 310});
    $(".c-modal-footer").css({ "padding-bottom": 7 });
    $(".m-filters").hide();
  }

  handleApplyNowButtonVisibility(element);
  adjustHeightForContentArea();
}

function handleApplyNowButtonVisibility(element) {
  const url = element.getAttribute("data-availability-url");
  const dataProvider = $(element).data("provider");

  if (dataProvider === "psi") {
    if (url) $("#psi-anchor-tag").show();
    else $("#psi-anchor-tag").hide();
  }
}

function setApplyNowURLDate(element) {
  $("#leasing-start-date").datepicker(
    "setDate",
    new Date($(element).data("available-date"))
  );
  // $('#leasing-start-date').datepicker('option', {dateFormat: 'mm/dd/yy', minDate: new Date(), maxDate: new Date() })
  $("#leasing-start-date").datepicker("option", {
    dateFormat: "mm/dd/yy",
    minDate:
      $(element).data("available-date") == "Now"
        ? new Date()
        : new Date($(element).data("available-date")),
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

function addVirtualTour(element) {
  removeFrame();
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
    addFrame(url);
  } else {
    $(".virtual-tour-btn").css("display", "none");
  }
}

function removeFrame() {
  $("#virtual-tour-ifram-container").empty();
}

function addFrame(src) {
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

function _3dUnitModalDisplay() {
  $("#unitModal")
    .find("#unit-marketing-name")
    .html(_3dSelectedUnit.marketing_name);
  $("#unitModal").find("#floorplan-name").html(_3dSelectedUnit.floorplan_name);
  $("#unitModal").find("#square-feet").html(_3dSelectedUnit.square_feet);
  $("#unitModal").find("#bathrooms").html(_3dSelectedUnit.bathrooms);

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
  $("#unitModal").find("#bedrooms").html(_3dSelectedUnit.bedrooms);
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

  if (_3dSelectedUnit.sold) {
    $("#unitModal").find("#availability").html("Sold");
    $("#unitModal").find("#available-date").html("");
    $("#unitModal").find("#available-text").html("Unavailable");
  } else {
    if (_3dSelectedUnit.available) {
      _3dDate = _3dSelectedUnit.available_date.split("-");
      $("#unitModal").find("#availability").html("Available");
      $("#unitModal").find("#available-text").html("Available");

      // $('#unitModal').find('#available-date').html(`${_3dDate[2]}/${_3dDate[1]}/${_3dDate[0]}`);
      $("#unitModal").find(
        $("#available-date").html(
          formattedDateByRegion(
            webCommunity.country_code,
            _3dSelectedUnit.available_date
          )
        )
      );
    } else {
      $("#unitModal")
        .find("#availability")
        .html(
          _3dSelectedUnit.availability == "Unoccupied"
            ? "Available"
            : "Occupied"
        );
      $("#unitModal").find("#available-text").html("Available");
      // $('#unitModal').find('#available-date').html(_3dSelectedUnit.available_date);
      $("#unitModal").find(
        $("#available-date").html(
          formattedDateByRegion(
            webCommunity.country_code,
            _3dSelectedUnit.available_date
          )
        )
      );
    }
  }
  $("#unitModal")
    .find("#market-rent")
    .html(currency + _3dSelectedUnit.market_rent);
  $("#unitModal")
    .find("#total-market-rent")
    .html(currency + _3dSelectedUnit.market_rent + ".00");

  if (!_3dSelectedUnit.is_fav) {
    var community_id = webCommunity.id;
    var unit_id = _3dSelectedUnit.id;
    var url =
      "/communities/" +
      community_id +
      "/webpages/save_favorite?unit_id=" +
      unit_id;
    var html =
      '<a href="' +
      url +
      '" data-remote="true"><i class="far fa-heart"></i></a>';
    $("#fav-icon-tag").html(html);
  } else {
    var community_id = webCommunity.id;
    var unit_id = _3dSelectedUnit.id;
    var url =
      "/communities/" +
      community_id +
      "/webpages/delete_favorite?unit_id=" +
      unit_id;
    var html =
      '<a href="' +
      url +
      '" data-remote="true"><i class="fa fa-heart"></i></a>';
    $("#fav-icon-tag").html(html);
  }

  $("#unitModal")
    .find("#floorplan-image")
    .attr("src", _3dSelectedUnit.floorplan_image);

  if (webCommunity.data_provider != "realpagesvc") {
    var website = webCommunity.website;
    var uri = website.replace(/^https?\:\/\//, "");
    $("#psi-anchor-tag").attr(
      "data-community-property-id",
      _3dSelectedUnit.community_property_id
    );
    $("#psi-anchor-tag").attr("data-website", website);
    $("#psi-anchor-tag").attr("data-uri", uri);
    $("#psi-anchor-tag").attr(
      "data-unit-provider-id",
      _3dSelectedUnit.provider_unit_id
    );
    $("#psi-anchor-tag").attr(
      "data-floorplan-provider-id",
      _3dSelectedUnit.provider_floorplan_id
    );
    $("#psi-anchor-tag").attr("data-lease-term", _3dSelectedUnit.lease_term);
    $("#psi-anchor-tag").attr(
      "data-availability-url",
      _3dSelectedUnit.availability_url
    );
    $("#leasing-start-date").datepicker(
      "setDate",
      new Date(`${_3dDate[2]}/${_3dDate[1]}/${_3dDate[0]}`)
    );
    $("#leasing-start-date").datepicker("option", {
      dateFormat: "mm/dd/yy",
      minDate: new Date(`${_3dDate[2]}/${_3dDate[1]}/${_3dDate[0]}`),
    });
  } else if (webCommunity.data_provider === "realpagesvc") {
    $("#realpagesvc-anchor-tag").attr(
      "data-unit-provider-id",
      _3dSelectedUnit.provider_unit_id
    );
  }

  if (_3dSelectedUnit.lease_pricing) {
    $("#unit-lease-pricing-text-li").show();
    ss = _3dSelectedUnit.lease_pricing.split(";");
    leaseTermPricingOptions(ss);
  } else {
    $("#unit-lease-pricing-text-li").hide();
  }

  if (_3dSelectedUnit.description) {
    $("#unitModal").find("#unit-description").html(_3dSelectedUnit.description);
  } else {
    $("#unitModal").find("#unit-description").html("Not Available");
  }

  unitAdditionalFees(_3dSelectedUnit.additional_fees);
}

function leaseTermPricingOptions(ss) {
  var lease = [];
  let first_lease_item = "";
  let smallest_lease_month = "";
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

function getElementHeight(element) {
  var height = $(element).outerHeight();

  return height;
}

function _3dMapViewMarkers() {
  let _3dUnitsMarketingNames = getUnitsMarketingNames();
  let cleanedNames = clean3DMarkers(_3dUnitsMarketingNames);
  if (cleanedNames.length > 0)
    _3dFilterByUnits(cleanedNames + "," + _3dSampleAmenities.join());
  else _3dFilterByUnits(cleanedNames);
}

function clean3DMarkers(unit_names) {
  return (unit_names || []).map((a) => a.substr(0, 3)).join();
}

function getUnitsMarketingNames() {
  return (_3dFilteredUnits || []).map((a) => a.marketing_name);
}

function set3DSelectedUnit(unitName, floor) {
  return (_3dFilteredUnits || []).filter(
    (a) => a.marketing_name.substr(0, 3) === unitName
  )[0];
}

function handleMapControl() {
  if (selectMap === "3d-map" && enable3DMaps) {
    display3DMap();
    displayOverlayText();
  } else if (!communityInactivated) display2DMap();
}

function display3DMap() {
  $("._3d-apply-filter-button").css("display", "block");
  $(".beans-map-container").show();
  $(".zooming-content").css("float", "right");
  image_width_2d = parseInt($(".floorplate-image").width());
  $(".image-map").hide();
  $(".zoom-in-webpage").hide();
  $(".zoom-out-webpage").hide();
  $("#image-container").css("width", "100%");
  // $(".location-items").hide();
  $(".c-footer").css("margin-left", "0px");
  $(".desktop-content").hide();
  $(".2d-map-option").removeClass("hidden");
  $(".3d-map-option").addClass("hidden");
  $(".satelite-view-icon").removeClass("hidden");
  $(".div.map-instruction-text").removeClass("hidden");
  // display3DMapInstructions();
  // let windowWidth = window.innerWidth;
  // let footerWidth = document.getElementById("footer");
  // let sideBarWidth = $(".c-sidebar").innerWidth();
  // if ($(window).width() <= 567) {
  //   footerWidth.style.bottom = "140px";
  //   $(".map-instruction-text").hide();
  //   $(".beans-map-container").css("width", windowWidth);
  //   footerWidth.style.width = windowWidth;
  // } else if (windowWidth >= 567 && windowWidth <= 991) {
  //   $(".map-instruction-text").hide();
  //   let mapWidth = windowWidth - sideBarWidth;
  //   footerWidth.style.width = mapWidth;
  // } else {
  //   let mapWidth;
  //   if (sideBarWidth) {
  //     mapWidth = windowWidth - sideBarWidth;
  //   } else {
  //     mapWidth = windowWidth;
  //   }
  //   $(".beans-map-container").css("width", mapWidth);
  //   footerWidth.style.width = mapWidth;
  // }
  if (defaultMapType != "3d-map") {
    $(".c-sidebar").hide();
    let w1 = $(".digits-list-item").width();
    let w2 = $(".c-sidebar").width();
    // $(".digits-list-item").css("width", w1+w2);
    _3dMapViewMarkers();
  }
}

function display2DMap() {
  $("._3d-apply-filter-button").css("display", "none");
  $(".beans-map-container").hide();
  $(".image-map").show();
  $(".zoom-in-webpage").show();
  $(".zoom-out-webpage").show();
  $(".c-sidebar").show();
  $(".desktop-content").show();
  $(".satelite-view-icon").addClass("hidden");
  $(".3d-map-option").removeClass("hidden");
  $(".2d-map-option").addClass("hidden");
  $(".div.map-instruction-text").addClass("hidden");
  if (defaultMapType == "3d-map") {
    showMarkers();
  }

  var windowWidth = $(window).width();
  if (selectMap !== "3d-map") {
    handleViewportChange(windowWidth);
    const markerColor = isColorWhite(map_marker_color)
      ? "grey"
      : map_marker_color;

    $(".popup-title").css("background-color", markerColor);
    $(".popup-arrow").css("background-color", markerColor);

    $(".custom-select").change(() => {
      renderChangedUnits();
      if (svgMode) {
        setSVGUnitsAmenitiesCoordinates();
      }
    });
  }
}

function isColorWhite(color) {
  const normalizedColor = color.toLowerCase();

  return (
    normalizedColor === "#ffffff" ||
    normalizedColor === "#fff" ||
    normalizedColor === "white" ||
    normalizedColor === "rgb(255, 255, 255)" ||
    normalizedColor === "rgba(255, 255, 255, 1)"
  );
}

function handleViewportChange() {
  const viewportWidth = window.innerWidth;
  let filters_width = "65%";
  let buttons_width = "15%";
  // let logo_width = "25%";

  if (viewportWidth <= 567) {
    filters_width = "100%";
    buttons_width = "100%";
  } else if (viewportWidth >= 567 && viewportWidth <= 768) {
    filters_width = "100%";
    buttons_width = "50%";
  } else if (viewportWidth >= 768 && viewportWidth <= 993) {
    if (webCommunity["is_sitemap"]) {
      filters_width = "100%";
      buttons_width = "50%";
    } else {
      filters_width = "100%";
      buttons_width = "50%";
    }
  } else if (viewportWidth >= 993 && viewportWidth <= 1050) {
    if (webCommunity["is_sitemap"]) {
      if ($(".colourd-btn").is(":visible")) {
        filters_width = "55%";
        buttons_width = "25%";
      } else {
        filters_width = "60%";
        buttons_width = "13%";
      }
    } else {
      if ($(".colourd-btn").is(":visible")) {
        filters_width = "100%";
        buttons_width = "43%";
      } else {
        filters_width = "100%";
        buttons_width = "20%";
      }
    }
  } else if (viewportWidth >= 1050 && viewportWidth <= 1120) {
    if (webCommunity["is_sitemap"]) {
      if ($(".colourd-btn").is(":visible")) {
        filters_width = "52%";
        buttons_width = "22%";
      } else {
        filters_width = "57%";
        buttons_width = "14%";
      }
    } else {
      if ($(".colourd-btn").is(":visible")) {
        filters_width = "65%";
        buttons_width = "27%";
      } else {
        filters_width = "60%";
        buttons_width = "17%";
      }
    }
  } else if (viewportWidth >= 1120 && viewportWidth <= 1180) {
    if (webCommunity["is_sitemap"]) {
      if ($(".colourd-btn").is(":visible")) {
        filters_width = "52%";
        buttons_width = "22%";
      } else {
        filters_width = "55%";
        buttons_width = "16%";
      }
    } else {
      if ($(".colourd-btn").is(":visible")) {
        filters_width = "53%";
        buttons_width = "24%";
      } else {
        filters_width = "60%";
        buttons_width = "17%";
      }
    }
  } else if (viewportWidth >= 1180 && viewportWidth <= 1300) {
    if (webCommunity["is_sitemap"]) {
      if ($(".colourd-btn").is(":visible")) {
        filters_width = "47%";
        buttons_width = "24%";
      } else {
        filters_width = "57%";
        buttons_width = "14%";
      }
    } else {
      if ($(".colourd-btn").is(":visible")) {
        filters_width = "51%";
        buttons_width = "25%";
      } else {
        filters_width = "60%";
        buttons_width = "16%";
      }
    }
  } else if (viewportWidth >= 1300 && viewportWidth <= 1370) {
    if (webCommunity["is_sitemap"]) {
      if ($(".colourd-btn").is(":visible")) {
        filters_width = "45%";
        buttons_width = "26%";
      } else {
        filters_width = "55%";
        buttons_width = "15%";
      }
    } else {
      if ($(".colourd-btn").is(":visible")) {
        filters_width = "49%";
        buttons_width = "28%";
      } else {
        filters_width = "60%";
        buttons_width = "16%";
      }
    }
  } else if (viewportWidth >= 1370 && viewportWidth <= 1470) {
    if (webCommunity["is_sitemap"]) {
      filters_width = "50%";
      buttons_width = "27%";
    } else {
      filters_width = "70%";
      buttons_width = "35%";
    }
  } else if (viewportWidth >= 1470 && viewportWidth <= 1520) {
    if (webCommunity["is_sitemap"]) {
      filters_width = "52%";
      buttons_width = "25%";
    } else {
      filters_width = "70%";
      buttons_width = "35%";
    }
  } else if (viewportWidth >= 1520) {
    if (webCommunity["is_sitemap"]) {
      filters_width = "51%";
      buttons_width = "25%";
    } else {
      filters_width = "61%";
      buttons_width = "35%";
    }
  }

  setCSSForElements(".custom-iframe-modeule .selection-fields", filters_width);
  setCSSForElements(
    ".custom-iframe-modeule .header-buttons-groups",
    buttons_width
  );
  // setCSSForElements(".custom-iframe-modeule .app-logo", logo_width);
}

function setCSSForElements(element, percentage) {
  $(`${element}`).css("width", percentage);
}

function _3dFilterByFloor(floor) {
  floorNumber = floor.id; //parseInt(floor.id)
  if (selectMap == "3d-map") {
    beansWidget.filterByFloor(floorNumber);
  }
}

function _3dFilterByUnits(_3dUnits) {
  beansWidget.filterByUnit(_3dUnits);
}

function toggleToSateliteView() {
  beansWidget.toggleMap();
}

function apply3DFilters() {
  if (selectMap === "3d-map" && enable3DMaps) {
    _3dMapViewMarkers();
  }
}

function resetFilters() {
  units = current_units;
  $("#responsive_unit_bedroom").val(
    $("#responsive_unit_bedroom option:first").val()
  );
  $("#unit_bedroom").val($("#unit_bedroom option:first").val());

  if ($(window).width() <= 993) $(".mobile-filter-mega-menu").slideToggle();

  bedroomFilterChanged();
  showMarkers();
}

function applyFilters() {
  if (selectMap === "3d-map" && enable3DMaps) {
    _3dMapViewMarkers();
  } else {
    showMarkers();
  }

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

  console.log("unitAvailableDate: ", unit.available_date);

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

  console.log("availableDateString: ", availableDateString);
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
      console.log("Amenity Marker hovered");
      updateActivityData(markerSelector, "hover");
    });
}

function unitMarkerHoverEvent() {
  const markerSelector = svgMode ? "cloned-unit" : "unit_marker";
  $(`.${markerSelector}`)
    .off("mouseenter")
    .on("mouseenter", function () {
      console.log("Unit Marker hovered");
      updateActivityData(markerSelector, "hover");
    });
}

function unitsListHoverEvent() {
  const markerSelector = svgMode ? "cloned-unit" : "unit_marker";
  $(document)
    .off("mouseenter", ".left-side-30-units")
    .on("mouseenter", ".left-side-30-units", function () {
      console.log("Unit Box hovered");
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
      console.log("Amenity Marker Clicked");
      updateActivityData("amenity_marker", "click");
    });
}

function unitMarkerClickEvent() {
  const markerSelector = svgMode ? "cloned-unit" : "unit_marker";
  $(`.${markerSelector}`)
    .off("click")
    .on("click", function () {
      console.log("Unit Marker Clicked");
      updateActivityData(markerSelector, "click");
    });
}

function sortingFilterClickEvent() {
  $(document)
    .off("mousedown", "#filter")
    .on("mousedown", "#filter", function () {
      console.log("Unit Box Clicked");
      updateActivityData("sorting_filter", "click");
    });
}

function bedroomFilterClickEvent() {
  $(document)
    .off("mousedown", "#unit_bedroom")
    .on("mousedown", "#unit_bedroom", function () {
      console.log("Bedroom filter Clicked");
      updateActivityData("bedroom_filter", "click");
    });

  $(document)
    .off("mousedown", "#responsive_unit_bedroom")
    .on("mousedown", "#responsive_unit_bedroom", function () {
      console.log("Bedroom filter Clicked");
      updateActivityData("bedroom_filter", "click");
    });
}

function pricingFilterClickEvent() {
  $(document)
    .off("mousedown", "#market_rent")
    .on("mousedown", "#market_rent", function () {
      console.log("Pricing filter Clicked");
      updateActivityData("pricing_filter", "click");
    });

  $(document)
    .off("mousedown", "#responsive_market_rent")
    .on("mousedown", "#responsive_market_rent", function () {
      console.log("Pricing filter Clicked");
      updateActivityData("pricing_filter", "click");
    });
}

function squareFootageFilterClickEvent() {
  $(document)
    .off("mousedown", "#square_feet")
    .on("mousedown", "#square_feet", function () {
      console.log("Square Feet filter Clicked");
      updateActivityData("square_feet_filter", "click");
    });

  $(document)
    .off("mousedown", "#responsive_square_feet")
    .on("mousedown", "#responsive_square_feet", function () {
      console.log("Square Feet filter Clicked");
      updateActivityData("square_feet_filter", "click");
    });
}

function availabilityFilterClickEvent() {
  $(document)
    .off("mousedown", "#available_unit")
    .on("mousedown", "#available_unit", function () {
      console.log("Available date filter Clicked");
      updateActivityData("availability_filter", "click");
    });

  $(document)
    .off("mousedown", "#responsive_available_unit")
    .on("mousedown", "#responsive_available_unit", function () {
      console.log("Available date filter Clicked");
      updateActivityData("availability_filter", "click");
    });
}

function resetFilterClickEvent() {
  $(document)
    .off("click", ".reset-filter-button")
    .on("click", ".reset-filter-button", function () {
      console.log("Reset filter Clicked");
      updateActivityData("reset_filter", "click");
    });
}

function view3DTourClickEvent() {
  $(document)
    .off("click", ".virtual-tour-btn")
    .on("click", ".virtual-tour-btn", function () {
      console.log("View 3D Clicked");
      updateActivityData("virtual_tour", "click");
    });
}

function modalUnitButtonsClickEvent() {
  $(document)
    .off("click", ".modal-unit-button")
    .on("click", ".modal-unit-button", function () {
      console.log("Unit Modal Button Clicked");
      updateActivityData("unit_modal_buttons", "click");
    });
}

function pricingMatrixClickEvents() {
  $(document)
    .off("click", ".show-more")
    .on("click", ".show-more", function () {
      console.log("Show more pricing Clicked");
      updateActivityData("open_pricing_matrix", "click");
    });

  // $(document).off("click", ".hide-more-price").on("click", ".hide-more-price", function () {
  //   console.log("Hide more pricing Clicked");
  //   updateActivityData("hide_pricing_matrix", "click");
  // });
}

function viewSavedButtonClickEvent() {
  $(document)
    .off("click", ".view-saved-btn")
    .on("click", ".view-saved-btn", function () {
      console.log("View Saved Clicked");
      updateActivityData("view_saved", "click");
    });
}

function scheduleTourButtonClickEvent() {
  $(document)
    .off("click", ".schedule-tour-btn")
    .on("click", ".schedule-tour-btn", function () {
      console.log("Schedule tour Clicked");
      updateActivityData("schedule_tour", "click");
    });
}

function logoIconClickEvent() {
  $(document)
    .off("click", ".app-logo")
    .on("click", ".app-logo", function () {
      console.log("App Logo Clicked");
      updateActivityData("logo", "click");
    });
}

function floorNumberClickEvent() {
  $(document)
    .off("click", ".slick-slide")
    .on("click", ".slick-slide", function () {
      console.log("Floor Number Clicked");
      updateActivityData("floor_number", "click");
    });
}

function zoomInClickEvent() {
  $(document)
    .off("click", ".plus-action")
    .on("click", ".plus-action", function () {
      console.log("Zoom In Clicked");
      updateActivityData("zoom_in", "click");
    });
}

function zoomOutClickEvent() {
  $(document)
    .off("click", ".minus-action")
    .on("click", ".minus-action", function () {
      console.log("Zoom out Clicked");
      updateActivityData("zoom_out", "click");
    });
}

function zoomRefreshClickEvent() {
  $(document)
    .off("click", ".refresh-action")
    .on("click", ".refresh-action", function () {
      console.log("Zoom Refresh Clicked");
      updateActivityData("zoom_refresh", "click");
    });
}

function clearAllFavoritesClickEvent() {
  $(document)
    .off("click", ".clear-all")
    .on("click", ".clear-all", function () {
      console.log("Clear Favorite Clicked");
      updateActivityData("clear_favorites", "click");
    });
}

function shareFavoritesButtonClickEvent() {
  $(document)
    .off("click", ".share-favorite")
    .on("click", ".share-favorite", function () {
      console.log("Share Favorite Clicked");

      updateActivityData("sent_favorite", "click");
    });
}

function applyNowClickEvent() {
  $(document)
    .off("click", ".apply_now")
    .on("click", ".apply_now", function () {
      console.log("Apply now Clicked");
      updateActivityData("apply_now_count", "click");
    });
}

function mapContainerClickEvents() {
  $(".maps-analytics-container")
    .off("click")
    .on("click", function (event) {
      console.log("Container Clicked");
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
          console.log("Container Hovered");
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

async function fetchWebpageSVGAndSetCoordinates() {
  $(".webPageLoader").removeClass("hidden");

  $images = $("img.sitemap-image.floorplate-image");
  $images.each((_, img) => {
    const isFloorplate = hasFloorplate();
    const visibleCheck = isFloorplate
      ? img.id === `f_${current_floor}`
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
      array.push(
        fetchSVG(`#floorplate_${floor}`, {
          floor,
          loader: true,
          svgPosition: 0,
          activateZoom: true,
          tracker: assetTracker,
          setSVGImageHeight: true,
          trackerAssetId: `svg-floorplate-${floor}`,
          trackerVisibilityCheck: parseInt(current_floor) === floor,
        })
      );
    }
    await Promise.all(array);
  } else {
    await fetchSVG("#property-map", {
      loader: true,
      svgPosition: 1,
      activateZoom: true,
      tracker: assetTracker,
      setSVGImageHeight: true,
      trackerVisibilityCheck: true,
      trackerAssetId: `svg-sitemap-1`,
    });
  }

  try {
    const result = await assetTracker.watchAssetsLoading({
      visibilityCheck: true,
    });

    if (result.ok) {
      handleMapControl();
      showMarkers();
    } else {
      console.error(result.message);
    }
  } catch (error) {
    console.error(error);
  }

  assetTracker.clearAllAssetsLists();
  assetTracker.turnoffLoader();
  $(".webPageLoader").addClass("hidden");
}

function setSVGUnitsAmenitiesCoordinates() {
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
  const $zoomableContainer = $mapContainer.find(
    ".image-map.zoomable-map-container"
  );
  const $unitsListContainer = $webpageMainContainer.find(".left-side");
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
    const sidebarHeight =
      sidebar && extraSmallScreen() ? $sidebar.height() || 0 : 0;
    const sidebarWidth =
      sidebar && !extraSmallScreen()
        ? ($sidebar.width() || 0) + (2 + 2) /* padding */
        : 0;

    $containerHeader.css({
      width: totalWidth - sidebarWidth,
      left: sidebarWidth,
    });

    if (extraSmallScreen()) {
      $sidebar.css({
        top: headerHeight + tabHeaderHeight,
      });
    }

    const mainBodyHeight =
      $wrapperBody.height() - (headerHeight + tabButtonsGroupHeight);
    const mainBodyWidth = totalWidth - sidebarWidth;
    $mainBody.css({
      width: mainBodyWidth,
      height: mainBodyHeight,
      left: sidebarWidth,
      top: 0,
    });

    const smallScreenElementsHeight = tabHeaderHeight + sidebarHeight;
    const mainContainerHeight = mainBodyHeight - smallScreenElementsHeight;

    $webpageMainContainer.css({
      width: mainBodyWidth,
      height: mainContainerHeight,
      top: sidebarHeight,
    });

    result.height = mainContainerHeight;
    result.width = $mapContainer.width();

    $mapContainer.css({
      height: result.height,
      width: result.width,
    });
    $zoomableContainer.css({
      height: result.height - footerHeight,
      top: 0,
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
        left: sidebarWidth,
      });
    }

    const unitListContainerWidth = $unitsListContainer
      .find(".left-side-title")
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
  }
}

function setMarkersSizeAndMargin() {
  if (svgMode) return;

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
    ? `div#floorplate_${current_floor}`
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
    const zoomPanInstance = window.mapPanZoom[zoomPanKey];
    if (zoomPanInstance) {
      scale = zoomPanInstance.getTransform().scale;
    }
  }

  return scale;
}
