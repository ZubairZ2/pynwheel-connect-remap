function delete_plot(removing, url){
    debugger
    if ( typeof floorplate_id !== 'undefined'){
        if(removing == "unit_door")
            delete_unitdoor_plot(url)
    }
}


function saveFloorplateUnitDoor(id, dx, dy){
    $.post( "/communities/"+community_id+"/units/" + id + "/ajaxplotunitdoorforfloorplate",
    { 
      "x_plot": dx,
      "y_plot": dy,
      "floorplate_id": floorplate_id
    }).done(function(response) {
      if(response.success){
        $("#plus_" + id).remove()
        updateUnitDoorsInfo(response.door, fetchUnitIndex(response.unit.id))
        // draggableDoor()
      }
      else
        console.warn("error: ", response)
    })
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


function updateUnitDoorsInfo(updated_door ,position){
    units_info[position].unit_info.door = updated_door
}

function deleteUnitDoorsInfo(position){
    units_info[position].unit_info.door = {}
}

function getUnitDoorsAtSameLocation(xpos, ypos){
    return units_info.filter(row => row.unit_info.door.x_plot == xpos && row.unit_info.door.y_plot == ypos)
}

function addDoorButtonsInDoorModal(event, attached_doors){
    debugger
    $('.door-buttons-in-door-modal').empty()
    for(var row of attached_doors){
        if (row.unit_info.door.id  == event.relatedTarget.dataset.doorId){
            deletion_url = getDeleteDoorUrl(row.unit_info.unit.provider_id)
            $(".delete-door-marker").attr("data-href", deletion_url)
            button_style = "btn-primary" 
        }
        else
            button_style = "btn-default"
        $('.door-buttons-in-door-modal').append(`<button class="btn modal-unit-button ml-5 ${button_style}" type="button"> ${row.unit_info.door.name} </button>`);
    }
    // ajax-btn-delete
}

        
$(document).ready(function(){
    $(".ajax-btn-delete").click(function(event){
        event.preventDefault();
        delete_plot( $(event.target).attr('data-plotted-category'), $(event.target).attr('data-href') )
    });
})