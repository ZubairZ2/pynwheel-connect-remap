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
    });

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
      showMarkers();
    });
    $('#square_feet').change(function () {
      showMarkers();
    });
    ////////////////////////////////////////
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
      in_browser_height = parseFloat($('.floorplate-image').parent().height());
      in_browser_width = parseFloat($('.floorplate-image').parent().width());
      actual_height = parseInt($('.floorplate-image').data("height"));
      actual_width = parseInt($('.floorplate-image').data("width"));
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
        current_left = x_plot / width_ratio;
        current_top = y_plot / height_ratio;
        $(this).css({"left": current_left, "top": current_top});
      });


      $('.sitemap-amenity-marker').each(function () {
        var x_plot = parseFloat($(this).data('amenity-x-plot'));
        var y_plot = parseFloat($(this).data('amenity-y-plot'));
        current_left = x_plot / width_ratio;
        current_top = y_plot / height_ratio;
        $(this).css({"left": current_left, "top": current_top});
      });
    }

  } // if condition ending curl
});

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
  //var today = new Date();
  //console.log(today);
  //var thirty_days = new Date(today).setDate(today.getDate()+30); 

  //console.log(thirty_days);
  //console.log(today.setHours(0,0,0,0) < thirty_days);
  //var curr = new Date();
  //console.log(today.setHours(0,0,0,0) == curr.setHours(0,0,0,0));

}

function showMarkers() {
  // console.log('showing units on the basis of filters');

  $('.marker').addClass('hidden');
  $('.hidden-units').empty();


  var units_to_display = select_units_according_to_filters(current_units)
  if (!(has_floorplate == 'true')) {
    var min_rent = Math.min.apply(Math, units_to_display.map(function (o) {
      return o.market_rent;
    }))
    var max_area = Math.max.apply(Math, units_to_display.map(function (o) {
      return o.square_feet;
    }))
    disable_rent_filter_options(min_rent)
    disable_area_filter_options(max_area)
  }
  var json_object = {}
  for (var i = 0; i < units_to_display.length; i++) {
    if ($('#m_' + units_to_display[i]['marketing_name']).hasClass('overlapping-unit')) {
      var element = $('#m_' + units_to_display[i]['marketing_name']);
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
        adjustMarkerPosition($('#m_' + units_to_display[i]['marketing_name']));
      }
      $('#m_' + units_to_display[i]['marketing_name']).removeClass('hidden');
    }
  }
  for (var key in json_object) {
    var units_from_json = json_object[key];
    $('#m_' + units_from_json[0]['marketing_name'] + ' span').html(units_from_json.length > 1 ? units_from_json.length : '')
    if (has_floorplate == 'true') {
      adjustMarkerPosition($('#m_' + units_from_json[0]['marketing_name']));
    }
    $('#m_' + units_from_json[0]['marketing_name']).removeClass('hidden');
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
    var units_to_display = select_units_according_to_filters(floorplate_units)

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
    if (units_to_display.length == 1)
      var str = " match"
    else
      var str = " matches"
    $('#' + floors[i]).attr('data-original-title', (units_to_display.length.toString() + str));
  }
  if ((floors.length > 0)) {
    disable_rent_filter_options(min_market_rent)
    disable_area_filter_options(max_area)
  }
}


function select_units_according_to_filters(floorplate_units) {
  var bedroom_base_units = [];
  var availability_base_units = [];
  var rent_base_units = [];
  var square_feet_base_units = [];
  //var sold_units = [];
  //var are_available_units = [];
  var all_units = [];
  var market_rent = $('#market_rent').val();
  var square_feet = $('#square_feet').val();
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

  for (var i = 0; i < floorplate_units.length; i++) {
    all_units.push(floorplate_units[i]);
    //show zero bedroom markers  
    if ($('#zero-bedroom-checkbox').is(':checked')) {
      if (parseInt(floorplate_units[i]['bedrooms']) == 0) {
        //$('#m_'+units[i]['marketing_name']).removeClass('hidden');
        bedroom_base_units.push(floorplate_units[i]);
      }
    }
    //show one bedroom markers  
    if ($('#one-bedroom-checkbox').is(':checked')) {
      if (parseInt(floorplate_units[i]['bedrooms']) == 1) {
        //$('#m_'+units[i]['marketing_name']).removeClass('hidden');
        bedroom_base_units.push(floorplate_units[i]);
      }
    }
    //show two bedroom markers
    if ($('#two-bedroom-checkbox').is(':checked')) {
      if (parseInt(floorplate_units[i]['bedrooms']) == 2) {
        bedroom_base_units.push(floorplate_units[i]);
      }
    }
    //show three bedroom markers
    if ($('#three-bedroom-checkbox').is(':checked')) {
      if (parseInt(floorplate_units[i]['bedrooms']) == 3) {
        bedroom_base_units.push(floorplate_units[i]);
      }
    }
    //show four bedroom markers
    if ($('#four-bedroom-checkbox').is(':checked')) {
      if (parseInt(floorplate_units[i]['bedrooms']) == 4) {
        bedroom_base_units.push(floorplate_units[i]);
      }
    }
    //show five bedroom markers
    if ($('#five-bedroom-checkbox').is(':checked')) {
      if (parseInt(floorplate_units[i]['bedrooms']) == 5) {
        bedroom_base_units.push(floorplate_units[i]);
      }
    }
    //show six bedroom markers
    if ($('#six-bedroom-checkbox').is(':checked')) {
      if (parseInt(floorplate_units[i]['bedrooms']) == 6) {
        bedroom_base_units.push(floorplate_units[i]);
      }
    }
    //show available now
    if ($('#now-checkbox').is(':checked')) {
      var available_date = new Date(floorplate_units[i]['available_date']);
      if (available_date <= today) {
        availability_base_units.push(floorplate_units[i]);
      }
    }
    //show available 30 in 30 days
    if ($('#thirty-days-checkbox').is(':checked')) {
      var available_date = new Date(floorplate_units[i]['available_date']);
      if (available_date > today && available_date < thirty_days) {
        availability_base_units.push(floorplate_units[i]);
      }
    }
    //show available units in 30 to 60 days
    if ($('#thirty-to-sixty-days-checkbox').is(':checked')) {
      var available_date = new Date(floorplate_units[i]['available_date']);
      if (available_date >= thirty_days && available_date <= sixty_days) {
        availability_base_units.push(floorplate_units[i]);
      }
    }
    //show available units in 60 to 90 days
    if ($('#sixty-to-ninty-days-checkbox').is(':checked')) {
      var available_date = new Date(floorplate_units[i]['available_date']);
      if (available_date >= sixty_days && available_date <= ninty_days) {
        availability_base_units.push(floorplate_units[i]);
      }
    }
    //show available units in 90 to 120 days
    if ($('#ninty-to-one-twenty-days-checkbox').is(':checked')) {
      var available_date = new Date(floorplate_units[i]['available_date']);
      if (available_date >= ninty_days && available_date <= one_twenty_days) {
        availability_base_units.push(floorplate_units[i]);
      }
    }
    //show available units in 120+ days
    if ($('#one-twenty-plus-days-checkbox').is(':checked')) {
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
  if (!($('#zero-bedroom-checkbox').is(':checked') || $('#one-bedroom-checkbox').is(':checked') || $('#two-bedroom-checkbox').is(':checked') || $('#three-bedroom-checkbox').is(':checked') || $('#four-bedroom-checkbox').is(':checked') || $('#five-bedroom-checkbox').is(':checked') || $('#six-bedroom-checkbox').is(':checked'))) {
    bedroom_base_units = all_units
    bedroom_filter_present = false
  }

  if (!($('#now-checkbox').is(':checked') || $('#thirty-days-checkbox').is(':checked') || $('#thirty-to-sixty-days-checkbox').is(':checked') || $('#sixty-to-ninty-days-checkbox').is(':checked') || $('#ninty-to-one-twenty-days-checkbox').is(':checked') || $('#one-twenty-plus-days-checkbox').is(':checked'))) {
    availability_base_units = all_units
    availability_filter_present = false
  }

  if (isNaN(minimum_square_feet)) {
    square_feet_base_units = all_units
    area_filter_present = false
  }

  if (isNaN(minimum_market_rent)) {
    rent_base_units = all_units
    price_filter_present = false
  }
  if (bedroom_filter_present || availability_filter_present || price_filter_present || area_filter_present) {
    var units_to_display = $.intersect(bedroom_base_units, availability_base_units, rent_base_units, square_feet_base_units);
    //units_to_display = $.union(units_to_display, sold_units, are_available_units);
    return units_to_display;
  } else {
    return [];
  }
}


function set_psi_url(element) {
  //var url = $(element).data('website')+"/Apartments/module/application_authentication/http_referer/"+$(element).data('uri')+"/popup/false/kill_session/1/property[id]/"+$(element).data('community-property-id')+"/property_floorplan[id]/"+$(element).data('floorplan-provider-id')+"/unit_space[id]/"+$(element).data('unit-provider-id')+"/show_in_popup/false/from_check_availability/1/term_month/"+$(element).data('lease-term')+"/?lease_start_date="+$('#leasing-start-date').val();
  var url = $(element).data('availability-url');
  window.open(url, '_blank');
}

function set_realpagesvc_url(element) {
  //http://localhost:3000/communities/25/webpages/apply_now?MoveInDate=12/15/2017&UnitId=346&SearchUrl=https%3A//localhost:3000#k=70697
  var url = apply_now_url + "?MoveInDate=" + $('#leasing-start-date').val() + "&UnitId=" + $(element).data('unit-provider-id') + "&SearchUrl=" + redirect_url;
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
      $("#market_rent option[value=" + option.value + "]").hide()
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
      $("#square_feet option[value=" + option.value + "]").hide()
    else
      $("#square_feet option[value=" + option.value + "]").show()
  }
}

function setModalAttributes(element) {

    try {
        if ($(element).data('unit-lease-pricing') == "")
        {
            $('#unit-lease-pricing-text-li').hide();
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
            debugger;
            $('#unitModal').find('#unit-lease-pricing').html(lease);
        }
    }
    catch(err) {

    }
    try {
        if ($(element).data('unit-description') == "")
        {
            $('#unit-description-text-li').hide();
        }
        else
        {
            $('#unitModal').find('#unit-description').html($(element).data('unit-description'));
        }
    }
    catch(err) {
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
      $('#unitModal').find('#available-date').html('Now');
    } else {
      $('#unitModal').find('#availability').html($(element).data('availability') == "Unoccupied" ? "Available" : "Occupied");
      $('#unitModal').find('#available-text').html('Available');
      $('#unitModal').find('#available-date').html($(element).data('available-date'));
    }
  }
  $('#unitModal').find('#market-rent').html('$' + $(element).data('market-rent'));
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
  if ($(element).data('provider') === 'psi') {
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


function setUnitAttributes(element) {
  $('.modal-unit-button').each(function () {
    $(this).removeClass('btn-primary');
    $(this).addClass('btn-default');
  });
  $(element).removeClass('btn-default');
  $(element).addClass('btn-primary');
  setModalAttributes(element);
}


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
  var current_left = x_plot / width_ratio;
  var current_top = y_plot / height_ratio;
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
    current_left = x_plot / width_ratio;
    current_top = y_plot / height_ratio;
    $(this).css({"left": current_left, "top": current_top});
  });
}