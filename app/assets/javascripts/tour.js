var stops_list =[];

$(document).ready(function () {
  doDraggable();

  $('.plot_starting_point').click(function () {
    console.log("We are extracting -selectable from unit_provider_id");
    var unit_provider_id = $(this).attr('id');
    console.log(unit_provider_id);
    selected.push([unit_provider_id, $(this).children('span').text()]);
    plotMode();
  });

});

function onEditButtonClick(tour_id) {
  stops_list = $(`#customize-tour-stops-${tour_id}`).data("tourStops");
  console.log(stops_list);
}

function handleTourStopsVisibility(stop_id, tour_user_id) {
  let selector = $(`.stop_eye_slash${stop_id}${tour_user_id}`);

  console.log(stops_list.length);
  
    if(selector && selector[0] && selector[0].classList.contains("fa-eye")) {
     
      if(stops_list.length > 1) {
      selector.removeClass("fa-eye");
      selector.addClass("fa-eye-slash");
      $(`#stopName${stop_id}`).addClass("add-line-on-stop");
      index = stops_list.indexOf(stop_id)
      stops_list.splice(index, 1);
      console.log(stops_list);
      } else {
        alert("Atleast one stop should be visible");
      }

    } else if(selector && selector[0] && selector[0].classList.contains("fa-eye-slash")) {
      selector.removeClass("fa-eye-slash");
      selector.addClass("fa-eye");
      $(`#stopName${stop_id}`).removeClass("add-line-on-stop");
      stops_list.push(stop_id);
      console.log(stops_list);
    }
}

function CustomizeUserTour(community_id, tour_user_id) {
  let url = "/tours/customize_tour";
  console.log(stops_list);
  $.ajax({
    type: "POST",
    url: url,
    data: {
      community_id: community_id,
      tour_user_id: tour_user_id,
      stops_list: stops_list
    },
    success: function() {
      $(".customizeStopsModal .save-customized-stops").css("display", "block");
      setTimeout(() => {
        $(".customizeStopsModal .save-customized-stops").css("display", "none");

        window.location.reload();
      }, 3000)
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
      }, 3000)
    }
  });
}