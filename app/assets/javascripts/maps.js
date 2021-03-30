/* Author: Greg Ryan, Pynwheel, Inc.
   Editor: Alexey Klimuk, Softensity, Inc.
 * sitemap, floorplate, amenity map plotting
*/
var hallways_coordinates = []
$(window).on('load', function () {
    /**
     * map controls
     */
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

    // show mousemove x/y
    $('#map').mousemove(function (event) {
        var dx = parseInt(event.pageX) - parseInt($('#map').offset().left) + parseInt($('#map').scrollLeft());
        var dy = parseInt(event.pageY) - parseInt($('#map').offset().top) + parseInt($('#map').scrollTop());
        $('#active_x_plot').html(dx);
        $('#active_y_plot').html(dy);
    });

    // place maker on click
    var DELAY = 250, clicks = 0, timer = null;
    $("#map").click(function (e) {
        clicks++;  //count clicks
        if (clicks === 1) {
            timer = setTimeout(function () {
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
                } else {
                    if ($("#hallway_btn").html() == "Stop Plotting Hallways") {
                        console.log("Clicked");
                        dx = e.type === 'touchend' ? ((e.changedTouches[0].pageX - elemPos.left)) : parseInt($('#active_x_plot').html());
                        dy = e.type === 'touchend' ? ((e.changedTouches[0].pageY - elemPos.top)) : parseInt($('#active_y_plot').html());
                        var transform = mapPanZoom ? mapPanZoom.getTransform() : {};
                        var scaleFactor = (1 / (transform.scale || 1));
                        dx = (dx * scaleFactor) - (e.type === 'touchend' ? (transform.x * scaleFactor) : (10 * scaleFactor));
                        dy = (dy * scaleFactor) - (e.type === 'touchend' ? (transform.y * scaleFactor) : (10 * scaleFactor));
                        dx = Math.round(dx);
                        dy = Math.round(dy);
                        var points = {x_plot: dx, y_plot: dy};
                        hallways_coordinates.push(points);
                        tag = "<a class='marker ui-draggable ui-draggable-handle hallways_marker'   style='left:" + (dx) + "px; top:" + (dy) + "px; z-index:100; position:absolute;'>"
                        tag += "<i class='fas fa-dot-circle'  style='width: " + marker_font_size + "px; height: " + marker_font_size + "px; z-index:100;  ' ></i>";
                        tag += "</a>"
                        // tag = "<i class='fas fa-map-marker-alt' style='color: " + '#00FFFF' + ";  left:" + (dx -left_margin) + "px; top:" + (dy - right_margin) + "px; position:absolute; font-size: " + 14 + "px;'></i>";
                        $('#map').append(tag);
                        bind_markers();
                        draw_line(hallways_coordinates);
                        icon_drag();
                    }
                }
                clicks = 0;             //after action performed, reset counter
            }, DELAY);

        } else {
            clearTimeout(timer);    //prevent single-click action
            clicks = 0;             //after action performed, reset counter
        }
    });


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
    $("#new").click(function(e) {
      debugger
      console.log("new marked is created")
      addmode = true;
      $("#newmsg").css({display: 'inline-block'});
      e.preventDefault();
    });

    // map thumbnail scroller
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
    addmode = (window.isamenity === undefined ? false : true);

});


// function remove_icon(thisObj) {
//     debugger;
//     if ($('#hallway_btn').html() === "Stop Plotting Hallways") {
//
//         // dx = parseInt($('#active_x_plot').html());
//         // dy = parseInt($('#active_y_plot').html());
//         dx = thisObj.parent().offset().left
//         dy = thisObj.parent().offset().top
//         var transform = mapPanZoom ? mapPanZoom.getTransform() : {};
//         var scaleFactor = (1 / (transform.scale || 1));
//         dx = (dx * scaleFactor) - (10 * scaleFactor);
//         dy = (dy * scaleFactor) - (10 * scaleFactor);
//         debugger;
//         thisObj.remove();
//         this.hallways_coordinates = $.grep(hallways_coordinates, function (data) {
//             return data.x_plot != dx && data.y_plot != dy;
//         });
//         draw_line(hallways_coordinates);
//     }
//
// }
function bind_markers() {
    $(".hallways_marker").on('dblclick', function (e) {
        if ($('#hallway_btn').html() === "Stop Plotting Hallways") {
            dx = Math.round(this.offsetLeft)
            dy = Math.round(this.offsetTop)
            this.remove();
            hallways_coordinates = $.grep(hallways_coordinates, function (data) {
                return data.x_plot != dx && data.y_plot != dy;
            });
            draw_line(hallways_coordinates);
        }
    });
}

function draw_line(hallways_coordinates) {
    $(".line").remove();
    for (var i = 0; i < hallways_coordinates.length - 1; i++) {
        console.log(hallways_coordinates[i]);
        x1 = hallways_coordinates[i].x_plot + 8
        y1 = hallways_coordinates[i].y_plot + 8
        x2 = hallways_coordinates[i + 1].x_plot + 8
        y2 = hallways_coordinates[i + 1].y_plot + 8
        x = $(".plot-image").line(x1, y1, x2, y2, {
            zindex: 99,
            color: '#000000',
            stroke: "1",
            style: "solid",
            class: "line"
        });
    }
    hallways_ajax();
}

function draw_initial_hallways(hallways_coordinates) {
    marker_color = $('#marker_color').html();
    camera_margin = $('#camera-margin').html();
    marker_font_size = ($('#font_size').html());
    left_margin = parseInt($('#left_margin').html());
    right_margin = parseInt($('#right_margin').html());
    for (var i = 0; i < hallways_coordinates.length; i++) {
        tag = "<a class='marker ui-draggable ui-draggable-handle hallways_marker'   style='left:" + (hallways_coordinates[i].x_plot) + "px; top:" + (hallways_coordinates[i].y_plot) + "px; z-index:100; position:absolute;'>"
        tag += "<i class='fas fa-dot-circle'  style='width: " + marker_font_size + "px; height: " + marker_font_size + "px; z-index:100;  ' ></i>";
        tag += "</a>"
        $('#map').append(tag);
        bind_markers();
        icon_drag();
    }

}

function icon_drag() {
    // marker move
    var current_dx, current_dy;

    $('.hallways_marker').draggable({
        containment: 'parent',
        stack: ".marker",
        // get the initial X and Y position when dragging starts
        start: function (event, ui) {
            console.log("start drag")
            var transform = mapPanZoom ? mapPanZoom.getTransform() : {};
            var scaleFactor = (1 / (transform.scale || 1));
            ui.position.top = (ui.position.top * scaleFactor) - (transform.y * scaleFactor);
            ui.position.left = (ui.position.left * scaleFactor) - (transform.x * scaleFactor);

            current_dx = (event.pageY - $('#map').offset().top) / transform.scale - parseInt($(event.target).css('top'));
            current_dy = (event.pageX - $('#map').offset().left) / transform.scale - parseInt($(event.target).css('left'));
            current_dx = Math.round(ui.position.left)
            current_dy = Math.round(ui.position.top)
        },
        // when dragging stops
        drag: function (event, ui) {
            var canvasTop = $('#map').offset().top;
            var canvasLeft = $('#map').offset().left;
            var canvasHeight = $('#map').height();
            var canvasWidth = $('#map').width();


            var transform = mapPanZoom ? mapPanZoom.getTransform() : {};
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
                    hallways_coordinates[i].x_plot = Math.round(ui.position.left)
                    hallways_coordinates[i].y_plot = Math.round(ui.position.top)
                }
            }
            draw_line(hallways_coordinates);

        }
    }).on('mousedown touchstart', function (e) {
        if ($('#hallway_btn').html() === "Stop Plotting Hallways") {
            e.stopImmediatePropagation();
            return false;
        }
    });
    ;
}

function hallways_ajax() {
    $.ajax({
        url: '/save_hallways_point',
        type: 'Post',
        data: {
            'floor_plate_id': typeof fp_id !== 'undefined' ? fp_id : null,
            'sitemap_id': typeof sm_id !== 'undefined' ? sm_id : null,
            'hallway_points': JSON.stringify(hallways_coordinates)
        },
    });
}

function plotting_hallways(thisObj) {
    if (thisObj.html() == "Start Plotting Hallways") {
        thisObj.html("Stop Plotting Hallways")
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
        $('.hallways_marker').draggable('enable')
    } else {
        thisObj.html("Start Plotting Hallways")
        $(".multi-select-units").css({"pointer-events": "auto"})
        $("#map").css('cursor', 'default');
        $(".multi-select-units").find('#overlay').remove();
        $('.hallways_marker').draggable('disable')
    }
}