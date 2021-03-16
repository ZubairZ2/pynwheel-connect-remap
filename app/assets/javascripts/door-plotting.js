const zero = 0
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
                    /*   changes for new imlpementation of doors */
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
                                get_unit_locks(new_primary_button.dataset.providerId)
                                new_primary_button.classList.replace("btn-default", "btn-primary")
                                unit_data = getUnitDoorsByUnitProviderId(new_primary_button.dataset.providerId)
               
                                $(".delete-door-marker").attr(
                                    {
                                        "data-href": getDeleteDoorUrl(unit_data[zero].unit_info.unit.provider_id),
                                        "data-provider-id": unit_data[zero].unit_info.unit.provider_id,
                                        "data-plotted-category": "unit_door"
                                    }
                                )
                              
                                $("#door_"+response.unit.provider_unit_id).attr(
                                    {
                                        "id": "door_" + unit_data[zero].unit_info.unit.provider_id,
                                        "data-door-id": unit_data[zero].unit_info.door.id,
                                        "title": unit_data[zero].unit_info.door.name,
                                    }
                                )

                                $("#m_"+response.unit.provider_unit_id).attr(
                                    {
                                        "id": "m_" + unit_data[zero].unit_info.unit.provider_id,
                                        "title": unit_data[zero].unit_info.unit.building == null ? unit_data[zero].unit_info.unit.name : unit_data[zero].unit_info.unit.building + "-" + unit_data[zero].unit_info.unit.name,
                                        "data-href": "/communities/" + community_id + "/units/" + unit_data[zero].unit_info.unit.provider_id + "/remove_plot_from_floorplate?floorplate_id=" + floorplate_id,
                                        "data-unit-form-url": "/communities/" + community_id + "/units/" + unit_data[zero].unit_info.unit.id + "/adjust_position"
                                    }
                                )
                                
                                // $("#h-" + response.unit.provider_unit_id).remove()                                   // remove the hidden element for this unit (exists or not)
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
    return units_info.filter(row => ( Object.keys(row.unit_info.door).length !== zero && row.unit_info.door.x_plot != xpos && row.unit_info.door.y_plot != ypos ) )
}

function allPlottednitDoorsExceptThisProviderId(provider_id){
    return units_info.filter(row => ( Object.keys(row.unit_info.door).length !== zero && row.unit_info.unit.provider_id != provider_id) )
}

function allPlottedunitDoorsExceptTheseProviderIds(provider_ids){
    return units_info.filter(row => ( Object.keys(row.unit_info.door).length !== zero && provider_ids.includes(row.unit_info.unit.provider_id) == false) )
}

function updateGivenUnitDoorsPlotting(provider_ids, x_plot, y_plot){
    debugger
    units_info.filter( function(row) {
        if(Object.keys(row.unit_info.door).length !== zero && provider_ids.includes(row.unit_info.unit.provider_id)){
            row.unit_info.door.x_plot = x_plot
            row.unit_info.door.y_plot = y_plot
        }
    })
}

function createDoorButtonsInDoorModal(event, attached_doors){
    debugger
    $('.door-buttons-in-door-modal').empty()
    for(var row of attached_doors){
        if (row.unit_info.door.id  == event.relatedTarget.dataset.doorId){
            button_style = "btn-primary"
            deletion_url = getDeleteDoorUrl(row.unit_info.unit.provider_id)
            $(".delete-door-marker").attr({ "data-href": deletion_url, "data-provider-id": row.unit_info.unit.provider_id })
        }
        else
            button_style = "btn-default"

        if (attached_doors.length > 1)
            $('.door-buttons-in-door-modal').append(`<button class="btn modal-unit-button ml-5 ${button_style}" data-provider-id="${row.unit_info.unit.provider_id}" type="button" onclick="change_selected_in_unit_modal(event)"> ${row.unit_info.door.name} </button>`);
        else
            $('.door-buttons-in-door-modal').append(`<button class="btn modal-unit-button ml-5 ${button_style}" data-provider-id="${row.unit_info.unit.provider_id}" type="button" onclick="change_selected_in_unit_modal(event)" style="visibility: hidden; margin-top: -20px;"> ${row.unit_info.door.name} </button>`);
    }
    // ajax-btn-delete
}

function AddNewDoorButtonsInDoorModal(event, attached_doors){
    debugger
    for(var row of attached_doors){
        if (row.unit_info.door.id  == event.relatedTarget.dataset.doorId){
            button_style = "btn-primary"
            deletion_url = getDeleteDoorUrl(row.unit_info.unit.provider_id)
            $(".delete-door-marker").attr({ "data-href": deletion_url, "data-provider-id": row.unit_info.unit.provider_id })
        }
        else
            button_style = "btn-default"

        if (attached_doors.length > 1)
            $('.door-buttons-in-door-modal').append(`<button class="btn modal-unit-button ml-5 btn-default" data-provider-id="${row.provider_id}" type="button" onclick="change_selected_in_unit_modal(event)"> ${row.name} </button>`);
    }
    // ajax-btn-delete
}

function sortSelectedDoors(event, same_location_doors){
    // sort if required, first in selected should be according to the current name of plotted unit
    currently_selected_provider_id = event.relatedTarget.id.split("_")[1]

    if(same_location_doors[zero].unit_info.unit.provider_id != currently_selected_provider_id){
    
        var index;    
        for(index=zero; index < same_location_doors.length; index++ ){
          if(same_location_doors[index].unit_info.unit.provider_id == currently_selected_provider_id)
            break;
        }
    
        same_location_doors[index] = same_location_doors[zero]
        same_location_doors[zero] = getUnitDoorsByUnitProviderId(currently_selected_provider_id)[zero]
    }
}

function change_selected_in_unit_modal(event){
    debugger
    if (event.currentTarget.classList.contains("btn-primary")) return
    
    get_unit_locks(event.target.dataset.providerId)
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
                            "data-href": getDeleteDoorUrl(unit_data[zero].unit_info.unit.provider_id),
                            "data-provider-id": unit_data[zero].unit_info.unit.provider_id,
                            "data-plotted-category": "unit_door"
                        }
                    )
                  
                    $("#door_"+button.dataset.providerId).attr(
                        {
                            "id": "door_" + unit_data[zero].unit_info.unit.provider_id,
                            "data-door-id": unit_data[zero].unit_info.door.id,
                            "title": unit_data[zero].unit_info.door.name,
                        }
                    )

                    $("#m_"+button.dataset.providerId).attr(
                        {
                            "id": "m_" + unit_data[zero].unit_info.unit.provider_id,
                            "title": unit_data[zero].unit_info.unit.building == null ? unit_data[zero].unit_info.unit.name : unit_data[zero].unit_info.unit.building + "-" + unit_data[zero].unit_info.unit.name,
                            "data-href": "/communities/" + community_id + "/units/" + unit_data[zero].unit_info.unit.provider_id + "/remove_plot_from_floorplate?floorplate_id=" + floorplate_id,
                            "data-unit-form-url": "/communities/" + community_id + "/units/" + unit_data[zero].unit_info.unit.id + "/adjust_position"
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

function get_unit_locks(provider_id){
    $(".modal-loader").removeClass("hidden")
    $.post( "/communities/" + community_id + "/units/" + provider_id + "/ajax_load_unit_locks",
    { 
      "locks_present_hash": JSON.stringify(locks_present_hash),
    })
}

function update_locks_select_and_lock_code_field(){
    debugger
    // if any lock selected 
    if ($('#unit_lock_provider').val().length > 0 && $('#unit_lock_provider').val() != "Manual" ){
      $('#manual_access_code').addClass('hide_it')
      // initialize elements 
      lock_provider_type = $('#unit_lock_provider').val().toLowerCase()
      lock_input_value = "#" + lock_provider_type + "_lock_input_value"
      options = '.' + lock_provider_type + "_options"
      locks_input = "#lock_input"

      $('#lock_input').val( $(lock_input_value).val() )
      $('datalist#locks_list').html($(options).html())
      $('#lock_access_code').removeClass('hide_it') 
    }
    else if ($('#unit_lock_provider').val().length > 0){
      $('#lock_access_code').addClass('hide_it')
      $('#manual_access_code').removeClass('hide_it')
      locks_input = undefined
    }  
    else
    {
      $('#lock_access_code').addClass('hide_it')
      $('#manual_access_code').addClass('hide_it')
    }
}

function add_into_selected_doors(event){
    debugger
    var door_id = $(event).attr("id").split("--")[0]
    var provider_id = $(event).attr("id").split("--")[1]
    var door_name = $(event).children("span").text()

    var selected_doors = JSON.parse($('#selected_doors_info').val());
    selected_doors.push({door_id: door_id, door_name: door_name, provider_id: provider_id});

    $('#selected_doors_info').val(JSON.stringify(selected_doors));
    console.log($('#selected_doors_info').val());
}

function remove_from_selected_doors(event){
    debugger
    var provider_id = $(event).attr("id").split("--")[1]
    var selected_doors = JSON.parse($('#selected_doors_info').val());

    var index = selected_doors.findIndex(data => data.provider_id == provider_id);
    unselected_door = selected_doors.splice(index,1)

    $('#selected_doors_info').val(JSON.stringify(selected_doors));
    console.log($('#selected_doors_info').val());
}

$(document).ready(function(){
    $(".ajax-btn-delete").click(function(event){
        event.preventDefault();
        debugger
        delete_plot( $(event.target).attr('data-plotted-category'), $(event.target).attr('data-href') )
    });

    $("#ajax-doors-detail-modal").on('show.bs.modal', function(event) {
        debugger
        get_unit_locks(event.relatedTarget.id.split("_")[1])
        xpos = Math.round(parseFloat((event.relatedTarget.style.left)))
        ypos = Math.round(parseFloat((event.relatedTarget.style.top)))
        same_location_doors = getUnitDoorsAtSameLocation(xpos, ypos)
        sortSelectedDoors(event, same_location_doors)
        createDoorButtonsInDoorModal(event, same_location_doors)
    })

    $("#ajax-add-others-plotted-doors-modal").on('show.bs.modal', function(event) {
        debugger
        provider_ids = []
        $('.doors-list-on-popup').multiSelect('removeAllOptions')

        all_door_buttons = $(".door-buttons-in-door-modal").children()
        all_door_buttons.map(function(index, button){provider_ids.push(button.dataset.providerId)})

        units_data = allPlottedunitDoorsExceptTheseProviderIds(provider_ids)
        for(var row of units_data)
            $('.doors-list-on-popup').multiSelect('addOption', { value: (row.unit_info.door.id + '--' + row.unit_info.unit.provider_id + "--"), text: row.unit_info.door.name});
    })
    
    $('#locks-modal-submit').click(function(){
        var lock = $("#lock_input")[0];
        $("#save_lock").css('visibility', 'visible')

        if(typeof lock !== 'undefined'){
            if(lock.checkValidity() == true){
                lock_id = $("#locks_list" + ' [value="' + lock.value + '"]').data('value')
                input = $("<input>").attr("type", "hidden").attr("name", "lock_id").val(lock_id);
                $("#" + lock.id).closest('form').append(input)
                $("#" + lock.id).closest('form').submit()
            }
            else{ lock.reportValidity(); }
        }
       
    })

    $('#update-other-plotted-doors').click(function(){
        debugger
        selected_doors = JSON.parse($('#selected_doors_info').val())
        data = getUnitDoorsByUnitProviderId($(".delete-door-marker").attr("data-provider-id"))[zero]

        doors_ids = []
        for(var door of selected_doors)
            doors_ids.push(door.door_id)
        
        $.ajax({
            type: "post",
            url:   "/communities/" + community_id + "/units/update_unitdoors_plot_for_floorplate",
            data: {ids: doors_ids, x_plot: data.unit_info.door.x_plot, y_plot: data.unit_info.door.y_plot},
            cache: false,
            success: function(response) {
                debugger
                provider_ids = []
                for(var door of selected_doors)
                    provider_ids.push(door.provider_id)
                
                units_data =updateGivenUnitDoorsPlotting(provider_ids, data.unit_info.door.x_plot, data.unit_info.door.y_plot)
            },
            fail: function(response) {},
        })
    })

    $('.doors-selects-in-popup').delegate("li", "click", function() {
        debugger
        if($(this).hasClass("ms-selected"))
            add_into_selected_doors(this)
        else
            remove_from_selected_doors(this)
    });
    
})