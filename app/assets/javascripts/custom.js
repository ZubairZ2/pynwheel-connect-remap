$(document).ready(function(e){

  ////////// Custom Code for Neighborhood Categories Multi Select starts here //////////
  $('body').on("click", function(e){
    $("#multiselect").hide();
  })
   
  $('body').on("click", ".multiselect", function(e){
    $("#multiselect").toggle();
    e.stopPropagation();
  })

  $('body').on("click", ".imageselect", function(e){
    $("#imageselect").toggle();
    e.stopPropagation();
  })

  $("#multiselect li").click(function(e){
    if ($(this).hasClass("active")){
      $(this).removeClass("active")
    }else{
      $(this).addClass("active")
    }
    //$("#categories_field").val('Dining,Parks')
    populate_multiselect()
    e.stopPropagation()
  })
  ////////// Custom Code for Neighborhood Categories Multi Select ends here //////////

    $('.preview-image').click(function(event){  
      event.preventDefault();
      $(this).ekkoLightbox({
        alwaysShowClose: true
      });  
    }); 

    //validates form
    $("form").validationEngine({binded: false});
    /* Activating Best In Place */
    jQuery(".best_in_place").best_in_place();

    /*color picker*/
    $('#rgba-format-colorpicker').colorpicker({format: 'rgba'}).on('create',function(event){
          $('#c-style-background-color-text-field').val(background_color);
    })
    .on('changeColor', function(event){
        
        if ( typeof event.value !== 'undefined'){ 
          var rgba_color = rgbaToHex(event.value); 
          console.log(rgba_color); 
          $('#c-style-background-color-text-field').val(rgba_color);
        }
        
    });
    $('.hex-format-colorpicker').colorpicker({format: 'hex'});

var headertext = [],
    headers = document.querySelectorAll("#miyazaki th"),
    tablerows = document.querySelectorAll("#miyazaki th"),
    tablebody = document.querySelector("#miyazaki tbody");

for(var i = 0; i < headers.length; i++) {
    var current = headers[i];
    headertext.push(current.textContent.replace(/\r?\n|\r/,""));
}
if (tablebody != null) {
    for (var i = 0, row; row = tablebody.rows[i]; i++) {
        for (var j = 0, col; col = row.cells[j]; j++) {
            col.setAttribute("data-th", headertext[j]);
        }
    }
}
// TO DO I am commenting this code because tabs are not working ion design page
/*$("li").on("click", function (e) {
    $(this).siblings(".active" ).removeClass("active")
    $(this).addClass("active")
})*/

$("#company_logo,#community_logo,#user_avatar,#amenity_image,#unit_image").change(function(){
    readURL(this);
});


$(".import_data").on("click",function(e){
    $(".divLoading").removeClass("hidden")
});

setTimeout(function() {
    $('.alert').fadeOut('slow');
}, 10000); // <-- time in milliseconds

//below code have drag n drop functionality.
var holder = document.getElementById('holder');
    if (holder){
        //holder.ondragover = function () { this.className = 'hover'; return false; };
        //holder.ondragend = function () { this.className = ''; return false; };
        holder.ondrop = function (e) {
            this.className = '';
            e.preventDefault();
            files = e.dataTransfer.files;
                if (files.length > 0){
                    for (var i = 0; i < files.length; i++) {
                      if(files[i].type == "image/png" || files[i].type == "image/jpeg" || files[i].type == "image/jpg"){
                              readImageSrc(files[i]);

                      }
                      else{
                        $('#image-upload-warning').modal('show');
                      }
                    }
                }
                else{
                    //var img = e.dataTransfer.mozSourceNode;
                    var floorplan_id = $(draging_image).parent().attr("id");
                    var id = $(draging_image).attr("id");
                    id = id.split('-');
                    $('#row'+id[1]).show();
                    console.log("ok");
                    $('#parent-'+id[1]).append($(draging_image));
                    deleteFloorPlanImage(floorplan_id,$(draging_image).attr("src"),id[1],$('#img-name-'+id[1]).html());
                }
            }
    }  



// below lines prevent image on broswer other than selected area
window.addEventListener("dragover",function(e){
  e = e || event;
  e.preventDefault();
},false);

window.addEventListener("drop",function(e){
  e = e || event;
  e.preventDefault();
},false);

//below lines change href on delete anchor tag in delete bootstrap modal

$('#confirm-delete').on('show.bs.modal', function(e) {
    $(this).find('.btn-ok').attr('href', $(e.relatedTarget).data('href'));
    $(this).find('#record-name').html('Delete '+$(e.relatedTarget).data('name'));
    $(this).find('#record-message').html('Are you sure you want to delete this '+$(e.relatedTarget).data('name')+'?');
});

$('#confirm-delete-replace-data').on('show.bs.modal', function(e) {
    $(this).find('.replace-btn-ok').attr('href', $(e.relatedTarget).data('href'));
    $(this).find('#replace-record-name').html('Delete '+$(e.relatedTarget).data('name'));
    $(this).find('#replace-record-message').html('Are you sure you want to delete the previous data? This will wipe out any data connected to the community map and floor plan gallery.');
});
$('#confirm-delete-update-data').on('show.bs.modal', function(e) {
    $(this).find('.update-btn-ok').attr('href', $(e.relatedTarget).data('href'));
    $(this).find('#update-record-name').html($(e.relatedTarget).data('name'));
    $(this).find('#update-record-message').html('Are you sure you want to replace the previously uploaded data with the data you are uploading now?');
});
$('#confirm-delete-gallery').on('show.bs.modal', function(e) {
    $(this).find('.btn-ok-gallery').attr('href', $(e.relatedTarget).data('href'));
    $(this).find('#record-name-gallery').html($(e.relatedTarget).data('name'));
    $(this).find('#record-message-gallery').html('Are you sure you want to delete this gallery? This cannot be undone.');
});
$('#markers-modal').on('show.bs.modal', function(e) {
    console.log("Displaying plotted unit information in markers modal");
    $('.unit-buttons').empty();
    if ($('.h-'+$(e.relatedTarget).data('horizontal')+'-'+$(e.relatedTarget).data('vertical')).length > 1){
      $('.h-'+$(e.relatedTarget).data('horizontal')+'-'+$(e.relatedTarget).data('vertical')).each(function(){
        console.log('CLick on marker for deleting or updating');
        var target_id = $(e.relatedTarget).attr('id');
        var underneath_unit_id = $(this).attr('id');
        var button_style = ""
        if(target_id.split('_')[1] == underneath_unit_id.split('-')[1]){
          button_style = "btn-primary"
        }
        else{
         button_style = "btn-default" 
        }
        $('.unit-buttons').append('<button class="btn modal-unit-button ml-5 '+button_style+'" type="button" data-href="'+$(this).data('href')+'" data-unit-form-url="'+$(this).data('unit-form-url')+'" onclick="setHrefAndFormUrl(this);">'+$(this).data('title')+'</button>');
      });
    }
    $(this).find('#u-name').html($(e.relatedTarget).attr('title'));
    $(this).find('.delete-marker-ok').attr('href', $(e.relatedTarget).data('href'));
    $(this).find("form").attr("action",$(e.relatedTarget).data('unit-form-url'));
    $(this).find('#horizontal_position').val($(e.relatedTarget).data('horizontal'));
    $(this).find('#vertical_position').val($(e.relatedTarget).data('vertical'));
});

});

function allowDrop(ev) {
    ev.preventDefault();
}

function drag(ev) {
    //below assinging of draging_image is very important. Don't remove it
    draging_image = ev.target;
    ev.dataTransfer.setData("text", ev.target.id);
}

function drop(ev) {
    ev.preventDefault();
    if ($(ev.target).hasClass('drop-img')) { 
        var data = ev.dataTransfer.getData("text");
        ev.target.appendChild(document.getElementById(data));
        var img_object = $(ev.target).find('img');
        var id = $(img_object).attr("id");
        id = id.split('-');
        $('#row'+id[1]).hide();
        saveFloorPlanImage($(img_object).attr("src"),ev.target.id,id[1]);
   }
   else{
     return;
   }
}

// preview image function
function readURL(input) {

    if (input.files && input.files[0]) {
        if(input.files[0].type == "image/png" || input.files[0].type == "image/jpeg" || input.files[0].type == "image/jpg"){
                var reader = new FileReader();

                reader.onload = function (e) {
                    $('#preview-image').attr('src', e.target.result);
                    $('#preview-image').parent().attr('href', e.target.result);
                }

                reader.readAsDataURL(input.files[0]);


      }
      else{
        $(input).val('');
        $('#image-upload-warning').modal('show');
        //console.log($(input).val());
      }
    }
}
function readSecondaryURL(input) {

    if (input.files && input.files[0]) {
        if(input.files[0].type == "image/png" || input.files[0].type == "image/jpeg" || input.files[0].type == "image/jpg"){

                var reader = new FileReader();

                reader.onload = function (e) {
                    $('#preview-secondary-image').attr('src', e.target.result);
                    $('#preview-secondary-image').parent().attr('href', e.target.result);
                }

                reader.readAsDataURL(input.files[0]);


      }
      else{
        $(input).val('');
        $('#image-upload-warning').modal('show');
        //console.log($(input).val());
      }
    }
}

// preview image function including svg
function readImageIncludingSVG(input) {  
    if (input.files && input.files[0]) {
        if(input.files[0].type == "image/png" || input.files[0].type == "image/jpeg" || input.files[0].type == "image/jpg" || input.files[0].type == "image/svg+xml"){

                var reader = new FileReader();

                reader.onload = function (e) {
                    $('#preview-image').attr('src', e.target.result);
                    $('#preview-image').parent().attr('href', e.target.result);
                }

                reader.readAsDataURL(input.files[0]);



      }
      else{
        $(input).val('');
        $('#image-and-svg-upload-warning').modal('show');
        //console.log($(input).val());
      }
    }
}

$(document).ready(function () {
    showDataTables();
    var data_provider = $("#community_data_provider").val();
    selectDataProvider(data_provider);
    $("#community_data_provider").change(function(){
        selectDataProvider($(this).val());
    });

    //below code is populating images on floorplans right panel
    $("#mutiple-files").change(function(){
        var files = $(this).prop("files")
        for (var i = 0; i < files.length; i++) {
            if(files[i].type == "image/png" || files[i].type == "image/jpeg" || files[i].type == "image/jpg"){
                    readImageSrc(files[i]);


            }
        } 
        if(files.length == 1){
           if(files[0].type !== "image/png" && files[0].type !== "image/jpeg" && files[0].type !== "image/jpg"){ 
            $('#image-upload-warning').modal('show');
           } 
        }
        $("#mutiple-files").val('');
    });
});

function selectDataProvider(data_provider){
    switch(data_provider) {
        case "realpagesvc":
            showRealPageSVCFields();
            break;
        case "yardirentcafe":
            showYardiRentCafeFields();
            break;
        case "yardi":
            showYardiFields();
            break;
        case "psi":
            showPsiFields();
            break;
        case "spreadsheet":
            showFileFields();
            break;
        case "resman":
            showResmanFields();
            break;
        case "zaremba":
            showZarembaFields();
            break;
    }
}

function showPsiFields(){
    $('.credential_fields').hide();
    //removeValidationsClass();
    $('#url').hide();
    $('.entrata_url').show();
    //$('#community_credential_attributes_url').addClass("validate[required]");
    $('#password').show();
    //$('#community_credential_attributes_password').addClass("validate[required]");
    $('#username').show();
    //$('#community_credential_attributes_username').addClass("validate[required]");
    $('#property_id').show();
    //$('#community_credential_attributes_property_id').addClass("validate[required]");
    $('#data-connection-buttons').show();
    $('#entrata_pricing_button').show();
    $('#data-replace-update-buttons').hide();
}
function showZarembaFields(){
    $('.credential_fields').hide();
    //removeValidationsClass();
    $('#zaremba_username').show();
    //$('#community_credential_attributes_url').addClass("validate[required]");
    $('#zaremba_password').show();
    //$('#community_credential_attributes_password').addClass("validate[required]");
    $('#zaremba_filename').show();
    $('#zaremba_property_id').show();
    //$('#community_credential_attributes_username').addClass("validate[required]");
    //$('#community_credential_attributes_property_id').addClass("validate[required]");
    $('#data-connection-buttons').show();
    $('#data-replace-update-buttons').hide();
}
function showResmanFields(){
    $('.credential_fields').hide();
    //removeValidationsClass();
    // $('#resman_apikey').show();
    // //$('#community_credential_attributes_url').addClass("validate[required]");
    // $('#resman_partner_id').show();
    //$('#community_credential_attributes_password').addClass("validate[required]");
    $('#resman_account_id').show();
    //$('#community_credential_attributes_username').addClass("validate[required]");
    $('#resman_property_id').show();
    //$('#community_credential_attributes_property_id').addClass("validate[required]");
    $('#data-connection-buttons').show();

    $('#data-replace-update-buttons').hide();
}
function showYardiFields(){
    $('.credential_fields').hide();
    //removeValidationsClass();
    $('#url').show();
    //$('#community_credential_attributes_url').addClass("validate[required]");
    $('#username').show();
    //$('#community_credential_attributes_username').addClass("validate[required]");
    $('#password').show();
    //$('#community_credential_attributes_password').addClass("validate[required]");
    $('#server_name').show();
    //$('#community_credential_attributes_server_name').addClass("validate[required]");
    $('#database').show();
    //$('#community_credential_attributes_database').addClass("validate[required]");
    $('#platform').show();
    $('#property_id').show();
    //$('#community_credential_attributes_property_id').addClass("validate[required]");
    $('#interface_entity').show();
    $('#data-connection-buttons').show();
    $('#data-replace-update-buttons').hide();
}

function showYardiRentCafeFields(){
    $('.credential_fields').hide();
    //removeValidationsClass();
    //$('#c_code').show();
    showYardiRentCafeCodeInputOption($('#yardirentcafe_code_option').val());
    //$('#community_credential_attributes_c_code').addClass("validate[required]");
    $('#p_code').show();
    //$('#community_credential_attributes_p_code').addClass("validate[required]");
    $('#data-connection-buttons').show();
    $('#yardirentcafe_option').show();
    $('#data-replace-update-buttons').hide();
}

function showRealPageSVCFields(){
    $('.credential_fields').hide();
    //removeValidationsClass();
    $('#pmc_id').show();
    //$('#community_credential_attributes_pmc_id').addClass("validate[required]");
    $('#site_id').show();
    //$('#community_credential_attributes_site_id').addClass("validate[required]"); 
    $('#data-connection-buttons').show();
    $('#data-replace-update-buttons').hide();

    $('#realpage_store_pricing_button').show();
    $('#realpage_show_pricing_button').show();
}

function showFileFields(){
    $('.credential_fields').hide();
    //removeValidationsClass();
    $('#spreadsheet').show();
    $('#data-connection-buttons').hide();
    $('#data-replace-update-buttons').show();
    //$('#community_credential_attributes_file').addClass("validate[required]"); 
}

function showYardiRentCafeCodeInputOption(value){
  if (value == "Company Code"){
    $('#api_token').hide();
    $('#c_code').show();
  }
  else{
   $('#api_token').show();
   $('#c_code').hide(); 
  }
}

function showCredentialsForm(){
    var community_id = $('#communities_on_settings').val();
    $.ajax({
        url: "/communities/"+community_id+"/credentials",
        type: "GET"
    }).done(function(){
        $('.import_data').attr("href","/communities/"+community_id+"/import"); 
    });
}

function readyJsOnAjaxCall(){
    showDataTables();
}

function showDataTables(){
    $('#miyazaki.table').DataTable({
        'aoColumnDefs': [{
            'bSortable': false,
            'aTargets': [4,5,7],
        }],
        "ordering": true,
        "stateSave": true,
        "paging": false
    });
    $("#miyazaki_info").detach().prependTo('#miyazaki_wrapper');
    $('#communities.table').DataTable({
        initComplete : function() {
            $("#communities_filter").detach().appendTo('#new-search-area');
        },
        "ordering": false,
        "stateSave": true,
        "info": false, //Dont display info e.g. "Showing 1 to 4 of 4 entries"
        "paging": false, //Dont want paging
        language: {
            search: "",
            searchPlaceholder: "Search by community or company name"
        }
    });
    $('#companies.table').DataTable({
        initComplete : function() {
            $("#companies_filter").detach().appendTo('#new-search-area');
        },
        "ordering": false,
        "stateSave": true,
        "info": false, //Dont display info e.g. "Showing 1 to 4 of 4 entries"
        "paging": false, //Dont want paging
        language: {
            search: "",
            searchPlaceholder: "Search by company name"
        }
    });
}

function removeValidationsClass(){
    $('#community_credential_attributes_url').removeClass("validate[required]");
    $('#community_credential_attributes_username').removeClass("validate[required]");
    $('#community_credential_attributes_password').removeClass("validate[required]");
    $('#community_credential_attributes_server_name').removeClass("validate[required]");
    $('#community_credential_attributes_property_id').removeClass("validate[required]");
    $('#community_credential_attributes_site_id').removeClass("validate[required]");
    $('#community_credential_attributes_pmc_id').removeClass("validate[required]");
    $('#community_credential_attributes_c_code').removeClass("validate[required]");
    $('#community_credential_attributes_p_code').removeClass("validate[required]");
}

function readImageSrc(file){
      var reader = new FileReader();
      reader.onload = function (e) {
        index++
        //var s = "'#row"+index+"'";
        var tr_tag = '<tr valign="middle" id="row'+index+'"><td align="left"><div class="drop-img generated-class" ondrop="dropBack(event)" ondragover="allowDrop(event)" id="parent-'+index+'"><img src="'+e.target.result+'" alt="" title=""  draggable="true" ondragstart="drag(event)" id="drag-'+index+'"> </div></td><td id="img-name-'+index+'"> '+file.name+' </td><td><a href="javascript::;" class="btn btn-danger btn-sm" onclick="removeDivWithTemporaryImage('+index+')">Remove</a></td></tr>';
        $('#pre-save-floorplan-images-table').append(tr_tag);
        saveTemporaryImage(e.target.result,index,file.name);
      }
      reader.readAsDataURL(file);
  }


   function saveFloorPlanImage(src,floorplan_id,position){
    //var community_id = $('#communities_at_floorplans').val();
    $.ajax({
        url: "/communities/"+community_id+"/floorplans/"+floorplan_id,
        type: "PUT",
        dataType: "script",
        data: {
            floorplan: {
                image: src
            }
        }
    }).done(function(){
        console.log("floorplan image is saved and now going to delete temporary image");
        deleteTemporaryImage(position);
    });
   }

   function deleteFloorPlanImage(floorplan_id,src,position,name){
    //var community_id = $('#communities_at_floorplans').val();
    $.ajax({
        url: "/communities/"+community_id+"/floorplans/"+floorplan_id,
        type: "PUT",
        dataType: "script",
        data: {
            floorplan: {
                remove_image: true
            }
        }
    }).done(function(){
        console.log("floorplan image is deleted successfully now going to save temporary image");
        saveTemporaryImage(src,position,name);
    });
   }


function trim (str) {
  if ( typeof str !== 'undefined'){  
    return str.replace(/^\s+|\s+$/gm,'');
  }
}

function rgbaToHex (rgba) {
    if ( typeof rgba !== 'undefined'){  
    var parts = rgba.substring(rgba.indexOf("(")).split(",");
        r = parseInt(trim(parts[0].substring(1)), 10);
        g = parseInt(trim(parts[1]), 10);
        b = parseInt(trim(parts[2]), 10);
        if ( typeof parts[3] !== 'undefined'){ 
          a = parseFloat(trim(parts[3].substring(0, parts[3].length - 1))).toFixed(2);
        }
    if ( typeof a !== 'undefined'){    
      return ('#' + r.toString(16) + g.toString(16) + b.toString(16) + (a * 255).toString(16).substring(0,2));
    }
   }   
}

function populate_multiselect(){
  var categories = []
  $("#multiselect li").each(function(){
    if ($(this).hasClass('active')){
      categories.push($(this).data('title'))
    }
  })
  var txt = ""
  for (i = 0; i < categories.length; i++){
    txt += categories[i];
    if ((categories.length-i) > 1){
      txt += ','
    }
  }
  $("#categories_field").val(txt)
  $(".show-categories").text(txt)
  $('.neighborhood-form').submit();
}

function saveTemporaryImage(base64_src,position,name){
  $.ajax({
        url: "/communities/"+community_id+"/save_temporary_image",
        type: "POST",
        dataType: "script",
        data: {
            image: base64_src,
            position: position,
            name: name
        }
    });
}

function deleteTemporaryImage(position){
  $.ajax({
        url: "/communities/"+community_id+"/delete_temporary_image",
        type: "DELETE",
        dataType: "script",
        data: {
            position: position
        }
    }).done(function(){
      console.log('Temporary Image is deleted successfully.');
    });
}

function removeDivWithTemporaryImage(position){
  $('#row'+position).remove();
  deleteTemporaryImage(position)
}

function showHideOverlayGrid(){
  if($('.grid-graph').hasClass('hidden')){
    $('.grid-graph').removeClass('hidden');
  }
  else{
   $('.grid-graph').addClass('hidden'); 
  }
}

function setHrefAndFormUrl(element){
  $('.modal-unit-button').each(function(){
    $(this).removeClass('btn-primary');
    $(this).addClass('btn-default');
  });
  $(element).removeClass('btn-default');
  $(element).addClass('btn-primary');
  $('#markers-modal').find('#u-name').html($(element).html());
  $('#markers-modal').find('.delete-marker-ok').attr('href', $(element).data('href'));
  $('#markers-modal').find("form").attr("action",$(element).data('unit-form-url'));
}