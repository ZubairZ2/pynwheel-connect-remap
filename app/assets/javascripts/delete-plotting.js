
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
                $(("#door_"+response.unit.provider_unit_id)).remove()
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
    plus_icon = create_CreateDoorPlusIcon(unit.provider_unit_id)
    $(("#m_"+unit.provider_unit_id)).after(plus_icon)
}

$(document).ready(function(){
    $(".ajax-btn-delete").click(function(event){
        event.preventDefault();
        delete_plot( $(event.target).attr('data-plotted-category'), $(event.target).attr('data-href') )
    });
})

