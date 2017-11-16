$(document).ready(function(){
  setFilters();
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
   console.log(units[i]);
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