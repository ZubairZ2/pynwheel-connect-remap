$(document).ready(function(){
    selected=[];
    var temp=[];
    dx = 0;
    dy = 0;
    $("#map").css('cursor','default');

    doDraggable();

    $("#imageselect1 li").click(function(e){
        if ($(this).data("id")!=""){
            // alert($(this).data("id")+" ===> "+ $(this).data("name"))
            console.log($.inArray($(this).data("id"), $.map(selected, function(v) { return v[0]; })) == -1);
            if (selected.length == 0){
                saveTourStopPoint($(this).data("id"));
                // selected.push([ $(this).data("id"), $(this).data("name") ]);
            }
            else if ($.inArray($(this).data("id"), $.map(selected, function(v) { return v[0]; })) == -1){
                saveTourStopPoint($(this).data("id"));
                // selected.push([ $(this).data("id"), $(this).data("name") ]);
            }
        }
        // add to selected list
        $("#selected-units").empty();
        for (i=0; i<selected.length; i++) {
            $("#selected-units").append('<li class="s-unit" data-id='+i+'>' + selected[i][1] + '</li>');
        }
        $('#newmsg').hide();

        // hide from unused list
        $(this).css({"display": "none"});
        // plotMode();
        $("#imageselect1").toggle();
        e.stopPropagation()
    });
    $("#imageselect2 li").click(function(e){
        if ($(this).data("id")!=""){
            console.log($.inArray($(this).data("id"), $.map(selected, function(v) { return v[0]; })) == -1);
            if (selected.length == 0){
                saveTourStopPoint($(this).data("id"));
                // selected.push([ $(this).data("id"), $(this).data("name") ]);
            }
            else if ($.inArray($(this).data("id"), $.map(selected, function(v) { return v[0]; })) == -1){
                saveTourStopPoint($(this).data("id"));
                // selected.push([ $(this).data("id"), $(this).data("name") ]);
            }
        }
        // add to selected list
        $("#selected-units").empty();
        for (i=0; i<selected.length; i++) {
            $("#selected-units").append('<li class="s-unit" data-id='+i+'>' + selected[i][1] + '</li>');
        }
        $('#newmsg').hide();

        // hide from unused list
        $(this).css({"display": "none"});
        plotMode();
        $("#imageselect2").toggle();
        e.stopPropagation()
    })

    // This is for plotting elevator when clicked on ul dropdown
    $("#imageselect3 li").click(function(e){

      if ($(this).data("id")!=""){
          console.log($.inArray($(this).data("id"), $.map(selected, function(v) { return v[0]; })) == -1);
          if (selected.length == 0){
              saveTourStopPoint($(this).data("id"));
              // selected.push([ $(this).data("id"), $(this).data("name") ]);
          }
          else if ($.inArray($(this).data("id"), $.map(selected, function(v) { return v[0]; })) == -1){
              saveTourStopPoint($(this).data("id"));
              // selected.push([ $(this).data("id"), $(this).data("name") ]);
          }
      }
      // add to selected list
      $("#selected-units").empty();
      for (i=0; i<selected.length; i++) {
          $("#selected-units").append('<li class="s-unit" data-id='+i+'>' + selected[i][1] + '</li>');
      }
      $('#newmsg').hide();

      // hide from unused list
      $(this).css({"display": "none"});
      plotMode();
      $("#imageselect3").toggle();
      // e.stopPropagation()
      // window.location.reload()
    });

    $("#map").mouseup(function(e) {
        debugger
        // first check if user is clicking on scrollbar
        if (e.target != $('#map').get(0)){
            e.preventDefault();
            dx = parseInt($('#active_x_plot').html())-8;
            dy = parseInt($('#active_y_plot').html()-10);

            marker_color = $('#marker_color').html();
            marker_font_size = ($('#font_size').html());
            left_margin = parseInt($('#left_margin').html());
            right_margin = parseInt($('#right_margin').html());
            camera_margin = $('#camera-margin').html();
            
            door_marker_color = $('#door_marker_color').html();
            door_fontsize = ($('#door_fontsize').html());
            door_left_margin = parseInt($('#door_left_margin').html());
            door_right_margin = parseInt($('#door_right_margin').html());


            if (addmode) {
                // save plotting for each selected unit
                try {
                    for (i=0; i<selected.length; i++) {
                        savePlot(selected[i][0], dx, dy);
                    }
                }
                catch(err) {
                    location.reload()
                }
                
                if(adddoorsmode){
                    tag = getDoorTag(selected[0][0])
                }
                else{
                    var url = getDeleteUnitUrl();
                    tag = getUnitTag(url)
                }

                $('#map').append(tag);
                // if autowayfinding toggle in On and Unit is just plotted
                // if (){

                // }
                // else
                doDraggable();
                reset();
            }
        }
    });

});

function getDeleteUnitUrl(){
    if (typeof floorplan_id !== 'undefined'){
        return '/communities/'+community_id+'/floorplans/'+floorplan_id+'/amenities/'+selected[0][0]+'/remove_amenity';
    }
    else if (typeof sitemap_id !== 'undefined'){
        return '/communities/'+community_id+'/units/'+selected[0][0]+'/remove_plot'
    }
    else if (typeof floorplate_id_for_amenity !== 'undefined'){
        return '/communities/'+community_id+'/floorplates/'+floorplate_id_for_amenity+'/amenities/'+selected[0][0]+'/remove_amenity?floor=' + floor
    }
    else if (typeof tour_id !== 'undefined'){
        return '/communities/'+community_id+'/tours/'+tour_id+'/resetStartingPoint'
    }
    else if (typeof tour_id_for_stop !== 'undefined'){
        return '/communities/'+community_id+'/tours/'+community_tour_id+'/tour_stops/'+selected[0][0]+'/resetTourStopPoint'
    }
    else if (typeof floorplate_id !== 'undefined'){
        return '/communities/'+community_id+'/units/'+selected[0][0]+'/remove_plot_from_floorplate?floorplate_id='+floorplate_id
    }
    else{
        return '/communities/'+community_id+'/units/'+$(this).attr("title")+'/remove_plot'
    }
}

function getUnitTag(url){
    if (typeof tour_id_for_stop !== 'undefined'){
        tag = "<a class='marker ui-draggable ui-draggable-handle' data-toggle='modal' title='" + selected[0][1] + "' style='left:" + dx + "px; top:" + dy +"px; position:absolute;' data-name='plot' data-target='#confirm-delete' data-href='" + url + "'>"
        tag += "<i class='custom-icon' style='width: "+ marker_font_size +"px; height: "+ marker_font_size +"px; border: 2px solid "+ marker_color+"; '><i class='fa fa-star' style='color: "+marker_color+"; font-size: "+(parseInt(marker_font_size) /2)+"px; margin-top:"+ camera_margin +"px;'></i></i>";
        tag += "</a>"
    }
    else if (typeof tour_id !== 'undefined'){
        tag = "<a class='marker ui-draggable ui-draggable-handle' data-toggle='modal' title='" + selected[0][1] + "' style='left:" + dx + "px; top:" + dy +"px; position:absolute;' data-name='plot' data-target='#confirm-delete' data-href='" + url + "'>"
        tag += "<img src='/assets/star.png'>";
        tag += "</a>"
    }
    else if (typeof floorplate_id !== 'undefined' || typeof sitemap_id !== 'undefined'){   
        if(automate_wayfinding == true) 
            plus_icon = returnPlusIconTag(selected[0][0], "unit", -6)
        else
            plus_icon = ''

        tag =   `<p class="marker ui-draggable ui-draggable-handle" style="left:${dx}px; top:${dy}px; position:absolute">
                    <a id="m_${selected[0][0]}" style="font-size: ${marker_font_size}px" title="${selected[0][1]}" data-toggle="modal" data-name="plot" data-target="#confirm-delete" data-href="${url}" data-plotted-category="unit" href="#">
                        <i class="fas fa-map-marker-alt" style="color: ${marker_color};"></i> </a>
                    ${plus_icon}
                </p>`
    }
    else if(typeof floorplate_id_for_amenity !== 'undefined'){
        if(automate_wayfinding == true) 
            plus_icon = returnPlusIconTag(selected[0][0], "amenity", 0)
        else
            plus_icon = ''

        tag =   `<p class="marker ui-draggable ui-draggable-handle" style="left:${dx}px; top:${dy}px; position:absolute">
                    <a id="m_${selected[0][0]}" data-toggle="modal" title="${selected[0][1]}" data-name="plot" data-target="#confirm-delete" data-href="${url}" data-plotted-category="amenity">
                        <i class="custom-icon" style="width: ${marker_font_size}px; height: ${marker_font_size}px; border: 2px solid; color: ${marker_color}" >
                            <i class="fas fa-camera-retro" style="color: ${marker_color}; font-size: ${parseInt(marker_font_size) /2}px; margin-top:${camera_margin}px;"></i>
                        </i>
                    </a>
                    ${plus_icon}
                </p>`
    }
    else{
        tag = "<a class='marker ui-draggable ui-draggable-handle' data-toggle='modal' title='" + selected[0][1] + "' style='left:" + dx + "px; top:" + dy +"px; position:absolute;' data-name='plot' data-target='#confirm-delete' data-href='" + url + "'>"
        tag += "<i class='custom-icon' style='width: "+ marker_font_size +"px; height: "+ marker_font_size +"px; border: 2px solid "+ marker_color+"; '><i class='fas fa-camera-retro' style='color: "+marker_color+"; font-size: "+(parseInt(marker_font_size) /2)+"px; margin-top:"+ camera_margin +"px;'></i></i>";
        tag += "</a>"
    }
    return tag
}

function getDeleteDoorUrl(provider_id){
    if (typeof floorplate_id !== 'undefined'){
        return '/communities/'+community_id+'/units/'+provider_id+'/remove_unitdoor_plot_from_floorplate?floorplate_id='+floorplate_id
    }
}

function getDoorTag(provider_id){
    if (typeof floorplate_id !== 'undefined')
    {   
        tag =   `<a id="door_${provider_id}" class="marker ui-draggable ui-draggable-handle" style="left:${dx}px; top:${dy}px; position:absolute; font-size: ${door_fontsize}px;" title="${provider_id} (door)" data-toggle="modal" data-target="#ajax-doors-detail-modal" data-plotted-category="unit_door" href="#">
                    <i class="fa fa-sign-in fa-xs" style="color: ${door_marker_color};"></i>
                </a>`
    }
    else if(typeof floorplate_id_for_amenity !== 'undefined'){
        amenity_id = provider_id
        tag =   `<a id="door_${amenity_id}" class="marker ui-draggable ui-draggable-handle" style="left:${dx}px; top:${dy}px; position:absolute; font-size: ${door_fontsize}px;" title="${amenity_id} (door)" data-toggle="modal" data-target="#ajax-doors-detail-modal" data-plotted-category="amenity_door" href="#">
                    <i class="fa fa-sign-in fa-xs" style="color: ${door_marker_color};"></i>
                </a>`
    }
    return tag
}

function attachPlusIconWithUnit(unit){
    plus_icon = returnPlusIconTag(unit.provider_unit_id, "unit", -6)
    $(("#m_"+unit.provider_unit_id)).after(plus_icon)
}

function returnPlusIconTag(id, for_, margin){
    return `<a id="plus_${id}" style="margin-left: ${margin}px;" title="Click to plot this ${for_}(s) door" data-toggle="tooltip" data-plotted-category="create_${for_}_door" onclick="plot_entry_point(event)" href="#">
                <i class="fa fa-plus-circle fa-xs" style="color: #59de83; font-size: ${marker_font_size/2}px;"></i>
            </a>`
}
