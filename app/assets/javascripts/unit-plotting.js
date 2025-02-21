//= require common_functions

// save an individual unit (even if same x/y)
function savePlot (id, dx, dy, door_id = 0, pointerData = {}) {
    if (typeof floorplan_id !== 'undefined') {
        saveFloorplanPlot(id, dx, dy);
    } else if (typeof floorplate_id !== 'undefined') {
        if (adddoorsmode)
            saveUnitDoorPlot(id, dx, dy);
        else
            saveFloorplateUnit(id, dx, dy, pointerData);
    } else if (typeof sitemap_id !== 'undefined') {
        if (adddoorsmode)
            saveUnitDoorPlot(id, dx, dy);
        else
            saveSiteMapUnit(id, dx, dy, pointerData);
    } else if (typeof floorplate_id_for_amenity !== 'undefined') {
        if (adddoorsmode)
            saveAmenityDoorPlot(id, dx, dy, door_id);
        else
            saveAmenityPlotForFloorplate(id, dx, dy);
    } else if (typeof sitemap_id_for_amenity !== 'undefined') {
        if (adddoorsmode)
            saveAmenityDoorPlot(id, dx, dy, door_id);
        else
            saveAmenityPlotForSitemap(id, dx, dy);
    } else if (typeof floorplate_id_for_elevator !== 'undefined') {
        saveElevatorPlotForFloorplate(id, dx, dy);
    } else if (typeof unit_id_for_amenity !== 'undefined') {
        saveAmenityPlotForUnit(id, dx, dy);
    } else if (typeof tour_id !== 'undefined') {
        saveTourStaringPoint(tour_id, dx, dy);
    } else if (typeof tour_id_for_stop !== 'undefined') {
        saveTourStopPoint(id, dx, dy);
    }
}

function saveFloorplateUnit (id, dx, dy, pointerData = {}) {
    var xPlot;
    var yPlot;
    if(addmode){
        xPlot = dx;
        yPlot = dy
    }else{
        xPlot = dx + left_margin;
        yPlot = dy + top_margin
    }
    $.post("/communities/" + community_id + "/units/" + id + "/ajaxplotunitforfloorplate",
        {
            "x_plot": xPlot,
            "y_plot": yPlot,
            "floorplate_id": floorplate_id,
            "pointer": pointerData
        },
        function (data, status, xhr) {
            console.debug(status, "done with ajaxsave ajaxplotunit", id, dx, dy);
            console.debug(data.unit);
            console.debug(data.unit.id);
            console.debug(data.unit.x_plot);
            console.debug(data.unit.y_plot);
            console.debug(data.unit.marketing_name);

            var index = arr.findIndex(unit => unit[0] == data.unit.provider_unit_id);
            arr.splice(index, 1)

            arr.push([data.unit.provider_unit_id, data.unit.x_plot, data.unit.y_plot, true, data.unit.id]);
            doDraggable();
            // delete from unused list
            // $('.amenities-list option').each(function(){
            //   if ($(this).val() == id) {
            //     $(this).remove();
            //   }
            // });

            $('#' + data.unit.provider_unit_id + '-selectable').remove();
            $('#' + data.unit.provider_unit_id + '-selection').remove();
            $(".hint-unit-blink").remove();
        });
}

function saveTourStaringPoint(id, dx, dy) {
    $.post("/communities/" + community_id + "/tours/" + id + "/ajaxplotstartingpoint",
        {
            "x_plot": dx,
            "y_plot": dy,
            "tour_id": tour_id
        },
        function (data, status, xhr) {
            doDraggable();
        });
}

function saveTourStopPoint(id) {
    $.post("/communities/" + community_id + "/tours/" + id + "/ajaxplottourstoppoint", {
            "floor": floor,
            "tour_stop_id": id
        },
        function (data, status, xhr) {
            if (data.tour.stop_type == "unit") {
                $('.tour_sortable_disabled').append("<tr id=\"TourStop_" + data.tour.id + "\" class=\"ui-sortable-handle\">\n" +
                    "<td>" + $(".table").find("tr").length + "</td>\n" +
                    "<td>\n" +
                    data.tour.name +
                    "</td>\n" +
                    "<td>\n" +
                    "</a><a id=\"create_path\" data-idattr=" + data.tour.stop_id + "\" class=\"text-warning ml-5\" href=''><i class=\"fa fa-refresh icon_size\"></i>\n" +
                    "<a class=\"text-success ml-5\" href=\"/communities/" + data.community.id + "/units/" + data.tour.stop_id + "/edit\"><i class=\"fa fa-edit icon_size\"></i>\n" +
                    "</a><a class=\"text-danger\" data-href=\"/communities/" + data.community.id + "/tours/" + data.tour.tour_id + "/tour_stops/" + data.tour.id + "\" data-name=\"Tour Stop\" data-target=\"#confirm-delete\" data-toggle=\"modal\">\n" +
                    "<i class=\"fa fa-trash icon_size\"></i>\n" +
                    "</a>\n" +
                    "</td>\n" +
                    "</tr>")
            } else {
                $('.tour_sortable_disabled').append("<tr id=\"TourStop_" + data.tour.id + "\" class=\"ui-sortable-handle\">\n" +
                    "<td>" + $(".table").find("tr").length + "</td>\n" +
                    "<td>\n" +
                    data.tour.name +
                    "</td>\n" +
                    "<td>\n" +
                    "</a><a id=\"create_path\" data-idattr=" + data.tour.stop_id + "\" class=\"text-warning ml-5\" href=''><i class=\"fa fa-refresh icon_size\"></i>\n" +
                    "<a class=\"text-success ml-5\" href=\"/communities/" + data.community.id + "/amenities/" + data.tour.stop_id + "/edit\"><i class=\"fa fa-edit icon_size\"></i>\n" +
                    "</a><a class=\"text-danger\" data-href=\"/communities/" + data.community.id + "/tours/" + data.tour.tour_id + "/tour_stops/" + data.tour.id + "\" data-name=\"Tour Stop\" data-target=\"#confirm-delete\" data-toggle=\"modal\">\n" +
                    "<i class=\"fa fa-trash icon_size\"></i>\n" +
                    "</a>\n" +
                    "</td>\n" +
                    "</tr>")
            }
            window.location.reload(true);
        });
}

function saveFloorplanPlot(id, dx, dy) {
    $.post("/communities/" + community_id + "/floorplans/" + floorplan_id + "/amenities/" + id + "/plot_amenity",
        {
            "x_plot": dx,
            "y_plot": dy,
        },
        function (data, status, xhr) {
            console.debug(status, "done with ajaxsave ajaxplotunit", id, dx, dy);
            arr.push([data.amenity.id, data.amenity.x_plot, data.amenity.y_plot, true, data.amenity.name]);
            doDraggable();
            // delete from unused list
            $('.amenities-list option').each(function () {
                if ($(this).val() == id) {
                    $(this).remove();
                }
            });
        });
}

function saveAmenityPlotForFloorplate(id, dx, dy) {
    $.post("/communities/" + community_id + "/floorplates/" + floorplate_id_for_amenity + "/amenities/" + id + "/plot_amenity",
        {
            "x_plot": dx,
            "y_plot": dy,
            "floor": floor
        },
        function (data, status, xhr) {
            console.debug(status, "done with ajaxsave ajaxplotunit", id, dx, dy);

            var index = arr.findIndex(amenity => amenity[0] == data.amenity.id);
            arr.splice(index, 1)

            arr.push([data.amenity.id, data.amenity.x_plot, data.amenity.y_plot, true, data.amenity.name]);
            doDraggable();
            // delete from unused list
            $('.amenities-list option').each(function () {
                if ($(this).val() == id) {
                    $(this).remove();
                }
            });
            //  window.location.reload(true);
        });
}

function saveElevatorPlotForFloorplate(id, dx, dy) {

    $.post("/communities/" + community_id + "/floorplates/" + floorplate_id_for_elevator + "/elevators/" + id + "/plot_elevator",
        {
            "x_plot": dx,
            "y_plot": dy,
        },
        function (data, status, xhr) {
            console.debug(status, "done with ajaxsave ajaxplotunit", id, dx, dy);
            arr.push([data.elevator.id, data.elevator.x_plot, data.elevator.y_plot, true, data.elevator.name]);
            doDraggable();
            // delete from unused list
            $('.amenities-list option').each(function () {
                if ($(this).val() == id) {
                    $(this).remove();
                }
            });
        });
}

function saveAmenityPlotForUnit(id, dx, dy) {
    $.post("/communities/" + community_id + "/units/" + unit_id_for_amenity + "/amenities/" + id + "/plot_amenity",
        {
            "x_plot": dx,
            "y_plot": dy,
        },
        function (data, status, xhr) {
            console.debug(status, "done with ajaxsave ajaxplotunit", id, dx, dy);
            arr.push([data.amenity.id, data.amenity.x_plot, data.amenity.y_plot, true, data.amenity.name]);
            doDraggable();
            // delete from unused list
            $('.amenities-list option').each(function () {
                if ($(this).val() == id) {
                    $(this).remove();
                }
            });
        });
}

function saveSiteMapUnit (id, dx, dy, pointerData = {}) {
    var xPlot;
    var yPlot;
    if(addmode){
        xPlot = dx;
        yPlot = dy
    }else{
        xPlot = dx + left_margin;
        yPlot = dy + top_margin
    }
    $.post("/communities/" + community_id + "/units/" + id + "/ajaxplotunit",
        {
            "x_plot": xPlot,
            "y_plot": yPlot,
            "pointer": pointerData
        },
        function (data, status, xhr) {
            console.debug(status, "done with ajaxsave ajaxplotunit", id, dx, dy);
            console.debug(data.unit);
            console.debug(data.unit.id);
            console.debug(data.unit.x_plot);
            console.debug(data.unit.y_plot);
            console.debug(data.unit.marketing_name);

            var index = arr.findIndex(unit => unit[0] == data.unit.provider_unit_id);
            arr.splice(index, 1)

            arr.push([data.unit.provider_unit_id, data.unit.x_plot, data.unit.y_plot, true, data.unit.id]);
            doDraggable();
            // delete from unused list
            // $('.amenities-list option').each(function(){
            //   if ($(this).val() == id) {
            //     $(this).remove();
            //   }
            // });

            $('#' + data.unit.provider_unit_id + '-selectable').remove();
            $('#' + data.unit.provider_unit_id + '-selection').remove();
            $(".hint-unit-blink").remove();
        });
}

function plotMode(selected) {
    console.log("new marked is created")
    addmode = true;
    $("#newmsg").css({display: 'inline-block'});
    $("#map").css('cursor', 'crosshair');
}

$(document).on("click", ".s-unit", function () {
    //selected.splice( $.inArray("1001", selected), 1 )
    var remove_index = parseInt($(this).attr("data-id"))
    selected.splice(remove_index, remove_index + 1)
    var data_provider_unit_id = $(this).attr("data-provider-unit-id");
    //$('.amenities-list option').val($(this).attr("data-unit-provider-id")).css({"display": "block"})
    $('.amenities-list option[value="' + data_provider_unit_id + '"]').css({"display": "block"})
    $(this).remove()
    if (selected.length > 0)
        resetDataIds()
});

function resetDataIds() {
    var i = 0
    $("#selected-units li").each(function () {
        $(this).attr("data-id", i);
        i++;
    })
}

var arr = [];
var temp = [];
var pointerOffset = { x: 0, y: 0 };

function doDraggable () {
    if (document.querySelector("#map.plot-image")?.dataset.svgUrl) {
        doSvgDraggable();
        return
    }

    console.log("called do draggable")
    // marker move
    var pointerX;
    var pointerY;

    $('.marker').draggable({
        containment: 'parent',
        stack: ".marker",
        // get the initial X and Y position when dragging starts
        start: function (event, ui) {

            console.log("start drag 123")
            var transform = mapPanZoom ? mapPanZoom.getTransform() : {};
            var scaleFactor = (1 / (transform.scale || 1));
            ui.position.top = (ui.position.top * scaleFactor) - (transform.y * scaleFactor);
            ui.position.left = (ui.position.left * scaleFactor) - (transform.x * scaleFactor);

            pointerY = (event.pageY - $('#map').offset().top) / transform.scale - parseInt($(event.target).css('top'));
            pointerX = (event.pageX - $('#map').offset().left) / transform.scale - parseInt($(event.target).css('left'));

            if (is_ui_a_door(ui))
                start__door_work(event, ui)
            else if (is_ui_a_accesspoint(ui))
                start__access_point(event, ui)
            else
                start__original_work(event, ui)
        },
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


            xmove = ui.position.left - xpos;
            ymove = ui.position.top - ypos;

            if (is_ui_a_door(ui))
                drag__door_work(event, ui)
            else if (is_ui_a_accesspoint(ui))
                drag__access_point(event, ui)
            else
                drag__original_work(event, ui)

        },
        stop: function (event, ui) {
            if (is_ui_a_door(ui))
                stop__door_work(event, ui)
            else if (is_ui_a_accesspoint(ui))
                stop__access_point(event, ui)
            else
                stop__original_work(event, ui)
        }

    }).on('mousedown touchstart', function (e) {
        e.stopImmediatePropagation();
        return false;
    })
}


function doSvgDraggable() {
    $('.marker').draggable({
        containment: 'parent',
        stack: ".marker",
        // get the initial X and Y position when dragging starts
        start: function (event, ui) {
            console.log("start drag");
            const transform = mapPanZoom ? mapPanZoom.getTransform() : { scale: 1, x: 0, y: 0 };

            ui.position.left = (ui.position.left - transform.x) / transform.scale;
            ui.position.top = (ui.position.top - transform.y) / transform.scale;

            if (is_ui_a_door(ui))
                start__door_work(event, ui)
            else if (is_ui_a_accesspoint(ui))
                start__access_point(event, ui)
            else
                start_svg_original_work(event, ui, transform.scale)
        },
        drag: function (event, ui) {
            const transform = mapPanZoom ? mapPanZoom.getTransform() : { scale: 1, x: 0, y: 0 };

            ui.position.left = (event.pageX - $('#map').offset().left - pointerOffset.x) / transform.scale;
            ui.position.top = (event.pageY - $('#map').offset().top - pointerOffset.y) / transform.scale;

            const canvasWidth = $('#map').width();
            const canvasHeight = $('#map').height();
            ui.position.left = Math.max(0, Math.min(ui.position.left, canvasWidth - $(this).width()));
            ui.position.top = Math.max(0, Math.min(ui.position.top, canvasHeight - $(this).height()));

            if (is_ui_a_door(ui))
                drag__door_work(event, ui)
            else if (is_ui_a_accesspoint(ui))
                drag__access_point(event, ui)
            else
                drag_svg_original_work(event, ui)

        },
        stop: function (event, ui) {
            if (is_ui_a_door(ui))
                stop__door_work(event, ui)
            else if (is_ui_a_accesspoint(ui))
                stop__access_point(event, ui)
            else
                stop_svg_original_work(event, ui)
        }

    }).on('mousedown touchstart', function (e) {
        e.stopImmediatePropagation();
        return false;
    })
}

function reset() {
    addmode = false;
    adddoorsmode = false;
    accesspointplot = false;
    selected = [];
    dx = 0;
    dy = 0;
    $("#map").css('cursor', 'default');
    $("#selected-units").empty();
    $("#newmsg").css({display: 'none'});
    // reset any hidden unused ones that didn't get plotted
    $('.amenities-list option').each(function () {
        $(this).css({"display": "block"});
    });
}

function saveAmenityPlotForSitemap(id, dx, dy) {
    console.log("ready to ajaxsave ajaxplotunit", id, dx, dy);
    $.post("/communities/" + community_id + "/sitemaps/" + sitemap_id_for_amenity + "/amenities/" + id + "/plot_amenity",
        {
            "x_plot": dx,
            "y_plot": dy
        },
        function (data, status, xhr) {
            console.debug(status, "done with ajaxsave ajaxplotunit", id, dx, dy);

            var index = arr.findIndex(amenity => amenity[0] == data.amenity.id);
            arr.splice(index, 1)

            arr.push([data.amenity.id, data.amenity.x_plot, data.amenity.y_plot, true, data.amenity.name]);
            doDraggable();
            // delete from unused list
            $('.amenities-list option').each(function () {
                if ($(this).val() == id) {
                    $(this).remove();
                }
            });
        });
}


function removeUnitFromSelectedArray(value) {
    console.log("Selected Units Before: ", selected);
    for (i = 0; i < selected.length; i++) {
        if (selected[i][0] == value) {
            selected.splice(i, 1);
            $(`.suggested-circle-${value}`).remove();
            // selected.splice(i, i + 1);
            
        }
    }
    console.log("Selected Units After: ", selected);

}


function start__original_work(event, ui) {
    // get the initial X and Y position when dragging starts
    xpos = Math.round(ui.position.left);
    ypos = Math.round(ui.position.top);

    xpos1 = xpos+2;     // for new markers
    ypos1 = ypos+24;    // for new markers
    // temp array of just markers at same x/y
    temp = [];

    if (arr != null) {
        for (i = 0; i < arr.length; i++) {
            if ((arr[i][1] == xpos && arr[i][2] == ypos) || (arr[i][1] == xpos1 && arr[i][2] == ypos1)) {
                // alert(arr[i]);
                // alert(arr[i][0]);
                temp.push(arr[i][0])
            }
        }
    }
}

function drag__original_work(event, ui) {

    if (temp != null) {
        for (i = 0; i < temp.length; i++) {
            $('#m_' + temp[i]).css({"left": Math.round(ui.position.left), "top": Math.round(ui.position.top)});
        }
    }
}

function stop__original_work(event, ui) {
    if (temp != null) {
        for (i = 0; i < temp.length; i++) {
            console.log("stop drag", temp[i], Math.round(ui.position.left), Math.round(ui.position.top));
            for (j = 0; j < arr.length; j++) {
                if (arr[j][0] == temp[i]) {       // computationally expensive, I will try to do this in one iteration
                    $('#m_' + temp[i]).parent().css({
                        "left": Math.round(ui.position.left),
                        "top": Math.round(ui.position.top)
                    });
                    arr[j][1] = Math.round(ui.position.left);
                    arr[j][2] = Math.round(ui.position.top);
                }
            }
            // alert(temp[i]);
            savePlot(temp[i], Math.round(ui.position.left), Math.round(ui.position.top));
        }
    }
}


function start_svg_original_work(event, ui, scale) {
    const xpos = Math.round(ui.helper[0].offsetLeft);
    const ypos = Math.round(ui.helper[0].offsetTop);

    temp = [];
    if (arr) {
        temp = arr.filter((marker) => (marker[1] === xpos && marker[2] === ypos)).map((marker) => marker[0]);
    }

    pointerOffset.x = left_margin * scale;
    pointerOffset.y = top_margin * scale;
}

function drag_svg_original_work(event, ui) {
    if (temp) {
        temp.forEach((markerId) => {
            $(`#m_${markerId}`).css({
                left: Math.round(ui.position.left),
                top: Math.round(ui.position.top),
            });
        });
    }
}

function stop_svg_original_work (event, ui) {
    if (temp) {
        temp.forEach((markerId, i) => {
            console.log("stop drag", markerId, Math.round(ui.position.left), Math.round(ui.position.top));
            const markerIndex = arr.findIndex((marker) => marker[0] === markerId);
            const xPlot = Math.round(ui.position.left);
            const yPlot = Math.round(ui.position.top);
            if (markerIndex !== -1) {
                arr[markerIndex][1] = xPlot;
                arr[markerIndex][2] = yPlot;
            }

            const { element, centerPoint } = getSvgClickedElementWithCenterPoint("#map.plot-image", event);
            if (element) {
                const elId = element.id
                const selector = elId ? null : getElementSelector(element);
                const dataSet = { tag: element.tagName?.toLowerCase(), id: elId, selector }
                savePlot(temp[i], centerPoint.x, centerPoint.y, null, dataSet);
            } else
                savePlot(temp[i], xPlot, yPlot);
        });
    }
}