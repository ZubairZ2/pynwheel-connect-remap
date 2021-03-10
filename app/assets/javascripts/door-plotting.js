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
        debugger
        if(response.success){
            try {
                $("#plus_" + id).remove()
                $("#door_" + response.unit.provider_unit_id).attr(
                    {
                        "title": response.door.name,
                        "data-door-id": response.door.id
                    }
                )
                updateUnitDoorsInfo(response.door, fetchUnitIndex(response.unit.id))
            }
            catch(err) {
                location.reload()
            }
        }
        else
            location.reload()
    })
}

function delete_unitdoor_plot(url){
    $.ajax({
        type: "delete",
        url:  url,
        cache: false,
        success: function(response) {
            debugger
            if(response.success){
                try {
                    buttons = $('.door-buttons-in-door-modal').find("button")

                    if(buttons.length > 1){
                        var removed = false
                        for(var button of buttons){
                            if (button.classList.contains("btn-primary")){
                                new_primary_button = button.nextSibling != null ? button.nextSibling : (button.previousSibling  != null ? button.previousSibling : null)
                                button.remove()
                                removed = true
                            }
                            if (removed == true && new_primary_button != null ){
                                new_primary_button.classList.replace("btn-default", "btn-primary")
                                unit_data = getUnitDoorsByUnitProviderId(new_primary_button.dataset.providerId)
               
                                $(".delete-door-marker").attr(
                                    {
                                        "data-href": getDeleteDoorUrl(new_primary_button.dataset.providerId),
                                        "data-plotted-category": "unit_door"
                                    }
                                )
                              
                                $("#door_"+response.unit.provider_unit_id).attr(
                                    {
                                        "id": "door_" + unit_data[0].unit_info.unit.provider_id,
                                        "data-door-id": unit_data[0].unit_info.door.id,
                                        "title": unit_data[0].unit_info.door.name,
                                    }
                                )

                                $("#m_"+response.unit.provider_unit_id).attr(
                                    {
                                        "id": "m_" + unit_data[0].unit_info.unit.provider_id,
                                        "title": unit_data[0].unit_info.unit.building == null ? unit_data[0].unit_info.unit.name : unit_data[0].unit_info.unit.building + "-" + unit_data[0].unit_info.unit.name,
                                        "data-href": "/communities/" + community_id + "/units/" + unit_data[0].unit_info.unit.provider_id + "/remove_plot_from_floorplate?floorplate_id=" + floorplate_id,
                                        "data-unit-form-url": "/communities/" + community_id + "/units/" + unit_data[0].unit_info.unit.id + "/adjust_position"
                                    }
                                )

                                break;
                            }
                        }
                    }
                    else{
                        $('#ajax-doors-detail-modal').modal('hide');
                        $(("#door_"+response.unit.provider_unit_id)).remove()
                        attachPlusIconWithUnit(response.unit)
                    }

                    deleteUnitDoorsInfo(fetchUnitIndex(response.unit.id))
                }
                catch(err) {
                    location.reload()
                }
            }
            else
                location.reload()
        },
        fail: function(errors){
            location.reload()
        }
    });
}

function fetchUnitIndex(id){
    selected_doors_index = []
    $(units_info).filter(function (i,row){
        if(row.unit_info.unit.id == id)
            selected_doors_index.push(i)
    })
    return selected_doors_index
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

function getUnitDoorsByUnitProviderId(provider_id){
    return units_info.filter(row => row.unit_info.unit.provider_id == provider_id)
}

function allPlottedUnitDoors(){
    return units_info.filter(row => !jQuery.isEmptyObject(row.unit_info.door))
}

function allPlottednitDoorsExceptThisLocation(xpos, ypos){
    return units_info.filter(row => ( Object.keys(row.unit_info.door).length !== 0 && row.unit_info.door.x_plot != xpos && row.unit_info.door.y_plot != ypos ) )
}

function allPlottednitDoorsExceptThisProviderId(provider_id){
    return units_info.filter(row => ( Object.keys(row.unit_info.door).length !== 0 && row.unit_info.unit.provider_id != provider_id) )
}

function allPlottednitDoorsExceptTheseProviderIds(provider_ids){
    return units_info.filter(row => ( Object.keys(row.unit_info.door).length !== 0 && provider_ids.includes(row.unit_info.unit.provider_id) == false) )
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

        if (attached_doors.length > 1)
            $('.door-buttons-in-door-modal').append(`<button class="btn modal-unit-button ml-5 ${button_style}" data-provider-id="${row.unit_info.unit.provider_id}" type="button" onclick="change_selected_in_unit_modal(event)"> ${row.unit_info.door.name} </button>`);
    }
    // ajax-btn-delete
}

function sortSelectedDoors(event, same_location_doors){
    // sort if required, first in selected should be according to the current name of plotted unit
    currently_selected_provider_id = event.relatedTarget.id.split("_")[1]

    if(same_location_doors[0].unit_info.unit.provider_id != currently_selected_provider_id){
    
        var index;    
        for(index=0; index < same_location_doors.length; index++ ){
          if(same_location_doors[index].unit_info.unit.provider_id == currently_selected_provider_id)
            break;
        }
    
        same_location_doors[index] = same_location_doors[0]
        same_location_doors[0] = getUnitDoorsByUnitProviderId(currently_selected_provider_id)[0]
    }
}

function change_selected_in_unit_modal(event){
    debugger
    try {
        buttons = $('.door-buttons-in-door-modal').find("button")

        if(buttons.length > 1){
            var changed = false
            for(var button of buttons){

                if (button.classList.contains("btn-primary")){
                    button.classList.replace("btn-primary", "btn-default")
                    changed = true
                }

                if (changed == true){
                    unit_data = getUnitDoorsByUnitProviderId(event.target.dataset.providerId)
                    event.target.classList.replace("btn-default", "btn-primary")
   
                    $(".delete-door-marker").attr(
                        {
                            "data-href": getDeleteDoorUrl(unit_data[0].unit_info.unit.provider_id),
                            "data-plotted-category": "unit_door"
                        }
                    )
                  
                    $("#door_"+button.dataset.providerId).attr(
                        {
                            "id": "door_" + unit_data[0].unit_info.unit.provider_id,
                            "data-door-id": unit_data[0].unit_info.door.id,
                            "title": unit_data[0].unit_info.door.name,
                        }
                    )

                    $("#m_"+button.dataset.providerId).attr(
                        {
                            "id": "m_" + unit_data[0].unit_info.unit.provider_id,
                            "title": unit_data[0].unit_info.unit.building == null ? unit_data[0].unit_info.unit.name : unit_data[0].unit_info.unit.building + "-" + unit_data[0].unit_info.unit.name,
                            "data-href": "/communities/" + community_id + "/units/" + unit_data[0].unit_info.unit.provider_id + "/remove_plot_from_floorplate?floorplate_id=" + floorplate_id,
                            "data-unit-form-url": "/communities/" + community_id + "/units/" + unit_data[0].unit_info.unit.id + "/adjust_position"
                        }
                    )

                    break;
                }
            }
        }

    }
    catch(err) {
        location.reload()
    }
}
        
$(document).ready(function(){
    $(".ajax-btn-delete").click(function(event){
        event.preventDefault();
        delete_plot( $(event.target).attr('data-plotted-category'), $(event.target).attr('data-href') )
    });

    $("#ajax-doors-detail-modal").on('show.bs.modal', function(event) {
        debugger
        xpos = parseInt( event.relatedTarget.style.left )
        ypos = parseInt( event.relatedTarget.style.top  )
        same_location_doors = getUnitDoorsAtSameLocation(xpos, ypos)
        sortSelectedDoors(event, same_location_doors)
        addDoorButtonsInDoorModal(event, same_location_doors)
    })

    $("#ajax-add-door-marker-modal").on('show.bs.modal', function(event) {
        debugger
        provider_ids = []
        $('.doors-list-on-popup').multiSelect('removeAllOptions')
        $(".door-buttons-in-door-modal").children().map(function(index, button){provider_ids.push(button.dataset.providerId)})
        units_data = allPlottednitDoorsExceptTheseProviderIds(provider_ids)

        for(var row of units_data)
            $('.doors-list-on-popup').multiSelect('addOption', { value: row.unit_info.door.id, text: row.unit_info.door.name});


    })
    
})