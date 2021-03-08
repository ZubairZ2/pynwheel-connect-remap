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

    // $('.amenities-list').on('change', function(e) {
    //   e.preventDefault();
    //   $('.amenities-list :selected').each(function(){
    //     if ($(this).val()!=""){
    //       console.log($.inArray($(this).val(), $.map(selected, function(v) { return v[0]; })) == -1);
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
    //       $("#selected-units").append('<li class="s-unit" data-id='+i+'>' + selected[i][1] + '</li>');
    //     }
    //     $('#newmsg').hide();

    //     // hide from unused list
    //     $(this).css({"display": "none"});
    //     plotMode();
    //   });
    // });


    // $(document).on("click", ".marker" , function() {
    //   console.log($(this).attr("title"));
    //   $(this).attr('data-name' , 'plot');
    //   $(this).attr('data-target' , '#confirm-delete');
    //   $(this).attr('data-toggle' , 'modal');
    //   if (typeof floorplan_id !== 'undefined'){
    //     $(this).attr('data-href' , '/communities/'+community_id+'/floorplans/'+floorplan_id+'/amenities/'+$(this).attr("title")+'/remove_amenity');
    //   }
    //   else if (typeof sitemap_id !== 'undefined'){
    //     $(this).attr('data-href' , '/communities/'+community_id+'/sitemaps/'+sitemap_id+'/amenities/'+$(this).attr("title")+'/remove_amenity');
    //   }
    //   else if (typeof floorplate_id_for_amenity !== 'undefined'){
    //     $(this).attr('data-href' , '/communities/'+community_id+'/floorplates/'+floorplate_id_for_amenity+'/amenities/'+$(this).attr("title")+'/remove_amenity');
    //   }
    //   else{
    //     $(this).attr('data-href' , '/communities/'+community_id+'/units/'+$(this).attr("title")+'/remove_plot');
    //   }

    // });

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
                for (i=0; i<selected.length; i++) {
                    savePlot(selected[i][0], dx, dy);
                }

                if(adddoorsmode){
                    var url = getDeleteDoorUrl();
                    tag = getDoorTag(url)
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
                    reset();
                doDraggable();
            }
        }
    });

    function getDeleteUnitUrl(){
        if (typeof floorplan_id !== 'undefined'){
            return '/communities/'+community_id+'/floorplans/'+floorplan_id+'/amenities/'+selected[0][0]+'/remove_amenity';
        }
        else if (typeof sitemap_id !== 'undefined'){
            return '/communities/'+community_id+'/units/'+selected[0][0]+'/remove_plot'
        }
        else if (typeof floorplate_id_for_amenity !== 'undefined'){
            return '/communities/'+community_id+'/floorplates/'+floorplate_id_for_amenity+'/amenities/'+selected[0][0]+'/remove_amenity'
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

    function getDeleteDoorUrl(){
        if (typeof floorplate_id !== 'undefined'){
            return '/communities/'+community_id+'/units/'+selected[0][0]+'/remove_unitdoor_plot_from_floorplate?floorplate_id='+floorplate_id
        }
    }

    function getUnitTag(url){
        if (typeof tour_id_for_stop !== 'undefined')
        {
            tag = "<a class='marker ui-draggable ui-draggable-handle' data-toggle='modal' title='" + selected[0][1] + "' style='left:" + dx + "px; top:" + dy +"px; position:absolute;' data-name='plot' data-target='#confirm-delete' data-href='" + url + "'>"
            tag += "<i class='custom-icon' style='width: "+ marker_font_size +"px; height: "+ marker_font_size +"px; border: 2px solid "+ marker_color+"; '><i class='fa fa-star' style='color: "+marker_color+"; font-size: "+(parseInt(marker_font_size) /2)+"px; margin-top:"+ camera_margin +"px;'></i></i>";
            tag += "</a>"
        }
        else if (typeof tour_id !== 'undefined')
        {
            tag = "<a class='marker ui-draggable ui-draggable-handle' data-toggle='modal' title='" + selected[0][1] + "' style='left:" + dx + "px; top:" + dy +"px; position:absolute;' data-name='plot' data-target='#confirm-delete' data-href='" + url + "'>"
            tag += "<img src='/assets/star.png'>";
            tag += "</a>"
        }
        else if (typeof floorplate_id !== 'undefined' || sitemap_id !== 'undefined')
        {   
            tag =   `<p class="marker ui-draggable ui-draggable-handle" style="left:${dx}px; top:${dy}px; position:absolute">
                        <a id="m_${selected[0][0]}" style="font-size: ${marker_font_size}px" title="${selected[0][1]}" data-toggle="modal" data-name="plot" data-target="#confirm-delete" data-href="${url}" data-plotted-category="unit" href="#">
                            <i class="fas fa-map-marker-alt" style="color: ${marker_color};"></i>
                        </a>
                        <a id="plus_${selected[0][0]}" style="margin-left: -6px;" title="Click to plot this unit(s) door" data-toggle="tooltip" data-plotted-category="create_unit_door" onclick="plot_entry_point(event)" href="#">
                            <i class="fa fa-plus-circle fa-xs" style="color: #59de83; font-size: ${marker_font_size/2}px;"></i>
                        </a>
                    </p>`
        }
        else
        {
            tag = "<a class='marker ui-draggable ui-draggable-handle' data-toggle='modal' title='" + selected[0][1] + "' style='left:" + dx + "px; top:" + dy +"px; position:absolute;' data-name='plot' data-target='#confirm-delete' data-href='" + url + "'>"
            tag += "<i class='custom-icon' style='width: "+ marker_font_size +"px; height: "+ marker_font_size +"px; border: 2px solid "+ marker_color+"; '><i class='fas fa-camera-retro' style='color: "+marker_color+"; font-size: "+(parseInt(marker_font_size) /2)+"px; margin-top:"+ camera_margin +"px;'></i></i>";
            tag += "</a>"
        }
        return tag
    }

    function getDoorTag(url){
        if (typeof floorplate_id !== 'undefined')
        {   
            tag =   `<a id="door_${selected[0][0]}" class="marker ui-draggable ui-draggable-handle" style="left:${dx}px; top:${dy}px; position:absolute; font-size: ${door_fontsize}px;" title="${selected[0][1]} (door)" data-toggle="modal" data-name="door" data-target="#ajax-confirm-delete" data-href="${url}" data-plotted-category="unit_door" href="#">
                        <i class="fa fa-sign-in fa-xs" style="color: ${door_marker_color};"></i>
                    </a>`
        }
        return tag
    }
});