var access_point_id;
var access_point_type;
var pynwheel_access_user;
var curr_community;

$(document).ready(function() {
  curr_community = $("#userAccessesData").data("community");
  pynwheel_access_user = $("#userAccessesData").data("pynwheelAccessUser");

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
    access_points = $('select[name="unit_data_selected"]').val();
    add_stop(access_points);
  });

  $("#add_amenities_access").click(function(){
    access_points = $('select[name="amenity_data_selected"]').val();
    add_stop(access_points);
  });
  
});

function add_stop(access_points) {
  $.ajax({
    url: `/communities/${curr_community.id}/pynwheel_access_users/${pynwheel_access_user.id}/grant_pynwheel_user_access`,
    type: "POST",
    dataType: "script",
    data: {
      access_points: access_points
    }
  }).done(function (data) {
    window.location.reload();
  });
}

function displayAccessWarningModal(stop_id, stop_type) {
  access_point_id = stop_id;
  access_point_type = stop_type;
}

function removePynwheelUserAccess() {
  $.ajax({
    url: `/communities/${curr_community.id}/pynwheel_access_users/${pynwheel_access_user.id}/remove_pynwheel_user_access`,
    type: "Delete",
    data: {access_point_id: access_point_id, access_point_type: access_point_type}
  }).done(function() { window.location.reload(); });
}