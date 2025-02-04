var imageOCRResponse = [];
var ocrImageDimensions;

$(document).ready(function () {
    if ($('.is-floorplate')[0]) {
        imageOCRResponse = $("#ocrData").data("ocrData");
        ocrImageDimensions = $("#ocrData").data("imageDimensions");

      console.log("imageOCRResponse:", imageOCRResponse );
      console.log("ocrImageDimensions:", ocrImageDimensions );

        selected = [];
        var temp = [];
        dx = 0;
        dy = 0;
        $("#map").css('cursor', 'default');

        doDraggable();

        // $('.amenities-list').on('change', function(e) {
        //   e.preventDefault();
        //   $('.amenities-list :selected').each(function(){
        //     console.log('selecting dropdown values from floorplate');
        //     if ($(this).val() !== ""){
        //       //console.log($.inArray($(this).val(), $.map(selected, function(v) { return v[0]; })) == -1);
        //       if (selected.length == 0){
        //         selected.push([ $(this).val(), $.trim($(this).text()) ]);
        //       }
        //       else if ($.inArray($(this).val(), $.map(selected, function(v) { return v[0]; })) == -1){
        //         selected.push([ $(this).val(), $.trim($(this).text()) ]);
        //       }
        //     }
        //     // add to selected list
        //     $("#selected-units").empty();
        //     for (i=0; i<selected.length; i++) {
        //       $("#selected-units").append('<li class="s-unit" data-id='+i+' data-provider-unit-id='+selected[i][0]+'>' + selected[i][1] + '</li>');
        //     }
        //     $('#newmsg').hide();

        //     // hide from unused list
        //     $(this).css({"display": "none"});
        //     plotMode();
        //   });
        // });

        $('.amenities-list').multiSelect();
        $('.amenities-list-on-popup').multiSelect();
        $('.doors-list-on-popup').multiSelect();

        $('.select-units-on-page .ms-elem-selectable').click(function () {
            console.log($(this).children('span').text());
            selected.push([$(this).attr('id').replace("-selectable", ""), $(this).children('span').text()]);
            // $("#selected-units").empty();
            // for (i=0; i<selected.length; i++) {
            //   $("#selected-units").append('<li class="s-unit" data-id='+i+' data-provider-unit-id='+selected[i][0]+'>' + selected[i][1] + '</li>');
            // }

            if(imageOCRResponse.length > 0)
                displayHints();
            
            plotMode();
        });

        $('.unit-selects-in-popup .ms-elem-selectable').click(function () {
            console.log('selecting in popup');
            var unit_provider_id = $(this).attr('id');
            unit_provider_id = unit_provider_id.replace("-selectable", "")
            var unit_providers_array = JSON.parse($('#unit_provider_ids').val());
            unit_providers_array.push(unit_provider_id);
            $('#unit_provider_ids').val(JSON.stringify(unit_providers_array));
            console.log($('#unit_provider_ids').val());
        });

        $('.unit-selects-in-popup .ms-elem-selection').click(function () {
            console.log('De selecting in popup');
            var unit_providers_array = JSON.parse($('#unit_provider_ids').val());
            unit_providers_array.splice($.inArray($(this).attr('id').split('-')[0], unit_providers_array), 1);
            $('#unit_provider_ids').val(JSON.stringify(unit_providers_array));
            console.log(unit_providers_array);
        });

        $('.select-units-on-page .ms-elem-selection').click(function () {
            console.log($(this).attr('id'));
            s_id  = $(this).attr('id').replace("-selection","");
            // s_id = s_id[0] + "-" + s_id[1];

            removeUnitFromSelectedArray(s_id);
        });

        // $(document).on("click", ".marker" , function() {
        //   console.log($(this).attr("title"));
        //   $(this).attr('data-name' , 'plot');
        //   $(this).attr('data-target' , '#confirm-delete');
        //   $(this).attr('data-toggle' , 'modal');
        //   $(this).attr('data-href' , '/communities/'+community_id+'/units/'+$(this).attr("title")+'/remove_plot_from_floorplate?floorplate_id='+floorplate_id);
        // });

        // $("#viewArea").on("hover", function (event) {
        //     var x = event.pageX - this.offsetLeft;
        //     var y = event.pageY - this.offsetTop;
        //     console.log("X Coordinate: " + x + " Y Coordinate: " + y);
        //     var img = document.getElementById('viewArea');
        //     current_width = img.clientWidth;
        //     current_height = img.clientHeight;
        //     orignal_x = 1412;
        //     orignal_y = 932;
        //     new_scale_x = current_width / orignal_x;
        //     new_scale_y = current_height / orignal_y;
        //     dx = x*0.1
        //     dy = y*0.1
        //     console.log("dx:" + dx + ", dy:" + dy)
        //     fontSize = $('#font_size').html();
        //     marker_color = $('#marker_color').html();
        //
        //     if (addmode) {
        //         // save plotting for each selected unit
        //         for (i = 0; i < selected.length; i++) {
        //             savePlot(selected[i][0], dx, dy);
        //         }
        //         var url = '/communities/' + community_id + '/units/' + selected[0][0] + '/remove_plot_from_floorplate?floorplate_id=' + floorplate_id;
        //         // add new marker to display
        //         //tag = "<a class='marker' data-toggle='tooltip' title='" + selected[0][1] + "' style='left:" + dx + "px; top:" + dy +"px; position:absolute;'>";
        //         tag = "<a class='marker ui-draggable ui-draggable-handle' data-toggle='modal' title='" + selected[0][1] + "' style='left:" + (dx - left_margin) + "px; top:" + (dy - right_margin) + "px; position:absolute; font-size: " + fontSize + "px;' data-name='plot' data-target='#confirm-delete' data-href='" + url + "'>"
        //         tag += "<i class='fas fa-map-marker-alt' style='color: " + marker_color + ";'></i>";
        //         tag += "</a>"
        //         $('#map').append(tag);
        //         // TODO Fix below line, if you remove it you will have to click 2 times on marker for deletion
        //         //$(".marker:last").trigger("click")
        //         reset();
        //         doDraggable();
        //     }
        // });
        // $("#map").mouseup(function (e) {
        //     // first check if user is clicking on scrollbar
        //     if (e.target != $('#map').get(0)) {
        //         e.preventDefault();
        //         debugger;
        //         left_margin = parseInt($('#left_margin').html());
        //         right_margin = parseInt($('#right_margin').html());
        //
        //         // var img = document.getElementById('viewArea');
        //         // current_width = img.clientWidth;
        //         // current_height = img.clientHeight;
        //         // orignal_x = 1412;
        //         // orignal_y = 932;
        //         // new_scale = orignal_x / current_width;
        //         dx = parseInt($('#active_x_plot').html());
        //         dy = parseInt($('#active_y_plot').html());
        //         // dx = dx * new_scale
        //         // dy = dy * new_scale
        //         // console.log("dx:" + dx + ", dy:" + dy)
        //         // dx = dx - left_margin
        //         // dy = dy - right_margin
        //         fontSize = $('#font_size').html();
        //         marker_color = $('#marker_color').html();
        //         if (addmode)
        //         {
        //             // save plotting for each selected unit
        //             for (i = 0; i < selected.length; i++) {
        //                 savePlot(selected[i][0], dx, dy);
        //             }
        //             var url = '/communities/' + community_id + '/units/' + selected[0][0] + '/remove_plot_from_floorplate?floorplate_id=' + floorplate_id;
        //             // add new marker to display
        //             //tag = "<a class='marker' data-toggle='tooltip' title='" + selected[0][1] + "' style='left:" + dx + "px; top:" + dy +"px; position:absolute;'>";
        //             tag = "<a class='marker ui-draggable ui-draggable-handle' data-toggle='modal' title='" + selected[0][1] + "' style='left:" + (dx - left_margin) + "px; top:" + (dy - right_margin) + "px; position:absolute; font-size: " + fontSize + "px;' data-name='plot' data-target='#confirm-delete' data-href='" + url + "'>"
        //             tag += "<i class='fas fa-map-marker-alt' style='color: " + marker_color + ";'></i>";
        //             tag += "</a>"
        //             $('#map').append(tag);
        //             // TODO Fix below line, if you remove it you will have to click 2 times on marker for deletion
        //             //$(".marker:last").trigger("click")
        //             reset();
        //             doDraggable();
        //         }
        //     }
        // });
    }
});



function addMarkerOnFloorplate() {
$('#add-marker-heading').html('Add marker at x:' + $('#horizontal_position').val() + ' y:' + $('#vertical_position').val());
$('#add_horizontal_position').val($('#horizontal_position').val());
$('#add_vertical_position').val($('#vertical_position').val());
$('#add-marker-modal').modal('show');
}


function addDoorsMarkerOnFloorplate(){
$('#ajax-remaining-doors-modal').modal('show');
}

function plot_entry_point(event){
  debugger
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

if (arr != null) {
  for(var unit of arr){
    if (unit[1] == xpos && unit[2] == ypos) {
      temp.push(unit[0])                // all units provider_ids plotted on the same location
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