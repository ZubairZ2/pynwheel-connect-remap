function saveAccessPoint(floor, dx, dy, id=0){
    plotted_data = false
    url = ajax_url(id)
    $.post( url,
    { 
        "x_plot": dx,
        "y_plot": dy,
        "floor": floor,
        "locks_present_hash": locks_present_hash,
    }).done(function(response) {
        var index = access_points.findIndex(access_point => access_point.id == response.access_point.id); 
        if(index !== -1)
            access_points.splice(index,1)
        access_points.push(response.access_point);
        if (plotted_data == false){
            $("#access_point_id").attr(
                {
                    "id": "access_point_" + response.access_point.id,
                    "data-door-id": response.access_point.id,
                    "title": response.access_point.name,
                    "href": response.url,
                }
            )
            plotted_data = true
        }

        $(".multi-select-units").css({"pointer-events": "auto"})
        $(".multi-select-units").find('#overlay').remove();

    })
}


function ajax_url(id){
    if ( typeof floorplate_id !== 'undefined')
        return "/communities/" + community_id + "/floorplates/" + floorplate_id + "/access_points/" + id + "/plot_access_point"
    else if ( typeof sitemap_id !== 'undefined')
        return "/communities/" + community_id + "/sitemaps/" + sitemap_id + "/access_points/" + id + "/plot_access_point"
}

function getSameLocationAccessPoints(xpos, ypos){
    return access_points.filter(access_point => access_point.x_plot == xpos && access_point.y_plot == ypos)
}

function getAccessPointTag(){
    return `<a id="access_point_id" class="marker ui-draggable ui-draggable-handle" style="left:${dx}px; top:${dy}px; position:absolute; font-size: ${door_fontsize/2}px" title="" data-door-id="" data-toggle="tooltip" data-remote="true" data-plotted-category="access_point" href="#">
                <i class="fa fa-lock" style="color: #66bf60"></i>
            </a>`
}


// -----------------------  functions used while draging access points  --------------------------- //

function is_ui_a_accesspoint(ui){
    return typeof ui.helper.attr("id") !== "undefined"  && ui.helper.attr("id").includes("access_point")
}

function start__access_point(event, ui){
    xpos = Math.round(ui.position.left);
    ypos = Math.round(ui.position.top);
    same_location_access_points = getSameLocationAccessPoints(xpos, ypos)
}

function drag__access_point(event, ui){
    for(var access_point of same_location_access_points)
        $('#access_point_' + access_point.id).css({"left": Math.round(ui.position.left), "top": Math.round(ui.position.top)});
}

function stop__access_point(event, ui){
    for(var access_point of same_location_access_points){
        access_point.x_plot = Math.round(parseFloat(ui.position.left));
        access_point.y_plot = Math.round(parseFloat(ui.position.top));
        saveAccessPoint(access_point.floor, access_point.x_plot, access_point.y_plot, access_point.id)
    }
}


/// ----------------------------------------------------------------------  ///

$(document).ready(function(){   // not handeling it by ajax, due to time-shortage
    $(".delete-access-point").on("ajax:success", (event, data) => {
    })
})