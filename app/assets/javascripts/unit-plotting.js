// save an individual unit (even if same x/y)
  function savePlot(id, dx, dy) {
    if (typeof floorplan_id !== 'undefined'){
      saveFloorplanPlot(id,dx,dy);
    }
    else if ( typeof floorplate_id !== 'undefined'){
      saveFloorplateUnit(id, dx, dy);
    }
    else if ( typeof isPlotAmenity !== 'undefined'){
      saveAmenityPlot(id, dx, dy);
    }
    else if ( typeof floorplate_id_for_amenity !== 'undefined'){
      saveAmenityPlotForFloorplate(id, dx, dy);
    }
    else if(typeof floorplate_id_for_elevator !== 'undefined'){
      saveElevatorPlotForFloorplate(id, dx, dy); 
    } 
    else if ( typeof unit_id_for_amenity !== 'undefined'){
      saveAmenityPlotForUnit(id, dx, dy);
    }
    else if ( typeof tour_id !== 'undefined'){
      saveTourStaringPoint(tour_id, dx, dy);
    }
    else if ( typeof tour_id_for_stop !== 'undefined'){
      saveTourStopPoint(id, dx, dy);
    }
    else{
    	saveSiteMapUnit(id, dx, dy);
    }
  }

  function saveFloorplateUnit(id, dx, dy){
  	$.post( "/communities/"+community_id+"/units/" + id + "/ajaxplotunitforfloorplate",
     { "x_plot": dx,
        "y_plot": dy,
        "floorplate_id": floorplate_id
     },
     function(data,status,xhr) {
       console.debug(status, "done with ajaxsave ajaxplotunit", id, dx, dy);
       console.debug(data.unit);
       console.debug(data.unit.id);
       console.debug(data.unit.x_plot);
       console.debug(data.unit.y_plot);
       console.debug(data.unit.marketing_name);
       arr.push([data.unit.provider_unit_id, data.unit.x_plot, data.unit.y_plot, true, data.unit.id]);
       doDraggable();
       // delete from unused list
       // $('.amenities-list option').each(function(){
       //   if ($(this).val() == id) {
       //     $(this).remove();
       //   }
       // });

       $('#'+data.unit.provider_unit_id+'-selectable').remove();
       $('#'+data.unit.provider_unit_id+'-selection').remove();

     });
  }
  function saveTourStaringPoint(id, dx, dy){
    $.post( "/communities/"+community_id+"/tours/" + id + "/ajaxplotstartingpoint",
        { "x_plot": dx,
            "y_plot": dy,
            "tour_id": tour_id
        },
        function(data,status,xhr) {
        // arr.push([data.tour.id, data.tour.x_plot, data.tour.y_plot, true]);
        doDraggable();
    });
  }
    function saveTourStopPoint(id){

        $.post( "/communities/"+community_id+"/tours/" + id + "/ajaxplottourstoppoint",
            {

                "tour_stop_id": id
            },
            function(data,status,xhr) {
                // arr.push([data.tour.id, data.tour.x_plot, data.tour.y_plot, true]);
                // doDraggable();
                if (data.tour.stop_type == "unit")
                {
                    $('.tour_sortable_disabled').append("<tr id=\"TourStop_"+data.tour.id+"\" class=\"ui-sortable-handle\">\n" +
                        "<td>"+$(".table").find("tr").length+"</td>\n" +
                        "<td>\n" +
                        data.tour.name+
                        "</td>\n" +
                        "<td>\n" +
                        "</a><a id=\"create_path\" data-idattr="+data.tour.stop_id+"\" class=\"text-warning ml-5\" href=''><i class=\"fa fa-refresh icon_size\"></i>\n" +
                        "<a class=\"text-success ml-5\" href=\"/communities/"+data.community.id+"/units/"+data.tour.stop_id+"/edit\"><i class=\"fa fa-edit icon_size\"></i>\n" +
                        "</a><a class=\"text-danger\" data-href=\"/communities/"+data.community.id+"/tours/"+data.tour.tour_id+"/tour_stops/"+data.tour.id+"\" data-name=\"Tour Stop\" data-target=\"#confirm-delete\" data-toggle=\"modal\">\n" +
                        "<i class=\"fa fa-trash icon_size\"></i>\n" +
                        "</a>\n" +
                        "</td>\n" +
                        "</tr>") 
                }
                else
                {
                    $('.tour_sortable_disabled').append("<tr id=\"TourStop_"+data.tour.id+"\" class=\"ui-sortable-handle\">\n" +
                        "<td>"+$(".table").find("tr").length+"</td>\n" +
                        "<td>\n" +
                        data.tour.name+
                        "</td>\n" +
                        "<td>\n" +
                        "</a><a id=\"create_path\" data-idattr="+data.tour.stop_id+"\" class=\"text-warning ml-5\" href=''><i class=\"fa fa-refresh icon_size\"></i>\n" +
                        "<a class=\"text-success ml-5\" href=\"/communities/"+data.community.id+"/amenities/"+data.tour.stop_id+"/edit\"><i class=\"fa fa-edit icon_size\"></i>\n" +
                        "</a><a class=\"text-danger\" data-href=\"/communities/"+data.community.id+"/tours/"+data.tour.tour_id+"/tour_stops/"+data.tour.id+"\" data-name=\"Tour Stop\" data-target=\"#confirm-delete\" data-toggle=\"modal\">\n" +
                        "<i class=\"fa fa-trash icon_size\"></i>\n" +
                        "</a>\n" +
                        "</td>\n" +
                        "</tr>")
                }
                window.location.reload(true);
            });
    }

  function saveFloorplanPlot(id,dx,dy){
    $.post( "/communities/"+community_id+"/floorplans/"+floorplan_id+"/amenities/" + id + "/plot_amenity",
     { "x_plot": dx,
        "y_plot": dy,
     },
     function(data,status,xhr) {
       console.debug(status, "done with ajaxsave ajaxplotunit", id, dx, dy);
       arr.push([data.amenity.id, data.amenity.x_plot, data.amenity.y_plot, true, data.amenity.name]);
       doDraggable();
       // delete from unused list
       $('.amenities-list option').each(function(){
         if ($(this).val() == id) {
           $(this).remove();
         }
       });
     });
  }

  function saveAmenityPlotForFloorplate(id,dx,dy){
    $.post( "/communities/"+community_id+"/floorplates/"+floorplate_id_for_amenity+"/amenities/" + id + "/plot_amenity",
     { "x_plot": dx,
        "y_plot": dy,
         "floor" : floor
     },
     function(data,status,xhr) {
       console.debug(status, "done with ajaxsave ajaxplotunit", id, dx, dy);
       arr.push([data.amenity.id, data.amenity.x_plot, data.amenity.y_plot, true, data.amenity.name]);
       doDraggable();
       // delete from unused list
       $('.amenities-list option').each(function(){
         if ($(this).val() == id) {
           $(this).remove();
         }
       });
       window.location.reload(true);
     });
  }

  function saveElevatorPlotForFloorplate(id,dx,dy){

    $.post( "/communities/"+community_id+"/floorplates/"+floorplate_id_for_elevator+"/elevators/" + id + "/plot_elevator",
     { "x_plot": dx,
        "y_plot": dy,
     },
     function(data,status,xhr) {
       console.debug(status, "done with ajaxsave ajaxplotunit", id, dx, dy);
       arr.push([data.elevator.id, data.elevator.x_plot, data.elevator.y_plot, true, data.elevator.name]);
       doDraggable();
       // delete from unused list
       $('.amenities-list option').each(function(){
         if ($(this).val() == id) {
           $(this).remove();
         }
       });
     });
  }
  
  function saveAmenityPlotForUnit(id,dx,dy){
    $.post( "/communities/"+community_id+"/units/"+unit_id_for_amenity+"/amenities/" + id + "/plot_amenity",
     { "x_plot": dx,
        "y_plot": dy,
     },
     function(data,status,xhr) {
       console.debug(status, "done with ajaxsave ajaxplotunit", id, dx, dy);
       arr.push([data.amenity.id, data.amenity.x_plot, data.amenity.y_plot, true, data.amenity.name]);
       doDraggable();
       // delete from unused list
       $('.amenities-list option').each(function(){
         if ($(this).val() == id) {
           $(this).remove();
         }
       });
     });
  }

  function saveSiteMapUnit(id, dx, dy){
  	$.post( "/communities/"+community_id+"/units/" + id + "/ajaxplotunit",
     { "x_plot": dx,
        "y_plot": dy
     },
     function(data,status,xhr) {
       console.debug(status, "done with ajaxsave ajaxplotunit", id, dx, dy);
       console.debug(data.unit);
       console.debug(data.unit.id);
       console.debug(data.unit.x_plot);
       console.debug(data.unit.y_plot);
       console.debug(data.unit.marketing_name);
       arr.push([data.unit.provider_unit_id, data.unit.x_plot, data.unit.y_plot, true, data.unit.id]);
       doDraggable();
       // delete from unused list
       // $('.amenities-list option').each(function(){
       //   if ($(this).val() == id) {
       //     $(this).remove();
       //   }
       // });

       $('#'+data.unit.provider_unit_id+'-selectable').remove();
       $('#'+data.unit.provider_unit_id+'-selection').remove();
       
     });
  }

  function plotMode(selected){
    addmode = true;
    $("#newmsg").css({display: 'inline-block'});
    $("#map").css('cursor','crosshair');
  }

  $(document).on("click", ".s-unit" , function() {
    //selected.splice( $.inArray("1001", selected), 1 )
    var remove_index = parseInt($(this).attr("data-id"))
    selected.splice(remove_index,remove_index+1)
    var data_provider_unit_id = $(this).attr("data-provider-unit-id");
    //$('.amenities-list option').val($(this).attr("data-unit-provider-id")).css({"display": "block"})
    $('.amenities-list option[value="'+data_provider_unit_id+'"]').css({"display": "block"})
    $(this).remove()
    if (selected.length > 0)
      resetDataIds()
  });

  function resetDataIds() {
    var i=0
    $("#selected-units li").each(function(){ 
      $(this).attr("data-id",i);
      i++;
    })
  }


  function doDraggable() {
    // marker move
    $('.marker').draggable({
      containment: 'parent',
      stack: ".marker",
      // get the initial X and Y position when dragging starts
      start: function(event, ui) {
        console.log("start drag")
        xpos = Math.round(ui.position.left);
        ypos = Math.round(ui.position.top);
        // temp array of just markers at same x/y
        temp=[];
        // alert(arr);
        if (arr != null) {
          for (i=0; i<arr.length; i++) {
            if (arr[i][1] == xpos && arr[i][2] == ypos) {
                // alert(arr[i]);
                // alert(arr[i][0]);
              temp.push(arr[i][0])
            }
          }
        }
      },
      // when dragging stops
      drag: function(event, ui) {
        // calculate the dragged distance, with the current X and Y position and the "xpos" and "ypos"
        xmove = ui.position.left - xpos;
        ymove = ui.position.top - ypos;
        if (temp != null) {
          for (i=0; i<temp.length; i++) {
            $('#m_' + temp[i]).css({"left": ui.position.left, "top": ui.position.top});
          }
        }
      },
      stop: function(event, ui) {
        if (temp != null) {
          for (i=0; i<temp.length; i++) {
            console.log("stop drag", temp[i], Math.round(ui.position.left), Math.round(ui.position.top));
            for (j=0; j<arr.length; j++) {
              if (arr[j][0] == temp[i]) {
                arr[j][1] = Math.round(ui.position.left);
                arr[j][2] = Math.round(ui.position.top);
              }
            }
            // alert(temp[i]);
            savePlot(temp[i], Math.round(ui.position.left ) + lmargin, Math.round(ui.position.top ) + rmargin);
          }
        }
      }
    });
  }


  function reset() {
    addmode = false;
    selected=[];
    dx = 0;
    dy = 0;
    $("#map").css('cursor','default');
    $("#selected-units").empty();
    $("#newmsg").css({display: 'none'});
    // reset any hidden unused ones that didn't get plotted
    $('.amenities-list option').each(function(){
      $(this).css({"display": "block"});
    }); 
  }

  function saveAmenityPlot(id, dx, dy) {
    console.log("ready to ajaxsave ajaxplotunit", id, dx, dy);
    $.post( "/communities/"+community_id+"/sitemaps/" + sitemap_id + "/amenities/" + id + "/plot_amenity",
     { "x_plot": dx,
        "y_plot": dy
     },
     function(data,status,xhr) {
       console.debug(status, "done with ajaxsave ajaxplotunit", id, dx, dy);
       arr.push([data.amenity.id, data.amenity.x_plot, data.amenity.y_plot, true, data.amenity.name]);
       doDraggable();
       // delete from unused list
       $('.amenities-list option').each(function(){
         if ($(this).val() == id) {
           $(this).remove();
         }
       });
     });
  }


function removeUnitFromSelectedArray(value){
  for(i=0; i<selected.length; i++){
    if (selected[i][0] == value){
      selected.splice(i,i+1);
    }
  }
}  