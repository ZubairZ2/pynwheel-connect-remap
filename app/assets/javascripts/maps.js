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
    $("#map").click(function (event) {
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
                    event.preventDefault();
                    $('#new-aj-popup #x_plot').val(dx);
                    $('#new-aj-popup #y_plot').val(dy);
                    if (addmode) {
                        //$('#map-marker').css({left: (dx-8)+"px", top: (dy-10)+"px", display: "block"});
                        $('#map-marker').css({left: (dx) + "px", top: (dy) + "px", display: "block"});
                        $("#new-aj-popup").show();
                    }
                } else {
                    if ($('#hallway_btn').length) {
                        console.log("Clicked");
                        console.log(dx);
                        console.log(dy);
                        var points = {dx: dx, dy: dy};
                        hallways_coordinates.push(points);
                        tag = "<a ondblclick='remove_icon($(this))' class='marker ui-draggable ui-draggable-handle'   style='left:" + (dx) + "px; top:" + (dy) + "px; z-index:100; position:absolute;'>"
                        tag += "<i class='fas fa-dot-circle'  style='width: " + marker_font_size + "px; height: " + marker_font_size + "px; z-index:100;  ' ></i>";
                        tag += "</a>"
                        // tag = "<i class='fas fa-map-marker-alt' style='color: " + '#00FFFF' + ";  left:" + (dx -left_margin) + "px; top:" + (dy - right_margin) + "px; position:absolute; font-size: " + 14 + "px;'></i>";
                        $('#map').append(tag);
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
    $("#new").click(function (e) {
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


function remove_icon(thisObj) {
    dx = thisObj.position().left
    dy = thisObj.position().top
    thisObj.remove();
    this.hallways_coordinates = $.grep(hallways_coordinates, function (data) {
        return data.dx != dx && data.dy != dy;
    });
    draw_line(hallways_coordinates);
}

function draw_line(hallways_coordinates) {
    $(".line").remove();
    for (var i = 0; i < hallways_coordinates.length - 1; i++) {
        console.log(hallways_coordinates[i]);
        x1 = hallways_coordinates[i].dx + 8
        y1 = hallways_coordinates[i].dy + 8
        x2 = hallways_coordinates[i + 1].dx + 8
        y2 = hallways_coordinates[i + 1].dy + 8
        x = $(".plot-image").line(x1, y1, x2, y2, {
            zindex: 99,
            color: '#000000',
            stroke: "1",
            style: "solid",
            class: "line"
        });
    }
}

function icon_drag() {
    // marker move
    var current_dx, current_dy;

    $('.marker').draggable({
        containment: 'parent',
        stack: ".marker",
        // get the initial X and Y position when dragging starts
        start: function (event, ui) {
            console.log("start drag")
            current_dx = ui.position.left;
            current_dy = ui.position.top;
        },
        // when dragging stops
        drag: function (event, ui) {

        },
        stop: function (event, ui) {
            $(".line").remove();
            for (var i = 0; i < hallways_coordinates.length; i++) {
                if (hallways_coordinates[i].dx === current_dx && hallways_coordinates[i].dy === current_dy) {
                    hallways_coordinates[i].dx = ui.position.left
                    hallways_coordinates[i].dy = ui.position.top
                }
            }
            draw_line(hallways_coordinates);

        }
    });
}

