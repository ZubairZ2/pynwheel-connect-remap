$(document).ready(function(e){

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

$("li").on("click", function (e) {
    $(this).siblings(".active" ).removeClass("active")
    $(this).addClass("active")
})

$("#company_logo,#community_logo").change(function(){
    readURL(this);
});

$(".import_data").on("click",function(e){
    $(".divLoading").removeClass("hidden")
})

})

function allowDrop(ev) {
    ev.preventDefault();
}

function drag(ev) {
    ev.dataTransfer.setData("text", ev.target.id);
}

function drop(ev) {
    ev.preventDefault();
    var data = ev.dataTransfer.getData("text");
    ev.target.appendChild(document.getElementById(data));
}
// preview image function
function readURL(input) {

    if (input.files && input.files[0]) {
        var reader = new FileReader();

        reader.onload = function (e) {
            $('#preview-image').attr('src', e.target.result);
        }

        reader.readAsDataURL(input.files[0]);
    }
}

$(document).ready(function () {
    showDataTables();
    var data_provider = $("#community_data_provider").val();
    selectDataProvider(data_provider);
    $("#community_data_provider").change(function(){
        selectDataProvider($(this).val());
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
        case "yardi2":
            showYardiFields();
            break;
        case "yardi4":
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
    $('#domain').show();
    $('#community_credential_attributes_domain').addClass("validate[required]");
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
    $('#domain').show();
    $('#community_credential_attributes_domain').addClass("validate[required]");
    $('#host').show();
    $('#community_credential_attributes_host').addClass("validate[required]");
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
    $('#license_key').show();
    $('#community_credential_attributes_licence_key').addClass("validate[required]");
    $('#interface_entity').show();
}

function showYardiRentCafeFields(){
    $('.credential_fields').hide();
    removeValidationsClass();
    $('#domain').show();
    $('#community_credential_attributes_domain').addClass("validate[required]");
    $('#property_id').show();
    $('#community_credential_attributes_property_id').addClass("validate[required]");
}

function showRealPageSVCFields(){
    $('.credential_fields').hide();
    removeValidationsClass();
    $('#property_id').show();
    $('#community_credential_attributes_domain').addClass("validate[required]");
    $('#pmc_id').show();
    $('#community_credential_attributes_pmc_id').addClass("validate[required]");
    $('#username').show();
    $('#community_credential_attributes_username').addClass("validate[required]");
    $('#password').show();
    $('#community_credential_attributes_password').addClass("validate[required]");
    $('#license_key').show();
    $('#community_credential_attributes_licence_key').addClass("validate[required]");
}

function showCredentialsForm(){
    var community_id = $('#communities').val();
    $.ajax({
        url: "/communities/"+community_id+"/credentials",
        type: "GET"
    });
}

function readyJsOnAjaxCall(){
    showDataTables();
}

function showDataTables(){
    $('#miyazaki.table').DataTable({
        "ordering": false
    });
}

function removeValidationsClass(){
    $('#community_credential_attributes_domain').removeClass("validate[required]");
    $('#community_credential_attributes_host').removeClass("validate[required]");
    $('#community_credential_attributes_username').removeClass("validate[required]");
    $('#community_credential_attributes_password').removeClass("validate[required]");
    $('#community_credential_attributes_server_name').removeClass("validate[required]");
    $('#community_credential_attributes_property_id').removeClass("validate[required]");
    $('#community_credential_attributes_licence_key').removeClass("validate[required]");
    $('#community_credential_attributes_pmc_id').removeClass("validate[required]");
}