var community_id;
var pynwheel_access_user_id;
var access_point_id;
var access_point_type;

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

function displayAccessWarningModal(c_id, user_id, stop_id, stop_type) {
  debugger
  community_id = c_id;
  pynwheel_access_user_id = user_id;
  access_point_id = stop_id;
  access_point_type = stop_type;
}

function removePynwheelUserAccess() {
  debugger;
  $.ajax({
    url: `/communities/${community_id}/pynwheel_access_users/${pynwheel_access_user_id}/remove_pynwheel_user_access`,
    type: "Delete",
    data: {access_point_id: access_point_id, access_point_type: access_point_type}
  }).done(function() { window.location.reload(); });
}