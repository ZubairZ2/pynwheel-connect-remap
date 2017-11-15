$(document).ready(function(){
  setFilters();
});

function setFilters(){

 var one_bedroom = false;
 var two_bedroom = false;
 var three_bedroom = false;
 var four_bedroom = false;
 var units_available_in_thirty_days = false;
 var units_available_in_thirty_to_ninty_days = false;
 var units_available_in_ninty_to_one_twenty_days = false;
 var units_available_in_one_twenty_plus_days = false;
 var today = new Date();
 var thirty_days = new Date(today).setDate(today.getDate()+30);
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
     if (available_date >= thirty_days && available_date <= ninty_days){
       units_available_in_thirty_to_ninty_days = true;
     }
     if (available_date >= ninty_days && available_date <= one_twenty_days){
       units_available_in_ninty_to_one_twenty_days = true;
     }
     if (available_date > one_twenty_days){
     	 console.log(available_date);
       units_available_in_one_twenty_plus_days = true;
     }
   }
 }
 console.log(units_available_in_thirty_days);
 console.log(units_available_in_thirty_to_ninty_days);
 console.log(units_available_in_ninty_to_one_twenty_days);
 console.log(units_available_in_one_twenty_plus_days);
 //console.log(one_bedroom);
 //console.log(two_bedroom);
 //console.log(three_bedroom);
 //console.log(four_bedroom);

 //var today = new Date();
 //console.log(today);
 //var thirty_days = new Date(today).setDate(today.getDate()+30); 

 //console.log(thirty_days);
 //console.log(today.setHours(0,0,0,0) < thirty_days);
 //var curr = new Date();
 //console.log(today.setHours(0,0,0,0) == curr.setHours(0,0,0,0));

}