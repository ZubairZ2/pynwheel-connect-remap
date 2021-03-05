$(document).ready(function () {

  var visible_stops_list = [];
  var hidden_stops_list = [];

  doDraggable();

  $('.plot_starting_point').click(function () {
    console.log("We are extracting -selectable from unit_provider_id");
    var unit_provider_id = $(this).attr('id');
    console.log(unit_provider_id);
    selected.push([unit_provider_id, $(this).children('span').text()]);
    plotMode();
  });

});

function handleTourStopsVisibility(tour_id, community_id, tour_user_id, stop_id, tour_stop_id) {
  if (stop_id) {
    let selector = $(`.stop_eye_slash${stop_id}`);

    if(selector && selector[0] && selector[0].classList.contains("fa-eye")) {
      selector.removeClass("fa-eye");
      selector.addClass("fa-eye-slash");
      $(`#customizeStopsModal${tour_id} #customize-stop-success-text-${stop_id}`).html(`stop removed from tour stops`);
      CustomizeUserTour(tour_id, community_id, tour_user_id, stop_id, tour_stop_id, false);
    } else if(selector && selector[0] && selector[0].classList.contains("fa-eye-slash")) {
      selector.removeClass("fa-eye-slash");
      selector.addClass("fa-eye");
      $(`#customizeStopsModal${tour_id} #customize-stop-success-text-${stop_id}`).html(`stop added in tour stop`);
      CustomizeUserTour(tour_id, community_id, tour_user_id, stop_id, tour_stop_id, true);
    }
  }
}

function CustomizeUserTour(tour_id, community_id, tour_user_id, stop_id, tour_stop_id, visibility) {
  let url = "/tours/customize_tour";
  $.ajax({
    type: "POST",
    url: url,
    data: {
      community_id: community_id,
      tour_user_id: tour_user_id,
      visibility: visibility,
      tour_stop_id: tour_stop_id
    }, 
    success: function() {
     $(`#customizeStopsModal${tour_id} #customize-stop-success-${stop_id}`).css("display", "inline");
      setTimeout(() => {
       $(`#customizeStopsModal${tour_id} #customize-stop-success-${stop_id}`).css("display", "none");
      }, 1000);
    }
  });
}


function resetToStandardTour(community_id, tour_user_id) {
  let url = "/tours/reset_to_standard_tour";
  $.ajax({
    type: "DELETE",
    url: url,
    data: {
      community_id: community_id,
      tour_user_id: tour_user_id
    },
    success: function() {
      $(".customTourModal .set-standard-tour").css("display", "block");
      setTimeout(() => {
        $(".customTourModal .set-standard-tour").css("display", "none");

        window.location.reload();
      }, 2000)
    }
  });
}