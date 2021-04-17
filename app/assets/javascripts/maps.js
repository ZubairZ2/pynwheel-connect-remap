/* Author: Greg Ryan, Pynwheel, Inc.
   Editor: Alexey Klimuk, Softensity, Inc.
 * sitemap, floorplate, amenity map plotting
*/
var hallways_coordinates = []
var tmp_id = 0;
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
    $("#map").click(function (e) {

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
        if ($("#hallway_btn").html() == "Stop Plotting Hallways" && e.target == $('#viewArea').get(0)) {
            dx = e.type === 'touchend' ? ((e.changedTouches[0].pageX - elemPos.left)) : parseInt($('#active_x_plot').html());
            dy = e.type === 'touchend' ? ((e.changedTouches[0].pageY - elemPos.top)) : parseInt($('#active_y_plot').html());
            var transform = mapPanZoom ? mapPanZoom.getTransform() : {};
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
            add_hallwaypoint(new_point, previous_point);
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
    $("#new").click(function (e) {
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

function add_hallwaypoint(new_point, previous_point) {
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
            draw_initial_hallways();
            $(".mapLoading").addClass("hidden");
        }
    });

}

function remove_hallwaypoint(current_id, previous_id) {
    if ($(".mapLoading").hasClass("hidden")) $(".mapLoading").removeClass("hidden")
    $.ajax({
        url: '/delete_hallways_point',
        type: 'Post',
        data: {
            'floor_plate_id': typeof fp_id !== 'undefined' ? fp_id : null,
            'sitemap_id': typeof sm_id !== 'undefined' ? sm_id : null,
            'current_id': current_id,
            'previous_id': previous_id,
        },
        success: function (data) {
            hallways_coordinates = data;
            draw_initial_hallways();
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
            draw_initial_hallways();
            $(".mapLoading").addClass("hidden");
        }
    });
}

function icon_click(thiObj) {
    $(".fa-dot-circle").css('color', '#008fd4');
    previous_id = $(".selected_point").attr('id');
    $(".fa-dot-circle").removeClass('selected_point');
    thiObj.children().css('color', '#f7296a');
    thiObj.children().addClass('selected_point');
    current_id = $(".selected_point").attr('id');
    hallways_coordinates.forEach((element, index) => {
        if (element.id == current_id) {
            hallways_coordinates[index].selected = true;
        } else {
            hallways_coordinates[index].selected = false;
        }
    });
}

function bind_markers() {
    $(".hallways_marker").on('dblclick', function (e) {
            e.stopImmediatePropagation();
            if ($('#hallway_btn').html() === "Stop Plotting Hallways") {
                current_index = undefined;
                previous_index = undefined;
                current_id = parseInt(this.firstChild.id);
                previous_id = undefined;
                hallways_coordinates.forEach((element, index) => {
                    if (element.id == current_id) {
                        current_index = index;
                    }
                    if (element.next_points.includes(current_id)) {
                        previous_index = index;
                        previous_id = element.id;
                    }
                });
                if (previous_index != undefined) {
                    if (hallways_coordinates[current_index].next_points.length == 0) {
                        remove_hallwaypoint(current_id, previous_id);
                    } else {
                        alert("You Cannot delete this point");
                    }
                } else if (hallways_coordinates.length == 1) {
                    remove_hallwaypoint(current_id, previous_id);
                } else {
                    alert("You Cannot delete this point");
                }

            }
        }
    );
}


function draw_initial_hallways() {
    marker_color = $('#marker_color').html();
    camera_margin = $('#camera-margin').html();
    marker_font_size = ($('#font_size').html());
    left_margin = parseInt($('#left_margin').html());
    right_margin = parseInt($('#right_margin').html());
    $(".line").remove();
    $(".fa-dot-circle").remove();
    for (var i = 0; i < hallways_coordinates.length; i++) {
        $(".fa-dot-circle").css('color', '#008fd4');
        tag = "<a class='marker ui-draggable ui-draggable-handle hallways_marker' onclick='icon_click($(this))' title='id:" + hallways_coordinates[i].id + ' np:' + hallways_coordinates[i].next_points + "'   style='left:" + (hallways_coordinates[i].x_plot) + "px; top:" + (hallways_coordinates[i].y_plot) + "px; z-index:100; position:absolute;'>"
        tag += "<i id='" + hallways_coordinates[i].id + "' class='fas fa-dot-circle fa-lg selected_point'  style='width: " + marker_font_size + "px; height: " + marker_font_size + "px; z-index:100; color: #f7296a ' ></i>";
        tag += "</a>"
        $('#map').append(tag);
        bind_markers();
        icon_drag();
    }
    $(".line").remove();
    for (var i = 0; i < hallways_coordinates.length - 1; i++) {
        hallways_coordinates[i].next_points.forEach((id, index) => {
            for (var j = 0; j < hallways_coordinates.length; j++) {
                if (id == hallways_coordinates[j].id) {
                    x1 = hallways_coordinates[i].x_plot + 8
                    y1 = hallways_coordinates[i].y_plot + 8
                    x2 = hallways_coordinates[j].x_plot + 8
                    y2 = hallways_coordinates[j].y_plot + 8
                    x = $(".plot-image").line(x1, y1, x2, y2, {
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


function icon_drag() {
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


function automate_path() {
    hallways_coordinates.forEach((point, index) => {
        hallways_coordinates[index].next_points.forEach((element, i) => {
            delayed(1000, function (i, j) {
                return function () {
                    let obj = hallways_coordinates.find(o => o.id == element);
                    x1 = point.x_plot + 8
                    y1 = point.y_plot + 8
                    x2 = obj.x_plot + 8
                    y2 = obj.y_plot + 8
                    $(".line").remove();
                    $(".plot-image").line(x1, y1, x2, y2, {
                        zindex: 99,
                        color: '#FF0000',
                        stroke: "5",
                        style: "solid",
                        class: "line"
                    });
                    points_on_line(x1 - 8, y1 - 8, x2 - 8, y2 - 8);
                };
            }(index, i));
        });
    });
    setTimeout(function () {
        draw_initial_hallways();
    }, hallways_coordinates.length * 1200);
}

function points_on_line(x0, y0, x1, y1) {
    var dx = Math.abs(x1 - x0);
    var dy = Math.abs(y1 - y0);
    var sx = (x0 < x1) ? 1 : -1;
    var sy = (y0 < y1) ? 1 : -1;
    var err = dx - dy;
    console.log("Test")
    while (true) {
        console.log(x0, y0); // Do what you need to for this
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
    console.log("Test1")
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
