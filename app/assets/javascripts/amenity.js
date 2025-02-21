$(document).ready(function(){
  if ($('.is-amenity')[0]){
      selected=[];
      var temp=[];
      dx = 0;
      dy = 0;
      $("#map").css('cursor','default');

      doDraggable();

      $("#imageselect li").click(function(e){
        if ($(this).data("id")!=""){
          console.log($.inArray($(this).data("id"), $.map(selected, function(v) { return v[0]; })) == -1); 
          if (selected.length == 0){
            selected.push([ $(this).data("id"), $(this).data("name") ]);
          }
          else if ($.inArray($(this).data("id"), $.map(selected, function(v) { return v[0]; })) == -1){
            selected.push([ $(this).data("id"), $(this).data("name") ]);
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
        $("#imageselect").toggle();
        e.stopPropagation()
      })

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

      // $("#map").mouseup(function(e) {
      //   // first check if user is clicking on scrollbar
      //   if (e.target != $('#map').get(0)){
      //     e.preventDefault();
      //     dx = parseInt($('#active_x_plot').html())-8;
      //     dy = parseInt($('#active_y_plot').html()-10);
      //     marker_color = $('#marker-color').html();
      //     camera_margin = $('#camera-margin').html();
      //     marker_font_size = ($('#marker-font-size').html());
      //
      //     if (addmode) {
      //       // save plotting for each selected unit
      //       for (i=0; i<selected.length; i++) {
      //         savePlot(selected[i][0], dx, dy,floor);
      //       }
      //       var url = "";
      //       if (typeof floorplan_id !== 'undefined'){
      //         url = '/communities/'+community_id+'/floorplans/'+floorplan_id+'/amenities/'+selected[0][0]+'/remove_amenity';
      //       }
      //       else if (typeof sitemap_id !== 'undefined'){
      //         url = '/communities/'+community_id+'/sitemaps/'+sitemap_id+'/amenities/'+selected[0][0]+'/remove_amenity';
      //       }
      //       else if (typeof floorplate_id_for_amenity !== 'undefined'){
      //         url = '/communities/'+community_id+'/floorplates/'+floorplate_id_for_amenity+'/amenities/'+selected[0][0]+'/remove_amenity'
      //       }
      //       else if (typeof tour_id !== 'undefined'){
      //           url = '/communities/'+community_id+'/tours/'+tour_id+'/resetStartingPoint'
      //       }
      //       else if (typeof unit_amenity_id !== 'undefined'){
      //           url = '/communities/'+community_id+'/floorplates/'+unit_amenity_id+'/amenities/'+selected[0][0]+'/remove_amenity'
      //       }
      //       else if (typeof unit_id_for_amenity !== 'undefined'){
      //           url = '/communities/'+community_id+'/units/'+unit_id_for_amenity+'/amenities/'+selected[0][0]+'/remove_amenity'
      //       }
      //       else{
      //         url = '/communities/'+community_id+'/units/'+$(this).attr("title")+'/remove_plot'
      //       }
      //       if (typeof tour_id !== 'undefined')
      //       {
      //
      //           dx = dx - 3;
      //           dy = dy - 3;
      //           tag = "<a class='start-point marker ui-draggable ui-draggable-handle' data-toggle='modal' title='" + selected[0][1] + "' style='left:" + dx + "px; top:" + dy +"px; position:absolute;' data-name='plot' data-target='#confirm-delete' data-href='" + url + "'>"
      //           tag += "<img src='/assets/star.png'>";
      //           tag += "</a>"
      //           arr[0][1] = dx;
      //           arr[0][2] = dy;
      //
      //       } else if(typeof floorplate_id_for_elevator !== 'undefined'){
      //
      //         elevator_remove_url = '/communities/'+community_id+'/elevators/'+selected[0][0]+'/remove_elevator_plotting'
      //         marker_color = '#d37474'
      //         tag = "<a class='marker ui-draggable ui-draggable-handle' data-toggle='modal' title='" + selected[0][1] + "' style='left:" + dx + "px; top:" + dy +"px; position:absolute;' data-name='plot' data-target='#confirm-delete' data-href='" + elevator_remove_url + "'>"
      //         tag += "<i class='custom-icon' style='width: "+ marker_font_size +"px; height: "+ marker_font_size +"px; border: 2px solid "+ marker_color+"; '><i class='fa fa-reorder' style='color: "+marker_color+"; font-size: "+(parseInt(marker_font_size) /2)+"px; margin-top:"+ camera_margin +"px;'></i></i>";
      //         tag += "</a>"
      //       } else {
      //           tag = "<a class='marker ui-draggable ui-draggable-handle' data-toggle='modal' title='" + selected[0][1] + "' style='left:" + dx + "px; top:" + dy +"px; position:absolute;' data-name='plot' data-target='#confirm-delete' data-href='" + url + "'>"
      //           tag += "<i class='custom-icon' style='width: "+ marker_font_size +"px; height: "+ marker_font_size +"px; border: 2px solid "+ marker_color+"; '><i class='fas fa-camera-retro' style='color: "+marker_color+"; font-size: "+(parseInt(marker_font_size) /2)+"px; margin-top:"+ camera_margin +"px;'></i></i>";
      //           tag += "</a>"
      //       }
      //       // add new marker to display
      //       //tag = "<a class='marker' data-toggle='tooltip' title='" + selected[0][0] + "' style='left:" + dx + "px; top:" + dy +"px; position:absolute;'>";
      //
      //       $('#map').append(tag);
      //       // TODO Fix below line, if you remove it you will have to click 2 times on marker for deletion
      //       //$(".marker:last").trigger("click")
      //       reset();
      //       doDraggable();
      //     }
      //   }
      // });
  } 

});