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
            saveAmenityPlotForFloorplate(id, dx, dy, pointerData);
    } else if (typeof sitemap_id_for_amenity !== 'undefined') {
        if (adddoorsmode)
            saveAmenityDoorPlot(id, dx, dy, door_id);
        else
            saveAmenityPlotForSitemap(id, dx, dy, pointerData);
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
    console.log("ready to ajaxsave FloorplateUnit", addmode, parsedSVGs.length, left_margin, top_margin, id, dx, dy);

    const payload = svgMode ? {
        "pointer": pointerData
    } : {
        "x_plot": dx,
        "y_plot": dy,
    }

    payload.floorplate_id = floorplate_id;

    $.post("/communities/" + community_id + "/units/" + id + "/ajaxplotunitforfloorplate",
        payload,
        function (data, status, xhr) {
            console.debug(status, "done with ajaxsave ajaxplotunit", id, dx, dy);
            console.debug(data.unit);
            console.debug(data.unit.id);
            console.debug(data.unit.x_plot);
            console.debug(data.unit.y_plot);
            console.debug(data.unit.marketing_name);

            const index = unitsArr.findIndex(
                ({ providerId }) => providerId == data.unit.provider_unit_id
            );
            const oldUnit = unitsArr[index];
            unitsArr.splice(index, 1)

            unitsArr.push({
                providerId: data.unit.provider_unit_id,
                xPlot: data.unit.x_plot,
                yPlot: data.unit.y_plot,
                name: data.unit.id,
                svgPoint: oldUnit.svgPoint,
            });
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
            console.debug(status, "done with ajaxsave ajaxplotunit", id, dx, dy);

            const index = unitsArr.findIndex(
                ({ providerId }) => providerId == data.tour.id
            );
            const oldUnit = unitsArr[index];
            unitsArr.splice(index, 1)

            unitsArr.push({
                providerId: data.tour.id,
                xPlot: data.tour.x_plot,
                yPlot: data.tour.y_plot,
                svgPoint: oldUnit.svgPoint,
                name: oldUnit.name || data.tour.name,
            });
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
            unitsArr.push({
                providerId: data.amenity.id,
                xPlot: data.amenity.x_plot,
                yPlot: data.amenity.y_plot,
                name: data.amenity.name,
            });
            doDraggable();
            // delete from unused list
            $('.amenities-list option').each(function () {
                if ($(this).val() == id) {
                    $(this).remove();
                }
            });
        });
}

function saveAmenityPlotForFloorplate (id, dx, dy, pointerData = {}) {
    console.log("ready to ajaxsave AmenityPlotForFloorplate", addmode, parsedSVGs.length, left_margin, top_margin, id, dx, dy);

    const payload = svgMode ? {
        "pointer": pointerData
    } : {
        "x_plot": dx,
        "y_plot": dy,
    }

    payload.floor = floor;

    $.post("/communities/" + community_id + "/floorplates/" + floorplate_id_for_amenity + "/amenities/" + id + "/plot_amenity",
        payload,
        function (data, status, xhr) {
            console.debug(status, "done with ajaxsave ajaxplotunit", id, dx, dy);
            const index = unitsArr.findIndex(
                ({ providerId }) => providerId == data.amenity.id
            );
            const oldUnit = unitsArr[index];
            unitsArr.splice(index, 1)

            unitsArr.push({
                providerId: data.amenity.id,
                xPlot: data.amenity.x_plot,
                yPlot: data.amenity.y_plot,
                name: data.amenity.name,
                svgPoint: oldUnit.svgPoint,
            });
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
            unitsArr.push({
                providerId: data.elevator.id,
                xPlot: data.elevator.x_plot,
                yPlot: data.elevator.y_plot,
                name: data.elevator.name,
            });
            doDraggable();
            // delete from unused list
            $('.amenities-list option').each(function () {
                if ($(this).val() == id) {
                    $(this).remove();
                }
            });
        });
}

function saveAmenityPlotForUnit (id, dx, dy) {
    $.post("/communities/" + community_id + "/units/" + unit_id_for_amenity + "/amenities/" + id + "/plot_amenity",
        {
            "x_plot": dx,
            "y_plot": dy,
        },
        function (data, status, xhr) {
            console.debug(status, "done with ajaxsave ajaxplotunit", id, dx, dy);
            const index = unitsArr.findIndex(
                ({ providerId }) => providerId == data.amenity.id
            );
            const oldUnit = unitsArr[index];
            unitsArr.splice(index, 1);

            unitsArr.push({
                providerId: data.amenity.id,
                xPlot: data.amenity.x_plot,
                yPlot: data.amenity.y_plot,
                name: data.amenity.name,
                svgPoint: oldUnit.svgPoint
            });
            // arr.push([data.amenity.id, data.amenity.x_plot, data.amenity.y_plot, true, data.amenity.name]);
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
    console.log("ready to ajaxsave SiteMapUnit", addmode, parsedSVGs.length, left_margin, top_margin, id, dx, dy);
    const payload = svgMode ? {
        "pointer": pointerData
    } : {
        "x_plot": dx,
        "y_plot": dy,
    }

    $.post("/communities/" + community_id + "/units/" + id + "/ajaxplotunit",
        payload,
        function (data, status, xhr) {
            const index = unitsArr.findIndex(
                ({ providerId }) => providerId == data.unit.provider_unit_id
            );
            const oldUnit = unitsArr[index];
            unitsArr.splice(index, 1);

            unitsArr.push({
                providerId: data.unit.provider_unit_id,
                xPlot: data.unit.x_plot,
                yPlot: data.unit.y_plot,
                name: data.unit.id,
                svgPoint: oldUnit.svgPoint,
                pointerData: data.unit.pointer_data
            });
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

function saveAmenityPlotForSitemap(id, dx, dy, pointerData = {}) {
    console.log("ready to ajaxsave AmenityPlotForSitemap", addmode, parsedSVGs.length, left_margin, top_margin, id, dx, dy);

    if (!addmode){
        dx = dx + left_margin;
        dy = dy + top_margin;
    }

    const payload = svgMode ? {
        "pointer": pointerData
    } : {
        "x_plot": dx,
        "y_plot": dy,
    }

    $.post("/communities/" + community_id + "/sitemaps/" + sitemap_id_for_amenity + "/amenities/" + id + "/plot_amenity",
        payload,
        function (data, status, xhr) {
            const index = unitsArr.findIndex(
                ({ providerId }) => providerId == data.amenity.id
            );
            const oldUnit = unitsArr[index];
            unitsArr.splice(index, 1);

            unitsArr.push({
                providerId: data.amenity.id,
                xPlot: data.amenity.x_plot,
                yPlot: data.amenity.y_plot,
                name: data.amenity.name,
                svgPoint: oldUnit.svgPoint
            });
            // arr.push([data.amenity.id, data.amenity.x_plot, data.amenity.y_plot, true, data.amenity.name]);
            doDraggable();
            // delete from unused list
            $('.amenities-list option').each(function () {
                if ($(this).val() == id) {
                    $(this).remove();
                }
            });
        });
}

var unitsArr = [];
var temp = [];
var pointerOffset = { x: 0, y: 0 };

function doDraggable () {
    console.log("called do draggable")

    $('.marker').draggable({
        containment: 'parent',
        stack: ".marker",
        // get the initial X and Y position when dragging starts
        start: function (event, ui) {
            let currentScale = 1;
            try {
                const zoomContainer = event.target.closest('div.plot-image');
                const key = getZoomPanKey(zoomContainer);
    
                svgMode = zoomContainer.id === "svg_map";
                const { x, y, scale } = mapPanZoom?.[key] ? mapPanZoom[key].getTransform() : { scale: 1, x: 0, y: 0 };
                currentScale = scale;
    
                ui.position.left = (ui.position.left - x) / scale;
                ui.position.top = (ui.position.top - y) / scale;
            } catch (e) {
                event.preventDefault();
                return;
            }

            if (is_ui_a_door(ui))
                start__door_work(event, ui)
            else if (is_ui_a_accesspoint(ui))
                start__access_point(event, ui)
            else
                start__original_work(event, ui, currentScale)
        },
        drag: function (event, ui) {
            try {
                const draggingElement = $(this);
    
                const zoomContainer = event.target.closest('div.plot-image');
                const key = getZoomPanKey(zoomContainer);
    
                const $zoomElement = $(zoomContainer);
                const canvasTop = $zoomElement.offset().top;
                const canvasLeft = $zoomElement.offset().left;
                const canvasHeight = $zoomElement.height();
                const canvasWidth = $zoomElement.width();
                
    
                const {scale} = mapPanZoom?.[key] ? mapPanZoom[key].getTransform() : { scale: 1, x: 0, y: 0 };
    
                const calculatedUiTop = (event.pageY - canvasTop - pointerOffset.y) / scale;
                const calculatedUiLeft = (event.pageX - canvasLeft - pointerOffset.x) / scale;
    
                ui.position.left = Math.max(0, Math.min(calculatedUiLeft, canvasWidth - draggingElement.width()));
                ui.position.top = Math.max(0, Math.min(calculatedUiTop, canvasHeight - draggingElement.height()));
    
                // Finally, make sure offset aligns with position
                ui.offset.top = Math.round(ui.position.top + canvasTop);
                ui.offset.left = Math.round(ui.position.left + canvasLeft);
            } catch (e) {
                event.preventDefault();
                return;
            }

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

            svgMode = false;
        }

    }).on('mousedown touchstart', function (e) {
        e.stopImmediatePropagation();
        return false;
    })
}

function start__original_work(event, ui, scale) {
    const xpos = Math.round(ui.helper[0].offsetLeft);
    const ypos = Math.round(ui.helper[0].offsetTop);

    const marginedXpos = Math.round(xpos + left_margin);
    const marginedYpos = Math.round(ypos + top_margin);

    const lessMarginedXpos = Math.round(xpos - left_margin);
    const lessMarginedYpos = Math.round(ypos - top_margin);

    temp = [];
    if (unitsArr) {
        temp = unitsArr
            .filter(
                ({ xPlot, yPlot }) =>
                    (xPlot === xpos && yPlot === ypos) ||
                    (xPlot === marginedXpos && yPlot === marginedYpos) ||
                    (xPlot === lessMarginedXpos && yPlot === lessMarginedYpos)
                )
            .map(({ providerId }) => providerId.toString());
    }

    console.log(temp, unitsArr, xpos, ypos, marginedXpos, marginedYpos, lessMarginedXpos, lessMarginedYpos);
    pointerOffset.x = left_margin * scale;
    pointerOffset.y = top_margin * scale;
}

function drag__original_work(event, ui) {
    const left = Math.round(ui.position.left);
    const top = Math.round(ui.position.top);
    console.log(temp, left, top);
  
    if (temp) {
      temp.forEach((markerId) => {
        $(`#m_${markerId}`).css({
          left,
          top,
        });
      });
    }
}

function stop__original_work(event, ui) {
    let left = Math.round(ui.position.left);
    let top = Math.round(ui.position.top);
    let dataSet = null;

    if (svgMode) {
        const { element, centerPoint } = getSvgClickedElementWithCenterPoint("#svg_map.plot-image", event);
        if (element) {
            const elId = element.id
            const selector = elId ? null : getSvgElementSelector(element);
            dataSet = { x_plot: left, y_plot: top, tag: element.tagName?.toLowerCase(), id: elId, selector }
            left = Math.round(centerPoint.x);
            top = Math.round(centerPoint.y);
        } else {
            return;
        }
    }

    const marginedLeft = left - left_margin
    const marginedTop = top - top_margin

    if (temp) {
        temp.forEach((markerId, i) => {
            let marker = $(`#m_${markerId}`);
            if (marker.parent()?.[0]?.classList.contains('marker')) {
                marker = marker.parent();
            }

            if (dataSet) {
                savePlot(temp[i], marginedLeft, marginedTop, null, dataSet);
                marker.css({
                    left: marginedLeft,
                    top: marginedTop,
                });
            }
            else {
                savePlot(temp[i], left, top);
                marker.css({
                    left: left,
                    top: top,
                });
            }
        });
    }
}
