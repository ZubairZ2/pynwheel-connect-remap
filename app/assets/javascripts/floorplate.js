$(document).ready(function(){
  
  selected=[];
  var temp=[];
  dx = 0;
  dy = 0;
  $("#map").css('cursor','default');

  doDraggable();

  $('.amenities-list').mouseup( function(e) {
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

  $(document).on("click", ".marker" , function() {
    console.log($(this).attr("title"));
    $(this).attr('data-name' , 'plot');
    $(this).attr('data-target' , '#confirm-delete');
    $(this).attr('data-toggle' , 'modal');
    $(this).attr('data-href' , '/communities/'+community_id+'/units/'+$(this).attr("title")+'/remove_plot_from_floorplate?floorplate_id='+floorplate_id);
  });

  $("#map").mouseup(function(e) {
    e.preventDefault();
    dx = parseInt($('#active_x_plot').html())-8;
    dy = parseInt($('#active_y_plot').html()-10);
    if (addmode) {
      // save plotting for each selected unit
      for (i=0; i<selected.length; i++) {
        savePlot(selected[i][0], dx, dy);
      }
      // add new marker to display
      tag = "<a class='marker' data-toggle='tooltip' title='" + selected[0][1] + "' style='left:" + dx + "px; top:" + dy +"px; position:absolute;'>";
      
      tag += "<i class='fa fa-asterisk'></i>";
      tag += "</a>"
      $('#map').append(tag);
      // TODO Fix below line, if you remove it you will have to click 2 times on marker for deletion
      $(".marker:last").trigger("click") 
      reset();
      doDraggable();
    }
  });
  	
});


// save an individual unit (even if same x/y)
  function savePlot(id, dx, dy) {
    console.log("ready to ajaxsave ajaxplotunit", id, dx, dy);
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
          arr.push([data.unit.marketing_name, data.unit.x_plot, data.unit.y_plot, true, data.unit.id]);
          doDraggable();
          // delete from unused list
          $('.amenities-list option').each(function(){
            if ($(this).val() == id) {
              $(this).remove();
            }
          });
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
    $('.amenities-list option').val($(this).html()).css({"display": "block"})
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
        if (arr != null) {
    for (i=0; i<arr.length; i++) {
      if (arr[i][1] == xpos && arr[i][2] == ypos) {
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
      savePlot(temp[i], Math.round(ui.position.left), Math.round(ui.position.top));
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