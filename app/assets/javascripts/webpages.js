var do_on_load = function(){
  if ($('.is-webpage')[0]){
    $(".panzoom").addClass("transform-none");
    $(document).on("click touchstart", ".zoom-controls", function (){
      $(".panzoom").removeClass("transform-none");
    });
    $('[data-toggle="tooltip"]').tooltip({ trigger: "hover" }); // initialize bootstrap tooltip
    ////////////// Disable browser zoom for webpage  starts here ////////////////
    $(document).keydown(function(event) {
      if (event.ctrlKey==true && (event.which == '61' || event.which == '107' || event.which == '173' || event.which == '109'  || event.which == '187'  || event.which == '189'  ) ) {
          event.preventDefault();
      }
        // 107 Num Key  +
        // 109 Num Key  -
        // 173 Min Key  hyphen/underscor Hey
        // 61 Plus key  +/= key
    });

    $(window).bind('mousewheel DOMMouseScroll', function (event) {
      if (event.ctrlKey == true) {
        event.preventDefault();
      }
    });
    ////////////// Disable browser zoom for webpage  ends here ////////////////
    $('#clickme').click(function() {
      $("#clickme").html($("#clickme").html() == 'Select Filter' ? 'Hide Filter' : 'Select Filter');
      var $slider = $('.mydiv');
    //$('.right-side').css('margin-left', '0');
      $slider.animate({
        left: parseInt($slider.css('left'),10) == -331 ?
         0 : -331
      });
    });
    ////////////////////////////////////////////////
    $('#leasing-start-date-icon').click(function(event){
      event.preventDefault();
      // console.log('********************');
      $('#leasing-start-date').focus();
    });
    ////////////////////////////////////////////////
    $('.panzoom a').on('mousedown touchstart', function( e ) {
      e.stopImmediatePropagation();
    });
    ////////////////////////////////////////////////
    /* unit modal*/
    $('#unitModal').on('show.bs.modal', function(e) {
      $(this).find('#unit-marketing-name').html("APARTMENT: "+$(e.relatedTarget).data('unit-marketing-name'));
      $(this).find('#floorplan-name').html($(e.relatedTarget).data('floorplan-name'));
      $(this).find('#square-feet').html($(e.relatedTarget).data('square-feet'));
      $(this).find('#bathrooms').html($(e.relatedTarget).data('bathrooms'));
      if ($(this).find('#bathrooms').html() == '1'){
        $(this).find('#bathrooms').parents().siblings(".bathrooms").html("Bathroom")
      }else{
        $(this).find('#bathrooms').parents().siblings(".bathrooms").html("Bathrooms")
      }
      $(this).find('#bedrooms').html($(e.relatedTarget).data('bedrooms'));
      if ($(this).find('#bedrooms').html() == '1'){
        $(this).find('#bedrooms').parents().siblings(".bedrooms").html("Bedroom")
      }else{
        $(this).find('#bedrooms').parents().siblings(".bedrooms").html("Bedrooms")
      }
      $(this).find('#availability').html($(e.relatedTarget).data('availability') == "Unoccupied" ? "Available" : "Occupied");
      $(this).find('#available-date').html($(e.relatedTarget).data('available-date'));
      $(this).find('#market-rent').html('$'+$(e.relatedTarget).data('market-rent'));
      ///////////////////////////////////////////
      if(!$(e.relatedTarget).data('is-fav')){
        var community_id = $(e.relatedTarget).data('community-id');
        var unit_id = $(e.relatedTarget).data('unit-id');
        var url = "/communities/"+community_id+"/webpages/save_favorite?unit_id="+unit_id;
        var html = '<a href="'+url+'" data-remote="true"><i class="fa fa-heart-o"></i></a>';
        $('#fav-icon-tag').html(html);
      }
      else{
        var community_id = $(e.relatedTarget).data('community-id');
        var unit_id = $(e.relatedTarget).data('unit-id');
        var url = "/communities/"+community_id+"/webpages/delete_favorite?unit_id="+unit_id;
        var html = '<a href="'+url+'" data-remote="true"><i class="fa fa-heart"></i></a>';
        $('#fav-icon-tag').html(html);
      }
      /////////////////////////////////////////
      if ($(e.relatedTarget).data('floorplan-image') != ''){
        $(this).find('#floorplan-image').attr('src',$(e.relatedTarget).data('floorplan-image'));
      }
      else{
       $(this).find('#floorplan-image').attr('src','/assets/default.jpeg'); 
      }
      //////////////////////////////////////////
      if($(e.relatedTarget).data('provider') === 'psi'){
        var website = $(e.relatedTarget).data('website');
        // console.log(website);
        var uri = website.replace(/^https?\:\/\//,'');
        // console.log(uri);
        $('#psi-anchor-tag').attr('data-community-property-id',$(e.relatedTarget).data('community-property-id'));
        $('#psi-anchor-tag').attr('data-website',website);
        $('#psi-anchor-tag').attr('data-uri',uri);
        $('#psi-anchor-tag').attr('data-unit-provider-id',$(e.relatedTarget).data('unit-provider-id'));
        $('#psi-anchor-tag').attr('data-floorplan-provider-id',$(e.relatedTarget).data('floorplan-provider-id'));
        $('#psi-anchor-tag').attr('data-lease-term',$(e.relatedTarget).data('lease-term'));
        $("#leasing-start-date").datepicker('setDate', new Date());
      }
      else if(($(e.relatedTarget).data('provider') === 'realpagesvc')){
        // console.log($(e.relatedTarget).data('unit-provider-id'));
        $('#realpagesvc-anchor-tag').attr('data-unit-provider-id',$(e.relatedTarget).data('unit-provider-id'));
      }
    });
    
    /////////////////////////////////////////
    setFilters();
    /////////////////////////////////////////
    $('.active-filter').click(function(){
      if ($(this).is(':checked')){
        $(this).parent().addClass('active');
      }
      else{
        $(this).parent().removeClass('active');
        $('#select-all-filters-checkbox').prop('checked', false);
        $('#select-all-filters-checkbox').removeClass('active')
      }
      showMarkers();
    });
    /////////////////////////////////////////
    $('#market_rent').change(function(){
      showMarkers();
    });
    $('#square_feet').change(function(){
      showMarkers();
    });
    ////////////////////////////////////////
    $('#select-all-filters-checkbox').click(function(){
      if ($(this).is(':checked')){
        $(this).parent().addClass('active');
        $('.active-filter').each(function(){
          $(this).prop('checked', true);
          $(this).parent().addClass('active');
        });
        showMarkers();  
      }
      else{
       $(this).parent().removeClass('active'); 
       $('.active-filter').each(function(){
          $(this).prop('checked', false);
          $(this).parent().removeClass('active');
        });  
       showMarkers();
      }
    });
    ///////////////////////////////////////////
    $('.floorplate-anchor').click(function(){
      $(".panzoom").addClass("transform-none");
      // console.log('clicking on anchor tag');
      var $section = $('#panzomm-container');
      $panzoom = $section.find('.panzoom').panzoom("reset");
      var floorplate_number_for_showing_image = $(this).attr('id');
      if (floorplate_number_for_showing_image !=  current_floorplate_number){ // && !$(this).hasClass('no-units')
        $('.floorplate-image').addClass('hidden');
        $('#f_'+floorplate_number_for_showing_image).removeClass('hidden');
        $('.floorplate-anchor').removeClass('selected');
        $('#'+floorplate_number_for_showing_image).addClass('selected');
        current_floorplate_number = floorplate_number_for_showing_image
        populate_current_units();
        if ($(this).hasClass('no-units'))
          $(".alert").show()
        else
          $(".alert").hide()
        setTimeout(function() {
            $('.alert').fadeOut('slow');
        }, 6000); // <-- time in milliseconds
      }
    });
    ////////////////////////////////////////////
    $('.filter-label').click(function(){
      $(this).parent().find('input').click();
    });
    ////////////////////////////////////////////
    /*panzoom functionality*/
    var $section = $('#panzomm-container');
    $panzoom = $section.find('.panzoom').panzoom({
        $zoomIn: $section.find(".zoom-in"),
        $zoomOut: $section.find(".zoom-out"),
        $reset: $section.find(".reset"),
        $set: $section.find(".parent"),
        contain: 'automatic',
        minScale: 0.7,
      });
    /////////////////////////////////////////////
    /*popover*/
    if (!hasTouch()){
      $(".marker" )
        .mouseenter(function(event) {
          if ($(this).data('is-fav')){
            $('.fav-heart').removeClass('hidden')
          }else{
            $('.fav-heart').addClass('hidden')
          }
          $('#popover-marketing-name').html("APARTMENT: <b>"+$(this).data('unit-marketing-name')+"</b>");
          $('#popover-floorplan').html($(this).data('floorplan-name'))
          if ($(this).data('floorplan-image') != ''){
            $('#media-object').attr('src',$(this).data('floorplan-image'));
          }
          else{
           $('#media-object').attr('src','/assets/default.jpeg'); 
          }
          $('#popover-square-feet').html($(this).data('square-feet'));
          $('#popover-bathrooms').html($(this).data('bathrooms'));
          if ($('#popover-bathrooms').html() == '1'){
            $('#popover-bathrooms').siblings("small").html("Bathroom")
          }else{
            $('#popover-bathrooms').siblings("small").html("Bathrooms")
          }
          $('#popover-bedrooms').html($(this).data('bedrooms'));
          if ($('#popover-bedrooms').html() == '1'){
            $('#popover-bedrooms').siblings("small").html("Bedroom")
          }else{
            $('#popover-bedrooms').siblings("small").html("Bedrooms")
          }
          $('#popover-available-date').html($(this).data('available-date'));
          $('#popover-price').html(('$'+$(this).data('market-rent')));

          var new_dx = parseInt(event.pageX) - parseInt($('#panzomm-container').offset().left) + parseInt($('#panzomm-container').scrollLeft());
          var new_dy = parseInt(event.pageY) - parseInt($('#panzomm-container').offset().top) + parseInt($('#panzomm-container').scrollTop());
          $('#marker-popover').css({left: (new_dx+100)+"px", top: (new_dy-120)+"px"});
          $('#marker-popover').removeClass('hidden');
        })
        .mouseleave(function() {
          $('#marker-popover').addClass('hidden');
        });
      }
    ///////////////////////////////////////////////
    /*adjusting markers according to screen size*/
    var in_browser_height = 0;
    var in_browser_width = 0;
    var actual_height = 0;
    var actual_width =0;
    $('.floorplate-image').each(function(){
      // console.log("Image height: "+$(this).height());
      // console.log("In browser height: "+$(this).parent().height());
      in_browser_height = parseFloat($(this).parent().height());
      // console.log("In browser width: "+$(this).parent().width());
      in_browser_width = parseFloat($(this).parent().width());
      // actual_height = parseInt($(this).data("height"));
      // actual_width = parseInt($(this).data("width");
    });
    if (has_floorplate == 'true'){
      actual_height = parseInt($('#f_'+current_floorplate_number).data("height"))
      actual_width = parseInt($('#f_'+current_floorplate_number).data("width"))
    }else{
      actual_height = parseInt($('.floorplate-image').data("height"))
      actual_width = parseInt($('.floorplate-image').data("width"))
    }
    if (actual_width<1412 && actual_width<in_browser_width)
      var width_ratio = 0/in_browser_width;
    else
      var width_ratio = actual_width/in_browser_width;
    if (actual_height<932 && actual_height<in_browser_height)
      var height_ratio = 0/in_browser_height;
    else
      var height_ratio = actual_height/in_browser_height;
    
    
    $('.marker').each(function(){
      var x_plot = parseFloat($(this).data('unit-x-plot'));
      var y_plot = parseFloat($(this).data('unit-y-plot'));
      current_left = x_plot/width_ratio;
      current_top = y_plot/height_ratio;
      $(this).css({"left": current_left,"top": current_top});
    }); 
    
    $('.amenity-marker').each(function(){
      var x_plot = parseFloat($(this).data('amenity-x-plot'));
      var y_plot = parseFloat($(this).data('amenity-y-plot'));
      current_left = x_plot/width_ratio;
      current_top = y_plot/height_ratio;
      $(this).css({"left": current_left,"top": current_top});
    });

    $('.sitemap-amenity-marker').each(function(){
      var x_plot = parseFloat($(this).data('amenity-x-plot'));
      var y_plot = parseFloat($(this).data('amenity-y-plot'));
      current_left = x_plot/width_ratio;
      current_top = y_plot/height_ratio;
      $(this).css({"left": current_left,"top": current_top});
    });   
 } // if condition ending curl
};
$(document).ready(do_on_load)
$(window).bind('page:change', do_on_load)

function setFilters(){
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
 var thirty_days = new Date(today).setDate(today.getDate()+30);
 var sixty_days = new Date(today).setDate(today.getDate()+60);
 var ninty_days = new Date(today).setDate(today.getDate()+90);
 var one_twenty_days = new Date(today).setDate(today.getDate()+120);
 //In below for loop hide and show filters on the basis of units data available
	for(var i=0;i < units.length;i++){
   //console.log(units[i]);
   if (parseInt(units[i]['bedrooms']) == 0){
     zero_bedroom = true
   }
   if (parseInt(units[i]['bedrooms']) == 1){
     one_bedroom = true
   }
   if (parseInt(units[i]['bedrooms']) == 2){
     two_bedroom = true
   }
   if (parseInt(units[i]['bedrooms']) == 3){
     three_bedroom = true
   }
   if (parseInt(units[i]['bedrooms']) == 4){
     four_bedroom = true
   }
   if (parseInt(units[i]['bedrooms']) == 5){
     five_bedroom = true
   }
   if (parseInt(units[i]['bedrooms']) == 6){
     six_bedroom = true
   }
   // if (units[i]['available_date'] != '2099-01-01'){
     var available_date = new Date(units[i]['available_date']);
     if (available_date <= today){
       units_available_now = true;
     }
     if (available_date > today && available_date <= thirty_days){
       units_available_in_thirty_days = true;
     }
     if (available_date >= thirty_days && available_date <= sixty_days){
       units_available_in_thirty_to_sixty_days = true;
     }
     if (available_date >= sixty_days && available_date <= ninty_days){
       units_available_in_sixty_to_ninty_days = true;
     }
     if (available_date >= ninty_days && available_date <= one_twenty_days){
       units_available_in_ninty_to_one_twenty_days = true;
     }
     if (available_date > one_twenty_days){
       units_available_in_one_twenty_plus_days = true;
     }
   // }
 }
 if(units_available_now){
  $('#now-checkbox').addClass('active-filter');
  $('#now-checkbox').parent().removeClass('disabled');
 }else{
  $('#now-checkbox').prop('checked', false);
 }

 if(units_available_in_thirty_days){
  $('#thirty-days-checkbox').addClass('active-filter');
  $('#thirty-days-checkbox').parent().removeClass('disabled');
 }else{
  $('#thirty-days-checkbox').prop('checked', false);
 }

 if(units_available_in_thirty_to_sixty_days){
  $('#thirty-to-sixty-days-checkbox').addClass('active-filter');
  $('#thirty-to-sixty-days-checkbox').parent().removeClass('disabled');
 }else{
  $('#thirty-to-sixty-days-checkbox').prop('checked', false);
 }

 if(units_available_in_sixty_to_ninty_days){
  $('#sixty-to-ninty-days-checkbox').addClass('active-filter');
  $('#sixty-to-ninty-days-checkbox').parent().removeClass('disabled');
 }else{
  $('#sixty-to-ninty-days-checkbox').prop('checked', false);
 }

 if(units_available_in_ninty_to_one_twenty_days){
  $('#ninty-to-one-twenty-days-checkbox').addClass('active-filter');
  $('#ninty-to-one-twenty-days-checkbox').parent().removeClass('disabled');
 }else{
  $('#ninty-to-one-twenty-days-checkbox').prop('checked', false);
 }

 if(units_available_in_one_twenty_plus_days){
  $('#one-twenty-plus-days-checkbox').addClass('active-filter');
  $('#one-twenty-plus-days-checkbox').parent().removeClass('disabled');
 }else{
  $('#one-twenty-plus-days-checkbox').prop('checked', false);
 }

 if(zero_bedroom){
  $('#zero-bedroom-checkbox').addClass('active-filter');
  $('#zero-bedroom-checkbox').parent().removeClass('disabled');
 }else{
  $('#zero-bedroom-checkbox').prop('checked', false);
 }

 if(one_bedroom){
  $('#one-bedroom-checkbox').addClass('active-filter');
  $('#one-bedroom-checkbox').parent().removeClass('disabled');
 }else{
  $('#one-bedroom-checkbox').prop('checked', false);
 }

 if(two_bedroom){
  $('#two-bedroom-checkbox').addClass('active-filter');
  $('#two-bedroom-checkbox').parent().removeClass('disabled');
 }else{
  $('#two-bedroom-checkbox').prop('checked', false);
 }

 if(three_bedroom){
  $('#three-bedroom-checkbox').addClass('active-filter');
  $('#three-bedroom-checkbox').parent().removeClass('disabled');
 }else{
  $('#three-bedroom-checkbox').prop('checked', false);
 }

 if(four_bedroom){
  $('#four-bedroom-checkbox').addClass('active-filter');
  $('#four-bedroom-checkbox').parent().removeClass('disabled');
 }else{
  $('#four-bedroom-checkbox').prop('checked', false);
 }

 if(five_bedroom){
  $('#five-bedroom-checkbox').addClass('active-filter');
  $('#five-bedroom-checkbox').parent().removeClass('disabled');
 }else{
  $('#five-bedroom-checkbox').prop('checked', false);
 }

 if(six_bedroom){
  $('#six-bedroom-checkbox').addClass('active-filter');
  $('#six-bedroom-checkbox').parent().removeClass('disabled');
 }else{
  $('#six-bedroom-checkbox').prop('checked', false);
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

function showMarkers(){
  // console.log('showing units on the basis of filters');
  
  $('.marker').addClass('hidden');
  

  
  var units_to_display = select_units_according_to_filters(current_units)
  if (!(has_floorplate == 'true')){
    var min_rent = Math.min.apply(Math,units_to_display.map(function(o){return o.market_rent;}))
    var max_area = Math.max.apply(Math,units_to_display.map(function(o){return o.square_feet;}))
    disable_rent_filter_options(min_rent)
    disable_area_filter_options(max_area)
  }
 // console.log(units_to_display); 
 for(var i=0;i < units_to_display.length;i++){
   $('#m_'+units_to_display[i]['marketing_name']).removeClass('hidden');
 }
 disabled_enabled_anchors();
} //function ending curl


function populate_current_units(){
  $('.marker').addClass('hidden');
  current_units = [];
  if(has_floorplate == 'true'){
    $('.amenity-marker').addClass('hidden'); // first hidding all amenity markers
    $('.a_'+current_floorplate_number).removeClass('hidden'); // showing amenity markers on current floorplate 
    for(var i=0;i < units.length;i++){
      if (units[i]['floorplate_number'] == current_floorplate_number){
        current_units.push(units[i]);
      }
    }
  }
  else{
    for(var i=0;i < units.length;i++){
      current_units.push(units[i]);
    }
  }
  showMarkers();
}

function disabled_enabled_anchors(){
  var min_market_rent = 100000
  var max_area = 0
  for(var i = 0; i < floorplate_numbers.length; i++){
    var floorplate_units = [];
    
    for(var j=0; j < units.length; j++){
      if (units[j]['floorplate_number'] == floorplate_numbers[i]){
        floorplate_units.push(units[j]);
      }
    }
    //console.log(floorplate_units);
     var units_to_display = select_units_according_to_filters(floorplate_units)

     // console.log(units_to_display.length);
     if(units_to_display.length == 0){
      //console.log(floorplate_numbers[i]);
      $('#'+floorplate_numbers[i]).addClass('no-units');
      if ($('#'+floorplate_numbers[i]).hasClass('selected')){
        $('.alert').show()
        setTimeout(function() {
            $('.alert').fadeOut('slow');
        }, 6000); // <-- time in milliseconds
      }
     }
     else{
      $('#'+floorplate_numbers[i]).removeClass('no-units');
      var min_rent_floorplate = Math.min.apply(Math,units_to_display.map(function(o){return o.market_rent;}))
      var max_area_floorplate = Math.max.apply(Math,units_to_display.map(function(o){return o.square_feet;}))
      if (min_rent_floorplate < min_market_rent)
        min_market_rent = min_rent_floorplate
      if (max_area_floorplate > max_area)
        max_area = max_area_floorplate
     }
    if (units_to_display.length == 1)
      var str = " match"
    else
      var str = " matches"
    $('#'+floorplate_numbers[i]).attr('data-original-title', (units_to_display.length.toString()+str));
  }
  if((floorplate_numbers.length>0)){
    disable_rent_filter_options(min_market_rent)
    disable_area_filter_options(max_area)
  }
}


function select_units_according_to_filters(floorplate_units){
  var bedroom_base_units = [];
  var availability_base_units = [];
  var rent_base_units = [];
  var square_feet_base_units = [];
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
  var thirty_days = new Date(today).setDate(today.getDate()+30);
  var sixty_days = new Date(today).setDate(today.getDate()+60);
  var ninty_days = new Date(today).setDate(today.getDate()+90);
  var one_twenty_days = new Date(today).setDate(today.getDate()+120);

  for(var i=0;i < floorplate_units.length;i++){
    all_units.push(floorplate_units[i]);
    //show zero bedroom markers  
   if($('#zero-bedroom-checkbox').is(':checked')){
     if (parseInt(floorplate_units[i]['bedrooms']) == 0){
       //$('#m_'+units[i]['marketing_name']).removeClass('hidden');
       bedroom_base_units.push(floorplate_units[i]);
     }
   }
   //show one bedroom markers  
   if($('#one-bedroom-checkbox').is(':checked')){
     if (parseInt(floorplate_units[i]['bedrooms']) == 1){
       //$('#m_'+units[i]['marketing_name']).removeClass('hidden');
       bedroom_base_units.push(floorplate_units[i]);
     }
   }
   //show two bedroom markers
   if($('#two-bedroom-checkbox').is(':checked')){
     if (parseInt(floorplate_units[i]['bedrooms']) == 2){
       bedroom_base_units.push(floorplate_units[i]);
     }
   }
   //show three bedroom markers
   if($('#three-bedroom-checkbox').is(':checked')){
     if (parseInt(floorplate_units[i]['bedrooms']) == 3){
       bedroom_base_units.push(floorplate_units[i]);
     }
   }
   //show four bedroom markers
   if($('#four-bedroom-checkbox').is(':checked')){
     if (parseInt(floorplate_units[i]['bedrooms']) == 4){
       bedroom_base_units.push(floorplate_units[i]);
     }
   }
   //show five bedroom markers
   if($('#five-bedroom-checkbox').is(':checked')){
     if (parseInt(floorplate_units[i]['bedrooms']) == 5){
       bedroom_base_units.push(floorplate_units[i]);
     }
   }
   //show six bedroom markers
   if($('#six-bedroom-checkbox').is(':checked')){
     if (parseInt(floorplate_units[i]['bedrooms']) == 6){
       bedroom_base_units.push(floorplate_units[i]);
     }
   }
   //show available now
   if($('#now-checkbox').is(':checked')){
    var available_date = new Date(floorplate_units[i]['available_date']);
     if (available_date <= today){
       availability_base_units.push(floorplate_units[i]);
     }
   }
   //show available 30 in 30 days
   if($('#thirty-days-checkbox').is(':checked')){
     var available_date = new Date(floorplate_units[i]['available_date']);
     if (available_date > today && available_date < thirty_days){
       availability_base_units.push(floorplate_units[i]);
     }
   }
   //show available units in 30 to 60 days
   if($('#thirty-to-sixty-days-checkbox').is(':checked')){
     var available_date = new Date(floorplate_units[i]['available_date']);
     if (available_date >= thirty_days && available_date <= sixty_days){
       availability_base_units.push(floorplate_units[i]);
     }
   }
   //show available units in 60 to 90 days
   if($('#sixty-to-ninty-days-checkbox').is(':checked')){
     var available_date = new Date(floorplate_units[i]['available_date']);
     if (available_date >= sixty_days && available_date <= ninty_days){
       availability_base_units.push(floorplate_units[i]);
     }
   }
   //show available units in 90 to 120 days
   if($('#ninty-to-one-twenty-days-checkbox').is(':checked')){
     var available_date = new Date(floorplate_units[i]['available_date']);
     if (available_date >= ninty_days && available_date <= one_twenty_days){
       availability_base_units.push(floorplate_units[i]);
     }
   }
   //show available units in 120+ days
   if($('#one-twenty-plus-days-checkbox').is(':checked')){
     var available_date = new Date(floorplate_units[i]['available_date']);
     if (available_date > one_twenty_days){
       availability_base_units.push(floorplate_units[i]);
     }
   }
   //show units on the basis of minimum and maximum rent value
   var unit_market_rent = parseFloat(floorplate_units[i]['market_rent']);
   if (unit_market_rent >= minimum_market_rent && unit_market_rent <= maximum_market_rent){
     rent_base_units.push(floorplate_units[i]);
   }
   //show units on the basis of minimum and maximum rent value
   var unit_square_feet = parseFloat(floorplate_units[i]['square_feet']);
   if(unit_square_feet >= minimum_square_feet && unit_square_feet <= maximum_square_feet){
     square_feet_base_units.push(floorplate_units[i]);
   }

  } //for loop block ending curl
  var bedroom_filter_present = true
  var availability_filter_present = true
  var price_filter_present = true
  var area_filter_present = true
  if (!($('#zero-bedroom-checkbox').is(':checked') || $('#one-bedroom-checkbox').is(':checked') || $('#two-bedroom-checkbox').is(':checked') || $('#three-bedroom-checkbox').is(':checked') || $('#four-bedroom-checkbox').is(':checked') || $('#five-bedroom-checkbox').is(':checked') || $('#six-bedroom-checkbox').is(':checked'))){
    bedroom_base_units = all_units
    bedroom_filter_present = false
  }

  if (!($('#now-checkbox').is(':checked') || $('#thirty-days-checkbox').is(':checked') || $('#thirty-to-sixty-days-checkbox').is(':checked') || $('#sixty-to-ninty-days-checkbox').is(':checked') || $('#ninty-to-one-twenty-days-checkbox').is(':checked') || $('#one-twenty-plus-days-checkbox').is(':checked'))){
    availability_base_units = all_units
    availability_filter_present = false
  }

 if (isNaN(minimum_square_feet)){
    square_feet_base_units = all_units
    area_filter_present = false
  }

  if (isNaN(minimum_market_rent)){
    rent_base_units = all_units
    price_filter_present = false
  }
  if (bedroom_filter_present || availability_filter_present || price_filter_present || area_filter_present){
    var units_to_display = $.intersect(bedroom_base_units, availability_base_units,rent_base_units,square_feet_base_units);
    return units_to_display;
  }else{
    return [];
  }
}


function set_psi_url(element){
  var url = $(element).data('website')+"/Apartments/module/application_authentication/http_referer/"+$(element).data('uri')+"/popup/false/kill_session/1/property[id]/"+$(element).data('community-property-id')+"/property_floorplan[id]/"+$(element).data('floorplan-provider-id')+"/unit_space[id]/"+$(element).data('unit-provider-id')+"/show_in_popup/false/from_check_availability/1/term_month/"+$(element).data('lease-term')+"/?lease_start_date="+$('#leasing-start-date').val();
  window.open(url,'_blank');
}

function set_realpagesvc_url(element){
  //http://localhost:3000/communities/25/webpages/apply_now?MoveInDate=12/15/2017&UnitId=346&SearchUrl=https%3A//localhost:3000#k=70697
  var url = apply_now_url+"?MoveInDate="+$('#leasing-start-date').val()+"&UnitId="+$(element).data('unit-provider-id')+"&SearchUrl="+redirect_url;
  window.open(url,'_blank');
}

function hasTouch() {
 return 'ontouchstart' in document.documentElement || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0;
}

function disable_rent_filter_options(min_rent){
  var select = document.getElementById("market_rent");
  for (var i = 1; i < select.length; i++){
    var option = select.options[i];
    var option_rent = option.value.split('-');
    var maximum_option_rent = parseFloat(option_rent[1]);
    if (min_rent >= maximum_option_rent)
      $("#market_rent option[value="+option.value+"]").hide()
    else
      $("#market_rent option[value="+option.value+"]").show()
  } 
}

function disable_area_filter_options(max_area){
  var select = document.getElementById("square_feet");
  for (var i = 1; i < select.length; i++){
    var option = select.options[i];
    var option_area = option.value.split('-');
    var minimum_option_rent = parseFloat(option_area[0]);
    if (max_area <= minimum_option_rent)
      $("#square_feet option[value="+option.value+"]").hide()
    else
      $("#square_feet option[value="+option.value+"]").show()
  } 
}