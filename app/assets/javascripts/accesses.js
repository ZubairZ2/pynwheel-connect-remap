$(document).ready(function() {
  $('#access-miyazaki').dataTable({
    "searching": true
  });

  $(".chosen-select-unit").chosen({
    no_results_text: "Oops, nothing found!"
  });

  $(".chosen-select-amenity").chosen({
    no_results_text: "Oops, nothing found!"
  });

  $(".chosen-select-unit").change(function(){
    if($('select[name="unit_data_selected"]').val().length > 0) {
      $("#add_units_access").removeClass('hidden')
    }
    else {
      $("#add_units_access").addClass('hidden')
    }
  });

  $(".chosen-select-amenity").change(function(){
    if($('select[name="amenity_data_selected"]').val().length > 0) {
      $("#add_amenities_access").removeClass('hidden')
    }
    else {
      $("#add_amenities_access").addClass('hidden')
    }
  });

  $("#add_units_access").click(function(){
    data_to_add = $('select[name="unit_data_selected"]').val();
    debugger;
    add_stop(data_to_add);
  });
  $("#add_amenities_access").click(function(){
    data_to_add = $('select[name="amenity_data_selected"]').val();
    debugger;
    add_stop(data_to_add);
  });
  
});

function add_stop(data_to_add) {
  debugger;
}