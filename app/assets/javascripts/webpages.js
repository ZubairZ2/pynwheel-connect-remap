var selectMap;
var webCommunity;
var _3dFilteredUnits;
var _3dAmenities;
var _3dSelectedUnit;
var _3dFilteredAmenity;
var _3dSampleAmenities = ["SWIMMINGPOOL", "GYM", "BBQ", "SPA", "OFFICE", "ST", "EL", "EN"]
var favoritesArr = [];
var defaultMapType;
var _3dUnitsToBeSelected;
var enable3DMaps;
var image_width_2d;
var maxSelectedPrice;
var currency = "$";
var real_page_provider_unit_id = null;
var currentUnitSelected = null;

var isMouseMoving = false;
var intervalId = null;
var timeoutId = null;


$(document).ready(function () {
  webCommunity = $("#communityWebpagesData").data("community");
  _3dAmenities = $("#communityWebpagesData").data("amenities");
  _3dConfigurations = $("#communityWebpagesData").data("mapConfigurations");
  // is_floorplates = $("#communityWebpagesData").data("is_floorplate");
  currency = $("#communityWebpagesData").data("currency");
  
  if (typeof webCommunity !== 'undefined') {
    selectMap = webCommunity.web_map_type;
    enable3DMaps = webCommunity.enable_three_d_maps;
    defaultMapType = webCommunity.web_map_type;

    if(selectMap === "3d-map" && enable3DMaps) {
      _3dUnitsToBeSelected = filterUnitsBasedOnCommunityType(units); //select_units_according_to_filters(units)
      selected_units = _3dMapViewMarker()
      
      beansWidget.initMap(`${webCommunity.address}, ${webCommunity.city}, ${webCommunity.state}`,_beansApiKey, 
        {
          'click-popup-listener' : polygonClickPopup,
          'default-polygon-color' : _3dConfigurations && _3dConfigurations.default_polygon_color ? _3dConfigurations.default_polygon_color : '#3ca832',
          'selected-polygon-color' : _3dConfigurations && _3dConfigurations.selected_polygon_color ? _3dConfigurations.selected_polygon_color : '#5ca904',
          'selected-unit-color' : _3dConfigurations && _3dConfigurations.selected_unit_color ? _3dConfigurations.selected_unit_color : '#5ca904',
          'default-polygon-opacity': _3dConfigurations && _3dConfigurations.default_polygon_opacity ? _3dConfigurations.default_polygon_opacity : 0.5,
          'selected-polygon-opacity': _3dConfigurations && _3dConfigurations.selected_polygon_opacity ? _3dConfigurations.selected_polygon_opacity : 0.8,
          'unit-color': _3dConfigurations && _3dConfigurations.unit_color ? _3dConfigurations.unit_color : '#202',
          'poi-color': _3dConfigurations && _3dConfigurations.poi_color ? _3dConfigurations.poi_color : '#008000','selected-units': selected_units,
          'faded-polygon-opacity': _3dConfigurations && _3dConfigurations.faded_polygon_opacity ? _3dConfigurations.faded_polygon_opacity : 0.3,
          'show-unit-numbers': _3dConfigurations ? _3dConfigurations.show_unit_numbers : true,
          'hide-floors': _3dConfigurations ? _3dConfigurations.hide_floors : true,
        }
      );
    }
    renderChangedUnits();
    handleMapControl();
  } else {
    console.error("webCommunity not loaded properly");
  }

});

function displayOverlayText() {
  let instruction = localStorage.getItem(`webpagesInstruction${webCommunity.id}`);

  if(!instruction) {
    $("#webpages-overlay").show();
  }
}

function hideOverlayText() {
  $("#webpages-overlay").hide();
  localStorage.setItem(`webpagesInstruction${webCommunity.id}`, true);
}
  

function _3dMapViewMarker() {
  let _3dUnitsMarketingNames = getUnitsToBeSelected();
  let cleanedNames = clean3DMarkers(_3dUnitsMarketingNames)
  return (cleanedNames + ',' + _3dSampleAmenities.join())
}

function getUnitsToBeSelected() {
  return _3dUnitsToBeSelected.map(a => a.marketing_name)
}

function touchScreenEvent() {
  $('#zoomable a').on('touchstart', function (e) {
    e.stopImmediatePropagation();
  });
}

document.addEventListener('DOMContentLoaded', touchScreenEvent);

$(window).bind('load', function () {

  if ($('.is-webpage')[0]) {
    // resetFilters();
    $('[data-toggle="tooltip"]').tooltip({trigger: "hover"});
    $(document).keydown(function (event) {
      if (event.ctrlKey == true && (event.which == '61' || event.which == '107' || event.whFich == '173' || event.which == '109' || event.which == '187' || event.which == '189')) {
        event.preventDefault();
      }
    });

    $(window).bind('mousewheel DOMMouseScroll', function (event) {
      if (event.ctrlKey == true) {
      }
    });
    
    ////////////// Disable browser zoom for webpage  ends here ////////////////
    $('#clickme').click(function () {
      $("#clickme").html($("#clickme").html() == 'Select Filter' ? 'Hide Filter' : 'Select Filter');
      var $slider = $('.mydiv');
      $slider.animate({
        left: parseInt($slider.css('left'), 10) == -331 ?
                0 : -331
      });
    });

    ////////////////////////////////////////////////
    $('#leasing-start-date-icon').click(function (event) {
      event.preventDefault();
      $('#leasing-start-date').focus();
    });

    ////////////////////////////////////////////////
    /* unit modal*/
    $('#unitModal').on('hidden.bs.modal', function (e) {
      resetToDefaultZoom();
    });

    $('#unitModal').on('show.bs.modal', function (e) {
      resetToDefaultZoom();
      if(selectMap === "3d-map" && enable3DMaps) {
        _3dUnitModalDisplay();
        $('.unit-buttons').addClass('hidden');
      }
      else {
        $('.unit-buttons').empty();
        $('.unit-buttons').addClass('hidden');
        if ($('.h-' + $(e.relatedTarget).data('unit-x-plot') + '-' + $(e.relatedTarget).data('unit-y-plot')).length > 1) {
          $('.h-' + $(e.relatedTarget).data('unit-x-plot') + '-' + $(e.relatedTarget).data('unit-y-plot')).each(function () {
            var target_id = $(e.relatedTarget).attr('id');
            var underneath_unit_id = $(this).data().unitId
            var button_style = ""
            if (parseInt(target_id.split('_')[1]) == underneath_unit_id) {
              button_style = "btn-primary"
            } else {
              button_style = "btn-default"
            }
            $('.unit-buttons').removeClass('hidden');
            // $('.unit-buttons').append('<button class="btn modal-unit-button ml-5 ' + button_style + '" type="button" data-title="' + $(this).data('title') + '" data-community-id="' + $(this).data('community-id') + '" data-unit-id="' + $(this).data('unit-id') + '" data-is-fav="' + $(this).data('is-fav') + '" data-provider="' + $(this).data('provider') + '" data-website="' + $(this).data('website') + '" data-community-property-id="' + $(this).data('community-property-id') + '" data-unit-provider-id="' + $(this).data('unit-provider-id') + '" data-floorplan-provider-id="' + $(this).data('floorplan-provider-id') + '" data-floorplan-name="' + $(this).data('floorplan-name') + '" data-unit-description="' + $(this).data('unit-description') + '" data-unit-marketing-name="' + $(this).data('unit-marketing-name') + '" data-market-rent="' + $(this).data('market-rent') + '" data-square-feet="' + $(this).data('square-feet') + '" data-availability="' + $(this).data('availability') + '" data-available-date="' + $(this).data('available-date') + '" data-availability-url="' + $(this).data('availability-url') + '" data-bedrooms="' + $(this).data('bedrooms') + '" data-bathrooms="' + $(this).data('bathrooms') + '" data-floorplan-image="' + $(this).data('floorplan-image') + '" data-lease-term="' + $(this).data('lease-term') + '" data-unit-lease-pricing="' + $(this).data('unit-lease-pricing') +  '" onclick="setUnitAttributes(this);">' + $(this).data('title') + '</button>');
            $('.unit-buttons').append('<button class="btn modal-unit-button ml-5 ' + button_style + '" type="button" data-title="' + $(this).data('title') + '" data-community-id="' + $(this).data('community-id') + '" data-unit-id="' + $(this).data('unit-id') + '" data-is-fav="' + $(this).data('is-fav') + '" data-provider="' + $(this).data('provider') + '" data-website="' + $(this).data('website') + '" data-community-property-id="' + $(this).data('community-property-id') + '" data-unit-provider-id="' + $(this).data('unit-provider-id') + '" data-floorplan-provider-id="' + $(this).data('floorplan-provider-id') + '" data-floorplan-name="' + $(this).data('floorplan-name') + '" data-unit-description="' + $(this).data('unit-description') + '" data-unit-marketing-name="' + $(this).data('unit-marketing-name') + '" data-market-rent="' + $(this).data('market-rent') + '" data-square-feet="' + $(this).data('square-feet') + '" data-availability="' + $(this).data('availability') + '" data-available-date="' + $(this).data('available-date') + '" data-availability-url="' + $(this).data('availability-url') + '" data-bedrooms="' + $(this).data('bedrooms') + '" data-bathrooms="' + $(this).data('bathrooms') + '" data-floorplan-image="' + $(this).data('floorplan-image') + '" data-lease-term="' + $(this).data('lease-term') + '" data-unit-lease-pricing="' + $(this).data('unit-lease-pricing') + '" data-unit-additional-fees="' + $(this).data('unit-additional-fees') + '" onclick="setUnitAttributes(this);">' + $(this).data('title') + '</button>');

          });
        }

        setModalAttributes(e.relatedTarget);
      }
    });

    $('.active-filter').click(function () {
      if ($(this).is(':checked')) {
        $(this).parent().addClass('active');
      } else {
        $(this).parent().removeClass('active');
        $('#select-all-filters-checkbox').prop('checked', false);
        $('#select-all-filters-checkbox').removeClass('active')
      }
      showMarkers();
    });
    /////////////////////////////////////////
    $('.3d-map-option').click(function () {
      selectMap = "3d-map"
      display3DMap();
      
    });
    
    $('.2d-map-option').click(function () {
      selectMap = "2d-map"
      display2DMap();
      if(defaultMapType != "3d-map"){
        showMarkers();
      }
    });

    $('#market_rent, #responsive_market_rent').change(function () {
      maxPriceFilterFilterChanged();
    });
    
    $('#square_feet, #responsive_square_feet').change(function () {
      squareFootageFilterChanged();
    });
    
    $('#unit_bedroom, #responsive_unit_bedroom').change(function () {
      bedroomFilterChanged();
    });

    $('#available_unit, #responsive_available_unit').change(function () {
      availabilityFilterChanged();
    });
    
    $('#lease_term').change(function () {
      var select = document.getElementById('lease_term');
      var option = select.options[select.selectedIndex];
      $('#unitModal').find('#total-market-rent').html(currency + option.dataset.leasePrice);
    });

    $('#select-all-filters-checkbox').click(function () {
      if ($(this).is(':checked')) {
        $(this).parent().addClass('active');
        $('.active-filter').each(function () {
          $(this).prop('checked', true);
          $(this).parent().addClass('active');
        });
        showMarkers();
      } else {
        $(this).parent().removeClass('active');
        $('.active-filter').each(function () {
          $(this).prop('checked', false);
          $(this).parent().removeClass('active');
        });
        showMarkers();
      }
    });
    ///////////////////////////////////////////
    $('.floorplate-anchor').click(function (e) {
      e.stopPropagation();

      var floor_for_showing_image = $(this).attr('id');
      if (floor_for_showing_image != current_floor) {
        $(".alert").hide();

        $('.floorplate-image').addClass('hidden');
        $('#f_' + floor_for_showing_image).removeClass('hidden');
        $('#' + floor_for_showing_image).addClass('selected');

        $(".digits-list-item").removeClass("selected");
        $(this).parent().addClass("selected");

        current_floor = floor_for_showing_image
        populate_current_units();
        
        if ($(this).hasClass('only-amenity')) {
          $('.alert').show()
          timer = setTimeout(function () {
            $('.alert').fadeOut('slow');
          }, 2000);
        }
        else if ($(this).hasClass('no-units'))
        {
          $(".alert").show()
          clearTimeout(timeoutId);
          clearTimeout(timer);
        }
        else
          $(".alert").hide()
      }
    });

    $('.filter-label').click(function () {
      $(this).parent().find('input').click();
    });

    function adjustBottomOfImageMap(x){
      let rightSide = document.getElementsByClassName('right-side')[0]
      rightSide.style.height = "50%";

      if (x.matches && has_floorplate === "true"){
        rightSide.style.bottom = "60px";
        rightSide.style.height = "25%";

      }
    }

    var x = window.matchMedia("(max-width: 567px)");
    adjustBottomOfImageMap(x);

    var $area = document.getElementById('zoomable');
    webpagePanZoom = panzoom($area, 
      {
        bounds: true, contain: 'automatic', smoothScroll: true,
        boundsPadding: 0.4,
        maxZoom: 5,
        minZoom: 1,
        minScale: 1,
        zoomDoubleClickSpeed: 1,
       
        onTouch: function(e) {
          e.preventDefault();
          return false;
        }
      });

    $(".reset-webpage").on('click', function (e) {
      $(".webPageLoader").removeClass("hidden");
      window.location.reload(true)
    });
    
    $(".zoom-in-webpage").on('click', function (e) {
      webpagePanZoom.zoomInOut(187);
    });

    $(".zoom-out-webpage").on('click', function (e) {
      webpagePanZoom.zoomInOut(189);
    });
    $("#zoomable-modal-image a").on("touchstart", function (e) {
      e.stopImmediatePropagation();
    });
    var $marea = document.getElementById('zoomable-modal-image') 
    modalPanZoom = panzoom($marea,{bounds: true, boundsPadding: 0.4, contain: 'automatic', smoothScroll: false,maxZoom: 5,minZoom: 1,zoomDoubleClickSpeed: 1,
      onTouch: function(e) {
        e.preventDefault();
        return false;
      }
    });

    $(".zoom-in-modal").on('click', function (e) {
      $($marea).removeClass("transform-none");
      modalPanZoom.zoomInOut(187);
      $(".reset-modal").removeClass("hidden")
    });
    $(".zoom-out-modal").on('click', function (e) {
      $($marea).removeClass("transform-none");
      modalPanZoom.zoomInOut(189);
    });

    $(".reset-modal").on('click', function (e) {
      resetToDefaultZoom();
      $(".reset-modal").addClass("hidden")
    });

    $('#zoomable-modal-image').on('wheel', function(e) {
      $(".reset-modal").removeClass("hidden")
      $($marea).removeClass("transform-none"); 
    })

    $("#zoomable-modal-image-responsive a").on("touchstart", function (e) {
      e.stopImmediatePropagation();
    });
    var imageArea = document.getElementById('zoomable-modal-image-responsive');
    responsiveModalPanZoom = panzoom(imageArea,{bounds: true, boundsPadding: 0.4, contain: 'automatic', smoothScroll: false,maxZoom: 5,minZoom: 1,zoomDoubleClickSpeed: 1,
      onTouch: function(e) {
        e.preventDefault();
        return false;
      }
    });
    $(".zoom-in-res-modal").on('click', function (e) {
      $(imageArea).removeClass("transform-none");
      responsiveModalPanZoom.zoomInOut(187);
    });
    $(".zoom-out-res-modal").on('click', function (e) {
      $(imageArea).removeClass("transform-none");
      responsiveModalPanZoom.zoomInOut(189);
    });
    $(".reset-res-modal").on('click', function (e) {
      $(imageArea).addClass("transform-none");
    });
    $('#zoomable-modal-image-responsive').on('wheel', function(e) {
      $(imageArea).removeClass("transform-none"); 
    })

    unitMarkerHover();
    populate_current_units();

    if (!(has_floorplate == 'true')) {
      setImageHeight()
      adjustSitmapMarkerPositions();
    }
  }

  if(selectMap === "3d-map" && enable3DMaps) {
    _3dMapViewMarkers();
  }
});

function adjustSitmapMarkerPositions() {
  const container = getContainerDimensions();
  const actualImage = getActualImageDimensions();
  const stretchedImage = getStretchedImageDimensions();
  const { left_diff, top_diff } = calculateDiffs(container, stretchedImage);
  const { extra_left_diff, extra_top_diff } = getExtraDiffs();

  positionMarkers(stretchedImage, actualImage, left_diff, top_diff, extra_left_diff, extra_top_diff);
  positionAmenityMarkers(stretchedImage, actualImage, left_diff, top_diff, extra_left_diff, extra_top_diff);
}

function getContainerDimensions() {
  return {
    width: parseFloat($('.sitemap-image').parent().width()),
    height: parseFloat($('.sitemap-image').parent().height())
  };
}

function getActualImageDimensions() {
  return {
    width: parseInt($('.sitemap-image').data("width")),
    height: parseInt($('.sitemap-image').data("height"))
  };
}

function getStretchedImageDimensions() {
  return {
    width: parseInt($('.sitemap-image').width()),
    height: parseInt($('.sitemap-image').height())
  };
}

function calculateDiffs(container, stretched) {
  return {
    left_diff: (container.width - stretched.width) / 2,
    top_diff: (container.height - stretched.height) / 2
  };
}

function positionMarkers(stretched, actual, left_diff, top_diff, extra_left_diff, extra_top_diff) {
  $('.marker').each(function () {
    let x_plot = parseFloat($(this).data('unit-x-plot'));
    let y_plot = parseFloat($(this).data('unit-y-plot'));

    calculatePosition(x_plot, y_plot, stretched.width, stretched.height, actual.width, actual.height, left_diff, top_diff, $(this), extra_left_diff, extra_top_diff);
  });
}

function positionAmenityMarkers(stretched, actual, left_diff, top_diff, extra_left_diff, extra_top_diff) {
  $('.sitemap-amenity-marker').each(function () {
    let x_plot = parseFloat($(this).data('amenity-x-plot'));
    let y_plot = parseFloat($(this).data('amenity-y-plot'));

    $(this).removeClass('hidden');
    calculatePosition(x_plot, y_plot, stretched.width, stretched.height, actual.width, actual.height, left_diff, top_diff, $(this), extra_left_diff, extra_top_diff);
  });
}

function calculatePosition(x_plot, y_plot, stretched_width, stretched_height, actual_width, actual_height, left_diff, top_diff, marker, extra_left_diff, extra_top_diff) {
  let marker_width = marker.width();
  let marker_height = marker.height();

  x_plot = (stretched_width / actual_width) * x_plot;
  y_plot = (stretched_height / actual_height) * y_plot;

  marker.css({
    "left": (x_plot + left_diff - ((marker_width / 2) + extra_left_diff)) + "px",
    "top": (y_plot + top_diff - ((marker_height / 2) + extra_top_diff)) + "px"
  });
}

function getExtraDiffs() {
  let extra_left_diff = -7;
  let extra_top_diff = -7;

  if ($(window).width() <= 567) {
    extra_left_diff = -2;
    extra_top_diff = -2;
  } else if ($(window).width() <= 993) {
    extra_left_diff = -5;
    extra_top_diff = -5;
  }

  return { extra_left_diff, extra_top_diff };
}

function polygonClickPopup(feature) {
  let htmlToDisplay;

  if(_3dSampleAmenities.includes(feature.properties.display_text)) {
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
  
  if(_3dSelectedUnit)
    $("#unitModal").modal("show");

  return `<strong>Name: ${unitName}</strong>`;
}


function amenityHTMLToDisplay(amenity) {
  let htmlToDisplay = amenity.display_text;
  
  _3dFilteredAmenity = _3dGetAmenityImageURL(amenity.display_text);

  if(_3dFilteredAmenity && _3dFilteredAmenity.image && _3dFilteredAmenity.image.url) {
    $("#3DAmenityName").html(htmlToDisplay);
    $("#_3DAmenityImage").attr("src", _3dFilteredAmenity.image.url);
    $("#3DAmenityModal").modal("show");
  }

  return htmlToDisplay
}

function _3dGetAmenityImageURL(amenityName) {
  return _3dAmenities.filter(a => a.name === amenityName)[0];
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
  unitAvailabilityValue = $('#available_unit').val() || $('#responsive_available_unit').val();

  if(unitAvailabilityValue) {
    const startingIndex = parseInt(unitAvailabilityValue.split("-")[0])
    const endIndex = parseInt(unitAvailabilityValue.split("-")[1])
    units = filterUnitsBasedOnDate(units, startingIndex, endIndex)
  }
}

function filterUnitsBasedOnDate(floorplateUnits, startIndex, endIndex) {
  const today = new Date();
  const currentDay = new Date(today).setDate(today.getDate() + 0);
  const startDay = new Date(today).setDate(today.getDate() + startIndex);
  const endDay = new Date(today).setDate(today.getDate() + endIndex);
  floorplateUnits = filterUnitsBasedOnCommunityType(floorplateUnits);

  if(!startDay && !startDay)
    floorplateUnits = floorplateUnits.filter(unit => new Date(unit.available_date) <= currentDay )

  if (startDay)
    floorplateUnits = floorplateUnits.filter(unit => new Date(unit.available_date) >= startDay )

  if (endDay)
    floorplateUnits = floorplateUnits.filter(unit => new Date(unit.available_date) <= endDay )

  return floorplateUnits
}

function filterBasedOnScreen(filterTag) {
  const webFilterId = "#".concat(filterTag); //works on web view
  const mobileFilterId = "#responsive_".concat(filterTag); //works on mobile view
  
  if(current_width <= 993) {
    return parseInt($(mobileFilterId).val());
  } else
    return parseInt($(webFilterId).val());
}

function filterUnitsBasedOnSqfeet() {
  const sqFeet = filterBasedOnScreen('square_feet');

  if(sqFeet)
    units = units.filter(unit => unit.square_feet >= sqFeet )
}

function filterUnitsBasedOnMarketRent() {
  const marketRent = filterBasedOnScreen('market_rent');

  if(marketRent)
    units = units.filter(unit => unit.market_rent <= marketRent )
}

function filterUnitsBasedOnBedroom() {
  $(".alert").hide();

  units = total_units;
  const unitBedroom = filterBasedOnScreen('unit_bedroom');
  
  if(unitBedroom || unitBedroom === 0)
    units = units.filter(unit => unit.bedrooms == unitBedroom)
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

  if(unitsAvailableNow && unitsAvailableNow.length > 0) {
    $(webFilterId).append(`<option value="now"> Now </option>`);
    $(mobileFilterId).append(`<option value="now"> Now </option>`);
  }

  if(unitsAvailableUnder30Days && unitsAvailableUnder30Days.length > 0) {
    $(webFilterId).append(`<option value="0-30"> In the next 30 days </option>`);
    $(mobileFilterId).append(`<option value="0-30"> In the next 30 days </option>`);
  }

  if(unitsAvailableUnder60Days && unitsAvailableUnder60Days.length > 0) {
    $(webFilterId).append(`<option value="31-60"> In 31-60 days </option>`);
    $(mobileFilterId).append(`<option value="31-60"> In 31-60 days </option>`);
  }

  if(unitsAvailableUnder90Days && unitsAvailableUnder90Days.length > 0) {
    $(webFilterId).append(`<option value="61-90"> In 61-90 days </option>`);
    $(mobileFilterId).append(`<option value="61-90"> In 61-90 days </option>`);
  }

  if(unitsAvailableUnder120Days && unitsAvailableUnder120Days.length > 0) {
    $(webFilterId).append(`<option value="91-120"> In 91-120 days </option>`);
    $(mobileFilterId).append(`<option value="91-120"> In 91-120 days </option>`);
  }

  if(units_availability_over_120_days === 'true') {
    const unitsAvailableAbove121Days = filterUnitsBasedOnDate(units, 121, NaN);
    if(unitsAvailableAbove121Days && unitsAvailableAbove121Days.length > 0) {
      $(webFilterId).append(`<option value="121-"> In 121+ days </option>`);
      $(mobileFilterId).append(`<option value="121-"> In 121+ days </option>`);
    }
  }
}

function updateSquareFootageFilterDropdownList(floorplateUnits) {
  floorplateUnits = filterUnitsBasedOnCommunityType(floorplateUnits);
  var unitsSqFeet = floorplateUnits.map(unit => unit.square_feet);
  var uniqueList = getUniqueAndSortedListSquareFeet(unitsSqFeet);
  var maxValue = Math.max(...uniqueList);

  reInitializeDropDownList("square_feet");

  for(var i=0 ; i < uniqueList.length; i++) {
    $('#square_feet').append(`<option value="${uniqueList[i]}"> ${uniqueList[i]} </option>`); //works on web view
    $('#responsive_square_feet').append(`<option value="${uniqueList[i]}"> ${uniqueList[i]} </option>`); //works on mobile view
  }

  disableSquareFeetOptions();
}

function disableSquareFeetOptions() {
  if ($('#square_feet option').length === 0) {
    $('#square_feet').prop('disabled', true).append('<option value="">No option available</option>');
  } else {
    $('#square_feet').prop('disabled', false) 
  }

  if ($('#responsive_square_feet option').length === 0) {
    $('#responsive_square_feet').prop('disabled', true).append('<option value="">No option available</option>');
  } else {
    $('#responsive_square_feet').prop('disabled', false) 
  }
}

function updateMaxPriceFilterDropDownList(floorplateUnits){
  if(display_rent === 'false')
    return; 
  
  floorplateUnits = filterUnitsBasedOnCommunityType(floorplateUnits);
  var unitsMarketRent = floorplateUnits.map(unit => unit.market_rent);
  var uniqueList = getUniqueAndSortedListMarketRent(unitsMarketRent);
  var minValue = Math.min(...uniqueList);

  reInitializeDropDownList("market_rent");

  for(var i=0 ; i < uniqueList.length; i++) {
    $('#market_rent').append(`<option value="${uniqueList[i]}"> ${uniqueList[i]} </option>`); //works on web view
    $('#responsive_market_rent').append(`<option value="${uniqueList[i]}"> ${uniqueList[i]} </option>`); //works on mobile view
  }

  disablePriceRentOptions();
}

function disablePriceRentOptions() {
  if ($('#market_rent option').length === 0) {
    $('#market_rent').prop('disabled', true).append('<option value="">No option available</option>');
  } else {
    $('#market_rent').prop('disabled', false) 
  }

  if ($('#responsive_market_rent option').length === 0) {
    $('#responsive_market_rent').prop('disabled', true).append('<option value="">No option available</option>');
  } else {
    $('#responsive_market_rent').prop('disabled', false) 
  }
}

function filterUnitsBasedOnCommunityType(floorplateUnits) {
  if (has_floorplate == 'true') {
    floorplateUnits = floorplateUnits.filter(unit => unit.floor == current_floor);
  }

  return floorplateUnits;
}

function getUniqueAndSortedListSquareFeet(list) {
  return list.filter((x, i, a) => a.indexOf(x) === i).sort(function (a, b) {  return a - b; });
}

function getUniqueAndSortedListMarketRent(list) {
  return list.filter((x, i, a) => a.indexOf(x) === i).sort(function (a, b) { return b - a; });
}

function reInitializeDropDownList(filter) {
  const webFilterId = "#".concat(filter); //works on web view
  const mobileFilterId = "#responsive_".concat(filter); //works on mobile view

  $(webFilterId).children().remove(); //works on web view
  $(mobileFilterId).children().remove(); //works on mobile view

  if(!(filter == "square_feet" || filter == "market_rent")) {
    $(webFilterId).append(`<option value=""> All </option>`); //works on web view
    $(mobileFilterId).append(`<option value=""> All </option>`); //works on mobile view
  }
}

function showMarkers() {
  $('.marker').addClass('hidden');
  $('.hidden-units').empty();

  units_to_display = filterUnitsBasedOnCommunityType(units);
  renderChangedUnits();
  var json_object = {}
  for (var i = 0; i < units_to_display.length; i++) {
    if ($('#m_' + units_to_display[i]['id']).hasClass('overlapping-unit')) {
      var element = $('#m_' + units_to_display[i]['id']);
      // $('.hidden-units').append('<div class="hidden h-' + $(element).data('unit-x-plot') + '-' + $(element).data('unit-y-plot') + '" id="h-' + $(element).data('title') + '" data-title="' + $(element).data('title') + '" data-community-id="' + $(element).data('community-id') + '" data-unit-id="' + $(element).data('unit-id') + '" data-is-fav="' + $(element).data('is-fav') + '" data-provider="' + $(element).data('provider') + '" data-website="' + $(element).data('website') + '" data-community-property-id="' + $(element).data('community-property-id') + '" data-unit-provider-id="' + $(element).data('unit-provider-id') + '" data-floorplan-provider-id="' + $(element).data('floorplan-provider-id') + '" data-floorplan-name="' + $(element).data('floorplan-name') + '" data-unit-description="' + $(element).data('
      // ') + '" data-unit-lease-pricing="' + $(element).data('unit-lease-pricing') + '" data-unit-marketing-name="' + $(element).data('unit-marketing-name') + '" data-market-rent="' + $(element).data('market-rent') + '" data-square-feet="' + $(element).data('square-feet') + '" data-availability="' + $(element).data('availability') + '" data-available-date="' + $(element).data('available-date') + '" data-bedrooms="' + $(element).data('bedrooms') + '" data-bathrooms="' + $(element).data('bathrooms') + '" data-floorplan-image="' + $(element).data('floorplan-image') + '" data-availability-url="' + $(element).data('availability-url') + '" data-lease-term="' + $(element).data('lease-term') + '"></div>');
      $('.hidden-units').append('<div class="hidden h-' + $(element).data('unit-x-plot') + '-' + $(element).data('unit-y-plot') + '" id="h-' + $(element).data('title') + '" data-title="' + $(element).data('title') + '" data-community-id="' + $(element).data('community-id') + '" data-unit-id="' + $(element).data('unit-id') + '" data-is-fav="' + $(element).data('is-fav') + '" data-provider="' + $(element).data('provider') + '" data-website="' + $(element).data('website') + '" data-community-property-id="' + $(element).data('community-property-id') + '" data-unit-provider-id="' + $(element).data('unit-provider-id') + '" data-floorplan-provider-id="' + $(element).data('floorplan-provider-id') + '" data-floorplan-name="' + $(element).data('floorplan-name') + '" data-unit-description="' + $(element).data('unit-description') + '" data-unit-lease-pricing="' + $(element).data('unit-lease-pricing') + '" data-unit-marketing-name="' + $(element).data('unit-marketing-name') + '" data-market-rent="' + $(element).data('market-rent') + '" data-square-feet="' + $(element).data('square-feet') + '" data-availability="' + $(element).data('availability') + '" data-available-date="' + $(element).data('available-date') + '" data-bedrooms="' + $(element).data('bedrooms') + '" data-bathrooms="' + $(element).data('bathrooms') + '" data-floorplan-image="' + $(element).data('floorplan-image') + '" data-availability-url="' + $(element).data('availability-url') + '" data-lease-term="' + $(element).data('lease-term') + '" data-unit-additional-fees="' + $(element).data('unit-additional-fees') + '"></div>');

      if (!json_object.hasOwnProperty(units_to_display[i]['x_plot'] + '-' + units_to_display[i]['y_plot'])) {
        var overlapping_units = [];
        overlapping_units.push(units_to_display[i])
        json_object[units_to_display[i]['x_plot'] + '-' + units_to_display[i]['y_plot']] = overlapping_units
      } else {
        overlapping_units = json_object[units_to_display[i]['x_plot'] + '-' + units_to_display[i]['y_plot']]
        overlapping_units.push(units_to_display[i])
        json_object[units_to_display[i]['x_plot'] + '-' + units_to_display[i]['y_plot']] = overlapping_units
      }
    } else {
      if (has_floorplate == 'true') {
        adjustMarkerPosition($('#m_' + units_to_display[i]['id']));
      }
      $('#m_' + units_to_display[i]['id']).removeClass('hidden');
    }
  }

  for (var key in json_object) {
    var units_from_json = json_object[key];
    $('#m_' + units_from_json[0]['id'] + ' span').html(units_from_json.length > 1 ? units_from_json.length : '')
    if (has_floorplate == 'true') {
      adjustMarkerPosition($('#m_' + units_from_json[0]['id']));
    }
    $('#m_' + units_from_json[0]['id']).removeClass('hidden');
  }

  disabled_enabled_anchors();
  centerImageOnMobile();
  //mobileFooterAlignment();
}

function handleResize(){
  var url = new URL(window.location.href);
  var timestamp = new Date().getTime();
  if (url.searchParams.has('refresh')) {
    url.searchParams.set('refresh', timestamp);
  } else {
    url.searchParams.append('refresh', timestamp);
  }

  var newUrl = url.toString();

  window.location.href = newUrl;
}

function performHardRefresh() {
  if(performance.navigation.type === 0){
    window.location.reload(true);
  }
}

function setImageHeight(){
  if(current_width >= 993){
    let main_container_height = ($('.c-body').height() - $('.c-footer').height());
    $('.floorplate-image').attr("height", main_container_height - large_image_height)
  }
}

function populate_current_units() {
  $('.marker').addClass('hidden');
  current_units = [];
  
  if (has_floorplate == 'true') {
    $('.amenity-marker').addClass('hidden'); // first hidding all amenity markers
    $('.a_' + current_floor).removeClass('hidden'); // showing amenity markers on current floorplate 
    updateDropdownListValues();
    adjustAmenitiesPosition();

    for (var i = 0; i < units.length; i++) {
      if (units[i]['floor'] == current_floor) {
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

function getFilteredUnits(units, type){
  var new_units = []
  if (type === "Price: Low to High" && display_rent === 'true'){
    new_units = units.sort((a,b) => a['market_rent'] - b['market_rent'])
  } else if (type === "Price: High to Low" && display_rent === 'true'){
    new_units = units.sort((a,b) => b['market_rent'] - a['market_rent'])
  } else if (type === "Sq Ft: More to Less"){
    new_units = units.sort((a,b) => b['square_feet'] - a['square_feet'])
  } else if (type === "Sq Ft: Less to More"){
    new_units = units.sort((a,b) => a['square_feet'] - b['square_feet'])
  } else if (type === "Availability: Soonest to Latest"){
    new_units = units.sort((a,b) => new Date(a['available_date']) - new Date(b['available_date']))
  } else if (type === "Availability: Latest to Soonest"){
    new_units = units.sort((a,b) => new Date(b['available_date']) - new Date(a['available_date']))
  } else {
    new_units = units;
  }
  return new_units
}

function resetToDefaultZoom() {
  // for web
  modalPanZoom.zoomAbs(0, 0, 1);
  modalPanZoom.moveTo(0, 0);

  // for mobile
  responsiveModalPanZoom.zoomAbs(0, 0, 1);
  responsiveModalPanZoom.moveTo(0, 0);
} 

function click_marker_tag(id){
  var marker_tags = document.getElementsByClassName('unit_marker');
  Array.from(marker_tags).forEach(item => {
    if (item.id === id ){
      item.click();
    }
  })
}

function renderChangedUnits(){
  var element = document.getElementById("units-body");
  
  if(element == null) return;
  element.innerHTML = ""
  
  filtered_units = filterUnitsBasedOnCommunityType(units);

  sortType = document.getElementById('filter');
  floorUnits = getFilteredUnits(filtered_units, sortType.value);
  document.getElementById('unit-title-count').innerHTML = floorUnits.length + " " + "Units Found";

  filtered_units.forEach((unit) => {
    var unit_details_div = `
    <div class='left-side-30-units' id='unit_${unit['id']}'>
      <div class='image-styles'>
        <a class='image_link' href='#' id="s_${unit['id']}" onClick=click_marker_tag('s_${unit['id']}')>
          <img src=${unit['floorplan_image']} class='image-image-styles' />
        </a>
      </div>
      <div class='unit-details-section'>
        <p id='unit-detail-market-title'>
          Unit # ${(webCommunity && webCommunity['is_sitemap'] && !webCommunity['display_building']) ? unit['marketing_name'] : (unit['building'] ?  (unit['building'] + "-" + unit['marketing_name']) :  unit['marketing_name']) }
        </p>
      </div>
      <div class='unit-details-section'>
        <p>
        <i class='fa.fa-bed'> &nbsp ${unit['bedrooms']} Bed </i>
        </p>
        <p>
        <i class='fa.fa-bath'> &nbsp ${unit['bathrooms']} Bath </i>
        </p>
        <p>
        <i class='fa.fa-building'> &nbsp ${unit['square_feet']} Sq Ft </i>
        </p>
      </div>
      <div class='unit-details-section'>
        <p id='right-bar-unit-availability'>
          ${ get_unit_availability(unit) }
        </p>
        <p>
          ${unitMarketRent(unit)}
        </p>
      </div>
    </div>
    `;
    
    element.innerHTML += unit_details_div
  });

  unitListHover();
}

function unitMarketRent(unit) {
  return unit['display_rent'] ? `${currency + unit['market_rent']}/month` : ""
}

function unitListHover() {
  let focused_marker ;

  $('div.left-side-30-units').hover(function (e) {
    let unit_num = getUnitNum(e.target);
    const all_markers = document.getElementsByClassName('marker');
    Array.from(all_markers).forEach((marker) => {
      if (unit_num === `unit_${marker.dataset.unitId}`) {
        let selectedMarker = marker;
        if (selectedMarker.classList.contains('overlapping-unit')) {
          Array.from(all_markers).forEach((findOverlappedMarker) => {
            if (
              selectedMarker.dataset.unitXPlot === findOverlappedMarker.dataset.unitXPlot &&
              selectedMarker.dataset.unitYPlot === findOverlappedMarker.dataset.unitYPlot &&
              !findOverlappedMarker.classList.contains("hidden")
            ) {
              selectedMarker = findOverlappedMarker;
            }
          });
        }

        focused_marker = document.getElementById(selectedMarker.id);
        // focused_marker.childNodes[0].style.fontSize = "25px";
        $('#popover-marketing-unit').html(marker.dataset.unitMarketingName);

        const position = selectedMarker.getBoundingClientRect();
        const markerPopover = $('#marker-popover-unit');
        markerPopover.css({
          left: `${position.left - 92}px`,
          top: `${position.top - 53}px`,
          height: "100px",
          background: "transparent",
          margin: "0px",
          padding: "0px"
        });
        markerPopover.removeClass('hidden');
      }
    });
  },
  function () {
    if (focused_marker) {
      // focused_marker.childNodes[0].style.fontSize = "20px";
      $('#marker-popover-unit').addClass('hidden');
    }
  });
}

function unitMarkerHover() {
  $(".marker").hover(function (event) {
    if ($(this).data('is-fav') || favoritesArr.includes($(this).data('unit-id'))) {
      $('.fav-heart').removeClass('hidden')
    } else {
      $('.fav-heart').addClass('hidden')
    }
    $('#popover-marketing-name').html($(this).data('unit-marketing-name') + "</b>");            
      $('#popover-floorplan').html($(this).data('unit-description'))
      
      if( !canShowAdditionalFees($(this).data('unit-additional-fees')) ) {
        $('#popover-floorplan').html($(this).data('unit-additional-fees'))
      }

      $('#popover-floorplan').html($(this).data('unit-lease-pricing'))
      $('#popover-floorplan').html($(this).data('floorplan-name'))
    if ($(this).data('floorplan-image') != '') {
      $('#media-object').attr('src', $(this).data('floorplan-image'));
    } else {
      $('#media-object').attr('src', '/assets/default.jpeg');
    }
    $('#popover-square-feet').html($(this).data('square-feet'));
    $('#popover-bathrooms').html($(this).data('bathrooms'));
    if ($('#popover-bathrooms').html() == '1') {
      $('#popover-bathrooms').siblings("small").html("Bathroom")
    } else {
      $('#popover-bathrooms').siblings("small").html("Bathrooms")
    }
    $('#popover-bedrooms').html($(this).data('bedrooms'));
    if ($('#popover-bedrooms').html() == '1') {
      $('#popover-bedrooms').siblings("small").html("Bedroom")
    } else {
      $('#popover-bedrooms').siblings("small").html("Bedrooms")
    }

    if ($(this).data('sold')) {
      $('#popover-available-date').html('');
      $('#hover-available-text').html('Sold')
    } else {
      $('#hover-available-text').html('Available');
      // $('#popover-available-date').html($(this).data('available-date'));
      $('#popover-available-date').html( formattedDateByRegion( webCommunity.country_code, $(this).data('available-date') ) );
      
    }
  
    $('#popover-price').html((currency + $(this).data('market-rent')))
    var marker_color_map = $(".fa-map-marker-alt")[0].style.color

    const unitElement = document.getElementById('unit_' + $(this).data('unitId'));
    const scrollableParent = document.querySelector('.left-side');

    if (unitElement && scrollableParent) {
      scrollableParent.scrollTo({
        top: unitElement.offsetTop - scrollableParent.offsetTop,
        behavior: 'smooth'
      });
    }
    
    var new_dx = parseInt(event.pageX) - parseInt($('#panzomm-container').offset().left) + parseInt($('#panzomm-container').scrollLeft());
    var new_dy = parseInt(event.pageY) - parseInt($('#panzomm-container').offset().top) + parseInt($('#panzomm-container').scrollTop());
    const diffLeft = webCommunity['is_sitemap'] ? 25 : 115
    $('#marker-popover').css({left: (new_dx + diffLeft) + "px", top: (new_dy - 100) + "px"});
    if (window.innerWidth >= 768) {
      $('#marker-popover').removeClass('hidden');
    }
    $($('#unit_'+ $(this).data('unitId'))).css("border", `5px solid ${marker_color_map}`)
  },
  function() {
    $('#marker-popover').addClass('hidden');
    $($('#unit_'+ $(this).data('unitId'))).css("border", "none")        
  });   
}

function getUnitNum(targetElement) {
  if (targetElement.classList.contains("left-side-30-units")) {
    return targetElement.id;
  } else if (targetElement.classList.contains("image-styles")) {
    return targetElement.parentElement.id;
  } else if (targetElement.classList.contains("image-image-styles")) {
    return targetElement.parentElement.parentElement.parentElement.id;
  } else {
    let closestUnit = $(targetElement).closest('.left-side-30-units');

    if (closestUnit.length > 0) {
      return closestUnit[0].id;
    } else {
      return null;
    }
  }
}


function hasTouch() {
  return 'ontouchstart' in document.documentElement || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0;
}

function disabled_enabled_anchors() {
  var min_market_rent = 100000
  var max_area = 0
  for (var i = 0; i < floors.length; i++) {
    var floorplate_units = [];

    if(floors[i] == current_floor){
      $('#' + floors[i]).addClass("selected");
    } else {
      $('#' + floors[i]).removeClass("selected");
    }

    for (let j = 0; j < units.length; j++) {
      if (units[j]['floor'] == floors[i]) {
        floorplate_units.push(units[j]);
      }
    }

    var floorplate_amenities = [];
    for (let j = 0; j < amenities.length; j++) {
      if (amenities[j]['floor'] == floors[i]) {
        floorplate_amenities.push(amenities[j]);
      }
    }

    var units_to_display = filterUnitsBasedOnCommunityType(units);
    if (units_to_display.length == 0 && floorplate_amenities.length!=0) {
      $('#' + floors[i]).addClass('only-amenity');
      if ($('#' + floors[i]).hasClass('selected')) {
        $('.alert').show()
        timer = setTimeout(function () {
          $('.alert').fadeOut('slow');
        }, 2000);
      }
    } 
    else if (units_to_display.length == 0 && floorplate_amenities.length==0) {
      $('#' + floors[i]).addClass('no-units');
      if ($('#' + floors[i]).hasClass('selected')) {
        $('.alert').show()
        clearTimeout(timeoutId);
      }
    } else {
      $('#' + floors[i]).removeClass('no-units');
      $('#' + floors[i]).removeClass('only-amenity');
      var min_rent_floorplate = Math.min.apply(Math, units_to_display.map(function (o) {
        return o.market_rent;
      }))
      var max_area_floorplate = Math.max.apply(Math, units_to_display.map(function (o) {
        return o.square_feet;
      }))
      if (min_rent_floorplate < min_market_rent)
        min_market_rent = min_rent_floorplate
      if (max_area_floorplate > max_area)
        max_area = max_area_floorplate
    }
    if (floorplate_units.length == 1)
      var str = " unit"
    else
    var str = " units"
    filtered_floorplate_units = floorplate_units; //overall_filtered_units(floorplate_units);
    $('#u_' + floors[i]).html((filtered_floorplate_units.length.toString() + str));
  }
  $('#' + floors[0]).parent().css("border-top", "1px solid #2b3537");
  if ((floors.length > 0)) {
    disable_rent_filter_options(min_market_rent)
    disable_area_filter_options(max_area)
    if($(window).width() <= 993 && $(window).width() >= 568 ){
      $('.mobile-filter-mega-menu').addClass('filters-alignment');
    }
  }
  else{
    $('.custom-iframe-modeule').addClass('sitemap');
    if (units.length == 0 && amenities.length!=0) {
      $('.alert').show()
      timer = setTimeout(function () {
        $('.alert').fadeOut('slow');
      }, 2000);
    } 
    else if (units.length == 0 && amenities.length == 0) {
      $('.alert').show()
      clearTimeout(timeoutId);
    }
    else{
      $('.alert').hide()
    }    
  }
}

function centerImageOnMobile() {
  if($(window).width() < 567) {
    if(webCommunity['is_sitemap']) {
      $('.map-container-center-align').css({"top": "5rem"});
      $('.left-side').css({"top": "6rem"});
    }
    else {
      $('.map-container-center-align').css({"top": "2rem"});
      $('.left-side').css({"top": "17rem"});
    }
  }   
}

function mobileFooterAlignment() {
  const windowWidth = $(window).width();
  const footerCss = {
    "display": "flex",
    "justify-content": "center"
  };

  if (windowWidth <= 993 && windowWidth >= 567) {
    footerCss["bottom"] = 65;
    $('.c-footer').css(footerCss);

  } else if (windowWidth <= 567) {
    // footerCss["bottom"] = webCommunity['is_sitemap'] ? 65 : 130;
    // $('.c-footer').css(footerCss);
    footerCss["bottom"] = 65;
    $('.c-footer').css(footerCss);
  }

}

function change_units_view(evt, type){
  if (type === "list_view"){
    document.getElementsByClassName('zoom-controls zooming-content-h')[0].style.visibility = 'hidden'
    document.getElementsByClassName('zoom-controls zooming-content-h')[1].style.visibility = 'hidden'
    $('.c-footer').hide();
  } else {
    document.getElementsByClassName('zoom-controls zooming-content-h')[0].style.visibility = 'visible'
    document.getElementsByClassName('zoom-controls zooming-content-h')[1].style.visibility = 'visible'
    $('.c-footer').show();
    mobileFooterAlignment();
  }

  var i, tabcontent, tablinks;
  tabcontent = document.getElementsByClassName("tabcontent");
  for (i = 0; i < tabcontent.length; i++) {
    tabcontent[i].style.display = "none";
  }

  tablinks = document.getElementsByClassName("tablinks");
  for (i = 0; i < tablinks.length; i++) {
    tablinks[i].className = tablinks[i].className.replace(" active_unit_view", "");
  }

  document.getElementsByClassName(type)[0].style.display = "block";
  evt.target.parentElement.className += " active_unit_view";

  populate_current_units();
}

function set_yardirentcafe_url(element){
  // var url = $(element).data('availability-url');
  let url =  element.getAttribute("data-availability-url")

  if(selectMap === "3d-map" && enable3DMaps) {
    url = _3dSelectedUnit.availability_url
  }

  window.open(url, '_blank');
}

function set_psi_url(element) {
  let url = element.getAttribute("data-availability-url");

  if(selectMap === "3d-map" && enable3DMaps) {
    url = _3dSelectedUnit.availability_url
  }

  window.open(url, '_blank');
}


function set_resman_url(element)
{
  setApplyNowURLDate(currentUnitSelected);
  leaseTerm = $('#unitModal').find('#lease_term').val().split(' months')[0]
  date = new Date($('#leasing-start-date').val())
  var url = element.getAttribute("data-availability-url") + "&leaseTerm=" + leaseTerm + "&moveInDate=" + date.toISOString().split('T')[0]

  
  if(selectMap === "3d-map" && enable3DMaps) {
    date = new Date();
    url = _3dSelectedUnit.availability_url + "&leaseTerm=" + _3dSelectedUnit.lease_term + "&moveInDate=" + date.toISOString().split('T')[0]
  }

  window.open(url, '_blank');
}

function set_realpagesvc_url(element) {
  setApplyNowURLDate(currentUnitSelected);
  real_page_provider_unit_id = parseInt(real_page_provider_unit_id.split('-')[0])
  var url = apply_now_url + "?MoveInDate=" + $('#leasing-start-date').val() + "&UnitId=" + real_page_provider_unit_id + "&SearchUrl=" + redirect_url;
  
  if(selectMap === "3d-map" && enable3DMaps) {
    apply_now_url = `/communities/${webCommunity.id}/webpages/apply_now`;
    redirect_url = `/communities/${webCommunity.id}/webpages`
    date = new Date()
    real_page_provider_unit_id =  parseInt(_3dSelectedUnit.provider_unit_id.split('-')[0])
    url = url = apply_now_url + "?MoveInDate=" + date.toISOString().split('T')[0] + "&UnitId=" + real_page_provider_unit_id + "&SearchUrl=" + redirect_url;
  }

  window.open(url, '_blank');
}

function disable_rent_filter_options(min_rent) {
  min_rent = parseInt(min_rent)
  var select = document.getElementById("market_rent");
  for (var i = 1; i < select.length; i++) {
    var option = select.options[i];
    var option_rent = option.value.split('-');
    var maximum_option_rent = parseFloat(option_rent[1]);
    if (min_rent >= maximum_option_rent)
      $("#market_rent option[value=" + min_rent + "]").show()
      // $("#market_rent option[value=" + option.value + "]").show()
    else
      $("#market_rent option[value=" + maximum_option_rent + "]").show()
      // $("#market_rent option[value=" + option.value + "]").show()
  }
}

function disable_area_filter_options(max_area) {
  var select = document.getElementById("square_feet");
  for (var i = 1; i < select.length; i++) {
    var option = select.options[i];
    var option_area = option.value.split('-');
    var minimum_option_rent = parseFloat(option_area[0]);
    if (max_area <= minimum_option_rent)
      $("#square_feet option[value=" + option.value + "]").show()
    else
      $("#square_feet option[value=" + option.value + "]").show()
  }
}

function canShowAdditionalFees(additional_fees) {
  return (
    additional_fees == "" || additional_fees == undefined || additional_fees == "undefined"
  );
}

function unitAdditionalFees(additional_fees) {
  hideFees();
  try {
    if (canShowAdditionalFees(additional_fees)) {
      $('#unitModal').find('.c-modal-sidebar-fees').hide();
    }
    else {
      $('#unitModal').find('.c-modal-sidebar-fees').show();
      $('#unitModal').find('.unit-additional-fees').html(additional_fees);
    }
  } catch(err) {
    $('#unitModal').find('.c-modal-sidebar-fees').hide();
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
      "height": "25em",
      "max-height": "25em",
      "overflow-y": "auto"
    });
  } else {
    $("#overall-scroller").css({
      "height": "18em",
      "max-height": "25em",
      "overflow-y": "auto"
    });
  }
}

function setModalAttributes(element) {
  currentUnitSelected = element;

  try {
      if ($(element).data('unit-lease-pricing') == "" || $(element).data('unit-lease-pricing') == undefined)
      {
        $('#unit-lease-pricing-text-li').hide();
        $('#leas-price-option').addClass('hidden');
        $('#unitModal').find('#unit-lease-pricing').html("No more prices are available");
      }
      else
      {
        $('#unit-lease-pricing-text-li').show();
        $('#leas-price-option').removeClass('hidden');
        ss = $(element).data('unit-lease-pricing').split(';');
        leaseTermPricingOptions(ss);
      }
  }
  catch(err) {
      $('#unit-lease-pricing-text-li').hide();
      $('#leas-price-option').addClass('hidden');
      $('#unitModal').find('#unit-lease-pricing').html("No more prices are available");
  }
  try {
      scroller = document.getElementById("overall-scroller");
      if ($(element).data('unit-description') == "")
      {
        $('#unitModal').find('#unit-description').html("Not Available");
        $('#unitModal').find('.c-modal-sidebar-description').hide();
        scroller.style.overflowY= '';
      }
      else
      {
        $('#unitModal').find('.c-modal-sidebar-description').show();
        $('#unitModal').find('#unit-description').html($(element).data('unit-description'));
        $('#unit-description').addClass("description-text");
        scroller.style.overflowY= 'auto';
      }
  }

  catch(err) {
      $('#unit-description-text-li').hide();
      $('#unitModal').find('.c-modal-sidebar-description').hide();
  }

  unitAdditionalFees($(element).data('unit-additional-fees'));
  addVirtualTour(element);

  $('#unitModal').find('#unit-marketing-name').html($(element).data('unit-marketing-name'));
  $('#unitModal').find('#floorplan-name').html($(element).data('floorplan-name'));
  $('#unitModal').find('#square-feet').html($(element).data('square-feet'));
  $('#unitModal').find('#bathrooms').html($(element).data('bathrooms'));
  if ($('#unitModal').find('#bathrooms').html() == '1') {
    $('#unitModal').find('#bathrooms').parents().siblings(".bathrooms").html("Bathroom")
  } else {
    $('#unitModal').find('#bathrooms').parents().siblings(".bathrooms").html("Bathrooms")
  }
  $('#unitModal').find('#bedrooms').html($(element).data('bedrooms'));
  if ($('#unitModal').find('#bedrooms').html() == '1') {
    $('#unitModal').find('#bedrooms').parents().siblings(".bedrooms").html("Bedroom")
  } else {
    $('#unitModal').find('#bedrooms').parents().siblings(".bedrooms").html("Bedrooms")
  }

  if ($(element).data('sold')) {
    $('#unitModal').find('#availability').html("Sold");
    $('#unitModal').find('#available-date').html('');
    $('#unitModal').find('#available-text').html('Unavailable');
  } else {
    if ($(element).data('available')) {
      $('#unitModal').find('#availability').html("Available");
      $('#unitModal').find('#available-text').html('Available');

      // $('#unitModal').find('#available-date').html($(element).data('available-date'));
      $('#available-date').html(formattedDateByRegion(webCommunity.country_code, $(element).data('available-date')));

    } else {
      $('#unitModal').find('#availability').html($(element).data('availability') == "Unoccupied" ? "Available" : "Occupied");
      $('#unitModal').find('#available-text').html('Available');

      // $('#unitModal').find('#available-date').html($(element).data('available-date'));
      $('#unitModal').find( $('#available-date').html(formattedDateByRegion(webCommunity.country_code, $(element).data('available-date'))));

    }
  }

  $('#unitModal').find('#market-rent').html(currency + $(element).data('market-rent'));
  $('#unitModal').find('#total-market-rent').html(currency + $(element).data('market-rent'));
  
  ///////////////////////////////////////////
  real_page_provider_unit_id = $(element).data('unit-provider-id');
  var unit_id = $(element).data('unit-id');
  selectedUnit = units.filter(a => (a.id === $(element).data('unit-id')))[0]
  if ($(element).data('is-fav') || favoritesArr.includes($(element).data('unit-id'))) {
    var community_id = $(element).data('community-id');
    var url = "/communities/" + community_id + "/webpages/delete_favorite?unit_id=" + unit_id;
    var html = '<a href="' + url + '" data-remote="true"><i class="fa fa-heart"></i></a>';
    $('#fav-icon-tag').html(html);
  } else {
    var community_id = $(element).data('community-id');
    var url = "/communities/" + community_id + "/webpages/save_favorite?unit_id=" + unit_id;
    var html = '<a href="' + url + '" data-remote="true"><i class="far fa-heart"></i></a>';
    $('#fav-icon-tag').html(html);
  }
  $('#fav-icon-tag a').unbind('click').bind('click', function (e) {
    var unit_id = $(element).data('unit-id');
     if(favoritesArr.indexOf(unit_id) === -1){
      favoritesArr.push(unit_id)
    }
    else{
      var favIndex = favoritesArr.indexOf($(element).data('unit-id'));
      favoritesArr.splice(favIndex, 1);
    }
  });
  /////////////////////////////////////////
  if ($(element).data('floorplan-image') != '') {
    $('#unitModal').find('#floorplan-image').attr('src', $(element).data('floorplan-image'));
    $('#unitModal').find('#responsive-floorplan-image').attr('src', $(element).data('floorplan-image'));
    if(current_width > 767 && $(element).data('floorplan-image') != "/assets/default.jpeg" ){
      $('.c-modal-sidebar-filters').addClass("c-modal-sidebar-filters-bottom");
      $('.c-m-iframe-content').addClass("c-m-iframe-content-bottom");
    }
  } else {
    $('#unitModal').find('#floorplan-image').attr('src', '/assets/default.jpeg');
    $('#unitModal').find('#responsive-floorplan-image').attr('src', $(element).data('floorplan-image'));
  }
  
  setApplyNowURLDate(element)
  var dataProvider = $(element).data('provider')
  //////////////////////////////////////////
  if (dataProvider != 'realpagesvc') {
    var website = $(element).data('website');
    var uri = website.replace(/^https?\:\/\//, '');
    $('#psi-anchor-tag').attr('data-community-property-id', $(element).data('community-property-id'));
    $('#psi-anchor-tag').attr('data-website', website);
    $('#psi-anchor-tag').attr('data-uri', uri);
    $('#psi-anchor-tag').attr('data-unit-provider-id', $(element).data('unit-provider-id'));
    $('#psi-anchor-tag').attr('data-floorplan-provider-id', $(element).data('floorplan-provider-id'));
    $('#psi-anchor-tag').attr('data-lease-term', $(element).data('lease-term'));
    $('#psi-anchor-tag').attr('data-availability-url', element.getAttribute("data-availability-url") );
  } else if (dataProvider === 'realpagesvc') {
    $('#realpagesvc-anchor-tag').attr('data-unit-provider-id', $(element).data('unit-provider-id'));
  }

  if (dataProvider == 'yardi' || dataProvider == 'yardirentcafe'){
    // $('#floorplan-image').css({"max-width": 310});
    $('.c-modal-footer').css({"padding-bottom": 7});
    $('.m-filters').hide();
  }

  adjustHeightForContentArea();
}

function setApplyNowURLDate(element) {
  $("#leasing-start-date").datepicker('setDate', new Date($(element).data('available-date')));
  // $('#leasing-start-date').datepicker('option', {dateFormat: 'mm/dd/yy', minDate: new Date(), maxDate: new Date() })
  $('#leasing-start-date').datepicker('option', {dateFormat: 'mm/dd/yy', minDate: $(element).data('available-date') == "Now" ? new Date() : new Date($(element).data('available-date'))})
}

function openAmenity3DTourModal(amenity_obj) {
  url = amenity_obj.video_link
  amenityRemoveFrame();
  
  if(url != null && url != "") {
    amenityAddFrame(url) ;
    $('#amenityVirtualTourModal').find('#amenityVirtualName').html(amenity_obj.name);
    $('#amenityVirtualTourModal').modal('show');
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
  ifrm.style.top= 0;
  ifrm.style.bottom= 0;
  ifrm.style.left= 0;
  ifrm.style.width= "100%";
  ifrm.style.height= "100%";
  ifrm.style.border= 0;

  $("#amenity-virtual-tour-ifram-container").append(ifrm);
}


function addVirtualTour(element) {
  removeFrame();
  let label = $(element).data('unit-virtual-tour-label');
  let unit_id = $(element).data('unit-id');
  let url = $(element).data('unit-virtual-tour-url') || $(element).parents().find('#unitModal').parents().find('#m_'+unit_id).data('unit-virtual-tour-url')
  if(url != null && url != "") {
    $('.virtual-tour-btn').css("display", "block");
    $('.virtual-tour-btn').html(label);
    $('#unitVirtualTourModal').find('#unitVirtualName').html($(element).data('unit-marketing-name'));
    addFrame(url) ;

  } else {
    $('.virtual-tour-btn').css("display", "none");
  }
}

function removeFrame() {
  $("#virtual-tour-ifram-container").empty();
}

function addFrame(src) {
  var ifrm = document.createElement("iframe");
  ifrm.setAttribute("src", src);
  ifrm.style.position = "absolute";
  ifrm.style.top= 0;
  ifrm.style.bottom= 0;
  ifrm.style.left= 0;
  ifrm.style.width= "100%";
  ifrm.style.height= "100%";
  ifrm.style.border= 0;

  $("#virtual-tour-ifram-container").append(ifrm);
}

function _3dUnitModalDisplay() {
  $('#unitModal').find('#unit-marketing-name').html(_3dSelectedUnit.marketing_name)
  $('#unitModal').find('#floorplan-name').html(_3dSelectedUnit.floorplan_name);
  $('#unitModal').find('#square-feet').html(_3dSelectedUnit.square_feet);
  $('#unitModal').find('#bathrooms').html(_3dSelectedUnit.bathrooms);

  if ($('#unitModal').find('#bathrooms').html() == '1') {
    $('#unitModal').find('#bathrooms').parents().siblings(".bathrooms").html("Bathroom")
  } else {
    $('#unitModal').find('#bathrooms').parents().siblings(".bathrooms").html("Bathrooms")
  }
  $('#unitModal').find('#bedrooms').html(_3dSelectedUnit.bedrooms);
  if ($('#unitModal').find('#bedrooms').html() == '1') {
    $('#unitModal').find('#bedrooms').parents().siblings(".bedrooms").html("Bedroom")
  } else {
    $('#unitModal').find('#bedrooms').parents().siblings(".bedrooms").html("Bedrooms")
  }

  if (_3dSelectedUnit.sold) {
    $('#unitModal').find('#availability').html("Sold");
    $('#unitModal').find('#available-date').html('');
    $('#unitModal').find('#available-text').html('Unavailable');
  } else {
    if (_3dSelectedUnit.available) {
      _3dDate = _3dSelectedUnit.available_date.split("-")
      $('#unitModal').find('#availability').html("Available");
      $('#unitModal').find('#available-text').html('Available');

      // $('#unitModal').find('#available-date').html(`${_3dDate[2]}/${_3dDate[1]}/${_3dDate[0]}`);
      $('#unitModal').find( $('#available-date').html( formattedDateByRegion(webCommunity.country_code, _3dSelectedUnit.available_date) ) );

    } else {
      $('#unitModal').find('#availability').html(_3dSelectedUnit.availability == "Unoccupied" ? "Available" : "Occupied");
      $('#unitModal').find('#available-text').html('Available');
      // $('#unitModal').find('#available-date').html(_3dSelectedUnit.available_date);
      $('#unitModal').find( $('#available-date').html( formattedDateByRegion(webCommunity.country_code, _3dSelectedUnit.available_date) ) );

    }
  }
  $('#unitModal').find('#market-rent').html(currency + _3dSelectedUnit.market_rent);
  $('#unitModal').find('#total-market-rent').html(currency + _3dSelectedUnit.market_rent + ".00");

  if (!_3dSelectedUnit.is_fav) {
    var community_id = webCommunity.id;
    var unit_id = _3dSelectedUnit.id;
    var url = "/communities/" + community_id + "/webpages/save_favorite?unit_id=" + unit_id;
    var html = '<a href="' + url + '" data-remote="true"><i class="far fa-heart"></i></a>';
    $('#fav-icon-tag').html(html);
  } else {
    var community_id = webCommunity.id;
    var unit_id = _3dSelectedUnit.id;
    var url = "/communities/" + community_id + "/webpages/delete_favorite?unit_id=" + unit_id;
    var html = '<a href="' + url + '" data-remote="true"><i class="fa fa-heart"></i></a>';
    $('#fav-icon-tag').html(html);
  }

  $('#unitModal').find('#floorplan-image').attr('src', _3dSelectedUnit.floorplan_image);

  if (webCommunity.data_provider != 'realpagesvc') {
    var website = webCommunity.website;
    var uri = website.replace(/^https?\:\/\//, '');
    $('#psi-anchor-tag').attr('data-community-property-id', _3dSelectedUnit.community_property_id);
    $('#psi-anchor-tag').attr('data-website', website);
    $('#psi-anchor-tag').attr('data-uri', uri);
    $('#psi-anchor-tag').attr('data-unit-provider-id', _3dSelectedUnit.provider_unit_id);
    $('#psi-anchor-tag').attr('data-floorplan-provider-id', _3dSelectedUnit.provider_floorplan_id);
    $('#psi-anchor-tag').attr('data-lease-term', _3dSelectedUnit.lease_term);
    $('#psi-anchor-tag').attr('data-availability-url', _3dSelectedUnit.availability_url);
    $("#leasing-start-date").datepicker('setDate', new Date(`${_3dDate[2]}/${_3dDate[1]}/${_3dDate[0]}`));
    $('#leasing-start-date').datepicker('option', {dateFormat: 'mm/dd/yy', minDate: new Date(`${_3dDate[2]}/${_3dDate[1]}/${_3dDate[0]}`)})
  } else if (webCommunity.data_provider === 'realpagesvc') {
    $('#realpagesvc-anchor-tag').attr('data-unit-provider-id', _3dSelectedUnit.provider_unit_id);
  }

  if(_3dSelectedUnit.lease_pricing){
    $('#unit-lease-pricing-text-li').show();
    ss = _3dSelectedUnit.lease_pricing.split(';');
    leaseTermPricingOptions(ss);
  } else {
    $('#unit-lease-pricing-text-li').hide();
  }

  if (_3dSelectedUnit.description) {
    $('#unitModal').find('#unit-description').html(_3dSelectedUnit.description);
  }
  else {
    $('#unitModal').find('#unit-description').html("Not Available");
  }

  unitAdditionalFees(_3dSelectedUnit.additional_fees);
}

function leaseTermPricingOptions(ss) {
  var lease = [];
  let first_lease_item = "";
  let smallest_lease_month = "";
  var lease_price_arr = [];
  var lease_months_arr = [];

  var collator = new Intl.Collator(undefined, {numeric: true, sensitivity: 'base'});
  ss = ss.sort(collator.compare).reverse();
  for (var i = 0; i < ss.length -1; i++) {
      var s = ss[i].split(':');
      var sp;
      if (s[2] && s[2] != "")
      {
          sp = s[2] +" - "
      }
      else
      {
          sp = ""
      }
    
      if (s[1] && parseInt(s[1]) > 0 ){
        lease.push(s[0] + " months " + sp + '<b>'+currency+ s[1]+ '<b>' + '<br>')
        lease_price_arr.push(s[1])
        lease_months_arr.push(s[0])
      }
  }

  if(lease_price_arr.every(a => a === lease_price_arr[0])){
    const lease_months_arr_numbers = lease_months_arr.map(str => { return Number(str); });
    const indexOfMinMonth = lease_months_arr_numbers.indexOf(  Math.min(...lease_months_arr_numbers) )
    first_lease_item = lease[indexOfMinMonth]

    if (indexOfMinMonth > -1) {
      lease.splice(indexOfMinMonth, 1);
    }
  }
  else{
    const lease_price_arr_numbers = lease_price_arr.map(str => { return Number(str); });
    const indexOfMinLease = lease_price_arr_numbers.indexOf( Math.min(...lease_price_arr_numbers) )
    first_lease_item = lease[indexOfMinLease]

    if (indexOfMinLease > -1) {
      lease.splice(indexOfMinLease, 1);
    }

  }

  var leaseTermOptions = ""
  
  for (let i = 0; i < lease_months_arr.length; ++i) {
    leaseTermOptions += `<option value="${lease_months_arr[i]+" months"}" data-lease-price="${lease_price_arr[i]}" >${lease_months_arr[i]+" months"}</option>`
  }

  $('#unitModal').find('#unit-lease-pricing').html(lease);
  $('#unitModal').find('#first-unit-lease-pricing').html(first_lease_item);
  $('#unitModal').find('#lease_term').html(leaseTermOptions);
  $(`#lease_term option[value="${first_lease_item[0]+first_lease_item[1]+" months"}"]`).attr("selected", true);
}

function setUnitAttributes(element) {
  $('.modal-unit-button').each(function () {
    $(this).removeClass('btn-primary');
    $(this).addClass('btn-default');
  });
  $(element).removeClass('btn-default');
  $(element).addClass('btn-primary');
  setModalAttributes(element);
}

function getElementHeight(element) {
  var height = $(element).outerHeight();

  return height;
}

// for floorplates
function adjustMarkerPosition(marker) {
  // performHardRefresh()
  /*adjusting markers according to screen size*/
  setImageHeight()
  var in_browser_height = 0;
  var in_browser_width = 0;
  var left_diff = 0;
  unit_id = $(marker).data('unit-id')
  in_browser_height = getElementHeight($('#f_' + current_floor).parent());
  in_browser_width = parseFloat($('#f_' + current_floor).parent().width());

  actual_image_height = parseInt($('#f_' + current_floor).data("height"))
  actual_image_width = parseInt($('#f_' + current_floor).data("width"))
  stretched_image_width = $('#f_' + current_floor).width();
  stretched_image_height = $('#f_' + current_floor).height();
  var x_plot = parseFloat($(marker).data('unit-x-plot'));
  var y_plot = parseFloat($(marker).data('unit-y-plot'));

  left_diff = (in_browser_width - stretched_image_width) / 2
  top_diff = (in_browser_height - stretched_image_height) / 2

  x_plot = (((stretched_image_width / actual_image_width) * x_plot));
  y_plot = (((stretched_image_height / actual_image_height) * y_plot));
  
  const { extra_left_diff, extra_top_diff } = getExtraDiffs();


  $(marker).css({"left": (x_plot + left_diff + extra_left_diff), "top": (y_plot + top_diff + extra_top_diff)});
  
}

function adjustAmenitiesPosition() {
  /*adjusting markers according to screen size*/
  amenity_id = $(this).data('amenity-id')
  
  in_browser_height = parseFloat($('#f_' + current_floor).parent().height());
  in_browser_width = parseFloat($('#f_' + current_floor).parent().width());

  actual_image_height = parseInt($('#f_' + current_floor).data("height"));
  actual_image_width = parseInt($('#f_' + current_floor).data("width"));

  stretched_image_width = $('#f_' + current_floor).width();
  stretched_image_height = $('#f_' + current_floor).height();

  left_diff = (in_browser_width - stretched_image_width) / 2
  top_diff = (in_browser_height - stretched_image_height) / 2

  amenity_width = $('#a_' + amenity_id).width();
  amenity_height = $('#a_' + amenity_id).height();
  const { extra_left_diff, extra_top_diff } = getExtraDiffs();

  // adjusting amenity markers
  $('.a_' + current_floor).each(function () {
    var x_plot = parseFloat($(this).data('amenity-x-plot'));
    var y_plot = parseFloat($(this).data('amenity-y-plot'));

    x_plot = (((stretched_image_width / actual_image_width) * x_plot));
    y_plot = (((stretched_image_height / actual_image_height) * y_plot));

    $(this).css({"left": (x_plot + left_diff + extra_left_diff), "top": (y_plot + top_diff + extra_top_diff)});

  });
}

function _3dMapViewMarkers() {
  let _3dUnitsMarketingNames = getUnitsMarketingNames();
  let cleanedNames = clean3DMarkers(_3dUnitsMarketingNames)
  if(cleanedNames.length > 0)
   _3dFilterByUnits(cleanedNames + ',' + _3dSampleAmenities.join());
  else
    _3dFilterByUnits(cleanedNames);
}

function clean3DMarkers(unit_names) {
  return unit_names.map(a => a.substr(0,3)).join()
}

function getUnitsMarketingNames() {
  return _3dFilteredUnits.map(a => a.marketing_name)
}

function set3DSelectedUnit(unitName, floor) {
  return _3dFilteredUnits.filter(a => (a.marketing_name.substr(0,3) === unitName) )[0];;
}

function handleMapControl() {
  if(selectMap === "3d-map" && enable3DMaps) {
    display3DMap();
    displayOverlayText();
  } else {
    display2DMap();
  }
}

function display3DMap() {
  $("._3d-apply-filter-button").css("display", "block");
  $(".beans-map-container").show();
  $('.zooming-content').css("float", "right");
  image_width_2d = parseInt($('.sitemap-image').width());
  $('.image-map').hide();
  $('.zoom-in-webpage').hide();
  $('.zoom-out-webpage').hide();
  $("#panzomm-container").css("width", "100%");
  // $(".location-items").hide();
  $(".c-wrapper").css("margin-left", "0px");
  $(".c-footer").css("margin-left", "0px");
  $(".desktop-content").hide();
  $(".2d-map-option").removeClass("hidden");
  $(".3d-map-option").addClass("hidden");
  $(".satelite-view-icon").removeClass("hidden");
  $(".div.map-instruction-text").removeClass('hidden');
  // display3DMapInstructions();
  let windowWidth = window.innerWidth;
  let footerWidth = document.getElementById("footer");
  let sideBarWidth = $(".c-sidebar").innerWidth();
  if($(window).width() <= 567){
    footerWidth.style.bottom = "140px";
    $('.map-instruction-text').hide();
    $(".beans-map-container").css("width", windowWidth);
    footerWidth.style.width = windowWidth;
  } else if (windowWidth >= 567 && windowWidth <= 991){
    $('.map-instruction-text').hide();
    let mapWidth = (windowWidth - sideBarWidth)
    footerWidth.style.width = mapWidth;
  }
  else {
    let mapWidth;
    if (sideBarWidth){
      mapWidth = (windowWidth - sideBarWidth);
    } else {
      mapWidth = windowWidth;
    }
    $(".beans-map-container").css("width", mapWidth);
    footerWidth.style.width = mapWidth;
  }
  if(defaultMapType != "3d-map"){
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
  $('.image-map').show();
  $('.zoom-in-webpage').show();
  $('.zoom-out-webpage').show();
  $("#panzomm-container").css("width", "");
  $(".c-wrapper").css("margin-left", "90px");
  $(".c-footer").css("margin-left", webCommunity['is_sitemap'] ? "0px" : "90px");
  $(".c-sidebar").show();
  $(".desktop-content").show();
  $(".satelite-view-icon").addClass("hidden");
  $(".3d-map-option").removeClass("hidden");
  $(".2d-map-option").addClass("hidden");
  $(".div.map-instruction-text").addClass('hidden');
  if(defaultMapType == "3d-map"){
    showMarkers();
  }
  let sidebarDiv = document.getElementsByClassName('c-sidebar')[0]
  let leftSideWidth = document.getElementsByClassName("left-side")[0];
  let rightSideWidth = document.getElementsByClassName("right-side")[0];
  let title = document.getElementsByClassName("webpage-left-list-view-title")[0];
  title.style.width = `${leftSideWidth.offsetWidth - 12}px`;
  let inner_footer = $(".inner-footer")[0];
  let footerWidth = document.getElementById("footer");
  var windowWidth = $(window).width();
  footerWidth.style.width = `${windowWidth - (leftSideWidth.offsetWidth)}px`;
  if (selectMap !== "3d-map"){
    if (sidebarDiv) {
      leftSideWidth.style.width = `${windowWidth - (sidebarDiv.offsetWidth + rightSideWidth.offsetWidth)}px`;
      title.style.width = `${leftSideWidth.offsetWidth}px`;
      let footerWidth = document.getElementById("footer");
      if (windowWidth >= 567 && windowWidth <= 991) {
        title.style.width = `Calc(100% - ${sidebarDiv.offsetWidth}px)`;
        inner_footer.style.width = `Calc(100% - ${sidebarDiv.offsetWidth}px)`;
        footerWidth.style.width = `${windowWidth - (sidebarDiv.offsetWidth)}px`;
      } else if (windowWidth >= 991 ) {
        title.style.width = `${leftSideWidth.offsetWidth - 12}px`;
        inner_footer.style.width = "100%";
        footerWidth.style.width = `${windowWidth - (sidebarDiv.offsetWidth + leftSideWidth.offsetWidth)}px`;
      }
      else {
        inner_footer.style.width = "100%"
        inner_footer.style.marginBottom = 15;
        footerWidth.style.bottom = "6rem";
      }
    } else {
      if (windowWidth >= 567 && windowWidth <= 991) {
        title.style.width = "100%";
        inner_footer.style.marginBottom = 0;
      } else if (windowWidth >= 991 ) {
        inner_footer.style.width = "100%";
      }
    }

    handleViewportChange(windowWidth);
    let markerColor = $(".fa-map-marker-alt")[0].style.color;
    markerColor =  isColorWhite(markerColor) ? "grey" : markerColor
    
    $(".popup-title").css("background-color", markerColor);
    $(".popup-arrow").css("background-color", markerColor);

    $(".custom-select").change(()=> {
      renderChangedUnits();
    })
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
    $(".c-footer").css("margin-left", "0px");
    filters_width = "100%"; buttons_width = "100%";
  } else if (viewportWidth >= 567 && viewportWidth <= 768) {
    filters_width = "100%"; buttons_width = "50%";
  } else if (viewportWidth >= 768 && viewportWidth <= 993) {
    if(webCommunity['is_sitemap']) {
      filters_width = "100%"; buttons_width = "50%"; 
    } else {
      filters_width = "100%"; buttons_width = "50%"; 
    }
  }  else if (viewportWidth >= 993 && viewportWidth <= 1050) {
    if(webCommunity['is_sitemap']) {
      if($(".colourd-btn").is(":visible")){
        filters_width = "55%"; buttons_width = "25%"; 
      } else{
        filters_width = "60%"; buttons_width = "13%"; 
      }
    } else {
      if($(".colourd-btn").is(":visible")){
        filters_width = "100%"; buttons_width = "43%"; 
      } else{
        filters_width = "100%"; buttons_width = "20%"; 
      }
    }
  } else if (viewportWidth >= 1050 && viewportWidth <= 1120) {
    if(webCommunity['is_sitemap']) {
      if($(".colourd-btn").is(":visible")){
        filters_width = "52%"; buttons_width = "22%"; 
      } else{
        filters_width = "57%"; buttons_width = "14%";
      }       
    } else {
      if($(".colourd-btn").is(":visible")){
        filters_width = "65%"; buttons_width = "27%"; 
      } else{
        filters_width = "60%"; buttons_width = "17%";
      } 
       
    }
  } else if (viewportWidth >= 1120 && viewportWidth <= 1180) {
    if(webCommunity['is_sitemap']) {
      if($(".colourd-btn").is(":visible")){
        filters_width = "52%"; buttons_width = "22%"; 
      } else{
        filters_width = "55%"; buttons_width = "16%";
      } 
    } else {
      if($(".colourd-btn").is(":visible")){
        filters_width = "53%"; buttons_width = "24%";
      } else{
        filters_width = "60%"; buttons_width = "17%";
      } 
    }
  } else if (viewportWidth >= 1180 && viewportWidth <= 1300) {
    if(webCommunity['is_sitemap']) {
      if($(".colourd-btn").is(":visible")){
        filters_width = "47%"; buttons_width = "24%"; 
      } else{
        filters_width = "57%"; buttons_width = "14%";
      }
    } else {
      if($(".colourd-btn").is(":visible")){
        filters_width = "51%"; buttons_width = "25%";
      } else{
        filters_width = "60%"; buttons_width = "16%";
      }
    }
  }else if (viewportWidth >= 1300 && viewportWidth <= 1370) {
    if(webCommunity['is_sitemap']) {
      if($(".colourd-btn").is(":visible")){
        filters_width = "45%"; buttons_width = "26%";
      } else{
        filters_width = "55%"; buttons_width = "15%";
      }
    } else {
      if($(".colourd-btn").is(":visible")){
        filters_width = "49%"; buttons_width = "28%";
      } else{
        filters_width = "60%"; buttons_width = "16%";
      }
    }
  } else if (viewportWidth >= 1370 && viewportWidth <= 1470) {
    if(webCommunity['is_sitemap']) {
      filters_width = "50%"; buttons_width = "27%"; 
    } else {
      filters_width = "70%"; buttons_width = "35%"; 
    }
  }else if (viewportWidth >= 1470 && viewportWidth <= 1520) {
    if(webCommunity['is_sitemap']) {
      filters_width = "52%"; buttons_width = "25%"; 
    } else {
      filters_width = "70%"; buttons_width = "35%"; 
    }
  } else if (viewportWidth >= 1520) {
    if(webCommunity['is_sitemap']) {
      filters_width = "51%"; buttons_width = "25%"; 
    } else {
      filters_width = "61%"; buttons_width = "35%";
    }
  }

  setCSSForElements(".custom-iframe-modeule .selection-fields", filters_width);
  setCSSForElements(".custom-iframe-modeule .header-buttons-groups", buttons_width);
  // setCSSForElements(".custom-iframe-modeule .app-logo", logo_width);
}

function setCSSForElements(element, percentage){
  $(`${element}`).css("width", percentage)
}

function _3dFilterByFloor(floor) {
  floorNumber = floor.id; //parseInt(floor.id)
  if(selectMap == "3d-map"){
    beansWidget.filterByFloor(floorNumber)
  }
}

function _3dFilterByUnits(_3dUnits) {
  beansWidget.filterByUnit(_3dUnits)
}

function toggleToSateliteView(){
  beansWidget.toggleMap();
}

function apply3DFilters() {
  if(selectMap === "3d-map" && enable3DMaps) {
    _3dMapViewMarkers();
  }
}

function resetFilters() {
  units = current_units
  $("#responsive_unit_bedroom").val($("#responsive_unit_bedroom option:first").val());
  $("#unit_bedroom").val($("#unit_bedroom option:first").val());

  if($(window).width() <= 993)
    $('.mobile-filter-mega-menu').slideToggle();
  
  bedroomFilterChanged();
  showMarkers();
}

function applyFilters(){
  if(selectMap === "3d-map" && enable3DMaps) {
    _3dMapViewMarkers();
  }
  else{
    showMarkers();
  }
  
  selected_market_rent = $("#responsive_market_rent option:selected").text();
  selected_square_feet = $("#responsive_square_feet option:selected").text();
  selected_available_unit = $("#responsive_available_unit option:selected").text();
  selected_unit_bedrooms = $("#responsive_unit_bedroom option:selected").text();

  $("#max_price_responsive").html(currency+selected_market_rent);
  $("#sq_feet_responsive").html(selected_square_feet);
  $("#unit_availability").html(selected_available_unit);
  $("#bedroom_responsive").html(selected_unit_bedrooms);
  $('.mobile-filter-mega-menu').slideToggle();
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
      if (typeof webCommunity !== "undefined" && webCommunity.country_code) {
        availableDateString = `Available: ${formattedDateByRegion(webCommunity.country_code, availableDate.toDate())}`;
      } else {
        availableDateString = `Available: ${formattedDateByRegion("US", availableDate.toDate())}`;
      }
    }
  } else {
    availableDateString = "Unavailable:";
  }

  return availableDateString;
}

/* --------------------------- Start-Webpages Analytics track Activities Section ---------------------------------------------*/

$(document).ready(function() {
  mapContainerClickEvents();

  trackingMapClickEvents();
  trackingMapHoverEvents();
});

function updateActivityData(activityName, activityEvent) {
  const payload = {
    activity: {
      name: activityName,
      event: activityEvent,
    }
  };

  const community_id = $("#maps_community_id").val();
  if (community_id) {
    $.ajax({
      type: "POST",
      url: `/communities/${community_id}/webpages/activity_tracking`,
      data: JSON.stringify(payload),
      contentType: "application/json",
      success: function(response) {}
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
  $(document).off("mouseenter", ".amenity-marker").on("mouseenter", ".amenity-marker", function () {
    console.log("Amenity Marker hovered");
    updateActivityData("amenity_marker", "hover");
  });  
  
  $(document).off("mouseenter", ".sitemap-amenity-marker").on("mouseenter", ".sitemap-amenity-marker", function () {
    console.log("Amenity Marker hovered");
    updateActivityData("amenity_marker", "hover");
  });  
}

function unitMarkerHoverEvent() {
  $(document).off("mouseenter", ".unit_marker").on("mouseenter", ".unit_marker", function () {
    console.log("Unit Marker hovered");
    updateActivityData("unit_marker", "hover");
  });
}

function unitsListHoverEvent() {
  $(document).off("mouseenter", ".left-side-30-units").on("mouseenter", ".left-side-30-units", function () {
    console.log("Unit Box hovered");
    updateActivityData("unit_marker", "hover");
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
  $(document).off("click", ".amenity-marker").on("click", ".amenity-marker", function () {
    console.log("Amenity Marker Clicked");
    updateActivityData("amenity_marker", "click");
  }); 
  
  $(document).off("click", ".sitemap-amenity-marker").on("click", ".sitemap-amenity-marker", function () {
    console.log("Amenity Marker Clicked");
    updateActivityData("amenity_marker", "click");
  }); 
}

function unitMarkerClickEvent() {
  $(document).off("click", ".unit_marker").on("click", ".unit_marker", function () {
    console.log("Unit Marker Clicked");
    updateActivityData("unit_marker", "click");
  });
}

function sortingFilterClickEvent() {
  $(document).off("mousedown", "#filter").on("mousedown", "#filter", function () {
    console.log("Unit Box Clicked");
    updateActivityData("sorting_filter", "click");
  });
}

function bedroomFilterClickEvent() {
  $(document).off("mousedown", "#unit_bedroom").on("mousedown", "#unit_bedroom", function () {
    console.log("Bedroom filter Clicked");
    updateActivityData("bedroom_filter", "click");
  });

  $(document).off("mousedown", "#responsive_unit_bedroom").on("mousedown", "#responsive_unit_bedroom", function () {
    console.log("Bedroom filter Clicked");
    updateActivityData("bedroom_filter", "click");
  });
}

function pricingFilterClickEvent() {
  $(document).off("mousedown", "#market_rent").on("mousedown", "#market_rent", function () {
    console.log("Pricing filter Clicked");
    updateActivityData("pricing_filter", "click");
  });

  $(document).off("mousedown", "#responsive_market_rent").on("mousedown", "#responsive_market_rent", function () {
    console.log("Pricing filter Clicked");
    updateActivityData("pricing_filter", "click");
  });
}

function squareFootageFilterClickEvent() {
  $(document).off("mousedown", "#square_feet").on("mousedown", "#square_feet", function () {
    console.log("Square Feet filter Clicked");
    updateActivityData("square_feet_filter", "click");
  });

  $(document).off("mousedown", "#responsive_square_feet").on("mousedown", "#responsive_square_feet", function () {
    console.log("Square Feet filter Clicked");
    updateActivityData("square_feet_filter", "click");
  });
}

function availabilityFilterClickEvent() {
  $(document).off("mousedown", "#available_unit").on("mousedown", "#available_unit", function () {
    console.log("Available date filter Clicked");
    updateActivityData("availability_filter", "click");
  });

  $(document).off("mousedown", "#responsive_available_unit").on("mousedown", "#responsive_available_unit", function () {
    console.log("Available date filter Clicked");
    updateActivityData("availability_filter", "click");
  });
}

function resetFilterClickEvent() {
  $(document).off("click", ".reset-filter-button").on("click", ".reset-filter-button", function () {
    console.log("Reset filter Clicked");
    updateActivityData("reset_filter", "click");
  });
}

function view3DTourClickEvent() {
  $(document).off("click", ".virtual-tour-btn").on("click", ".virtual-tour-btn", function () {
    console.log("View 3D Clicked");
    updateActivityData("virtual_tour", "click");
  });
}

function modalUnitButtonsClickEvent() {
  $(document).off("click", ".modal-unit-button").on("click", ".modal-unit-button", function () {
    console.log("Unit Modal Button Clicked");
    updateActivityData("unit_modal_buttons", "click");
  });
}

function pricingMatrixClickEvents() {
  $(document).off("click", ".show-more").on("click", ".show-more", function () {
    console.log("Show more pricing Clicked");
    updateActivityData("open_pricing_matrix", "click");
  });

  // $(document).off("click", ".hide-more-price").on("click", ".hide-more-price", function () {
  //   console.log("Hide more pricing Clicked");
  //   updateActivityData("hide_pricing_matrix", "click");
  // });
}

function viewSavedButtonClickEvent() {
  $(document).off("click", ".view-saved-btn").on("click", ".view-saved-btn", function () {
    console.log("View Saved Clicked");
    updateActivityData("view_saved", "click");
  });
}

function scheduleTourButtonClickEvent() {
  $(document).off("click", ".schedule-tour-btn").on("click", ".schedule-tour-btn", function () {
    console.log("Schedule tour Clicked");
    updateActivityData("schedule_tour", "click");
  });
}

function logoIconClickEvent() {
  $(document).off("click", ".app-logo").on("click", ".app-logo", function () {
    console.log("App Logo Clicked");
    updateActivityData("logo", "click");
  });
}

function floorNumberClickEvent() {
  $(document).off("click", ".slick-slide").on("click", ".slick-slide", function () {
    console.log("Floor Number Clicked");
    updateActivityData("floor_number", "click");
  });
}

function zoomInClickEvent() {
  $(document).off("click", ".plus-action").on("click", ".plus-action", function () {
    console.log("Zoom In Clicked");
    updateActivityData("zoom_in", "click");
  });
}

function zoomOutClickEvent() {
  $(document).off("click", ".minus-action").on("click", ".minus-action", function () {
    console.log("Zoom out Clicked");
    updateActivityData("zoom_out", "click");
  });
}

function zoomRefreshClickEvent() {
  $(document).off("click", ".refresh-action").on("click", ".refresh-action", function () {
    console.log("Zoom Refresh Clicked");
    updateActivityData("zoom_refresh", "click");
  });
}

function clearAllFavoritesClickEvent() {
  $(document).off("click", ".clear-all").on("click", ".clear-all", function () {
    console.log("Clear Favorite Clicked");
    updateActivityData("clear_favorites", "click");
  });
}

function shareFavoritesButtonClickEvent() {
  $(document).off("click", ".share-favorite").on("click", ".share-favorite", function () {
    console.log("Share Favorite Clicked");

    updateActivityData("sent_favorite", "click");
  });
}

function applyNowClickEvent() {
  $(document).off("click", ".apply_now").on("click", ".apply_now", function () {
    console.log("Apply now Clicked");
    updateActivityData("apply_now_count", "click");
  });
}

function mapContainerClickEvents() {
  $('.maps-analytics-container').off('click').on('click', function (event) {
    console.log("Container Clicked");
    updateActivityData("other", "click");    
  });

  $('.maps-analytics-container').off('mousemove').on('mousemove', function (event) {

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

/* --------------------------- Start-Webpages Analytics track Activities Section ---------------------------------------------*/
