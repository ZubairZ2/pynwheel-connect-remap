function apply_time_to_all(monday_count, closing_time)
{
  $(".tour_time_sortable").sortable( "disable" );
  $("#schedule-btn-submit").removeClass("hide-save-btn");
  $("#schedule-btn-submit").addClass("blink");
  monday_morning  = $(".monday_mor_" + monday_count).val();
  monday_evening = $(".monday_eve_" + monday_count).val();
  tues_morning_val = jQuery(".Tuesday_" + monday_count).find($(".morning_time")).val(monday_morning);
  tues_evening_val = jQuery(".Tuesday_" + monday_count).find($(".evening_time")).val(monday_evening);
  wed_morning_val = jQuery(".Wednesday_" + monday_count).find($(".morning_time")).val(monday_morning);
  wed_evening_val = jQuery(".Wednesday_" + monday_count).find($(".evening_time")).val(monday_evening);
  tues_morning_val = jQuery(".Thursday_" + monday_count).find($(".morning_time")).val(monday_morning);
  tues_evening_val = jQuery(".Thursday_" + monday_count).find($(".evening_time")).val(monday_evening);
  tues_morning_val = jQuery(".Friday_" + monday_count).find($(".morning_time")).val(monday_morning);
  tues_evening_val = jQuery(".Friday_" + monday_count).find($(".evening_time")).val(monday_evening);
  tues_morning_val = jQuery(".Saturday_" + monday_count).find($(".morning_time")).val(monday_morning);
  tues_evening_val = jQuery(".Saturday_" + monday_count).find($(".evening_time")).val(monday_evening);
  tues_morning_val = jQuery(".Sunday_" + monday_count).find($(".morning_time")).val(monday_morning);
  tues_evening_val = jQuery(".Sunday_" + monday_count).find($(".evening_time")).val(monday_evening);
}
var floor = #{raw @floor}
function tour_setup_goBack()
{
    window.location.reload();
}
var div_checklist = "#{@community.scheduler_widget.nil? ? true : @community.scheduler_widget}"
if(div_checklist == "true")
  $('.div_checklist').removeClass('hidden');

var min_floor = #{@community.is_sitemap ? 99999 : (@community.tour.starting_floor.present? ? @community.tour.starting_floor : @community.floorplates.map{|f| f.floors}.flatten.min) rescue 99999}
var min_floor1 = #{@community.is_sitemap ? 99999 : @community.floorplates.map{|f| f.floors}.flatten.min rescue 99999}

$(document).ready(function() {

$('.check_t').change(function() {

  var checks = $('.check_t')
  for(var i =0; i< checks.length; i = i+1)
  {
    if(this != checks[i])
    {
      checks[i].children[0].checked = false
    }
  }
});
if (window.location.href.includes('floorNo'))
{
  $('html, body').animate({ scrollTop: 800 });
}

if ($("#only_scheduled_tour").is(":checked") == true){
  $("#grace_time_period").removeClass("hidden")
}

$('#only_scheduled_tour').change(function() {
  if ($("#only_scheduled_tour").is(":checked")){
    $("#grace_time_period").removeClass("hidden")
  }
  else{
    $("#grace_time_period").addClass("hidden")
  }
})

  var arr = [];
  for (i = 0; i < $('.stops_table').children("tbody").children("tr").length ; i++) {
    if ($('.stops_table').children("tbody").children("tr")[i].id.split("TourStop_")[1] != undefined)
    {
      if (!($('.stops_table').children("tbody").children("tr")[i].children[2].children[0].className.includes("not_selected")))
      {
        arr.push($('.stops_table').children("tbody").children("tr")[i].id.split("TourStop_")[1]);
      }
    }
  }
  if ($('.amenity_row').length == 0 && $('.unit_row').length == 0 && floor != 1)
  {
    arr = []
  }
  $.ajax({
      url: "/communities/#{@community.id}/tours/sort_stops",
      type: "POST",
      dataType: "script",
      data: {
          sitemap: "#{@community.is_sitemap}" ,
          array: arr,
          floor: "#{@floor}",
          building: "#{@building}"
      }
    }).done(function (data) {
      console.log("success");
    });

});
function display_stop(stop_id)
{
  event.preventDefault();
  $.ajax({
      url: "/communities/#{@community.id}/tours/display_stop",
      type: "POST",
      data: {
          stop_id: stop_id ,
      }
    }).done(function (data) {
      if (data.display == true)
      {
        $('.stop_eye' + stop_id).removeClass('hidden');
        $('.stop_eye_slash' + stop_id).addClass('hidden');
        $(".strike_" + stop_id).css("text-decoration", "");
      }
      else
      {
        $('.stop_eye' + stop_id).addClass('hidden');
        $('.stop_eye_slash' + stop_id).removeClass('hidden');
        $(".strike_" + stop_id).css("text-decoration", "line-through");
      }

    });
}
$( ".tour_sortable" ).on( "sortstop", function( event, ui ) {
  tour_stop_id = parseInt($(ui.item.first()).prop("id").replace( /^\D+/g, ''), 10);

  /*$.post( "/delete_path_on_sort_change",
    { "tour_stop_id": tour_stop_id },
    function(data,status,xhr) {
      if(data){
      }
    }
  );*/

});

$('.stops_table').children("tbody").sortable({
  stop: function (event, ui) {
  var arr = [];
  for (i = 0; i < this.children.length ; i++) {
  //not_selected
    if (!(this.children[i].children[2].children[0].className.includes("not_selected")))
    {
      //arr.push(this.children[i].id.split("TourStop_")[1]);
    }
  }
  if ($('.amenity_row').length == 0 && $('.unit_row').length == 0  && floor != 1)
  {
    arr = []
  }

      $.ajax({
      url: "/communities/#{@community.id}/tours/sort_stops",
      type: "POST",
      dataType: "script",
      data: {
          sitemap: "#{@community.is_sitemap}" ,
          array: arr,
          floor: "#{@floor}"
      }
    }).done(function () {
      console.log("success");
    });
  }
});

$('.floor_selection_btn').click(function(){
  $('.hidden_floor').val(this.textContent);
  $('.floor_submit_btn').click();
});
$('.tour_time_sortable').railsSortable();
$('.tour_sortable').railsSortable();
$(".tour_time_sortable").on( "sortchange", function( event, ui ) {
  $(".apply-monday-btn").addClass("hide-apply-btn");
  $("#add-btn").addClass("hide-add-btn");
  $(".day-list").attr('disabled','disabled');
  $("#save-sorted-time").removeClass("hide-sort-btn");
  $("#save-sorted-time").addClass("blink");

});
function ok (){
 location.reload();
}

community_id = #{params[:community_id]}

cords_arr = JSON.parse('#{raw(path_point_coords.to_json)}');

$('.floor_submit_btn').click(function () {
  $('.floor_submit_btn').click();
});
// $('.floor_selection_btn111').click(function () {
//   var url = '/communities/' + community_id + '/tours';
//   $.ajax({
//     url: url,
//     type: "GET",
//     dataType: "script",
//     data: {
//       floorNo: this.textContent
//     }
//   }).done(function () {
//     $(".divLoading").addClass("hidden");
//     console.log("success");
//   });
//
//
//
// });
$(document).ready(function(){
  var path_id;

  radius = 50;
  var point_color = 'rgb(85, 88, 85)';
  var point_size = 20;

  path_array = $(".path_point")
  if (path_array.length > 0){
    $(".plot-image").append(createLine('#stop_'+document.getElementById($(".path_point")[0].id).getAttribute('value'), path_array[0]))
    for(i=0; i < path_array.length-1; i++){
      if (document.getElementById($(".path_point")[i].id).getAttribute('value')== document.getElementById($(".path_point")[i+1].id).getAttribute('value') && document.getElementById($(".path_point")[i].id).getAttribute('data')== document.getElementById($(".path_point")[i+1].id).getAttribute('data')){
        $(".plot-image").append(createLine(path_array[i], path_array[i+1]))
      }
      else {
        $(".plot-image").append(createLine('#stop_'+document.getElementById($(".path_point")[i+1].id).getAttribute('value'), path_array[i+1]))
      }
    }
  }



  // add listner to prev points

  $.each($("*.path_point"), function(i, existing_point){
    id = $(existing_point).prop('id');
    dragElement(document.getElementById(id));
  });

   $.each($("*.stop"), function(i, elevator){
     makeElevatorDragable(elevator);
   });
   $.each($("*.bsp_stop"), function(i, bsp){
     makeBuildingStartingPointDragable(bsp);
   });

  $("#testimg").on('click', function (ev) {
    mouseX = Math.round(ev.offsetX - point_size/2)
    mouseY = Math.round(ev.offsetY - point_size/2)
    neighbour_units =  detectNearestUnits()
    var len = $("i[class*='animate-element']").length + $("a[class*='animate-element']").length

    if (len == 1){
      alert("Please select two stops from table for which you want to draw path")
    }
    else {
      savePoint(mouseX, mouseY, neighbour_units)
    }
  });


  function makeElevatorDragable(elevator){
    elevator_id = $(elevator).prop('id').split('_')[1]
    $(elevator).draggable({
      containment: 'parent',
        start: function(event, ui) {
          console.log("start drag")
          xpos = Math.round(ui.position.left);
          ypos = Math.round(ui.position.top);
        },

        drag: function(event, ui) {
          // calculate the dragged distance, with the current X and Y position and the "xpos" and "ypos"
          xmove = ui.position.left - xpos;
          ymove = ui.position.top - ypos;
        },

        stop: function(event, ui) {

        elevator_id = $(elevator).prop('id').split('_')[1]
          left = Math.round(ui.position.left )
          right = Math.round(ui.position.top );
          $.ajax({
            type: "POST",
            url: "#{update_elevator_path}",
            data: {elevator_id: elevator_id, x_plot: left, y_plot: right },
            success: function(response) {
              console.log(response.message)
            }
          });
        }

     });
  }
  function makeBuildingStartingPointDragable(bsp){
    bsp_id = $(bsp).prop('id').split('_')[1]
    $(bsp).draggable({
      containment: 'parent',
        start: function(event, ui) {
          console.log("start drag")
          xpos = Math.round(ui.position.left);
          ypos = Math.round(ui.position.top);
        },

        drag: function(event, ui) {
          // calculate the dragged distance, with the current X and Y position and the "xpos" and "ypos"
          xmove = ui.position.left - xpos;
          ymove = ui.position.top - ypos;
        },

        stop: function(event, ui) {
          bsp_id = event.target.id.split("_")[1]
          left = Math.round(ui.position.left )
          right = Math.round(ui.position.top );
          $.ajax({
            type: "POST",
            url: "#{update_building_starting_point_community_tours_path}",
            data: {bsp_id: bsp_id, x_plot: left, y_plot: right },
            success: function(response) {
              console.log(response.message)
            }
          });
        }

     });
  }
  function savePoint(x, y, unit_ids){
    if($("#drawing_path_for").val() == ""){

      alert("Please select two stops from table for which you want to draw path")
      return false
    }
    $.post( "/save_path_point/",
      { "x_plot": x,
        "y_plot": y,
        "path_id": $("#drawing_path_for").val(),
        "unit_ids": unit_ids
      },
      function(data,status,xhr) {
        drop_point_on_screen(data)
      }
    );
  }
  var start_point_array = []
  var stop_point_array = []
  function drop_point_on_screen(db_data){

    var size =  point_size.toString()+ 'px';

    id = "point_"+db_data.point.id.toString()

    path_point = $('<div title="Drag to change, double click to remove" class="path_point" id="'+ id +'"></div>')
            .css('top', mouseY + 'px')
            .css('left', mouseX + 'px')
            .css('width', size)
            .css('height', size)
    $(".plot-image").append(path_point);
    path_array.push(path_point)
    start_point_array.push(db_data.line_start_point)
    stop_point_array.push(db_data.line_stop_point)

    if(path_array.length == 1 && db_data.line_start_point != "" ){
      line = createLine($('#stop_'+db_data.line_start_point), path_array[path_array.length-1])
      $(".plot-image").append(line)
    }

    if(path_array.length > 1 && start_point_array[start_point_array.length - 1] == start_point_array[start_point_array.length - 2] && stop_point_array[stop_point_array.length - 1] == stop_point_array[stop_point_array.length - 2]){
      line = createLine(path_array[path_array.length-1], path_array[path_array.length-2])
      $(".plot-image").append(line)
    }
    else if(db_data.line_start_point == null){
      line = createLine(path_array[path_array.length-1], path_array[path_array.length-2])
      $(".plot-image").append(line)
    }
    else if(path_array.length > 1 && db_data.line_start_point != "" && db_data.exist){
      // debugger;
      // te = path_array.sort(function(a, b) {
      //   var compA = $(a).attr('id').toUpperCase();
      //   var compB = $(b).attr('id').toUpperCase();
      //   return (compA < compB) ? -1 : (compA > compB) ? 1 : 0;
      // })
      last_point = $.grep(path_array, function(e){ return e.id == "point_" + db_data.last_point.id; })[0];
      line = createLine(last_point, path_array[path_array.length-1])
      $(".plot-image").append(line)
    }
    else {
      line = createLine($('#stop_'+db_data.line_start_point), path_array[path_array.length-1])
      $(".plot-image").append(line)
    }

    dragElement(document.getElementById(id));
  }

  $(document).on("dblclick", "*.path_point" , function() {
    point_id = this.id.replace( /^\D+/g, '')
      $.post( "/delete_path_point",
        { "point_id": point_id },
        function(data,status,xhr) {
          if(data){
            $("#"+data.point_id).remove()
          }
        }
      );
    return false;
  });

  function detectNearestUnits(){
    neighbour_unit_ids = []
    $.each(cords_arr, function(index, unit){
      xp = Math.pow((unit.x - mouseX), 2)
      yp = Math.pow((unit.y - mouseY), 2)

      d = Math.sqrt(xp + yp)
      if(d <= radius)
        neighbour_unit_ids.push(index)
    });

    return neighbour_unit_ids
  }

  $(document).on("click", "*.path_point",  function(e){
    mouseX = this.offsetLeft
    mouseY = this.offsetTop
    neighbour_units =  detectNearestUnits()
    updatePoint(mouseX, mouseY, neighbour_units, this.id.replace( /^\D+/g, ''))
  });

  function updatePoint(x, y, unit_ids, point_id){
    $.post( "/update_path_point",
      {
        "x_plot": x,
        "y_plot": y,
        "point_id": point_id,
        "unit_ids": unit_ids
      },
      function(data,status,xhr) {
        // drop_point_on_screen(data)
      }
    );
  }

  function dragElement(elmnt) {
    var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    elmnt.onmousedown = dragMouseDown;

    function dragMouseDown(e) {

      e = e || window.event;
      e.preventDefault();
      // get the mouse cursor position at startup:
      pos3 = e.clientX;
      pos4 = e.clientY;
      document.onmouseup = closeDragElement
      // call a function whenever the cursor moves:
      document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
      e = e || window.event;
      e.preventDefault();
      // calculate the new cursor position:
      // debugger
      pos1 = pos3 - e.clientX;
      pos2 = pos4 - e.clientY;
      pos3 = e.clientX;
      pos4 = e.clientY;
      // set the element's new position:
      elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
      elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
    }

    function closeDragElement(e) {
      e = e || window.event;
      // path_array = $('.path_point')
      console.log(path_array)
      // stop moving when mouse button is released:
      document.onmouseup = null;
      document.onmousemove = null;
    }
  }


  $('#start-point-path').on("click", function(event){
    $.ajax({
      type: "POST",
      url: this.href,
      data: {map_path_for: 'starting_point'},
      success: function(response) {
        //update drawing path for so we can use that path id to save point
        $("#drawing_path_for").val(response.path.id)
        $('.stops').removeClass('animate-element')
        $('.start-point').addClass('animate-element')
        / $('#stop_'+response.path.map_path_id).addClass('animate-element')
        $('html, body').animate({
          scrollTop: $(".plot-image").offset().top
        }, 500);
      }

    });
    event.preventDefault();
  });


  var arr = []
  data = []
  var highlights = []
  var points = []
  $("*#create_path").on("click", function(event){
    $('.stops').removeClass('animate-element')
    $('.start-point').removeClass('animate-element')
    arr.push(this.href)
    var url1  = arr[0].substring(arr[0].lastIndexOf('/') + 1);
    var stop_1_id = url1.split('?')[0]
    var stop_1_type = url1.split('=')[1]
    highlights.push(this)
    if (highlights.length <= 2){
      $(this).parent().parent().css('backgroundColor', '#D3D3D3');
    }
    else {
      $(highlights[0]).parent().parent().css('backgroundColor', '');
      $(highlights[1]).parent().parent().css('backgroundColor', '');
      $(this).parent().parent().css('backgroundColor', '#D3D3D3');
      highlights = []
      highlights.push(this)
    }

    $('#stop_'+url1.split('?')[0]).addClass('animate-element')
    if (arr.length == 2) {
      $('.path_point').hide();
      $('.connectingLines').hide();
      var url2  = arr[1].substring(arr[1].lastIndexOf('/') + 1);
      var stop_2_id = url2.split('?')[0]
      var stop_2_type = url2.split('=')[1]

      stop_ids = [stop_1_id, stop_2_id]
      stop_types = [stop_1_type, stop_2_type]
      $.ajax({
        type: "POST",
        url: this.href,
        data: {stop_ids: stop_ids, stop_types: stop_types},
        success: function(response) {
          if (response.path_points.length > 0) {
            for(i=0; i < response.path_points.length; i++){
              id = "point_"+response.path_points[i].id
              point = document.getElementById(id)
              point.style.display="block";
              points.push(point)
              $(".plot-image").append(point);
            }
            if (response.path.map_path_from_id == null){
              $(".plot-image").append(createLine($('.start-point'), points[points.length-1]))
            }
            else{
              $(".plot-image").append(createLine('#stop_'+response.path.map_path_from_id, points[points.length-1]))
            }
            for(i=0; i < points.length-1; i++){
              $(".plot-image").append(createLine(points[i], points[i+1]))
            }
            $('#stop_'+stop_1_id).addClass('animate-element')
            $('#stop_'+stop_2_id).addClass('animate-element')
            arr = []
            points = []
            var elmnt = document.getElementById('testimg');
            elmnt.scrollIntoView({behavior: "smooth", inline: "nearest"});
            $("#drawing_path_for").val(response.path.id)
          }
          else{
            $("#drawing_path_for").val(response.path.id)
            $('.start-point').removeClass('animate-element')
            / $('.stops').removeClass('animate-element')
            id = arr[0].substring(arr[0].lastIndexOf('/') + 1);
            $('#stop_'+stop_1_id).addClass('animate-element')
            $('#stop_'+stop_2_id).addClass('animate-element')
            arr = []
            $('html, body').animate({
              scrollTop: $(".plot-image").offset().top
            }, 500);
          }

          //update drawing path for so we can use that path id to save point
        }

      });

    }
    event.preventDefault();
  });

  $("#add-elevator-path").on("click", function(event){
    $.ajax({
      type: "POST",
      url: this.href,
      data: $(this).serialize(),
      success: function(response) {
        actions = ''
        stop_id = "TourStop_"+ response.path.id
        row_sequence_number = parseInt($('.tour_sortable_disabled tr:last td:first').html())+1

        elevator_stop = '<tr id=' + stop_id + '>'
        elevator_stop += '<td>'+row_sequence_number+'</td>'
        elevator_stop += '<td>'+response.path.name+'</td>'

        $('.tour_sortable_disabled').append(elevator_stop);
        window.location.reload()
      }
    });
    event.preventDefault();
  });


  function getElementProperty(el){
    var dx = 0;
    var dy = 0;
    var width = $(el).width()|0;
    var height = $(el).height()|0;
    dx += parseInt($(el).css('left'), 10);
    dy += parseInt($(el).css('top'), 10);


    return { top: dy, left: dx, width: width, height: height };
  }

  function createLine(el1, el2){
    var off1 =getElementProperty(el1);
    var off2 =getElementProperty(el2);
    // center of first point
    var dx1 = off1.left + off1.width/2;
    var dy1 = off1.top + off1.height/2;
    // center of second point
    var dx2 = off2.left + off2.width/2;
    var dy2 = off2.top + off1.height/2;
    // distance
    var length = Math.sqrt(((dx2-dx1) * (dx2-dx1)) + ((dy2-dy1) * (dy2-dy1)));
    // center
    var cx = ((dx1 + dx2) / 2) - (length / 2);
    var cy = ((dy1 + dy2) / 2) - (2  / 2);
    // angle
    var angle = Math.atan2((dy1-dy2),(dx1-dx2))*(180/Math.PI);
    // draw line
    return  "<section class='connectingLines' style='left:" + cx + "px; top:" + cy + "px; width:" + length + "px; -webkit-transform:rotate(" + angle + "deg); transform:rotate(" + angle + "deg); z-index: 99999; background-color: #1c1c1d; position: absolute; height: 2px; '></section>";
  };

});

$(document).ready(function(){

  function hasDuplicates(array,times_hash) {
    var valuesSoFar = Object.create(null);
    for (var i = 0; i < array.length; ++i) {
              if(times_hash[array[i]][0].split('-')[0] >= times_hash[array[i]][0].split('-')[1])
              {return true;}
        if(times_hash[array[i]].length > 1)
        {
          var check_index = times_hash[array[i]];
          for(var j = 0; j < check_index.length ;j++)
          {
            for(var k = 0; k < check_index.length ;k++)
            {
              if( j!=k )
              {
              var a = check_index[j].split('-')[0]
              var b = check_index[j].split('-')[1]
              var c = check_index[k].split('-')[0]
              var d = check_index[k].split('-')[1]
              
              // if(parseInt(b.split(':')[0]) < 12 && parseInt(c.split(':')[0]) > 12 && parseInt(d.split(':')[0]) > 12)
              // {
              //   temp = parseInt(b.split(':')[0]) + 24
              //   b = temp + ':' + parseInt(b.split(':')[1])
              // }
              // if(parseInt(d.split(':')[0]) < 12 && parseInt(c.split(':')[0]) > 12)
              // {
              //   temp = parseInt(d.split(':')[0]) + 24
              //   d = temp + ':' + parseInt(d.split(':')[1])
              // }
              x = a + '-' + b
              y = c + '-' + d
              if(x.split('-')[0] >= x.split('-')[1])
              {return true;}
              if(y.split('-')[0] >= y.split('-')[1])
              {return true;}

              x = x.replace('00:00','24:00')
              y = y.replace('00:00','24:00')

              if(x.split('-')[0] <= y.split('-')[0] && x.split('-')[1] >= y.split('-')[0])
              {
                return true;
              }
              if(x.split('-')[0] <= y.split('-')[1] && x.split('-')[1] >= y.split('-')[1])
              {
                return true;
              }
              if(y.split('-')[0] <= x.split('-')[0] && y.split('-')[1] >= x.split('-')[0])
              {
                return true;
              }
              if(y.split('-')[0] <= x.split('-')[1] && y.split('-')[1] >= x.split('-')[1])
              {
                return true;
              }

              if(check_index[j].split('-')[0] <= check_index[k].split('-')[0] && check_index[j].split('-')[1] >= check_index[k].split('-')[0])
              {return true;}
              if(check_index[j].split('-')[0] <= check_index[k].split('-')[1] && check_index[j].split('-')[1] >= check_index[k].split('-')[1])
              {return true;}


              }

            }
          }
        }
    }
    return false;
  }

  function get_next_day_with_selected_option(last_day){
    var options = `<option value="Monday" selected="selected">Monday</option><option value="Tuesday">Tuesday</option><option value="Wednesday">Wednesday</option><option value="Thursday">Thursday</option><option value="Friday">Friday</option><option value="Saturday">Saturday</option><option value="Sunday">Sunday</option>`
    if(last_day == "Monday")
      options = `<option value="Monday">Monday</option><option value="Tuesday" selected="selected">Tuesday</option><option value="Wednesday">Wednesday</option><option value="Thursday">Thursday</option><option value="Friday">Friday</option><option value="Saturday">Saturday</option><option value="Sunday">Sunday</option>`
    else if(last_day == "Tuesday")
      options = `<option value="Monday">Monday</option><option value="Tuesday">Tuesday</option><option value="Wednesday" selected="selected">Wednesday</option><option value="Thursday">Thursday</option><option value="Friday">Friday</option><option value="Saturday">Saturday</option><option value="Sunday">Sunday</option>`
    else if(last_day == "Wednesday")
      options = `<option value="Monday">Monday</option><option value="Tuesday">Tuesday</option><option value="Wednesday">Wednesday</option><option value="Thursday" selected="selected">Thursday</option><option value="Friday">Friday</option><option value="Saturday">Saturday</option><option value="Sunday">Sunday</option>`
    else if(last_day == "Thursday")
      options = `<option value="Monday">Monday</option><option value="Tuesday">Tuesday</option><option value="Wednesday">Wednesday</option><option value="Thursday">Thursday</option><option value="Friday" selected="selected">Friday</option><option value="Saturday">Saturday</option><option value="Sunday">Sunday</option>`
    else if(last_day == "Friday")
      options = `<option value="Monday">Monday</option><option value="Tuesday">Tuesday</option><option value="Wednesday">Wednesday</option><option value="Thursday">Thursday</option><option value="Friday">Friday</option><option value="Saturday" selected="selected">Saturday</option><option value="Sunday">Sunday</option>`

    return options
  }
  
  function append_new_day(){
    var last_dropdown_id = "day_" + (current_day - 1)
    var last_dropdown = document.getElementById(last_dropdown_id);
    var last_day = last_dropdown.options[last_dropdown.selectedIndex].text;
    var new_day_with_selected_options = get_next_day_with_selected_option(last_day)

    $(".list").append(`
      <div class="row p-8-v">
        <select class="day-list font-17-v pull-left mr-20-v" id="day_${current_day}" name="day_${current_day}">
          ${new_day_with_selected_options}
        </select>

        <div class="font-17-v pull-left mr-20-v">
          <div class="p-4-v pull-left mr-10-v">
            <label class="text-grey-v">From</label>
          </div>
          <input class="day-list bg-grey-v morning_time" name="from_${current_day}" type="time" value="09:00">
        </div>

        <div class="font-17-v pull-left mr-20-v">
          <div class="p-4-v pull-left mr-10-v">
            <label class="text-grey-v">To</label>
          </div>
          <input class="day-list bg-grey-v evening_time" name="to_${current_day}" type="time" value="17:00">
        </div>

        <div class="font-17-v pt-5 cancel fa fa-v fa-times text-danger"></div>

      </div>`);
  }
  var current_day = $(".list").children().length
  
$('#add-btn').click(function(event){
  current_day = current_day + 1
  append_new_day()
  $("#schedule-btn-submit").removeClass("hide-save-btn");
  event.preventDefault();
});

$('#schedule-btn-submit').click(function( event ){
  var days = []
  var times_list = $(".bg-grey-v")
  var times_hash = {}
  var i = 0;
  $(".list").children().children('select').each(function(){
    var selected = '#' + $(this).attr('id') + ' :selected'
    var day_ = $(selected).text()
    if(times_hash[day_] == undefined)
    {
      times_hash[day_] = []
    }
    times_hash[day_].push(times_list[i].value +'-'+ times_list[i+1].value);
    days.push(day_);
    i += 2;
  })
  if(hasDuplicates(days,times_hash)){
    event.preventDefault();
    $("#same-days").css('color', 'red');
    timer = setTimeout(function() {
      $("#same-days").css('color', 'white');
    }, 2000);
  }
  else{
    $("#save_hours").show().delay(2000).fadeOut();
  }
})

$(".list").on('click', '.cancel', function(){
  if ($(".list").children().length > 1){
  $(this).parent().remove();

  current_day = 0
  $(".list").children().children('select').each(function(){
    current_day = current_day + 1
    $(this).attr("id", 'day_'+current_day);
    $(this).attr("name", 'day_'+current_day);
  })

  current_day = 0
  $(".list").children().children().children('input').each(function(i){
    if (Math.floor(i%2 == 0)){
      current_day = current_day + 1
      $(this).attr("id", 'from_'+current_day);
      $(this).attr("name", 'from_'+current_day);
    }
    else{
      $(this).attr("id", 'to_'+current_day);
      $(this).attr("name", 'to_'+current_day);
    }
  })
}
if ($(".list").children().length < 7)
    $('#add-btn').show()
});

});
function myFunction(){
  $("#schedule-btn-submit").removeClass("hide-save-btn");
  $(".tour_time_sortable").sortable( "disable" );
  $("#schedule-btn-submit").addClass("blink");

}
