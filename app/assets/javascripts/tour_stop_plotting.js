//= require common_functions

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

    window.mobileCheck = function () {
        let check = false;
        (function (a) {
            if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4))) check = true;
        })(navigator.userAgent || navigator.vendor || window.opera);
        return check;
    };

    $("#map").bind("mouseup touchend", function (e) {
        const { element, centerPoint } = getSvgClickedElementWithCenterPoint('#map.plot-image', e);

        // first check if user is clicking on scrollbar
        if (e.target != $('#map').get(0)) {
            if (addmode)
                e.preventDefault();

            if (e.type === 'mouseup' && mobileCheck()) {
                return;
            }
            var elemPos = position($('.map-block')[0]);

            var transform = mapPanZoom ? mapPanZoom.getTransform() : {};
            var scaleFactor = (1 / (transform.scale || 1));
            
            if (element && centerPoint) {
                [dx, dy] = [centerPoint.x - left_margin, centerPoint.y - top_margin]
            } else {
                marker_color = $('#marker_color').html();
                marker_font_size = ($('#font_size').html()) ? $('#font_size').html() : $('#marker_font_size').html();

                left_margin = parseInt($('#left_margin').html());
                top_margin = parseInt($('#top_margin').html());

                if (e.type === 'touchend') {
                    dx = ((e.changedTouches[0].pageX - elemPos.left) * scaleFactor) - (transform.x * scaleFactor);
                    dy = ((e.changedTouches[0].pageY - elemPos.top) * scaleFactor) - (transform.y * scaleFactor);
                } else {
                    dx = (parseInt($('#active_x_plot').html()) * scaleFactor) - (10 * scaleFactor);
                    dy = (parseInt($('#active_y_plot').html()) * scaleFactor) - (10 * scaleFactor);
                }
            }

            dx = Math.round(dx)
            dy = Math.round(dy)

            camera_margin = $('#camera_margin').html();
            door_marker_color = $('#door_marker_color').html();
            door_fontsize = ($('#door_fontsize').html());

            if (addmode) {
                // save plotting for each selected unit
                if(typeof accesspointplot !== "undefined" && accesspointplot == true){
                    try {
                        for (i=0; i<selected.length; i++) {
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
                            if (element) {
                                const elId = element.id
                                const selector = elId ? null : getElementSelector(element);
                                const dataSet = { tag: element.tagName?.toLowerCase(), id: elId, selector }
                                savePlot(selected[i][0], dx, dy, null, dataSet);
                            } else
                                savePlot(selected[i][0], dx, dy);
                        }
                    }
                    catch(err) {
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
        mapPanZoom.zoomInOut(187);
    });


    $(".zoom-out").on('click', function (e) {
        mapPanZoom.zoomInOut(189);
    });

});

function getDeletionUrl(){
    if (typeof floorplan_id !== 'undefined'){
        return '/communities/'+community_id+'/floorplans/'+floorplan_id+'/amenities/'+selected[0][0]+'/remove_amenity';
    }
    else if (typeof sitemap_id !== 'undefined'){
        return '/communities/'+community_id+'/units/'+selected[0][0]+'/remove_plot'
    }
    else if (typeof floorplate_id_for_amenity !== 'undefined'){
        return '/communities/'+community_id+'/floorplates/'+floorplate_id_for_amenity+'/amenities/'+selected[0][0]+'/remove_amenity?floor=' + floor
    }
    else if (typeof sitemap_id_for_amenity !== 'undefined'){
        return '/communities/'+community_id+'/sitemaps/'+sitemap_id_for_amenity+'/amenities/'+selected[0][0]+'/remove_amenity'
    }
    else if (typeof tour_id !== 'undefined'){
        return '/communities/'+community_id+'/tours/'+tour_id+'/resetStartingPoint'
    }
    else if (typeof tour_id_for_stop !== 'undefined'){
        return '/communities/'+community_id+'/tours/'+community_tour_id+'/tour_stops/'+selected[0][0]+'/resetTourStopPoint'
    }
    else if (typeof floorplate_id !== 'undefined'){
        return '/communities/'+community_id+'/units/'+selected[0][0]+'/remove_plot_from_floorplate?floorplate_id='+floorplate_id
    }
    else if (typeof unit_id_for_unit_amenities !== 'undefined'){
        return '/communities/'+community_id+'/units/'+unit_id_for_unit_amenities+'/amenities/'+selected[0][0]+'/remove_amenity'
    }
    else{
        return '/communities/'+community_id+'/units/'+$(this).attr("title")+'/remove_plot'
    }
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
        arr[0][1] = dx;
        arr[0][2] = dy;
    }
    else if (typeof floorplate_id !== 'undefined' || typeof sitemap_id !== 'undefined'){   

        if(automate_wayfinding == true && self_tour == true) 
            plus_icon = returnPlusIconTag(selected[0][0], "unit", -6)
        else
            plus_icon = ''

        tag =   `<p class="marker ui-draggable ui-draggable-handle" style="left:${dx}px; top:${dy}px; position:absolute;">
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

        tag =   `<p class="marker ui-draggable ui-draggable-handle" style="left:${dx}px; top:${dy}px; position:absolute">
                    <a id="m_${selected[0][0]}" data-toggle="modal" title="${selected[0][1]}" data-name="plot" data-target="#confirm-delete" data-href="${url}" data-plotted-category="amenity">
                        <i class="custom-icon" style="width: ${marker_font_size}px; height: ${marker_font_size}px; border: 2px solid; color: ${marker_color}" >
                            <i class="fas fa-camera-retro" style="color: ${marker_color}; font-size: ${parseInt(marker_font_size) /2}px; margin-top:${camera_margin}px;"></i>
                        </i>
                    </a>
                    ${plus_icon}
                </p>`
    }
    else {
        tag = "<a class='marker ui-draggable ui-draggable-handle' data-toggle='modal' title='" + selected[0][1] + "' style='left:" + dx + "px; top:" + dy + "px; position:absolute;' data-name='plot' data-target='#confirm-delete' data-href='" + url + "'>"
        tag += "<i class='custom-icon' style='width: " + marker_font_size + "px; height: " + marker_font_size + "px; border: 2px solid " + marker_color + "; '><i class='fas fa-camera-retro' style='color: " + marker_color + "; font-size: " + (parseInt(marker_font_size) / 2) + "px; margin-top:" + camera_margin + "px;'></i></i>";
        tag += "</a>"
    }
    return tag
}
