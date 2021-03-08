
function delete_plot(removing, url){
    debugger
    if ( typeof floorplate_id !== 'undefined'){
        if(removing == "unit_door")
            delete_unitdoor_plot(url)
    }
}

function delete_unitdoor_plot(url){
    $.ajax({
        type: "delete",
        url:  url,
        cache: false,
        success: function(response) {
            if(response.success){
                $('#ajax-confirm-delete').modal('hide');
                $(("#door_"+response.unit.provider_unit_id)).remove()
                attachPlusIconWithUnit(response.unit)
                deleteUnitDoorsInfo(fetchUnitIndex(response.unit.id))
            }
            else
                console.warn(response)
        },
        fail: function(errors){
            console.warn(errors)
        }
    });
}

$(document).ready(function(){
    $(".ajax-btn-delete").click(function(event){
        event.preventDefault();
        delete_plot( $(event.target).attr('data-plotted-category'), $(event.target).attr('data-href') )
    });
})

