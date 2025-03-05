/* Author: Greg Ryan, Pynwheel, Inc.
   Editor: Alexey Klimuk, Softensity, Inc.
 * sitemap, floorplate, amenity map plotting
*/

// var algo_unit_data = [];
// var algo_amenity_data = [];
// var algo_access_point_data = [];
// var start_point_data = {};

var stops_type_arr = ["unit", "amenity", "elevator", "building_starting_exit_point"]
var tmp_id = 0;
var cntrlIsPressed = false;
var xpos;
var ypos;
var xmove = 0;
var ymove = 0;
var xlast = -1;
var ylast = -1;
var addmode = false;
var hallways_coordinates = [];
var map_id;
var floor_id;
function initialize_variables(hallways_coordinates, map_id){
  var tmp_id = 0;
  var cntrlIsPressed = false;
  var hallways_coordinates = hallways_coordinates;
  var xpos;
  var ypos;
  var xmove = 0;
  var ymove = 0;
  var xlast = -1;
  var ylast = -1;
  var addmode = false;
  map_id = map_id
}

  $('.viewArea').on('mousemove', function(event){
    if ($(event.target).hasClass('viewArea')){
      map_id = "#" + $(event.target).data('map-id')
    }
    if (!map_id)
      map_id = "#map"
    if ($(map_id).length > 0){
      var dx = parseInt(event.pageX) - parseInt($(map_id).offset().left) + parseInt($(map_id).scrollLeft());
      var dy = parseInt(event.pageY) - parseInt($(map_id).offset().top) + parseInt($(map_id).scrollTop());
      $('#active_x_plot').html(dx);
      $('#active_y_plot').html(dy);
    }
  }); 
$(".viewArea").on('click', function (e) {
    if ($(e.target).hasClass('viewArea')){
      map_id = "#" + $(e.target).data('map-id')
      marker_color = $('#marker_color').html();
      camera_margin = $('#camera-margin').html();
      marker_font_size = ($('#font_size').html());
      left_margin = parseInt($('#left_margin').html());
      right_margin = parseInt($('#right_margin').html());
      dx = parseInt(event.pageX) - parseInt($(map_id).offset().left) + parseInt($(map_id).scrollLeft());
      dy = parseInt(event.pageY) - parseInt($(map_id).offset().top) + parseInt($(map_id).scrollTop());

      if ($("#hallway_btn").html() == "Start Plotting Hallways") {
          $(this).css('cursor', 'default');
          e.preventDefault();
          $('#new-aj-popup #x_plot').val(dx);
          $('#new-aj-popup #y_plot').val(dy);
          if (addmode) {
              //$('#map-marker').css({left: (dx-8)+"px", top: (dy-10)+"px", display: "block"});
              $('#map-marker').css({left: (dx) + "px", top: (dy) + "px", display: "block"});
              $("#new-aj-popup").show();
          }
      }
      if ($("#hallway_btn").html() == "Stop Plotting Hallways" ) {
          dx = e.type === 'touchend' ? ((e.changedTouches[0].pageX - elemPos.left)) : dx;
          dy = e.type === 'touchend' ? ((e.changedTouches[0].pageY - elemPos.top)) : dy;

          const zoomContainer = e.currentTarget.parentElement;
          const zoomPanKey = `${zoomContainer.tagName.toLowerCase()}-${zoomContainer.id}`

          var transform = mapPanZoom[zoomPanKey] ? mapPanZoom[zoomPanKey].getTransform() : {};
          var scaleFactor = (1 / (transform.scale || 1));
          dx = (dx * scaleFactor) - (e.type === 'touchend' ? (transform.x * scaleFactor) : (10 * scaleFactor));
          dy = (dy * scaleFactor) - (e.type === 'touchend' ? (transform.y * scaleFactor) : (10 * scaleFactor));
          dx = Math.round(dx);
          dy = Math.round(dy);
          var new_point = {id: tmp_id++, x_plot: dx, y_plot: dy, selected: true, next_points: []};
          var previous_point;
          hallways_coordinates.forEach((element, index) => {
              if (element.selected === true) {
                  previous_point = hallways_coordinates[index];
              }
          });
          add_hallwaypoint(new_point, previous_point, map_id);
      }
    }
  });
function initialize_map_click(map_id){
  map_id = map_id
  $('.viewArea').on('click', function (e) {
    const zoomContainer = e.currentTarget.parentElement;
    const key = `${zoomContainer.tagName.toLowerCase()}-${zoomContainer.id}`
    
    map_id = $(this).data('map_id')
    marker_color = $('#marker_color').html();
    camera_margin = $('#camera-margin').html();
    marker_font_size = ($('#font_size').html());
    left_margin = parseInt($('#left_margin').html());
    right_margin = parseInt($('#right_margin').html());
    dx = parseInt($('#active_x_plot').html()) - 8;
    dy = parseInt($('#active_y_plot').html() - 10);
    if ($("#hallway_btn").html() == "Start Plotting Hallways") {
        $(this).css('cursor', 'default');
        e.preventDefault();
        $('#new-aj-popup #x_plot').val(dx);
        $('#new-aj-popup #y_plot').val(dy);
        if (addmode) {
            //$('#map-marker').css({left: (dx-8)+"px", top: (dy-10)+"px", display: "block"});
            $('#map-marker').css({left: (dx) + "px", top: (dy) + "px", display: "block"});
            $("#new-aj-popup").show();
        }
    }
    if ($("#hallway_btn").html() == "Stop Plotting Hallways" && e.target == $(map_id + '_viewArea').get(0)) {
        dx = e.type === 'touchend' ? ((e.changedTouches[0].pageX - elemPos.left)) : parseInt($('#active_x_plot').html());
        dy = e.type === 'touchend' ? ((e.changedTouches[0].pageY - elemPos.top)) : parseInt($('#active_y_plot').html());
        var transform = mapPanZoom[key] ? mapPanZoom[key].getTransform() : {};
        var scaleFactor = (1 / (transform.scale || 1));
        dx = (dx * scaleFactor) - (e.type === 'touchend' ? (transform.x * scaleFactor) : (10 * scaleFactor));
        dy = (dy * scaleFactor) - (e.type === 'touchend' ? (transform.y * scaleFactor) : (10 * scaleFactor));
        dx = Math.round(dx);
        dy = Math.round(dy);
        var new_point = {id: tmp_id++, x_plot: dx, y_plot: dy, selected: true, next_points: []};
        var previous_point;
        hallways_coordinates.forEach((element, index) => {
            if (element.selected === true) {
                previous_point = hallways_coordinates[index];
            }
        });
        add_hallwaypoint(new_point, previous_point, map_id);
    }
  });
}
  $(window).on('load', function () {
      var tmp_id = 0;
      var cntrlIsPressed = false;
      var hallways_coordinates = [];
      var xpos;
      var ypos;
      var xmove = 0;
      var ymove = 0;
      var xlast = -1;
      var ylast = -1;
      var addmode = false;
      // get thumb scale and set it's height
      map_scale = $('#map').width() / $('#map-thumb').width();
      $('#map-thumb').height($('#map').height() / map_scale);
      $('#plate-thumb').height($('#map').height() / map_scale);
      $('#site-thumb').height($('#map').height() / map_scale);

      // show/hide map-thumb
      $('#showhide').click(function (e) {
          $('#map-thumb').toggle();
      });

      // close amenityjoin popup
      $('.close-aj-popup').click(function (e) {
          e.preventDefault();
          $(".aj-popup").hide();
          $('#map-marker').css({left: "0", top: "0", display: "none"});
          addmode = false;
          $("#newmsg").css({display: 'none'});
      });

      // new marker button click
      $("#new").click(function (e) {
        console.log("new marked is created")
        addmode = true;
        $("#newmsg").css({display: 'inline-block'});
        e.preventDefault();
      });

      // map thumbnail scroller
      // its for site map
      $('#map-nav').draggable({
          containment: 'parent',
          stack: "#map-nav",
          // get the initial X and Y position when dragging starts
          start: function (event, ui) {
              xpos = ui.position.left;
              ypos = ui.position.top;
              // init hold values for thumb placement
              if (xlast == -1) {
                  xlast = $('#map-container').scrollLeft();
                  ylast = $('#map-container').scrollTop();
              }
              $('#map-container').scrollLeft(xlast);
              $('#map-container').scrollTop(ylast);
          },
          // when dragging stops
          drag: function (event, ui) {
              // calculate the dragged distance, with the current X and Y position and the "xpos" and "ypos"
              xmove = ui.position.left - xpos;
              ymove = ui.position.top - ypos;
              $('#map-container').scrollLeft(xlast + xmove * map_scale);
              $('#map-container').scrollTop(ylast + ymove * map_scale);
          },
          stop: function (event, ui) {
              xlast = $('#map-container').scrollLeft();
              ylast = $('#map-container').scrollTop();
          }
      });

      // set @currunit x/y on load
      if ($('#x_plot').val() != "") {
          $('#container').scrollLeft($('#x_plot').val() - ($('#container').width() / 2));
          $('#container').scrollTop($('#y_plot').val() - ($('#container').height() / 2));
          var dx = parseInt($('#x_plot').val());
          var dy = parseInt($('#y_plot').val());
          // place marker
          $('#map-marker').css({left: (dx) + "px", top: (dy) + "px", display: 'none'});
      }

      /**
       * misc
       */
      addmode = !!window.isamenity;

  });

  function add_hallwaypoint(new_point, previous_point, map_id) {
      if ($(".mapLoading").hasClass("hidden")) $(".mapLoading").removeClass("hidden")
      $.ajax({
          url: '/save_hallways_point',
          type: 'Post',
          data: {
              'floor_plate_id': typeof fp_id !== 'undefined' ? fp_id : null,
              'sitemap_id': typeof sm_id !== 'undefined' ? sm_id : null,
              'new_point': JSON.stringify(new_point),
              'previous_point': JSON.stringify(previous_point)
          },
          success: function (data) {
              hallways_coordinates = data;
              if (floor_id && fp_id){
                update_hallways_in_floorplate(fp_id, hallways_coordinates)
              }
              draw_initial_hallways(hallways_coordinates, map_id);
              $(".mapLoading").addClass("hidden");
          }
      });

  }
  function update_hallways_in_floorplate(floorplate_id, latest_hallways){
    floor_ids = fetch_floorplate_floors(floorplate_id)
    var building_id;
    if ($('.building_btn_in_auto').length > 0)
      building_id = $('.building_btn_in_auto.autoway_selected').data('building_id')
    
    floor_ids.forEach((floor, index) => {
      if (building_id){
        building_list.forEach((building, indx) => {
          hallways[building][floor] = latest_hallways  
        })
      }
      else
        hallways[floor] = latest_hallways
    });
  }
  function fetch_floorplate_floors(floorplate_id){
    var floor_ids = []
    for (const key in floor_to_floorplate_id) {
      if (floor_to_floorplate_id[key] == floorplate_id){
        floor_ids.push(key)   
      }
    }
    return floor_ids
  }

  function remove_hallwaypoint(current_id) {
      if ($(".mapLoading").hasClass("hidden")) $(".mapLoading").removeClass("hidden")
      $.ajax({
          url: '/delete_hallways_point',
          type: 'Post',
          data: {
              'floor_plate_id': typeof fp_id !== 'undefined' ? fp_id : null,
              'sitemap_id': typeof sm_id !== 'undefined' ? sm_id : null,
              'current_id': current_id,
          },
          success: function (data) {
              hallways_coordinates = data;
              draw_initial_hallways(hallways_coordinates, map_id);
              $(".mapLoading").addClass("hidden");
          }
      });
  }

  function update_hallwaypoint(current_id, x_plot, y_plot) {
      if ($(".mapLoading").hasClass("hidden")) $(".mapLoading").removeClass("hidden")
      $.ajax({
          url: '/update_hallways_point',
          type: 'Post',
          data: {
              'floor_plate_id': typeof fp_id !== 'undefined' ? fp_id : null,
              'sitemap_id': typeof sm_id !== 'undefined' ? sm_id : null,
              'current_id': current_id,
              'x_plot': x_plot,
              'y_plot': y_plot,
          },
          success: function (data) {
              hallways_coordinates = data;
              draw_initial_hallways(hallways_coordinates, map_id);
              $(".mapLoading").addClass("hidden");
          }
      });
  }
  function connect_leaf_point(current_id, previous_id){
    if ($(".mapLoading").hasClass("hidden")) $(".mapLoading").removeClass("hidden")
      $.ajax({
          url: '/connect_leaf_point',
          type: 'Post',
          data: {
              'floor_plate_id': typeof fp_id !== 'undefined' ? fp_id : null,
              'sitemap_id': typeof sm_id !== 'undefined' ? sm_id : null,
              'current_id': current_id,
              'previous_id': previous_id,
          },
          success: function (data) {
              hallways_coordinates = data;
              draw_initial_hallways(hallways_coordinates, map_id);
              $(".mapLoading").addClass("hidden");
          }
      });
  }

  function save_selected_point(previous_id, current_id){
    $.ajax({
          url: '/save_selected_point',
          type: 'Post',
          data: {
              'floor_plate_id': typeof fp_id !== 'undefined' ? fp_id : null,
              'sitemap_id': typeof sm_id !== 'undefined' ? sm_id : null,
              'current_id': current_id,
              'previous_id': previous_id,
          },
          success: function (data) {
            hallways_coordinates.forEach((element, index) => {
              if (element.id == current_id) {
                  hallways_coordinates[index].selected = true;
              } else {
                  hallways_coordinates[index].selected = false;
              }
            });
          }
      }); 
  }

  $(document).keydown(function(event){
      if(event.which=="17")
          cntrlIsPressed = true;
  });

  $(document).keyup(function(){
      cntrlIsPressed = false;
  });

  function icon_click(thiObj) {
      map_id = thiObj.data("map-id")
      $(".fa-dot-circle").css('color', '#008fd4');
      previous_id = $(map_id + " .selected_point").attr('id');
      $(".fa-dot-circle").removeClass('selected_point');
      thiObj.children().css('color', '#f7296a');
      thiObj.children().addClass('selected_point');
      current_id = $(map_id + " .selected_point").attr('id');
      if ($('#hallway_btn').html() === "Stop Plotting Hallways" && cntrlIsPressed){
        connect_leaf_point(current_id, previous_id)
      }
      else{
        save_selected_point(previous_id, current_id)
      }
  }

  function bind_markers() {
    $(".hallways_marker").on('dblclick', function (e) {
      e.stopImmediatePropagation();
      if ($('#hallway_btn').html() === "Stop Plotting Hallways") {
        current_id = parseInt(this.firstChild.id);
        remove_hallwaypoint(current_id, map_id);
      }
    });
  }


  function draw_initial_hallways(hallways_coordinates, map_id = '#map') {
      marker_color = $('#marker_color').html();
      camera_margin = $('#camera-margin').html();
      marker_font_size = ($('#font_size').html());
      left_margin = parseInt($('#left_margin').html());
      right_margin = parseInt($('#right_margin').html());
      $(map_id +" "+ ".line").remove();
      $(map_id +" "+ ".fa-dot-circle").remove();
      for (var i = 0; i < hallways_coordinates.length; i++) {
          selected_color = hallways_coordinates[i].selected ? '#f7296a' : '#008fd4'
          classes = hallways_coordinates[i].selected ? 'fas fa-dot-circle fa-lg selected_point' : 'fas fa-dot-circle fa-lg'
          tag = "<a class='marker ui-draggable ui-draggable-handle hallways_marker' onclick='icon_click($(this))'"+ "data-map-id=" + map_id + " title='id:" + hallways_coordinates[i].id + ' np:' + hallways_coordinates[i].next_points + "'   style='left:" + (hallways_coordinates[i].x_plot) + "px; top:" + (hallways_coordinates[i].y_plot) + "px; z-index:100; position:absolute;'>"
          tag += "<i id='" + hallways_coordinates[i].id + "' class='"+ classes + "' style='width: " + marker_font_size + "px; height: " + marker_font_size + "px; z-index:100; color: "+ selected_color + " ' ></i>";
          tag += "</a>"
          $(map_id).append(tag);
          bind_markers();
          icon_drag(map_id);
      }
      // $(".line").remove();
      for (var i = 0; i < hallways_coordinates.length; i++) {
          hallways_coordinates[i].next_points.forEach((id, index) => {
              for (var j = 0; j < hallways_coordinates.length; j++) {
                  if (id == hallways_coordinates[j].id) {
                      x1 = hallways_coordinates[i].x_plot + 8
                      y1 = hallways_coordinates[i].y_plot + 8
                      x2 = hallways_coordinates[j].x_plot + 8
                      y2 = hallways_coordinates[j].y_plot + 8
                      x = $(map_id).line(x1, y1, x2, y2, {
                          zindex: 99,
                          color: '#000000',
                          stroke: "1",
                          style: "solid",
                          class: "line"
                      });
                  }
              }
          });
      }
  }


  function icon_drag(map_id) {
      var current_dx, current_dy;
      $('.hallways_marker').draggable({
          containment: 'parent',
          stack: ".marker",
          // get the initial X and Y position when dragging starts
          start: function (event, ui) {
              console.log("start drag")
              const zoomContainer = document.querySelector('div.plot-image');
              const key = `${zoomContainer.tagName.toLowerCase()}-${zoomContainer.id}`

              var transform = mapPanZoom?.[key] ? mapPanZoom[key].getTransform() : {};
              var scaleFactor = (1 / (transform.scale || 1));
              ui.position.top = (ui.position.top * scaleFactor) - (transform.y * scaleFactor);
              ui.position.left = (ui.position.left * scaleFactor) - (transform.x * scaleFactor);

              current_dx = (event.pageY - $(map_id).offset().top) / transform.scale - parseInt($(event.target).css('top'));
              current_dy = (event.pageX - $(map_id).offset().left) / transform.scale - parseInt($(event.target).css('left'));
              current_dx = Math.round(ui.position.left)
              current_dy = Math.round(ui.position.top)
          },
          // when dragging stops
          drag: function (event, ui) {
              var canvasTop = $(map_id).offset().top;
              var canvasLeft = $(map_id).offset().left;
              var canvasHeight = $(map_id).height();
              var canvasWidth = $(map_id).width();


              const zoomContainer = document.querySelector('div.plot-image');
              const key = `${zoomContainer.tagName.toLowerCase()}-${zoomContainer.id}`

              var transform = mapPanZoom?.[key] ? mapPanZoom[key].getTransform() : {};
              var scaleFactor = (1 / (transform.scale || 1));
              ui.position.top = (ui.position.top * scaleFactor) - (transform.y * scaleFactor);
              ui.position.left = (ui.position.left * scaleFactor) - (transform.x * scaleFactor);

              if (ui.position.left < 0) ui.position.left = 0;
              if (ui.position.left + $(this).width() > canvasWidth) ui.position.left = canvasWidth - $(this).width();
              if (ui.position.top < 0) ui.position.top = 0;
              if (ui.position.top + $(this).height() > canvasHeight) ui.position.top = canvasHeight - $(this).height();

              // Finally, make sure offset aligns with position
              ui.offset.top = Math.round(ui.position.top + canvasTop);
              ui.offset.left = Math.round(ui.position.left + canvasLeft);

          },
          stop: function (event, ui) {
              $(".line").remove();
              for (var i = 0; i < hallways_coordinates.length; i++) {
                  if (hallways_coordinates[i].x_plot === current_dx && hallways_coordinates[i].y_plot === current_dy) {
                      update_hallwaypoint(hallways_coordinates[i].id, Math.round(ui.position.left), Math.round(ui.position.top))
                  }
              }
          }
      }).on('mousedown touchstart', function (e) {
          if ($('#hallway_btn').html() === "Stop Plotting Hallways") {
              e.stopImmediatePropagation();
              return false;
          }
      });
  }


  function plotting_hallways(thisObj) {
      if (!map_id)
        map_id = "#map"
      if (thisObj.html() == "Start Plotting Hallways") {
          thisObj.removeClass('disable-suggestions-btn').addClass('enable-suggestions-btn');
          thisObj.html("Stop Plotting Hallways")
          $(".multi-select-units").css({"pointer-events": "none"})
          $(map_id).css('cursor', 'crosshair')
          $("<div id='overlay'></div>").css({
              position: "absolute",
              width: "100%",
              height: "100%",
              top: 0,
              left: 0,
              background: "#000000",
              opacity: 0.5
          }).appendTo($(".multi-select-units").css("position", "relative"));
          $('.hallways_marker').draggable('enable')
          $('.floor_btn, .building_btn_in_auto').addClass('disable_btn').removeClass('enable_btn')
      } else {
          thisObj.removeClass('enable-suggestions-btn').addClass('disable-suggestions-btn');
          thisObj.html("Start Plotting Hallways")
          $(".multi-select-units").css({"pointer-events": "auto"})
          $(map_id).css('cursor', 'default');
          $(".multi-select-units").find('#overlay').remove();
          $('.hallways_marker').draggable('disable')
          $('.floor_btn, .building_btn_in_auto').addClass('enable_btn').removeClass('disable_btn')
      }
  }
 
  function points_on_line(x0, y0, x1, y1) {
      var dx = Math.abs(x1 - x0);
      var dy = Math.abs(y1 - y0);
      var sx = (x0 < x1) ? 1 : -1;
      var sy = (y0 < y1) ? 1 : -1;
      var err = dx - dy;

      while (true) {
          // console.log(x0, y0); // Do what you need to for this
          if ((x0 === x1) && (y0 === y1)) break;
          var e2 = 2 * err;
          if (e2 > -dy) {
              err -= dy;
              x0 += sx;
          }
          if (e2 < dx) {
              err += dx;
              y0 += sy;
          }
      }

  }

  var delayed = (function () {
      var queue = [];

      function processQueue() {
          if (queue.length > 0) {
              setTimeout(function () {
                  queue.shift().cb();
                  processQueue();
              }, queue[0].delay);
          }
      }

      return function delayed(delay, cb) {
          queue.push({delay: delay, cb: cb});

          if (queue.length === 1) {
              processQueue();
          }
      };
  }());

  function return_x_y_values(shortest_path_obj){
    // check is there any need to add 17 or 8 in x, y
    if (shortest_path_obj['point_type'] == undefined) // then its hallways
      return [shortest_path_obj["x_plot"] + 8, shortest_path_obj["y_plot"] + 8, 'hallways_point']
    else if (shortest_path_obj['point_type'] == 'unit')
      return [shortest_path_obj["door_x_plot"] + 8, shortest_path_obj["door_y_plot"] + 8, 'unit']
    else if (shortest_path_obj['point_type'] == 'amenity')
      return [shortest_path_obj["door_x_plot"] + 8, shortest_path_obj["door_y_plot"] + 8, 'amenity']
    else if (shortest_path_obj['point_type'] == 'building_starting_point')
      return [shortest_path_obj["building_starting_x_plot"] + 8, shortest_path_obj["building_starting_y_plot"] + 8, 'building_starting_point']
    else if (shortest_path_obj['point_type'] == 'building_starting_exit_point')
      return [shortest_path_obj["building_starting_exit_x_plot"] + 8, shortest_path_obj["building_starting_exit_y_plot"] + 8, 'building_starting_exit_point']
    else if (shortest_path_obj['point_type'] == 'elevator')
      return [shortest_path_obj["elevator_x_plot"] + 8, shortest_path_obj["elevator_y_plot"] + 8, 'elevator']
  }
  function draw_shortest_path(path_object_in_order){

    for (var i = 0; i < (Object.keys(path_object_in_order).length - 1); i++) {
          x0_y0_and_type = return_x_y_values(path_object_in_order[i])
          x1_y1_and_type = return_x_y_values(path_object_in_order[i+1])
          x0 = x0_y0_and_type[0]
          y0 = x0_y0_and_type[1]
          x1 = x1_y1_and_type[0]
          y1 = x1_y1_and_type[1]

          $(".plot-image").line(x0, y0, x1, y1, {
              zindex: 99,
              color: '#ffa500',
              stroke: "5",
              style: "solid",
              class: "line_hello"
          });
      }
  }
  function draw_shortest_path_with_animation(path_object_in_order){
    
    for (var i = 0; i < (Object.keys(path_object_in_order).length - 1); i++) {
        delayed(600, function (i) {
          return function () {
            x0_y0_and_type = return_x_y_values(path_object_in_order[i])
            x1_y1_and_type = return_x_y_values(path_object_in_order[i+1])
            x0 = x0_y0_and_type[0]
            y0 = x0_y0_and_type[1]
            x1 = x1_y1_and_type[0]
            y1 = x1_y1_and_type[1]
            x1_y1_type = x1_y1_and_type[2]

            $(".plot-image").line(x0, y0, x1, y1, {
                zindex: 99,
                color: '#ffa500',
                stroke: "5",
                style: "solid",
                class: "line_hello"
            });
            if (stops_type_arr.includes(x1_y1_type)){
              $(".line").remove();
              $(".line_hello").remove();
            }
            if (i == (Object.keys(path_object_in_order).length - 2) )
              enable_run_algo_btn()
          };
        }(i));
      }
  }
  function enable_run_algo_btn(){
    $('.header_map_btn').removeClass('disable_run_algo').addClass('enable_run_algo').attr("disabled", false);
  }
  function disable_run_algo_btn(){
    $('.header_map_btn').removeClass('enable_run_algo').addClass('disable_run_algo').attr("disabled", true);
  }
  function return_floor_click_button_object(path_object_in_order_length, floor_ids ){
    f_btn_obj = {}
    for (var p = 0; p < floor_ids.length; p++){
      f_btn_obj[p] = p
    }
    j = floor_ids.length - 1
    for (var p = floor_ids.length; p < path_object_in_order_length; p++){
      f_btn_obj[p] = j;
      --j;
    }
    f_btn_obj[(floor_ids.length*2)] = 0
    return f_btn_obj
  }
  function draw_shortest_path_for_floorplate_with_animation(path_object_in_order,floor_ids){
    floor_btn_obj = return_floor_click_button_object(path_object_in_order.length , floor_ids )
    $('.floor_btn')[0].click() // click first floor
    $(".line").remove();
    $(".line_hello").remove();
    for (var i = 0; i < (path_object_in_order.length); i++) {
      for (var j = 0; j < (Object.keys(path_object_in_order[i][1]).length - 1); j++) {
        delayed(500, function (i, j) {
          return function () {
            if (j==0)
              $('.floor_btn')[floor_btn_obj[i]].click()
            x0_y0_and_type = return_x_y_values(path_object_in_order[i][1][j])
            if (path_object_in_order[i][1][j+1]){
              x1_y1_and_type = return_x_y_values(path_object_in_order[i][1][j+1])
              x0 = x0_y0_and_type[0]
              y0 = x0_y0_and_type[1]
              x1 = x1_y1_and_type[0]
              y1 = x1_y1_and_type[1]
              x1_y1_type = x1_y1_and_type[2]
              $("#map_" + path_object_in_order[i][0]).line(x0, y0, x1, y1, {
                  zindex: 99,
                  color: '#ffa500',
                  stroke: "5",
                  style: "solid",
                  class: "line_hello"
              });
              if (stops_type_arr.includes(x1_y1_type)){
                $(".line").remove();
                $(".line_hello").remove();
              }
            }
            if (i == (Object.keys(path_object_in_order).length - 1) &&  j == (Object.keys(path_object_in_order[i][1]).length - 2))
              enable_run_algo_btn()
          };
        }(i, j));
      }
    }
  }
  function click_specific_building_and_floor_if_required(now_building, now_floor, previous_building = null, previous_floor = null){
    if (previous_building == null && previous_floor == null){
      $('a[data-building_id="' + now_building + '"]').click();
      $('a[data-floor_id="' + now_floor + '"]').click();
    }else if (previous_building != now_building && previous_floor != now_floor){
      $('a[data-building_id="' + now_building + '"]').click();
      $('a[data-floor_id="' + now_floor + '"]').click();
    }else if (previous_building == now_building && previous_floor != now_floor){
      $('a[data-floor_id="' + now_floor + '"]').click();
    }else if (previous_building != now_building && previous_floor == now_floor){
      $('a[data-building_id="' + now_building + '"]').click();
    }
  }
  function draw_shortest_path_for_floorplate_multiple_building_with_animation(path_object_in_order,floor_ids){
    $('.building_btn_in_auto')[0].click()
    $('.floor_btn')[0].click() // click first floor
    $(".line").remove();
    $(".line_hello").remove();
    for (var i = 0; i < (path_object_in_order.length); i++) {
      for (var j = 0; j < (Object.keys(path_object_in_order[i][2]).length - 1); j++) {
        delayed(500, function (i, j) {
          return function () {
            if (i==0 && j==0)
              click_specific_building_and_floor_if_required(path_object_in_order[i][0], path_object_in_order[i][0], null, null)
            else if (j==0)
              click_specific_building_and_floor_if_required(path_object_in_order[i][0], path_object_in_order[i][1], path_object_in_order[i - 1][0], path_object_in_order[i - 1][1])
            x0_y0_and_type = return_x_y_values(path_object_in_order[i][2][j])
            if (path_object_in_order[i][2][j+1]){
              x1_y1_and_type = return_x_y_values(path_object_in_order[i][2][j+1])
              x0 = x0_y0_and_type[0]
              y0 = x0_y0_and_type[1]
              x1 = x1_y1_and_type[0]
              y1 = x1_y1_and_type[1]
              x1_y1_type = x1_y1_and_type[2]
              $("#" + path_object_in_order[i][0] +"_map_" + path_object_in_order[i][1]).line(x0, y0, x1, y1, {
                  zindex: 99,
                  color: '#ffa500',
                  stroke: "5",
                  style: "solid",
                  class: "line_hello"
              });
              if (stops_type_arr.includes(x1_y1_type)){
                $(".line").remove();
                $(".line_hello").remove();
              }
            }
            if (i == (Object.keys(path_object_in_order).length - 1) &&  j == (Object.keys(path_object_in_order[i][2]).length - 2))
              enable_run_algo_btn()
          };
        }(i, j));
      }
    }
  }
   function draw_shortest_path_for_floorplate(path_object_in_order,floor_path_type){
    upstair_path_object_in_order = path_object_in_order['upstair_path']
    downstair_path_object_in_order = path_object_in_order['downstair_path']
    moving_to_starting_point_path_object_in_order = path_object_in_order['moving_to_starting_point']
    floor_ids = path_object_in_order['floors']
    if (floor_path_type == "up")
      show_upstair_path(floor_ids, upstair_path_object_in_order)
    else if (floor_path_type == "down")
      show_downstair_path(floor_ids, downstair_path_object_in_order)
    else if (floor_path_type == "starting_point")
      moving_towards_starting_point(floor_ids, moving_to_starting_point_path_object_in_order)
  }
  function show_upstair_path(floor_ids, upstair_path_object_in_order){
    $(".line").remove();
    $(".line_hello").remove();
    for (var i = 0; i < (floor_ids.length); i++) {
      for (var j = 0; j < (Object.keys(upstair_path_object_in_order[floor_ids[i]]).length - 1); j++) {
        x0_y0_and_type = return_x_y_values(upstair_path_object_in_order[floor_ids[i]][j])
        x1_y1_and_type = return_x_y_values(upstair_path_object_in_order[floor_ids[i]][j+1])
        x0 = x0_y0_and_type[0]
        y0 = x0_y0_and_type[1]
        x1 = x1_y1_and_type[0]
        y1 = x1_y1_and_type[1]
        x1_y1_type = x1_y1_and_type[2]
        $("#map_" + floor_ids[i]).line(x0, y0, x1, y1, {
            zindex: 99,
            color: '#ffa500',
            stroke: "5",
            style: "solid",
            class: "line_hello"
        });
      }
    }
  }
  function show_downstair_path(floor_ids, downstair_path_object_in_order){
    reverse_floor_ids = floor_ids.reverse()
    $(".line").remove();
    $(".line_hello").remove();
    for (var i = 0; i < (reverse_floor_ids.length); i++) {
      for (var j = 0; j < (Object.keys(downstair_path_object_in_order[reverse_floor_ids[i]]).length); j++) {
        x0_y0_and_type = return_x_y_values(downstair_path_object_in_order[reverse_floor_ids[i]][j])
        if (downstair_path_object_in_order[reverse_floor_ids[i]][j+1]){
          x1_y1_and_type = return_x_y_values(downstair_path_object_in_order[reverse_floor_ids[i]][j+1])
          x0 = x0_y0_and_type[0]
          y0 = x0_y0_and_type[1]
          x1 = x1_y1_and_type[0]
          y1 = x1_y1_and_type[1]
          x1_y1_type = x1_y1_and_type[2]
          $("#map_" + reverse_floor_ids[i]).line(x0, y0, x1, y1, {
              zindex: 99,
              color: '#ffa500',
              stroke: "5",
              style: "solid",
              class: "line_hello"
          });
        }
      }
    }
  }
  function moving_towards_starting_point(floor_ids, moving_to_starting_point_path_object_in_order){
    $(".line").remove();
    $(".line_hello").remove();
    for (var k = 0; k < (Object.keys(moving_to_starting_point_path_object_in_order).length - 1); k++) {
      x0_y0_and_type = return_x_y_values(moving_to_starting_point_path_object_in_order[k])
      x1_y1_and_type = return_x_y_values(moving_to_starting_point_path_object_in_order[k+1])
      x0 = x0_y0_and_type[0]
      y0 = x0_y0_and_type[1]
      x1 = x1_y1_and_type[0]
      y1 = x1_y1_and_type[1]
      x1_y1_type = x1_y1_and_type[2]
      $("#map_" + floor_ids[0]).line(x0, y0, x1, y1, {
          zindex: 99,
          color: '#ffa500',
          stroke: "5",
          style: "solid",
          class: "line_hello"
      });
    }
  }
  function moving_towards_starting_point_with_animation(floor_ids, moving_to_starting_point_path_object_in_order){
    $(".line").remove();
    $(".line_hello").remove();
    for (var k = 0; k < (Object.keys(moving_to_starting_point_path_object_in_order).length - 1); k++) {
      delayed(500, function (k) {
        return function () {
          x0_y0_and_type = return_x_y_values(moving_to_starting_point_path_object_in_order[k])
          x1_y1_and_type = return_x_y_values(moving_to_starting_point_path_object_in_order[k+1])
          x0 = x0_y0_and_type[0]
          y0 = x0_y0_and_type[1]
          x1 = x1_y1_and_type[0]
          y1 = x1_y1_and_type[1]
          x1_y1_type = x1_y1_and_type[2]
          $("#map_" + floor_ids[0]).line(x0, y0, x1, y1, {
              zindex: 99,
              color: '#ffa500',
              stroke: "5",
              style: "solid",
              class: "line_hello"
          });
        };
      }(k));
    }
  }
  function run_algo(with_animation, path_type, is_sitemap, floor_path_type = ''){
    disable_run_algo_btn();
    community_id = $('#community_id').val()
    $.ajax({
      url: '/automate_plotting/shortest_path',
      type: 'get',
      data: {
        'community_id': community_id,
        'path_type': path_type 
      },
      success: function (data) {
        $(".line").remove();
        $(".line_hello").remove();
        path_object = JSON.parse(data["path_object"])
        if (path_object.length == 0 && is_sitemap)
          alert("please make you have draw connected hallways point")
        else if (path_object.length == 0 && !is_sitemap)
          alert("please make you have draw connected hallways point on each floor")
        else{
          if (is_sitemap){
            if (with_animation)
              draw_shortest_path_with_animation(path_object)
            else
              draw_shortest_path(path_object)
          }else{
            is_multiple_building_community = data["is_multiple_buildings"]
            if (is_multiple_building_community){
              floor_ids = JSON.parse(data["floor_ids"])
              if (with_animation)
                draw_shortest_path_for_floorplate_multiple_building_with_animation(path_object, floor_ids)
              else
                draw_shortest_path_for_floorplate_multiple_building(path_object, floor_ids) // This function funtionality is OnHold for now
            }
            else{
              floor_ids = JSON.parse(data["floor_ids"])
              if (with_animation)
                draw_shortest_path_for_floorplate_with_animation(path_object, floor_ids)
              else
                draw_shortest_path_for_floorplate(path_object, floor_ids) // for now its useless
            }
          }
        }

      },
      fail: function () {
        enable_run_algo_btn();
        alert("please make you have draw connected hallways point")
      }
    });
  }