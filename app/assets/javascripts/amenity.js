$(document).ready(function(){
  if ($('.is-amenity')[0]){
      selected=[];
      var temp=[];
      dx = 0;
      dy = 0;
      $("#map").css('cursor','default');

      doDraggable();

      $('.amenities-list').on('change', function(e) {
        e.preventDefault();
        $('.amenities-list :selected').each(function(){
          if ($(this).val()!=""){
            console.log($.inArray($(this).val(), $.map(selected, function(v) { return v[0]; })) == -1); 
            if (selected.length == 0){
              selected.push([ $(this).val(), $.trim($(this).text()) ]);
            }
            else if ($.inArray($(this).val(), $.map(selected, function(v) { return v[0]; })) == -1){
              selected.push([ $(this).val(), $.trim($(this).text()) ]);
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
        }); 
      });

     
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
        // first check if user is clicking on scrollbar
        if (e.target != $('#map').get(0)){
          e.preventDefault();
          dx = parseInt($('#active_x_plot').html())-8;
          dy = parseInt($('#active_y_plot').html()-10);
          if (addmode) {
            // save plotting for each selected unit
            for (i=0; i<selected.length; i++) {
              savePlot(selected[i][0], dx, dy);
            }
            var url = "";
            if (typeof floorplan_id !== 'undefined'){
              url = '/communities/'+community_id+'/floorplans/'+floorplan_id+'/amenities/'+selected[0][0]+'/remove_amenity';
            }
            else if (typeof sitemap_id !== 'undefined'){
              url = '/communities/'+community_id+'/sitemaps/'+sitemap_id+'/amenities/'+selected[0][0]+'/remove_amenity';
            }
            else if (typeof floorplate_id_for_amenity !== 'undefined'){
              url = '/communities/'+community_id+'/floorplates/'+floorplate_id_for_amenity+'/amenities/'+selected[0][0]+'/remove_amenity'
            }
            else{
              url = '/communities/'+community_id+'/units/'+$(this).attr("title")+'/remove_plot'
            }
            
            // add new marker to display
            //tag = "<a class='marker' data-toggle='tooltip' title='" + selected[0][0] + "' style='left:" + dx + "px; top:" + dy +"px; position:absolute;'>";
            tag = "<a class='marker ui-draggable ui-draggable-handle' data-toggle='modal' title='" + selected[0][1] + "' style='left:" + dx + "px; top:" + dy +"px; position:absolute;' data-name='plot' data-target='#confirm-delete' data-href='" + url + "'>"
            tag += "<i class='fa fa-asterisk'></i>";
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