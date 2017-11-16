$(document).ready(function(){
  if ($('.is-webpage')[0]){
    $('#unitModal').on('show.bs.modal', function(e) {
      $(this).find('#unit-marketing-name').html($(e.relatedTarget).data('unit-marketing-name'));
      $(this).find('#floorplan-name').html($(e.relatedTarget).data('floorplan-name'));
      $(this).find('#square-feet').html($(e.relatedTarget).data('square-feet'));
      $(this).find('#bathrooms').html($(e.relatedTarget).data('bathrooms'));
      $(this).find('#bedrooms').html($(e.relatedTarget).data('bedrooms'));
      $(this).find('#availability').html($(e.relatedTarget).data('availability') == "Unoccupied" ? "Available Now" : "Occupied");
      $(this).find('#available-date').html($(e.relatedTarget).data('available-date'));
      $(this).find('#market-rent').html('$'+$(e.relatedTarget).data('market-rent'));
    });

    setFilters();
    $('.filters').click(function(){
      showMarkers();
    });
 }
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
       $('#m_'+units[i]['marketing_name']).removeClass('hidden');
     }
   }
   //show two bedroom markers
   if($('#two-bedroom-checkbox').is(':checked')){
     if (units[i]['bedrooms'] == '2' && units[i]['availability'] == "Unoccupied"){
       $('#m_'+units[i]['marketing_name']).removeClass('hidden');
     }
   }
   //show three bedroom markers
   if($('#one-bedroom-checkbox').is(':checked')){
     if (units[i]['bedrooms'] == '3' && units[i]['availability'] == "Unoccupied"){
       $('#m_'+units[i]['marketing_name']).removeClass('hidden');
     }
   }
   //show four bedroom markers
   if($('#one-bedroom-checkbox').is(':checked')){
     if (units[i]['bedrooms'] == '4' && units[i]['availability'] == "Unoccupied"){
       $('#m_'+units[i]['marketing_name']).removeClass('hidden');
     }
   }
   //show available markers
   if($('#now-checkbox').is(':checked')){
     if (units[i]['availability'] == "Unoccupied" && units[i]['available_date'] != '2099-01-01'){
       $('#m_'+units[i]['marketing_name']).removeClass('hidden');
     }
   }
   //show available 30 in 30 days
   if($('#thirty-days-checkbox').is(':checked')){
     var available_date = new Date(units[i]['available_date']);
     if (available_date > today && available_date < thirty_days){
       $('#m_'+units[i]['marketing_name']).removeClass('hidden');
     }
   }
   //show available units in 30 to 60 days
   if($('#thirty-to-sixty-days-checkbox').is(':checked')){
     var available_date = new Date(units[i]['available_date']);
     if (available_date >= thirty_days && available_date <= sixty_days){
       $('#m_'+units[i]['marketing_name']).removeClass('hidden');
     }
   }
   //show available units in 60 to 90 days
   if($('#sixty-to-ninty-days-checkbox').is(':checked')){
     var available_date = new Date(units[i]['available_date']);
     if (available_date >= sixty_days && available_date <= ninty_days){
       $('#m_'+units[i]['marketing_name']).removeClass('hidden');
     }
   }
   //show available units in 120+ days
   if($('#one-twenty-plus-days-checkbox').is(':checked')){
     var available_date = new Date(units[i]['available_date']);
     if (available_date > one_twenty_days && units[i]['available_date'] != '2099-01-01'){
       $('#m_'+units[i]['marketing_name']).removeClass('hidden');
     }
   }
 }
}