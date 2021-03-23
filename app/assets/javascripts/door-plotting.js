const zero = 0
function saveAccessPoint(dx, dy, id){
    
}

function delete_plot(removing, url){
    debugger
    if ( typeof floorplate_id !== 'undefined'){
        if(removing == "unit_door")
            delete_unit_door_plot(url)
    }
    else if(typeof floorplate_id_for_amenity !== 'undefined' || typeof sitemap_id_for_amenity !== 'undefined' ){
        if(removing == "amenity_door")
            delete_amenity_door_plot(url)
    }
}

function saveUnitDoor(id, dx, dy){
    $.post( "/communities/"+community_id+"/units/" + id + "/ajax_plot_unit_door",
    { 
      "x_plot": dx,
      "y_plot": dy
    //   "floorplate_id": floorplate_id
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

function saveAmenityDoorPlot(id,dx,dy,door_id){

    if(typeof floorplate_id_for_amenity !== "undefined")
        url = "/communities/"+community_id+"/floorplates/"+floorplate_id_for_amenity+"/amenities/" + id + "/plot_amenity_door"
    else
        url = "/communities/"+community_id+"/sitemaps/"+sitemap_id_for_amenity+"/amenities/" + id + "/plot_amenity_door"
  
    $.post( url,
     { 
        "x_plot": dx,
        "y_plot": dy,
        "floor" : floor,
        "door_id" : door_id,
     }).done(function(response) {
        debugger
        if(response.success){
            try {
                $("#plus_" + id).removeClass('disabled')
                $("#plus_" + id).children().css({"color": "#59de83", "cursor": "default"})

                $("#amenity_" + response.amenity.id).attr(
                    {
                        "title": response.door.name,
                        "data-door-id": response.door.id,
                        "id": "#amenity_" + response.amenity.id + "__" + "door_" + response.door.id,
                    }
                )
                debugger
                if(response.status == "created")
                    CreateAmenityDoorInfo(response.amenity, response.door)
                else
                    updateUnitDoorsInfo(response.door, fetchDoorIndex(response.door.id))
            }
            catch(err) {
                location.reload()
            }
        }
        else
            location.reload()
     });
}

function delete_unit_door_plot(url){
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

function delete_amenity_door_plot(url){
    $.ajax({
        type: "delete",
        url:  url,
        cache: false,
        success: function(response) {
            if(response.success){
                $('#amenity-door-detail-modal').modal('hide');
                $('[data-door-id=' + response.door.id + ']').remove()
                deleteUnitDoorsInfo(fetchDoorIndex(response.door.id))
            }
            else
                location.reload()
        },
        fail: function(response) {location.reload()}
    })
}

function fetchUnitIndex(id){
    selected_doors_index = []
    $(units_info).filter(function (i,row){
        if(row.unit_info.unit.id == id)
            selected_doors_index.push(i)
    })
    return selected_doors_index
}

function fetchDoorIndex(id){
    selected_doors_index = []
    $(units_info).filter(function (i,row){
        if(row.unit_info.door.id == id)
            selected_doors_index.push(i)
    })
    return selected_doors_index
}

function CreateAmenityDoorInfo(amenity, door){
    units_info[units_info.length] = {
        unit_info: { unit: { id: amenity.id, name: amenity.name, building: amenity.building, provider_id: amenity.id, x_plot: amenity.x_plot, y_plot: amenity.x_plot }, door: door }
    }
}

function updateUnitDoorsInfo(updated_door ,position){
    units_info[position].unit_info.door = updated_door
}

function deleteUnitDoorsInfo(position){
    units_info[position].unit_info.door = {}
}

function getUnitDoorsAtSameLocationByDoorCoords(xpos, ypos){
    return units_info.filter(row => row.unit_info.door.x_plot == xpos && row.unit_info.door.y_plot == ypos)
}

function getUnitDoorsAtSameLocationByUnitCoords(xpos, ypos){
    return units_info.filter(row => row.unit_info.unit.x_plot == xpos && row.unit_info.unit.y_plot == ypos)
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

function getUnitDoorsAtGivenLocationExceptTheseProviderIds(provider_ids, x_plot, y_plot){
    return units_info.filter(row => ( Object.keys(row.unit_info.door).length !== zero && provider_ids.includes(row.unit_info.unit.provider_id) == false && row.unit_info.unit.x_plot == xpos && row.unit_info.unit.y_plot == ypos) )
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
            $('.door-buttons-in-door-modal').append(`<button class="btn modal-unit-button ml-5 mb-5 ${button_style}" data-provider-id="${row.unit_info.unit.provider_id}" type="button" onclick="change_selected_in_unit_modal(event)"> ${row.unit_info.door.name} </button>`);
        else
            $('.door-buttons-in-door-modal').append(`<button class="btn modal-unit-button ml-5 mb-5 ${button_style}" data-provider-id="${row.unit_info.unit.provider_id}" type="button" onclick="change_selected_in_unit_modal(event)" style="visibility: hidden; margin-top: -20px;"> ${row.unit_info.door.name} </button>`);
    }
    // ajax-btn-delete
}

function AddNewDoorButtonsInDoorModal(provider_id, door){
    if ($('.door-buttons-in-door-modal').children().length == 1)
        $('.door-buttons-in-door-modal').children().css({'visibility': 'visible', 'margin-top': "0px"})
    $('.door-buttons-in-door-modal').append(`<button class="btn modal-unit-button ml-5 mb-5 btn-default" data-provider-id="${provider_id}" type="button" onclick="change_selected_in_unit_modal(event)"> ${door.name} </button>`);
}

function sortSelectedDoors(event, same_location_doors){
    // sort if required, first in selected should be according to the current name of plotted unit
    try{
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
    catch(err) {
        location.reload()
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
    if(enable_locks == true){
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
}

var digital_lock = false
function update_locks_fields(){
    debugger
    // if any lock selected 
    if(enable_locks == true){
        if($('#lock_provider').val() == '' || $('#lock_provider').val() == null){
            $('#access_code_field').addClass('hidden')
            $('#digital_lock_field').addClass('hidden')
            digital_lock = false
        }
        else if($('#lock_provider').val() == "Manual" ){
            $('#digital_lock_field').addClass('hidden')
            $('#access_code_field').removeClass('hidden')
            digital_lock = false
        }
        else{
            $('#digital_lock_field').removeClass('hidden')
            $('#access_code_field').addClass('hidden') 
            
            lock_provider         =  $('#lock_provider').val().toLowerCase()
            selected_lock_name    =  $("#"+lock_provider+"_lock_name").val()
            selected_lock_options =  $('.'+lock_provider+"_options").html()
            debugger
            $('datalist#locks_list').html(selected_lock_options)
            $('#lock_name').val(selected_lock_name)

            $('#lock_name').change()
            digital_lock = true
        }
    }
}

function add_into_selected_doors(event){
    debugger
    var provider_id = $(event).attr("id").replace('-selectable', '')
    var door_name = $(event).children("span").text()

    var selected_doors = JSON.parse($('#selected_doors_info').val());
    selected_doors.push({door_name: door_name, provider_id: provider_id});

    $('#selected_doors_info').val(JSON.stringify(selected_doors));
    console.log($('#selected_doors_info').val());
}

function remove_from_selected_doors(event){
    debugger
    var provider_id = $(event).attr("id").replace('-selection', '')
    var selected_doors = JSON.parse($('#selected_doors_info').val());

    var index = selected_doors.findIndex(data => data.provider_id == provider_id);
    selected_doors.splice(index,1)

    $('#selected_doors_info').val(JSON.stringify(selected_doors));
    console.log($('#selected_doors_info').val());
}

function open_amenity_door_modal(event){
    debugger
    amenity_id = event.currentTarget.id.split("_")[1]
    door_id = event.currentTarget.dataset.doorId

    if(typeof floorplate_id_for_amenity !== "undefined")
        url = "/communities/" + community_id + "/floorplates/" + floorplate_id_for_amenity + "/amenities/" + amenity_id + "/show_amenity_door_modal"
    else
        url = "/communities/" + community_id + "/sitemaps/" + sitemap_id_for_amenity + "/amenities/" + amenity_id + "/show_amenity_door_modal"
    
    $.post( url,
    {
        "floor": floor,
        "door_id": door_id,
        "locks_present_hash": JSON.stringify(locks_present_hash),
    })
    
}

function drawAccessPoint(event){
    debugger
    if ($(event.currentTarget).hasClass('disabled')) return;
    $(event.currentTarget).addClass('disabled');
    $(event.target).css({"color": "#c9ffdd"})

    AccessPointPlot = true
}

function createAccessPointPlot(dx,dy){
    $.post( "/communities/"+community_id+"/create_access_point_plot",
    { 
      "x_plot": dx,
      "y_plot": dy,
    }).done(function(response) {

    })
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
        same_location_plotted_doors = getUnitDoorsAtSameLocationByDoorCoords(xpos, ypos)
        sortSelectedDoors(event, same_location_plotted_doors)
        createDoorButtonsInDoorModal(event, same_location_plotted_doors)
    })

    $("#ajax-remaining-doors-modal").on('show.bs.modal', function(event) {
        debugger
        $('#selected_doors_info').val('[]')
        $('.doors-list-on-popup').multiSelect('removeAllOptions')
        buttons = $('.door-buttons-in-door-modal').find("button")

        plotted_doors_in_modal = []

        active_provider_id = $(".delete-door-marker")[0].dataset.providerId
        plotted_unit = arr.filter(data => data[zero] == active_provider_id)[zero]

        units_associated_with_this_modal = arr.filter(data => data[1] == plotted_unit[1] && data[2] == plotted_unit[2]).map(function(data) { return data[zero]})
        buttons.map(function(index, button){plotted_doors_in_modal.push(button.dataset.providerId)})

        unplotted_provider_ids =  units_associated_with_this_modal.filter(plotted_unit_provider_id => !plotted_doors_in_modal.includes(plotted_unit_provider_id))

        for(var provider_id of unplotted_provider_ids)
            $('.doors-list-on-popup').multiSelect('addOption', { value: provider_id, text: provider_id + " (door 1)"});
    })
    
    $('#locks-modal-submit').click(function(){
        debugger
        if(digital_lock == true){
            lock = $("#lock_name")[0]
            if(lock.checkValidity() == true){
                $("#save_lock").css('visibility', 'visible')
                lock_id = $("#locks_list" + ' [value="' + lock.value + '"]').data('value')
                $("#lock_id").val(lock_id)
                $("#lock_id").closest('form').submit()
                setTimeout(function() { $("#save_lock").css('visibility', 'hidden') }, 1500);
            }
            else{ lock.reportValidity(); }
        }
        else{
            $("#save_lock").css('visibility', 'visible')
            $("#lock_id").val("")
            $("#lock_id").closest('form').submit()
            setTimeout(function() { $("#save_lock").css('visibility', 'hidden') }, 1500);
        }
       
    })

    $('#add-unplotted-doors').click(function(){
        debugger
        if($('#selected_doors_info').val() != "[]"){
            selected_doors = JSON.parse($('#selected_doors_info').val())
            door = getUnitDoorsByUnitProviderId($(".delete-door-marker").attr("data-provider-id"))[zero].unit_info.door
    
            provider_ids = selected_doors.map(function(obj){return obj.provider_id})
    
            $.ajax({
                type: "post",
                url:  "/communities/" + community_id + "/units/update_unitdoors_plot_for_floorplate",
                data: {ids: provider_ids, x_plot: door.x_plot, y_plot: door.y_plot},
                cache: false,
                success: function(response) {
                    for(var unit_data of response.data){
                        updateUnitDoorsInfo(unit_data.door, fetchUnitIndex(unit_data.id))
                        AddNewDoorButtonsInDoorModal(unit_data.provider_id, unit_data.door)
                    }
                    $("#ajax-remaining-doors-modal").modal('hide');
                },
                fail: function() {
                    location.reload()
                },
            })
        }
    })

    $('.doors-selects-in-popup').delegate("li", "click", function() {
        debugger
        if($(this).hasClass("ms-selected"))
            add_into_selected_doors(this)
        else
            remove_from_selected_doors(this)
    });
    
})