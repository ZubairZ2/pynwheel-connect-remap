const zero = 0

function delete_plot(removing, url){
    if ( typeof floorplate_id !== 'undefined' || typeof sitemap_id !== 'undefined' ){
        if(removing == "unit_door")
            removeUnitDoorPlot(url)
    }
    else if(typeof floorplate_id_for_amenity !== 'undefined' || typeof sitemap_id_for_amenity !== 'undefined' ){
        if(removing == "amenity_door")
            removeAmenityDoorPlot(url)
    }
}

function saveUnitDoorPlot(id, dx, dy){
    $.post( "/communities/"+community_id+"/units/" + id + "/plot_unit_door",
    { 
      "x_plot": dx,
      "y_plot": dy
    //   "floorplate_id": floorplate_id
    }).done(function(response) {
        if(response.success){
            try {
                $("#plus_" + id).remove()
                $("#door_" + response.unit.provider_unit_id).attr(
                    {
                        "title": response.door.name,
                        "data-door-id": response.door.id
                    }
                )
                updateDoorInfo(response.door, fetchUnitIndex(response.unit.id))
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
                if(response.status == "created")
                    CreateAmenityDoorInfo(response.amenity, response.door)
                else
                    updateDoorInfo(response.door, fetchDoorIndex(response.door.id))
            }
            catch(err) {
                location.reload()
            }
        }
        else
            location.reload()
     });
}

function removeUnitDoorPlot(url){
    $.ajax({
        type: "delete",
        url:  url,
        cache: false,
        success: function(response) {
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
                                unit_data = getUnitDoorInfoByUnitProviderId(new_primary_button.dataset.providerId)
               
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
                                if (typeof floorplate_id !== "undefined"){
                                    $("#m_"+response.unit.provider_unit_id).attr(
                                        {
                                            "id": "m_" + unit_data[zero].unit_info.unit.provider_id,
                                            "title": unit_data[zero].unit_info.unit.building == null ? unit_data[zero].unit_info.unit.name : unit_data[zero].unit_info.unit.building + "-" + unit_data[zero].unit_info.unit.name,
                                            "data-href": "/communities/" + community_id + "/units/" + unit_data[zero].unit_info.unit.provider_id + "/remove_plot_from_floorplate?floorplate_id=" + floorplate_id,
                                            "data-unit-form-url": "/communities/" + community_id + "/units/" + unit_data[zero].unit_info.unit.id + "/adjust_position"
                                        }
                                    )
                                }
                                else if (typeof sitemap_id !== "undefined"){
                                    $("#m_"+response.unit.provider_unit_id).attr(
                                        {
                                            "id": "m_" + unit_data[zero].unit_info.unit.provider_id,
                                            "title": unit_data[zero].unit_info.unit.building == null ? unit_data[zero].unit_info.unit.name : unit_data[zero].unit_info.unit.building + "-" + unit_data[zero].unit_info.unit.name,
                                            "data-href": "/communities/" + community_id + "/units/" + unit_data[zero].unit_info.unit.provider_id + "/remove_plot",
                                            "data-unit-form-url": "/communities/" + community_id + "/units/" + unit_data[zero].unit_info.unit.id + "/adjust_position"
                                        }
                                    )
                                }
                                
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

                    deleteDoorInfo(fetchUnitIndex(response.unit.id))
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

function removeAmenityDoorPlot(url){
    $.ajax({
        type: "delete",
        url:  url,
        cache: false,
        success: function(response) {
            if(response.success){
                $('#amenity-door-detail-modal').modal('hide');
                $('[data-door-id=' + response.door.id + ']').remove()
                deleteDoorInfo(fetchDoorIndex(response.door.id))
            }
            else
                location.reload()
        },
        fail: function(response) {location.reload()}
    })
}

// --------------------      All functions in DataSet on UnitAndDoors    ----------------------- //

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

function updateDoorInfo(updated_door ,position){
    units_info[position].unit_info.door = updated_door
}

function deleteDoorInfo(position){
    units_info[position].unit_info.door = {}
}

function getUnitDoorInfoByDoorCoords(xpos, ypos){
    return units_info.filter(row => row.unit_info.door.x_plot == xpos && row.unit_info.door.y_plot == ypos)
}

function getUnitDoorInfoByUnitCoords(xpos, ypos){
    return units_info.filter(row => row.unit_info.unit.x_plot == xpos && row.unit_info.unit.y_plot == ypos)
}

function getUnitDoorInfoByUnitProviderId(provider_id){
    return units_info.filter(row => row.unit_info.unit.provider_id == provider_id)
}

function allPlottedDoors(){
    return units_info.filter(row => !jQuery.isEmptyObject(row.unit_info.door))
}

function allPlottedDoors_ExceptGivenCoords(xpos, ypos){
    return units_info.filter(row => ( Object.keys(row.unit_info.door).length !== zero && row.unit_info.door.x_plot != xpos && row.unit_info.door.y_plot != ypos ) )
}

function allPlottedDoors_ExceptGivenProviderId(provider_id){
    return units_info.filter(row => ( Object.keys(row.unit_info.door).length !== zero && row.unit_info.unit.provider_id != provider_id) )
}

function allPlottedDoors_ExceptGivenProviderIDs(provider_ids){
    return units_info.filter(row => ( Object.keys(row.unit_info.door).length !== zero && provider_ids.includes(row.unit_info.unit.provider_id) == false) )
}

function updateGivenUnits_DoorPlotting(provider_ids, x_plot, y_plot){

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

//   -----------------------------------------------------------------------   //


// this function is called whenever doors modal for units is opened 
function createDoorButtonsInDoorModal(event, attached_doors){

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

// this function is called whenever doors modal for units is opened to load locks data for the active Unit
function get_unit_locks(provider_id){
    $(".modal-loader").removeClass("hidden")
    $.post( "/communities/" + community_id + "/units/" + provider_id + "/load_unit_door_lock",
    { 
      "locks_present_hash": JSON.stringify(locks_present_hash),
    })
}

// this function whenever previously deleted doors buttons are added again in Unit Doors modal
function AddNewDoorButtonsInDoorModal(provider_id, door){
    if ($('.door-buttons-in-door-modal').children().length == 1)
        $('.door-buttons-in-door-modal').children().css({'visibility': 'visible', 'margin-top': "0px"})
    $('.door-buttons-in-door-modal').append(`<button class="btn modal-unit-button ml-5 mb-5 btn-default" data-provider-id="${provider_id}" type="button" onclick="change_selected_in_unit_modal(event)"> ${door.name} </button>`);
}

// this function called to rearrange the buttonns such that first button or the last selected one should be active
function sortSelectedDoors(event, same_location_doors){
    // sort if required, first one should be according to the current name of plotted unit
    try{
        currently_selected_provider_id = event.relatedTarget.id.split("_")[1]
        if(same_location_doors[zero].unit_info.unit.provider_id != currently_selected_provider_id){
        
            var index;    
            for(index=zero; index < same_location_doors.length; index++ ){
            if(same_location_doors[index].unit_info.unit.provider_id == currently_selected_provider_id)
                break;
            }
        
            same_location_doors[index] = same_location_doors[zero]
            same_location_doors[zero] = getUnitDoorInfoByUnitProviderId(currently_selected_provider_id)[zero]
        }
    }
    catch(err) {
        location.reload()
    }
}

// this function called to rearrange the buttonns such that first button or the last selected one should be active
function change_selected_in_unit_modal(event){

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
                    unit_data = getUnitDoorInfoByUnitProviderId(event.target.dataset.providerId)
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

                    if (typeof floorplate_id !== "undefined"){
                        $("#m_"+button.dataset.providerId).attr(
                            {
                                "id": "m_" + unit_data[zero].unit_info.unit.provider_id,
                                "title": unit_data[zero].unit_info.unit.building == null ? unit_data[zero].unit_info.unit.name : unit_data[zero].unit_info.unit.building + "-" + unit_data[zero].unit_info.unit.name,
                                "data-href": "/communities/" + community_id + "/units/" + unit_data[zero].unit_info.unit.provider_id + "/remove_plot_from_floorplate?floorplate_id=" + floorplate_id,
                                "data-unit-form-url": "/communities/" + community_id + "/units/" + unit_data[zero].unit_info.unit.id + "/adjust_position"
                            }
                        )
                    }
                    else if (typeof sitemap_id !== "undefined"){
                        $("#m_"+button.dataset.providerId).attr(
                            {
                                "id": "m_" + unit_data[zero].unit_info.unit.provider_id,
                                "title": unit_data[zero].unit_info.unit.building == null ? unit_data[zero].unit_info.unit.name : unit_data[zero].unit_info.unit.building + "-" + unit_data[zero].unit_info.unit.name,
                                "data-href": "/communities/" + community_id + "/units/" + unit_data[zero].unit_info.unit.provider_id + "/remove_plot",
                                "data-unit-form-url": "/communities/" + community_id + "/units/" + unit_data[zero].unit_info.unit.id + "/adjust_position"
                            }
                        )
                    }

                    break;
                }
            }
        }

    }
    catch(err) {
        location.reload()
    }
}

// to adjust the locks provider and selected lock data for the active Unit in UnitDoorModal
var digital_lock = false
function update_locks_fields(){

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

            $('datalist#locks_list').html(selected_lock_options)
            $('#lock_name').val(selected_lock_name)

            $('#lock_name').change()
            digital_lock = true
        }
    }
}

// this function is called whenever door is selected in AddNewDoorModal
function add_into_selected_doors(event){

    var provider_id = $(event).attr("id").replace('-selectable', '')
    var door_name = $(event).children("span").text()

    var selected_doors = JSON.parse($('#selected_doors_info').val());
    selected_doors.push({door_name: door_name, provider_id: provider_id});

    $('#selected_doors_info').val(JSON.stringify(selected_doors));
    console.log($('#selected_doors_info').val());
}

// this function is called whenever door is removed in AddNewDoorModal
function remove_from_selected_doors(event){

    var provider_id = $(event).attr("id").replace('-selection', '')
    var selected_doors = JSON.parse($('#selected_doors_info').val());

    var index = selected_doors.findIndex(data => data.provider_id == provider_id);
    selected_doors.splice(index,1)

    $('#selected_doors_info').val(JSON.stringify(selected_doors));
    console.log($('#selected_doors_info').val());
}

// this function is called whenever doors modal for amenity is opened 
function open_amenity_door_modal(event){

    amenity_id = event.currentTarget.id.split("_")[1]
    door_id = event.currentTarget.dataset.doorId

    if(typeof floorplate_id_for_amenity !== "undefined")
        url = "/communities/" + community_id + "/floorplates/" + floorplate_id_for_amenity + "/amenities/" + amenity_id + "/load_amenity_door_lock"
    else
        url = "/communities/" + community_id + "/sitemaps/" + sitemap_id_for_amenity + "/amenities/" + amenity_id + "/load_amenity_door_lock"
    
    $.post( url,
    {
        "floor": floor,
        "door_id": door_id,
        "locks_present_hash": JSON.stringify(locks_present_hash),
    })
    
}

function getDeleteDoorUrl(provider_id){
   
    if (typeof floorplate_id !== 'undefined' || typeof sitemap_id !== 'undefined'){
        return '/communities/'+community_id+'/units/'+provider_id+'/remove_unit_door_plot'
    }
}

function getDoorTag(provider_id){
    if (typeof floorplate_id !== 'undefined' || typeof sitemap_id !== 'undefined')
    {   
        tag =   `<a id="door_${provider_id}" class="marker ui-draggable ui-draggable-handle" style="left:${dx}px; top:${dy}px; position:absolute; font-size: ${door_fontsize}px;" title="${provider_id} (door)" data-toggle="modal" data-target="#ajax-doors-detail-modal" data-plotted-category="unit_door" href="javascript:void(0)">
                    <i class="fa fa-sign-in fa-xs" style="color: ${door_marker_color};"></i>
                </a>`
    }
    else if(typeof floorplate_id_for_amenity !== 'undefined' || typeof sitemap_id_for_amenity !== 'undefined'){
        amenity_id = provider_id
        tag =   `<a id="amenity_${amenity_id}" class="marker ui-draggable ui-draggable-handle" style="left:${dx}px; top:${dy}px; position:absolute; font-size: ${door_fontsize}px;" title="${amenity_id} (door)" data-toggle="modal" data-target="#amenity-door-detail-modal" data-plotted-category="amenity_door" href="javascript:void(0)" onclick="open_amenity_door_modal(event)">
                    <i class="fa fa-sign-in fa-xs" style="color: ${door_marker_color};"></i>
                </a>`
    }
    return tag
}

function attachPlusIconWithUnit(unit){
    plus_icon = returnPlusIconTag(unit.provider_unit_id, "unit", -6)
    $(("#m_"+unit.provider_unit_id)).after(plus_icon)
}

function returnPlusIconTag(id, for_, margin){
    return `<a id="plus_${id}" style="margin-left: ${margin}px;" title="Click to plot this ${for_}(s) door" data-toggle="tooltip" data-plotted-category="create_${for_}_door" onclick="plot_entry_point(event)" href="javascript:void(0)">
                <i class="fa fa-plus-circle fa-xs" style="color: #59de83; font-size: ${marker_font_size/2}px;"></i>
            </a>`
}

$(document).ready(function(){
    $(".ajax-btn-delete").click(function(event){
        event.preventDefault();

        delete_plot( $(event.target).attr('data-plotted-category'), $(event.target).attr('data-href') )
    });

    $("#ajax-doors-detail-modal").on('show.bs.modal', function(event) {

        get_unit_locks(event.relatedTarget.id.split("_")[1])
        xpos = Math.round(parseFloat((event.relatedTarget.style.left)))
        ypos = Math.round(parseFloat((event.relatedTarget.style.top)))
        same_location_plotted_doors = getUnitDoorInfoByDoorCoords(xpos, ypos)
        sortSelectedDoors(event, same_location_plotted_doors)
        createDoorButtonsInDoorModal(event, same_location_plotted_doors)
    })

    $("#ajax-remaining-doors-modal").on('show.bs.modal', function(event) {

        $('#selected_doors_info').val('[]')
        $('.doors-list-on-popup').multiSelect('removeAllOptions')
        buttons = $('.door-buttons-in-door-modal').find("button")

        plotted_doors_in_modal = []

        active_provider_id = $(".delete-door-marker")[0].dataset.providerId
        
        plotted_unit = unitsArr.filter(
            ({ providerId }) => providerId == active_provider_id
        )[zero];

        units_associated_with_this_modal = unitsArr
            .filter(
                ({ xPlot, yPlot }) =>
                    xPlot == plotted_unit.x_plot &&
                    yPlot == plotted_unit.y_plot
            )
            .map(({ providerId }) => providerId);
        buttons.map(function (index, button) {
            plotted_doors_in_modal.push(button.dataset.providerId);
        });

        unplotted_provider_ids =  units_associated_with_this_modal.filter(plotted_unit_provider_id => !plotted_doors_in_modal.includes(plotted_unit_provider_id))

        for(var provider_id of unplotted_provider_ids)
            $('.doors-list-on-popup').multiSelect('addOption', { value: provider_id, text: provider_id + " (door 1)"});
    })
    
    $('.locks-modal-submit').click(function(){

        if(digital_lock == true){
            lock = $("#lock_name")[0]
            if(lock.checkValidity() == true){
                $(".save_lock").css('visibility', 'visible')
                lock_id = $("#locks_list" + ' [value="' + lock.value + '"]').data('value')
                $("#lock_id").val(lock_id)
                $("#lock_id").closest('form').submit()
                setTimeout(function() { $(".save_lock").css('visibility', 'hidden') }, 1500);
            }
            else if ($(lock).val() == ""){
                $(".save_lock").css('visibility', 'visible')
                $("#lock_id").val("")
                $("#lock_id").closest('form').submit()
                setTimeout(function() { $(".save_lock").css('visibility', 'hidden') }, 1500);
            }
            else
                lock.reportValidity(); 
        }
        else{
            $(".save_lock").css('visibility', 'visible')
            $("#lock_id").val("")
            $("#lock_id").closest('form').submit()
            setTimeout(function() { $(".save_lock").css('visibility', 'hidden') }, 1500);
        }
       
    })

    $('#add-unplotted-doors').click(function(){

        if($('#selected_doors_info').val() != "[]"){
            selected_doors = JSON.parse($('#selected_doors_info').val())
            door = getUnitDoorInfoByUnitProviderId($(".delete-door-marker").attr("data-provider-id"))[zero].unit_info.door
    
            provider_ids = selected_doors.map(function(obj){return obj.provider_id})
    
            $.ajax({
                type: "post",
                url:  "/communities/" + community_id + "/units/plot_multiple_units_door_for_floorplate",
                data: {ids: provider_ids, x_plot: door.x_plot, y_plot: door.y_plot},
                cache: false,
                success: function(response) {
                    for(var unit_data of response.data){
                        updateDoorInfo(unit_data.door, fetchUnitIndex(unit_data.id))
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

        if($(this).hasClass("ms-selected"))
            add_into_selected_doors(this)
        else
            remove_from_selected_doors(this)
    });
    
})


// -----------------------  functions used while draging doors  --------------------------- //

function is_ui_a_door(ui){
  return typeof ui.helper.attr("id") != "undefined"  && ui.helper.attr("id").includes("door")
}

function start__door_work(event, ui){
  xpos = Math.round(ui.position.left);
  ypos = Math.round(ui.position.top);
  same_location_doors = getUnitDoorInfoByDoorCoords(xpos, ypos)
}

function drag__door_work(event, ui){
  // for(var row of same_location_doors)
  //   $('#door_' + row.unit_info.unit.provider_id).css({"left": Math.round(ui.position.left), "top": Math.round(ui.position.top)});
  // $('#door_' + row.unit_info.unit.provider_id).css({"left": Math.round(ui.position.left), "top": Math.round(ui.position.top)});
}

function stop__door_work(event, ui){

    for(var row of same_location_doors){
        row.unit_info.door.x_plot = Math.round(parseFloat(ui.position.left));
        row.unit_info.door.y_plot = Math.round(parseFloat(ui.position.top));
        if(ui.helper.data("plotted-category") == "unit_door")
            saveDraggedDoor(row.unit_info.unit.provider_id, row.unit_info.door.x_plot, row.unit_info.door.y_plot, same_location_doors.length)
        else{
            adddoorsmode = true
            savePlot(row.unit_info.unit.provider_id, row.unit_info.door.x_plot, row.unit_info.door.y_plot, row.unit_info.door.id) 
            adddoorsmode = false
        }
        // saveAmenityDoorPlot(row.unit_info.unit.provider_id, row.unit_info.door.x_plot, row.unit_info.door.y_plot, row.unit_info.door.id);
    }
}

function saveDraggedDoor(id, dx, dy, doors_count){
  current_door = 1
  if ($(".mapLoading").hasClass("hidden")) $(".mapLoading").removeClass("hidden") 

  if(typeof floorplate_id !== "undefined")
    property_type_id = floorplate_id
  else if(typeof sitemap_id !== "undefined")
    property_type_id = sitemap_id


  $.post( "/communities/"+community_id+"/units/" + id + "/plot_unit_door",
  { 
    "x_plot": dx,
    "y_plot": dy,
    "property_type_id": property_type_id
  }).done(function(response) {

    if(response.success){
      try {
        if(response.success){
          if(current_door == doors_count)
            $(".mapLoading").addClass("hidden");
          else
            current_door = current_door + 1
        }
      }
      catch(err) {
        location.reload()
      }
    }
    else
      location.reload()
  })
}
