$(document).ready(function(){
  if ($('.is-webpage')[0]){
    /* unit modal*/
    $('#unitModal').on('show.bs.modal', function(e) {
      $(this).find('#unit-marketing-name').html($(e.relatedTarget).data('unit-marketing-name'));
      $(this).find('#floorplan-name').html($(e.relatedTarget).data('floorplan-name'));
      $(this).find('#square-feet').html($(e.relatedTarget).data('square-feet'));
      $(this).find('#bathrooms').html($(e.relatedTarget).data('bathrooms'));
      $(this).find('#bedrooms').html($(e.relatedTarget).data('bedrooms'));
      $(this).find('#availability').html($(e.relatedTarget).data('availability') == "Unoccupied" ? "Available" : "Occupied");
      $(this).find('#available-date').html($(e.relatedTarget).data('available-date'));
      $(this).find('#market-rent').html('$'+$(e.relatedTarget).data('market-rent'));
      if ($(e.relatedTarget).data('floorplan-image') != ''){
        $(this).find('#floorplan-image').attr('src',$(e.relatedTarget).data('floorplan-image'));
      }
      else{
       $(this).find('#floorplan-image').attr('src','/assets/default.jpeg'); 
      }
    });
    /////////////////////////////////////////
    setFilters();
    /////////////////////////////////////////
    $('.filters').click(function(){
      if ($(this).is(':checked')){
        $(this).parent().addClass('active');  
      }
      else{
       $(this).parent().removeClass('active');   
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
        $('.filters').each(function(){
          $(this).attr('checked',true);
          $(this).parent().addClass('active');
        });
        showMarkers();  
      }
      else{
       $(this).parent().removeClass('active'); 
       $('.filters').each(function(){
          $(this).attr('checked',false);
          $(this).parent().removeClass('active');
        });  
       showMarkers();
      }
    });
 } // if condition ending curl
});

function setFilters(){
 var one_bedroom = false;
 var two_bedroom = false;
 var three_bedroom = false;
 var four_bedroom = false;
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
   if (units[i]['bedrooms'] == '1'){
     one_bedroom = true
   }
   if (units[i]['bedrooms'] == '2'){
     two_bedroom = true
   }
   if (units[i]['bedrooms'] == '3'){
     three_bedroom = true
   }
   if (units[i]['bedrooms'] == '4'){
     four_bedroom = true
   }
   if (units[i]['available_date'] != '2099-01-01'){
     var available_date = new Date(units[i]['available_date']);
     if (available_date < thirty_days){
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
   }
 }
 if(units_available_in_thirty_days){
  $('#thirty-days-checkbox').parent().removeClass('hidden');
 }
 if(units_available_in_thirty_to_sixty_days){
  $('#thirty-to-sixty-days-checkbox').parent().removeClass('hidden');
 }
 if(units_available_in_sixty_to_ninty_days){
  $('#sixty-to-ninty-days-checkbox').parent().removeClass('hidden');
 }
 if(units_available_in_ninty_to_one_twenty_days){
  $('#ninty-to-one-twenty-days-checkbox').parent().removeClass('hidden');
 }
 if(units_available_in_one_twenty_plus_days){
  $('#one-twenty-plus-days-checkbox').parent().removeClass('hidden');
 }

 if(one_bedroom){
  $('#one-bedroom-checkbox').parent().removeClass('hidden');
 }
 if(two_bedroom){
  $('#two-bedroom-checkbox').parent().removeClass('hidden');
 }
 if(three_bedroom){
  $('#three-bedroom-checkbox').parent().removeClass('hidden');
 }
 if(four_bedroom){
  $('#four-bedroom-checkbox').parent().removeClass('hidden');
 }

 //var today = new Date();
 //console.log(today);
 //var thirty_days = new Date(today).setDate(today.getDate()+30); 

 //console.log(thirty_days);
 //console.log(today.setHours(0,0,0,0) < thirty_days);
 //var curr = new Date();
 //console.log(today.setHours(0,0,0,0) == curr.setHours(0,0,0,0));

}

function showMarkers(){
  console.log('showing units on the basis of filters');
  var bedroom_base_units = [];
  var availability_base_units = [];
  var rent_base_units = [];
  var square_feet_base_units = [];
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
  $('.marker').addClass('hidden');
  for(var i=0;i < units.length;i++){
   //show one bedroom markers  
   if($('#one-bedroom-checkbox').is(':checked')){
     if (units[i]['bedrooms'] == '1' && units[i]['availability'] == "Unoccupied"){
       //$('#m_'+units[i]['marketing_name']).removeClass('hidden');
       bedroom_base_units.push(units[i]['marketing_name']);
     }
   }
   //show two bedroom markers
   if($('#two-bedroom-checkbox').is(':checked')){
     if (units[i]['bedrooms'] == '2' && units[i]['availability'] == "Unoccupied"){
       bedroom_base_units.push(units[i]['marketing_name']);
     }
   }
   //show three bedroom markers
   if($('#one-bedroom-checkbox').is(':checked')){
     if (units[i]['bedrooms'] == '3' && units[i]['availability'] == "Unoccupied"){
       bedroom_base_units.push(units[i]['marketing_name']);
     }
   }
   //show four bedroom markers
   if($('#one-bedroom-checkbox').is(':checked')){
     if (units[i]['bedrooms'] == '4' && units[i]['availability'] == "Unoccupied"){
       bedroom_base_units.push(units[i]['marketing_name']);
     }
   }
   //show available markers
   if($('#now-checkbox').is(':checked' && units[i]['availability'] == "Unoccupied")){
     //if (units[i]['availability'] == "Unoccupied"){
       availability_base_units.push(units[i]['marketing_name']);
     //}
   }
   //show available 30 in 30 days
   if($('#thirty-days-checkbox').is(':checked')){
     var available_date = new Date(units[i]['available_date']);
     if (available_date > today && available_date < thirty_days){
       availability_base_units.push(units[i]['marketing_name']);
     }
   }
   //show available units in 30 to 60 days
   if($('#thirty-to-sixty-days-checkbox').is(':checked')){
     var available_date = new Date(units[i]['available_date']);
     if (available_date >= thirty_days && available_date <= sixty_days){
       availability_base_units.push(units[i]['marketing_name']);
     }
   }
   //show available units in 60 to 90 days
   if($('#sixty-to-ninty-days-checkbox').is(':checked')){
     var available_date = new Date(units[i]['available_date']);
     if (available_date >= sixty_days && available_date <= ninty_days){
       availability_base_units.push(units[i]['marketing_name']);
     }
   }
   //show available units in 120+ days
   if($('#one-twenty-plus-days-checkbox').is(':checked')){
     var available_date = new Date(units[i]['available_date']);
     if (available_date > one_twenty_days && units[i]['available_date'] != '2099-01-01'){
       availability_base_units.push(units[i]['marketing_name']);
     }
   }
   //show units on the basis of minimum and maximum rent value
   var unit_market_rent = parseFloat(units[i]['market_rent']);
   if (unit_market_rent >= minimum_market_rent && unit_market_rent <= maximum_market_rent){
     rent_base_units.push(units[i]['marketing_name']);
   }
   //show units on the basis of minimum and maximum rent value
   var unit_square_feet = parseFloat(units[i]['square_feet']);
   if(unit_square_feet >= minimum_square_feet && unit_square_feet <= maximum_square_feet){
     square_feet_base_units.push(units[i]['marketing_name']);
   }        
 } //for loop block ending curl
 var units_to_display = $.intersect(bedroom_base_units, availability_base_units,rent_base_units,square_feet_base_units);
 console.log(units_to_display); 
 for(var i=0;i < units_to_display.length;i++){
   $('#m_'+units_to_display[i]).removeClass('hidden');
 }
} //function ending curl