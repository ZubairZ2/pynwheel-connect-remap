
function delete_plot(removing, url){
    debugger
    if ( typeof floorplate_id !== 'undefined'){
        if(removing == "unit_door")
            delete_unitdoor_plot(url)
    }
}

function delete_unitdoor_plot(url){
    debugger
    $.ajax({
        type: "delete",
        url:  url,
        cache: false,
        success: function(response) {
            if(response.success){
                debugger
                $('#ajax-confirm-delete').modal('hide');
                $(("#door_"+response.door.id)).remove()
                create_CreateUnitDoor_icon(response.unit)

                // remove it from overall arrays of doors (not created yet)
            }
            else
                console.warn(response)
        },
        fail: function(errors){
            console.warn(errors)
        }
    });
}

function create_CreateUnitDoor_icon(unit){
    debugger
    create_unit_door = `<a id="plus_${unit.provider_unit_id}" class="marker ui-draggable ui-draggable-handle" style="left:${unit.x_plot  - left_margin + 20}px; top:${unit.y_plot  - right_margin + 20}px; position:absolute; " title="Click to plot this unit(s) door" data-toggle="tooltip" data-plotted-category="create_unit_door" onclick="plot_entry_point(event)" href="#">
                            <i class="fa fa-plus-circle fa-xs" style="color: #59de83; font-size: ${marker_font_size/2}px;"></i>
                        </a>`
    $(("#m_"+unit.provider_unit_id)).after(create_unit_door)
}

$(document).ready(function(){
    $(".ajax-btn-delete").click(function(event){
        event.preventDefault();
        delete_plot( $(event.target).attr('data-plotted-category'), $(event.target).attr('data-href') )
    });
})

