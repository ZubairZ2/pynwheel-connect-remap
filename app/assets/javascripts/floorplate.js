var imageOCRResponse = [];
var ocrImageDimensions;

$(document).ready(function () {
  if ($('.is-floorplate')[0]) {
    imageOCRResponse = $("#ocrData").data("ocrData");
    ocrImageDimensions = $("#ocrData").data("imageDimensions");

    selected = [];
    $("#map, #svg_map").css('cursor', 'default');

    doDraggable();

    $('.amenities-list').multiSelect();
    $('.amenities-list-on-popup').multiSelect();
    $('.doors-list-on-popup').multiSelect();
  }
});

function addMarkerOnFloorplate(e) {
  const x_plot = $('#horizontal_position').val();
  const y_plot = $('#vertical_position').val();
  $('#add-marker-heading').html('Add marker at x:' + x_plot + ' y:' + y_plot);
  $('#add_horizontal_position').val(x_plot);
  $('#add_vertical_position').val(y_plot);


  $('#add-marker-modal').modal('show');
}


function addDoorsMarkerOnFloorplate(){
  $('#ajax-remaining-doors-modal').modal('show');
}

function plot_entry_point(event){
  if ($(event.currentTarget).hasClass('disabled')) return;
  $(event.currentTarget).addClass('disabled');
  $(event.target).css({"color": "#c9ffdd", "cursor": "crosshair"})

  parent_unit = event.currentTarget.previousElementSibling  
  currently_selected_id = parent_unit.id.split("_")[1]
 
  title = parent_unit.title + " (door)"
  xpos = parseInt(parent_unit.parentElement.style.left)     // parent_unit.offsetLeft is sometime incrementing value by 1
  ypos = parseInt(parent_unit.parentElement.style.top)

  try {
    getUnitsAtSameLocation(xpos, ypos)
    addSameLocationUnitsToSelected()
    sortSelected(currently_selected_id)
    adddoorsmode = true
    plotMode();  
  } catch (error) {
    $(event.currentTarget).removeClass('disabled')
    $(event.target).css({"color": "#59de83", "cursor": "default"})
    console.log(error, " ------------ error occured in selected plots")
  }
  
  
}

function getUnitsAtSameLocation(xpos, ypos){
  temp=[];

  if (unitsArr != null) {
    for(const unit of unitsArr){
      if (unit.xPlot == xpos && unit.yPlot == ypos) {
        temp.push(unit.providerId)                // all units provider_ids plotted on the same location
      }
    }
  }
}

function addSameLocationUnitsToSelected(){
selected = []
for(var provider_unit_id of temp){
  selected.push([provider_unit_id, provider_unit_id]);
}
}

function sortSelected(currently_selected_provider_id){
// sort if required, first in selected should be according to the current name of plotted unit
if(selected[0][0] != currently_selected_provider_id){
  
  var index;    
  for(index=0; index < selected.length; index++ ){
    if(selected[index][0] == currently_selected_provider_id)
      break;
  }

  selected[index] = selected[0]
  selected[0] = [currently_selected_provider_id, currently_selected_provider_id]
}
}


function select_multiple_floors(event){
  if($(event.currentTarget).hasClass("disabled")) return
  selected = multi_floors.selected()
  if(selected.length > 0){
    $(event.currentTarget).addClass("disabled")
    $("#select_multiple_floors_modal").modal('hide')
    accesspointplot = true
    plotMode()

    $(".multi-select-units").css({"pointer-events": "none"})
    $("#map").css('cursor', 'crosshair')
    $("<div id='overlay'></div>").css({
      position: "absolute",
      width: "100%",
      height: "100%",
      top: 0,
      left: 0,
      background: "#000000",
      opacity: 0.5
    }).appendTo($(".multi-select-units").css("position", "relative"));
  }
}

function select_remaining_floors(event){
  if($(event.currentTarget).hasClass("disabled")) return
  selected = remaining_floors.selected()
  id =  $("#active_access_point").val()

  if(selected.length > 0){
    $(event.currentTarget).addClass("disabled")
    jQuery.ajax({
      url:  "/communities/" + community_id + "/floorplates/" + floorplate_id + "/access_points/" + id + "/add_new_access_points",
      type: "post",
      data: {floors: selected},
      cache: false,
      async: false,
    })

    $("#select_remaining_floors_modal").modal('hide')
  }

}

function floorplan_names_order() {
  $.ajax({
    type: "POST",
    url:
      "/communities/" + community_id + "/floorplans/save_floorplan_name_order",
    data: { desc: $(".floorplan_name_col")[0].classList[1] },
    success: function (response) {},
  });
}

function saveFloorPlanImage(src, floorplan_id, position) {
  //var community_id = $('#communities_at_floorplans').val();
  $.ajax({
    url: "/communities/" + community_id + "/floorplans/" + floorplan_id,
    type: "PUT",
    dataType: "script",
    data: {
      floorplan: {
        image: src,
      },
    },
  }).done(function () {
    console.log(
      "floorplan image is saved and now going to delete temporary image"
    );
    deleteTemporaryImage(position);
  });
}
