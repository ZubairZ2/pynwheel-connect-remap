$(document).ready(function () {
    selected = [];
    var temp = [];
    dx = 0;
    dy = 0;
    $("#map").css('cursor', 'default');

    doDraggable();

    $("#imageselect1 li").click(function (e) {
        if ($(this).data("id") != "") {
            // alert($(this).data("id")+" ===> "+ $(this).data("name"))
            console.log($.inArray($(this).data("id"), $.map(selected, function (v) {
                return v[0];
            })) == -1);
            if (selected.length == 0) {
                saveTourStopPoint($(this).data("id"));
                // selected.push([ $(this).data("id"), $(this).data("name") ]);
            } else if ($.inArray($(this).data("id"), $.map(selected, function (v) {
                return v[0];
            })) == -1) {
                saveTourStopPoint($(this).data("id"));
                // selected.push([ $(this).data("id"), $(this).data("name") ]);
            }
        }
        // add to selected list
        $("#selected-units").empty();
        for (i = 0; i < selected.length; i++) {
            $("#selected-units").append('<li class="s-unit" data-id=' + i + '>' + selected[i][1] + '</li>');
        }
        $('#newmsg').hide();

        // hide from unused list
        $(this).css({"display": "none"});
        // plotMode();
        $("#imageselect1").toggle();
        e.stopPropagation()
    });
    $("#imageselect2 li").click(function (e) {
        if ($(this).data("id") != "") {
            console.log($.inArray($(this).data("id"), $.map(selected, function (v) {
                return v[0];
            })) == -1);
            if (selected.length == 0) {
                saveTourStopPoint($(this).data("id"));
                // selected.push([ $(this).data("id"), $(this).data("name") ]);
            } else if ($.inArray($(this).data("id"), $.map(selected, function (v) {
                return v[0];
            })) == -1) {
                saveTourStopPoint($(this).data("id"));
                // selected.push([ $(this).data("id"), $(this).data("name") ]);
            }
        }
        // add to selected list
        $("#selected-units").empty();
        for (i = 0; i < selected.length; i++) {
            $("#selected-units").append('<li class="s-unit" data-id=' + i + '>' + selected[i][1] + '</li>');
        }
        $('#newmsg').hide();

        // hide from unused list
        $(this).css({"display": "none"});
        plotMode();
        $("#imageselect2").toggle();
        e.stopPropagation()
    })

    // This is for plotting elevator when clicked on ul dropdown
    $("#imageselect3 li").click(function(e){
      if ($(this).data("id")!=""){
          console.log($.inArray($(this).data("id"), $.map(selected, function(v) { return v[0]; })) == -1);
          if (selected.length == 0){
              saveTourStopPoint($(this).data("id"));
              // selected.push([ $(this).data("id"), $(this).data("name") ]);
          }
          else if ($.inArray($(this).data("id"), $.map(selected, function(v) { return v[0]; })) == -1){
              saveTourStopPoint($(this).data("id"));
              // selected.push([ $(this).data("id"), $(this).data("name") ]);
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
      $("#imageselect3").toggle();
      // e.stopPropagation()
      // window.location.reload()
    });

    // $('.amenities-list').on('change', function(e) {
    //   e.preventDefault();
    //   $('.amenities-list :selected').each(function(){
    //     if ($(this).val()!=""){
    //       console.log($.inArray($(this).val(), $.map(selected, function(v) { return v[0]; })) == -1);
    //       if (selected.length == 0){
    //         selected.push([ $(this).val(), $.trim($(this).text()) ]);
    //       }
    //       else if ($.inArray($(this).val(), $.map(selected, function(v) { return v[0]; })) == -1){
    //         selected.push([ $(this).val(), $.trim($(this).text()) ]);
    //       }
    //     }
    //     // add to selected list
    //     $("#selected-units").empty();
    //     for (i=0; i<selected.length; i++) {
    //       $("#selected-units").append('<li class="s-unit" data-id='+i+'>' + selected[i][1] + '</li>');
    //     }
    //     $('#newmsg').hide();

    //     // hide from unused list
    //     $(this).css({"display": "none"});
    //     plotMode();
    //   });
    // });


    // $(document).on("click", ".marker" , function() {
    //   console.log($(this).attr("title"));
    //   $(this).attr('data-name' , 'plot');
    //   $(this).attr('data-target' , '#confirm-delete');
    //   $(this).attr('data-toggle' , 'modal');
    //   if (typeof floorplan_id !== 'undefined'){
    //     $(this).attr('data-href' , '/communities/'+community_id+'/floorplans/'+floorplan_id+'/amenities/'+$(this).attr("title")+'/remove_amenity');
    //   }
    //   else if (typeof sitemap_id !== 'undefined'){
    //     $(this).attr('data-href' , '/communities/'+community_id+'/sitemaps/'+sitemap_id+'/amenities/'+$(this).attr("title")+'/remove_amenity');
    //   }
    //   else if (typeof floorplate_id_for_amenity !== 'undefined'){
    //     $(this).attr('data-href' , '/communities/'+community_id+'/floorplates/'+floorplate_id_for_amenity+'/amenities/'+$(this).attr("title")+'/remove_amenity');
    //   }
    //   else{
    //     $(this).attr('data-href' , '/communities/'+community_id+'/units/'+$(this).attr("title")+'/remove_plot');
    //   }

    // });

    function position(elem) {
        var left = 0,
            top = 0;

        do {
            left += elem.offsetLeft - elem.scrollLeft;
            top += elem.offsetTop - elem.scrollTop;
        } while (elem = elem.offsetParent);

        return {left, top};
    }


    $("#map, #svg_map").on("mouseup touchend", function (e) {
        if (e.isDefaultPrevented())
            return;

        if (!addmode)
            return;
      
        if (e.target != $('#map').get(0) && e.target != $('#svg_map').get(0)) {
            if (addmode)
                e.preventDefault();
      
            if (e.type === 'mouseup' && mobileCheck())
                return;

            if (svgMode) {
                if (e.currentTarget.id !== "svg_map")
                    return;

                const { element, centerPoint } = getSvgClickedElementWithCenterPoint('#svg_map.plot-image', e);
                if (!element) {
                    return;
                }

                dx = Math.round(centerPoint.x);
                dy = Math.round(centerPoint.y);
      
                try {
                    for (const unitData of selected) {
                        if (element) {
                            const elId = element.id
                            const selector = elId ? null : getSvgElementSelector(element);
                            const dataSet = { x_plot: dx, y_plot: dy, tag: element.tagName?.toLowerCase(), id: elId, selector }
                            savePlot(unitData[0], dx, dy, null, dataSet);
                            fillThePlot(unitData, dataSet, getDeletionUrl({ forSvg: true }))
                        }
                    }
                } catch (err) {
                    console.error(err)
                    location.reload()
                }

                reset();
                return;
      
            }
            if (e.currentTarget.id !== "map") {
                return;
            }
            const elemPos = position($('.map-block')[0]);
      
            const zoomContainer = document.querySelector('div.plot-image');
            const key = getZoomPanKey(zoomContainer);
      
            const transform = mapPanZoom?.[key] ? mapPanZoom[key].getTransform() : {};
            const scaleFactor = (1 / (transform.scale || 1));
      
            marker_color = $('#marker_color').html();
            marker_font_size = ($('#font_size').html()) ? $('#font_size').html() : $('#marker_font_size').html();
      
            if (e.type === 'touchend') {
                dx = e.changedTouches[0].pageX - (elemPos.left + transform.x);
                dy = e.changedTouches[0].pageY - (elemPos.top + transform.y);
            } else {
                dx = e.offsetX;
                dy = e.offsetY;
            }
      
            dx = Math.round(dx);
            dy = Math.round(dy);
      
            camera_margin = $('#camera_margin').html();
            door_marker_color = $('#door_marker_color').html();
            door_fontsize = ($('#door_fontsize').html());
      
            if (addmode) {
                // save plotting for each selected unit
                if(typeof accesspointplot !== "undefined" && accesspointplot == true){
                    try {
                        for (i = 0; i < selected.length; i++) {
                            saveAccessPoint(selected[i], dx, dy);
                        }
                    }
                    catch(err) {
                        location.reload()
                    }
      
                    tag = getAccessPointTag();
                }
                else{
                    try {
                        for (i = 0; i < selected.length; i++) {
                            savePlot(selected[i][0], dx, dy);
                        }
                    }
                    catch (err) {
                        console.error(err)
                        location.reload()
                    }
      
                    if(typeof adddoorsmode !== 'undefined' && adddoorsmode){
                        tag = getDoorTag(selected[0][0])
                    }
                    else{
                        var url = getDeletionUrl();
                        tag = getTagToPlot(url)
                    }
                }

                $('#map').append(tag);
                doDraggable();
                reset();
            }
        }
    });

    $(".reset").on('click', function (e) {
        $(".divLoading").removeClass("hidden");
        window.location.reload()
    });

    $(".zoom-in").on('click', function (e) {
        const zoomContainer = $(e.currentTarget).closest('.buttons').siblings().find('.plot-image')[0];
        const key = getZoomPanKey(zoomContainer);

        if (mapPanZoom?.[key])
            mapPanZoom[key].zoomInOut(187);
    });


    $(".zoom-out").on('click', function (e) {
        const zoomContainer = $(e.currentTarget).closest('.buttons').siblings().find('.plot-image')[0];
        const key = getZoomPanKey(zoomContainer);

        if (mapPanZoom?.[key])
            mapPanZoom[key].zoomInOut(189);
    });

});

function getDeletionUrl (options = { forSvg: false }) {
    const { forSvg } = options;
    if (!selected?.length)
        return;

    let result = ""
    if (typeof floorplan_id !== 'undefined'){
        result = '/communities/'+community_id+'/floorplans/'+floorplan_id+'/amenities/'+selected[0][0]+'/remove_amenity';
    }
    else if (typeof floorplate_id !== 'undefined'){
        result = '/communities/'+community_id+'/units/'+selected[0][0]+'/remove_plot_from_floorplate?floorplate_id='+floorplate_id
    }
    else if (typeof sitemap_id !== 'undefined'){
        result = '/communities/'+community_id+'/units/'+selected[0][0]+'/remove_plot'
    }
    else if (typeof floorplate_id_for_amenity !== 'undefined'){
        result = '/communities/'+community_id+'/floorplates/'+floorplate_id_for_amenity+'/amenities/'+selected[0][0]+'/remove_amenity?floor=' + floor
    }
    else if (typeof sitemap_id_for_amenity !== 'undefined'){
        result = '/communities/'+community_id+'/sitemaps/'+sitemap_id_for_amenity+'/amenities/'+selected[0][0]+'/remove_amenity'
    }
    else if (typeof tour_id !== 'undefined'){
        result = '/communities/'+community_id+'/tours/'+tour_id+'/resetStartingPoint'
    }
    else if (typeof tour_id_for_stop !== 'undefined'){
        result = '/communities/'+community_id+'/tours/'+community_tour_id+'/tour_stops/'+selected[0][0]+'/resetTourStopPoint'
    }
    else if (typeof unit_id_for_unit_amenities !== 'undefined'){
        result = '/communities/'+community_id+'/units/'+unit_id_for_unit_amenities+'/amenities/'+selected[0][0]+'/remove_amenity'
    }
    else{
        result = '/communities/'+community_id+'/units/'+$(this).attr("title")+'/remove_plot'
    }

    return forSvg ? addSvgDeletionParamInURL(result) : result
}

function getTagToPlot (url) {
    if (typeof tour_id_for_stop !== 'undefined') {
        tag = "<a class='marker ui-draggable ui-draggable-handle' data-toggle='modal' title='" + selected[0][1] + "' style='left:" + dx + "px; top:" + dy + "px; position:absolute;' data-name='plot' data-target='#confirm-delete' data-href='" + url + "'>"
        tag += "<i class='custom-icon' style='width: " + marker_font_size + "px; height: " + marker_font_size + "px; border: 2px solid " + marker_color + "; '><i class='fa fa-star' style='color: " + marker_color + "; font-size: " + (parseInt(marker_font_size) / 2) + "px; margin-top:" + camera_margin + "px;'></i></i>";
        tag += "</a>"
    }
    else if (typeof tour_id !== 'undefined'){
        dx = dx - 3;
        dy = dy - 3;
        tag = "<a class='start-point marker ui-draggable ui-draggable-handle' data-toggle='modal' title='" + selected[0][1] + "' style='left:" + dx + "px; top:" + dy + "px; position:absolute;' data-name='plot' data-target='#confirm-delete' data-href='" + url + "'>"
        tag += "<img src='/assets/star.png'>";
        tag += "</a>"
        unitsArr[0].xPlot = dx;
        unitsArr[0].yPlot = dy;
    }
    else if (typeof floorplate_id !== 'undefined' || typeof sitemap_id !== 'undefined'){   

        if(automate_wayfinding == true && self_tour == true) 
            plus_icon = returnPlusIconTag(selected[0][0], "unit", -6)
        else
            plus_icon = ''

        tag =   `<p class="marker ui-draggable ui-draggable-handle" style="left:${dx - left_margin}px; top:${dy - top_margin}px; position:absolute">
                    <a id="m_${selected[0][0]}" style="font-size: ${marker_font_size}px" title="${selected[0][1]}" data-toggle="modal" data-name="plot" data-target="#confirm-delete" data-href="${url}" data-plotted-category="unit" href="javascript:void(0)">
                        <i class="fas fa-map-marker-alt" style="color: ${marker_color};"></i> </a>
                    ${plus_icon}
                </p>`
    }
    else if (typeof floorplate_id_for_elevator !== 'undefined') {
        elevator_remove_url = '/communities/' + community_id + '/elevators/' + selected[0][0] + '/remove_elevator_plotting'
        marker_color = '#d37474'
        tag = "<a class='marker ui-draggable ui-draggable-handle' data-toggle='modal' title='" + selected[0][1] + "' style='left:" + dx + "px; top:" + dy + "px; position:absolute;' data-name='plot' data-target='#confirm-delete' data-href='" + elevator_remove_url + "'>"
        tag += "<i class='custom-icon' style='width: " + marker_font_size + "px; height: " + marker_font_size + "px; border: 2px solid " + marker_color + "; '><i class='fa fa-reorder' style='color: " + marker_color + "; font-size: " + (parseInt(marker_font_size) / 2) + "px; margin-top:" + camera_margin + "px;'></i></i>";
        tag += "</a>"
    }

    else if(typeof floorplate_id_for_amenity !== 'undefined' || typeof sitemap_id_for_amenity !== 'undefined'){
        if(automate_wayfinding == true && self_tour == true) 
            plus_icon = returnPlusIconTag(selected[0][0], "amenity", 0)
        else
            plus_icon = ''

        tag =   `<p class="marker ui-draggable ui-draggable-handle" style="left:${dx - left_margin}px; top:${dy - top_margin}px; position:absolute">
                    <a id="m_${selected[0][0]}" data-toggle="modal" title="${selected[0][1]}" data-name="plot" data-target="#confirm-delete" data-href="${url}" data-plotted-category="amenity">
                        <i class="custom-icon" style="width: ${marker_font_size}px; height: ${marker_font_size}px; border: 2px solid; color: ${marker_color}" >
                            <i class="fas fa-camera-retro" style="color: ${marker_color}; font-size: ${parseInt(marker_font_size) /2}px; margin-top:${camera_margin}px;"></i>
                        </i>
                    </a>
                    ${plus_icon}
                </p>`
    }
    else {
        tag = "<a class='marker ui-draggable ui-draggable-handle' data-toggle='modal' title='" + selected[0][1] + "' style='left:" + (dx - (definedAndHasValue(left_margin) ? left_margin : 0)) + "px; top:" + (dy - (definedAndHasValue(top_margin) ? top_margin : 0)) + "px; position:absolute;' data-name='plot' data-target='#confirm-delete' data-href='" + url + "'>"
        tag += "<i class='custom-icon' style='width: " + marker_font_size + "px; height: " + marker_font_size + "px; border: 2px solid " + marker_color + "; '><i class='fas fa-camera-retro' style='color: " + marker_color + "; font-size: " + (parseInt(marker_font_size) / 2) + "px; margin-top:" + camera_margin + "px;'></i></i>";
        tag += "</a>"
    }
    return tag
}

function fillThePlot(unitData, dataSet, deletionUrl) {
    const [providerId, tag] = unitData;
    const unit = mapped_units.find(({ data_attributes = {} }) => data_attributes['data-provider-unit-id'] === providerId)

    unit.data_attributes = {
        title: tag,
        'data-href': deletionUrl,
        'data-name': "plot",
        'data-plotted-category': "unit",
        'data-toggle': "modal",
        'data-target': "#confirm-delete",
    }
    processSvgBlock(
        $('svg', '#svg_map')[0],
        unit,
        {
            cloneClass: 'cloned-plot',
            additionalClasses: ["marker", "cloned"]
        },
        dataSet
    )
}
