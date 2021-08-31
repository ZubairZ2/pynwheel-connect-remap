var selectMap;
var webCommunity;
var _3dFilteredUnits;
var _3dAmenities;
var _3dSelectedUnit;
var _3dFilteredAmenity;
var _3dSampleAmenities = ["SWIMMINGPOOL", "GYM", "BBQ", "SPA", "OFFICE", "ST", "EL", "EN"]


$(document).ready(function () {
  webCommunity = $("#communityWebpagesData").data("community");
  _3dAmenities = $("#communityWebpagesData").data("amenities");


  if(webCommunity) {
    selectMap = webCommunity.web_map_type;

    if(webCommunity.web_map_type === "3d-map") {
      beansWidget.initMap(`${webCommunity.address}, ${webCommunity.city}, ${webCommunity.state}`, "OWU3MWI0NDgzNzlkNGQ0OjYyNjEzNzY1MzgzODYxMzA2NDYxMzczMTM0Mzk2MzMyMzg2NTY0NjE=", {'click-popup-listener' : polygonClickPopup, 'polygon-color' : '#f4f4f4', 'selected-polygon-color' : '#f4f4f4', 'selected-unit-color' : '#0000ff'});    
    }

    handleMapControl()
  }
});


$(window).bind('load', function () {
    // $( window ).on( "orientationchange", function( event ) {
    //     $(".divLoading").removeClass("hidden");
    //     window.location.reload();
    // });

  if ($('.is-webpage')[0]) {
    // $(".panzoom").addClass("transform-none");
    // $(document).on("click touchstart", ".zoom-controls", function () {
    //   $(".panzoom").removeClass("transform-none");
    // });
    showMarkeronLoad();
    $('[data-toggle="tooltip"]').tooltip({trigger: "hover"}); // initialize bootstrap tooltip
    ////////////// Disable browser zoom for webpage  starts here ////////////////
    $(document).keydown(function (event) {
      if (event.ctrlKey == true && (event.which == '61' || event.which == '107' || event.which == '173' || event.which == '109' || event.which == '187' || event.which == '189')) {
        event.preventDefault();
      }
      // 107 Num Key  +
      // 109 Num Key  -
      // 173 Min Key  hyphen/underscor Hey
      // 61 Plus key  +/= key
    });

    $(window).bind('mousewheel DOMMouseScroll', function (event) {
      if (event.ctrlKey == true) {
        // event.preventDefault();
      }
    });
    ////////////// Disable browser zoom for webpage  ends here ////////////////
    $('#clickme').click(function () {
      $("#clickme").html($("#clickme").html() == 'Select Filter' ? 'Hide Filter' : 'Select Filter');
      var $slider = $('.mydiv');
      //$('.right-side').css('margin-left', '0');
      $slider.animate({
        left: parseInt($slider.css('left'), 10) == -331 ?
                0 : -331
      });
    });
    ////////////////////////////////////////////////
    $('#leasing-start-date-icon').click(function (event) {
      event.preventDefault();
      // console.log('********************');
      $('#leasing-start-date').focus();
    });
    ////////////////////////////////////////////////
    // $('.panzoom a').on('mousedown touchstart', function (e) {
    //   e.stopImmediatePropagation();
    // });
    ////////////////////////////////////////////////
    /* unit modal*/
    $('#unitModal').on('show.bs.modal', function (e) {
      if(selectMap === "3d-map") {
        _3dUnitModalDisplay();
        $('.unit-buttons').addClass('hidden');
      }
      else {
        $('.unit-buttons').empty();
        $('.unit-buttons').addClass('hidden');
        if ($('.h-' + $(e.relatedTarget).data('unit-x-plot') + '-' + $(e.relatedTarget).data('unit-y-plot')).length > 1) {
          $('.h-' + $(e.relatedTarget).data('unit-x-plot') + '-' + $(e.relatedTarget).data('unit-y-plot')).each(function () {
            console.log('CLick on marker for displaying multiple units');
            var target_id = $(e.relatedTarget).attr('id');
            var underneath_unit_id = $(this).attr('id');
            var button_style = ""
            if (target_id.split('_')[1] == underneath_unit_id.split('-')[1]) {
              button_style = "btn-primary"
            } else {
              button_style = "btn-default"
            }
            $('.unit-buttons').removeClass('hidden');
            $('.unit-buttons').append('<button class="btn modal-unit-button ml-5 ' + button_style + '" type="button" data-title="' + $(this).data('title') + '" data-community-id="' + $(this).data('community-id') + '" data-unit-id="' + $(this).data('unit-id') + '" data-is-fav="' + $(this).data('is-fav') + '" data-provider="' + $(this).data('provider') + '" data-website="' + $(this).data('website') + '" data-community-property-id="' + $(this).data('community-property-id') + '" data-unit-provider-id="' + $(this).data('unit-provider-id') + '" data-floorplan-provider-id="' + $(this).data('floorplan-provider-id') + '" data-floorplan-name="' + $(this).data('floorplan-name') + '" data-unit-description="' + $(this).data('unit-description') + '" data-unit-marketing-name="' + $(this).data('unit-marketing-name') + '" data-market-rent="' + $(this).data('market-rent') + '" data-square-feet="' + $(this).data('square-feet') + '" data-availability="' + $(this).data('availability') + '" data-available-date="' + $(this).data('available-date') + '" data-bedrooms="' + $(this).data('bedrooms') + '" data-bathrooms="' + $(this).data('bathrooms') + '" data-floorplan-image="' + $(this).data('floorplan-image') + '" data-lease-term="' + $(this).data('lease-term') + '" onclick="setUnitAttributes(this);">' + $(this).data('title') + '</button>');
          });
        }
        setModalAttributes(e.relatedTarget);
      }
    });

    function showMarkeronLoad(){
      console.log("in show marker load function")
      showMarkers();
    }

    /////////////////////////////////////////
    setFilters();
    /////////////////////////////////////////
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
    $('#market_rent').change(function () {
      debugger
      console.log('market_rent is changed')
      // $("#max_price_responsive").html($('#market_rent'.text()));
      showMarkers(true);
    });
    $('#square_feet').change(function () {
      // $("#sq_feet_responsive").html($('#square_feet'.text()))
      showMarkers();
    });
    $('#unit_bedroom').change(function () {
      // debugger
      // $("#bedroom_responsive").html($('#unit_bedroom'.text()))
      console.log('bedroom selected')
      showMarkers();
    });
    $('#available_unit').change(function () {
      // debugger
      // $("#unit_availability").html($('#available_unit'.text()))
      console.log('availability option selected')
      showMarkers();
    });
    ////////////////////////////////////////
    // if($('#unit_bedroom').text().split(" ")[0] == "All"){
    //   showMarkers();
    // }


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
    $('.floorplate-anchor').click(function () {
      // $(".panzoom").addClass("transform-none");
      // console.log('clicking on anchor tag');
      // var $section = $('#panzomm-container');
      // $panzoom = $section.find('.panzoom').panzoom("reset");
      var floor_for_showing_image = $(this).attr('id');
      if (floor_for_showing_image != current_floor) { // && !$(this).hasClass('no-units')
        $('.floorplate-image').addClass('hidden');
        $('#f_' + floor_for_showing_image).removeClass('hidden');
        $('.floorplate-anchor').removeClass('selected');
        $('#' + floor_for_showing_image).addClass('selected');
        current_floor = floor_for_showing_image
        populate_current_units();
        if ($(this).hasClass('no-units'))
          $(".alert").show()
        else
          $(".alert").hide()
        setTimeout(function () {
          $('.alert').fadeOut('slow');
        }, 6000); // <-- time in milliseconds
      }
    });
    ////////////////////////////////////////////
    $('.filter-label').click(function () {
      $(this).parent().find('input').click();
    });
    ////////////////////////////////////////////
    
    $('#zoomable a').on('touchstart', function (e) {
      e.stopImmediatePropagation();
    });
    var $area = document.getElementById('zoomable');
    window.pz = panzoom($area, 
      {
        bounds: true, contain: 'automatic', smoothScroll: false,
        maxZoom: 5,
        minZoom: 1,
        zoomDoubleClickSpeed: 1,
       
        onTouch: function(e) {
          // `e` - is current touch event.
          // $.get('/api/v1/communities/3/test_panzoom?keyCode='+$(e.path[1]))
          e.preventDefault();
          // $(e.path[1]).click();
          return false; // tells the library to not preventDefault.
        }
      });
    
    $(".reset").on('click', function (e) {
      $(".divLoading").removeClass("hidden");
      window.location.reload()
    });
    
    $(".zoom-in").on('click', function (e) {
      window.pz.zoomInOut(187);
    });


    $(".zoom-out").on('click', function (e) {
      window.pz.zoomInOut(189);
    });

    /////////////////////////////////////////////
    /*popover*/
    if (!hasTouch()) {
      $(".marker")
              .mouseenter(function (event) {
                if ($(this).data('is-fav')) {
                  $('.fav-heart').removeClass('hidden')
                } else {
                  $('.fav-heart').addClass('hidden')
                }
                $('#popover-marketing-name').html($(this).data('unit-marketing-name') + "</b>");
                  $('#popover-floorplan').html($(this).data('unit-description'))
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
                  $('#popover-available-date').html($(this).data('available-date'));
                }

                $('#popover-price').html(('$' + $(this).data('market-rent')));

                var new_dx = parseInt(event.pageX) - parseInt($('#panzomm-container').offset().left) + parseInt($('#panzomm-container').scrollLeft());
                var new_dy = parseInt(event.pageY) - parseInt($('#panzomm-container').offset().top) + parseInt($('#panzomm-container').scrollTop());
                $('#marker-popover').css({left: (new_dx + 100) + "px", top: (new_dy - 120) + "px"});
                $('#marker-popover').removeClass('hidden');
              })
              .mouseleave(function () {
                $('#marker-popover').addClass('hidden');
              });
    }
    ///////////////////////////////////////////////
    /*adjusting markers according to screen size*/

    populate_current_units();

    if (!(has_floorplate == 'true')) {
      var in_browser_height = 0;
      var in_browser_width = 0;
      var actual_height = 0;
      var actual_width = 0;
      var extra_width = 0;
      var extra_hieght = 0;
      in_browser_height = parseFloat($('.floorplate-image').parent().height());
      in_browser_width = parseFloat($('.floorplate-image').parent().width());
      actual_height = parseInt($('.floorplate-image').data("height"));
      actual_width = parseInt($('.floorplate-image').data("width"));

      // var propertyMapImg = document.getElementById('property-map-image');
      // if(actual_width > in_browser_width && actual_height > in_browser_height) {
      //   actual_width = propertyMapImg.clientWidth;
      //   actual_height = propertyMapImg.clientHeight;
      // }
      // setTimeout(function(){ 
      //   // debugger
      //   actual_width = propertyMapImg.clientWidth;
      //   actual_height = propertyMapImg.clientHeight; 
      // }, 3000);
      
      // if( actual_height > in_browser_height && actual_width > in_browser_width){
      //   actual_width = propertyMapImg.clientWidth;
      //   actual_height = propertyMapImg.clientHeight;
      //   // extra_width = actual_width - in_browser_width
      //   // extra_hieght = actual_height - in_browser_height
      //   // actual_width = actual_width - extra_width
      //   // actual_height = actual_height - extra_hieght
      // }
      if (actual_width < in_browser_width)
        var width_ratio = 1;
      else
        var width_ratio = actual_width / in_browser_width;
      if (actual_height < in_browser_height)
        var height_ratio = 1;
      else
        var height_ratio = actual_height / in_browser_height;

      $('.marker').each(function () {
        var x_plot = parseFloat($(this).data('unit-x-plot'));
        var y_plot = parseFloat($(this).data('unit-y-plot'));

        //TODO::Fix it dynamically. It is temporary fix right now
        if(actual_width > in_browser_width && actual_height > in_browser_height) {
          if(actual_width >= 5884){
            current_left = x_plot / width_ratio - 6;
            current_top = y_plot / height_ratio - 20;
          }
          if(actual_width >= 2824 && actual_width < 5884 ){
            current_left = x_plot / width_ratio - 4;
            current_top = y_plot / height_ratio - 13;
          }
          if(actual_width < 2824 && actual_width > 1568){
            current_left = x_plot / width_ratio - 1;
            current_top = y_plot / height_ratio - 6;
          }
          if(actual_width < 2824){
            current_left = x_plot / width_ratio;
            current_top = y_plot / height_ratio;
          }
        }
        else {
          current_left = x_plot / width_ratio;
          current_top = y_plot / height_ratio;
        }
        // $(this).css({"left": current_left-4, "top": current_top-14});
        $(this).css({"left": current_left, "top": current_top});
      });

      $('.sitemap-amenity-marker').each(function () {
        var x_plot = parseFloat($(this).data('amenity-x-plot'));
        var y_plot = parseFloat($(this).data('amenity-y-plot'));
        if(actual_width > in_browser_width && actual_height > in_browser_height) {
          if(actual_width >= 5884){
            current_left = x_plot / width_ratio - 6;
            current_top = y_plot / height_ratio - 20;
          }
          if(actual_width >= 2824 && actual_width < 5884 ){
            current_left = x_plot / width_ratio - 4;
            current_top = y_plot / height_ratio - 6;
          }
          if(actual_width < 2824 && actual_width > 1568){
            current_left = x_plot / width_ratio - 1;
            current_top = y_plot / height_ratio - 6;
          }
          if(actual_width < 2824){
            current_left = x_plot / width_ratio;
            current_top = y_plot / height_ratio;
          }
        }
        else {
          current_left = x_plot / width_ratio;
          current_top = y_plot / height_ratio;
        }
        // current_left = x_plot / width_ratio;
        // current_top = y_plot / height_ratio;
        $(this).css({"left": current_left, "top": current_top});
      });
    }

  } // if condition ending curl

  if(selectMap === "3d-map") {
    _3dMapViewMarkers();
  }
});

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


function setFilters() {
  console.log("Setting filters");
  var zero_bedroom = false;
  var one_bedroom = false;
  var two_bedroom = false;
  var three_bedroom = false;
  var four_bedroom = false;
  var five_bedroom = false;
  var six_bedroom = false;
  var units_available_now = false;
  var units_available_in_thirty_days = false;
  var units_available_in_thirty_to_sixty_days = false;
  var units_available_in_sixty_to_ninty_days = false;
  var units_available_in_ninty_to_one_twenty_days = false;
  var units_available_in_one_twenty_plus_days = false;
  var today = new Date();
  var thirty_days = new Date(today).setDate(today.getDate() + 30);
  var sixty_days = new Date(today).setDate(today.getDate() + 60);
  var ninty_days = new Date(today).setDate(today.getDate() + 90);
  var one_twenty_days = new Date(today).setDate(today.getDate() + 120);
  //In below for loop hide and show filters on the basis of units data available
  for (var i = 0; i < units.length; i++) {
    //console.log(units[i]);
    if (parseInt(units[i]['bedrooms']) == 0) {
      zero_bedroom = true
    }
    if (parseInt(units[i]['bedrooms']) == 1) {
      one_bedroom = true
    }
    if (parseInt(units[i]['bedrooms']) == 2) {
      two_bedroom = true
    }
    if (parseInt(units[i]['bedrooms']) == 3) {
      three_bedroom = true
    }
    if (parseInt(units[i]['bedrooms']) == 4) {
      four_bedroom = true
    }
    if (parseInt(units[i]['bedrooms']) == 5) {
      five_bedroom = true
    }
    if (parseInt(units[i]['bedrooms']) == 6) {
      six_bedroom = true
    }
    // if (units[i]['available_date'] != '2099-01-01'){
    var available_date = new Date(units[i]['available_date']);
    if (available_date <= today) {
      units_available_now = true;
    }
    if (available_date > today && available_date <= thirty_days) {
      units_available_in_thirty_days = true;
    }
    if (available_date >= thirty_days && available_date <= sixty_days) {
      units_available_in_thirty_to_sixty_days = true;
    }
    if (available_date >= sixty_days && available_date <= ninty_days) {
      units_available_in_sixty_to_ninty_days = true;
    }
    if (available_date >= ninty_days && available_date <= one_twenty_days) {
      units_available_in_ninty_to_one_twenty_days = true;
    }
    if (available_date > one_twenty_days) {
      units_available_in_one_twenty_plus_days = true;
    }
    // }
  }
  if (units_available_now) {
    $('#now-checkbox').addClass('active-filter');
    $('#now-checkbox').parent().removeClass('disabled');
  } else {
    $('#now-checkbox').prop('checked', false);
  }

  if (units_available_in_thirty_days) {
    $('#thirty-days-checkbox').addClass('active-filter');
    $('#thirty-days-checkbox').parent().removeClass('disabled');
  } else {
    $('#thirty-days-checkbox').prop('checked', false);
  }

  if (units_available_in_thirty_to_sixty_days) {
    $('#thirty-to-sixty-days-checkbox').addClass('active-filter');
    $('#thirty-to-sixty-days-checkbox').parent().removeClass('disabled');
  } else {
    $('#thirty-to-sixty-days-checkbox').prop('checked', false);
  }

  if (units_available_in_sixty_to_ninty_days) {
    $('#sixty-to-ninty-days-checkbox').addClass('active-filter');
    $('#sixty-to-ninty-days-checkbox').parent().removeClass('disabled');
  } else {
    $('#sixty-to-ninty-days-checkbox').prop('checked', false);
  }

  if (units_available_in_ninty_to_one_twenty_days) {
    $('#ninty-to-one-twenty-days-checkbox').addClass('active-filter');
    $('#ninty-to-one-twenty-days-checkbox').parent().removeClass('disabled');
  } else {
    $('#ninty-to-one-twenty-days-checkbox').prop('checked', false);
  }

  if (units_available_in_one_twenty_plus_days) {
    $('#one-twenty-plus-days-checkbox').addClass('active-filter');
    $('#one-twenty-plus-days-checkbox').parent().removeClass('disabled');
  } else {
    $('#one-twenty-plus-days-checkbox').prop('checked', false);
  }

  if (zero_bedroom) {
    $('#zero-bedroom-checkbox').addClass('active-filter');
    $('#zero-bedroom-checkbox').parent().removeClass('disabled');
  } else {
    //$('#zero-bedroom-checkbox').prop('checked', false);
    $('#zero-bedroom-checkbox').parent().hide();
  }

  if (one_bedroom) {
    $('#one-bedroom-checkbox').addClass('active-filter');
    $('#one-bedroom-checkbox').parent().removeClass('disabled');
  } else {
    //$('#one-bedroom-checkbox').prop('checked', false);
    $('#one-bedroom-checkbox').parent().hide();
  }

  if (two_bedroom) {
    $('#two-bedroom-checkbox').addClass('active-filter');
    $('#two-bedroom-checkbox').parent().removeClass('disabled');
  } else {
    //$('#two-bedroom-checkbox').prop('checked', false);
    $('#two-bedroom-checkbox').parent().hide();
  }

  if (three_bedroom) {
    $('#three-bedroom-checkbox').addClass('active-filter');
    $('#three-bedroom-checkbox').parent().removeClass('disabled');
  } else {
    //$('#three-bedroom-checkbox').prop('checked', false);
    $('#three-bedroom-checkbox').parent().hide();
  }

  if (four_bedroom) {
    $('#four-bedroom-checkbox').addClass('active-filter');
    $('#four-bedroom-checkbox').parent().removeClass('disabled');
  } else {
    //$('#four-bedroom-checkbox').prop('checked', false);
    $('#four-bedroom-checkbox').parent().hide();
  }

  if (five_bedroom) {
    $('#five-bedroom-checkbox').addClass('active-filter');
    $('#five-bedroom-checkbox').parent().removeClass('disabled');
  } else {
    //$('#five-bedroom-checkbox').prop('checked', false);
    $('#five-bedroom-checkbox').parent().hide();
  }

  if (six_bedroom) {
    $('#six-bedroom-checkbox').addClass('active-filter');
    $('#six-bedroom-checkbox').parent().removeClass('disabled');
  } else {
    //$('#six-bedroom-checkbox').prop('checked', false);
    $('#six-bedroom-checkbox').parent().hide();
  }
  $(".disabled input").attr('data-original-title', 'none available');
  $(".disabled").click(false);
  $(".disabled").hide();
  //var today = new Date();
  //console.log(today);
  //var thirty_days = new Date(today).setDate(today.getDate()+30); 

  //console.log(thirty_days);
  //console.log(today.setHours(0,0,0,0) < thirty_days);
  //var curr = new Date();
  //console.log(today.setHours(0,0,0,0) == curr.setHours(0,0,0,0));
}

function showMarkers(market_rent_change = false) {
  // console.log('showing units on the basis of filters');

  $('.marker').addClass('hidden');
  $('.hidden-units').empty();

  var units_to_display = select_units_according_to_filters(units)
 
  console.log("units_to_display: ", units_to_display);
  if(selectMap === "3d-map") {
    _3dFilteredUnits = units_to_display;
  }
  // set_prices_according_to_units_to_display(units_to_display, market_rent_change)

  set_prices_according_to_units_to_display(units, market_rent_change)

  if (!(has_floorplate == 'true')) {
    // var min_rent = Math.min.apply(Math, units_to_display.map(function (o) {
    var min_rent = Math.min.apply(Math, units.map(function (o) {
      return o.market_rent;
    }))
    // var max_area = Math.max.apply(Math, units_to_display.map(function (o) {
    var max_area = Math.max.apply(Math, units.map(function (o) {
      return o.square_feet;
    }))
    disable_rent_filter_options(min_rent)
    disable_area_filter_options(max_area)
  }
  var json_object = {}
  for (var i = 0; i < units_to_display.length; i++) {
    if ($('#m_' + units_to_display[i]['id']).hasClass('overlapping-unit')) {
      var element = $('#m_' + units_to_display[i]['id']);
      $('.hidden-units').append('<div class="hidden h-' + $(element).data('unit-x-plot') + '-' + $(element).data('unit-y-plot') + '" id="h-' + $(element).data('title') + '" data-title="' + $(element).data('title') + '" data-community-id="' + $(element).data('community-id') + '" data-unit-id="' + $(element).data('unit-id') + '" data-is-fav="' + $(element).data('is-fav') + '" data-provider="' + $(element).data('provider') + '" data-website="' + $(element).data('website') + '" data-community-property-id="' + $(element).data('community-property-id') + '" data-unit-provider-id="' + $(element).data('unit-provider-id') + '" data-floorplan-provider-id="' + $(element).data('floorplan-provider-id') + '" data-floorplan-name="' + $(element).data('floorplan-name') + '" data-unit-description="' + $(element).data('unit-description') + '" data-unit-lease-pricing="' + $(element).data('unit-lease-pricing') + '" data-unit-marketing-name="' + $(element).data('unit-marketing-name') + '" data-market-rent="' + $(element).data('market-rent') + '" data-square-feet="' + $(element).data('square-feet') + '" data-availability="' + $(element).data('availability') + '" data-available-date="' + $(element).data('available-date') + '" data-bedrooms="' + $(element).data('bedrooms') + '" data-bathrooms="' + $(element).data('bathrooms') + '" data-floorplan-image="' + $(element).data('floorplan-image') + '" data-lease-term="' + $(element).data('lease-term') + '"></div>');
      if (!json_object.hasOwnProperty(units_to_display[i]['x_plot'] + '-' + units_to_display[i]['y_plot'])) {
        var overlapping_units = [];
        overlapping_units.push(units_to_display[i])
        console.log('pushing overlapping units');
        json_object[units_to_display[i]['x_plot'] + '-' + units_to_display[i]['y_plot']] = overlapping_units
      } else {
        overlapping_units = json_object[units_to_display[i]['x_plot'] + '-' + units_to_display[i]['y_plot']]
        overlapping_units.push(units_to_display[i])
        json_object[units_to_display[i]['x_plot'] + '-' + units_to_display[i]['y_plot']] = overlapping_units
      }
    } else {
      if (has_floorplate == 'true') {
        console.log('Adjusting markers');
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
} //function ending curl


function populate_current_units() {
  $('.marker').addClass('hidden');
  current_units = [];
  if (has_floorplate == 'true') {
    $('.amenity-marker').addClass('hidden'); // first hidding all amenity markers
    $('.a_' + current_floor).removeClass('hidden'); // showing amenity markers on current floorplate 
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

function disabled_enabled_anchors() {
  var min_market_rent = 100000
  var max_area = 0
  for (var i = 0; i < floors.length; i++) {
    var floorplate_units = [];

    for (var j = 0; j < units.length; j++) {
      if (units[j]['floor'] == floors[i]) {
        floorplate_units.push(units[j]);
      }
    }
    //console.log(floorplate_units);
    var units_to_display = select_units_according_to_filters(units)
    // console.log(units_to_display.length);
    if (units_to_display.length == 0) {
      //console.log(floors[i]);
      $('#' + floors[i]).addClass('no-units');
      if ($('#' + floors[i]).hasClass('selected')) {
        $('.alert').show()
        setTimeout(function () {
          $('.alert').fadeOut('slow');
        }, 6000); // <-- time in milliseconds
      }
    } else {
      $('#' + floors[i]).removeClass('no-units');
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
    // $('#' + floors[i]).attr('data-original-title', (floorplate_units.length.toString() + str));
    $('#u_' + floors[i]).html((floorplate_units.length.toString() + str));
  }
  $('#' + floors[0]).parent().css("border-top", "1px solid #2b3537");
  if ((floors.length > 0)) {
    disable_rent_filter_options(min_market_rent)
    disable_area_filter_options(max_area)
  }
  else{
    $('.custom-iframe-modeule').addClass('sitemap');
  }
}

function set_prices_according_to_units_to_display(floorplate_units, is_market_rent_change_called){
  console.log('ooouttttttt')
  if (!is_market_rent_change_called){
    console.log('iiiiiiiiinnnnn')
    var units_market_rent = []
    if (floorplate_units.length > 0) {
      for (var i = 0; i < floorplate_units.length; i++) {
        units_market_rent.push(parseFloat(floorplate_units[i]['market_rent']))
      }

      min_market_rent = Math.min.apply(Math, units_market_rent);
      max_market_rent = Math.max.apply(Math, units_market_rent);
      partition = Math.ceil((max_market_rent - min_market_rent) / 3)
      end_value = 0

      $('#market_rent').children().remove();
      $('#market_rent').append(`<option value=""> Select Max Price </option>`)

      for(var i=0 ; i<3 && floorplate_units.length > i; i++){
        end_value = end_value + partition
        text = Math.ceil(min_market_rent + end_value)
        val = min_market_rent + "-" + text
        $('#market_rent').append(`<option value="${val}"> ${text} </option>`)
      }
    }
    else{
      $('#market_rent').children().remove();
      $('#market_rent').append(`<option value=""> Select Max Price </option>`)
    }
  }
}


function select_units_according_to_filters(floorplate_units) {
  var bedroom_base_units = [];
  var availability_base_units = [];
  var rent_base_units = [];
  var square_feet_base_units = [];
  //var sold_units = [];
  _now_units = [];
  _now_to_30_units = [];
  _30_to_60_units = [];
  _60_to_90_units = [];
  _90_to_120_units = [];
  _120_units = [];
  //var are_available_units = [];
  var all_units = [];
  var market_rent = $('#market_rent').val();
  var square_feet = $('#square_feet').val();
  var unit_bedroom = $('#unit_bedroom').val();
  var unit_availability = $('#available_unit').val();
  market_rent = market_rent.split('-');
  square_feet = square_feet.split('-');
  var minimum_market_rent = parseFloat(market_rent[0]);
  var maximum_market_rent = parseFloat(market_rent[1]);
  var minimum_square_feet = parseFloat(square_feet[0]);
  var maximum_square_feet = parseFloat(square_feet[1]);
  var today = new Date();
  var thirty_days = new Date(today).setDate(today.getDate() + 30);
  var sixty_days = new Date(today).setDate(today.getDate() + 60);
  var ninty_days = new Date(today).setDate(today.getDate() + 90);
  var one_twenty_days = new Date(today).setDate(today.getDate() + 120);

  if(unit_bedroom == ""){
    unit_bedroom = "show_all_unit_bedrooms"
    
  }
  if(unit_availability == ""){
    unit_availability = "show_all_available_units"
  }

  if (units.length == 0)
    $('.available_portion').addClass('hidden');
  
  for (var i = 0; i < floorplate_units.length; i++) {
    if(!(selectMap === "3d-map"))
      if(($('.floorplate-anchor.selected').attr('id') != undefined) && ($('.floorplate-anchor.selected').attr('id') != floorplate_units[i].floor.toString()) )
        continue;
    
    all_units.push(floorplate_units[i]);

    if(unit_bedroom == "show_all_unit_bedrooms"){
      bedroom_base_units.push(floorplate_units[i]);
      if (new Date(floorplate_units[i]['available_date']) <= today)
        _now_units.push(floorplate_units[i]);
      if (new Date(floorplate_units[i]['available_date']) >= today && new Date(floorplate_units[i]['available_date']) <= thirty_days)
        _now_to_30_units.push(floorplate_units[i]);
      if (new Date(floorplate_units[i]['available_date']) >= thirty_days && new Date(floorplate_units[i]['available_date']) <= sixty_days)
        _30_to_60_units.push(floorplate_units[i]);
      if (new Date(floorplate_units[i]['available_date']) >= sixty_days && new Date(floorplate_units[i]['available_date']) <= ninty_days)
        _60_to_90_units.push(floorplate_units[i]);
      if (new Date(floorplate_units[i]['available_date']) >= ninty_days && new Date(floorplate_units[i]['available_date']) <= one_twenty_days)
        _90_to_120_units.push(floorplate_units[i]);
      if (new Date(floorplate_units[i]['available_date']) >=  one_twenty_days)
        _120_units.push(floorplate_units[i]);
    }
    //show zero bedroom markers  
    // ($('#zero-bedroom-checkbox').is(':checked'))
    if(unit_bedroom == "zero_bedrooms") {
      if (parseInt(floorplate_units[i]['bedrooms']) == 0) {
        //$('#m_'+units[i]['marketing_name']).removeClass('hidden');
        bedroom_base_units.push(floorplate_units[i]);
        if (new Date(floorplate_units[i]['available_date']) <= today)
          _now_units.push(floorplate_units[i]);
        if (new Date(floorplate_units[i]['available_date']) >= today && new Date(floorplate_units[i]['available_date']) <= thirty_days)
          _now_to_30_units.push(floorplate_units[i]);
        if (new Date(floorplate_units[i]['available_date']) >= thirty_days && new Date(floorplate_units[i]['available_date']) <= sixty_days)
          _30_to_60_units.push(floorplate_units[i]);
        if (new Date(floorplate_units[i]['available_date']) >= sixty_days && new Date(floorplate_units[i]['available_date']) <= ninty_days)
          _60_to_90_units.push(floorplate_units[i]);
        if (new Date(floorplate_units[i]['available_date']) >= ninty_days && new Date(floorplate_units[i]['available_date']) <= one_twenty_days)
          _90_to_120_units.push(floorplate_units[i]);
        if (new Date(floorplate_units[i]['available_date']) >=  one_twenty_days)
          _120_units.push(floorplate_units[i]);
      }
    }
    //show one bedroom markers
    // ($('#one-bedroom-checkbox').is(':checked'))  
    if (unit_bedroom == "1_bedroom"){
      if (parseInt(floorplate_units[i]['bedrooms']) == 1) {
        //$('#m_'+units[i]['marketing_name']).removeClass('hidden');
        bedroom_base_units.push(floorplate_units[i]);
        if (new Date(floorplate_units[i]['available_date']) <= today)
          _now_units.push(floorplate_units[i]);
        if (new Date(floorplate_units[i]['available_date']) >= today && new Date(floorplate_units[i]['available_date']) <= thirty_days)
          _now_to_30_units.push(floorplate_units[i]);
        if (new Date(floorplate_units[i]['available_date']) >= thirty_days && new Date(floorplate_units[i]['available_date']) <= sixty_days)
          _30_to_60_units.push(floorplate_units[i]);
        if (new Date(floorplate_units[i]['available_date']) >= sixty_days && new Date(floorplate_units[i]['available_date']) <= ninty_days)
          _60_to_90_units.push(floorplate_units[i]);
        if (new Date(floorplate_units[i]['available_date']) >= ninty_days && new Date(floorplate_units[i]['available_date']) <= one_twenty_days)
          _90_to_120_units.push(floorplate_units[i]);
        if (new Date(floorplate_units[i]['available_date']) >=  one_twenty_days)
          _120_units.push(floorplate_units[i]);
      }
    }
    //show two bedroom markers
    // ($('#two-bedroom-checkbox').is(':checked'))
    if (unit_bedroom == "2_bedrooms"){
      if (parseInt(floorplate_units[i]['bedrooms']) == 2) {
        bedroom_base_units.push(floorplate_units[i]);
        if (new Date(floorplate_units[i]['available_date']) <= today)
          _now_units.push(floorplate_units[i]);
        if (new Date(floorplate_units[i]['available_date']) >= today && new Date(floorplate_units[i]['available_date']) <= thirty_days)
          _now_to_30_units.push(floorplate_units[i]);
        if (new Date(floorplate_units[i]['available_date']) >= thirty_days && new Date(floorplate_units[i]['available_date']) <= sixty_days)
          _30_to_60_units.push(floorplate_units[i]);
        if (new Date(floorplate_units[i]['available_date']) >= sixty_days && new Date(floorplate_units[i]['available_date']) <= ninty_days)
          _60_to_90_units.push(floorplate_units[i]);
        if (new Date(floorplate_units[i]['available_date']) >= ninty_days && new Date(floorplate_units[i]['available_date']) <= one_twenty_days)
          _90_to_120_units.push(floorplate_units[i]);
        if (new Date(floorplate_units[i]['available_date']) >=  one_twenty_days)
          _120_units.push(floorplate_units[i]);

      }
    }
    //show three bedroom markers
    // ($('#three-bedroom-checkbox').is(':checked'))
    if (unit_bedroom == "3_bedrooms"){
      if (parseInt(floorplate_units[i]['bedrooms']) == 3) {
        bedroom_base_units.push(floorplate_units[i]);
        if (new Date(floorplate_units[i]['available_date']) <= today)
          _now_units.push(floorplate_units[i]);
        if (new Date(floorplate_units[i]['available_date']) >= today && new Date(floorplate_units[i]['available_date']) <= thirty_days)
          _now_to_30_units.push(floorplate_units[i]);
        if (new Date(floorplate_units[i]['available_date']) >= thirty_days && new Date(floorplate_units[i]['available_date']) <= sixty_days)
          _30_to_60_units.push(floorplate_units[i]);
        if (new Date(floorplate_units[i]['available_date']) >= sixty_days && new Date(floorplate_units[i]['available_date']) <= ninty_days)
          _60_to_90_units.push(floorplate_units[i]);
        if (new Date(floorplate_units[i]['available_date']) >= ninty_days && new Date(floorplate_units[i]['available_date']) <= one_twenty_days)
          _90_to_120_units.push(floorplate_units[i]);
        if (new Date(floorplate_units[i]['available_date']) >=  one_twenty_days)
          _120_units.push(floorplate_units[i]);
      }
    }
    //show four bedroom markers
    // ($('#four-bedroom-checkbox').is(':checked'))
    if (unit_bedroom == "4_bedrooms"){
      if (parseInt(floorplate_units[i]['bedrooms']) == 4) {
        bedroom_base_units.push(floorplate_units[i]);
        if (new Date(floorplate_units[i]['available_date']) <= today)
          _now_units.push(floorplate_units[i]);
        if (new Date(floorplate_units[i]['available_date']) >= today && new Date(floorplate_units[i]['available_date']) <= thirty_days)
          _now_to_30_units.push(floorplate_units[i]);
        if (new Date(floorplate_units[i]['available_date']) >= thirty_days && new Date(floorplate_units[i]['available_date']) <= sixty_days)
          _30_to_60_units.push(floorplate_units[i]);
        if (new Date(floorplate_units[i]['available_date']) >= sixty_days && new Date(floorplate_units[i]['available_date']) <= ninty_days)
          _60_to_90_units.push(floorplate_units[i]);
        if (new Date(floorplate_units[i]['available_date']) >= ninty_days && new Date(floorplate_units[i]['available_date']) <= one_twenty_days)
          _90_to_120_units.push(floorplate_units[i]);
        if (new Date(floorplate_units[i]['available_date']) >=  one_twenty_days)
          _120_units.push(floorplate_units[i]);
      }
    }
    //show five bedroom markers
    // ($('#five-bedroom-checkbox').is(':checked'))
    if (unit_bedroom == "5_bedrooms"){
      if (parseInt(floorplate_units[i]['bedrooms']) == 5) {
        bedroom_base_units.push(floorplate_units[i]);
        if (new Date(floorplate_units[i]['available_date']) >= ninty_days && available_date <= one_twenty_days)
          _90_to_120_units.push(floorplate_units[i]);
      }
    }
    //show six bedroom markers
    // ($('#six-bedroom-checkbox').is(':checked'))
    if (unit_bedroom == "6_bedrooms"){
      if (parseInt(floorplate_units[i]['bedrooms']) == 6) {
        bedroom_base_units.push(floorplate_units[i]);
        if (new Date(floorplate_units[i]['available_date']) <= today)
          _now_units.push(floorplate_units[i]);
        if (new Date(floorplate_units[i]['available_date']) >= today && new Date(floorplate_units[i]['available_date']) <= thirty_days)
          _now_to_30_units.push(floorplate_units[i]);
        if (new Date(floorplate_units[i]['available_date']) >= thirty_days && new Date(floorplate_units[i]['available_date']) <= sixty_days)
          _30_to_60_units.push(floorplate_units[i]);
        if (new Date(floorplate_units[i]['available_date']) >= sixty_days && new Date(floorplate_units[i]['available_date']) <= ninty_days)
          _60_to_90_units.push(floorplate_units[i]);
        if (new Date(floorplate_units[i]['available_date']) >= ninty_days && new Date(floorplate_units[i]['available_date']) <= one_twenty_days)
          _90_to_120_units.push(floorplate_units[i]);
        if (new Date(floorplate_units[i]['available_date']) >=  one_twenty_days)
          _120_units.push(floorplate_units[i]);
      }
    }

    if(unit_availability == "show_all_available_units"){
      var available_date = new Date(floorplate_units[i]['available_date']);
      if((available_date <= today) || (available_date > today && available_date < thirty_days) || (available_date >= thirty_days && available_date <= sixty_days) || (available_date >= sixty_days && available_date <= ninty_days) || (available_date >= ninty_days && available_date <= one_twenty_days) || (available_date > one_twenty_days))
      {
        availability_base_units.push(floorplate_units[i]);
      }
    }
    //show available now
    // ($('#now-checkbox').is(':checked'))
    if (unit_availability == "now") {
      var available_date = new Date(floorplate_units[i]['available_date']);
      if (available_date <= today) {
        availability_base_units.push(floorplate_units[i]);
      }
    }
    //show available 30 in 30 days
    // ($('#thirty-days-checkbox').is(':checked'))
    if (unit_availability == "in_next_30_days") {
      var available_date = new Date(floorplate_units[i]['available_date']);
      if (available_date > today && available_date < thirty_days) {
        availability_base_units.push(floorplate_units[i]);
      }
    }
    //show available units in 30 to 60 days
    // ($('#thirty-to-sixty-days-checkbox').is(':checked'))
    if (unit_availability == "in_30_to_60_days") {
      var available_date = new Date(floorplate_units[i]['available_date']);
      if (available_date >= thirty_days && available_date <= sixty_days) {
        availability_base_units.push(floorplate_units[i]);
      }
    }
    //show available units in 60 to 90 days
    // ($('#sixty-to-ninty-days-checkbox').is(':checked'))
    if (unit_availability == "in_61_to_90_days"){
      var available_date = new Date(floorplate_units[i]['available_date']);
      if (available_date >= sixty_days && available_date <= ninty_days) {
        availability_base_units.push(floorplate_units[i]);
      }
    }
    //show available units in 90 to 120 days
    // ($('#ninty-to-one-twenty-days-checkbox').is(':checked'))
    if (unit_availability == "in_91_to_120_days"){
      var available_date = new Date(floorplate_units[i]['available_date']);
      if (available_date >= ninty_days && available_date <= one_twenty_days) {
        availability_base_units.push(floorplate_units[i]);
      }
    }
    //show available units in 120+ days
    // ($('#one-twenty-plus-days-checkbox').is(':checked'))
    if (unit_availability == "in_121_plus_days"){
      var available_date = new Date(floorplate_units[i]['available_date']);
      if (available_date > one_twenty_days) {
        availability_base_units.push(floorplate_units[i]);
      }
    }
    //show units on the basis of minimum and maximum rent value
    var unit_market_rent = parseFloat(floorplate_units[i]['market_rent']);
    if (unit_market_rent >= minimum_market_rent && unit_market_rent <= maximum_market_rent) {
      rent_base_units.push(floorplate_units[i]);
    }
    //show units on the basis of minimum and maximum rent value
    
    var unit_square_feet = parseFloat(floorplate_units[i]['square_feet']);
    if (unit_square_feet >= minimum_square_feet && unit_square_feet <= maximum_square_feet) {
      square_feet_base_units.push(floorplate_units[i]);
    }

//    if (floorplate_units[i]['sold']) {
//      sold_units.push(floorplate_units[i]);
//    }
//
//    if (floorplate_units[i]['available'] && !floorplate_units[i]['sold']) {
//      are_available_units.push(floorplate_units[i]);
//    }


  } //for loop block ending curl
  var bedroom_filter_present = true
  var availability_filter_present = true
  var price_filter_present = true
  var area_filter_present = true
  var selected_all_bedrooms = $('#unit_bedroom').text().split(" ")[0]
  var selected_all_availability = $('#available_unit').text().split(" ")[0]
  if (!(unit_bedroom == "show_all_unit_bedrooms" || unit_bedroom == "zero_bedrooms" || unit_bedroom == "1_bedroom" || unit_bedroom == "2_bedrooms" || unit_bedroom == "3_bedrooms" || unit_bedroom == "4_bedrooms" || unit_bedroom == "5_bedrooms" || unit_bedroom == "6_bedrooms")) {
    bedroom_base_units = all_units
    bedroom_filter_present = false
  }
  
  // if (!($('#zero-bedroom-checkbox').is(':checked') || $('#one-bedroom-checkbox').is(':checked') || $('#two-bedroom-checkbox').is(':checked') || $('#three-bedroom-checkbox').is(':checked') || $('#four-bedroom-checkbox').is(':checked') || $('#five-bedroom-checkbox').is(':checked') || $('#six-bedroom-checkbox').is(':checked'))) {
  //   bedroom_base_units = all_units
  //   bedroom_filter_present = false
  // }
  if (!(unit_availability == "show_all_available_units" || unit_availability == "now" || unit_availability == "in_next_30_days" || unit_availability == "in_30_to_60_days" || unit_availability == "in_61_to_90_days" || unit_availability == "in_91_to_120_days" || unit_availability == "in_121_plus_days")) {
    availability_base_units = all_units
    availability_filter_present = false
  }
  
  // if (!($('#now-checkbox').is(':checked') || $('#thirty-days-checkbox').is(':checked') || $('#thirty-to-sixty-days-checkbox').is(':checked') || $('#sixty-to-ninty-days-checkbox').is(':checked') || $('#ninty-to-one-twenty-days-checkbox').is(':checked') || $('#one-twenty-plus-days-checkbox').is(':checked'))) {
  //   availability_base_units = all_units
  //   availability_filter_present = false
  // }

  if (isNaN(minimum_square_feet)) {
    square_feet_base_units = all_units
    area_filter_present = false
  }

  if (isNaN(minimum_market_rent)) {
    rent_base_units = all_units
    price_filter_present = false
  }
  // if(_now_units.length == 0)
  // {$('#now-checkbox').parent().addClass('hidden');}
  // else
  // {$('#now-checkbox').parent().removeClass('hidden');}

  // if(_now_to_30_units.length == 0)
  // {$('#thirty-days-checkbox').parent().addClass('hidden');}
  // else
  // {$('#thirty-days-checkbox').parent().removeClass('hidden');}

  // if(_30_to_60_units.length == 0)
  // {$('#thirty-to-sixty-days-checkbox').parent().addClass('hidden');}
  // else
  // {$('#thirty-to-sixty-days-checkbox').parent().removeClass('hidden');}
  

  // if(_60_to_90_units.length == 0)
  // {$('#sixty-to-ninty-days-checkbox').parent().addClass('hidden');}
  // else
  // {$('#sixty-to-ninty-days-checkbox').parent().removeClass('hidden');}
  
  // if(_90_to_120_units.length == 0)
  // {$('#ninty-to-one-twenty-days-checkbox').parent().addClass('hidden');}
  // else
  // {$('#ninty-to-one-twenty-days-checkbox').parent().removeClass('hidden');}

  // if(_120_units.length == 0)
  // {$('#one-twenty-plus-days-checkbox').parent().addClass('hidden');}
  // else
  // {$('#one-twenty-plus-days-checkbox').parent().removeClass('hidden');}
  // if(_now_units.length == 0 && _now_to_30_units.length == 0 && _90_to_120_units.length == 0 && _60_to_90_units.length == 0 && _120_units.length == 0 && _30_to_60_units.length == 0)
  //   {$('.available_portion').addClass('hidden');}
  // else
  // {$('.available_portion').removeClass('hidden');}

  if (bedroom_filter_present || availability_filter_present || price_filter_present || area_filter_present) {
    var units_to_display = $.intersect(bedroom_base_units, availability_base_units, rent_base_units, square_feet_base_units);
    // var units_to_display = $.intersect(_now_units, _now_to_30_units, _90_to_120_units, _60_to_90_units, _120_units, _30_to_60_units);
    //units_to_display = $.union(units_to_display, sold_units, are_available_units);
    return units_to_display;
  } else {
    return [];
  }
}


function set_psi_url(element) {
  //var url = $(element).data('website')+"/Apartments/module/application_authentication/http_referer/"+$(element).data('uri')+"/popup/false/kill_session/1/property[id]/"+$(element).data('community-property-id')+"/property_floorplan[id]/"+$(element).data('floorplan-provider-id')+"/unit_space[id]/"+$(element).data('unit-provider-id')+"/show_in_popup/false/from_check_availability/1/term_month/"+$(element).data('lease-term')+"/?lease_start_date="+$('#leasing-start-date').val();
  var url = $(element).data('availability-url');

  if(selectMap === "3d-map") {
    url = _3dSelectedUnit.availability_url
  }

  window.open(url, '_blank');
}
function set_resman_url(element)
{
  date = new Date($('#leasing-start-date').val())
  var url = $(element).data('availability-url') + "&leaseTerm=" + $('#lease-term').val() + "&moveInDate=" + date.toISOString().split('T')[0]

  
  if(selectMap === "3d-map") {
    date = new Date();
    url = _3dSelectedUnit.availability_url + "&leaseTerm=" + _3dSelectedUnit.lease_term + "&moveInDate=" + date.toISOString().split('T')[0]
  }

  window.open(url, '_blank');
}

function set_realpagesvc_url(element) {
  //http://localhost:3000/communities/25/webpages/apply_now?MoveInDate=12/15/2017&UnitId=346&SearchUrl=https%3A//localhost:3000#k=70697
  var url = apply_now_url + "?MoveInDate=" + $('#leasing-start-date').val() + "&UnitId=" + $(element).data('unit-provider-id') + "&SearchUrl=" + redirect_url;
  
  if(selectMap === "3d-map") {
    apply_now_url = `/communities/${webCommunity.id}/webpages/apply_now`;
    redirect_url = `/communities/${webCommunity.id}/webpages`
    date = new Date()

    url = url = apply_now_url + "?MoveInDate=" + date.toISOString().split('T')[0] + "&UnitId=" + _3dSelectedUnit.provider_unit_id + "&SearchUrl=" + redirect_url;
  }

  window.open(url, '_blank');
}

function hasTouch() {
  return 'ontouchstart' in document.documentElement || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0;
}

function disable_rent_filter_options(min_rent) {
  var select = document.getElementById("market_rent");
  for (var i = 1; i < select.length; i++) {
    var option = select.options[i];
    var option_rent = option.value.split('-');
    var maximum_option_rent = parseFloat(option_rent[1]);
    if (min_rent >= maximum_option_rent)
      $("#market_rent option[value=" + option.value + "]").show()
    else
      $("#market_rent option[value=" + option.value + "]").show()
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

function setModalAttributes(element) {

    try {
        if ($(element).data('unit-lease-pricing') == "")
        {
            // $('#unit-lease-pricing-text-li').hide();
            $('#leas-price-option').addClass('hidden');
            $('#unitModal').find('#unit-lease-pricing').html("No more prices are available");
            // $('#unitModal').find('#unit-lease-pricing').html($(element).data('unit-lease-pricing'));
        }
        else
        {
            var lease = "";
            ss = $(element).data('unit-lease-pricing').split(';');
            var collator = new Intl.Collator(undefined, {numeric: true, sensitivity: 'base'});

            ss = ss.sort(collator.compare).reverse();
            for (var i = 0; i < ss.length -1; i++) {
                var s = ss[i].split(':');
                var sp;
                if (s[2] != "")
                {
                    sp = s[2] +" - "
                }
                else
                {
                    sp = ""
                }
                lease = lease + s[0] + " months - " + sp +"$"+ s[1] + '<br>'
            }
            $('#unitModal').find('#unit-lease-pricing').html(lease);
        }
    }
    catch(err) {
        // $('#unit-lease-pricing-text-li').hide();
        $('#leas-price-option').addClass('hidden');
        $('#unitModal').find('#unit-lease-pricing').html("No more prices are available");

    }
    try {
        if ($(element).data('unit-description') == "")
        {
            // $('#unit-description-text-li').hide();
            $('#unitModal').find('#unit-description').html("Not Available");
        }
        else
        {
            $('#unitModal').find('#unit-description').html($(element).data('unit-description'));
        }
    }

    catch(err) {
        $('#unit-description-text-li').hide();
    }


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
    console.log('Sold');
    $('#unitModal').find('#availability').html("Sold");
    $('#unitModal').find('#available-date').html('');
    $('#unitModal').find('#available-text').html('Unavailable');
  } else {
    if ($(element).data('available')) {
      $('#unitModal').find('#availability').html("Available");

      $('#unitModal').find('#available-text').html('Available');
      $('#unitModal').find('#available-date').html($(element).data('available-date'));
      $('#popup-available-date').html($(element).data('available-date'));
    } else {
      $('#unitModal').find('#availability').html($(element).data('availability') == "Unoccupied" ? "Available" : "Occupied");
      $('#unitModal').find('#available-text').html('Available');
      $('#unitModal').find('#available-date').html($(element).data('available-date'));
    }
  }
  $('#unitModal').find('#market-rent').html('$' + $(element).data('market-rent'));
  $('#unitModal').find('#total-market-rent').html('$' + $(element).data('market-rent'));
  
  ///////////////////////////////////////////
  if (!$(element).data('is-fav')) {
    var community_id = $(element).data('community-id');
    var unit_id = $(element).data('unit-id');
    var url = "/communities/" + community_id + "/webpages/save_favorite?unit_id=" + unit_id;
    var html = '<a href="' + url + '" data-remote="true"><i class="far fa-heart"></i></a>';
    $('#fav-icon-tag').html(html);
  } else {
    var community_id = $(element).data('community-id');
    var unit_id = $(element).data('unit-id');
    var url = "/communities/" + community_id + "/webpages/delete_favorite?unit_id=" + unit_id;
    var html = '<a href="' + url + '" data-remote="true"><i class="fa fa-heart"></i></a>';
    $('#fav-icon-tag').html(html);
  }
  /////////////////////////////////////////
  if ($(element).data('floorplan-image') != '') {
    $('#unitModal').find('#floorplan-image').attr('src', $(element).data('floorplan-image'));
  } else {
    $('#unitModal').find('#floorplan-image').attr('src', '/assets/default.jpeg');
  }
  //////////////////////////////////////////
  if ($(element).data('provider') != 'realpagesvc') {
    var website = $(element).data('website');
    // console.log(website);
    var uri = website.replace(/^https?\:\/\//, '');
    // console.log(uri);
    $('#psi-anchor-tag').attr('data-community-property-id', $(element).data('community-property-id'));
    $('#psi-anchor-tag').attr('data-website', website);
    $('#psi-anchor-tag').attr('data-uri', uri);
    $('#psi-anchor-tag').attr('data-unit-provider-id', $(element).data('unit-provider-id'));
    $('#psi-anchor-tag').attr('data-floorplan-provider-id', $(element).data('floorplan-provider-id'));
    $('#psi-anchor-tag').attr('data-lease-term', $(element).data('lease-term'));
    $('#psi-anchor-tag').attr('data-availability-url', $(element).data('availability-url'));
    $("#leasing-start-date").datepicker('setDate', new Date());
  } else if (($(element).data('provider') === 'realpagesvc')) {
    // console.log($(e.relatedTarget).data('unit-provider-id'));
    $('#realpagesvc-anchor-tag').attr('data-unit-provider-id', $(element).data('unit-provider-id'));
  }
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
    console.log('Sold');
    $('#unitModal').find('#availability').html("Sold");
    $('#unitModal').find('#available-date').html('');
    $('#unitModal').find('#available-text').html('Unavailable');
  } else {
    if (_3dSelectedUnit.available) {
      _3dDate = _3dSelectedUnit.available_date.split("-")
      $('#unitModal').find('#availability').html("Available");
      $('#unitModal').find('#available-text').html('Available');
      $('#unitModal').find('#available-date').html(`${_3dDate[2]}/${_3dDate[1]}/${_3dDate[0]}`);
    } else {
      $('#unitModal').find('#availability').html(_3dSelectedUnit.availability == "Unoccupied" ? "Available" : "Occupied");
      $('#unitModal').find('#available-text').html('Available');
      $('#unitModal').find('#available-date').html(_3dSelectedUnit.available_date);
    }
  }

  $('#unitModal').find('#market-rent').html("$" + _3dSelectedUnit.market_rent);
  $('#unitModal').find('#total-market-rent').html("$" + _3dSelectedUnit.market_rent);

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

  // debugger;

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
    $("#leasing-start-date").datepicker('setDate', new Date());
  } else if (webCommunity.data_provider === 'realpagesvc') {
    $('#realpagesvc-anchor-tag').attr('data-unit-provider-id', _3dSelectedUnit.provider_unit_id);
  }

  if(_3dSelectedUnit.lease_pricing){
    $('#unit-lease-pricing-text-li').show();
    var lease = "";
    ss = _3dSelectedUnit.lease_pricing.split(';');
    var collator = new Intl.Collator(undefined, {numeric: true, sensitivity: 'base'});

    ss = ss.sort(collator.compare).reverse();
    for (var i = 0; i < ss.length -1; i++) {
      var s = ss[i].split(':');
      var sp;
      if (s[2] != "")
      {
          sp = s[2] +" - "
      }
      else
      {
          sp = ""
      }
      lease = lease + s[0] + " months - " + sp +"$"+ s[1] + '<br>'
    }
  
  $('#unitModal').find('#unit-lease-pricing').html(lease);
  } else {
    $('#unit-lease-pricing-text-li').hide();
  }

  if (_3dSelectedUnit.description)
  {
    $('#unitModal').find('#unit-description').html(_3dSelectedUnit.description);
  }
  else
  {
    $('#unit-description-text-li').hide();
  }


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

  // for floorplates
function adjustMarkerPosition(marker) {
  /*adjusting markers according to screen size*/
  var in_browser_height = 0;
  var in_browser_width = 0;
  var actual_height = 0;
  var actual_width = 0;
  in_browser_height = parseFloat($('#f_' + current_floor).parent().height());
  in_browser_width = parseFloat($('#f_' + current_floor).parent().width());

  actual_height = parseInt($('#f_' + current_floor).data("height"))
  actual_width = parseInt($('#f_' + current_floor).data("width"))

  if (actual_width < in_browser_width)
    var width_ratio = 1;
  else
    var width_ratio = actual_width / in_browser_width;
  if (actual_height < in_browser_height)
    var height_ratio = 1;
  else
    var height_ratio = actual_height / in_browser_height;

  var x_plot = parseFloat($(marker).data('unit-x-plot'));
  var y_plot = parseFloat($(marker).data('unit-y-plot'));
  
  if(actual_width > in_browser_width && actual_height > in_browser_height) {
    if(actual_width >= 5884){
      current_left = x_plot / width_ratio - 6;
      current_top = y_plot / height_ratio - 20;
    }
    if(actual_width >= 2824 && actual_width < 5884 ){
      current_left = x_plot / width_ratio - 4;
      current_top = y_plot / height_ratio - 13;
    }
    if(actual_width < 2824 && actual_width > 1568){
      current_left = x_plot / width_ratio - 1;
      current_top = y_plot / height_ratio - 6;
    }
    if(actual_width < 2824){
      current_left = x_plot / width_ratio;
      current_top = y_plot / height_ratio;
    }
  }
  else {
    current_left = x_plot / width_ratio;
    current_top = y_plot / height_ratio;
  }
  // var current_left = x_plot / width_ratio;
  // var current_top = y_plot / height_ratio;
  $(marker).css({"left": current_left, "top": current_top});
}

function adjustAmenitiesPosition() {
  /*adjusting markers according to screen size*/

  in_browser_height = parseFloat($('#f_' + current_floor).parent().height());
  in_browser_width = parseFloat($('#f_' + current_floor).parent().width());

  actual_height = parseInt($('#f_' + current_floor).data("height"))
  actual_width = parseInt($('#f_' + current_floor).data("width"))

  if (actual_width < in_browser_width)
    var width_ratio = 1;
  else
    var width_ratio = actual_width / in_browser_width;
  if (actual_height < in_browser_height)
    var height_ratio = 1;
  else
    var height_ratio = actual_height / in_browser_height;

  // adjusting amenity markers
  $('.a_' + current_floor).each(function () {
    var x_plot = parseFloat($(this).data('amenity-x-plot'));
    var y_plot = parseFloat($(this).data('amenity-y-plot'));
    if(actual_width > in_browser_width && actual_height > in_browser_height) {
      if(actual_width >= 5884){
        current_left = x_plot / width_ratio - 6;
        current_top = y_plot / height_ratio - 20;
      }
      if(actual_width >= 2824 && actual_width < 5884 ){
        current_left = x_plot / width_ratio - 4;
        current_top = y_plot / height_ratio - 6;
      }
      if(actual_width < 2824 && actual_width > 1568){
        current_left = x_plot / width_ratio - 1;
        current_top = y_plot / height_ratio - 6;
      }
      if(actual_width < 2824){
        current_left = x_plot / width_ratio;
        current_top = y_plot / height_ratio;
      }
    }
    else {
      current_left = x_plot / width_ratio;
      current_top = y_plot / height_ratio;
    }
    // current_left = x_plot / width_ratio;
    // current_top = y_plot / height_ratio;
    $(this).css({"left": current_left, "top": current_top});
  });
}

function _3dMapViewMarkers() {
  let _3dUnitsMarketingNames = getUnitsMarketingNames();
  let cleanedNames = clean3DMarkers(_3dUnitsMarketingNames)
  console.log("cleanedNames:  ", cleanedNames);
  
  if(cleanedNames.length > 0)
    _3dFilterByUnits(cleanedNames + _3dSampleAmenities.join());
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
  // unitName = "431";
  // floor = "2"
  // _3dFilteredUnits.filter(a => (a.floor == floor && a.marketing_name.substr(0,3) === unitName) )[0];
  return _3dFilteredUnits.filter(a => (a.marketing_name.substr(0,3) === unitName) )[0];;
}

function handleMapControl() {
  if(selectMap === "3d-map") {
    display3DMap();
  } else {
    display2DMap();
  }
}

function display3DMap() {
  $("._3d-apply-filter-button").css("display", "block");
  $(".beans-map-container").show();
  $(".zoomable-map-container").hide();
  $("#panzomm-container").css("width", "100%");
  $(".location-items").hide();
  $(".c-sidebar").hide();
  // $(".select-floorP").hide();
  // let w1 = $(".select-list").width();
  // let w2 = $(".select-floorP").width();
  // $(".select-list").css("width", w1+w2);
  let w1 = $(".digits-list-item").width();
  let w2 = $(".c-sidebar").width();
  $(".digits-list-item").css("width", w1+w2);
  $(".c-wrapper").css("margin-right", "0px");
  // $(".select-floorP").hide();
  // let w1 = $(".select-list").width();
  // let w2 = $(".select-floorP").width();
  // $(".select-list").css("width", w1+w2);

  let windowWidth = window.innerWidth;
  let sideBarWidth = $("div.mydiv").innerWidth();
  let mapWidth = windowWidth - sideBarWidth - 10;

  $(".beans-map-container").css("width", mapWidth)
}

function display2DMap() {
  $("._3d-apply-filter-button").css("display", "none");
  $(".beans-map-container").hide();
  $(".zoomable-map-container").show();
  $("#panzomm-container").css("width", "");
  $(".c-wrapper").css("margin-right", "90px");
  // $(".select-floorP").show();
  // $(".select-floorP").show();
  $(".c-sidebar").show();
}

function _3dFilterByFloor(floorNumber) {
  beansWidget.filterByFloor(floorNumber)
}

function _3dFilterByUnits(_3dUnits) {
  beansWidget.filterByUnit(_3dUnits)
}

function apply3DFilters() {
  if(selectMap === "3d-map") {
    _3dMapViewMarkers();
  }
}

$(document).on('click','.share-favorite',function(){
  community_id = $("#maps_community_id").val()
  $.ajax({
    type: "GET",
    url: '/communities/'+community_id+'/webpages/sent_favorite',
    success: function(response) {}
  });
});

$(document).on('click','.unit_marker',function(){
  community_id = $("#maps_community_id").val()
  $.ajax({
    type: "GET",
    url: '/communities/'+community_id+'/webpages/price_opened',
    success: function(response) {}
  });
});
$(document).on('click','.apply_now',function(){
  community_id = $("#maps_community_id").val()
    $.ajax({
      type: "GET",
      url: '/communities/'+community_id+'/webpages/apply_now_count',
      success: function(response) {}
  });
});