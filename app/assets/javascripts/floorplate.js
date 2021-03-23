$(document).ready(function () {
  if ($('.is-floorplate')[0]) {
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
      debugger
      console.log($(this).children('span').text());
      selected.push([$(this).attr('id').replace("-selectable", ""), $(this).children('span').text()]);
      // $("#selected-units").empty();
      // for (i=0; i<selected.length; i++) {
      //   $("#selected-units").append('<li class="s-unit" data-id='+i+' data-provider-unit-id='+selected[i][0]+'>' + selected[i][1] + '</li>');
      // }
      plotMode();
    });

    $('.unit-selects-in-popup .ms-elem-selectable').click(function () {
      debugger
      console.log('selecting in popup');
      var unit_provider_id = $(this).attr('id');
      unit_provider_id = unit_provider_id.replace("-selectable", "")
      var unit_providers_array = JSON.parse($('#unit_provider_ids').val());
      unit_providers_array.push(unit_provider_id);
      $('#unit_provider_ids').val(JSON.stringify(unit_providers_array));
      console.log($('#unit_provider_ids').val());
    });

    $('.unit-selects-in-popup .ms-elem-selection').click(function () {
      debugger
      console.log('De selecting in popup');
      var unit_providers_array = JSON.parse($('#unit_provider_ids').val());
      unit_providers_array.splice($.inArray($(this).attr('id').split('-')[0], unit_providers_array), 1);
      $('#unit_provider_ids').val(JSON.stringify(unit_providers_array));
      console.log(unit_providers_array);
    });

    $('.select-units-on-page .ms-elem-selection').click(function () {
      debugger
      console.log($(this).attr('id'));
      removeUnitFromSelectedArray($(this).attr('id').split('-')[0]);
    });

    // $(document).on("click", ".marker" , function() {
    //   console.log($(this).attr("title"));
    //   $(this).attr('data-name' , 'plot');
    //   $(this).attr('data-target' , '#confirm-delete');
    //   $(this).attr('data-toggle' , 'modal');
    //   $(this).attr('data-href' , '/communities/'+community_id+'/units/'+$(this).attr("title")+'/remove_plot_from_floorplate?floorplate_id='+floorplate_id);
    // });

    $("#map").mouseup(function (e) {
      // first check if user is clicking on scrollbar
      debugger
      if (e.target != $('#map').get(0)) {
        e.preventDefault();
        left_margin = parseInt($('#left_margin').html());
        right_margin = parseInt($('#right_margin').html());

        dx = parseInt($('#active_x_plot').html()) - 8;
        dy = parseInt($('#active_y_plot').html() - 10);

        // dx = dx - left_margin
        // dy = dy - right_margin
        fontSize = $('#font_size').html();
        marker_color = $('#marker_color').html();

        if (addmode) {
          // save plotting for each selected unit
          for (i = 0; i < selected.length; i++) {
            savePlot(selected[i][0], dx, dy);
          }
          var url = '/communities/' + community_id + '/units/' + selected[0][0] + '/remove_plot_from_floorplate?floorplate_id=' + floorplate_id;
          // add new marker to display
          //tag = "<a class='marker' data-toggle='tooltip' title='" + selected[0][1] + "' style='left:" + dx + "px; top:" + dy +"px; position:absolute;'>";
          tag = "<a class='marker ui-draggable ui-draggable-handle' data-toggle='modal' title='" + selected[0][1] + "' style='left:" + (dx -left_margin) + "px; top:" + (dy - right_margin) + "px; position:absolute; font-size: "+ fontSize+"px;' data-name='plot' data-target='#confirm-delete' data-href='" + url + "'>"
          tag += "<i class='fas fa-map-marker-alt' style='color: "+marker_color+";'></i>";
          tag += "</a>"
          $('#map').append(tag);
          // TODO Fix below line, if you remove it you will have to click 2 times on marker for deletion
          //$(".marker:last").trigger("click") 
          reset();
          doDraggable();
        }
      }
    });
  }
});

function addMarkerOnFloorplate(){
  $('#add-marker-heading').html('Add marker at x:'+$('#horizontal_position').val()+' y:'+ $('#vertical_position').val());
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

  getUnitsAtSameLocation(xpos, ypos)
  addSameLocationUnitsToSelected()
  sortSelected(currently_selected_id)
  
  adddoorsmode = true
  plotMode();
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
  selected = multi_floors.selected()
  AccessPointPlot = true
  plotMode()
}