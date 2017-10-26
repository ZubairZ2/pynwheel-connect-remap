$(document).ready(function(e){
    //validates form
    $("form").validationEngine({binded: false});
    /* Activating Best In Place */
    jQuery(".best_in_place").best_in_place();
    /*color picker*/
    $('.rgba-format-colorpicker').colorpicker({format: 'hex'});
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

$("#company_logo,#community_logo,#user_avatar,#sitemap_image").change(function(){
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
                    deleteFloorPlanImage(floorplan_id);
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
        saveFloorPlanImage($(img_object).attr("src"),ev.target.id);
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
    }
}

function showPsiFields(){
    $('.credential_fields').hide();
    removeValidationsClass();
    $('#url').show();
    $('#community_credential_attributes_url').addClass("validate[required]");
    $('#password').show();
    $('#community_credential_attributes_password').addClass("validate[required]");
    $('#username').show();
    $('#community_credential_attributes_username').addClass("validate[required]");
    $('#property_id').show();
    $('#community_credential_attributes_property_id').addClass("validate[required]");
}

function showYardiFields(){
    $('.credential_fields').hide();
    removeValidationsClass();
    $('#url').show();
    $('#community_credential_attributes_url').addClass("validate[required]");
    $('#username').show();
    $('#community_credential_attributes_username').addClass("validate[required]");
    $('#password').show();
    $('#community_credential_attributes_password').addClass("validate[required]");
    $('#server_name').show();
    $('#community_credential_attributes_server_name').addClass("validate[required]");
    $('#database').show();
    $('#community_credential_attributes_database').addClass("validate[required]");
    $('#platform').show();
    $('#property_id').show();
    $('#community_credential_attributes_property_id').addClass("validate[required]");
    $('#interface_entity').show();
}

function showYardiRentCafeFields(){
    $('.credential_fields').hide();
    removeValidationsClass();
    $('#c_code').show();
    $('#community_credential_attributes_c_code').addClass("validate[required]");
    $('#p_code').show();
    $('#community_credential_attributes_p_code').addClass("validate[required]");
}

function showRealPageSVCFields(){
    $('.credential_fields').hide();
    removeValidationsClass();
    $('#pmc_id').show();
    $('#community_credential_attributes_pmc_id').addClass("validate[required]");
    $('#site_id').show();
    $('#community_credential_attributes_site_id').addClass("validate[required]");    
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
        "ordering": false,
        "stateSave": true
    });
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
        var s = "'#row"+index+"'";
        var tr_tag = '<tr valign="middle" id="row'+index+'"><td align="left"><div class="drop-img generated-class" ondrop="dropBack(event)" ondragover="allowDrop(event)" id="parent-'+index+'"><img src="'+e.target.result+'" alt="" title=""  draggable="true" ondragstart="drag(event)" id="drag-'+index+'"> </div></td><td> '+file.name+' </td><td><a href="javascript::;" class="btn btn-danger btn-sm" onclick="$('+s+').remove();">Remove</a></td></tr>';
        $('#pre-save-floorplan-images-table').append(tr_tag);
      }
      reader.readAsDataURL(file);
  }


   function saveFloorPlanImage(src,floorplan_id){
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
        console.log("success");
    });
   }

   function deleteFloorPlanImage(floorplan_id){
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
        console.log("success");
    });
   }